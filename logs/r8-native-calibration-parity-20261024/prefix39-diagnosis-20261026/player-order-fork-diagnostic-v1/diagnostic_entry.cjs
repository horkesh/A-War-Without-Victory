#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
const strictCompare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
function assert(value, message) { if (!value) throw new Error(message); }
function absolute(root, value) { return path.isAbsolute(value) ? path.normalize(value) : path.resolve(root, value); }
function writeExclusive(file, bytes) { fs.writeFileSync(file, bytes, { flag: 'wx' }); }
function fileRow(file) { const bytes = fs.readFileSync(file); return { path: file.replaceAll('\\', '/'), bytes: bytes.length, sha256: sha256(bytes) }; }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

function verifyRow(root, row, label) {
    const actual = fileRow(absolute(root, row.path));
    assert(actual.bytes === row.bytes, `${label} byte mismatch`);
    assert(actual.sha256 === row.sha256, `${label} sha256 mismatch`);
    return actual;
}

function diffPaths(left, right, pointer = '', rows = [], limit = 5000) {
    if (rows.length >= limit || Object.is(left, right)) return rows;
    const leftObject = left !== null && typeof left === 'object';
    const rightObject = right !== null && typeof right === 'object';
    if (!leftObject || !rightObject || Array.isArray(left) !== Array.isArray(right)) {
        rows.push({ path: pointer || '/', leftType: left === null ? 'null' : typeof left, rightType: right === null ? 'null' : typeof right });
        return rows;
    }
    const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort(strictCompare);
    for (const key of keys) {
        if (rows.length >= limit) break;
        const child = `${pointer}/${String(key).replaceAll('~', '~0').replaceAll('/', '~1')}`;
        if (!Object.prototype.hasOwnProperty.call(left, key)) rows.push({ path: child, kind: 'added' });
        else if (!Object.prototype.hasOwnProperty.call(right, key)) rows.push({ path: child, kind: 'removed' });
        else diffPaths(left[key], right[key], child, rows, limit);
    }
    return rows;
}

function playerBlockers(sim, state) {
    assert(typeof sim.listBlockingPlayerDecisions === 'function', 'missing public blocker inventory');
    const rows = sim.listBlockingPlayerDecisions(state);
    assert(Array.isArray(rows), 'malformed blocker inventory');
    return structuredClone(rows);
}

function pendingPlayerEvents(state, faction) {
    const rows = state?.military?.pending_event_decisions;
    assert(Array.isArray(rows), 'missing pending_event_decisions');
    return rows.filter((row) => row?.faction === faction);
}

function eventLog(state, faction) {
    const rows = state?.military?.event_decision_log;
    assert(Array.isArray(rows), 'missing event_decision_log');
    return rows.filter((row) => row?.faction === faction).map((row) => ({
        turn: row.turn,
        eventId: row.event_id,
        responseId: row.response_id,
        source: row.decision_source,
    }));
}

function requestedOperation(state, corpsId, targetOsid) {
    const command = state?.military?.corps_command?.[corpsId];
    assert(command && Array.isArray(command.active_operations), 'corps command operation list missing');
    const matches = command.active_operations.filter((op) => op?.requested_by_president === true
        && (op?.axes ?? []).some((axis) => (axis?.objectives ?? []).includes(targetOsid)));
    assert(matches.length <= 1, 'multiple matching presidential operations');
    return matches[0] ?? null;
}

function operationReceipt(state, corpsId, targetOsid) {
    const op = requestedOperation(state, corpsId, targetOsid);
    if (!op) return null;
    const roster = [...new Set(Array.isArray(op.participating_brigades) ? op.participating_brigades : [])].sort(strictCompare);
    return {
        operationId: `${corpsId}:${op.name}:t${op.started_turn}`,
        name: op.name,
        type: op.type,
        phase: op.phase,
        startedTurn: op.started_turn,
        requestedByPresident: op.requested_by_president === true,
        forced: op.was_force_launched === true,
        commanderOfficerId: op.commander_officer_id ?? null,
        roster,
        axes: (op.axes ?? []).map((axis) => ({
            axisId: axis.axis_id,
            stagingOsid: axis.staging_osid ?? null,
            objectives: axis.objectives ?? [],
            assignedBrigades: [...(axis.assigned_brigades ?? [])].sort(strictCompare),
        })),
    };
}

function validateConsumedOperation(state, receipt, config, initialEligible) {
    const request = config.request;
    assert(receipt?.type === 'sector_attack' && receipt?.requestedByPresident === true, 'CONSUMER_OPERATION_KIND_INVALID');
    assert(typeof receipt.commanderOfficerId === 'string' && receipt.commanderOfficerId.length > 0, 'CONSUMER_COMMANDER_MISSING');
    assert(receipt.roster.length >= request.minimumRoster && receipt.roster.length <= request.maximumRoster, 'CONSUMER_ROSTER_COUNT_INVALID');
    assert(JSON.stringify(receipt.roster) === JSON.stringify([...receipt.roster].sort(strictCompare)), 'CONSUMER_ROSTER_NOT_CANONICAL');
    for (const id of receipt.roster) {
        assert(initialEligible.has(id), `ROSTER_NOT_INITIAL_UNCOMMITTED_SAME_CORPS:${id}`);
        const formation = state?.military?.formations?.[id];
        assert(formation?.kind === 'brigade' && formation?.corps_id === request.corpsId, `ROSTER_WRONG_CORPS:${id}`);
    }
    assert(receipt.axes.length === 1, 'CONSUMER_AXIS_COUNT_INVALID');
    const axis = receipt.axes[0];
    assert(axis.stagingOsid === request.expectedStagingOsid, 'CONSUMER_STAGING_INVALID');
    assert(JSON.stringify(axis.objectives) === JSON.stringify([request.targetOsid]), 'CONSUMER_OBJECTIVE_INVALID');
    assert(JSON.stringify(axis.assignedBrigades) === JSON.stringify(receipt.roster), 'CONSUMER_AXIS_ROSTER_MISMATCH');
}

function battleRows(report) {
    const rows = report?.details?.attack_resolution_osid?.battles;
    assert(Array.isArray(rows), 'missing actual attack_resolution_osid battles');
    return rows;
}

function lineageForTurn(before, after, report, operationId, targetOsid, roster, playerFaction) {
    const rosterSet = new Set(roster);
    const summary = (after.turn_summaries ?? []).find((row) => row?.turn === after.meta.turn);
    assert(summary && Array.isArray(summary.movements), 'missing turn movement summary');
    const moves = roster.flatMap((id) => {
        const from = before.military.formations[id]?.location_osid ?? null;
        const to = after.military.formations[id]?.location_osid ?? null;
        if (from === to) return [];
        const receipts = summary.movements.filter((row) => row?.formation_id === id);
        assert(receipts.length > 0, `MOVEMENT_LINEAGE_MISSING:${id}`);
        return [{ formationId: id, from, to, receipts }];
    });
    const ownedBattles = battleRows(report).filter((battle) => {
        const attackers = battle?.attacker_brigades ?? [battle?.attacker_brigade];
        return battle?.target_osid === targetOsid
            && (battle?.operation_id === operationId || battle?.contributing_operation_ids?.includes(operationId))
            && attackers.some((id) => rosterSet.has(id));
    });
    for (const battle of ownedBattles) {
        assert(typeof battle.attacker_won === 'boolean' && typeof battle.outcome === 'string', 'BATTLE_LINEAGE_INCOMPLETE');
        assert(battle.attacker_faction === playerFaction, 'BATTLE_ATTACKER_FACTION_INVALID');
    }
    const beforeController = before.political.political_controllers[targetOsid] ?? null;
    const afterController = after.political.political_controllers[targetOsid] ?? null;
    const controlEvents = (after.political.control_events ?? []).filter((row) => row?.turn === after.meta.turn
        && (row?.osid === targetOsid || row?.target_osid === targetOsid || row?.settlement_id === targetOsid));
    if (afterController !== beforeController) {
        assert(afterController === playerFaction, 'CONTROL_LINEAGE_UNEXPECTED_CONTROLLER');
        assert(ownedBattles.some((battle) => battle.attacker_won === true && battle.defender_faction === beforeController), 'CONTROL_LINEAGE_NO_OWNED_WIN');
        assert(controlEvents.length > 0, 'CONTROL_LINEAGE_EVENT_MISSING');
    }
    return { turn: after.meta.turn, moves, ownedBattles, beforeController, afterController, controlEvents };
}

function scoreCandidate(root, config, state) {
    const reference = readJson(absolute(root, config.score.reference.path)).by_settlement_id;
    const ids = Object.keys(reference).sort(strictCompare);
    assert(ids.length === config.score.denominator, 'reference denominator changed');
    const candidate = state?.political?.political_controllers ?? {};
    const against = {};
    for (const name of ['n91', 'n92']) {
        const baseline = readJson(absolute(root, config.score[name].path)).political?.political_controllers ?? {};
        const formerlyCorrect = ids.filter((id) => baseline[id] === reference[id]);
        const lost = formerlyCorrect.filter((id) => candidate[id] !== reference[id]).map((id) => ({ id, expected: reference[id], baseline: baseline[id], candidate: candidate[id] ?? null }));
        against[name] = { formerlyCorrect: formerlyCorrect.length, lost };
    }
    const score = ids.filter((id) => candidate[id] === reference[id]).length;
    return { score, denominator: ids.length, floor: config.score.minimum, against, pass: score >= config.score.minimum && against.n91.lost.length === 0 && against.n92.lost.length === 0 };
}

async function run(config, evidenceDir) {
    const root = path.resolve(config.root);
    assert(path.normalize(process.cwd()).toLowerCase() === path.normalize(root).toLowerCase(), 'literal authorized C worktree required');
    assert(config.status === 'HOLD_FOR_INDEPENDENT_PRELAUNCH_REVIEW_AND_ROOT_LAUNCH', 'config status changed');
    assert(config.run.wrapperCapMs === 180000 && config.run.maxCandidateAdvances === 23 && config.run.retry === false, 'run budget changed');
    assert(fs.statSync(evidenceDir, { throwIfNoEntry: false })?.isDirectory(), 'wrapper attempt directory missing');
    const head = cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    assert(head === config.head, 'HEAD mismatch');
    assert(process.version === config.node.version && path.normalize(process.execPath).toLowerCase() === path.normalize(config.node.path).toLowerCase(), 'Node runtime mismatch');
    verifyRow(root, config.node, 'Node runtime');
    const bindings = config.bindings.map((row) => verifyRow(root, row, `binding ${row.path}`));
    const t16Row = verifyRow(root, config.input.turn16, 'turn16');
    const t17Row = verifyRow(root, config.input.turn17, 'turn17');
    const native39Row = verifyRow(root, config.input.nativeTurn39, 'native turn39');
    verifyRow(root, config.score.reference, 'reference');
    verifyRow(root, config.score.n91, 'n91');
    verifyRow(root, config.score.n92, 'n92');

    const sim = require(absolute(root, 'dist/desktop/desktop_sim.cjs'));
    for (const name of ['loadStateFromPath', 'serializeRuntimeState', 'serializeState', 'deserializeState', 'advanceTurn', 'queryDirectiveObjection', 'resolveDesktopEventDecision', 'listBlockingPlayerDecisions']) {
        assert(typeof sim[name] === 'function', `missing public desktop export ${name}`);
    }
    const staging = require(absolute(root, 'src/desktop/op_directive_staging.cjs'));
    assert(typeof staging.stageOpDirective === 'function', 'missing stageOpDirective owner');

    // Gate 1: the sole baseline advance. On mismatch retain complete produced state plus full differing paths and stop.
    const loadedBaseline = await sim.loadStateFromPath(absolute(root, config.input.turn16.path), root);
    const baselineStart = sim.deserializeState(sim.serializeRuntimeState(loadedBaseline.state));
    assert(Buffer.from(sim.serializeState(baselineStart), 'utf8').equals(fs.readFileSync(absolute(root, config.input.turn16.path))), 'STOP_FIDELITY:T16 runtime handoff mismatch');
    assert(playerBlockers(sim, baselineStart).length === 0, 'STOP_FIDELITY:T16 blockers present');
    const baselineAdvance = await sim.advanceTurn(baselineStart, root);
    assert(!baselineAdvance?.error && baselineAdvance.state?.meta?.turn === 17, `STOP_FIDELITY:baseline advance failed:${baselineAdvance?.error ?? 'wrong turn'}`);
    const producedT17 = Buffer.from(sim.serializeState(baselineAdvance.state), 'utf8');
    const expectedT17 = fs.readFileSync(absolute(root, config.input.turn17.path));
    writeExclusive(path.join(evidenceDir, 'baseline-report-turn-017.json'), jsonBytes(baselineAdvance.report));
    writeExclusive(path.join(evidenceDir, 'baseline-produced-turn-017.json'), producedT17);
    const baselineExact = producedT17.equals(expectedT17);
    writeExclusive(path.join(evidenceDir, 'BASELINE_FIDELITY.json'), jsonBytes({
        schema: 'awwv.player-order-fork-diagnostic-v1.baseline-fidelity.v1',
        pass: baselineExact,
        stop: baselineExact ? null : 'NO_FORK',
        turn16: t16Row,
        expected: { ...t17Row, bytes: expectedT17.length, sha256: sha256(expectedT17) },
        actual: { path: 'baseline-produced-turn-017.json', bytes: producedT17.length, sha256: sha256(producedT17) },
        differingPaths: baselineExact ? [] : diffPaths(JSON.parse(expectedT17), JSON.parse(producedT17)),
    }));
    if (!baselineExact) throw new Error('STOP_FIDELITY:T16_TO_T17_BYTE_MISMATCH');

    // Gate 2: restart from immutable T16, query a fresh clone, and stage exactly once through the IPC owner.
    const loadedFork = await sim.loadStateFromPath(absolute(root, config.input.turn16.path), root);
    let state = sim.deserializeState(sim.serializeRuntimeState(loadedFork.state));
    const request = config.request;
    assert(state.meta.turn === 16 && state.meta.player_faction === config.input.playerFaction && state.meta.autonomy_level === config.input.autonomyLevel, 'fork identity mismatch');
    assert(state.political.political_controllers[request.targetOsid] === request.targetController, 'target controller mismatch');
    const caBefore = structuredClone(state.military.command_authority);
    assert(JSON.stringify({ current: caBefore.current, spent_this_turn: caBefore.spent_this_turn, lifetime_spent: caBefore.lifetime_spent }) === JSON.stringify(request.expectedCommandAuthority.before), 'pre-stage CA mismatch');
    const command = state.military.corps_command[request.corpsId];
    assert(command && Array.isArray(command.active_operations) && command.active_operations.length === 0 && !command.pending_op_directive, '4th Corps request slot not free');
    const committedAnywhere = new Set();
    for (const corpsState of Object.values(state.military.corps_command)) {
        for (const op of corpsState?.active_operations ?? []) {
            for (const id of op?.participating_brigades ?? []) committedAnywhere.add(id);
            for (const axis of op?.axes ?? []) for (const id of axis?.assigned_brigades ?? []) committedAnywhere.add(id);
        }
    }
    const initialEligible = new Set(Object.values(state.military.formations).filter((f) => f?.kind === 'brigade'
        && f?.corps_id === request.corpsId && f?.status === 'active' && !committedAnywhere.has(f.id)).map((f) => f.id));
    assert(initialEligible.size === 10, 'unexpected 4th Corps active brigade pool');
    const circleCommand = state.military.corps_command[request.crossCorpsOverlap.corpsId];
    assert((circleCommand.active_operations ?? []).some((op) => op?.name === request.crossCorpsOverlap.operationName && (op.axes ?? []).some((axis) => (axis.objectives ?? []).includes(request.targetOsid))), 'expected cross-corps Circle overlap missing');

    const beforeQuery = sim.serializeRuntimeState(state);
    const objection = await sim.queryDirectiveObjection(sim.deserializeState(beforeQuery), { corpsId: request.corpsId, targetOsid: request.targetOsid }, root);
    assert(sim.serializeRuntimeState(state) === beforeQuery, 'query mutated caller state');
    assert(objection && typeof objection === 'object', 'missing objection result');
    assert(!Object.prototype.hasOwnProperty.call(objection, 'rejectionReason'), `query hard rejection:${objection.rejectionReason}`);
    assert(['launch', 'delay', 'abort'].includes(objection.recommendedAction), 'invalid query recommendation');
    assert(Number.isFinite(objection.forceRatio) && Number.isFinite(objection.estimatedCasualties), 'missing query physics');
    const forced = objection.recommendedAction !== 'launch';
    const payload = { corpsId: request.corpsId, targetOsid: request.targetOsid, ...(forced ? { forced_over_objection: true } : {}) };
    const stageResult = staging.stageOpDirective(state, payload, { unbuildableReason: objection.rejectionReason });
    assert(stageResult?.ok === true, `stage failed:${stageResult?.error ?? 'unknown'}`);
    const caAfter = structuredClone(state.military.command_authority);
    assert(JSON.stringify({ current: caAfter.current, spent_this_turn: caAfter.spent_this_turn, lifetime_spent: caAfter.lifetime_spent }) === JSON.stringify(request.expectedCommandAuthority.afterStage), 'post-stage CA mismatch');
    const pending = structuredClone(state.military.corps_command[request.corpsId].pending_op_directive);
    assert(pending?.target_osid === request.targetOsid && pending?.ca_cost === request.requestCost, 'pending directive mismatch');
    assert((pending?.forced_over_objection === true) === forced, 'query-derived force flag mismatch');
    state = sim.deserializeState(sim.serializeRuntimeState(state));
    assert(state.military.corps_command[request.corpsId].pending_op_directive?.target_osid === request.targetOsid, 'staging runtime handoff mismatch');
    writeExclusive(path.join(evidenceDir, 'QUERY_AND_STAGE.json'), jsonBytes({ objection, forced, payload, stageResult, caBefore, caAfter, pending, crossCorpsOverlap: request.crossCorpsOverlap }));

    const eventTranscript = [];
    const expectedEvents = new Map(config.events.map((row) => [row.turn, row]));
    let operation = null;
    let roster = [];
    let movementObserved = false;
    let combatObserved = false;
    const turnReceipts = [];
    for (let index = 0; index < config.run.maxCandidateAdvances; index += 1) {
        const before = state;
        assert(playerBlockers(sim, before).length === 0, `unexpected pre-advance blocker at T${before.meta.turn}`);
        const beforeRuntime = sim.serializeRuntimeState(before);
        const advanced = await sim.advanceTurn(before, root);
        assert(!advanced?.error, `advance failed:${advanced?.error ?? 'unknown'}`);
        assert(sim.serializeRuntimeState(before) === beforeRuntime, 'advance mutated caller state');
        const turn = advanced.state?.meta?.turn;
        assert(turn === 17 + index, `unexpected returned turn:${turn}`);
        let handed = sim.deserializeState(sim.serializeRuntimeState(advanced.state));
        assert(sim.serializeState(handed) === sim.serializeState(advanced.state), `runtime handoff changed T${turn}`);

        const receipt = operationReceipt(handed, request.corpsId, request.targetOsid);
        if (!operation) {
            assert(receipt, 'directive was not consumed into an operation on first candidate advance');
            validateConsumedOperation(handed, receipt, config, initialEligible);
            operation = receipt;
            roster = receipt.roster;
        }
        assert(!handed.military.corps_command[request.corpsId].pending_op_directive, 'pending directive not consumed once');
        assert(!handed.military.corps_command[request.corpsId].op_directive_rejection, `directive rejected:${handed.military.corps_command[request.corpsId].op_directive_rejection?.reason}`);
        const lineage = lineageForTurn(before, handed, advanced.report, operation.operationId, request.targetOsid, roster, config.input.playerFaction);
        movementObserved ||= lineage.moves.length > 0;
        combatObserved ||= lineage.ownedBattles.length > 0;

        const pendingEvents = pendingPlayerEvents(handed, config.input.playerFaction);
        const expectedEvent = expectedEvents.get(turn);
        if (expectedEvent) {
            assert(pendingEvents.length === 1 && pendingEvents[0]?.event_id === expectedEvent.eventId, `expected event missing/reordered at T${turn}`);
            const logBefore = eventLog(handed, config.input.playerFaction);
            handed = sim.resolveDesktopEventDecision(handed, expectedEvent.eventId, expectedEvent.responseId, root);
            const logAfter = eventLog(handed, config.input.playerFaction);
            const added = logAfter.slice(logBefore.length);
            assert(added.length === 1 && added[0].turn === turn && added[0].eventId === expectedEvent.eventId && added[0].responseId === expectedEvent.responseId && added[0].source === 'player', `event consumer receipt mismatch at T${turn}`);
            assert(pendingPlayerEvents(handed, config.input.playerFaction).length === 0, `event remained pending at T${turn}`);
            eventTranscript.push({ ...expectedEvent, receipt: added[0] });
            handed = sim.deserializeState(sim.serializeRuntimeState(handed));
        } else assert(pendingEvents.length === 0, `unexpected player event at T${turn}`);
        assert(playerBlockers(sim, handed).length === 0, `unresolved blocker after T${turn}`);

        const canonical = Buffer.from(sim.serializeState(handed), 'utf8');
        const reportBytes = jsonBytes(advanced.report);
        const turnReceipt = { turn, operation: receipt, lineage, event: expectedEvent ?? null, canonical: { bytes: canonical.length, sha256: sha256(canonical) }, report: { bytes: reportBytes.length, sha256: sha256(reportBytes) } };
        writeExclusive(path.join(evidenceDir, `state-turn-${String(turn).padStart(3, '0')}.json`), canonical);
        writeExclusive(path.join(evidenceDir, `report-turn-${String(turn).padStart(3, '0')}.json`), reportBytes);
        writeExclusive(path.join(evidenceDir, `receipt-turn-${String(turn).padStart(3, '0')}.json`), jsonBytes(turnReceipt));
        turnReceipts.push(turnReceipt);
        state = handed;
        if (turn === 39) break;
    }
    assert(state.meta.turn === 39 && turnReceipts.length === 23, 'candidate did not reach T39 in exactly 23 advances');
    assert(JSON.stringify(eventTranscript.map(({ turn, eventId, responseId }) => ({ turn, eventId, responseId }))) === JSON.stringify(config.events), 'event transcript mismatch');
    assert(movementObserved, 'no operation-roster movement observed');
    assert(combatObserved, 'no operation-owned target combat observed');
    const retainedNativeScore = scoreCandidate(root, config, readJson(absolute(root, config.input.nativeTurn39.path)));
    assert(retainedNativeScore.score === config.score.retainedNativeBaselineScore, 'retained native T39 baseline score changed');
    const score = scoreCandidate(root, config, state);
    const result = {
        schema: 'awwv.player-order-fork-diagnostic-v1.result.v1',
        pass: score.pass,
        verdict: score.pass ? 'PLAYER_FORK_MEETS_T39_ACCEPTANCE' : 'PLAYER_FORK_FAILS_T39_ACCEPTANCE',
        scope: config.scope,
        head,
        nativeTurn39: native39Row,
        retainedNativeScore,
        bindings,
        baselineFidelity: true,
        queryDerivedForce: forced,
        operation,
        movementObserved,
        combatObserved,
        eventTranscript,
        score,
        advances: turnReceipts.length,
        stoppedAtTurn: state.meta.turn,
        turnReceipts,
    };
    writeExclusive(path.join(evidenceDir, 'RESULT.json'), jsonBytes(result));
    process.stdout.write(`${JSON.stringify({ pass: result.pass, verdict: result.verdict, score: score.score, n91Losses: score.against.n91.lost.length, n92Losses: score.against.n92.lost.length, stoppedAtTurn: result.stoppedAtTurn })}\n`);
    if (!result.pass) process.exitCode = 2;
    return result;
}

async function main() {
    const [configPath, evidenceDir] = process.argv.slice(2);
    if (!configPath || !evidenceDir) {
        process.stderr.write('usage: diagnostic_entry.cjs CONFIG.json EVIDENCE_DIR\n');
        process.exit(3);
    }
    const config = readJson(path.resolve(configPath));
    try {
        await run(config, path.resolve(evidenceDir));
    } catch (error) {
        const failure = { schema: 'awwv.player-order-fork-diagnostic-v1.failure.v1', pass: false, error: String(error?.message ?? error) };
        const output = path.join(path.resolve(evidenceDir), 'RESULT.json');
        if (!fs.existsSync(output)) writeExclusive(output, jsonBytes(failure));
        process.stderr.write(`${failure.error}\n`);
        process.exit(2);
    }
}

if (require.main === module) void main();
module.exports = { diffPaths, lineageForTurn, operationReceipt, pendingPlayerEvents, run, scoreCandidate, validateConsumedOperation };
