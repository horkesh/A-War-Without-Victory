/**
 * Node-only disk loader for strategic priorities (E-B4).
 *
 * Splits the `node:fs` / `node:path` dependency out of `strategic_priorities.ts`
 * so the latter stays browser-safe — `combat_math.ts` (browser-bundled via the
 * tactical map) imports `getOsidPriority` for the Fall-1995 E-B1 periphery
 * consumer, and the browser-safe import test forbids node builtins in that
 * bundle (tests/ui_map_browser_safe_imports.test.ts).
 *
 * Importing this module (side-effect) on the NODE side registers the disk
 * loader with `strategic_priorities.ts`; the canonical JSON is then read on the
 * first `loadStrategicPriorities()` call exactly as before. Browser bundles
 * never import this module, so the public lookup falls back to the conservative
 * 'periphery' default.
 *
 * Determinism: pure JSON read, no randomness, no timestamps (unchanged).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { _registerStrategicPrioritiesDiskLoader } from './strategic_priorities.js';

interface RawJson {
    schema_version: number;
    description?: string;
    by_faction: Record<string, {
        core?: string[];
        corridor?: string[];
        periphery?: string[];
    }>;
}

_registerStrategicPrioritiesDiskLoader((baseDir?: string): RawJson => {
    const path = resolve(
        baseDir ?? process.cwd(),
        'data/source/strategic_priorities.json',
    );
    const text = readFileSync(path, 'utf8');
    return JSON.parse(text) as RawJson;
});
