/**
 * Supply-reserve economy retired 2026-11-17 (Fable consult 6).
 *
 * The reserve fields stay optional, validated and compatibility-only so an old save that
 * carries them still loads; nothing in the turn pipeline writes or runs them any more.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { FactionState, GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import { warPhases } from '../src/sim/turn_phases/war_phases.js';
import { SCENARIO_REGISTRY } from '../src/scenario/scenario_registry.js';
import { normalizeScenario } from '../src/scenario/scenario_loader.js';

function makeFaction(id: FactionState['id']): FactionState {
    return {
        id,
        profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
        areasOfResponsibility: [],
        supply_sources: [],
    };
}

/** A save written while the reserve economy still ran (flag on, every reserve field present). */
function makeOldReserveSave(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 40,
            seed: 'supply-reserves-retired-test',
            phase: 'war',
            supply_reserves_enabled: true,
        } as GameState['meta'],
        factions: [makeFaction('HRHB'), makeFaction('RBiH'), makeFaction('RS')],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            general_supply_reserve: { HRHB: 70, RBiH: 45, RS: 90 },
            heavy_munitions_reserve: { HRHB: 50, RBiH: 15, RS: 100 },
            smuggling_routes: [
                { id: 'rbih_adriatic_coast', capacity: 0, disrupted: false, active_turns: 0 },
                { id: 'rs_belgrade_pipeline', capacity: 40, disrupted: true, active_turns: 12 },
            ],
            airdrop_allocation: { gorazde: 1.5, srebrenica: 0.5 },
            smuggling_allocation: { gorazde: { type: 'ammo', amount: 0.2 } },
        },
        political: {
            political_controllers: {},
        },
        displacement: {},
    } as unknown as GameState;
}

describe('supply-reserve economy retired (Fable consult 6)', () => {
    it('an old save carrying every reserve field still loads, with the fields intact', () => {
        const old = makeOldReserveSave();
        const loaded = deserializeState(serializeState(old));

        expect(loaded.meta.supply_reserves_enabled).toBe(true);
        expect(loaded.military.general_supply_reserve).toEqual({ HRHB: 70, RBiH: 45, RS: 90 });
        expect(loaded.military.heavy_munitions_reserve).toEqual({ HRHB: 50, RBiH: 15, RS: 100 });
        expect(loaded.military.smuggling_routes).toEqual(old.military.smuggling_routes);
        expect(loaded.military.airdrop_allocation).toEqual({ gorazde: 1.5, srebrenica: 0.5 });
        expect(loaded.military.smuggling_allocation).toEqual({ gorazde: { type: 'ammo', amount: 0.2 } });
    });

    it('a save without any reserve field loads too (the fields are optional)', () => {
        const old = makeOldReserveSave();
        delete (old.meta as { supply_reserves_enabled?: boolean }).supply_reserves_enabled;
        delete old.military.general_supply_reserve;
        delete old.military.heavy_munitions_reserve;
        delete old.military.smuggling_routes;
        delete old.military.airdrop_allocation;
        delete old.military.smuggling_allocation;

        const loaded = deserializeState(serializeState(old));

        expect(loaded.meta.supply_reserves_enabled).toBeUndefined();
        expect(loaded.military.general_supply_reserve).toBeUndefined();
        expect(loaded.military.smuggling_routes).toBeUndefined();
    });

    it('the retired steps are absent from the war-phase step list', () => {
        const names = warPhases.map((phase) => phase.name);
        expect(names).not.toContain('compute-supply-reserves');
        expect(names).not.toContain('update-smuggling-routes');
        // Enclave resilience (Phase C) and the embargo profile step keep running.
        expect(names).toContain('enclave-resilience');
        expect(names).toContain('update-embargo-profiles');
    });

    it('the scenario loader ignores a supply_reserves_enabled key (a started game never has reserves)', () => {
        const raw = JSON.parse(readFileSync(join(process.cwd(), 'data/scenarios/apr1992_definitive_188w.json')).toString()) as Record<string, unknown>;
        const normalized = normalizeScenario({ ...raw, supply_reserves_enabled: true }) as unknown as Record<string, unknown>;
        expect(normalized.supply_reserves_enabled).toBeUndefined();
        for (const entry of SCENARIO_REGISTRY) {
            const path = join(process.cwd(), 'data/scenarios', `${entry.key}.json`);
            if (!existsSync(path)) continue;
            const scenario = JSON.parse(readFileSync(path).toString()) as Record<string, unknown>;
            if (entry.key.startsWith('apr1992')) {
                expect(scenario.supply_reserves_enabled, entry.key).toBeUndefined();
            }
        }
    });

    it('the retired modules and the jan1993_to_dayton scenario are gone', () => {
        for (const rel of [
            'src/state/supply_reserves.ts',
            'src/state/supply_reserve_constants.ts',
            'src/sim/economy/smuggling_routes.ts',
            'src/ui/map/components/EconomyPanel.tsx',
            'data/scenarios/jan1993_to_dayton.json',
        ]) {
            expect(existsSync(join(process.cwd(), rel)), rel).toBe(false);
        }
        expect(SCENARIO_REGISTRY.some((entry) => entry.key === 'jan1993_to_dayton')).toBe(false);
    });
});
