import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { auditAuthoredIdentityDependencies } from '../tools/diagnostics/oob_identity_dependencies.js';

describe('authored OOB identity dependency audit', () => {
    it('closes every recursive scenario, startup, source, sim, and UI identity reference', () => {
        const report = auditAuthoredIdentityDependencies(process.cwd());

        expect(report.missing_brigade_ids).toEqual([]);
        expect(report.missing_officer_ids).toEqual([]);
        expect(report.scanned_files).toEqual(expect.arrayContaining([
            'data/derived/startup/apr_1992_initial_save.json',
            'data/scenarios/jan1993_start.json',
            'data/source/oob_brigade_designations.json',
            'src/sim/combat/triggered_operations.ts',
            'src/ui/map/data/formationNameLocalizations.ts',
        ]));
    });

    it('recursively discovers a stale UI identity outside a selected catalog list', () => {
        const root = join(process.cwd(), 'tests', 'fixtures', 'provenance', 'recursive_identity_surface');

        const report = auditAuthoredIdentityDependencies(root);

        expect(report.missing_brigade_ids).toEqual(['fixture_stale_brigade']);
        expect(report.references_by_id.fixture_stale_brigade).toEqual([
            'data/source/oob_brigade_designations.json',
            'src/ui/map/components/IdentityBearingSurface.ts',
        ]);
    });
});
