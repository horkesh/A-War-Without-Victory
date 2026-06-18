#!/usr/bin/env node
/**
 * srebrenica_rupture_trace.cjs
 *
 * Generic rupture-event diagnostic: traces, turn by turn, the canonical Ring 2
 * rupture preconditions for the Srebrenica genocide consequence and writes a
 * structured trace to stdout (and optionally to <run_dir>/srebrenica_rupture_trace.json).
 *
 * The tool is parametric: it takes <run_dir> as the only required argument and
 * works against any run that produced the standard AWWV artifact set
 * (final_save.json + weekly_report.jsonl + operation_aars.json).
 *
 * Conditions checked (canon copy of evaluateRuptureConsequences):
 *   c1: state.military.event_flags.srebrenica_enclave_formed === true
 *   c2: state.political.political_controllers['op:srebrenica:srebrenica_2'] === 'RS'
 *   c3: state.meta.turn >= 160
 *
 * Plus diagnostic context (NOT preconditions — informational only):
 *   - controller of every Srebrenica enclave OSID
 *   - controller of Žepa OSID (sister-enclave reference)
 *   - garrison roster + RBiH personnel at the capital and pocket-wide
 *   - VRS Drina perimeter formation count + personnel (siege ring)
 *   - force ratio (VRS-perimeter / RBiH-pocket)
 *   - resilience entry for the Srebrenica enclave (resilience, isolation_turns, hardening)
 *   - any rupture_consequences already recorded
 *   - per-turn weekly report deltas if multi-turn weekly_report.jsonl is available
 *
 * V2 EXTENSIONS (LANE-NIGHTSHIFT-SREBRENICA-DIAGNOSTIC-V2 — additive, R2-6 schema preserved):
 *   - per-formation Drina-perimeter brigade roster (location_osid, personnel,
 *     morale, cohesion) — full record, deterministic order
 *   - per-enclave force concentration ratio (defender personnel /
 *     attacker personnel within DRINA perimeter ring at the enclave's
 *     hostile-prefix neighbours) — Srebrenica + Žepa
 *   - predictor force_ratio_estimate harvested from operation_aars.json for
 *     every active triggered op whose objective_osids overlap an enclave
 *     OSID (Srebrenica pocket OR Žepa capital)
 *
 * Determinism: sorted iteration on every map output, no Math.random(),
 * no Date.now(), no timestamps. Reads only.
 *
 * Usage:
 *   node tools/diagnostics/srebrenica_rupture_trace.cjs <run_dir> [--write-json] [--turns 160,170,180,188]
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── Canon constants (copied verbatim from src/sim/negotiation/rupture_consequences.ts
//    and src/sim/combat/enclave_resilience.ts to keep the tool self-contained
//    and read-only against the engine source) ────────────────────────────────
const SREBRENICA_CAPITAL_OSID = 'op:srebrenica:srebrenica_2';
const SREBRENICA_MIN_TURN = 160;
const ZEPA_CAPITAL_OSID = 'op:rogatica:zepa_2';

const SREBRENICA_OSID_LIST = [
    'op:srebrenica:bostahovine_2',
    'op:srebrenica:brezovice_2',
    'op:srebrenica:donji_potocari_2',
    'op:srebrenica:ljeskovik_2',
    'op:srebrenica:luka_2',
    'op:srebrenica:mala_daljegosta_2',
    'op:srebrenica:milacevici',
    'op:srebrenica:radovcici',
    'op:srebrenica:srebrenica_2',
    'op:srebrenica:suceska',
    'op:srebrenica:sulice_2',
];

const DRINA_PERIMETER_PREFIXES = [
    'op:bratunac:',
    'op:rogatica:',
    'op:visegrad:',
    'op:vlasenica:',
    'op:zvornik:',
];

// strictCompare-equivalent for tool-side determinism (lexicographic only;
// the only inputs we sort here are OSIDs and formation IDs which are ASCII).
function strictCompare(a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

// ── Utility readers ─────────────────────────────────────────────────────────

function readJSON(p) {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function readWeeklyReport(p) {
    if (!fs.existsSync(p)) return [];
    const txt = fs.readFileSync(p, 'utf8');
    const out = [];
    for (const line of txt.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
            out.push(JSON.parse(trimmed));
        } catch (_e) {
            // skip malformed lines
        }
    }
    return out;
}

function isDrinaPerimeter(osid) {
    if (!osid) return false;
    for (const pref of DRINA_PERIMETER_PREFIXES) {
        if (osid.startsWith(pref)) return true;
    }
    return false;
}

// V2: optional AAR sidecar for predictor force_ratio_estimate harvest.
function readAARs(p) {
    if (!fs.existsSync(p)) return [];
    try {
        const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
        return Array.isArray(arr) ? arr : [];
    } catch (_e) {
        return [];
    }
}

// V2: classify whether a given AAR record targets an enclave (Srebrenica OR Žepa).
// Read-only against engine; uses the OSID lists local to this tool.
function aarTargetsEnclave(aar) {
    const objs = (aar && (aar.objectives_targeted || [])) || [];
    if (!Array.isArray(objs) || objs.length === 0) return null;
    let hitsSreb = false;
    let hitsZepa = false;
    for (const o of objs) {
        if (SREBRENICA_OSID_LIST.indexOf(o) >= 0) hitsSreb = true;
        if (o === ZEPA_CAPITAL_OSID) hitsZepa = true;
    }
    if (hitsSreb && hitsZepa) return 'both';
    if (hitsSreb) return 'srebrenica';
    if (hitsZepa) return 'zepa';
    return null;
}

// ── Snapshot extractor ──────────────────────────────────────────────────────

/**
 * Build one diagnostic snapshot from a final_save-shaped state object.
 * Returns a deterministic, plain-object record.
 */
function buildSnapshot(state, opts) {
    const aarRecords = (opts && Array.isArray(opts.aars)) ? opts.aars : [];

    const turn = (state && state.meta && state.meta.turn) || 0;
    const flags = (state && state.military && state.military.event_flags) || {};
    const controllers = (state && state.political && state.political.political_controllers) || {};
    const resilienceMap = (state && state.political && state.political.enclave_resilience) || {};
    const rupture = (state && state.military && state.military.negotiation
        && state.military.negotiation.rupture_consequences) || [];
    const formations = (state && state.military && state.military.formations) || {};

    // Sort OSIDs for deterministic output.
    const sortedSrebOsids = SREBRENICA_OSID_LIST.slice().sort(strictCompare);
    const enclave_osid_controllers = {};
    let rs_held_in_pocket = 0;
    for (const o of sortedSrebOsids) {
        const c = controllers[o] || null;
        enclave_osid_controllers[o] = c;
        if (c === 'RS') rs_held_in_pocket++;
    }

    // Garrison roster (sorted by formation id).
    const formationIds = Object.keys(formations).sort(strictCompare);
    let rbih_pocket_personnel = 0;
    let rbih_capital_personnel = 0;
    let rbih_zepa_capital_personnel = 0;
    let vrs_perimeter_personnel = 0;
    let vrs_perimeter_count = 0;
    const capital_garrison_brigades = [];
    // V2: full Drina-perimeter roster — every VRS brigade located on the
    // Drina perimeter (not only the aggregate count). Read-only.
    const vrs_drina_perimeter_roster = [];

    for (const fid of formationIds) {
        const f = formations[fid];
        if (!f || !f.location_osid) continue;
        const loc = f.location_osid;
        const fac = f.faction;
        const pers = Number(f.personnel) || 0;
        if (fac === 'RBiH' && SREBRENICA_OSID_LIST.indexOf(loc) >= 0) {
            rbih_pocket_personnel += pers;
            if (loc === SREBRENICA_CAPITAL_OSID) {
                rbih_capital_personnel += pers;
                capital_garrison_brigades.push({
                    id: fid,
                    personnel: pers,
                    cohesion: f.cohesion ?? null,
                });
            }
        }
        if (fac === 'RBiH' && loc === ZEPA_CAPITAL_OSID) {
            rbih_zepa_capital_personnel += pers;
        }
        if (fac === 'RS' && isDrinaPerimeter(loc)) {
            vrs_perimeter_personnel += pers;
            vrs_perimeter_count++;
            vrs_drina_perimeter_roster.push({
                id: fid,
                location_osid: loc,
                personnel: pers,
                morale: (f.morale === undefined || f.morale === null) ? null : Number(f.morale),
                cohesion: (f.cohesion === undefined || f.cohesion === null) ? null : Number(f.cohesion),
                corps_id: f.corps_id || null,
            });
        }
    }
    capital_garrison_brigades.sort((a, b) => strictCompare(a.id, b.id));
    vrs_drina_perimeter_roster.sort((a, b) => strictCompare(a.id, b.id));

    const force_ratio_vrs_to_rbih = rbih_pocket_personnel > 0
        ? Number((vrs_perimeter_personnel / rbih_pocket_personnel).toFixed(4))
        : null;

    // V2: per-enclave force concentration ratio.
    // Defender = RBiH personnel inside the enclave OSID set (capital for Žepa,
    // full pocket for Srebrenica). Attacker = VRS Drina perimeter personnel
    // (the historical siege ring). Concentration_ratio = attacker/defender.
    // This is the SAME numerator as force_ratio_vrs_to_rbih for Srebrenica;
    // we publish per-enclave so Žepa parity is visible without re-derivation.
    function concRatio(attackerPers, defenderPers) {
        if (!defenderPers || defenderPers <= 0) return null;
        return Number((attackerPers / defenderPers).toFixed(4));
    }
    const concentration_ratios = {
        srebrenica_pocket: {
            attacker_pers_vrs_drina_perimeter: vrs_perimeter_personnel,
            defender_pers_rbih_pocket: rbih_pocket_personnel,
            ratio_attacker_over_defender: concRatio(vrs_perimeter_personnel, rbih_pocket_personnel),
        },
        srebrenica_capital_only: {
            attacker_pers_vrs_drina_perimeter: vrs_perimeter_personnel,
            defender_pers_rbih_capital: rbih_capital_personnel,
            ratio_attacker_over_defender: concRatio(vrs_perimeter_personnel, rbih_capital_personnel),
        },
        zepa: {
            attacker_pers_vrs_drina_perimeter: vrs_perimeter_personnel,
            defender_pers_rbih_zepa_capital: rbih_zepa_capital_personnel,
            ratio_attacker_over_defender: concRatio(vrs_perimeter_personnel, rbih_zepa_capital_personnel),
        },
    };

    // V2: predictor force_ratio_estimate harvest from AARs whose objective set
    // overlaps an enclave OSID. We surface the predictor's view, not a recomputation.
    const enclave_op_predictor_ratios = [];
    for (const aar of aarRecords) {
        const cls = aarTargetsEnclave(aar);
        if (!cls) continue;
        enclave_op_predictor_ratios.push({
            operation_name: aar.operation_name || null,
            operation_id: aar.operation_id || null,
            corps_id: aar.corps_id || null,
            faction: aar.faction || null,
            started_turn: (aar.started_turn === undefined || aar.started_turn === null) ? null : Number(aar.started_turn),
            ended_turn: (aar.ended_turn === undefined || aar.ended_turn === null) ? null : Number(aar.ended_turn),
            duration_turns: (aar.duration_turns === undefined || aar.duration_turns === null) ? null : Number(aar.duration_turns),
            force_ratio_estimate: (aar.force_ratio_estimate === undefined || aar.force_ratio_estimate === null)
                ? null : Number(aar.force_ratio_estimate),
            initial_strength: (aar.initial_strength === undefined || aar.initial_strength === null) ? null : Number(aar.initial_strength),
            final_strength: (aar.final_strength === undefined || aar.final_strength === null) ? null : Number(aar.final_strength),
            outcome: aar.outcome || null,
            recovery_reason: aar.recovery_reason || null,
            participating_brigades: Array.isArray(aar.participating_brigades)
                ? aar.participating_brigades.slice().sort(strictCompare)
                : [],
            objectives_targeted: Array.isArray(aar.objectives_targeted)
                ? aar.objectives_targeted.slice().sort(strictCompare)
                : [],
            enclave_class: cls,
        });
    }
    enclave_op_predictor_ratios.sort((a, b) => {
        const sa = a.started_turn === null ? -1 : a.started_turn;
        const sb = b.started_turn === null ? -1 : b.started_turn;
        if (sa !== sb) return sa - sb;
        return strictCompare(a.operation_id || '', b.operation_id || '');
    });

    const resilienceEntry = resilienceMap['srebrenica'] || null;
    const zepaResilienceEntry = resilienceMap['zepa'] || null;

    // Canonical condition table.
    const c1 = flags.srebrenica_enclave_formed === true;
    const c2 = controllers[SREBRENICA_CAPITAL_OSID] === 'RS';
    const c3 = turn >= SREBRENICA_MIN_TURN;

    const conditions = {
        c1_enclave_formed_flag: { met: c1, observed: flags.srebrenica_enclave_formed ?? null },
        c2_capital_rs_controlled: { met: c2, observed: controllers[SREBRENICA_CAPITAL_OSID] || null },
        c3_turn_in_1995: { met: c3, observed: turn, threshold: SREBRENICA_MIN_TURN },
    };
    const all_met = c1 && c2 && c3;

    const recorded = Array.isArray(rupture) ? rupture.slice() : [];
    recorded.sort((a, b) => strictCompare(a.id || '', b.id || ''));

    return {
        turn,
        conditions,
        all_conditions_met: all_met,
        rupture_recorded: recorded.length > 0,
        rupture_entries: recorded,
        controllers: {
            srebrenica_capital: controllers[SREBRENICA_CAPITAL_OSID] || null,
            zepa: controllers[ZEPA_CAPITAL_OSID] || null,
            srebrenica_pocket: enclave_osid_controllers,
            rs_held_pocket_osids: rs_held_in_pocket,
            pocket_total_osids: SREBRENICA_OSID_LIST.length,
        },
        forces: {
            rbih_pocket_personnel,
            rbih_capital_personnel,
            rbih_zepa_capital_personnel,
            vrs_perimeter_count,
            vrs_perimeter_personnel,
            force_ratio_vrs_to_rbih,
            capital_garrison_brigades,
            // V2 additive — full perimeter roster for the §6 reviewer.
            vrs_drina_perimeter_roster,
        },
        // V2 additive — concentration ratios per enclave (read-only summary).
        concentration_ratios,
        // V2 additive — predictor force-ratio for enclave-targeting ops.
        enclave_op_predictor_ratios,
        resilience: {
            srebrenica: resilienceEntry,
            zepa: zepaResilienceEntry,
        },
    };
}

// ── Stdout table renderer ──────────────────────────────────────────────────

function renderStdout(snapshot, label) {
    const s = snapshot;
    const lines = [];
    lines.push('');
    lines.push('=== Rupture trace: ' + label + ' (turn ' + s.turn + ') ===');
    lines.push('Conditions:');
    lines.push('  c1 enclave_formed_flag      : ' + (s.conditions.c1_enclave_formed_flag.met ? 'MET   ' : 'UNMET ')
        + ' observed=' + JSON.stringify(s.conditions.c1_enclave_formed_flag.observed));
    lines.push('  c2 capital_rs_controlled    : ' + (s.conditions.c2_capital_rs_controlled.met ? 'MET   ' : 'UNMET ')
        + ' observed=' + JSON.stringify(s.conditions.c2_capital_rs_controlled.observed));
    lines.push('  c3 turn>=' + s.conditions.c3_turn_in_1995.threshold + '              : '
        + (s.conditions.c3_turn_in_1995.met ? 'MET   ' : 'UNMET ')
        + ' observed=' + s.conditions.c3_turn_in_1995.observed);
    lines.push('  ALL_MET=' + s.all_conditions_met + '   rupture_recorded=' + s.rupture_recorded);
    lines.push('Pocket controllers (' + s.controllers.rs_held_pocket_osids + '/'
        + s.controllers.pocket_total_osids + ' RS-held):');
    const sortedKeys = Object.keys(s.controllers.srebrenica_pocket).sort(strictCompare);
    for (const k of sortedKeys) {
        lines.push('  ' + k.padEnd(40) + ' ' + (s.controllers.srebrenica_pocket[k] || '?'));
    }
    lines.push('Forces:');
    lines.push('  RBiH pocket personnel  = ' + s.forces.rbih_pocket_personnel);
    lines.push('  RBiH capital personnel = ' + s.forces.rbih_capital_personnel);
    lines.push('  VRS perimeter count    = ' + s.forces.vrs_perimeter_count);
    lines.push('  VRS perimeter pers     = ' + s.forces.vrs_perimeter_personnel);
    lines.push('  force_ratio_VRS/RBiH   = ' + s.forces.force_ratio_vrs_to_rbih);
    lines.push('Capital garrison brigades:');
    if (s.forces.capital_garrison_brigades.length === 0) {
        lines.push('  (none)');
    } else {
        for (const b of s.forces.capital_garrison_brigades) {
            lines.push('  ' + b.id + ' pers=' + b.personnel + ' cohesion=' + b.cohesion);
        }
    }
    lines.push('Resilience:');
    lines.push('  srebrenica = ' + JSON.stringify(s.resilience.srebrenica));
    lines.push('  zepa       = ' + JSON.stringify(s.resilience.zepa));
    // V2: per-enclave concentration ratios.
    if (s.concentration_ratios) {
        lines.push('Concentration ratios (attacker / defender pers):');
        const cKeys = Object.keys(s.concentration_ratios).sort(strictCompare);
        for (const k of cKeys) {
            const c = s.concentration_ratios[k];
            lines.push('  ' + k.padEnd(28) + ' '
                + 'attacker=' + (c.attacker_pers_vrs_drina_perimeter ?? '-')
                + '  defender=' + (
                    c.defender_pers_rbih_pocket
                    ?? c.defender_pers_rbih_capital
                    ?? c.defender_pers_rbih_zepa_capital
                    ?? '-')
                + '  ratio=' + (c.ratio_attacker_over_defender ?? '-'));
        }
    }
    // V2: full Drina-perimeter roster (sorted by id).
    if (s.forces && Array.isArray(s.forces.vrs_drina_perimeter_roster)
        && s.forces.vrs_drina_perimeter_roster.length > 0) {
        lines.push('VRS Drina-perimeter brigade roster (' + s.forces.vrs_drina_perimeter_roster.length + '):');
        for (const b of s.forces.vrs_drina_perimeter_roster) {
            lines.push('  ' + b.id.padEnd(34)
                + ' loc=' + (b.location_osid || '?').padEnd(28)
                + ' pers=' + String(b.personnel).padStart(5)
                + ' morale=' + String(b.morale ?? '-')
                + ' cohesion=' + String(b.cohesion ?? '-'));
        }
    }
    // V2: predictor ratio harvest for enclave-targeting ops.
    if (Array.isArray(s.enclave_op_predictor_ratios) && s.enclave_op_predictor_ratios.length > 0) {
        lines.push('Predictor force_ratio_estimate for enclave ops:');
        for (const op of s.enclave_op_predictor_ratios) {
            lines.push('  ' + (op.operation_name || op.operation_id || '?')
                + ' [' + op.enclave_class + ']'
                + ' t=' + op.started_turn + '..' + op.ended_turn
                + ' force_ratio=' + (op.force_ratio_estimate ?? '-')
                + ' initial=' + (op.initial_strength ?? '-')
                + ' outcome=' + (op.outcome || '-')
                + ' recovery=' + (op.recovery_reason || '-'));
        }
    }
    if (s.rupture_recorded) {
        lines.push('Rupture entries:');
        for (const r of s.rupture_entries) {
            lines.push('  ' + JSON.stringify(r));
        }
    }
    return lines.join('\n');
}

// ── Main ────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
    const args = { run_dir: null, writeJson: false, turns: null };
    const rest = argv.slice(2);
    for (let i = 0; i < rest.length; i++) {
        const a = rest[i];
        if (a === '--write-json') args.writeJson = true;
        else if (a === '--turns' && i + 1 < rest.length) {
            args.turns = rest[i + 1].split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n));
            i++;
        } else if (!args.run_dir) args.run_dir = a;
    }
    return args;
}

function main() {
    const args = parseArgs(process.argv);
    if (!args.run_dir) {
        console.error('usage: srebrenica_rupture_trace.cjs <run_dir> [--write-json] [--turns 160,170,180,188]');
        process.exit(2);
    }
    const finalSavePath = path.join(args.run_dir, 'final_save.json');
    if (!fs.existsSync(finalSavePath)) {
        console.error('error: final_save.json not found at ' + finalSavePath);
        process.exit(1);
    }

    const finalState = readJSON(finalSavePath);
    // V2: harvest AARs once and pass into snapshot (additive; absent AARs → empty list, R2-6 behaviour preserved).
    const aars = readAARs(path.join(args.run_dir, 'operation_aars.json'));
    const finalSnapshot = buildSnapshot(finalState, { aars });

    // Per-turn snapshots from weekly_report.jsonl when present. The weekly
    // report is event-stream-shaped, not full state, so we only synthesize
    // the condition view (turn + recorded ruptures observable from per-week
    // `political_controllers_delta` + `event_flags_delta` if present).
    const weekly = readWeeklyReport(path.join(args.run_dir, 'weekly_report.jsonl'));
    const weekly_condition_view = [];
    let runningCapitalController = null;
    let runningEnclaveFormed = false;
    for (const w of weekly) {
        const t = (w && w.turn) || 0;
        if (w && w.event_flags && w.event_flags.srebrenica_enclave_formed === true) {
            runningEnclaveFormed = true;
        }
        const ctrlMap = (w && w.political_controllers) || (w && w.controllers) || {};
        if (ctrlMap[SREBRENICA_CAPITAL_OSID] !== undefined) {
            runningCapitalController = ctrlMap[SREBRENICA_CAPITAL_OSID];
        }
        weekly_condition_view.push({
            turn: t,
            c1_enclave_formed_flag: runningEnclaveFormed,
            c2_capital_rs_controlled: runningCapitalController === 'RS',
            c3_turn_in_1995: t >= SREBRENICA_MIN_TURN,
        });
    }
    weekly_condition_view.sort((a, b) => a.turn - b.turn);

    // Optional per-turn focus markers (used by the report).
    const focus = (args.turns && args.turns.length > 0)
        ? args.turns
        : [Math.max(0, finalSnapshot.turn - 28), Math.max(0, finalSnapshot.turn - 18),
        Math.max(0, finalSnapshot.turn - 8), finalSnapshot.turn];
    const focus_snapshots = focus
        .slice()
        .sort((a, b) => a - b)
        .map(t => {
            // We can only build a complete snapshot for the final state (the
            // engine doesn't emit per-turn full saves). Per-focus turn we emit
            // the condition view from weekly_condition_view if available.
            const wcv = weekly_condition_view.find(x => x.turn === t) || null;
            return { turn: t, weekly_view: wcv };
        });

    const output = {
        version: 1,
        rupture_id: 'srebrenica_genocide_1995',
        canon_source: 'src/sim/negotiation/rupture_consequences.ts',
        run_dir: args.run_dir,
        final_snapshot: finalSnapshot,
        weekly_condition_view,
        focus_snapshots,
    };

    process.stdout.write(renderStdout(finalSnapshot, 'final state') + '\n');
    if (focus_snapshots.length > 0) {
        process.stdout.write('\n=== Focus turn condition view (from weekly_report.jsonl) ===\n');
        for (const f of focus_snapshots) {
            process.stdout.write('  t=' + f.turn + ' '
                + (f.weekly_view
                    ? ('c1=' + f.weekly_view.c1_enclave_formed_flag
                        + ' c2=' + f.weekly_view.c2_capital_rs_controlled
                        + ' c3=' + f.weekly_view.c3_turn_in_1995)
                    : '(no weekly view)') + '\n');
        }
    }

    if (args.writeJson) {
        const outPath = path.join(args.run_dir, 'srebrenica_rupture_trace.json');
        // Stable stringify by canonical key sort.
        function stableStringify(v) {
            return JSON.stringify(v, function (_k, val) {
                if (val && typeof val === 'object' && !Array.isArray(val)) {
                    const keys = Object.keys(val).sort(strictCompare);
                    const sorted = {};
                    for (const k of keys) sorted[k] = val[k];
                    return sorted;
                }
                return val;
            }, 2);
        }
        fs.writeFileSync(outPath, stableStringify(output) + '\n', 'utf8');
        process.stdout.write('\nwrote ' + outPath + '\n');
    }
}

if (require.main === module) {
    try {
        main();
    } catch (e) {
        console.error('srebrenica_rupture_trace failed:', e && e.message ? e.message : e);
        process.exit(1);
    }
}

module.exports = {
    buildSnapshot,
    readAARs,
    aarTargetsEnclave,
    SREBRENICA_OSID_LIST,
    SREBRENICA_CAPITAL_OSID,
    SREBRENICA_MIN_TURN,
    ZEPA_CAPITAL_OSID,
};
