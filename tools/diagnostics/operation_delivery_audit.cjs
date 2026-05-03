#!/usr/bin/env node
/**
 * Operation delivery audit (per-launched-op trace).
 *
 * Read-only diagnostic for the proposal -> resolution -> AAR linkage chain
 * AND the per-axis combat-delivery story. Built for the Late-War Operation
 * Combat Delivery Mega-Lane (2026-05-01) so that "did the engine deliver
 * what the player approved?" is intelligible without source spelunking.
 *
 * Reuses `collectRun()` from opportunity_health_audit.cjs and BFS adjacency
 * shape from diagnose_run.cjs.
 *
 * Inputs (per run dir):
 *   - final_save.json              (required)
 *   - operation_aars.json          (optional; fallback for operation_history)
 *   - run_summary.json             (optional)
 *   - weekly_report.jsonl          (optional)
 *   - data/derived/operational/operational_contact_graph.json (optional)
 *
 * Output:
 *   - Markdown to stdout (default)
 *   - JSON to stdout when `--json` flag is present
 *
 * Flags:
 *   --json             machine-readable JSON output
 *   --include-active   include corps_command[*].active_operations[*] as
 *                      synthetic AARs (default off; off-cycle ops are noise)
 *
 * Determinism:
 *   - All Map/Object iteration uses strictCompare-sorted keys
 *   - No Math.random / Date.now / new Date() / locale-sensitive sort
 *   - No writes anywhere
 */

'use strict';

const fs = require('fs');
const path = require('path');

const upstream = require('./opportunity_health_audit.cjs');

// ── strictCompare (matches src/state/validateGameState.ts) ────────────────
function strictCompare(a, b) {
    const sa = String(a);
    const sb = String(b);
    return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonIfExists(filePath, fallback) {
    return fs.existsSync(filePath) ? readJson(filePath) : fallback;
}

function asArray(value) {
    return Array.isArray(value) ? value : [];
}

// ── Adjacency (mirror of diagnose_run.cjs:38-72) ──────────────────────────
function loadAdjacency(repoRoot) {
    const candidates = [
        path.join(repoRoot, 'data/derived/operational/operational_contact_graph.json'),
        path.resolve('data/derived/operational/operational_contact_graph.json'),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) {
            try {
                const g = readJson(p);
                const adj = new Map();
                for (const e of asArray(g.edges)) {
                    if (!adj.has(e.a)) adj.set(e.a, []);
                    if (!adj.has(e.b)) adj.set(e.b, []);
                    adj.get(e.a).push(e.b);
                    adj.get(e.b).push(e.a);
                }
                // Determinism: sort each neighbor list once.
                for (const list of adj.values()) list.sort(strictCompare);
                return adj;
            } catch (e) {
                // fall through, try next candidate
            }
        }
    }
    return new Map();
}

// ── Predicate vocabulary ──────────────────────────────────────────────────
//
// Capture-blockage classification per axis (or per legacy flat op):
//   'op_delivered_intent'         : every targeted objective held by op faction
//                                   AND total_attacks > 0 (logged_capture).
//   'target_already_friendly'     : objectives held but total_attacks == 0
//                                   (held_without_logged_attack provenance).
//   'contacted_but_underdelivered': total_attacks > 0, captures < targets,
//                                   first_obj has friendly approach neighbors.
//   'no_contact_pathing'          : total_attacks == 0 AND first_obj has
//                                   ZERO friendly approach neighbors at the
//                                   final-save political control snapshot
//                                   (engine silent-skip + catalog gap).
//   'no_contact_other'            : total_attacks == 0 but first_obj IS
//                                   front-adjacent (e.g. participants never
//                                   reached staging, op never opened fire
//                                   for non-pathing reasons). Preserved as
//                                   a fallback when recovery_reason does not
//                                   discriminate one of the three sub-classes
//                                   below.
//
// LANE-NIGHTSHIFT-N6 (2026-05-03): the historical 'no_contact_other' bucket
// collapsed three distinct binding mechanisms. Sub-predicates now split by
// op-level `recovery_reason` when total_attacks == 0 and the first objective
// is front-adjacent:
//   'no_launch_readiness'         : recovery_reason == 'planning_invalidated'.
//                                   Commander invalidated the plan during
//                                   planning (e.g. participants never reached
//                                   staging before plan abandoned, intel
//                                   shifted, force_ratio dropped below gate).
//                                   This is the family that the LANE-B1
//                                   cooldown bounds (the 6x repeat loop).
//   'no_opening_attack'           : recovery_reason in {'max_failures',
//                                   'no_logged_attempt'}. Op entered
//                                   execution but `hasExecutableOpeningAttack`
//                                   never returned an actionable axis-relevant
//                                   attack — staging reached but no attack fired.
//   'no_staging_march'            : recovery_reason in {'brigade_attrition',
//                                   'orphaned_sector'}. Participants destroyed
//                                   in transit, or sector dissolved during the
//                                   op so staging concept evaporated.
//   'unknown'                     : insufficient data.
//
// Note: predicates use the *final-save* political control snapshot, which
// is the determinism-safe approach. The engine's runtime
// `areParticipantsReadyForExecution` check is per-turn, but the
// front-edge topology of the first objective is stable enough that final
// snapshot gives the right answer for the silent-skip class. Where this
// is ambiguous, we still emit the predicate truth and downstream readers
// can cross-check with `axis.unreachable_at_launch` once Phase C lands.

function frontAdjacentApproachOsids(adjacency, controllers, firstObjective, faction) {
    if (!firstObjective || !controllers) return [];
    const neighbors = adjacency.get(firstObjective) || [];
    const out = [];
    for (const n of neighbors) {
        if (controllers[n] === faction) out.push(n);
    }
    out.sort(strictCompare);
    return out;
}

function classifyAxis(axis, opTotalAttacks, controllers, adjacency, faction, axesPresent, recoveryReason) {
    const targets = asArray(axis.objectives_targeted);
    const captured = asArray(axis.objectives_captured);
    const attacks = Number.isFinite(+axis.total_attacks) ? +axis.total_attacks : 0;

    const firstObj = targets.length > 0 ? targets[0] : null;
    const friendlyApproach = frontAdjacentApproachOsids(adjacency, controllers, firstObj, faction);

    // Stalls / first-stall heuristic — first targeted obj that did not get captured.
    let firstStall = null;
    for (const obj of targets) {
        if (!captured.includes(obj)) { firstStall = obj; break; }
    }

    // For axisless legacy ops, axes_present false; the caller passes
    // op-level totals via opTotalAttacks for cross-check, but here we
    // classify on the per-row attack count primarily.
    const allHeld = targets.length > 0 && captured.length === targets.length;

    let predicate;
    if (allHeld && attacks > 0) {
        predicate = 'op_delivered_intent';
    } else if (allHeld && attacks === 0) {
        predicate = 'target_already_friendly';
    } else if (attacks > 0 && captured.length < targets.length) {
        predicate = 'contacted_but_underdelivered';
    } else if (attacks === 0 && targets.length > 0) {
        // Silent-skip class disambiguation: are there any friendly
        // approach OSIDs adjacent to the first objective at all?
        if (adjacency.size === 0 || !controllers) {
            predicate = 'unknown';
        } else if (friendlyApproach.length === 0) {
            predicate = 'no_contact_pathing';
        } else {
            // LANE-NIGHTSHIFT-N6: split the historical 'no_contact_other'
            // bucket into three sub-classes by op-level recovery_reason.
            // /operations-expert Tier 1 evidence: n1621 had 23 ops collapsed
            // under no_contact_other masking distinct binding mechanisms.
            const reason = typeof recoveryReason === 'string' ? recoveryReason : '';
            if (reason === 'planning_invalidated') {
                predicate = 'no_launch_readiness';
            } else if (reason === 'max_failures' || reason === 'no_logged_attempt') {
                predicate = 'no_opening_attack';
            } else if (reason === 'brigade_attrition' || reason === 'orphaned_sector') {
                predicate = 'no_staging_march';
            } else {
                predicate = 'no_contact_other';
            }
        }
    } else {
        predicate = 'unknown';
    }

    // Suppress predicate noise: if axis-level captures present but
    // op-level total is also zero we still want to differentiate; nothing
    // extra to do here. Use opTotalAttacks only for the "axes_present"
    // visibility flag in the report.
    void opTotalAttacks;
    void axesPresent;

    return {
        first_objective: firstObj || '',
        first_stall: firstStall || '',
        captured_count: captured.length,
        targeted_count: targets.length,
        attacks,
        friendly_approach_neighbors: friendlyApproach,
        predicate,
    };
}

function buildAxisRow(axis, opTotalAttacks, controllers, adjacency, faction, recoveryReason) {
    const cls = classifyAxis(axis, opTotalAttacks, controllers, adjacency, faction, true, recoveryReason);
    return {
        axis_id: String(axis.axis_id || ''),
        axis_name: String(axis.axis_name || ''),
        brigades: Array.isArray(axis.brigades) ? axis.brigades.slice().sort(strictCompare) : [],
        staging_osid: typeof axis.staging_osid === 'string' ? axis.staging_osid : '',
        unreachable_at_launch: axis.unreachable_at_launch === true,
        ...cls,
    };
}

function buildLegacyAxisRow(aar, controllers, adjacency, faction, recoveryReason) {
    // Legacy flat op (no axes); synthesize a single axis row.
    const fakeAxis = {
        axis_id: '(flat)',
        axis_name: '(flat)',
        brigades: asArray(aar.participating_brigades),
        objectives_targeted: asArray(aar.objectives_targeted),
        objectives_captured: asArray(aar.objectives_captured),
        total_attacks: aar.total_attacks,
    };
    const cls = classifyAxis(fakeAxis, aar.total_attacks, controllers, adjacency, faction, false, recoveryReason);
    return {
        axis_id: '(flat)',
        axis_name: '(flat)',
        brigades: Array.isArray(fakeAxis.brigades) ? fakeAxis.brigades.slice().sort(strictCompare) : [],
        staging_osid: '',
        unreachable_at_launch: false,
        ...cls,
    };
}

// ── AAR row enrichment ────────────────────────────────────────────────────
function buildOpRows({ runDir, includeActive }) {
    const finalSavePath = path.join(runDir, 'final_save.json');
    const aarPath = path.join(runDir, 'operation_aars.json');
    const summaryPath = path.join(runDir, 'run_summary.json');
    if (!fs.existsSync(finalSavePath)) {
        throw new Error(`Missing final_save.json in ${runDir}`);
    }

    const state = readJson(finalSavePath);
    const summary = readJsonIfExists(summaryPath, {});
    const operationHistory = asArray(state.operation_history).length > 0
        ? asArray(state.operation_history)
        : asArray(readJsonIfExists(aarPath, []));

    const proposals = asArray(state.military && state.military.operation_opportunities);
    const resolutions = asArray(state.military && state.military.operation_opportunity_resolutions);
    const controllers = (state.political && state.political.political_controllers) || {};

    // Reuse upstream rows for the linkage chain header where possible.
    let upstreamRun = null;
    try {
        upstreamRun = upstream.collectRun(runDir);
    } catch (e) {
        // collectRun is best-effort; opportunity-less runs still produce op rows.
        upstreamRun = null;
    }

    // Build proposal/resolution lookups for linkage display.
    const proposalsById = new Map();
    for (const p of proposals) {
        if (p && p.proposal_id) proposalsById.set(String(p.proposal_id), p);
    }
    const resolutionsByAarId = new Map();
    const resolutionsByPropId = new Map();
    for (const r of resolutions) {
        if (r && r.executed_op_aar_id) resolutionsByAarId.set(String(r.executed_op_aar_id), r);
        if (r && r.proposal_id) resolutionsByPropId.set(String(r.proposal_id), r);
    }

    // Adjacency
    const repoRoot = process.cwd();
    const adjacency = loadAdjacency(repoRoot);

    // Build op rows (sorted strictly).
    const aarsSorted = operationHistory.slice().sort((a, b) => {
        const ta = Number.isFinite(+a.started_turn) ? +a.started_turn : 0;
        const tb = Number.isFinite(+b.started_turn) ? +b.started_turn : 0;
        if (ta !== tb) return ta - tb;
        return strictCompare(String(a.operation_id || ''), String(b.operation_id || ''));
    });

    const opRows = aarsSorted.map((aar) => {
        const opId = String(aar.operation_id || '');
        const resolution = resolutionsByAarId.get(opId);
        const proposalId = resolution ? String(resolution.proposal_id || '') : '';
        const proposal = proposalId ? proposalsById.get(proposalId) : undefined;
        const opportunityId = resolution ? String(resolution.opportunity_id || '') : '';

        const faction = String(aar.faction || '');
        const axes = asArray(aar.axis_summaries);
        const axisRecoveryReason = typeof aar.recovery_reason === 'string' ? aar.recovery_reason : '';
        const axisRows = axes.length > 0
            ? axes
                .slice()
                .sort((a, b) => strictCompare(String(a.axis_id || ''), String(b.axis_id || '')))
                .map((axis) => buildAxisRow(axis, aar.total_attacks, controllers, adjacency, faction, axisRecoveryReason))
            : [buildLegacyAxisRow(aar, controllers, adjacency, faction, axisRecoveryReason)];

        const totalAttacks = Number.isFinite(+aar.total_attacks) ? +aar.total_attacks : 0;
        const totalCaptured = asArray(aar.objectives_captured).length;
        const totalTargeted = asArray(aar.objectives_targeted).length;
        const opPredicate = totalCaptured === totalTargeted && totalTargeted > 0
            ? (totalAttacks > 0 ? 'op_delivered_intent' : 'target_already_friendly')
            : (totalAttacks > 0
                ? (totalCaptured > 0 ? 'partial_delivery' : 'contacted_no_capture')
                : 'no_contact_op_level');

        return {
            operation_id: opId,
            operation_name: String(aar.operation_name || ''),
            corps_id: String(aar.corps_id || ''),
            faction,
            type: String(aar.type || ''),
            started_turn: Number.isFinite(+aar.started_turn) ? +aar.started_turn : 0,
            ended_turn: Number.isFinite(+aar.ended_turn) ? +aar.ended_turn : 0,
            outcome: String(aar.outcome || ''),
            recovery_reason: typeof aar.recovery_reason === 'string' ? aar.recovery_reason : '',
            capture_provenance: String(aar.capture_provenance || ''),
            total_attacks: totalAttacks,
            objectives_targeted: totalTargeted,
            objectives_captured: totalCaptured,
            grade_stars: aar.grade && Number.isFinite(+aar.grade.stars) ? +aar.grade.stars : null,
            opportunity_id: opportunityId,
            proposal_id: proposalId,
            proposal_response: resolution ? String(resolution.response || '') : '',
            proposal_response_turn: resolution && Number.isFinite(+resolution.response_turn) ? +resolution.response_turn : null,
            exit_class: resolution ? String(resolution.exit_class || '') : '',
            proposal_present: Boolean(proposal),
            axis_count: axes.length,
            op_predicate: opPredicate,
            axes: axisRows,
        };
    });

    // Optional: synthetic rows for active operations (still in-flight at end).
    const syntheticRows = [];
    if (includeActive) {
        const cc = (state.military && state.military.corps_command) || {};
        const cIds = Object.keys(cc).slice().sort(strictCompare);
        for (const corpsId of cIds) {
            const cmd = cc[corpsId] || {};
            for (const op of asArray(cmd.active_operations)) {
                if (!op || op.type !== 'sector_attack') continue;
                const synthAar = {
                    operation_id: `${corpsId}:${op.name || 'unnamed'}:t${op.started_turn || 0}:active`,
                    operation_name: op.name || '',
                    corps_id: corpsId,
                    faction: '',
                    type: op.type,
                    started_turn: op.started_turn || 0,
                    ended_turn: 0,
                    outcome: 'active',
                    recovery_reason: op.recovery_reason || '',
                    capture_provenance: '',
                    total_attacks: op.attack_attempt_count || 0,
                    objectives_targeted: asArray(op.objectives).length || 0,
                    objectives_captured: 0,
                    participating_brigades: op.participating_brigades || [],
                    axis_summaries: asArray(op.axes).map((ax) => ({
                        axis_id: ax.axis_id,
                        axis_name: ax.name,
                        brigades: ax.assigned_brigades || [],
                        objectives_targeted: ax.objectives || [],
                        objectives_captured: [],
                        total_attacks: ax.attack_attempt_count || 0,
                        staging_osid: ax.staging_osid,
                        unreachable_at_launch: ax.unreachable_at_launch === true,
                    })),
                    grade: null,
                };
                syntheticRows.push({
                    operation_id: synthAar.operation_id,
                    operation_name: synthAar.operation_name,
                    corps_id: corpsId,
                    faction: '',
                    type: 'sector_attack',
                    started_turn: synthAar.started_turn,
                    ended_turn: 0,
                    outcome: 'active',
                    recovery_reason: synthAar.recovery_reason,
                    capture_provenance: '(active)',
                    total_attacks: synthAar.total_attacks,
                    objectives_targeted: synthAar.objectives_targeted,
                    objectives_captured: 0,
                    grade_stars: null,
                    opportunity_id: '',
                    proposal_id: '',
                    proposal_response: '',
                    proposal_response_turn: null,
                    exit_class: '',
                    proposal_present: false,
                    axis_count: synthAar.axis_summaries.length,
                    op_predicate: 'active',
                    axes: synthAar.axis_summaries.map((axis) => buildAxisRow(axis, synthAar.total_attacks, controllers, adjacency, '')),
                });
            }
        }
        syntheticRows.sort((a, b) => {
            if (a.started_turn !== b.started_turn) return a.started_turn - b.started_turn;
            return strictCompare(a.operation_id, b.operation_id);
        });
    }

    return {
        runDir,
        summary,
        upstreamCounts: upstreamRun ? upstreamRun.counts : null,
        opRows,
        syntheticRows,
        adjacencyEdgeCount: adjacency.size,
    };
}

// ── Output helpers ────────────────────────────────────────────────────────
function predicateEmoji(predicate) {
    // Plain ASCII tags only — no emojis (CLAUDE.md rule).
    switch (predicate) {
        case 'op_delivered_intent': return 'DELIV';
        case 'target_already_friendly': return 'PRE-FRIENDLY';
        case 'contacted_but_underdelivered': return 'UNDERDELIV';
        case 'no_contact_pathing': return 'NO-CONTACT-PATH';
        case 'no_launch_readiness': return 'NO-LAUNCH-READINESS';
        case 'no_opening_attack': return 'NO-OPENING-ATTACK';
        case 'no_staging_march': return 'NO-STAGING-MARCH';
        case 'no_contact_other': return 'NO-CONTACT-OTHER';
        case 'partial_delivery': return 'PARTIAL';
        case 'contacted_no_capture': return 'STALEMATE';
        case 'no_contact_op_level': return 'NO-CONTACT-OP';
        case 'active': return 'ACTIVE';
        default: return 'UNKNOWN';
    }
}

function printMarkdown(runs) {
    const lines = [];
    lines.push('# Operation Delivery Audit');
    lines.push('');
    lines.push('Per-launched-op trace of proposal -> resolution -> AAR linkage and per-axis combat-delivery story.');
    lines.push('');

    for (const run of runs) {
        const name = path.basename(run.runDir);
        const hash = (run.summary && run.summary.final_state_hash) || 'n/a';
        const weeks = (run.summary && (run.summary.weeks || run.summary.turns || run.summary.turn)) || 'n/a';

        lines.push(`## Run: ${name}`);
        lines.push('');
        lines.push(`- weeks: ${weeks}`);
        lines.push(`- final_state_hash: \`${hash}\``);
        lines.push(`- adjacency edges loaded: ${run.adjacencyEdgeCount}`);
        if (run.upstreamCounts) {
            lines.push(`- opportunity decisions: ${run.upstreamCounts.decisions} (approved ${run.upstreamCounts.approved}, completed ${run.upstreamCounts.completed}, t3 ${run.upstreamCounts.t3})`);
        }
        lines.push('');

        // Op-level rollup table
        lines.push('### Operations (op-level rollup)');
        lines.push('');
        lines.push('| Started | Op | Corps | Faction | Outcome | Attacks | Captured | Provenance | Recovery | Predicate | Opp | Resp | Exit |');
        lines.push('|---:|---|---|---|---|---:|---|---|---|---|---|---|---|');
        for (const op of run.opRows) {
            const captured = `${op.objectives_captured}/${op.objectives_targeted}`;
            lines.push(`| ${op.started_turn} | ${op.operation_name} | ${op.corps_id} | ${op.faction} | ${op.outcome} | ${op.total_attacks} | ${captured} | ${op.capture_provenance || 'n/a'} | ${op.recovery_reason || 'n/a'} | ${predicateEmoji(op.op_predicate)} | ${op.opportunity_id || '-'} | ${op.proposal_response || '-'} | ${op.exit_class || '-'} |`);
        }
        lines.push('');

        // Per-axis rollup
        lines.push('### Per-Axis Detail');
        lines.push('');
        lines.push('| Op | Axis | Attacks | Cap/Tgt | First Obj | First Stall | Approach Neighbors | Staging | Unreach@Launch | Predicate |');
        lines.push('|---|---|---:|---|---|---|---|---|---|---|');
        for (const op of run.opRows) {
            for (const axis of op.axes) {
                const captured = `${axis.captured_count}/${axis.targeted_count}`;
                const neighbors = axis.friendly_approach_neighbors.length > 0
                    ? axis.friendly_approach_neighbors.join(', ')
                    : '(none)';
                lines.push(`| ${op.operation_name} (t${op.started_turn}) | ${axis.axis_id} | ${axis.attacks} | ${captured} | ${axis.first_objective || '-'} | ${axis.first_stall || '-'} | ${neighbors} | ${axis.staging_osid || '-'} | ${axis.unreachable_at_launch ? 'true' : 'false'} | ${predicateEmoji(axis.predicate)} |`);
            }
        }
        lines.push('');

        if (run.syntheticRows.length > 0) {
            lines.push('### Active (in-flight) operations');
            lines.push('');
            lines.push('| Op | Corps | Started | Attacks | Recovery | Axes |');
            lines.push('|---|---|---:|---:|---|---|');
            for (const op of run.syntheticRows) {
                lines.push(`| ${op.operation_name} | ${op.corps_id} | ${op.started_turn} | ${op.total_attacks} | ${op.recovery_reason || '-'} | ${op.axis_count} |`);
            }
            lines.push('');
        }

        // Failure-mode summary
        lines.push('### Failure-Mode Summary (per axis)');
        lines.push('');
        const counts = {};
        for (const op of run.opRows) {
            for (const axis of op.axes) {
                counts[axis.predicate] = (counts[axis.predicate] || 0) + 1;
            }
        }
        const keys = Object.keys(counts).sort(strictCompare);
        if (keys.length === 0) {
            lines.push('(no axes)');
        } else {
            lines.push('| Predicate | Axis count |');
            lines.push('|---|---:|');
            for (const k of keys) {
                lines.push(`| ${predicateEmoji(k)} (\`${k}\`) | ${counts[k]} |`);
            }
        }
        lines.push('');
    }

    process.stdout.write(lines.join('\n') + '\n');
}

function printJson(runs) {
    process.stdout.write(JSON.stringify(runs, null, 2) + '\n');
}

// ── CLI entry ─────────────────────────────────────────────────────────────
function main() {
    const args = process.argv.slice(2);
    const flags = { json: false, includeActive: false };
    const runDirs = [];
    for (const a of args) {
        if (a === '--json') flags.json = true;
        else if (a === '--include-active') flags.includeActive = true;
        else if (a.startsWith('--')) {
            console.error(`Unknown flag: ${a}`);
            process.exit(2);
        } else {
            runDirs.push(a);
        }
    }
    if (runDirs.length === 0) {
        console.error('Usage: node tools/diagnostics/operation_delivery_audit.cjs [--json] [--include-active] <run_dir> [<run_dir> ...]');
        process.exit(2);
    }

    const runs = runDirs.map((dir) => buildOpRows({ runDir: path.resolve(dir), includeActive: flags.includeActive }));

    if (flags.json) printJson(runs);
    else printMarkdown(runs);
}

if (require.main === module) {
    main();
}

module.exports = {
    buildOpRows,
    classifyAxis,
};
