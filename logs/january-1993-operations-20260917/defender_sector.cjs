const fs = require('fs');
const rd = 'runs/apr1992_definitive_188w__9137f75e9f35be20__w39_n402';
const save = JSON.parse(fs.readFileSync(rd + '/final_save.json', 'utf8'));
const s = save.military.corps_front_sectors['sector:vrs_herzegovina:3'];
console.log('vrs_herzegovina:3 assigned at t39:', JSON.stringify(s.assigned_brigade_ids), 'reserve:', JSON.stringify(s.reserve_brigade_ids));
console.log('vrs_herzegovina:3 sub_segments enemy_osids:');
for (const ss of s.sub_segments || []) console.log('  ', ss.sub_segment_id, 'friendly=' + JSON.stringify(ss.friendly_osids), 'enemy=' + JSON.stringify(ss.enemy_osids));
for (const id of s.assigned_brigade_ids || []) {
  const f = save.military.formations[id] || {};
  console.log('  brg', id, 'faction=' + f.faction, 'pers=' + f.personnel, 'cohesion=' + f.cohesion, 'loc=' + f.location_osid, 'status=' + f.status, 'disrupted=' + f.disrupted_turns);
}

// weekly report structure around t15 for the attacker
const lines = fs.readFileSync(rd + '/weekly_report.jsonl', 'utf8').split('\n').filter(Boolean);
for (const line of lines) {
  let r; try { r = JSON.parse(line); } catch { continue; }
  if (r.week_index !== 15) continue;
  console.log('w15 keys:', Object.keys(r));
  console.log('w15 activity:', JSON.stringify(r.activity).slice(0, 600));
  console.log('w15 column_movement:', JSON.stringify(r.column_movement).slice(0, 400));
  console.log('w15 ops:', JSON.stringify(r.ops));
  console.log('w15 corps_summary (hvo_southeast):', JSON.stringify((r.corps_summary || []).filter(c => JSON.stringify(c).includes('southeast'))).slice(0, 500));
}
