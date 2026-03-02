/**
 * Tests for decoration system: evaluation, combat bonuses, backward compatibility.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    getDecorationDisplayName,
    getDecorationShortName,
    getHighestDecorationTier,
} from '../src/state/decoration_types.js';
import type { BrigadeDecoration, DecorationTier } from '../src/state/decoration_types.js';
import {
    evaluateBrigadeDecorations,
    getDecorationAtkMult,
    getDecorationDefBonus,
    DECORATION_COMBAT_BONUS,
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
        assert.equal(getDecorationDisplayName('RBiH', 'tier_1'), 'Slavna');
        assert.equal(getDecorationDisplayName('RS', 'tier_3'), 'Orden Miloša Obilića');
        assert.equal(getDecorationDisplayName('HRHB', 'tier_2'), 'Red Kneza Domagoja');
    });

    it('getDecorationShortName returns compact names', () => {
        assert.equal(getDecorationShortName('RBiH', 'tier_2'), 'Viteška');
        assert.equal(getDecorationShortName('RS', 'tier_1'), 'Mrkonjić');
        assert.equal(getDecorationShortName('HRHB', 'tier_3'), 'Trolist');
    });

    it('getHighestDecorationTier returns highest', () => {
        const decorations: BrigadeDecoration[] = [
            { tier: 'tier_1', awarded_turn: 5, reason: 'test' },
            { tier: 'tier_3', awarded_turn: 10, reason: 'test' },
            { tier: 'tier_2', awarded_turn: 8, reason: 'test' },
        ];
        assert.equal(getHighestDecorationTier(decorations), 'tier_3');
    });

    it('getHighestDecorationTier returns null for empty', () => {
        assert.equal(getHighestDecorationTier([]), null);
    });
});

describe('decoration combat bonuses', () => {
    it('getDecorationAtkMult with decorations', () => {
        const f = makeFormation({
            decorations: [{ tier: 'tier_1', awarded_turn: 0, reason: 'test' }],
        });
        assert.equal(getDecorationAtkMult(f), 1.10);
    });

    it('getDecorationAtkMult with tier_3', () => {
        const f = makeFormation({
            decorations: [{ tier: 'tier_3', awarded_turn: 0, reason: 'test' }],
        });
        assert.equal(getDecorationAtkMult(f), 1.15);
    });

    it('getDecorationAtkMult falls back to legacy honor', () => {
        const f = makeFormation({ honor: 'slavna' } as Partial<FormationState>);
        assert.equal(getDecorationAtkMult(f), 1.10);
    });

    it('getDecorationAtkMult returns 1.0 with no decorations and no honor', () => {
        const f = makeFormation();
        assert.equal(getDecorationAtkMult(f), 1.0);
    });

    it('getDecorationDefBonus with tier_2', () => {
        const f = makeFormation({
            decorations: [{ tier: 'tier_2', awarded_turn: 0, reason: 'test' }],
        });
        assert.equal(getDecorationDefBonus(f), 0.15);
    });

    it('highest tier wins when multiple decorations present', () => {
        const f = makeFormation({
            decorations: [
                { tier: 'tier_1', awarded_turn: 0, reason: 'test' },
                { tier: 'tier_3', awarded_turn: 5, reason: 'test' },
            ],
        });
        // tier_3 has atk=0.15, def=0.20
        assert.equal(getDecorationAtkMult(f), 1.15);
        assert.equal(getDecorationDefBonus(f), 0.20);
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
        assert.equal(f.decorations.length, 1);
        assert.equal(f.decorations[0].tier, 'tier_1');
        assert.equal(f.decorations[0].awarded_turn, 10);
    });

    it('awards tier_1 for 8+ battles with >60% win rate', () => {
        const f = makeFormation();
        const h = createEmptyBrigadeHistory(1500);
        h.battles_fought = 10;
        h.victories = 7;
        h.longest_victory_streak = 3; // not 5, so not streak-based
        f.brigade_history = h;
        f.decorations = [];

        evaluateBrigadeDecorations(f, 15);
        assert.equal(f.decorations.length, 1);
        assert.equal(f.decorations[0].tier, 'tier_1');
    });

    it('does NOT award tier_1 for insufficient stats', () => {
        const f = makeFormation();
        const h = createEmptyBrigadeHistory(1500);
        h.battles_fought = 5;
        h.victories = 3;
        h.longest_victory_streak = 2;
        f.brigade_history = h;
        f.decorations = [];

        evaluateBrigadeDecorations(f, 10);
        assert.equal(f.decorations.length, 0);
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
        assert.equal(f.decorations.length, 1);
        assert.equal(f.decorations[0].tier, 'tier_2');
    });

    it('awards tier_3 when both tier_1 and tier_2 present', () => {
        const f = makeFormation();
        const h = createEmptyBrigadeHistory(1500);
        h.battles_fought = 10;
        h.victories = 8;
        h.longest_victory_streak = 5;
        h.longest_defense_streak = 3;
        f.brigade_history = h;
        f.decorations = [];

        // Single evaluation: tier_1, tier_2, and tier_3 all awarded in same pass
        // (tier_3 checks for presence of tier_1 + tier_2 which are pushed first)
        evaluateBrigadeDecorations(f, 10);
        assert.equal(f.decorations.length, 3);
        assert.equal(f.decorations[0].tier, 'tier_1');
        assert.equal(f.decorations[1].tier, 'tier_2');
        assert.equal(f.decorations[2].tier, 'tier_3');
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
        // Should still be 1 tier_1 decoration
        const tier1Count = f.decorations.filter(d => d.tier === 'tier_1').length;
        assert.equal(tier1Count, 1);
    });

    it('skips formations without history', () => {
        const f = makeFormation();
        // No brigade_history set
        evaluateBrigadeDecorations(f, 10);
        // Should not crash, decorations not touched
        assert.equal(f.decorations, undefined);
    });
});
