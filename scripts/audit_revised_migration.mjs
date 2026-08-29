import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(import.meta.dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(repo, 'data', 'exercise_catalog.json'), 'utf8'));
const report = JSON.parse(fs.readFileSync(path.join(repo, 'reports', 'revised_library_migration_report.json'), 'utf8'));
const sourceTruth = JSON.parse(fs.readFileSync(path.join(repo, 'reports', 'source_of_truth.json'), 'utf8'));
const official = new Set(['Abdutores','Abdômen/Core','Academia','Adutores','Alongamento','Anilhas','Antebraços','Ao ar livre','Avançado','Banco','Barra','Barra fixa','Bicicleta','Bola','Bíceps','Cardio','Casa','Corda','Corpo inteiro','Costas','Elástico','Esteira','Glúteos','Halteres','Kettlebell','Mobilidade','Máquina','Ombros','Panturrilhas','Peito','Pescoço','Polia/Cabo','Posterior de coxa','Quadril','Quadríceps','Remo','Rolo de espuma','Sem aparelhos','Step/Caixa','Tríceps']);
const tagLabels = (tags) => Array.isArray(tags) ? tags.map((tag) => typeof tag === 'string' ? tag : tag?.label || '').filter(Boolean) : [];
const deprecated = /\b(reabilita[cç][aã]o|idosos?|obesos?|masculino|feminino|qualquer genero|casa com|adu[cç][aã]o horizontal)\b/i;
const migratedIds = new Set(report.mappedIds || []);
const migrated = catalog.exercises.filter((item) => migratedIds.has(item.id));
const invalidMapped = migrated.filter((item) => !item.namePtBr || !item.description || !item.primaryMuscleGroup || !item.modality || !Array.isArray(item.equipment) || !Array.isArray(item.environments) || tagLabels(item.tags).some((tag) => !official.has(tag)));
const deprecatedAnywhere = catalog.exercises.filter((item) => tagLabels(item.tags).some((tag) => deprecated.test(tag)));
const invalidTagsAnywhere = catalog.exercises.filter((item) => !tagLabels(item.tags).length || tagLabels(item.tags).some((tag) => !official.has(tag) || tag === 'Avançado'));
const withoutPrimary = catalog.exercises.filter((item) => !item.primaryMuscleGroup);
const filterCounts = {};
for (const item of catalog.exercises) for (const tag of tagLabels(item.tags)) filterCounts[tag] = (filterCounts[tag] || 0) + 1;
const byId = new Map(catalog.exercises.map((item) => [item.id, item]));
const equals = (a, b) => JSON.stringify(a || []) === JSON.stringify(b || []);
const sourceTruthDiffs = [];
for (const source of sourceTruth) {
  const item = byId.get(source.id);
  if (!item) { sourceTruthDiffs.push({ id: source.id, sourceFolder: source.sourceFolder, field: 'catalogEntry', expected: 'present', actual: 'missing' }); continue; }
  const fields = [
    ['namePtBr', source.name, item.namePtBr], ['description', source.description, item.description],
    ['primaryMuscleGroup', source.expected.primaryMuscleGroup, item.primaryMuscleGroup],
    ['secondaryMuscleGroups', source.expected.secondaryMuscleGroups, item.secondaryMuscleGroups],
    ['equipment', source.expected.equipment, item.equipment], ['modality', source.expected.modality, item.modality],
    ['environments', source.expected.environments, item.environments], ['tags', source.expected.tags, tagLabels(item.tags)]
  ];
  for (const [field, expected, actual] of fields) if (Array.isArray(expected) || Array.isArray(actual) ? !equals(expected, actual) : expected !== actual) sourceTruthDiffs.push({ id: source.id, sourceFolder: source.sourceFolder, field, expected, actual });
}
const sourceWithSecondary = sourceTruth.filter((item) => item.secondaryTags.length);
const sourceSecondaryExact = sourceWithSecondary.filter((source) => !sourceTruthDiffs.some((diff) => diff.id === source.id && ['secondaryMuscleGroups','equipment','environments','tags'].includes(diff.field))).length;
const levelsMissing = catalog.exercises.filter((item) => !item.level).map((item) => item.id);
const output = { totalCatalog: catalog.exercises.length, sourceFolders: report.inventory.exerciseFolders, mapped: report.reconciliation.mapped, unmatched: report.reconciliation.unmatched, ambiguous: report.reconciliation.ambiguous, catalogWithoutReviewedSource: report.reconciliation.catalogWithoutRevisedSource, migratedProfiles: migrated.length, sourceTruthDiffs, sourceWithSecondary: sourceWithSecondary.length, sourceSecondaryExact, levelsMissing, invalidMapped: invalidMapped.map((item) => item.id), deprecatedTagsRemaining: deprecatedAnywhere.map((item) => item.id), invalidTagsAnywhere: invalidTagsAnywhere.map((item) => item.id), withoutPrimary: withoutPrimary.map((item) => item.id), visibleFilterCounts: filterCounts };
fs.writeFileSync(path.join(repo, 'reports', 'revised_library_audit.json'), `${JSON.stringify(output, null, 2)}\n`);
if (output.mapped !== output.sourceFolders || output.unmatched || output.ambiguous || output.sourceTruthDiffs.length || output.invalidMapped.length || output.deprecatedTagsRemaining.length || output.invalidTagsAnywhere.length || output.withoutPrimary.length) process.exit(1);
console.log(JSON.stringify({ mapped: output.mapped, migratedProfiles: output.migratedProfiles, sourceWithSecondary: output.sourceWithSecondary, sourceSecondaryExact: output.sourceSecondaryExact, levelsMissing: output.levelsMissing.length, catalogWithoutReviewedSource: output.catalogWithoutReviewedSource, visibleFilters: Object.keys(filterCounts).length }));
