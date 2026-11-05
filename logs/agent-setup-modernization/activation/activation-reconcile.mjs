import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const backup=import.meta.dirname, source='F:/AWWV-worktrees/agent-setup-modernization', live='F:/A-War-Without-Victory';
const out=join(backup,'activation');
mkdirSync(out,{recursive:true});
const inventory=JSON.parse(readFileSync(join(source,'logs/agent-setup-modernization/inventory.json'),'utf8'));
const manifest=JSON.parse(readFileSync(join(source,'.agent/skill-distribution.json'),'utf8'));
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex').toUpperCase();
const failures=[], must=(test,message)=>{if(!test)failures.push(message);};
const releasedHead=git(live,'rev-parse','HEAD'), releasedTree=git(live,'rev-parse','HEAD^{tree}');
must(releasedTree===git(source,'rev-parse',`${inventory.base_commit}^{tree}`),'Released tracked tree differs; reconciliation required');
must(git(source,'status','--porcelain')==='','Reviewed source has uncommitted changes');
const proposed=inventory.proposed_files.map(row=>{
  must(hash(join(source,row.path))===row.candidate_sha256,`Reviewed candidate drift: ${row.path}`);
  return {path:row.path,candidate_sha256:hash(join(source,row.path)),live_sha256:existsSync(join(live,row.path))?hash(join(live,row.path)):null};
});
for(const row of inventory.skills) must(hash(row.user_path)===row.user_sha256,`Installed original drift: ${row.name}`);
for(const row of inventory.shared_user_files) must(hash(row.path)===row.sha256,`Shared settings drift: ${row.path}`);
const preservedLocal=['docs/plans/2026-09-12-agent-setup-modernization-plan.md','.cursor/TASK_SUBAGENT_TYPES.md','.cursor/rules/ui-gui-invoke-ux-developer.mdc','.cursor/rules/napkin-session-start.mdc'].map(path=>{
  const from=join(live,path), saved=join(out,'released-local-originals',path);
  must(existsSync(from),`Missing expected released local original: ${path}`);
  if(path.startsWith('.cursor/')) must(hash(from)===hash(join(backup,'ignored-cursor-originals',path)),`Ignored Cursor original drift: ${path}`);
  mkdirSync(dirname(saved),{recursive:true});
  if(existsSync(saved)) must(hash(saved)===hash(from),`Existing activation backup mismatch: ${path}`); else copyFileSync(from,saved);
  return {path,absolute:resolve(from),backup:resolve(saved),sha256:hash(from)};
});
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);}
const userTrees=manifest.adapters.flatMap(a=>files(join(manifest.installed_root_observed,a.name)).map(path=>({path:resolve(path),relative:relative(manifest.installed_root_observed,path).replaceAll('\\','/'),sha256:hash(path)})));
const receipt={owner_handoff:'Sorry, what do you need from me? Claude completed his work in the meantime, repo is all yours.',scope:'Coordinated handoff for reviewed local repository and user-skill activation; no remote push.',captured_utc:new Date().toISOString(),released_root:live,released_head:releasedHead,released_branch:git(live,'branch','--show-current'),released_tree:releasedTree,released_status:git(live,'status','--porcelain'),reviewed_worktree:source,reviewed_commit:git(source,'rev-parse','HEAD'),integration_worktree:'F:/AWWV-worktrees/agent-setup-activation',proposed_files:proposed,preserved_local_originals:preservedLocal,user_trees_before:userTrees,failures,exit:failures.length?1:0};
writeFileSync(join(out,'release-reconciliation.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({exit:receipt.exit,released_head:releasedHead,owned_files:proposed.length,saved_local_originals:preservedLocal.length,user_tree_files:userTrees.length,failures},null,2));
process.exitCode=receipt.exit;
