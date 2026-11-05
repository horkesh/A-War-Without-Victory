import { readFileSync,writeFileSync,readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join,relative } from 'node:path';
const logs=import.meta.dirname,root='F:/A-War-Without-Victory';
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const inventory=read(join(root,'logs/agent-setup-modernization/inventory.json')),manifest=read(join(root,'.agent/skill-distribution.json')),boundary=read(join(logs,'boundary-receipt.json')),release=read(join(logs,'release-reconciliation.json'));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex').toUpperCase();
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const failures=[],assert=(b,m)=>{if(!b)failures.push(m);};
const selected=new Map(manifest.adapters.map(a=>[a.name,a]));
const pairs=inventory.skills.map(p=>{const a=selected.get(p.name),expected=a?.adapter_sha256??p.user_sha256,current=hash(p.user_path);assert(current===expected,`Unexpected installed skill: ${p.name}`);return {name:p.name,mode:a?'activated adapter':'preserved original',sha256:current,pass:current===expected};});
for(const p of inventory.shared_user_files)assert(hash(p.path)===p.sha256,`Settings changed: ${p.path}`);
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);}
const afterTrees=manifest.adapters.flatMap(a=>files(join(manifest.installed_root_observed,a.name))).map(p=>relative(manifest.installed_root_observed,p).replaceAll('\\','/')).sort();
assert(JSON.stringify(afterTrees)===JSON.stringify(release.user_trees_before.map(p=>p.relative).sort()),'User skill support-file inventory changed');
for(const file of release.user_trees_before){if(!manifest.adapters.some(a=>file.relative===a.installed_relative))assert(hash(file.path)===file.sha256,`Support file changed: ${file.relative}`);}
const protectedFiles=inventory.files.filter(p=>/^(\.claude\/settings|tools\/hooks\/|tools\/architect\/hooks\/|\.husky\/|\.githooks\/|tests\/hook_registry.test.ts|scripts\/repo\/check_claude_governance.ps1)/.test(p.path));
for(const p of protectedFiles)assert(git('hash-object',`--path=${p.path}`,p.path)===p.base_blob,`Protected Git content changed: ${p.path}`);
const diff=git('diff','--name-only',release.released_head,'HEAD').split(/\r?\n/).filter(Boolean);
const owned=new Set(inventory.proposed_files.map(p=>p.path));
for(const path of diff)assert(owned.has(path)||path.startsWith('logs/agent-setup-modernization/'),`Unexpected repository change: ${path}`);
for(const a of manifest.adapters){assert(hash(join(root,a.project_source))===a.project_source_sha256,`Integrated source hash mismatch: ${a.name}`);assert(hash(join(root,a.adapter))===a.adapter_sha256,`Integrated adapter hash mismatch: ${a.name}`);}
assert(git('rev-parse','HEAD')===boundary.repository_commit,'Repository changed during activation verification');
assert(git('config','--get','core.hooksPath')==='.husky/_','Hook selection changed');
const receipt={checked_utc:new Date().toISOString(),repository_commit:git('rev-parse','HEAD'),repository_status:git('status','--porcelain'),installed_pairs:pairs,activated_adapters:selected.size,preserved_installed_originals:pairs.length-selected.size,protected_files:protectedFiles.length,shared_user_files:inventory.shared_user_files.length,support_inventory_preserved:failures.length===0,repository_changed_paths:diff.length,hook_selection:git('config','--get','core.hooksPath'),failures,exit:failures.length?1:0};
writeFileSync(join(logs,'activation-preservation.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({exit:receipt.exit,adapters:receipt.activated_adapters,preserved_originals:receipt.preserved_installed_originals,protected_files:receipt.protected_files,failures}));process.exitCode=receipt.exit;
