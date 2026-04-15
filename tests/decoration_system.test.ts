/**
 * Tests for decoration system: evaluation, combat bonuses, backward compatibility.
 */

import { describe, expect, it } from 'vitest';

import {
    getDecorationDisplayName,
    getDecorationShortName,
    getHighestDecorationTier,
} from '../src/state/decoration_types.js';
import type { BrigadeDecoration } from '../src/state/decoration_types.js';
import {
    evaluateBrigadeDecorations,
    getDecorationAtkMult,
    getDecorationDefBonus,
} from '../src/sim/combat/decoration_evaluator.js';
import { createEmptyBrigadeHistory } from '../src/state/brigade_history.js';
import type { FormationState } from '../src/state/game_state.js';

function makeFormation(overrides: Partial<FormationState> = {}): FormationState {
    return {
        id: 'test_brigade',
        faction: 'RBiH',
        name: 'Test Brigade',
        created_turn: 0,
        status: 'active',
        assignment: null,
        personnel: 1500,
        ...overrides,
    };
}

describe('decoration types', () => {
    it('getDecorationDisplayName returns correct names', () => {
        expect(getDecorationDisplayName('RBiH', 'tier_1')).toBe('Slavna');
        expect(getDecorationDisplayName('RS', 'tier_3')).toBe('Orden Miloša Obilića');
        expect(getDecorationDisplayName('HRHB', 'tier_2')).toBe('Red Kneza Domagoja');
    });

    it('getDecorationShortName returns compact names', () => {
        expect(getDecorationShortName('RBiH', 'tier_2')).toBe('Viteška');
        expect(getDecorationShortName('RS', 'tier_1')).toBe('Mrkonjić');
        expect(getDecorationShortName('HRHB', 'tier_3')).toBe('Trolist');
    });

    it('getHighestDecorationTier returns highest', () => {
        const decorations: BrigadeDecoration[] = [
            { tier: 'tier_1', awarded_turn: 5, reason: 'test' },
            { tier: 'tier_3', awarded_turn: 10, reason: 'test' },
            { tier: 'tier_2', awarded_turn: 8, reason: 'test' },
        ];
        expect(getHighestDecorationTier(decorations)).toBe('tier_3');
    });

    it('getHighestDecorationTier returns null for empty', () => {
        expect(getHighestDecorationTier([])).toBeNull();
    });
});

describe('decoration combat bonuses', () => {
    it('getDecorationAtkMult with decorations', () => {
        const f = makeFormation({
            decorations: [{ tier: 'tier_1', awarded_turn: 0, reason: 'test' }],
        });
        expect(getDecorationAtkMult(f)).toBe(1.10);
    });

    it('getDecorationAtkMult with tier_3', () => {
        const f = makeFormation({
            decorations: [{ tier: 'tier_3', awarded_turn: 0, reason: 'test' }],
        });
        expect(getDecorationAtkMult(f)).toBe(1.15);
    });

    it('getDecorationAtkMult falls back to legacy honor', () => {
        const f = makeFormation({ honor: 'slavna' } as Partial<FormationState>);
        expect(getDecorationAtkMult(f)).toBe(1.10);
    });

    it('getDecorationAtkMult returns 1.0 with no decorations and no honor', () => {
        const f = makeFormation();
        expect(getDecorationAtkMult(f)).toBe(1.0);
    });

    it('getDecorationDefBonus with tier_2', () => {
        const f = makeFormation({
            decorations: [{ tier: 'tier_2', awarded_turn: 0, reason: 'test' }],
        });
        expect(getDecorationDefBonus(f)).toBe(0.15);
    });

    it('highest tier wins when multiple decorations present', () => {
        const f = makeFormation({
            decorations: [
                { tier: 'tier_1', awarded_turn: 0, reason: 'test' },
                { tier: 'tier_3', awarded_turn: 5, reason: 'test' },
            ],
        });
        expect(getDecorationAtkMult(f)).toBe(1.15);
        expect(getDecorationDefBonus(f)).toBe(0.20);
    });
});

describe('decoration evaluation', () => {
    it('awards tier_1 for 5+ consecutive victories', () => {
        const f = makeFormation();
        const h = createEmptyBrigadeHistory(1500);
        h.battles_fought = 6;
        h.victories = 5;
        h.longest_victory_streak = 5;
        f.brigade_history = h;
        f.decorations = [];

        evaluateBrigadeDecorations(f, 10);
        expect(f.decorations).toHaveLength(1);
        expect(f.decorations[0].tier).toBe('tier_1');
        expect(f.decorations[0].awarded_turn).toBe(10);
    });

    it('awards tier_1 for 8+ battles with >60% win rate', () => {
        const f = makeFormation();
        const h = createEmptyBrigadeHistory(1500);
        h.battles_fought = 10;
        h.victories = 7;
        h.longest_victory_streak = 3;
        f.brigade_history = h;
        f.decorations = [];

        evaluateBrigadeDecorations(f, 15);
        expect(f.decorations).toHaveLength(1);
        expect(f.decorations[0].tier).toBe('tier_1');
    });

    it('does not award tier_1 for insufficient stats', () => {
        const f = makeFormation();
        const h = createEmptyBrigadeHistory(1500);
        h.battles_fought = 5;
        h.victories = 3;
        h.longest_victory_streak = 2;
        f.brigade_history = h;
        f.decorations = [];

        evaluateBrigadeDecorations(f, 10);
        expect(f.decorations).toHaveLength(0);
    });

    it('awards tier_2 for defense streak >= 3', () => {
        const f = makeFormation();
        const h = createEmptyBrigadeHistory(1500);
        h.battles_fought = 5;
        h.victories = 3;
        h.longest_defense_streak = 3;
        f.brigade_history = h;
        f.decorations = [];

        evaluateBrigadeDecorations(f, 20);
        expect(f.decorations).toHaveLength(1);
        expect(f.decorations[0].tier).toBe('tier_2');
    });

    it('awards tier_3 when both tier_1 and tier_2 are present', () => {
        const f = makeFormation();
        const h = createEmptyBrigadeHistory(1500);
        h.battles_fought = 10;
        h.victories = 8;
        h.longest_victory_streak = 5;
        h.longest_defense_streak = 3;
        f.brigade_history = h;
        f.decorations = [];

        evaluateBrigadeDecorations(f, 10);
        expect(f.decorations).toHaveLength(3);
        expect(f.decorations[0].tier).toBe('tier_1');
        expect(f.decorations[1].tier).toBe('tier_2');
        expect(f.decorations[2].tier).toBe('tier_3');
    });

    it('does not duplicate decorations on re-evaluation', () => {
        const f = makeFormation();
        const h = createEmptyBrigadeHistory(1500);
        h.battles_fought = 6;
        h.victories = 5;
        h.longest_victory_streak = 5;
        f.brigade_history = h;
        f.decorations = [];

        evaluateBrigadeDecorations(f, 10);
        evaluateBrigadeDecorations(f, 11);
        evaluateBrigadeDecorations(f, 12);

        const tier1Count = f.decorations.filter(d => d.tier === 'tier_1').length;
        expect(tier1Count).toBe(1);
    });

    it('skips formations without history', () => {
        const f = makeFormation();
        evaluateBrigadeDecorations(f, 10);
        expect(f.decorations).toBeUndefined();
    });
});
