#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const {
    isExpectedTurn138Write,
    isExpectedTurn139Rejection,
} = require('./continuation7_front_writer_campaign_20261004_compare_extract.cjs');

assert.equal(typeof isExpectedTurn138Write, 'function', 'turn-138 exact write gate must be exported');
assert.equal(typeof isExpectedTurn139Rejection, 'function', 'turn-139 exact rejection gate must be exported');

const ACTOR = 'arbih_737th_muslim_light';
const SOURCE = 'op:busovaca:gornja_rovna';
const DESTINATION = 'op:bugojno:udurlije';

const validWrite = {
    completed_turn: 138,
    callsite: 'final-distribute-brigades-to-front',
    invocation_ordinal: 1,
    write_ordinal: 1,
    helper: 'main_phase_b',
    formation_id: ACTOR,
    boundary: 'pre_write',
    selection_inputs_boundary: 'post_selection_pre_write',
    action_kind: 'column_order',
    target_osid: DESTINATION,
    candidate_ids: [ACTOR],
    target_ids: [DESTINATION],
};

const validRejection = {
    formation_id: ACTOR,
    reason: 'no_friendly_path',
    location_osid: SOURCE,
    destination_osid: DESTINATION,
};

const withField = (value, field, replacement) => ({ ...value, [field]: replacement });
const withoutField = (value, field) => {
    const copy = { ...value };
    delete copy[field];
    return copy;
};

assert.equal(isExpectedTurn138Write(138, validWrite), true, 'exact turn-138 production write must pass');
for (const [name, turn, write] of [
    ['null', 138, null],
    ['primitive', 138, 42],
    ['wrong actor', 138, withField(validWrite, 'formation_id', 'arbih_other')],
    ['wrong argument turn', 137, validWrite],
    ['wrong receipt turn', 138, withField(validWrite, 'completed_turn', 139)],
    ['wrong action kind', 138, withField(validWrite, 'action_kind', 'direct_location')],
    ['wrong destination', 138, withField(validWrite, 'target_osid', 'op:travnik:udurlije')],
    ['wrong boundary', 138, withField(validWrite, 'boundary', 'post_write')],
    ['wrong selection boundary', 138, withField(validWrite, 'selection_inputs_boundary', 'pre_selection')],
    ['direct helper', 138, withField(validWrite, 'helper', 'main_phase_a')],
    ['unknown helper', 138, withField(validWrite, 'helper', 'unknown')],
    ['nonproduction callsite', 138, withField(validWrite, 'callsite', 'direct-call')],
    ['missing actor', 138, withoutField(validWrite, 'formation_id')],
    ['missing target', 138, withoutField(validWrite, 'target_osid')],
]) assert.equal(isExpectedTurn138Write(turn, write), false, `write negative must fail: ${name}`);

assert.equal(isExpectedTurn139Rejection(139, validRejection), true, 'exact turn-139 production rejection must pass');
for (const reason of [
    'missing_formation',
    'inactive_formation',
    'unsupported_kind',
    'posture_dig_in',
    'missing_location',
    'invalid_destination',
    'destination_equals_location',
    'routine_destination_out_of_scope',
    'no_friendly_path',
]) assert.equal(isExpectedTurn139Rejection(139, { ...validRejection, reason }), true, `recognized reason must pass: ${reason}`);

for (const [name, turn, rejection] of [
    ['null', 139, null],
    ['primitive', 139, 'bad'],
    ['wrong actor', 139, withField(validRejection, 'formation_id', 'arbih_other')],
    ['wrong turn', 138, validRejection],
    ['wrong source', 139, withField(validRejection, 'location_osid', 'op:travnik:gornja_rovna')],
    ['wrong destination', 139, withField(validRejection, 'destination_osid', 'op:travnik:udurlije')],
    ['unknown reason', 139, withField(validRejection, 'reason', 'historical_guess')],
    ['missing actor', 139, withoutField(validRejection, 'formation_id')],
    ['missing source', 139, withoutField(validRejection, 'location_osid')],
    ['missing destination', 139, withoutField(validRejection, 'destination_osid')],
    ['missing reason', 139, withoutField(validRejection, 'reason')],
]) assert.equal(isExpectedTurn139Rejection(turn, rejection), false, `rejection negative must fail: ${name}`);

process.stdout.write(JSON.stringify({ verdict: 'PASS', write_negatives: 14, rejection_reason_controls: 9, rejection_negatives: 11 }) + '\n');
