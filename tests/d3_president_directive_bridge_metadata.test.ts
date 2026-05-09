/**
 * President directive bridge metadata.
 *
 * The full `run_three_commanders.ts` harness is intentionally not imported by
 * tests because it executes a scenario at module load. This suite pins the
 * pure bridge helper that canonicalizes rich president verbs before the
 * harness writes `state.military.political_directives_by_faction`.
 */

import { describe, expect, it } from 'vitest';

import {
    canonicalizePresidentDirective,
    PRESIDENT_TO_CANONICAL_DIRECTIVE,
} from '../tools/claude_plays_vrs/president_directive_bridge.js';

describe('president directive bridge metadata', () => {
    it('maps rich president verbs to canonical verb plus default metadata', () => {
        expect(canonicalizePresidentDirective('mobilize_general')).toEqual({
            verb: 'PRESS_OFFENSIVE',
            magnitude: 'maximum',
            permission_flags: ['authorize_offensive', 'authorize_reserve_commitment'],
        });
        expect(canonicalizePresidentDirective('negotiate')).toEqual({
            verb: 'HONOR_TRUCE',
            magnitude: 'limited',
            permission_flags: ['avoid_escalation'],
        });
        expect(canonicalizePresidentDirective('preserve_republic')).toEqual({
            verb: 'BALANCE_FRONTS',
            magnitude: 'standard',
            permission_flags: ['preserve_reserve'],
        });
    });

    it('preserves valid API-supplied metadata over defaults', () => {
        expect(canonicalizePresidentDirective('maintain_siege', {
            magnitude: 'limited',
            permission_flags: ['avoid_escalation'],
        })).toEqual({
            verb: 'HOLD_AT_ALL_COSTS',
            magnitude: 'limited',
            permission_flags: ['avoid_escalation'],
        });
    });

    it('returns null for no_directive and unknown verbs', () => {
        expect(canonicalizePresidentDirective('no_directive')).toBeNull();
        expect(canonicalizePresidentDirective('invent_new_verb')).toBeNull();
    });

    it('keeps the rich-verb mapping table closed and deterministic', () => {
        expect(Object.keys(PRESIDENT_TO_CANONICAL_DIRECTIVE).sort()).toEqual([
            'accept_ceasefire',
            'accept_washington_framework',
            'accept_zagreb_directive',
            'consolidate_drina',
            'consolidate_herzegovina',
            'defend_enclave',
            'hold_central_bosnia',
            'hold_corridor',
            'maintain_siege',
            'mobilize_general',
            'negotiate',
            'no_directive',
            'preserve_republic',
            'reject_partition_plan',
            'screen_arbih_axis',
            'selective_advance',
        ]);
    });
});
