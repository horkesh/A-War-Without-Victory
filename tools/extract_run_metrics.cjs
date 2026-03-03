const fs = require('fs');
const path = require('path');

const runDir = process.argv[2];
if (!runDir) { console.error('Usage: node extract_run_metrics.cjs <run_dir>'); process.exit(1); }

const final = JSON.parse(fs.readFileSync(path.join(runDir, 'final_save.json'), 'utf8'));

// Personnel
const formations = final.formations || {};
const byFaction = {};
for (const [id, f] of Object.entries(formations)) {
    if (f.status !== 'active') continue;
    if (!byFaction[f.faction]) byFaction[f.faction] = { count: 0, personnel: 0 };
    byFaction[f.faction].count++;
    byFaction[f.faction].personnel += f.personnel || 0;
}
console.log('=== Personnel ===');
for (const [f, d] of Object.entries(byFaction).sort()) {
    console.log(`  ${f}: ${d.count} formations, ${d.personnel} personnel`);
}

// Militia pools
const pools = final.militia_pools || {};
const poolTotal = {};
for (const [pid, p] of Object.entries(pools)) {
    const faction = p.faction || pid.split('_')[0];
    if (!poolTotal[faction]) poolTotal[faction] = { available: 0, committed: 0 };
    poolTotal[faction].available += p.available_manpower || 0;
    poolTotal[faction].committed += p.committed_manpower || 0;
}
console.log('\n=== Militia Pools ===');
for (const [f, d] of Object.entries(poolTotal).sort()) {
    console.log(`  ${f}: available=${d.available} committed=${d.committed}`);
}

// Casualties
const ledger = final.casualty_ledger || {};
console.log('\n=== Casualties ===');
for (const [f, c] of Object.entries(ledger).sort()) {
    console.log(`  ${f}: killed=${c.killed || 0} wounded=${c.wounded || 0} missing=${c.missing || 0}`);
}

// Civilian casualties
const civ = final.civilian_casualties || {};
console.log('\n=== Civilian Casualties ===');
for (const [nat, c] of Object.entries(civ).sort()) {
    console.log(`  ${nat}: killed=${c.killed || 0} fled_abroad=${c.fled_abroad || 0}`);
}

// Named officers
const officers = final.named_officers || {};
const officerStates = Object.values(officers);
const active = officerStates.filter(o => o.status === 'active');
const reserve = officerStates.filter(o => o.status === 'reserve');
const killed = officerStates.filter(o => o.status === 'killed');
const retired = officerStates.filter(o => o.status === 'retired');
console.log('\n=== Named Officers ===');
console.log(`  Total: ${officerStates.length}`);
console.log(`  Active: ${active.length}, Reserve: ${reserve.length}`);
console.log(`  Killed: ${killed.length}, Retired: ${retired.length}`);

// Assigned corps
const assigned = active.filter(o => o.assigned_corps_id);
console.log(`  Assigned to corps: ${assigned.length}`);
const acting = active.filter(o => o.acting_commander);
console.log(`  Acting commanders: ${acting.length}`);

// Officer quality averages
const qualByFaction = {};
for (const [id, f] of Object.entries(formations)) {
    if (f.status !== 'active' || f.officer_quality === undefined) continue;
    if (!qualByFaction[f.faction]) qualByFaction[f.faction] = { sum: 0, count: 0 };
    qualByFaction[f.faction].sum += f.officer_quality;
    qualByFaction[f.faction].count++;
}
console.log('\n=== Officer Quality Averages ===');
for (const [f, d] of Object.entries(qualByFaction).sort()) {
    console.log(`  ${f}: avg=${(d.sum / d.count).toFixed(3)} (${d.count} formations)`);
}
