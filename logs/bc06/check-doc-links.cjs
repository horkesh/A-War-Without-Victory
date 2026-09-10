'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const files=['docs/plans/MASTER_ROADMAP.md','docs/plans/COMMAND_BOARD.md',
  'docs/plans/2026-07-31-full-campaign-electron-validation-plan.md'];
let checked=0;
for(const file of files) {
  const diff=execFileSync('git',['diff','--unified=0','--',file],{encoding:'utf8'});
  for(const line of diff.split(/\r?\n/).filter(l=>l.startsWith('+')&&!l.startsWith('+++'))) {
    for(const match of line.matchAll(/\]\(([^)]+)\)/g)) {
      const target=match[1].split('#')[0];
      if(!target||/^[a-z]+:/i.test(target))continue;
      assert(fs.existsSync(path.resolve(path.dirname(file),target)),`${file}: missing ${target}`);
      checked++;
    }
  }
}
console.log(`PASS: ${checked} added local documentation link targets exist. Fragment rendering not separately certified.`);
