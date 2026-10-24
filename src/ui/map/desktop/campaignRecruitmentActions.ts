import type { IPC } from './useIPC';
import type { RecruitmentCatalogBrigade, StartNewCampaignPayload } from './types';
import type { FactionId, GameState } from '../../../state/game_state.js';
import type { DimensionShift, EventDefinition, EventEffect, PendingEventDecision } from '../../../sim/events/event_types.js';
import { applyEventEffects } from '../../../sim/events/apply_effects.js';
import { applyDimensionShift, type DimensionStore } from '../../../sim/events/strategic_dimensions.js';
import { deferUnauthorizedHistoricalOperationsForPlayer } from '../../../sim/combat/historical_operation_authorization.js';
import { initializeNegotiationState } from '../../../sim/negotiation/initialize_negotiation_state.js';
import {
    resolvePlayerEventDecisionWithOpeningPolicy,
    type EventDefinitionCatalog,
} from '../../../sim/events/opening_policy_transition.js';

const BROWSER_STARTUP_SNAPSHOT_PATH = '/data/derived/startup/apr_1992_initial_save.json';
const BROWSER_EVENT_CATALOG_PATH = '/data/scenarios/events/war_1992.json';
type PlayerFactionId = 'RBiH' | 'RS' | 'HRHB';
const OPENING_FOUNDATIONAL_EVENT_BY_FACTION: Record<PlayerFactionId, string> = {
    RBiH: 'rbih_state_identity',
    RS: 'rs_strategic_goals',
    HRHB: 'hrhb_political_goal',
};

interface LoadDeps {
    ipc: IPC;
    loadSave: (jsonOrText: unknown | string) => Promise<void>;
    setLoadError: (msg: string | null) => void;
}

function collectEventDefinitionEffects(def: EventDefinition): EventEffect[] {
    return [def.effect, ...(def.effects ?? [])];
}

function getOpeningDecisionTitle(def: EventDefinition): string {
    if (def.title) return def.title;
    if (def.narrative) return def.narrative;
    const narrativeEffects = collectEventDefinitionEffects(def)
        .filter((effect) => effect.kind === 'narrative')
        .map((effect) => effect.text);
    return narrativeEffects.length > 0 ? narrativeEffects.join(' ') : def.id;
}

function recordOpeningEventFiring(state: GameState, eventId: string, turn: number): void {
    if (!state.military.fired_event_ids.includes(eventId)) {
        state.military.fired_event_ids.push(eventId);
    }
    state.military.event_fire_counts[eventId] = (state.military.event_fire_counts[eventId] ?? 0) + 1;
    state.military.event_last_fired_turn[eventId] = turn;
    state.military.event_readiness[eventId] = 0;
}

function applyBrowserDefinitionDimensionShifts(state: GameState, shifts: DimensionShift[] | undefined): void {
    if (!shifts || shifts.length === 0) return;
    const negotiation = state.military.negotiation;
    if (!negotiation?.strategic_dimensions) return;
    const store = negotiation.strategic_dimensions as DimensionStore;
    for (const shift of shifts) {
        applyDimensionShift(store, shift.faction, shift.dimension, shift.delta);
    }
}

function applyBrowserDefinitionFlags(state: GameState, flags: Record<string, string | number | boolean> | undefined): void {
    if (!flags) return;
    if (!state.military.event_flags) {
        state.military.event_flags = {};
    }
    for (const [key, value] of Object.entries(flags)) {
        state.military.event_flags[key] = value;
    }
}

function buildOpeningPendingDecision(
    def: EventDefinition,
    playerFaction: FactionId,
    turn: number,
): PendingEventDecision {
    return {
        event_id: def.id,
        event_title: getOpeningDecisionTitle(def),
        ...(def.narrative ? { narrative: def.narrative } : {}),
        ...(def.category ? { category: def.category } : {}),
        ...(def.situation ? { situation: def.situation } : {}),
        ...(def.staff_assessment ? { staff_assessment: def.staff_assessment } : {}),
        ...(def.trigger_evidence && def.trigger_evidence.length > 0 ? { trigger_evidence: [...def.trigger_evidence] } : {}),
        ...(def.historical_source ? { historical_source: def.historical_source } : {}),
        ...(def.source_note ? { source_note: def.source_note } : {}),
        ...(def.source ? { source: def.source } : {}),
        turn_fired: turn,
        response_options: def.response_options ?? [],
        faction: playerFaction,
        requires_player_response: def.requires_player_response,
        ...(def.historical_default_response_id ? { historical_default_response_id: def.historical_default_response_id } : {}),
        ...(def.staff_recommended_response_id ? { staff_recommended_response_id: def.staff_recommended_response_id } : {}),
        ...(def.notifications_to_other_factions ? { notifications_to_other_factions: def.notifications_to_other_factions } : {}),
    };
}

export function queueBrowserOpeningFoundationalDecision(
    state: GameState,
    eventDefinitions: readonly EventDefinition[],
    playerFaction: PlayerFactionId,
): void {
    const eventId = OPENING_FOUNDATIONAL_EVENT_BY_FACTION[playerFaction];
    if ((state.military.pending_event_decisions ?? []).some((decision) => decision.event_id === eventId)) return;
    if (state.military.fired_event_ids.includes(eventId)) return;

    const def = eventDefinitions.find((entry) => entry.id === eventId);
    if (!def) {
        throw new Error(`Missing browser fallback opening foundational event definition: ${eventId}`);
    }
    if (def.responding_faction !== playerFaction) {
        throw new Error(
            `Browser fallback opening foundational event ${eventId} is authored for ${def.responding_faction ?? 'unknown'}, not ${playerFaction}`,
        );
    }
    if (!def.response_options || def.response_options.length === 0) {
        throw new Error(`Browser fallback opening foundational event ${eventId} has no response options`);
    }
    if (def.requires_player_response !== true) {
        throw new Error(`Browser fallback opening foundational event ${eventId} must require player response`);
    }

    const turn = state.meta?.turn ?? 0;
    applyEventEffects(state, collectEventDefinitionEffects(def));
    applyBrowserDefinitionDimensionShifts(state, def.dimension_shifts);
    applyBrowserDefinitionFlags(state, def.sets_flags);
    recordOpeningEventFiring(state, eventId, turn);

    state.military.pending_event_decisions ??= [];
    state.military.pending_event_decisions.push(buildOpeningPendingDecision(def, playerFaction, turn));
}

export function resolveBrowserEventDecision(
    state: GameState,
    eventId: string,
    responseId: string,
    eventCatalog?: EventDefinitionCatalog,
): GameState {
    const candidate = resolvePlayerEventDecisionWithOpeningPolicy(state, eventCatalog, eventId, responseId);
    for (const key of Object.keys(state) as Array<keyof GameState>) delete state[key];
    Object.assign(state, candidate);
    return state;
}

/**
 * Starts a new campaign for the selected faction, loads resulting state.
 * Returns true on success.
 */
export async function startCampaignFromSidePicker(
    { ipc, loadSave, setLoadError }: LoadDeps,
    payload: StartNewCampaignPayload,
): Promise<boolean> {
    const { playerFaction: faction, decisionMode, scenarioKey } = payload;
    if (ipc.isAvailable) {
        const result = await ipc.startNewCampaign(payload);
        if (!result.ok) {
            setLoadError(result.error ?? 'Failed to start campaign.');
            return false;
        }
        try {
            if (!result.stateJson) {
                setLoadError('Campaign started, but the player-visible state was unavailable.');
                return false;
            }
            await loadSave(result.stateJson);
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setLoadError(message);
            return false;
        }
    } else {
        console.warn('[dev-map] Desktop bridge unavailable, using baked startup snapshot fallback for scenario:', scenarioKey);
        try {
            if (scenarioKey !== 'apr_1992') {
                setLoadError(`Browser fallback does not support scenario: ${scenarioKey ?? 'unknown'}.`);
                return false;
            }
            const response = await fetch(BROWSER_STARTUP_SNAPSHOT_PATH);
            if (!response.ok) {
                setLoadError(`Baked startup snapshot unavailable (${response.status}).`);
                return false;
            }
            const snapshot = await response.json();
            if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
                setLoadError('Baked startup snapshot is not a valid game state object.');
                return false;
            }
            const state = snapshot as {
                meta?: {
                    player_faction?: StartNewCampaignPayload['playerFaction'];
                    decision_mode?: string;
                    headless_scenario_auto_control?: boolean;
                };
                political?: { control_events?: unknown[] };
            };
            state.meta = {
                ...(state.meta ?? {}),
                player_faction: faction,
                headless_scenario_auto_control: false,
            };
            state.meta.decision_mode = decisionMode;
            state.political = { ...(state.political ?? {}), control_events: [] };
            deferUnauthorizedHistoricalOperationsForPlayer(state as GameState);
            initializeNegotiationState(state as GameState);
            const eventResponse = await fetch(BROWSER_EVENT_CATALOG_PATH);
            if (!eventResponse.ok) {
                setLoadError(`Browser event catalog unavailable (${eventResponse.status}).`);
                return false;
            }
            const eventDefinitions = await eventResponse.json();
            if (!Array.isArray(eventDefinitions)) {
                setLoadError('Browser event catalog is not a valid event-definition array.');
                return false;
            }
            queueBrowserOpeningFoundationalDecision(state as GameState, eventDefinitions as EventDefinition[], faction);
            await loadSave(state);
            return true;
        } catch (err) {
            console.error('[dev-map] Fallback failed:', err);
            setLoadError('Browser fallback failed to initialize baked startup snapshot.');
            return false;
        }
    }
}

/**
 * Fetches the recruitment catalog from IPC. Returns empty array on error.
 */
export async function fetchRecruitmentCatalog({
    ipc,
    setLoadError,
}: {
    ipc: IPC;
    setLoadError: (msg: string | null) => void;
}): Promise<RecruitmentCatalogBrigade[]> {
    try {
        const result = await ipc.getRecruitmentCatalog();
        if (!result || typeof result !== 'object') return [];
        const raw = (result as { brigades?: unknown[] }).brigades;
        if (!Array.isArray(raw)) return [];
        return raw as RecruitmentCatalogBrigade[];
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setLoadError(message);
        return [];
    }
}

interface ApplyRecruitmentDeps extends LoadDeps {
    brigadeId: string;
    equipmentClass: string;
}

/**
 * Recruits a brigade via IPC and loads the updated state. Returns true on success.
 */
export async function applyRecruitmentAndSync({
    ipc,
    loadSave,
    setLoadError,
    brigadeId,
    equipmentClass,
}: ApplyRecruitmentDeps): Promise<boolean> {
    const result = await ipc.applyRecruitment(brigadeId, equipmentClass);
    if (!result.ok) {
        setLoadError(result.error ?? 'Recruitment failed.');
        return false;
    }
    try {
        const stateJson = await ipc.getCurrentGameState();
        if (!stateJson) {
            setLoadError('Recruitment succeeded, but the updated player-visible state was unavailable.');
            return false;
        }
        await loadSave(stateJson);
        return true;
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setLoadError(message);
        return false;
    }
}
