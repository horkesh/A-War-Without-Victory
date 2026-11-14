/** Node-only filesystem boundary for the corps commander schedule (tooling and tests). */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { validateCorpsCoRoster, type CorpsCoRoster } from './corps_co_roster.js';

let rosterCache: CorpsCoRoster | null = null;
let rosterCacheKey: string | null = null;

/**
 * Load and validate a corps commander schedule from disk. Returns null when the file is
 * absent (the mechanism is then inert); throws CorpsCoRosterDataError when it is present
 * but malformed. Optional reference sets check officer and corps ids.
 */
export function loadCorpsCoRoster(
    path?: string,
    refs?: { officerIds?: ReadonlySet<string>; corpsIds?: ReadonlySet<string> },
): CorpsCoRoster | null {
    const resolvedPath = resolve(path ?? 'data/scenarios/corps_co_roster.json');
    if (!refs && rosterCache && rosterCacheKey === resolvedPath) return rosterCache;
    let raw: string;
    try {
        raw = readFileSync(resolvedPath, 'utf8');
    } catch {
        return null;
    }
    const roster = validateCorpsCoRoster(JSON.parse(raw), refs);
    if (!refs) {
        rosterCache = roster;
        rosterCacheKey = resolvedPath;
    }
    return roster;
}

export function _resetCorpsCoRosterCache(): void {
    rosterCache = null;
    rosterCacheKey = null;
}
