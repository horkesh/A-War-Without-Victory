/**
 * B4 + Phase C: Enclave resilience system.
 *
 * Known enclaves that historically held despite isolation:
 * RBiH: Bihać pocket, Srebrenica, Žepa, Goražde, Sarajevo (1992-1995)
 * HRHB: Kiseljak, Lašva Valley (Vitez/Busovača), Žepče (April 1993 – March 1994)
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
import { ENCLAVE_MAX_PERSONNEL } from '../../state/formation_constants.js';
import { strictCompare } from '../../state/validateGameState.js';

// ── Enclave definitions ─────────────────────────────────────────────────────

interface EnclaveDefinition {
    id: string;
    faction: FactionId;
    /** OSID prefixes that belong to this enclave (municipality-wide enclaves like Bihać, Sarajevo). */
    osid_prefixes?: string[];
    /** Explicit OSID list for enclaves scoped to painted January 1993 territory only.
     *  Takes precedence over osid_prefixes when present. */
    osid_list?: string[];
    /** Turn before which resilience does not grow. Enclaves formed gradually through
     *  1992 as VRS advanced — they weren't "resilient enclaves" from day one. */
    resilience_start_turn?: number;
    /** Initial resilience value at game start. Sarajevo had organized defense from
     *  March 1 1992 (barricades, TDF activation, Patriotic League). */
    initial_resilience?: number;
    /** The OSID that serves as the enclave capital — defenders retreat toward this OSID
     *  and fight to the last here. BB2 p.479: concentric retreat toward Goražde town. */
    capital_osid?: string;
}

/** Multiplier for garrison power at the enclave capital OSID.
 *  The capital concentrates defense — more fighters, better organization. */
export const CAPITAL_GARRISON_MULT = 2.0;

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
        // Painted January 1993 RBiH OSIDs only — not entire municipality
        // Painted January 1993 RBiH OSIDs only — not entire municipality.
        // osmace_2 omitted: VRS captured it before Jan 1993 (painted RS in calibration data).
        osid_list: [
            'op:srebrenica:bostahovine_2', 'op:srebrenica:brezovice_2',
            'op:srebrenica:donji_potocari_2', 'op:srebrenica:mala_daljegosta_2',
            'op:srebrenica:ljeskovik_2',
            'op:srebrenica:luka_2', 'op:srebrenica:milacevici',
            'op:srebrenica:radovcici',
            'op:srebrenica:srebrenica_2', 'op:srebrenica:suceska',
            'op:srebrenica:sulice_2',
        ],
        resilience_start_turn: 16,  // Enclave formed after Drina valley offensive (spring-summer 1992)
        capital_osid: 'op:srebrenica:srebrenica_2',
    },
    {
        id: 'zepa',
        faction: 'RBiH',
        // Single painted RBiH OSID in Žepa area
        osid_list: ['op:rogatica:zepa_2'],
        resilience_start_turn: 16,  // Same timeline as Srebrenica
        capital_osid: 'op:rogatica:zepa_2',
    },
    {
        id: 'gorazde',
        faction: 'RBiH',
        // Painted January 1993 RBiH OSIDs only — not entire municipality (20 total, 16 RBiH)
        osid_list: [
            'op:gorazde:bacci', 'op:gorazde:citluk_2',
            'op:gorazde:faocici_2', 'op:gorazde:gorazde_2',
            'op:gorazde:hrancici',
            'op:gorazde:kola', 'op:gorazde:kolovarice',
            'op:gorazde:mravinjac_2', 'op:gorazde:novakovici',
            'op:gorazde:osjecani_2', 'op:gorazde:semihova_2',
            'op:gorazde:slatina_2', 'op:gorazde:ustipraca_2',
            'op:gorazde:zorlaci', 'op:gorazde:zorovici',
        ],
        resilience_start_turn: 0,   // BB2 p.478: organized TDF defense from April 1992
        initial_resilience: 15,     // ~37k prewar pop; less than Sarajevo but significant
        capital_osid: 'op:gorazde:gorazde_2',
    },
    {
        id: 'sarajevo',
        faction: 'RBiH',
        osid_prefixes: ['op:centar_sarajevo:', 'op:novo_sarajevo:', 'op:stari_grad_sarajevo:', 'op:novi_grad_sarajevo:'],
        resilience_start_turn: 0,   // Sarajevo barricades went up March 1 1992 — defense from day one
        initial_resilience: 20,     // Pre-organized defense: Patriotic League, TDF, barricades, urban terrain knowledge
        capital_osid: 'op:centar_sarajevo:centar_sarajevo',
    },
    // ── HRHB enclaves (Bosniak-Croat conflict, April 1993+) ─────────────────
    // Kiseljak and Vitez/Busovaca pockets formed when ARBiH severed the
    // Fojnica corridor. Žepče was an isolated northern HVO pocket. All three
    // held until the Washington Agreement (March 1994).
    {
        id: 'kiseljak',
        faction: 'HRHB',
        osid_list: [
            'op:kiseljak:azapovici_2',
            'op:kiseljak:brnjaci_2', 'op:kiseljak:gromiljak_2',
            'op:kiseljak:kiseljak_2',
            'op:kresevo:kresevo_2', 'op:kresevo:polje_2',
        ],
        resilience_start_turn: 40,  // Pocket forms after Bosniak-Croat war starts (~April 1993)
        capital_osid: 'op:kiseljak:kiseljak_2',
    },
    {
        id: 'lasva_valley',
        faction: 'HRHB',
        osid_list: [
            'op:vitez:vitez_2',
            'op:busovaca:bare_2', 'op:busovaca:buselji_2',
            'op:busovaca:busovaca_2', 'op:busovaca:polje_2',
            'op:novi_travnik:rankovici_2', 'op:novi_travnik:rat_2',
            'op:novi_travnik:ruda_2',
        ],
        resilience_start_turn: 40,
        capital_osid: 'op:vitez:vitez_2',
    },
    {
        id: 'zepce',
        faction: 'HRHB',
        osid_list: [
            'op:zepce:ozimica_2', 'op:zepce:viniste_2',
            'op:zepce:zepce_2',
        ],
        resilience_start_turn: 40,
        capital_osid: 'op:zepce:zepce_2',
    },
] as const;

/**
 * Per-enclave max resilience and growth rate modifiers.
 * Differentiates enclaves based on historical factors:
 *   - Size, terrain, UN presence, supply corridors, internal organization.
 * Zepa was most vulnerable (smallest, most isolated).
 * Sarajevo was most resilient (largest, tunnel, international attention).
 */
const ENCLAVE_CONFIG: Record<string, { max_resilience: number; growth_mult: number; max_personnel: number }> = {
    bihac_pocket: { max_resilience: 40, growth_mult: 0.55, max_personnel: 1500 },  // Large pocket, supply routes
    srebrenica: { max_resilience: 25, growth_mult: 0.35, max_personnel: 600 },     // Small, isolated, ~8k pop in enclave
    zepa: { max_resilience: 20, growth_mult: 0.30, max_personnel: 400 },           // Tiny, most isolated, ~3k pop
    gorazde: { max_resilience: 35, growth_mult: 0.45, max_personnel: 800 },        // Medium, besieged, ~37k prewar but under siege
    sarajevo: { max_resilience: 45, growth_mult: 0.60, max_personnel: 1500 },      // Largest, tunnel supply, 300k pop
    // HRHB enclaves — smaller, less organized than RBiH equivalents, but held until Washington Agreement
    kiseljak: { max_resilience: 20, growth_mult: 0.30, max_personnel: 500 },      // ~25k Croat pop, isolated, Nikola Subic-Zrinski + Ban Jelacic
    lasva_valley: { max_resilience: 25, growth_mult: 0.35, max_personnel: 700 },  // Vitez/Busovaca, HVO command hub, ~30k Croat pop
    zepce: { max_resilience: 15, growth_mult: 0.25, max_personnel: 400 },         // Smallest, most isolated northern pocket
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

/** Check if an OSID belongs to an enclave. Explicit osid_list takes precedence over prefix matching. */
function osidBelongsToEnclave(osid: string, enclave: EnclaveDefinition): boolean {
    if (enclave.osid_list) {
        return enclave.osid_list.includes(osid);
    }
    if (enclave.osid_prefixes) {
        for (const prefix of enclave.osid_prefixes) {
            if (osid.startsWith(prefix)) return true;
        }
    }
    return false;
}

/**
 * Enclaves known to be besieged from game start.
 * Sarajevo was under siege from April 5 1992 — supply never "adequate".
 * Even when technically connected, the siege created severe supply constraints.
 */
const ALWAYS_BESIEGED_ENCLAVES: ReadonlySet<string> = new Set(['sarajevo', 'gorazde']);

/** Get the supply state of the majority of an enclave's OSIDs for a faction. */
function getEnclaveSupplyState(
    enclave: EnclaveDefinition,
    supplyByOsid: SupplyStateByOsidReport | undefined | null
): 'critical' | 'strained' | 'adequate' {
    if (!supplyByOsid?.factions) {
        // No supply data — besieged enclaves default to strained, others to adequate
        return ALWAYS_BESIEGED_ENCLAVES.has(enclave.id) ? 'strained' : 'adequate';
    }
    const facEntry = supplyByOsid.factions.find(f => f.faction_id === enclave.faction);
    if (!facEntry?.by_osid) {
        return ALWAYS_BESIEGED_ENCLAVES.has(enclave.id) ? 'strained' : 'adequate';
    }

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
    if (total === 0) {
        return ALWAYS_BESIEGED_ENCLAVES.has(enclave.id) ? 'strained' : 'adequate';
    }

    // Majority rule: if most OSIDs are critical, enclave is critical
    if (critical >= strained && critical >= adequate) return 'critical';
    if (strained >= critical && strained >= adequate) return 'strained';

    // Besieged enclaves never read as "adequate" — siege is always at least strained
    if (ALWAYS_BESIEGED_ENCLAVES.has(enclave.id)) return 'strained';
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

    if (!state.political.enclave_resilience) {
        (state as GameState & { enclave_resilience: Record<string, number | EnclaveResilienceEntry> }).political.enclave_resilience = {};
    }
    const resilience = state.political.enclave_resilience!;

    const sortedEnclaves = [...ENCLAVE_DEFINITIONS].sort((a, b) => strictCompare(a.id, b.id));

    const currentTurn = state.meta?.turn ?? 0;

    for (const enclave of sortedEnclaves) {
        let current = readEntry(resilience[enclave.id]);
        // Seed initial resilience on first encounter (turn 1 or when enclave
        // hasn't been tracked yet). Sarajevo had organized defense from day one.
        if (current.resilience === 0 && current.isolation_turns === 0 && enclave.initial_resilience) {
            current = { ...current, resilience: enclave.initial_resilience };
        }
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
 * Base: 1.0 + resilience × 0.02 (at resilience 20: 1.40, at max 45: 1.90).
 * Hardened: × (1.0 + HARDENING_DEFENSE_BONUS) = ×1.05. Max combined: ~2.0.
 * Used in attack_resolution_osid.ts to boost defender power.
 *
 * Historically, Sarajevo's urban terrain + organized defense made it
 * 2-3× harder to assault than open terrain. Goražde's canyon terrain
 * provided similar advantage. The resilience scaling represents not just
 * fortifications but local knowledge, tunnel systems, sniping positions,
 * and determination born from siege.
 */
export function getEnclaveDefenseBonus(state: GameState, osid: string): number {
    const resilience = state.political.enclave_resilience;
    if (!resilience) return 1.0;

    for (const enclave of ENCLAVE_DEFINITIONS) {
        if (osidBelongsToEnclave(osid, enclave)) {
            const entry = readEntry(resilience[enclave.id]);
            const base = 1.0 + entry.resilience * 0.02; // At 20: 1.40, at 45: 1.90
            return entry.hardening_active ? base * (1.0 + HARDENING_DEFENSE_BONUS) : base;
        }
    }
    return 1.0;
}

// ── Enclave garrison constants ──────────────────────────────────────────────

/**
 * Fraction of OSID population that forms the enclave garrison.
 * Represents Patriotic League, TDF, police, Green Berets, and civilian volunteers.
 * Historical: Sarajevo had 30-40k fighters from ~300k population (~10-13%).
 * Other enclaves: lower mobilization rate, smaller but still significant.
 */
const ENCLAVE_GARRISON_MOBILIZATION = 0.05;

/**
 * Effectiveness of garrison fighters relative to regular brigade personnel.
 * Garrison fighters are motivated but poorly equipped/trained.
 * Regular brigade basePower ≈ personnel × 0.5 × exp × cohesion ≈ pers × 0.3.
 * Garrison: pers × GARRISON_EFFECTIVENESS ≈ pers × 0.15.
 */
const GARRISON_EFFECTIVENESS = 0.15;

/**
 * Get enclave garrison defense power for an OSID.
 * Represents organized civilian defense (TDF, Patriotic League, police, volunteers)
 * that fights alongside regular brigades in besieged enclaves.
 *
 * This is ADDED to regular defense — it's not a multiplier but raw power.
 * Scales with:
 *   - OSID population (more people = more defenders)
 *   - Enclave resilience (organized defense improves over siege)
 *   - Urban terrain (buildings, cover, knowledge of terrain)
 *
 * Historical rationale: Sarajevo's defense was never just the 4 brigades
 * of the 1st Corps. Tens of thousands of armed civilians manned barricades,
 * sniping positions, and strongpoints throughout the city. The Patriotic League
 * had ~37,000 members across BiH, concentrated in Sarajevo. TDF had organized
 * units. Police numbered ~3-5k. Even in April 1992, there were 10-15k fighters.
 *
 * @param state - Game state (for enclave resilience data)
 * @param osid - Target OSID being attacked
 * @param osidPopulation - Population of the target OSID
 * @returns Raw defense power from garrison, or 0 if not in an enclave
 */
export function getEnclaveGarrisonPower(
    state: GameState,
    osid: string,
    osidPopulation: number
): number {
    const resilience = state.political.enclave_resilience;

    for (const enclave of ENCLAVE_DEFINITIONS) {
        if (osidBelongsToEnclave(osid, enclave)) {
            const entry = resilience ? readEntry(resilience[enclave.id]) : readEntry(undefined);
            // At resilience 0 (no siege adaptation): garrison still forms but at base effectiveness
            // At resilience 20 (initial Sarajevo): 1.0 + 20*0.02 = 1.4× garrison effectiveness
            // At resilience 45 (max Sarajevo): 1.0 + 45*0.02 = 1.9× garrison effectiveness
            const resilienceMult = 1.0 + entry.resilience * 0.02;
            // Capital OSID gets extra garrison power — defense concentrates at the capital
            const capitalMult = (enclave.capital_osid && osid === enclave.capital_osid)
                ? CAPITAL_GARRISON_MULT : 1.0;
            return osidPopulation * ENCLAVE_GARRISON_MOBILIZATION * GARRISON_EFFECTIVENESS * resilienceMult * capitalMult;
        }
    }
    return 0;
}

/**
 * Get the enclave capital OSID for an OSID if it belongs to an enclave with a capital.
 * Used by retreat logic: retreating brigades in enclaves prefer moving toward the capital.
 * BB2 p.479: beaten units fell back concentrically toward Goražde town.
 */
export function getEnclaveCapitalOsid(osid: string): string | null {
    for (const enclave of ENCLAVE_DEFINITIONS) {
        if (osidBelongsToEnclave(osid, enclave) && enclave.capital_osid) {
            return enclave.capital_osid;
        }
    }
    return null;
}

/**
 * Check if two OSIDs belong to the same enclave.
 * Used by retreat logic: enclave brigades must not retreat outside their pocket.
 */
export function isOsidInSameEnclave(a: string, b: string): boolean {
    for (const enclave of ENCLAVE_DEFINITIONS) {
        if (osidBelongsToEnclave(a, enclave) && osidBelongsToEnclave(b, enclave)) {
            return true;
        }
    }
    return false;
}

/**
 * Check if an OSID is an enclave capital.
 * Defenders at the capital get "last stand" behavior.
 */
export function isEnclaveCapital(osid: string): boolean {
    for (const enclave of ENCLAVE_DEFINITIONS) {
        if (enclave.capital_osid === osid) return true;
    }
    return false;
}

/**
 * Get cohesion recovery bonus for a formation at an OSID based on enclave resilience.
 * Returns +1 per 10 resilience (per-enclave max: +4/turn for Sarajevo at resilience 45).
 * Used in cohesion_drift.ts to boost enclave formation recovery.
 */
export function getEnclaveCohesionRecovery(state: GameState, osid: string | undefined): number {
    if (!osid) return 0;
    const resilience = state.political.enclave_resilience;
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
 * Get per-enclave max personnel cap. Uses ENCLAVE_CONFIG if the enclave is known,
 * falls back to ENCLAVE_MAX_PERSONNEL for unknown enclaves.
 * Used by formation_spawn.ts to differentiate enclave reinforcement caps.
 */
export function getEnclaveMaxPersonnel(enclaveId: string): number {
    return ENCLAVE_CONFIG[enclaveId]?.max_personnel ?? ENCLAVE_MAX_PERSONNEL;
}

/**
 * Map an OSID to its enclave ID, or null if the OSID is not in any enclave.
 * Used by formation_spawn.ts to determine which enclave cap applies.
 */
export function getEnclaveIdForOsid(osid: string): string | null {
    for (const enclave of ENCLAVE_DEFINITIONS) {
        if (osidBelongsToEnclave(osid, enclave)) return enclave.id;
    }
    return null;
}

/**
 * Get max enclave resilience across all enclaves for a faction.
 * Used by exhaustion system: higher enclave resilience reduces exhaustion growth.
 * Only RBiH has enclaves → only RBiH benefits.
 */
export function getMaxEnclaveResilienceForFaction(state: GameState, factionId: FactionId): number {
    const resilience = state.political.enclave_resilience;
    if (!resilience) return 0;

    let max = 0;
    for (const enclave of ENCLAVE_DEFINITIONS) {
        if (enclave.faction !== factionId) continue;
        const val = readResilience(resilience[enclave.id]);
        if (val > max) max = val;
    }
    return max;
}
