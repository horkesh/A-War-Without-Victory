import { describe, expect, it } from 'vitest';
import { EMBARGO_PHASE_CAPS } from '../src/state/embargo.js';
import { updateSupplyReserves } from '../src/state/supply_reserves.js';
import { PATRON_AID_GENERAL_FRACTION, PATRON_AID_SCALE } from '../src/state/supply_reserve_constants.js';
import type { GameState } from '../src/state/game_state.js';

function makeState(flags: Record<string, boolean>): GameState {
    return {
        schema_version: 12,
        meta: { turn: 10, seed: 'embargo-supply-test', phase: 'war', supply_reserves_enabled: true },
        factions: [
            { id: 'RBiH', supply_sources: [], patron_state: { material_support_level: 1, diplomatic_isolation: 0, constraint_severity: 0, patron_commitment: 1, last_updated: 10 } },
            { id: 'RS', supply_sources: [], patron_state: { material_support_level: 1, diplomatic_isolation: 0, constraint_severity: 0, patron_commitment: 1, last_updated: 10 } },
            { id: 'HRHB', supply_sources: [], patron_state: { material_support_level: 1, diplomatic_isolation: 0, constraint_severity: 0, patron_commitment: 1, last_updated: 10 } },
        ],
        military: {
            formations: {},
            event_flags: flags,
            general_supply_reserve: { RBiH: 0, RS: 0, HRHB: 0 },
            heavy_munitions_reserve: { RBiH: 0, RS: 0, HRHB: 0 },
        } as any,
        political: {} as any,
        displacement: {} as any,
    } as unknown as GameState;
}

describe('embargo phase caps in supply reserves', () => {
    it('bounds RBiH patron supply by active embargo phase', () => {
        const active = makeState({ arms_embargo_active: true });
        updateSupplyReserves(active, { RBiH: 0, RS: 0, HRHB: 0 });

        const lifted = makeState({ arms_embargo_active: true, embargo_lifted: true });
        updateSupplyReserves(lifted, { RBiH: 0, RS: 0, HRHB: 0 });

        const rbihBaseGeneralAid = PATRON_AID_SCALE * 0.3 * PATRON_AID_GENERAL_FRACTION;
        expect(active.military.general_supply_reserve!.RBiH).toBeCloseTo(
            rbihBaseGeneralAid * EMBARGO_PHASE_CAPS.phase_1_full.RBiH.general,
            5
        );
        expect(lifted.military.general_supply_reserve!.RBiH).toBeCloseTo(
            rbihBaseGeneralAid * EMBARGO_PHASE_CAPS.phase_4_unenforced.RBiH.general,
            5
        );
        expect(lifted.military.general_supply_reserve!.RBiH).toBeGreaterThan(active.military.general_supply_reserve!.RBiH);
    });

    it('does not change RS or HRHB patron trajectories across RBiH embargo phases', () => {
        const active = makeState({ arms_embargo_active: true });
        updateSupplyReserves(active, { RBiH: 0, RS: 0, HRHB: 0 });

        const lifted = makeState({ arms_embargo_active: true, embargo_lifted: true });
        updateSupplyReserves(lifted, { RBiH: 0, RS: 0, HRHB: 0 });

        expect(lifted.military.general_supply_reserve!.RS).toBeCloseTo(active.military.general_supply_reserve!.RS, 5);
        expect(lifted.military.heavy_munitions_reserve!.RS).toBeCloseTo(active.military.heavy_munitions_reserve!.RS, 5);
        expect(lifted.military.general_supply_reserve!.HRHB).toBeCloseTo(active.military.general_supply_reserve!.HRHB, 5);
        expect(lifted.military.heavy_munitions_reserve!.HRHB).toBeCloseTo(active.military.heavy_munitions_reserve!.HRHB, 5);
    });
});
