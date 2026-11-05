const fs=require('fs');
const dir=process.argv[2], label=process.argv[3];
const lo=+process.argv[4], hi=+process.argv[5];
const pats=(process.argv[6]||'').split(',').filter(Boolean);
const hit=s=>pats.some(p=>String(s||'').includes(p));
const lines=fs.readFileSync(dir+'/weekly_report.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
console.log('=== '+label+' ===');
for(const w of lines){
  if(w.week_index<lo||w.week_index>hi) continue;
  for(const b of (w.battles||[])){
    if(!hit(b.target_osid) && !hit(b.attacker_brigade)) continue;
    console.log('  w'+String(w.week_index).padStart(3)+' '+String(b.outcome).padEnd(14)+
      ' ratio='+String(b.power_ratio).padEnd(7)+
      ' '+b.attacker_brigade+' -> '+(b.defender_brigade||'(undefended)')+
      '  @'+b.target_osid+'  op='+(b.operation_name||b.operation_id||'-'));
  }
}
