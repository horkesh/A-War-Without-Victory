import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
    buildOfficerOobProvenanceReport,
    loadOfficerOobProvenanceReport,
    serializeOfficerOobProvenanceReport,
    type OfficerOobProvenanceEntry,
    type OfficerOobProvenanceInput,
} from '../tools/diagnostics/officer_oob_provenance.js';

interface FixtureCases {
    valid: OfficerOobProvenanceInput;
    invalid: OfficerOobProvenanceInput;
}

const fixture = JSON.parse(readFileSync(join(
    process.cwd(),
    'tests',
    'fixtures',
    'provenance',
    'officer_oob_cases.json',
), 'utf8')) as FixtureCases;

function violationCodes(report: ReturnType<typeof buildOfficerOobProvenanceReport>): string[] {
    return report.records.flatMap((record) => record.violations.map((violation) => violation.code));
}

describe('officer/OOB provenance inventory', () => {
    it('accepts exact, sourced identities and emits the required report fields', () => {
        const report = buildOfficerOobProvenanceReport(fixture.valid);

        expect(report.schema_version).toBe(1);
        expect(report.summary).toMatchObject({
            total_records: 3,
            supported_records: 3,
            unsupported_records: 0,
            blocking_violations: 0,
        });
        expect(report.records.map((record) => record.record_key)).toEqual([
            'brigade:brigade_exact',
            'corps:corps_exact',
            'officer:officer_exact',
        ]);
        expect(report.records[2]).toMatchObject({
            record_kind: 'officer',
            record_id: 'officer_exact',
            display_name: 'Exact Officer',
            faction: 'RBiH',
            formation_ref: null,
            corps_refs: ['corps_exact'],
            source: 'Official appointment record',
            source_tier: 'official',
            citation: 'Appointment record, item 2',
            confidence: 'exact',
            duplicate_record_keys: [],
            conflict: null,
            disposition: 'supported',
            violations: [],
        });
    });

    it('rejects positive provenance inherited from manifest defaults as non-exact row evidence', () => {
        const officerEntry = fixture.valid.manifest.records['officer:officer_exact'] as OfficerOobProvenanceEntry;
        const withDefaults: OfficerOobProvenanceInput = {
            ...fixture.valid,
            manifest: {
                schema_version: 1,
                defaults: officerEntry,
                records: Object.fromEntries(
                    Object.keys(fixture.valid.manifest.records).map((recordKey) => [recordKey, {}]),
                ),
            },
        };

        const report = buildOfficerOobProvenanceReport(withDefaults);

        expect(report.summary).toMatchObject({
            manifest_records: 3,
            supported_records: 0,
            unsupported_records: 3,
        });
        expect(report.summary.blocking_violations).toBeGreaterThanOrEqual(3);
        expect(violationCodes(report)).toContain('inherited_positive_provenance');
    });

    it('fails duplicate ids, dead/cross-faction refs, inferred matches, missing citations, and orphan manifest rows', () => {
        const report = buildOfficerOobProvenanceReport(fixture.invalid);
        const codes = violationCodes(report);

        expect(codes).toEqual(expect.arrayContaining([
            'cross_faction_corps_ref',
            'duplicate_record_id',
            'inferred_identity_relation',
            'manifest_record_orphaned',
            'missing_citation',
            'missing_court_record_citation',
            'missing_provenance',
            'missing_corps_ref',
            'non_exact_confidence',
            'unsupported_disposition',
            'unsupported_source_tier',
            'unresolved_normalized_identity_collision',
        ]));
        expect(report.summary.blocking_violations).toBeGreaterThan(0);
    });

    it('is independent of source and manifest insertion order and serializes repository-relative truth only', () => {
        const reversed: OfficerOobProvenanceInput = {
            officers: { officers: [...fixture.valid.officers.officers].reverse() },
            corps: { corps: [...fixture.valid.corps.corps].reverse() },
            brigades: [...fixture.valid.brigades].reverse(),
            manifest: {
                ...fixture.valid.manifest,
                records: Object.fromEntries(Object.entries(fixture.valid.manifest.records).reverse()),
            },
        };

        const first = serializeOfficerOobProvenanceReport(buildOfficerOobProvenanceReport(fixture.valid));
        const second = serializeOfficerOobProvenanceReport(buildOfficerOobProvenanceReport(reversed));

        expect(second).toBe(first);
        expect(first).not.toMatch(/[A-Z]:\\/i);
        expect(first).not.toContain('generated_at');
        expect(first).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:/);
    });

    it('inventories every repository officer, corps, brigade, and named elite commander from the sidecar', () => {
        const report = loadOfficerOobProvenanceReport(process.cwd());

        expect(report.summary.total_records).toBe(374);
        expect(report.records.filter((record) => record.record_kind === 'officer')).toHaveLength(98);
        expect(report.records.filter((record) => record.record_kind === 'corps')).toHaveLength(19);
        expect(report.records.filter((record) => record.record_kind === 'brigade')).toHaveLength(249);
        expect(report.records.filter((record) => record.record_kind === 'elite_commander')).toHaveLength(8);
        expect(report.summary.manifest_records).toBe(374);
        expect(violationCodes(report)).not.toContain('missing_provenance');

        const petkovic = report.records.find((record) => record.record_key === 'officer:hvo_petkovic');
        const petkovicSecond = report.records.find((record) => record.record_key === 'officer:hvo_petkovic_2');
        expect(petkovic?.duplicate_record_keys).toContain('officer:hvo_petkovic_2');
        expect(petkovicSecond?.duplicate_record_keys).toContain('officer:hvo_petkovic');
        expect(petkovicSecond?.violations.map((violation) => violation.code)).toContain(
            'unresolved_normalized_identity_collision',
        );
    });
});
