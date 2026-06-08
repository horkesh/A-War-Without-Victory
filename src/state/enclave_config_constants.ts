/**
 * Leaf constants module: per-enclave hardening configuration.
 *
 * Single source of truth for each enclave's `max_resilience` ceiling (plus
 * growth-rate and personnel caps). Lives in a dependency-free leaf module so
 * BOTH `src/sim/combat/enclave_resilience.ts` (the resilience-growth owner) and
 * `src/state/enclave_integrity.ts` (the humanitarian-pressure rollup) can import
 * it without forming an import cycle.
 *
 * Differentiates enclaves by historical factors: size, terrain, UN presence,
 * supply corridors, internal organization. Žepa was most vulnerable (smallest,
 * most isolated); Sarajevo most resilient (largest, tunnel, international
 * attention).
 *
 * Deterministic: static data only, no runtime state.
 */
export interface EnclaveConfigEntry {
    max_resilience: number;
    growth_mult: number;
    max_personnel: number;
}

export const ENCLAVE_CONFIG: Record<string, EnclaveConfigEntry> = {
    bihac_pocket: { max_resilience: 40, growth_mult: 0.55, max_personnel: 1500 },  // Large pocket, supply routes
    srebrenica: { max_resilience: 25, growth_mult: 0.35, max_personnel: 600 },     // Small, isolated, ~8k pop in enclave
    zepa: { max_resilience: 20, growth_mult: 0.30, max_personnel: 400 },           // Tiny, most isolated, ~3k pop
    teocak: { max_resilience: 20, growth_mult: 0.30, max_personnel: 400 },         // Lone Bosniak holdout near Ugljevik, ~3–5k pop, 255th Slavna garrison
    gorazde: { max_resilience: 35, growth_mult: 0.45, max_personnel: 800 },        // Medium, besieged, ~37k prewar but under siege
    sarajevo: { max_resilience: 45, growth_mult: 0.60, max_personnel: 1500 },      // Largest, tunnel supply, 300k pop
    // HRHB enclaves — smaller, less organized than RBiH equivalents, but held until Washington Agreement
    kiseljak: { max_resilience: 20, growth_mult: 0.30, max_personnel: 500 },      // ~25k Croat pop, isolated, Nikola Subic-Zrinski + Ban Jelacic
    lasva_valley: { max_resilience: 25, growth_mult: 0.35, max_personnel: 700 },  // Vitez/Busovaca, HVO command hub, ~30k Croat pop
    zepce: { max_resilience: 15, growth_mult: 0.25, max_personnel: 400 },         // Smallest, most isolated northern pocket
};

/**
 * Per-enclave max resilience (the hardening ceiling). Returns
 * DEFAULT_MAX_RESILIENCE (100) for ids not in ENCLAVE_CONFIG, which keeps the
 * legacy `1 - resilience/100` pressure behaviour for unconfigured ids.
 */
export const DEFAULT_MAX_RESILIENCE = 100;
export function getEnclaveMaxResilience(id: string): number {
    const cfg = ENCLAVE_CONFIG[id];
    return cfg && cfg.max_resilience > 0 ? cfg.max_resilience : DEFAULT_MAX_RESILIENCE;
}
