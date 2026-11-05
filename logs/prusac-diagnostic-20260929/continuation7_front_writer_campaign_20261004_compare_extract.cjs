#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const readline = require('node:readline');
const { normalizeWeeklyRow, stableText } = require('./continuation7_front_writer_campaign_20261004_normalizer.cjs');

const ACTOR = 'arbih_737th_muslim_light';
const SOURCE = 'op:busovaca:gornja_rovna';
const DESTINATION = 'op:bugojno:udurlije';
const TURNS = new Set([137, 138, 139]);
const COMMIT = '2a1554a50866af292b949d3668ae45aec4e861fa';
const BASELINE = 'runs/apr1992_definitive_188w__0b1f040ff4abe835__w139_n40';
const DEFAULT_STDERR = 'logs/prusac-diagnostic-20260929/continuation7_front_writer_campaign_20261004_runner.stderr.log';
const COLUMN_HELPERS = new Set([
    'main_phase_b',
    'rear_stack_dispersion',
    'threatened_reserve_commit',
    'empty_front_subsegment_fill',
    'shared_front_stack_deconflict',
    'must_hold_garrison_pin',
]);
const PRODUCTION_CALLSITES = new Set(['distribute-brigades-to-front', 'final-distribute-brigades-to-front']);
const MOVEMENT_REJECTION_REASONS = new Set([
    'missing_formation',
    'inactive_formation',
    'unsupported_kind',
    'posture_dig_in',
    'missing_location',
    'invalid_destination',
    'destination_equals_location',
    'routine_destination_out_of_scope',
    'no_friendly_path',
]);

function isRecord(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function isExpectedTurn138Write(completedTurn, write) {
    return completedTurn === 138
        && isRecord(write)
        && write.completed_turn === 138
        && write.formation_id === ACTOR
        && write.action_kind === 'column_order'
        && write.target_osid === DESTINATION
        && write.boundary === 'pre_write'
        && write.selection_inputs_boundary === 'post_selection_pre_write'
        && COLUMN_HELPERS.has(write.helper)
        && PRODUCTION_CALLSITES.has(write.callsite);
}
function isExpectedTurn139Rejection(completedTurn, rejection) {
    return completedTurn === 139
        && isRecord(rejection)
        && rejection.formation_id === ACTOR
        && rejection.location_osid === SOURCE
        && rejection.destination_osid === DESTINATION
        && MOVEMENT_REJECTION_REASONS.has(rejection.reason);
}

const shaText = (text) => crypto.createHash('sha256').update(text).digest('hex');
const shaFile = (file) => new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256'); const stream = fs.createReadStream(file);
    stream.on('data', (chunk) => hash.update(chunk)); stream.on('error', reject); stream.on('end', () => resolve(hash.digest('hex')));
});
function readJson(file, failures, category) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (error) { failures.push({ category, file, message: String(error?.message ?? error) }); return null; }
}
function check(checks, category, pass, details = {}) { checks.push({ category, pass, ...details }); }
function extractionStatus(value) { return value === undefined ? { status: 'unreported' } : { status: 'reported', value }; }

async function scanWeekly(dir, candidate, failures) {
    const result = { rows: 0, normalized: [], control: [], targets: {}, movement_phase_present: [] };
    const file = path.join(dir, 'weekly_report.jsonl');
    if (!fs.existsSync(file)) { failures.push({ category: 'weekly_missing', file }); return result; }
    const lines = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
    let lineNumber = 0;
    for await (const line of lines) {
        if (!line.trim()) continue;
        lineNumber++;
        let row;
        try { row = JSON.parse(line); }
        catch (error) { failures.push({ category: 'weekly_invalid_json', line: lineNumber, message: String(error?.message ?? error) }); continue; }
        result.rows++;
        result.normalized.push({ week_index: row.week_index, sha256: shaText(stableText(normalizeWeeklyRow(row))) });
        result.control.push({ week_index: row.week_index, sha256: shaText(stableText(row.control_counts)) });
        if (!candidate) continue;
        if (Object.hasOwn(row, 'movement_phase_diagnostics')) result.movement_phase_present.push(row.week_index);
        if (!TURNS.has(row.week_index)) continue;
        const fd = row.front_distribution_diagnostics;
        const invocations = Array.isArray(fd?.invocations) ? fd.invocations.filter((entry) => entry?.formation_id === ACTOR) : undefined;
        const writes = Array.isArray(fd?.writes) ? fd.writes.filter((entry) => entry?.formation_id === ACTOR) : undefined;
        const rejectionField = row.column_movement && typeof row.column_movement === 'object' && Object.hasOwn(row.column_movement, 'column_rejections')
            ? row.column_movement.column_rejections : undefined;
        const rejections = Array.isArray(rejectionField) ? rejectionField.filter((entry) => entry?.formation_id === ACTOR) : rejectionField;
        result.targets[row.week_index] = {
            front_distribution: {
                status: fd === undefined ? 'unreported' : 'reported',
                causal_proof: fd?.causal_proof ?? null,
                invocations: extractionStatus(invocations),
                writes: extractionStatus(writes),
            },
            movement_reject: extractionStatus(rejections),
        };
    }
    return result;
}
function stderrCategories(file, failures) {
    if (!fs.existsSync(file)) { failures.push({ category: 'runner_stderr_missing', file }); return null; }
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
    const count = (pattern) => lines.filter((line) => pattern.test(line)).length;
    return { lines: lines.length, critical: count(/critical/i), error: count(/\berror\b/i), twohrhb_travnik: count(/twohrhb_travnik/i), warning: count(/warn/i) };
}

async function main() {
    if (process.argv.length < 3 || process.argv.length > 5) {
        process.stderr.write('usage: node continuation7_front_writer_campaign_20261004_compare_extract.cjs CANDIDATE [BASELINE] [RUNNER_STDERR]\n');
        process.exit(2);
    }
    const candidateDir = path.resolve(process.argv[2]);
    const baselineDir = path.resolve(process.argv[3] ?? BASELINE);
    const stderrFile = path.resolve(process.argv[4] ?? DEFAULT_STDERR);
    const checks = []; const failures = [];
    const required = ['run_meta.json', 'run_summary.json', 'initial_save.json', 'final_save.json', 'weekly_report.jsonl'];
    for (const [label, dir] of [['candidate', candidateDir], ['baseline', baselineDir]]) {
        check(checks, `${label}_directory`, fs.existsSync(dir), { path: dir });
        for (const name of required) check(checks, `${label}_${name}`, fs.existsSync(path.join(dir, name)), { path: path.join(dir, name) });
    }
    const cm = readJson(path.join(candidateDir, 'run_meta.json'), failures, 'candidate_meta');
    const bm = readJson(path.join(baselineDir, 'run_meta.json'), failures, 'baseline_meta');
    const cs = readJson(path.join(candidateDir, 'run_summary.json'), failures, 'candidate_summary');
    const bs = readJson(path.join(baselineDir, 'run_summary.json'), failures, 'baseline_summary');
    check(checks, 'candidate_exact_commit', cm?.provenance?.git_commit === COMMIT, { expected: COMMIT, actual: cm?.provenance?.git_commit ?? null });
    check(checks, 'candidate_clean', cm?.provenance?.git_dirty === false, { actual: cm?.provenance?.git_dirty ?? null });
    check(checks, 'weeks_139', cm?.weeks === 139 && cs?.weeks === 139, { meta: cm?.weeks ?? null, summary: cs?.weeks ?? null });
    const ci = cm?.provenance?.consumed_inputs; const bi = bm?.provenance?.consumed_inputs;
    check(checks, 'candidate_input_count_30', Array.isArray(ci?.files) && ci.files.length === 30, { actual: ci?.files?.length ?? null });
    check(checks, 'consumed_input_manifest', stableText(ci?.files) === stableText(bi?.files));
    check(checks, 'consumed_input_digest', ci?.digest === bi?.digest, { candidate: ci?.digest ?? null, baseline: bi?.digest ?? null });
    for (const name of ['initial_save.json', 'final_save.json']) {
        try { const [a, b] = await Promise.all([shaFile(path.join(candidateDir, name)), shaFile(path.join(baselineDir, name))]); check(checks, `${name}_raw_sha256`, a === b, { candidate: a, baseline: b }); }
        catch (error) { failures.push({ category: `${name}_hash`, message: String(error?.message ?? error) }); }
    }
    check(checks, 'reported_final_hash', cs?.final_state_hash === bs?.final_state_hash, { candidate: cs?.final_state_hash ?? null, baseline: bs?.final_state_hash ?? null });
    for (const field of ['anomaly_detection', 'behavioral_health', 'op_injection_validation']) {
        check(checks, `summary_${field}`, stableText(cs?.[field]) === stableText(bs?.[field]));
    }
    const [candidateWeekly, baselineWeekly] = await Promise.all([scanWeekly(candidateDir, true, failures), scanWeekly(baselineDir, false, failures)]);
    check(checks, 'weekly_rows_139', candidateWeekly.rows === 139 && baselineWeekly.rows === 139, { candidate: candidateWeekly.rows, baseline: baselineWeekly.rows });
    check(checks, 'ordinary_weekly_rows', stableText(candidateWeekly.normalized) === stableText(baselineWeekly.normalized));
    check(checks, 'control_counts_trajectory', stableText(candidateWeekly.control) === stableText(baselineWeekly.control));
    check(checks, 'movement_phase_absent', candidateWeekly.movement_phase_present.length === 0, { turns: candidateWeekly.movement_phase_present });
    for (const turn of TURNS) {
        const observed = candidateWeekly.targets[turn]?.front_distribution;
        check(checks, `front_distribution_boundary_${turn}`, observed?.status === 'reported' && observed.invocations?.status === 'reported' && observed.writes?.status === 'reported', { actual: observed ?? { status: 'unreported' } });
    }
    const turn138Writes = candidateWeekly.targets[138]?.front_distribution?.writes;
    const matchingTurn138Writes = turn138Writes?.status === 'reported' && Array.isArray(turn138Writes.value)
        ? turn138Writes.value.filter((write) => isExpectedTurn138Write(138, write)) : [];
    check(checks, 'actor_exact_column_write_turn_138_reported', matchingTurn138Writes.length > 0, {
        matching_count: matchingTurn138Writes.length,
        actual: turn138Writes ?? { status: 'unreported' },
    });
    const turn139Reject = candidateWeekly.targets[139]?.movement_reject;
    const matchingTurn139Rejections = turn139Reject?.status === 'reported' && Array.isArray(turn139Reject.value)
        ? turn139Reject.value.filter((rejection) => isExpectedTurn139Rejection(139, rejection)) : [];
    check(checks, 'actor_exact_movement_reject_turn_139_reported', matchingTurn139Rejections.length > 0, {
        matching_count: matchingTurn139Rejections.length,
        actual: turn139Reject ?? { status: 'unreported' },
    });
    const stderr = stderrCategories(stderrFile, failures);
    check(checks, 'stderr_no_critical', stderr?.critical === 0, { actual: stderr?.critical ?? null });
    check(checks, 'stderr_no_error', stderr?.error === 0, { actual: stderr?.error ?? null });
    const failed = checks.filter((entry) => !entry.pass);
    const output = {
        verdict: failed.length === 0 && failures.length === 0 ? 'PASS_FRONT_WRITER_CAMPAIGN_COMPARISON' : 'FAIL_FRONT_WRITER_CAMPAIGN_COMPARISON',
        actor: ACTOR, candidate_run_dir: candidateDir, baseline_run_dir: baselineDir, stderr_file: stderrFile,
        checks, failures, stderr_categories: stderr, extraction: candidateWeekly.targets,
        limits: [
            'Receipts identify the production helper and available post-selection/pre-write locals, not every rejected pre-selection candidate or an internal comparator trace.',
            'An unreported rejection field is unreported, not evidence that no rejection occurred.',
            'This known-source 139-week run does not establish the original dirty n37/517th cause or close retained calibration acceptance gaps.',
        ],
    };
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    process.exit(output.verdict.startsWith('PASS_') ? 0 : 1);
}

module.exports = { isExpectedTurn138Write, isExpectedTurn139Rejection };

if (require.main === module) main().catch((error) => { process.stdout.write(`${JSON.stringify({ verdict: 'ERROR', message: String(error?.stack ?? error) }, null, 2)}\n`); process.exit(1); });
