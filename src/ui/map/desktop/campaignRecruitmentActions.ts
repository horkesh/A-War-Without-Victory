import type { IPC } from './useIPC';
import type { RecruitmentCatalogBrigade, StartNewCampaignPayload } from './types';
import type { CausalityLogEntry, FactionId, GameState } from '../../../state/game_state.js';
import type { DimensionShift, EventDefinition, EventEffect, EventResponseOption, PendingEventDecision } from '../../../sim/events/event_types.js';
import { applyEventEffects } from '../../../sim/events/apply_effects.js';
import { applyDimensionShift, type DimensionStore } from '../../../sim/events/strategic_dimensions.js';

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

function strictTextCompare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

function recordBrowserEventDecision(
    state: GameState,
    eventId: string,
    responseId: string,
    faction: FactionId | null,
    currentTurn: number,
): void {
    state.military.event_decision_log ??= [];
    state.military.event_decision_log.push({
        event_id: eventId,
        response_id: responseId,
        decision_source: 'player',
        faction,
        turn: currentTurn,
    });
}

function sortedUniqueAppend(target: string[] | undefined, values: readonly string[] | undefined): string[] {
    const arr = target ? [...target] : [];
    let mutated = false;
    for (const value of values ?? []) {
        if (!arr.includes(value)) {
            arr.push(value);
            mutated = true;
        }
    }
    return mutated ? arr.sort(strictTextCompare) : arr;
}

function compareBrowserCausality(a: CausalityLogEntry, b: CausalityLogEntry): number {
    if (a.turn !== b.turn) return a.turn - b.turn;
    return (
        strictTextCompare(a.from_event, b.from_event) ||
        strictTextCompare(a.to_event ?? '', b.to_event ?? '') ||
        strictTextCompare(a.to_flag ?? '', b.to_flag ?? '') ||
        strictTextCompare(a.kind, b.kind) ||
        strictTextCompare(a.source_response_id ?? '', b.source_response_id ?? '')
    );
}

function recordBrowserCausality(state: GameState, entry: CausalityLogEntry): void {
    state.military.event_causality_log ??= [];
    const exists = state.military.event_causality_log
        .some((existing) => compareBrowserCausality(existing, entry) === 0);
    if (exists) return;
    state.military.event_causality_log.push(entry);
    state.military.event_causality_log.sort(compareBrowserCausality);
}

function applyBrowserResponseRuntimeCausality(
    state: GameState,
    eventId: string,
    responseId: string,
    chosen: EventResponseOption,
    turn: number,
): void {
    const firedIds = state.military.fired_event_ids ?? [];
    const enablesToWrite: string[] = [];
    for (const targetId of chosen.enables_events_runtime ?? []) {
        if (!firedIds.includes(targetId)) enablesToWrite.push(targetId);
        recordBrowserCausality(state, {
            turn,
            from_event: eventId,
            to_event: targetId,
            to_flag: null,
            kind: 'enables',
            source_response_id: responseId,
        });
    }
    if (enablesToWrite.length > 0) {
        state.military.enabled_event_ids = sortedUniqueAppend(state.military.enabled_event_ids, enablesToWrite);
    }

    const closesToWrite: string[] = [];
    for (const targetId of chosen.closes_events_runtime ?? []) {
        if (!firedIds.includes(targetId)) closesToWrite.push(targetId);
        recordBrowserCausality(state, {
            turn,
            from_event: eventId,
            to_event: targetId,
            to_flag: null,
            kind: 'closes',
            source_response_id: responseId,
        });
    }
    if (closesToWrite.length > 0) {
        state.military.closed_event_ids = sortedUniqueAppend(state.military.closed_event_ids, closesToWrite);
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
): void {
    const pending = state.military.pending_event_decisions;
    if (!pending) {
        throw new Error(`No pending event decisions found (looking for ${eventId})`);
    }
    const idx = pending.findIndex((decision) => decision.event_id === eventId);
    if (idx === -1) {
        throw new Error(`No pending decision for event_id "${eventId}"`);
    }
    const decision = pending[idx];
    const chosen = decision.response_options.find((option) => option.id === responseId);
    if (!chosen) {
        throw new Error(`No response option "${responseId}" for event "${eventId}"`);
    }

    applyEventEffects(state, chosen.effects ?? []);
    applyBrowserDefinitionFlags(state, chosen.sets_flags);
    applyBrowserDefinitionDimensionShifts(state, chosen.dimension_shifts);
    const turn = state.meta.turn ?? decision.turn_fired;
    recordBrowserEventDecision(state, eventId, chosen.id, decision.faction, turn);
    applyBrowserResponseRuntimeCausality(state, eventId, chosen.id, chosen, turn);
    pending.splice(idx, 1);
}

/**
 * Starts a new campaign for the selected faction, loads resulting state.
 * Returns true on success.
 */
export async function startCampaignFromSidePicker(
    { ipc, loadSave, setLoadError }: LoadDeps,
    faction: StartNewCampaignPayload['playerFaction'],
    scenarioKey?: string,
): Promise<boolean> {
    if (ipc.isAvailable) {
        const result = await ipc.startNewCampaign({ playerFaction: faction, scenarioKey });
        if (!result.ok || !result.stateJson) {
            setLoadError(result.error ?? 'Failed to start campaign.');
            return false;
        }
        try {
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
                decision_mode: 'emergent',
                headless_scenario_auto_control: false,
            };
            state.political = { ...(state.political ?? {}), control_events: [] };
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
    if (!result.ok || !result.stateJson) {
        setLoadError(result.error ?? 'Recruitment failed.');
        return false;
    }
    try {
        await loadSave(result.stateJson);
        return true;
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setLoadError(message);
        return false;
    }
}
