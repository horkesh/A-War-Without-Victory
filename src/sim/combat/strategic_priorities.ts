/**
 * Strategic priority tiering (synthesis §3 E-B4).
 *
 * Each OSID has a per-faction priority in {core, corridor, periphery}.
 * Used by:
 *   - combat_math.computeDefenderPowerBreakdown: periphery + low-coherence
 *     defender gets ×0.80 power penalty (abandoned-periphery effect).
 *   - strategic_reserve.reinforceFromStrategicReserves: priority-aware
 *     allocation order (core > corridor > periphery).
 *
 * Canonical source: data/source/strategic_priorities.json (schema_version 1).
 * "__default__" sentinel inside `periphery` means: any OSID not explicitly
 * listed as core/corridor for that faction is treated as periphery.
 *
 * Determinism: pure JSON read, no randomness, no timestamps. Cached on first
 * load and re-used for all subsequent lookups.
 *
 * CANONICAL OWNERSHIP: this module is the SINGLE source of priority
 * classification at runtime. Do not duplicate the lookup logic elsewhere.
 */

import type { FactionId } from '../../state/game_state.js';

// Browser-safety: `combat_math.ts` (browser-bundled via the tactical map) now
// imports getOsidPriority for the Fall-1995 E-B1 periphery consumer. A static
// `import ... from 'node:fs'` here would pull node builtins into the browser
// bundle (tests/ui_map_browser_safe_imports.test.ts). The disk read lives in
// the node-only loader `strategic_priorities_node.ts`; this module is browser-
// safe and only does cache lookups. On the node engine side the cache is seeded
// by `loadStrategicPriorities()` (which lazily pulls in the node loader); in the
// browser the cache is either seeded via `_setStrategicPrioritiesForTesting` or
// absent, in which case lookups return the conservative 'periphery' default.
//
// Lazy node-loader resolution: a function-scoped `await import()` would break the
// synchronous combat hot path, so the node loader is required indirectly via
// createRequire-free `globalThis`-guarded dynamic access. We expose a setter the
// node loader calls at module-eval time so the sync read stays a pure cache hit.
type StrategicPrioritiesDiskLoader = (baseDir?: string) => RawJson;
let diskLoader: StrategicPrioritiesDiskLoader | null = null;

/**
 * Node-only: register the disk loader. Called by `strategic_priorities_node.ts`
 * (imported only from node entrypoints). Browser bundles never import that
 * module, so `diskLoader` stays null and lookups use the conservative default.
 */
export function _registerStrategicPrioritiesDiskLoader(
    loader: StrategicPrioritiesDiskLoader,
): void {
    diskLoader = loader;
}

export type StrategicPriority = 'core' | 'corridor' | 'periphery';

interface FactionPriorities {
    core: ReadonlySet<string>;
    corridor: ReadonlySet<string>;
    /** True if this faction uses __default__ -> periphery (i.e. unlisted = periphery). */
    defaultsToPeriphery: boolean;
    /** Explicitly-listed periphery OSIDs (typically empty when __default__ is used). */
    explicitPeriphery: ReadonlySet<string>;
}

export interface StrategicPriorityIndex {
    /** Per-faction lookup sets. */
    readonly byFaction: ReadonlyMap<FactionId, FactionPriorities>;
}

interface RawJson {
    schema_version: number;
    description?: string;
    by_faction: Record<string, {
        core?: string[];
        corridor?: string[];
        periphery?: string[];
    }>;
}

/** Cached singleton — one load per process. */
let cached: StrategicPriorityIndex | null = null;
/** Allow tests / browser to seed the cache without file I/O. */
let cachedRawForReload: RawJson | null = null;

/** Empty index — the conservative fallback (every lookup → 'periphery'). */
const EMPTY_INDEX: StrategicPriorityIndex = { byFaction: new Map() };

/**
 * Load strategic priorities from the canonical JSON file.
 * Cached after first call. Re-use the same index for every lookup.
 *
 * The disk read lives in the node-only loader (`strategic_priorities_node.ts`),
 * registered via `_registerStrategicPrioritiesDiskLoader`. Node entrypoints
 * import that loader (directly or transitively) so `diskLoader` is set before
 * first use. In the browser the loader is never imported (keeping this module
 * free of `node:fs`), so we return the EMPTY_INDEX — every lookup falls back to
 * the conservative 'periphery' classification, identical to the prior
 * "unknown faction / unlisted OSID → periphery" semantics.
 */
export function loadStrategicPriorities(baseDir?: string): StrategicPriorityIndex {
    if (cached) return cached;
    if (!diskLoader) return EMPTY_INDEX; // browser / loader not registered
    const raw = diskLoader(baseDir);
    cached = buildIndex(raw);
    cachedRawForReload = raw;
    return cached;
}

/**
 * Test / programmatic seed: install a priority index without reading JSON.
 * Use only from tests. Pass `null` to clear the cache so the next
 * `loadStrategicPriorities()` re-reads from disk.
 */
export function _setStrategicPrioritiesForTesting(raw: RawJson | null): void {
    if (raw === null) {
        cached = null;
        cachedRawForReload = null;
        return;
    }
    cached = buildIndex(raw);
    cachedRawForReload = raw;
}

function buildIndex(raw: RawJson): StrategicPriorityIndex {
    const byFaction = new Map<FactionId, FactionPriorities>();
    const factionKeys = Object.keys(raw.by_faction).sort();
    for (const faction of factionKeys) {
        const entry = raw.by_faction[faction]!;
        const core = new Set<string>(entry.core ?? []);
        const corridor = new Set<string>(entry.corridor ?? []);
        const peripheryList = entry.periphery ?? [];
        const defaultsToPeriphery = peripheryList.includes('__default__');
        const explicitPeriphery = new Set<string>(
            peripheryList.filter(x => x !== '__default__'),
        );
        byFaction.set(faction, {
            core,
            corridor,
            defaultsToPeriphery,
            explicitPeriphery,
        });
    }
    return { byFaction };
}

/**
 * Look up the priority class for an OSID from the perspective of a faction.
 * Returns 'periphery' for unknown factions or unlisted OSIDs (the most
 * conservative classification — no reserve bias, no abandoned-periphery
 * penalty inversion).
 */
export function getOsidPriority(osid: string, faction: FactionId): StrategicPriority {
    const idx = loadStrategicPriorities();
    const entry = idx.byFaction.get(faction);
    if (!entry) return 'periphery';
    if (entry.core.has(osid)) return 'core';
    if (entry.corridor.has(osid)) return 'corridor';
    if (entry.explicitPeriphery.has(osid)) return 'periphery';
    return entry.defaultsToPeriphery ? 'periphery' : 'periphery';
}

/**
 * Numeric ordering helper for reserve allocation: lower = higher priority.
 * core=0, corridor=1, periphery=2. Stable sort key.
 */
export function priorityRank(p: StrategicPriority): number {
    switch (p) {
        case 'core': return 0;
        case 'corridor': return 1;
        case 'periphery': return 2;
    }
}

// Acknowledge the unused raw-keep ref to avoid TS6133 in strict builds.
export function _debugLastRaw(): RawJson | null {
    return cachedRawForReload;
}
