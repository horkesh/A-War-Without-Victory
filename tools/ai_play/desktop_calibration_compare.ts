/**
 * Scenario-bound desktop/player versus headless comparison harness.
 *
 * This is divergence evidence, not an equivalence claim: the player branch has
 * explicit decision gates that headless auto-control does not. The artifact
 * records the one shared startup snapshot plus every scripted player decision.
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

import {
    advanceTurn,
    loadStateFromPath,
    resolveEventDecision,
    resolvePlayerParamilitaryDecisions,
    serializeState,
    startNewCampaign,
} from '../../src/desktop/desktop_sim.js';
import {
    getStartupSnapshotDefinition,
    getStartupSnapshotPath,
} from '../../src/scenario/startup_snapshot.js';
import type { FactionId, GameState } from '../../src/state/game_state.js';
import { strictCompare } from '../../src/state/validateGameState.js';
import { isHistoricalOperationAuthorizationReview } from '../../src/sim/combat/historical_operation_authorization.js';

type EventPolicy = 'defer' | 'historical_default' | 'staff_recommended';
type ParamilitaryPolicy = 'defer' | 'allow' | 'deny' | 'regular' | 'standing_allow';
type HistoricalOperationPolicy = 'defer' | 'accept' | 'decline';

interface CliOptions {
    turns: number;
    faction: FactionId;
    eventPolicy: EventPolicy;
    paramilitaryPolicy: ParamilitaryPolicy;
    historicalOperationPolicy: HistoricalOperationPolicy;
    outPath?: string;
    electronLogPath?: string;
    electronAutosavePath?: string;
}

interface DecisionTranscriptRow {
    turn: number;
    family: 'event' | 'historical_operation' | 'paramilitary_request';
    id: string;
    decision: string;
    value?: string;
}

interface ElectronStateSummary {
    turn: number;
    control_counts: Record<string, number>;
}

interface ElectronAction {
    turn: number;
    id: string;
    detail: Record<string, unknown>;
    source: string;
}

interface ElectronActionCategory {
    comparator_support: 'absent';
    attribution: 'electron_only_player_action';
    count: number;
    actions: ElectronAction[];
}

interface ElectronReplayBinding {
    provenance: {
        log_path: string;
        log_sha256: string;
        autosave_path: string;
        autosave_sha256: string;
        faction: FactionId;
        turn: number;
        scenario_id: string;
        validation: {
            faction: 'matched';
            turn: 'matched';
            scenario_start_date: 'matched';
            war_timeline: 'matched';
            initial_control_counts: 'matched';
        };
    };
    initial: ElectronStateSummary & { state_sha256: string | null };
    final: ElectronStateSummary & { state_sha256: string };
    turns: Map<number, ElectronStateSummary>;
    action_attribution: {
        interpretation: 'expected_input_divergence_not_nondeterminism';
        nondeterminism_claimed: false;
        total_count: number;
        categories: {
            recruitment: ElectronActionCategory;
            command_authority: ElectronActionCategory;
            proposal: ElectronActionCategory;
        };
    };
}

const COMPARISON_FACTIONS = ['HRHB', 'RBiH', 'RS'] as const;

function repoPath(baseDir: string, path: string): string {
    return relative(baseDir, path).replace(/\\/g, '/');
}

function sha256(payload: string): string {
    return createHash('sha256').update(payload, 'utf8').digest('hex');
}

function stateHash(state: GameState): string {
    return sha256(serializeState(state));
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
    if (!isRecord(value)) throw new Error(`${label} must be an object`);
    return value;
}

function requireArray(value: unknown, label: string): unknown[] {
    if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
    return value;
}

function requireInteger(value: unknown, label: string): number {
    if (!Number.isInteger(value)) throw new Error(`${label} must be an integer`);
    return value as number;
}

function requireString(value: unknown, label: string): string {
    if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} must be a non-empty string`);
    return value;
}

function normalizeControlCounts(value: unknown, label: string): Record<string, number> {
    const counts = requireRecord(value, label);
    return Object.fromEntries(COMPARISON_FACTIONS.map((faction) => {
        const count = counts[faction] ?? 0;
        if (!Number.isInteger(count) || (count as number) < 0) {
            throw new Error(`${label}.${faction} must be a non-negative integer`);
        }
        return [faction, count as number];
    }));
}

function sameJson(left: unknown, right: unknown): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
}

function sameControlCounts(left: Record<string, number>, right: Record<string, number>): boolean {
    return COMPARISON_FACTIONS.every((faction) => (left[faction] ?? 0) === (right[faction] ?? 0));
}

function controlDelta(
    minuend: Record<string, number>,
    subtrahend: Record<string, number>,
): Record<string, number> {
    return Object.fromEntries(COMPARISON_FACTIONS.map((faction) => [
        faction,
        (minuend[faction] ?? 0) - (subtrahend[faction] ?? 0),
    ]));
}

function controlCounts(state: GameState): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const controller of Object.values(state.political?.political_controllers ?? {})) {
        if (typeof controller !== 'string') continue;
        counts[controller] = (counts[controller] ?? 0) + 1;
    }
    return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => strictCompare(a, b)));
}

function parseEnum<T extends string>(
    value: string | undefined,
    allowed: readonly T[],
    label: string,
): T {
    if (value && (allowed as readonly string[]).includes(value)) return value as T;
    throw new Error(`${label} must be one of: ${allowed.join(', ')}`);
}

function parseArgs(argv: string[]): CliOptions {
    const values = new Map<string, string>();
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (!arg?.startsWith('--')) throw new Error(`Unexpected argument: ${arg ?? ''}`);
        const value = argv[i + 1];
        if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
        values.set(arg, value);
        i += 1;
    }

    const turns = Number(values.get('--turns') ?? '20');
    if (!Number.isInteger(turns) || turns < 0) throw new Error('--turns must be a non-negative integer');

    const electronLogPath = values.get('--electron-log');
    const electronAutosavePath = values.get('--electron-autosave');
    if (Boolean(electronLogPath) !== Boolean(electronAutosavePath)) {
        throw new Error('--electron-log and --electron-autosave must be provided together');
    }

    return {
        turns,
        faction: parseEnum(values.get('--faction') ?? 'RS', ['HRHB', 'RBiH', 'RS'] as const, '--faction'),
        eventPolicy: parseEnum(
            values.get('--event-policy') ?? 'defer',
            ['defer', 'historical_default', 'staff_recommended'] as const,
            '--event-policy',
        ),
        paramilitaryPolicy: parseEnum(
            values.get('--paramilitary-policy') ?? 'defer',
            ['defer', 'allow', 'deny', 'regular', 'standing_allow'] as const,
            '--paramilitary-policy',
        ),
        historicalOperationPolicy: parseEnum(
            values.get('--historical-operation-policy') ?? 'accept',
            ['defer', 'accept', 'decline'] as const,
            '--historical-operation-policy',
        ),
        ...(values.get('--out') ? { outPath: values.get('--out') } : {}),
        ...(electronLogPath ? { electronLogPath } : {}),
        ...(electronAutosavePath ? { electronAutosavePath } : {}),
    };
}

function applyEventPolicy(
    state: GameState,
    faction: FactionId,
    policy: EventPolicy,
    transcript: DecisionTranscriptRow[],
): void {
    const pending = [...(state.military.pending_event_decisions ?? [])]
        .filter((decision) => decision.faction === faction)
        .sort((a, b) => strictCompare(a.event_id, b.event_id));

    for (const decision of pending) {
        const responseId = policy === 'historical_default'
            ? decision.historical_default_response_id ?? decision.response_options[0]?.id
            : policy === 'staff_recommended'
                ? decision.staff_recommended_response_id ?? decision.historical_default_response_id
                : undefined;
        if (!responseId) {
            transcript.push({
                turn: state.meta.turn,
                family: 'event',
                id: decision.event_id,
                decision: 'defer',
            });
            continue;
        }
        resolveEventDecision(state, decision.event_id, responseId);
        transcript.push({
            turn: state.meta.turn,
            family: 'event',
            id: decision.event_id,
            decision: policy,
            value: responseId,
        });
    }
}

function applyHistoricalOperationPolicy(
    state: GameState,
    faction: FactionId,
    policy: HistoricalOperationPolicy,
    transcript: DecisionTranscriptRow[],
): void {
    const reviews = [...(state.meta.pending_proposal_reviews ?? [])]
        .filter((review) => review.faction === faction)
        .filter((review) => isHistoricalOperationAuthorizationReview(review))
        .filter((review) => review.accepted == null && review.resolved_turn == null)
        .sort((a, b) => strictCompare(a.id, b.id));

    for (const review of reviews) {
        if (policy === 'defer') {
            transcript.push({
                turn: state.meta.turn,
                family: 'historical_operation',
                id: review.id,
                decision: 'defer',
                value: review.proposed_action,
            });
            continue;
        }
        review.accepted = policy === 'accept';
        review.resolved_turn = state.meta.turn;
        transcript.push({
            turn: state.meta.turn,
            family: 'historical_operation',
            id: review.id,
            decision: policy,
            value: review.proposed_action,
        });
    }
}

function applyParamilitaryPolicy(
    state: GameState,
    faction: FactionId,
    policy: ParamilitaryPolicy,
    transcript: DecisionTranscriptRow[],
): void {
    const requests = [...(state.pending_paramilitary_requests ?? [])]
        .filter((request) => request.faction === faction && request.decision == null)
        .sort((a, b) => strictCompare(a.target_osid, b.target_osid));
    let resolvedAny = false;

    for (const request of requests) {
        transcript.push({
            turn: state.meta.turn,
            family: 'paramilitary_request',
            id: request.target_osid,
            decision: policy,
            value: request.mode ?? 'rear_pocket',
        });
        if (policy === 'defer') continue;
        request.decision = policy === 'standing_allow' ? 'allow' : policy;
        resolvedAny = true;
    }
    if (resolvedAny) resolvePlayerParamilitaryDecisions(state);
}

function applyPlayerPolicy(
    state: GameState,
    options: CliOptions,
    transcript: DecisionTranscriptRow[],
): void {
    applyEventPolicy(state, options.faction, options.eventPolicy, transcript);
    applyHistoricalOperationPolicy(state, options.faction, options.historicalOperationPolicy, transcript);
    applyParamilitaryPolicy(state, options.faction, options.paramilitaryPolicy, transcript);
}

function commandOption(command: string[], name: string): string | undefined {
    const inline = command.find((entry) => entry.startsWith(`${name}=`));
    if (inline) return inline.slice(name.length + 1);
    const index = command.indexOf(name);
    return index >= 0 ? command[index + 1] : undefined;
}

function readElectronStateSummary(value: unknown, label: string): ElectronStateSummary | null {
    if (!isRecord(value)) return null;
    if (!('turn' in value) && !('controlCounts' in value)) return null;
    return {
        turn: requireInteger(value.turn, `${label}.turn`),
        control_counts: normalizeControlCounts(value.controlCounts, `${label}.controlCounts`),
    };
}

function actionCategory(actions: ElectronAction[]): ElectronActionCategory {
    return {
        comparator_support: 'absent',
        attribution: 'electron_only_player_action',
        count: actions.length,
        actions,
    };
}

function extractElectronActions(factionEntry: Record<string, unknown>) {
    const playtest = requireRecord(factionEntry.playtest, 'Electron faction playtest');
    const turnEvents = requireArray(playtest.turnEvents, 'Electron playtest.turnEvents');
    const events = requireArray(factionEntry.events, 'Electron faction events');
    const recruitment: ElectronAction[] = [];
    const commandAuthority: ElectronAction[] = [];
    const proposalById = new Map<string, ElectronAction>();

    for (const [index, value] of turnEvents.entries()) {
        const event = requireRecord(value, `Electron turn event ${index}`);
        const before = readElectronStateSummary(event.before, `Electron turn event ${index}.before`);
        if (event.step === 'strategic-recruitment' && isRecord(event.recruitment) && event.recruitment.handled === true) {
            const turn = before?.turn ?? 0;
            recruitment.push({
                turn,
                id: `recruitment:${turn}:${String(event.recruitment.afterOwned ?? 'unknown')}`,
                detail: {
                    before_owned: event.recruitment.beforeOwned ?? null,
                    after_owned: event.recruitment.afterOwned ?? null,
                    clicked: isRecord(event.recruitment.recruitAction)
                        ? event.recruitment.recruitAction.clicked === true
                        : null,
                },
                source: 'playtest.turnEvents.strategic-recruitment',
            });
        }
        if (typeof event.action === 'string' && event.action.startsWith('strategic-proposal:')) {
            const proposedAction = event.action.slice('strategic-proposal:'.length);
            if (proposedAction.startsWith('HISTORICAL_OP:')) continue;
            const turn = before?.turn
                ?? readElectronStateSummary(event.after, `Electron turn event ${index}.after`)?.turn
                ?? 0;
            proposalById.set(proposedAction, {
                turn,
                id: proposedAction,
                detail: { proposed_action: proposedAction, disposition: 'accepted' },
                source: 'playtest.turnEvents.strategic-proposal',
            });
        }
    }

    if (isRecord(factionEntry.strategicCommandAuthority)) {
        const results = Array.isArray(factionEntry.strategicCommandAuthority.results)
            ? factionEntry.strategicCommandAuthority.results
            : [];
        for (const [index, value] of results.entries()) {
            const result = requireRecord(value, `Electron Command Authority result ${index}`);
            const spent = typeof result.spent === 'number' ? result.spent : 0;
            if (result.issued !== true && spent <= 0) continue;
            const lever = requireString(result.lever, `Electron Command Authority result ${index}.lever`);
            commandAuthority.push({
                turn: 0,
                id: lever,
                detail: {
                    spent,
                    staged_event_id: result.stagedEventId ?? null,
                    response_handled: result.responded === true,
                },
                source: 'strategicCommandAuthority.results',
            });
        }
    }

    for (const [index, value] of events.entries()) {
        const event = requireRecord(value, `Electron event ${index}`);
        if (event.label !== 'strategic-proposal-after-accept' || !isRecord(event.state)) continue;
        const proposals = Array.isArray(event.state.pendingProposals) ? event.state.pendingProposals : [];
        for (const proposalValue of proposals) {
            const proposal = requireRecord(proposalValue, `Electron event ${index} proposal`);
            if (proposal.accepted !== true && proposal.resolvedTurn == null) continue;
            const id = typeof proposal.id === 'string'
                ? proposal.id
                : requireString(proposal.action, `Electron event ${index} proposal.action`);
            const action = typeof proposal.action === 'string' ? proposal.action : id;
            if (action.startsWith('HISTORICAL_OP:')) continue;
            proposalById.set(action, {
                turn: typeof proposal.resolvedTurn === 'number'
                    ? proposal.resolvedTurn
                    : requireInteger(event.state.turn, `Electron event ${index}.state.turn`),
                id,
                detail: { proposed_action: action, disposition: 'accepted' },
                source: 'events.strategic-proposal-after-accept',
            });
        }
    }

    const proposal = [...proposalById.values()].sort((a, b) => a.turn - b.turn || strictCompare(a.id, b.id));
    recruitment.sort((a, b) => a.turn - b.turn || strictCompare(a.id, b.id));
    commandAuthority.sort((a, b) => a.turn - b.turn || strictCompare(a.id, b.id));
    const categories = {
        recruitment: actionCategory(recruitment),
        command_authority: actionCategory(commandAuthority),
        proposal: actionCategory(proposal),
    };
    return {
        interpretation: 'expected_input_divergence_not_nondeterminism' as const,
        nondeterminism_claimed: false as const,
        total_count: recruitment.length + commandAuthority.length + proposal.length,
        categories,
    };
}

async function loadElectronReplayBinding(
    baseDir: string,
    options: CliOptions,
    scenarioId: string,
    startupState: GameState,
): Promise<ElectronReplayBinding | null> {
    if (!options.electronLogPath || !options.electronAutosavePath) return null;
    const logPath = resolve(baseDir, options.electronLogPath);
    const autosavePath = resolve(baseDir, options.electronAutosavePath);
    const [logPayload, autosavePayload, autosaveResult] = await Promise.all([
        readFile(logPath, 'utf8'),
        readFile(autosavePath, 'utf8'),
        loadStateFromPath(autosavePath),
    ]);
    const log = requireRecord(JSON.parse(logPayload) as unknown, 'Electron log');
    const command = requireArray(log.command, 'Electron log.command')
        .map((value, index) => requireString(value, `Electron log.command[${index}]`));
    const commandFaction = commandOption(command, '--faction');
    const commandTurn = Number(commandOption(command, '--turns'));
    const factionEntries = requireArray(log.factions, 'Electron log.factions')
        .map((value, index) => requireRecord(value, `Electron log.factions[${index}]`));
    const factionEntry = factionEntries.find((entry) => entry.faction === options.faction);
    const loggedFactions = factionEntries.map((entry) => String(entry.faction ?? 'unknown')).join(', ');
    if (!factionEntry || commandFaction !== options.faction) {
        throw new Error(
            `Electron faction provenance mismatch: requested ${options.faction}; command ${commandFaction ?? 'missing'}; log ${loggedFactions}`,
        );
    }

    const autosaveState = autosaveResult.state;
    if (autosaveState.meta.player_faction !== options.faction) {
        throw new Error(
            `Electron faction provenance mismatch: requested ${options.faction}; autosave ${autosaveState.meta.player_faction ?? 'missing'}`,
        );
    }
    const playtest = requireRecord(factionEntry.playtest, 'Electron faction playtest');
    const finalState = readElectronStateSummary(playtest.finalState, 'Electron playtest.finalState');
    if (!finalState) throw new Error('Electron playtest.finalState is missing control provenance');
    const maxObservedTurn = requireInteger(playtest.maxObservedTurn, 'Electron playtest.maxObservedTurn');
    if (
        commandTurn !== options.turns
        || autosaveState.meta.turn !== options.turns
        || finalState.turn !== options.turns
        || maxObservedTurn !== options.turns
    ) {
        throw new Error(
            `Electron turn provenance mismatch: expected ${options.turns}; command ${String(commandTurn)}; autosave ${autosaveState.meta.turn}; final ${finalState.turn}; max ${maxObservedTurn}`,
        );
    }

    if (
        !sameJson(autosaveState.meta.scenario_start_date, startupState.meta.scenario_start_date)
        || !sameJson(autosaveState.military.war_timeline, startupState.military.war_timeline)
    ) {
        throw new Error(`Electron scenario provenance mismatch: autosave does not match ${scenarioId} immutable timeline`);
    }

    const events = requireArray(factionEntry.events, 'Electron faction events');
    const turnEvents = requireArray(playtest.turnEvents, 'Electron playtest.turnEvents');
    const summaries: ElectronStateSummary[] = [];
    const turns = new Map<number, ElectronStateSummary>();
    for (const [index, value] of turnEvents.entries()) {
        const event = requireRecord(value, `Electron turn event ${index}`);
        const before = readElectronStateSummary(event.before, `Electron turn event ${index}.before`);
        const after = readElectronStateSummary(event.after, `Electron turn event ${index}.after`);
        if (before) {
            summaries.push(before);
            if (!turns.has(before.turn)) turns.set(before.turn, before);
        }
        if (after) {
            summaries.push(after);
            turns.set(after.turn, after);
        }
    }
    for (const [index, value] of events.entries()) {
        const event = requireRecord(value, `Electron event ${index}`);
        const summary = readElectronStateSummary(event.state, `Electron event ${index}.state`);
        if (!summary) continue;
        summaries.push(summary);
        if (!turns.has(summary.turn)) turns.set(summary.turn, summary);
    }
    turns.set(finalState.turn, finalState);
    const initial = summaries.find((summary) => summary.turn === 0);
    const startupCounts = controlCounts(startupState);
    if (!initial || !sameControlCounts(initial.control_counts, startupCounts)) {
        throw new Error(`Electron scenario provenance mismatch: initial control counts do not match ${scenarioId}`);
    }
    for (let turn = 1; turn <= options.turns; turn += 1) {
        if (!turns.has(turn)) throw new Error(`Electron log missing control snapshot for turn ${turn}`);
    }

    const autosaveCounts = controlCounts(autosaveState);
    if (!sameControlCounts(finalState.control_counts, autosaveCounts)) {
        throw new Error('Electron replay integrity mismatch: final log control counts do not match autosave');
    }

    return {
        provenance: {
            log_path: repoPath(baseDir, logPath),
            log_sha256: sha256(logPayload),
            autosave_path: repoPath(baseDir, autosavePath),
            autosave_sha256: sha256(autosavePayload),
            faction: options.faction,
            turn: options.turns,
            scenario_id: scenarioId,
            validation: {
                faction: 'matched',
                turn: 'matched',
                scenario_start_date: 'matched',
                war_timeline: 'matched',
                initial_control_counts: 'matched',
            },
        },
        initial: { ...initial, state_sha256: null },
        final: { turn: options.turns, control_counts: autosaveCounts, state_sha256: stateHash(autosaveState) },
        turns,
        action_attribution: extractElectronActions(factionEntry),
    };
}

function classifyPendingProposal(action: string | undefined): string {
    if (action?.startsWith('HISTORICAL_OP:')) return 'historical_operation';
    if (action?.startsWith('OPPORTUNITY:')) return 'operation_opportunity';
    if (action?.startsWith('SET_STANCE:')) return 'stance';
    if (action?.startsWith('APPROVE_OP:')) return 'operation_plan';
    return 'other';
}

function reportSummary(state: GameState, report: unknown, playerFaction: FactionId) {
    const details = report as {
        attack_resolution_osid?: { orders_processed?: number; flips_applied?: number };
        paramilitary_sweep?: { captured?: Array<{ faction: FactionId; osid?: string }> };
        player_assisted_execution?: { eligible_attackers_by_corps?: Record<string, number> };
    } | undefined;
    const paramilitaryCaptures: Record<string, number> = {};
    const paramilitaryCaptureTargets: Record<string, string[]> = {};
    for (const capture of details?.paramilitary_sweep?.captured ?? []) {
        paramilitaryCaptures[capture.faction] = (paramilitaryCaptures[capture.faction] ?? 0) + 1;
        if (capture.osid) {
            (paramilitaryCaptureTargets[capture.faction] ??= []).push(capture.osid);
        }
    }
    for (const faction of Object.keys(paramilitaryCaptureTargets).sort(strictCompare)) {
        paramilitaryCaptureTargets[faction]!.sort(strictCompare);
    }
    const pendingProposalCounts: Record<string, number> = {};
    for (const review of [...(state.meta.pending_proposal_reviews ?? [])]
        .filter((entry) => entry.faction === playerFaction && entry.accepted == null)
        .sort((a, b) => strictCompare(a.id, b.id))) {
        const category = classifyPendingProposal(review.proposed_action);
        pendingProposalCounts[category] = (pendingProposalCounts[category] ?? 0) + 1;
    }
    const campaignPlans = state.military.campaign_plans as
        | Partial<Record<FactionId, { issued_turn?: number }>>
        | undefined;
    return {
        control_counts: controlCounts(state),
        attack_orders_processed: details?.attack_resolution_osid?.orders_processed ?? 0,
        attack_flips_applied: details?.attack_resolution_osid?.flips_applied ?? 0,
        paramilitary_captures_by_faction: Object.fromEntries(
            Object.entries(paramilitaryCaptures).sort(([a], [b]) => strictCompare(a, b)),
        ),
        paramilitary_capture_targets_by_faction: Object.fromEntries(
            Object.entries(paramilitaryCaptureTargets).sort(([a], [b]) => strictCompare(a, b)),
        ),
        player_eligible_attackers_by_corps:
            details?.player_assisted_execution?.eligible_attackers_by_corps ?? {},
        player_faction_campaign_plan_issued_turn:
            campaignPlans?.[playerFaction]?.issued_turn ?? null,
        pending_player_proposals_by_category: Object.fromEntries(
            Object.entries(pendingProposalCounts).sort(([a], [b]) => strictCompare(a, b)),
        ),
        pending_player_event_ids: [...(state.military.pending_event_decisions ?? [])]
            .filter((decision) => decision.faction === playerFaction)
            .map((decision) => decision.event_id)
            .sort(strictCompare),
    };
}

async function runComparison(baseDir: string, options: CliOptions) {
    const key = 'apr_1992' as const;
    const definition = getStartupSnapshotDefinition(key);
    const snapshotPath = getStartupSnapshotPath(baseDir, key);
    const sourcePath = resolve(baseDir, definition.scenarioRelativePath);
    const [snapshotPayload, scenarioPayload] = await Promise.all([
        readFile(snapshotPath, 'utf8'),
        readFile(sourcePath, 'utf8'),
    ]);
    const scenario = JSON.parse(scenarioPayload) as { scenario_id?: string };
    const scenarioId = scenario.scenario_id ?? 'unknown';

    let headlessState = (await loadStateFromPath(snapshotPath)).state;
    const electronReplay = await loadElectronReplayBinding(
        baseDir,
        options,
        scenarioId,
        headlessState,
    );
    let playerState = (await startNewCampaign(
        baseDir,
        options.faction as 'HRHB' | 'RBiH' | 'RS',
        key,
    )).state;
    playerState.meta.autonomy_level = 1;
    playerState.meta.decision_mode = options.eventPolicy === 'historical_default'
        ? 'historical'
        : 'emergent';
    if (options.paramilitaryPolicy === 'standing_allow') {
        playerState.paramilitary_policy = 'always_allow';
    }

    const headlessInitial = { control_counts: controlCounts(headlessState), state_sha256: stateHash(headlessState) };
    const playerInitial = { control_counts: controlCounts(playerState), state_sha256: stateHash(playerState) };
    const transcript: DecisionTranscriptRow[] = [];
    const turns: unknown[] = [];

    for (let index = 0; index < options.turns; index += 1) {
        applyPlayerPolicy(playerState, options, transcript);
        const headlessResult = await advanceTurn(headlessState, baseDir);
        const playerResult = await advanceTurn(playerState, baseDir);
        if (headlessResult.error) throw new Error(`Headless advance failed: ${headlessResult.error}`);
        if (playerResult.error) throw new Error(`Player advance failed: ${playerResult.error}`);
        headlessState = headlessResult.state;
        playerState = playerResult.state;
        const headless = reportSummary(headlessState, headlessResult.report?.details, options.faction);
        const player = reportSummary(playerState, playerResult.report?.details, options.faction);
        const row: Record<string, unknown> = {
            turn: playerState.meta.turn,
            headless,
            player,
            control_delta_player_minus_headless: controlDelta(player.control_counts, headless.control_counts),
        };
        if (electronReplay) {
            const electron = electronReplay.turns.get(playerState.meta.turn);
            if (!electron) throw new Error(`Electron log missing control snapshot for turn ${playerState.meta.turn}`);
            row.electron = { control_counts: electron.control_counts };
            row.control_delta_electron_minus_player = controlDelta(
                electron.control_counts,
                player.control_counts,
            );
            row.control_delta_electron_minus_headless = controlDelta(
                electron.control_counts,
                headless.control_counts,
            );
        }
        turns.push(row);
    }

    const baseOutput = {
        schema_version: 1,
        comparison_kind: 'player_choice_vs_headless',
        scenario: {
            key,
            scenario_id: scenarioId,
            source_path: repoPath(baseDir, sourcePath),
            startup_snapshot_path: repoPath(baseDir, snapshotPath),
            startup_snapshot_sha256: sha256(snapshotPayload.replace(/\r\n/g, '\n')),
        },
        player_policy: {
            autonomy_level: 1,
            event_decisions: options.eventPolicy,
            non_player_event_mode: playerState.meta.decision_mode,
            player_event_resolution_timing: 'between_turns',
            historical_operations: options.historicalOperationPolicy,
            paramilitary_requests: options.paramilitaryPolicy,
            paramilitary_resolution_timing: options.paramilitaryPolicy === 'standing_allow'
                ? 'same_turn'
                : options.paramilitaryPolicy === 'defer'
                    ? 'deferred'
                    : 'between_turns',
            paramilitary_target_scope: 'player_unrestricted_municipality_scope_undefended_only',
        },
        decision_transcript: transcript,
        branches: {
            headless: {
                initial: headlessInitial,
                final: { control_counts: controlCounts(headlessState), state_sha256: stateHash(headlessState) },
            },
            player: {
                initial: playerInitial,
                final: { control_counts: controlCounts(playerState), state_sha256: stateHash(playerState) },
            },
        },
        turns,
    };
    if (!electronReplay) return baseOutput;

    const playerFinal = baseOutput.branches.player.final.control_counts;
    const headlessFinal = baseOutput.branches.headless.final.control_counts;
    const electronFinal = electronReplay.final.control_counts;
    return {
        ...baseOutput,
        schema_version: 2,
        comparison_kind: 'electron_replay_vs_controlled_player_and_headless',
        branch_roles: {
            headless: 'headless_auto_control',
            player: 'controlled_player_policy',
            electron: 'observed_electron_replay',
        },
        electron_replay: {
            provenance: electronReplay.provenance,
            per_turn_snapshot_source: 'electron_log_playtest_turn_events',
            action_attribution: electronReplay.action_attribution,
        },
        branches: {
            ...baseOutput.branches,
            electron: {
                initial: {
                    control_counts: electronReplay.initial.control_counts,
                    state_sha256: electronReplay.initial.state_sha256,
                },
                final: {
                    control_counts: electronReplay.final.control_counts,
                    state_sha256: electronReplay.final.state_sha256,
                },
            },
        },
        final_control_deltas: {
            electron_minus_controlled_player: controlDelta(electronFinal, playerFinal),
            electron_minus_headless: controlDelta(electronFinal, headlessFinal),
            controlled_player_minus_headless: controlDelta(playerFinal, headlessFinal),
        },
    };
}

async function main(): Promise<void> {
    const baseDir = process.cwd();
    const options = parseArgs(process.argv.slice(2));
    const originalConsole = {
        debug: console.debug,
        log: console.log,
        info: console.info,
        warn: console.warn,
    };
    const diagnostic = (...args: unknown[]) => process.stderr.write(`${args.map(String).join(' ')}\n`);
    console.debug = diagnostic;
    console.log = diagnostic;
    console.info = diagnostic;
    console.warn = diagnostic;
    let output: Awaited<ReturnType<typeof runComparison>>;
    try {
        output = await runComparison(baseDir, options);
    } finally {
        console.debug = originalConsole.debug;
        console.log = originalConsole.log;
        console.info = originalConsole.info;
        console.warn = originalConsole.warn;
    }
    const payload = `${JSON.stringify(output, null, 2)}\n`;
    if (options.outPath) {
        const outPath = resolve(baseDir, options.outPath);
        await mkdir(dirname(outPath), { recursive: true });
        await writeFile(outPath, payload, 'utf8');
    }
    process.stdout.write(payload);
}

await main();
