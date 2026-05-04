#!/usr/bin/env node
/**
 * late_war_atrocity_pre_conditions.cjs
 *
 * Parametric per-turn precondition trace for ANY rupture event (not just
 * Srebrenica). Reads a run dir + a rupture_event_id and reports, for each
 * focus turn, the canonical Ring 2 preconditions derived from the rupture
 * registry below + a classification of why each unmet condition is unmet:
 *
 *   (a) engine bug
 *   (b) upstream prerequisite missing
 *   (c) bot AI gap
 *   (d) combat math gap
 *   (e) canon-correct emergent silence
 *
 * The classification is a heuristic over observable run-state — the tool is
 * audit-only and does NOT propose fixes. It only attaches a class label so
 * that the §6 sign-off reviewer can navigate the evidence quickly.
 *
 * Determinism: sorted iteration on every map output, no Math.random(),
 * no Date.now(), no timestamps. Reads only.
 *
 * Usage:
 *   node tools/diagnostics/late_war_atrocity_pre_conditions.cjs <run_dir> <rupture_event_id> [--write-json] [--turns t1,t2,...]
 *
 * Currently registered rupture_event_ids:
 *   srebrenica_genocide_1995
 *
 * Per LANE-NIGHTSHIFT-SREBRENICA-DIAGNOSTIC-V2: registry-driven so that future
 * canon expansions (e.g. a hypothetical zepa_fall_1995) only need a registry
 * entry — the tool is parametric in the spec sense, not Srebrenica-specific.
 *
 * Read-only against engine source: rupture predicates are copied verbatim with
 * provenance comments rather than imported.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// strictCompare-equivalent for tool-side determinism.
function strictCompare(a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

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
        try { out.push(JSON.parse(trimmed)); } catch (_e) { /* skip */ }
    }
    return out;
}

function readAARs(p) {
    if (!fs.existsSync(p)) return [];
    try {
        const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
        return Array.isArray(arr) ? arr : [];
    } catch (_e) {
        return [];
    }
}

// ── Rupture registry (copy of canon — kept here so the tool is read-only against engine) ─
//
// Each rupture entry declares:
//   - id: the rupture_event_id
//   - canon_source: provenance comment (file path)
//   - target_osids: OSIDs that must flip to perpetrator faction for c2-class checks
//   - perpetrator_faction
//   - flag_required: event flag that must be true (c1-class)
//   - min_turn: turn floor (c3-class)
//   - perimeter_prefixes: OSID prefixes treated as the historical attacker ring
//     (used for bot-AI / combat-math classification heuristics)
//   - description: short label
const RUPTURE_REGISTRY = {
    srebrenica_genocide_1995: {
        id: 'srebrenica_genocide_1995',
        canon_source: 'src/sim/negotiation/rupture_consequences.ts',
        target_osids: ['op:srebrenica:srebrenica_2'],
        // Pocket OSIDs supply the upstream-prerequisite signal for class (b).
        pocket_osids: [
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
        ],
        perpetrator_faction: 'RS',
        defender_faction: 'RBiH',
        flag_required: 'srebrenica_enclave_formed',
        min_turn: 140,
        perimeter_prefixes: [
            'op:bratunac:',
            'op:rogatica:',
            'op:visegrad:',
            'op:vlasenica:',
            'op:zvornik:',
        ],
        description: 'Fall of Srebrenica safe area, July 1995',
    },
    // Hypothetical Žepa parity entry — registered for parametricity test only.
    // NOT canon. The tool surface is what matters; canon entry remains a §6
    // open question (see Q-CANON-RUPT-3).
    __test_zepa_fall_1995: {
        id: '__test_zepa_fall_1995',
        canon_source: '(test-only — parametricity probe; not engine canon)',
        target_osids: ['op:rogatica:zepa_2'],
        pocket_osids: ['op:rogatica:zepa_2'],
        perpetrator_faction: 'RS',
        defender_faction: 'RBiH',
        flag_required: null, // test entry: no flag
        min_turn: 140,
        perimeter_prefixes: [
            'op:rogatica:',
            'op:visegrad:',
            'op:vlasenica:',
        ],
        description: 'TEST-ONLY parametricity probe — Žepa fall, 1995',
    },
};

function listRegistryIds() {
    return Object.keys(RUPTURE_REGISTRY).sort(strictCompare);
}

// ── Classification helpers ──────────────────────────────────────────────────
//
// Return one of the 5 class labels for an unmet condition.
// Heuristic, audit-only — the labels guide §6 reviewers; they do not bind a fix.

function classifyFlagUnmet(flagName, observed) {
    // (b) upstream prerequisite missing — the event-system flag never fired.
    return {
        cls: 'b',
        reason: 'event flag "' + flagName + '" not set (observed=' + JSON.stringify(observed) + ')',
    };
}

function classifyTurnUnmet(turn, threshold) {
    // (e) canon-correct silence — turn precondition is purely structural.
    return {
        cls: 'e',
        reason: 'turn ' + turn + ' < min_turn ' + threshold,
    };
}

function classifyControlUnmet(ctx) {
    // ctx: { observed, perpetrator, predictor_min_force_ratio,
    //        attacker_pers, defender_pers, hardening_active, attempted_ops }
    // Decision tree:
    //   - if no attempted ops at all targeting OSID → (c) bot AI gap
    //   - if attempted ops exist but predictor force_ratio < 0.5 → (d) combat math gap
    //   - if predictor force_ratio >= 0.5 but op outcome=failure with planning_invalidated → (c)
    //   - otherwise → (e) emergent silence
    if (!ctx.attempted_ops || ctx.attempted_ops.length === 0) {
        return {
            cls: 'c',
            reason: 'no attempted ops targeting capture OSIDs — bot allocation/AI gap',
        };
    }
    const minRatio = (typeof ctx.predictor_min_force_ratio === 'number')
        ? ctx.predictor_min_force_ratio : null;
    if (minRatio !== null && minRatio < 0.5) {
        return {
            cls: 'd',
            reason: 'predictor force_ratio_estimate=' + minRatio.toFixed(4)
                + ' (<0.5) — combat math gates the assault below feasible',
        };
    }
    // Mixed: ops attempted, predictor not catastrophic, but outcome failed.
    let allFailedPlanning = ctx.attempted_ops.every(o => o.outcome === 'failure'
        && (o.recovery_reason === 'planning_invalidated' || o.recovery_reason === 'max_failures'));
    if (allFailedPlanning) {
        return {
            cls: 'c',
            reason: 'ops attempted but recovered at planning/max-failures — bot-AI commit shortfall',
        };
    }
    return {
        cls: 'e',
        reason: 'attacker did not capture OSID under unforced combat — canon-correct emergent silence',
    };
}

// ── Snapshot builder per rupture-event-id ──────────────────────────────────

function isOnPerimeter(osid, prefixes) {
    if (!osid) return false;
    for (const p of prefixes) {
        if (osid.startsWith(p)) return true;
    }
    return false;
}

function buildPreconditionSnapshot(state, registryEntry, aars) {
    const turn = (state && state.meta && state.meta.turn) || 0;
    const flags = (state && state.military && state.military.event_flags) || {};
    const controllers = (state && state.political && state.political.political_controllers) || {};
    const formations = (state && state.military && state.military.formations) || {};

    // c1 — flag (if registered).
    let c1 = { name: 'flag_required', met: true, classification: null };
    if (registryEntry.flag_required) {
        const observed = flags[registryEntry.flag_required];
        const met = observed === true;
        c1 = {
            name: 'flag_required:' + registryEntry.flag_required,
            met,
            observed: observed === undefined ? null : observed,
            classification: met ? null : classifyFlagUnmet(registryEntry.flag_required, observed),
        };
    } else {
        c1 = { name: 'flag_required:(none)', met: true, observed: null, classification: null };
    }

    // c2 — every target OSID must be perpetrator-controlled.
    const targetOsids = (registryEntry.target_osids || []).slice().sort(strictCompare);
    const targetControl = {};
    let c2met = true;
    for (const osid of targetOsids) {
        const ctrl = controllers[osid] || null;
        targetControl[osid] = ctrl;
        if (ctrl !== registryEntry.perpetrator_faction) c2met = false;
    }

    // Force / op context for classification of c2 unmet.
    const formIds = Object.keys(formations).sort(strictCompare);
    let attacker_pers = 0;
    let defender_pers = 0;
    let defender_capital_pers = 0;
    for (const fid of formIds) {
        const f = formations[fid];
        if (!f || !f.location_osid) continue;
        const loc = f.location_osid;
        const fac = f.faction;
        const pers = Number(f.personnel) || 0;
        if (fac === registryEntry.perpetrator_faction
            && isOnPerimeter(loc, registryEntry.perimeter_prefixes || [])) {
            attacker_pers += pers;
        }
        if (fac === registryEntry.defender_faction
            && (registryEntry.pocket_osids || []).indexOf(loc) >= 0) {
            defender_pers += pers;
            if (targetOsids.indexOf(loc) >= 0) defender_capital_pers += pers;
        }
    }

    const attempted_ops = [];
    let predictor_min_force_ratio = null;
    for (const aar of aars) {
        const objs = (aar && aar.objectives_targeted) || [];
        if (!Array.isArray(objs)) continue;
        let hits = false;
        for (const o of objs) {
            if (targetOsids.indexOf(o) >= 0
                || (registryEntry.pocket_osids || []).indexOf(o) >= 0) {
                hits = true;
                break;
            }
        }
        if (!hits) continue;
        const fre = (typeof aar.force_ratio_estimate === 'number') ? aar.force_ratio_estimate : null;
        if (fre !== null && (predictor_min_force_ratio === null || fre < predictor_min_force_ratio)) {
            predictor_min_force_ratio = fre;
        }
        attempted_ops.push({
            operation_id: aar.operation_id || null,
            operation_name: aar.operation_name || null,
            corps_id: aar.corps_id || null,
            faction: aar.faction || null,
            started_turn: aar.started_turn ?? null,
            ended_turn: aar.ended_turn ?? null,
            initial_strength: aar.initial_strength ?? null,
            final_strength: aar.final_strength ?? null,
            force_ratio_estimate: fre,
            outcome: aar.outcome || null,
            recovery_reason: aar.recovery_reason || null,
            participating_brigades: Array.isArray(aar.participating_brigades)
                ? aar.participating_brigades.slice().sort(strictCompare) : [],
            objectives_targeted: Array.isArray(aar.objectives_targeted)
                ? aar.objectives_targeted.slice().sort(strictCompare) : [],
        });
    }
    attempted_ops.sort((a, b) => {
        const sa = a.started_turn === null ? -1 : a.started_turn;
        const sb = b.started_turn === null ? -1 : b.started_turn;
        if (sa !== sb) return sa - sb;
        return strictCompare(a.operation_id || '', b.operation_id || '');
    });

    const c2classification = c2met ? null : classifyControlUnmet({
        observed: targetControl,
        perpetrator: registryEntry.perpetrator_faction,
        predictor_min_force_ratio,
        attacker_pers,
        defender_pers,
        attempted_ops,
    });

    const c2 = {
        name: 'target_osid_perpetrator_controlled',
        met: c2met,
        observed: targetControl,
        classification: c2classification,
    };

    // c3 — turn threshold.
    const c3met = turn >= (registryEntry.min_turn || 0);
    const c3 = {
        name: 'turn>=' + (registryEntry.min_turn || 0),
        met: c3met,
        observed: turn,
        classification: c3met ? null : classifyTurnUnmet(turn, registryEntry.min_turn || 0),
    };

    return {
        rupture_event_id: registryEntry.id,
        canon_source: registryEntry.canon_source,
        turn,
        conditions: { c1, c2, c3 },
        all_conditions_met: c1.met && c2met && c3met,
        force_context: {
            attacker_pers,
            defender_pers,
            defender_capital_pers,
            predictor_min_force_ratio,
        },
        attempted_ops,
    };
}

// ── Stdout renderer ────────────────────────────────────────────────────────

function renderStdout(snap) {
    const lines = [];
    lines.push('');
    lines.push('=== late_war_atrocity_pre_conditions: ' + snap.rupture_event_id + ' (turn ' + snap.turn + ') ===');
    lines.push('canon_source: ' + snap.canon_source);
    lines.push('Conditions:');
    for (const key of ['c1', 'c2', 'c3']) {
        const c = snap.conditions[key];
        let line = '  ' + key + ' ' + c.name.padEnd(48) + ' ' + (c.met ? 'MET  ' : 'UNMET');
        if (!c.met && c.classification) {
            line += '   class=(' + c.classification.cls + ') ' + c.classification.reason;
        }
        lines.push(line);
    }
    lines.push('  ALL_MET=' + snap.all_conditions_met);
    lines.push('Force context:');
    lines.push('  attacker_pers (perimeter ring) = ' + snap.force_context.attacker_pers);
    lines.push('  defender_pers (pocket)         = ' + snap.force_context.defender_pers);
    lines.push('  defender_capital_pers          = ' + snap.force_context.defender_capital_pers);
    lines.push('  predictor_min_force_ratio      = ' + (snap.force_context.predictor_min_force_ratio ?? '-'));
    lines.push('Attempted ops (' + snap.attempted_ops.length + '):');
    if (snap.attempted_ops.length === 0) {
        lines.push('  (none)');
    } else {
        for (const o of snap.attempted_ops) {
            lines.push('  ' + (o.operation_name || o.operation_id || '?')
                + ' t=' + o.started_turn + '..' + o.ended_turn
                + ' force_ratio=' + (o.force_ratio_estimate ?? '-')
                + ' initial=' + (o.initial_strength ?? '-')
                + ' outcome=' + (o.outcome || '-')
                + ' recovery=' + (o.recovery_reason || '-'));
            lines.push('    brigades=' + JSON.stringify(o.participating_brigades));
            lines.push('    objectives=' + JSON.stringify(o.objectives_targeted));
        }
    }
    return lines.join('\n');
}

// ── Main ────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
    const args = { run_dir: null, rupture_id: null, writeJson: false, turns: null };
    const rest = argv.slice(2);
    const positional = [];
    for (let i = 0; i < rest.length; i++) {
        const a = rest[i];
        if (a === '--write-json') args.writeJson = true;
        else if (a === '--turns' && i + 1 < rest.length) {
            args.turns = rest[i + 1].split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n));
            i++;
        } else positional.push(a);
    }
    if (positional.length >= 1) args.run_dir = positional[0];
    if (positional.length >= 2) args.rupture_id = positional[1];
    return args;
}

function main() {
    const args = parseArgs(process.argv);
    if (!args.run_dir || !args.rupture_id) {
        console.error('usage: late_war_atrocity_pre_conditions.cjs <run_dir> <rupture_event_id> [--write-json] [--turns t1,t2,...]');
        console.error('registered rupture_event_ids: ' + listRegistryIds().join(', '));
        process.exit(2);
    }
    const reg = RUPTURE_REGISTRY[args.rupture_id];
    if (!reg) {
        console.error('error: rupture_event_id "' + args.rupture_id + '" not registered.');
        console.error('registered: ' + listRegistryIds().join(', '));
        process.exit(2);
    }
    const finalSavePath = path.join(args.run_dir, 'final_save.json');
    if (!fs.existsSync(finalSavePath)) {
        console.error('error: final_save.json not found at ' + finalSavePath);
        process.exit(1);
    }

    const finalState = readJSON(finalSavePath);
    const aars = readAARs(path.join(args.run_dir, 'operation_aars.json'));
    const finalSnap = buildPreconditionSnapshot(finalState, reg, aars);

    // Per-turn weekly view (best effort — same constraint as the R2-6 tool:
    // weekly_report.jsonl does not contain full state, only deltas).
    const weekly = readWeeklyReport(path.join(args.run_dir, 'weekly_report.jsonl'));
    const weekly_view = [];
    let runningFlag = !reg.flag_required;
    let runningCapitalCtrl = null;
    for (const w of weekly) {
        const t = (w && w.turn) || 0;
        if (reg.flag_required && w && w.event_flags
            && w.event_flags[reg.flag_required] === true) runningFlag = true;
        const ctrlMap = (w && w.political_controllers) || (w && w.controllers) || {};
        const firstTarget = reg.target_osids && reg.target_osids[0];
        if (firstTarget && ctrlMap[firstTarget] !== undefined) runningCapitalCtrl = ctrlMap[firstTarget];
        weekly_view.push({
            turn: t,
            c1_flag: runningFlag,
            c2_capital_perpetrator: runningCapitalCtrl === reg.perpetrator_faction,
            c3_turn: t >= (reg.min_turn || 0),
        });
    }
    weekly_view.sort((a, b) => a.turn - b.turn);

    const focus = (args.turns && args.turns.length > 0)
        ? args.turns
        : [Math.max(0, finalSnap.turn - 28), Math.max(0, finalSnap.turn - 18),
        Math.max(0, finalSnap.turn - 8), finalSnap.turn];
    const focus_snapshots = focus
        .slice()
        .sort((a, b) => a - b)
        .map(t => {
            const wv = weekly_view.find(x => x.turn === t) || null;
            return { turn: t, weekly_view: wv };
        });

    process.stdout.write(renderStdout(finalSnap) + '\n');
    if (focus_snapshots.length > 0) {
        process.stdout.write('\n=== Focus turn condition view (from weekly_report.jsonl) ===\n');
        for (const f of focus_snapshots) {
            process.stdout.write('  t=' + f.turn + ' '
                + (f.weekly_view
                    ? ('c1=' + f.weekly_view.c1_flag
                        + ' c2=' + f.weekly_view.c2_capital_perpetrator
                        + ' c3=' + f.weekly_view.c3_turn)
                    : '(no weekly view)') + '\n');
        }
    }

    if (args.writeJson) {
        const out = {
            version: 1,
            rupture_event_id: reg.id,
            canon_source: reg.canon_source,
            run_dir: args.run_dir,
            final_snapshot: finalSnap,
            weekly_view,
            focus_snapshots,
        };
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
        const outPath = path.join(args.run_dir, 'late_war_atrocity_pre_conditions__' + reg.id + '.json');
        fs.writeFileSync(outPath, stableStringify(out) + '\n', 'utf8');
        process.stdout.write('\nwrote ' + outPath + '\n');
    }
}

if (require.main === module) {
    try {
        main();
    } catch (e) {
        console.error('late_war_atrocity_pre_conditions failed:', e && e.message ? e.message : e);
        process.exit(1);
    }
}

module.exports = {
    buildPreconditionSnapshot,
    listRegistryIds,
    RUPTURE_REGISTRY,
};
