#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const RECEIPT_KEYS = [
    'assigned_sector_id', 'assigned_sector_role', 'caller_filter', 'corps_id', 'corps_stance',
    'directive_assigned_front_ids', 'directive_avoid_osids', 'directive_hold_osids',
    'directive_offensive_targets', 'eligibility', 'final_generated_output', 'first_handler',
    'formation_faction', 'formation_id', 'formation_kind', 'formation_status', 'location_osid',
    'operation_axis_id', 'operation_current_objective', 'operation_name', 'pass',
    'persistent_destination_osids', 'phase', 'pre_cap_output',
    'preexisting_movement_order_destination_osid', 'requested_factions', 'scope',
    'snapshot_output', 'transit_stance', 'transit_status', 'turn',
].sort();
const OUTPUT_KEYS = ['attack_target_osid', 'column_march_destination_osid', 'movement_destination_osid', 'postures'];
const ELIGIBILITY = new Set(['eligible', 'faction_not_requested', 'inactive', 'unsupported_kind', 'missing_location', 'caller_filter_rejected']);
const FILTERS = new Set(['not_present', 'not_invoked', 'accepted', 'rejected']);
const HANDLERS = new Set([
    'active_column_skip', 'garrison_and_detachments', 'sector_march', 'return_to_corps',
    'pocket_evacuation', 'home_defense', 'reserve', 'supply_gate', 'sector_attack',
    'hold', 'reorganize', 'defensive', 'offensive', 'front_coverage', 'interior_movement',
]);
const KINDS = new Set(['brigade', 'og', 'operational_group', 'militia', 'jna_phantom', 'hv_phantom']);
const POSTURES = new Set(['hold', 'defend', 'defend_at_all_costs', 'elastic_defense', 'counterattack', 'dig_in', 'attack', 'assault']);

function strictCompare(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
function nullableString(value) { return value === null || (typeof value === 'string' && value.length > 0); }
function sortedUniqueStrings(value) {
    return Array.isArray(value)
        && value.every((entry) => typeof entry === 'string' && entry.length > 0)
        && JSON.stringify(value) === JSON.stringify([...new Set(value)].sort(strictCompare));
}
function outputIsExact(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    if (JSON.stringify(Object.keys(value).sort(strictCompare)) !== JSON.stringify(OUTPUT_KEYS)) return false;
    return nullableString(value.attack_target_osid)
        && nullableString(value.movement_destination_osid)
        && nullableString(value.column_march_destination_osid)
        && Array.isArray(value.postures)
        && value.postures.every((posture) => POSTURES.has(posture));
}
function receiptSchemaIsExact(receipt) {
    if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) return false;
    if (JSON.stringify(Object.keys(receipt).sort(strictCompare)) !== JSON.stringify(RECEIPT_KEYS)) return false;
    if (!Number.isInteger(receipt.turn) || receipt.phase !== 'war' || receipt.pass !== 'bot_dispatcher') return false;
    if (receipt.scope !== 'replace' && receipt.scope !== 'merge') return false;
    if (!sortedUniqueStrings(receipt.requested_factions) || receipt.requested_factions.length === 0) return false;
    if (typeof receipt.formation_id !== 'string' || receipt.formation_id.length === 0) return false;
    if (!nullableString(receipt.formation_faction) || !nullableString(receipt.formation_status)
        || !nullableString(receipt.formation_kind) || !nullableString(receipt.location_osid)
        || !nullableString(receipt.corps_id) || !nullableString(receipt.corps_stance)
        || !nullableString(receipt.assigned_sector_id) || !nullableString(receipt.operation_name)
        || !nullableString(receipt.operation_axis_id) || !nullableString(receipt.operation_current_objective)
        || !nullableString(receipt.transit_status) || !nullableString(receipt.transit_stance)
        || !nullableString(receipt.preexisting_movement_order_destination_osid)) return false;
    if (!ELIGIBILITY.has(receipt.eligibility) || !FILTERS.has(receipt.caller_filter)) return false;
    if (receipt.first_handler !== null && !HANDLERS.has(receipt.first_handler)) return false;
    if (receipt.assigned_sector_role !== null && receipt.assigned_sector_role !== 'line' && receipt.assigned_sector_role !== 'reserve') return false;
    if (!sortedUniqueStrings(receipt.directive_assigned_front_ids)
        || !sortedUniqueStrings(receipt.directive_offensive_targets)
        || !sortedUniqueStrings(receipt.directive_hold_osids)
        || !sortedUniqueStrings(receipt.directive_avoid_osids)
        || !sortedUniqueStrings(receipt.persistent_destination_osids)) return false;
    return outputIsExact(receipt.pre_cap_output)
        && outputIsExact(receipt.final_generated_output)
        && outputIsExact(receipt.snapshot_output);
}

function outputIsEmpty(output) {
    return output.attack_target_osid === null && output.movement_destination_osid === null
        && output.column_march_destination_osid === null && output.postures.length === 0;
}
function eligibilityIsConsistent(receipt) {
    if (receipt.eligibility === 'eligible') {
        if (receipt.first_handler === null) return false;
        if (receipt.caller_filter !== 'accepted' && receipt.caller_filter !== 'not_present') return false;
        if (receipt.formation_status !== 'active' || !KINDS.has(receipt.formation_kind) || receipt.location_osid === null) return false;
        if (!receipt.requested_factions.includes(receipt.formation_faction)) return false;
        const activeColumnTransit = receipt.transit_status === 'in_transit'
            && receipt.transit_stance === 'column';
        if ((receipt.first_handler === 'active_column_skip') !== activeColumnTransit) return false;
        return true;
    }
    if (receipt.first_handler !== null || !outputIsEmpty(receipt.pre_cap_output) || !outputIsEmpty(receipt.final_generated_output)) return false;
    if (receipt.eligibility === 'caller_filter_rejected') {
        return receipt.caller_filter === 'rejected'
            && receipt.formation_status === 'active'
            && KINDS.has(receipt.formation_kind)
            && receipt.location_osid !== null
            && receipt.requested_factions.includes(receipt.formation_faction);
    }
    if (receipt.caller_filter !== 'not_invoked') return false;
    if (receipt.eligibility === 'faction_not_requested') {
        return receipt.formation_faction !== null && !receipt.requested_factions.includes(receipt.formation_faction);
    }
    if (receipt.eligibility === 'inactive') {
        return receipt.requested_factions.includes(receipt.formation_faction)
            && receipt.formation_status !== 'active';
    }
    if (receipt.eligibility === 'unsupported_kind') {
        return receipt.requested_factions.includes(receipt.formation_faction)
            && receipt.formation_status === 'active'
            && !KINDS.has(receipt.formation_kind);
    }
    return receipt.eligibility === 'missing_location'
        && receipt.requested_factions.includes(receipt.formation_faction)
        && receipt.formation_status === 'active'
        && KINDS.has(receipt.formation_kind)
        && receipt.location_osid === null;
}

function parseBoundary(value) {
    const separator = value.lastIndexOf(':');
    const formation = value.slice(0, separator);
    const turn = Number(value.slice(separator + 1));
    if (separator <= 0 || !Number.isInteger(turn)) throw new Error(`Invalid --expect-boundary: ${value}`);
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
    if (!runDir) throw new Error('Usage: bot_dispatcher_decision_coverage.cjs <run-dir> [options]');
    return {
        runDir, json, turnMin, turnMax,
        formations: [...new Set(formations.filter(Boolean))].sort(strictCompare),
        expectedBoundaries: [...new Map(expectedBoundaries.map((entry) => [entry.key, entry])).values()],
    };
}
function readRows(runDir) {
    const reportPath = path.join(runDir, 'weekly_report.jsonl');
    if (!fs.existsSync(reportPath)) throw new Error(`Missing weekly report: ${reportPath}`);
    return fs.readFileSync(reportPath, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function analyzeRows(rows, options) {
    const receipts = [];
    const inconsistencies = [];
    const actorPassKeys = new Set();
    for (const row of rows) {
        const details = row?.bot_order_diagnostics?.dispatcher_decision_details;
        if (details === undefined) continue;
        if (!Array.isArray(details)) {
            inconsistencies.push({ turn: Number(row?.week_index), formation_id: '', reason: 'invalid_diagnostics_schema' });
            continue;
        }
        let previousFormation = null;
        for (const receipt of details) {
            const formationId = typeof receipt?.formation_id === 'string' ? receipt.formation_id : '';
            const turn = Number.isInteger(receipt?.turn) ? receipt.turn : Number(row?.week_index);
            const issue = (reason) => inconsistencies.push({ turn, formation_id: formationId, reason });
            if (!receiptSchemaIsExact(receipt)) { issue('invalid_receipt_schema'); continue; }
            if (receipt.turn !== row.week_index) issue('receipt_turn_week_index_mismatch');
            const actorPassKey = `${receipt.turn}|${receipt.pass}|${receipt.scope}|${receipt.requested_factions.join(',')}|${formationId}`;
            if (actorPassKeys.has(actorPassKey)) issue('duplicate_actor_pass_key');
            actorPassKeys.add(actorPassKey);
            if (previousFormation !== null && strictCompare(previousFormation, formationId) >= 0) issue('formation_order_not_strict');
            previousFormation = formationId;
            if (!eligibilityIsConsistent(receipt)) issue('eligibility_handler_contradiction');
            if (receipt.turn >= options.turnMin && receipt.turn <= options.turnMax) receipts.push(receipt);
        }
    }
    receipts.sort((a, b) => a.turn - b.turn || strictCompare(a.formation_id, b.formation_id));
    inconsistencies.sort((a, b) => a.turn - b.turn || strictCompare(a.formation_id, b.formation_id) || strictCompare(a.reason, b.reason));
    const covered = [...new Set(receipts.map((receipt) => receipt.formation_id))].sort(strictCompare);
    const boundaries = new Set(receipts.map((receipt) => `${receipt.formation_id}:${receipt.turn}`));
    return {
        receipts_seen: receipts.length,
        formations_covered: covered,
        missing_requested_formations: options.formations.filter((formation) => !covered.includes(formation)),
        missing_expected_boundaries: options.expectedBoundaries.map((entry) => entry.key).filter((key) => !boundaries.has(key)),
        pass_scope: 'bot_dispatcher receipts describe the serialized ordinary pass; later assist passes are separate report fields',
        causal_proof: false,
        inconsistencies,
    };
}

function main(argv) {
    const options = parseArgs(argv);
    const result = analyzeRows(readRows(options.runDir), options);
    const ok = result.receipts_seen > 0 && result.missing_requested_formations.length === 0
        && result.missing_expected_boundaries.length === 0 && result.inconsistencies.length === 0;
    const report = { run_dir: path.resolve(options.runDir), ...result };
    if (options.json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    else process.stdout.write(`Bot dispatcher-decision coverage: ${ok ? 'PASS' : 'FAIL'}\n`);
    process.exitCode = ok ? 0 : 1;
}

if (require.main === module) {
    try { main(process.argv.slice(2)); }
    catch (error) { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }
}
module.exports = { analyzeRows, parseArgs, receiptSchemaIsExact };
