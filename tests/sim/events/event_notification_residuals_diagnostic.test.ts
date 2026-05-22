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

        expect(payload.rows).toBe(9);
        expect(payload.missing_blocks).toBe(38);
        expect(payload.residuals.map((row: { event: string }) => row.event).sort()).toEqual([
            'concentration_camps_revealed_1992',
            'drina_cleansing_decision_1992',
            'nato_ultimatum_sarajevo_1994',
            'operation_lukavac_93',
            'srebrenica_demilitarization_1993',
            'un_hostage_crisis_1995',
            'visit_to_front_hrhb',
            'visit_to_front_rbih',
            'visit_to_front_rs',
        ]);
    });
});
