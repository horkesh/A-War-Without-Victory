const fs = require('node:fs');
const cp = require('node:child_process');
const path = require('node:path');
const base = '0690a47eacb133631f32324681c8eb5343afc03a';
const git = (...args) => cp.execFileSync('git',args,{encoding:'utf8',maxBuffer:16*1024*1024});
const read = p => fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
const before = p => git('show',`${base}:${p}`).replace(/\r\n/g,'\n');
let checks=0;
function check(ok,label){if(!ok)throw Error(label);console.log('PASS '+label);checks++;}
const catalog='data/scenarios/events/war_1993.json';
const priorRows=JSON.parse(before(catalog)).filter(e=>e.id!=='operation_lukavac_93');
const currentRows=JSON.parse(read(catalog));
const priorNato=priorRows.find(e=>e.id==='nato_air_strike_threat_1993');
const currentNato=currentRows.find(e=>e.id==='nato_air_strike_threat_1993');
check(Boolean(priorNato&&currentNato),'NATO 1993 notice retained');
priorNato.narrative=currentNato.narrative;
check(JSON.stringify(currentRows)===JSON.stringify(priorRows),'only Lukavac removal and NATO1993 stale-choice narrative cleanup in catalog; all other fields preserved');
const changes=git('diff','--name-only',base).trim().split(/\r?\n/);
check(!changes.some(p=>p.startsWith('src/')),'all production source code preserved, including military operations and event evaluator');
check(git('ls-files','--others','--exclude-standard','--','src').trim()==='','no untracked production source added');
const allowedData=new Set([catalog,'data/scenarios/essays/essay_index.json','data/scenarios/essays/operation_lukavac_93.json','data/scenarios/essays/nato_air_strike_threat_1993.json']);
check(changes.filter(p=>p.startsWith('data/')).every(p=>allowedData.has(p)),'no unrelated data, maps, floors or baseline edits');
for(const p of ['data/scenarios/events/war_1994.json','data/scenarios/events/war_1995.json','data/scenarios/apr1992_definitive_188w.json'])check(read(p)===before(p),'preserved '+p);
check(read('docs/PROJECT_LEDGER.md').startsWith(before('docs/PROJECT_LEDGER.md')),'prior ledger preserved');
for(const p of changes.filter(p=>p.endsWith('.md'))){
 for(const line of git('diff',base,'--',p).split(/\r?\n/).filter(l=>l.startsWith('+')&&!l.startsWith('+++'))){
  for(const m of line.matchAll(/\]\(([^)]+)\)/g)){
   const target=m[1].replace(/^<|>$/g,'').split('#')[0];
   if(target&&!/^[a-z]+:\/\//i.test(target))check(fs.existsSync(path.resolve(path.dirname(p),decodeURIComponent(target))),'local link '+p+': '+target);
  }
 }
}
git('diff','--check');
console.log(`${checks} checks passed; diff check exit 0`);
