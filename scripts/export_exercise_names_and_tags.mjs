import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(import.meta.dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(repo, 'data', 'exercise_catalog.json'), 'utf8'));
const out = path.join(repo, 'reports', 'exercise_names_and_tags.csv');
const value = (input) => Array.isArray(input) ? input.join(' | ') : input || '';
const quote = (input) => `"${String(input ?? '').replaceAll('"', '""')}"`;
const header = ['id','nome','nome_anterior','tags','grupo_principal','grupos_secundarios','modalidade','equipamentos','ambientes','nivel','arquivo_gif','url_gif'];
const rows = catalog.exercises
  .slice()
  .sort((a, b) => a.namePtBr.localeCompare(b.namePtBr, 'pt-BR'))
  .map((item) => [item.id, item.namePtBr, item.oldName, value(item.tags), item.primaryMuscleGroup, value(item.secondaryMuscleGroups), item.modality, value(item.equipment), value(item.environments), item.level, item.relativePath, item.mediaUrl]);
fs.writeFileSync(out, `${[header, ...rows].map((row) => row.map(quote).join(',')).join('\n')}\n`);
console.log(JSON.stringify({ exercises: rows.length, output: path.relative(repo, out) }));
