/**
 * Scenario-bound desktop/player versus headless comparison harness.
 *
 * This is divergence evidence, not an equivalence claim: the player branch has
 * explicit decision gates that headless auto-control does not. The artifact
 * records the one shared startup snapshot plus every scripted player decision.
 *
 * Works from any launch folder: the process switches to the repo root (repo_root_cwd.ts), and
 * relative --out / --final-save-dir / --electron-log / --electron-autosave resolve against the
 * launch folder. Launched from the repo root, both readings are the same.
 */

// Must stay the first import: switches the process to the repo root before the sim loads.
import { REPO_ROOT, fromLaunchDir } from './repo_root_cwd.js';

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

import {
    advanceTurn,
    loadStateFromPath,
    resolveDesktopEventDecisionInPlace,
    resolvePlayerParamilitaryDecisions,
    serializeState,
    startNewCampaign,
} from '../../src/desktop/desktop_sim.js';
import {
    getStartupSnapshotDefinition,
    getStartupSnapshotPath,
} from '../../src/scenario/startup_snapshot.js';
import type { FactionId, GameState } from '../../src/state/game_state.js';
import type { EventDefinition, PendingEventDecision } from '../../src/sim/events/event_types.js';
import { loadEventDefinitionsFromDir } from '../../src/sim/events/event_loader.js';
import { selectBotEventResponse } from '../../src/sim/events/evaluate_events.js';
import { strictCompare } from '../../src/state/validateGameState.js';
import { isHistoricalOperationAuthorizationReview } from '../../src/sim/combat/historical_operation_authorization.js';
import { assertNoPeacePlanWindowSkipped, resolvePeacePlan } from '../../src/sim/negotiation/peace_plans.js';
import { getPeacePlanById } from '../../src/sim/negotiation/peace_plan_data.js';
import { createRequire } from 'node:module';
import { raiseArmyClash, sweepLapsedArmyClashes } from '../../src/sim/combat/army_clashes.js';
import { applyPresidentPolicy, bindPresidentRequestAttempts, emptyPresidentTurnLog, joinPresidentRequests, type PresidentKind, type PresidentPolicyOptions, type PresidentRequestDetail } from './president_policies.js';
import { readFileSync } from 'node:fs';

/** The gesture event rows as the desktop loads them (electron-main `loadFrontVisitEventDef`). */
function loadGestureEventDefs(baseDir: string): Map<string, unknown> {
    const parsed = JSON.parse(readFileSync(resolve(baseDir, 'data/scenarios/events/war_1993.json'), 'utf8'));
    const rows: Array<{ id?: unknown }> = Array.isArray(parsed) ? parsed : (parsed.events ?? []);
    return new Map(rows.filter((row) => typeof row?.id === 'string').map((row) => [row.id as string, row]));
}

/** The desktop IPC contract (CommonJS): the same price table and debit the accept-proposal handler uses. */
/** The desktop army-clash answer (command loop L7), used only by `--clash-policy`. */
const clashIpc = createRequire(import.meta.url)('../../src/desktop/army_clash_ipc.cjs') as {
    recordArmyClashAnswer: (state: unknown, payload: Record<string, unknown>) => { ok: boolean; error?: string };
};

const ipcContract = createRequire(import.meta.url)('../../src/desktop/autonomy_ipc_contract.cjs') as {
    proposalBackingCost: (action: unknown) => number;
    debitCommandAuthority: (state: unknown, cost: number) => { ok: boolean; error?: string };
};

/**
 * `bot_equivalent`: answer every player decision exactly as the bot would (the engine's own
 * `selectBotEventResponse`) — the authored historical default where one exists, otherwise the
 * bot's scorer. `historical_default` instead falls back to the FIRST option when no default
 * is authored, which is a different answer from the bot's on scorer-routed events
 * (address_to_nation_*, decorate_a_unit_*, ...). Peace plans are answered historically by both.
 */
type EventPolicy = 'defer' | 'historical_default' | 'staff_recommended' | 'bot_equivalent';
type ParamilitaryPolicy = 'defer' | 'allow' | 'deny' | 'regular' | 'standing_allow';
type HistoricalOperationPolicy = 'defer' | 'accept' | 'decline';

interface CliOptions {
    turns: number;
    faction: FactionId;
    eventPolicy: EventPolicy;
    paramilitaryPolicy: ParamilitaryPolicy;
    historicalOperationPolicy: HistoricalOperationPolicy;
    outPath?: string;
    /** Player-branch autonomy: a fixed level, or 'production' to keep what startNewCampaign sets. */
    autonomyLevel: 0 | 1 | 2 | 3 | 'production';
    /** When set, write `<dir>/{headless,player}/final_save.json` so each branch can be scored
     *  per-OSID with `tools/compare_painted_vs_sim.cjs <dir>/<branch> --target <checkpoint>`. */
    finalSaveDir?: string;
    /** Corps ids whose operation queue and live operations are recorded every turn (diagnostic only). */
    traceCorps?: string[];
    /** Settlement ids whose controller is recorded every turn in both branches (diagnostic only;
     *  `--watch-cells <id>[,<id>...]`), so a played probe shows when a cell fell, not just whether. */
    watchCells?: string[];
    /**
     * ATTRIBUTION DIAGNOSTIC ONLY — never a calibration result (Pyrrhic panel 2026-11-05,
     * docs/40_reports/audits/20261105_live_jan1993/paramilitary_panel/DECISION.md). Gives the
     * player faction the bot's paramilitary behaviour (no pending-decision window, standing
     * allow) so player-vs-no-player divergence can be attributed. Requires an `--out` path
     * containing "attribution"; the output carries a top-level `diagnostic` label.
     */
    botParityParamilitaryDiagnostic?: boolean;
    /**
     * Command loop L6 measurement (Authority that binds). 'off' (default) leaves the run as it
     * was. 'record' adds the player's Authority (`current`/`max`) to every turn row. 'on' also
     * charges each accepted historical operation its backing price through the desktop IPC's own
     * `debitCommandAuthority`, and defers it when the balance cannot cover the price, as the
     * desktop refuses it.
     */
    priceBacking?: 'record' | 'on';
    /**
     * Command loop L7 measurement (with `--price-backing on`): withhold every primary-corps plan and
     * answer the resulting army clash with this answer. Off by default.
     */
    clashPolicy?: 'insist' | 'accept';
    /** Appendix C test President (proposal §5D): hands-off, engaged or meddler. Records Authority per turn. */
    president?: PresidentKind;
    /**
     * Played-test options for the President (package "1994-95 attack and defence"), opt-in:
     * `--request-axis <corps>[+<corps>...]:<mun>[,<mun>...]`, `--request-prefer-exhausted on` and
     * `--request-every <weeks>` (1-52; 1 = a sustained weekly push) and `--request-only on` (spend
     * Authority on Request-ops only) and `--request-from <turn>` (no Request-op before that game
     * turn, e.g. 91 ≈ 1 Jan 1994). With any of them,
     * the output adds `president_requests` (each order joined to its after-action report) and the
     * requested corps' exhaustion per turn. Without them the output is unchanged.
     */
    presidentOptions?: PresidentPolicyOptions;
    electronLogPath?: string;
    electronAutosavePath?: string;
}

interface DecisionTranscriptRow {
    turn: number;
    family: 'event' | 'historical_operation' | 'op_proposal' | 'army_clash' | 'paramilitary_request' | 'peace_plan';
    id: string;
    decision: string;
    value?: string;
    /** 'paused_turn': answered inside the pause before combat (turn = the turn being run). */
    stage?: 'paused_turn';
    /** Event answers only: the harness's scripted answer, never a player's own choice (§6 design T4). */
    answer_author?: 'harness_script';
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

    const electronLogArg = values.get('--electron-log');
    const electronAutosaveArg = values.get('--electron-autosave');
    const electronLogPath = electronLogArg ? fromLaunchDir(electronLogArg) : undefined;
    const electronAutosavePath = electronAutosaveArg ? fromLaunchDir(electronAutosaveArg) : undefined;
    if (Boolean(electronLogPath) !== Boolean(electronAutosavePath)) {
        throw new Error('--electron-log and --electron-autosave must be provided together');
    }
    const botParityRaw = values.get('--diagnostic-bot-parity-paramilitary');
    const botParityParamilitaryDiagnostic = botParityRaw === undefined
        ? false
        : parseEnum(botParityRaw, ['on'] as const, '--diagnostic-bot-parity-paramilitary') === 'on';
    if (botParityParamilitaryDiagnostic && !(values.get('--out') ?? '').includes('attribution')) {
        throw new Error('--diagnostic-bot-parity-paramilitary requires an --out path containing "attribution" (diagnostic output must never sit with calibration evidence)');
    }
    // An engaged or meddler President queues a gesture decision each time it pays for one. Under
    // `--event-policy defer` nobody answers it, so the gesture stays pending, never comes off
    // cooldown again, and the Authority measurement is wrong. Refuse that configuration.
    const presidentArg = values.get('--president');
    if ((presidentArg === 'engaged' || presidentArg === 'meddler') && (values.get('--event-policy') ?? 'defer') === 'defer') {
        throw new Error(`--president ${presidentArg} needs an --event-policy that answers decisions (bot_equivalent, historical_default or staff_recommended), not defer`);
    }
    for (const pair of (values.get('--event-override') ?? '').split(',').filter(Boolean)) {
        const [eventId, responseId] = pair.split('=');
        if (!eventId || !responseId) throw new Error(`--event-override expects <event_id>=<response_id>[,...], got "${pair}"`);
        eventResponseOverrides.set(eventId, responseId);
    }

    return {
        turns,
        faction: parseEnum(values.get('--faction') ?? 'RS', ['HRHB', 'RBiH', 'RS'] as const, '--faction'),
        eventPolicy: parseEnum(
            values.get('--event-policy') ?? 'defer',
            ['defer', 'historical_default', 'staff_recommended', 'bot_equivalent'] as const,
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
        ...(values.get('--out') ? { outPath: fromLaunchDir(values.get('--out') as string) } : {}),
        ...(values.get('--final-save-dir') ? { finalSaveDir: fromLaunchDir(values.get('--final-save-dir') as string) } : {}),
        ...(values.get('--trace-corps')
            ? { traceCorps: (values.get('--trace-corps') ?? '').split(',').filter(Boolean).sort(strictCompare) }
            : {}),
        ...(values.get('--watch-cells')
            ? { watchCells: (values.get('--watch-cells') ?? '').split(',').filter(Boolean).sort(strictCompare) }
            : {}),
        autonomyLevel: (() => {
            const raw = parseEnum(values.get('--autonomy-level') ?? '1', ['0', '1', '2', '3', 'production'] as const, '--autonomy-level');
            return raw === 'production' ? 'production' : (Number(raw) as 0 | 1 | 2 | 3);
        })(),
        ...(electronLogPath ? { electronLogPath } : {}),
        ...(electronAutosavePath ? { electronAutosavePath } : {}),
        ...(botParityParamilitaryDiagnostic ? { botParityParamilitaryDiagnostic } : {}),
        ...(() => {
            const raw = parseEnum(values.get('--price-backing') ?? 'off', ['off', 'record', 'on'] as const, '--price-backing');
            return raw === 'off' ? {} : { priceBacking: raw };
        })(),
        ...(() => {
            const raw = parseEnum(values.get('--clash-policy') ?? 'off', ['off', 'insist', 'accept'] as const, '--clash-policy');
            return raw === 'off' ? {} : { clashPolicy: raw };
        })(),
        ...(() => {
            const raw = parseEnum(values.get('--president') ?? 'off', ['off', 'hands_off', 'engaged', 'meddler'] as const, '--president');
            return raw === 'off' ? {} : { president: raw };
        })(),
        ...(() => {
            const axisRaw = values.get('--request-axis');
            const exhaustedRaw = parseEnum(values.get('--request-prefer-exhausted') ?? 'off', ['off', 'on'] as const, '--request-prefer-exhausted');
            const everyRaw = values.get('--request-every');
            const onlyRaw = parseEnum(values.get('--request-only') ?? 'off', ['off', 'on'] as const, '--request-only');
            const fromRaw = values.get('--request-from');
            if (!axisRaw && exhaustedRaw === 'off' && everyRaw == null && onlyRaw === 'off' && fromRaw == null) return {};
            if (!presidentArg) {
                throw new Error('--request-axis / --request-prefer-exhausted / --request-every / --request-only / --request-from need --president engaged or meddler');
            }
            let requestFrom: number | undefined;
            if (fromRaw != null) {
                requestFrom = Number(fromRaw);
                if (!Number.isInteger(requestFrom) || requestFrom < 0) throw new Error(`--request-from expects a game turn (integer >= 0), got ${fromRaw}`);
            }
            let requestAxis: PresidentPolicyOptions['requestAxis'];
            if (axisRaw) {
                const [corpsList, munList] = axisRaw.split(':');
                const corpsIds = [...new Set((corpsList ?? '').split('+').map((c) => c.trim()).filter(Boolean))].sort(strictCompare);
                const municipalities = (munList ?? '').split(',').map((m) => m.trim()).filter(Boolean).sort(strictCompare);
                if (corpsIds.length === 0 || municipalities.length === 0) throw new Error(`--request-axis expects <corps>[+<corps>...]:<mun>[,<mun>...], got ${axisRaw}`);
                requestAxis = { corpsIds, municipalities };
            }
            let requestEvery: number | undefined;
            if (everyRaw != null) {
                requestEvery = Number(everyRaw);
                if (!Number.isInteger(requestEvery) || requestEvery < 1 || requestEvery > 52) throw new Error(`--request-every expects an integer 1-52, got ${everyRaw}`);
            }
            return { presidentOptions: {
                ...(requestAxis ? { requestAxis } : {}),
                ...(exhaustedRaw === 'on' ? { preferExhausted: true } : {}),
                ...(requestEvery != null ? { requestEvery } : {}),
                ...(onlyRaw === 'on' ? { requestOnly: true } : {}),
                ...(requestFrom != null ? { requestFrom } : {}),
            } };
        })(),
    };
}

/** Player paramilitary-policy events, mirroring `PLAYER_PARAMILITARY_POLICY_EVENT` in paramilitary_sweep.ts. */
const PLAYER_PARAMILITARY_POLICY_EVENT_IDS: Partial<Record<FactionId, string>> = {
    RS: 'rs_paramilitary_policy_1992',
    RBiH: 'rbih_paramilitary_policy_1992',
};

/**
 * ATTRIBUTION DIAGNOSTIC ONLY. Bot factions spawn paramilitaries from t1 and auto-approve
 * regardless of their policy decision; the player faction waits while its policy event is
 * pending and then follows its decision. This removes the player's policy event (so it is
 * never pending) and sets a standing allow, matching the bot. It is applied to the player
 * branch's own state only and never to the no-player branch.
 */
function applyBotParityParamilitaryDiagnostic(state: GameState, faction: FactionId): void {
    const eventId = PLAYER_PARAMILITARY_POLICY_EVENT_IDS[faction];
    if (eventId) {
        state.military.enabled_event_ids = (state.military.enabled_event_ids ?? []).filter((id) => id !== eventId);
        if (state.military.pending_event_decisions) {
            state.military.pending_event_decisions = state.military.pending_event_decisions
                .filter((decision) => decision.event_id !== eventId);
        }
    }
    state.paramilitary_policy = 'always_allow';
}

/**
 * Opt-in `--event-override <event_id>=<response_id>[,...]`: the President answers these events
 * with the named response whatever the event policy (e.g. a played political departure). Empty
 * by default, so runs without the flag are unchanged.
 */
const eventResponseOverrides = new Map<string, string>();

/** Event catalog for `bot_equivalent` (loaded once per run, from the same files the desktop loads). */
let botEquivalentCatalog: Map<string, EventDefinition> | null = null;

function botEquivalentResponseId(state: GameState, decision: PendingEventDecision): string | undefined {
    const def = botEquivalentCatalog?.get(decision.event_id);
    if (!def || !def.response_options || def.response_options.length === 0) return undefined;
    // Choose among the options this decision actually OFFERS. A player-initiated gesture is queued
    // with options filtered by fire number and reach (responseOptionsForFire); the full catalog can
    // hold an option the decision does not carry, which resolveEventDecision rejects.
    const offered = new Set((decision.response_options ?? []).map((option) => option.id));
    const narrowed = { ...def, response_options: def.response_options.filter((option) => offered.has(option.id)) };
    if (narrowed.response_options.length === 0) return undefined;
    return selectBotEventResponse(state, narrowed, decision.faction, false).chosen.id;
}

function pendingDecisionsFor(state: GameState, faction: FactionId): PendingEventDecision[] {
    return [...(state.military.pending_event_decisions ?? [])]
        .filter((decision) => decision.faction === faction)
        .sort((a, b) => strictCompare(a.event_id, b.event_id));
}

/**
 * Answer the player's event decisions the way the desktop does (§6 design T4).
 *
 * - Through the product resolver (`resolveDesktopEventDecisionInPlace`, which takes the RBiH opening lane),
 *   never the plain sim resolver, so the harness measures the game a player plays.
 * - Until nothing it can answer is pending (engine D6): an answer can put a further card on the desk (the
 *   identity answer queues the RBiH policy card), and the product blocks Advance on such a card. Only cards
 *   queued by this call's own answers are chased, so earlier deferred cards are not re-asked in the pause.
 * - Every answer is the harness's SCRIPTED answer. The engine records it as a `player` row, as it would a
 *   human's; the transcript marks it `answer_author: 'harness_script'` so no reader takes it for a choice a
 *   player made (red-team T4 condition). Parity claims list that log source as the allowed difference.
 */
function applyEventPolicy(
    state: GameState,
    faction: FactionId,
    policy: EventPolicy,
    transcript: DecisionTranscriptRow[],
    pausedDecisions?: readonly PendingEventDecision[],
): void {
    // In the pause before combat the decisions are answered in the order the turn fired them
    // (the order a bot answers in-turn); between turns, by event id as before.
    const pendingAtStart = new Set((state.military.pending_event_decisions ?? []).map((decision) => decision.event_id));
    const handled = new Set<string>();
    let batch = pausedDecisions
        ? pausedDecisions.filter((decision) => decision.faction === faction)
        : pendingDecisionsFor(state, faction);

    while (batch.length > 0) {
        let answeredAny = false;
        for (const decision of batch) {
            if (handled.has(decision.event_id)) continue;
            handled.add(decision.event_id);
            const overrideId = eventResponseOverrides.get(decision.event_id);
            const responseId = overrideId != null && decision.response_options.some((o) => o.id === overrideId)
                ? overrideId
                : policy === 'historical_default'
                ? decision.historical_default_response_id ?? decision.response_options[0]?.id
                : policy === 'staff_recommended'
                    ? decision.staff_recommended_response_id ?? decision.historical_default_response_id
                    : policy === 'bot_equivalent'
                        ? botEquivalentResponseId(state, decision)
                        : undefined;
            const stage = pausedDecisions ? { stage: 'paused_turn' as const } : {};
            if (!responseId) {
                transcript.push({
                    turn: state.meta.turn,
                    family: 'event',
                    id: decision.event_id,
                    decision: 'defer',
                    ...stage,
                });
                continue;
            }
            resolveDesktopEventDecisionInPlace(state, decision.event_id, responseId, REPO_ROOT);
            answeredAny = true;
            transcript.push({
                turn: state.meta.turn,
                family: 'event',
                id: decision.event_id,
                decision: policy,
                value: responseId,
                ...stage,
                answer_author: 'harness_script',
            });
        }
        if (!answeredAny) break;
        // D6: re-read; answer what this call's answers put on the desk.
        batch = pendingDecisionsFor(state, faction)
            .filter((decision) => !handled.has(decision.event_id) && !pendingAtStart.has(decision.event_id));
    }
}

function applyHistoricalOperationPolicy(
    state: GameState,
    faction: FactionId,
    policy: HistoricalOperationPolicy,
    transcript: DecisionTranscriptRow[],
    priceBacking?: 'record' | 'on',
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
        if (policy === 'accept' && priceBacking === 'on') {
            // The desktop accept-proposal handler's own debit; a refusal leaves the review pending.
            const backing = ipcContract.debitCommandAuthority(state, ipcContract.proposalBackingCost(review.proposed_action));
            if (!backing.ok) {
                transcript.push({
                    turn: state.meta.turn,
                    family: 'historical_operation',
                    id: review.id,
                    decision: 'defer_unaffordable',
                    value: review.proposed_action,
                });
                continue;
            }
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

/**
 * `--price-backing on` only: an eager president who backs every corps operation proposal
 * (`APPROVE_OP:*`) he can afford, mirroring the desktop `accept-proposal` handler (the same debit,
 * then `player_op_response` approved). An unaffordable proposal is left unanswered and lapses at
 * Advance, as in the desktop. This bounds Authority spend from above for the L6 measurement.
 */
function applyEagerBackingPolicy(
    state: GameState,
    faction: FactionId,
    transcript: DecisionTranscriptRow[],
    clashPolicy?: 'insist' | 'accept',
): void {
    // Command loop L7: an unanswered clash lapses at Advance (electron-main sweeps after advanceTurn).
    if (clashPolicy) sweepLapsedArmyClashes(state);
    const reviews = [...(state.meta.pending_proposal_reviews ?? [])]
        .filter((review) => review.faction === faction)
        .filter((review) => typeof review.proposed_action === 'string' && review.proposed_action.startsWith('APPROVE_OP:'))
        .filter((review) => review.accepted == null && review.resolved_turn == null)
        .sort((a, b) => strictCompare(a.id, b.id));
    for (const review of reviews) {
        if (clashPolicy && withholdsAgainstArmyPlan(state, faction, review, transcript, clashPolicy)) continue;
        const backing = ipcContract.debitCommandAuthority(state, ipcContract.proposalBackingCost(review.proposed_action));
        if (!backing.ok) {
            transcript.push({ turn: state.meta.turn, family: 'op_proposal', id: review.id, decision: 'defer_unaffordable', value: review.proposed_action });
            continue;
        }
        review.accepted = true;
        review.resolved_turn = state.meta.turn;
        const [, corpsId, planId] = review.proposed_action.split(':');
        const corps = state.military.corps_command?.[corpsId!] as Record<string, unknown> | undefined;
        if (corps) corps.player_op_response = { plan_id: planId, approved: true, turn: state.meta.turn };
        transcript.push({ turn: state.meta.turn, family: 'op_proposal', id: review.id, decision: 'accept', value: review.proposed_action });
    }
}

/**
 * `--clash-policy insist|accept` (with `--price-backing on`), L7 measurement only: the president
 * withholds every plan of a corps the army's campaign plan calls primary, mirroring the desktop
 * `reject-proposal` handler, then raises the army clash exactly as it does and answers it with the
 * desktop's own `recordArmyClashAnswer`. Returns true when the proposal was withheld.
 */
function withholdsAgainstArmyPlan(
    state: GameState,
    faction: FactionId,
    review: NonNullable<GameState['meta']['pending_proposal_reviews']>[number],
    transcript: DecisionTranscriptRow[],
    clashPolicy: 'insist' | 'accept',
): boolean {
    const [, corpsId, planId] = review.proposed_action.split(':');
    const plan = state.military.campaign_plans?.[faction];
    const primary = plan && plan.valid_until_turn >= state.meta.turn
        && plan.front_priorities.some((fp) => fp.corps_id === corpsId && fp.role === 'primary');
    if (!primary) return false;
    review.accepted = false;
    review.resolved_turn = state.meta.turn;
    const corps = state.military.corps_command?.[corpsId!] as Record<string, unknown> | undefined;
    if (corps) corps.player_op_response = { plan_id: planId, approved: false, turn: state.meta.turn };
    transcript.push({ turn: state.meta.turn, family: 'op_proposal', id: review.id, decision: 'withhold', value: review.proposed_action });
    const raised = raiseArmyClash(state, faction, { act: 'withhold_plan', corpsId: corpsId!, orderRef: planId!, proposalId: review.id });
    if (raised.outcome === 'raised') {
        const answer = clashIpc.recordArmyClashAnswer(state, { clashId: raised.clashId, answer: clashPolicy });
        transcript.push({ turn: state.meta.turn, family: 'army_clash', id: raised.clashId, decision: answer.ok ? clashPolicy : `refused:${answer.error}` });
    } else if (raised.outcome !== 'none') {
        transcript.push({ turn: state.meta.turn, family: 'army_clash', id: raised.receiptId, decision: raised.outcome });
    }
    return true;
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

/**
 * The player's answer to a pending peace plan (the PeacePlanModal / `resolve-peace-plan` IPC).
 * §6 E3a2: each side answers on its routed card (applyEventPolicy answers the player's); the
 * pointer exists only as the close-week fallback, when the player's side has no recorded
 * answer. Under the historical_default policy the player gives its documented historical
 * response. A deferred fallback holds the plan step, so the defer asserts that no later
 * plan's window has opened meanwhile (it would be skipped silently).
 */
function applyPeacePlanPolicy(
    state: GameState,
    faction: FactionId,
    policy: EventPolicy,
    transcript: DecisionTranscriptRow[],
): void {
    const pending = state.military.negotiation?.pending_peace_plan;
    if (!pending) return;
    const plan = getPeacePlanById(pending.plan_id);
    const response = policy === 'historical_default' || policy === 'bot_equivalent'
        ? plan?.historical_responses[faction]
        : undefined;
    if (!response) {
        assertNoPeacePlanWindowSkipped(state);
        transcript.push({ turn: state.meta.turn, family: 'peace_plan', id: pending.plan_id, decision: 'defer' });
        return;
    }
    resolvePeacePlan(state, pending.plan_id, response);
    transcript.push({ turn: state.meta.turn, family: 'peace_plan', id: pending.plan_id, decision: policy, value: response });
}

function applyPlayerPolicy(
    state: GameState,
    options: CliOptions,
    transcript: DecisionTranscriptRow[],
): void {
    applyEventPolicy(state, options.faction, options.eventPolicy, transcript);
    applyPeacePlanPolicy(state, options.faction, options.eventPolicy, transcript);
    applyHistoricalOperationPolicy(state, options.faction, options.historicalOperationPolicy, transcript, options.priceBacking);
    if (options.priceBacking === 'on') applyEagerBackingPolicy(state, options.faction, transcript, options.clashPolicy);
    applyParamilitaryPolicy(state, options.faction, options.paramilitaryPolicy, transcript);
    // Last: resolving an event (e.g. the opening state-identity decision) can re-enable the
    // paramilitary policy event, which would reopen the pending window for this turn.
    if (options.botParityParamilitaryDiagnostic) applyBotParityParamilitaryDiagnostic(state, options.faction);
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
        loadStateFromPath(autosavePath, baseDir),
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

/** Diagnostic snapshot of each traced corps' queue and live operations, in deterministic order. */
function corpsTrace(state: GameState, corpsIds: string[]) {
    return Object.fromEntries(corpsIds.map((corpsId) => {
        const command = state.military.corps_command?.[corpsId];
        return [corpsId, {
            queued_operations: [...(command?.queued_operations ?? [])],
            active_operations: (command?.active_operations ?? []).map((operation) => ({
                name: operation.name,
                phase: operation.phase,
                participating_brigades: [...(operation.participating_brigades ?? [])].sort(strictCompare),
            })),
        }];
    }));
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
    const scenario = JSON.parse(scenarioPayload) as { scenario_id?: string; use_harness_bots?: boolean };
    const scenarioId = scenario.scenario_id ?? 'unknown';
    // These hashes bind the declared entrypoints only. Full qualification also
    // requires the separately retained complete candidate/source manifest.
    const entrypointPaths = ['src/desktop/desktop_sim.ts', 'src/sim/turn_pipeline.ts', 'tools/ai_play/desktop_calibration_compare.ts'];
    const entrypointSourceSha256 = Object.fromEntries(await Promise.all(entrypointPaths.map(async path =>
        [path, sha256(await readFile(resolve(baseDir, path), 'utf8'))] as const)));
    const historicalEntrypointSha256 = sha256(await readFile(resolve(baseDir, 'src/scenario/scenario_runner.ts'), 'utf8'));


    let headlessState = (await loadStateFromPath(snapshotPath, baseDir)).state;
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
    // Production startup sets Level 2 (desktop_sim.ts startNewCampaign): Level 1's commander_loop
    // guard holds commander plans at 'ready' awaiting a human answer, which this harness never
    // gives. `--autonomy-level production` keeps the production value; the default stays 1 for
    // backward compatibility with existing artifacts.
    if (options.autonomyLevel !== 'production') playerState.meta.autonomy_level = options.autonomyLevel;
    const playerAutonomyLevel = playerState.meta.autonomy_level;
    playerState.meta.decision_mode = options.eventPolicy === 'historical_default' || options.eventPolicy === 'bot_equivalent'
        ? 'historical'
        : 'emergent';
    if (options.eventPolicy === 'bot_equivalent') {
        botEquivalentCatalog = new Map(
            loadEventDefinitionsFromDir(0, resolve(baseDir, 'data/scenarios/events')).map((def) => [def.id, def]),
        );
    }
    if (options.paramilitaryPolicy === 'standing_allow') {
        playerState.paramilitary_policy = 'always_allow';
    }

    const headlessInitial = { control_counts: controlCounts(headlessState), state_sha256: stateHash(headlessState) };
    const playerInitial = { control_counts: controlCounts(playerState), state_sha256: stateHash(playerState) };
    const transcript: DecisionTranscriptRow[] = [];
    const turns: unknown[] = [];

    // Appendix C: the President's own acts (gestures, Request-ops, Insist, backing), through the
    // desktop's contracts, before the week's decisions are answered.
    const presidentEventDefs = options.president ? loadGestureEventDefs(baseDir) : new Map<string, unknown>();
    const presidentRequests: PresidentRequestDetail[] = [];
    for (let index = 0; index < options.turns; index += 1) {
        const presidentLog = emptyPresidentTurnLog();
        if (options.president) {
            // An army clash left unanswered at Advance lapses (electron-main sweeps after advance).
            sweepLapsedArmyClashes(playerState);
            await applyPresidentPolicy(playerState, options.faction, options.president, index, presidentEventDefs, baseDir, presidentLog, options.presidentOptions);
            if (presidentLog.request_details) presidentRequests.push(...presidentLog.request_details);
        }
        applyPlayerPolicy(playerState, options, transcript);
        const headlessResult = await advanceTurn(headlessState, baseDir);
        // PAUSE BEFORE COMBAT: the player answers decisions fired this turn inside the turn,
        // right after evaluate-events, as the live desktop does — so its answer lands before
        // this turn's movement and combat, exactly like a bot's. Anything still pending
        // between turns (opening decisions, deferred ones, peace plans) is answered by
        // applyPlayerPolicy above.
        const weekStartTurn = playerState.meta.turn;
        const playerResult = await advanceTurn(playerState, baseDir, {
            onPlayerDecisionsPending: (workingState, decisions) => {
                applyEventPolicy(workingState, options.faction, options.eventPolicy, transcript, decisions);
            },
        });
        if (headlessResult.error) throw new Error(`Headless advance failed: ${headlessResult.error}`);
        if (playerResult.error) throw new Error(`Player advance failed: ${playerResult.error}`);
        headlessState = headlessResult.state;
        playerState = playerResult.state;
        if (presidentLog.request_details) bindPresidentRequestAttempts(presidentLog.request_details, playerState, weekStartTurn);
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
        if (options.priceBacking || options.president) {
            const auth = playerState.military?.command_authority;
            row.player_command_authority = auth
                ? {
                    current: auth.current,
                    max: auth.max,
                    ...(options.president ? {
                        reserve: auth.reserve ?? 0,
                        reserve_max: auth.reserve_max ?? 0,
                        income: auth.last_recovery ?? null,
                        income_breakdown: auth.last_recovery_breakdown ?? null,
                        president: presidentLog,
                    } : {}),
                }
                : null;
        }
        if (options.presidentOptions) {
            const requested = [...new Set(presidentRequests.map((r) => r.corps_id))].sort(strictCompare);
            row.requested_corps_exhaustion = Object.fromEntries(requested.map((corpsId) =>
                [corpsId, playerState.military.corps_command?.[corpsId]?.corps_exhaustion ?? null]));
        }
        if (options.traceCorps) {
            row.corps_trace = {
                headless: corpsTrace(headlessState, options.traceCorps),
                player: corpsTrace(playerState, options.traceCorps),
            };
        }
        if (options.watchCells) {
            const watch = (state: GameState) => Object.fromEntries(options.watchCells!.map((id) =>
                [id, state.political?.political_controllers?.[id] ?? null]));
            row.watched_cells = { headless: watch(headlessState), player: watch(playerState) };
        }
        turns.push(row);
    }

    if (options.finalSaveDir) {
        // Per-OSID scoring needs the whole final control map, not just the counts emitted below.
        for (const [branch, state] of [['headless', headlessState], ['player', playerState]] as const) {
            const branchDir = resolve(baseDir, options.finalSaveDir, branch);
            await mkdir(branchDir, { recursive: true });
            await writeFile(resolve(branchDir, 'final_save.json'), serializeState(state), 'utf8');
        }
        if (options.botParityParamilitaryDiagnostic) {
            await writeFile(
                resolve(baseDir, options.finalSaveDir, 'DIAGNOSTIC_ONLY.txt'),
                'decision_policy=bot_parity_paramilitary_diagnostic\nAttribution evidence only. NOT a calibration score; never cite these saves as calibration.\n',
                'utf8',
            );
        }
    }

    const baseOutput = {
        schema_version: 1,
        comparison_kind: 'player_choice_vs_headless',
        execution_profiles: {
            gameplay: {
                profile_id: 'live-equivalent-desktop-v1',
                entrypoint: 'src/desktop/desktop_sim.ts#advanceTurn',
                baseline_ops_applied: false,
                scenario_source_sha256: sha256(scenarioPayload),
                entrypoint_source_sha256: entrypointSourceSha256,
                source_binding_scope: 'listed_entrypoints_only',
                full_candidate_manifest_required: true,
                qualification: 'evidence_only',
            },
            historical_regression: {
                profile_id: 'definitive-harness-regression-v1',
                entrypoint: 'src/scenario/scenario_runner.ts#runScenario',
                entrypoint_source_sha256: historicalEntrypointSha256,
                scenario_source_sha256: sha256(scenarioPayload),
                source_scenario_use_harness_bots: scenario.use_harness_bots === true,
                benchmark_authority: 'retained_original_targets_and_receipts',
                qualifies_gameplay: false,
            },
        },
        scenario: {
            key,
            scenario_id: scenarioId,
            source_path: repoPath(baseDir, sourcePath),
            startup_snapshot_path: repoPath(baseDir, snapshotPath),
            startup_snapshot_sha256: sha256(snapshotPayload.replace(/\r\n/g, '\n')),
        },
        player_policy: {
            autonomy_level: playerAutonomyLevel,
            event_decisions: options.eventPolicy,
            non_player_event_mode: playerState.meta.decision_mode,
            player_event_resolution_timing: 'between_turns',
            historical_operations: options.historicalOperationPolicy,
            ...(options.priceBacking ? { price_backing: options.priceBacking } : {}),
            ...(options.clashPolicy ? { clash_policy: options.clashPolicy } : {}),
            ...(options.president ? { president: options.president } : {}),
            ...(options.presidentOptions ? { president_options: options.presidentOptions } : {}),
            paramilitary_requests: options.paramilitaryPolicy,
            paramilitary_resolution_timing: options.paramilitaryPolicy === 'standing_allow'
                ? 'same_turn'
                : options.paramilitaryPolicy === 'defer'
                    ? 'deferred'
                    : 'between_turns',
            paramilitary_target_scope: 'player_unrestricted_municipality_scope_undefended_only',
        },
        ...(options.botParityParamilitaryDiagnostic ? {
            diagnostic: {
                decision_policy: 'bot_parity_paramilitary_diagnostic',
                qualifies_calibration: false,
                note: 'Player branch given bot paramilitary behaviour for attribution; not a matched historical-default policy.',
            },
        } : {}),
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
        ...(options.presidentOptions ? { president_requests: joinPresidentRequests(presidentRequests, playerState) } : {}),
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
    const baseDir = REPO_ROOT;
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
