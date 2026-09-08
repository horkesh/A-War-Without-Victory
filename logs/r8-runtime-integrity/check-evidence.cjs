'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const pre=JSON.parse(fs.readFileSync(path.join(__dirname,'pre-fingerprint.json'),'utf8'));
const post=JSON.parse(fs.readFileSync(path.join(__dirname,'post-fingerprint.json'),'utf8'));
assert.deepEqual(post.inputs,pre.inputs,'Named production inputs must retain exact bytes');
assert.equal(git('diff','--name-only','--','data'),'', 'No data changes');
const changedSources=Object.keys(post.sources).filter(p=>post.sources[p]!==pre.sources[p]);
const allowed=['src/scenario/turn_inputs.ts','src/scenario/scenario_runner.ts','src/desktop/desktop_sim.ts',
  'src/scenario/oob_loader.ts',
  'src/data_prereq/data_prereq_registry.ts','src/data_prereq/check_data_prereqs.ts','src/scenario/scenario_types.ts',
  'src/sim/turn_pipeline_types.ts'];
for(const p of changedSources) assert(allowed.includes(p),`Unexpected source change: ${p}`);
const docs=['docs/plans/MASTER_ROADMAP.md','docs/plans/COMMAND_BOARD.md',
  'docs/plans/2026-09-07-r8-runtime-input-ai-integrity-plan.md',
  'docs/plans/2026-07-31-full-campaign-electron-validation-plan.md','docs/PROJECT_LEDGER.md'];
let links=0;
for(const file of docs) {
  const diff=git('diff','--unified=0','--',file);
  for(const line of diff.split(/\r?\n/).filter(l=>l.startsWith('+')&&!l.startsWith('+++'))) {
    for(const m of line.matchAll(/\]\(([^)]+)\)/g)) {
      const target=m[1].split('#')[0];
      if(!target||/^[a-z]+:/i.test(target)) continue;
      assert(fs.existsSync(path.resolve(root,path.dirname(file),target)),`${file}: missing ${target}`); links++;
    }
  }
}
console.log(JSON.stringify({pass:true,changedSources,inputDigest:post.inputDigest,addedLocalLinks:links,
  note:'Path targets checked; fragment rendering not independently certified.'},null,2));
