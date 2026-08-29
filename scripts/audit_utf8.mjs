import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(import.meta.dirname, '..');
const mojibake = /Ã|Â|�/;
const catalog = JSON.parse(fs.readFileSync(path.join(repo, 'data', 'exercise_catalog.json'), 'utf8'));
const sourceTruth = JSON.parse(fs.readFileSync(path.join(repo, 'reports', 'source_of_truth.json'), 'utf8'));
const values = (value) => Array.isArray(value) ? value : value == null ? [] : [value];
const failures = [];
const check = (scope, id, field, value) => { for (const item of values(value)) if (typeof item === 'string' && mojibake.test(item)) failures.push({ scope, id, field, value: item }); };
for (const item of catalog.exercises) for (const field of ['namePtBr','oldName','tags','primaryMuscleGroup','secondaryMuscleGroups','equipment','environments','environment','modality','level']) check('catalog', item.id, field, item[field]);
for (const item of sourceTruth) for (const field of ['sourceFolder','name','oldName','primaryTag','secondaryTags']) check('source_truth', item.id, field, item[field]);
const csvFiles = fs.readdirSync(path.join(repo, 'reports')).filter((name) => name.endsWith('.csv'));
for (const name of csvFiles) { const text = fs.readFileSync(path.join(repo, 'reports', name), 'utf8'); if (mojibake.test(text)) failures.push({ scope: 'report_csv', id: name, field: 'file', value: 'contains mojibake' }); }
const report = { checkedAt: new Date().toISOString(), catalogExercises: catalog.exercises.length, sourceRecords: sourceTruth.length, csvFiles, failures };
fs.writeFileSync(path.join(repo, 'reports', 'utf8_audit.json'), `${JSON.stringify(report, null, 2)}\n`);
if (failures.length) { console.error(JSON.stringify(report, null, 2)); process.exit(1); }
console.log(JSON.stringify({ catalogExercises: catalog.exercises.length, sourceRecords: sourceTruth.length, csvFiles: csvFiles.length, mojibake: 0 }));
