import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
const root=resolve(import.meta.dirname,'../..'), logs=import.meta.dirname;
const require=createRequire(import.meta.url);
const yaml=require('F:/AWWV-agent-setup-modernization-backup/20260912-8913cca6/test-runtime/node_modules/js-yaml');
const base='8913cca6f714e07acf59785ce526c19dc5fc9973';
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex').toUpperCase();
const changed=[...new Set([...git('diff',base,'--name-only').split(/\r?\n/),...git('ls-files','--others','--exclude-standard').split(/\r?\n/)])].filter(p=>p&&!p.startsWith('logs/')).sort();
const failures=[],preexisting=[],checkoutEol=[],checks={files:changed.length,skillMetadata:0,cursorMetadata:0,links:0,protectedFiles:0,numberedNapkinSections:0,curationSections:0,curationLessons:0};
const assert=(condition,message)=>{if(!condition)failures.push(message);};
const normalize=t=>t.replace(/\r\n/g,'\n').trim();
const read=p=>readFileSync(join(root,p),'utf8');
const baseText=p=>{const result=spawnSync('git',['show',`${base}:${p}`],{cwd:root,encoding:'utf8'});return result.status===0?result.stdout:'';};
const linkPattern=/\[[^\]\n]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+"[^"]*")?\)/g;
for(const path of changed) {
  assert(!/^(src\/|data\/|assets\/|\.claude\/settings|\.husky\/|\.githooks\/|tools\/hooks\/)/.test(path),`Out-of-scope mutation: ${path}`);
  if(!/\.(md|mdc|json)$/.test(path))continue;
  const text=read(path);
  assert(!/^(?:<<<<<<< |>>>>>>> |=======$)/m.test(text),`Conflict marker: ${path}`);
  if(path.endsWith('.json')) {try{JSON.parse(text.replace(/^\uFEFF/,''));}catch(error){failures.push(`${path}: ${error.message}`);}continue;}
  if(path.endsWith('SKILL.md')||path.endsWith('.mdc')) {
    const front=/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
    assert(front,`Missing frontmatter: ${path}`);
    if(front)try{
      const parsed=yaml.load(front[1]);
      assert(typeof parsed.description==='string'&&parsed.description.trim().length>0,`Missing description: ${path}`);
      if(path.endsWith('SKILL.md')) {checks.skillMetadata++;assert(parsed.name===path.split('/').at(-2),`Skill name mismatch: ${path}`);}
      else {checks.cursorMetadata++;assert(typeof parsed.alwaysApply==='boolean',`Invalid Cursor application metadata: ${path}`);}
    }catch(error){failures.push(`${path}: ${error.message}`);}
  }
  const body=text.replace(/```[^\n]*\n[\s\S]*?```/g,'');
  const oldLinks=new Set([...baseText(path).matchAll(linkPattern)].map(m=>m[1]??m[2]));
  for(const match of body.matchAll(linkPattern)) {
    const link=match[1]??match[2];
    if(/^(https?:|mailto:|app:)/.test(link))continue;
    const file=decodeURIComponent(link.split('#')[0]);
    const target=file?resolve(root,dirname(path),file):join(root,path);
    checks.links++;
    if(!existsSync(target)) {
      if(oldLinks.has(link))preexisting.push({path,link});else failures.push(`Broken introduced link: ${path} -> ${link}`);
    }
  }
}
const inventory=JSON.parse(read('logs/agent-setup-modernization/inventory.json'));
for(const file of inventory.files.filter(f=>/^(\.claude\/settings|tools\/hooks\/|tools\/architect\/hooks\/|\.husky\/|\.githooks\/|tests\/hook_registry.test.ts|scripts\/repo\/check_claude_governance.ps1)/.test(f.path))) {
  checks.protectedFiles++;
  const rawHash=hash(join(root,file.path));
  if(rawHash!==file.observed_sha256) {
    const saved=readFileSync(join(inventory.backup_root,'repo-observed',file.path),'utf8');
    const sameText=read(file.path).replaceAll('\r\n','\n')===saved.replaceAll('\r\n','\n');
    const blob=git('hash-object',`--path=${file.path}`,file.path);
    assert(sameText&&blob===file.base_blob,`Protected content drift: ${file.path}`);
    checkoutEol.push({path:file.path,raw_inventory_hash:file.observed_sha256,raw_worktree_hash:rawHash,normalized_blob:blob,base_blob:file.base_blob,only_line_endings:sameText});
  }
}
const map=JSON.parse(read('logs/agent-setup-modernization/napkin-relocation-map.json'));
const original=normalize(baseText('.claude/napkin.md'));
for(const row of map.records.filter(row=>row.section!=='Curation Rules')) {
  const heading=`## ${row.section}\n`, start=original.indexOf(heading);
  const next=original.indexOf('\n## ',start+heading.length);
  const section=original.slice(start,next<0?original.length:next).replaceAll('](napkin/','](');
  assert(start>=0&&normalize(read(row.destination)).includes(section.trim()),`Napkin section lost: ${row.section}`);checks.numberedNapkinSections++;
}
const qa=read('.claude/napkin/qa_gates.md');
assert(map.records.filter(row=>row.section==='Curation Rules').length===1,'Expected one mapped curation section');
checks.curationSections=map.records.filter(row=>row.section==='Curation Rules').length;
for(const phrase of ['Tier ladder','A COUNT WRITTEN','To promote an entry']) {assert(qa.includes(phrase),`Curation knowledge lost: ${phrase}`);checks.curationLessons++;}
const governance=read('docs/30_planning/_task_artifacts/ACTIVE_TASK_GOVERNANCE.md');
for(const heading of ['Task','Canonical owner','Demoted path','Decision boundary','Done means','UI/report truth','Roadmap slot','What this unlocks']) assert(governance.split(`\n## ${heading}\n`).length===2,`Active governance heading not unique: ${heading}`);
const manifest=JSON.parse(read('.agent/skill-distribution.json'));
assert(manifest.adapters.length===9,'Expected nine named adapters');
for(const adapter of manifest.adapters) {
  assert(hash(join(root,adapter.adapter))===adapter.adapter_sha256,`Stale adapter manifest: ${adapter.name}`);
  assert(hash(join(root,adapter.project_source))===adapter.project_source_sha256,`Stale source manifest: ${adapter.name}`);
  assert(existsSync(join(root,adapter.diff)),`Missing exact user diff: ${adapter.name}`);
}
// Raw transcripts and before/after diff artifacts retain source whitespace verbatim.
const diff=spawnSync('git',['diff','--check',base,'--','.',':(exclude)logs/agent-setup-modernization'],{cwd:root,encoding:'utf8'});
assert(diff.status===0,`diff --check: ${diff.stdout}${diff.stderr}`);
const receipt={checks,failures,preexisting_broken_links:preexisting,checkout_line_ending_differences:checkoutEol,exit:failures.length?1:0};
writeFileSync(join(logs,'static-validation.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));process.exitCode=receipt.exit;
