import { describe, expect, it } from 'vitest';

import {
    auditOperationCommitments,
    runOperationCommitmentPositiveControl,
} from '../tools/diagnostics/operation_commitment_audit.js';

function operation(name: string, phase: string, participants: string[]) {
    return {
        corps_id: `corps_${name}`,
        operation_name: name,
        operation_phase: phase,
        participating_brigades: participants,
    };
}

describe('operation commitment audit', () => {
    it('detects cross-operation planning/execution collisions but ignores recovery', () => {
        const result = auditOperationCommitments([{
            week_index: 182,
            operation_diagnostics: [
                operation('Mistral', 'execution', ['hv_4th', 'hvo_rama']),
                operation('Southern Move', 'planning', ['hv_4th']),
                operation('Old Recovery', 'recovery', ['hvo_rama']),
            ],
        }]);

        expect(result.membership_count).toBe(3);
        expect(result.collisions).toEqual([expect.objectContaining({
            week: 182,
            brigade_id: 'hv_4th',
        })]);
    });

    it('proves a clean projection can detect one injected collision', () => {
        const rows = [{
            week_index: 1,
            operation_diagnostics: [
                operation('First', 'planning', ['brigade_a']),
                operation('Second', 'execution', ['brigade_b']),
            ],
        }];

        expect(auditOperationCommitments(rows).collisions).toEqual([]);
        expect(runOperationCommitmentPositiveControl(rows)).toMatchObject({
            injected: true,
            brigade_id: 'brigade_a',
            week: 1,
            collision_delta: 1,
        });
    });
});
