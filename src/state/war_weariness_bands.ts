/**
 * War-weariness FEEL-band thresholds + derivation — BROWSER-SAFE shared module.
 *
 * SINGLE SOURCE OF TRUTH for the war-weariness band cuts, shared by:
 *   - the UI read-model        (src/ui/map/data/warWeariness.ts)
 *   - the sim-side recorder     (src/state/exhaustion.ts → recordWarWearinessBandCrossings)
 *
 * BOUNDARY (why this file exists): the UI tactical-map bundle (vite/rollup) must
 * not transitively import any Node-only module. `state/exhaustion.ts` imports
 * `game_state.ts`, which transitively pulls in `data/municipality_population.ts`
 * (uses `node:fs/promises` + `node:path`) — so a UI module importing the band
 * constants *from* `state/exhaustion.ts` dragged Node code into the browser
 * bundle and broke `npm run desktop:map:build`. These constants + the pure
 * derivation are extracted here with ZERO Node imports and ZERO runtime imports
 * from `game_state.ts`, so both sides can depend on this leaf module without a
 * Node edge. (Codex #402.)
 *
 * Determinism: pure constants + a pure function of a single numeric input.
 * No RNG, no clock, no fs.
 */

/**
 * War-weariness FEEL bands that warrant a Chronicle beat (steady is the baseline
 * and never recorded). Ordered lowest → highest. Re-exported as the canonical
 * `WarWearinessBand` type from game_state.ts so the state layer keeps its alias
 * without importing the UI layer.
 */
export type WarWearinessBand = 'strained' | 'cracking' | 'collapsing';

/**
 * CANONICAL war-weariness FEEL-band thresholds, on the recovered 0..100
 * exhaustion scale (`war_exhaustion / 100`). A faction is "at" a band when its
 * recovered level is >= that band's floor. These are narrative cuts, NOT the
 * engine's collapse-eligibility gates (those live in phase3c, unchanged).
 *
 *   - steady     [0, 40)   — early-war; fighting but not yet ground down
 *   - strained   [40, 65)  — the war is biting; manpower and will under load
 *   - cracking   [65, 85)  — late-war exhaustion plateau; will-to-fight fraying
 *   - collapsing [85, ∞)   — spent; running on empty (1995 texture for all sides)
 */
export const WAR_WEARINESS_BAND_THRESHOLDS: Readonly<Record<WarWearinessBand, number>> = {
    strained: 40,
    cracking: 65,
    collapsing: 85,
} as const;

/** Ordered FEEL bands, lowest → highest (steady excluded — it warrants no beat). */
export const WAR_WEARINESS_BANDS_ASCENDING: readonly WarWearinessBand[] = [
    'strained',
    'cracking',
    'collapsing',
];

/** Recover the 0..100 exhaustion level from the raw 0..10000 accumulator (clamped). */
export function recoveredExhaustionLevel(rawExhaustion: number): number {
    if (!Number.isFinite(rawExhaustion)) return 0;
    const scaled = rawExhaustion / 100;
    if (scaled < 0) return 0;
    if (scaled > 100) return 100;
    return scaled;
}

/**
 * Map a raw war_exhaustion accumulator value (0..10000 scale) to its highest
 * crossed FEEL band, or null when still steady (below the strained floor).
 * Deterministic, pure.
 */
export function warWearinessBandForExhaustion(rawExhaustion: number): WarWearinessBand | null {
    const level = recoveredExhaustionLevel(rawExhaustion);
    if (level >= WAR_WEARINESS_BAND_THRESHOLDS.collapsing) return 'collapsing';
    if (level >= WAR_WEARINESS_BAND_THRESHOLDS.cracking) return 'cracking';
    if (level >= WAR_WEARINESS_BAND_THRESHOLDS.strained) return 'strained';
    return null;
}
