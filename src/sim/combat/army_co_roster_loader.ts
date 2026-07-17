/** Node-only filesystem boundary for Army CO roster tooling and tests. */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { GameState } from '../../state/game_state.js';
import {
    applyArmyCoRosterStep as applyInjectedArmyCoRosterStep,
    type ArmyCoRoster,
} from './army_co_lifecycle.js';

let rosterCache: ArmyCoRoster | null = null;
let rosterCacheKey: string | null = null;

/** Load a roster from disk for Node tools and tests. */
export function loadArmyCoRoster(path?: string): ArmyCoRoster | null {
    const resolvedPath = resolve(path ?? 'data/scenarios/army_co_roster.json');
    if (rosterCache && rosterCacheKey === resolvedPath) return rosterCache;

    try {
        const parsed = JSON.parse(readFileSync(resolvedPath, 'utf8')) as ArmyCoRoster;
        if (!parsed?.rosters || !parsed.variation_rules) return null;
        rosterCache = parsed;
        rosterCacheKey = resolvedPath;
        return parsed;
    } catch {
        return null;
    }
}

export function _resetArmyCoRosterCache(): void {
    rosterCache = null;
    rosterCacheKey = null;
}

/** Node-only compatibility entry point used by headless A/B tooling. */
export function applyArmyCoRosterStep(state: GameState): void {
    const roster = loadArmyCoRoster();
    if (!roster) return;
    applyInjectedArmyCoRosterStep(
        state,
        roster,
        process.env.A4_ARMY_CO_ROSTER_DISABLED === 'true',
    );
}
