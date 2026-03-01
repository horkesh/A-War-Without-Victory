#!/usr/bin/env node
/**
 * Analyze local fronts and corps directives from a scenario run final save.
 * Usage: node tools/analyze_fronts.cjs <run_dir>
 */
const fs = require('fs');
const path = require('path');

const runDir = process.argv[2] || 'runs';
let finalSavePath;

if (fs.existsSync(path.join(runDir, 'final_save.json'))) {
    finalSavePath = path.join(runDir, 'final_save.json');
} else {
    // Find latest run directory
    const dirs = fs.readdirSync(runDir)
        .filter(d => fs.statSync(path.join(runDir, d)).isDirectory())
        .sort();
    const latest = dirs[dirs.length - 1];
    finalSavePath = path.join(runDir, latest, 'final_save.json');
}

console.log('Reading:', finalSavePath);
const data = JSON.parse(fs.readFileSync(finalSavePath, 'utf8'));
const state = data.state || data.gameState || data;

// ═══════════════════════════════════════════════════════════════
// 1. LOCAL FRONTS
// ═══════════════════════════════════════════════════════════════
const fronts = state.local_fronts || {};
const frontKeys = Object.keys(fronts).sort();
console.log('\n═══════════════════════════════════════════════════');
console.log('LOCAL FRONTS (end of run)');
console.log('═══════════════════════════════════════════════════');
console.log('Total fronts:', frontKeys.length);

const byFaction = {};
for (const k of frontKeys) {
    const f = fronts[k];
    if (!byFaction[f.faction]) byFaction[f.faction] = { count: 0, totalEdges: 0, totalBrigades: 0, fronts: [] };
    byFaction[f.faction].count++;
    byFaction[f.faction].totalEdges += f.coverage_length;
    byFaction[f.faction].totalBrigades += f.assigned_brigade_ids.length;
    byFaction[f.faction].fronts.push({
        id: f.id,
        name: f.name,
        brigades: f.assigned_brigade_ids.length,
        edges: f.coverage_length,
        density: (f.assigned_brigade_ids.length / f.coverage_length).toFixed(3),
        power: Math.round(f.defensive_power)
    });
}

for (const [fac, info] of Object.entries(byFaction)) {
    console.log('\n' + fac + ': ' + info.count + ' fronts, ' + info.totalBrigades + ' brigades across ' + info.totalEdges + ' edges');
    console.log('  Overall density: ' + (info.totalBrigades / info.totalEdges).toFixed(3) + ' brigades/edge');
    info.fronts.sort((a, b) => b.brigades - a.brigades);
    for (const f of info.fronts) {
        const densityFlag = parseFloat(f.density) < 0.5 ? ' [THIN]' : parseFloat(f.density) > 1.0 ? ' [DENSE]' : '';
        console.log('  ' + f.name.substring(0, 55).padEnd(55) + ' brigs=' + String(f.brigades).padStart(3) + ' edges=' + String(f.edges).padStart(3) + ' density=' + f.density + densityFlag);
    }
}

// ═══════════════════════════════════════════════════════════════
// 2. CORPS COMMANDS & DIRECTIVES
// ═══════════════════════════════════════════════════════════════
const corpsCommand = state.corps_command || {};
const formations = state.formations || {};
console.log('\n═══════════════════════════════════════════════════');
console.log('CORPS COMMANDS & DIRECTIVES');
console.log('═══════════════════════════════════════════════════');

const corpsList = Object.keys(corpsCommand).sort();
for (const cid of corpsList) {
    const cmd = corpsCommand[cid];
    const corps = formations[cid];
    if (!corps) continue;
    const dir = cmd.directive;
    console.log('\n[' + cid + '] ' + (corps.name || cid) + ' (' + corps.faction + ')');
    console.log('  Stance: ' + (cmd.stance || 'balanced'));
    console.log('  Subordinates: ' + (cmd.subordinate_count || 0));
    console.log('  Exhaustion: ' + (cmd.corps_exhaustion || 0));
    if (cmd.active_operation) {
        console.log('  Operation: ' + cmd.active_operation.type + ' [' + cmd.active_operation.phase + ']');
    }
    if (dir) {
        console.log('  Directive:');
        console.log('    Assigned fronts: ' + (dir.assigned_front_ids || []).length);
        for (const fid of (dir.assigned_front_ids || [])) {
            const front = fronts[fid];
            if (front) {
                console.log('      ' + front.name + ' (' + front.assigned_brigade_ids.length + ' brigs, ' + front.coverage_length + ' edges)');
            } else {
                console.log('      ' + fid + ' (not in local_fronts)');
            }
        }
        console.log('    Offensive targets: ' + (dir.offensive_targets || []).length);
        const munSet = new Set();
        for (const osid of (dir.offensive_targets || [])) {
            const m = osid.match(/^op:([^:]+):/);
            if (m) munSet.add(m[1]);
        }
        if (munSet.size > 0) {
            console.log('      Municipalities: ' + [...munSet].sort().join(', '));
        }
        console.log('    Hold OSIDs: ' + (dir.hold_osids || []).length);
        console.log('    Avoid OSIDs: ' + (dir.avoid_osids || []).length);
        console.log('    Max attackers/target: ' + (dir.max_attackers_per_target || 'N/A'));
        console.log('    Reserve fraction: ' + (dir.reserve_fraction || 0));
        console.log('    Aggression: ' + (dir.aggression_modifier || 0));
    } else {
        console.log('  Directive: NONE');
    }
}

// ═══════════════════════════════════════════════════════════════
// 3. BRIGADE-FRONT ASSIGNMENT
// ═══════════════════════════════════════════════════════════════
const bfa = state.brigade_front_assignment || {};
const bfaKeys = Object.keys(bfa).sort();
console.log('\n═══════════════════════════════════════════════════');
console.log('BRIGADE-FRONT ASSIGNMENT');
console.log('═══════════════════════════════════════════════════');

let assigned = 0, reserve = 0;
const byCorpsBfa = {};
for (const brigId of bfaKeys) {
    const frontId = bfa[brigId];
    const brig = formations[brigId];
    if (!brig) continue;
    const corpsId = brig.corps_id || 'no_corps';
    if (!byCorpsBfa[corpsId]) byCorpsBfa[corpsId] = { assigned: 0, reserve: 0, brigades: [] };
    if (frontId) {
        assigned++;
        byCorpsBfa[corpsId].assigned++;
    } else {
        reserve++;
        byCorpsBfa[corpsId].reserve++;
    }
}
console.log('Total: ' + bfaKeys.length + ' brigades, ' + assigned + ' assigned to fronts, ' + reserve + ' in reserve');
for (const [corpsId, info] of Object.entries(byCorpsBfa).sort(([a], [b]) => a.localeCompare(b))) {
    const corpsName = formations[corpsId] ? formations[corpsId].name : corpsId;
    console.log('  ' + String(corpsName).padEnd(40) + ' assigned=' + info.assigned + ' reserve=' + info.reserve);
}

// ═══════════════════════════════════════════════════════════════
// 4. FRONT SEGMENTS (assignable_front_segments)
// ═══════════════════════════════════════════════════════════════
const segments = state.assignable_front_segments || [];
console.log('\n═══════════════════════════════════════════════════');
console.log('ASSIGNABLE FRONT SEGMENTS');
console.log('═══════════════════════════════════════════════════');
console.log('Total segments:', segments.length);

const segByFactionPair = {};
for (const seg of segments) {
    const key = (seg.side_a || 'null') + ' vs ' + (seg.side_b || 'null');
    if (!segByFactionPair[key]) segByFactionPair[key] = { count: 0, totalEdges: 0 };
    segByFactionPair[key].count++;
    segByFactionPair[key].totalEdges += seg.length_edges;
}
for (const [pair, info] of Object.entries(segByFactionPair).sort(([a], [b]) => a.localeCompare(b))) {
    console.log('  ' + pair.padEnd(25) + ' segments=' + info.count + ' edges=' + info.totalEdges);
}

// ═══════════════════════════════════════════════════════════════
// 5. OSID MATCH RATE (compare with painted targets)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════');
console.log('FACTION TERRITORY');
console.log('═══════════════════════════════════════════════════');
const pc = state.political_controllers || {};
const pcKeys = Object.keys(pc);
const factionCounts = {};
for (const k of pcKeys) {
    const fac = pc[k];
    if (fac) {
        factionCounts[fac] = (factionCounts[fac] || 0) + 1;
    }
}
for (const [fac, count] of Object.entries(factionCounts).sort(([a], [b]) => a.localeCompare(b))) {
    console.log('  ' + fac + ': ' + count + ' OSIDs');
}
