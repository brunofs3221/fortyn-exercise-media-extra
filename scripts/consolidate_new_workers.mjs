import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (relative) => JSON.parse(fs.readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8'));
const catalogPath = new URL('../data/exercise_catalog.json', import.meta.url);
const progressPath = new URL('../reports/catalog_curation_progress.json', import.meta.url);
const manifestPath = new URL('../reports/catalog_curation_workers.json', import.meta.url);
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const required = ['mediaId','namePtBr','canonicalNameEn','description','instructions','primaryMuscles','equipment','bodyRegion','movementPattern','exerciseType','difficulty','environment','commonMistakes','safetyNotes','confidence','visualIdentification'];
const empty = (value) => value == null || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && !value.length);
const catalogById = new Map(catalog.exercises.map((item) => [item.id, item]));
const assigned = manifest.workers.filter((worker) => worker.status !== 'consolidated').flatMap((worker) => worker.mediaIds);
if (new Set(assigned).size !== assigned.length) throw new Error('Overlapping assignments in worker manifest');
const completed = new Set(progress.completedMediaIds);
for (const id of assigned) if (completed.has(id)) throw new Error(`Already processed ID assigned: ${id}`);

const received = [];
const readyAssigned = [];
for (const worker of manifest.workers) {
  if (worker.status === 'consolidated') continue;
  const outputPath = new URL(`../${worker.output}`, import.meta.url);
  if (!fs.existsSync(outputPath)) continue;
  const raw = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  const results = raw.results ?? [];
  if (!['completed', 'complete'].includes(raw.status)) continue;
  readyAssigned.push(...worker.mediaIds);
  if (new Set(raw.processedMediaIds ?? []).size !== worker.mediaIds.length || worker.mediaIds.some((id) => !(raw.processedMediaIds ?? []).includes(id))) throw new Error(`${worker.workerId} did not return all assigned IDs`);
  if (results.length !== worker.mediaIds.length) throw new Error(`${worker.workerId} result count mismatch`);
  for (const item of results) {
    const normalized = { ...item,
      aliases: item.aliases ?? item.aliasesPtBr,
      instructions: item.instructions ?? item.executionSteps,
      bodyRegion: item.bodyRegion ?? item.bodyRegions,
      exerciseType: item.exerciseType ?? item.type,
      environment: item.environment ?? item.environments,
      commonMistakes: item.commonMistakes ?? item.commonErrors,
      visualIdentification: item.visualIdentification ?? item.visualVerification ?? item.gifEvidence
    };
    if (!worker.mediaIds.includes(normalized.mediaId)) throw new Error(`${worker.workerId} returned unassigned ${normalized.mediaId}`);
    const missing = required.filter((field) => empty(normalized[field]));
    if (!Array.isArray(normalized.instructions) || normalized.instructions.length < 3) missing.push('instructions<3');
    if (!['HIGH','MEDIUM','LOW'].includes(String(normalized.confidence).toUpperCase())) missing.push('confidence-value');
    if (missing.length) throw new Error(`${normalized.mediaId} failed quality gate: ${missing.join(',')}`);
    if (!catalogById.has(normalized.mediaId)) throw new Error(`Unknown media ${normalized.mediaId}`);
    received.push({ ...normalized, confidence: String(normalized.confidence).toUpperCase(), identificationStatus: 'curated', needsManualReview: Boolean(normalized.reviewRequired) });
  }
  worker.status = 'consolidated';
}
if (!received.length) throw new Error('No completed worker output available to consolidate');
if (new Set(received.map((item) => item.mediaId)).size !== readyAssigned.length) throw new Error('Duplicate or missing returned IDs');
const duplicateDescriptions = received.filter((item, index) => received.findIndex((candidate) => candidate.description.trim() === item.description.trim()) !== index);
if (duplicateDescriptions.length) throw new Error('Duplicate descriptions in worker output');

for (const item of received) Object.assign(catalogById.get(item.mediaId), item);
progress.completedMediaIds.push(...received.map((item) => item.mediaId));
progress.processed = progress.completedMediaIds.length;
progress.completeProfiles = progress.completedMediaIds.length;
progress.remainingIdentification = catalog.exercises.length - progress.processed;
progress.remainingEnrichment = 0;
progress.lastProcessedMediaId = received.at(-1).mediaId;
const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
for (const id of progress.completedMediaIds) counts[catalogById.get(id).confidence]++;
progress.highConfidence = counts.HIGH;
progress.mediumConfidence = counts.MEDIUM;
progress.lowConfidence = counts.LOW;
progress.manualReview = progress.completedMediaIds.filter((id) => catalogById.get(id).needsManualReview).length;
manifest.status = manifest.workers.every((worker) => worker.status === 'consolidated') ? 'consolidated' : 'in_progress';
manifest.consolidatedAt = new Date().toISOString();
manifest.consolidatedMediaIds = [...new Set([...(manifest.consolidatedMediaIds ?? []), ...received.map((item) => item.mediaId)])];
fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
fs.writeFileSync(progressPath, `${JSON.stringify(progress, null, 2)}\n`);
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ processed: progress.processed, completeProfiles: progress.completeProfiles, remainingIdentification: progress.remainingIdentification, confidence: counts }));
