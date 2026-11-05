import { afterEach, describe, expect, it } from 'vitest';

import type { GameState } from '../src/state/game_state.js';
import { applyBrckoTacticalGroupRelocation } from '../src/sim/combat/brcko_tactical_group.js';

const ID = 'rs_5th_kozara_light_infantry';
const HOME = 'op:test:home';
const BRCKO = 'op:brcko:brcko';

function makeState(turn: number, locationOsid = HOME): GameState {
    return {
        meta: { turn, phase: 'war' },
        military: {
            formations: {
                [ID]: {
                    id: ID,
                    name: ID,
                    faction: 'RS',
                    kind: 'brigade',
                    status: 'active',
                    location_osid: locationOsid,
                    home_osid: HOME,
                },
            },
            brigade_movement_state: {
                [ID]: {
                    status: 'in_transit',
                    stance: 'column',
                    destination_sids: ['op:test:dest'],
                    path: [locationOsid, 'op:test:dest'],
                    turns_remaining: 2,
                    owner: 'bot_discretionary',
                },
            },
            brigade_movement_orders: {
                [ID]: { destination_sids: ['op:test:dest'], stance: 'column' },
            },
        },
    } as unknown as GameState;
}

afterEach(() => {
    delete process.env.AWWV_BRCKO_TACTICAL_GROUP;
});

describe('Brcko tactical-group journey lifecycle', () => {
    it('invalidates the old journey on an enabled physical relocation and preserves pending orders', () => {
        process.env.AWWV_BRCKO_TACTICAL_GROUP = '1';
        const state = makeState(56);

        applyBrckoTacticalGroupRelocation(state);

        expect(state.military.formations?.[ID]?.location_osid).toBe(BRCKO);
        expect(state.military.brigade_movement_state?.[ID]).toBeUndefined();
        expect(state.military.brigade_movement_orders?.[ID]).toEqual({
            destination_sids: ['op:test:dest'],
            stance: 'column',
        });
    });

    it('invalidates the return journey when the enabled return changes cell', () => {
        process.env.AWWV_BRCKO_TACTICAL_GROUP = '1';
        const state = makeState(70, BRCKO);

        applyBrckoTacticalGroupRelocation(state);

        expect(state.military.formations?.[ID]?.location_osid).toBe(HOME);
        expect(state.military.brigade_movement_state?.[ID]).toBeUndefined();
        expect(state.military.brigade_movement_orders?.[ID]).toEqual({
            destination_sids: ['op:test:dest'],
            stance: 'column',
        });
    });

    it('preserves the journey on an enabled same-cell return', () => {
        process.env.AWWV_BRCKO_TACTICAL_GROUP = '1';
        const state = makeState(70, HOME);
        const before = structuredClone(state.military.brigade_movement_state?.[ID]);

        applyBrckoTacticalGroupRelocation(state);

        expect(state.military.formations?.[ID]?.location_osid).toBe(HOME);
        expect(state.military.brigade_movement_state?.[ID]).toEqual(before);
        expect(state.military.brigade_movement_orders?.[ID]).toBeDefined();
    });

    it('is a complete no-op when the flag is disabled', () => {
        const state = makeState(56);
        const beforeState = structuredClone(state.military.brigade_movement_state?.[ID]);
        const beforeOrder = structuredClone(state.military.brigade_movement_orders?.[ID]);

        applyBrckoTacticalGroupRelocation(state);

        expect(state.military.formations?.[ID]?.location_osid).toBe(HOME);
        expect(state.military.brigade_movement_state?.[ID]).toEqual(beforeState);
        expect(state.military.brigade_movement_orders?.[ID]).toEqual(beforeOrder);
    });
});
