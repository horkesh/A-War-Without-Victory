/**
 * REASON-CODE INSTRUMENTATION — one env gate, independently selectable topics, inert by default.
 *
 * ═══ WHAT THIS IS FOR ═══
 *
 * Multiple subsystems refuse things without saying which predicate refused them,
 * and each refusal has cost a seat hours of reconstruction from artifacts that
 * do not carry the answer. In one case it produced a FALSE PUBLISHED FINDING:
 * a seat read `attacker_casualties` (a STACK total) against one named brigade's
 * manpower delta and reported the field inflated 10×. It is not inflated. The
 * battle record simply names ONE attacker for an engagement the engine resolves
 * between a STACK and a SECTOR — and the two fields that would have said so
 * (`attacker_brigades`, `defender_contributions`) are BUILT at
 * `attack_resolution_osid.ts` and then DROPPED by the weekly-report projection
 * at `scenario_runner.ts`. Restoring them retires that class of error.
 *
 * ═══ WHY IT IS GATED, AND WHY THE GATE IS THE WHOLE DESIGN ═══
 *
 * `weekly_report.jsonl` and `brigade_temporal_log.jsonl` are BASELINED
 * artifacts. Adding a field to them moves the golden manifest, and the manifest
 * is ALREADY mismatched (the currently-red CI). An ungated change here would
 * tangle observation into an unresolved calibration dispute and become
 * unmergeable behind it.
 *
 * So every field added under this module is ENV-GATED AND ABSENT WHEN OFF —
 * not `null`, not `0`, ABSENT — so a default run serializes byte-identically to
 * an un-instrumented one. The acceptance test is not a unit test: a default
 * 188-week run must still reproduce `final_state_hash 8bb624ebafa7a925`.
 *
 * ★ ABSENT-VERSUS-NULL IS THE WHOLE GUARANTEE, AND IT IS ONE LINE OF
 * SERIALIZER BEHAVIOUR: `stableStringify` writes `"k":null` for an explicit
 * null and writes NOTHING AT ALL for a missing key. So a field defaulted to
 * `null` when the flag is off would move the golden manifest just as surely as a
 * populated one, and the whole lane would become unmergeable behind an
 * unresolved calibration dispute. That is why the helper below spreads an EMPTY
 * OBJECT rather than an object of nulls, and why every consumer uses the spread
 * form instead of assigning a nullable field. If you are refactoring this and
 * the nulls look tidier: they are not, they are the bug.
 *
 * ═══ OBSERVATION ONLY ═══
 *
 * Nothing in this module or its call sites may change a decision, a predicate,
 * a threshold, or a control-flow branch. The gates are read at the point a
 * record is CONSTRUCTED, never at a point where a value is COMPUTED. Every
 * emitted number is a local that already existed.
 *
 * ═══ DETERMINISM ═══
 *
 * No RNG, no wall-clock, no timestamps, no locale-aware comparison. Every
 * collection this module emits is sorted with `strictCompare`, or is emitted in
 * an order the engine already fixed upstream. Reading `process.env` is a pure
 * read of process configuration and does not vary within a run.
 *
 * ═══ ONE VARIABLE, INDEPENDENT TOPICS ═══
 *
 * `mainstaff_op_availability_gate.ts` deliberately uses two separate flags,
 * because its two halves move participation in OPPOSITE directions and a
 * bundled +N/−N would cancel and read as inert. That reasoning DOES NOT APPLY
 * HERE: these topics change no behaviour at all, so there is nothing to cancel.
 * A single variable with independently-selectable topics gives the same
 * per-topic attribution with one thing to remember:
 *
 *   AWWV_DEBUG_REASON_CODES=battle_stack,battle_power
 *   AWWV_DEBUG_REASON_CODES=all           # or '*'
 *
 * Unknown topic names are ignored rather than throwing — a typo must degrade to
 * "no extra output", never to a failed run.
 */

import { strictCompare } from '../../state/validateGameState.js';
import type { CorpsOperation } from '../../state/game_state.js';
import { stableStringify } from '../../utils/stable_json.js';

/**
 * Diagnostic topics.
 *
 *  battle_stack      — item 1. `attacker_brigades` + `defender_contributions` on the
 *                      weekly battle entry. Answers: is this casualty figure a
 *                      stack total or one brigade's?
 *  battle_power      — item 2. The power ratio's two halves plus the sector context
 *                      that built the denominator. Answers: did the defender get
 *                      stronger, or did the sector get repartitioned?
 *  axis_reject       — item 3. WHICH predicate rejected each candidate brigade behind
 *                      a `zero_eligible_axis`, on the artifact rather than on stdout.
 *  formation_refusal — item 4. Why `canFormEmergentBrigade` / in-run `recruitBrigade`
 *                      said no, for the in-run passes that have no counter today.
 *  brigade_state     — item 5. `disrupted_turns` on the brigade temporal row.
 *  objective_filter  — item 6. Which friendly-controlled opportunity objectives
 *                      were removed at the CorpsOperation spawn seam.
 *  formation_lifecycle — item 7. Include expeditionary `hv_phantom` formations in
 *                        the per-turn temporal stream so their live state can be
 *                        joined from spawn through withdrawal.
 *  movement_reject   — item 8. Formation-specific column-order rejection reason
 *                      and routing scope, emitted on the movement report.
 *  opportunity_roster — item 9. Why each catalog-authored brigade was admitted
 *                       to or rejected from an opportunity operation axis.
 *  route_decision    — item 10. Which generic interior-routing rule selected a
 *                      non-operation brigade's pre-order destination or terminal fallback.
 *  tg_formation      — item 11 (ENGINE-HEALTH B3, 2026-09-19). Why a Tactical Group
 *                      AUGMENTATION was declined: anchor, donor count, pledged
 *                      personnel, readiness fraction and the donation it required.
 *                      Replaces the retired `insufficient_donation` launch blocker,
 *                      which reported an operation failure for what is now only a
 *                      declined augmentation.
 *  dispatcher_decision — formation eligibility and first-handler observation at
 *                        the actual bot-order dispatcher boundary.
 *  movement_phase — selected-formation movement state/order snapshots at named
 *                   pipeline mutation boundaries.
 *  front_distribution — selected-formation pre-write receipts at front-distribution
 *                       writer boundaries and invocation/no-write coverage.
 */
export type ReasonCodeTopic =
    | 'battle_stack'
    | 'battle_power'
    | 'axis_reject'
    | 'formation_refusal'
    | 'brigade_state'
    | 'formation_lifecycle'
    | 'movement_reject'
    | 'objective_filter'
    | 'opportunity_roster'
    | 'route_decision'
    | 'tg_formation'
    | 'dispatcher_decision'
    | 'movement_phase'
    | 'front_distribution'
    | 'commander_creation'
    | 'mistral_tg_activation'
    | 'mistral_tg_donor_selection'
    | 'operation_capture_ownership'
    | 'salient_evacuation'
    | 'southern_move_preparation'
    | 'southern_move_confidence_lookup'
    | 'local_occupation_candidate';

const ALL_TOPICS: readonly ReasonCodeTopic[] = [
    'axis_reject',
    'battle_power',
    'battle_stack',
    'brigade_state',
    'formation_lifecycle',
    'formation_refusal',
    'movement_reject',
    'objective_filter',
    'opportunity_roster',
    'route_decision',
    'tg_formation',
    'dispatcher_decision',
    'movement_phase',
    'front_distribution',
    'commander_creation',
    'mistral_tg_activation',
    'mistral_tg_donor_selection',
    'operation_capture_ownership',
    'salient_evacuation',
    'southern_move_preparation',
    'southern_move_confidence_lookup',
    'local_occupation_candidate',
];

/**
 * Parsed once per process from `AWWV_DEBUG_REASON_CODES`.
 *
 * Cached deliberately: the gate is consulted inside the per-battle loop, and a
 * `process.env` read plus a split per battle per turn is measurable overhead on
 * a 188-week run. The cache makes the flag process-scoped, which is exactly the
 * contract every other AWWV env gate has — no test flips it mid-run.
 */
let cachedTopics: ReadonlySet<ReasonCodeTopic> | undefined;

function parseTopics(): ReadonlySet<ReasonCodeTopic> {
    if (typeof process === 'undefined') return new Set();
    const raw = process.env.AWWV_DEBUG_REASON_CODES;
    if (typeof raw !== 'string' || raw.length === 0) return new Set();
    const requested = raw
        .toLowerCase()
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
    if (requested.includes('*') || requested.includes('all')) return new Set(ALL_TOPICS);
    // Unknown names are dropped, not thrown: a typo degrades to silence.
    return new Set(requested.filter((part): part is ReasonCodeTopic =>
        (ALL_TOPICS as readonly string[]).includes(part)));
}

/** True when this topic was requested. False for every topic on a default run. */
export function isReasonCodeTopicEnabled(topic: ReasonCodeTopic): boolean {
    if (cachedTopics === undefined) cachedTopics = parseTopics();
    return cachedTopics.has(topic);
}

/**
 * Test-only reset of the process-scoped cache. Never called by sim code.
 * Exists so a test can assert the OFF and ON parses of the same process without
 * relying on module-load order.
 */
export function resetReasonCodeTopicCacheForTests(): void {
    cachedTopics = undefined;
}

/**
 * Spread helper: `...whenReasonCodeTopic('battle_power', () => ({ ... }))`.
 *
 * Returns an EMPTY object when the topic is off, so the keys are absent from the
 * serialized record rather than present-and-null. That distinction is the whole
 * byte-identity guarantee — `stableStringify` writes `"k":null` for an explicit
 * null and writes nothing at all for an absent key.
 *
 * The payload is a thunk so that nothing is computed on a default run.
 */
export function whenReasonCodeTopic<T extends Record<string, unknown>>(
    topic: ReasonCodeTopic,
    build: () => T,
): T | Record<string, never> {
    return isReasonCodeTopicEnabled(topic) ? build() : {};
}

/**
 * Opt-in `commander_creation` stdout receipt: ONE uniquely-prefixed JSON line per record (pass markers and per-corps
 * buildOperations completion rows). Console evidence only — never weekly/save/GameState state. Absent (no write, no
 * allocation by callers) when the topic is off. Keys are written in stable sorted order; callers pass detached scalar copies.
 */
export const COMMANDER_CREATION_PREFIX = '[commander_creation]';
export function emitCommanderCreationRecord(record: Record<string, unknown>): void {
    if (!isReasonCodeTopicEnabled('commander_creation')) return;
    console.log(`${COMMANDER_CREATION_PREFIX} ${stableStringify(record)}`);
}

/**
 * Local-only stdout observation of the real four-class local occupation search.
 * The caller allocates records only after the topic gate passes. A diagnostic
 * sink failure is isolated from commander selection and simulation state.
 */
export const LOCAL_OCCUPATION_CANDIDATE_PREFIX = '[local_occupation_candidate]';
export function emitLocalOccupationCandidateRecord(record: Record<string, unknown>): void {
    if (!isReasonCodeTopicEnabled('local_occupation_candidate')) return;
    try {
        console.log(`${LOCAL_OCCUPATION_CANDIDATE_PREFIX} ${stableStringify(record)}`);
    } catch {
        // Diagnostics must never change the commander result.
    }
}

/** Copy-only stdout receipts for the bounded Mistral activation/capture observation packet. */
export const MISTRAL_TG_ACTIVATION_PREFIX = '[mistral_tg_activation]';
export const MISTRAL_TG_DONOR_SELECTION_PREFIX = '[mistral_tg_donor_selection]';
export const OPERATION_CAPTURE_OWNERSHIP_PREFIX = '[operation_capture_ownership]';

export function emitMistralTgActivationRecord(record: Record<string, unknown>): void {
    if (!isReasonCodeTopicEnabled('mistral_tg_activation')) return;
    console.log(`${MISTRAL_TG_ACTIVATION_PREFIX} ${stableStringify({ schema_version: 1, ...record })}`);
}

export function emitMistralTgDonorSelectionRecord(record: Record<string, unknown>): void {
    if (!isReasonCodeTopicEnabled('mistral_tg_donor_selection')) return;
    console.log(`${MISTRAL_TG_DONOR_SELECTION_PREFIX} ${stableStringify({ schema_version: 1, ...record })}`);
}

export function emitOperationCaptureOwnershipRecord(record: Record<string, unknown>): void {
    if (!isReasonCodeTopicEnabled('operation_capture_ownership')) return;
    console.log(`${OPERATION_CAPTURE_OWNERSHIP_PREFIX} ${stableStringify({ schema_version: 1, ...record })}`);
}

/** Copy-only stdout receipts for the bounded salient evacuation observer. */
export const SALIENT_EVACUATION_PREFIX = '[salient_evacuation]';
export function emitSalientEvacuationRecord(record: Record<string, unknown>): void {
    if (!isReasonCodeTopicEnabled('salient_evacuation')) return;
    console.log(`${SALIENT_EVACUATION_PREFIX} ${stableStringify({ schema_version: 1, ...record })}`);
}

/**
 * Local-only stdout observation for the exact historical Southern Move preparation window.
 * The fixed selector prevents a generated same-family name or a different operation instance
 * from becoming evidence. Payload construction is lazy, so default/topic-off runs do no
 * observer allocation beyond the gate call and never write GameState or weekly reports.
 */
export const SOUTHERN_MOVE_PREPARATION_PREFIX = '[southern_move_preparation]';
export function isSouthernMovePreparationSelected(
    operationName: string,
    faction: string | null | undefined,
    corpsId: string,
    turn: number,
): boolean {
    return isReasonCodeTopicEnabled('southern_move_preparation')
        && operationName === 'Operation Southern Move'
        && faction === 'HRHB'
        && corpsId === 'hvo_tomislavgrad'
        && turn >= 183
        && turn <= 188;
}

export function isSouthernMovePreparationPassSelected(
    faction: string | null | undefined,
    corpsId: string,
    turn: number,
): boolean {
    return isReasonCodeTopicEnabled('southern_move_preparation')
        && faction === 'HRHB'
        && corpsId === 'hvo_tomislavgrad'
        && turn >= 183
        && turn <= 188;
}

export function emitSouthernMovePreparationPassRecord(
    faction: string | null | undefined,
    corpsId: string,
    turn: number,
    build: () => Record<string, unknown>,
): void {
    if (!isSouthernMovePreparationPassSelected(faction, corpsId, turn)) return;
    console.log(`${SOUTHERN_MOVE_PREPARATION_PREFIX} ${stableStringify({
        schema_version: 1,
        faction,
        corps_id: corpsId,
        turn,
        ...build(),
    })}`);
}

export function emitSouthernMovePreparationRecord(
    operationName: string,
    faction: string | null | undefined,
    corpsId: string,
    turn: number,
    build: () => Record<string, unknown>,
): void {
    if (!isSouthernMovePreparationSelected(operationName, faction, corpsId, turn)) return;
    console.log(`${SOUTHERN_MOVE_PREPARATION_PREFIX} ${stableStringify({
        schema_version: 1,
        operation_name: operationName,
        faction,
        corps_id: corpsId,
        turn,
        ...build(),
    })}`);
}

export interface LinkedPreparationProbeObserverReceipt {
    child_operation_name: string;
    child_operation_started_turn: number;
    child_axis_id: string;
    brigade_ids: string[];
    target_osid: string;
}

/**
 * Emit a linked-probe lifecycle row selected by the persisted parent link.
 * The generated child name is identity data only and never participates in selection.
 */
export function emitLinkedPreparationProbeRecord(
    child: CorpsOperation,
    faction: string | null | undefined,
    corpsId: string,
    turn: number,
    build: (receipt: LinkedPreparationProbeObserverReceipt) => Record<string, unknown>,
): void {
    const link = child.preparation_probe_link;
    if (!link || !isSouthernMovePreparationSelected(link.parent_operation_name, faction, corpsId, turn)) return;
    const childAxisId = child.axes?.[0]?.axis_id;
    if (!childAxisId) return;
    const receipt: LinkedPreparationProbeObserverReceipt = {
        child_operation_name: child.name,
        child_operation_started_turn: child.started_turn,
        child_axis_id: childAxisId,
        brigade_ids: sortedIds(child.participating_brigades),
        target_osid: link.target_osid,
    };
    emitSouthernMovePreparationRecord(link.parent_operation_name, faction, corpsId, turn, () => ({
        parent_operation_started_turn: link.parent_started_turn,
        ...build(receipt),
    }));
}

/**
 * Separate stdout stream for the actual confidence getter reached by the selected
 * Southern Move preparation tick. The context is allocated only after the exact
 * topic/name/faction/corps/turn gate passes, then reused by every reached lookup.
 */
export const SOUTHERN_MOVE_CONFIDENCE_LOOKUP_PREFIX = '[southern_move_confidence_lookup]';

export interface SouthernMoveConfidenceLookupContext {
    operation_name: string;
    faction: string;
    corps_id: string;
    turn: number;
    operation_index?: number;
    operation_started_turn: number;
    operation_phase_started_turn: number;
}

export function createSouthernMoveConfidenceLookupContext(
    operationName: string,
    faction: string | null | undefined,
    corpsId: string,
    turn: number,
    operationIndex: number | undefined,
    operationStartedTurn: number,
    operationPhaseStartedTurn: number,
): SouthernMoveConfidenceLookupContext | undefined {
    if (!isReasonCodeTopicEnabled('southern_move_confidence_lookup')
        || operationName !== 'Operation Southern Move'
        || faction !== 'HRHB'
        || corpsId !== 'hvo_tomislavgrad'
        || turn < 183
        || turn > 188) return undefined;
    return {
        operation_name: operationName,
        faction,
        corps_id: corpsId,
        turn,
        ...(operationIndex === undefined ? {} : { operation_index: operationIndex }),
        operation_started_turn: operationStartedTurn,
        operation_phase_started_turn: operationPhaseStartedTurn,
    };
}

export function emitSouthernMoveConfidenceLookupRecord(
    context: SouthernMoveConfidenceLookupContext,
    record: Record<string, unknown>,
): void {
    console.log(`${SOUTHERN_MOVE_CONFIDENCE_LOOKUP_PREFIX} ${stableStringify({
        schema_version: 1,
        ...context,
        ...record,
    })}`);
}

/**
 * Deterministic ordering for any id list this module emits.
 * Copies before sorting — an instrumentation probe must never reorder a live
 * engine array in place.
 */
export function sortedIds<T extends string>(ids: readonly T[]): T[] {
    return [...ids].sort(strictCompare);
}
