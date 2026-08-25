import fs from 'node:fs';

const catalogPath = new URL('../data/exercise_catalog.json', import.meta.url);
const progressPath = new URL('../reports/catalog_curation_progress.json', import.meta.url);
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
const id = 'media_00291dd66ebf0d854707';
const exercise = catalog.exercises.find((item) => item.id === id);
if (!exercise) throw new Error(`Missing ${id}`);

Object.assign(exercise, {
  namePtBr: 'Crucifixo inverso na polia',
  canonicalNameEn: 'Cable Rear Delt Fly',
  aliases: ['Crucifixo invertido na polia', 'Voador inverso no crossover'],
  description: 'Exercício de puxada horizontal para a parte posterior dos ombros. Em pé entre as polias, os cabos cruzados são abertos até os braços ficarem alinhados aos ombros, com o tronco estável e as escápulas controladas.',
  instructions: [
    'Ajuste as polias aproximadamente na altura dos ombros e fique centralizado entre elas.',
    'Segure a manopla direita com a mão esquerda e a manopla esquerda com a mão direita, mantendo os braços à frente do corpo.',
    'Adote leve flexão dos joelhos, abdômen firme e cotovelos suavemente flexionados.',
    'Abra os braços em arco até as mãos ficarem nas laterais, sem elevar os ombros em direção às orelhas.',
    'Aproxime as escápulas no final do movimento e retorne de forma controlada à posição inicial.'
  ],
  primaryMuscles: ['deltoide posterior'],
  secondaryMuscles: ['trapézio médio', 'romboides', 'manguito rotador'],
  equipment: ['polia dupla', 'manoplas'],
  bodyRegion: ['ombros', 'costas superiores'],
  movementPattern: 'abdução horizontal do ombro',
  exerciseType: 'força e hipertrofia',
  difficulty: 'intermediário',
  laterality: 'bilateral',
  position: 'em pé',
  environment: ['academia'],
  tags: ['ombros', 'deltoide posterior', 'costas superiores', 'polia', 'crossover', 'bilateral', 'academia'],
  commonMistakes: [
    'dobrar excessivamente os cotovelos e transformar o gesto em remada',
    'elevar os ombros e concentrar a carga no trapézio superior',
    'projetar o tronco para trás para vencer a resistência',
    'soltar os cabos rapidamente na volta'
  ],
  safetyNotes: 'Use uma resistência que permita manter o tronco imóvel e os ombros longe das orelhas. Ajuste a altura das polias antes de iniciar e pare se houver dor articular no ombro.',
  confidence: 'HIGH',
  identificationStatus: 'curated',
  needsManualReview: false,
  visualIdentification: 'A animação mostra o praticante entre duas polias, usando cabos cruzados e abrindo os braços horizontalmente, com ênfase no deltoide posterior.',
  reviewRequired: false
});

progress.completeProfiles = 93;
progress.remainingIdentification = 1049;
progress.remainingEnrichment = 0;
progress.lastProcessedMediaId = id;
fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
fs.writeFileSync(progressPath, `${JSON.stringify(progress, null, 2)}\n`);
