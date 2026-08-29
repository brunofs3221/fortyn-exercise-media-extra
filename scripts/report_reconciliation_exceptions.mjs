import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const repo = path.resolve(import.meta.dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(repo, 'data', 'exercise_catalog.json'), 'utf8'));
const source = JSON.parse(fs.readFileSync(path.join(repo, 'reports', 'source_of_truth.json'), 'utf8'));
const mapped = new Set(source.map((item) => item.id));
const hash = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const sourceHashes = new Map();
for (const item of source) for (const gif of item.sourceGif || []) {
  const file = path.join(item.sourceFolder, gif);
  if (fs.existsSync(file)) (sourceHashes.get(hash(file)) || sourceHashes.set(hash(file), []).get(hash(file))).push(item);
}
const extras = catalog.exercises.filter((item) => !mapped.has(item.id));
const rows = [['id','nome','nome_anterior','arquivo_gif','hash_gif','classificacao','possivel_equivalente_source','motivo']];
for (const item of extras) {
  const file = path.join(repo, item.relativePath);
  const mediaHash = fs.existsSync(file) ? hash(file) : '';
  const matches = sourceHashes.get(mediaHash) || [];
  rows.push([item.id, item.namePtBr, item.oldName, item.relativePath, mediaHash, matches.length ? 'POSSIVEL_DUPLICATA_DE_MIDIA' : 'SEM_FONTE_REVISADA', matches.map((match) => match.name).join(' | '), matches.length ? 'Hash do GIF coincide com ficha revisada já mapeada; requer decisão humana antes de consolidar.' : 'Não existe pasta/TXT correspondente na fonte revisada atual.']);
}
fs.writeFileSync(path.join(repo, 'reports', 'unmatched_catalog_records.csv'), `${rows.map((row) => row.map(quote).join(',')).join('\n')}\n`);
const duplicateRows = [['nome','id','arquivo_gif','hash_gif','status_fonte']];
for (const group of Map.groupBy(catalog.exercises, (item) => item.namePtBr).values()) if (group.length > 1) for (const item of group) {
  const file = path.join(repo, item.relativePath);
  duplicateRows.push([item.namePtBr, item.id, item.relativePath, fs.existsSync(file) ? hash(file) : '', mapped.has(item.id) ? 'MIGRADO_FONTE_REVISADA' : 'SEM_FONTE_REVISADA']);
}
fs.writeFileSync(path.join(repo, 'reports', 'duplicate_names_review.csv'), `${duplicateRows.map((row) => row.map(quote).join(',')).join('\n')}\n`);
console.log(JSON.stringify({ catalog: catalog.exercises.length, source: source.length, extras: extras.length, duplicateNames: duplicateRows.length - 1 }));
