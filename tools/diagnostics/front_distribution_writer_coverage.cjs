#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');

function fail(message) { process.stderr.write(`${message}\n`); process.exit(2); }
const args = process.argv.slice(2);
const runDir = args[0];
if (!runDir) fail('usage: front_distribution_writer_coverage.cjs RUN_DIR --expect-boundary ACTOR:TURN [--json]');
const expectations = [];
for (let i = 1; i < args.length; i += 1) {
    if (args[i] === '--expect-boundary') expectations.push(args[++i]);
    else if (args[i] !== '--json') fail(`unknown argument: ${args[i]}`);
}
if (expectations.length === 0) fail('at least one --expect-boundary ACTOR:TURN is required');
const expected = expectations.map((entry) => {
    if (typeof entry !== 'string' || !/^[^:]+:[1-9]\d*$/.test(entry)) fail(`invalid boundary expectation: ${entry}`);
    const split = entry.lastIndexOf(':');
    return { actor: entry.slice(0, split), turn: Number(entry.slice(split + 1)) };
});
const file = path.join(runDir, 'weekly_report.jsonl');
if (!fs.existsSync(file)) fail(`missing weekly report: ${file}`);
const rows = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); } catch { fail(`invalid JSON at line ${index + 1}`); }
});
const inconsistencies = [];
const observed = new Set();
let invocations = 0;
let writes = 0;
const callsites = new Set(['distribute-brigades-to-front', 'final-distribute-brigades-to-front', 'direct-call']);
const helpers = new Set(['main_phase_a', 'main_phase_b', 'rear_stack_dispersion', 'threatened_reserve_commit', 'empty_front_subsegment_fill', 'shared_front_stack_deconflict', 'must_hold_garrison_pin']);
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const stringArray = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string');
function validPresence(value, validValue) {
    if (!isObject(value) || typeof value.presence !== 'string') return false;
    if (value.presence === 'absent' || value.presence === 'present_undefined' || value.presence === 'present_null') return !Object.prototype.hasOwnProperty.call(value, 'value');
    return value.presence === 'present_value' && Object.prototype.hasOwnProperty.call(value, 'value') && validValue(value.value);
}
function validActorSnapshot(value) {
    if (!isObject(value) || !Array.isArray(value.roster) || typeof value.operation_participant !== 'boolean') return false;
    const formation = validPresence(value.formation, (f) => isObject(f)
        && ['status', 'kind', 'faction', 'location_osid', 'corps_id'].every((key) => validPresence(f[key], (item) => typeof item === 'string'))
        && ['personnel', 'entrenchment_turns', 'disrupted_turns'].every((key) => validPresence(f[key], (item) => typeof item === 'number' && Number.isFinite(item))));
    const movementState = (presence) => validPresence(presence, (item) => isObject(item)
        && Object.keys(item).every((key) => ['status', 'stance', 'destination_sids', 'path', 'turns_remaining', 'owner'].includes(key))
        && ['deployed', 'packing', 'in_transit', 'unpacking'].includes(item.status)
        && (!Object.prototype.hasOwnProperty.call(item, 'stance') || ['combat', 'column'].includes(item.stance))
        && (!Object.prototype.hasOwnProperty.call(item, 'owner') || ['bot_discretionary', 'authored_preplanned'].includes(item.owner))
        && (!Object.prototype.hasOwnProperty.call(item, 'turns_remaining') || (Number.isInteger(item.turns_remaining) && item.turns_remaining >= 0))
        && (!Object.prototype.hasOwnProperty.call(item, 'destination_sids') || stringArray(item.destination_sids))
        && (!Object.prototype.hasOwnProperty.call(item, 'path') || stringArray(item.path)));
    const movementOrder = (presence) => validPresence(presence, (item) => isObject(item)
        && Object.keys(item).every((key) => ['stance', 'destination_sids', 'owner'].includes(key))
        && stringArray(item.destination_sids) && item.destination_sids.length > 0
        && (!Object.prototype.hasOwnProperty.call(item, 'stance') || ['combat', 'column'].includes(item.stance))
        && (!Object.prototype.hasOwnProperty.call(item, 'owner') || ['bot_discretionary', 'authored_preplanned'].includes(item.owner)));
    const roster = value.roster.every((entry) => isObject(entry) && typeof entry.sector_id === 'string'
        && typeof entry.assigned === 'boolean' && typeof entry.reserve === 'boolean' && typeof entry.rear === 'boolean'
        && stringArray(entry.primary_subsegment_ids));
    return formation && movementState(value.movement_state) && movementOrder(value.movement_order) && roster;
}
function validFeatureInputs(value) {
    return isObject(value) && Object.values(value).every((item) => item === null || typeof item === 'string' || typeof item === 'boolean'
        || (typeof item === 'number' && Number.isFinite(item))
        || (Array.isArray(item) && (item.every((entry) => typeof entry === 'string') || item.every((entry) => typeof entry === 'number' && Number.isFinite(entry)))));
}
const featureSpecs = {
    main_phase_a: { sector_id: 'string', sub_segment_id: 'string', origin_osid: 'string', active_origin_count: 'number', entrenchment_threshold: 'number' },
    main_phase_b: { sector_id: 'string', sub_segment_id: 'string', origin_osid: 'string', use_corps_boundary: 'boolean', distance_weight: 'number', target_stack_count: 'number' },
    rear_stack_dispersion: { origin_osid: 'string', direct_repair_max_hops: 'number', active_origin_count: 'number' },
    threatened_reserve_commit: { threat_ratio: 'number', target_count: 'number', effective_enable_standing_og_reserve_commit: 'boolean', population_affinity_configured: 'boolean' },
    empty_front_subsegment_fill: { sub_segment_id: 'string', front_gap_repair_max_hops: 'number', active_sector_pool_count: 'number', frontline_width: 'number' },
    shared_front_stack_deconflict: { shared_osid: 'string', keeper_id: 'string', active_origin_count: 'number', personnel: 'number', entrenchment_turns: 'number' },
    must_hold_garrison_pin: { corps_id: 'string', minimum_personnel: 'number', entrenchment_threshold: 'number', personnel: 'number', entrenchment_turns: 'number' },
};
function validHelperFeatures(helper, inputs) {
    const spec = featureSpecs[helper];
    return isObject(spec) && isObject(inputs) && Object.entries(spec).every(([key, type]) => Object.prototype.hasOwnProperty.call(inputs, key)
        && typeof inputs[key] === type && (type !== 'number' || Number.isFinite(inputs[key])));
}
for (const row of rows) {
    if (!isObject(row) || !Number.isInteger(row.week_index) || row.week_index < 1) { inconsistencies.push('invalid weekly row schema'); continue; }
    const d = row.front_distribution_diagnostics;
    if (d === undefined) continue;
    if (!d || d.topic !== 'front_distribution' || d.causal_proof !== false || typeof d.selector_configured !== 'boolean' || !Array.isArray(d.requested_formations) || !Array.isArray(d.invocations) || !Array.isArray(d.writes)) { inconsistencies.push(`turn ${row.turn}: invalid diagnostic envelope`); continue; }
    if (d.requested_formations.some((id) => typeof id !== 'string' || !id) || new Set(d.requested_formations).size !== d.requested_formations.length) inconsistencies.push(`turn ${row.turn}: invalid requested formation manifest`);
    if (!d.selector_configured && (d.requested_formations.length || d.invocations.length || d.writes.length)) inconsistencies.push(`turn ${row.turn}: unconfigured selector emitted actor receipts`);
    const safeInvocations = d.invocations.filter(isObject);
    const safeWrites = d.writes.filter(isObject);
    if (safeInvocations.length !== d.invocations.length) inconsistencies.push(`turn ${row.week_index}: invalid invocation receipt element`);
    if (safeWrites.length !== d.writes.length) inconsistencies.push(`turn ${row.week_index}: invalid write receipt element`);
    const keys = new Set();
    for (const receipt of safeInvocations) {
        invocations += 1;
        if (!isObject(receipt) || typeof receipt.formation_id !== 'string' || !receipt.formation_id || !d.requested_formations.includes(receipt.formation_id) || !callsites.has(receipt.callsite) || !Number.isInteger(receipt.completed_turn) || receipt.completed_turn !== row.week_index || !Number.isInteger(receipt.invocation_ordinal) || receipt.invocation_ordinal < 0 || !Number.isInteger(receipt.write_count) || receipt.write_count < 0 || !stringArray(receipt.wrote_helpers) || receipt.wrote_helpers.some((helper) => !helpers.has(helper)) || typeof receipt.enable_standing_og_reserve_commit !== 'boolean' || !validActorSnapshot(receipt.before_invocation)) { inconsistencies.push(`turn ${row.week_index}: invalid invocation receipt`); continue; }
        const key = `${receipt.formation_id}:${receipt.completed_turn}:${receipt.invocation_ordinal}:${receipt.callsite}`;
        if (keys.has(key)) inconsistencies.push(`turn ${row.turn}: duplicate invocation ${key}`); keys.add(key);
        observed.add(`${receipt.formation_id}:${receipt.completed_turn}`);
        const actorWrites = safeWrites.filter((write) => write.formation_id === receipt.formation_id && write.completed_turn === receipt.completed_turn && write.invocation_ordinal === receipt.invocation_ordinal && write.callsite === receipt.callsite);
        if (receipt.write_count !== actorWrites.length) inconsistencies.push(`turn ${row.turn}: write count mismatch ${key}`);
        if (JSON.stringify(receipt.wrote_helpers) !== JSON.stringify(actorWrites.map((write) => write.helper))) inconsistencies.push(`turn ${row.turn}: helper sequence mismatch ${key}`);
    }
    for (const write of safeWrites) {
        writes += 1;
        if (typeof write.formation_id !== 'string' || !write.formation_id || !d.requested_formations.includes(write.formation_id) || !callsites.has(write.callsite) || !helpers.has(write.helper) || write.boundary !== 'pre_write' || write.selection_inputs_boundary !== 'post_selection_pre_write' || !['direct_location', 'column_order'].includes(write.action_kind) || write.prior_mutations_in_invocation_possible !== true || !Number.isInteger(write.completed_turn) || write.completed_turn !== row.week_index || !Number.isInteger(write.invocation_ordinal) || write.invocation_ordinal < 0 || !Number.isInteger(write.write_ordinal) || write.write_ordinal < 0 || !stringArray(write.candidate_ids) || write.candidate_ids.length === 0 || !stringArray(write.target_ids) || write.target_ids.length === 0 || typeof write.target_osid !== 'string' || !write.target_osid || !(write.distance === null || (typeof write.distance === 'number' && Number.isFinite(write.distance))) || !(write.score === null || (typeof write.score === 'number' && Number.isFinite(write.score))) || !validActorSnapshot(write.before) || !validFeatureInputs(write.feature_inputs)) inconsistencies.push(`turn ${row.week_index}: invalid write receipt`);
        if (stringArray(write.candidate_ids) && !write.candidate_ids.includes(write.formation_id)) inconsistencies.push(`turn ${row.week_index}: candidate linkage missing actor`);
        if (stringArray(write.target_ids) && !write.target_ids.includes(write.target_osid)) inconsistencies.push(`turn ${row.week_index}: target linkage missing selection`);
        if (!validHelperFeatures(write.helper, write.feature_inputs)) inconsistencies.push(`turn ${row.week_index}: invalid helper feature inputs`);
    }
    const invocationGroups = new Map();
    for (const receipt of safeInvocations) {
        const key = `${receipt.completed_turn}:${receipt.invocation_ordinal}:${receipt.callsite}`;
        const actors = invocationGroups.get(key) || []; actors.push(receipt.formation_id); invocationGroups.set(key, actors);
    }
    for (const [key, actors] of invocationGroups) if (JSON.stringify(actors) !== JSON.stringify(d.requested_formations)) inconsistencies.push(`turn ${row.week_index}: incomplete invocation actor manifest ${key}`);
    const groupSequence = [...invocationGroups.keys()].map((key) => { const [, ordinal, callsite] = key.split(':'); return [Number(ordinal), callsite]; });
    if (JSON.stringify(groupSequence) !== JSON.stringify([[0, 'distribute-brigades-to-front'], [1, 'final-distribute-brigades-to-front']])) inconsistencies.push(`turn ${row.week_index}: invalid production call sequence`);
    for (const write of safeWrites) {
        const linked = safeInvocations.some((receipt) => receipt.formation_id === write.formation_id && receipt.completed_turn === write.completed_turn && receipt.invocation_ordinal === write.invocation_ordinal && receipt.callsite === write.callsite);
        if (!linked) inconsistencies.push(`turn ${row.week_index}: unlinked write receipt`);
    }
    for (const key of invocationGroups.keys()) {
        const [completedTurn, invocationOrdinal, callsite] = key.split(':');
        const groupWrites = safeWrites.filter((write) => write.completed_turn === Number(completedTurn) && write.invocation_ordinal === Number(invocationOrdinal) && write.callsite === callsite);
        if (groupWrites.some((write, index) => write.write_ordinal !== index)) inconsistencies.push(`turn ${row.week_index}: non-contiguous invocation write ordinals`);
    }
}
const missing_expected_boundaries = expected.map((e) => `${e.actor}:${e.turn}`).filter((key) => !observed.has(key));
const result = { causal_proof: false, rows: rows.length, invocations, writes, inconsistencies, missing_expected_boundaries };
process.stdout.write(`${JSON.stringify(result)}\n`);
process.exit(inconsistencies.length || missing_expected_boundaries.length ? 1 : 0);
