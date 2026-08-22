#!/usr/bin/env node
/**
 * Audits the handoff between operation launch prediction and brigade orders.
 *
 * The reason-code trace is emitted only when a scenario is run with
 * AWWV_DEBUG_REASON_CODES=axis_reject. This diagnostic is read-only.
 *
 * Exit status:
 *   0: no production mismatches and (when requested) positive control detected
 *   1: production mismatch, missing trace evidence, or failed positive control
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ATTACK_DECISIONS = new Set(['direct_attack', 'attack_intermediate']);
const MOVEMENT_DECISIONS = new Set(['in_transit_skipped', 'march_to_approach']);

function asArray(value) {
    return Array.isArray(value) ? value : [];
}

function readRows(runDir) {
    const reportPath = path.join(runDir, 'weekly_report.jsonl');
    if (!fs.existsSync(reportPath)) {
        throw new Error(`Missing weekly report: ${reportPath}`);
    }
    return fs.readFileSync(reportPath, 'utf8')
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line))
        .sort((a, b) => Number(a.week_index) - Number(b.week_index));
}

function mismatchForAxis(week, operation, axis) {
    const launch = axis.launch_readiness_detail;
    if (launch?.executable !== true) return null;

    const orders = asArray(axis.order_generation_details);
    if (orders.length === 0) {
        return {
            week,
            corps_id: String(operation.corps_id || ''),
            operation_name: String(operation.operation_name || ''),
            axis_id: String(axis.axis_id || ''),
            reason: 'executable_launch_missing_order_evidence',
            launch_brigades: asArray(launch.brigades).map((brigade) => brigade.id),
            order_decisions: [],
        };
    }

    const decisions = orders.map((order) => String(order.decision || ''));
    if (decisions.some((decision) => ATTACK_DECISIONS.has(decision))) return null;
    if (decisions.some((decision) => MOVEMENT_DECISIONS.has(decision))) return null;

    return {
        week,
        corps_id: String(operation.corps_id || ''),
        operation_name: String(operation.operation_name || ''),
        axis_id: String(axis.axis_id || ''),
        reason: 'executable_launch_immediate_refusal',
        launch_brigades: asArray(launch.brigades).map((brigade) => brigade.id),
        order_decisions: orders.map((order) => ({
            brigade_id: String(order.brigade_id || ''),
            decision: String(order.decision || ''),
            power_ratio: order.power_ratio ?? null,
            predicted_outcome: order.predicted_outcome ?? null,
        })),
    };
}

function analyzeRows(rows) {
    const lastSeen = new Map();
    const mismatches = [];
    let firstExecutionAxesChecked = 0;
    let tracedAxesSeen = 0;

    for (const row of rows) {
        const week = Number(row.week_index);
        for (const operation of asArray(row.operation_diagnostics)) {
            const key = `${operation.corps_id || ''}\u0000${operation.operation_name || ''}`;
            const previous = lastSeen.get(key);
            const phase = String(operation.operation_phase || '');
            const firstExecution = phase === 'execution'
                && (!previous || previous.week !== week - 1 || previous.phase !== 'execution');
            lastSeen.set(key, { week, phase });

            const axes = asArray(operation.axis_decision_diagnostics);
            tracedAxesSeen += axes.length;
            if (!firstExecution) continue;

            for (const axis of axes) {
                if (axis.launch_readiness_detail?.executable !== true) continue;
                firstExecutionAxesChecked += 1;
                const mismatch = mismatchForAxis(week, operation, axis);
                if (mismatch) mismatches.push(mismatch);
            }
        }
    }

    return {
        traced_axes_seen: tracedAxesSeen,
        first_execution_axes_checked: firstExecutionAxesChecked,
        mismatches,
    };
}

function positiveControlRow() {
    return {
        week_index: -1,
        operation_diagnostics: [{
            corps_id: '__positive_control__',
            operation_name: '__positive_control__',
            operation_phase: 'execution',
            axis_decision_diagnostics: [{
                axis_id: '__positive_control__',
                launch_readiness_detail: {
                    executable: true,
                    brigades: [{ id: '__positive_control_brigade__' }],
                },
                order_generation_details: [{
                    brigade_id: '__positive_control_brigade__',
                    decision: 'direct_attack_below_threshold',
                    power_ratio: 0,
                    predicted_outcome: 'catastrophic',
                }],
            }],
        }],
    };
}

function main(argv) {
    const runDir = argv.find((arg) => !arg.startsWith('--'));
    const json = argv.includes('--json');
    const injectPositiveControl = argv.includes('--inject-positive-control');
    if (!runDir) throw new Error('Usage: operation_launch_order_consistency.cjs <run-dir> [--json] [--inject-positive-control]');

    const production = analyzeRows(readRows(runDir));
    let positiveControlDetected = null;
    if (injectPositiveControl) {
        const control = analyzeRows([positiveControlRow()]);
        positiveControlDetected = control.mismatches.length === 1
            && control.mismatches[0].reason === 'executable_launch_immediate_refusal';
    }

    const report = {
        run_dir: path.resolve(runDir),
        ...production,
        positive_control_detected: positiveControlDetected,
    };
    const hasEvidence = production.traced_axes_seen > 0;
    const ok = hasEvidence
        && production.mismatches.length === 0
        && (!injectPositiveControl || positiveControlDetected === true);

    if (json) {
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else {
        process.stdout.write(`Operation launch/order consistency: ${ok ? 'PASS' : 'FAIL'}\n`);
        process.stdout.write(`Traced axes: ${production.traced_axes_seen}\n`);
        process.stdout.write(`First-execution axes checked: ${production.first_execution_axes_checked}\n`);
        process.stdout.write(`Mismatches: ${production.mismatches.length}\n`);
        if (injectPositiveControl) process.stdout.write(`Positive control detected: ${positiveControlDetected}\n`);
        for (const mismatch of production.mismatches) {
            process.stdout.write(`${mismatch.week}\t${mismatch.corps_id}\t${mismatch.operation_name}\t${mismatch.axis_id}\t${mismatch.reason}\n`);
        }
    }
    process.exitCode = ok ? 0 : 1;
}

if (require.main === module) {
    try {
        main(process.argv.slice(2));
    } catch (error) {
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = 1;
    }
}

module.exports = { analyzeRows, mismatchForAxis };
