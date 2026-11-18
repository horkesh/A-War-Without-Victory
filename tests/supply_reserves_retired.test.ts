/**
 * Supply-reserve economy retired 2026-11-17 (Fable consult 6).
 *
 * Nothing in the turn pipeline writes or runs the reserve economy any more. The reserve,
 * smuggling and airdrop state fields themselves were removed from GameState in the
 * retired-field sweep (see tests/dead_state_fields_retired.test.ts).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { warPhases } from '../src/sim/turn_phases/war_phases.js';
import { SCENARIO_REGISTRY } from '../src/scenario/scenario_registry.js';
import { normalizeScenario } from '../src/scenario/scenario_loader.js';

describe('supply-reserve economy retired (Fable consult 6)', () => {
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
