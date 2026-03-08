/**
 * Bot brigade AI — supply state and ethnic composition helpers.
 *
 * Extracted from bot_brigade_ai_osid.ts (behavior-preserving refactor).
 * Deterministic: no randomness, no timestamps.
 */

import type { EdgeRecord } from '../../map/settlements.js';
import type {
    FactionId,
    FormationState,
} from '../../state/game_state.js';
import type { OperationalToCanonicalReverseMap, OsidPopulationMap } from '../../data/operational_data.js';
import type { SupplyStateByOsidReport } from '../../state/supply_state_derivation.js';
import type { SettlementEthnicityData } from '../../data/settlement_ethnicity.js';
import type { Osid } from './osid_adjacency.js';

// Re-export from shared module
export type { OsidEthnicComposition } from './ethnic_defense.js';
import type { OsidEthnicComposition } from './ethnic_defense.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Supply connectivity: OSIDs reachable from faction supply (adequate or strained = on network).
 * Used for chokepoint/corridor defense priority. Derived from supply_state_by_osid (non-critical).
 */
export type SupplyConnectivityByFaction = Map<FactionId, Set<Osid>>;

/** Context needed for OSID bot decisions. Passed from the pipeline. */
export interface OsidBotContext {
    edges: EdgeRecord[];
    reverseMap: OperationalToCanonicalReverseMap;
    supplyStateByOsid?: SupplyStateByOsidReport | null;
    supplyConnectivityByFaction?: SupplyConnectivityByFaction;
    ethnicCompositionByOsid?: OsidEthnicComposition;
    osidPopulationMap?: OsidPopulationMap;
}

// ═══════════════════════════════════════════════════════════════════════════
// Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute per-OSID ethnic composition by averaging canonical SID compositions.
 * Deterministic: iteration order does not matter (arithmetic average).
 */
export function computeOsidEthnicComposition(
    reverseMap: OperationalToCanonicalReverseMap,
    ethnicityData: SettlementEthnicityData
): OsidEthnicComposition {
    const result: OsidEthnicComposition = new Map();
    for (const [osid, canonicalSids] of reverseMap.entries()) {
        if (!canonicalSids || canonicalSids.length === 0) continue;
        let totalBosniak = 0, totalSerb = 0, totalCroat = 0, count = 0;
        for (const sid of canonicalSids) {
            const entry = ethnicityData.by_settlement_id[sid];
            if (!entry || !entry.composition) continue;
            totalBosniak += entry.composition.bosniak;
            totalSerb += entry.composition.serb;
            totalCroat += entry.composition.croat;
            count++;
        }
        if (count > 0) {
            result.set(osid, { bosniak: totalBosniak / count, serb: totalSerb / count, croat: totalCroat / count });
        }
    }
    return result;
}

/** Look up a brigade's supply state from the OSID supply report. */
export function getBrigadeSupplyState(
    brigade: FormationState,
    supplyStateByOsid?: SupplyStateByOsidReport | null
): 'adequate' | 'strained' | 'critical' {
    if (!supplyStateByOsid?.factions || !brigade.location_osid || !brigade.faction) return 'adequate';
    const fac = supplyStateByOsid.factions.find(f => f.faction_id === brigade.faction);
    if (!fac?.by_osid) return 'adequate';
    const entry = fac.by_osid.find(e => e.osid === brigade.location_osid);
    if (!entry) return 'adequate';
    return entry.state;
}

/** Supply-aware attack penalty. Faction-specific conservatism. */
export function getAttackerSupplyPenalty(attackerOsid: Osid, faction: FactionId, supplyReport?: SupplyStateByOsidReport | null): number {
    if (!supplyReport?.factions) return 0;
    const fac = supplyReport.factions.find(f => f.faction_id === faction);
    if (!fac?.by_osid) return 0;
    const entry = fac.by_osid.find(e => e.osid === attackerOsid);
    if (!entry) return 0;
    switch (entry.state) {
        case 'critical':
            if (faction === 'RBiH') return -300;
            if (faction === 'HRHB') return -250;
            return -200;
        case 'strained':
            if (faction === 'RBiH') return -100;
            if (faction === 'HRHB') return -75;
            return -50;
        default: return 0;
    }
}

/**
 * Bipolar co-ethnic score: -80 (0% co-ethnic) to +80 (≥50% co-ethnic).
 * Penalizes attacking non-coethnic territory, attracts toward coethnic areas.
 * Linear: 0% → -80, 25% → 0 (neutral), 50%+ → +80.
 * This replaces hardcoded avoid_municipalities — factions naturally avoid
 * territory with no co-ethnic population (e.g., RS won't attack Livno = 3% Serb → -70).
 */
export function getCoEthnicScore(osid: Osid, faction: FactionId, ethnicMap: OsidEthnicComposition | undefined): number {
    if (!ethnicMap) return 0;
    const comp = ethnicMap.get(osid);
    if (!comp) return 0;
    let share: number;
    switch (faction) {
        case 'RS': share = comp.serb; break;
        case 'RBiH': share = comp.bosniak; break;
        case 'HRHB': share = comp.croat; break;
        default: return 0;
    }
    const normalized = Math.min(share / 0.5, 1.0); // 0..1
    return Math.floor((normalized * 2 - 1) * 80);   // -80..+80
}

/**
 * RS should not attack HRHB-controlled territory outside historically plausible areas.
 * VRS had no strategic interest in fighting HVO in Central Bosnia or Herzegovina in 1992.
 * Allowlist: Posavina corridor municipalities + Kupres (VRS-HVO friction did occur there).
 */
export const RS_VS_HRHB_ATTACK_ALLOWLIST = new Set([
    'odzak', 'orasje', 'bosanski_samac', 'bosanski_brod', 'brcko',
    'derventa', 'modrica', 'kupres',
]);

export function getRsVsHrhbPenalty(targetOsid: string, attackerFaction: string, defenderFaction: string | null): number {
    if (attackerFaction !== 'RS' || defenderFaction !== 'HRHB') return 0;
    const mun = targetOsid.split(':')[1];
    if (!mun || RS_VS_HRHB_ATTACK_ALLOWLIST.has(mun)) return 0;
    return 0; // Disabled — net area regression (KRAJINA/HERZEGOVINA offset Central gains)
}
