/**
 * Tactical Group personnel accounting helpers (ADR-0005 Phase 0 safety cascade).
 *
 * Single source of truth for the "effective personnel" contract documented at
 * `game_state.ts` (FormationState.personnel_lent_by_tg):
 *
 *     effectivePersonnel = personnel - sum(values of personnel_lent_by_tg)
 *
 * WHY THIS EXISTS — the double-count bug it closes:
 *   When TG flags are ON, `formTacticalGroup` records `donor.personnel_lent_by_tg[tgId]`
 *   but never decrements `donor.personnel`. The lent slice therefore fights inside the TG
 *   (via `computeTgDonorPower`, which intentionally reads raw `donor.personnel`) AND still
 *   counts toward the donor's HOME availability — defensive strength, recruitment capacity,
 *   enemy-strength estimation — because those sites read raw `brigade.personnel`. The lent
 *   slice is in two places at once.
 *
 * THE FIX (Phase 0): HOME-availability consumers read `effectivePersonnel(brigade)`; the
 *   lent slice is subtracted there. TG-INTERNAL denominators stay on raw `.personnel`
 *   (they apply their own lent-fraction math): `computeTgDonorPower`
 *   (attack_resolution_osid.ts), the TG casualty split (tactical_group_casualties.ts), and
 *   the cohesion-bleed fraction (tactical_group_lifecycle.ts).
 *
 * DETERMINISM: pure, no Math.random / Date.now. Object.values order is irrelevant to a sum.
 *
 * FLAG-OFF SAFETY: with TG flags default-OFF, `personnel_lent_by_tg` is always empty/absent,
 *   so `effectivePersonnel(b) === (b.personnel ?? 0)` exactly — output stays byte-identical.
 */

import type { FormationState } from '../../state/game_state.js';

/**
 * Sum of personnel currently lent out by a brigade across all TGs it donates to.
 * Hard Invariant #1 means at most one TG per brigade, but the sum is robust to that.
 * Returns 0 when the ledger is empty/absent (the default, flag-off path).
 */
export function lentPersonnel(brigade: Pick<FormationState, 'personnel_lent_by_tg'>): number {
    const lent = brigade.personnel_lent_by_tg;
    if (!lent) return 0;
    let total = 0;
    for (const v of Object.values(lent)) {
        total += v ?? 0;
    }
    return total;
}

/**
 * Effective personnel available to a brigade at HOME after accounting for any
 * personnel lent out to Tactical Groups.
 *
 *   effectivePersonnel = max(0, (personnel ?? 0) - sum(personnel_lent_by_tg))
 *
 * Clamped at 0: a donor's own attrition can push raw personnel below the recorded
 * lent amount mid-op, which would otherwise yield a negative effective figure.
 */
export function effectivePersonnel(
    brigade: Pick<FormationState, 'personnel' | 'personnel_lent_by_tg'>,
): number {
    const raw = brigade.personnel ?? 0;
    return Math.max(0, raw - lentPersonnel(brigade));
}
