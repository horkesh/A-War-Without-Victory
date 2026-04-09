#!/usr/bin/env node
/**
 * Post-run consistency validator — checks internal invariants of a scenario run.
 *
 *   node tools/validate_run_consistency.cjs <run_dir>
 *
 * Checks:
 *  1. Casualty balance: battle-specific taken vs inflicted across factions
 *  2. Peak personnel: no brigade exceeds its historical peak
 *  3. Brigade assignment completeness: canonical final unresolved-sector truth is empty
 *  4. Ghost paramilitaries: inactive paramilitaries with personnel > 0
 *  5. Offensive intel blindness: after turn 20, at least some intel records show offensive_signs
 *  6. Formation.assignment sync: sector-assigned brigades must have formation.assignment set
 *
 * Exit code 0 = PASS, 1 = FAIL (any hard check fails; casualty gap is informational only).
 */

const fs = require('fs');
const path = require('path');

function resolveRunInput(input) {
    if (!input) {
        throw new Error('Usage: node tools/validate_run_consistency.cjs <run_dir_or_save_json>');
    }

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
        throw new Error(`final_save.json not found at ${finalPath}`);
    }

    return {
        finalPath,
        runLabel,
    };
}

function collectAssignmentCompletenessIssues(state) {
    const formations = state.military?.formations ?? {};
    const unresolved = Array.isArray(state.military?.unresolved_sector_brigades)
        ? [...state.military.unresolved_sector_brigades]
        : [];

    return unresolved
        .sort((a, b) => String(a).localeCompare(String(b)))
        .map((formationId) => {
            const formation = formations[formationId] ?? {};
            return {
                id: formationId,
                corps: formation.corps_id ?? 'unknown',
                faction: formation.faction ?? 'unknown',
            };
        });
}

function validateState(state, runLabel) {
    const lines = [];
    const log = (line = '') => lines.push(line);
    let failures = 0;

    const fail = (msg) => {
        log(`  FAIL: ${msg}`);
        failures++;
    };

    const ok = (msg) => {
        log(`  OK: ${msg}`);
    };

    const formations = state.military?.formations ?? {};
    const fmns = Object.values(formations);
    const sectors = state.military?.corps_front_sectors ?? {};
    const sectorIntel = state.military?.sector_intel ?? {};
    const currentTurn = state.meta?.turn ?? 0;

    log('=== AWWV Run Consistency Validation ===');
    log(`Run: ${runLabel}`);
    log(`Turn: ${currentTurn}`);
    log('');

    // ── 1. Casualty Accounting (informational) ──────────────────────────
    log('--- Casualty Accounting ---');

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
        log(`  ${faction.padEnd(6)} taken=${stats.taken}  inflicted=${stats.inflicted}`);
        totalTaken += stats.taken;
        totalInflicted += stats.inflicted;
    }
    const gap = totalTaken - totalInflicted;
    log(`  Total taken: ${totalTaken}  Total inflicted: ${totalInflicted}  Gap: ${gap}`);
    log('  NOTE: Gap includes friction/siege attrition (no opposing brigade)');
    log('');

    // ── 2. Peak Personnel ───────────────────────────────────────────────
    log('--- Peak Personnel ---');
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
    log('');

    // ── 3. Brigade Assignment Completeness ──────────────────────────────
    log('--- Brigade Assignment ---');
    const unresolved = collectAssignmentCompletenessIssues(state);

    if (unresolved.length === 0) {
        ok('0 unresolved');
    } else {
        for (const u of unresolved) {
            fail(`${u.id} (${u.corps}, ${u.faction}) is canonically unresolved in military.unresolved_sector_brigades`);
        }
    }
    log('');

    // ── 4. Ghost Paramilitaries ─────────────────────────────────────────
    log('--- Ghost Paramilitaries ---');
    const ghosts = [];
    for (const f of fmns) {
        if (f.kind !== 'paramilitary' && f.kind !== 'militia') continue;
        if (f.status === 'active') continue;
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
    log('');

    // ── 5. Intel System ─────────────────────────────────────────────────
    log('--- Intel System ---');
    let totalIntelRecords = 0;
    let offensiveSignsCount = 0;

    for (const records of Object.values(sectorIntel)) {
        if (!Array.isArray(records)) continue;
        for (const rec of records) {
            totalIntelRecords++;
            if (rec.offensive_signs === true) offensiveSignsCount++;
        }
    }

    log(`  Offensive signs: ${offensiveSignsCount}/${totalIntelRecords} records`);
    if (currentTurn > 20 && totalIntelRecords > 0 && offensiveSignsCount === 0) {
        fail('After turn 20, 0 intel records show offensive_signs — intel system may be broken');
    } else if (currentTurn > 20 && totalIntelRecords === 0) {
        fail('After turn 20, 0 intel records exist — intel system may be broken');
    } else {
        ok(`Intel system functional (turn ${currentTurn})`);
    }
    log('');

    // ── 6. Assignment Sync ──────────────────────────────────────────────
    log('--- Assignment Sync ---');
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
    log('');

    const result = failures === 0 ? 'PASS' : 'FAIL';
    log(`=== RESULT: ${result} ===`);
    if (failures > 0) {
        log(`${failures} failure(s) detected`);
    }

    return {
        failures,
        lines,
    };
}

function main() {
    let resolved;
    try {
        resolved = resolveRunInput(process.argv[2]);
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }

    const state = JSON.parse(fs.readFileSync(resolved.finalPath, 'utf8'));
    const result = validateState(state, resolved.runLabel);
    for (const line of result.lines) {
        console.log(line);
    }
    if (result.failures > 0) {
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    collectAssignmentCompletenessIssues,
    resolveRunInput,
    validateState,
};
