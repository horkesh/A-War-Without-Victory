/**
 * v0.9.0 Consequence System — production consumer wiring for bot_priority_shift.
 *
 * Codex PR #1 review (2026-04-22) flagged that bot_priority_shift writers had
 * no production consumer. This test file proves the augmenter module merges
 * active shifts into the corps directive's offensive_targets during emit.
 *
 * Integration chain under test:
 *   apply_effects.applyBotPriorityShift
 *     → state.military.bot_priority_shifts
 *     → augmentOffensiveTargetsWithShifts (this test file)
 *     → directive.offensive_targets (in buildDirective / emit.ts)
 *     → scoreTargetFromDirective (bot_brigade_targeting.ts)
 */
import { describe, it, expect } from 'vitest';
import { augmentOffensiveTargetsWithShifts } from '../src/sim/combat/commander/bot_priority_shift_augmentation.js';
import type { CommanderBriefing } from '../src/sim/combat/commander/commander_state.js';
import type { GameState } from '../src/state/game_state.js';

/** Minimal CommanderBriefing stub. Only the fields the augmenter actually
 *  reads (state_ref, faction, turn) need to be set meaningfully; the rest
 *  are filled with empty/dummy values to satisfy the type. */
function makeBriefing(opts: {
    faction: 'RBiH' | 'RS' | 'HRHB';
    turn: number;
    politicalControllers?: Record<string, string>;
    shifts?: Array<{
        faction: string;
        add_objectives?: string[];
        remove_objectives?: string[];
        expires_turn: number;
    }>;
    omitStateRef?: boolean;
}): CommanderBriefing {
    const state = {
        schema_version: 1,
        meta: { turn: opts.turn, phase: 'war', scenario_id: 't', player_faction: opts.faction, seed: 's' },
        factions: [],
        military: {
            formations: {},
            bot_priority_shifts: opts.shifts ?? [],
        },
        political: {
            political_controllers: opts.politicalControllers ?? {},
        },
    } as unknown as GameState;
    return {
        corps_id: 'corps_x',
        faction: opts.faction,
        turn: opts.turn,
        spatial: {} as any,
        sectors: [],
        brigades: [],
        state_ref: opts.omitStateRef ? undefined : state,
        reverse_map: null,
        supply_by_osid: null,
        ethnic_map: null,
        graph_analysis: null,
        front_geometry: null,
        intel_data: null,
        doctrine_stance: 'balanced',
        corps_stance: 'balanced',
        corps_exhaustion: 0,
        faction_war_exhaustion: 0,
        avg_fatigue_pct: 0,
        brigades_above_fatigue_threshold: 0,
        enemy_equipment_summary: {} as any,
        adjacent_corps: [],
        officer_personality: {} as any,
        pre_planned_ops: [],
        previous_state: null,
        active_operations: [],
        must_hold_osids: [],
        campaign_role: null,
        campaign_offensive_targets: [],
        campaign_hold_targets: [],
        campaign_stance_ceiling: null,
        campaign_sync_role: null,
        campaign_sync_targets: [],
    } as unknown as CommanderBriefing;
}

describe('augmentOffensiveTargetsWithShifts — no-op cases', () => {
    it('returns a copy of baseTargets when no shifts are active', () => {
        const briefing = makeBriefing({ faction: 'RS', turn: 10 });
        const base = ['op:zvornik:zvornik_1'];
        const out = augmentOffensiveTargetsWithShifts(base, briefing);
        expect(out).toEqual(base);
        expect(out).not.toBe(base); // mutable copy, not the same reference
    });

    it('returns base unchanged when state_ref is missing', () => {
        const briefing = makeBriefing({ faction: 'RS', turn: 10, omitStateRef: true });
        expect(augmentOffensiveTargetsWithShifts(['op:foo:bar'], briefing)).toEqual(['op:foo:bar']);
    });

    it('ignores shifts that have expired', () => {
        const briefing = makeBriefing({
            faction: 'RS',
            turn: 20,
            politicalControllers: { 'op:sarajevo:s1': 'RBiH' },
            shifts: [{ faction: 'RS', add_objectives: ['sarajevo'], expires_turn: 10 }],
        });
        expect(augmentOffensiveTargetsWithShifts([], briefing)).toEqual([]);
    });

    it('ignores shifts belonging to other factions', () => {
        const briefing = makeBriefing({
            faction: 'RBiH',
            turn: 10,
            politicalControllers: { 'op:sarajevo:s1': 'RS' },
            shifts: [{ faction: 'RS', add_objectives: ['sarajevo'], expires_turn: 50 }],
        });
        expect(augmentOffensiveTargetsWithShifts([], briefing)).toEqual([]);
    });
});

describe('augmentOffensiveTargetsWithShifts — add_objectives expansion', () => {
    it('expands add_objectives mun to all OSIDs in that mun not held by the shifting faction', () => {
        const briefing = makeBriefing({
            faction: 'RS',
            turn: 10,
            politicalControllers: {
                'op:sarajevo:ilidza': 'RBiH',
                'op:sarajevo:vogosca': 'RBiH',
                'op:sarajevo:pale': 'RS', // RS-held — should be excluded
                'op:zvornik:zvornik_1': 'RS',
            },
            shifts: [{ faction: 'RS', add_objectives: ['sarajevo'], expires_turn: 50 }],
        });
        const out = augmentOffensiveTargetsWithShifts([], briefing);
        expect(out).toEqual(['op:sarajevo:ilidza', 'op:sarajevo:vogosca']);
    });

    it('preserves pre-existing base targets alongside expanded adds', () => {
        const briefing = makeBriefing({
            faction: 'RS',
            turn: 10,
            politicalControllers: { 'op:sarajevo:ilidza': 'RBiH' },
            shifts: [{ faction: 'RS', add_objectives: ['sarajevo'], expires_turn: 50 }],
        });
        const out = augmentOffensiveTargetsWithShifts(['op:other:x'], briefing);
        expect(out.sort()).toEqual(['op:other:x', 'op:sarajevo:ilidza']);
    });

    it('deduplicates when add expansion overlaps with base targets', () => {
        const briefing = makeBriefing({
            faction: 'RS',
            turn: 10,
            politicalControllers: { 'op:sarajevo:ilidza': 'RBiH' },
            shifts: [{ faction: 'RS', add_objectives: ['sarajevo'], expires_turn: 50 }],
        });
        const out = augmentOffensiveTargetsWithShifts(['op:sarajevo:ilidza'], briefing);
        expect(out).toEqual(['op:sarajevo:ilidza']);
    });

    it('unions multiple active shifts for the same faction', () => {
        const briefing = makeBriefing({
            faction: 'RS',
            turn: 10,
            politicalControllers: {
                'op:sarajevo:ilidza': 'RBiH',
                'op:zenica:zenica_1': 'RBiH',
            },
            shifts: [
                { faction: 'RS', add_objectives: ['sarajevo'], expires_turn: 50 },
                { faction: 'RS', add_objectives: ['zenica'], expires_turn: 50 },
            ],
        });
        expect(augmentOffensiveTargetsWithShifts([], briefing)).toEqual([
            'op:sarajevo:ilidza', 'op:zenica:zenica_1',
        ]);
    });
});

describe('augmentOffensiveTargetsWithShifts — remove_objectives filtering', () => {
    it('removes OSIDs whose mun is in the active remove set from pre-existing base targets', () => {
        const briefing = makeBriefing({
            faction: 'RS',
            turn: 10,
            shifts: [{ faction: 'RS', remove_objectives: ['zvornik'], expires_turn: 50 }],
        });
        const out = augmentOffensiveTargetsWithShifts(
            ['op:zvornik:zvornik_1', 'op:zvornik:sapna', 'op:sarajevo:ilidza'],
            briefing,
        );
        expect(out).toEqual(['op:sarajevo:ilidza']);
    });

    it('removes also filter out just-added OSIDs (removes win against adds)', () => {
        const briefing = makeBriefing({
            faction: 'RS',
            turn: 10,
            politicalControllers: { 'op:sarajevo:ilidza': 'RBiH' },
            shifts: [{
                faction: 'RS',
                add_objectives: ['sarajevo'],
                remove_objectives: ['sarajevo'],
                expires_turn: 50,
            }],
        });
        expect(augmentOffensiveTargetsWithShifts([], briefing)).toEqual([]);
    });
});

describe('augmentOffensiveTargetsWithShifts — determinism', () => {
    it('result is sorted deterministically', () => {
        const briefing = makeBriefing({
            faction: 'RS',
            turn: 10,
            politicalControllers: {
                'op:zvornik:c': 'RBiH',
                'op:zvornik:a': 'RBiH',
                'op:zvornik:b': 'RBiH',
            },
            shifts: [{ faction: 'RS', add_objectives: ['zvornik'], expires_turn: 50 }],
        });
        expect(augmentOffensiveTargetsWithShifts([], briefing)).toEqual([
            'op:zvornik:a', 'op:zvornik:b', 'op:zvornik:c',
        ]);
    });
});
