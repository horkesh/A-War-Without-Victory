import { cloneGameState } from '../../state/clone.js';
import type { FactionId, GameState } from '../../state/game_state.js';
import { applyEventEffects } from './apply_effects.js';
import { applyDefinitionDimensionShifts, applyDefinitionFlags } from './evaluate_events.js';
import { resolveEventDecision } from './resolve_decision.js';
import type { EventDefinition, EventEffect, PendingEventDecision } from './event_types.js';

const IDENTITY = 'rbih_state_identity';
const POLICY = 'rbih_paramilitary_policy_1992';
const OPTIONS = ['always_deny', 'ask', 'always_allow'] as const;
// Re-pinned 2026-11-14 for the BCS diacritics restored in this event's `localizations.bcs` text
// (was 69592 / a8b1bb427b526c07). Only BCS display strings changed; trigger, options, effects unchanged.
// Re-pinned 2026-11-15 after the citation audit (was 69579 / 6d447e72f84a687d). Reviewed by the historian, narrative and
// canon-compliance seats as a whole event: 13 `explanation` strings changed (6 player-visible wording and citation fixes,
// 7 hidden developer-note citations); trigger, options, effects, flags and dimension shifts are byte-identical.
// Re-pinned again 2026-11-15 (was 70817 / a5cda75445f4eff3): three imprecise A/54/549 and Krstić paragraph cites in visible
// explanations and the Owen-Stoltenberg consequence label ("response decision", the event it opens is a player Accept or Resist
// decision); string-only, reviewed with the policy event below.
const REVIEWED_IDENTITY_CANONICAL_LENGTH = 70844;
const REVIEWED_IDENTITY_FNV64 = 'acbebbba72173a81';
// Re-pinned 2026-11-15 (was 10911 / 4db9c9795b1abb6d): three hidden provenance notes cited UN A/54/549 §35 (the Srebrenica enclave
// before the safe areas) for the ARBiH chain of command; the two hidden notes now record the correction and the visible source
// line drops the paragraph. Strings only; options, effects, flags and dimension shifts are byte-identical.
// Re-pinned 2026-11-16 for RF-PM1 (was 11239 / 3aa51be73b2cdda0), conditions of the RF-PM1 §6 panel (engine and red-team seats):
// `always_deny` no longer previews the RS-only `csq_paramilitary_authorization_refused` (opens_events emptied) and the `ask`
// explanation no longer names that internal id. Options, effects, flags and dimension shifts are byte-identical.
const REVIEWED_POLICY_CANONICAL_LENGTH = 11091;
const REVIEWED_POLICY_FNV64 = '57f0d7f927df002c';

/**
 * The two preview values RF-PM1 corrected, as a decision saved before the change carries them. Exactly these old values are
 * upgraded to the reviewed ones before the save is compared with the catalog, so such a save can still be answered; any other
 * drift (including any other opens_events or explanation) is still refused. `opens_events` is preview and receipt metadata and
 * gates no firing (`enables_events_runtime` does).
 */
const PRE_RF_PM1_POLICY_PREVIEW: ReadonlyArray<{ option: string; field: 'opens_events' | 'explanation'; from: unknown; to: unknown }> = [
    { option: 'always_deny', field: 'opens_events', from: ['csq_paramilitary_authorization_refused'], to: [] },
    {
        option: 'ask',
        field: 'explanation',
        from: 'Per-decision review routes each proposed deployment through a modal with full casualty projection. The csq_paramilitary_authorization_refused counterfactual remains reachable if approvals are never granted; the international-standing penalty remains modest until a deployment is actually approved.',
        to: 'Per-decision review routes each proposed deployment through a modal with full casualty projection. The international-standing penalty remains modest until a deployment is actually approved.',
    },
];

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

/**
 * The structure of a pending decision with its player-facing wording removed.
 *
 * A pending decision copies the event's display text into the save when it fires, so a save written by an
 * older build carries that build's wording. The reviewed-contract hash still pins the whole definition
 * (wording included) at the catalog, but a saved decision is judged on what it can DO: event id, turn,
 * faction, option ids, effects, flags, dimension shifts, defaults and consequence structure. Wording drift
 * therefore cannot strand a save, while a forged or altered mechanic is still refused.
 */
function withoutDisplayText(decision: PendingEventDecision): unknown {
    const copy = JSON.parse(JSON.stringify(decision)) as Record<string, unknown>;
    for (const key of ['event_title', 'narrative', 'situation', 'staff_assessment', 'trigger_evidence', 'historical_source', 'source_note', 'source']) {
        delete copy[key];
    }
    delete copy.notifications_to_other_factions;
    for (const option of (copy.response_options ?? []) as Array<Record<string, unknown>>) {
        delete option.label;
        delete option.description;
        for (const consequence of (option.future_consequences ?? []) as Array<Record<string, unknown>>) {
            delete consequence.label;
            delete consequence.explanation;
        }
    }
    return copy;
}

/**
 * The paramilitary-policy decision keeps a stricter comparison than the identity card (its narrative, notifications and option text
 * must still match the reviewed catalog), but the three developer provenance notes it copies into a save (`historical_source`,
 * `source_note`, `source`) are never shown to a player and are corrected when an audit finds a wrong cite, so they must not strand a
 * save written before the correction either. The two exact pre-RF-PM1 preview values (`PRE_RF_PM1_POLICY_PREVIEW`) are upgraded for
 * the same reason.
 */
function withoutProvenanceText(decision: PendingEventDecision): unknown {
    const copy = JSON.parse(JSON.stringify(decision)) as Record<string, unknown>;
    for (const key of ['historical_source', 'source_note', 'source']) delete copy[key];
    for (const rule of PRE_RF_PM1_POLICY_PREVIEW) {
        const option = ((copy.response_options ?? []) as Array<Record<string, unknown>>).find((entry) => entry.id === rule.option);
        for (const consequence of (option?.future_consequences ?? []) as Array<Record<string, unknown>>) {
            if (canonicalJson(consequence[rule.field]) === canonicalJson(rule.from)) consequence[rule.field] = JSON.parse(JSON.stringify(rule.to));
        }
    }
    return copy;
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
    if (canonicalJson(withoutProvenanceText(decision)) !== canonicalJson(withoutProvenanceText(buildPending(def, 'RBiH', fireTurn)))) {
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
        || canonicalJson(withoutDisplayText(decision)) !== canonicalJson(withoutDisplayText(buildPending(identity, 'RBiH', fireTurn)))
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

/**
 * Whether a player's opening foundational decision is pre-fired at campaign birth (turn 0)
 * — shared by the Electron (`desktop_sim.ts`) and browser-fallback start adapters.
 *
 * BOT-EQUIVALENT TIMING. A bot answers a foundational event in its authored trigger window,
 * so only an event eligible on the first turn (rs_strategic_goals, window t1-3) is
 * pre-fired. One whose window opens later (hrhb_political_goal, t3-7) is left to
 * evaluate-events: it fires the turn a bot's would and the player answers it in the pause
 * before combat. Pre-firing hrhb_political_goal at t0 applied its one-shot effects to the
 * t0 formation set (croat_republic: +5 HRHB morale), so the four HRHB brigades raised
 * before the bot's fire turn (t4) kept a permanent -5 morale offset, the gated
 * hrhb_1992_graz_cooperation_collapse fired a turn early, and by t65 the offset changed a
 * Central Bosnia brigade's orders.
 *
 * rbih_state_identity (window t2-5) keeps its reviewed turn-0 receipt: the pre-first-Advance
 * paramilitary policy lane above requires it (`receipt.turn !== 0` throws). Moving it is an
 * owner call; its measured residual is a morale offset on two late-raised ARBiH brigades.
 */
export function preFiresOpeningDecisionAtBirth(def: EventDefinition, turn: number): boolean {
    if (def.id === IDENTITY) return true;
    const turnMin = def.trigger?.turn_min;
    return turnMin == null || turnMin <= turn + 1;
}
