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
