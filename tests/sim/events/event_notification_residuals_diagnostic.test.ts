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

        expect(payload.rows).toBe(3);
        expect(payload.missing_blocks).toBe(10);
        expect(payload.residuals.map((row: { event: string }) => row.event).sort()).toEqual([
            'srebrenica_demilitarization_1993',
            'visit_to_front_hrhb',
            'visit_to_front_rs',
        ]);
    });
});
