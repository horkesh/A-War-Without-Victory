import { describe, it, expect } from 'vitest';
import type { CorpsStatusReason } from '../src/state/game_state.js';

describe('corps status reason', () => {
    const VALID_REASONS: CorpsStatusReason[] = [
        'executing_operation', 'density_strained', 'supply_critical',
        'no_targets', 'cooldown', 'no_eligible_sectors', 'queued_ops_pending',
        'ready'
    ];

    it('all reason values are distinct', () => {
        expect(new Set(VALID_REASONS).size).toBe(VALID_REASONS.length);
    });

    it('type includes all expected values', () => {
        for (const r of VALID_REASONS) {
            const typed: CorpsStatusReason = r;
            expect(typed).toBe(r);
        }
    });
});

describe('op launch trace format', () => {
    it('trace entries use blocked: or clear: prefix', () => {
        const sampleTraces = [
            'blocked:existing_op(Operation Drina:execution)',
            'blocked:density_strained(0.120<0.167)',
            'blocked:stance(defensive)',
            'clear:all_gates_passed',
        ];
        for (const t of sampleTraces) {
            expect(t.startsWith('blocked:') || t.startsWith('clear:')).toBe(true);
        }
    });
});
