/**
 * Intel ambush DEPTH — bounded-friction amplifier (pure math + constants).
 *
 * Implements docs/40_reports/proposals/20260605_INTEL_AMBUSH_FRICTION_DESIGN.md §2/§4:
 * the "depth" slice of the ambush-friction mechanic. The base mechanic (in
 * combat_math.ts::getIntelAmbush*CasualtyMult, umbrella-gated by
 * AWWV_INTEL_AMBUSH_FRICTION, default ON) punishes blind attacks into OPSEC-screened
 * sectors with a small, capped casualty swing. This module supplies a DEPTH FACTOR
 * `d ∈ [0, 1]` that scales how far the attacker is reaching past its own reconnaissance:
 * a deep thrust into an under-scouted, OPSEC-screened rear is more ambush-prone than a
 * shallow push at a well-observed front edge.
 *
 * The depth factor is folded into the existing capped multipliers as a BOUNDED amplifier
 * of the current cap (never a new uncapped swing), then HARD-CLAMPED to:
 *   attacker ≤ INTEL_EXECUTION_AMBUSH_ATTACKER_CASUALTY_MAX (1.18)
 *   defender ≥ INTEL_EXECUTION_AMBUSH_DEFENDER_CASUALTY_MIN (0.90)
 *
 * Determinism & safety (carried from the packet §5):
 *   - NO Math.random / Date.now / new Date / timestamps anywhere.
 *   - Pure function of existing state (faction recon profile + per-OSID intel record);
 *     no new persisted field. Sorted iteration is unnecessary here (single-record lookup),
 *     but any enumeration uses strictCompare to stay deterministic.
 *   - Exposes NO hidden enemy truth: depth is an attacker-side, observable-input quantity;
 *     the public ambush label is unchanged by this module.
 *   - Depth-neutral (`d = 0`) ⇒ the amplified multipliers equal the shipped values exactly
 *     (byte-identity by construction). The DEPTH sub-flag (AWWV_INTEL_AMBUSH_DEPTH) gates
 *     whether a non-zero depth is ever computed at the call-site; it defaults OFF.
 */

import type { FactionId, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { FACTION_RECON_PROFILES } from './sector_intel_constants.js';

// ── Constants (packet §4 step 1) ────────────────────────────────────────────
/** How much depth can amplify the effective friction WITHIN the new clamp. d=1 raises the
 *  per-confidence friction by up to +50% — friction/exhaustion, never a win-lever. */
export const INTEL_EXECUTION_AMBUSH_DEPTH_GAIN = 0.5;
/** Hard ceiling on the attacker ambush casualty multiplier once depth is folded in.
 *  Only modestly above today's 1.12 base cap. */
export const INTEL_EXECUTION_AMBUSH_ATTACKER_CASUALTY_MAX = 1.18;
/** Hard floor on the defender ambush casualty multiplier once depth is folded in. */
export const INTEL_EXECUTION_AMBUSH_DEFENDER_CASUALTY_MIN = 0.90;

function clamp01(x: number): number {
    if (!Number.isFinite(x)) return 0;
    if (x < 0) return 0;
    if (x > 1) return 1;
    return x;
}

/**
 * Pure depth-factor derivation: how far the attacker is reaching past its own recon when
 * striking `targetOsid` (held by `defenderSectorId`) from the sector containing
 * `attackerOsid`.
 *
 * Returns `d ∈ [0, 1]`:
 *   d → 0  the target is a well-observed front edge within the attacker's recon reach
 *          (front-adjacent sector contact AND an established per-OSID intel estimate);
 *   d → 1  the target is under-scouted relative to the attacker's recon_range — a blind
 *          deep thrust (no per-OSID estimate / sector confidence well below what the
 *          faction's recon reach should deliver at this hop depth).
 *
 * Signal (existing state only, no new field):
 *   - The attacker faction's `recon_range` (FACTION_RECON_PROFILES) — its scouting reach.
 *   - The intel record for the defender sector: `front_edge_count` (front-adjacency),
 *     `osid_confidence` (per-OSID estimate presence + value) and sector `confidence`.
 * The deeper / less-scouted the target relative to recon reach, the higher `d`.
 *
 * Deterministic: no RNG, no clock; identical inputs → identical output.
 */
export function getAmbushDepthFactor(
    state: GameState,
    attackerOsid: string,
    defenderSectorId: string | undefined,
    targetOsid: string,
): number {
    if (!defenderSectorId) return 0;

    // Resolve the attacker's recon origin sector (mirrors getAttackIntelConfidence).
    const sectors = state.military.corps_front_sectors;
    if (!sectors) return 0;
    let attackerSectorId: string | null = null;
    for (const sectorId of Object.keys(sectors).sort(strictCompare)) {
        const sector = sectors[sectorId];
        if (!sector) continue;
        for (const subSegment of sector.sub_segments ?? []) {
            if (subSegment.friendly_osids.includes(attackerOsid)) {
                attackerSectorId = sectorId;
                break;
            }
        }
        if (attackerSectorId) break;
    }
    if (!attackerSectorId) return 0;

    const attackerSector = sectors[attackerSectorId];
    const faction = attackerSector?.faction as NonNullable<FactionId> | undefined;
    if (!faction) return 0;
    const profile = FACTION_RECON_PROFILES[faction];
    if (!profile) return 0;

    const record = state.military.sector_intel?.[attackerSectorId]
        ?.find(rec => rec.enemy_sector_id === defenderSectorId);
    if (!record) {
        // No intel record at all on this sector pair: maximally under-scouted reach.
        return 1;
    }

    // Recon reach: how many sector-hops deep the faction can resolve. recon_range >= 2
    // (RBiH) sees a second echelon; range 1 (RS/HRHB) only the front edge.
    const reconRange = Math.max(1, profile.recon_range);

    // Front-adjacency component: a target sector NOT sharing a front edge is, by
    // definition, at least one hop deeper than the attacker can directly observe.
    const frontAdjacent = (record.front_edge_count ?? 0) > 0;

    // Per-OSID scouting component: an established per-OSID estimate means the specific
    // target has been individually observed (shallow). A MISSING per-OSID estimate means
    // the OSID itself is unscouted — by contract that target reads as blind (confidence 0,
    // deepest reach), NOT as inheriting the coarser sector-level confidence. Falling back to
    // record.confidence would let an unscouted OSID masquerade as well-scouted.
    const osidEntry = record.osid_confidence?.find(entry => entry.osid === targetOsid);
    const targetConfidence = osidEntry ? osidEntry.confidence : 0;

    // Depth grows as (a) the target is non-front-adjacent and (b) the attacker's
    // confidence in the specific target falls short of what its recon reach implies.
    // recon_range scales the "expected" confidence: a longer-range faction reaching the
    // same shallow confidence is over-reaching further, hence deeper.
    //
    // shortfall ∈ [0,1]: 0 when fully confident, 1 when blind. Scaled by recon_range so a
    // range-2 faction at low confidence reads as deeper over-reach than a range-1 faction.
    const confidenceShortfall = clamp01(1 - clamp01(targetConfidence));
    const reachScale = clamp01(reconRange / 2); // range-1 → 0.5, range-2 → 1.0
    const scoutingDepth = clamp01(confidenceShortfall * (0.5 + 0.5 * reachScale));

    // Non-front-adjacent targets carry an inherent depth floor (physically out of direct
    // observation), combined with the scouting shortfall.
    const adjacencyDepth = frontAdjacent ? 0 : 0.5;

    return clamp01(Math.max(adjacencyDepth, scoutingDepth));
}
