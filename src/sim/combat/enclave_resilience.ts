/**
 * B4: Enclave resilience system.
 *
 * Known enclaves that historically held despite isolation:
 * - Bihać pocket (5th Corps, 1992-1995)
 * - Srebrenica (1993-1995, fell July 1995)
 * - Žepa (1993-1995, fell July 1995)
 * - Goražde (1992-1995, never fell)
 * - Sarajevo (besieged 1992-1996, never fell)
 *
 * Mechanics:
 * - Resilience value [0, 30] per enclave, grows under isolation, decays under adequate supply.
 * - Defense bonus: 1.0 + resilience × 0.005 (max 1.15 = +15% at 30).
 * - Cohesion recovery: +1/turn per 10 resilience (max +3/turn at 30).
 *
 * Historical rationale: Besieged populations adapted — smuggling, local production
 * (Zenica steelworks ammunition), tunnel construction (Sarajevo), defensive expertise.
 *
 * Deterministic: sorted iteration, pure arithmetic.
 */

import type { FactionId, GameState } from '../../state/game_state.js';
import type { SupplyStateByOsidReport } from '../../state/supply_state_derivation.js';
import { strictCompare } from '../../state/validateGameState.js';

// ── Enclave definitions ─────────────────────────────────────────────────────

interface EnclaveDefinition {
    id: string;
    faction: FactionId;
    /** OSID prefixes that belong to this enclave. */
    osid_prefixes: string[];
}

/**
 * Known enclaves — hard-coded OSID prefix sets.
 * These are areas that historically resisted siege despite supply isolation.
 */
const ENCLAVE_DEFINITIONS: readonly EnclaveDefinition[] = [
    {
        id: 'bihac_pocket',
        faction: 'RBiH',
        osid_prefixes: ['op:bihac:', 'op:cazin:', 'op:velika_kladusa:', 'op:bosanska_krupa:']
    },
    {
        id: 'srebrenica',
        faction: 'RBiH',
        osid_prefixes: ['op:srebrenica:']
    },
    {
        id: 'zepa',
        faction: 'RBiH',
        osid_prefixes: ['op:rogatica:zepa']
    },
    {
        id: 'gorazde',
        faction: 'RBiH',
        osid_prefixes: ['op:gorazde:']
    },
    {
        id: 'sarajevo',
        faction: 'RBiH',
        osid_prefixes: ['op:centar_sarajevo:', 'op:novo_sarajevo:', 'op:stari_grad_sarajevo:', 'op:novi_grad_sarajevo:']
    }
] as const;

/** Maximum resilience value. */
const MAX_RESILIENCE = 30;

/** Resilience growth per turn when enclave is critical supply. */
const RESILIENCE_GROWTH_CRITICAL = 2;

/** Resilience growth per turn when enclave is strained supply. */
const RESILIENCE_GROWTH_STRAINED = 1;

/** Resilience decay per turn when enclave has adequate supply (no longer besieged). */
const RESILIENCE_DECAY_ADEQUATE = -1;

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Check if an OSID belongs to an enclave. */
function osidBelongsToEnclave(osid: string, enclave: EnclaveDefinition): boolean {
    for (const prefix of enclave.osid_prefixes) {
        if (osid.startsWith(prefix)) return true;
    }
    return false;
}

/** Get the supply state of the majority of an enclave's OSIDs for a faction. */
function getEnclaveSupplyState(
    enclave: EnclaveDefinition,
    supplyByOsid: SupplyStateByOsidReport | undefined | null
): 'critical' | 'strained' | 'adequate' {
    if (!supplyByOsid?.factions) return 'adequate';
    const facEntry = supplyByOsid.factions.find(f => f.faction_id === enclave.faction);
    if (!facEntry?.by_osid) return 'adequate';

    let critical = 0;
    let strained = 0;
    let adequate = 0;

    for (const entry of facEntry.by_osid) {
        if (!osidBelongsToEnclave(entry.osid, enclave)) continue;
        if (entry.state === 'critical') critical++;
        else if (entry.state === 'strained') strained++;
        else adequate++;
    }

    const total = critical + strained + adequate;
    if (total === 0) return 'adequate';

    // Majority rule: if most OSIDs are critical, enclave is critical
    if (critical >= strained && critical >= adequate) return 'critical';
    if (strained >= critical && strained >= adequate) return 'strained';
    return 'adequate';
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface EnclaveResilienceReport {
    enclaves_updated: number;
    by_enclave: Record<string, { resilience: number; supply_state: string; delta: number }>;
}

/**
 * Update enclave resilience values based on supply state.
 * Pipeline step: runs after supply-osid derivation.
 * Mutates state.enclave_resilience.
 */
export function updateEnclaveResilience(
    state: GameState,
    supplyByOsid?: SupplyStateByOsidReport | null
): EnclaveResilienceReport {
    const report: EnclaveResilienceReport = { enclaves_updated: 0, by_enclave: {} };

    if (!state.enclave_resilience) {
        (state as GameState & { enclave_resilience: Record<string, number> }).enclave_resilience = {};
    }
    const resilience = state.enclave_resilience!;

    const sortedEnclaves = [...ENCLAVE_DEFINITIONS].sort((a, b) => strictCompare(a.id, b.id));

    for (const enclave of sortedEnclaves) {
        const current = typeof resilience[enclave.id] === 'number' ? resilience[enclave.id]! : 0;
        const supplyState = getEnclaveSupplyState(enclave, supplyByOsid);

        let delta: number;
        switch (supplyState) {
            case 'critical':
                delta = RESILIENCE_GROWTH_CRITICAL;
                break;
            case 'strained':
                delta = RESILIENCE_GROWTH_STRAINED;
                break;
            default:
                delta = RESILIENCE_DECAY_ADEQUATE;
                break;
        }

        const next = Math.max(0, Math.min(MAX_RESILIENCE, current + delta));
        resilience[enclave.id] = next;
        report.enclaves_updated++;
        report.by_enclave[enclave.id] = { resilience: next, supply_state: supplyState, delta };
    }

    return report;
}

/**
 * Get defense bonus multiplier for an OSID based on enclave resilience.
 * Returns 1.0 (no bonus) if OSID is not in an enclave, or 1.0 + resilience × 0.005 (max 1.15).
 * Used in attack_resolution_osid.ts to boost defender power.
 */
export function getEnclaveDefenseBonus(state: GameState, osid: string): number {
    const resilience = state.enclave_resilience;
    if (!resilience) return 1.0;

    for (const enclave of ENCLAVE_DEFINITIONS) {
        if (osidBelongsToEnclave(osid, enclave)) {
            const val = typeof resilience[enclave.id] === 'number' ? resilience[enclave.id]! : 0;
            return 1.0 + val * 0.005; // Max: 1.0 + 30 * 0.005 = 1.15
        }
    }
    return 1.0;
}

/**
 * Get cohesion recovery bonus for a formation at an OSID based on enclave resilience.
 * Returns +1 per 10 resilience (max +3/turn at resilience 30).
 * Used in cohesion_drift.ts to boost enclave formation recovery.
 */
export function getEnclaveCohesionRecovery(state: GameState, osid: string | undefined): number {
    if (!osid) return 0;
    const resilience = state.enclave_resilience;
    if (!resilience) return 0;

    for (const enclave of ENCLAVE_DEFINITIONS) {
        if (osidBelongsToEnclave(osid, enclave)) {
            const val = typeof resilience[enclave.id] === 'number' ? resilience[enclave.id]! : 0;
            return Math.floor(val / 10); // 0, 1, 2, or 3
        }
    }
    return 0;
}
