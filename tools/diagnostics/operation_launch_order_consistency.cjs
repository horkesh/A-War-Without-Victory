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

const MOVEMENT_DECISIONS = new Set(['in_transit_skipped', 'march_to_approach']);
const OUTCOME_RANK = new Map([
    ['catastrophic', 1],
    ['repulsed', 2],
    ['stalemate', 3],
    ['costly_victory', 4],
    ['victory', 5],
    ['decisive_victory', 6],
]);

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
    const thresholdRank = OUTCOME_RANK.get(String(launch.threshold || ''));
    const launchObjective = String(launch.objective || '');
    const launchBrigades = asArray(launch.brigades)
        .filter((brigade) => {
            if (brigade?.considered !== true || brigade?.found_in_predictor !== true) return false;
            if (thresholdRank === undefined) return false;
            const directRank = OUTCOME_RANK.get(String(brigade.predicted_outcome || '')) ?? 0;
            const concentratedRank = OUTCOME_RANK.get(String(brigade.concentrated_outcome || '')) ?? 0;
            return Math.max(directRank, concentratedRank) >= thresholdRank;
        })
        .map((brigade) => String(brigade.id || ''))
        .filter(Boolean);
    const launchBrigadeSet = new Set(launchBrigades);
    const currentExecutionOrders = orders.filter((order) => (
        launchBrigadeSet.has(String(order.brigade_id || ''))
        && Number(order.turn) === week
        && String(order.phase || '') === 'execution'
    ));
    if (launchObjective === '' || launchBrigades.length === 0 || currentExecutionOrders.length === 0) {
        return {
            week,
            corps_id: String(operation.corps_id || ''),
            operation_name: String(operation.operation_name || ''),
            axis_id: String(axis.axis_id || ''),
            reason: 'executable_launch_missing_order_evidence',
            launch_brigades: launchBrigades,
            order_decisions: [],
        };
    }

    const validOrderBrigades = new Set(currentExecutionOrders
        .filter((order) => {
            const decision = String(order.decision || '');
            if (String(order.objective || '') !== launchObjective) return false;
            if (MOVEMENT_DECISIONS.has(decision) || decision === 'attack_intermediate') return true;
            return decision === 'direct_attack'
                && String(order.issued_target_osid || '') === launchObjective;
        })
        .map((order) => String(order.brigade_id || '')));
    if (launchBrigades.some((brigadeId) => validOrderBrigades.has(brigadeId))) return null;

    return {
        week,
        corps_id: String(operation.corps_id || ''),
        operation_name: String(operation.operation_name || ''),
        axis_id: String(axis.axis_id || ''),
        reason: 'executable_launch_immediate_refusal',
        launch_brigades: launchBrigades,
        refused_launch_brigades: launchBrigades,
        order_decisions: currentExecutionOrders.map((order) => ({
            brigade_id: String(order.brigade_id || ''),
            decision: String(order.decision || ''),
            issued_target_osid: String(order.issued_target_osid || ''),
            objective: String(order.objective || ''),
            launch_objective: launchObjective,
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
                    objective: '__positive_control_objective__',
                    threshold: 'repulsed',
                    brigades: [{
                        id: '__positive_control_brigade__',
                        considered: true,
                        found_in_predictor: true,
                        predicted_outcome: 'decisive_victory',
                    }],
                },
                order_generation_details: [{
                    brigade_id: '__positive_control_brigade__',
                    decision: 'direct_attack_below_threshold',
                    turn: -1,
                    phase: 'execution',
                    power_ratio: 0,
                    predicted_outcome: 'catastrophic',
                }, {
                    brigade_id: '__unrelated_moving_brigade__',
                    decision: 'march_to_approach',
                    turn: -1,
                    phase: 'execution',
                }, {
                    brigade_id: '__positive_control_brigade__',
                    decision: 'march_to_approach',
                    turn: -2,
                    phase: 'planning',
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
