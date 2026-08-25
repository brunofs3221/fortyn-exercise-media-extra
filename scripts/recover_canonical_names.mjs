import fs from 'node:fs';
import path from 'node:path';

const root = new URL('../', import.meta.url);
const catalogPath = new URL('../data/exercise_catalog.json', import.meta.url);
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const byId = new Map(catalog.exercises.map((item) => [item.id, item]));
let repaired = 0;
for (const file of fs.readdirSync(new URL('../staging/', import.meta.url))) {
  if (!/^worker_batch.*\.json$/i.test(file)) continue;
  const raw = JSON.parse(fs.readFileSync(new URL(`../staging/${file}`, import.meta.url), 'utf8'));
  const records = raw.results ?? raw.items ?? raw.records ?? [];
  for (const record of records) {
    const id = record.mediaId ?? record.id;
    const canonicalNameEn = record.canonicalNameEn ?? record.nameEn;
    const target = byId.get(id);
    if (target && !target.canonicalNameEn && canonicalNameEn) {
      target.canonicalNameEn = canonicalNameEn;
      repaired++;
    }
  }
}
fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(JSON.stringify({ repaired }));
