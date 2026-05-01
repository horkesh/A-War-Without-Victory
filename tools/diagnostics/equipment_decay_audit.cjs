#!/usr/bin/env node
/**
 * Heavy-equipment decay audit.
 *
 * Read-only diagnostic for comparing the three equipment axes that can drift
 * apart: raw tanks/artillery, condition-weighted operational counts, and the
 * formation.equipment_decay scalar floor.
 *
 * Usage:
 *   node tools/diagnostics/equipment_decay_audit.cjs <run_dir> [<run_dir> ...]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const FACTIONS = ['RBiH', 'RS', 'HRHB'];

function strictCompare(a, b) {
    const sa = String(a);
    const sb = String(b);
    return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function fmtNum(value, digits = 3) {
    if (value === null || value === undefined) return 'n/a';
    if (typeof value !== 'number' || !Number.isFinite(value)) return 'n/a';
    return value.toFixed(digits);
}

function fmtInt(value) {
    if (value === null || value === undefined) return 'n/a';
    if (typeof value !== 'number' || !Number.isFinite(value)) return 'n/a';
    return String(Math.round(value));
}

function pctile(sorted, q) {
    if (!sorted.length) return null;
    if (sorted.length === 1) return sorted[0];
    const idx = q * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    const frac = idx - lo;
    return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

function summarize(xs) {
    if (!xs.length) return { min: null, p25: null, mean: null, p75: null, max: null };
    const sorted = xs.slice().sort((a, b) => a - b);
    let sum = 0;
    for (const x of xs) sum += x;
    return {
        min: sorted[0],
        p25: pctile(sorted, 0.25),
        mean: sum / xs.length,
        p75: pctile(sorted, 0.75),
        max: sorted[sorted.length - 1]
    };
}

function conditionFraction(cond) {
    if (!cond || typeof cond.operational !== 'number') return 0;
    return Math.max(0, Math.min(1, cond.operational));
}

function collectRun(runDir) {
    const summaryPath = path.join(runDir, 'run_summary.json');
    const savePath = path.join(runDir, 'final_save.json');
    const summary = fs.existsSync(summaryPath) ? readJson(summaryPath) : {};
    const state = readJson(savePath);
    const formations = state.military?.formations ?? {};
    const rows = [];
    for (const id of Object.keys(formations).sort(strictCompare)) {
        const f = formations[id];
        if (!f || f.kind !== 'brigade') continue;
        const comp = f.composition ?? {};
        const tanks = +comp.tanks || 0;
        const artillery = +comp.artillery || 0;
        const tankOpFrac = conditionFraction(comp.tank_condition);
        const artOpFrac = conditionFraction(comp.artillery_condition);
        rows.push({
            id,
            faction: f.faction || 'unknown',
            corps: f.corps_id || 'unattached',
            status: f.status || 'unknown',
            tanks,
            artillery,
            heavy: tanks + artillery,
            tankOp: tanks * tankOpFrac,
            artOp: artillery * artOpFrac,
            tankOpFrac,
            artOpFrac,
            equipmentDecay: typeof f.equipment_decay === 'number' ? f.equipment_decay : null
        });
    }
    return { runDir, summary, rows };
}

function aggregateFaction(rows) {
    const byFaction = {};
    for (const faction of FACTIONS) {
        byFaction[faction] = {
            active: 0,
            inactive: 0,
            tanks: 0,
            artillery: 0,
            tankOp: 0,
            artOp: 0,
            equipmentDecayValues: []
        };
    }
    for (const row of rows) {
        if (!byFaction[row.faction]) {
            byFaction[row.faction] = {
                active: 0,
                inactive: 0,
                tanks: 0,
                artillery: 0,
                tankOp: 0,
                artOp: 0,
                equipmentDecayValues: []
            };
        }
        const slot = byFaction[row.faction];
        if (row.status === 'active') {
            slot.active += 1;
            slot.tanks += row.tanks;
            slot.artillery += row.artillery;
            slot.tankOp += row.tankOp;
            slot.artOp += row.artOp;
            if (row.equipmentDecay !== null) slot.equipmentDecayValues.push(row.equipmentDecay);
        } else {
            slot.inactive += 1;
        }
    }
    return byFaction;
}

function heavySupport(row) {
    if (row.heavy <= 0) return null;
    return (row.tankOp + row.artOp) / row.heavy;
}

function printRun(run) {
    const name = path.basename(run.runDir);
    const hash = run.summary.final_state_hash ?? 'n/a';
    const weeks = run.summary.weeks ?? run.summary.turns ?? 'n/a';
    console.log(`### Run: ${name}`);
    console.log(`- weeks: ${weeks}`);
    console.log(`- final_state_hash: \`${hash}\``);
    console.log('');
    console.log('#### Faction Heavy Equipment (active brigades only)');
    console.log('');
    console.log('| Faction | active | inactive | tanks | tank_op | tank_op% | artillery | art_op | art_op% | equipment_decay min/mean/max |');
    console.log('|---|---:|---:|---:|---:|---:|---:|---:|---:|---|');
    const byFaction = aggregateFaction(run.rows);
    for (const faction of FACTIONS) {
        const slot = byFaction[faction];
        const decay = summarize(slot.equipmentDecayValues);
        const tankPct = slot.tanks > 0 ? slot.tankOp / slot.tanks : null;
        const artPct = slot.artillery > 0 ? slot.artOp / slot.artillery : null;
        console.log(`| ${faction} | ${slot.active} | ${slot.inactive} | ${fmtInt(slot.tanks)} | ${fmtInt(slot.tankOp)} | ${fmtNum(tankPct, 3)} | ${fmtInt(slot.artillery)} | ${fmtInt(slot.artOp)} | ${fmtNum(artPct, 3)} | ${fmtNum(decay.min, 3)} / ${fmtNum(decay.mean, 3)} / ${fmtNum(decay.max, 3)} |`);
    }

    const rsWorst = run.rows
        .filter(row => row.faction === 'RS' && row.status === 'active' && row.heavy > 0)
        .map(row => ({ ...row, support: heavySupport(row) }))
        .sort((a, b) => {
            const diff = (a.support ?? 0) - (b.support ?? 0);
            if (Math.abs(diff) > 1e-9) return diff;
            return strictCompare(a.id, b.id);
        })
        .slice(0, 12);

    console.log('');
    console.log('#### RS Lowest Heavy-Support Brigades');
    console.log('');
    console.log('| Brigade | Corps | tanks | tank_op% | artillery | art_op% | combined_op% | equipment_decay |');
    console.log('|---|---|---:|---:|---:|---:|---:|---:|');
    for (const row of rsWorst) {
        console.log(`| ${row.id} | ${row.corps} | ${fmtInt(row.tanks)} | ${fmtNum(row.tankOpFrac, 3)} | ${fmtInt(row.artillery)} | ${fmtNum(row.artOpFrac, 3)} | ${fmtNum(row.support, 3)} | ${fmtNum(row.equipmentDecay, 3)} |`);
    }
    console.log('');
}

function main() {
    const runDirs = process.argv.slice(2);
    if (!runDirs.length) {
        console.error('Usage: node tools/diagnostics/equipment_decay_audit.cjs <run_dir> [<run_dir> ...]');
        process.exit(2);
    }
    console.log('# Heavy-Equipment Decay Audit');
    console.log('');
    for (const runDir of runDirs) {
        printRun(collectRun(path.resolve(runDir)));
    }
}

main();
