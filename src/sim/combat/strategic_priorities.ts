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

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FactionId } from '../../state/game_state.js';

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

/**
 * Load strategic priorities from the canonical JSON file.
 * Cached after first call. Re-use the same index for every lookup.
 */
export function loadStrategicPriorities(baseDir?: string): StrategicPriorityIndex {
    if (cached) return cached;
    const path = resolve(
        baseDir ?? process.cwd(),
        'data/source/strategic_priorities.json',
    );
    const text = readFileSync(path, 'utf8');
    const raw = JSON.parse(text) as RawJson;
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
