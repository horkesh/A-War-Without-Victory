import { describe, expect, it } from 'vitest';
import type { EdgeRecord } from '../src/map/settlements.js';
import {
    applyHumanitarianConvoyDecisions,
    applySmugglingAllocation,
    evaluateHumanitarianConvoys,
    maybeActivateSarajevoTunnel
} from '../src/state/supply_reserves.js';
import {
    applyIvpConsequences,
    ensureInternationalVisibilityPressure,
    updateInternationalVisibilityPressure
} from '../src/state/patron_pressure.js';
import type { FactionState, GameState, InternationalVisibilityPressure, SarajevoState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function makeFaction(id: FactionState['id']): FactionState {
    return {
        id,
        profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
        areasOfResponsibility: [],
        supply_sources: [],
        embargo_profile: {
            heavy_equipment_access: id === 'RBiH' ? 0.2 : 0.8,
            ammunition_resupply_rate: id === 'RBiH' ? 0.3 : 0.7,
            maintenance_capacity: 0.5,
            smuggling_efficiency: id === 'RBiH' ? 0.3 : 0,
            external_pipeline_status: id === 'RBiH' ? 0.4 : 0.8,
        },
    };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
    return {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: {
            turn: 64,
            seed: 'phase-c-test',
            phase: 'war',
            supply_reserves_enabled: true,
            player_faction: 'RS',
        } as GameState['meta'],
  factions: [makeFaction('RS'), makeFaction('RBiH'), makeFaction('HRHB')],
  ...overrides,
  military: {
    formations: {},
    general_supply_reserve: { RS: 40, RBiH: 20, HRHB: 30 },
    heavy_munitions_reserve: { RS: 20, RBiH: 5, HRHB: 10 }
  } as any,
  political: {
    political_controllers: {
            enclave_1: 'RBiH',
            enclave_2: 'RBiH',
            route_rs: 'RS',
            route_hrhb: 'HRHB',
        },
    enclave_resilience: {
            ENCL_test: { resilience: 10, isolation_turns: 6, hardening_active: false },
            sarajevo: { resilience: 5, isolation_turns: 22, hardening_active: true },
        },
    enclaves: [
            {
                id: 'ENCL_test',
                faction_id: 'RBiH',
                settlement_ids: ['enclave_1', 'enclave_2'],
                integrity: 0.4,
                components: { supply: 0, authority: 0.5, population: 0.8, connectivity: 0.4 },
                humanitarian_pressure: 0.5,
                siege_duration: 6,
                collapsed: false,
            },
            {
                id: 'ENCL_sarajevo',
                faction_id: 'RBiH',
                settlement_ids: ['sarajevo_1'],
                integrity: 0.25,
                components: { supply: 0, authority: 0.6, population: 0.9, connectivity: 0.4 },
                humanitarian_pressure: 0.8,
                siege_duration: 22,
                collapsed: false,
            },
        ],
    sarajevo_state: {
            mun_id: 'centar_sarajevo',
            settlement_ids: ['sarajevo_1'],
            siege_status: 'BESIEGED',
            siege_duration: 22,
            external_supply: 0.1,
            internal_supply: 0.2,
            siege_intensity: 0.8,
            international_focus: 0.5,
            humanitarian_pressure: 0.8,
            last_updated_turn: 64,
        }
  } as any,
  displacement: {
    displacement_event_log: [
            {
                turn: 64,
                origin_mun: 'foo',
                dest_mun: 'bar',
                ethnicity: 'RBiH',
                displaced: 2400,
                killed: 100,
                fled_abroad: 200,
                settled: 2100,
            },
        ]
  } as any,
} as GameState;
}

describe('Phase C supply agency', () => {
    it('activates and clears IVP consequences with hysteresis', () => {
        const state = makeState();
        const ivp: InternationalVisibilityPressure = {
            sarajevo_siege_visibility: 0.9,
            enclave_humanitarian_pressure: 0.8,
            atrocity_visibility: 0.7,
            negotiation_momentum: 0,
            composite_ivp: 0.61,
            last_major_shift: 64,
        };

        applyIvpConsequences(state, ivp);
        expect(state.political.ivp_consequences_active).toEqual(['drina_blockade', 'international_sanctions']);

        applyIvpConsequences(state, { ...ivp, composite_ivp: 0.55 });
        expect(state.political.ivp_consequences_active).toEqual(['drina_blockade', 'international_sanctions']);

        applyIvpConsequences(state, { ...ivp, composite_ivp: 0.49 });
        expect(state.political.ivp_consequences_active).toEqual(['drina_blockade']);
    });

    it('derives atrocity visibility and tunnel-reduced Sarajevo pressure into composite IVP', () => {
        const state = makeState({
  military: {
    sarajevo_tunnel_operational: true
  } as any,
});
        ensureInternationalVisibilityPressure(state);

        const ivp = updateInternationalVisibilityPressure(
            state,
            state.political.sarajevo_state as SarajevoState,
            0.8
        );

        expect(ivp.atrocity_visibility).toBeGreaterThan(0);
        expect(ivp.sarajevo_siege_visibility).toBeLessThan(0.5);
        expect(ivp.composite_ivp).toBeGreaterThan(0);
    });

    it('generates deterministic convoy decisions and applies divert effects', () => {
        const state = makeState();
        const edges: EdgeRecord[] = [
            { a: 'enclave_1', b: 'route_rs' } as EdgeRecord,
            { a: 'enclave_2', b: 'route_rs' } as EdgeRecord,
        ];

        const convoys = evaluateHumanitarianConvoys(state, edges);
        expect(convoys).toHaveLength(1);
        expect(convoys[0]?.route_faction).toBe('RS');

        state.military.pending_convoy_decisions = [{ ...convoys[0], decision: 'divert' }];
        applyHumanitarianConvoyDecisions(state);

        expect(state.military.general_supply_reserve?.RS).toBeCloseTo(40 + (convoys[0]?.supply_amount ?? 0) * 0.5);
        expect(state.military.general_supply_reserve?.RBiH).toBeCloseTo(20 + (convoys[0]?.supply_amount ?? 0) * 0.5);
        expect(state.military.pending_convoy_decisions).toEqual([]);
        expect(state.factions.find((f) => f.id === 'RS')?.patron_state?.diplomatic_isolation ?? 0).toBeGreaterThan(0);
    });

    it('applies smuggling allocation to ammo and food tracks and unlocks Sarajevo tunnel', () => {
        const state = makeState({
  military: {
    smuggling_allocation: {
                ENCL_test: { type: 'ammo', amount: 0.2 },
                sarajevo: { type: 'food', amount: 0.3 },
            }
  } as any,
});
        ensureInternationalVisibilityPressure(state);
        state.political.international_visibility_pressure!.enclave_humanitarian_pressure = 0.5;

        applySmugglingAllocation(state);
        maybeActivateSarajevoTunnel(state);

        expect(state.military.heavy_munitions_reserve?.RBiH).toBeGreaterThan(5);
        expect(state.political.international_visibility_pressure?.enclave_humanitarian_pressure).toBeLessThan(0.5);
        expect(state.military.sarajevo_tunnel_operational).toBe(true);
    });
});
