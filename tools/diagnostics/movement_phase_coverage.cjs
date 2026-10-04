#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
if (args.length === 0) process.exit(2);
const root = path.resolve(args.shift());
const expected = [];
let json = false;
while (args.length) {
    const arg = args.shift();
    if (arg === '--json') json = true;
    else if (arg === '--expect-boundary' && args.length) expected.push(args.shift());
    else process.exit(2);
}
const inconsistencies = [];
const missing = [];
const covered = new Set();
let receiptsSeen = 0;
if (expected.length === 0) inconsistencies.push({ reason: 'expectation_required' });
const expectationKeys = new Set();
const nonemptyString = (value) => typeof value === 'string' && value.trim().length > 0;
for (const spec of expected) {
    const split = spec.lastIndexOf(':');
    const actor = spec.slice(0, split);
    const turnText = spec.slice(split + 1);
    const turn = Number(turnText);
    if (split < 1 || !nonemptyString(actor) || !/^[1-9]\d*$/.test(turnText) || !Number.isSafeInteger(turn)) process.exit(2);
    expectationKeys.add(`${actor}:${turn}`);
}
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join('|') === [...keys].sort().join('|');
function validPresence(p, validateValue = () => true) {
    if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
    if (['absent', 'present_undefined', 'present_null'].includes(p.presence)) return exactKeys(p, ['presence']);
    return p.presence === 'present_value' && exactKeys(p, ['presence', 'value']) && validateValue(p.value);
}
const stringArray = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string');
function validMovementState(v) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
    const allowed = ['status', 'stance', 'destination_sids', 'path', 'turns_remaining', 'owner'];
    return Object.keys(v).every((k) => allowed.includes(k))
        && ['deployed', 'packing', 'in_transit', 'unpacking'].includes(v.status)
        && (v.stance === undefined || ['combat', 'column'].includes(v.stance))
        && (v.destination_sids === undefined || stringArray(v.destination_sids))
        && (v.path === undefined || stringArray(v.path))
        && (v.turns_remaining === undefined || Number.isInteger(v.turns_remaining))
        && (v.owner === undefined || ['bot_discretionary', 'authored_preplanned'].includes(v.owner));
}
function validMovementOrder(v) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
    return Object.keys(v).every((k) => ['destination_sids', 'stance', 'owner'].includes(k))
        && stringArray(v.destination_sids)
        && (v.stance === undefined || ['combat', 'column'].includes(v.stance))
        && (v.owner === undefined || ['bot_discretionary', 'authored_preplanned'].includes(v.owner));
}
function validSnapshot(s) {
    if (!exactKeys(s, ['formation', 'movement_state', 'movement_order'])) return false;
    const validFormation = validPresence(s.formation, (f) => exactKeys(f, ['faction', 'status', 'location_osid', 'corps_id'])
        && validPresence(f.faction, (v) => typeof v === 'string')
        && validPresence(f.status, (v) => ['active', 'inactive'].includes(v))
        && validPresence(f.location_osid, (v) => typeof v === 'string')
        && validPresence(f.corps_id, (v) => typeof v === 'string'));
    return validFormation && validPresence(s.movement_state, validMovementState) && validPresence(s.movement_order, validMovementOrder);
}
function actorActive(s) { return s.formation.presence === 'present_value' && s.formation.value.status.presence === 'present_value' && s.formation.value.status.value === 'active'; }
function add(reason, fields = {}) { inconsistencies.push({ reason, ...fields }); }

const file = path.join(root, 'weekly_report.jsonl');
const observedExpectations = new Set();
if (!fs.existsSync(file)) add('missing_weekly_report');
else {
    const rows = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
    for (let line = 0; line < rows.length; line++) {
        let row;
        try { row = JSON.parse(rows[line]); } catch { add('invalid_json', { line: line + 1 }); continue; }
        const weekIndexValid = Number.isSafeInteger(row.week_index) && row.week_index >= 1;
        if (!weekIndexValid) add('invalid_week_index', { line: line + 1 });
        const d = row.movement_phase_diagnostics;
        if (d === undefined) continue;
        if (!exactKeys(d, ['topic', 'selector_configured', 'requested_formations', 'phase_manifest', 'causal_proof', 'receipts', 'terminal_receipts'])
            || d.topic !== 'movement_phase' || typeof d.selector_configured !== 'boolean' || d.causal_proof !== false
            || !Array.isArray(d.requested_formations) || !Array.isArray(d.phase_manifest) || !Array.isArray(d.receipts) || !Array.isArray(d.terminal_receipts)) {
            add('invalid_diagnostic_schema', { line: line + 1 }); continue;
        }
        if (!d.selector_configured || d.requested_formations.length === 0) { add('unconfigured_diagnostic', { line: line + 1 }); continue; }
        let primitiveSchemaValid = true;
        const actorManifestValid = d.requested_formations.every(nonemptyString)
            && JSON.stringify(d.requested_formations) === JSON.stringify([...new Set(d.requested_formations)].sort());
        if (!actorManifestValid) { add('invalid_actor_manifest', { line: line + 1 }); primitiveSchemaValid = false; }
        const manifestValid = d.phase_manifest.length > 0 && d.phase_manifest.every((m, i) =>
            exactKeys(m, ['phase_index', 'phase_name', 'phase_group'])
            && Number.isSafeInteger(m.phase_index) && m.phase_index === i
            && nonemptyString(m.phase_name) && ['war', 'early-war'].includes(m.phase_group));
        if (!manifestValid) { add('invalid_phase_manifest', { line: line + 1 }); primitiveSchemaValid = false; }
        for (const r of d.receipts) {
            const keys = ['completed_turn', 'phase_name', 'phase_group', 'phase_index', 'disposition', 'skip_reason', 'formation_id', 'before', 'after'];
            const valid = exactKeys(r, keys)
                && Number.isSafeInteger(r.completed_turn) && r.completed_turn >= 1
                && nonemptyString(r.phase_name) && ['war', 'early-war'].includes(r.phase_group)
                && Number.isSafeInteger(r.phase_index) && r.phase_index >= 0
                && ['executed', 'skipped'].includes(r.disposition)
                && (r.skip_reason === null || typeof r.skip_reason === 'string')
                && nonemptyString(r.formation_id) && validSnapshot(r.before) && validSnapshot(r.after);
            if (!valid) { add('invalid_receipt_schema', { formation_id: r?.formation_id, phase_index: r?.phase_index }); primitiveSchemaValid = false; }
        }
        for (const t of d.terminal_receipts) {
            const valid = exactKeys(t, ['completed_turn', 'phase_index', 'formation_id', 'before', 'after'])
                && Number.isSafeInteger(t.completed_turn) && t.completed_turn >= 1
                && Number.isSafeInteger(t.phase_index) && t.phase_index >= 0
                && nonemptyString(t.formation_id) && validSnapshot(t.before) && validSnapshot(t.after)
                && JSON.stringify(t.before) === JSON.stringify(t.after);
            if (!valid) { add('invalid_terminal_receipt', { formation_id: t?.formation_id }); primitiveSchemaValid = false; }
        }
        if (!primitiveSchemaValid || !weekIndexValid) continue;
        for (const r of d.receipts) if (!d.requested_formations.includes(r?.formation_id)) add('unrequested_formation_receipt', { formation_id: r?.formation_id });
        for (const r of d.terminal_receipts) if (!d.requested_formations.includes(r?.formation_id)) add('unrequested_terminal_receipt', { formation_id: r?.formation_id });
        for (const actor of d.requested_formations) {
            const expectationKey = `${actor}:${row.week_index}`;
            if (!expectationKeys.has(expectationKey)) { add('unexpected_selected_actor', { boundary: expectationKey }); continue; }
            if (observedExpectations.has(expectationKey)) add('duplicate_actor_turn_diagnostic', { boundary: expectationKey });
            observedExpectations.add(expectationKey);
            const actorReceipts = d.receipts.filter((r) => r?.formation_id === actor);
            receiptsSeen += actorReceipts.length;
            const byIndex = new Map();
            for (let position = 0; position < actorReceipts.length; position++) {
                const r = actorReceipts[position];
                if (r.completed_turn !== row.week_index) { add('receipt_turn_week_index_mismatch', { actor, phase_index: r.phase_index }); continue; }
                if (byIndex.has(r.phase_index)) add('duplicate_actor_turn_phase_index', { actor, phase_index: r.phase_index });
                byIndex.set(r.phase_index, r);
                const m = d.phase_manifest[r.phase_index];
                if (!m || m.phase_name !== r.phase_name || m.phase_group !== r.phase_group || r.phase_index !== position) add('phase_order_mismatch', { actor, phase_index: r.phase_index });
                if ((r.disposition === 'skipped') !== (typeof r.skip_reason === 'string')) add('disposition_contradiction', { actor, phase_index: r.phase_index });
                if (position > 0 && JSON.stringify(actorReceipts[position - 1].after) !== JSON.stringify(r.before)) add('non_continuous_boundary', { actor, phase_index: r.phase_index });
            }
            for (const m of d.phase_manifest) if (!byIndex.has(m.phase_index)) add('missing_phase_receipt', { actor, phase_index: m.phase_index });
            const terminals = d.terminal_receipts.filter((r) => r?.formation_id === actor);
            if (terminals.length !== 1) add(terminals.length > 1 ? 'duplicate_terminal_receipt' : 'missing_terminal_receipt', { actor });
            else {
                const t = terminals[0];
                if (t.completed_turn !== row.week_index || t.phase_index !== d.phase_manifest.length) add('invalid_terminal_receipt', { actor });
                const last = byIndex.get(d.phase_manifest.length - 1);
                if (last && JSON.stringify(last.after) !== JSON.stringify(t.before)) add('terminal_discontinuity', { actor });
                if (!actorActive(t.after)) add('terminal_actor_not_active', { actor });
            }
            if (inconsistencies.length === 0) covered.add(expectationKey);
        }
    }
}
for (const key of expectationKeys) {
    if (!observedExpectations.has(key)) { add('missing_expected_boundary', { boundary: key }); missing.push(key); }
}
const report = { receipts_seen: receiptsSeen, causal_proof: false, coverage: [...covered].sort(), inconsistencies, missing_expected_boundaries: missing.sort() };
process.stdout.write(`${JSON.stringify(report, null, json ? 0 : 2)}\n`);
process.exit(inconsistencies.length === 0 && missing.length === 0 ? 0 : 1);
