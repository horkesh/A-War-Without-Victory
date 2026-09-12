import { readFileSync,writeFileSync,existsSync } from 'node:fs';
import { execFileSync,spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join,dirname,resolve } from 'node:path';
const root='F:/A-War-Without-Victory',logs=import.meta.dirname;
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex').toUpperCase();
const allowed=['docs/plans/2026-09-12-agent-setup-modernization-plan.md','docs/PROJECT_LEDGER.md','.agent/skill-distribution.json'];
const failures=[],check=(ok,text)=>{if(!ok)failures.push(text);};
for(const path of git('diff','--name-only').split(/\r?\n/).filter(Boolean))check(allowed.includes(path)||path.startsWith('logs/agent-setup-modernization/activation/'),`Unexpected closeout edit: ${path}`);
let links=0;
for(const file of allowed.filter(f=>f.endsWith('.md'))){const body=readFileSync(join(root,file),'utf8').replace(/```[^\n]*\n[\s\S]*?```/g,'');for(const match of body.matchAll(/\[[^\]\n]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+"[^"]*")?\)/g)){const url=match[1]??match[2];if(/^(https?:|mailto:|app:)/.test(url))continue;const target=url.split('#')[0];links++;check(existsSync(resolve(root,dirname(file),target)),`Broken link ${file}: ${target}`);}}
const manifest=JSON.parse(readFileSync(join(root,'.agent/skill-distribution.json'),'utf8'));
check(manifest.adapters.length===9,'Expected nine adapters');
for(const a of manifest.adapters){for(const [path,expected] of [[join(root,a.adapter),a.adapter_sha256],[join(root,a.project_source),a.project_source_sha256],[join(manifest.installed_root_observed,a.installed_relative),a.adapter_sha256]])check(hash(path)===expected,`Hash drift: ${path}`);}
check(git('-C','F:/AWWV-worktrees/agent-setup-activation','rev-parse','HEAD')==='7d8b75f8a13c2cbf73063c7315c946f33cf0f874','Rollback packet commit changed');
check(git('-C','F:/AWWV-worktrees/agent-setup-activation','status','--porcelain')==='','Rollback packet worktree modified');
const diff=spawnSync('git',['diff','--check','--','.',':(exclude)logs/agent-setup-modernization'],{cwd:root,encoding:'utf8'});
check(diff.status===0,`Whitespace failure: ${diff.stdout}${diff.stderr}`);
const result={document_links:links,adapters:9,rollback_packet_unchanged:true,failures,exit:failures.length?1:0};
writeFileSync(join(logs,'closeout-checks.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));process.exitCode=result.exit;
