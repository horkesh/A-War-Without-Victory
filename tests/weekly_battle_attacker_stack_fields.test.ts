/**
 * CAS-ATTACKER-SHARES (§42): `weekly_report.jsonl` battle rows carry the whole attacking
 * stack and each brigade's applied loss, always (not only under a debug topic), so a reader
 * never pairs `attacker_brigade` (the lead) with `attacker_casualties` (the stack's total).
 */
import { describe, expect, it } from 'vitest';
import { weeklyAttackerStackFields } from '../src/scenario/scenario_reporting.js';

describe('weeklyAttackerStackFields', () => {
    it('emits the stack and the per-brigade shares, sorted by brigade id, with no debug topic set', () => {
        expect(process.env.AWWV_DEBUG_REASON_CODES ?? '').not.toContain('battle_stack');
        const out = weeklyAttackerStackFields({
            attacker_brigades: ['b_z', 'b_a'],
            attacker_contributions: [
                { brigade_id: 'b_z', casualties_taken: 40 },
                { brigade_id: 'b_a', casualties_taken: 160 },
            ],
        });
        expect(out).toEqual({
            attacker_brigades: ['b_a', 'b_z'],
            attacker_contributions: [
                { brigade_id: 'b_a', casualties_taken: 160 },
                { brigade_id: 'b_z', casualties_taken: 40 },
            ],
        });
    });

    it('emits nothing for a record without a stack (older report shapes)', () => {
        expect(weeklyAttackerStackFields({})).toEqual({});
    });
});
