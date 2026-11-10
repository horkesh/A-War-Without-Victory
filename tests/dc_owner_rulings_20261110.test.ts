/**
 * DC owner rulings, 2026-11-10.
 *  1. The five Dayton audit cells whose land and town fall on opposite sides follow the town.
 *  2. RBiH's A+ is blocked only by war crimes RBiH authorized in play, not by scripted records.
 *  3. RBiH's A band reads "30% or more territory", matching its rule.
 * (The peace-plan borders kept as the scanned maps show need no code: the ruling is a record.)
 */
import { describe, expect, it } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import type { NegotiationBreakdown } from '../src/state/negotiation_types.js';
import { planCellAssignments } from '../src/sim/negotiation/peace_settlement.js';
import { computeFactionGrade } from '../src/sim/negotiation/scoring.js';

describe('the five straddling Dayton cells follow their town', () => {
    const cells = planCellAssignments('dayton');
    it.each([
        ['op:orasje:ostra_luka', 'HRHB'],
        ['op:sanski_most:stari_majdan', 'RBiH'],
        ['op:trebinje:velicani', 'HRHB'],
        ['op:trnovo:tosici', 'RS'],
        ['op:trnovo:trnovo', 'RS'],
    ])('%s goes to %s', (osid, faction) => {
        expect(cells[osid]?.faction).toBe(faction);
    });
});

describe('RBiH grade anchors', () => {
    const cap = (over: Partial<NegotiationBreakdown>) => ({
        territory_controlled_pct: 36,
        enclaves_lost: [],
        enclaves_held: [],
        war_crimes_events: 0,
        war_crimes_events_emergent: 0,
        ...over,
    }) as unknown as NegotiationBreakdown;
    const state = {} as GameState;

    it('scripted war-crimes records no longer block A+', () => {
        expect(computeFactionGrade(cap({ war_crimes_events: 13 }), 'RBiH', state).grade).toBe('A+');
    });

    it('a war crime RBiH authorized in play still blocks A+', () => {
        expect(computeFactionGrade(cap({ war_crimes_events: 13, war_crimes_events_emergent: 1 }), 'RBiH', state).grade).toBe('A');
    });

    it('the A band text matches its open rule', () => {
        const a = computeFactionGrade(cap({ territory_controlled_pct: 40, enclaves_lost: ['zepa'] }), 'RBiH', state);
        expect(a.grade).toBe('A');
        expect(a.description).toContain('30% or more territory');
    });
});
