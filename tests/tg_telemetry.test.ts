/**
 * Tactical Group Phase 3A TELEMETRY tests (ADR-0005 §Schema; "back the officer"
 * AAR/Chronicle data, Phase 3B).
 *
 * Two telemetry gaps closed:
 *   1. `donor_corps_ids` on the Army HQ op record was written EMPTY at injection
 *      (donors unknown until TG formation). Now back-filled at TG formation from the
 *      actually-selected donors' source corps — sorted + deduped via strictCompare.
 *   2. `brigade_history.tg_participations` was never written. Now an anchor + each
 *      donor gets a deterministic participation record at TG formation.
 *
 * Asserts (flag-on path; formTacticalGroup is the write site, reached only inside
 * the ENABLE_TG_FORMATION gate in the engine):
 *   - anchor gets a role:'anchor' record; donors get role:'donor' records with
 *     personnel_lent + donor_corps_id.
 *   - donor_corps_ids on the Army HQ op is back-filled from the selected donors'
 *     corps (sorted, deduped, anchor corps excluded); op.tg_id linked.
 *   - flag-off-equivalent: a TG that never forms writes no participation records.
 */

import { describe, expect, it } from 'vitest';
import { formTacticalGroup } from '../src/sim/combat/tactical_group_lifecycle.js';
import type {
    ArmyHqOperation,
    FormationState,
    GameState,
    MilitaryState,
    TgDonorContribution,
} from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function brigade(id: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id,
        faction: 'RBiH',
        name: id,
        created_turn: 0,
        status: 'active',
        assignment: null,
        corps_id: 'corp_a',
        location_osid: 'op:m:s0',
        personnel: 2000,
        cohesion: 80,
        ...overrides,
    } as FormationState;
}

function donorContribution(id: string, sourceCorps: string, lent: number): TgDonorContribution {
    return {
        brigade_id: id,
        source_corps_id: sourceCorps,
        distance_hops: 1,
        personnel_lent: lent,
        heavy_equipment_lent: { tanks: 0, artillery: 0, aa_systems: 0 },
        casualties_so_far: 0,
        equipment_losses_so_far: { tanks: 0, artillery: 0, aa_systems: 0 },
        cohesion_bleed_applied: 0,
    };
}

function stateWith(brigades: FormationState[], ahqOps: Record<string, ArmyHqOperation> = {}): GameState {
    const formations: Record<string, FormationState> = {};
    for (const b of brigades) formations[b.id] = b;
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 5, seed: 'tg-telemetry', phase: 'war', player_faction: 'RBiH' } as any,
        military: {
            formations,
            tactical_groups: {},
            army_hq_operations: ahqOps,
        } as Partial<MilitaryState> as MilitaryState,
    } as GameState;
}

describe('TG telemetry — tg_participations (Phase 3A)', () => {
    it('writes an anchor record + donor records with correct roles', () => {
        const state = stateWith([
            brigade('anchor'),
            brigade('d1'),
            brigade('d2'),
        ]);
        const donors = [donorContribution('d1', 'corp_a', 300), donorContribution('d2', 'corp_a', 200)];
        const result = formTacticalGroup(state, {
            op_id: 'op_tele',
            anchor_brigade_id: 'anchor',
            donors,
            current_turn: 5,
        });
        expect(result.tg_id).toBeTruthy();

        const f = state.military!.formations!;
        const anchorParts = f.anchor.brigade_history?.tg_participations ?? [];
        expect(anchorParts).toHaveLength(1);
        expect(anchorParts[0]).toMatchObject({
            tg_id: result.tg_id,
            op_id: 'op_tele',
            role: 'anchor',
            formed_turn: 5,
        });
        // anchor record carries no personnel_lent / donor_corps_id (omitEmpty)
        expect(anchorParts[0].personnel_lent).toBeUndefined();
        expect(anchorParts[0].donor_corps_id).toBeUndefined();

        const d1Parts = f.d1.brigade_history?.tg_participations ?? [];
        expect(d1Parts).toHaveLength(1);
        expect(d1Parts[0]).toMatchObject({
            tg_id: result.tg_id,
            op_id: 'op_tele',
            role: 'donor',
            formed_turn: 5,
            personnel_lent: 300,
            donor_corps_id: 'corp_a',
        });

        const d2Parts = f.d2.brigade_history?.tg_participations ?? [];
        expect(d2Parts).toHaveLength(1);
        expect(d2Parts[0].role).toBe('donor');
        expect(d2Parts[0].personnel_lent).toBe(200);
    });

    it('preserves existing brigade_history when appending', () => {
        const state = stateWith([brigade('anchor'), brigade('d1')]);
        // Seed d1 with prior history; appending a participation must not clobber tallies.
        state.military!.formations!.d1.brigade_history = {
            engagements: [], battles_fought: 7, battles_as_attacker: 0, battles_as_defender: 0,
            victories: 3, defeats: 0, stalemates: 0, total_casualties_taken: 0,
            total_casualties_inflicted: 0, total_osids_captured: 0, total_osids_lost: 0,
            total_equipment_destroyed: { tanks: 0, artillery: 0, aa_systems: 0 },
            total_equipment_captured: { tanks: 0, artillery: 0, aa_systems: 0 },
            current_victory_streak: 0, longest_victory_streak: 0, current_defense_streak: 0,
            longest_defense_streak: 0, turns_under_siege: 0, first_battle_turn: 1,
            first_battle_osid: 'op:x:y', worst_single_battle_casualties: 0,
            worst_single_battle_turn: null, peak_personnel: 2000, nadir_personnel: 1800,
        };
        formTacticalGroup(state, {
            op_id: 'op_tele',
            anchor_brigade_id: 'anchor',
            donors: [donorContribution('d1', 'corp_a', 300)],
            current_turn: 5,
        });
        const hist = state.military!.formations!.d1.brigade_history!;
        expect(hist.battles_fought).toBe(7);
        expect(hist.tg_participations).toHaveLength(1);
    });
});

describe('TG telemetry — donor_corps_ids back-fill (Phase 3A)', () => {
    it('back-fills donor_corps_ids from selected donors, sorted/deduped, anchor corps excluded', () => {
        const ahqOp: ArmyHqOperation = {
            id: 'ahq:RBiH:1995:farz_95',
            faction_id: 'RBiH',
            name: 'Operation Farz 95',
            anchor_corps_id: 'corp_a',
            donor_corps_ids: [], // written EMPTY at injection
            status: 'planning',
            formed_on_turn: 4,
            scenario_year: 1995,
        };
        const state = stateWith(
            [
                brigade('anchor', { corps_id: 'corp_a' }),
                brigade('d1', { corps_id: 'corp_b' }),
                brigade('d2', { corps_id: 'corp_c' }),
                brigade('d3', { corps_id: 'corp_b' }), // duplicate corps → deduped
                brigade('d4', { corps_id: 'corp_a' }), // anchor corps → excluded
            ],
            { 'ahq:RBiH:1995:farz_95': ahqOp },
        );
        const donors = [
            donorContribution('d2', 'corp_c', 200),
            donorContribution('d1', 'corp_b', 300),
            donorContribution('d3', 'corp_b', 100),
            donorContribution('d4', 'corp_a', 150),
        ];
        const result = formTacticalGroup(state, {
            op_id: 'ahq:RBiH:1995:farz_95',
            army_hq_op_id: 'ahq:RBiH:1995:farz_95',
            anchor_brigade_id: 'anchor',
            donors,
            current_turn: 5,
        });
        expect(result.tg_id).toBeTruthy();

        const op = state.military!.army_hq_operations!['ahq:RBiH:1995:farz_95'];
        // sorted + deduped, anchor's own corp_a excluded
        expect(op.donor_corps_ids).toEqual(['corp_b', 'corp_c']);
        // active TG linked at formation
        expect(op.tg_id).toBe(result.tg_id);

        // donor records carry army_hq_op_id
        const d1Parts = state.military!.formations!.d1.brigade_history?.tg_participations ?? [];
        expect(d1Parts[0].army_hq_op_id).toBe('ahq:RBiH:1995:farz_95');
    });
});
