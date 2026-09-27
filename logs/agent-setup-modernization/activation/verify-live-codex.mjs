import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
const logs=import.meta.dirname, project='F:/A-War-Without-Victory';
const executable='C:/Users/User/AppData/Local/OpenAI/Codex/bin/bffc5354119c8421/codex.exe';
const manifest=JSON.parse(readFileSync(join(project,'.agent/skill-distribution.json'),'utf8'));
const child=spawn(executable,['app-server','--listen','stdio://'],{cwd:project,stdio:['pipe','pipe','pipe'],windowsHide:true});
const transcript=[], pending=new Map(); let id=0,stderr='',timer,turnComplete;
const completion=new Promise((resolve,reject)=>{turnComplete={resolve,reject};});
child.stderr.on('data',b=>stderr+=b);
child.on('error',e=>{for(const p of pending.values())p.reject(e);turnComplete.reject(e);});
createInterface({input:child.stdout}).on('line',line=>{
  let msg;try{msg=JSON.parse(line);}catch{return;}
  transcript.push(msg);
  if(pending.has(msg.id)){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p.reject(new Error(JSON.stringify(msg.error))):p.resolve(msg.result);}
  else if(msg.method==='turn/completed')turnComplete.resolve(msg.params);
  else if(msg.method&&msg.id!==undefined)child.stdin.write(JSON.stringify({id:msg.id,error:{code:-32601,message:'Read-only routing probe does not grant actions or user approvals'}})+'\n');
});
function rpc(method,params){const n=++id;return new Promise((resolve,reject)=>{pending.set(n,{resolve,reject});child.stdin.write(JSON.stringify({id:n,method,params})+'\n');});}
let receipt={executable,cwd:project,mode:'fresh desktop app-server using actual installed user profile, read-only ephemeral Sol/medium routing',activated_catalog:false};
try{
  timer=setTimeout(()=>{const e=new Error('Bounded live Codex probe exceeded 180 seconds');for(const p of pending.values())p.reject(e);turnComplete.reject(e);},180000);
  receipt.initialization=await rpc('initialize',{clientInfo:{name:'awwv_live_activation_verify',version:'1.0.0'},capabilities:{experimentalApi:true}});
  child.stdin.write(JSON.stringify({method:'initialized'})+'\n');
  const catalog=await rpc('skills/list',{cwds:[project],forceReload:true});
  const skills=catalog.data.flatMap(x=>x.skills??[]);
  receipt.catalog=manifest.adapters.map(a=>{const rows=skills.filter(s=>s.name===a.name);const candidate=readFileSync(join(project,a.adapter),'utf8');const description=/^description: (.+)$/m.exec(candidate)?.[1];return {name:a.name,entries:rows,pass:rows.length===1&&rows[0].enabled&&rows[0].description===description&&rows[0].path.replaceAll('\\','/').toLowerCase()===(manifest.installed_root_observed+'/'+a.installed_relative).toLowerCase()};});
  receipt.catalog_errors=catalog.data.flatMap(x=>x.errors??[]);
  receipt.activated_catalog=receipt.catalog.every(x=>x.pass);
  if(!receipt.activated_catalog)throw new Error('Fresh actual-profile discovery did not select exactly the nine expected installed adapters');
  writeFileSync(join(logs,'live-codex-discovery.json'),JSON.stringify(receipt,null,2)+'\n');
  const started=await rpc('thread/start',{cwd:project,model:'gpt-5.6-sol',sandbox:'read-only',approvalPolicy:'never',ephemeral:true,developerInstructions:'This is a bounded read-only activation acceptance test. Do not edit files, run tests/builds/simulations, install anything, use network/MCP tools, create agents, or message existing sessions. Only inspect relevant instruction/skill files and state intended routing. Do not read credentials or user configuration contents.'});
  receipt.thread_id=started.thread.id;
  const prompt='Read-only activation acceptance. Use your actually loaded skill catalog and the current checkout instructions, not a supplied snapshot. Do not do the hypothetical tasks. In one concise response state the source/skill routing, authority boundary, and required verification for each: (1) a README spelling fix; (2) an agreed modal clipped-footer UI bug; (3) a territory-moving simulation rule change; (4) a sensitive-history canon change without a panel receipt. Also state how plan-only requests and a first in-scope test failure are handled. Inspect only the relevant current instructions needed to settle those answers. Identify which of using-superpowers, brainstorming and awwv-read-first applies by default and why. No edits, tests, delegation, remote calls or messages.';
  writeFileSync(join(logs,'live-codex-prompt.txt'),prompt+'\n');
  await rpc('turn/start',{threadId:started.thread.id,input:[{type:'text',text:prompt,text_elements:[]}],effort:'medium'});
  receipt.completion=await completion;
  receipt.exit=receipt.completion.turn.status==='completed'?0:1;
}catch(e){receipt.error=e.message;receipt.exit=1;}finally{
  clearTimeout(timer); child.stdin.end();child.kill();
  writeFileSync(join(logs,'live-codex-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
  writeFileSync(join(logs,'live-codex-transcript.json'),JSON.stringify(transcript,null,2)+'\n');
  writeFileSync(join(logs,'live-codex-stderr.log'),stderr);
  console.log(JSON.stringify({exit:receipt.exit,catalog:receipt.activated_catalog,error:receipt.error,thread_id:receipt.thread_id}));process.exitCode=receipt.exit;
}
