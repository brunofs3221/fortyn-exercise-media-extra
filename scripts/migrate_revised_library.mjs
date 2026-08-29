import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const repo = path.resolve(import.meta.dirname, '..');
const sourceRoot = process.env.REVISED_LIBRARY_ROOT || 'C:/Users/bruno/Downloads/Exercicios renomeados';
const apply = process.argv.includes('--apply');
const catalogPath = path.join(repo, 'data', 'exercise_catalog.json');
const reportPath = path.join(repo, 'reports', 'revised_library_migration_report.json');
const csvPath = path.join(repo, 'reports', 'exercise_migration.csv');
const backupPath = path.join(repo, 'reports', 'exercise_catalog.pre_revised_migration.json');

const clean = (value = '') => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[\\/]/g, '/').replace(/\s+/g, ' ').trim();
const base = (value = '') => path.posix.basename(String(value).replace(/\\/g, '/')).replace(/\.gif$/i, '');
const unique = (items) => [...new Set(items.filter(Boolean))];
const tagLabels = (tags) => Array.isArray(tags) ? tags.map((tag) => typeof tag === 'string' ? tag : tag?.label || tag?.id || '').filter(Boolean) : [];
const values = (value) => Array.isArray(value) ? value : value ? [value] : [];
const official = new Set(['Abdutores','Abdômen/Core','Academia','Adutores','Alongamento','Anilhas','Antebraços','Ao ar livre','Avançado','Banco','Barra','Barra fixa','Bicicleta','Bola','Bíceps','Cardio','Casa','Corda','Corpo inteiro','Costas','Elástico','Esteira','Glúteos','Halteres','Kettlebell','Mobilidade','Máquina','Ombros','Panturrilhas','Peito','Pescoço','Polia/Cabo','Posterior de coxa','Quadril','Quadríceps','Remo','Rolo de espuma','Sem aparelhos','Step/Caixa','Tríceps']);
const muscles = new Set(['Abdutores','Abdômen/Core','Adutores','Antebraços','Bíceps','Corpo inteiro','Costas','Glúteos','Ombros','Panturrilhas','Peito','Pescoço','Posterior de coxa','Quadril','Quadríceps','Tríceps']);
const modalities = new Set(['Alongamento','Cardio','Mobilidade']);
const equipments = new Set(['Anilhas','Banco','Barra','Barra fixa','Bicicleta','Bola','Corda','Elástico','Esteira','Halteres','Kettlebell','Máquina','Polia/Cabo','Remo','Rolo de espuma','Step/Caixa']);
const environments = new Set(['Academia','Casa','Ao ar livre']);
const obsoleteTag = /\b(reabilita[cç][aã]o|idosos?|obesos?|masculino|feminino|qualquer genero|casa com|adu[cç][aã]o horizontal)\b/i;
function legacyTagToOfficial(value) {
  const tag = clean(value);
  if (/corpo inteiro|full body/.test(tag)) return 'Corpo inteiro'; if (/abdomen|abdominal|\bcore\b|obliqu/.test(tag)) return 'Abdômen/Core';
  if (/abdu/.test(tag)) return 'Abdutores'; if (/adutor/.test(tag)) return 'Adutores';
  if (/antebrac/.test(tag)) return 'Antebraços'; if (/bicep/.test(tag)) return 'Bíceps'; if (/tricep/.test(tag)) return 'Tríceps';
  if (/costas|dorsal|latissimo|romboid|trapez/.test(tag)) return 'Costas'; if (/glute/.test(tag)) return 'Glúteos';
  if (/ombro|deltoid/.test(tag)) return 'Ombros'; if (/panturrilha/.test(tag)) return 'Panturrilhas'; if (/peito|peitoral/.test(tag)) return 'Peito';
  if (/pescoco/.test(tag)) return 'Pescoço'; if (/posterior.*coxa|isquiotibial/.test(tag)) return 'Posterior de coxa'; if (/quadril/.test(tag)) return 'Quadril'; if (/quadricep/.test(tag)) return 'Quadríceps';
  if (/alongamento|stretch/.test(tag)) return 'Alongamento'; if (/cardio|aerob|corrida/.test(tag)) return 'Cardio'; if (/mobilidade|yoga|ioga/.test(tag)) return 'Mobilidade';
  if (/sem equipamento|sem aparelho|peso corporal|bodyweight/.test(tag)) return 'Sem aparelhos'; if (/halter/.test(tag)) return 'Halteres'; if (/barra fixa|pull.?up/.test(tag)) return 'Barra fixa';
  if (/\bbarra\b|barbell/.test(tag)) return 'Barra'; if (/anilha|plate/.test(tag)) return 'Anilhas'; if (/banco|bench/.test(tag)) return 'Banco';
  if (/bicicleta|bike/.test(tag)) return 'Bicicleta'; if (/bola|ball/.test(tag)) return 'Bola'; if (/corda|rope/.test(tag)) return 'Corda'; if (/elastico|faixa|band/.test(tag)) return 'Elástico';
  if (/esteira|treadmill/.test(tag)) return 'Esteira'; if (/kettlebell/.test(tag)) return 'Kettlebell'; if (/maquina|machine|smith/.test(tag)) return 'Máquina';
  if (/polia|cabo|cable|crossover/.test(tag)) return 'Polia/Cabo'; if (/remo ergomet|rowing machine/.test(tag)) return 'Remo'; if (/rolo.*espuma|foam/.test(tag)) return 'Rolo de espuma'; if (/step|caixa|box/.test(tag)) return 'Step/Caixa';
  if (/academia|gym/.test(tag)) return 'Academia'; if (/\bcasa\b|home/.test(tag)) return 'Casa'; if (/ar livre|outdoor/.test(tag)) return 'Ao ar livre'; if (/avancad/.test(tag)) return 'Avançado';
  return '';
}

function filesRecursively(folder) {
  const output = [];
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const item = path.join(folder, entry.name);
    if (entry.isDirectory()) output.push(...filesRecursively(item));
    else output.push(item);
  }
  return output;
}

function field(text, labels) {
  const label = labels.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const match = text.match(new RegExp(`(?:^|\\n)\\s*(?:${label})\\s*:\\s*([^\\n]+)`, 'im'));
  return match?.[1]?.trim() || '';
}

function parseText(file, folder) {
  const text = fs.readFileSync(file, 'utf8').replace(/\r/g, '');
  const secondaryBlock = text.match(/(?:^|\n)\s*(?:TAGS? SECUND[AÁ]RIAS?|CLASSIFICA[CÇ][AÃ]O SECUND[AÁ]RIA)\s*:\s*\n([\s\S]*?)(?=\n\s*(?:DESCRI[CÇ][AÃ]O|COMO FAZER|INSTRU[CÇ][OÕ]ES|OBSERVA[CÇ][AÃ]O|$))/im)?.[1] || '';
  const secondary = secondaryBlock.split('\n').map((line) => line.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean);
  const description = field(text, ['DESCRIÇÃO DE COMO FAZER','DESCRICAO DE COMO FAZER','DESCRIÇÃO','DESCRICAO','COMO FAZER']);
  return {
    folder: path.basename(folder), textFile: file,
    name: field(text, ['NOME RECOMENDADO','NOME CORRETO','NOME NOVO']) || path.basename(folder),
    oldName: field(text, ['NOME ATUAL NOS SEUS ARQUIVOS','NOME ATUAL','NOME ANTIGO']),
    original: field(text, ['ARQUIVO ORIGINAL','GIF ORIGINAL']),
    newFile: field(text, ['ARQUIVO NOVO','GIF NOVO']),
    primary: field(text, ['TAG PRINCIPAL','GRUPO PRINCIPAL','CATEGORIA PRINCIPAL']),
    secondary, description
  };
}

function sourceExercises() {
  const result = [];
  for (const file of filesRecursively(sourceRoot).filter((item) => path.basename(item).toLowerCase() === 'informacoes.txt')) {
    const folder = path.dirname(file);
    const gifs = fs.readdirSync(folder, { withFileTypes: true }).filter((entry) => entry.isFile() && /\.gif$/i.test(entry.name)).map((entry) => entry.name);
    result.push({ ...parseText(file, folder), gifs, folder });
  }
  return result;
}

function normalizedTags(record) {
  const raw = unique([record.primary, ...record.secondary].map((item) => item.trim()));
  const invalid = raw.filter((item) => !official.has(item));
  return { raw: raw.filter((item) => official.has(item)), invalid };
}

function canonicalLegacy(values, allowed) {
  const lookup = new Map([...allowed].map((label) => [clean(label), label]));
  return unique((Array.isArray(values) ? values : [values]).map((value) => lookup.get(clean(value))).filter(Boolean));
}
function semantic(record, old, fallback = old) {
  const { raw, invalid } = normalizedTags(record);
  const primary = record.primary && official.has(record.primary) ? record.primary : raw.find((item) => muscles.has(item) || modalities.has(item)) || old.primaryMuscleGroup || '';
  const modality = modalities.has(primary) ? primary : raw.find((item) => modalities.has(item)) || 'Musculação';
  const secondaryMuscleGroups = raw.filter((item) => muscles.has(item) && item !== primary);
  const equipment = raw.includes('Sem aparelhos') ? ['Sem aparelhos'] : raw.filter((item) => equipments.has(item));
  if (!equipment.length) equipment.push(...canonicalLegacy(fallback.equipment, equipments));
  const environment = raw.filter((item) => environments.has(item));
  if (!environment.length) environment.push(...canonicalLegacy(fallback.environment || fallback.environments, environments));
  const level = raw.includes('Avançado') ? 'Avançado' : ({ iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' }[clean(old.difficulty)] || 'Intermediário');
  const tags = unique([primary, ...raw.filter((item) => item !== primary && item !== 'Avançado')]).slice(0, 4);
  return { primary, modality, secondaryMuscleGroups, equipment, environment, level, tags, invalid };
}

function csv(value) { return `"${String(value ?? '').replaceAll('"', '""')}"`; }
if (!fs.existsSync(sourceRoot)) throw new Error(`Revised library not found: ${sourceRoot}`);
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const baselineCatalog = fs.existsSync(backupPath) ? JSON.parse(fs.readFileSync(backupPath, 'utf8')) : catalog;
const baselineById = new Map(baselineCatalog.exercises.map((item) => [item.id, item]));
const sources = sourceExercises();
const exercises = catalog.exercises;
const byOriginal = new Map();
for (const exercise of exercises) {
  const keys = unique([clean(exercise.originalFilename), clean(base(exercise.originalFilename)), clean(base(exercise.relativePath))]);
  for (const key of keys) (byOriginal.get(key) || byOriginal.set(key, []).get(key)).push(exercise);
}
const mapped = [], unmatched = [], ambiguous = [], invalidSourceTags = [];
for (const source of sources) {
  const candidates = unique([source.original, base(source.original), source.newFile, ...source.gifs, source.oldName].map(clean)).flatMap((key) => byOriginal.get(key) || []);
  let matches = [...new Map(candidates.map((item) => [item.id, item])).values()];
  // The catalogue contains legacy copies with the same basename.  The reviewed
  // TXT retains the original folder, which is the deterministic 1:1 selector.
  const originalPath = clean(source.original);
  const pathMatches = matches.filter((item) => clean(String(item.relativePath || '').replace(/^gifs\//i, '')) === originalPath);
  if (pathMatches.length === 1) matches = pathMatches;
  if (matches.length > 1 && source.original) {
    const sourceFolder = clean(String(source.original).replace(/\\/g, '/').split('/')[0]).replace(/[^a-z0-9]/g, '');
    const folderMatches = matches.filter((item) => clean(String(item.relativePath || '').replace(/^gifs\//i, '').split('/')[0]).replace(/[^a-z0-9]/g, '') === sourceFolder);
    if (folderMatches.length === 1) matches = folderMatches;
  }
  if (matches.length > 1 && source.gifs.length === 1) {
    const sourceGif = path.join(source.folder, source.gifs[0]);
    const sourceHash = createHash('sha256').update(fs.readFileSync(sourceGif)).digest('hex');
    const hashMatches = matches.filter((item) => {
      const mediaFile = path.join(repo, item.relativePath);
      return fs.existsSync(mediaFile) && createHash('sha256').update(fs.readFileSync(mediaFile)).digest('hex') === sourceHash;
    });
    if (hashMatches.length === 1) matches = hashMatches;
  }
  if (matches.length === 1) {
    const semanticData = semantic(source, matches[0], baselineById.get(matches[0].id) || matches[0]);
    if (semanticData.invalid.length) invalidSourceTags.push({ folder: source.folder, tags: semanticData.invalid });
    mapped.push({ source, old: matches[0], semantic: semanticData });
  } else if (matches.length > 1) ambiguous.push({ folder: source.folder, original: source.original, candidates: matches.map((item) => item.id) });
  else unmatched.push({ folder: source.folder, original: source.original, oldName: source.oldName, gif: source.gifs });
}
const mappedIds = new Set(mapped.map((item) => item.old.id));
const sourceGifCount = sources.reduce((sum, item) => sum + item.gifs.length, 0);
const report = {
  generatedAt: new Date().toISOString(), sourceRoot, inventory: { exerciseFolders: sources.length, gifs: sourceGifCount, txt: sources.length, catalogRecords: exercises.length },
  reconciliation: { mapped: mapped.length, unmatched: unmatched.length, ambiguous: ambiguous.length, catalogWithoutRevisedSource: exercises.length - mappedIds.size, duplicateCatalogMatches: ambiguous.length, invalidSourceTags },
  mappedIds: [...mappedIds].sort(),
  unmatched, ambiguous,
  proposedTaxonomy: { primaryMuscleGroups: [...muscles], modalities: [...modalities], equipment: [...equipments], environments: [...environments], levels: ['Iniciante','Intermediário','Avançado'], equipmentCondition: ['Sem aparelhos'] }
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
const rows = [['id','nome_antigo','nome_novo','gif_antigo','gif_novo','classificacao_antiga','grupo_principal_novo','secundarias_novas','descricao_atualizada','status','observacao']];
for (const { source, old, semantic: data } of mapped) rows.push([old.id, old.namePtBr, source.name, old.relativePath, old.relativePath, tagLabels(old.tags).join(' | '), data.primary, [...data.secondaryMuscleGroups, ...data.equipment, ...data.environment].join(' | '), Boolean(source.description), 'mapped', 'ID e mídia preservados']);
for (const item of unmatched) rows.push(['', item.oldName, item.folder, '', item.gif.join(' | '), '', '', '', Boolean(item.description), 'unmatched', item.original]);
for (const item of ambiguous) rows.push(['', '', item.folder, '', '', '', '', '', '', 'ambiguous', item.candidates.join(' | ')]);
fs.writeFileSync(csvPath, `${rows.map((row) => row.map(csv).join(',')).join('\n')}\n`);

if (apply) {
  if (!fs.existsSync(backupPath)) fs.copyFileSync(catalogPath, backupPath);
  for (const { source, old, semantic: data } of mapped) {
    // Re-running the migration must preserve the first legacy name rather
    // than replacing it with the already-migrated display name.
    const oldName = old.oldName || old.namePtBr;
    old.namePtBr = source.name;
    old.oldName = oldName;
    old.aliases = unique([...(old.aliases || []), oldName, source.oldName].filter((item) => clean(item) !== clean(source.name)));
    if (source.description) old.description = source.description;
    old.primaryMuscleGroup = data.primary;
    old.secondaryMuscleGroups = data.secondaryMuscleGroups;
    old.equipment = data.equipment;
    old.modality = data.modality;
    old.environments = data.environment;
    old.level = data.level;
    old.tags = data.tags;
    old.primaryMuscles = data.primary ? [data.primary] : old.primaryMuscles;
    old.secondaryMuscles = data.secondaryMuscleGroups;
    old.environment = data.environment;
    old.difficulty = data.level.toLowerCase();
    delete old.gender;
    delete old.audience;
    delete old.rehabilitation;
  }
  // Remove deprecated population, gender and compound-filter tags from every
  // record.  Records without a reviewed TXT retain their other metadata until
  // a corresponding reviewed source is supplied.
  for (const item of exercises) {
    const normalized = unique(tagLabels(item.tags).filter((tag) => !obsoleteTag.test(tag)).map(legacyTagToOfficial));
    const hints = unique([...values(item.primaryMuscles), ...values(item.bodyRegion), ...values(item.secondaryMuscles)].map(legacyTagToOfficial));
    if (!normalized.length) normalized.push(...hints);
    const inferredPrimary = hints.find((tag) => muscles.has(tag) || modalities.has(tag)) || '';
    const currentPrimary = legacyTagToOfficial(item.primaryMuscleGroup);
    const primary = currentPrimary || inferredPrimary || normalized.find((tag) => muscles.has(tag) || modalities.has(tag)) || '';
    if (normalized.includes('Avançado')) item.level = 'Avançado';
    item.tags = unique([primary, ...normalized.filter((tag) => tag !== 'Avançado')]).slice(0, 4);
    item.primaryMuscleGroup = primary;
    if (!item.modality) item.modality = item.tags.find((tag) => modalities.has(tag)) || 'Musculação';
    if (!Array.isArray(item.equipment) || !item.equipment.length) item.equipment = item.tags.filter((tag) => equipments.has(tag) || tag === 'Sem aparelhos');
    if (!Array.isArray(item.environments) || !item.environments.length) item.environments = item.tags.filter((tag) => environments.has(tag));
    delete item.gender;
    delete item.audience;
    delete item.rehabilitation;
  }
  catalog.version = '2.0.0';
  catalog.generatedAt = new Date().toISOString();
  catalog.revisedLibraryMigration = { sourceRoot, mapped: mapped.length, unmatched: unmatched.length, ambiguous: ambiguous.length, migratedAt: new Date().toISOString() };
  fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
  const used = new Set(exercises.flatMap((item) => item.tags));
  const definition = (label) => muscles.has(label) ? 'grupo_muscular' : modalities.has(label) ? 'modalidade' : equipments.has(label) ? 'equipamento' : environments.has(label) ? 'ambiente' : 'condicao_equipamento';
  const tagIndex = [...used].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((label) => ({ dimension: definition(label), id: clean(label).replaceAll('/','_').replaceAll(' ','_'), label }));
  fs.writeFileSync(path.join(repo, 'data', 'tag_index.json'), `${JSON.stringify(tagIndex, null, 2)}\n`);
}
console.log(JSON.stringify({ apply, inventory: report.inventory, reconciliation: report.reconciliation }, null, 2));
