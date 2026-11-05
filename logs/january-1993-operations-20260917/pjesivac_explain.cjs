const fs = require('fs');
const rd = 'runs/apr1992_definitive_188w__9137f75e9f35be20__w39_n402';
const save = JSON.parse(fs.readFileSync(rd + '/final_save.json', 'utf8'));

// 1. Any sector listing pjesivac_kula_2 as an enemy osid?
const sectors = save.military.corps_front_sectors || {};
console.log('=== sectors referencing stolac:pjesivac_kula_2 ===');
for (const sid of Object.keys(sectors).sort()) {
  const s = sectors[sid];
  const txt = JSON.stringify(s);
  if (txt.includes('pjesivac_kula_2')) {
    console.log(sid, 'corps=' + s.corps_id, 'faction=' + s.faction, 'territory=' + (s.territory_osids || []).length, 'assigned=' + (s.assigned_brigade_ids || []).length, 'reserve=' + (s.reserve_brigade_ids || []).length);
  }
}

// 2. Formations in the region / attacker at t39.
console.log('=== formations (attacker + any at stolac cells) ===');
for (const [id, f] of Object.entries(save.military.formations || {})) {
  if (id === 'hrhb_1st_brigade_mostar' || (f.location_osid || '').startsWith('op:stolac:')) {
    console.log(id, 'faction=' + f.faction, 'kind=' + f.kind, 'pers=' + f.personnel, 'cohesion=' + f.cohesion, 'loc=' + f.location_osid, 'home=' + f.home_osid, 'corps=' + f.corps_id);
  }
}

// 3. Truce / vienna declaration.
console.log('=== truce fields ===');
console.log('vienna_declaration_turn:', save.political.vienna_declaration_turn);
console.log('truce_broken_turn:', JSON.stringify(save.political.truce_broken_turn));
console.log('graz/alliance:', save.political.war_alliance_rbih_hrhb);
const evs = (save.political.control_events || []);
console.log('control events before t20 on stolac:', evs.filter(e => /stolac/.test(e.settlement_id) && e.turn <= 20).map(e => 't' + e.turn + ':' + e.settlement_id + ':' + e.from + '->' + e.to).join(' | '));
