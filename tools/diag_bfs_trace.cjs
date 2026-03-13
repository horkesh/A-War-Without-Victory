// Trace BFS: which corps reaches Sarajevo OSIDs first?
// Simulate mapOsidsToCorps BFS but track which seed path each OSID was claimed from
const fs = require('fs');
const s = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const f = s.military.formations;
const pc = s.political.political_controllers;
const edges = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));

// Build adjacency (RS-controlled only)
const adj = new Map();
for (const e of edges.edges) {
    const ctrlA = pc[e.a], ctrlB = pc[e.b];
    if (ctrlA !== 'RS' && ctrlB !== 'RS') continue;
    // Both must be RS for internal adjacency
    if (ctrlA !== 'RS' || ctrlB !== 'RS') continue;
    if (!adj.has(e.a)) adj.set(e.a, []);
    if (!adj.has(e.b)) adj.set(e.b, []);
    adj.get(e.a).push(e.b);
    adj.get(e.b).push(e.a);
}
// Also add OSIDs from political_controllers
for (const [osid, ctrl] of Object.entries(pc)) {
    if (ctrl === 'RS' && !adj.has(osid)) adj.set(osid, []);
}

// Phase 1: home seeds
const result = new Map();
const seeds = [];
const sarajevoMunis = ['centar_sarajevo','stari_grad_sarajevo','novo_sarajevo',
    'novi_grad_sarajevo','ilidza','ilijas','vogosca','trnovo','pale','hadzici'];

for (const [fid, fm] of Object.entries(f).sort()) {
    if (fm.faction !== 'RS' || (fm.kind !== 'brigade' && fm.kind !== 'og') || fm.status !== 'active') continue;
    if (!fm.home_osid || !fm.corps_id) continue;
    if (pc[fm.home_osid] !== 'RS') continue;
    // Vote
    if (!result.has(fm.home_osid)) {
        result.set(fm.home_osid, fm.corps_id);
        seeds.push({ osid: fm.home_osid, corps: fm.corps_id });
    }
}

// Phase 1b: location (simplified — skip municipality guard for now, just trace)
for (const [fid, fm] of Object.entries(f).sort()) {
    if (fm.faction !== 'RS' || (fm.kind !== 'brigade' && fm.kind !== 'og') || fm.status !== 'active') continue;
    if (!fm.location_osid || !fm.corps_id) continue;
    if (pc[fm.location_osid] !== 'RS') continue;
    if (result.has(fm.location_osid)) continue;
    result.set(fm.location_osid, fm.corps_id);
    seeds.push({ osid: fm.location_osid, corps: fm.corps_id });
}

// BFS
const queue = [...seeds];
let head = 0;
const hops = new Map();
for (const s of seeds) hops.set(s.osid, 0);

while (head < queue.length) {
    const { osid, corps } = queue[head++];
    const neighbors = adj.get(osid) || [];
    for (const n of neighbors) {
        if (result.has(n)) continue;
        result.set(n, corps);
        hops.set(n, (hops.get(osid) || 0) + 1);
        queue.push({ osid: n, corps });
    }
}

// Report Sarajevo area
console.log('=== BFS result for Sarajevo-area RS OSIDs ===');
for (const [osid, ctrl] of Object.entries(pc).sort()) {
    if (ctrl !== 'RS') continue;
    const mun = osid.split(':')[1];
    if (!sarajevoMunis.includes(mun)) continue;
    const corps = result.get(osid) || 'UNCLAIMED';
    const h = hops.get(osid);
    console.log('  ' + osid + ' -> ' + corps + ' (hops: ' + (h !== undefined ? h : '?') + ')');
}

// Show seeds near Sarajevo
console.log('\n=== Seeds within 5 hops of any Sarajevo OSID ===');
for (const s of seeds) {
    const mun = s.osid.split(':')[1];
    if (sarajevoMunis.includes(mun)) {
        console.log('  DIRECT: ' + s.osid + ' -> ' + s.corps);
    }
}
// Also show Trnovo/Konjic/Hadzici seeds
const nearMunis = ['trnovo','konjic','hadzici','foca','kalinovik','jablanica'];
console.log('\n=== Seeds in adjacent municipalities (Trnovo/Konjic/Foca/Kalinovik) ===');
for (const s of seeds) {
    const mun = s.osid.split(':')[1];
    if (nearMunis.includes(mun)) {
        console.log('  ' + s.osid + ' -> ' + s.corps);
    }
}
