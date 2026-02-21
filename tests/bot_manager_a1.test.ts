import assert from 'node:assert';
import { test } from 'node:test';

import type { FrontEdge } from '../src/map/front_edges.js';
import { BotManager } from '../src/sim/bot/bot_manager.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function makeState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 15, seed: 'bot-test', phase: 'phase_i' },
        factions: [
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        formations: {
            F_R_1: { id: 'F_R_1', faction: 'RBiH', name: 'R1', created_turn: 1, status: 'active', assignment: null },
            F_R_2: { id: 'F_R_2', faction: 'RBiH', name: 'R2', created_turn: 1, status: 'active', assignment: null },
            F_S_1: { id: 'F_S_1', faction: 'RS', name: 'S1', created_turn: 1, status: 'active', assignment: null },
            F_H_1: { id: 'F_H_1', faction: 'HRHB', name: 'H1', created_turn: 1, status: 'active', assignment: null }
        },
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {
            S1__S2: { edge_id: 'S1__S2', value: -10, max_abs: 10, last_updated_turn: 15 },
            S3__S4: { edge_id: 'S3__S4', value: 5, max_abs: 5, last_updated_turn: 15 }
        },
        militia_pools: {},
        political_controllers: { S1: 'RBiH', S2: 'RS', S3: 'RS', S4: 'HRHB' }
    };
}

function clone<T>(x: T): T {
    return JSON.parse(JSON.stringify(x)) as T;
}

const FRONT_EDGES: FrontEdge[] = [
    { edge_id: 'S1__S2', a: 'S1', b: 'S2', side_a: 'RBiH', side_b: 'RS' },
    { edge_id: 'S3__S4', a: 'S3', b: 'S4', side_a: 'RS', side_b: 'HRHB' }
];

test('bot manager decisions are deterministic with same seed and difficulty', () => {
    const stateA = makeState();
    const stateB = clone(makeState());
    const mgrA = new BotManager({ seed: 'same-seed', difficulty: 'medium' });
    const mgrB = new BotManager({ seed: 'same-seed', difficulty: 'medium' });
    const diagA = mgrA.runBots(stateA, FRONT_EDGES);
    const diagB = mgrB.runBots(stateB, FRONT_EDGES);
    assert.deepStrictEqual(stateA.front_posture, stateB.front_posture);
    assert.deepStrictEqual(stateA.formations, stateB.formations);
    assert.deepStrictEqual(diagA, diagB);
    assert.strictEqual(diagA.by_bot.length, 3);
});

test('bot manager difficulty changes posture aggressiveness', () => {
    const easyState = makeState();
    const hardState = clone(makeState());
    const easy = new BotManager({ seed: 'difficulty-seed', difficulty: 'easy' });
    const hard = new BotManager({ seed: 'difficulty-seed', difficulty: 'hard' });
    easy.runBots(easyState, FRONT_EDGES);
    hard.runBots(hardState, FRONT_EDGES);
    const easyPush = Object.values(easyState.front_posture).flatMap((x) => Object.values(x.assignments)).filter((a) => a.posture === 'push').length;
    const hardPush = Object.values(hardState.front_posture).flatMap((x) => Object.values(x.assignments)).filter((a) => a.posture === 'push').length;
    assert.ok(hardPush >= easyPush, 'hard should be at least as aggressive as easy');
});

test('RS adapts from broad 1992 aggression to narrower late-war posture', () => {
    const stateEarly = makeState();
    const stateLate = clone(makeState());
    // Ensure manpower is adequate so this test isolates time adaptation.
    stateEarly.formations['F_S_1']!.personnel = 12000;
    stateEarly.formations['F_S_2'] = { id: 'F_S_2', faction: 'RS', name: 'S2', created_turn: 1, status: 'active', assignment: null, personnel: 12000 };
    stateEarly.formations['F_S_3'] = { id: 'F_S_3', faction: 'RS', name: 'S3', created_turn: 1, status: 'active', assignment: null, personnel: 12000 };
    stateEarly.militia_pools = {
        'pool_rs': { mun_id: 'x', faction: 'RS', available: 12000, committed: 0, exhausted: 0, updated_turn: 15 }
    };
    stateLate.formations = clone(stateEarly.formations);
    stateLate.militia_pools = clone(stateEarly.militia_pools);

    const manyRsEdges: FrontEdge[] = [
        { edge_id: 'S200026__T1', a: 'S200026', b: 'T1', side_a: 'RS', side_b: 'RBiH' },
        { edge_id: 'S216984__T2', a: 'S216984', b: 'T2', side_a: 'RS', side_b: 'RBiH' },
        { edge_id: 'S200891__T3', a: 'S200891', b: 'T3', side_a: 'RS', side_b: 'RBiH' },
        { edge_id: 'A1__B1', a: 'A1', b: 'B1', side_a: 'RS', side_b: 'RBiH' },
        { edge_id: 'A2__B2', a: 'A2', b: 'B2', side_a: 'RS', side_b: 'RBiH' },
        { edge_id: 'A3__B3', a: 'A3', b: 'B3', side_a: 'RS', side_b: 'RBiH' },
        { edge_id: 'A4__B4', a: 'A4', b: 'B4', side_a: 'RS', side_b: 'RBiH' },
        { edge_id: 'A5__B5', a: 'A5', b: 'B5', side_a: 'RS', side_b: 'RBiH' },
        { edge_id: 'A6__B6', a: 'A6', b: 'B6', side_a: 'RS', side_b: 'RBiH' },
        { edge_id: 'A7__B7', a: 'A7', b: 'B7', side_a: 'RS', side_b: 'RBiH' },
        { edge_id: 'A8__B8', a: 'A8', b: 'B8', side_a: 'RS', side_b: 'RBiH' },
        { edge_id: 'A9__B9', a: 'A9', b: 'B9', side_a: 'RS', side_b: 'RBiH' },
        { edge_id: 'A10__B10', a: 'A10', b: 'B10', side_a: 'RS', side_b: 'RBiH' },
        { edge_id: 'A11__B11', a: 'A11', b: 'B11', side_a: 'RS', side_b: 'RBiH' },
        { edge_id: 'A12__B12', a: 'A12', b: 'B12', side_a: 'RS', side_b: 'RBiH' },
        { edge_id: 'A13__B13', a: 'A13', b: 'B13', side_a: 'RS', side_b: 'RBiH' }
    ];

    const earlyManager = new BotManager({ seed: 'adapt-seed', difficulty: 'medium', scenarioStartWeek: 16 });
    const lateManager = new BotManager({ seed: 'adapt-seed', difficulty: 'medium', scenarioStartWeek: 180 });
    earlyManager.runBots(stateEarly, manyRsEdges);
    lateManager.runBots(stateLate, manyRsEdges);

    const rsEarly = stateEarly.front_posture['RS']?.assignments ?? {};
    const rsLate = stateLate.front_posture['RS']?.assignments ?? {};
    const earlyPush = Object.values(rsEarly).filter((a) => a.posture === 'push').length;
    const latePush = Object.values(rsLate).filter((a) => a.posture === 'push').length;
    assert.ok(earlyPush >= latePush, 'early RS should be at least as broadly aggressive as late RS');
    // Planned-operation capability should remain: objective edge should not be pure hold.
    const objectivePosture = rsLate['S200026__T1']?.posture;
    assert.ok(objectivePosture === 'push' || objectivePosture === 'probe', 'late RS should preserve planned-op posture on objective edge');
});
