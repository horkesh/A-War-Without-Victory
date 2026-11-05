#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const { pathToFileURL } = require('node:url');

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const strictCompare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
function assert(value, message) { if (!value) throw new Error(message); }
function absolute(root, value) { return path.isAbsolute(value) ? path.normalize(value) : path.resolve(root, value); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function write(file, value) { fs.writeFileSync(file, Buffer.isBuffer(value) ? value : jsonBytes(value), { flag: 'wx' }); }
function row(file) { const bytes = fs.readFileSync(file); return { path: file.replaceAll('\\', '/'), bytes: bytes.length, sha256: sha256(bytes) }; }
function verify(root, expected, label) {
    const actual = row(absolute(root, expected.path));
    assert(actual.bytes === expected.bytes && actual.sha256 === expected.sha256, `${label} binding mismatch`);
    return actual;
}

function packageAggregate(root) {
    const rows = [];
    const collect = (current) => {
        for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => strictCompare(a.name, b.name))) {
            const file = path.join(current, entry.name);
            if (entry.isDirectory()) collect(file);
            else if (entry.isFile()) {
                const bytes = fs.readFileSync(file);
                rows.push({ path: path.relative(root, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha256(bytes) });
            } else throw new Error(`unsupported runtime entry:${file}`);
        }
    };
    collect(root);
    const payload = rows.map((item) => `${item.path}\0${item.bytes}\0${item.sha256}\n`).join('');
    return { files: rows.length, bytes: rows.reduce((sum, item) => sum + item.bytes, 0), sha256: sha256(Buffer.from(payload)) };
}

function blockers(sim, state) {
    const result = sim.listBlockingPlayerDecisions(state);
    assert(Array.isArray(result), 'malformed public blocker inventory');
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
    return rows.filter((item) => item?.faction === faction).map((item) => ({
        turn: item.turn,
        eventId: item.event_id,
        responseId: item.response_id,
        source: item.decision_source,
    }));
}

function caReceipt(state) {
    const ca = state.military.command_authority;
    return { current: ca.current, spent_this_turn: ca.spent_this_turn, lifetime_spent: ca.lifetime_spent };
}

function rosterState(state, roster) {
    return roster.map((id) => {
        const formation = state.military.formations[id];
        assert(formation, `missing selected formation:${id}`);
        return {
            id,
            personnel: formation.personnel,
            locationOsid: formation.location_osid ?? null,
            status: formation.status ?? null,
            fatigue: formation.fatigue ?? null,
            readiness: formation.readiness ?? null,
            movementOrder: state.military.brigade_movement_orders?.[id] ?? null,
            attackOrder: state.military.brigade_attack_orders?.[id] ?? null,
            attackOrderOwner: state.military.brigade_attack_order_owners?.[id] ?? null,
        };
    });
}

function actionReceipt(state, helpers, request, roster) {
    return {
        turnBeforeAdvance: state.meta.turn,
        blockers: [],
        targetController: state.political.political_controllers[request.targetOsid] ?? null,
        commandAuthority: caReceipt(state),
        pendingDirective: state.military.corps_command[request.corpsId]?.pending_op_directive ?? null,
        operation: helpers.operationReceipt(state, request.corpsId, request.targetOsid),
        rosterState: rosterState(state, roster),
        playerPendingEvents: pendingEvents(state, state.meta.player_faction),
    };
}

function sourceFloorReceipt(root, config) {
    const war = fs.readFileSync(absolute(root, 'src/sim/turn_phases/war_phases.ts'), 'utf8');
    const constants = fs.readFileSync(absolute(root, 'src/state/formation_constants.ts'), 'utf8');
    const importShared = /import \{ isEligibleOperationFormation, MIN_ATTACK_PERSONNEL \} from '\.\.\/\.\.\/state\/formation_constants\.js';/.test(war);
    const plannerUsesSharedFloor = /\(f\.personnel \?\? 0\) >= MIN_ATTACK_PERSONNEL/.test(war);
    const sharedValue = /export const MIN_ATTACK_PERSONNEL = 500;/.test(constants);
    assert(importShared && plannerUsesSharedFloor && sharedValue, 'shared planner personnel-floor precheck failed');
    assert(config.request.minimumPersonnel === 500, 'config personnel floor mismatch');
    return { pass: true, importShared, plannerUsesSharedFloor, sharedValue, minimumPersonnel: config.request.minimumPersonnel };
}

async function run(config, evidenceDir, mode) {
    const root = path.resolve(config.root);
    assert(process.cwd().toLowerCase() === root.toLowerCase(), 'literal authorized C worktree required');
    assert(config.schema === 'awwv.t25-request-op-fork.config.v1', 'config schema mismatch');
    assert(config.status === 'HOLD_FOR_INDEPENDENT_PRELAUNCH_REVIEW_AND_ROOT_LAUNCH', 'launch status changed');
    assert(mode === 'fidelity-then-fork' && mode === config.run.mode, 'only frozen two-stage mode accepted');
    assert(config.run.wrapperCapMs === 90000 && config.run.fidelityAdvances === 1 && config.run.forkAdvances === 14 && config.run.maxTotalAdvances === 15 && config.run.retry === false, 'run bounds changed');
    assert(config.run.nativeRun === false && config.run.packageRun === false && config.run.campaign === false && config.run.queryOnly === false, 'forbidden scope enabled');
    assert(cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() === config.head, 'HEAD mismatch');
    const sourceStatus = cp.execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all', '--', 'src', 'data'], { cwd: root, encoding: 'utf8' }).trimEnd();
    assert(sourceStatus === config.expectedSourceStatus, `src/data freeze mismatch:${sourceStatus}`);
    assert(process.version === config.node.version && path.normalize(process.execPath).toLowerCase() === path.normalize(config.node.path).toLowerCase(), 'frozen Node runtime required');
    verify(root, config.node, 'Node runtime');
    const bindings = config.bindings.map((item) => verify(root, item, item.path));
    const input25 = verify(root, config.input.turn25, 'T25 input');
    const input26 = verify(root, config.input.turn26, 'T26 fidelity target');
    const native39 = verify(root, config.input.retainedNativeTurn39, 'retained native T39');
    for (const item of [config.score.reference, config.score.n91, config.score.n92]) verify(root, item, item.path);
    verify(root, config.loader, 'tsx loader');
    const runtimePackages = config.runtimePackages.map((item) => {
        const actual = packageAggregate(absolute(root, item.path));
        assert(actual.files === item.files && actual.bytes === item.bytes && actual.sha256 === item.sha256, `runtime package mismatch:${item.name}`);
        return { ...item, ...actual };
    });
    const floor = sourceFloorReceipt(root, config);

    const plannerArtifact = readJson(absolute(root, 'tmp/player-bot-capability-parity-20261024/native-t25-planner-inspection-20261026-v1/attempt-001/result.json'));
    const reviewedPlan = plannerArtifact.planner_results.find((item) => item.corps_id === config.request.corpsId && item.target_osid === config.request.targetOsid);
    assert(reviewedPlan?.full_plan_return?.ok === true, 'reviewed T25 planner contract missing');
    assert(JSON.stringify(reviewedPlan.full_plan_return.participants) === JSON.stringify(config.request.expectedRoster), 'reviewed planner roster changed');
    assert(reviewedPlan.full_plan_return.stagingOsid === config.request.expectedStagingOsid, 'reviewed planner staging changed');
    assert(reviewedPlan.roster.every((item) => item.personnel >= config.request.minimumPersonnel), 'reviewed planner roster violates shared personnel floor');

    const sim = await import(pathToFileURL(absolute(root, 'src/desktop/desktop_sim.ts')).href);
    for (const name of ['loadStateFromPath', 'serializeRuntimeState', 'serializeState', 'deserializeState', 'advanceTurn', 'queryDirectiveObjection', 'resolveDesktopEventDecision', 'listBlockingPlayerDecisions']) {
        assert(typeof sim[name] === 'function', `missing current-source public export:${name}`);
    }
    const staging = require(absolute(root, 'src/desktop/op_directive_staging.cjs'));
    assert(typeof staging.stageOpDirective === 'function', 'missing stageOpDirective owner');
    const helpers = require(absolute(root, 'logs/r8-native-calibration-parity-20261024/prefix39-diagnosis-20261026/player-order-fork-diagnostic-v1/diagnostic_entry.cjs'));

    write(path.join(evidenceDir, 'RUNTIME_PROVENANCE.json'), {
        schema: 'awwv.t25-request-op-fork.runtime-provenance.v1',
        head: config.head,
        sourceStatus,
        mode,
        input25,
        input26,
        native39,
        bindings,
        runtimePackages,
        floor,
        reviewedPlannerEvidence: {
            result: row(absolute(root, 'tmp/player-bot-capability-parity-20261024/native-t25-planner-inspection-20261026-v1/attempt-001/result.json')),
            review: row(absolute(root, 'tmp/player-bot-capability-parity-20261024/native-t25-planner-inspection-20261026-v1/review-003/INDEPENDENT_ACTUAL_RESULT_REVIEW.md')),
            roster: config.request.expectedRoster,
            stagingOsid: config.request.expectedStagingOsid,
        },
    });

    let totalAdvanceCalls = 0;
    const advanceOnce = async (state, label) => {
        totalAdvanceCalls += 1;
        assert(totalAdvanceCalls <= config.run.maxTotalAdvances, `advance bound exceeded:${label}`);
        const beforeRuntime = sim.serializeRuntimeState(state);
        const result = await sim.advanceTurn(state, root);
        assert(!result?.error, `${label} advance failed:${result?.error ?? 'unknown'}`);
        assert(sim.serializeRuntimeState(state) === beforeRuntime, `${label} mutated input state`);
        return result;
    };

    // Stage 1: one unmodified current-source advance. A mismatch stops before any query or fork action.
    const immutableT25 = fs.readFileSync(absolute(root, config.input.turn25.path));
    const expectedT26 = fs.readFileSync(absolute(root, config.input.turn26.path));
    const fidelityLoaded = await sim.loadStateFromPath(absolute(root, config.input.turn25.path), root);
    const fidelityStart = sim.deserializeState(sim.serializeRuntimeState(fidelityLoaded.state));
    const fidelityStartCanonical = Buffer.from(sim.serializeState(fidelityStart));
    assert(fidelityStartCanonical.equals(immutableT25), 'STOP_FIDELITY:T25 runtime handoff mismatch');
    assert(fidelityStart.meta.turn === 25 && blockers(sim, fidelityStart).length === 0, 'STOP_FIDELITY:T25 identity/blocker mismatch');
    write(path.join(evidenceDir, 'fidelity-start-turn-025.json'), fidelityStartCanonical);
    const fidelityAdvanced = await advanceOnce(fidelityStart, 'fidelity T25-to-T26');
    assert(fidelityAdvanced.state?.meta?.turn === 26, 'STOP_FIDELITY:wrong produced turn');
    const producedT26 = Buffer.from(sim.serializeState(fidelityAdvanced.state));
    write(path.join(evidenceDir, 'fidelity-produced-turn-026.json'), producedT26);
    write(path.join(evidenceDir, 'fidelity-report-turn-026.json'), fidelityAdvanced.report);
    const fidelityExact = producedT26.equals(expectedT26);
    write(path.join(evidenceDir, 'FIDELITY.json'), {
        schema: 'awwv.t25-request-op-fork.fidelity.v1',
        pass: fidelityExact,
        stop: fidelityExact ? null : 'NO_FORK',
        advanceCalls: 1,
        expected: { ...config.input.turn26 },
        actual: { path: 'fidelity-produced-turn-026.json', bytes: producedT26.length, sha256: sha256(producedT26) },
    });
    assert(fidelityExact, 'STOP_FIDELITY:T25_TO_T26_BYTE_MISMATCH');

    // Stage 2: load an independent fresh T25 clone; no produced fidelity state is reused.
    const forkLoaded = await sim.loadStateFromPath(absolute(root, config.input.turn25.path), root);
    let state = sim.deserializeState(sim.serializeRuntimeState(forkLoaded.state));
    const forkStartCanonical = Buffer.from(sim.serializeState(state));
    assert(state !== fidelityStart && state !== fidelityAdvanced.state, 'fork object aliases fidelity branch');
    assert(forkStartCanonical.equals(immutableT25), 'fork did not restart from immutable T25');
    assert(state.meta.turn === 25 && state.meta.player_faction === config.input.playerFaction && state.meta.autonomy_level === config.input.autonomyLevel, 'fork identity mismatch');
    write(path.join(evidenceDir, 'fork-start-turn-025.json'), forkStartCanonical);
    write(path.join(evidenceDir, 'BRANCH_ISOLATION.json'), {
        schema: 'awwv.t25-request-op-fork.branch-isolation.v1',
        pass: true,
        distinctObjectIdentities: true,
        immutableInput: input25,
        fidelityStart: { bytes: fidelityStartCanonical.length, sha256: sha256(fidelityStartCanonical) },
        forkStart: { bytes: forkStartCanonical.length, sha256: sha256(forkStartCanonical) },
        fidelityProducedT26: { bytes: producedT26.length, sha256: sha256(producedT26) },
        forkSource: 'fresh public loadStateFromPath(T25); fidelity output not passed to fork',
    });

    const request = config.request;
    assert(state.political.political_controllers[request.targetOsid] === request.targetController, 'target controller mismatch');
    assert(blockers(sim, state).length === 0, 'unexpected T25 blocker');
    const command = state.military.corps_command[request.corpsId];
    assert(command && command.active_operations.length === 0 && !command.pending_op_directive, 'request slot not free');
    assert(JSON.stringify(caReceipt(state)) === JSON.stringify(request.expectedCommandAuthority.before), 'pre-stage CA mismatch');
    for (const id of request.expectedRoster) {
        const formation = state.military.formations[id];
        assert(formation?.kind === 'brigade' && formation.corps_id === request.corpsId && formation.status === 'active', `selected roster identity mismatch:${id}`);
        assert((formation.personnel ?? 0) >= request.minimumPersonnel, `selected roster below personnel floor:${id}`);
    }

    const queryState = sim.deserializeState(sim.serializeRuntimeState(state));
    const queryBefore = sim.serializeRuntimeState(queryState);
    const objection = await sim.queryDirectiveObjection(queryState, { corpsId: request.corpsId, targetOsid: request.targetOsid }, root);
    const queryAfter = sim.serializeRuntimeState(queryState);
    assert(queryAfter === queryBefore, 'query mutated queried clone');
    assert(objection && !Object.prototype.hasOwnProperty.call(objection, 'rejectionReason'), `query rejected:${objection?.rejectionReason}`);
    assert(['launch', 'delay', 'abort'].includes(objection.recommendedAction) && Number.isFinite(objection.forceRatio) && Number.isFinite(objection.estimatedCasualties), 'query response incomplete');
    const forcedOverSoftObjection = objection.recommendedAction !== 'launch';
    const payload = { corpsId: request.corpsId, targetOsid: request.targetOsid, ...(forcedOverSoftObjection ? { forced_over_objection: true } : {}) };
    const stageResult = staging.stageOpDirective(state, payload, { unbuildableReason: objection.rejectionReason });
    assert(stageResult?.ok === true, `stage failed:${stageResult?.error ?? 'unknown'}`);
    assert(JSON.stringify(caReceipt(state)) === JSON.stringify(request.expectedCommandAuthority.afterStage), 'post-stage CA mismatch');
    const pending = state.military.corps_command[request.corpsId].pending_op_directive;
    assert(pending?.target_osid === request.targetOsid && pending?.ca_cost === request.requestCost && ((pending.forced_over_objection === true) === forcedOverSoftObjection), 'pending directive mismatch');
    state = sim.deserializeState(sim.serializeRuntimeState(state));
    const staged = Buffer.from(sim.serializeState(state));
    write(path.join(evidenceDir, 'staged-state-turn-025.json'), staged);
    write(path.join(evidenceDir, 'QUERY_AND_STAGE.json'), {
        schema: 'awwv.t25-request-op-fork.query-and-stage.v1',
        queryPurity: { pass: queryAfter === queryBefore, beforeSha256: sha256(Buffer.from(queryBefore)), afterSha256: sha256(Buffer.from(queryAfter)) },
        objection,
        softObjectionOverride: forcedOverSoftObjection,
        payload,
        stageResult,
        caBefore: request.expectedCommandAuthority.before,
        caAfter: caReceipt(state),
        pending,
        noManualRosterOrOrderOverride: true,
        reviewedExpectedPlannerRoster: request.expectedRoster,
        reviewedExpectedStagingOsid: request.expectedStagingOsid,
    });

    const expectedEvents = new Map(config.events.map((item) => [item.turn, item]));
    const eventTranscript = [];
    const turnReceipts = [];
    let priorPlayerEventLog = eventLog(state, config.input.playerFaction);
    let operation = null;
    let roster = request.expectedRoster;
    let anyMovement = false;
    let anyOwnedBattle = false;
    let captureTurn = null;
    for (let index = 0; index < config.run.forkAdvances; index += 1) {
        const before = state;
        const beforeTurn = 25 + index;
        assert(before.meta.turn === beforeTurn, `unexpected fork pre-turn:${before.meta.turn}`);
        const currentBlockers = blockers(sim, before);
        assert(currentBlockers.length === 0, `unexpected pre-advance blocker:T${beforeTurn}`);
        const action = actionReceipt(before, helpers, request, roster);
        write(path.join(evidenceDir, `action-turn-${String(beforeTurn).padStart(3, '0')}.json`), action);
        const advanced = await advanceOnce(before, `fork T${beforeTurn}-to-T${beforeTurn + 1}`);
        const turn = advanced.state?.meta?.turn;
        assert(turn === 26 + index, `unexpected produced turn:${turn}`);
        let handed = sim.deserializeState(sim.serializeRuntimeState(advanced.state));
        assert(sim.serializeState(handed) === sim.serializeState(advanced.state), `runtime handoff mismatch:T${turn}`);
        const current = helpers.operationReceipt(handed, request.corpsId, request.targetOsid);
        if (!operation) {
            assert(current, 'directive not consumed on first fork advance');
            const selected = new Set(request.expectedRoster);
            helpers.validateConsumedOperation(handed, current, config, selected);
            assert(JSON.stringify(current.roster) === JSON.stringify(request.expectedRoster), 'production injection roster differs from reviewed planner roster');
            assert(current.axes[0]?.stagingOsid === request.expectedStagingOsid, 'production injection staging differs from reviewed planner staging');
            operation = current;
            roster = current.roster;
        }
        assert(!handed.military.corps_command[request.corpsId].pending_op_directive, 'directive remained pending after first advance');
        assert(!handed.military.corps_command[request.corpsId].op_directive_rejection, `directive rejected:${handed.military.corps_command[request.corpsId].op_directive_rejection?.reason}`);
        const lineage = helpers.lineageForTurn(before, handed, advanced.report, operation.operationId, request.targetOsid, roster, config.input.playerFaction);
        anyMovement ||= lineage.moves.length > 0;
        anyOwnedBattle ||= lineage.ownedBattles.length > 0;
        if (lineage.beforeController !== config.input.playerFaction && lineage.afterController === config.input.playerFaction && captureTurn === null) captureTurn = turn;

        const pendingPlayerEvents = pendingEvents(handed, config.input.playerFaction);
        const preConsumerLog = eventLog(handed, config.input.playerFaction);
        assert(JSON.stringify(preConsumerLog) === JSON.stringify(priorPlayerEventLog), `unexplained event-log addition:T${turn}`);
        const expectedEvent = expectedEvents.get(turn);
        if (expectedEvent) {
            assert(pendingPlayerEvents.length === 1 && pendingPlayerEvents[0]?.event_id === expectedEvent.eventId, `expected event missing/reordered:T${turn}`);
            const prior = eventLog(handed, config.input.playerFaction);
            handed = sim.resolveDesktopEventDecision(handed, expectedEvent.eventId, expectedEvent.responseId, root);
            const added = eventLog(handed, config.input.playerFaction).slice(prior.length);
            assert(added.length === 1 && added[0].turn === turn && added[0].eventId === expectedEvent.eventId && added[0].responseId === expectedEvent.responseId && added[0].source === 'player', `event replay mismatch:T${turn}`);
            assert(pendingEvents(handed, config.input.playerFaction).length === 0, `event unresolved:T${turn}`);
            eventTranscript.push({ ...expectedEvent, receipt: added[0] });
            handed = sim.deserializeState(sim.serializeRuntimeState(handed));
        } else assert(pendingPlayerEvents.length === 0, `unexpected player event:T${turn}`);
        priorPlayerEventLog = eventLog(handed, config.input.playerFaction);
        assert(blockers(sim, handed).length === 0, `unresolved post-consumer blocker:T${turn}`);

        const canonical = Buffer.from(sim.serializeState(handed));
        const report = jsonBytes(advanced.report);
        const receipt = {
            turn,
            advanceCall: totalAdvanceCalls,
            action: { path: `action-turn-${String(beforeTurn).padStart(3, '0')}.json`, sha256: sha256(jsonBytes(action)) },
            operationAtEnd: current,
            lineage,
            rosterStateAtEnd: rosterState(handed, roster),
            targetControllerAtEnd: handed.political.political_controllers[request.targetOsid] ?? null,
            event: expectedEvent ?? null,
            canonical: { bytes: canonical.length, sha256: sha256(canonical) },
            report: { bytes: report.length, sha256: sha256(report) },
        };
        write(path.join(evidenceDir, `state-turn-${String(turn).padStart(3, '0')}.json`), canonical);
        write(path.join(evidenceDir, `report-turn-${String(turn).padStart(3, '0')}.json`), report);
        write(path.join(evidenceDir, `receipt-turn-${String(turn).padStart(3, '0')}.json`), receipt);
        turnReceipts.push(receipt);
        state = handed;
    }

    assert(state.meta.turn === 39 && turnReceipts.length === 14 && totalAdvanceCalls === 15, 'two-stage advance count contract failed');
    assert(JSON.stringify(eventTranscript.map(({ turn, eventId, responseId }) => ({ turn, eventId, responseId }))) === JSON.stringify(config.events), 'event transcript mismatch');
    const targetCapturedByT39 = state.political.political_controllers[request.targetOsid] === config.input.playerFaction;
    const score = helpers.scoreCandidate(root, config, state);
    const retainedNativeState = readJson(absolute(root, config.input.retainedNativeTurn39.path));
    const retainedNativeScore = helpers.scoreCandidate(root, config, retainedNativeState);
    const reference = readJson(absolute(root, config.score.reference.path)).by_settlement_id;
    const ids = Object.keys(reference).sort(strictCompare);
    const changedFromRetainedNative = ids.filter((id) => state.political.political_controllers[id] !== retainedNativeState.political.political_controllers[id]).map((id) => ({
        id,
        fork: state.political.political_controllers[id] ?? null,
        retainedNative: retainedNativeState.political.political_controllers[id] ?? null,
        reference: reference[id],
    }));
    const knownUnwaivedOsid = config.score.knownUnwaivedOsid;
    const knownUnwaived = {
        id: knownUnwaivedOsid,
        fork: state.political.political_controllers[knownUnwaivedOsid] ?? null,
        retainedNative: retainedNativeState.political.political_controllers[knownUnwaivedOsid] ?? null,
        reference: reference[knownUnwaivedOsid] ?? null,
        remainsAcceptanceGate: true,
    };
    const result = {
        schema: 'awwv.t25-request-op-fork.result.v1',
        pass: targetCapturedByT39,
        verdict: targetCapturedByT39 ? 'ORDINARY_T25_REQUEST_OP_CAPTURED_TOSICI_BY_T39' : 'ORDINARY_T25_REQUEST_OP_DID_NOT_CAPTURE_TOSICI_BY_T39',
        scope: config.scope,
        claimLimit: 'This single bounded fork tests actual corrected T25 player agency only; it does not prove old 707 achievability, waive Korenici, or qualify a campaign.',
        fidelityExact: true,
        branchIsolation: true,
        advanceCalls: { fidelity: 1, fork: 14, total: totalAdvanceCalls },
        query: { objection, softObjectionOverride: forcedOverSoftObjection },
        commandAuthority: { before: request.expectedCommandAuthority.before, afterStage: request.expectedCommandAuthority.afterStage },
        operation,
        productionRosterMatchesReviewedPlanner: JSON.stringify(operation.roster) === JSON.stringify(request.expectedRoster),
        productionStagingMatchesReviewedPlanner: operation.axes[0]?.stagingOsid === request.expectedStagingOsid,
        anyMovement,
        anyOwnedBattle,
        captureTurn,
        targetCapturedByT39,
        targetControllerAtT39: state.political.political_controllers[request.targetOsid] ?? null,
        eventTranscript,
        score,
        retainedNativeScore,
        changedFromRetainedNative,
        knownUnwaived,
        turnReceipts,
    };
    write(path.join(evidenceDir, 'RESULT.json'), result);
    process.stdout.write(`${JSON.stringify({ pass: result.pass, verdict: result.verdict, captureTurn, score: score.score, formerlyCorrectLossesN91: score.against.n91.lost.length, formerlyCorrectLossesN92: score.against.n92.lost.length, knownUnwaived })}\n`);
    if (!result.pass) process.exitCode = 2;
}

async function main() {
    const [configPath, evidenceDir, mode] = process.argv.slice(2);
    if (!configPath || !evidenceDir || !mode) {
        process.stderr.write('usage: request_op_fork_t25.cjs CONFIG.json EVIDENCE_DIR fidelity-then-fork\n');
        process.exit(3);
    }
    try {
        await run(readJson(path.resolve(configPath)), path.resolve(evidenceDir), mode);
    } catch (error) {
        const failure = { schema: 'awwv.t25-request-op-fork.failure.v1', pass: false, error: String(error?.message ?? error) };
        const output = path.join(path.resolve(evidenceDir), 'RESULT.json');
        if (!fs.existsSync(output)) write(output, failure);
        process.stderr.write(`${failure.error}\n`);
        process.exit(2);
    }
}

if (require.main === module) void main();
module.exports = { packageAggregate, run };
