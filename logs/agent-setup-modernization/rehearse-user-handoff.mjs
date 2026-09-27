import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
const logs = import.meta.dirname, root = resolve(logs,'../..');
const manifest = JSON.parse(readFileSync(join(root,'.agent/skill-distribution.json'),'utf8'));
const fixture = 'F:/AWWV-agent-setup-modernization-backup/20260912-8913cca6/handoff-rehearsal';
if (existsSync(fixture)) throw new Error('Retain existing rehearsal evidence; use a new fixture path for another question.');
mkdirSync(fixture,{recursive:true});
const userRoot = join(fixture,'skills');
const hash = path=>createHash('sha256').update(readFileSync(path)).digest('hex').toUpperCase();
for(const entry of manifest.adapters) {
  const target=join(userRoot,entry.installed_relative); mkdirSync(resolve(target,'..'),{recursive:true}); copyFileSync(entry.original_backup,target);
  writeFileSync(join(userRoot,entry.name,'support-file.txt'),'Preserved unrelated support file.');
}
const results=[];
function run(name,expected,...args) {
  const result=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',join(logs,'user-skill-handoff.ps1'),'-UserSkillRoot',userRoot,...args],{encoding:'utf8',timeout:15000});
  writeFileSync(join(logs,`user-handoff-${name}.log`),result.stdout+result.stderr);
  results.push({name,exit:result.status,expected,pass:expected==='refuse'?result.status!==0:result.status===0});
  if(!results.at(-1).pass) throw new Error(`Unexpected ${name} result: ${result.stderr}`);
}
run('verify',0);
run('boundary-refusal','refuse','-Mode','Apply');
const first=manifest.adapters[0], firstTarget=join(userRoot,first.installed_relative);
writeFileSync(firstTarget,'Intervening local edit.');
run('drift-refusal','refuse','-Mode','Apply','-SessionBoundaryConfirmed','-ReceiptPath',join(fixture,'drift.json'));
if(readFileSync(firstTarget,'utf8')!=='Intervening local edit.') throw new Error('Drift was overwritten');
copyFileSync(first.original_backup,firstTarget);
run('apply',0,'-Mode','Apply','-SessionBoundaryConfirmed','-ReceiptPath',join(fixture,'apply.json'));
for(const entry of manifest.adapters) if(hash(join(userRoot,entry.installed_relative))!==entry.adapter_sha256) throw new Error(`Apply hash ${entry.name}`);
writeFileSync(firstTarget,'Edit after activation.');
run('rollback-drift-refusal','refuse','-Mode','Rollback','-SessionBoundaryConfirmed','-ReceiptPath',join(fixture,'rollback-drift.json'));
if(readFileSync(firstTarget,'utf8')!=='Edit after activation.') throw new Error('Rollback overwrote newer work');
copyFileSync(join(root,first.adapter),firstTarget);
run('rollback',0,'-Mode','Rollback','-SessionBoundaryConfirmed','-ReceiptPath',join(fixture,'rollback.json'));
for(const entry of manifest.adapters) {
  if(hash(join(userRoot,entry.installed_relative))!==entry.original_sha256) throw new Error(`Rollback hash ${entry.name}`);
  if(readFileSync(join(userRoot,entry.name,'support-file.txt'),'utf8')!=='Preserved unrelated support file.') throw new Error('Unrelated support file changed');
}
writeFileSync(join(logs,'user-handoff-rehearsal.json'),JSON.stringify({fixture,results,restored:manifest.adapters.length,unrelatedSupportFilesPreserved:true,liveFilesTouched:false},null,2)+'\n');
console.log(JSON.stringify({checks:results.length,pass:results.every(x=>x.pass),restored:manifest.adapters.length,liveFilesTouched:false}));
