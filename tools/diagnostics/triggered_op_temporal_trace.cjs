#!/usr/bin/env node
/**
 * LANE-2026-05-02-TRIGGERED-OP-TEMPORAL-TRACE — Read-only diagnostic.
 *
 * Reconstructs, for the late-1995 triggered ops Krivaja-95 (turn-gate >= 168)
 * and Stupčanica-95 (turn-gate >= 172), the temporal evidence available from
 * preserved run artifacts:
 *
 *   - t_inject:         turn the op first appears in operation_diagnostics
 *                       (proxy: AAR.started_turn — guaranteed equal because
 *                       the AAR start-turn is set at injection in
 *                       triggered_operations.ts:checkTriggeredOperations).
 *   - t_planning_end:   turn the op left phase='planning' (entered execution
 *                       or recovery). Read from operation_diagnostics rows.
 *   - t_aar_end:        AAR.ended_turn (op terminal turn).
 *   - per_turn:         per-turn scalar evidence — operation_phase,
 *                       eligible_attacker_count, movement_order_count,
 *                       attack_attempt_count, plus the run-wide
 *                       column_movement aggregate (column_starts, _arrivals,
 *                       _blocked, _advances).
 *
 * Limits of preserved artifacts (documented in the output):
 *   - t_prestage_write is NOT directly observable. The pre-stage helper
 *     (prestageBrigadesForTriggeredOp) writes brigade_movement_orders but
 *     does not emit a per-write event into weekly_report.jsonl. The closest
 *     proxy is `column_movement.column_starts` on the inject turn (the
 *     pre-stage runs in `check-triggered-operations` step at end of the
 *     trigger turn, after `apply-brigade-movement` has already run).
 *   - t_movement_apply is NOT directly observable per-brigade. Aggregate
 *     `movement_report.moves_applied` and `column_movement.column_arrivals`
 *     are reported but not keyed by brigade.
 *   - t_force_ratio is observable as `operation_diagnostics[*].operation_phase`
 *     and `eligible_attacker_count` from the turn AFTER inject onward.
 *   - Per-brigade location_osid / mv_state / personnel snapshots are NOT
 *     preserved per-turn. Only initial_save.json and final_save.json.
 *
 * Determinism:
 *   - No Math.random / Date.now / new Date / locale-sensitive sort.
 *   - Output rows ordered by (op_name asc, week_index asc).
 *   - JSON serialization uses 2-space indentation; markdown table column
 *     order is fixed in code.
 *
 * Usage:
 *   node tools/diagnostics/triggered_op_temporal_trace.cjs <run_dir>
 *
 * Example:
 *   node tools/diagnostics/triggered_op_temporal_trace.cjs \
 *     runs/apr1992_definitive_188w__210e69404d054959__w188_n1619
 *
 * Exit codes:
 *   0  trace emitted (one or both ops may be absent — see "missing" rows)
 *   1  invalid args / missing artifacts
 */

'use strict';

const fs = require('fs');
const path = require('path');

const TRACED_OPS = ['Operation Krivaja-95', 'Operation Stupčanica-95'];

function strictCompare(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}

function fail(msg) {
    process.stderr.write(`triggered_op_temporal_trace: ${msg}\n`);
    process.exit(1);
}

function main() {
    const runDir = process.argv[2];
    if (!runDir) fail('usage: triggered_op_temporal_trace.cjs <run_dir>');

    const weeklyPath = path.join(runDir, 'weekly_report.jsonl');
    const aarPath = path.join(runDir, 'operation_aars.json');
    if (!fs.existsSync(weeklyPath)) fail(`missing ${weeklyPath}`);
    if (!fs.existsSync(aarPath)) fail(`missing ${aarPath}`);

    const lines = fs.readFileSync(weeklyPath, 'utf8').split(/\r?\n/).filter(Boolean);
    const weekly = lines.map((l) => JSON.parse(l));
    const aars = JSON.parse(fs.readFileSync(aarPath, 'utf8'));

    const out = [];
    out.push('# Triggered-Op Temporal Trace');
    out.push('');
    out.push(`Run directory: \`${path.basename(runDir)}\``);
    out.push(`Total weekly records: ${weekly.length}`);
    out.push('');
    out.push('## Pipeline ordering reference (war_phases.ts)');
    out.push('');
    out.push('| step | name |');
    out.push('| --- | --- |');
    out.push('| 641 | apply-brigade-movement |');
    out.push('| 875 | advance-sector-offensives (calls estimateForceRatio) |');
    out.push('| 946 | inject-queued-operations |');
    out.push('| 964 | check-triggered-operations (calls prestageBrigadesForTriggeredOp) |');
    out.push('');
    out.push('Within a single turn, prestage writes ORDERS at step 964 — AFTER');
    out.push('apply-brigade-movement (step 641) has already run. Those orders');
    out.push('cannot convert to mv_state=in_transit until the NEXT turn\'s');
    out.push('apply-brigade-movement step. The op is also injected at step 964,');
    out.push('so estimateForceRatio first sees the op on turn N+1 (when');
    out.push('participants are already in_transit per mv_state).');
    out.push('');

    const sortedOps = [...TRACED_OPS].sort(strictCompare);
    for (const opName of sortedOps) {
        out.push(`## ${opName}`);
        out.push('');

        const aar = aars.find((a) => a && a.operation_name === opName);
        if (!aar) {
            out.push('> AAR not found in this run — op did not fire (turn-gate not crossed,');
            out.push('> primary corps occupied, or no enemy objectives).');
            out.push('');
            continue;
        }

        const startTurn = aar.started_turn;
        const endTurn = aar.ended_turn;
        const participants = [...(aar.participating_brigades ?? [])].sort(strictCompare);

        out.push(`- **t_inject (AAR.started_turn)**: \`${startTurn}\``);
        out.push(`- **t_aar_end (AAR.ended_turn)**: \`${endTurn}\``);
        out.push(`- **outcome**: \`${aar.outcome}\``);
        out.push(`- **recovery_reason**: \`${aar.recovery_reason ?? 'null'}\``);
        out.push(`- **participating_brigades**: \`[${participants.join(', ')}]\``);
        out.push(`- **force_ratio_estimate (final)**: \`${aar.force_ratio_estimate ?? 'null'}\``);
        out.push('');

        // Per-turn diagnostics
        out.push('### Per-turn evidence (from operation_diagnostics + aggregates)');
        out.push('');
        out.push('| week | phase | eligible_attacker_count | movement_order_count | attack_attempt_count | column_starts | column_arrivals | column_blocked | moves_applied |');
        out.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');

        // weekly records may be 0-indexed by week_index; iterate over the AAR window.
        // Per-turn rows must be ordered by week_index ascending — deterministic.
        const rows = [];
        for (const rec of weekly) {
            const w = rec.week_index;
            if (typeof w !== 'number') continue;
            // Show one turn before inject (planning context) through ended_turn.
            if (w < startTurn - 1 || w > endTurn) continue;
            const drina = (rec.operation_diagnostics ?? []).find(
                (d) => d && d.operation_name === opName,
            );
            const mvr = rec.movement_report ?? {};
            const cm = rec.column_movement ?? {};
            rows.push({
                w,
                phase: drina?.operation_phase ?? '—',
                eligible: drina?.eligible_attacker_count ?? '—',
                mvOrders: drina?.movement_order_count ?? '—',
                attacks: drina?.attack_attempt_count ?? '—',
                colStarts: cm.column_starts ?? '—',
                colArrivals: cm.column_arrivals ?? '—',
                colBlocked: cm.column_blocked ?? '—',
                movesApplied: mvr.moves_applied ?? '—',
            });
        }
        rows.sort((a, b) => a.w - b.w);
        for (const r of rows) {
            out.push(
                `| ${r.w} | ${r.phase} | ${r.eligible} | ${r.mvOrders} | ${r.attacks} | ${r.colStarts} | ${r.colArrivals} | ${r.colBlocked} | ${r.movesApplied} |`,
            );
        }
        out.push('');

        // Mark pivots
        const planningRows = rows.filter((r) => r.phase === 'planning');
        const recoveryRows = rows.filter((r) => r.phase === 'recovery');
        const executionRows = rows.filter((r) => r.phase === 'execution');
        out.push('### Pivots');
        out.push('');
        out.push(`- planning_turns_observed: ${planningRows.length}`);
        out.push(`- execution_turns_observed: ${executionRows.length}`);
        out.push(`- recovery_turns_observed: ${recoveryRows.length}`);
        if (planningRows.length > 0 && executionRows.length === 0) {
            out.push('- **never_executed**: op aborted without entering execution phase.');
        }
        out.push('');

        out.push('### Unobservable from preserved artifacts');
        out.push('');
        out.push('- t_prestage_write per brigade — pre-stage does not emit per-write events.');
        out.push('- t_movement_apply per brigade — per-brigade conversion to in_transit not preserved.');
        out.push('- per-brigade location_osid / mv_state / personnel snapshots — only initial+final saves preserved.');
        out.push('');
    }

    out.push('## Determinism guarantees');
    out.push('');
    out.push('- No Math.random / Date.now / new Date / toLocaleString.');
    out.push('- Op iteration order: TRACED_OPS sorted via strictCompare.');
    out.push('- Participant lists sorted via strictCompare.');
    out.push('- Per-turn rows sorted by week_index ascending.');
    out.push('- Markdown column order is fixed in code (no map iteration).');

    process.stdout.write(out.join('\n') + '\n');
}

main();
