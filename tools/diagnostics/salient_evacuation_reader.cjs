#!/usr/bin/env node
'use strict';

const fs = require('fs');
const PREFIX = '[salient_evacuation] ';
const argv = process.argv.slice(2);
const option = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const turn = Number(option('--turn'));
const capture = option('--capture');
const faction = option('--faction');
const brigadesRaw = option('--brigades');
const emit = option('--emit');
const fail = errors => { process.stdout.write(JSON.stringify({ valid: false, errors }) + '\n'); process.exit(2); };

const allowedArgs = new Set(['--turn', '--capture', '--faction', '--brigades', '--emit']);
if (argv.length !== 10 || argv.some((value, index) => index % 2 === 0 && !allowedArgs.has(value)) ||
    [...allowedArgs].some(name => argv.filter(value => value === name).length !== 1)) fail(['unknown_missing_or_duplicate_selector']);
if (!Number.isSafeInteger(turn) || !capture || !faction || !brigadesRaw || emit !== 'JSON') fail(['invalid_or_missing_selectors']);
const brigades = brigadesRaw.split(',').map(v => v.trim()).filter(Boolean).sort();
if (!brigades.length || new Set(brigades).size !== brigades.length) fail(['invalid_brigade_selector']);

const errors = [];
const rows = [];
for (const [index, line] of fs.readFileSync(0, 'utf8').split(/\r?\n/).entries()) {
    if (!line.startsWith(PREFIX)) continue;
    try {
        const row = JSON.parse(line.slice(PREFIX.length));
        if (!row || typeof row !== 'object' || Array.isArray(row) || row.schema_version !== 1 || typeof row.kind !== 'string') throw new Error('schema');
        rows.push({ ...row, _line: index + 1 });
    } catch { errors.push(`malformed_row:${index + 1}`); }
}
if (!rows.length) errors.push('missing_observer_rows');

const knownTerminals = new Set([
    'inventory_absent', 'components_lt_2', 'ineligible_not_active_brigade', 'ineligible_faction',
    'ineligible_enclave', 'ineligible_no_location', 'ineligible_at_captured_osid',
    'already_connected_to_main', 'ineligible_start_not_displaced_control',
    'ineligible_operation_participant', 'ineligible_operation_staging', 'no_route', 'evacuated',
]);
const passes = [];
const strings = value => Array.isArray(value) && value.every(v => typeof v === 'string') && new Set(value).size === value.length;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sorted = value => strings(value) && same(value, [...value].sort());
let current = null;
for (const row of rows) {
    if (!Number.isSafeInteger(row.turn)) errors.push(`invalid_turn:${row._line}`);
    if (row.kind === 'pass_start') {
        if (current) errors.push(`duplicate_or_nested_start:${row._line}`);
        if (typeof row.captured_osid !== 'string' || typeof row.displaced_faction !== 'string' ||
            !(row.captured_owner === null || typeof row.captured_owner === 'string') ||
            !(row.live_alliance_rbih_hrhb === null || typeof row.live_alliance_rbih_hrhb === 'number') ||
            !Array.isArray(row.requested_ids) || row.requested_ids.some(v => typeof v !== 'string')) errors.push(`invalid_pass_start:${row._line}`);
        current = { start: row, rows: [], inventory: [], terminals: [], end: null };
        passes.push(current);
        continue;
    }
    if (!current) { errors.push(`row_outside_pass:${row._line}`); continue; }
    if (row.turn !== current.start.turn) errors.push(`row_turn_mismatch:${row._line}`);
    current.rows.push(row);
    if (row.kind === 'inventory') {
        if (!Array.isArray(row.present_requested_ids) || !Array.isArray(row.absent_requested_ids) ||
            [...row.present_requested_ids, ...row.absent_requested_ids].some(v => typeof v !== 'string')) errors.push(`invalid_inventory:${row._line}`);
        current.inventory.push(row);
    } else if (row.kind === 'formation_terminal') {
        if (typeof row.formation_id !== 'string' || !knownTerminals.has(row.terminal) || typeof row.wrote !== 'boolean') errors.push(`unknown_or_invalid_terminal:${row._line}`);
        if ((row.terminal === 'evacuated') !== row.wrote) errors.push(`contradictory_write:${row._line}`);
        if (row.terminal === 'evacuated' && (typeof row.destination_osid !== 'string' || !Array.isArray(row.chosen_path) || row.chosen_path.some(v => typeof v !== 'string'))) errors.push(`invalid_write_receipt:${row._line}`);
        current.terminals.push(row);
    } else if (row.kind === 'component_rank') {
        if (!Array.isArray(row.components) || !Array.isArray(row.initial_main_osids) || row.components.some(c => !c || !Array.isArray(c.osids) || c.osids.some(v => typeof v !== 'string') || !Number.isSafeInteger(c.size) || !Number.isSafeInteger(c.supplied_count) || c.size !== c.osids.length)) errors.push(`invalid_component_rank:${row._line}`);
    } else if (row.kind === 'operation_holders') {
        if (!Array.isArray(row.participant_ids) || !Array.isArray(row.staging_osids)) errors.push(`invalid_operation_holders:${row._line}`);
    } else if (row.kind === 'pass_end') {
        if (current.end) errors.push(`duplicate_end:${row._line}`);
        current.end = row;
        current = null;
    } else errors.push(`unknown_kind:${row._line}`);
}
if (current) errors.push('truncated_pass');
if (errors.length) fail(errors);

for (const [index, pass] of passes.entries()) {
    if (!pass.end) continue;
    if (pass.inventory.length !== 1) errors.push(`inventory_count:${index}:${pass.inventory.length}`);
    const componentRows = pass.rows.filter(row => row.kind === 'component_rank');
    const holderRows = pass.rows.filter(row => row.kind === 'operation_holders');
    if (pass.end.terminal === 'completed' && (componentRows.length !== 1 || holderRows.length !== 1)) errors.push(`completed_structure:${index}`);
    if (!['completed', 'components_lt_2'].includes(pass.end.terminal)) errors.push(`unknown_pass_terminal:${index}`);
    const requested = [...pass.start.requested_ids].sort();
    if (JSON.stringify(requested) !== JSON.stringify(brigades)) errors.push(`requested_selector_mismatch:${index}`);
    if (pass.inventory.length === 1) {
        const inv = pass.inventory[0];
        const union = [...inv.present_requested_ids, ...inv.absent_requested_ids].sort();
        if (JSON.stringify(union) !== JSON.stringify(requested) || new Set(union).size !== union.length) errors.push(`inventory_partition:${index}`);
        for (const id of requested) {
            const matches = pass.terminals.filter(r => r.formation_id === id);
            if (matches.length !== 1) errors.push(`terminal_coverage:${index}:${id}:${matches.length}`);
            const absent = inv.absent_requested_ids.includes(id);
            if (matches.length === 1 && (matches[0].terminal === 'inventory_absent') !== absent) errors.push(`inventory_terminal_contradiction:${index}:${id}`);
        }
        if (pass.terminals.some(row => !requested.includes(row.formation_id))) errors.push(`unrequested_terminal:${index}`);
    }
    if (pass.end.turn !== pass.start.turn) errors.push(`pass_turn_mismatch:${index}`);
    const kinds = pass.rows.map(r => r.kind);
    const expectedKinds = pass.end.terminal === 'completed'
        ? ['inventory', 'component_rank', 'operation_holders', ...pass.terminals.map(() => 'formation_terminal'), 'pass_end']
        : ['inventory', ...pass.terminals.map(() => 'formation_terminal'), 'pass_end'];
    if (!same(kinds, expectedKinds)) errors.push(`row_order:${index}`);
    if (pass.end.terminal === 'components_lt_2' && pass.terminals.some(r => !['components_lt_2', 'inventory_absent'].includes(r.terminal))) errors.push(`early_terminal:${index}`);
    if (pass.end.terminal !== 'completed' || componentRows.length !== 1 || holderRows.length !== 1) continue;
    const component = componentRows[0];
    const components = component.components;
    if (!Array.isArray(components) || components.length < 2 || components.some(c => !c || !sorted(c.osids) || c.size < 1 || c.size !== c.osids.length || !Number.isSafeInteger(c.supplied_count) || c.supplied_count < 0 || c.supplied_count > c.size)) {
        errors.push(`component_semantics:${index}`); continue;
    }
    const ordered = [...components].sort((a,b) => b.supplied_count-a.supplied_count || b.size-a.size || (a.osids[0] < b.osids[0] ? -1 : a.osids[0] > b.osids[0] ? 1 : 0));
    if (!same(components, ordered) || !same(component.initial_main_osids, components[0].osids) || new Set(components.flatMap(c => c.osids)).size !== components.reduce((n,c) => n+c.size,0)) errors.push(`component_binding:${index}`);
    const holders = holderRows[0];
    if (!sorted(holders.participant_ids) || !sorted(holders.staging_osids)) errors.push(`holder_semantics:${index}`);
    if (!sorted(pass.end.evacuated_formation_ids)) errors.push(`end_evacuated_inventory:${index}`);
    else if (!same(pass.end.evacuated_formation_ids.filter(id => requested.includes(id)), pass.terminals.filter(r => r.wrote).map(r => r.formation_id).sort())) errors.push(`end_write_binding:${index}`);
    if (errors.length) fail(errors);
    for (const r of pass.terminals) {
        if (r.terminal === 'no_route' && (!sorted(r.without_neck_visited) || !sorted(r.with_neck_visited) || r.without_neck_terminal !== 'not_reached' || r.with_neck_terminal !== 'not_reached' || !r.without_neck_visited.includes(r.start_osid) || !r.with_neck_visited.includes(r.start_osid) || r.without_neck_visited.includes(pass.start.captured_osid) || [...r.without_neck_visited,...r.with_neck_visited].some(id => component.initial_main_osids.includes(id)) || r.chosen_path !== undefined || r.destination_osid !== undefined)) errors.push(`no_route_binding:${index}:${r.formation_id}`);
        if (r.terminal === 'ineligible_at_captured_osid' && r.start_osid !== pass.start.captured_osid) errors.push(`captured_guard_binding:${index}:${r.formation_id}`);
        if (r.terminal === 'ineligible_operation_participant' && !holders.participant_ids.includes(r.formation_id)) errors.push(`participant_guard_binding:${index}:${r.formation_id}`);
        if (r.terminal === 'ineligible_operation_staging' && !holders.staging_osids.includes(r.start_osid)) errors.push(`staging_guard_binding:${index}:${r.formation_id}`);
        if (r.terminal !== 'evacuated') continue;
        const path = r.chosen_path;
        if (!strings(path) || path.length < 3 || path[0] !== r.start_osid || path.at(-1) !== r.destination_osid || !path.includes(pass.start.captured_osid) || !component.initial_main_osids.includes(r.destination_osid) || component.initial_main_osids.includes(r.start_osid)) errors.push(`path_binding:${index}:${r.formation_id}`);
        if (!sorted(r.without_neck_visited) || !sorted(r.with_neck_visited) || r.without_neck_terminal !== 'not_reached' || r.with_neck_terminal !== 'reached_main' || r.without_neck_visited.includes(pass.start.captured_osid) || r.without_neck_visited.some(id => component.initial_main_osids.includes(id)) || !r.without_neck_visited.includes(r.start_osid) || !r.with_neck_visited.includes(r.start_osid) || (strings(path) && path.some(id => !r.with_neck_visited.includes(id)))) errors.push(`bfs_binding:${index}:${r.formation_id}`);
        if (!(r.corps_id_before === null || typeof r.corps_id_before === 'string') || r.corps_id_before !== r.corps_id_after || typeof r.order_present_before !== 'boolean' || typeof r.movement_state_present_before !== 'boolean' || r.order_present_after !== false || r.movement_state_present_after !== false || r.assignment_after !== null || r.stranded_status_after !== 'reconnected' || r.stranded_since_turn_present_after !== false || r.last_reachable_turn_after !== pass.start.turn || !Object.hasOwn(r,'assignment_before') || !Object.hasOwn(r,'stranded_status_before') || !Object.hasOwn(r,'order_before') || !Object.hasOwn(r,'movement_state_before') || (r.order_present_before ? r.order_before === null : r.order_before !== null) || (r.movement_state_present_before ? r.movement_state_before === null : r.movement_state_before !== null)) errors.push(`write_tuple_binding:${index}:${r.formation_id}`);
    }
}

const matching = passes.filter(p => p.end && p.start.turn === turn && p.start.captured_osid === capture && p.start.displaced_faction === faction);
if (matching.length !== 1) errors.push(`matching_pass_count:${matching.length}`);
if (errors.length) fail(errors);
const selected = matching[0];
process.stdout.write(JSON.stringify({ valid: true, turn, capture, faction, terminals: Object.fromEntries(selected.terminals.map(r => [r.formation_id, r.terminal])) }) + '\n');
