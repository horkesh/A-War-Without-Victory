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
import {
    advanceTurn,
    startNewCampaign,
    approveReserveRequest,
    resolvePeacePlan,
    resolveDaytonNegotiation,
    resolvePlayerParamilitaryDecisions,
    listBlockingPlayerDecisions,
    type DesktopScenarioKey,
} from '../../src/desktop/desktop_sim.js';
import { resolveEventDecision } from '../../src/sim/events/resolve_decision.js';
import { assembleCommandBriefing, type CommandBriefing } from '../../src/sim/briefing/collect_briefing.js';
import { serializeState, deserializeState } from '../../src/state/serialize.js';
import { resetDisplacementPressureCache } from '../../src/state/displacement.js';
import type { FactionId, GameState } from '../../src/state/game_state.js';
import type {
    PendingEventDecision,
    DimensionShift,
} from '../../src/sim/events/event_types.js';
import type { DaytonProposal } from '../../src/state/negotiation_types.js';
// Diagnostic-only imports (used behind DIAGNOSE_DAYTON_FREEZE=1 in resolveDayton).
import { buildCostLedger } from '../../src/sim/endgame/cost_ledger.js';
import { compareToHistorical } from '../../src/sim/endgame/endgame_comparison.js';
// @ts-ignore -- JSON import, no .d.ts
import historicalBaseline from '../../data/reference/historical_baseline.json' with { type: 'json' };
// Presidential lever staging modules (CommonJS; same pure (state, payload) => {ok, error}
// functions the Electron IPC handlers call — see src/desktop/electron-main.cjs). Importing
// them directly here, instead of going through Electron IPC, is exactly the "port onto
// president_playthrough.ts" direction the 2026-08-05 Pyrrhic panel review recommended
// (docs/40_reports/20260805_RS_PLAYTHROUGH_PYRRHIC_PANEL_SYNTHESIS.md) — same pure engine
// functions, no Electron/Playwright overhead, and this file's existing determinism proof
// (replayDecisionLog) extends to these too since none of them touch RNG/clock.
// @ts-ignore -- plain CommonJS module, no .d.ts
import { stageOpDirective } from '../../src/desktop/op_directive_staging.cjs';
// @ts-ignore
import { stageOpHalt } from '../../src/desktop/op_halt.cjs';
// @ts-ignore
import { stageCoReplacement } from '../../src/desktop/co_replacement.cjs';
// @ts-ignore
import { stageMunicipalitySupportOrderOnState } from '../../src/desktop/municipality_support_staging.cjs';
// @ts-ignore

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
    /** Quantified per-option stakes the human modal shows; omitted when the option carries none. */
    dimension_shifts?: DimensionShift[];
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
    // Fixed 2026-08-06 per Pyrrhic panel review (Determinism Auditor,
    // docs/40_reports/20260806_RBIH_PYRRHIC_PANEL_SYNTHESIS.md Part 5 item 1):
    // src/state/displacement.ts documents this module-level cache as required to be
    // reset "at simulation start" for deterministic simulation. The desktop path
    // (startNewCampaign/advanceTurn) never calls it — fine for a real Electron process
    // (one process = one campaign), but this harness can run multiple campaigns
    // back-to-back in one process, so a prior campaign's unsupplied-turn counters were
    // silently bleeding into the next one's displacement/internal_cohesion numbers.
    resetDisplacementPressureCache();
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
            dimension_shifts: o.dimension_shifts,
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

// ── Presidential levers (added 2026-08-06, per the RS ahistorical playthrough's ────
//    Pyrrhic panel review recommendation: port the lever surface onto this determinism-
//    proven harness instead of driving it through Electron/Playwright). Each function
//    is a thin wrapper over the exact same pure (state, payload) => {ok, error} staging
//    function the desktop IPC handler calls — no Electron process, no IPC round trip.

export interface LeverResult { ok: boolean; error?: string; [k: string]: unknown }

/** REQUEST-OP: president names a target OSID; engine auto-builds the axis/force. CA 25. */
export function requestOp(state: GameState, corpsId: string, targetOsid: string): LeverResult {
    return stageOpDirective(state, { corpsId, targetOsid });
}

/** STOP-OP: halt a named live operation. CA 25. */
export function stopOp(state: GameState, corpsId: string, opName: string): LeverResult {
    return stageOpHalt(state, { corpsId, opName });
}

/** REPLACE-CO: sack + install (auto-pick if replacementOfficerId omitted). CA 25. */
export function replaceCo(state: GameState, corpsId: string, replacementOfficerId?: string): LeverResult {
    return stageCoReplacement(state, { corpsId, ...(replacementOfficerId ? { replacementOfficerId } : {}) });
}

/** ELITE-DEPLOY: release an elite/reserve brigade to a corps. CA 25. Async (desktop_sim). */
export async function eliteDeploy(
    state: GameState,
    requestId: string,
    brigadeId: string,
    reason: string | undefined,
    baseDir: string = REPO_BASE_DIR,
): Promise<LeverResult> {
    return approveReserveRequest(state, requestId, brigadeId, reason, baseDir) as unknown as Promise<LeverResult>;
}

/** Local Support: single weekly slot per faction, expires same turn. No CA cost. */
export function localSupport(
    state: GameState,
    faction: FactionId,
    munId: string,
    type: 'weapons_shipment' | 'staff_priority' | 'croatian_support_package',
): LeverResult {
    return stageMunicipalitySupportOrderOnState(state, { faction, munId, type });
}

/** Resolve a peace-plan menu ('accepted' or 'rejected'). */
export function resolvePeacePlanChoice(state: GameState, planId: string, response: 'accepted' | 'rejected') {
    return resolvePeacePlan(state, planId, response);
}

/**
 * Resolve pending paramilitary integration requests. `decisionByTarget` maps
 * target_osid -> 'allow' | 'deny'; unmatched pending requests are left untouched.
 * Mirrors the electron-main.cjs IPC handler's set-then-sweep pattern.
 */
export function resolveParamilitary(state: GameState, decisionByTarget: Record<string, 'allow' | 'deny'>): number {
    const pending = ((state as any).pending_paramilitary_requests ?? []) as Array<{ target_osid: string; decision?: string }>;
    let matched = 0;
    for (const req of pending) {
        if (req.decision === 'allow' || req.decision === 'deny' || req.decision === 'regular') continue;
        const d = decisionByTarget[req.target_osid];
        if (!d) continue;
        req.decision = d;
        matched++;
    }
    if (matched > 0) resolvePlayerParamilitaryDecisions(state);
    return matched;
}

/**
 * Resolve Dayton with a REAL, deliberately-constructed proposal (not an echoed pending
 * object — that specific mistake, and the resulting fabricated `peace_dysfunction_index`,
 * is documented and retracted in docs/40_reports/20260805_RS_AHISTORICAL_PRESIDENTIAL_PLAYTHROUGH.md).
 *
 * UPDATE 2026-08-06 (verified in source, not assumed): `resolveDaytonNegotiation` now
 * clears `military.negotiation.pending_dayton` atomically with the `dayton_result` write
 * itself (`src/sim/negotiation/dayton_negotiation.ts:476-477`, landed as R4 Phase 6 Task
 * 6.1). This function no longer needs to work around that — it doesn't.
 *
 * The round-trip below is KEPT but its justification is corrected. The RBiH Pyrrhic panel
 * review (docs/40_reports/20260806_RBIH_PYRRHIC_PANEL_SYNTHESIS.md Part 1 item 5;
 * Systems Programmer) found the original stated reason was wrong: `compareToHistorical`
 * takes no `GameState` at all (a pure function of `(costLedger, baseline)`), so a state
 * round-trip cannot be what changes its behavior. The real failure point is almost
 * certainly inside `buildCostLedger` itself throwing. `DIAGNOSE_DAYTON_FREEZE=1` in the
 * environment makes this function bypass the swallowed exception and report the REAL
 * error the first time it would otherwise go silent, so this comment can eventually be
 * replaced with a verified root cause instead of a corrected-but-still-unproven one.
 */
export function resolveDayton(state: GameState, proposal: DaytonProposal): { result: unknown; state: GameState } {
    const roundTripped = deserializeState(serializeState(state)) as GameState;
    const result = resolveDaytonNegotiation(roundTripped, proposal) as any;

    if (process.env.DIAGNOSE_DAYTON_FREEZE === '1') {
        const es = (roundTripped as any).meta?.endgame_snapshot;
        if (es && es.historical_comparison === undefined) {
            // Reproduce the exact failure with the swallow removed, on the SAME
            // (round-tripped) state, so we learn whether the round trip is genuinely
            // load-bearing or whether the failure persists even here.
            try {
                const cl = buildCostLedger(roundTripped);
                try {
                    compareToHistorical(cl as Parameters<typeof compareToHistorical>[0], historicalBaseline as Parameters<typeof compareToHistorical>[1]);
                    console.error('[DIAGNOSE_DAYTON_FREEZE] buildCostLedger + compareToHistorical BOTH succeeded on the round-tripped state, yet endgame_snapshot.historical_comparison is undefined — the freeze must be reading a stale/different result. Investigate freezeEndgameSnapshot itself.');
                } catch (e: any) {
                    console.error('[DIAGNOSE_DAYTON_FREEZE] compareToHistorical threw on the round-tripped state:', e?.stack ?? e);
                }
            } catch (e: any) {
                console.error('[DIAGNOSE_DAYTON_FREEZE] buildCostLedger threw on the round-tripped state:', e?.stack ?? e);
            }
        } else if (!es || es.historical_comparison !== undefined) {
            console.error('[DIAGNOSE_DAYTON_FREEZE] historical_comparison populated normally — no failure to diagnose on this run.');
        }
    }

    return { result, state: roundTripped };
}

/** Read the manifest's own blocking-decision list (same check advance-turn makes). */
export function blockingDecisions(state: GameState, faction: FactionId | null) {
    return listBlockingPlayerDecisions(state as any, faction);
}

/**
 * Accept/reject a `state.meta.pending_proposal_reviews` entry (autonomy proposals,
 * SET_STANCE, APPROVE_OP, OPPORTUNITY, and — critically — `HISTORICAL_OP:` pre-planned
 * operation authorizations). Replicates electron-main.cjs's accept-proposal/reject-proposal
 * handlers' logic directly.
 *
 * `HISTORICAL_OP:` reviews are the exact gate the RS ahistorical playthrough's automation
 * missed (it only pattern-matched `APPROVE_OP:`, so RS's entire pre-planned offensive slate
 * sat unaccepted for 188 weeks — see the "operations_launched: 0" correction in
 * docs/40_reports/20260805_RS_AHISTORICAL_PRESIDENTIAL_PLAYTHROUGH.md). They need no special
 * handling beyond `accepted = true` — `inject-player-pre-planned-operations`
 * (war_phases.ts) re-injects them the next turn once accepted.
 */
export function resolveProposal(state: GameState, proposalId: string, accept: boolean): LeverResult {
    const proposals = ((state as any).meta?.pending_proposal_reviews ?? []) as Array<any>;
    const proposal = proposals.find((p) => p.proposal_id === proposalId || p.id === proposalId);
    if (!proposal) return { ok: false, error: 'not_found' };
    if (proposal.accepted !== undefined || proposal.resolved_turn !== undefined) {
        return { ok: false, error: 'already_resolved' };
    }
    proposal.accepted = accept;
    proposal.resolved_turn = (state as any).meta.turn;
    const action: string | undefined = proposal.proposed_action;
    if (accept && action?.startsWith('SET_STANCE:')) {
        const [, corpsId, stanceValue] = action.split(':');
        const cc = (state as any).military?.corps_command?.[corpsId];
        if (cc) { cc.stance = stanceValue; cc.player_ordered_stance = stanceValue; }
    } else if (action?.startsWith('APPROVE_OP:')) {
        const [, corpsId, planId] = action.split(':');
        const cc = (state as any).military?.corps_command?.[corpsId];
        if (cc) cc.player_op_response = { plan_id: planId, approved: accept, turn: (state as any).meta.turn };
    } else if (!accept && action?.startsWith('SET_STANCE:')) {
        const [, corpsId] = action.split(':');
        const cc = (state as any).military?.corps_command?.[corpsId];
        if (cc) cc.player_ordered_stance = proposal.current_value ?? cc.stance;
    }
    return { ok: true };
}

/** All not-yet-resolved `pending_proposal_reviews` for the player faction, optionally filtered by proposed_action prefix. */
export function pendingProposals(state: GameState, prefix?: string): Array<any> {
    const proposals = ((state as any).meta?.pending_proposal_reviews ?? []) as Array<any>;
    return proposals.filter((p) => p.accepted === undefined && p.resolved_turn === undefined
        && (!prefix || (typeof p.proposed_action === 'string' && p.proposed_action.startsWith(prefix))));
}
