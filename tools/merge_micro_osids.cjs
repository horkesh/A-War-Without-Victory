/**
 * merge_micro_osids.cjs
 *
 * Merges micro-OSIDs (< 1 km²) into their best same-municipality neighbors.
 * Updates all derived operational data files:
 *   - osid_areas.json
 *   - operational_contact_graph.json
 *   - operational_political_control.json
 *   - canonical_to_operational_map.json
 *
 * Run: node tools/merge_micro_osids.cjs [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const THRESHOLD_KM2 = 1.0;
const DATA_DIR = path.join(__dirname, '..', 'data', 'derived', 'operational');

// ── Load data ────────────────────────────────────────────────────────────────
const areasFile = path.join(DATA_DIR, 'osid_areas.json');
const graphFile = path.join(DATA_DIR, 'operational_contact_graph.json');
const pcFile = path.join(DATA_DIR, 'operational_political_control.json');
const mapFile = path.join(DATA_DIR, 'canonical_to_operational_map.json');

const areasData = JSON.parse(fs.readFileSync(areasFile, 'utf8'));
const graphData = JSON.parse(fs.readFileSync(graphFile, 'utf8'));
const pcData = JSON.parse(fs.readFileSync(pcFile, 'utf8'));
const mapData = JSON.parse(fs.readFileSync(mapFile, 'utf8'));

const areas = areasData.areas;

// ── Build adjacency from graph ───────────────────────────────────────────────
const adj = {};
for (const e of graphData.edges) {
    if (!adj[e.a]) adj[e.a] = new Set();
    if (!adj[e.b]) adj[e.b] = new Set();
    adj[e.a].add(e.b);
    adj[e.b].add(e.a);
}

// ── Identify micro-OSIDs and compute merge targets ───────────────────────────
const microOsids = Object.entries(areas)
    .filter(([k, v]) => v < THRESHOLD_KM2)
    .sort((a, b) => a[1] - b[1]);

console.log(`Found ${microOsids.length} micro-OSIDs (< ${THRESHOLD_KM2} km²)\n`);

// Build merge map: micro → target
const mergeMap = {};
for (const [osid, area] of microOsids) {
    const mun = osid.split(':')[1];
    const neighbors = [...(adj[osid] || [])];
    const sameMun = neighbors.filter(n => n.split(':')[1] === mun && !mergeMap[n]);
    const candidates = (sameMun.length ? sameMun : neighbors.filter(n => !mergeMap[n]))
        .map(n => ({ id: n, area: areas[n] || 0 }))
        .sort((a, b) => b.area - a.area);

    if (!candidates.length) {
        console.error(`  WARNING: ${osid} has no valid merge target!`);
        continue;
    }

    const target = candidates[0].id;
    mergeMap[osid] = target;
    console.log(`  ${osid} (${area.toFixed(3)} km²) → ${target} (${candidates[0].area.toFixed(1)} km²)`);
}

console.log(`\nMerge map: ${Object.keys(mergeMap).length} OSIDs to merge`);
console.log(`New OSID count: ${Object.keys(areas).length - Object.keys(mergeMap).length}`);

if (DRY_RUN) {
    console.log('\n[DRY RUN] No files modified.');
    // Output merge map as JSON for reference
    console.log('\nMerge map JSON:');
    console.log(JSON.stringify(mergeMap, null, 2));
    process.exit(0);
}

// ── 1. Update osid_areas.json ────────────────────────────────────────────────
for (const [micro, target] of Object.entries(mergeMap)) {
    areas[target] = (areas[target] || 0) + (areas[micro] || 0);
    delete areas[micro];
}
areasData.osid_count = Object.keys(areas).length;
areasData.total_area_km2 = Object.values(areas).reduce((a, b) => a + b, 0);
fs.writeFileSync(areasFile, JSON.stringify(areasData, null, 2) + '\n', 'utf8');
console.log(`\n✓ osid_areas.json: ${areasData.osid_count} OSIDs, ${areasData.total_area_km2.toFixed(1)} km²`);

// ── 2. Update operational_contact_graph.json ─────────────────────────────────
// Remove micro nodes
graphData.nodes = graphData.nodes.filter(n => !mergeMap[n.id]);

// Redirect edges: replace micro refs with target, remove self-loops and dupes
const edgeSet = new Set();
graphData.edges = graphData.edges
    .map(e => {
        let a = mergeMap[e.a] || e.a;
        let b = mergeMap[e.b] || e.b;
        // Normalize order for dedup
        if (a > b) [a, b] = [b, a];
        return { a, b };
    })
    .filter(e => {
        if (e.a === e.b) return false; // self-loop
        const key = `${e.a}|${e.b}`;
        if (edgeSet.has(key)) return false; // duplicate
        edgeSet.add(key);
        return true;
    });

fs.writeFileSync(graphFile, JSON.stringify(graphData, null, 2) + '\n', 'utf8');
console.log(`✓ operational_contact_graph.json: ${graphData.nodes.length} nodes, ${graphData.edges.length} edges`);

// ── 3. Update operational_political_control.json ─────────────────────────────
for (const micro of Object.keys(mergeMap)) {
    delete pcData[micro];
}
fs.writeFileSync(pcFile, JSON.stringify(pcData, null, 2) + '\n', 'utf8');
console.log(`✓ operational_political_control.json: ${Object.keys(pcData).length} entries`);

// ── 4. Update canonical_to_operational_map.json ──────────────────────────────
let redirectCount = 0;
for (const [sid, osid] of Object.entries(mapData)) {
    if (mergeMap[osid]) {
        mapData[sid] = mergeMap[osid];
        redirectCount++;
    }
}
fs.writeFileSync(mapFile, JSON.stringify(mapData, null, 2) + '\n', 'utf8');
console.log(`✓ canonical_to_operational_map.json: ${redirectCount} SIDs redirected`);

// ── Output summary ──────────────────────────────────────────────────────────
console.log(`\n═══ MERGE COMPLETE ═══`);
console.log(`Merged: ${Object.keys(mergeMap).length} micro-OSIDs`);
console.log(`Remaining: ${areasData.osid_count} OSIDs`);
console.log(`\nManual updates still needed:`);
console.log(`  - oob_brigades.json: update home_osid for 11 brigades`);
console.log(`  - pre_planned_operations.ts: update/remove micro-OSID objectives`);
console.log(`  - enclave_resilience.ts, GameStateAdapter.ts, buildEnclaveGeoJSON.ts: kalimanici`);
console.log(`  - check_benchmarks.cjs, check_n677.cjs: total 744 → ${areasData.osid_count}`);
console.log(`  - patron_pressure.ts: 744 → ${areasData.osid_count}`);
console.log(`  - political_control_init.ts: comment update`);

// Output merge map for manual reference
fs.writeFileSync(
    path.join(__dirname, 'micro_osid_merge_map.json'),
    JSON.stringify(mergeMap, null, 2) + '\n',
    'utf8'
);
console.log(`\nMerge map saved to: tools/micro_osid_merge_map.json`);
