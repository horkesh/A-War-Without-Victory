#!/usr/bin/env node
/**
 * build_osid_damage_seed.cjs
 *
 * LANE-NIGHTSHIFT-ROUND2-OSID-DAMAGE-SEED
 *
 * Builds a per-OSID damage seed file from a completed scenario run. This is
 * pure derived data — no engine path consumes it yet. Future v0.9.4 "Map That
 * Scars" visual-degradation work will read this seed.
 *
 * Inputs (read from <run_dir>):
 *   - final_save.json
 *       .displacement.displacement_event_log : Array<{ turn, origin_osid, killed, displaced, fled_abroad }>
 *   - control_delta.json
 *       .flips : Array<{ from, to, settlement_id }>   (settlement_id is the OSID)
 *   - weekly_report.jsonl
 *       per-line: .battles : Array<{ target_osid, attacker_casualties, defender_casualties, ... }>
 *                 .week_index : number
 *
 * Output: data/derived/osid_damage_seed.json
 *   Record<osid, {
 *     damage_score: number,
 *     battles: number,
 *     casualties_total: number,
 *     flips: number,
 *     displacement_spike_turns: number[]
 *   }>
 *
 * Damage score formula (faction-agnostic, simple primitives only):
 *   damage_score = 1.0 * battles
 *                + 0.01 * casualties_total
 *                + 2.0 * flips
 *                + 1.5 * |displacement_spike_turns|
 *
 * Determinism:
 *   - Sorted iteration via strictCompare (lexicographic via String#localeCompare-free
 *     <,>,= comparator on string keys). No Math.random, no Date.now.
 *   - All Record outputs are emitted with keys in sorted order.
 *
 * Schema: keep simple — numbers + arrays only. No nested objects in damage records.
 *
 * Usage:
 *   node tools/build_osid_damage_seed.cjs <run_dir>
 *   node tools/build_osid_damage_seed.cjs <run_dir> --out <path>
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

// ---- strictCompare ----------------------------------------------------------
// Deterministic, locale-independent string comparator. Mirrors src/state
// strictCompare semantics for sorted iteration of Record keys.
function strictCompare(a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

function sortedKeys(obj) {
    return Object.keys(obj).sort(strictCompare);
}

// ---- displacement spike detection ------------------------------------------
// A "spike" turn for an OSID is a turn where the per-turn displacement
// magnitude (killed + displaced + fled_abroad summed across all events at
// that OSID for that turn) is at least DISPLACEMENT_SPIKE_THRESHOLD.
//
// Threshold chosen to capture genuine eviction/massacre/flight events
// without flagging baseline trickle. Faction-agnostic.
const DISPLACEMENT_SPIKE_THRESHOLD = 100;

// ---- damage weights ---------------------------------------------------------
const W_BATTLES = 1.0;
const W_CASUALTIES = 0.01;
const W_FLIPS = 2.0;
const W_DISPLACEMENT_SPIKE = 1.5;

function emptyRecord() {
    return {
        damage_score: 0,
        battles: 0,
        casualties_total: 0,
        flips: 0,
        displacement_spike_turns: [],
    };
}

function ensureRecord(map, osid) {
    if (!Object.prototype.hasOwnProperty.call(map, osid)) {
        map[osid] = emptyRecord();
    }
    return map[osid];
}

// ---- IO ---------------------------------------------------------------------
function readJson(p) {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function readJsonlLines(p) {
    const txt = fs.readFileSync(p, 'utf8');
    const out = [];
    for (const ln of txt.split('\n')) {
        const t = ln.trim();
        if (t.length === 0) continue;
        out.push(JSON.parse(t));
    }
    return out;
}

// ---- main builder -----------------------------------------------------------
function build(runDir) {
    const finalSavePath = path.join(runDir, 'final_save.json');
    const controlDeltaPath = path.join(runDir, 'control_delta.json');
    const weeklyReportPath = path.join(runDir, 'weekly_report.jsonl');

    if (!fs.existsSync(finalSavePath)) {
        throw new Error(`missing final_save.json at ${finalSavePath}`);
    }

    const damage = {};

    // (1) Battles + casualties from weekly_report.jsonl
    if (fs.existsSync(weeklyReportPath)) {
        const weeks = readJsonlLines(weeklyReportPath);
        // Sort weeks by week_index for deterministic accumulation order.
        weeks.sort((a, b) => {
            const wa = a.week_index ?? 0;
            const wb = b.week_index ?? 0;
            if (wa < wb) return -1;
            if (wa > wb) return 1;
            return 0;
        });
        for (const w of weeks) {
            const battles = Array.isArray(w.battles) ? w.battles : [];
            // Sort battles by battle_id for deterministic accumulation.
            const sortedBattles = battles.slice().sort((a, b) => {
                const ka = String(a.battle_id ?? '');
                const kb = String(b.battle_id ?? '');
                return strictCompare(ka, kb);
            });
            for (const b of sortedBattles) {
                const osid = b.target_osid;
                if (typeof osid !== 'string' || osid.length === 0) continue;
                const rec = ensureRecord(damage, osid);
                rec.battles += 1;
                const ac = Number.isFinite(b.attacker_casualties) ? b.attacker_casualties : 0;
                const dc = Number.isFinite(b.defender_casualties) ? b.defender_casualties : 0;
                rec.casualties_total += Math.max(0, ac) + Math.max(0, dc);
            }
        }
    }

    // (2) Control flips from control_delta.json
    if (fs.existsSync(controlDeltaPath)) {
        const cd = readJson(controlDeltaPath);
        const flips = Array.isArray(cd.flips) ? cd.flips : [];
        // Sort by settlement_id for determinism.
        const sortedFlips = flips.slice().sort((a, b) => {
            return strictCompare(String(a.settlement_id ?? ''), String(b.settlement_id ?? ''));
        });
        for (const f of sortedFlips) {
            const osid = f.settlement_id;
            if (typeof osid !== 'string' || osid.length === 0) continue;
            const rec = ensureRecord(damage, osid);
            rec.flips += 1;
        }
    }

    // (3) Displacement spikes from final_save.displacement.displacement_event_log
    const finalSave = readJson(finalSavePath);
    const evLog =
        finalSave &&
        finalSave.displacement &&
        Array.isArray(finalSave.displacement.displacement_event_log)
            ? finalSave.displacement.displacement_event_log
            : [];

    // Aggregate per (osid, turn) → magnitude.
    const perOsidTurnMag = {};
    // Iterate in insertion order, but bucket by osid+turn deterministically.
    for (const ev of evLog) {
        const osid = ev && ev.origin_osid;
        if (typeof osid !== 'string' || osid.length === 0) continue;
        const turn = Number.isFinite(ev.turn) ? ev.turn : 0;
        const killed = Number.isFinite(ev.killed) ? Math.max(0, ev.killed) : 0;
        const displaced = Number.isFinite(ev.displaced) ? Math.max(0, ev.displaced) : 0;
        const fled = Number.isFinite(ev.fled_abroad) ? Math.max(0, ev.fled_abroad) : 0;
        const mag = killed + displaced + fled;
        if (mag <= 0) continue;
        if (!Object.prototype.hasOwnProperty.call(perOsidTurnMag, osid)) {
            perOsidTurnMag[osid] = {};
        }
        const key = String(turn);
        perOsidTurnMag[osid][key] = (perOsidTurnMag[osid][key] || 0) + mag;
    }

    for (const osid of sortedKeys(perOsidTurnMag)) {
        const turnMap = perOsidTurnMag[osid];
        const turns = sortedKeys(turnMap)
            .map((k) => ({ turn: Number(k), mag: turnMap[k] }))
            .filter((x) => x.mag >= DISPLACEMENT_SPIKE_THRESHOLD)
            .map((x) => x.turn)
            .sort((a, b) => a - b);
        if (turns.length === 0) continue;
        const rec = ensureRecord(damage, osid);
        // Already sorted ascending; assign as fresh array (no duplicates by construction).
        rec.displacement_spike_turns = turns;
    }

    // (4) Compute damage_score per record.
    for (const osid of sortedKeys(damage)) {
        const r = damage[osid];
        const score =
            W_BATTLES * r.battles +
            W_CASUALTIES * r.casualties_total +
            W_FLIPS * r.flips +
            W_DISPLACEMENT_SPIKE * r.displacement_spike_turns.length;
        // Round to 4 decimals to keep deterministic JSON across platforms.
        r.damage_score = Math.round(score * 10000) / 10000;
    }

    // (5) Emit with sorted keys for deterministic byte output.
    const out = {};
    for (const osid of sortedKeys(damage)) {
        const r = damage[osid];
        out[osid] = {
            damage_score: r.damage_score,
            battles: r.battles,
            casualties_total: r.casualties_total,
            flips: r.flips,
            displacement_spike_turns: r.displacement_spike_turns.slice(),
        };
    }
    return out;
}

function topNDamaged(seed, n) {
    const entries = Object.keys(seed).map((osid) => ({
        osid,
        damage_score: seed[osid].damage_score,
        battles: seed[osid].battles,
        casualties_total: seed[osid].casualties_total,
        flips: seed[osid].flips,
        spikes: seed[osid].displacement_spike_turns.length,
    }));
    entries.sort((a, b) => {
        if (b.damage_score !== a.damage_score) return b.damage_score - a.damage_score;
        // Tiebreak: lexicographic OSID (deterministic).
        return strictCompare(a.osid, b.osid);
    });
    return entries.slice(0, n);
}

// ---- CLI --------------------------------------------------------------------
function parseArgs(argv) {
    const out = { runDir: null, outPath: null };
    const rest = argv.slice(2);
    for (let i = 0; i < rest.length; i += 1) {
        const a = rest[i];
        if (a === '--out') {
            out.outPath = rest[i + 1];
            i += 1;
        } else if (out.runDir === null) {
            out.runDir = a;
        }
    }
    return out;
}

function main() {
    const { runDir, outPath } = parseArgs(process.argv);
    if (!runDir) {
        process.stderr.write(
            'usage: node tools/build_osid_damage_seed.cjs <run_dir> [--out <path>]\n',
        );
        process.exit(2);
    }
    if (!fs.existsSync(runDir) || !fs.statSync(runDir).isDirectory()) {
        process.stderr.write(`run_dir does not exist or is not a directory: ${runDir}\n`);
        process.exit(2);
    }

    const seed = build(runDir);

    const target =
        outPath ||
        path.resolve(__dirname, '..', 'data', 'derived', 'osid_damage_seed.json');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(seed, null, 2) + '\n', 'utf8');

    const osidCount = Object.keys(seed).length;
    const top10 = topNDamaged(seed, 10);
    process.stdout.write(`wrote ${target}\n`);
    process.stdout.write(`osids_with_damage=${osidCount}\n`);
    process.stdout.write('top10_most_damaged:\n');
    for (const t of top10) {
        process.stdout.write(
            `  ${t.osid} score=${t.damage_score} battles=${t.battles} casualties=${t.casualties_total} flips=${t.flips} spikes=${t.spikes}\n`,
        );
    }
}

if (require.main === module) {
    main();
}

module.exports = { build, topNDamaged, strictCompare };
