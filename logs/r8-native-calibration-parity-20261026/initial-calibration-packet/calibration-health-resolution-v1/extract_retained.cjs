const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = 'C:/Users/User/.codex/worktrees/october-calibration-checkpoint/A-War-Without-Victory';
const run = path.join(root, 'runs/player-parity-fatigue-owner-39-20261026-01/apr1992_definitive_188w__2272e1011ba35428__w39_n0');
const out = 'C:/tmp/player-bot-capability-parity-20261026/calibration-health-resolution-v1/retained-extraction.json';
const ids = [
  'arbih_1st_cerska','arbih_1st_kamenica','arbih_246th_vitezka_mountain',
  'hrhb_94th_brigade','hrhb_95th_brigade','hrhb_ban_jelai_brigade','hrhb_jure_franceti_brigade',
  'hrhb_kiseljak_brigade','hrhb_kreevo_brigade','hrhb_stjepan_tomaevi_brigade','hrhb_travnik_brigade',
  'hrhb_vitezovi_brigade_vitez','hvo_nikola_subic_zrinski_brigade'
];
const saveNames = ['save_w15.json','save_w16.json','save_w33.json','save_w34.json','final_save.json'];
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const snapshot = (s,id) => {
  const f=s.military.formations[id];
  const poolKey = f?.origin_mun && f?.faction ? `${f.origin_mun}:${f.faction}` : null;
  const cas = s.military.casualty_ledger?.[f?.faction]?.per_formation?.[id] ?? null;
  const mv = s.military.brigade_movement_state?.[id] ?? null;
  const order = s.military.brigade_movement_orders?.[id] ?? null;
  return {id,status:f?.status,lifecycle_status:f?.lifecycle_status??null,personnel:f?.personnel,cohesion:f?.cohesion,morale:f?.morale,
    readiness:f?.readiness,stranded_status:f?.stranded_status??null,stranded_since_turn:f?.stranded_since_turn??null,
    location_osid:f?.location_osid,home_osid:f?.home_osid,home_defense_active:f?.home_defense_active??null,
    assignment:f?.assignment??null,assigned_sub_segment_id:f?.assigned_sub_segment_id??null,ops:f?.ops??null,
    movement_state:mv,movement_order:order,active_operation:Object.values(s.military.corps_command?.[f?.corps_id]?.active_operations??[]).some(op=>(op.participating_brigades??[]).includes(id)||(op.axes??[]).some(a=>(a.assigned_brigades??[]).includes(id))),
    pool_key:poolKey,pool:poolKey?s.military.militia_pools?.[poolKey]??null:null,casualties:cas,tags:f?.tags??[]};
};
const saves = {};
for (const n of saveNames) {
  const p=path.join(run,n); const s=JSON.parse(fs.readFileSync(p,'utf8'));
  saves[n]={turn:s.meta.turn,sha256:sha(p),strategic_reserves:s.military.strategic_reserves,formations:ids.map(id=>snapshot(s,id))};
}
const temporal = fs.readFileSync(path.join(run,'brigade_temporal_log.jsonl'),'utf8').trim().split(/\r?\n/).map(JSON.parse).filter(r=>ids.includes(r.brigade_id));
const trajectory = {};
for (const id of ids) {
  const rows=temporal.filter(r=>r.brigade_id===id).sort((a,b)=>a.turn-b.turn);
  const changes=[]; let prev=null;
  for(const r of rows){
    const cur={turn:r.turn,personnel:r.personnel,cohesion:r.cohesion,morale:r.morale,fatigue:r.fatigue,lifecycle_status:r.lifecycle_status??null,location_osid:r.location_osid,sector_id:r.sector_id,active_op_id:r.active_op_id??null,mv_state:r.mv_state??null,mv_destinations:r.mv_destinations??null};
    if(!prev || Object.keys(cur).some(k=>k!=='turn'&&JSON.stringify(cur[k])!==JSON.stringify(prev[k]))) changes.push(cur);
    prev=cur;
  }
  trajectory[id]={first:rows[0]??null,last:rows.at(-1)??null,changes};
}
const result={schema:1,head:'6b36ba312b88c431088856743437aaf643f7243a',run,ids,saves,trajectory,inputs:{temporal_sha256:sha(path.join(run,'brigade_temporal_log.jsonl'))}};
fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({ok:true,out,bytes:fs.statSync(out).size,ids:ids.length,saves:saveNames.length,temporal_rows:temporal.length,sha256:sha(out)}));
