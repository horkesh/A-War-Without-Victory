/**
 * Main-staff operation availability — two feature gates, both default OFF.
 *
 * A sector-exempt corps (`EXEMPT_CORPS_IDS` in corps_front_sectors_constants.ts:
 * `arbih_general_staff`, `vrs_main_staff`, `hvo_main_staff`) is a reserve pool,
 * not a front-holding formation. Its brigades are intentionally sectorless
 * "until loaned or attached", so they carry no sector claim of their own — and
 * two independently-written gates end up deciding their operation participation
 * from the wrong signal:
 *
 *   GATE 1 — `final_operation_truth_reconciliation.ts`, `uniqueActiveParticipants`:
 *            drops a brigade whose sector claims are non-empty and exclude the
 *            host corps. A sectorless main-staff brigade therefore RIDES ALONG on
 *            whichever corps' territory it happens to be standing in, and is
 *            EVICTED the moment it is parked somewhere else. Neither outcome has
 *            anything to do with whether it was ordered onto the operation.
 *
 *   GATE 2 — `operation_opportunities.ts`, `selectEligibleOpportunityParticipants`:
 *            drops any roster member whose corps differs from `axis.corps`.
 *            Catalog axes are hosted on a real corps precisely to satisfy GATE 1,
 *            so every main-staff brigade an author NAMES on a roster is dropped
 *            here, before GATE 1 is ever consulted.
 *
 * Net effect with both flags OFF: a scripted operation is gated on where an
 * unrostered national reserve happens to be parked, while the reserve its
 * designer actually named is undeliverable by construction.
 *
 * The contract these flags restore is NOT new. `pre_planned_operations.ts`
 * (`buildAxesFromDef`, the exempt-corps branch) already implements it for the
 * PRE-PLANNED injection path: a named exempt-corps brigade is admitted and gets
 * an elite loan to the operation's corps at injection time, which makes it a real
 * member of the receiving corps for every downstream consumer that already reads
 * `on_loan ? loaned_to_corps : corps_id`. The OPPORTUNITY injection path — where
 * the Mistral 1 / Mistral 2 catalog entries live — never received it.
 *
 * ═══ TWO FLAGS, NOT ONE — AND THE REASON IS THE SIGN ═══
 *
 * The two halves of the contract move participation in OPPOSITE directions:
 * GATE 2 ADMITS brigades that were being dropped, GATE 1 EVICTS a free ride that
 * was being granted. Bundled behind one switch, a +N and a −N cancel and the
 * measurement reads as inert — which is the single most misleading result this
 * lane can produce, because "inert" looks like a clean no-op and is actually two
 * effects hiding each other. This project has already measured one +25 offsetting
 * interaction between two changes each confidently predicted in isolation
 * (`docs/life_lessons/calibration.md`), so the halves are switched separately and
 * attributed separately:
 *
 *   AWWV_MAINSTAFF_OP_AVAILABILITY — GATE 2, ADMISSION  (isMainStaffOpAvailabilityEnabled)
 *   AWWV_MAINSTAFF_OP_RETENTION    — GATE 1, RETENTION  (isMainStaffOpRetentionEnabled)
 *
 * Both default OFF and they are INDEPENDENT: neither implies the other, so the
 * measurable configurations are OFF / GATE2-only / GATE1-only / BOTH.
 *
 * With AVAILABILITY ON:
 *   - GATE 2 admits a sector-exempt brigade that is NAMED on the axis roster and
 *     can reach the host corps' territory, and schedules the elite loan.
 *
 * With RETENTION ON:
 *   - GATE 1 reads the LOAN rather than the parking spot for sector-exempt
 *     brigades. That both keeps a properly attached reserve when it is standing
 *     in someone else's territory AND withdraws the free ride a merely-sectorless
 *     brigade currently gets.
 *
 * Non-exempt brigades are untouched in both gates, in every configuration.
 *
 * ═══ WHAT THIS FIX DOES NOT DO — READ BEFORE BUILDING ON IT ═══
 *
 * It closes the availability defect and it does NOT recover the western-Bosnia
 * belt, because the belt is not behind brigade availability. Measured 188w:
 *
 *   blessed   Mistral 1 EXECUTES w160-w176, takes 7/11 objectives
 *             Mistral 2 finishes 9/11
 *   HEAD      Mistral 1 dies at w168 with 0/10 — `recovery_reason:
 *             zero_eligible_axis`, `eligible_attacker_count: 0` for seven
 *             consecutive turns, NEVER LEAVING `planning`
 *             Mistral 2 is only 4/12 when the scenario ends
 *
 * (blessed figures from the calibration seat, 2026-08-21.)
 *
 * With this flag ON, `hvo_1st_guard_abb` — 2,800 elite, named on the roster,
 * previously undeliverable — reaches BOTH operations for the first time, is
 * loaned to `hvo_tomislavgrad` at t160, and ends the war at Mistral's own staging
 * anchor. Mistral 1's outcome does not move by one objective. A brigade cannot
 * help an operation that never reaches execution.
 *
 * BRIGADE AVAILABILITY WAS THE WRONG LEVER. [SUPERSEDED 2026-08-21, see below.]
 *
 * ★ CORRECTION — THE BELT IS MISTRAL 2, NOT MISTRAL 1. The paragraph above said
 * the belt sits behind Mistral 1's execution. A third configuration, measured
 * after this comment was written, falsifies that:
 *
 *   config      Mistral 1                    Mistral 2   matched
 *   blessed     w160-w176, 7/11              9/11        629
 *   HEAD-G2     w160-w164, 0/6, 0 attacks    11/12       632   <- best in arc
 *   HEAD        w160-w168, 0/10              4/12        611
 *
 * At the best-scoring tree ever measured, Mistral 1 delivers NOTHING and the belt
 * returns anyway. Mistral 2 is monotone with the score; Mistral 1 is monotone with
 * nothing. Two configurations had BOTH operations moving and the delta was
 * attributed to one of them — a two-variable comparison with one variable
 * attributed. The third point broke it. Ledger 8d380b560.
 *
 * Also measured, and it matters to anyone reasoning from the numbers above: the
 * exit reason is CONFIGURATION-DEPENDENT (`zero_eligible_axis` at HEAD,
 * `brigade_attrition` at HEAD-G2), and Mistral 1's objective DENOMINATOR moves
 * 11/10/6 across configs — so "0/6" and "0/10" are not comparable quantities.
 *
 * What survives from the paragraph above, and is now better supported than when
 * it was written: brigade availability is not what the belt rides on, and the
 * three mechanical gates below are all real defects. They are simply not the
 * belt's cause. Three measured facts gate Mistral 1, none of them
 * about rosters:
 *
 *   1. `MAX_PLANNING_DURATION = 4` (sector_offensive.ts) — planning is hard-capped
 *      at four turns.
 *   2. The staging anchors are not adjacent to their objectives. Over
 *      `operational_contact_graph.json`: Grahovo axis stages at `op:livno:misi_2`,
 *      which is 4 hops from its first objective `crni_lug` and 6 from
 *      `bosansko_grahovo_2`. A four-turn cap against a four-hop approach. This is
 *      a direct hit on the operations-expert's staging-adjacency rule.
 *   3. Multi-axis launch requires `anyExecutable && !anyApproaching`
 *      (sector_offensive_launch_helpers.ts) — ONE axis with a brigade mid-march
 *      vetoes the whole operation. `axis_readiness_debug.ts` documents this exact
 *      deadlock as CONFIRMED at n205 (2026-08-12) with the fix NOT landed:
 *      `anyApproaching` fires on any axis returning `zero_eligible_axis`, which
 *      means "present but too weak", not "still marching" as its comment assumes.
 *
 * So the next lever is operation launch geometry, not force availability.
 *
 * Idiom mirrors `src/sim/combat/intel_ambush_depth_gate.ts`: module-local
 * override (set/reset for tests) layered over an env read. No `Date.now`, no
 * `Math.random` — deterministic. For both env vars, `"1"`/`"true"`/`"on"`/`"yes"`
 * enables; any other value (or unset) leaves the default-OFF behaviour
 * byte-identical to the shipped baseline.
 */

function readEnvFlag(name: 'AWWV_MAINSTAFF_OP_AVAILABILITY' | 'AWWV_MAINSTAFF_OP_RETENTION'): boolean {
    const raw = typeof process === 'undefined' ? undefined : process.env[name];
    if (raw === undefined) return false; // default OFF — preserves shipped baseline
    const normalized = raw.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'on' || normalized === 'yes';
}

// ─── GATE 2 — admission ──────────────────────────────────────────────────────
//
// ★ KNOWN ON-PATH COST, MEASURED — read this before flipping the default.
//
// 188w controlled quad, one variable each, same tree (runs n0-n3, 2026-08-21):
//
//   OFF              611 matched, anchors 31/31, hash 8bb624ebafa7a925
//   GATE2-only       610 matched, anchors 31/31, hash 8e3fe63f26a21865
//   GATE2 + GATE1    610 matched, anchors 31/31, hash 8e3fe63f26a21865  (byte-identical
//                                                                        final_save to
//                                                                        GATE2-only)
//
// The OFF arm reproduces HEAD n225's hash exactly, so the default path is
// byte-identical to the shipped baseline by MEASUREMENT, not by inspection.
//
// Turning GATE 2 ON costs exactly ONE cell across all 712 OSIDs:
// `op:sipovo:volari_2`, HRHB -> RS. Total controller churn is also 1, so this is
// not a coincident total over a different map.
//
// THE COST IS A RUN-BOUNDARY ARTIFACT, NOT LOST GROUND. Both arms end at t188
// with Mistral 2 still executing; the ON arm's Šipovo axis is exactly one
// objective behind (3 captures vs 4) because it lost a turn to a stalemate at
// `op:sipovo:sipovo_2` in w187.
//
// AND IT RIDES ON A 7-FOLD POWER-RATIO SWING. Same attacker (`hvo_rama_brigade`),
// same defender (`rs_22nd_krajina_infantry`), same OSIDs, same weeks, identical
// pre-battle state at t184 — yet power_ratio reads 14.52/16.36/11.01 (OFF) against
// 1.97/1.43/0.77 (ON). Root-caused by a later seat (PROJECT_LEDGER `b200accc2`) to
// the SECTOR PARTITION: `defenderPower` is a sector aggregate, Šipovo is fragmented
// across four sectors in OFF and pooled into one 18-OSID sector in ON, so the named
// combatants can be byte-identical while the denominator moves several-fold. NOT a
// determinism break; the path is fully deterministic and the two arms hold
// genuinely different state.
//
// DO NOT TUNE ANYTHING TO RECOVER THIS CELL. That theatre measured +/-5 cells of
// sensitivity to an unrelated three-row date change, so targeting one cell there is
// chasing noise with a ruler.

let _mainStaffOpAvailabilityOverride: boolean | null = null;

/**
 * Whether a sector-exempt brigade NAMED on an opportunity roster is admitted to
 * the axis and loaned to the host corps. Default: FALSE (shipped baseline).
 * Module-local override wins over env.
 */
export function isMainStaffOpAvailabilityEnabled(): boolean {
    return _mainStaffOpAvailabilityOverride !== null
        ? _mainStaffOpAvailabilityOverride
        : readEnvFlag('AWWV_MAINSTAFF_OP_AVAILABILITY');
}

/** Test/experiment hook: force the admission flag on or off, bypassing env. */
export function setMainStaffOpAvailabilityOverride(value: boolean): void {
    _mainStaffOpAvailabilityOverride = value;
}

/** Test/experiment hook: clear the admission override, reverting to env-default (OFF when unset). */
export function resetMainStaffOpAvailabilityOverride(): void {
    _mainStaffOpAvailabilityOverride = null;
}

// ─── GATE 1 — retention ──────────────────────────────────────────────────────
//
// MEASURED (188w, 2026-08-21): this half is BYTE-IDENTICALLY INERT at HEAD.
// GATE2-only and GATE2+GATE1 produce identical `final_save.json` files, and the
// OFF/ON weekly reports are identical through week 159. It removes a real
// accident and pins two regression tests at zero measured cost — but it has never
// been shown to earn a cell, and no one should claim it does.

let _mainStaffOpRetentionOverride: boolean | null = null;

/**
 * Whether reconciliation keeps a sector-exempt brigade on the roster by its LOAN
 * rather than by which corps' territory it happens to stand in. Default: FALSE
 * (shipped baseline). Independent of the admission flag — see the header note on
 * why the two halves are never switched together. Module-local override wins
 * over env.
 */
export function isMainStaffOpRetentionEnabled(): boolean {
    return _mainStaffOpRetentionOverride !== null
        ? _mainStaffOpRetentionOverride
        : readEnvFlag('AWWV_MAINSTAFF_OP_RETENTION');
}

/** Test/experiment hook: force the retention flag on or off, bypassing env. */
export function setMainStaffOpRetentionOverride(value: boolean): void {
    _mainStaffOpRetentionOverride = value;
}

/** Test/experiment hook: clear the retention override, reverting to env-default (OFF when unset). */
export function resetMainStaffOpRetentionOverride(): void {
    _mainStaffOpRetentionOverride = null;
}
