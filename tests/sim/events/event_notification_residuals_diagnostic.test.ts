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

        expect(payload.rows).toBe(2);
        expect(payload.missing_blocks).toBe(4);
        expect(payload.classified_blocks).toBe(4);
        expect(payload.unclassified_blocks).toBe(0);
        expect(payload.residuals.map((row: { event: string }) => row.event).sort()).toEqual([
            'visit_to_front_hrhb',
            'visit_to_front_rs',
        ]);
        expect(payload.residuals.flatMap((row: { missing: Array<{ bucket: string }> }) => row.missing).map((entry: { bucket: string }) => entry.bucket)).toEqual([
            'blocked-sensitive',
            'blocked-sensitive',
            'blocked-sensitive',
            'blocked-sensitive',
        ]);
    });
});
