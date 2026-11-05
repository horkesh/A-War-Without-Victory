#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const { pathToFileURL } = require('node:url');

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
const strictCompare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
function assert(value, message) { if (!value) throw new Error(message); }
function abs(root, value) { return path.isAbsolute(value) ? path.normalize(value) : path.resolve(root, value); }
function json(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function write(file, value) { fs.writeFileSync(file, Buffer.isBuffer(value) ? value : jsonBytes(value), { flag: 'wx' }); }
function row(file) { const bytes = fs.readFileSync(file); return { path: file.replaceAll('\\', '/'), bytes: bytes.length, sha256: sha256(bytes) }; }
function verify(root, expected, label) { const actual = row(abs(root, expected.path)); assert(actual.bytes === expected.bytes && actual.sha256 === expected.sha256, `${label} binding mismatch`); return actual; }

function diffPathsComplete(left, right) {
    const rows = [];
    const escape = (value) => String(value).replaceAll('~', '~0').replaceAll('/', '~1');
    const visit = (a, b, pointer) => {
        if (Object.is(a, b)) return;
        if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) {
            rows.push(pointer || '/');
            return;
        }
        const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort(strictCompare);
        for (const key of keys) {
            const next = `${pointer}/${escape(key)}`;
            if (!Object.prototype.hasOwnProperty.call(a, key) || !Object.prototype.hasOwnProperty.call(b, key)) rows.push(next);
            else visit(a[key], b[key], next);
        }
    };
    visit(left, right, '');
    return rows;
}

function packageAggregate(root) {
    function collect(current, rows) {
        for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => strictCompare(a.name, b.name))) {
            const file = path.join(current, entry.name);
            if (entry.isDirectory()) collect(file, rows);
            else if (entry.isFile()) {
                const bytes = fs.readFileSync(file);
                rows.push({ path: path.relative(root, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha256(bytes) });
            } else throw new Error(`unsupported runtime entry:${file}`);
        }
        return rows;
    }
    const rows = collect(root, []);
    const payload = rows.map((item) => `${item.path}\0${item.bytes}\0${item.sha256}\n`).join('');
    return { files: rows.length, bytes: rows.reduce((sum, item) => sum + item.bytes, 0), sha256: sha256(Buffer.from(payload)) };
}

function blockers(sim, state) {
    assert(typeof sim.listBlockingPlayerDecisions === 'function', 'missing public blocker inventory');
    const result = sim.listBlockingPlayerDecisions(state);
    assert(Array.isArray(result), 'malformed blocker inventory');
    return result;
}

function pendingEvents(state, faction) {
    const rows = state?.military?.pending_event_decisions;
    assert(Array.isArray(rows), 'missing pending_event_decisions');
    return rows.filter((item) => item?.faction === faction);
}

function eventLog(state, faction) {
    const rows = state?.military?.event_decision_log;
    assert(Array.isArray(rows), 'missing event_decision_log');
    return rows.filter((item) => item?.faction === faction).map((item) => ({ turn: item.turn, eventId: item.event_id, responseId: item.response_id, source: item.decision_source }));
}

function verifyPriorFidelity(root, v2) {
    const attempt = abs(root, v2.run.fidelityAttempt);
    const receipt = json(path.join(attempt, 'receipt.json'));
    const fidelity = json(path.join(attempt, 'BASELINE_FIDELITY.json'));
    const result = json(path.join(attempt, 'RESULT.json'));
    const produced = row(path.join(attempt, 'baseline-produced-turn-017.json'));
    const expectedArgv = [
        v2.node.path,
        '--import',
        pathToFileURL(v2.loader.path).href,
        path.relative(root, __filename).replaceAll('\\', '/'),
        path.relative(root, abs(root, 'logs/r8-native-calibration-parity-20261024/prefix39-diagnosis-20261026/player-order-fidelity-diagnostic-v3/CONFIG.json')).replaceAll('\\', '/'),
        '{evidenceDir}',
        'fidelity-only',
    ];
    const expectedArtifacts = ['BASELINE_FIDELITY.json', 'RESULT.json', 'RUNTIME_PROVENANCE.json', 'baseline-produced-turn-017.json', 'baseline-report-turn-017.json'];
    assert(receipt.child_exit === 0 && receipt.wrapper_exit === 0 && receipt.timed_out === false && receipt.artifact_contract?.pass === true, 'prior fidelity wrapper did not pass');
    assert(receipt.entry_script?.raw_sha256 === row(__filename).sha256 && receipt.entry_script_post?.matches_start_raw_sha256 === true, 'prior fidelity entry mismatch');
    assert(JSON.stringify(receipt.original_argv) === JSON.stringify(expectedArgv), 'prior fidelity argv mismatch');
    assert(JSON.stringify((receipt.retained_artifacts ?? []).map((item) => item.path).sort(strictCompare)) === JSON.stringify(expectedArtifacts), 'prior fidelity artifact inventory mismatch');
    assert(fidelity.pass === true && fidelity.expected?.sha256 === v2.input.turn17.sha256 && fidelity.actual?.sha256 === v2.input.turn17.sha256, 'prior fidelity result mismatch');
    assert(produced.bytes === v2.input.turn17.bytes && produced.sha256 === v2.input.turn17.sha256, 'prior fidelity produced state mismatch');
    assert(result.pass === true && result.verdict === 'CURRENT_SOURCE_T16_TO_T17_BYTE_EXACT', 'prior fidelity verdict mismatch');
    for (const artifact of receipt.retained_artifacts ?? []) {
        const actual = row(path.join(attempt, artifact.path));
        assert(actual.bytes === artifact.bytes && actual.sha256 === artifact.sha256, `prior fidelity retained artifact changed:${artifact.path}`);
    }
    return { attempt: v2.run.fidelityAttempt, receipt: row(path.join(attempt, 'receipt.json')), fidelity: row(path.join(attempt, 'BASELINE_FIDELITY.json')), produced };
}

async function run(v2, evidenceDir, mode) {
    const root = path.resolve(v2.root);
    assert(process.cwd().toLowerCase() === root.toLowerCase(), 'literal authorized C worktree required');
    assert(v2.status === 'HOLD_FOR_INDEPENDENT_PRELAUNCH_REVIEW_AND_ROOT_LAUNCH', 'v2 status changed');
    assert(cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() === v2.head, 'HEAD mismatch');
    const sourceStatus = cp.execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all', '--', 'src', 'data'], { cwd: root, encoding: 'utf8' }).trim();
    assert(sourceStatus === '', `tracked/runtime source tree is not frozen:${sourceStatus}`);
    const configRow = verify(root, v2.baseV1.config, 'v1 config');
    const helperRow = verify(root, v2.baseV1.helpers, 'v1 helper');
    const rejectedV1 = json(configRow.path);
    assert(rejectedV1.head === v2.head && rejectedV1.run.maxCandidateAdvances === v2.run.maxCandidateAdvances, 'base record mismatch');
    assert(rejectedV1.bindings.some((item) => item.path === 'dist/desktop/desktop_sim.cjs'), 'v1 stale-bundle record missing');
    const consumedBindings = v2.bindings.map((item) => verify(root, item, item.path));
    for (const item of [v2.node, v2.input.turn16, v2.input.turn17, v2.input.retainedNativeTurn39, v2.score.reference, v2.score.n91, v2.score.n92, v2.score.rejectedV1WrongCohort]) verify(root, item, item.path);
    const runtimePackages = v2.runtimePackages.map((item) => {
        const actual = packageAggregate(abs(root, item.path));
        assert(actual.files === item.files && actual.bytes === item.bytes && actual.sha256 === item.sha256, `runtime package mismatch:${item.name}`);
        return { ...item, ...actual };
    });
    const loader = verify(root, v2.loader, 'tsx loader');

    const helpers = require(helperRow.path);
    const sim = await import(pathToFileURL(abs(root, v2.currentSource)).href);
    for (const name of ['loadStateFromPath', 'serializeRuntimeState', 'serializeState', 'deserializeState', 'advanceTurn', 'queryDirectiveObjection', 'resolveDesktopEventDecision', 'listBlockingPlayerDecisions']) assert(typeof sim[name] === 'function', `missing current-source public export:${name}`);
    const staging = require(abs(root, 'src/desktop/op_directive_staging.cjs'));
    assert(typeof staging.stageOpDirective === 'function', 'missing staging owner');
    assert(mode === 'fidelity-only', 'v3 is fidelity-only; fork mode is disabled and has no launcher');
    write(path.join(evidenceDir, 'RUNTIME_PROVENANCE.json'), { head: v2.head, mode, sourceStatus, currentSource: row(abs(root, v2.currentSource)), loader, runtimePackages, consumedBindings, excludedStaleBundle: 'dist/desktop/desktop_sim.cjs', baseV1: { configRow, helperRow, verdict: v2.baseV1.reviewVerdict } });

    if (mode === 'fidelity-only') {
        // Sole baseline advance. This invocation cannot query, stage, or enter the fork loop.
        const loadedBaseline = await sim.loadStateFromPath(abs(root, v2.input.turn16.path), root);
        const baselineStart = sim.deserializeState(sim.serializeRuntimeState(loadedBaseline.state));
        assert(Buffer.from(sim.serializeState(baselineStart)).equals(fs.readFileSync(abs(root, v2.input.turn16.path))), 'STOP_FIDELITY:T16_HANDOFF');
        assert(blockers(sim, baselineStart).length === 0, 'STOP_FIDELITY:T16_BLOCKERS');
        const baselineAdvance = await sim.advanceTurn(baselineStart, root);
        assert(!baselineAdvance?.error && baselineAdvance.state?.meta?.turn === 17, `STOP_FIDELITY:ADVANCE:${baselineAdvance?.error ?? 'wrong_turn'}`);
        const produced = Buffer.from(sim.serializeState(baselineAdvance.state));
        const expected = fs.readFileSync(abs(root, v2.input.turn17.path));
        write(path.join(evidenceDir, 'baseline-report-turn-017.json'), baselineAdvance.report);
        write(path.join(evidenceDir, 'baseline-produced-turn-017.json'), produced);
        const exact = produced.equals(expected);
        const differingPaths = exact ? [] : diffPathsComplete(JSON.parse(expected), JSON.parse(produced));
        write(path.join(evidenceDir, 'BASELINE_FIDELITY.json'), { pass: exact, stop: exact ? null : 'NO_FORK', expected: { bytes: expected.length, sha256: sha256(expected) }, actual: { bytes: produced.length, sha256: sha256(produced) }, differingPathCount: differingPaths.length, differingPaths });
        if (!exact) throw new Error('STOP_FIDELITY:T16_TO_T17_BYTE_MISMATCH');
        write(path.join(evidenceDir, 'RESULT.json'), { schema: 'awwv.player-order-fidelity-v3.result.v1', pass: true, verdict: 'CURRENT_SOURCE_T16_TO_T17_BYTE_EXACT', scope: v2.scope, head: v2.head, mode, expected: v2.input.turn17, actual: { bytes: produced.length, sha256: sha256(produced) } });
        process.stdout.write(`${JSON.stringify({ pass: true, verdict: 'CURRENT_SOURCE_T16_TO_T17_BYTE_EXACT' })}\n`);
        return;
    }

    // Full fork is disabled until the separate preserved fidelity-only attempt passes.
    const priorFidelity = verifyPriorFidelity(root, v2);

    const request = v2.request;
    const loaded = await sim.loadStateFromPath(abs(root, v2.input.turn16.path), root);
    let state = sim.deserializeState(sim.serializeRuntimeState(loaded.state));
    assert(state.meta.turn === 16 && state.meta.player_faction === v2.input.playerFaction && state.meta.autonomy_level === v2.input.autonomyLevel, 'fork identity mismatch');
    assert(state.political.political_controllers[request.targetOsid] === request.targetController, 'target controller mismatch');
    const command = state.military.corps_command[request.corpsId];
    assert(command && command.active_operations.length === 0 && !command.pending_op_directive, 'request slot not free');
    const committed = new Set();
    for (const corps of Object.values(state.military.corps_command)) for (const op of corps?.active_operations ?? []) {
        for (const id of op?.participating_brigades ?? []) committed.add(id);
        for (const axis of op?.axes ?? []) for (const id of axis?.assigned_brigades ?? []) committed.add(id);
    }
    const eligible = new Set(Object.values(state.military.formations).filter((f) => f?.kind === 'brigade' && f?.corps_id === request.corpsId && f?.status === 'active' && !committed.has(f.id)).map((f) => f.id));
    assert(eligible.size === request.expectedInitialEligible, 'unexpected initial uncommitted 4th Corps pool');
    const circle = state.military.corps_command[request.crossCorpsOverlap.corpsId]?.active_operations ?? [];
    assert(circle.some((op) => op?.name === request.crossCorpsOverlap.operationName && (op.axes ?? []).some((axis) => (axis.objectives ?? []).includes(request.targetOsid))), 'cross-corps Circle overlap missing');
    const caBefore = structuredClone(state.military.command_authority);
    assert(JSON.stringify({ current: caBefore.current, spent_this_turn: caBefore.spent_this_turn, lifetime_spent: caBefore.lifetime_spent }) === JSON.stringify(request.expectedCommandAuthority.before), 'pre-stage CA mismatch');
    const queryState = sim.deserializeState(sim.serializeRuntimeState(state));
    const queryBefore = sim.serializeRuntimeState(queryState);
    const objection = await sim.queryDirectiveObjection(queryState, { corpsId: request.corpsId, targetOsid: request.targetOsid }, root);
    const queryAfter = sim.serializeRuntimeState(queryState);
    assert(queryAfter === queryBefore, 'query mutated queried clone');
    assert(objection && !Object.prototype.hasOwnProperty.call(objection, 'rejectionReason'), `query rejection:${objection?.rejectionReason}`);
    assert(['launch', 'delay', 'abort'].includes(objection.recommendedAction) && Number.isFinite(objection.forceRatio) && Number.isFinite(objection.estimatedCasualties), 'missing query physics/recommendation');
    const forced = objection.recommendedAction !== 'launch';
    const payload = { corpsId: request.corpsId, targetOsid: request.targetOsid, ...(forced ? { forced_over_objection: true } : {}) };
    const stageResult = staging.stageOpDirective(state, payload, { unbuildableReason: objection.rejectionReason });
    assert(stageResult?.ok === true, `stage failed:${stageResult?.error ?? 'unknown'}`);
    const caAfter = structuredClone(state.military.command_authority);
    assert(JSON.stringify({ current: caAfter.current, spent_this_turn: caAfter.spent_this_turn, lifetime_spent: caAfter.lifetime_spent }) === JSON.stringify(request.expectedCommandAuthority.afterStage), 'post-stage CA mismatch');
    const pending = structuredClone(state.military.corps_command[request.corpsId].pending_op_directive);
    assert(pending?.target_osid === request.targetOsid && pending?.ca_cost === request.requestCost && ((pending.forced_over_objection === true) === forced), 'pending/force-confirm mismatch');
    state = sim.deserializeState(sim.serializeRuntimeState(state));
    write(path.join(evidenceDir, 'QUERY_AND_STAGE.json'), { queryPurity: { pass: queryAfter === queryBefore, beforeSha256: sha256(Buffer.from(queryBefore)), afterSha256: sha256(Buffer.from(queryAfter)) }, objection, forced, payload, stageResult, caBefore, caAfter, pending, crossCorpsOverlap: request.crossCorpsOverlap });

    const expectedEvents = new Map(v2.events.map((item) => [item.turn, item]));
    const eventTranscript = [];
    const turnReceipts = [];
    let operation = null;
    let roster = [];
    let moved = false;
    let fought = false;
    for (let index = 0; index < v2.run.maxCandidateAdvances; index += 1) {
        const before = state;
        assert(blockers(sim, before).length === 0, `unexpected pre-advance blocker:T${before.meta.turn}`);
        const beforeRuntime = sim.serializeRuntimeState(before);
        const advanced = await sim.advanceTurn(before, root);
        assert(!advanced?.error && sim.serializeRuntimeState(before) === beforeRuntime, `advance failure/mutation:T${before.meta.turn}`);
        const turn = advanced.state?.meta?.turn;
        assert(turn === 17 + index, `unexpected turn:${turn}`);
        let handed = sim.deserializeState(sim.serializeRuntimeState(advanced.state));
        assert(sim.serializeState(handed) === sim.serializeState(advanced.state), `handoff mismatch:T${turn}`);
        const current = helpers.operationReceipt(handed, request.corpsId, request.targetOsid);
        if (!operation) {
            assert(current, 'directive not consumed on first advance');
            helpers.validateConsumedOperation(handed, current, v2, eligible);
            operation = current;
            roster = current.roster;
        }
        assert(!handed.military.corps_command[request.corpsId].pending_op_directive, 'directive not consumed once');
        assert(!handed.military.corps_command[request.corpsId].op_directive_rejection, `directive rejected:${handed.military.corps_command[request.corpsId].op_directive_rejection?.reason}`);
        const lineage = helpers.lineageForTurn(before, handed, advanced.report, operation.operationId, request.targetOsid, roster, v2.input.playerFaction);
        moved ||= lineage.moves.length > 0;
        fought ||= lineage.ownedBattles.length > 0;
        const pending = pendingEvents(handed, v2.input.playerFaction);
        const expectedEvent = expectedEvents.get(turn);
        if (expectedEvent) {
            assert(pending.length === 1 && pending[0]?.event_id === expectedEvent.eventId, `event missing/reordered:T${turn}`);
            const prior = eventLog(handed, v2.input.playerFaction);
            handed = sim.resolveDesktopEventDecision(handed, expectedEvent.eventId, expectedEvent.responseId, root);
            const added = eventLog(handed, v2.input.playerFaction).slice(prior.length);
            assert(added.length === 1 && added[0].turn === turn && added[0].eventId === expectedEvent.eventId && added[0].responseId === expectedEvent.responseId && added[0].source === 'player', `event consumer mismatch:T${turn}`);
            assert(pendingEvents(handed, v2.input.playerFaction).length === 0, `event unresolved:T${turn}`);
            eventTranscript.push({ ...expectedEvent, receipt: added[0] });
            handed = sim.deserializeState(sim.serializeRuntimeState(handed));
        } else assert(pending.length === 0, `unexpected player event:T${turn}`);
        assert(blockers(sim, handed).length === 0, `unresolved blocker:T${turn}`);
        const canonical = Buffer.from(sim.serializeState(handed));
        const report = jsonBytes(advanced.report);
        const receipt = { turn, operation: current, lineage, event: expectedEvent ?? null, canonical: { bytes: canonical.length, sha256: sha256(canonical) }, report: { bytes: report.length, sha256: sha256(report) } };
        write(path.join(evidenceDir, `state-turn-${String(turn).padStart(3, '0')}.json`), canonical);
        write(path.join(evidenceDir, `report-turn-${String(turn).padStart(3, '0')}.json`), report);
        write(path.join(evidenceDir, `receipt-turn-${String(turn).padStart(3, '0')}.json`), receipt);
        turnReceipts.push(receipt);
        state = handed;
        if (turn === 39) break;
    }
    assert(state.meta.turn === 39 && turnReceipts.length === 23, 'did not reach T39 exactly');
    assert(JSON.stringify(eventTranscript.map(({ turn, eventId, responseId }) => ({ turn, eventId, responseId }))) === JSON.stringify(v2.events), 'event transcript mismatch');
    assert(moved && fought, 'delivery lineage incomplete');
    const retainedNativeScore = helpers.scoreCandidate(root, v2, json(abs(root, v2.input.retainedNativeTurn39.path)));
    assert(retainedNativeScore.score === v2.score.retainedNativeBaselineScore, 'retained native 704 score changed');
    for (const name of ['n91', 'n92']) assert(JSON.stringify(retainedNativeScore.against[name].lost.map((item) => item.id)) === JSON.stringify(v2.score.retainedNativeExpectedLossIds), `retained native ${name} loss contract changed`);
    const rejectedV1WrongCohortScore = helpers.scoreCandidate(root, v2, json(abs(root, v2.score.rejectedV1WrongCohort.path)));
    assert(rejectedV1WrongCohortScore.score === v2.score.rejectedV1WrongCohort.score, 'rejected v1 705 comparator changed');
    const score = helpers.scoreCandidate(root, v2, state);
    const result = { schema: 'awwv.player-order-fork-diagnostic-v2.result.v2', pass: score.pass, verdict: score.pass ? 'PLAYER_FORK_MEETS_T39_ACCEPTANCE' : 'PLAYER_FORK_FAILS_T39_ACCEPTANCE', scope: v2.scope, head: v2.head, baselineFidelity: true, priorFidelity, queryDerivedForce: forced, operation, moved, fought, eventTranscript, retainedNativeScore, rejectedV1WrongCohortScore, score, advances: turnReceipts.length, stoppedAtTurn: state.meta.turn, turnReceipts };
    write(path.join(evidenceDir, 'RESULT.json'), result);
    process.stdout.write(`${JSON.stringify({ pass: result.pass, verdict: result.verdict, score: score.score, n91Losses: score.against.n91.lost.length, n92Losses: score.against.n92.lost.length })}\n`);
    if (!result.pass) process.exitCode = 2;
}

async function main() {
    const [configPath, evidenceDir, mode] = process.argv.slice(2);
    if (!configPath || !evidenceDir || !mode) { process.stderr.write('usage: diagnostic_entry_v3.cjs CONFIG.json EVIDENCE_DIR MODE\n'); process.exit(3); }
    try { await run(json(path.resolve(configPath)), path.resolve(evidenceDir), mode); }
    catch (error) {
        const failure = { schema: 'awwv.player-order-fidelity-diagnostic-v3.failure.v1', pass: false, error: String(error?.message ?? error) };
        const output = path.join(path.resolve(evidenceDir), 'RESULT.json');
        if (!fs.existsSync(output)) write(output, failure);
        process.stderr.write(`${failure.error}\n`);
        process.exit(2);
    }
}

if (require.main === module) void main();
module.exports = { packageAggregate, run };
