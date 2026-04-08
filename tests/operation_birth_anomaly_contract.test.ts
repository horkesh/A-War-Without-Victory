import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { GameState } from '../src/state/game_state.js';
import { runAnomalyDetection } from '../src/scenario/anomaly_detector.js';

describe('operation birth anomaly contract', () => {
    it('does not classify planning-aborted operations as zero-eligible execution failures', () => {
        const state = {
            meta: { turn: 12, phase: 'war', seed: 'planning-aborted' },
            military: {
                formations: {},
                corps_command: {},
            },
            political: { political_controllers: {} },
            displacement: {},
            operation_history: [{
                operation_id: 'rs_corps:stalled:t4',
                operation_name: 'Never Staged',
                corps_id: 'rs_corps',
                faction: 'RS',
                type: 'sector_attack',
                started_turn: 4,
                ended_turn: 8,
                outcome: 'failure',
                objectives_targeted: ['op:target:objective'],
                objectives_captured: [],
                duration_turns: 4,
                total_attacks: 0,
                casualties_suffered: { killed: 0, wounded: 0 },
                casualties_inflicted: { killed: 0, wounded: 0 },
                equipment_lost: { tanks: 0, artillery: 0 },
                equipment_destroyed: { tanks: 0, artillery: 0 },
                equipment_captured: { tanks: 0, artillery: 0 },
                participating_brigades: ['b1', 'b2'],
                initial_strength: 2000,
                final_strength: 2000,
                grade: {
                    stars: 1,
                    verdict: 'Aborted',
                    factors: {
                        objective_completion: 0,
                        exchange_ratio: 0,
                        tempo: 0,
                        preservation: 100,
                    },
                },
                weekly_log: [
                    {
                        turn: 4,
                        phase: 'planning',
                        attacks_this_turn: 0,
                        objectives_captured_this_turn: [],
                        objectives_lost_this_turn: [],
                        casualties_suffered: { killed: 0, wounded: 0 },
                        casualties_inflicted: { killed: 0, wounded: 0 },
                        equipment_lost: { tanks: 0, artillery: 0 },
                        equipment_destroyed: { tanks: 0, artillery: 0 },
                        equipment_captured: { tanks: 0, artillery: 0 },
                        brigade_count: 2,
                        momentum: 0,
                        notable_events: [],
                    },
                    {
                        turn: 5,
                        phase: 'planning',
                        attacks_this_turn: 0,
                        objectives_captured_this_turn: [],
                        objectives_lost_this_turn: [],
                        casualties_suffered: { killed: 0, wounded: 0 },
                        casualties_inflicted: { killed: 0, wounded: 0 },
                        equipment_lost: { tanks: 0, artillery: 0 },
                        equipment_destroyed: { tanks: 0, artillery: 0 },
                        equipment_captured: { tanks: 0, artillery: 0 },
                        brigade_count: 2,
                        momentum: 0,
                        notable_events: [],
                    },
                ],
            }],
        } as unknown as GameState;

        const anomalies = runAnomalyDetection(state);

        assert.ok(!anomalies.some((report) => report.type === 'operation_zero_eligible_execution'));
    });
});
