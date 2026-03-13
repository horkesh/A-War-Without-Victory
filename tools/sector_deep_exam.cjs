/**
 * Deep sector examination for SECTOR_MASTER report.
 * Checks: contiguity, density, empty sectors, brigade assignments,
 * cross-corps issues, enclave coverage, stacking, corps AoR plausibility.
 */
const fs = require('fs');
const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const graph = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));

const sectors = save.military.corps_front_sectors;
const formations = save.military.formations;
const pc = save.political.political_controllers;

// Build adjacency
const adj = new Map();
for (const e of graph.edges) {
    if (!adj.has(e.a)) adj.set(e.a, []);
    if (!adj.has(e.b)) adj.set(e.b, []);
    adj.get(e.a).push(e.b);
    adj.get(e.b).push(e.a);
}

// Corps → faction mapping
const corpsFaction = {};
for (const [fid, f] of Object.entries(formations)) {
    if (f.kind === 'corps' || f.kind === 'army_hq') {
        corpsFaction[fid] = f.faction;
    }
}

// ═══════════════════════════════════════════
// 1. SECTOR OVERVIEW
// ═══════════════════════════════════════════
const sectorList = Object.entries(sectors).sort((a, b) => a[0].localeCompare(b[0]));
const byFaction = { RBiH: [], RS: [], HRHB: [] };
for (const [sid, sec] of sectorList) {
    const f = sec.faction;
    if (byFaction[f]) byFaction[f].push({ sid, sec });
}

console.log('═══ SECTOR OVERVIEW ═══');
console.log(`Total sectors: ${sectorList.length}`);
for (const [faction, secs] of Object.entries(byFaction)) {
    const totalEdges = secs.reduce((s, x) => s + x.sec.edge_ids.length, 0);
    const totalBrigades = secs.reduce((s, x) => s + x.sec.assigned_brigade_ids.length + x.sec.reserve_brigade_ids.length, 0);
    const emptyCount = secs.filter(x => x.sec.assigned_brigade_ids.length === 0 && x.sec.reserve_brigade_ids.length === 0).length;
    console.log(`  ${faction}: ${secs.length} sectors, ${totalEdges} edges, ${totalBrigades} brigades, ${emptyCount} empty`);
}

// ═══════════════════════════════════════════
// 2. EMPTY SECTORS (front edges but no brigades)
// ═══════════════════════════════════════════
console.log('\n═══ EMPTY SECTORS (front edges, zero brigades) ═══');
for (const [sid, sec] of sectorList) {
    if (sec.edge_ids.length > 0 && sec.assigned_brigade_ids.length === 0 && sec.reserve_brigade_ids.length === 0) {
        const friendly = new Set();
        for (const ss of sec.sub_segments) for (const o of ss.friendly_osids) friendly.add(o);
        const munis = [...new Set([...friendly].map(o => o.split(':')[1]))].sort();
        console.log(`  ${sid}: ${sec.edge_ids.length} edges, municipalities: ${munis.join(', ')}`);
    }
}

// ═══════════════════════════════════════════
// 3. DENSITY ANALYSIS
// ═══════════════════════════════════════════
console.log('\n═══ DENSITY EXTREMES ═══');
const densities = [];
for (const [sid, sec] of sectorList) {
    if (sec.edge_ids.length === 0) continue;
    const brig = sec.assigned_brigade_ids.length + sec.reserve_brigade_ids.length;
    const density = brig / sec.edge_ids.length;
    densities.push({ sid, brig, edges: sec.edge_ids.length, density, faction: sec.faction, corps: sec.corps_id });
}
densities.sort((a, b) => b.density - a.density);

console.log('Top 10 densest:');
for (const d of densities.slice(0, 10)) {
    console.log(`  ${d.sid}: ${d.brig} brig / ${d.edges} edges = ${d.density.toFixed(2)} [${d.faction} ${d.corps}]`);
}
console.log('Bottom 10 (thinnest manned):');
const manned = densities.filter(d => d.brig > 0);
manned.sort((a, b) => a.density - b.density);
for (const d of manned.slice(0, 10)) {
    console.log(`  ${d.sid}: ${d.brig} brig / ${d.edges} edges = ${d.density.toFixed(2)} [${d.faction} ${d.corps}]`);
}

// ═══════════════════════════════════════════
// 4. SHARED-OSID CONTIGUITY CHECK
// ═══════════════════════════════════════════
console.log('\n═══ CONTIGUITY CHECK (shared-OSID) ═══');
let nonContiguous = 0;
for (const [sid, sec] of sectorList) {
    if (sec.edge_ids.length <= 1) continue;
    const allFriendly = new Set();
    for (const ss of sec.sub_segments) for (const o of ss.friendly_osids) allFriendly.add(o);

    // Build shared-OSID edge adjacency
    const friendlyToEdges = new Map();
    const hostileToEdges = new Map();
    for (const eid of sec.edge_ids) {
        const sep = eid.indexOf('__');
        if (sep < 0) continue;
        const a = eid.slice(0, sep), b = eid.slice(sep + 2);
        const friendly = allFriendly.has(a) ? a : allFriendly.has(b) ? b : null;
        if (!friendly) continue;
        const hostile = friendly === a ? b : a;
        if (!friendlyToEdges.has(friendly)) friendlyToEdges.set(friendly, []);
        friendlyToEdges.get(friendly).push(eid);
        if (!hostileToEdges.has(hostile)) hostileToEdges.set(hostile, []);
        hostileToEdges.get(hostile).push(eid);
    }

    // BFS on edge adjacency
    const edgeNb = new Map();
    const link = (a, b) => {
        if (a === b) return;
        if (!edgeNb.has(a)) edgeNb.set(a, new Set());
        if (!edgeNb.has(b)) edgeNb.set(b, new Set());
        edgeNb.get(a).add(b);
        edgeNb.get(b).add(a);
    };
    for (const edges of friendlyToEdges.values()) {
        for (let i = 0; i < edges.length; i++)
            for (let j = i + 1; j < edges.length; j++)
                link(edges[i], edges[j]);
    }
    for (const edges of hostileToEdges.values()) {
        for (let i = 0; i < edges.length; i++)
            for (let j = i + 1; j < edges.length; j++)
                link(edges[i], edges[j]);
    }

    // Find components
    const visited = new Set();
    let compCount = 0;
    for (const eid of sec.edge_ids) {
        if (visited.has(eid)) continue;
        compCount++;
        const queue = [eid];
        visited.add(eid);
        while (queue.length > 0) {
            const curr = queue.shift();
            for (const nb of (edgeNb.get(curr) || [])) {
                if (!visited.has(nb)) { visited.add(nb); queue.push(nb); }
            }
        }
    }

    if (compCount > 1) {
        nonContiguous++;
        console.log(`  NON-CONTIGUOUS: ${sid} — ${compCount} components, ${sec.edge_ids.length} edges`);
    }
}
if (nonContiguous === 0) console.log('  ALL SECTORS CONTIGUOUS');

// ═══════════════════════════════════════════
// 5. BRIGADE ASSIGNMENT AUDIT
// ═══════════════════════════════════════════
console.log('\n═══ BRIGADE ASSIGNMENT AUDIT ═══');
const assignedBrigades = new Set();
const reserveBrigades = new Set();
const duplicates = [];
for (const [sid, sec] of sectorList) {
    for (const bid of sec.assigned_brigade_ids) {
        if (assignedBrigades.has(bid) || reserveBrigades.has(bid)) duplicates.push({ bid, sid });
        assignedBrigades.add(bid);
    }
    for (const bid of sec.reserve_brigade_ids) {
        if (assignedBrigades.has(bid) || reserveBrigades.has(bid)) duplicates.push({ bid, sid });
        reserveBrigades.add(bid);
    }
}

// Find unassigned combat brigades
const allAssigned = new Set([...assignedBrigades, ...reserveBrigades]);
const unassigned = [];
for (const [fid, f] of Object.entries(formations)) {
    if (f.kind !== 'brigade' && f.kind !== 'paramilitary') continue;
    if (f.status === 'destroyed' || f.status === 'not_yet_formed') continue;
    if (!allAssigned.has(fid)) {
        unassigned.push({ fid, faction: f.faction, corps: f.corps_id, location: f.location_osid, personnel: f.personnel });
    }
}

console.log(`Total assigned: ${assignedBrigades.size} front + ${reserveBrigades.size} reserve = ${allAssigned.size}`);
console.log(`Duplicates: ${duplicates.length}`);
if (duplicates.length > 0) for (const d of duplicates) console.log(`  DUP: ${d.bid} in ${d.sid}`);
console.log(`Unassigned active brigades: ${unassigned.length}`);
for (const u of unassigned) {
    console.log(`  ${u.fid} [${u.faction}/${u.corps}] at ${u.location} (${u.personnel} pers)`);
}

// ═══════════════════════════════════════════
// 6. CROSS-CORPS CHECKS
// ═══════════════════════════════════════════
console.log('\n═══ CROSS-CORPS BRIGADE LOCATION vs SECTOR ═══');
let crossCorps = 0;
for (const [sid, sec] of sectorList) {
    for (const bid of [...sec.assigned_brigade_ids, ...sec.reserve_brigade_ids]) {
        const f = formations[bid];
        if (!f) continue;
        if (f.corps_id !== sec.corps_id) {
            crossCorps++;
            console.log(`  CROSS-CORPS: ${bid} (corps=${f.corps_id}) in sector ${sid} (corps=${sec.corps_id})`);
        }
    }
}
if (crossCorps === 0) console.log('  ALL BRIGADES IN OWN-CORPS SECTORS');

// ═══════════════════════════════════════════
// 7. CORPS AoR GEOGRAPHIC PLAUSIBILITY
// ═══════════════════════════════════════════
console.log('\n═══ CORPS SECTOR GEOGRAPHY ═══');
const corpsSectors = {};
for (const [sid, sec] of sectorList) {
    if (!corpsSectors[sec.corps_id]) corpsSectors[sec.corps_id] = [];
    corpsSectors[sec.corps_id].push(sec);
}

for (const [corps, secs] of Object.entries(corpsSectors).sort()) {
    const allMunis = new Set();
    let totalEdges = 0, totalBrigades = 0;
    for (const sec of secs) {
        totalEdges += sec.edge_ids.length;
        totalBrigades += sec.assigned_brigade_ids.length + sec.reserve_brigade_ids.length;
        for (const ss of sec.sub_segments) {
            for (const o of ss.friendly_osids) allMunis.add(o.split(':')[1]);
        }
    }
    console.log(`  ${corps}: ${secs.length} sectors, ${totalEdges} edges, ${totalBrigades} brigades`);
    console.log(`    Municipalities: ${[...allMunis].sort().join(', ')}`);
}

// ═══════════════════════════════════════════
// 8. STACKING (brigades per OSID)
// ═══════════════════════════════════════════
console.log('\n═══ BRIGADE STACKING (by location OSID) ═══');
const osidStacks = {};
for (const [fid, f] of Object.entries(formations)) {
    if (f.kind !== 'brigade') continue;
    if (f.status === 'destroyed' || f.status === 'not_yet_formed') continue;
    const osid = f.location_osid;
    if (!osid) continue;
    if (!osidStacks[osid]) osidStacks[osid] = [];
    osidStacks[osid].push({ fid, faction: f.faction, personnel: f.personnel });
}

const stacks = Object.entries(osidStacks)
    .map(([osid, brigs]) => ({ osid, count: brigs.length, brigs }))
    .filter(s => s.count >= 5)
    .sort((a, b) => b.count - a.count);

console.log(`OSIDs with 5+ brigades: ${stacks.length}`);
for (const s of stacks.slice(0, 10)) {
    const factions = [...new Set(s.brigs.map(b => b.faction))].join('/');
    const totalPers = s.brigs.reduce((sum, b) => sum + b.personnel, 0);
    console.log(`  ${s.osid}: ${s.count} brigades (${factions}), ${totalPers} total personnel`);
}

// ═══════════════════════════════════════════
// 9. ENCLAVE SECTOR COVERAGE
// ═══════════════════════════════════════════
console.log('\n═══ ENCLAVE COVERAGE ═══');
const enclaves = {
    'Srebrenica': ['srebrenica', 'bratunac'],
    'Zepa': ['rogatica'], // zepa osids are in rogatica mun
    'Gorazde': ['gorazde'],
    'Bihac': ['bihac', 'bosanska_krupa', 'cazin', 'velika_kladusa'],
    'Sarajevo': ['stari_grad_sarajevo', 'centar_sarajevo', 'novo_sarajevo', 'novi_grad_sarajevo']
};

for (const [name, munis] of Object.entries(enclaves)) {
    const munSet = new Set(munis);
    // Find sectors covering these municipalities
    const coveringSectors = [];
    for (const [sid, sec] of sectorList) {
        if (sec.faction !== 'RBiH') continue;
        const sectorMunis = new Set();
        for (const ss of sec.sub_segments) {
            for (const o of ss.friendly_osids) sectorMunis.add(o.split(':')[1]);
        }
        const overlap = [...sectorMunis].filter(m => munSet.has(m));
        if (overlap.length > 0) {
            coveringSectors.push({
                sid, edges: sec.edge_ids.length,
                brigades: sec.assigned_brigade_ids.length + sec.reserve_brigade_ids.length,
                overlap
            });
        }
    }
    const totalBrig = coveringSectors.reduce((s, x) => s + x.brigades, 0);
    console.log(`  ${name}: ${coveringSectors.length} sectors, ${totalBrig} brigades`);
    for (const cs of coveringSectors) {
        console.log(`    ${cs.sid}: ${cs.edges} edges, ${cs.brigades} brig, munis: ${cs.overlap.join(',')}`);
    }
}

// ═══════════════════════════════════════════
// 10. SECTOR SIZE DISTRIBUTION
// ═══════════════════════════════════════════
console.log('\n═══ SECTOR SIZE DISTRIBUTION ═══');
const edgeBuckets = { '1-3': 0, '4-8': 0, '9-15': 0, '16-25': 0, '26+': 0 };
for (const [sid, sec] of sectorList) {
    const e = sec.edge_ids.length;
    if (e <= 3) edgeBuckets['1-3']++;
    else if (e <= 8) edgeBuckets['4-8']++;
    else if (e <= 15) edgeBuckets['9-15']++;
    else if (e <= 25) edgeBuckets['16-25']++;
    else edgeBuckets['26+']++;
}
for (const [bucket, count] of Object.entries(edgeBuckets)) {
    console.log(`  ${bucket} edges: ${count} sectors`);
}

// Summary stats
const edgeCounts = sectorList.map(([, s]) => s.edge_ids.length).filter(e => e > 0);
edgeCounts.sort((a, b) => a - b);
const median = edgeCounts[Math.floor(edgeCounts.length / 2)];
const mean = (edgeCounts.reduce((s, e) => s + e, 0) / edgeCounts.length).toFixed(1);
console.log(`  Median: ${median}, Mean: ${mean}, Min: ${edgeCounts[0]}, Max: ${edgeCounts[edgeCounts.length - 1]}`);
