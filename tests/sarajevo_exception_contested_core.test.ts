import { describe, expect, it } from 'vitest';
import { updateSarajevoState } from '../src/state/sarajevo_exception.js';
import type { GameState } from '../src/state/game_state.js';
import type { SupplyStateByOsidReport } from '../src/state/supply_state_derivation.js';

function makeState(): GameState {
    return {
        schema_version: 1,
        meta: { turn: 40, seed: 'sarajevo-contested-core', phase: 'war' },
        factions: [
            { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {}
        } as any,
        political: {
            political_controllers: {
                'op:centar_sarajevo:radava': 'RS',
                'op:centar_sarajevo:sarajevo_dio_centar_sajarevo': 'RBiH',
                'op:novi_grad_sarajevo:recica': 'RS',
                'op:novi_grad_sarajevo:sarajevo_dio_novi_grad_sarajevo': 'RBiH',
                'op:novo_sarajevo:lukavica': 'RS',
                'op:novo_sarajevo:sarajevo_dio_novo_sarajevo': 'RBiH',
                'op:stari_grad_sarajevo:faletici': 'RS',
                'op:stari_grad_sarajevo:sarajevo_dio_stari_grad_sarajevo': 'RBiH'
            },
            enclave_resilience: {
                sarajevo: {
                    hardening_active: true,
                    isolation_turns: 40,
                    resilience: 44
                }
            }
        } as any,
        displacement: {} as any
    } as unknown as GameState;
}

describe('Sarajevo exception contested core ownership', () => {
    it('evaluates the RBiH-held city core as besieged even when RS controls an equal number of core perimeter OSIDs', () => {
        const supplyByOsid: SupplyStateByOsidReport = {
            schema: 1,
            turn: 40,
            factions: [
                {
                    faction_id: 'RBiH',
                    by_osid: [
                        { osid: 'op:centar_sarajevo:sarajevo_dio_centar_sajarevo', state: 'strained' },
                        { osid: 'op:novi_grad_sarajevo:sarajevo_dio_novi_grad_sarajevo', state: 'strained' },
                        { osid: 'op:novo_sarajevo:sarajevo_dio_novo_sarajevo', state: 'strained' },
                        { osid: 'op:stari_grad_sarajevo:sarajevo_dio_stari_grad_sarajevo', state: 'strained' }
                    ]
                },
                {
                    faction_id: 'RS',
                    by_osid: [
                        { osid: 'op:centar_sarajevo:radava', state: 'adequate' },
                        { osid: 'op:novi_grad_sarajevo:recica', state: 'adequate' },
                        { osid: 'op:novo_sarajevo:lukavica', state: 'adequate' },
                        { osid: 'op:stari_grad_sarajevo:faletici', state: 'adequate' }
                    ]
                }
            ]
        };

        const sarajevo = updateSarajevoState(makeState(), supplyByOsid);

        expect(sarajevo.siege_status).toBe('BESIEGED');
        expect(sarajevo.internal_supply).toBe(0.5);
        expect(sarajevo.siege_duration).toBe(1);
    });
});
