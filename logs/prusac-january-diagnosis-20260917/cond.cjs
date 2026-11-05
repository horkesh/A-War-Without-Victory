const fs=require('fs'),readline=require('readline');
const dir=process.argv[2],label=process.argv[3],bid=process.argv[4],lo=+process.argv[5],hi=+process.argv[6];
const rl=readline.createInterface({input:fs.createReadStream(dir+'/brigade_temporal_log.jsonl'),crlfDelay:Infinity});
const rows=[];
rl.on('line',l=>{ if(!l.includes('"'+bid+'"'))return; const r=JSON.parse(l); if(r.brigade_id!==bid)return; if(r.turn<lo||r.turn>hi)return; rows.push(r); });
rl.on('close',()=>{
  console.log('=== '+label+' : '+bid+' ===');
  console.log('  turn  pers  coh  mor  fat  status   location                          active_op');
  for(const r of rows) console.log('  t'+String(r.turn).padStart(3)+' '+String(r.personnel).padStart(5)+' '+String(r.cohesion).padStart(4)+' '+String(r.morale).padStart(4)+' '+String(r.fatigue).padStart(4)+'  '+String(r.status).padEnd(8)+' '+String(r.location_osid).padEnd(34)+' '+String(r.active_op_id));
});
