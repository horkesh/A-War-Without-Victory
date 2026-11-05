#!/usr/bin/env node
/**
 * Fail-closed verifier for serialized generic bot route-decision coverage.
 *
 * This checks the terminal `evaluateInteriorMovement` receipt only. Earlier
 * evaluators and predicate history are outside its scope, and active column
 * transit skips this hook. Structural coverage cannot prove the historical
 * cause of an earlier run.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const RECEIPT_KEYS = [
    'axis_id', 'brigade_id', 'candidate_destination_osid', 'current_objective',
    'issued_destination_osid', 'location_osid', 'operation_name', 'outcome',
    'persistent_movement_state_destination_osid', 'phase',
    'preexisting_movement_order_destination_osid', 'rejection_reason',
    'route_goal_osids', 'rule', 'transit_status', 'turn',
];
const RULES = new Set(['priority_sector', 'offensive_target', 'own_corps_front', 'fallback']);
const OUTCOMES = new Set(['issued', 'rejected', 'held', 'no_order']);
const TERMINAL_TRANSIT_STATUSES = new Set([null, 'deployed', 'packing', 'unpacking']);

function strictCompare(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}

function parseBoundary(value) {
    const separator = value.lastIndexOf(':');
    const formation = value.slice(0, separator);
    const turn = Number(value.slice(separator + 1));
    if (separator <= 0 || !Number.isInteger(turn)) {
        throw new Error(`Invalid --expect-boundary (expected FORMATION:INTEGER): ${value}`);
    }
    return { formation, turn, key: `${formation}:${turn}` };
}

function parseArgs(argv) {
    let runDir = null;
    const formations = [];
    const expectedBoundaries = [];
    let turnMin = Number.NEGATIVE_INFINITY;
    let turnMax = Number.POSITIVE_INFINITY;
    let json = false;
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--json') json = true;
        else if (arg === '--formation') formations.push(String(argv[++index] ?? ''));
        else if (arg === '--expect-boundary') expectedBoundaries.push(parseBoundary(String(argv[++index] ?? '')));
        else if (arg === '--turn-min') turnMin = Number(argv[++index]);
        else if (arg === '--turn-max') turnMax = Number(argv[++index]);
        else if (!arg.startsWith('--') && runDir === null) runDir = arg;
        else throw new Error(`Unsupported or incomplete argument: ${arg}`);
    }
    if (!runDir) {
        throw new Error('Usage: bot_route_decision_coverage.cjs <run-dir> [--formation ID] [--expect-boundary FORMATION:TURN] [--turn-min N] [--turn-max N] [--json]');
    }
    if ((!Number.isInteger(turnMin) && turnMin !== Number.NEGATIVE_INFINITY)
        || (!Number.isInteger(turnMax) && turnMax !== Number.POSITIVE_INFINITY)
        || turnMin > turnMax) {
        throw new Error('Turn bounds must be ordered integers');
    }
    return {
        runDir,
        formations: [...new Set(formations.filter(Boolean))].sort(strictCompare),
        expectedBoundaries: [...new Map(expectedBoundaries.map((entry) => [entry.key, entry])).values()]
            .sort((a, b) => a.turn - b.turn || strictCompare(a.formation, b.formation)),
        turnMin,
        turnMax,
        json,
    };
}

function readRows(runDir) {
    const reportPath = path.join(runDir, 'weekly_report.jsonl');
    if (!fs.existsSync(reportPath)) throw new Error(`Missing weekly report: ${reportPath}`);
    return fs.readFileSync(reportPath, 'utf8')
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line))
        .sort((a, b) => Number(a.week_index) - Number(b.week_index));
}

function isNullableNonemptyString(value) {
    return value === null || (typeof value === 'string' && value.length > 0);
}

function receiptSchemaIsExact(receipt) {
    if (receipt === null || typeof receipt !== 'object' || Array.isArray(receipt)) return false;
    const keys = Object.keys(receipt).sort(strictCompare);
    if (JSON.stringify(keys) !== JSON.stringify(RECEIPT_KEYS)) return false;
    if (!Number.isInteger(receipt.turn) || receipt.phase !== 'war') return false;
    if (typeof receipt.brigade_id !== 'string' || receipt.brigade_id.length === 0) return false;
    if (typeof receipt.location_osid !== 'string' || receipt.location_osid.length === 0) return false;
    if (!TERMINAL_TRANSIT_STATUSES.has(receipt.transit_status)) return false;
    if (!isNullableNonemptyString(receipt.preexisting_movement_order_destination_osid)
        || !isNullableNonemptyString(receipt.persistent_movement_state_destination_osid)
        || !isNullableNonemptyString(receipt.operation_name)
        || !isNullableNonemptyString(receipt.axis_id)
        || !isNullableNonemptyString(receipt.current_objective)
        || !isNullableNonemptyString(receipt.candidate_destination_osid)
        || !isNullableNonemptyString(receipt.issued_destination_osid)) return false;
    if (receipt.axis_id !== null && receipt.operation_name === null) return false;
    if (!RULES.has(receipt.rule) || !OUTCOMES.has(receipt.outcome)) return false;
    if (!Array.isArray(receipt.route_goal_osids)
        || receipt.route_goal_osids.some((value) => typeof value !== 'string' || value.length === 0)) return false;
    return receipt.rejection_reason === null
        || receipt.rejection_reason === 'risky_destination'
        || receipt.rejection_reason === 'already_at_goal'
        || receipt.rejection_reason === 'no_destination_selected';
}

function outcomeIsConsistent(receipt) {
    if (receipt.outcome === 'issued') {
        return receipt.candidate_destination_osid !== null
            && receipt.issued_destination_osid === receipt.candidate_destination_osid
            && receipt.rejection_reason === null;
    }
    if (receipt.outcome === 'rejected') {
        return receipt.candidate_destination_osid !== null
            && receipt.issued_destination_osid === null
            && receipt.rejection_reason === 'risky_destination';
    }
    if (receipt.outcome === 'held') {
        return receipt.candidate_destination_osid === null
            && receipt.issued_destination_osid === null
            && receipt.rejection_reason === 'already_at_goal';
    }
    return receipt.candidate_destination_osid === null
        && receipt.issued_destination_osid === null
        && receipt.rejection_reason === 'no_destination_selected';
}

function analyzeRows(rows, options) {
    const receipts = [];
    const inconsistencies = [];
    for (const row of rows) {
        const diagnostics = row?.bot_order_diagnostics;
        if (diagnostics === undefined) continue;
        const details = diagnostics?.route_decision_details;
        if (!Array.isArray(details)) {
            inconsistencies.push({ turn: Number(row?.week_index), brigade_id: '', reason: 'invalid_diagnostics_schema' });
            continue;
        }
        const movementOrders = diagnostics?.movement_orders_by_brigade;
        const orderMapValid = movementOrders !== null && typeof movementOrders === 'object' && !Array.isArray(movementOrders);
        const brigadesInRow = new Set();
        for (const receipt of details) {
            const turn = receipt?.turn;
            const brigadeId = typeof receipt?.brigade_id === 'string' ? receipt.brigade_id : '';
            const issue = (reason, extra = {}) => inconsistencies.push({
                turn: Number.isInteger(turn) ? turn : Number(row?.week_index),
                brigade_id: brigadeId,
                reason,
                ...extra,
            });
            if (!receiptSchemaIsExact(receipt)) {
                issue('invalid_receipt_schema');
                continue;
            }
            if (!Number.isInteger(row?.week_index) || receipt.turn !== row.week_index) {
                issue('receipt_turn_week_index_mismatch', { week_index: row?.week_index ?? null });
            }
            if (brigadesInRow.has(brigadeId)) issue('duplicate_brigade_receipt_in_row');
            brigadesInRow.add(brigadeId);
            const goals = receipt.route_goal_osids;
            const normalizedGoals = [...new Set(goals)].sort(strictCompare);
            if (JSON.stringify(goals) !== JSON.stringify(normalizedGoals)) issue('route_goals_not_unique_sorted');
            if (!outcomeIsConsistent(receipt)) issue('invalid_outcome_invariant');
            if (!orderMapValid) {
                issue('invalid_movement_order_map');
            } else if (receipt.outcome === 'issued'
                && movementOrders[brigadeId] !== receipt.issued_destination_osid) {
                issue('issued_destination_order_mismatch', {
                    receipt_destination: receipt.issued_destination_osid,
                    projected_order_destination: movementOrders[brigadeId] ?? null,
                });
            }
            if (receipt.turn >= options.turnMin && receipt.turn <= options.turnMax) receipts.push(receipt);
        }
    }
    receipts.sort((a, b) => a.turn - b.turn || strictCompare(a.brigade_id, b.brigade_id));
    inconsistencies.sort((a, b) => a.turn - b.turn
        || strictCompare(a.brigade_id, b.brigade_id)
        || strictCompare(a.reason, b.reason));
    const covered = [...new Set(receipts.map((receipt) => receipt.brigade_id))].sort(strictCompare);
    const coveredSet = new Set(covered);
    const requestedCovered = options.formations.filter((id) => coveredSet.has(id));
    const missingRequested = options.formations.filter((id) => !coveredSet.has(id));
    const receiptBoundaries = new Set(receipts.map((receipt) => `${receipt.brigade_id}:${receipt.turn}`));
    const expectedBoundaryKeys = options.expectedBoundaries.map((entry) => entry.key);
    const expectedBoundariesCovered = expectedBoundaryKeys.filter((key) => receiptBoundaries.has(key));
    const missingExpectedBoundaries = expectedBoundaryKeys.filter((key) => !receiptBoundaries.has(key));
    return {
        receipts_seen: receipts.length,
        formations_covered: covered,
        requested_formations_covered: requestedCovered,
        missing_requested_formations: missingRequested,
        expected_boundaries_covered: expectedBoundariesCovered,
        missing_expected_boundaries: missingExpectedBoundaries,
        structural_coverage: {
            completed_turn_semantics: 'receipt.turn equals weekly_report.week_index',
            terminal_hook_only: true,
            active_column_transit_skips_hook: true,
        },
        causal_proof: false,
        inconsistencies,
    };
}

function main(argv) {
    const options = parseArgs(argv);
    const result = analyzeRows(readRows(options.runDir), options);
    const ok = result.receipts_seen > 0
        && result.missing_requested_formations.length === 0
        && result.missing_expected_boundaries.length === 0
        && result.inconsistencies.length === 0;
    const report = { run_dir: path.resolve(options.runDir), ...result };
    if (options.json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    else {
        process.stdout.write(`Bot route-decision coverage: ${ok ? 'PASS' : 'FAIL'}\n`);
        process.stdout.write(`Receipts: ${result.receipts_seen}\n`);
        process.stdout.write(`Missing requested formations: ${result.missing_requested_formations.length}\n`);
        process.stdout.write(`Missing expected boundaries: ${result.missing_expected_boundaries.length}\n`);
        process.stdout.write(`Inconsistencies: ${result.inconsistencies.length}\n`);
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

module.exports = { analyzeRows, parseArgs, receiptSchemaIsExact };
