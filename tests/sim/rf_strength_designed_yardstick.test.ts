/**
 * RF-STRENGTH (2026-11-15): corps judgements of brigade strength read each brigade's designed
 * `max_personnel`, not the fixed 3,000 cap. ARBiH brigades are designed at about 1,800 and VRS at
 * about 2,000, so against the cap none could reach the 70% healthy line (2,100). At week 188 the
 * cap read 10 of 125 ARBiH brigades as healthy; by design 117 are.
 */

import { describe, expect, it, vi } from 'vitest';
import {
    averagePersonnelFraction,
    countHealthyBrigades,
    designedStrengthFraction,
} from '../../src/sim/combat/bot_corps_helpers.js';
import { evaluateOperationProgress } from '../../src/sim/combat/sector_offensive.js';
import type { CorpsOperation, FormationState, GameState } from '../../src/state/game_state.js';

const b = (personnel: number, max_personnel?: number, cohesion = 70) =>
    ({ personnel, cohesion, ...(max_personnel !== undefined ? { max_personnel } : {}) }) as FormationState;

describe('RF-STRENGTH: designed-strength fraction', () => {
    it('reads a full 1,800-designed brigade as 1.0 (the cap read 0.6)', () => {
        expect(designedStrengthFraction(b(1800, 1800))).toBe(1);
        expect(designedStrengthFraction(b(900, 1800))).toBe(0.5);
    });

    it('falls back to the 3,000 cap when max_personnel is absent or not positive', () => {
        expect(designedStrengthFraction(b(1500))).toBe(0.5);
        expect(designedStrengthFraction(b(1500, 0))).toBe(0.5);
    });

    it('clamps an over-strength brigade at 1.0 so it cannot hide a broken one in the average', () => {
        expect(designedStrengthFraction(b(2400, 2000))).toBe(1);
        expect(averagePersonnelFraction([b(2400, 2000), b(400, 2000)])).toBeCloseTo(0.6, 9);
    });

    it('counts healthy brigades against designed strength', () => {
        // 1,800/1,800 and 1,300/1,800 (0.72) are healthy; 1,200/1,800 (0.67) and a low-cohesion one are not.
        expect(countHealthyBrigades([b(1800, 1800), b(1300, 1800), b(1200, 1800), b(1800, 1800, 40)])).toBe(2);
    });
});

describe('RF-STRENGTH: in-execution replacement reads designed strength', () => {
    it('keeps a full 1,800-designed participant and replaces a depleted one with a brigade healthy by design', () => {
        const CORPS = 'arbih_strength_corps';
        const brig = (id: string, personnel: number, max_personnel: number) => ({
            id, name: id, faction: 'RBiH', kind: 'brigade', status: 'active', created_turn: 0, assignment: null,
            corps_id: CORPS, location_osid: 'op:t:home', personnel, max_personnel, cohesion: 70,
        });
        const op = {
            name: 'Strength Test Offensive', type: 'general_offensive', phase: 'execution',
            started_turn: 38, phase_started_turn: 40, participating_brigades: ['b1', 'b2'],
            target_settlements: ['op:t:front'], supply_readiness: 1, momentum: 0, failure_count: 0,
            consecutive_failures_on_current: 0,
        } as unknown as CorpsOperation;
        const state = {
            meta: { turn: 40, phase: 'war', seed: 'rf-strength' },
            factions: [{ id: 'RBiH' }],
            political: { political_controllers: { 'op:t:home': 'RBiH', 'op:t:front': 'RS' }, control_events: [] },
            military: {
                formations: {
                    [CORPS]: { id: CORPS, name: CORPS, faction: 'RBiH', kind: 'corps', status: 'active', created_turn: 0, assignment: null, personnel: 0 },
                    b1: brig('b1', 1800, 1800), // full by design; 0.6 of the cap
                    b2: brig('b2', 1000, 1800), // 0.56 of design: below the healthy line either way
                    b4: brig('b4', 1700, 1800), // idle, 0.94 of design; 0.57 of the cap (was ineligible)
                },
                corps_command: {
                    [CORPS]: { command_span: 3, subordinate_count: 3, og_slots: 0, active_ogs: [], active_operations: [op], corps_exhaustion: 0, stance: 'offensive' },
                },
            },
        } as unknown as GameState;

        const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
        try {
            evaluateOperationProgress(state, 'RBiH');
        } finally {
            spy.mockRestore();
        }
        const live = state.military.corps_command![CORPS]!.active_operations[0]!;
        expect(live.phase).toBe('execution');
        expect(live.participating_brigades).toEqual(['b1', 'b4']);
    });
});
