/**
 * strategic_priorities.json must be read from the turn's data root (TurnInput.dataBaseDir),
 * not from the process cwd. Before this, getOsidPriority() always called the loader without a
 * base dir, so any run started outside the repo root (e.g. an ai_play script from another folder)
 * failed with ENOENT '<cwd>/data/source/strategic_priorities.json'.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import type { GameState } from '../src/state/game_state.js';
import {
    _setStrategicPrioritiesForTesting,
    getOsidPriority,
} from '../src/sim/combat/strategic_priorities.js';
import { reinforceFromStrategicReserves } from '../src/sim/combat/strategic_reserve.js';

const PROBE_OSID = 'op:base_dir_probe:probe';
const tempRoots: string[] = [];

function dataRootMarkingProbeCore(): string {
    const root = mkdtempSync(join(tmpdir(), 'awwv-priorities-'));
    tempRoots.push(root);
    mkdirSync(join(root, 'data', 'source'), { recursive: true });
    writeFileSync(join(root, 'data', 'source', 'strategic_priorities.json'), JSON.stringify({
        schema_version: 1,
        by_faction: { RBiH: { core: [PROBE_OSID], corridor: [], periphery: ['__default__'] } },
    }));
    return root;
}

afterEach(() => {
    _setStrategicPrioritiesForTesting(null);
    for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('strategic priorities data root', () => {
    it('reads the file under the given base dir, not the cwd', () => {
        // Positive control: the repo's own file (cwd = repo root under vitest) does not list the probe.
        _setStrategicPrioritiesForTesting(null);
        expect(getOsidPriority(PROBE_OSID, 'RBiH')).toBe('periphery');

        _setStrategicPrioritiesForTesting(null);
        expect(getOsidPriority(PROBE_OSID, 'RBiH', dataRootMarkingProbeCore())).toBe('core');
    });

    it('reinforceFromStrategicReserves forwards its base dir to the loader', () => {
        const missingRoot = join(tmpdir(), 'awwv-priorities-missing-root-does-not-exist');
        const state = {
            meta: { turn: 30, phase: 'war' },
            military: {
                strategic_reserves: { RBiH: 100 },
                formations: {
                    a: { id: 'a', faction: 'RBiH', kind: 'brigade', status: 'active', location_osid: 'op:x:x' },
                    b: { id: 'b', faction: 'RBiH', kind: 'brigade', status: 'active', location_osid: 'op:y:y' },
                },
            },
        } as unknown as GameState;

        _setStrategicPrioritiesForTesting(null);
        expect(() => reinforceFromStrategicReserves(state, missingRoot)).toThrow(missingRoot);
    });
});
