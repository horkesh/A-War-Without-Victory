'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve('logs/bc06');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const live=[];
for(const name of fs.readdirSync(root).filter(n=>/^live-.*-final-\d+$/.test(n)).sort()) {
  const dir=path.join(root,name);
  const resultPath=path.join(dir,'result.json');
  if(!fs.existsSync(resultPath)) continue;
  const result=JSON.parse(fs.readFileSync(resultPath,'utf8'));
  const savePath=path.join(dir,'saves/autosave.json');
  const state=fs.existsSync(savePath)?JSON.parse(fs.readFileSync(savePath,'utf8')):null;
  live.push({case:name,pass:result.pass,error:result.error??null,diagnostics:result.diagnostics,
    resultPath,resultSha256:hash(resultPath),autosavePath:state?savePath:null,autosaveSha256:state?hash(savePath):null,
    receipts:state?.military?.event_decision_log,fireCounts:state?.military?.event_fire_counts,
    commandAuthority:state?.military?.command_authority,
    notifications:state?.military?.pending_event_notifications,
    repeatProof:result.events?.find(e=>e.repeatKind),
    proofKind:'development Electron visible action + real IPC + canonical autosave; not packaged campaign acceptance'});
}
const tracked=execFileSync('git',['diff','--name-only'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
const added=execFileSync('git',['ls-files','--others','--exclude-standard','src','tests'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
const files=[...new Set([...tracked,...added])].filter(f=>/^(src|tests|data)\//.test(f)||f==='package.json').sort();
const summary={baseHead:'4c419c464adce4e59d9046b37b79d163979d5c7d',live,
  reviewedSourceHashes:Object.fromEntries(files.map(f=>[f,hash(f)])),
  localChecks:Object.fromEntries(['sim-build','map-build-final','map-build-receipt','typecheck-final','scope-check','diff-check'].map(n=>[n,{exit:Number(fs.readFileSync(path.join(root,`${n}.exit`),'utf8').trim()),log:`logs/bc06/${n}.log`}]))};
fs.writeFileSync(path.join(root,'validation.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify({cases:live.map(c=>({case:c.case,pass:c.pass,diagnostics:c.diagnostics?.length})),checks:summary.localChecks},null,2));
