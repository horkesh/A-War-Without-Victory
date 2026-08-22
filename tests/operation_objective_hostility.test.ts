import { describe, expect, it } from 'vitest';

import { isOperationObjectiveHostile } from '../src/sim/combat/operation_objective_hostility.js';
import type { GameState } from '../src/state/game_state.js';

function state(overrides: Partial<GameState['political']> = {}): GameState {
    return {
        meta: { turn: 101, phase: 'war' },
        military: {},
        political: {
            war_alliance_rbih_hrhb: -0.5,
            rbih_hrhb_state: {
                washington_signed: true,
            },
            ...overrides,
        },
    } as unknown as GameState;
}

describe('operation objective hostility', () => {
    it('distinguishes own, enemy, protected-allied, and combat-enabled bilateral control', () => {
        const postWashington = state();
        expect(isOperationObjectiveHostile(postWashington, 'RBiH', 'RBiH')).toBe(false);
        expect(isOperationObjectiveHostile(postWashington, 'RBiH', 'RS')).toBe(true);
        expect(isOperationObjectiveHostile(postWashington, 'RBiH', 'HRHB')).toBe(false);

        const bilateralWar = state({
            rbih_hrhb_state: {
                mobilization_started_turn: 90,
                washington_signed: false,
                ceasefire_active: false,
            } as GameState['political']['rbih_hrhb_state'],
        });
        expect(isOperationObjectiveHostile(bilateralWar, 'RBiH', 'HRHB')).toBe(true);
    });
});
