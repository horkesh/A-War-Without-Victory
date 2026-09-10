'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const dir=path.join(__dirname,process.argv[2]||'live-ipc-04');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const result=read(path.join(dir,'result.json'));
const provenance=read(path.join(dir,'provenance.json'));
assert.equal(result.pass,true); assert.equal(result.results.length,25);
const negatives=result.results.filter(r=>r.file);
assert.equal(negatives.length,24);
for(const r of negatives) {
  assert.equal(r.result.ok,false); assert.equal(r.stateUnchanged,true);
  assert.equal(r.canonicalSaveUnchanged,true); assert.equal(r.broadcasts,0);
}
const positive=result.results.find(r=>r.kind==='valid-control');
assert.equal(positive.baselineByteIdentical,true);
assert.equal(positive.afterTurn,positive.beforeTurn+1);
assert(positive.broadcasts.includes('state')&&positive.broadcasts.includes('report'));
const bundle=path.resolve(__dirname,'../../dist/desktop/desktop_sim.cjs');
assert.equal(hash(bundle),provenance.sources['dist/desktop/desktop_sim.cjs'],'Live bundle must match final local bundle');
for(const [relative,expected] of Object.entries(provenance.inputs)) {
  assert.equal(hash(path.resolve(__dirname,'../..',relative)),expected,`Copied production input changed: ${relative}`);
}
const summary={pass:true,caseDirectory:path.basename(dir),negativeCases:24,positive,
  bundleSha256:hash(bundle),resultSha256:hash(path.join(dir,'result.json')),
  provenanceSha256:hash(path.join(dir,'provenance.json')),copiedProductionInputCount:Object.keys(provenance.inputs).length,
  proof:'Unmodified production Electron main/preload; actual main observes broadcasts; second real renderer invokes IPC; minimal synthetic war state.'};
fs.writeFileSync(path.join(__dirname,'live-summary.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
