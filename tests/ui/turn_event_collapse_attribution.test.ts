/**
 * Owner playtest F1e: a sustainability collapse event names the municipality's real holder.
 * `political_controllers` is keyed by OSID ("op:<mun>:<n>"), so a direct lookup by municipality
 * id is always empty and used to attribute every collapse to the player.
 */
import { describe, expect, it } from 'vitest';
import type { GameState } from '../../src/state/game_state';
import { generateTurnEvents } from '../../src/ui/warroom/data/turn_event_generator';
import type { PreviousTurnSnapshot } from '../../src/ui/warroom/data/warroom_state';
import { generateTickerWarEvents } from '../../src/ui/warroom/content/ticker_war_events';

function stateWith(controllers: Record<string, string>, collapsed: string[]): GameState {
    const sustainability_state: Record<string, unknown> = {};
    for (const mun of collapsed) sustainability_state[mun] = { collapsed: true };
    return {
        meta: { turn: 20 },
        factions: [],
        political: {
            political_controllers: controllers,
            war_exhaustion: {},
            war_alliance_rbih_hrhb: null,
        },
        military: { casualty_ledger: {}, formations: {} },
        displacement: {
            displacement_state: {},
            hostile_takeover_timers: {},
            civilian_casualties: {},
            sustainability_state,
        },
    } as unknown as GameState;
}

const PREV: PreviousTurnSnapshot = {
    turn: 19,
    phase: 'war',
    politicalControllers: {},
    casualtyTotals: {},
    exhaustion: {},
    displacementOutTotals: {},
    civilianKilled: {},
    collapsedMunicipalities: [],
    allianceValue: null,
    ceasefireActive: false,
    washingtonSigned: false,
};

describe('sustainability collapse events', () => {
    it('attribute a municipality to the majority holder of its OSIDs, not to the player', () => {
        const state = stateWith(
            { 'op:visegrad:1': 'RS', 'op:visegrad:2': 'RS', 'op:visegrad:3': 'RBiH' },
            ['visegrad'],
        );
        const events = generateTurnEvents(state, { ...PREV, politicalControllers: state.political.political_controllers as Record<string, string> }, 'RBiH')
            .filter((e) => e.type === 'sustainability_collapse');

        expect(events).toHaveLength(1);
        expect(events[0].faction).toBe('RS');
        expect(events[0].municipality).toBe('visegrad');
        // An enemy-held collapse is not the player's own problem.
        expect(events[0].priority).toBe(5);
    });

    it('marks a collapse in the player\'s own municipality as own', () => {
        const state = stateWith({ 'op:zenica:1': 'RBiH', 'op:zenica:2': 'RBiH' }, ['zenica']);
        const events = generateTurnEvents(state, { ...PREV, politicalControllers: state.political.political_controllers as Record<string, string> }, 'RBiH')
            .filter((e) => e.type === 'sustainability_collapse');

        expect(events).toHaveLength(1);
        expect(events[0].faction).toBe('RBiH');
        expect(events[0].priority).toBe(2);
    });

    it('never reach the ticker (collapses are cumulative, not news)', () => {
        const state = stateWith({ 'op:zenica:1': 'RBiH' }, ['zenica']);
        const events = generateTurnEvents(state, { ...PREV, politicalControllers: state.political.political_controllers as Record<string, string> }, 'RBiH');
        expect(events.some((e) => e.type === 'sustainability_collapse')).toBe(true);
        expect(generateTickerWarEvents(events, 'RBiH')).toEqual([]);
    });
});
