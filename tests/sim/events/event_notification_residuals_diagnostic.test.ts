import { execFileSync } from 'child_process';
import { describe, expect, it } from 'vitest';

describe('event notification residual diagnostic', () => {
    it('pins the current missing recipient-block floor', () => {
        const output = execFileSync(
            process.execPath,
            ['tools/diagnostics/event_notification_residuals.cjs', '--json'],
            { encoding: 'utf-8' },
        );
        const payload = JSON.parse(output);

        // RB5 (2026-11-23): the HRHB halt card's four blocks are classified blocked-sensitive (an
        // internal staff order; other sides see only the waves).
        expect(payload.rows).toBe(3);
        expect(payload.missing_blocks).toBe(8);
        expect(payload.classified_blocks).toBe(8);
        expect(payload.unclassified_blocks).toBe(0);
        expect(payload.residuals.map((row: { event: string }) => row.event).sort()).toEqual([
            'hrhb_minority_policy_1993',
            'visit_to_front_hrhb',
            'visit_to_front_rs',
        ]);
        expect(payload.residuals.flatMap((row: { missing: Array<{ bucket: string }> }) => row.missing).map((entry: { bucket: string }) => entry.bucket)).toEqual([
            'blocked-sensitive',
            'blocked-sensitive',
            'blocked-sensitive',
            'blocked-sensitive',
            'blocked-sensitive',
            'blocked-sensitive',
            'blocked-sensitive',
            'blocked-sensitive',
        ]);
    });
});
