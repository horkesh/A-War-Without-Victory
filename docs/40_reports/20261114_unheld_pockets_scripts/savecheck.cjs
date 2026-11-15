// Inspect a desktop save: autonomy, pockets, RS corps commander status, op history for the 1KK/2KK pocket ops.
// usage (from repo root): node savecheck.cjs <save.json>
const fs = require('fs');
const raw = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const s = raw.state ?? raw.gameState ?? raw;
const m = s.meta || {};
console.log('turn', m.turn, 'date', m.date ?? m.current_date, 'player', m.player_faction, 'autonomy', m.autonomy_level, 'pending', m.autonomy_level_pending, 'headless', m.headless_scenario_auto_control);
const pc = s.political.political_controllers;
const CELLS = ['op:bosanska_krupa:arapusa_2', 'op:donji_vakuf:torlakovac_2', 'op:jajce:divicani_2', 'op:jajce:barevo_2', 'op:jajce:jajce_3', 'op:jajce:vinac_2', 'op:jajce:kruscica', 'op:jajce:grdovo', 'op:jajce:lupnica', 'op:jajce:jezero_2', 'op:sipovo:volari_2', 'op:mrkonjic_grad:baljvine_2', 'op:skender_vakuf:donji_koricani', 'op:travnik:gornje_krcevine', 'op:kotor_varos:kotor_varos_2'];
const ev = s.political.control_events || [];
for (const c of CELLS) console.log('  ', c.replace('op:', '').padEnd(32), pc[c], '|', ev.filter((e) => e.settlement_id === c).map((e) => `t${e.turn}:${e.from}->${e.to}(${e.mechanism})`).join(' ') || 'no events');
// pockets by connected components
const g = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));
const adj = new Map(); for (const n of g.nodes) adj.set(n.id, []); for (const e of g.edges) { adj.get(e.a).push(e.b); adj.get(e.b).push(e.a); }
const forms = Object.values(s.military.formations || {}).filter((f) => f.status === 'active' && f.location_osid);
const seen = new Set(); const comps = [];
for (const n of g.nodes.map((x) => x.id).sort()) { if (seen.has(n)) continue; const f = pc[n]; const q = [n]; seen.add(n); const c = []; while (q.length) { const x = q.pop(); c.push(x); for (const y of adj.get(x)) if (!seen.has(y) && pc[y] === f) { seen.add(y); q.push(y); } } comps.push({ f, c }); }
const big = {}; for (const k of comps) if (!big[k.f] || k.c.length > big[k.f].c.length) big[k.f] = k;
console.log('pockets (non-main components):');
for (const k of comps) { if (k === big[k.f]) continue; const set = new Set(k.c); const own = forms.filter((f) => f.faction === k.f && set.has(f.location_osid)).map((f) => f.id); const ring = new Set(); for (const o of k.c) for (const y of adj.get(o)) if (!set.has(y)) ring.add(pc[y]); console.log('  ', k.f, k.c.length, 'ring', [...ring].sort().join('/'), 'own', own.length ? own.join(',') : 'NONE', '|', k.c.map((x) => x.replace('op:', '')).join(' ')); }
// RS / HRHB / RBiH corps commander status
const cc = s.military.corps_command || {};
const facOf = (id) => (s.military.formations?.[id]?.faction);
const tally = {};
for (const [id, c] of Object.entries(cc)) {
  const f = facOf(id) || '?';
  const plan = c.commander_state?.current_plan;
  const key = `${f}|${plan ? plan.status : 'no-plan'}|${c.status_reason || '-'}`;
  tally[key] = (tally[key] || 0) + 1;
  if (/krajina/.test(id)) console.log('  corps', id, 'plan', plan ? `${plan.status} ${plan.plan_id ?? ''} ${plan.purpose ?? plan.target_purpose ?? ''}` : 'none', '| reason', c.status_reason, '| active ops', (c.active_operations || []).map((o) => o.name).join('; ') || '-');
}
console.log('commander status tally:'); for (const [k, v] of Object.entries(tally).sort()) console.log('  ', v, k);
// operation history
const oh = s.military.operation_history || s.operation_history || [];
const ops = Array.isArray(oh) ? oh : Object.values(oh);
console.log('operation_history entries', ops.length);
const byFacSrc = {};
for (const o of ops) { const k = `${o.faction ?? facOf(o.corps_id) ?? '?'}|${o.source ?? o.origin ?? o.kind ?? o.type ?? '?'}`; byFacSrc[k] = (byFacSrc[k] || 0) + 1; }
console.log('by faction|source', JSON.stringify(byFacSrc));
for (const o of ops) if (/Jajce|Donji Vakuf|Kotor Var|Greben|Obru|Sjever|Stjena|Topola|Posavina Corridor|Bosanski Novi/.test(o.name || '')) console.log('  op', o.name, 'turn', o.start_turn ?? o.turn ?? o.launched_turn, '->', o.end_turn ?? o.completed_turn, 'outcome', o.outcome ?? o.result ?? o.status);
// RS ops by start turn after 20, by type
const rsAfter = ops.filter((o) => (o.faction ?? facOf(o.corps_id)) === 'RS' && (o.start_turn ?? o.turn ?? 0) > 20);
console.log('RS ops after t20:', rsAfter.length, 'sample names', rsAfter.slice(0, 12).map((o) => o.name).join('; '));
