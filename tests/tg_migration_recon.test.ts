/**
 * TG migration reconciliation tests (ADR-0005 Phase 4).
 *
 * Covers the four edge cases that make TGs degenerate when the flags are on:
 *   1. PHANTOM-ANCHOR — resolveTgAnchor never anchors a JNA phantom; an all-phantom
 *      axis (Op Prsten ilijas_ring) resolves to null → no TG (legacy path).
 *   2. DUAL-ANCHOR de-confliction — a reserved anchor forces the second op to its
 *      next-best persistent anchor (or defer when none is free). Deterministic.
 *   3. PHANTOM-OP policy alignment — Op Prsten's ilijas_ring brigades are all in the
 *      phantom registry (so they classify as phantoms); Op Visegrad has a persistent
 *      resident anchor available.
 *   4. TERRITORY-REVERT — hasFriendlyNonTgHolder gates the dissolved-TG ghost-hold
 *      revert: true when a friendly non-TG brigade is 1-hop adjacent, false otherwise.
 *
 * Determinism: all helpers are pure / sorted-iteration; no flags are mutated here.
 */

import { describe, expect, it, vi } from 'vitest';
import type { FormationState, GameState, MilitaryState, TacticalGroup } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import {
    isPhantomBrigade,
    resolveTgAnchor,
    collectActiveAnchorIds,
} from '../src/sim/combat/tactical_group_anchor.js';
import { hasFriendlyNonTgHolder } from '../src/sim/combat/attack_resolution_osid.js';
import { _ALL_PHANTOM_DEFS } from '../src/sim/combat/jna_phantom_brigades.js';

function brigade(id: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id, faction: 'RS', name: id, created_turn: 0, status: 'active', assignment: null,
        corps_id: 'vrs_corp', location_osid: 'op:test:home',
        personnel: 1500, cohesion: 80,
        composition: { infantry: 1500, tanks: 0, artillery: 0, aa_systems: 0 },
        ...overrides,
    } as FormationState;
}

/** A spawned JNA phantom carries withdrawal_turn + kind 'jna_phantom'. */
function phantom(id: string, overrides: Partial<FormationState> = {}): FormationState {
    return brigade(id, {
        kind: 'jna_phantom' as FormationState['kind'],
        withdrawal_turn: 6,
        personnel: 2000,
        composition: { infantry: 1200, tanks: 20, artillery: 18, aa_systems: 2 } as FormationState['composition'],
        ...overrides,
    });
}

function stateWith(brigades: FormationState[], tgs: Record<string, TacticalGroup> = {}, turn = 5): GameState {
    const formations: Record<string, FormationState> = {};
    for (const b of brigades) formations[b.id] = b;
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, seed: 'tg-recon-fixture', phase: 'war', player_faction: 'RS' } as any,
        political: { political_controllers: {}, control_events: [] } as any,
        military: {
            formations,
            tactical_groups: tgs,
            war_front_edges_osid: [],
        } as Partial<MilitaryState> as MilitaryState,
    } as GameState;
}

// ── Fix 1: phantom-anchor ────────────────────────────────────────────────────

describe('Phase 4 Fix 1 — phantom anchors never anchor a TG', () => {
    it('isPhantomBrigade detects registry id, withdrawal_turn, and kind tag', () => {
        const registryId = _ALL_PHANTOM_DEFS[0].id as string;
        expect(isPhantomBrigade(brigade(registryId))).toBe(true);          // by registry id
        expect(isPhantomBrigade(phantom('jna_made_up'))).toBe(true);       // by withdrawal_turn + kind
        expect(isPhantomBrigade(brigade('rs_real'))).toBe(false);          // persistent brigade
        expect(isPhantomBrigade(undefined)).toBe(false);
    });

    it('prefers a persistent brigade over a higher-power phantom (Op Visegrad shape)', () => {
        // Phantom has more personnel + heavy equipment (higher basePower) but would evaporate.
        const state = stateWith([
            phantom('jna_uzice_corps_tg'),
            brigade('rs_visegrad_brigade', { personnel: 1400 }),
        ]);
        const anchor = resolveTgAnchor(
            state,
            { assigned_brigades: ['jna_uzice_corps_tg', 'rs_visegrad_brigade'] },
            new Set(),
        );
        expect(anchor).toBe('rs_visegrad_brigade');
    });

    it('returns null for an all-phantom axis (Op Prsten ilijas_ring) → no TG, legacy path', () => {
        const state = stateWith([
            phantom('jna_ilijas_to_tg'),
            phantom('jna_ilijas_garrison_det'),
            phantom('jna_ilijas_north_to_tg'),
        ]);
        const anchor = resolveTgAnchor(
            state,
            { assigned_brigades: ['jna_ilijas_to_tg', 'jna_ilijas_garrison_det', 'jna_ilijas_north_to_tg'] },
            new Set(),
        );
        expect(anchor).toBeNull();
    });
});

// ── Fix 2: dual-anchor de-confliction ────────────────────────────────────────

describe('Phase 4 Fix 2 — dual-anchor de-confliction', () => {
    it('reserved anchor forces the second op to its next-best persistent anchor', () => {
        const state = stateWith([
            brigade('rs_1st_bratunac', { personnel: 2000 }),  // highest power — both ops want it
            brigade('rs_5th_podrinje', { personnel: 1500 }),
        ]);
        const reserved = new Set<string>(['rs_1st_bratunac']); // first op already claimed it
        const anchor = resolveTgAnchor(
            state,
            { assigned_brigades: ['rs_1st_bratunac', 'rs_5th_podrinje'] },
            reserved,
        );
        expect(anchor).toBe('rs_5th_podrinje');
    });

    it('defers (null) when every candidate is reserved', () => {
        const state = stateWith([brigade('rs_1st_bratunac'), brigade('rs_5th_podrinje')]);
        const reserved = new Set<string>(['rs_1st_bratunac', 'rs_5th_podrinje']);
        const anchor = resolveTgAnchor(
            state,
            { assigned_brigades: ['rs_1st_bratunac', 'rs_5th_podrinje'] },
            reserved,
        );
        expect(anchor).toBeNull();
    });

    it('is deterministic: highest basePower wins, id strictCompare breaks ties', () => {
        const state = stateWith([
            brigade('rs_b', { personnel: 1500 }),
            brigade('rs_a', { personnel: 1500 }), // equal power → id tiebreak picks rs_a
        ]);
        const anchor = resolveTgAnchor(state, { assigned_brigades: ['rs_b', 'rs_a'] }, new Set());
        expect(anchor).toBe('rs_a');
    });

    it('collectActiveAnchorIds seeds the reservation set from live TGs (excludes dissolved)', () => {
        const tgs: Record<string, TacticalGroup> = {
            'tg:vrs_corp:OpA:rs_1st_bratunac': {
                id: 'tg:vrs_corp:OpA:rs_1st_bratunac', corps_id: 'vrs_corp', op_id: 'OpA',
                anchor_brigade_id: 'rs_1st_bratunac', donor_contributions: [],
                location_osid: 'op:test:home', status: 'engaged', formed_on_turn: 1, cohesion: 90,
            },
            'tg:vrs_corp:OpDead:rs_other': {
                id: 'tg:vrs_corp:OpDead:rs_other', corps_id: 'vrs_corp', op_id: 'OpDead',
                anchor_brigade_id: 'rs_other', donor_contributions: [],
                location_osid: 'op:test:home', status: 'dissolved', formed_on_turn: 1, cohesion: 0,
            },
        };
        const state = stateWith([brigade('rs_1st_bratunac'), brigade('rs_other')], tgs);
        const reserved = collectActiveAnchorIds(state);
        expect(reserved.has('rs_1st_bratunac')).toBe(true);
        expect(reserved.has('rs_other')).toBe(false); // dissolved TG anchor is free
    });
});

// ── Fix 3: phantom-op policy alignment (data assertions) ──────────────────────

describe('Phase 4 Fix 3 — registry classifies the Op Prsten ilijas_ring brigades', () => {
    it('all three ilijas_ring brigades are in the phantom registry', () => {
        const ids = new Set(_ALL_PHANTOM_DEFS.map(d => d.id as string));
        for (const id of ['jna_ilijas_to_tg', 'jna_ilijas_garrison_det', 'jna_ilijas_north_to_tg']) {
            expect(ids.has(id)).toBe(true);
        }
    });
});

// ── Fix 4: territory-revert ghost-hold gate ──────────────────────────────────

describe('Phase 4 Fix 4 — hasFriendlyNonTgHolder gates the dissolved-TG revert', () => {
    const adjacency = new Map<string, string[]>([
        ['op:test:target', ['op:test:neighbor']],
        ['op:test:neighbor', ['op:test:target']],
    ]);

    it('true when a friendly NON-TG brigade sits on a 1-hop neighbor (capture stands)', () => {
        const state = stateWith([
            brigade('rs_holder', { location_osid: 'op:test:neighbor', personnel: 1500 }),
        ]);
        expect(hasFriendlyNonTgHolder(state, 'op:test:target', 'RS', adjacency)).toBe(true);
    });

    it('false when the only neighbor brigade is committed to an active TG (would be a ghost hold)', () => {
        const tgs: Record<string, TacticalGroup> = {
            'tg:vrs_corp:OpX:rs_holder': {
                id: 'tg:vrs_corp:OpX:rs_holder', corps_id: 'vrs_corp', op_id: 'OpX',
                anchor_brigade_id: 'rs_holder', donor_contributions: [],
                location_osid: 'op:test:neighbor', status: 'engaged', formed_on_turn: 1, cohesion: 90,
            },
        };
        const state = stateWith([
            brigade('rs_holder', { location_osid: 'op:test:neighbor', personnel: 1500 }),
        ], tgs);
        expect(hasFriendlyNonTgHolder(state, 'op:test:target', 'RS', adjacency)).toBe(false);
    });

    it('false when no friendly brigade is adjacent (revert to contested)', () => {
        const state = stateWith([
            brigade('rs_far', { location_osid: 'op:test:elsewhere', personnel: 1500 }),
        ]);
        expect(hasFriendlyNonTgHolder(state, 'op:test:target', 'RS', adjacency)).toBe(false);
    });

    it('false when the adjacent friendly brigade is below attack-floor strength', () => {
        const state = stateWith([
            brigade('rs_weak', { location_osid: 'op:test:neighbor', personnel: 10 }),
        ]);
        expect(hasFriendlyNonTgHolder(state, 'op:test:target', 'RS', adjacency)).toBe(false);
    });

    it('excludes enemy-faction brigades on the neighbor', () => {
        const state = stateWith([
            brigade('rbih_enemy', { faction: 'RBiH', location_osid: 'op:test:neighbor', personnel: 1500 }),
        ]);
        expect(hasFriendlyNonTgHolder(state, 'op:test:target', 'RS', adjacency)).toBe(false);
    });
});

// ── Flag-ON integration: formTgsAtReadyTransition wires Fix 1 + Fix 2 ─────────

describe('Phase 4 flag-on integration — formTgsAtReadyTransition', () => {
    it('skips phantom anchors and de-conflicts sibling axes when ENABLE_TG_FORMATION', async () => {
        vi.resetModules();
        vi.doMock('../src/sim/combat/tactical_group_config.js', async () => {
            const actual = await vi.importActual<typeof import('../src/sim/combat/tactical_group_config.js')>(
                '../src/sim/combat/tactical_group_config.js',
            );
            return { ...actual, ENABLE_TG_FORMATION: true };
        });
        const { formTgsAtReadyTransition } = await import('../src/sim/combat/operation_preparation.js');

        // Two axes in DIFFERENT corps (so a prior axis's donor pull — same-corps only — can't
        // consume the other axis's candidates). Each axis has a phantom that OUTRANKS its
        // resident; the resident must anchor. Distinct staging keeps donor pools disjoint.
        const state = stateWith([
            phantom('jna_uzice_corps_tg', { corps_id: 'vrs_a', location_osid: 'op:a:s0' }),
            brigade('rs_resident_a', { corps_id: 'vrs_a', location_osid: 'op:a:s0', personnel: 1400 }),
            phantom('jna_4th_corps_tg', { corps_id: 'vrs_b', location_osid: 'op:b:s0' }),
            brigade('rs_resident_b', { corps_id: 'vrs_b', location_osid: 'op:b:s0', personnel: 1400 }),
        ]);

        const op: any = {
            name: 'OpRecon', type: 'sector_attack', staging_osid: 'op:a:s0',
            participating_brigades: ['jna_uzice_corps_tg', 'rs_resident_a', 'jna_4th_corps_tg', 'rs_resident_b'],
            phase: 'execution',
            axes: [
                { axis_id: 'a', name: 'A', assigned_brigades: ['jna_uzice_corps_tg', 'rs_resident_a'], objectives: ['op:a:obj'], staging_osid: 'op:a:s0', current_objective_index: 0, status: 'executing' },
                { axis_id: 'b', name: 'B', assigned_brigades: ['jna_4th_corps_tg', 'rs_resident_b'], objectives: ['op:b:obj'], staging_osid: 'op:b:s0', current_objective_index: 0, status: 'executing' },
            ],
        };

        formTgsAtReadyTransition(state, op, 5);

        const tgs = state.military.tactical_groups ?? {};
        const anchors = Object.values(tgs).map(t => t.anchor_brigade_id).sort();
        // Both axes anchor their resident (phantom skipped); no phantom anchored anything.
        expect(anchors).toEqual(['rs_resident_a', 'rs_resident_b']);
        expect(anchors).not.toContain('jna_uzice_corps_tg');
        expect(anchors).not.toContain('jna_4th_corps_tg');

        vi.doUnmock('../src/sim/combat/tactical_group_config.js');
        vi.resetModules();
    });

    it('de-conflicts two axes that both want the same highest-power anchor', async () => {
        vi.resetModules();
        vi.doMock('../src/sim/combat/tactical_group_config.js', async () => {
            const actual = await vi.importActual<typeof import('../src/sim/combat/tactical_group_config.js')>(
                '../src/sim/combat/tactical_group_config.js',
            );
            return { ...actual, ENABLE_TG_FORMATION: true };
        });
        const { formTgsAtReadyTransition } = await import('../src/sim/combat/operation_preparation.js');

        // Two axes in distinct corps that both list rs_shared as their highest-power
        // candidate; each carries a same-corps donor so a real (multi-brigade) TG can
        // form. Axis A claims rs_shared as anchor + rs_donor_a as donor; axis B must
        // de-conflict to its own resident rs_nextbest (rs_shared already reserved) and
        // pull rs_donor_b. Codex P2 #46: a TG only forms when selectDonors yields ≥1
        // donor, so each axis needs its own donor to exercise the de-confliction path.
        const state = stateWith([
            // Donor personnel must clear the residual floor: at 0 hops a donor gives 30%
            // (DONATION_CAP_FRACTION), so it must keep ≥ MIN_BRIGADE_PERSONNEL_AFTER_DONATION
            // (800) → ≥ ~1143 personnel. 1200 passes while staying below each anchor's power
            // so resolveTgAnchor still prefers rs_shared (axis A) / rs_nextbest (axis B).
            brigade('rs_shared', { corps_id: 'vrs_a', location_osid: 'op:a:s0', personnel: 2200 }),
            brigade('rs_donor_a', { corps_id: 'vrs_a', location_osid: 'op:a:s0', personnel: 1200 }),
            brigade('rs_nextbest', { corps_id: 'vrs_b', location_osid: 'op:b:s0', personnel: 1500 }),
            brigade('rs_donor_b', { corps_id: 'vrs_b', location_osid: 'op:b:s0', personnel: 1200 }),
        ]);
        const op: any = {
            name: 'OpDual', type: 'sector_attack', staging_osid: 'op:a:s0',
            participating_brigades: ['rs_shared', 'rs_donor_a', 'rs_nextbest', 'rs_donor_b'],
            phase: 'execution',
            axes: [
                { axis_id: 'a', name: 'A', assigned_brigades: ['rs_shared', 'rs_donor_a'], objectives: ['op:a:obj'], staging_osid: 'op:a:s0', current_objective_index: 0, status: 'executing' },
                { axis_id: 'b', name: 'B', assigned_brigades: ['rs_shared', 'rs_nextbest', 'rs_donor_b'], objectives: ['op:b:obj'], staging_osid: 'op:b:s0', current_objective_index: 0, status: 'executing' },
            ],
        };

        formTgsAtReadyTransition(state, op, 5);

        const tgs = state.military.tactical_groups ?? {};
        const anchors = Object.values(tgs).map(t => t.anchor_brigade_id).sort();
        expect(anchors).toEqual(['rs_nextbest', 'rs_shared']);
    });

    it('forms NO TG for an all-phantom axis (Op Prsten ilijas_ring) when ENABLE_TG_FORMATION', async () => {
        vi.resetModules();
        vi.doMock('../src/sim/combat/tactical_group_config.js', async () => {
            const actual = await vi.importActual<typeof import('../src/sim/combat/tactical_group_config.js')>(
                '../src/sim/combat/tactical_group_config.js',
            );
            return { ...actual, ENABLE_TG_FORMATION: true };
        });
        const { formTgsAtReadyTransition } = await import('../src/sim/combat/operation_preparation.js');

        const state = stateWith([
            phantom('jna_ilijas_to_tg', { location_osid: 'op:ilijas:podlugovi' }),
            phantom('jna_ilijas_garrison_det', { location_osid: 'op:ilijas:podlugovi' }),
            phantom('jna_ilijas_north_to_tg', { location_osid: 'op:ilijas:podlugovi' }),
        ]);
        const op: any = {
            name: 'Operation Prsten', type: 'sector_attack', staging_osid: 'op:ilijas:podlugovi',
            participating_brigades: ['jna_ilijas_to_tg', 'jna_ilijas_garrison_det', 'jna_ilijas_north_to_tg'],
            phase: 'execution',
            axes: [
                { axis_id: 'ilijas_ring', name: 'Ilijas Ring', assigned_brigades: ['jna_ilijas_to_tg', 'jna_ilijas_garrison_det', 'jna_ilijas_north_to_tg'], objectives: ['op:ilijas:medojevici'], staging_osid: 'op:ilijas:podlugovi', current_objective_index: 0, status: 'executing' },
            ],
        };

        formTgsAtReadyTransition(state, op, 5);
        expect(Object.keys(state.military.tactical_groups ?? {})).toHaveLength(0);

        vi.doUnmock('../src/sim/combat/tactical_group_config.js');
        vi.resetModules();
    });
});
