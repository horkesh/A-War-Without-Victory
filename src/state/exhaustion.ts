import { FrontEdge } from '../map/front_edges.js';
import type { FactionId, GameState } from './game_state.js';
import { getFactionLegitimacyAverages } from './legitimacy.js';
import { getExhaustionExternalModifier } from './patron_pressure.js';
import { strictCompare } from './validateGameState.js';
// Band thresholds + derivation live in a BROWSER-SAFE leaf module (zero Node
// imports, zero runtime game_state import) so the UI read-model can share them
// without dragging Node-only code into the vite/rollup bundle. (Codex #402.)
import {
    WAR_WEARINESS_BAND_THRESHOLDS,
    WAR_WEARINESS_BANDS_ASCENDING,
    recoveredExhaustionLevel,
    warWearinessBandForExhaustion,
} from './war_weariness_bands.js';

export const EXHAUSTION_WORK_DIVISOR = 10;
export const EXHAUSTION_LEGITIMACY_MULTIPLIER = 0.05;

// Re-export the band surface from the browser-safe module so existing importers
// of these symbols from `state/exhaustion.ts` keep working unchanged.
export {
    WAR_WEARINESS_BAND_THRESHOLDS,
    WAR_WEARINESS_BANDS_ASCENDING,
    recoveredExhaustionLevel,
    warWearinessBandForExhaustion,
};

/**
 * Record the FIRST turn each faction crosses each war-weariness FEEL band into
 * the OBSERVATIONAL `political.war_weariness_band_first_reached` map. Idempotent
 * and monotonic: an existing (faction, band) entry is NEVER overwritten, and a
 * faction below the strained floor writes nothing (so the no-crossing path stays
 * byte-identical and the map is absent on a steady-only run).
 *
 * PURELY OBSERVATIONAL — nothing in the sim reads this map; it exists only so the
 * War-Weariness Chronicle beat can be pinned to the true crossing turn (the
 * monotonic current value cannot recover WHEN a band was first reached). Because
 * no sim decision consumes it, simulation behavior (control, territory, ops,
 * casualties) is byte-identical; only the serialized save gains this anchor once
 * a crossing occurs (a clean, honest ratchet of newly-realized information).
 *
 * Deterministic: factions iterated in sorted order; bands in fixed ascending
 * order; no RNG, no clock.
 */
export function recordWarWearinessBandCrossings(state: GameState): void {
    const exhaustion = state.political?.war_exhaustion;
    if (!exhaustion || typeof exhaustion !== 'object') return;

    const factionIds = (state.factions ?? []).map((f) => f.id).sort(strictCompare);
    for (const fid of factionIds) {
        const raw = Number((exhaustion as Partial<Record<FactionId, number>>)[fid] ?? 0);
        const band = warWearinessBandForExhaustion(raw);
        if (!band) continue; // steady — nothing to record

        // Lazily allocate the observational map only once a crossing exists.
        if (!state.political.war_weariness_band_first_reached) {
            state.political.war_weariness_band_first_reached = {};
        }
        const byFaction = state.political.war_weariness_band_first_reached;
        const existing = byFaction[fid] ?? {};

        const currentTurn = Number(state.meta?.turn ?? 0);
        // Record every band crossed up to (and including) the current band, each
        // pinned to the FIRST turn it is observed crossed. Monotonic ⇒ once set,
        // never moved (guards against a re-run/replay re-stamping a later turn).
        for (const b of WAR_WEARINESS_BANDS_ASCENDING) {
            if (WAR_WEARINESS_BAND_THRESHOLDS[b] > recoveredExhaustionLevel(raw)) break;
            if (existing[b] === undefined) {
                existing[b] = currentTurn;
            }
        }
        byFaction[fid] = existing;
    }
}

export interface ExhaustionStats {
    per_faction: Array<{
        faction_id: string;
        exhaustion_before: number;
        exhaustion_after: number;
        delta: number;
        work_supplied: number;
        work_unsupplied: number;
    }>;
}

export function accumulateExhaustion(
    state: GameState,
    derivedFrontEdges: FrontEdge[],
    pressureDeltasByEdge: Map<string, number>,
    localSupplyByEdgeSide: Map<string, { side_a_supplied: boolean; side_b_supplied: boolean }>
): ExhaustionStats {
    const factions = [...(state.factions ?? [])].sort((a, b) => strictCompare(a.id, b.id));
    const workSuppliedByFaction = new Map<string, number>();
    const workUnsuppliedByFaction = new Map<string, number>();
    const legitimacyByFaction = getFactionLegitimacyAverages(state);

    for (const f of factions) {
        workSuppliedByFaction.set(f.id, 0);
        workUnsuppliedByFaction.set(f.id, 0);
    }

    const edgesSorted = [...derivedFrontEdges]
        .filter((e) => e && typeof e.edge_id === 'string')
        .sort((a, b) => strictCompare(a.edge_id, b.edge_id));

    for (const edge of edgesSorted) {
        const edge_id = edge.edge_id;
        const seg = state.military.front_segments[edge_id];
        const isActive = seg && typeof seg === 'object' && seg.active === true;
        if (!isActive) continue;

        const side_a = edge.side_a;
        const side_b = edge.side_b;
        if (typeof side_a !== 'string' || typeof side_b !== 'string') continue;

        const deltaRaw = pressureDeltasByEdge.get(edge_id);
        if (!Number.isInteger(deltaRaw)) continue;
        const delta = deltaRaw as number;
        const work = Math.abs(delta);

        const supply = localSupplyByEdgeSide.get(edge_id);
        if (!supply) continue;

        // Attribute the same abs(delta) "work" to both sides; bucket by supplied vs unsupplied.
        if (supply.side_a_supplied) {
            workSuppliedByFaction.set(side_a, (workSuppliedByFaction.get(side_a) ?? 0) + work);
        } else {
            workUnsuppliedByFaction.set(side_a, (workUnsuppliedByFaction.get(side_a) ?? 0) + work);
        }

        if (supply.side_b_supplied) {
            workSuppliedByFaction.set(side_b, (workSuppliedByFaction.get(side_b) ?? 0) + work);
        } else {
            workUnsuppliedByFaction.set(side_b, (workUnsuppliedByFaction.get(side_b) ?? 0) + work);
        }
    }

    const per_faction: ExhaustionStats['per_faction'] = [];

    for (const f of factions) {
        const before = Number.isFinite(f.profile?.exhaustion) ? f.profile.exhaustion : 0;
        const work_supplied = workSuppliedByFaction.get(f.id) ?? 0;
        const work_unsupplied = workUnsuppliedByFaction.get(f.id) ?? 0;
        const total_work = work_supplied + 2 * work_unsupplied;
        const inc = Math.floor(total_work / EXHAUSTION_WORK_DIVISOR);
        const externalMod = getExhaustionExternalModifier(f.patron_state, state.political.international_visibility_pressure);
        const legitimacy = legitimacyByFaction[f.id] ?? 0.5;
        const legitimacyMod = (1 - legitimacy) * EXHAUSTION_LEGITIMACY_MULTIPLIER;
        const scaled = Math.floor(inc * (1 + externalMod + legitimacyMod));
        const after = before + Math.max(0, scaled);

        // Irreversible: never decrease.
        f.profile.exhaustion = after;

        per_faction.push({
            faction_id: f.id,
            exhaustion_before: before,
            exhaustion_after: after,
            delta: Math.max(0, scaled),
            work_supplied,
            work_unsupplied
        });
    }

    return { per_faction };
}

