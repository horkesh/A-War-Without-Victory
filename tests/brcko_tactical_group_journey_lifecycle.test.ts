import { afterEach, describe, expect, it } from 'vitest';

import type { GameState } from '../src/state/game_state.js';
import { applyBrckoTacticalGroupRelocation } from '../src/sim/combat/brcko_tactical_group.js';

const ID = 'rs_5th_kozara_light_infantry';
const HOME = 'op:test:home';
const BRCKO = 'op:brcko:brcko';

/** By default RS holds both Brčko and the home cell, so the relocation has friendly ground. */
function makeState(
    turn: number,
    locationOsid = HOME,
    controllers: Record<string, string | null> = { [HOME]: 'RS', [BRCKO]: 'RS' },
): GameState {
    return {
        meta: { turn, phase: 'war' },
        political: { political_controllers: controllers },
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

    it('does not attach to a Brcko its side has lost, and keeps the journey', () => {
        process.env.AWWV_BRCKO_TACTICAL_GROUP = '1';
        const state = makeState(56, HOME, { [HOME]: 'RS', [BRCKO]: 'RBiH' });
        const before = structuredClone(state.military.brigade_movement_state?.[ID]);

        applyBrckoTacticalGroupRelocation(state);

        expect(state.military.formations?.[ID]?.location_osid).toBe(HOME);
        expect(state.military.brigade_movement_state?.[ID]).toEqual(before);
    });

    it('does not return to a home its side has lost (or that nobody controls); it stays at Brcko', () => {
        process.env.AWWV_BRCKO_TACTICAL_GROUP = '1';
        const lost = makeState(70, BRCKO, { [HOME]: 'RBiH', [BRCKO]: 'RS' });
        applyBrckoTacticalGroupRelocation(lost);
        expect(lost.military.formations?.[ID]?.location_osid).toBe(BRCKO);

        const uncontrolled = makeState(70, BRCKO, { [HOME]: null, [BRCKO]: 'RS' });
        applyBrckoTacticalGroupRelocation(uncontrolled);
        expect(uncontrolled.military.formations?.[ID]?.location_osid).toBe(BRCKO);
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
