// Replay a save's control_events to turn T, list unheld pockets (formations: none known per-turn, so list all small pockets);
// and dump operation_history name/turn/faction. usage: node t136.cjs <save.json> <T> [label]
const fs = require('fs');
const raw = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const s = raw.state ?? raw.gameState ?? raw;
const T = Number(process.argv[3]);
const init = s.political.initial_political_controllers;
const ev = (s.political.control_events || []).slice().sort((a, b) => a.turn - b.turn);
const pc = { ...init }; for (const e of ev) if (e.turn <= T) pc[e.settlement_id] = e.to;
const g = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));
const adj = new Map(); for (const n of g.nodes) adj.set(n.id, []); for (const e of g.edges) { adj.get(e.a).push(e.b); adj.get(e.b).push(e.a); }
const seen = new Set(); const comps = [];
for (const n of g.nodes.map((x) => x.id).sort()) { if (seen.has(n)) continue; const f = pc[n]; const q = [n]; seen.add(n); const c = []; while (q.length) { const x = q.pop(); c.push(x); for (const y of adj.get(x)) if (!seen.has(y) && pc[y] === f) { seen.add(y); q.push(y); } } comps.push({ f, c }); }
const big = {}; for (const k of comps) if (!big[k.f] || k.c.length > big[k.f].c.length) big[k.f] = k;
console.log(`[${process.argv[4] || ''}] small pockets (<=6) at t${T}:`);
for (const k of comps) { if (k === big[k.f] || k.c.length > 6) continue; const set = new Set(k.c); const ring = new Set(); for (const o of k.c) for (const y of adj.get(o)) if (!set.has(y)) ring.add(pc[y]); console.log('  ', k.f, k.c.length, 'ring', [...ring].sort().join('/'), '|', k.c.map((x) => x.replace('op:', '')).sort().join(' ')); }
const oh = s.operation_history || s.military.operation_history || [];
const ops = Array.isArray(oh) ? oh : Object.values(oh);
const fac = (o) => o.faction ?? s.military.formations?.[o.corps_id]?.faction ?? '?';
const t = (o) => o.started_turn ?? o.start_turn ?? o.launched_turn ?? o.turn ?? o.created_turn;
const tally = {}; for (const o of ops) { const k = fac(o) + (t(o) > 20 ? '>t20' : '<=t20'); tally[k] = (tally[k] || 0) + 1; }
console.log('ops by faction/period', JSON.stringify(tally), 'total', ops.length);
console.log('RS ops:', ops.filter((o) => fac(o) === 'RS').map((o) => `${o.name}@${t(o)}`).join('; '));
if (process.argv[5] === 'keys' && ops[0]) console.log('op keys', Object.keys(ops[0]).join(','));
