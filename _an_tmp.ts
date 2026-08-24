import { loadOperationalEdges } from './src/data/operational_data.js';
import { buildOsidAdjacency } from './src/sim/combat/osid_adjacency.js';
import { readFileSync } from 'node:fs';
async function main(){
const adj = buildOsidAdjacency((await loadOperationalEdges(process.cwd())) as never);
const save = JSON.parse(readFileSync('runs/apr1992_definitive_188w__0589220209545186__w188_n287/final_save.json','utf8'));
const init = save.political.initial_political_controllers as Record<string,string>;
const isAdj=(a:string,b:string)=>(adj.get(a)??[]).includes(b);
const T=['op:cajnice:batotici','op:cajnice:miljeno_2','op:cajnice:todorovici','op:foca:brusna_2','op:zvornik:djulici'];
for(const t of T){
  console.log(t.replace('op:','').padEnd(22),'init',init[t]);
  console.log('   nbrs:',(adj.get(t)??[]).map(n=>n.replace('op:','')+'('+init[n]+')').join(' '));
}
console.log('\ninter-target adjacency (Cajnice cluster):');
for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)
  console.log('   '+T[i].split(':').pop()+' <-> '+T[j].split(':').pop()+' : '+isAdj(T[i],T[j]));
console.log('\nOperation Foca objectives -> adjacency to Cajnice cluster:');
const foca=['op:foca:foca_3','op:foca:patkovina','op:foca:prevrac','op:foca:ustikolina','op:foca:zavait_3','op:foca:velenici_2'];
for(const f of foca){
  if(!adj.get(f)) { console.log('   '+f.replace('op:','')+' NOT IN GRAPH'); continue; }
  const hits=T.filter(t=>isAdj(f,t)).map(t=>t.split(':').pop());
  console.log('   '+f.replace('op:','').padEnd(18),'init',String(init[f]).padEnd(5),hits.length?'-> adj '+hits.join(','):'');
}
}
main();
