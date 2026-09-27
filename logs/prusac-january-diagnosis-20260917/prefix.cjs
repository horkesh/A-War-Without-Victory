const fs=require('fs');
function load(p){return fs.readFileSync(p,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));}
const A=load(process.argv[2]); // 188w reproduction
const B=load(process.argv[3]); // n403 w39
console.log('lines A(188w)='+A.length+'  B(n403 w39)='+B.length);
const N=Math.min(A.length,B.length);
let identical=0; const diffWeeks=[];
for(let i=0;i<N;i++){
  const a=JSON.stringify(A[i]), b=JSON.stringify(B[i]);
  if(a===b) identical++;
  else {
    const ka=Object.keys(A[i]).sort(), kb=Object.keys(B[i]).sort();
    const keys=[...new Set([...ka,...kb])].sort();
    const bad=keys.filter(k=>JSON.stringify(A[i][k])!==JSON.stringify(B[i][k]));
    diffWeeks.push({week:A[i].week_index, keys:bad});
  }
}
console.log('compared weeks 1..'+N+' : identical='+identical+'  differing='+diffWeeks.length);
for(const d of diffWeeks.slice(0,12)) console.log('  week',d.week,'differs in:',d.keys.join(', '));
if(diffWeeks.length>12) console.log('  ... +'+(diffWeeks.length-12)+' more');
