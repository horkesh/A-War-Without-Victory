import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import { loadOperationalData } from '../src/data/operational_data.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { GameState } from '../src/state/game_state.js';
import { repairScenarioArtifactState, runScenario } from '../src/scenario/scenario_runner.js';

const SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'apr1992_definitive_188w.json');
const RETAINED_OUTPUT_ROOT = process.env.AWWV_SCENARIO_OSID_REPAIR_TEST_OUTPUT_ROOT;

describe('scenario runner artifact repair', () => {
    it('displaces active formations out of enemy-controlled OSIDs before artifact serialization', () => {
        const state = {
  meta: { phase: 'war', turn: 4, seed: 'artifact-repair' },
  military: {
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
            }
  } as any,
  political: {
    political_controllers: {
                'op:enemy:town': 'RS',
                'op:friendly:town': 'RBiH',
            }
  } as any,
} as unknown as GameState;
        const edges: EdgeRecord[] = [
            { a: 'op:enemy:town', b: 'op:friendly:town' },
        ];
        const operationalToCanonical = new Map<string, string[]>([
            ['op:enemy:town', ['sid_enemy']],
            ['op:friendly:town', ['sid_friendly']],
        ]);

        repairScenarioArtifactState(state, edges, operationalToCanonical);

        expect(state.military.formations.arbih_test.location_osid).toBe('op:friendly:town');
        expect(state.military.formations.arbih_test.status).toBe('active');
        expect(state.military.war_front_edges_osid).toEqual([
            {
                edge_id: 'op:enemy:town__op:friendly:town',
                a: 'op:enemy:town',
                b: 'op:friendly:town',
                side_a: 'RS',
                side_b: 'RBiH',
            },
        ]);
    });

    it('preserves operational front and HVO sector truth at the real one-week artifact boundary', async () => {
        const ownedOutDir = RETAINED_OUTPUT_ROOT
            ?? await mkdtemp(join(tmpdir(), 'awwv-scenario-osid-repair-'));
        const shouldCleanup = RETAINED_OUTPUT_ROOT === undefined;
        let observedState: GameState | undefined;

        try {
            const operationalData = await loadOperationalData(process.cwd());
            const result = await runScenario({
                scenarioPath: SCENARIO_PATH,
                outDirOverride: ownedOutDir,
                weeksOverride: 1,
                emitSaveAtWeeks: [1],
                consoleDiagnostics: false,
                diagnosticTurnBoundaryObserver: ({ state }) => {
                    observedState = state;
                },
            });
            const weeklySavePath = result.paths.weekly_saves?.[0];
            expect(weeklySavePath).toBeDefined();
            expect(observedState).toBeDefined();
            const weeklySave = JSON.parse(await readFile(weeklySavePath!, 'utf8')) as GameState;

            for (const state of [observedState!, weeklySave]) {
                expect(state.military.war_front_edges_osid?.length).toBeGreaterThan(0);
                for (const edge of state.military.war_front_edges_osid ?? []) {
                    expect(operationalData.operationalToCanonical.has(edge.a)).toBe(true);
                    expect(operationalData.operationalToCanonical.has(edge.b)).toBe(true);
                }
                expect(Object.keys(state.military.corps_front_sectors ?? {}).length).toBeGreaterThan(0);
                const sector = state.military.corps_front_sectors?.['sector:hvo_southeast_herzegovina:0'];
                expect(sector).toBeDefined();
                for (const formationId of ['hv_113th_brigade_tg', 'hv_4th_guards_tg']) {
                    expect(state.military.formations[formationId]?.assignment?.sector_id)
                        .toBe('sector:hvo_southeast_herzegovina:0');
                    expect(sector?.assigned_brigade_ids).toContain(formationId);
                }
            }
        } finally {
            if (shouldCleanup && existsSync(ownedOutDir)) {
                await rm(ownedOutDir, { recursive: true, force: true });
            }
        }
    }, 120_000);
});
