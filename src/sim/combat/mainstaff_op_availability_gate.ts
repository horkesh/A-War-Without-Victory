/**
 * Main-staff operation availability — feature gate (default OFF).
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
 * Net effect with the flag OFF: a scripted operation is gated on where an
 * unrostered national reserve happens to be parked, while the reserve its
 * designer actually named is undeliverable by construction.
 *
 * The contract this flag restores is NOT new. `pre_planned_operations.ts`
 * (`buildAxesFromDef`, the exempt-corps branch) already implements it for the
 * PRE-PLANNED injection path: a named exempt-corps brigade is admitted and gets
 * an elite loan to the operation's corps at injection time, which makes it a real
 * member of the receiving corps for every downstream consumer that already reads
 * `on_loan ? loaned_to_corps : corps_id`. The OPPORTUNITY injection path — where
 * the Mistral 1 / Mistral 2 catalog entries live — never received it.
 *
 * With the flag ON:
 *   - GATE 2 admits a sector-exempt brigade that is NAMED on the axis roster and
 *     can reach the host corps' territory, and schedules the elite loan.
 *   - GATE 1 reads the LOAN rather than the parking spot for sector-exempt
 *     brigades. That both keeps a properly attached reserve when it is standing
 *     in someone else's territory AND withdraws the free ride a merely-sectorless
 *     brigade currently gets.
 *
 * Non-exempt brigades are untouched in both gates.
 *
 * Idiom mirrors `src/sim/combat/intel_ambush_depth_gate.ts`: module-local
 * override (set/reset for tests) layered over an env read. No `Date.now`, no
 * `Math.random` — deterministic. Env var `AWWV_MAINSTAFF_OP_AVAILABILITY`:
 * `"1"`/`"true"`/`"on"`/`"yes"` enables; any other value (or unset) leaves the
 * default-OFF behaviour byte-identical to the shipped baseline.
 */

let _mainStaffOpAvailabilityOverride: boolean | null = null;

function readEnvMainStaffOpAvailability(): boolean {
    const raw = typeof process === 'undefined' ? undefined : process.env.AWWV_MAINSTAFF_OP_AVAILABILITY;
    if (raw === undefined) return false; // default OFF — preserves shipped baseline
    const normalized = raw.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'on' || normalized === 'yes';
}

/**
 * Whether main-staff brigades get an explicit roster/attachment availability
 * contract for catalog operations. Default: FALSE (shipped baseline).
 * Module-local override wins over env.
 */
export function isMainStaffOpAvailabilityEnabled(): boolean {
    return _mainStaffOpAvailabilityOverride !== null
        ? _mainStaffOpAvailabilityOverride
        : readEnvMainStaffOpAvailability();
}

/** Test/experiment hook: force the flag on or off, bypassing env. */
export function setMainStaffOpAvailabilityOverride(value: boolean): void {
    _mainStaffOpAvailabilityOverride = value;
}

/** Test/experiment hook: clear the override, reverting to env-default (OFF when unset). */
export function resetMainStaffOpAvailabilityOverride(): void {
    _mainStaffOpAvailabilityOverride = null;
}
