/**
 * Phase D Step 5: Exhaustion accumulation for War phase (Mid-War).
 * Exhaustion is irreversible (Engine Invariants §8); degrades effectiveness; does not flip control.
 */

import { EXHAUSTION_LEGITIMACY_MULTIPLIER } from '../../state/exhaustion.js';
import type { FactionId, GameState, FrontDescriptor } from '../../state/game_state.js';
import { getFactionLegitimacyAverages } from '../../state/legitimacy.js';
import { getExhaustionExternalModifier } from '../../state/patron_pressure.js';
import { RESILIENCE_EFFECT_SCALE } from '../../state/supply_reserve_constants.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getMaxEnclaveResilienceForFaction } from './enclave_resilience.js';
import { hasLiveSectorFrontlineTruth } from './front_assignment.js';
import { isSectorColdFront } from './sector_utils.js';
import { getFactionLiveSupplyPressure } from './supply_condition.js';

/** Exhaustion per static front (Engine Invariants §6, §8). */
const EXHAUSTION_PER_STATIC_FRONT = 2;

/** Exhaustion per point of supply pressure (0–100). */
const EXHAUSTION_PER_SUPPLY_PRESSURE_POINT = 0.1;

/** Cap exhaustion delta per turn per faction (bounded growth). */
const MAX_DELTA_PER_TURN = 10;

/**
 * Update war_exhaustion from sector-owned frontline exposure and supply pressure.
 * Only runs when meta.phase === 'war'.
 * Exhaustion is monotonic (never decreased) — Engine Invariants §8.
 * Does not modify political_controllers.
 * When frictionMultipliers is provided (Phase D0.9), exhaustion delta is scaled by multiplier
 * so that higher command friction (higher multiplier) increases effective exhaustion growth.
 */
export function updateExhaustion(
    state: GameState,
    fronts: FrontDescriptor[] = [],
    frictionMultipliers?: Record<FactionId, number>
): void {
    if (state.meta.phase !== 'war') {
        return;
    }

    const factionIds = (state.factions ?? []).map((f) => f.id).sort(strictCompare);
    const legitimacyByFaction = getFactionLegitimacyAverages(state);
    const sarajevo = state.political.sarajevo_state;
    const staticFrontCountByFaction = new Map<FactionId, number>();
    for (const fid of factionIds) {
        staticFrontCountByFaction.set(fid, 0);
    }

    if (hasLiveSectorFrontlineTruth(state)) {
        for (const sector of Object.values(state.military.corps_front_sectors ?? {})) {
            if (!sector) continue;
            if ((sector.edge_ids?.length ?? 0) === 0) continue;
            if (isSectorColdFront(state, sector)) continue;
            staticFrontCountByFaction.set(
                sector.faction,
                (staticFrontCountByFaction.get(sector.faction) ?? 0) + 1,
            );
        }
    } else {
        const staticFrontCount = fronts.filter((f) => f.stability === 'static').length;
        for (const fid of factionIds) {
            staticFrontCountByFaction.set(fid, staticFrontCount);
        }
    }

    if (!state.political.war_exhaustion) {
        (state as GameState & { war_exhaustion: Record<FactionId, number> }).political.war_exhaustion = {};
    }
    const exhaustion = state.political.war_exhaustion!;

    for (const fid of factionIds) {
        const current = typeof exhaustion[fid] === 'number' ? exhaustion[fid]! : 0;
        const supplyContrib = getFactionLiveSupplyPressure(state, fid) * EXHAUSTION_PER_SUPPLY_PRESSURE_POINT;
        const staticContrib = (staticFrontCountByFaction.get(fid) ?? 0) * EXHAUSTION_PER_STATIC_FRONT;
        const delta = Math.min(MAX_DELTA_PER_TURN, supplyContrib + staticContrib);
        const multiplier = frictionMultipliers?.[fid] ?? 1;
        const faction = state.factions.find((f) => f.id === fid);
        const externalMod = getExhaustionExternalModifier(faction?.patron_state, state.political.international_visibility_pressure);
        const legitimacy = legitimacyByFaction[fid] ?? 0.5;
        const legitimacyMod = (1 - legitimacy) * EXHAUSTION_LEGITIMACY_MULTIPLIER;
        const sarajevoExtra =
            sarajevo?.siege_status === 'BESIEGED'
                ? fid === 'RBiH'
                    ? 3.0
                    : fid === 'RS'
                        ? 2.0
                        : 0
                : 0;
        const effectiveDelta = Math.min(MAX_DELTA_PER_TURN, delta * multiplier * (1 + externalMod + legitimacyMod) + sarajevoExtra);
        // Phase C: enclave resilience reduces exhaustion growth (only RBiH has enclaves)
        const enclaveResilience = getMaxEnclaveResilienceForFaction(state, fid as FactionId);
        const enclaveReduction = enclaveResilience * RESILIENCE_EFFECT_SCALE;
        const finalDelta = effectiveDelta * Math.max(0, 1.0 - enclaveReduction);
        // Phase 1 / #29 sub-issue 5: clamp at 100. The accumulator was previously
        // unbounded, but threshold consumers (`WASH_COMBINED_EXHAUSTION = 55`,
        // `CEASEFIRE_HRHB_EXHAUSTION = 35`, `CEASEFIRE_RBIH_EXHAUSTION = 30`)
        // were authored against a 0-100 percentage scale. Without the clamp,
        // values accumulate past 1500 per faction in 188w runs, making W6/C2/C3
        // gates trivially met by t8 and causing WA to fire 41 weeks early
        // (t60 vs historical w101). 100 is the canonical "fully exhausted"
        // ceiling per the threshold authors' intent.
        exhaustion[fid] = Math.min(100, current + finalDelta);
    }
}

