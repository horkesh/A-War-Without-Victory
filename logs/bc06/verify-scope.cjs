'use strict';
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const assert = require('node:assert/strict');
const base='4c419c464adce4e59d9046b37b79d163979d5c7d';
const file='data/scenarios/events/war_1993.json';
const before=JSON.parse(execFileSync('git',['show',`${base}:${file}`],{encoding:'utf8',maxBuffer:10e6}));
const after=JSON.parse(fs.readFileSync(file,'utf8'));
const changed=[];
assert.equal(after.length,before.length,'No event activation or removal');
for(let i=0;i<before.length;i++) {
  assert.equal(after[i].id,before[i].id,'Stable catalog ordering');
  const restored=structuredClone(after[i]);
  if(JSON.stringify(before[i])!==JSON.stringify(restored)) {
    assert(before[i].action_cadence,'Only gesture cadence rows may change');
    assert.equal(before[i].action_cadence.escalation,'static');
    assert.equal(restored.action_cadence.escalation,'escalating');
    restored.action_cadence.escalation='static';
    changed.push(before[i].id);
  }
  assert.deepEqual(restored,before[i],`Only cadence classification may change: ${before[i].id}`);
}
const protectedPaths=['data/scenarios/events/war_1994.json','data/scenarios/events/war_1995.json',
  'data/scenarios/apr1992_definitive_188w.json','data/derived/startup/apr_1992_initial_save.json',
  'data/source/calibration','src/sim/combat','src/sim/events/evaluate_events.ts'];
for(const p of protectedPaths) {
  assert.equal(execFileSync('git',['diff',base,'--',p],{encoding:'utf8'}),'',`Protected input/source preserved: ${p}`);
}
console.log(JSON.stringify({pass:true,base,changedCadenceRows:changed,protectedPaths},null,2));
