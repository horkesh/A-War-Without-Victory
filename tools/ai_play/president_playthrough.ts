/**
 * AI-as-player President prototype + determinism-replay harness.
 *
 * Proves the LLM-as-player loop at the President altitude: a thin, typed wrapper
 * over the DESKTOP sim API (not scenario_runner — that forces
 * `headless_scenario_auto_control` and has no per-turn injection seam).
 *
 * The decision-maker sits exactly where a wired LLM API would: it reads the
 * per-turn decision context (`serializeDecisionContext`), reduces its choice to
 * the recorded primitive `{eventId, responseId}`, injects it via
 * `resolveEventDecision`, logs it, then `advanceTurn`.
 *
 * Determinism: every decision is reduced to `{turn, eventId, responseId}` before
 * injection (no free-form text reaches the sim). `runTurn` has no RNG/clock, so a
 * fixed decision log replays byte-identically. We never set
 * `headless_scenario_auto_control` (that would bypass the player path).
 *
 * No engine changes, no new GameState fields.
 */

import { createHash } from 'node:crypto';
import { advanceTurn, startNewCampaign, type DesktopScenarioKey } from '../../src/desktop/desktop_sim.js';
import { resolveEventDecision } from '../../src/sim/events/resolve_decision.js';
import { assembleCommandBriefing, type CommandBriefing } from '../../src/sim/briefing/collect_briefing.js';
import { serializeState } from '../../src/state/serialize.js';
import type { FactionId, GameState } from '../../src/state/game_state.js';
import type { PendingEventDecision } from '../../src/sim/events/event_types.js';

// ── Repo base dir ────────────────────────────────────────────────────────────
// This file lives at <repo>/tools/ai_play/. baseDir is the repo root.
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const __dirname_ = dirname(fileURLToPath(import.meta.url));
export const REPO_BASE_DIR = resolve(__dirname_, '../..');

// ── Serializable decision context (what an LLM player would read each turn) ───

/** One response option, flattened to the fields a player needs to choose. */
export interface DecisionOptionView {
    id: string;
    label: string;
    description?: string;
    historical_marker?: 'historical_default' | 'counterfactual';
    is_historical_default: boolean;
    is_staff_recommended: boolean;
}

/** One pending event decision, flattened for the player. */
export interface DecisionView {
    event_id: string;
    event_title: string;
    category?: string;
    narrative?: string;
    situation?: string;
    staff_assessment?: string;
    trigger_evidence?: string[];
    historical_source?: string;
    requires_player_response: boolean;
    historical_default_response_id?: string;
    staff_recommended_response_id?: string;
    options: DecisionOptionView[];
}

/** The full per-turn decision context an LLM player would consume. */
export interface TurnDecisionContext {
    turn: number;
    faction: FactionId;
    briefing: CommandBriefing;
    pending_decisions: DecisionView[];
}

/** A single recorded decision — the determinism primitive. */
export interface DecisionLogEntry {
    turn: number;
    eventId: string;
    responseId: string;
    /** In-character rationale (human/LLM annotation; NEVER reaches the sim). */
    rationale?: string;
    /** True when responseId !== historical_default_response_id. */
    diverged_from_historical: boolean;
}

// ── Thin wrapper over the desktop API ─────────────────────────────────────────

/**
 * Start a campaign for a faction (April 1992 definitive war start).
 *
 * GOTCHA (verified at startup_snapshot): the persisted apr_1992 startup snapshot
 * bakes in `headless_scenario_auto_control = true`, which makes evaluateEvents
 * auto-resolve EVERY decision via the bot path instead of routing the player's
 * faction's decisions to `pending_event_decisions`. The Electron "New Game" path
 * is interactive, so we clear the flag here to put the human/LLM PLAYER on the
 * decision seam — exactly where the Electron IPC would. This is harness-level
 * state setup (a meta flag the desktop UI controls), not an engine change.
 */
export async function startCampaign(
    faction: FactionId,
    scenarioKey: DesktopScenarioKey = 'apr_1992',
    baseDir: string = REPO_BASE_DIR,
): Promise<GameState> {
    const { state } = await startNewCampaign(baseDir, faction as 'RBiH' | 'RS' | 'HRHB', scenarioKey);
    if (state.meta) state.meta.headless_scenario_auto_control = false;
    return state;
}

/** Read + serialize the per-turn decision context the player chooses from. */
export function serializeDecisionContext(state: GameState, faction: FactionId): TurnDecisionContext {
    const pending: PendingEventDecision[] = state.military.pending_event_decisions ?? [];
    const forFaction = pending.filter((d) => d.faction === faction);
    return {
        turn: state.meta?.turn ?? 0,
        faction,
        briefing: assembleCommandBriefing(state, faction),
        pending_decisions: forFaction.map((d) => viewDecision(d)),
    };
}

function viewDecision(d: PendingEventDecision): DecisionView {
    return {
        event_id: d.event_id,
        event_title: d.event_title,
        category: d.category,
        narrative: d.narrative,
        situation: d.situation,
        staff_assessment: d.staff_assessment,
        trigger_evidence: d.trigger_evidence,
        historical_source: d.historical_source,
        requires_player_response: d.requires_player_response ?? false,
        historical_default_response_id: d.historical_default_response_id,
        staff_recommended_response_id: d.staff_recommended_response_id,
        options: d.response_options.map((o) => ({
            id: o.id,
            label: o.label,
            description: o.description,
            historical_marker: o.historical_marker,
            is_historical_default: o.id === d.historical_default_response_id,
            is_staff_recommended: o.id === d.staff_recommended_response_id,
        })),
    };
}

/**
 * Inject a single player event decision (the LLM/agent choice), reduced to the
 * recorded primitive. Mutates state in place and returns the log entry.
 */
export function injectDecision(
    state: GameState,
    eventId: string,
    responseId: string,
    rationale?: string,
): DecisionLogEntry {
    const pending = state.military.pending_event_decisions ?? [];
    const decision = pending.find((d) => d.event_id === eventId);
    const historicalDefault = decision?.historical_default_response_id;
    // Apply the chosen response + remove from pending (same path as Electron IPC).
    resolveEventDecision(state, eventId, responseId);
    return {
        turn: state.meta?.turn ?? 0,
        eventId,
        responseId,
        rationale,
        diverged_from_historical:
            historicalDefault !== undefined && responseId !== historicalDefault,
    };
}

/** Advance one war-phase turn via the desktop pipeline. Returns the new state. */
export async function advance(state: GameState, baseDir: string = REPO_BASE_DIR): Promise<GameState> {
    const result = await advanceTurn(state, baseDir);
    if (result.error) throw new Error(`advanceTurn error: ${result.error}`);
    return result.state;
}

/** Canonical state hash (same recipe as scenario_runner final_state_hash). */
export function stateHash(state: GameState): string {
    return createHash('sha256').update(serializeState(state), 'utf8').digest('hex').slice(0, 16);
}

/**
 * Replay a recorded decision log against a FRESH campaign for the same faction,
 * injecting each logged `(eventId, responseId)` at its turn, then advancing.
 * Returns the final state hash. Determinism proof: must equal the live run's.
 */
export async function replayDecisionLog(
    faction: FactionId,
    log: DecisionLogEntry[],
    turns: number,
    baseDir: string = REPO_BASE_DIR,
): Promise<{ finalHash: string; state: GameState }> {
    let state = await startCampaign(faction, 'apr_1992', baseDir);
    const byTurn = new Map<number, DecisionLogEntry[]>();
    for (const e of log) {
        if (!byTurn.has(e.turn)) byTurn.set(e.turn, []);
        byTurn.get(e.turn)!.push(e);
    }
    for (let i = 0; i < turns; i++) {
        const turn = state.meta?.turn ?? 0;
        const entries = byTurn.get(turn) ?? [];
        for (const e of entries) {
            // Only inject decisions still pending this turn (defensive; the live
            // run already proved they were present at this turn).
            const pending = state.military.pending_event_decisions ?? [];
            if (pending.some((d) => d.event_id === e.eventId)) {
                resolveEventDecision(state, e.eventId, e.responseId);
            }
        }
        state = await advance(state, baseDir);
    }
    return { finalHash: stateHash(state), state };
}
