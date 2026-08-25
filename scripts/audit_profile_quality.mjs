import fs from 'node:fs';

const catalogPath = new URL('../data/exercise_catalog.json', import.meta.url);
const progressPath = new URL('../reports/catalog_curation_progress.json', import.meta.url);
const reportPath = new URL('../reports/catalog_profile_quality.json', import.meta.url);
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
const byId = new Map(catalog.exercises.map((item) => [item.id, item]));
const required = ['namePtBr','canonicalNameEn','description','instructions','primaryMuscles','equipment','bodyRegion','movementPattern','exerciseType','difficulty','environment','commonMistakes','safetyNotes','confidence'];
const empty = (value) => value == null || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && !value.length);
const incomplete = [];
for (const id of progress.completedMediaIds) {
  const item = byId.get(id);
  const missing = !item ? ['catalogEntry'] : required.filter((field) => empty(item[field]));
  if (item?.instructions && (!Array.isArray(item.instructions) || item.instructions.length < 3)) missing.push('instructions<3');
  if (missing.length) incomplete.push({ mediaId: id, missing });
}
const confidence = { HIGH: 0, MEDIUM: 0, LOW: 0 };
for (const id of progress.completedMediaIds) {
  const c = byId.get(id)?.confidence;
  if (c in confidence) confidence[c]++;
}
const report = {
  generatedAt: new Date().toISOString(),
  totalMedia: catalog.exercises.length,
  processed: progress.completedMediaIds.length,
  completeProfiles: progress.completeProfiles,
  schemaValidProfiles: progress.completedMediaIds.length - incomplete.length,
  incomplete,
  confidence,
  invariants: {
    processedPlusRemainingIdentification: progress.completedMediaIds.length + (progress.remainingIdentification ?? catalog.exercises.length - progress.completedMediaIds.length),
    completeProfilesLteProcessed: progress.completeProfiles <= progress.completedMediaIds.length,
    remainingEnrichment: progress.completedMediaIds.length - progress.completeProfiles,
    confidenceSum: Object.values(confidence).reduce((a, b) => a + b, 0),
    uniqueProcessedIds: new Set(progress.completedMediaIds).size
  }
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
if (incomplete.length || report.invariants.processedPlusRemainingIdentification !== catalog.exercises.length || report.invariants.remainingEnrichment !== 0 || report.invariants.confidenceSum !== progress.completedMediaIds.length || report.invariants.uniqueProcessedIds !== progress.completedMediaIds.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ processed: report.processed, completeProfiles: report.completeProfiles, schemaValidProfiles: report.schemaValidProfiles, confidence: report.confidence }));
