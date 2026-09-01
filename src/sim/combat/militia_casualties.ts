/**
 * OWNERSHIP: militia_casualties.ts
 * DOMAIN: The single authoritative writer for casualties taken by militia defenders.
 *
 * An OSID under enemy political control with no defending formation is still defended:
 * `computeMilitiaDefensePower()` gives it a population-derived garrison and the resolver
 * fights a real battle. Before this module those losses were reported and then dropped —
 * `attack_resolution_osid.ts` wrote defender losses only inside `if (defenderFormation)`,
 * so nothing was debited and nothing was recorded (42 battles / 3,844 raw casualties in
 * the 40-week artifact; 66 / 5,979 in the clean 188-week baseline n388).
 *
 * WHAT THIS MODULE DOES NOT DO — and why it matters:
 *
 * It does NOT cap militia defence by `pool.available`. That was the originally planned
 * architecture and it was falsified before implementation. `available` is the
 * post-mobilization recruitment RESIDUAL, not local defensive manpower: `committed` is
 * never decremented anywhere in the engine, refills are gated on controlling the
 * municipality (`ongoing_mobilization.ts`), and a faction that loses a municipality has
 * its `war_militia_strength` zeroed (`control_flip.ts` POST_FLIP_LOST_STRENGTH) while
 * `pool_population` only ever raises — so the pool of a faction defending ground it is
 * losing is structurally 0. Measured on a bounded 12-week canonical run: 27 of 30
 * militia-only battles drew on a pool with `available === 0`, and militia-only battles
 * are 50% of all battles and 52% of all attacker wins in that window. Capping by
 * `available` would have deleted historically attested local defence at Kozarac (held
 * ~2 days under 5,600 shells), Foča (~3 weeks), Višegrad, Zvornik and Vlasenica.
 * Defence magnitude is therefore left exactly as it was; only the ACCOUNTING changes.
 *
 * Deterministic: no randomness, no timestamps; `updated_turn` comes from `state.meta.turn`.
 */

import type { FactionId, GameState, MilitiaPoolState } from '../../state/game_state.js';
import type { CasualtyLedger, FormationCasualties } from '../../state/casualty_ledger.js';
import { recordMilitiaCasualties } from '../../state/casualty_ledger.js';
import { militiaPoolKey } from '../../state/militia_pool_key.js';
import { munFromOsid } from './osid_adjacency.js';

/**
 * Share of permanent battle losses (killed + missing) fed into `pool.exhausted`.
 * Matches the established demographic convention used by `pool_population.ts`,
 * `frontline_attrition.ts` and `siege_attrition.ts` — dead and missing men cannot be
 * re-mobilized, and `exhausted` is what makes that bite: `ongoing_mobilization.ts`
 * measures `available + committed + exhausted` against military-age males and throttles
 * or halts recruitment as that ratio crosses its thresholds.
 */
const MILITIA_PERMANENT_LOSS_EXHAUSTION_SHARE = 0.75;

export interface MilitiaBattleCasualtyResult {
    /** Canonical `${mun_id}:${faction}` key the losses were recorded against. */
    poolKey: string;
    /** RAW casualties actually applied (never more than were inflicted). */
    appliedRaw: FormationCasualties;
    /** Sum of `appliedRaw`. */
    appliedTotal: number;
    /** RAW manpower actually taken out of `pool.available` (0 when the pool is empty). */
    drawnFromAvailable: number;
}

function totalOf(c: FormationCasualties): number {
    return c.killed + c.wounded + c.missing_captured;
}

/**
 * Apply one militia-only battle's losses atomically: pool demographics and casualty
 * ledger are mutated in the same call so the two can never disagree.
 *
 * `rawCasualties` are RAW battle losses. They drive pool demographics directly; the
 * ledger separately applies the per-faction realism fraction exactly once, inside
 * `recordMilitiaCasualties`. The two quantities are not interchangeable.
 *
 * Returns `null` only when there is nothing to record (no municipality resolvable from
 * the OSID, or zero/negative casualties). A missing pool is NOT a reason to skip the
 * ledger write: the casualties happened and must still reach the faction totals, so the
 * row is recorded against the canonical key and only the pool mutation is skipped.
 */
export function applyMilitiaBattleCasualties(params: {
    state: GameState;
    faction: FactionId;
    targetOsid: string;
    rawCasualties: FormationCasualties;
    /**
     * Municipality override for callers that address settlements rather than OSIDs.
     * The legacy SID resolver has a canonical settlement-to-municipality map but no
     * OSID, so it resolves the municipality itself and passes it here rather than
     * having this module guess one from a settlement id.
     */
    mun?: string;
}): MilitiaBattleCasualtyResult | null {
    const { state, faction, targetOsid, rawCasualties } = params;

    const killed = Math.max(0, Math.floor(rawCasualties.killed));
    const wounded = Math.max(0, Math.floor(rawCasualties.wounded));
    const missing = Math.max(0, Math.floor(rawCasualties.missing_captured));
    const applied: FormationCasualties = { killed, wounded, missing_captured: missing };
    const total = totalOf(applied);
    if (total <= 0) return null;

    const mun = params.mun ?? munFromOsid(targetOsid);
    if (!mun) return null;
    const poolKey = militiaPoolKey(mun, faction);

    const pools = state.military.militia_pools as Record<string, MilitiaPoolState> | undefined;
    const pool = pools?.[poolKey];

    let drawnFromAvailable = 0;
    if (pool) {
        // A pool belongs to exactly one faction; a mismatch means the key was built
        // wrongly and the losses must not be attributed here.
        if (pool.faction != null && pool.faction !== faction) return null;

        // Uncommitted local manpower that fought is no longer uncommitted. This is a
        // debit of what the pool actually holds, NOT a cap on what the defence was:
        // in the common case `available` is 0 and this is a no-op.
        drawnFromAvailable = Math.min(Math.max(0, pool.available ?? 0), total);
        pool.available = Math.max(0, (pool.available ?? 0) - drawnFromAvailable);

        // Permanent losses feed the demographic drain regardless of what `available`
        // held — the men are dead either way, and this is the field that constrains
        // future mobilization.
        const permanent = killed + missing;
        if (permanent > 0) {
            pool.exhausted = (pool.exhausted ?? 0)
                + Math.round(permanent * MILITIA_PERMANENT_LOSS_EXHAUSTION_SHARE);
        }

        // Only manpower actually TAKEN from the pool may later return to it. Crediting
        // the full wounded count would create manpower in a pool the defenders were
        // never drawn from — which is the normal case (27 of 30 measured battles).
        // The field is materialized on every pool this writer touches, so a pool that
        // has seen militia combat always reports its pending wounded rather than absence.
        const returnable = wounded > 0 && drawnFromAvailable > 0
            ? Math.round((wounded * drawnFromAvailable) / total)
            : 0;
        pool.wounded_pending = (pool.wounded_pending ?? 0) + returnable;

        pool.updated_turn = state.meta?.turn ?? pool.updated_turn ?? 0;
    }

    const ledger = state.military.casualty_ledger as CasualtyLedger | undefined;
    if (ledger) recordMilitiaCasualties(ledger, faction, poolKey, applied);

    return { poolKey, appliedRaw: applied, appliedTotal: total, drawnFromAvailable };
}
