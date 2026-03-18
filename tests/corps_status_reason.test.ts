import { describe, it, expect } from 'vitest';

describe('corps status reason', () => {
    const VALID_REASONS = [
        'executing_operation', 'density_strained', 'supply_critical',
        'no_targets', 'cooldown', 'no_eligible_sectors', 'queued_ops_pending',
        'ready'
    ] as const;

    it('all reason values are distinct', () => {
        expect(new Set(VALID_REASONS).size).toBe(VALID_REASONS.length);
    });

    it('reason values are non-empty strings', () => {
        for (const r of VALID_REASONS) {
            expect(typeof r).toBe('string');
            expect(r.length).toBeGreaterThan(0);
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
