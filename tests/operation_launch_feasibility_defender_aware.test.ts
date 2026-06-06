import { describe, expect, it } from 'vitest';
import type { FormationState, GameState } from '../src/state/game_state.js';
import type { SupplyStateByOsidReport } from '../src/state/supply_state_derivation.js';
import {
    checkLaunchFeasibility,
    evaluateLaunchFeasibility,
} from '../src/sim/combat/sector_offensive_launch_helpers.js';
import { setForestOsidSet, setUrbanOsidSet } from '../src/sim/combat/combat_math.js';

function makeBrigade(overrides: Partial<FormationState> & { id: string; faction: string }): FormationState {
    const { id, faction, ...rest } = overrides;
    return {
        id,
        faction,
        kind: 'brigade',
        name: id,
        created_turn: 1,
        status: 'active',
        assignment: null,
        personnel: 1800,
        cohesion: 80,
        morale: 70,
        experience: 0.5,
        posture: 'defend',
        location_osid: 'op:test:front',
        corps_id: faction === 'RS' ? 'rs_corps' : 'rbih_corps',
        ...rest,
    } as FormationState;
}

function makeState(): GameState {
    const attackers = [
        makeBrigade({ id: 'rs_atk_b', faction: 'RS', location_osid: 'op:test:front', posture: 'attack', personnel: 1400 }),
        makeBrigade({ id: 'rs_atk_a', faction: 'RS', location_osid: 'op:test:front', posture: 'attack', personnel: 1400 }),
    ];
    const defenders = [
        makeBrigade({
            id: 'rbih_def_a',
            faction: 'RBiH',
            location_osid: 'op:test:objective',
            posture: 'dig_in',
            personnel: 2600,
            cohesion: 90,
            morale: 85,
            entrenchment_turns: 6,
        }),
    ];
    const formations: Record<string, FormationState> = {};
    for (const f of [...attackers, ...defenders]) formations[f.id] = f;
    return {
        meta: { turn: 12, phase: 'war' },
        political: {
            political_controllers: {
                'op:test:front': 'RS',
                'op:test:objective': 'RBiH',
            },
        },
        military: {
            formations,
            corps_command: {
                rs_corps: { stance: 'offensive', active_operations: [] },
                rbih_corps: { stance: 'defensive', active_operations: [] },
            },
            corps_front_sectors: {
                rbih_sector: {
                    sector_id: 'rbih_sector',
                    corps_id: 'rbih_corps',
                    faction: 'RBiH',
                    opposing_factions: ['RS'],
                    edge_ids: [],
                    sub_segments: [{
                        id: 'rbih_sub',
                        edge_ids: [],
                        friendly_osids: ['op:test:objective'],
                        enemy_osids: ['op:test:front'],
                        coverage_length: 1,
                    }],
                    length_edges: 1,
                    territory_osids: ['op:test:objective'],
                    assigned_brigade_ids: defenders.map((d) => d.id),
                    reserve_brigade_ids: [],
                    density: 1,
                    threat_ratio: 1,
                    defensive_power: 1,
                    sector_stance: 'defend',
                    stance_source: 'bot',
                },
            },
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        },
    } as unknown as GameState;
}

function criticalAttackerSupply(): SupplyStateByOsidReport {
    return {
        factions: [
            {
                faction_id: 'RS',
                by_osid: [{ osid: 'op:test:front', state: 'critical' }],
            },
            {
                faction_id: 'RBiH',
                by_osid: [{ osid: 'op:test:objective', state: 'adequate' }],
            },
        ],
    } as unknown as SupplyStateByOsidReport;
}

describe('operation launch feasibility uses defender-aware combat power', () => {
    it('returns the shared feasibility truth and preserves boolean compatibility', () => {
        setForestOsidSet(new Set<string>(['op:test:objective']));
        setUrbanOsidSet(new Set<string>());
        const state = makeState();

        const result = evaluateLaunchFeasibility(
            state,
            ['rs_atk_b', 'rs_atk_a'],
            ['op:test:objective'],
            'RS',
            criticalAttackerSupply(),
            { 'op:test:objective': 1.3 },
        );

        expect(result.feasible).toBe(false);
        expect(result.blocker).toBe('defender_power_too_high');
        expect(result.attackerPower).toBeGreaterThan(0);
        expect(result.defenderPower).toBeGreaterThan(result.attackerPower);
        // COMBAT-P14: the reported ratio is now the return-fire-adjusted ratio
        // (rawRatio ÷ getDefensiveFireMult ∈ [1.0, 1.8]). It is therefore ≤ the raw
        // attackerPower/defenderPower and remains positive. With this defender's
        // (default-composition) light return-fire the reduction is small but real.
        const rawRatio = result.attackerPower / result.defenderPower;
        expect(result.ratio).toBeGreaterThan(0);
        expect(result.ratio).toBeLessThanOrEqual(rawRatio + 1e-9);
        expect(result.ratio).toBeGreaterThanOrEqual(rawRatio / 1.8 - 1e-9);
        expect(result.defenderPowerById?.[0]?.breakdown.power).toBeCloseTo(result.defenderPower, 10);
        expect(result.defenderPowerById?.[0]?.breakdown.base).toBeGreaterThan(0);
        expect(result.defenderPowerById?.[0]?.breakdown.entrenchmentMult).toBeGreaterThan(1);
        expect(result.defenderPowerById?.[0]?.breakdown.finalEnvMult).toBeGreaterThan(1);
        expect(checkLaunchFeasibility(
            state,
            ['rs_atk_b', 'rs_atk_a'],
            ['op:test:objective'],
            'RS',
            criticalAttackerSupply(),
            { 'op:test:objective': 1.3 },
        )).toBe(false);
    });

    it('is stable under attacker and objective input ordering', () => {
        setForestOsidSet(new Set<string>(['op:test:objective']));
        setUrbanOsidSet(new Set<string>());
        const state = makeState();

        const a = evaluateLaunchFeasibility(
            state,
            ['rs_atk_b', 'rs_atk_a'],
            ['op:test:objective'],
            'RS',
            criticalAttackerSupply(),
            { 'op:test:objective': 1.3 },
        );
        const b = evaluateLaunchFeasibility(
            state,
            ['rs_atk_a', 'rs_atk_b'],
            ['op:test:objective'],
            'RS',
            criticalAttackerSupply(),
            { 'op:test:objective': 1.3 },
        );

        expect(b).toEqual(a);
    });
});
