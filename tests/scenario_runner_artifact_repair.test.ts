import { describe, expect, it } from 'vitest';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { GameState } from '../src/state/game_state.js';
import { repairScenarioArtifactState } from '../src/scenario/scenario_runner.js';

describe('scenario runner artifact repair', () => {
    it('displaces active formations out of enemy-controlled OSIDs before artifact serialization', () => {
        const state = {
            meta: { phase: 'war', turn: 4, seed: 'artifact-repair' },
            political_controllers: {
                'op:enemy:town': 'RS',
                'op:friendly:town': 'RBiH',
            },
            formations: {
                arbih_test: {
                    id: 'arbih_test',
                    faction: 'RBiH',
                    name: 'ARBiH Test Brigade',
                    created_turn: 1,
                    status: 'active',
                    assignment: null,
                    kind: 'brigade',
                    personnel: 900,
                    cohesion: 65,
                    hq_sid: 'S1',
                    location_osid: 'op:enemy:town',
                    posture: 'hold',
                    tags: [],
                },
            },
        } as unknown as GameState;
        const edges: EdgeRecord[] = [
            { a: 'op:enemy:town', b: 'op:friendly:town' },
        ];
        const operationalToCanonical = new Map<string, string[]>([
            ['op:enemy:town', ['sid_enemy']],
            ['op:friendly:town', ['sid_friendly']],
        ]);

        repairScenarioArtifactState(state, edges, operationalToCanonical);

        expect(state.formations.arbih_test.location_osid).toBe('op:friendly:town');
        expect(state.formations.arbih_test.status).toBe('active');
    });
});
