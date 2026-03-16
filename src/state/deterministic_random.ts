/**
 * Deterministic random utilities for AWWV simulation.
 * No standard RNG — all outputs are replay-safe and seed-driven.
 */

/**
 * djb2 hash: string -> unsigned 32-bit integer.
 * Deterministic, fast, adequate distribution for game simulation use.
 */
export function djb2Hash(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
    }
    return hash >>> 0; // unsigned
}

/**
 * Deterministic pseudo-random number in [0, 1) from a seed and context string.
 * Same (seed, context) always produces the same output. Replay-safe.
 */
export function deterministicRandom(seed: string, context: string): number {
    const hash = djb2Hash(`${seed}:${context}`);
    return (hash % 10000) / 10000;
}

/**
 * Deterministic integer in [min, max] (inclusive) from seed + context.
 */
export function deterministicInt(seed: string, context: string, min: number, max: number): number {
    const hash = djb2Hash(`${seed}:${context}`);
    return min + (hash % (max - min + 1));
}

/**
 * Deterministic pick from an array.
 */
export function deterministicPick<T>(seed: string, context: string, items: readonly T[]): T {
    if (items.length === 0) throw new Error('deterministicPick: empty array');
    const idx = djb2Hash(`${seed}:${context}`) % items.length;
    return items[idx];
}
