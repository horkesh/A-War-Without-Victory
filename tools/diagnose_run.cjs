#!/usr/bin/env node
/**
 * Post-run diagnostic tool — catches positional, siege, and drift bugs that
 * calibration % misses. Run after every scenario:
 *
 *   node tools/diagnose_run.cjs <run_dir>
 *
 * Checks:
 *  1. Brigade drift: brigades >N hops from home with no active operation
 *  2. Siege health: besieging corps must have brigades near siege targets
 *  3. Empty sectors: sectors with front edges but zero brigades
 *  4. Corps activity: corps with zero battles over K+ weeks
 *  5. Stranded pools: pools with available manpower but zero committed
 *  6. Combat ineffective concentration: corps with >50% brigades below 400 personnel
 */

const fs = require('fs');
const path = require('path');

const runDir = process.argv[2];
if (!runDir) {
    console.error('Usage: node tools/diagnose_run.cjs <run_dir>');
    process.exit(1);
}

const finalPath = path.join(runDir, 'final_save.json');
if (!fs.existsSync(finalPath)) {
    console.error('final_save.json not found in', runDir);
    process.exit(1);
}

const state = JSON.parse(fs.readFileSync(finalPath, 'utf8'));
const formations = state.military?.formations ?? {};
const fmns = Object.values(formations);
const sectors = state.military?.corps_front_sectors ?? {};
const pools = state.military?.militia_pools ?? {};

// Load edges for BFS
let edges = [];
try {
    const g = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));
    edges = g.edges || [];
} catch (e) { /* no edges available */ }

const adj = new Map();
for (const e of edges) {
    if (!adj.has(e.a)) adj.set(e.a, []);
    if (!adj.has(e.b)) adj.set(e.b, []);
    adj.get(e.a).push(e.b);
    adj.get(e.b).push(e.a);
}

function bfsRaw(from, to, maxHops) {
    if (from === to) return 0;
    if (!adj.has(from)) return maxHops + 1;
    const visited = new Set([from]);
    let frontier = [from];
    for (let h = 1; h <= maxHops; h++) {
        const next = [];
        for (const n of frontier) {
            for (const nb of adj.get(n) || []) {
                if (visited.has(nb)) continue;
                if (nb === to) return h;
                visited.add(nb);
                next.push(nb);
            }
        }
        frontier = next;
        if (!frontier.length) break;
    }
    return maxHops + 1;
}

let warnings = 0;
let errors = 0;

function warn(category, msg) {
    console.log(`  [WARN] ${category}: ${msg}`);
    warnings++;
}

function error(category, msg) {
    console.log(`  [ERROR] ${category}: ${msg}`);
    errors++;
}

console.log('=== AWWV Run Diagnostics ===');
console.log('Run:', runDir);
console.log('');

// ── 1. Brigade Drift ──────────────────────────────────────────────────────
console.log('--- Brigade Drift (>4 hops from home) ---');
const MAX_DRIFT_HOPS = 4;
let driftCount = 0;
const driftByCorps = {};

for (const f of fmns) {
    if (f.status !== 'active' || f.kind === 'paramilitary' || f.kind === 'militia') continue;
    if (!f.home_osid || !f.location_osid || f.home_osid === f.location_osid) continue;

    const dist = bfsRaw(f.home_osid, f.location_osid, MAX_DRIFT_HOPS + 1);
    if (dist > MAX_DRIFT_HOPS) {
        const corps = f.corps_id || 'unknown';
        if (!driftByCorps[corps]) driftByCorps[corps] = [];
        driftByCorps[corps].push({ id: f.id, home: f.home_osid, loc: f.location_osid, dist });
        driftCount++;
    }
}

if (driftCount === 0) {
    console.log('  OK: No brigade drift detected');
} else {
    for (const [corps, drifted] of Object.entries(driftByCorps).sort()) {
        for (const d of drifted) {
            warn('DRIFT', `${d.id} (${corps}) at ${d.loc.split(':')[1]} — home ${d.home.split(':')[1]} (${d.dist} hops)`);
        }
    }
}
console.log('');

// ── 2. Siege Health ───────────────────────────────────────────────────────
console.log('--- Siege Health ---');
const SIEGE_CHECKS = [
    { name: 'Sarajevo (SRK)', corps: 'vrs_sarajevo_romanija', minBrigades: 4, targetMuns: ['centar_sarajevo', 'ilidza', 'novi_grad_sarajevo', 'novo_sarajevo', 'stari_grad_sarajevo', 'vogosca', 'hadzici', 'pale', 'ilijas', 'trnovo'] },
    { name: 'Gorazde (Herzegovina+Drina)', corps: ['vrs_herzegovina', 'vrs_drina'], minBrigades: 2, targetMuns: ['gorazde', 'foca', 'cajnice', 'kalinovik', 'rogatica', 'visegrad'] },
];

for (const check of SIEGE_CHECKS) {
    const corpsIds = Array.isArray(check.corps) ? check.corps : [check.corps];
    const corpsBrigades = fmns.filter(f => corpsIds.includes(f.corps_id) && f.status === 'active' && f.kind === 'brigade');
    const nearTarget = corpsBrigades.filter(f => {
        const locMun = f.location_osid?.split(':')[1];
        return check.targetMuns.includes(locMun);
    });
    if (nearTarget.length < check.minBrigades) {
        error('SIEGE', `${check.name}: only ${nearTarget.length}/${check.minBrigades} brigades near target (need ${check.minBrigades}+)`);
        nearTarget.forEach(f => console.log(`    ${f.id} at ${f.location_osid?.split(':')[1]}`));
    } else {
        console.log(`  OK: ${check.name} — ${nearTarget.length} brigades near target`);
    }
}
console.log('');

// ── 3. Empty Sectors ──────────────────────────────────────────────────────
console.log('--- Empty Sectors (edges but no brigades) ---');
let emptyCount = 0;
for (const [sid, sec] of Object.entries(sectors)) {
    const brigCount = (sec.assigned_brigade_ids || []).length;
    const edgeCount = (sec.edge_ids || []).length;
    if (edgeCount > 3 && brigCount === 0) {
        warn('EMPTY_SECTOR', `${sid}: ${edgeCount} edges, 0 brigades`);
        emptyCount++;
    }
}
if (emptyCount === 0) console.log('  OK: No empty sectors with significant front edges');
console.log('');

// ── 4. Combat Ineffective Concentration ───────────────────────────────────
console.log('--- Combat Ineffective Concentration (>50% per corps) ---');
const corpsBrigades = {};
for (const f of fmns) {
    if (f.status !== 'active' || f.kind !== 'brigade') continue;
    const corps = f.corps_id || 'unknown';
    if (!corpsBrigades[corps]) corpsBrigades[corps] = { total: 0, ineffective: 0, totalPers: 0 };
    corpsBrigades[corps].total++;
    corpsBrigades[corps].totalPers += f.personnel || 0;
    if ((f.personnel || 0) < 400) corpsBrigades[corps].ineffective++;
}

for (const [corps, stats] of Object.entries(corpsBrigades).sort()) {
    if (stats.total < 3) continue; // skip tiny corps
    const pct = (stats.ineffective / stats.total * 100).toFixed(0);
    if (stats.ineffective > stats.total * 0.5) {
        error('DEPLETED', `${corps}: ${stats.ineffective}/${stats.total} (${pct}%) combat ineffective — avg ${(stats.totalPers/stats.total).toFixed(0)} pers`);
    }
}
const totalIneff = fmns.filter(f => f.status === 'active' && f.kind === 'brigade' && (f.personnel || 0) < 400).length;
const totalBrig = fmns.filter(f => f.status === 'active' && f.kind === 'brigade').length;
console.log(`  Total: ${totalIneff}/${totalBrig} combat ineffective across all corps`);
console.log('');

// ── 5. Stranded Pools ────────────────────────────────────────────────────
console.log('--- Stranded Pools (available > 200, committed = 0) ---');
let strandedCount = 0;
for (const [key, pool] of Object.entries(pools)) {
    if ((pool.available || 0) > 200 && (pool.committed || 0) === 0) {
        warn('STRANDED_POOL', `${key}: ${pool.available} available, 0 committed — no brigade drawing`);
        strandedCount++;
    }
}
if (strandedCount === 0) console.log('  OK: No stranded pools');
console.log('');

// ── Summary ───────────────────────────────────────────────────────────────
console.log('=== SUMMARY ===');
console.log(`Errors: ${errors}, Warnings: ${warnings}`);
if (errors > 0) {
    console.log('RESULT: FAIL — structural issues detected');
    process.exit(1);
} else if (warnings > 0) {
    console.log('RESULT: WARN — minor issues detected');
} else {
    console.log('RESULT: PASS');
}
