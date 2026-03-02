/**
 * Tests for war stories system: arc classification, narrative generation, notable moments.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyBrigadeHistory } from '../src/state/brigade_history.js';
import type { BrigadeHistory } from '../src/state/brigade_history.js';
import {
    classifyArc,
    generateNarrative,
    selectNotableMoments,
    generateWarStories,
    type NarrativeArc,
} from '../src/sim/war_stories.js';
import type { FormationState, GameState } from '../src/state/game_state.js';

function makeFormation(overrides: Partial<FormationState> = {}): FormationState {
    return {
        id: 'test_brigade',
        faction: 'RBiH',
        name: '501st Mountain Brigade',
        created_turn: 0,
        status: 'active',
        assignment: null,
        personnel: 1500,
        kind: 'brigade',
        ...overrides,
    };
}

function makeHistory(overrides: Partial<BrigadeHistory> = {}): BrigadeHistory {
    return {
        ...createEmptyBrigadeHistory(2000),
        ...overrides,
    };
}

describe('arc classification', () => {
    it('classifies destroyed formations', () => {
        const f = makeFormation({ status: 'inactive' });
        const h = makeHistory({ battles_fought: 5 });
        assert.equal(classifyArc(f, h), 'destroyed');
    });

    it('classifies destroyed via lifecycle_status', () => {
        const f = makeFormation({ lifecycle_status: 'destroyed' });
        const h = makeHistory({ battles_fought: 5 });
        assert.equal(classifyArc(f, h), 'destroyed');
    });

    it('classifies garrison (≤2 battles)', () => {
        const f = makeFormation();
        const h = makeHistory({ battles_fought: 1 });
        assert.equal(classifyArc(f, h), 'garrison');
    });

    it('classifies veteran (>65% win rate, >60% personnel)', () => {
        const f = makeFormation({ personnel: 1800 });
        const h = makeHistory({
            battles_fought: 10,
            victories: 7,
            peak_personnel: 2000,
        });
        assert.equal(classifyArc(f, h), 'veteran');
    });

    it('classifies bloodied (heavy combat, heavy losses)', () => {
        const f = makeFormation({ personnel: 1500 });
        const h = makeHistory({
            battles_fought: 8,
            victories: 3,
            defeats: 3,
            total_casualties_taken: 500,
            peak_personnel: 2000,
        });
        assert.equal(classifyArc(f, h), 'bloodied');
    });

    it('classifies shattered (<50% peak)', () => {
        const f = makeFormation({ personnel: 800 });
        const h = makeHistory({
            battles_fought: 6,
            victories: 2,
            total_casualties_taken: 1200,
            peak_personnel: 2000,
        });
        assert.equal(classifyArc(f, h), 'shattered');
    });

    it('classifies risen (>150% cumulative casualties, rebuilt)', () => {
        const f = makeFormation({ personnel: 1500 });
        const h = makeHistory({
            battles_fought: 12,
            victories: 5,
            total_casualties_taken: 3500, // >150% of peak 2000
            peak_personnel: 2000,
        });
        assert.equal(classifyArc(f, h), 'risen');
    });
});

describe('narrative generation', () => {
    it('generates veteran narrative', () => {
        const f = makeFormation({ personnel: 1800 });
        const h = makeHistory({
            battles_fought: 10,
            victories: 7,
            defeats: 2,
            total_casualties_taken: 400,
            total_casualties_inflicted: 600,
            peak_personnel: 2000,
        });
        const text = generateNarrative(f, h, 'veteran');
        assert.ok(text.includes('501st Mountain Brigade'));
        assert.ok(text.includes('10 battles'));
        assert.ok(text.includes('winning 7'));
        assert.ok(text.includes('backbone'));
    });

    it('generates destroyed narrative', () => {
        const f = makeFormation({ status: 'inactive', personnel: 0 });
        const h = makeHistory({
            battles_fought: 3,
            total_casualties_taken: 1500,
        });
        const text = generateNarrative(f, h, 'destroyed');
        assert.ok(text.includes('ceased to exist'));
    });

    it('generates garrison narrative', () => {
        const f = makeFormation({ personnel: 2000 });
        const h = makeHistory({ battles_fought: 1 });
        const text = generateNarrative(f, h, 'garrison');
        assert.ok(text.includes('patience'));
    });
});

describe('notable moments', () => {
    it('selects first battle', () => {
        const f = makeFormation();
        const h = makeHistory({
            first_battle_turn: 5,
            first_battle_osid: 'op:tuzla:tuzla_2',
        });
        const moments = selectNotableMoments(f, h);
        assert.ok(moments.length >= 1);
        assert.ok(moments[0].description.includes('First battle'));
    });

    it('selects victory streak', () => {
        const f = makeFormation();
        const h = makeHistory({
            longest_victory_streak: 6,
        });
        const moments = selectNotableMoments(f, h);
        assert.ok(moments.some(m => m.description.includes('6 consecutive victories')));
    });

    it('caps at 3 moments', () => {
        const f = makeFormation({
            decorations: [{ tier: 'tier_1', awarded_turn: 10, reason: 'streak' }],
        });
        const h = makeHistory({
            first_battle_turn: 1,
            first_battle_osid: 'op:bihac:bihac_2',
            longest_victory_streak: 5,
            longest_defense_streak: 4,
            worst_single_battle_casualties: 200,
            worst_single_battle_turn: 15,
            nadir_personnel: 300,
            peak_personnel: 2000,
        });
        const moments = selectNotableMoments(f, h);
        assert.ok(moments.length <= 3);
    });
});

describe('generateWarStories', () => {
    it('generates stories for all brigades with history', () => {
        const state = {
            meta: { turn: 52, phase: 'war', start_year: 1992 },
            formations: {
                b1: makeFormation({
                    id: 'b1',
                    brigade_history: makeHistory({ battles_fought: 10, victories: 7, peak_personnel: 2000 }),
                    personnel: 1800,
                }),
                b2: makeFormation({
                    id: 'b2',
                    brigade_history: makeHistory({ battles_fought: 1 }),
                }),
                corps1: makeFormation({ id: 'corps1', kind: 'corps' }), // Should be skipped
            },
            factions: [],
            political_controllers: {},
        } as unknown as GameState;

        const stories = generateWarStories(state);
        assert.equal(stories.length, 2);
        assert.equal(stories[0].formation_id, 'b1');
        assert.equal(stories[1].formation_id, 'b2');
    });

    it('skips formations without history', () => {
        const state = {
            meta: { turn: 52, phase: 'war', start_year: 1992 },
            formations: {
                b1: makeFormation({ id: 'b1' }), // No brigade_history
            },
            factions: [],
            political_controllers: {},
        } as unknown as GameState;

        const stories = generateWarStories(state);
        assert.equal(stories.length, 0);
    });
});
