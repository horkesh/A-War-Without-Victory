const fs=require('fs');
function parse(p){
  const t=fs.readFileSync(p,'utf8');
  const out={}; const re=/artifact: '([^']+)',[\s\S]{0,800}?actual: '([0-9a-f]{64})'/g; let m;
  while((m=re.exec(t))) out[m[1]]=m[2];
  return out;
}
const ci=parse(process.argv[2]);
const loc=parse(process.argv[3]);
const man=JSON.parse(fs.readFileSync('data/derived/scenario/baselines/manifest.json','utf8')).scenarios[0].hashes;
const names=Object.keys(man).sort();
let same=0,diff=0,drift=0;
console.log('artifact'.padEnd(26),'pinned  ','ci_actual','local_act','ci==local','vs_pin');
for(const n of names){
  const eq = ci[n]!==undefined && ci[n]===loc[n];
  const pineq = loc[n]===man[n];
  if(eq)same++;else diff++;
  if(!pineq)drift++;
  console.log(n.padEnd(26), man[n].slice(0,8), ci[n]?ci[n].slice(0,8):'(none)  ', loc[n]?loc[n].slice(0,8):'(none)', eq?'YES      ':'NO       ', pineq?'match':'DRIFT');
}
console.log('\nartifacts:',names.length,' ci==local:',same,' ci!=local:',diff,' drifted-from-pin:',drift);
