import { cloneGameState } from '../../state/clone.js';
import type { FactionId, GameState } from '../../state/game_state.js';
import { applyEventEffects } from './apply_effects.js';
import { applyDefinitionDimensionShifts, applyDefinitionFlags } from './evaluate_events.js';
import { resolveEventDecision } from './resolve_decision.js';
import type { EventDefinition, EventEffect, EventResponseOption, PendingEventDecision } from './event_types.js';
import { evaluateCondition } from './event_types.js';

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
// Re-pinned 2026-11-17 (was 70844 / acbebbba72173a81) by the §6 sensitive-copy panel on adjudicated figures (SHDG §6 record
// "Adjudicated figures and loose lines on 13 event cards"): three consequence `explanation` strings gave the Markale I toll as
// 68 and credited that figure to Galić; they now read "more than 60" (Galić TJ). String-only: trigger, options, effects, flags
// and dimension shifts are byte-identical, and a saved pending decision still matches (explanations are display text).
// Re-pinned 2026-11-17 (was 70875 / a3365d034c4c2ce9) by the §6 copy panel on latest final findings (SHDG §6 record "Latest
// final findings for the Markale and Srebrenica figures"): the three Markale I explanations now read "68 killed, nearly all of
// them civilians" (Mladić TJ G.8 para. 2097, upheld on appeal). String-only, as above.
// Re-pinned 2026-11-18 (was 70931 / f9e05e291c017954 on main; 70860 / b0b3c65da063ac99 on the §6 E4 branch) when §6 E4 merged
// main: both string changes held. The §6 E4 rounds 3-4 panel (narrative seat's copy, Q4) rewrote three Federation-army
// consequence `explanation` strings that spoke of patron pressure (the retired convention); the Markale I explanations above
// are unchanged. String-only, as above.
const REVIEWED_IDENTITY_CANONICAL_LENGTH = 70916;
const REVIEWED_IDENTITY_FNV64 = '80be52532990ff34';
// Re-pinned 2026-11-15 (was 10911 / 4db9c9795b1abb6d): three hidden provenance notes cited UN A/54/549 §35 (the Srebrenica enclave
// before the safe areas) for the ARBiH chain of command; the two hidden notes now record the correction and the visible source
// line drops the paragraph. Strings only; options, effects, flags and dimension shifts are byte-identical.
// Re-pinned 2026-11-16 for RF-PM1 (was 11239 / 3aa51be73b2cdda0), conditions of the RF-PM1 §6 panel (engine and red-team seats):
// `always_deny` no longer previews the RS-only `csq_paramilitary_authorization_refused` (opens_events emptied) and the `ask`
// explanation no longer names that internal id. Options, effects, flags and dimension shifts are byte-identical.
// Re-pinned 2026-11-23 (was 11091 / 57f0d7f927df002c) by the §4 card-copy panel (historian and narrative seats, three rounds):
// the hidden `historical_source` and `source` replace the A/54/549 §35 cite with para. 17, and a display-only
// `localizations.en.notifications_to_other_factions` block names "HVO staff" (was "Mostar staff") in the three HRHB rows; the
// persisted notification pairs are unchanged. Strings only; trigger, options, effects, flags and dimension shifts are byte-identical.
const REVIEWED_POLICY_CANONICAL_LENGTH = 12021;
const REVIEWED_POLICY_FNV64 = '550dec7d0eec4c6b';

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

function eventHasFired(state: GameState, eventId: string): boolean {
    return (state.military.fired_event_ids ?? []).includes(eventId)
        || (state.military.event_fire_counts?.[eventId] ?? 0) > 0;
}

function countOf(ids: readonly string[] | undefined, eventId: string): number {
    return (ids ?? []).filter((id) => id === eventId).length;
}

/**
 * D1 (§6 design T2): whether a FILED identity answer gives the policy card its authored basis. The card is
 * put to the player at t0 only when the filed option's `enables_events_runtime` names the card AND the
 * identity flag that option sets satisfies the card's trigger condition, both read from the reviewed catalog.
 * Otherwise the identity is filed alone: a policy answer filed for a card that can never fire would sit in
 * the record forever as an answer that never applies.
 */
export function filedIdentityOptionEnablesPolicy(
    option: EventResponseOption | undefined,
    policy: EventDefinition,
    state: GameState,
): boolean {
    if (!option?.enables_events_runtime?.includes(policy.id)) return false;
    const identityFlag = option.sets_flags?.[IDENTITY];
    if (identityFlag === undefined) return false;
    const condition = policy.trigger.condition;
    if (!condition) return true;
    // The condition judged on the state the card will see once the filed identity applies its flag.
    const probe: GameState = {
        ...state,
        military: { ...state.military, event_flags: { ...(state.military.event_flags ?? {}), [IDENTITY]: identityFlag } },
    };
    return evaluateCondition(condition, probe);
}

/**
 * The identity answer the RBiH policy card rests on, on a fired policy card (the old turn-0 lane and the
 * in-window lane). In-window: answered in the identity's window, at or before the policy fired. D3: an
 * identity answer FILED ahead at birth and applied when the identity fired in its window is also canonical,
 * so a birth policy card left pending through its own firing (harness `defer`) stays answerable.
 */
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
    const identityFiredTurn = state.military.event_last_fired_turn?.[IDENTITY];
    const inIdentityWindow = (turn: unknown): boolean => typeof turn === 'number'
        && typeof identityTurnMin === 'number' && typeof identityTurnMax === 'number'
        && turn >= identityTurnMin && turn <= identityTurnMax;
    const answeredInWindow = inIdentityWindow(receipt.turn) && receipt.turn <= policyFireTurn;
    const filedAndAppliedInWindow = inIdentityWindow(identityFiredTurn)
        && receipt.turn < (identityFiredTurn as number) && (identityFiredTurn as number) <= policyFireTurn;
    const receiptIsCanonicalForLane = openingLane
        ? receipt.turn === 0
        : answeredInWindow || filedAndAppliedInWindow;
    if (!identity || identity.responding_faction !== 'RBiH' || receipt.decision_source !== 'player'
        || receipt.faction !== 'RBiH' || !receiptIsCanonicalForLane
        || state.military.event_flags.rbih_state_identity !== receipt.response_id
        || !option?.enables_events_runtime?.includes(POLICY)) {
        throw new Error('Opening policy identity receipt does not establish the authored enabling basis');
    }
}

/**
 * The basis of the T2 filing lane: exactly one player identity answer, whose reviewed option gives the card
 * its authored basis (D1, in place of the applied-flag check, since a filed identity sets no flag). If the
 * identity has since fired, that answer must have been filed ahead of it and applied by it.
 */
function requireFiledIdentityBasis(state: GameState, catalog: EventDefinitionCatalog | undefined, policy: EventDefinition): void {
    const receipts = (state.military.event_decision_log ?? []).filter((receipt) => receipt.event_id === IDENTITY);
    if (receipts.length !== 1) throw new Error('Opening policy requires exactly one filed identity receipt');
    const receipt = receipts[0]!;
    const identity = reviewedIdentity(catalog);
    const option = identity.response_options?.find((entry) => entry.id === receipt.response_id);
    let basis = receipt.decision_source === 'player' && receipt.faction === 'RBiH'
        && filedIdentityOptionEnablesPolicy(option, policy, state);
    if (basis && eventHasFired(state, IDENTITY)) {
        const firedTurn = state.military.event_last_fired_turn?.[IDENTITY];
        basis = typeof firedTurn === 'number' && receipt.turn < firedTurn
            && state.military.event_flags?.rbih_state_identity === receipt.response_id;
    }
    if (!basis) throw new Error('Opening policy identity receipt does not establish the authored enabling basis');
}

type PolicyLane = 'filing' | 'opening' | 'legacy';

/**
 * The RBiH paramilitary-policy answer, by save shape:
 * - FILING (§6 design T2): the card was put to the player at birth by the identity filing lane and has not
 *   fired. Answering only files the answer (`resolve_decision_core.ts`); evaluate-events applies it when the
 *   card fires (t4). Keyed on "turn_fired 0 and the card unfired", not on meta.turn (D3), so a birth card
 *   left pending past t0 stays answerable.
 * - OPENING (saves from before T): the card was FIRED at t0 by the old lane; the answer applies at once.
 * - LEGACY: the card fired in its window (t3-9) and is answered then, applied at once. D3: the fire turn is
 *   read from `event_last_fired_turn`, so a birth card (turn_fired 0) that stayed pending through its firing
 *   is answered here too.
 */
function requirePolicyResponseState(
    state: GameState,
    decision: PendingEventDecision,
    catalog: EventDefinitionCatalog | undefined,
): PolicyLane {
    const def = reviewedPolicy(catalog);
    const military = state.military;
    if (state.meta.phase !== 'war' || state.meta.player_faction !== 'RBiH'
        || decision.faction !== 'RBiH' || decision.requires_player_response !== true
        || (military.pending_event_decisions ?? []).filter((entry) => entry.event_id === POLICY).length !== 1
        || (military.closed_event_ids ?? []).includes(POLICY)
        || (military.event_decision_log ?? []).some((receipt) => receipt.event_id === POLICY)) {
        throw new Error('Pending RBiH policy response is not eligible in the current state');
    }

    if (!eventHasFired(state, POLICY)) {
        // Enabled exactly when the identity's filed answer has applied (its runtime causality enables the card).
        const expectedEnabled = eventHasFired(state, IDENTITY) ? 1 : 0;
        if (decision.turn_fired !== 0 || state.meta.headless_scenario_auto_control !== false
            || military.event_last_fired_turn?.[POLICY] !== undefined
            || countOf(military.enabled_event_ids, POLICY) !== expectedEnabled) {
            throw new Error('Pending RBiH policy response is not eligible in the current state');
        }
        requireFiledIdentityBasis(state, catalog, def);
        if (canonicalJson(withoutProvenanceText(decision)) !== canonicalJson(withoutProvenanceText(buildPending(def, 'RBiH', 0)))) {
            throw new Error('Pending RBiH policy payload differs from the reviewed catalog');
        }
        return 'filing';
    }

    const fireTurn = military.event_last_fired_turn?.[POLICY];
    const turnMin = def.trigger.turn_min;
    const turnMax = def.trigger.turn_max;
    const openingLane = decision.turn_fired === 0 && fireTurn === 0 && state.meta.turn === 0;
    const legacyLane = typeof fireTurn === 'number' && typeof turnMin === 'number' && typeof turnMax === 'number'
        && fireTurn >= turnMin && fireTurn <= turnMax && state.meta.turn >= fireTurn
        && (decision.turn_fired === fireTurn || decision.turn_fired === 0);
    const headlessMarkerIsEligible = openingLane
        ? state.meta.headless_scenario_auto_control === false
        : state.meta.headless_scenario_auto_control !== true;
    if (!headlessMarkerIsEligible || (!openingLane && !legacyLane) || typeof fireTurn !== 'number'
        || countOf(military.fired_event_ids, POLICY) !== 1
        || military.event_fire_counts[POLICY] !== 1
        || countOf(military.enabled_event_ids, POLICY) !== 1) {
        throw new Error('Pending RBiH policy response is not eligible in the current state');
    }
    requireCanonicalIdentityReceipt(state, catalog, openingLane, fireTurn);
    if (canonicalJson(withoutProvenanceText(decision)) !== canonicalJson(withoutProvenanceText(buildPending(def, 'RBiH', decision.turn_fired)))) {
        throw new Error('Pending RBiH policy payload differs from the reviewed catalog');
    }
    return openingLane ? 'opening' : 'legacy';
}

type IdentityLane =
    | { kind: 'filing'; identity: EventDefinition; policy: EventDefinition }
    | { kind: 'opening'; policy: EventDefinition }
    | { kind: 'legacy' };

/**
 * The RBiH identity answer, by save shape:
 * - FILING (§6 design T1/T2): the birth card, its event unfired. The answer is filed, and the lane then puts
 *   the policy card to the player (queued, not fired) when the filed option gives it its basis (D1). Keyed on
 *   "turn_fired 0 and the identity unfired", not on meta.turn (D3).
 * - OPENING (saves from before T): the identity was FIRED at birth; the answer applies at once and the old
 *   lane fires the policy card at t0.
 * - LEGACY: the identity fired in its window (t2-5) and is answered then, applied at once; the policy card
 *   then fires through evaluate-events. D3: the fire turn is read from `event_last_fired_turn`, so a birth
 *   card that stayed pending through the identity's firing is answered here.
 */
function requireIdentityLane(
    state: GameState,
    decision: PendingEventDecision,
    catalog: EventDefinitionCatalog | undefined,
): IdentityLane {
    const identity = reviewedIdentity(catalog);
    if (state.meta.phase !== 'war' || state.meta.player_faction !== 'RBiH'
        || decision.faction !== 'RBiH' || decision.requires_player_response !== true) {
        throw new Error('RBiH identity decision is not eligible in the current state');
    }
    const military = state.military;
    const untouched = !military.fired_event_ids.includes(POLICY) && !(military.closed_event_ids ?? []).includes(POLICY)
        && !(military.enabled_event_ids ?? []).includes(POLICY)
        && !(military.pending_event_decisions ?? []).some((d) => d.event_id === POLICY)
        && !(military.event_decision_log ?? []).some((r) => r.event_id === POLICY || r.event_id === IDENTITY)
        && !(military.closed_event_ids ?? []).includes(IDENTITY);

    if (!eventHasFired(state, IDENTITY)) {
        if (decision.turn_fired !== 0 || state.meta.headless_scenario_auto_control !== false) {
            throw new Error('RBiH identity decision is not eligible in the current state');
        }
        if (!untouched || military.event_last_fired_turn?.[IDENTITY] !== undefined
            || canonicalJson(withoutDisplayText(decision)) !== canonicalJson(withoutDisplayText(buildPending(identity, 'RBiH', 0)))) {
            throw new Error('RBiH identity decision is stale, forged, or already completed');
        }
        return { kind: 'filing', identity, policy: reviewedPolicy(catalog) };
    }

    const fireTurn = military.event_last_fired_turn?.[IDENTITY];
    const opening = decision.turn_fired === 0 && fireTurn === 0 && state.meta.turn === 0
        && state.meta.headless_scenario_auto_control === false;
    const legacy = typeof fireTurn === 'number'
        && fireTurn >= identity.trigger.turn_min! && fireTurn <= identity.trigger.turn_max!
        && (decision.turn_fired === fireTurn || decision.turn_fired === 0)
        && state.meta.turn >= fireTurn && state.meta.headless_scenario_auto_control !== true;
    if (!opening && !legacy) {
        throw new Error('RBiH identity decision is not eligible in the current state');
    }
    if (countOf(military.fired_event_ids, IDENTITY) !== 1
        || military.event_fire_counts[IDENTITY] !== 1
        || military.event_readiness[IDENTITY] !== 0
        || !untouched
        || canonicalJson(withoutDisplayText(decision)) !== canonicalJson(withoutDisplayText(buildPending(identity, 'RBiH', decision.turn_fired)))) {
        throw new Error('RBiH identity decision is stale, forged, or already completed');
    }
    return opening ? { kind: 'opening', policy: reviewedPolicy(catalog) } : { kind: 'legacy' };
}

/** The old turn-0 lane (saves from before T only): the policy card FIRES at t0, its answer applies at once. */
function fireAndQueuePolicy(state: GameState, def: EventDefinition): void {
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

/**
 * The T2 filing lane: the policy card is put to the player before the first Advance as a birth card
 * (turn_fired 0), NOT fired. No effect, flag, shift or fired receipt is written; its answer is filed and
 * evaluate-events applies it when the card fires in its window (answer_ahead_of_firing.ts).
 */
function queueFiledPolicy(state: GameState, def: EventDefinition): void {
    state.military.pending_event_decisions ??= [];
    state.military.pending_event_decisions.push(buildPending(def, 'RBiH', 0));
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
    const policyLane = eventId === POLICY ? requirePolicyResponseState(candidate, pending, catalog) : undefined;
    const receiptsBefore = (candidate.military.event_decision_log ?? []).filter((r) => r.event_id === eventId).length;
    const orderBefore = candidate.paramilitary_policy;
    const policyFlagBefore = candidate.military.event_flags?.rbih_paramilitary_policy;
    resolveEventDecision(candidate, eventId, responseId);
    const receipts = (candidate.military.event_decision_log ?? []).filter((r) => r.event_id === eventId);
    const receipt = receipts.at(-1);
    // The turn of the one new player receipt this answer wrote; null if it wrote anything else.
    const newReceiptTurn = receipts.length === receiptsBefore + 1 && receipt?.response_id === responseId
        && receipt.decision_source === 'player' && receipt.faction === 'RBiH'
        ? receipt.turn
        : null;

    if (identityLane?.kind === 'opening') {
        if (newReceiptTurn !== 0 || !(candidate.military.enabled_event_ids ?? []).includes(POLICY)
            || candidate.paramilitary_policy !== 'ask') {
            throw new Error('Canonical identity resolution did not establish the reviewed policy preconditions');
        }
        fireAndQueuePolicy(candidate, identityLane.policy);
    } else if (identityLane?.kind === 'filing') {
        // Filed only: the identity is still unfired, the card not yet enabled, the standing order unchanged.
        if (newReceiptTurn !== candidate.meta.turn || eventHasFired(candidate, IDENTITY)
            || (candidate.military.enabled_event_ids ?? []).includes(POLICY) || candidate.paramilitary_policy !== orderBefore) {
            throw new Error('Filed identity resolution did not leave the reviewed filing preconditions');
        }
        const option = identityLane.identity.response_options?.find((entry) => entry.id === responseId);
        if (filedIdentityOptionEnablesPolicy(option, identityLane.policy, candidate)) queueFiledPolicy(candidate, identityLane.policy);
    } else if (policyLane === 'filing') {
        // Filed only: nothing applies before the card fires (red-team T2 condition 1).
        if (newReceiptTurn !== candidate.meta.turn || eventHasFired(candidate, POLICY)
            || candidate.paramilitary_policy !== orderBefore
            || candidate.military.event_flags?.rbih_paramilitary_policy !== policyFlagBefore) {
            throw new Error('Filed policy resolution applied effects before the card fired');
        }
    }
    return candidate;
}

/**
 * Whether a player's opening foundational decision is FIRED at campaign birth (turn 0), shared by the
 * Electron (`desktop_sim.ts`) and browser-fallback start adapters. Since §6 design T1 (2026-11-19): never.
 *
 * BOT-EQUIVALENT TIMING. A bot answers each opening card in its authored window: rs_strategic_goals at t1,
 * rbih_state_identity at t3, hrhb_political_goal at t4. So every card is queued at birth WITHOUT firing;
 * the player's answer is filed and evaluate-events applies it when the card fires, on the bot's turn
 * (answer_ahead_of_firing.ts). Firing a card at birth applied its one-shot effects to the t0 formation set
 * and opened its gated follow-ups early: croat_republic's +5 HRHB morale left the brigades raised before t4
 * a permanent -5 offset (163bee0e5); rs_strategic_goals put RS morale and its 52-turn aggression modifier a
 * turn early; rbih_state_identity three turns early. The RBiH paramilitary-policy lane now keys on the FILED
 * identity answer (resolvePlayerEventDecisionWithOpeningPolicy above).
 *
 * Saves written before T hold the RBiH or RS card already fired at birth; they keep that timing, chosen by
 * save shape (the answer-ahead rule applies only to an unfired card).
 */
export function preFiresOpeningDecisionAtBirth(_def: EventDefinition, _turn: number): boolean {
    return false;
}
