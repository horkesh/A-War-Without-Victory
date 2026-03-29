#!/usr/bin/env node
/**
 * Post-run consistency validator — checks internal invariants of a scenario run.
 *
 *   node tools/validate_run_consistency.cjs <run_dir>
 *
 * Checks:
 *  1. Casualty balance: battle-specific taken vs inflicted across factions
 *  2. Peak personnel: no brigade exceeds its historical peak
 *  3. Brigade assignment completeness: every active brigade in a sector-owning corps is assigned
 *  4. Ghost paramilitaries: inactive paramilitaries with personnel > 0
 *  5. Offensive intel blindness: after turn 20, at least some intel records show offensive_signs
 *  6. Formation.assignment sync: sector-assigned brigades must have formation.assignment set
 *
 * Exit code 0 = PASS, 1 = FAIL (any hard check fails; casualty gap is informational only).
 */

const fs = require('fs');
const path = require('path');

const input = process.argv[2];
if (!input) {
    console.error('Usage: node tools/validate_run_consistency.cjs <run_dir_or_save_json>');
    process.exit(1);
}

// Accept either a directory containing final_save.json or a direct path to a JSON file
let finalPath;
let runLabel;
if (fs.existsSync(input) && fs.statSync(input).isFile()) {
    finalPath = input;
    runLabel = input;
} else {
    finalPath = path.join(input, 'final_save.json');
    runLabel = input;
}
if (!fs.existsSync(finalPath)) {
    console.error('final_save.json not found at', finalPath);
    process.exit(1);
}

const state = JSON.parse(fs.readFileSync(finalPath, 'utf8'));
const formations = state.military?.formations ?? {};
const fmns = Object.values(formations);
const sectors = state.military?.corps_front_sectors ?? {};
const sectorIntel = state.military?.sector_intel ?? {};
const currentTurn = state.meta?.turn ?? 0;

let failures = 0;

function fail(msg) {
    console.log(`  FAIL: ${msg}`);
    failures++;
}

function ok(msg) {
    console.log(`  OK: ${msg}`);
}

console.log('=== AWWV Run Consistency Validation ===');
console.log(`Run: ${runLabel}`);
console.log(`Turn: ${currentTurn}`);
console.log('');

// ── 1. Casualty Accounting (informational) ──────────────────────────────
console.log('--- Casualty Accounting ---');

const factionStats = {};
for (const f of fmns) {
    if (f.kind === 'paramilitary' || f.kind === 'militia') continue;
    const faction = f.faction;
    if (!faction) continue;
    if (!factionStats[faction]) factionStats[faction] = { taken: 0, inflicted: 0 };
    const hist = f.brigade_history;
    if (!hist) continue;
    factionStats[faction].taken += hist.total_casualties_taken || 0;
    factionStats[faction].inflicted += hist.total_casualties_inflicted || 0;
}

let totalTaken = 0;
let totalInflicted = 0;
for (const [faction, stats] of Object.entries(factionStats).sort()) {
    console.log(`  ${faction.padEnd(6)} taken=${stats.taken}  inflicted=${stats.inflicted}`);
    totalTaken += stats.taken;
    totalInflicted += stats.inflicted;
}
const gap = totalTaken - totalInflicted;
console.log(`  Total taken: ${totalTaken}  Total inflicted: ${totalInflicted}  Gap: ${gap}`);
console.log('  NOTE: Gap includes friction/siege attrition (no opposing brigade)');
console.log('');

// ── 2. Peak Personnel ───────────────────────────────────────────────────
console.log('--- Peak Personnel ---');
const peakViolations = [];
for (const f of fmns) {
    if (f.status !== 'active') continue;
    if (f.kind !== 'brigade') continue;
    const hist = f.brigade_history;
    if (!hist || hist.peak_personnel == null) continue;
    if ((f.personnel || 0) > hist.peak_personnel) {
        peakViolations.push({
            id: f.id,
            personnel: f.personnel,
            peak: hist.peak_personnel,
        });
    }
}

if (peakViolations.length === 0) {
    ok('0 violations');
} else {
    for (const v of peakViolations) {
        fail(`${v.id}: personnel ${v.personnel} > peak ${v.peak}`);
    }
}
console.log('');

// ── 3. Brigade Assignment Completeness ──────────────────────────────────
console.log('--- Brigade Assignment ---');

// Collect all corps that own at least one sector
const corpsWithSectors = new Set();
for (const sec of Object.values(sectors)) {
    if (sec.corps_id) corpsWithSectors.add(sec.corps_id);
}

// Collect all brigade IDs that appear in any sector
const assignedInSector = new Set();
for (const sec of Object.values(sectors)) {
    for (const bid of (sec.assigned_brigade_ids || [])) assignedInSector.add(bid);
    for (const bid of (sec.reserve_brigade_ids || [])) assignedInSector.add(bid);
}

const unassigned = [];
for (const f of fmns) {
    if (f.status !== 'active' || f.kind !== 'brigade') continue;
    const corpsId = f.corps_id;
    if (!corpsId || !corpsWithSectors.has(corpsId)) continue;
    if (!assignedInSector.has(f.id)) {
        unassigned.push({ id: f.id, corps: corpsId, faction: f.faction });
    }
}

if (unassigned.length === 0) {
    ok('0 unassigned');
} else {
    for (const u of unassigned) {
        fail(`${u.id} (${u.corps}, ${u.faction}) not in any sector`);
    }
}
console.log('');

// ── 4. Ghost Paramilitaries ─────────────────────────────────────────────
console.log('--- Ghost Paramilitaries ---');
const ghosts = [];
for (const f of fmns) {
    if (f.kind !== 'paramilitary' && f.kind !== 'militia') continue;
    if (f.status === 'active') continue; // active paramilitaries are fine
    if ((f.personnel || 0) > 0) {
        ghosts.push({ id: f.id, status: f.status, personnel: f.personnel });
    }
}

if (ghosts.length === 0) {
    ok('0 ghosts');
} else {
    for (const g of ghosts) {
        fail(`${g.id}: status=${g.status}, personnel=${g.personnel}`);
    }
}
console.log('');

// ── 5. Intel System ─────────────────────────────────────────────────────
console.log('--- Intel System ---');
let totalIntelRecords = 0;
let offensiveSignsCount = 0;

for (const records of Object.values(sectorIntel)) {
    if (!Array.isArray(records)) continue;
    for (const rec of records) {
        totalIntelRecords++;
        if (rec.offensive_signs === true) offensiveSignsCount++;
    }
}

console.log(`  Offensive signs: ${offensiveSignsCount}/${totalIntelRecords} records`);
if (currentTurn > 20 && totalIntelRecords > 0 && offensiveSignsCount === 0) {
    fail('After turn 20, 0 intel records show offensive_signs — intel system may be broken');
} else if (currentTurn > 20 && totalIntelRecords === 0) {
    fail('After turn 20, 0 intel records exist — intel system may be broken');
} else {
    ok(`Intel system functional (turn ${currentTurn})`);
}
console.log('');

// ── 6. Assignment Sync ──────────────────────────────────────────────────
console.log('--- Assignment Sync ---');
const missingAssignment = [];

for (const [sectorId, sec] of Object.entries(sectors)) {
    for (const bid of (sec.assigned_brigade_ids || [])) {
        const f = formations[bid];
        if (!f) continue;
        if (!f.assignment) {
            missingAssignment.push({ id: bid, sector: sectorId });
        }
    }
}

if (missingAssignment.length === 0) {
    ok('0 missing');
} else {
    for (const m of missingAssignment) {
        fail(`${m.id} in ${m.sector} has no formation.assignment`);
    }
}
console.log('');

// ── Summary ─────────────────────────────────────────────────────────────
const result = failures === 0 ? 'PASS' : 'FAIL';
console.log(`=== RESULT: ${result} ===`);
if (failures > 0) {
    console.log(`${failures} failure(s) detected`);
    process.exit(1);
}
