import { cloneGameState } from '../../state/clone.js';
import type { FactionId, GameState } from '../../state/game_state.js';
import { applyEventEffects } from './apply_effects.js';
import { applyDefinitionDimensionShifts, applyDefinitionFlags } from './evaluate_events.js';
import { resolveEventDecision } from './resolve_decision.js';
import type { EventDefinition, EventEffect, PendingEventDecision } from './event_types.js';

const IDENTITY = 'rbih_state_identity';
const POLICY = 'rbih_paramilitary_policy_1992';
const OPTIONS = ['always_deny', 'ask', 'always_allow'] as const;
const REVIEWED_IDENTITY_CANONICAL_LENGTH = 69592;
const REVIEWED_IDENTITY_FNV64 = 'a8b1bb427b526c07';
const REVIEWED_POLICY_CANONICAL_LENGTH = 10911;
const REVIEWED_POLICY_FNV64 = '4db9c9795b1abb6d';

export type EventDefinitionCatalog = readonly EventDefinition[] | ReadonlyMap<string, EventDefinition>;

function findDefinition(catalog: EventDefinitionCatalog | undefined, id: string): EventDefinition | undefined {
    if (!catalog) return undefined;
    if (Array.isArray(catalog)) return catalog.find((entry: EventDefinition) => entry.id === id);
    return (catalog as ReadonlyMap<string, EventDefinition>).get(id);
}

function effects(def: EventDefinition): EventEffect[] {
    return [def.effect, ...(def.effects ?? [])];
}

function canonicalValue(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(canonicalValue);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.keys(value as Record<string, unknown>)
            .sort()
            .map((key) => [key, canonicalValue((value as Record<string, unknown>)[key])]));
    }
    return value;
}

function canonicalJson(value: unknown): string {
    return JSON.stringify(canonicalValue(value));
}

function fnv64(value: string): string {
    let hash = 14695981039346656037n;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= BigInt(value.charCodeAt(index));
        hash = BigInt.asUintN(64, hash * 1099511628211n);
    }
    return hash.toString(16).padStart(16, '0');
}

function buildPending(def: EventDefinition, faction: FactionId, turn: number): PendingEventDecision {
    const narrative = effects(def).filter((e) => e.kind === 'narrative').map((e) => e.text).join(' ');
    return {
        event_id: def.id,
        event_title: def.title || def.narrative || narrative || def.id,
        ...(def.narrative ? { narrative: def.narrative } : {}),
        ...(def.category ? { category: def.category } : {}),
        ...(def.situation ? { situation: def.situation } : {}),
        ...(def.staff_assessment ? { staff_assessment: def.staff_assessment } : {}),
        ...(def.trigger_evidence?.length ? { trigger_evidence: [...def.trigger_evidence] } : {}),
        ...(def.historical_source ? { historical_source: def.historical_source } : {}),
        ...(def.source_note ? { source_note: def.source_note } : {}),
        ...(def.source ? { source: def.source } : {}),
        turn_fired: turn,
        response_options: JSON.parse(JSON.stringify(def.response_options ?? [])),
        faction,
        requires_player_response: def.requires_player_response,
        ...(def.historical_default_response_id ? { historical_default_response_id: def.historical_default_response_id } : {}),
        ...(def.staff_recommended_response_id ? { staff_recommended_response_id: def.staff_recommended_response_id } : {}),
        ...(def.notifications_to_other_factions
            ? { notifications_to_other_factions: JSON.parse(JSON.stringify(def.notifications_to_other_factions)) }
            : {}),
    };
}

function requireCurrentDecision(state: GameState, eventId: string, responseId: string): PendingEventDecision {
    const player = state.meta.player_faction;
    if (player !== 'RBiH' && player !== 'RS' && player !== 'HRHB') throw new Error('Event decisions require a current player faction');
    if (state.meta.headless_scenario_auto_control === true) throw new Error('Headless auto-control cannot submit player event decisions');
    const matches = (state.military.pending_event_decisions ?? []).filter((d) => d.event_id === eventId);
    if (matches.length !== 1) throw new Error(`Expected exactly one pending decision for event_id "${eventId}"`);
    const decision = matches[0]!;
    if (decision.faction !== player) throw new Error(`Event decision ${eventId} is not owned by the current player faction`);
    if (!decision.response_options.some((option) => option.id === responseId)) throw new Error(`No response option "${responseId}" for event "${eventId}"`);
    return decision;
}

function reviewedPolicy(catalog: EventDefinitionCatalog | undefined): EventDefinition {
    const def = findDefinition(catalog, POLICY);
    const optionIds = (def?.response_options ?? []).map((option) => option.id);
    const canonical = def ? canonicalJson(def) : '';
    if (!def || canonical.length !== REVIEWED_POLICY_CANONICAL_LENGTH || fnv64(canonical) !== REVIEWED_POLICY_FNV64
        || def.trigger.phase !== 'war' || def.responding_faction !== 'RBiH' || def.requires_enabled !== true
        || def.once !== true || def.requires_player_response !== true || def.historical_default_response_id !== 'always_deny'
        || optionIds.length !== OPTIONS.length || optionIds.some((id, i) => id !== OPTIONS[i])) {
        throw new Error(`Reviewed contract changed for ${POLICY}`);
    }
    return def;
}

function reviewedIdentity(catalog: EventDefinitionCatalog | undefined): EventDefinition {
    const def = findDefinition(catalog, IDENTITY);
    const canonical = def ? canonicalJson(def) : '';
    if (!def || canonical.length !== REVIEWED_IDENTITY_CANONICAL_LENGTH || fnv64(canonical) !== REVIEWED_IDENTITY_FNV64
        || def.trigger.phase !== 'war' || def.trigger.turn_min !== 2 || def.trigger.turn_max !== 5
        || def.responding_faction !== 'RBiH' || def.once !== true || def.requires_player_response !== true) {
        throw new Error(`Reviewed contract changed for ${IDENTITY}`);
    }
    return def;
}

function requireCanonicalIdentityReceipt(
    state: GameState,
    catalog: EventDefinitionCatalog | undefined,
    openingLane: boolean,
    policyFireTurn: number,
): void {
    const receipts = (state.military.event_decision_log ?? []).filter((receipt) => receipt.event_id === IDENTITY);
    if (receipts.length !== 1) throw new Error('Opening policy requires exactly one canonical identity receipt');
    const receipt = receipts[0]!;
    const identity = findDefinition(catalog, IDENTITY);
    const option = identity?.response_options?.find((entry) => entry.id === receipt.response_id);
    const identityTurnMin = identity?.trigger.turn_min;
    const identityTurnMax = identity?.trigger.turn_max;
    const receiptIsCanonicalForLane = openingLane
        ? receipt.turn === 0
        : typeof identityTurnMin === 'number' && typeof identityTurnMax === 'number'
            && receipt.turn >= identityTurnMin && receipt.turn <= identityTurnMax && receipt.turn <= policyFireTurn;
    if (!identity || identity.responding_faction !== 'RBiH' || receipt.decision_source !== 'player'
        || receipt.faction !== 'RBiH' || !receiptIsCanonicalForLane
        || state.military.event_flags.rbih_state_identity !== receipt.response_id
        || !option?.enables_events_runtime?.includes(POLICY)) {
        throw new Error('Opening policy identity receipt does not establish the authored enabling basis');
    }
}

function requirePolicyResponseState(
    state: GameState,
    decision: PendingEventDecision,
    catalog: EventDefinitionCatalog | undefined,
): void {
    const def = reviewedPolicy(catalog);
    const fireTurn = decision.turn_fired;
    const turnMin = def.trigger.turn_min;
    const turnMax = def.trigger.turn_max;
    const openingLane = fireTurn === 0 && state.meta.turn === 0;
    const legacyLane = typeof turnMin === 'number' && typeof turnMax === 'number'
        && fireTurn >= turnMin && fireTurn <= turnMax && state.meta.turn >= fireTurn;
    const military = state.military;
    const headlessMarkerIsEligible = openingLane
        ? state.meta.headless_scenario_auto_control === false
        : state.meta.headless_scenario_auto_control !== true;
    if (state.meta.phase !== 'war' || state.meta.player_faction !== 'RBiH'
        || !headlessMarkerIsEligible || decision.faction !== 'RBiH'
        || decision.requires_player_response !== true || (!openingLane && !legacyLane)
        || (military.pending_event_decisions ?? []).filter((entry) => entry.event_id === POLICY).length !== 1
        || military.fired_event_ids.filter((id) => id === POLICY).length !== 1
        || military.event_fire_counts[POLICY] !== 1
        || military.event_last_fired_turn[POLICY] !== fireTurn
        || military.enabled_event_ids.filter((id) => id === POLICY).length !== 1
        || (military.closed_event_ids ?? []).includes(POLICY)
        || (military.event_decision_log ?? []).some((receipt) => receipt.event_id === POLICY)) {
        throw new Error('Pending RBiH policy response is not eligible in the current state');
    }
    requireCanonicalIdentityReceipt(state, catalog, openingLane, fireTurn);
    if (canonicalJson(decision) !== canonicalJson(buildPending(def, 'RBiH', fireTurn))) {
        throw new Error('Pending RBiH policy payload differs from the reviewed catalog');
    }
}

function requireIdentityLane(
    state: GameState,
    decision: PendingEventDecision,
    catalog: EventDefinitionCatalog | undefined,
): { policy?: EventDefinition; opening: boolean } {
    const identity = reviewedIdentity(catalog);
    const fireTurn = decision.turn_fired;
    const opening = fireTurn === 0 && state.meta.turn === 0
        && state.meta.headless_scenario_auto_control === false;
    const legacy = fireTurn >= identity.trigger.turn_min! && fireTurn <= identity.trigger.turn_max!
        && state.meta.turn >= fireTurn && state.meta.headless_scenario_auto_control !== true;
    if (state.meta.phase !== 'war' || state.meta.player_faction !== 'RBiH'
        || decision.faction !== 'RBiH' || decision.requires_player_response !== true || (!opening && !legacy)) {
        throw new Error('RBiH identity decision is not eligible in the current state');
    }
    const military = state.military;
    if (military.fired_event_ids.filter((id) => id === IDENTITY).length !== 1
        || military.event_fire_counts[IDENTITY] !== 1
        || military.event_last_fired_turn[IDENTITY] !== fireTurn
        || military.event_readiness[IDENTITY] !== 0
        || (military.closed_event_ids ?? []).includes(IDENTITY)
        || canonicalJson(decision) !== canonicalJson(buildPending(identity, 'RBiH', fireTurn))
        || military.fired_event_ids.includes(POLICY) || (military.closed_event_ids ?? []).includes(POLICY)
        || (military.enabled_event_ids ?? []).includes(POLICY)
        || (military.pending_event_decisions ?? []).some((d) => d.event_id === POLICY)
        || (military.event_decision_log ?? []).some((r) => r.event_id === POLICY || r.event_id === IDENTITY)) {
        throw new Error('RBiH identity decision is stale, forged, or already completed');
    }
    return opening ? { policy: reviewedPolicy(catalog), opening: true } : { opening: false };
}

function queuePolicy(state: GameState, def: EventDefinition): void {
    const turn = state.meta.turn;
    applyEventEffects(state, effects(def));
    applyDefinitionDimensionShifts(state, def.dimension_shifts);
    applyDefinitionFlags(state, def.sets_flags);
    state.military.fired_event_ids.push(def.id);
    state.military.event_fire_counts[def.id] = 1;
    state.military.event_last_fired_turn[def.id] = turn;
    state.military.event_readiness[def.id] = 0;
    state.military.pending_event_decisions ??= [];
    state.military.pending_event_decisions.push(buildPending(def, 'RBiH', turn));
}

export function resolvePlayerEventDecisionWithOpeningPolicy(
    state: GameState,
    catalog: EventDefinitionCatalog | undefined,
    eventId: string,
    responseId: string,
): GameState {
    const candidate = cloneGameState(state);
    const pending = requireCurrentDecision(candidate, eventId, responseId);
    const identityLane = eventId === IDENTITY ? requireIdentityLane(candidate, pending, catalog) : undefined;
    const policy = identityLane?.policy;
    if (eventId === POLICY) requirePolicyResponseState(candidate, pending, catalog);
    const receiptsBefore = (candidate.military.event_decision_log ?? []).filter((r) => r.event_id === IDENTITY).length;
    resolveEventDecision(candidate, eventId, responseId);
    if (policy) {
        const receipts = (candidate.military.event_decision_log ?? []).filter((r) => r.event_id === IDENTITY);
        const receipt = receipts.at(-1);
        if (receipts.length !== receiptsBefore + 1 || receipt?.response_id !== responseId || receipt.decision_source !== 'player'
            || receipt.faction !== 'RBiH' || receipt.turn !== 0 || !(candidate.military.enabled_event_ids ?? []).includes(POLICY)
            || candidate.paramilitary_policy !== 'ask') {
            throw new Error('Canonical identity resolution did not establish the reviewed policy preconditions');
        }
        queuePolicy(candidate, policy);
    }
    return candidate;
}
