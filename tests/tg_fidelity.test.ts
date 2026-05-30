/**
 * Tactical Group Phase 1 donor-model fidelity tests (ADR-0005).
 *
 * Covers the four ratified-model gaps closed in Phase 1:
 *   1. BFS distance falloff — donation scales by max(0.10, 1 - 0.15×hops), frozen at formation.
 *   2. Equipment donation — heavy_equipment_lent = floor(composition × factor × 0.5).
 *   3. Adjacent-corps donor rule — regular TGs may draw from the anchor's corps ∪ adjacent corps.
 *   4. Concurrency caps — MAX_TGS_PER_CORPS / MAX_CONCURRENT_TGS_PER_FACTION enforced at formation,
 *      plus ARMY_HQ_TG_CAP_REDUCTION when an Army HQ op runs (flag-on).
 *
 * Most of the model runs flag-independently (selectDonors + formTacticalGroup caps). The Army HQ
 * faction-scope + cap-reduction tiers require ENABLE_TG_ARMY_HQ_OPS, exercised via vi.mock.
 */

import { describe, expect, it, vi } from 'vitest';
import type { FormationState, GameState, MilitaryState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { selectDonors } from '../src/sim/combat/tactical_group_selection.js';
import { formTacticalGroup } from '../src/sim/combat/tactical_group_lifecycle.js';
import {
    MAX_TGS_PER_CORPS,
    MAX_CONCURRENT_TGS_PER_FACTION,
} from '../src/sim/combat/tactical_group_config.js';

function brigade(id: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id, faction: 'RBiH', name: id, created_turn: 0, status: 'active', assignment: null,
        corps_id: 'corp_a',
        location_osid: 'op:m:s0',
        personnel: 2000,
        cohesion: 80,
        ...overrides,
    } as FormationState;
}

function stateWith(brigades: FormationState[], turn = 5): GameState {
    const formations: Record<string, FormationState> = {};
    for (const b of brigades) formations[b.id] = b;
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, seed: 'tg-fidelity', phase: 'war', player_faction: 'RBiH' } as any,
        military: {
            formations,
            tactical_groups: {},
            army_hq_operations: {},
            army_hq_last_op_turn: {},
            army_hq_op_count_by_year: {},
        } as Partial<MilitaryState> as MilitaryState,
    } as GameState;
}

/** Linear chain adjacency: s0–s1–s2–s3–s4–s5–s6–s7 (op:m:sN). */
function chainAdjacency(n: number): Map<string, string[]> {
    const adj = new Map<string, string[]>();
    for (let i = 0; i < n; i++) {
        const cur = `op:m:s${i}`;
        const nbrs: string[] = [];
        if (i > 0) nbrs.push(`op:m:s${i - 1}`);
        if (i < n - 1) nbrs.push(`op:m:s${i + 1}`);
        adj.set(cur, nbrs);
    }
    return adj;
}

/**
 * Friendly-territory filler brigades occupying every chain OSID s0..sN-1 so BFS (which only
 * expands through friendly OSIDs) can path. cohesion 0 keeps them ineligible as donors — they
 * mark territory friendly without polluting the donor set.
 */
function chainFillers(n: number, faction = 'RBiH'): FormationState[] {
    const out: FormationState[] = [];
    for (let i = 0; i < n; i++) {
        out.push(brigade(`filler_${i}`, {
            faction: faction as any, corps_id: 'corp_filler', location_osid: `op:m:s${i}`, cohesion: 0,
        }));
    }
    return out;
}

// === Gap 1: BFS distance falloff ===

describe('BFS distance falloff', () => {
    it('scales donation by hops: 2 hops → factor 0.70', () => {
        const adjacency = chainAdjacency(8);
        // anchor stages at s0; donor at s2 (2 hops). Fillers make the chain friendly so BFS paths.
        const state = stateWith([
            brigade('anchor', { location_osid: 'op:m:s0' }),
            brigade('d_far', { location_osid: 'op:m:s2', personnel: 2000 }),
            ...chainFillers(8),
        ]);
        const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:m:s0', adjacency });
        expect(donors).toHaveLength(1);
        expect(donors[0].distance_hops).toBe(2);
        // factor = max(0.10, 1 - 0.15×2) = 0.70; cap = 0.30×2000 = 600.
        // donation = floor(min(2000×0.70=1400, 600)) = 600 (cap dominates at 2 hops for big donor).
        expect(donors[0].personnel_lent).toBe(600);
    });

    it('falloff floor (0.10) applies past ~6 hops worth; cap still bounds', () => {
        const adjacency = chainAdjacency(8);
        // donor at s5 (5 hops); personnel 1200 so the residual floor (default 800) clears and
        // the distance falloff — not the 30% cap — is what binds the donation.
        const state = stateWith([
            brigade('anchor', { location_osid: 'op:m:s0' }),
            brigade('d', { location_osid: 'op:m:s5', personnel: 1200 }),
            ...chainFillers(8),
        ]);
        const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:m:s0', adjacency });
        expect(donors[0].distance_hops).toBe(5);
        // factor = max(0.10, 1 - 0.75) = 0.25; cap = 0.30×1200 = 360.
        // donation = floor(min(1200×0.25=300, 360)) = 300; residual 900 ≥ 800 floor.
        expect(donors[0].personnel_lent).toBe(300);
    });

    it('skips donors beyond MAX_OG_DONOR_DISTANCE (6 hops)', () => {
        const adjacency = chainAdjacency(10);
        const state = stateWith([
            brigade('anchor', { location_osid: 'op:m:s0' }),
            brigade('d_too_far', { location_osid: 'op:m:s7' }), // 7 hops > 6
            ...chainFillers(10),
        ]);
        const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:m:s0', adjacency });
        expect(donors).toHaveLength(0);
    });

    it('orders donors by distance_hops ascending', () => {
        const adjacency = chainAdjacency(8);
        const state = stateWith([
            brigade('anchor', { location_osid: 'op:m:s0' }),
            brigade('d_3', { location_osid: 'op:m:s3' }),
            brigade('d_1', { location_osid: 'op:m:s1' }),
            brigade('d_2', { location_osid: 'op:m:s2' }),
            ...chainFillers(8),
        ]);
        const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:m:s0', adjacency });
        expect(donors.map(d => d.distance_hops)).toEqual([1, 2, 3]);
        expect(donors.map(d => d.brigade_id)).toEqual(['d_1', 'd_2', 'd_3']);
    });
});

// === Gap 2: equipment donation ===

describe('equipment donation', () => {
    it('lends pro-rata heavy equipment scaled by falloff × 0.5', () => {
        const adjacency = chainAdjacency(4);
        const state = stateWith([
            brigade('anchor', { location_osid: 'op:m:s0' }),
            brigade('d', {
                location_osid: 'op:m:s1', // 1 hop → factor 0.85
                personnel: 2000,
                composition: { infantry: 1800, tanks: 10, artillery: 20, aa_systems: 4, tank_condition: 'operational', artillery_condition: 'operational' } as any,
            }),
            ...chainFillers(4),
        ]);
        const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:m:s0', adjacency });
        // equipFactor = 0.85 × 0.5 = 0.425. tanks=floor(10×0.425)=4, artillery=floor(20×0.425)=8, aa=floor(4×0.425)=1.
        expect(donors[0].heavy_equipment_lent).toEqual({ tanks: 4, artillery: 8, aa_systems: 1 });
    });

    it('lends zero equipment when donor has no composition', () => {
        const adjacency = chainAdjacency(4);
        const state = stateWith([
            brigade('anchor', { location_osid: 'op:m:s0' }),
            brigade('d', { location_osid: 'op:m:s1' }),
            ...chainFillers(4),
        ]);
        const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:m:s0', adjacency });
        expect(donors[0].heavy_equipment_lent).toEqual({ tanks: 0, artillery: 0, aa_systems: 0 });
    });
});

// === Gap 3: adjacent-corps donor rule ===

describe('adjacent-corps donor rule', () => {
    it('includes a donor from a corps adjacent to the anchor corps', () => {
        const adjacency = chainAdjacency(4);
        const state = stateWith([
            brigade('anchor', { corps_id: 'corp_a', location_osid: 'op:m:s0' }),
            // corp_b brigade sits at s1, which is a neighbor of corp_a's s0 → adjacent corps.
            brigade('d_b', { corps_id: 'corp_b', location_osid: 'op:m:s1' }),
            ...chainFillers(4),
        ]);
        const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:m:s0', adjacency });
        expect(donors.map(d => d.brigade_id)).toEqual(['d_b']);
        expect(donors[0].source_corps_id).toBe('corp_b');
    });

    it('excludes a donor from a non-adjacent corps', () => {
        const adjacency = chainAdjacency(8);
        const state = stateWith([
            brigade('anchor', { corps_id: 'corp_a', location_osid: 'op:m:s0' }),
            // corp_c brigade at s5: no corp_a brigade neighbors it → not an adjacent corps.
            brigade('d_c', { corps_id: 'corp_c', location_osid: 'op:m:s5' }),
            ...chainFillers(8),
        ]);
        const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:m:s0', adjacency });
        expect(donors).toHaveLength(0);
    });

    it('never crosses faction even when corps OSIDs are adjacent', () => {
        const adjacency = chainAdjacency(4);
        const state = stateWith([
            brigade('anchor', { faction: 'RBiH', corps_id: 'corp_a', location_osid: 'op:m:s0' }),
            brigade('d_hvo', { faction: 'HRHB', corps_id: 'corp_hvo', location_osid: 'op:m:s1' }),
            ...chainFillers(4),
        ]);
        const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:m:s0', adjacency });
        expect(donors).toHaveLength(0);
    });
});

// === Gap 4: concurrency caps at formation ===

describe('concurrency caps', () => {
    function formOne(state: GameState, opId: string, anchorId: string): string | null {
        return formTacticalGroup(state, {
            op_id: opId, anchor_brigade_id: anchorId, donors: [], current_turn: 5,
        }).tg_id;
    }

    it('enforces MAX_TGS_PER_CORPS at formation', () => {
        const anchors: FormationState[] = [];
        for (let i = 0; i <= MAX_TGS_PER_CORPS; i++) anchors.push(brigade(`a${i}`, { corps_id: 'corp_a' }));
        const state = stateWith(anchors);
        for (let i = 0; i < MAX_TGS_PER_CORPS; i++) {
            expect(formOne(state, `op${i}`, `a${i}`)).not.toBeNull();
        }
        // One past the corps cap is rejected.
        const result = formTacticalGroup(state, {
            op_id: `op${MAX_TGS_PER_CORPS}`, anchor_brigade_id: `a${MAX_TGS_PER_CORPS}`, donors: [], current_turn: 5,
        });
        expect(result.tg_id).toBeNull();
        expect(result.rejection_reason).toBe('corps_tg_cap_reached');
    });

    it('enforces MAX_CONCURRENT_TGS_PER_FACTION across corps', () => {
        // Spread anchors across enough corps that the per-corps cap never bites first.
        const anchors: FormationState[] = [];
        for (let i = 0; i <= MAX_CONCURRENT_TGS_PER_FACTION; i++) {
            anchors.push(brigade(`a${i}`, { corps_id: `corp_${i}` }));
        }
        const state = stateWith(anchors);
        for (let i = 0; i < MAX_CONCURRENT_TGS_PER_FACTION; i++) {
            expect(formOne(state, `op${i}`, `a${i}`)).not.toBeNull();
        }
        const result = formTacticalGroup(state, {
            op_id: `opX`, anchor_brigade_id: `a${MAX_CONCURRENT_TGS_PER_FACTION}`, donors: [], current_turn: 5,
        });
        expect(result.tg_id).toBeNull();
        expect(result.rejection_reason).toBe('faction_tg_cap_reached');
    });
});

// === Gap 4 (flag-on): Army HQ faction-scope donors + cap reduction ===

describe('Army HQ tier (flag-on)', () => {
    it('cross-corps faction-wide donor pool + reduced faction cap when ENABLE_TG_ARMY_HQ_OPS', async () => {
        vi.resetModules();
        vi.doMock('../src/sim/combat/tactical_group_config.js', async () => {
            const actual = await vi.importActual<typeof import('../src/sim/combat/tactical_group_config.js')>(
                '../src/sim/combat/tactical_group_config.js',
            );
            return { ...actual, ENABLE_TG_ARMY_HQ_OPS: true };
        });
        const { selectDonors: selectDonorsFlagged } = await import('../src/sim/combat/tactical_group_selection.js');
        const { formTacticalGroup: formFlagged } = await import('../src/sim/combat/tactical_group_lifecycle.js');

        // Donor in a NON-adjacent corps is eligible for an Army HQ op (faction-wide).
        const adjacency = chainAdjacency(8);
        const state = stateWith([
            brigade('anchor', { corps_id: 'corp_a', location_osid: 'op:m:s0' }),
            brigade('d_remote', { corps_id: 'corp_z', location_osid: 'op:m:s4' }), // 4 hops, non-adjacent corps
            ...chainFillers(8),
        ]);
        const donors = selectDonorsFlagged(state, {
            anchor_brigade_id: 'anchor', staging_osid: 'op:m:s0', army_hq_op_id: 'ahq:RBiH:test', adjacency,
        });
        expect(donors.map(d => d.brigade_id)).toEqual(['d_remote']);

        // Cap reduction: an active Army HQ op (planning) cuts the faction cap by ARMY_HQ_TG_CAP_REDUCTION (2).
        const capState = stateWith(
            Array.from({ length: MAX_CONCURRENT_TGS_PER_FACTION }, (_, i) => brigade(`a${i}`, { corps_id: `corp_${i}` })),
        );
        capState.military.army_hq_operations = {
            'ahq:RBiH:run': {
                id: 'ahq:RBiH:run', faction_id: 'RBiH', name: 'Krivaja', anchor_corps_id: 'corp_0',
                donor_corps_ids: [], status: 'planning', formed_on_turn: 1, scenario_year: 0,
            } as any,
        };
        // Effective cap = 4 - 2 = 2 → only two TGs may form.
        for (let i = 0; i < MAX_CONCURRENT_TGS_PER_FACTION - 2; i++) {
            expect(formFlagged(capState, { op_id: `op${i}`, anchor_brigade_id: `a${i}`, donors: [], current_turn: 5 }).tg_id).not.toBeNull();
        }
        const blocked = formFlagged(capState, {
            op_id: 'opBlocked', anchor_brigade_id: `a${MAX_CONCURRENT_TGS_PER_FACTION - 2}`, donors: [], current_turn: 5,
        });
        expect(blocked.tg_id).toBeNull();
        expect(blocked.rejection_reason).toBe('faction_tg_cap_reached');

        vi.doUnmock('../src/sim/combat/tactical_group_config.js');
        vi.resetModules();
    });
});
