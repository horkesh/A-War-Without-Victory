/**
 * Check if Goražde is connected to the main RBiH blob at turn 0.
 */
const fs = require('fs');
const s = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n600/initial_save.json', 'utf8'));
const pc = s.political.political_controllers;
const graph = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));

// Build adjacency
const adj = new Map();
for (const e of graph.edges) {
    if (!adj.has(e.a)) adj.set(e.a, []);
    if (!adj.has(e.b)) adj.set(e.b, []);
    adj.get(e.a).push(e.b);
    adj.get(e.b).push(e.a);
}

// BFS from gorazde_2 through RBiH territory
const start = 'op:gorazde:gorazde_2';
const visited = new Set([start]);
const queue = [start];
let head = 0;
while (head < queue.length) {
    const curr = queue[head++];
    for (const n of (adj.get(curr) || [])) {
        if (visited.has(n)) continue;
        if (pc[n] === 'RBiH') {
            visited.add(n);
            queue.push(n);
        }
    }
}

const visoko = [...visited].filter(o => o.includes('visoko'));
console.log('Gorazde RBiH component size:', visited.size);
console.log('Visoko OSIDs reachable:', visoko.length, visoko.slice(0, 3));
const allRBiH = Object.entries(pc).filter(([k, v]) => v === 'RBiH').length;
console.log('Total RBiH OSIDs:', allRBiH);
console.log('Gorazde connected to main blob:', visited.size > 100 ? 'YES' : 'NO (isolated pocket)');

// Also check: which non-gorazde municipalities are in this component?
const muns = new Set();
for (const o of visited) {
    const parts = o.split(':');
    if (parts.length >= 2) muns.add(parts[1]);
}
console.log('\nMunicipalities in Gorazde component:', [...muns].sort().join(', '));

// Check what the 801st corps sector assignment looks like
const fmns = s.military.formations;
const f = fmns['arbih_801st_light'];
if (f) {
    console.log('\n801st at turn 0:');
    console.log('  location:', f.location_osid);
    console.log('  corps tag:', (f.tags || []).find(t => t.startsWith('corps:')));
}

// Check column march / sector assignment
const sectors = s.military.corps_front_sectors;
if (sectors) {
    for (const [sid, sec] of Object.entries(sectors)) {
        const assigned = sec.assigned_brigade_ids || [];
        const reserve = sec.reserve_brigade_ids || [];
        if (assigned.includes('arbih_801st_light') || reserve.includes('arbih_801st_light')) {
            console.log('  Assigned to sector:', sid, 'corps:', sec.corps_id);
            console.log('  Sector territory sample:', sec.territory_osids.slice(0, 5));
        }
    }
} else {
    console.log('  No sectors in initial save');
}
