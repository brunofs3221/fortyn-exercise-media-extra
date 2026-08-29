import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(import.meta.dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(repo, 'data', 'exercise_catalog.json'), 'utf8'));
const sourceTruth = JSON.parse(fs.readFileSync(path.join(repo, 'reports', 'source_of_truth.json'), 'utf8'));
const out = path.join(repo, 'reports', 'exercise_names_and_tags.csv');
const sourceById = new Map(sourceTruth.map((item) => [item.id, item]));
const value = (input) => Array.isArray(input) ? input.join(' | ') : input || '';
const quote = (input) => `"${String(input ?? '').replaceAll('"', '""')}"`;
const header = ['id','nome','nome_anterior','descricao','tag_principal','tags_secundarias','grupo_principal','grupos_secundarios','modalidade','equipamentos','ambientes','nivel','arquivo_gif','url_gif','source_folder','status_migracao'];
const rows = catalog.exercises
  .slice()
  .sort((a, b) => a.namePtBr.localeCompare(b.namePtBr, 'pt-BR'))
  .map((item) => {
    const source = sourceById.get(item.id);
    const secondary = source?.secondaryTags || [...(item.secondaryMuscleGroups || []), ...(item.equipment || []), ...(item.environments || [])];
    return [item.id, item.namePtBr, item.oldName, item.description, source?.primaryTag || item.primaryMuscleGroup, value(secondary), item.primaryMuscleGroup, value(item.secondaryMuscleGroups), item.modality, value(item.equipment), value(item.environments), item.level, item.relativePath, item.mediaUrl, source?.sourceFolder || '', source ? 'MIGRADO_FONTE_REVISADA' : 'SEM_FONTE_REVISADA'];
  });
fs.writeFileSync(out, `${[header, ...rows].map((row) => row.map(quote).join(',')).join('\n')}\n`);
console.log(JSON.stringify({ exercises: rows.length, output: path.relative(repo, out) }));
