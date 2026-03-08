/**
 * B4 + Phase C: Enclave resilience system.
 *
 * Known enclaves that historically held despite isolation:
 * - Bihać pocket (5th Corps, 1992-1995)
 * - Srebrenica (1993-1995, fell July 1995)
 * - Žepa (1993-1995, fell July 1995)
 * - Goražde (1992-1995, never fell)
 * - Sarajevo (besieged 1992-1996, never fell)
 *
 * Mechanics:
 * - Resilience value [0, MAX_ENCLAVE_RESILIENCE] per enclave, grows under isolation, decays under adequate supply.
 * - Defense bonus: 1.0 + resilience × 0.005 (max 1.15 = +15% at 30). Hardened: × (1 + HARDENING_DEFENSE_BONUS).
 * - Cohesion recovery: +1/turn per 10 resilience (max +3/turn at 30).
 * - Hardening: after HARDENING_THRESHOLD consecutive isolation turns, defense bonus boosted.
 * - Exhaustion reduction: up to MAX_ENCLAVE_RESILIENCE × RESILIENCE_EFFECT_SCALE (30%) for faction with enclaves.
 *
 * Historical rationale: Besieged populations adapted — smuggling, local production
 * (Zenica steelworks ammunition), tunnel construction (Sarajevo), defensive expertise.
 *
 * Deterministic: sorted iteration, pure arithmetic.
 */

import type { EnclaveResilienceEntry, FactionId, GameState } from '../../state/game_state.js';
import type { SupplyStateByOsidReport } from '../../state/supply_state_derivation.js';
import {
    HARDENING_DEFENSE_BONUS,
    HARDENING_THRESHOLD,
    MAX_ENCLAVE_RESILIENCE,
    RESILIENCE_DECAY_ADEQUATE,
    RESILIENCE_GROWTH_CRITICAL,
    RESILIENCE_GROWTH_STRAINED,
} from '../../state/supply_reserve_constants.js';
import { strictCompare } from '../../state/validateGameState.js';

// ── Enclave definitions ─────────────────────────────────────────────────────

interface EnclaveDefinition {
    id: string;
    faction: FactionId;
    /** OSID prefixes that belong to this enclave. */
    osid_prefixes: string[];
    /** Turn before which resilience does not grow. Enclaves formed gradually through
     *  1992 as VRS advanced — they weren't "resilient enclaves" from day one. */
    resilience_start_turn?: number;
}

/**
 * Known enclaves — hard-coded OSID prefix sets.
 * These are areas that historically resisted siege despite supply isolation.
 */
const ENCLAVE_DEFINITIONS: readonly EnclaveDefinition[] = [
    {
        id: 'bihac_pocket',
        faction: 'RBiH',
        osid_prefixes: ['op:bihac:', 'op:cazin:', 'op:velika_kladusa:', 'op:bosanska_krupa:'],
        resilience_start_turn: 20,  // Pocket crystallized after initial VRS Krajina offensive
    },
    {
        id: 'srebrenica',
        faction: 'RBiH',
        osid_prefixes: ['op:srebrenica:'],
        resilience_start_turn: 16,  // Enclave formed after Drina valley offensive (spring-summer 1992)
    },
    {
        id: 'zepa',
        faction: 'RBiH',
        osid_prefixes: ['op:rogatica:zepa'],
        resilience_start_turn: 16,  // Same timeline as Srebrenica
    },
    {
        id: 'gorazde',
        faction: 'RBiH',
        osid_prefixes: ['op:gorazde:'],
        resilience_start_turn: 16,  // Goražde enclave formed mid-1992
    },
    {
        id: 'sarajevo',
        faction: 'RBiH',
        osid_prefixes: ['op:centar_sarajevo:', 'op:novo_sarajevo:', 'op:stari_grad_sarajevo:', 'op:novi_grad_sarajevo:'],
        resilience_start_turn: 8,   // Siege began immediately but resilience adaptation takes time
    }
] as const;

/**
 * Per-enclave max resilience and growth rate modifiers.
 * Differentiates enclaves based on historical factors:
 *   - Size, terrain, UN presence, supply corridors, internal organization.
 * Zepa was most vulnerable (smallest, most isolated).
 * Sarajevo was most resilient (largest, tunnel, international attention).
 */
const ENCLAVE_CONFIG: Record<string, { max_resilience: number; growth_mult: number }> = {
    bihac_pocket: { max_resilience: 40, growth_mult: 0.55 },   // was 1.2 — maxes ~w93 (full war), ~18 at w40
    srebrenica: { max_resilience: 25, growth_mult: 0.35 },     // was 0.8 — maxes ~w52, ~17 at w40
    zepa: { max_resilience: 20, growth_mult: 0.30 },           // was 0.7 — maxes ~w49, ~14 at w40
    gorazde: { max_resilience: 35, growth_mult: 0.45 },        // was 1.0 — maxes ~w55, ~22 at w40
    sarajevo: { max_resilience: 45, growth_mult: 0.60 },       // was 1.3 — maxes ~w45, ~38 at w40
};

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Extract resilience number from a bare number or structured EnclaveResilienceEntry. */
export function readResilience(entry: number | EnclaveResilienceEntry | undefined): number {
    if (entry === undefined) return 0;
    if (typeof entry === 'number') return entry;
    return entry.resilience;
}

/** Extract full structured entry, migrating bare number if needed. */
function readEntry(entry: number | EnclaveResilienceEntry | undefined): EnclaveResilienceEntry {
    if (entry === undefined) return { resilience: 0, isolation_turns: 0, hardening_active: false };
    if (typeof entry === 'number') return { resilience: entry, isolation_turns: 0, hardening_active: false };
    return entry;
}

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
    by_enclave: Record<string, {
        resilience: number;
        supply_state: string;
        delta: number;
        isolation_turns: number;
        hardening_active: boolean;
    }>;
}

/**
 * Update enclave resilience values based on supply state.
 * Pipeline step: runs after supply-osid derivation.
 * Mutates state.enclave_resilience. Stores EnclaveResilienceEntry per enclave.
 */
export function updateEnclaveResilience(
    state: GameState,
    supplyByOsid?: SupplyStateByOsidReport | null
): EnclaveResilienceReport {
    const report: EnclaveResilienceReport = { enclaves_updated: 0, by_enclave: {} };

    if (!state.enclave_resilience) {
        (state as GameState & { enclave_resilience: Record<string, number | EnclaveResilienceEntry> }).enclave_resilience = {};
    }
    const resilience = state.enclave_resilience!;

    const sortedEnclaves = [...ENCLAVE_DEFINITIONS].sort((a, b) => strictCompare(a.id, b.id));

    const currentTurn = state.meta?.turn ?? 0;

    for (const enclave of sortedEnclaves) {
        const current = readEntry(resilience[enclave.id]);
        const supplyState = getEnclaveSupplyState(enclave, supplyByOsid);

        // Resilience doesn't grow before the enclave historically formed
        const tooEarly = enclave.resilience_start_turn != null && currentTurn < enclave.resilience_start_turn;

        let delta: number;
        let isolated: boolean;
        switch (supplyState) {
            case 'critical':
                delta = tooEarly ? 0 : RESILIENCE_GROWTH_CRITICAL;
                isolated = !tooEarly;
                break;
            case 'strained':
                delta = tooEarly ? 0 : RESILIENCE_GROWTH_STRAINED;
                isolated = !tooEarly;
                break;
            default:
                delta = -RESILIENCE_DECAY_ADEQUATE;
                isolated = false;
                break;
        }

        const config = ENCLAVE_CONFIG[enclave.id];
        const maxResilience = config?.max_resilience ?? MAX_ENCLAVE_RESILIENCE;
        const growthMult = config?.growth_mult ?? 1.0;
        const scaledDelta = delta > 0 ? delta * growthMult : delta;  // Only scale growth, not decay
        const nextResilience = Math.max(0, Math.min(maxResilience, current.resilience + scaledDelta));
        const nextIsolation = isolated ? current.isolation_turns + 1 : 0;
        const nextHardening = nextIsolation >= HARDENING_THRESHOLD;

        const entry: EnclaveResilienceEntry = {
            resilience: nextResilience,
            isolation_turns: nextIsolation,
            hardening_active: nextHardening,
        };
        resilience[enclave.id] = entry;
        report.enclaves_updated++;
        report.by_enclave[enclave.id] = {
            resilience: nextResilience,
            supply_state: supplyState,
            delta,
            isolation_turns: nextIsolation,
            hardening_active: nextHardening,
        };
    }

    return report;
}

/**
 * Get defense bonus multiplier for an OSID based on enclave resilience.
 * Base: 1.0 + resilience × 0.005 (max 1.15 at 30).
 * Hardened: × (1.0 + HARDENING_DEFENSE_BONUS) = ×1.05. Max combined: 1.2075.
 * Used in attack_resolution_osid.ts to boost defender power.
 */
export function getEnclaveDefenseBonus(state: GameState, osid: string): number {
    const resilience = state.enclave_resilience;
    if (!resilience) return 1.0;

    for (const enclave of ENCLAVE_DEFINITIONS) {
        if (osidBelongsToEnclave(osid, enclave)) {
            const entry = readEntry(resilience[enclave.id]);
            const base = 1.0 + entry.resilience * 0.005; // Per-enclave max: Sarajevo 1.225, Bihac 1.20, Gorazde 1.175
            return entry.hardening_active ? base * (1.0 + HARDENING_DEFENSE_BONUS) : base;
        }
    }
    return 1.0;
}

/**
 * Get cohesion recovery bonus for a formation at an OSID based on enclave resilience.
 * Returns +1 per 10 resilience (per-enclave max: +4/turn for Sarajevo at resilience 45).
 * Used in cohesion_drift.ts to boost enclave formation recovery.
 */
export function getEnclaveCohesionRecovery(state: GameState, osid: string | undefined): number {
    if (!osid) return 0;
    const resilience = state.enclave_resilience;
    if (!resilience) return 0;

    for (const enclave of ENCLAVE_DEFINITIONS) {
        if (osidBelongsToEnclave(osid, enclave)) {
            const val = readResilience(resilience[enclave.id]);
            return Math.floor(val / 10); // 0, 1, 2, or 3
        }
    }
    return 0;
}

/**
 * Get max enclave resilience across all enclaves for a faction.
 * Used by exhaustion system: higher enclave resilience reduces exhaustion growth.
 * Only RBiH has enclaves → only RBiH benefits.
 */
export function getMaxEnclaveResilienceForFaction(state: GameState, factionId: FactionId): number {
    const resilience = state.enclave_resilience;
    if (!resilience) return 0;

    let max = 0;
    for (const enclave of ENCLAVE_DEFINITIONS) {
        if (enclave.faction !== factionId) continue;
        const val = readResilience(resilience[enclave.id]);
        if (val > max) max = val;
    }
    return max;
}
