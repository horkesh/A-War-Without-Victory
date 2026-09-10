'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=__dirname;
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const live=['rbih','rs','hrhb'].map(faction=>{
  const config=JSON.parse(fs.readFileSync(path.join(root,`config-${faction}.json`),'utf8'));
  const dir=path.resolve(root,'..',config.caseId);
  const resultPath=path.join(dir,'result.json');
  const result=JSON.parse(fs.readFileSync(resultPath,'utf8'));
  const savePath=path.join(dir,'saves/autosave.json');
  const state=JSON.parse(fs.readFileSync(savePath,'utf8'));
  if(!result.pass||result.diagnostics.length) throw Error(`Live proof failed: ${faction}`);
  return {case:config.caseId,pass:result.pass,diagnostics:result.diagnostics,
    resultPath,resultSha256:hash(resultPath),autosavePath:savePath,autosaveSha256:hash(savePath),
    fixtureSha256:hash(config.fixture),assertions:config.persisted,
    receipts:state.military.event_decision_log,notifications:state.military.pending_event_notifications,
    repeatProof:result.events.find(e=>e.repeatKind),
    proofKind:'visible local Electron controls, real preload IPC and canonical autosave; synthetic turn 90, no campaign or packaged acceptance'};
});
const changed=execFileSync('git',['diff','HEAD','--name-only'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(f=>/^(src|tests)\//.test(f));
const checks=fs.readdirSync(root).filter(f=>f.endsWith('.exit')).sort();
const summary={baseHead:'d7fb720353c2b6b37a80269261ec1e193a205161',live,
  reviewedSourceHashes:Object.fromEntries(changed.map(f=>[f,hash(f)])),
  localChecks:Object.fromEntries(checks.map(f=>[f.slice(0,-5),{exit:Number(fs.readFileSync(path.join(root,f),'utf8').trim()),log:`logs/bc06/targeting/${f.slice(0,-5)}.log`}])),
  remainingGates:['six unauthored address/decoration escalation rules','final packaged acceptance'],
  historicalFailedTargetProof:'logs/bc06/live-decorate-final-01/result.json (retained unchanged)'};
fs.writeFileSync(path.join(root,'validation.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({live:live.map(c=>({case:c.case,pass:c.pass})),checks:summary.localChecks},null,2));
