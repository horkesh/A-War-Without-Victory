/**
 * A2b follow-up (2026-11-17): Zagreb's ceasefire order (`zagreb_orders_hrhb_ceasefire`) is about a war,
 * so its trigger also requires that an RBiH-HRHB war was fought. A no-war game (Path C, Federation by
 * consent) used to get a card ordering a ceasefire where there was no war.
 *
 * The condition is `rbih_hrhb_war_started` (`war_started_turn` set), the same fact Path A' and the
 * war-room copy read, not the instantaneous `isRbihHrhbAtWar` alliance value.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { evaluateCondition, type EventCondition } from '../src/sim/events/event_types.js';
import type { GameState } from '../src/state/game_state.js';

interface EventRow { id: string; trigger?: { turn_min?: number; turn_max?: number; condition?: EventCondition } }

const events = JSON.parse(readFileSync(resolve(__dirname, '../data/scenarios/events/war_1994.json'), 'utf8')) as EventRow[];
const zagreb = events.find((e) => e.id === 'zagreb_orders_hrhb_ceasefire');

function state(goal: string | null, warStartedTurn: number | null): GameState {
    return {
        meta: { turn: 95 },
        political: { rbih_hrhb_state: warStartedTurn == null ? {} : { war_started_turn: warStartedTurn } },
        military: { event_flags: goal == null ? {} : { hrhb_political_goal: goal } },
    } as unknown as GameState;
}

describe('zagreb_orders_hrhb_ceasefire needs a war', () => {
    it('keeps its historical window and still reads the HRHB political goal', () => {
        expect(zagreb).toBeDefined();
        expect(zagreb!.trigger?.turn_min).toBe(95);
        expect(zagreb!.trigger?.turn_max).toBe(103);
        expect(JSON.stringify(zagreb!.trigger?.condition)).toContain('hrhb_political_goal');
    });

    it('fires after a war was fought, whatever the political goal in its list', () => {
        for (const goal of ['croat_republic', 'united_front', 'strategic_ambiguity']) {
            expect(evaluateCondition(zagreb!.trigger!.condition!, state(goal, 49))).toBe(true);
        }
    });

    it('does not fire in a game where no RBiH-HRHB war was fought (Path C)', () => {
        for (const goal of ['croat_republic', 'united_front', 'strategic_ambiguity']) {
            expect(evaluateCondition(zagreb!.trigger!.condition!, state(goal, null))).toBe(false);
        }
    });

    it('still needs one of the three political goals', () => {
        expect(evaluateCondition(zagreb!.trigger!.condition!, state(null, 49))).toBe(false);
        expect(evaluateCondition(zagreb!.trigger!.condition!, state('something_else', 49))).toBe(false);
    });
});
