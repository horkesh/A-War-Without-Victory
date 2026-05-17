import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Sarajevo ID-set canon annotations', () => {
    it('marks Sarajevo ID-set membership as engine geometry, not scenario-author tunable', () => {
        const files = [
            resolve('src/sim/combat/enclave_resilience.ts'),
            resolve('src/state/enclave_integrity.ts'),
        ];

        for (const file of files) {
            const source = readFileSync(file, 'utf8');
            expect(source).toContain('SARAJEVO_ID_SET_ENGINE_GEOMETRY_CANON');
            expect(source).toContain('ID-set membership is engine geometry. Not scenario-author tunable.');
            expect(source).toContain('docs/plans/2026-05-17-sarajevo-special-casing-canon-plan.md');
            expect(source).toContain('SENSITIVE_HISTORY_DESIGN_GATE.md');
        }
    });
});
