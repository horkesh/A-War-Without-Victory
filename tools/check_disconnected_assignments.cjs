/**
 * Check for brigades assigned to sectors they can't physically reach.
 * Usage: node tools/check_disconnected_assignments.cjs <run_dir>
 */
const fs = require('fs');
const path = require('path');

const runDir = process.argv[2];
if (!runDir) { console.error('Usage: node tools/check_disconnected_assignments.cjs <run_dir>'); process.exit(1); }

const save = JSON.parse(fs.readFileSync(path.join(runDir, 'final_save.json'), 'utf8'));
const graph = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));

// Build adjacency
const adj = new Map();
for (const e of graph.edges) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    if (!adj.has(e.target)) adj.set(e.target, []);
    adj.get(e.source).push(e.target);
    adj.get(e.target).push(e.source);
}

const ctrl = save.political_controllers || {};
const fmns = save.military?.formations || {};
const sectorsObj = save.military?.corps_front_sectors || {};
const sectors = Object.values(sectorsObj);

// BFS from a start node through friendly territory
function bfs(start, friendly) {
    const visited = new Set();
    const q = [start];
    visited.add(start);
    while (q.length) {
        const n = q.shift();
        for (const nb of (adj.get(n) || [])) {
            if (!visited.has(nb) && friendly.has(nb)) {
                visited.add(nb);
                q.push(nb);
            }
        }
    }
    return visited;
}

// Build faction-friendly OSID sets
const factionOsids = {};
for (const [osid, f] of Object.entries(ctrl)) {
    if (!factionOsids[f]) factionOsids[f] = new Set();
    factionOsids[f].add(osid);
}

// Check each sector assignment
let disconnected = 0;
for (const sec of sectors) {
    for (const bid of sec.assigned_brigade_ids) {
        const f = fmns[bid];
        if (!f) continue;
        const loc = f.location_osid;
        if (!loc) continue;
        const faction = f.faction;
        if (!faction) continue;
        const friendly = factionOsids[faction];
        if (!friendly) continue;
        // BFS from brigade location through friendly territory
        const reachable = bfs(loc, friendly);
        // Check if any sector territory OSID is reachable
        const canReach = sec.territory_osids.some(o => reachable.has(o));
        if (!canReach) {
            disconnected++;
            const name = f.name || bid;
            console.log(`DISCONNECTED: ${name} (${bid}) at ${loc} -> sector ${sec.sector_id} (corps: ${sec.corps_id})`);
        }
    }
}
console.log(`\nTotal disconnected assignments: ${disconnected}`);
if (disconnected === 0) {
    console.log('ALL brigades can reach their assigned sectors.');
}
