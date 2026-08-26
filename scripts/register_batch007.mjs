import fs from 'node:fs';

const manifestPath = new URL('../reports/catalog_curation_workers.json', import.meta.url);
const groups = [
  ['media_1ca726fb520bd04d8ab8','media_1cbe6256bdbf2f21ce88','media_1d2274cbb15ad7bc514f','media_1d89a5ababf594223173','media_1e2c44c08cda33f48b6d','media_1e2e7d7e86809bff2aad','media_1e4a5953e027b9dca731','media_1e570accb3fa8397ebad'],
  ['media_1e9a1e739da04a36cafd','media_1ea4d467d2d1b8a2d59f','media_1ec6694c584149147bf8','media_1f0a76569a43523117a0','media_1f3bc8ced33e2ad9012e','media_201128c301ab020b75df','media_2025674f14f6c158a4cd','media_2044b0318cce8dca700b'],
  ['media_2052816ce53bf20adbef','media_205c839f8b5f19977fd5','media_20895145f8512fc0b40c','media_2093cb48e0d0fc3f80c9','media_2097de173d20fb0ffb2c','media_20bd9b31cd9a576fe4e3','media_20dc77cc53be5986dd06','media_20df8f8b99d4bd167911']
];
const manifest = { batchId: '007', status: 'in_progress', workers: groups.map((mediaIds, index) => ({ workerId: `batch007${String.fromCharCode(97 + index)}`, task: 'IDENTIFY_AND_ENRICH', output: `staging/worker_batch007${String.fromCharCode(97 + index)}.json`, mediaIds })) };
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
