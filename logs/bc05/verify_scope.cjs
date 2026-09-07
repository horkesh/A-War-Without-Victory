const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const base = 'fd8d5e66c615fa4731cde01122d6050fbc86619f';
const git = (...args) => cp.execFileSync('git',args,{encoding:'utf8',maxBuffer:16*1024*1024});
let count = 0;
function check(ok, label) { if (!ok) throw new Error(label); console.log(`PASS ${label}`); count++; }
const old = file => git('show',`${base}:${file}`);
const read = file => fs.readFileSync(file,'utf8');
const catalog = 'data/scenarios/events/war_1994.json';
const before = JSON.parse(old(catalog));
const after = JSON.parse(read(catalog));
const event = after.find(e=>e.id==='nato_ultimatum_sarajevo_1994');
check(event.trigger.turn_min===96 && event.trigger.turn_max===97,'NATO window 96-97');
event.trigger.turn_max=96;
check(JSON.stringify(before)===JSON.stringify(after),'all other 1994 catalog fields unchanged, including choices/effects');
for (const file of ['data/scenarios/events/war_1993.json','data/scenarios/events/war_1995.json','src/sim/events/evaluate_events.ts','src/sim/turn_pipeline.ts','data/scenarios/apr1992_definitive_188w.json']) {
  check(old(file).replace(/\r\n/g,'\n')===read(file).replace(/\r\n/g,'\n'),`preserved ${file}`);
}
check(read('docs/PROJECT_LEDGER.md').replace(/\r\n/g,'\n').startsWith(old('docs/PROJECT_LEDGER.md').replace(/\r\n/g,'\n')),'prior ledger preserved in full');
const changed = git('diff','--name-only',base).trim().split(/\r?\n/).filter(f=>f.endsWith('.md'));
let links=0;
for(const file of changed) {
  const diff=git('diff',base,'--',file);
  for(const line of diff.split(/\r?\n/).filter(l=>l.startsWith('+')&&!l.startsWith('+++'))) {
    for(const match of line.matchAll(/\]\(([^)]+)\)/g)) {
      const target=match[1].replace(/^<|>$/g,'').split('#')[0];
      if(!target || /^[a-z]+:\/\//i.test(target)) continue;
      check(fs.existsSync(path.resolve(path.dirname(file),decodeURIComponent(target))),`local link ${file}: ${target}`); links++;
    }
  }
}
git('diff','--check');
console.log(`${count} scope/document checks passed; ${links} added local links resolve; diff check exit 0`);
