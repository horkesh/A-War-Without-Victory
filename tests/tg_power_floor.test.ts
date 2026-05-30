/**
 * Tactical Group Phase 1.7 POWER-FLOOR tests (ADR-0005, operations-expert 2026-05-30).
 *
 * User-ratified principle: the synthesized TG attacker power must be >= the legacy
 * committed-stack power it replaces. The Pyrrhic cost of concentration is paid in
 * COHESION (v2.3 ENABLE_TG_COHESION_BLEED + recovery lock), NOT in a combat-power
 * haircut.
 *
 * Pre-Phase-1.7, a committed donor contributed only `power × min(1, personnel_lent /
 * personnel)` (personnel_lent capped at <=30%, BFS-falloff down to 10%) — a ~2-3x power
 * reduction that made HVO lose the 1995 Mistral-2 SW Dinaric belt it wins flag-off.
 *
 * These tests assert, on `computeTgDonorPower` (the donor-power synthesis seam):
 *   1. A committed donor to an OFFENSIVE ('full'-policy) op contributes its FULL combat
 *      power — equal to `computeAttackerPower(donor, ...)`, NOT the personnel_lent haircut.
 *   2. The synthesized TG donor power >= the equivalent legacy adjacent-stack power for the
 *      same committed donor (representative power-floor case).
 *   3. A 'limited' (emergency) op keeps the personnel_lent-scaled haircut (the floor only
 *      lifts for offensives).
 *   4. Full-policy donors are reported via `fullPolicyDonorCount` so the caller folds them
 *      into the concentration-bonus count.
 */

import { describe, expect, it } from 'vitest';
import type { CorpsCommandState, CorpsOperation, FormationState, GameState, MilitaryState, TacticalGroup } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { computeTgDonorPower } from '../src/sim/combat/attack_resolution_osid.js';
import { computeAttackerPower } from '../src/sim/combat/combat_math.js';

function brigade(id: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id, faction: 'RBiH', name: id, created_turn: 0, status: 'active', assignment: null,
        corps_id: 'corp_a',
        location_osid: 'op:m:s0',
        personnel: 2000,
        cohesion: 80,
        posture: 'attack',
        ...overrides,
    } as FormationState;
}

function tg(opId: string, anchorId: string, donorId: string, personnelLent: number, hops = 3): TacticalGroup {
    return {
        id: `tg:corp_a:${opId}:${anchorId}`,
        corps_id: 'corp_a',
        op_id: opId,
        anchor_brigade_id: anchorId,
        donor_contributions: [{
            brigade_id: donorId,
            source_corps_id: 'corp_a',
            distance_hops: hops,
            personnel_lent: personnelLent,
            heavy_equipment_lent: { tanks: 0, artillery: 0, aa_systems: 0 },
            casualties_so_far: 0,
            equipment_losses_so_far: { tanks: 0, artillery: 0, aa_systems: 0 },
            cohesion_bleed_applied: 0,
        }],
        location_osid: 'op:m:s0',
        status: 'engaged',
        formed_on_turn: 1,
        cohesion: 80,
    };
}

function op(name: string, type: CorpsOperation['type'], overrides: Partial<CorpsOperation> = {}): CorpsOperation {
    return {
        name, type, phase: 'execution', started_turn: 1, phase_started_turn: 1,
        participating_brigades: ['anchor'],
        ...overrides,
    } as CorpsOperation;
}

function stateWith(brigades: FormationState[], tgs: TacticalGroup[], ops: CorpsOperation[]): GameState {
    const formations: Record<string, FormationState> = {};
    for (const b of brigades) formations[b.id] = b;
    const tgRecord: Record<string, TacticalGroup> = {};
    for (const t of tgs) tgRecord[t.id] = t;
    const corpsCommand: Record<string, CorpsCommandState> = {
        corp_a: { active_operations: ops } as Partial<CorpsCommandState> as CorpsCommandState,
    };
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 5, seed: 'tg-power-floor', phase: 'war', player_faction: 'RBiH' } as any,
        military: {
            formations,
            tactical_groups: tgRecord,
            corps_command: corpsCommand,
        } as Partial<MilitaryState> as MilitaryState,
    } as GameState;
}

describe('Phase 1.7 TG power floor', () => {
    it('committed donor to a full-policy offensive contributes FULL combat power (no personnel_lent haircut)', () => {
        const anchor = brigade('anchor');
        // donor personnel 2000, but only 30% (600) lent — pre-1.7 this haircut the power to 30%.
        const donor = brigade('donor', { personnel: 2000 });
        const state = stateWith(
            [anchor, donor],
            [tg('offensive_op', 'anchor', 'donor', 600 /* 30% */)],
            [op('offensive_op', 'sector_attack')], // → 'full' policy
        );

        const synth = computeTgDonorPower(state, [anchor], undefined, 1.0, 'op:m:enemy');
        const fullDonorPower = computeAttackerPower(state, donor, undefined, 'attack', 1.0, 'op:m:enemy');

        // POWER FLOOR: full-policy donor lends full power, NOT power × (600/2000).
        expect(synth.power).toBeCloseTo(fullDonorPower, 6);
        expect(synth.fullPolicyDonorCount).toBe(1);
    });

    it('synthesized TG donor power >= the legacy personnel_lent-scaled contribution (the floor)', () => {
        const anchor = brigade('anchor');
        const donor = brigade('donor', { personnel: 2000 });
        const state = stateWith(
            [anchor, donor],
            [tg('offensive_op', 'anchor', 'donor', 600)],
            [op('offensive_op', 'general_offensive')], // → 'full' policy
        );

        const synth = computeTgDonorPower(state, [anchor], undefined, 1.0, 'op:m:enemy');
        const fullDonorPower = computeAttackerPower(state, donor, undefined, 'attack', 1.0, 'op:m:enemy');
        const legacyHaircutPower = fullDonorPower * (600 / 2000); // the old <=30% contribution

        expect(synth.power).toBeGreaterThanOrEqual(legacyHaircutPower);
        // And it is strictly larger than the haircut (the floor actually lifts the power).
        expect(synth.power).toBeGreaterThan(legacyHaircutPower);
    });

    it("'limited' (emergency) op keeps the personnel_lent haircut — floor only lifts offensives", () => {
        const anchor = brigade('anchor');
        const donor = brigade('donor', { personnel: 2000 });
        const state = stateWith(
            [anchor, donor],
            [tg('emergency_op', 'anchor', 'donor', 600)],
            [op('emergency_op', 'strategic_defense', { is_emergency: true })], // → 'limited' policy
        );

        const synth = computeTgDonorPower(state, [anchor], undefined, 1.0, 'op:m:enemy');
        const fullDonorPower = computeAttackerPower(state, donor, undefined, 'attack', 1.0, 'op:m:enemy');

        // Limited policy retains the donated-fraction haircut: power × (600/2000).
        expect(synth.power).toBeCloseTo(fullDonorPower * (600 / 2000), 6);
        // Limited donors are NOT folded into the concentration count.
        expect(synth.fullPolicyDonorCount).toBe(0);
    });

    it('reports zero donor power + zero count when the anchor has no TG', () => {
        const anchor = brigade('anchor');
        const state = stateWith([anchor], [], []);
        const synth = computeTgDonorPower(state, [anchor], undefined, 1.0, 'op:m:enemy');
        expect(synth.power).toBe(0);
        expect(synth.fullPolicyDonorCount).toBe(0);
    });
});
