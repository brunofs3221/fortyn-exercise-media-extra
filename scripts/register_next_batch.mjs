import fs from 'node:fs';

const batchId = process.argv[2];
if (!/^\d{3}$/.test(batchId ?? '')) throw new Error('Usage: node scripts/register_next_batch.mjs NNN');
const catalog = JSON.parse(fs.readFileSync(new URL('../data/exercise_catalog.json', import.meta.url), 'utf8'));
const progress = JSON.parse(fs.readFileSync(new URL('../reports/catalog_curation_progress.json', import.meta.url), 'utf8'));
const complete = new Set(progress.completedMediaIds);
const ids = catalog.exercises.filter((item) => !complete.has(item.id)).slice(0, 24).map((item) => item.id);
if (!ids.length) throw new Error('No pending IDs');
const workers = [0, 1, 2].map((index) => {
  const suffix = String.fromCharCode(97 + index);
  return { workerId: `batch${batchId}${suffix}`, task: 'IDENTIFY_AND_ENRICH', output: `staging/worker_batch${batchId}${suffix}.json`, mediaIds: ids.slice(index * 8, index * 8 + 8) };
}).filter((worker) => worker.mediaIds.length);
fs.writeFileSync(new URL('../reports/catalog_curation_workers.json', import.meta.url), `${JSON.stringify({ batchId, status: 'in_progress', workers }, null, 2)}\n`);
console.log(JSON.stringify(workers));
