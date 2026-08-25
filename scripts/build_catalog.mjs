import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const source = 'C:/Users/bruno/Documents/Codex/2026-08-08/voc-especialista-em-restaura-o-de/exercise_api_pt_br/data/pending-media.json';
const media = JSON.parse(readFileSync(source, 'utf8'));
const base = 'https://raw.githubusercontent.com/brunofs3221/fortyn-exercise-media-extra/main/';
const clean = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const unique = values => [...new Set(values.filter(Boolean))];
const replacements = [
  [/\bhigh prancha\b/gi, 'Prancha alta'],[/\bprancha\b/gi, 'Prancha'],[/\bcrunch\b/gi, 'Abdominal'],[/\bflutter kick\b/gi, 'Chute alternado'],[/\bpress\b/gi, 'Supino'],[/\bfly\b/gi, 'Crucifixo'],[/\brow\b/gi, 'Remada'],[/\bpulldown\b/gi, 'Puxada'],[/\bpush-up\b/gi, 'Flexão de braços'],[/\bpull-up\b/gi, 'Barra fixa'],[/\bstanding\b/gi, 'Em pé'],[/\bseated\b/gi, 'Sentado'],[/\blying\b/gi, 'Deitado'],[/\bwith resistance band\b/gi, 'com elástico'],[/\bwith\b/gi, 'com'],[/\bdumbbell\b/gi, 'halteres'],[/\bbarbell\b/gi, 'barra'],[/\bcable\b/gi, 'cabo'],[/\bmachine\b/gi, 'máquina'],[/\blever\b/gi, 'máquina articulada'],[/\bsmith\b/gi, 'Smith'],[/\bgrip\b/gi, 'pegada'],[/\bhammer\b/gi, 'martelo'],[/\bbodyweight\b/gi, 'peso corporal']
];
const verifiedNames={'cabo traseiro delt fly.gif':'Crucifixo inverso na polia'};
function nameOf(file) { if(verifiedNames[clean(file)])return verifiedNames[clean(file)]; let name=file.replace(/\.gif$/i,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim(); for (const [from,to] of replacements) name=name.replace(from,to); return name.replace(/\s+/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).trim(); }
function tagsFor(item) {
  const text=clean(`${item.originalFilename} ${item.originalRelativePath}`), tags=[];
  const add=(dimension,id,label)=>tags.push({dimension,id,label});
  const folder=clean(item.originalRelativePath.split('/')[0]);
  const body=folder.includes('abdominal')?'abdomen':folder.includes('costa')?'costas':folder.includes('peitoral')?'peito':folder.includes('ombro')?'ombros':folder.includes('bicep')||folder.includes('tricep')||folder.includes('antebraco')?'bracos':folder.includes('panturrilha')?'panturrilhas':folder.includes('perna')||folder.includes('glute')?'pernas':'';
  if(body)add('regiao_corporal',body,body[0].toUpperCase()+body.slice(1));
  if(text.match(/rear delt|delt fly|crucifixo inverso/))add('musculo','deltoide_posterior','Deltoide posterior');
  const equipment=text.match(/barra olimpica/)?'barra_olimpica':text.match(/barra ez|z bar/)?'barra_ez':text.match(/\bbarra\b/)?'barra_reta':text.match(/halter|dumbbell/)?'halteres':text.match(/cabo|polia/)?'cabo_polia':text.match(/elastico|band/)?'elastico_faixa':text.match(/kettlebell/)?'kettlebell':text.match(/bola suica|exercise ball/)?'bola_suica':text.match(/bola medicinal|medicine ball/)?'bola_medicinal':text.match(/corda naval|battle rope/)?'corda_naval':text.match(/maquina|machine|lever|smith/)?'maquina':text.match(/prancha|alongamento|yoga|postura|bodyweight|flexao|barra fixa/)?'peso_corporal':'';
  if(equipment)add('equipamento',equipment,equipment.replaceAll('_',' '));
  const movement=text.match(/alongamento|stretch|mobilidade|postura|yoga/)?'mobilidade_alongamento':text.match(/remada|row/)?'remada':text.match(/puxada|pulldown|barra fixa|pull up/)?'puxada_vertical':text.match(/supino|press|flexao|push up/)?'empurrar':text.match(/agachamento|squat/)?'agachamento':text.match(/levantamento terra|deadlift/)?'hinge':text.match(/avanco|lunge/)?'avanco':text.match(/rosca|curl/)?'flexao_cotovelo':text.match(/extensao.*tricep|triceps.*extensao/)?'extensao_cotovelo':'';
  if(movement)add('padrao_movimento',movement,movement.replaceAll('_',' '));
  if(equipment==='peso_corporal')add('contexto','sem_equipamento','Sem equipamento');
  if(['peso_corporal','halteres','elastico_faixa','kettlebell','bola_suica','bola_medicinal'].includes(equipment))add('ambiente','casa','Casa');
  if(item.frameCount<=1)add('status','imagem_estatica','Imagem estática — sem animação');
  return unique(tags.map(t=>JSON.stringify(t))).map(JSON.parse);
}
const exercises=media.map(item=>{const relative=`gifs/${item.originalRelativePath}`;const tags=tagsFor(item);return {id:`media_${createHash('sha256').update(item.originalRelativePath).digest('hex').slice(0,20)}`,namePtBr:nameOf(item.originalFilename),originalFilename:item.originalFilename,relativePath:relative,mediaUrl:base+relative.split('/').map(encodeURIComponent).join('/'),frameCount:item.frameCount,durationMs:item.durationMs,width:item.width,height:item.height,animated:item.frameCount>1,tags,identificationStatus:item.exerciseId?'matched_existing_exercise':'pending_review',needsManualReview:!item.exerciseId,sourceExerciseId:item.exerciseId??null};});
const catalog={version:'1.0.0',generatedAt:new Date().toISOString(),count:exercises.length,animated:exercises.filter(x=>x.animated).length,static:exercises.filter(x=>!x.animated).length,needsManualReview:exercises.filter(x=>x.needsManualReview).length,exercises};
mkdirSync(resolve(repo,'data'),{recursive:true});
writeFileSync(resolve(repo,'data','exercise_catalog.json'),JSON.stringify(catalog,null,2)+'\n');
writeFileSync(resolve(repo,'data','tag_index.json'),JSON.stringify([...new Map(exercises.flatMap(x=>x.tags).map(t=>[`${t.dimension}:${t.id}`,t])).values()],null,2)+'\n');
console.log(JSON.stringify({count:catalog.count,animated:catalog.animated,static:catalog.static,needsManualReview:catalog.needsManualReview}));
