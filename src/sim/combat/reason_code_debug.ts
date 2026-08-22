/**
 * REASON-CODE INSTRUMENTATION — one env gate, nine topics, inert by default.
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
 * ═══ ONE VARIABLE, NINE TOPICS — AND WHY NOT NINE VARIABLES ═══
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

/**
 * The eight diagnostic topics.
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
    | 'opportunity_roster';

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
 * Deterministic ordering for any id list this module emits.
 * Copies before sorting — an instrumentation probe must never reorder a live
 * engine array in place.
 */
export function sortedIds<T extends string>(ids: readonly T[]): T[] {
    return [...ids].sort(strictCompare);
}
