/**
 * B5 1995 alliance gate (2026-11-16): Operation Summer '95 and the Federation ground offensive
 * need a Federation, not the 1993 Croat-Bosniak war. A President who kept the RBiH-HRHB alliance
 * (Washington never needed) still gets Croatian involvement in 1995; one whose alliance is broken
 * and was never mended does not.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

import { evaluateCondition, type EventCondition } from '../../../src/sim/events/event_types.js';
import type { GameState } from '../../../src/state/game_state.js';

const events = JSON.parse(
    readFileSync(resolve(__dirname, '../../../data/scenarios/events/war_1995.json'), 'utf8'),
) as Array<{ id: string; trigger: { condition?: EventCondition } }>;

function conditionOf(id: string): EventCondition {
    const def = events.find((e) => e.id === id);
    if (!def?.trigger.condition) throw new Error(`no condition on ${id}`);
    return def.trigger.condition;
}

function state(opts: { alliance: number; washingtonFired: boolean }): GameState {
    return {
        political: { war_alliance_rbih_hrhb: opts.alliance },
        military: {
            fired_event_ids: opts.washingtonFired ? ['hrhb_washington_agreement_1994'] : [],
            event_fire_counts: opts.washingtonFired ? { hrhb_washington_agreement_1994: 1 } : {},
        },
    } as unknown as GameState;
}

describe.each(['operation_summer_95', 'federation_ground_offensive_1995'])('%s Federation condition', (id) => {
    const cond = conditionOf(id);

    it('holds on the historical path: Washington signed after the 1993 war', () => {
        expect(evaluateCondition(cond, state({ alliance: -0.6, washingtonFired: true }))).toBe(true);
    });

    it('holds for an alliance that was never broken (no Washington needed)', () => {
        expect(evaluateCondition(cond, state({ alliance: 0.6, washingtonFired: false }))).toBe(true);
    });

    it('fails when the alliance is broken and Washington never came', () => {
        expect(evaluateCondition(cond, state({ alliance: -0.4, washingtonFired: false }))).toBe(false);
        expect(evaluateCondition(cond, state({ alliance: 0.2, washingtonFired: false }))).toBe(false); // at the threshold, not above
    });
});
