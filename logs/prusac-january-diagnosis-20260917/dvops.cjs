const fs=require('fs');
const dir=process.argv[2],label=process.argv[3],lo=+process.argv[4],hi=+process.argv[5];
const lines=fs.readFileSync(dir+'/weekly_report.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
console.log('=== '+label+' ===');
for(const w of lines){
  if(w.week_index<lo||w.week_index>hi) continue;
  for(const d of (w.operation_diagnostics||[])){
    if(!String(d.operation_name).includes('Donji Vakuf')) continue;
    console.log('  w'+String(w.week_index).padStart(3)+' phase='+String(d.operation_phase).padEnd(10)+
      ' obj='+String(d.current_objective).padEnd(30)+
      ' atk_attempts='+d.attack_attempt_count+' battles='+d.battle_count+
      ' elig_attackers='+d.eligible_attacker_count+
      ' skipped='+JSON.stringify(d.skipped_attack_orders)+
      ' recovery='+String(d.recovery_reason)+
      ' invalid='+JSON.stringify(d.invalidation_reasons));
  }
}
