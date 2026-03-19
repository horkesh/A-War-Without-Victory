/**
 * Tests for the mobilization buildup phase between RBiH-HRHB alliance breakdown
 * and open combat. When alliance drops to <= ALLIED_THRESHOLD, front edges appear
 * but combat is suppressed for MOBILIZATION_DURATION_TURNS (4 turns).
 */

import { describe, it, expect } from 'vitest';
import {
    ALLIED_THRESHOLD,
    ensureRbihHrhbState,
    HOSTILE_THRESHOLD,
    isRbihHrhbCombatEnabled,
    isRbihHrhbMobilizing,
    MOBILIZATION_DURATION_TURNS,
    updateAllianceValue
} from '../src/sim/early_war/alliance_update.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

/** Minimal GameState for mobilization tests. */
function makeState(allianceValue: number, turn: number = 30): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn,
            seed: 'mobilization-test',
            phase: 'war',
            referendum_held: true,
            war_start_turn: 1,
            rbih_hrhb_war_earliest_turn: 26
        },
        factions: [
            {
                id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [], supply_sources: [], declared: false, declaration_turn: null
            },
            {
                id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 1
            },
            {
                id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 2,
                patron_state: { material_support_level: 0.5, diplomatic_isolation: 0.2, constraint_severity: 0.3, patron_commitment: 0.5, last_updated: 5 }
            }
        ],
        political: {
            war_alliance_rbih_hrhb: allianceValue
        } as any,
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {}
        } as any,
    } as unknown as GameState;
}

describe('alliance mobilization phase', () => {
    it('mobilization_started_turn is set when alliance first drops below ALLIED_THRESHOLD', () => {
        // Start just above threshold with strong patron pressure to push below
        const state = makeState(ALLIED_THRESHOLD + 0.005, 30);
        ensureRbihHrhbState(state);
        const hrhb = state.factions.find(f => f.id === 'HRHB')!;
        hrhb.patron_state!.patron_commitment = 1.0;

        expect(state.political.rbih_hrhb_state!.mobilization_started_turn).toBeNull();

        const report = updateAllianceValue(state);

        // Alliance should have dropped to or below ALLIED_THRESHOLD
        expect(report.new_value).toBeLessThanOrEqual(ALLIED_THRESHOLD);
        expect(state.political.rbih_hrhb_state!.mobilization_started_turn).toBe(30);
    });

    it('isRbihHrhbMobilizing returns true during first 4 turns after mobilization starts', () => {
        const state = makeState(ALLIED_THRESHOLD - 0.01, 30);
        ensureRbihHrhbState(state);
        state.political.rbih_hrhb_state!.mobilization_started_turn = 30;

        // Turn 30: mobilization just started (0 turns elapsed)
        state.meta.turn = 30;
        expect(isRbihHrhbMobilizing(state)).toBe(true);

        // Turn 31: 1 turn elapsed
        state.meta.turn = 31;
        expect(isRbihHrhbMobilizing(state)).toBe(true);

        // Turn 33: 3 turns elapsed (still mobilizing)
        state.meta.turn = 33;
        expect(isRbihHrhbMobilizing(state)).toBe(true);
    });

    it('isRbihHrhbMobilizing returns false after 4 turns', () => {
        const state = makeState(ALLIED_THRESHOLD - 0.01, 34);
        ensureRbihHrhbState(state);
        state.political.rbih_hrhb_state!.mobilization_started_turn = 30;

        // Turn 34: exactly 4 turns elapsed — mobilization complete
        expect(isRbihHrhbMobilizing(state)).toBe(false);

        // Turn 35: 5 turns elapsed
        state.meta.turn = 35;
        expect(isRbihHrhbMobilizing(state)).toBe(false);
    });

    it('isRbihHrhbCombatEnabled returns false during mobilization', () => {
        const state = makeState(ALLIED_THRESHOLD - 0.05, 31);
        ensureRbihHrhbState(state);
        state.political.rbih_hrhb_state!.mobilization_started_turn = 30;

        // 1 turn elapsed — combat not yet enabled
        expect(isRbihHrhbCombatEnabled(state)).toBe(false);

        // 3 turns elapsed — still not enabled
        state.meta.turn = 33;
        expect(isRbihHrhbCombatEnabled(state)).toBe(false);
    });

    it('isRbihHrhbCombatEnabled returns true after mobilization expires', () => {
        const state = makeState(ALLIED_THRESHOLD - 0.05, 34);
        ensureRbihHrhbState(state);
        state.political.rbih_hrhb_state!.mobilization_started_turn = 30;

        // 4 turns elapsed — combat enabled
        expect(isRbihHrhbCombatEnabled(state)).toBe(true);
    });

    it('isRbihHrhbCombatEnabled returns true immediately when alliance <= HOSTILE_THRESHOLD', () => {
        // Alliance at hostile threshold — combat enabled even if mobilization just started
        const state = makeState(HOSTILE_THRESHOLD, 30);
        ensureRbihHrhbState(state);
        state.political.rbih_hrhb_state!.mobilization_started_turn = 30;

        expect(isRbihHrhbCombatEnabled(state)).toBe(true);
    });

    it('mobilization_started_turn is not reset if alliance recovers above ALLIED_THRESHOLD then drops again', () => {
        const state = makeState(ALLIED_THRESHOLD + 0.005, 30);
        ensureRbihHrhbState(state);
        const hrhb = state.factions.find(f => f.id === 'HRHB')!;
        hrhb.patron_state!.patron_commitment = 1.0;

        // First drop below threshold
        updateAllianceValue(state);
        expect(state.political.rbih_hrhb_state!.mobilization_started_turn).toBe(30);

        // Manually push alliance back above threshold (simulating ceasefire recovery)
        state.political.war_alliance_rbih_hrhb = ALLIED_THRESHOLD + 0.10;
        state.meta.turn = 35;

        // Drop again — mobilization_started_turn should NOT be reset
        hrhb.patron_state!.patron_commitment = 1.0;
        state.political.war_alliance_rbih_hrhb = ALLIED_THRESHOLD + 0.005;
        updateAllianceValue(state);
        expect(state.political.war_alliance_rbih_hrhb).toBeLessThanOrEqual(ALLIED_THRESHOLD);
        expect(state.political.rbih_hrhb_state!.mobilization_started_turn).toBe(30);
    });

    it('updateAllianceValue report includes mobilizing=true during mobilization', () => {
        const state = makeState(ALLIED_THRESHOLD + 0.005, 30);
        ensureRbihHrhbState(state);
        const hrhb = state.factions.find(f => f.id === 'HRHB')!;
        hrhb.patron_state!.patron_commitment = 1.0;

        const report = updateAllianceValue(state);
        expect(report.mobilizing).toBe(true);
    });

    it('updateAllianceValue report includes mobilizing=false when still allied', () => {
        const state = makeState(0.50, 30);
        ensureRbihHrhbState(state);

        const report = updateAllianceValue(state);
        expect(report.mobilizing).toBe(false);
    });

    it('ensureRbihHrhbState initializes mobilization_started_turn as null', () => {
        const state = makeState(0.50, 10);
        ensureRbihHrhbState(state);
        expect(state.political.rbih_hrhb_state!.mobilization_started_turn).toBeNull();
    });

    it('isRbihHrhbMobilizing returns false when still allied', () => {
        const state = makeState(ALLIED_THRESHOLD + 0.10, 30);
        ensureRbihHrhbState(state);
        expect(isRbihHrhbMobilizing(state)).toBe(false);
    });

    it('isRbihHrhbCombatEnabled returns false when still allied', () => {
        const state = makeState(ALLIED_THRESHOLD + 0.10, 30);
        ensureRbihHrhbState(state);
        expect(isRbihHrhbCombatEnabled(state)).toBe(false);
    });

    it('MOBILIZATION_DURATION_TURNS is 4', () => {
        expect(MOBILIZATION_DURATION_TURNS).toBe(4);
    });
});
