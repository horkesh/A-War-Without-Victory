#!/usr/bin/env node
'use strict';

const fs = require('node:fs');

const PREFIX = '[reinforcement_allocation]';
const NUMBER_FIELDS = [
    'current_personnel', 'cap', 'rate', 'need', 'reserve_for_spawn', 'effective_available',
    'transfer', 'personnel_after', 'pool_available_before', 'pool_committed_before',
    'pool_available_after', 'pool_committed_after',
];
const COMMON_KEYS = ['schema_version', 'source', 'event', 'branch', 'completed_turn', 'pool_key'];
const OPEN_KEYS = [...COMMON_KEYS, 'selected_pool_ordinal', 'pool'];
const RECIPIENT_KEYS = [...COMMON_KEYS, 'formation_id', 'global_order', 'disposition', 'reason', ...NUMBER_FIELDS];
const CLOSE_KEYS = [
    ...OPEN_KEYS, 'attempted_recipient_count', 'attempted_recipients', 'diagnostic_error_count',
];
const REASONS = new Set(['ineligible', 'at_cap', 'pool_missing', 'pool_empty', 'reserve_exhausted', 'no_transfer']);

function fail(message) {
    throw new Error(`reinforcement allocation receipt invalid: ${message}`);
}

function exactKeys(value, keys, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
    const actual = Object.keys(value).sort();
    const expected = [...keys].sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        fail(`${label} keys differ: ${actual.join(',')}`);
    }
}

function integer(value, label, minimum = 0) {
    if (!Number.isSafeInteger(value) || value < minimum) fail(`${label} must be an integer >= ${minimum}`);
}

function numberObservation(value, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.presence !== 'string') {
        fail(`${label} must be a number observation`);
    }
    if (['unreached', 'present_undefined', 'present_null'].includes(value.presence)) {
        exactKeys(value, ['presence'], label);
        return { reached: value.presence !== 'unreached', finite: false, value: null, presence: value.presence };
    }
    if (value.presence === 'present_nonfinite') {
        exactKeys(value, ['presence', 'value'], label);
        if (!['NaN', 'Infinity', '-Infinity'].includes(value.value)) fail(`${label} has an invalid nonfinite value`);
        return { reached: true, finite: false, value: null, presence: value.presence };
    }
    if (value.presence === 'present_value') {
        exactKeys(value, ['presence', 'value'], label);
        if (typeof value.value !== 'number' || !Number.isFinite(value.value)) fail(`${label} must contain a finite number`);
        return { reached: true, finite: true, value: value.value, presence: value.presence };
    }
    fail(`${label} has an unknown presence tag`);
}

function poolObservation(value, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be a pool observation`);
    if (value.presence === 'missing') {
        exactKeys(value, ['presence'], label);
        return { present: false, available: null, committed: null };
    }
    if (value.presence !== 'present') fail(`${label} has an unknown presence tag`);
    exactKeys(value, ['presence', 'available', 'committed'], label);
    const available = numberObservation(value.available, `${label}.available`);
    const committed = numberObservation(value.committed, `${label}.committed`);
    if (!available.finite || !committed.finite) fail(`${label} balances must be finite for strict qualification`);
    return { present: true, available: available.value, committed: committed.value };
}

function validateCommon(row, index) {
    if (row.schema_version !== 2) fail(`row ${index} uses unsupported schema_version ${String(row.schema_version)}; v1 lacks a completeness manifest`);
    if (row.source !== 'formation_spawn.reinforce') fail(`row ${index} source is not formation_spawn.reinforce`);
    if (row.branch !== 'regular') fail(`row ${index} branch is not regular`);
    integer(row.completed_turn, `row ${index} completed_turn`);
    if (typeof row.pool_key !== 'string' || row.pool_key.trim() !== row.pool_key || row.pool_key.length === 0) fail(`row ${index} pool_key is invalid`);
}

function requirePresence(observed, expected, label) {
    if (expected === 'value') {
        if (!observed.finite || observed.presence !== 'present_value') fail(`${label} must be present_value`);
        return observed.value;
    }
    if (observed.presence !== 'unreached') fail(`${label} must be unreached`);
    return null;
}

function validateRecipient(row, index) {
    exactKeys(row, RECIPIENT_KEYS, `row ${index}`);
    validateCommon(row, index);
    if (row.event !== 'recipient') fail(`row ${index} event is invalid`);
    if (typeof row.formation_id !== 'string' || row.formation_id.length === 0) fail(`row ${index} formation_id is invalid`);
    integer(row.global_order, `row ${index} global_order`);
    if (!['skipped', 'transferred'].includes(row.disposition)) fail(`row ${index} disposition is invalid`);
    if (row.disposition === 'transferred' ? row.reason !== null : !REASONS.has(row.reason)) fail(`row ${index} reason is invalid`);

    const observed = Object.fromEntries(NUMBER_FIELDS.map((field) => [field, numberObservation(row[field], `row ${index}.${field}`)]));
    const reachedByReason = {
        ineligible: [],
        at_cap: ['current_personnel', 'cap'],
        pool_missing: ['current_personnel', 'cap'],
        pool_empty: ['current_personnel', 'cap', 'pool_available_before', 'pool_committed_before'],
        reserve_exhausted: ['current_personnel', 'cap', 'rate', 'need', 'reserve_for_spawn', 'effective_available', 'transfer', 'pool_available_before', 'pool_committed_before'],
        no_transfer: ['current_personnel', 'cap', 'rate', 'need', 'reserve_for_spawn', 'effective_available', 'transfer', 'pool_available_before', 'pool_committed_before'],
        transferred: NUMBER_FIELDS,
    };
    const contract = reachedByReason[row.disposition === 'transferred' ? 'transferred' : row.reason];
    const values = {};
    for (const field of NUMBER_FIELDS) values[field] = requirePresence(observed[field], contract.includes(field) ? 'value' : 'unreached', `row ${index}.${field}`);

    if (row.reason === 'at_cap' && values.current_personnel < values.cap) fail(`row ${index} at_cap arithmetic is false`);
    if (row.reason === 'pool_empty' && values.pool_available_before > 0) fail(`row ${index} pool_empty arithmetic is false`);
    if (['reserve_exhausted', 'no_transfer'].includes(row.reason) || row.disposition === 'transferred') {
        const expectedNeed = Math.min(values.cap - values.current_personnel, values.rate);
        const expectedEffective = Math.max(0, values.pool_available_before - values.reserve_for_spawn);
        const expectedTransfer = Math.min(expectedNeed, expectedEffective);
        if (values.rate < 1 || values.need !== expectedNeed) fail(`row ${index} need arithmetic differs`);
        if (values.effective_available !== expectedEffective) fail(`row ${index} effective_available arithmetic differs`);
        if (values.transfer !== expectedTransfer) fail(`row ${index} transfer arithmetic differs`);
        if (row.disposition === 'transferred') {
            if (values.transfer <= 0) fail(`row ${index} transferred a nonpositive amount`);
            if (values.personnel_after !== values.current_personnel + values.transfer) fail(`row ${index} personnel_after arithmetic differs`);
            if (values.pool_available_after !== values.pool_available_before - values.transfer) fail(`row ${index} pool available debit differs`);
            if (values.pool_committed_after !== values.pool_committed_before + values.transfer) fail(`row ${index} pool committed credit differs`);
        } else {
            if (values.transfer > 0) fail(`row ${index} skipped a positive transfer`);
            if (row.reason === 'reserve_exhausted' && values.effective_available > 0) fail(`row ${index} reserve_exhausted arithmetic is false`);
            if (row.reason === 'no_transfer' && values.effective_available <= 0) fail(`row ${index} no_transfer arithmetic is false`);
        }
    }
    return values;
}

function validateOpen(row, index) {
    exactKeys(row, OPEN_KEYS, `row ${index}`);
    validateCommon(row, index);
    if (row.event !== 'stage_open') fail(`row ${index} event is invalid`);
    integer(row.selected_pool_ordinal, `row ${index} selected_pool_ordinal`);
    return poolObservation(row.pool, `row ${index}.pool`);
}

function validateClose(row, index) {
    exactKeys(row, CLOSE_KEYS, `row ${index}`);
    validateCommon(row, index);
    if (row.event !== 'stage_close') fail(`row ${index} event is invalid`);
    integer(row.selected_pool_ordinal, `row ${index} selected_pool_ordinal`);
    integer(row.attempted_recipient_count, `row ${index} attempted_recipient_count`);
    integer(row.diagnostic_error_count, `row ${index} diagnostic_error_count`);
    if (!Array.isArray(row.attempted_recipients)) fail(`row ${index} attempted_recipients must be an array`);
    if (row.attempted_recipients.length !== row.attempted_recipient_count) fail(`row ${index} manifest count differs`);
    row.attempted_recipients.forEach((recipient, manifestIndex) => {
        exactKeys(recipient, ['formation_id', 'global_order'], `row ${index} manifest ${manifestIndex}`);
        if (typeof recipient.formation_id !== 'string' || recipient.formation_id.length === 0) fail(`row ${index} manifest formation_id is invalid`);
        integer(recipient.global_order, `row ${index} manifest global_order`);
    });
    return poolObservation(row.pool, `row ${index}.pool`);
}

function selectedPools(values) {
    if (!Array.isArray(values)) fail('pools must be an array');
    const pools = [...new Set(values.flatMap((value) => String(value).split(',')).map((value) => value.trim()).filter(Boolean))].sort();
    if (pools.length === 0) fail('at least one pool selector is required');
    return pools;
}

function requestedTurns(values) {
    if (!Array.isArray(values)) fail('turns must be an array');
    const normalized = values.map((value) => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value.trim());
        fail('requested turn must be a nonblank integer');
    });
    const turns = [...new Set(normalized)].sort((a, b) => a - b);
    if (turns.length === 0) fail('at least one requested turn is required');
    turns.forEach((turn) => integer(turn, 'requested turn'));
    return turns;
}

function finalizeInvocation(invocation, expectedPools) {
    if (invocation.opens.length !== expectedPools.length || invocation.closes.length !== expectedPools.length) fail(`turn ${invocation.turn} has a truncated stage block`);
    let previousOrder = -1;
    let previousId = null;
    const seenOrders = new Set();
    const seenIds = new Set();
    for (const recipient of invocation.recipients) {
        if (recipient.row.global_order <= previousOrder) fail(`turn ${invocation.turn} recipient global_order is not strictly increasing`);
        if (previousId !== null && recipient.row.formation_id <= previousId) fail(`turn ${invocation.turn} recipient formation_id order is not stable`);
        if (seenOrders.has(recipient.row.global_order) || seenIds.has(recipient.row.formation_id)) fail(`turn ${invocation.turn} has a duplicate recipient`);
        previousOrder = recipient.row.global_order;
        previousId = recipient.row.formation_id;
        seenOrders.add(recipient.row.global_order);
        seenIds.add(recipient.row.formation_id);
    }

    for (let ordinal = 0; ordinal < expectedPools.length; ordinal += 1) {
        const poolKey = expectedPools[ordinal];
        const open = invocation.opens[ordinal];
        const close = invocation.closes[ordinal];
        if (open.row.pool_key !== poolKey || close.row.pool_key !== poolKey || open.row.selected_pool_ordinal !== ordinal || close.row.selected_pool_ordinal !== ordinal) {
            fail(`turn ${invocation.turn} selector headers differ at ordinal ${ordinal}`);
        }
        if (close.row.diagnostic_error_count !== 0) fail(`turn ${invocation.turn} diagnostic_error_count is nonzero`);
        const recipients = invocation.recipients.filter((item) => item.row.pool_key === poolKey);
        const actualManifest = recipients.map((item) => ({ formation_id: item.row.formation_id, global_order: item.row.global_order }));
        if (JSON.stringify(actualManifest) !== JSON.stringify(close.row.attempted_recipients)) fail(`turn ${invocation.turn} ${poolKey} manifest differs from recipient rows`);

        let available = open.pool.available;
        let committed = open.pool.committed;
        if (open.pool.present !== close.pool.present) fail(`turn ${invocation.turn} ${poolKey} pool presence changed`);
        for (const recipient of recipients) {
            const values = recipient.values;
            if (recipient.row.reason === 'pool_missing' && open.pool.present) fail(`turn ${invocation.turn} ${poolKey} pool_missing contradicts opening`);
            if (['pool_empty', 'reserve_exhausted', 'no_transfer'].includes(recipient.row.reason) || recipient.row.disposition === 'transferred') {
                if (!open.pool.present) fail(`turn ${invocation.turn} ${poolKey} arithmetic recipient has a missing pool`);
                if (values.pool_available_before !== available || values.pool_committed_before !== committed) fail(`turn ${invocation.turn} ${poolKey} balance continuity differs`);
                if (recipient.row.disposition === 'transferred') {
                    available = values.pool_available_after;
                    committed = values.pool_committed_after;
                }
            }
        }
        if (open.pool.present && (close.pool.available !== available || close.pool.committed !== committed)) fail(`turn ${invocation.turn} ${poolKey} closing balances differ`);
        if (open.pool.present && open.pool.available + open.pool.committed !== close.pool.available + close.pool.committed) fail(`turn ${invocation.turn} ${poolKey} conservation differs`);
    }
}

function validateReinforcementAllocationStream(text, options) {
    if (typeof text !== 'string') fail('input must be text');
    if (!options || typeof options !== 'object') fail('options are required');
    const pools = selectedPools(options.pools);
    const turns = requestedTurns(options.turns);
    integer(options.expectedInvocationsPerTurn, 'expectedInvocationsPerTurn', 1);

    const records = [];
    text.split(/\r?\n/).forEach((line, lineIndex) => {
        if (line.length > 0 && line.length < PREFIX.length && PREFIX.startsWith(line)) {
            fail(`line ${lineIndex + 1} contains a partial topic prefix`);
        }
        if (!line.startsWith(PREFIX)) return;
        if (!line.startsWith(`${PREFIX} `)) fail(`line ${lineIndex + 1} has a malformed topic prefix`);
        let row;
        try { row = JSON.parse(line.slice(PREFIX.length + 1)); }
        catch { fail(`line ${lineIndex + 1} contains invalid JSON`); }
        if (!row || typeof row !== 'object' || Array.isArray(row)) fail(`line ${lineIndex + 1} target payload is not an object`);
        records.push({ row, line: lineIndex + 1 });
    });
    if (records.length === 0) fail('zero target-topic rows observed');

    const invocations = [];
    let current = null;
    for (const item of records) {
        const { row, line } = item;
        if (!['stage_open', 'recipient', 'stage_close'].includes(row.event)) fail(`line ${line} event is unknown`);
        if (row.event === 'stage_open') {
            const pool = validateOpen(row, line);
            if (!current) current = { turn: row.completed_turn, opens: [], recipients: [], closes: [] };
            if (current.recipients.length > 0 || current.closes.length > 0 || row.completed_turn !== current.turn) fail(`line ${line} stage_open is out of order`);
            const ordinal = current.opens.length;
            if (ordinal >= pools.length || row.pool_key !== pools[ordinal] || row.selected_pool_ordinal !== ordinal) fail(`line ${line} stage_open selector order differs`);
            current.opens.push({ row, pool });
        } else if (row.event === 'recipient') {
            const values = validateRecipient(row, line);
            if (!current || current.opens.length !== pools.length || current.closes.length > 0 || row.completed_turn !== current.turn) fail(`line ${line} recipient is outside an open stage`);
            if (!pools.includes(row.pool_key)) fail(`line ${line} recipient pool is unrequested`);
            current.recipients.push({ row, values });
        } else {
            const pool = validateClose(row, line);
            if (!current || current.opens.length !== pools.length || row.completed_turn !== current.turn) fail(`line ${line} stage_close is outside an open stage`);
            const ordinal = current.closes.length;
            if (ordinal >= pools.length || row.pool_key !== pools[ordinal] || row.selected_pool_ordinal !== ordinal) fail(`line ${line} stage_close selector order differs`);
            current.closes.push({ row, pool });
            if (current.closes.length === pools.length) {
                finalizeInvocation(current, pools);
                invocations.push(current);
                current = null;
            }
        }
    }
    if (current) fail(`turn ${current.turn} has a truncated stage block`);

    for (let index = 1; index < invocations.length; index += 1) {
        if (invocations[index].turn < invocations[index - 1].turn) fail(`completed turn order decreases from ${invocations[index - 1].turn} to ${invocations[index].turn}`);
    }

    const observedTurns = [...new Set(invocations.map((invocation) => invocation.turn))].sort((a, b) => a - b);
    for (const turn of observedTurns) {
        const count = invocations.filter((invocation) => invocation.turn === turn).length;
        if (count !== options.expectedInvocationsPerTurn) fail(`turn ${turn} has ${count} invocations; expected ${options.expectedInvocationsPerTurn}`);
    }
    for (const turn of turns) {
        const count = invocations.filter((invocation) => invocation.turn === turn).length;
        if (count !== options.expectedInvocationsPerTurn) fail(`turn ${turn} has ${count} invocations; expected ${options.expectedInvocationsPerTurn}`);
    }
    const requested = new Set(turns);
    const selectedInvocations = invocations.filter((invocation) => requested.has(invocation.turn));
    return {
        schema: 'awwv.reinforcement-allocation-reader-result.v1',
        schema_version: 2,
        pools,
        turns,
        expected_invocations_per_turn: options.expectedInvocationsPerTurn,
        observed_turns: observedTurns,
        observed_invocation_count: invocations.length,
        invocation_count: selectedInvocations.length,
        recipient_count: selectedInvocations.reduce((sum, invocation) => sum + invocation.recipients.length, 0),
    };
}

function usage(message) {
    if (message) process.stderr.write(`${message}\n`);
    process.stderr.write('usage: reinforcement_allocation_reader.cjs --input FILE --output NEW_FILE --pool "KEY[, KEY]" --turns "N[, N]" --expected-invocations-per-turn N\n');
    process.exitCode = 3;
}

function cli(argv) {
    const parsed = {};
    for (let index = 0; index < argv.length; index += 2) {
        const key = argv[index];
        const value = argv[index + 1];
        if (!value || !['--input', '--output', '--pool', '--turns', '--expected-invocations-per-turn'].includes(key) || Object.hasOwn(parsed, key)) {
            usage(`invalid CLI option: ${String(key)}`);
            return;
        }
        parsed[key] = value;
    }
    if (Object.keys(parsed).length !== 5) {
        usage('all CLI options are required');
        return;
    }
    try {
        const result = validateReinforcementAllocationStream(fs.readFileSync(parsed['--input'], 'utf8'), {
            pools: parsed['--pool'].split(','),
            turns: parsed['--turns'].split(',').map((value) => value.trim()),
            expectedInvocationsPerTurn: Number(parsed['--expected-invocations-per-turn']),
        });
        fs.writeFileSync(parsed['--output'], `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
    } catch (error) {
        process.stderr.write(`${error.message}\n`);
        process.exitCode = 2;
    }
}

module.exports = { validateReinforcementAllocationStream };

if (require.main === module) cli(process.argv.slice(2));
