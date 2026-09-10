'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const esbuild=require('esbuild');
const base='F:/A-War-Without-Victory';
const fixture=path.join(__dirname,'live-fixture');
async function main() {
  assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:base,encoding:'utf8'}).trim(),'03d039df2f9b873787fe0a60242204716d14ef94');
  assert.equal(execFileSync('git',['status','--porcelain','--','src','data','package.json','package-lock.json'],{cwd:base,encoding:'utf8'}).trim(),'');
  const outfile=path.join(__dirname,'baseline-desktop.cjs');
  await esbuild.build({entryPoints:[path.join(base,'src/desktop/desktop_sim.ts')],bundle:true,platform:'node',format:'cjs',define:{'import.meta.url':'undefined'},outfile,target:'node18',external:['electron']});
  process.chdir(fixture);
  const sim=require(outfile);
  const {state}=await sim.loadStateFromPath(path.join(fixture,'state.json'));
  const before=JSON.stringify(state);
  const result=await sim.advanceTurn(state,fixture);
  assert(!result.error,result.error); assert.equal(result.state.meta.turn,1); assert.equal(JSON.stringify(state),before);
  const bytes=sim.serializeState(result.state);
  fs.writeFileSync(path.join(__dirname,'baseline-one-turn-save.json'),bytes);
  const hash=crypto.createHash('sha256').update(bytes).digest('hex');
  fs.writeFileSync(path.join(__dirname,'baseline-one-turn-result.json'),JSON.stringify({pass:true,head:'03d039df2f9b873787fe0a60242204716d14ef94',kind:'one synthetic war turn, no campaign',stateArgumentUnchanged:true,turn:1,canonicalSha256:hash},null,2));
  console.log(JSON.stringify({pass:true,turn:1,canonicalSha256:hash}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
