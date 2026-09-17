const fs=require('fs');
const dir=process.argv[2];
const label=process.argv[3]||dir;
const save=JSON.parse(fs.readFileSync(dir+'/final_save.json','utf8'));
const ev=(save.political.control_events||[]).slice().sort((a,b)=>a.turn-b.turn);
const init=save.political.initial_political_controllers;
const targets=process.argv.slice(4);
console.log('=== '+label+' ===  total control_events: '+ev.length);
for(const t of targets){
  const hits=ev.filter(e=>(e.osid||e.settlement_id||e.id)===t);
  console.log('  '+t+'  init='+(init[t]!==undefined?init[t]:'(not in init map)')+'  events='+hits.length);
  for(const h of hits) console.log('      turn '+h.turn+' -> '+JSON.stringify(h));
}
