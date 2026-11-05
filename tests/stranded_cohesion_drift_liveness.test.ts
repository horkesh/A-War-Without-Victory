import { afterEach, describe, expect, it } from 'vitest';

import {
    DISSOLUTION_ABSOLUTE_FLOOR,
    DISSOLUTION_COHESION_THRESHOLD,
    dissolveCombatIneffectiveBrigades,
} from '../src/sim/combat/brigade_dissolution.js';
import { getFactionCohesionCeiling, getFactionCohesionFloor } from '../src/sim/combat/faction_progression.js';
import { runCohesionDrift } from '../src/sim/combat/cohesion_drift.js';
import { runMoraleDrift } from '../src/sim/combat/morale_drift.js';
import { warPhases } from '../src/sim/turn_phases/war_phases.js';
import type { FormationState, GameState } from '../src/state/game_state.js';

const ORIGINAL_MORALE_OVERRIDE = process.env.MORALE_OVERRIDE_ENABLED;
afterEach(() => {
    if (ORIGINAL_MORALE_OVERRIDE === undefined) delete process.env.MORALE_OVERRIDE_ENABLED;
    else process.env.MORALE_OVERRIDE_ENABLED = ORIGINAL_MORALE_OVERRIDE;
});

function brigade(id: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id,
        name: id,
        kind: 'brigade',
        status: 'active',
        faction: 'RBiH',
        corps_id: 'arbih_3rd_corps',
        location_osid: 'op:test:pocket',
        personnel: 1500,
        strength: 1500,
        morale: 60,
        cohesion: 60,
        officer_quality: 0.7,
        composition: {
            tanks: 0,
            artillery: 0,
            tank_condition: { operational: 0, degraded: 0, non_operational: 0 },
            artillery_condition: { operational: 0, degraded: 0, non_operational: 0 },
        },
        ...overrides,
    } as FormationState;
}

function stateWith(formations: Record<string, FormationState>, turn = 157): GameState {
    return {
        schema_version: 0,
        meta: { turn, phase: 'war', seed: 'stranded-cohesion-liveness' },
        factions: [{ id: 'RBiH' }, { id: 'RS' }],
        military: {
            formations,
            corps_command: {},
            corps_front_sectors: {},
            brigade_movement_orders: {},
            brigade_movement_state: {},
        },
        political: { political_controllers: { 'op:test:pocket': 'RS' } },
        displacement: {},
    } as unknown as GameState;
}

function cohesionDriftStep() {
    const step = warPhases.find((candidate) => candidate.name === 'cohesion-drift');
    if (!step) throw new Error('cohesion-drift step missing');
    return step;
}

describe('stranded cohesion liveness repair', () => {
    it('does not let the RBiH floor erase the stranded receipt decrement', () => {
        const holding = brigade('holding', { cohesion: 56, stranded_status: 'holding' });
        const state = stateWith({ holding });
        expect(getFactionCohesionFloor('RBiH', 157)).toBe(62);
        runCohesionDrift(state, [], ['holding']);
        expect(holding.cohesion).toBeCloseTo(56.03, 5);
    });

    it('applies negative ambient drift to RS recipients below the old floor', () => {
        const holding = brigade('holding', {
            faction: 'RS',
            cohesion: 20,
            stranded_status: 'holding',
        });
        const state = stateWith({ holding });
        runCohesionDrift(state, [], ['holding']);
        expect(holding.cohesion).toBeCloseTo(19.65, 5);
    });

    it('preserves old floor behavior when the current-pass receipt is absent or empty', () => {
        for (const receipt of [undefined, [] as string[]]) {
            const holding = brigade('holding', { cohesion: 56, stranded_status: 'holding' });
            const state = stateWith({ holding });
            if (receipt === undefined) runCohesionDrift(state, []);
            else runCohesionDrift(state, [], receipt);
            expect(holding.cohesion).toBe(62);
        }
    });

    it('does not turn a stale holding flag alone into an exception', () => {
        const stale = brigade('stale', { cohesion: 56, stranded_status: 'holding' });
        runCohesionDrift(stateWith({ stale }), []);
        expect(stale.cohesion).toBe(62);
    });

    it('wires the real war-phase step to the current lifecycle report still_holding receipt', () => {
        const holding = brigade('holding', { cohesion: 56, stranded_status: 'holding' });
        const state = stateWith({ holding });
        const report = {
            stranded_brigade_lifecycle: { updated: 1, still_holding: ['holding'] },
            attack_resolution_osid: { engaged_formation_ids: [] },
        };
        cohesionDriftStep().run({ state, report, input: {} } as any);
        expect(holding.cohesion).toBeCloseTo(56.03, 5);
    });

    it('keeps engaged formations fully skipped', () => {
        const holding = brigade('holding', { cohesion: 56, stranded_status: 'holding' });
        const state = stateWith({ holding });
        runCohesionDrift(state, ['holding'], ['holding']);
        expect(holding.cohesion).toBe(56);
    });

    it('keeps active/queued, tagged-enclave, newly-stranded and reconnected non-receipts on old behavior', () => {
        const cases = [
            brigade('active_owned', { cohesion: 56, stranded_status: 'none' }),
            brigade('queued_owned', { cohesion: 56, stranded_status: 'none' }),
            brigade('tagged_enclave', { cohesion: 56, tags: ['enclave'] }),
            brigade('newly_stranded', { cohesion: 56, stranded_status: 'holding' }),
            brigade('reconnected', { cohesion: 56, stranded_status: 'reconnected' }),
        ];
        const formations = Object.fromEntries(cases.map((f) => [f.id, f]));
        const state = stateWith(formations);
        runCohesionDrift(state, [], ['some_other_current_receipt']);
        for (const f of cases) expect(f.cohesion).toBe(62);
    });

    it('retains positive and negative ambient recovery with bounds and ceiling', () => {
        const positive = brigade('positive', { cohesion: 100, stranded_status: 'holding' });
        const negative = brigade('negative', { faction: 'RS', cohesion: 0, stranded_status: 'holding' });
        const state = stateWith({ positive, negative });
        runCohesionDrift(state, [], ['positive', 'negative']);
        expect(positive.cohesion).toBe(100);
        expect(negative.cohesion).toBe(0);
    });

    it('is insertion-order independent and does not persist the receipt into the next turn', () => {
        const a = brigade('a', { cohesion: 56, stranded_status: 'holding' });
        const b = brigade('b', { cohesion: 56, stranded_status: 'holding' });
        const state = stateWith({ a, b });
        runCohesionDrift(state, [], ['b', 'a']);
        expect(a.cohesion).toBeCloseTo(56.03, 5);
        expect(b.cohesion).toBeCloseTo(56.03, 5);
        runCohesionDrift(state, [], ['a']);
        expect(a.cohesion).toBeCloseTo(56.06, 5);
        expect(b.cohesion).toBe(62);
    });

    it('lets a qualifying low-strength stranded unit meet two existing dissolution criteria', () => {
        process.env.MORALE_OVERRIDE_ENABLED = 'false';
        const low = brigade('low', {
            personnel: DISSOLUTION_ABSOLUTE_FLOOR - 50,
            cohesion: DISSOLUTION_COHESION_THRESHOLD - 10,
            morale: 60,
            stranded_status: 'holding',
        });
        const survivor = brigade('survivor', { personnel: 700, cohesion: 10, morale: 50 });
        const state = stateWith({ low, survivor });
        runCohesionDrift(state, [], ['low']);
        runMoraleDrift(state, []);
        expect(low.cohesion).toBeLessThanOrEqual(DISSOLUTION_COHESION_THRESHOLD);
        expect(getFactionCohesionCeiling('RBiH', 157)).toBeGreaterThanOrEqual(low.cohesion ?? 0);
        const report = dissolveCombatIneffectiveBrigades(state);
        expect(report.dissolved_brigades.map((entry) => entry.id)).toContain('low');
        expect(report.dissolved_brigades.map((entry) => entry.id)).not.toContain('survivor');
    });
});
