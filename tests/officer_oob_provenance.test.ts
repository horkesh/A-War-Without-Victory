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
    return [...report.records, ...report.omissions]
        .flatMap((record) => record.violations.map((violation) => violation.code));
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

    it('retains unsupported candidates as deterministic, non-playable omission rows', () => {
        const omitted = {
            record_kind: 'officer' as const,
            record_id: 'officer_unsupported',
            display_name: 'Unsupported Candidate',
            faction: 'RBiH',
            reason: 'missing_exact_source' as const,
            notes: 'No row-local identity and assignment evidence was found.',
        };
        const input: OfficerOobProvenanceInput = {
            ...fixture.valid,
            manifest: {
                ...fixture.valid.manifest,
                omissions: {
                    'officer:officer_unsupported': omitted,
                },
            },
        };

        const report = buildOfficerOobProvenanceReport(input);

        expect(report.summary).toMatchObject({
            total_records: 3,
            supported_records: 3,
            omitted_records: 1,
            blocking_violations: 0,
        });
        expect(report.omissions).toEqual([{
            record_key: 'officer:officer_unsupported',
            ...omitted,
            violations: [],
        }]);
        expect(report.records.some((record) => record.record_key.includes('officer_unsupported'))).toBe(false);
    });

    it('fails closed when an omission overlaps playable data or its key does not own the candidate', () => {
        const input: OfficerOobProvenanceInput = {
            ...fixture.valid,
            manifest: {
                ...fixture.valid.manifest,
                omissions: {
                    'officer:officer_exact': {
                        record_kind: 'officer',
                        record_id: 'officer_exact',
                        display_name: 'Exact Officer',
                        faction: 'RBiH',
                        reason: 'conflicting_identity',
                        notes: 'This must not coexist with a playable row.',
                    },
                    'officer:wrong_key': {
                        record_kind: 'officer',
                        record_id: 'omitted_candidate',
                        display_name: 'Omitted Candidate',
                        faction: 'RS',
                        reason: 'missing_exact_source',
                        notes: 'The manifest key must match the immutable candidate identity.',
                    },
                },
            },
        };

        const report = buildOfficerOobProvenanceReport(input);

        expect(violationCodes(report)).toEqual(expect.arrayContaining([
            'omission_key_mismatch',
            'omission_overlaps_playable',
        ]));
        expect(report.summary.blocking_violations).toBe(2);
    });

    it('inventories every authoritative OOB source row and retains unsupported named candidates only as omissions', () => {
        const report = loadOfficerOobProvenanceReport(process.cwd());

        expect(report.summary.total_records).toBe(222);
        expect(report.records.filter((record) => record.record_kind === 'officer')).toHaveLength(31);
        expect(report.records.filter((record) => record.record_kind === 'corps')).toHaveLength(19);
        expect(report.records.filter((record) => record.record_kind === 'brigade')).toHaveLength(169);
        expect(report.records.filter((record) => record.record_kind === 'elite_commander')).toHaveLength(3);
        expect(report.summary).toMatchObject({
            manifest_records: 222,
            supported_records: 222,
            unsupported_records: 0,
            omitted_records: 152,
            blocking_violations: 0,
        });
        expect(report.records.every((record) => record.disposition === 'supported')).toBe(true);
        expect(report.omissions.filter((record) => record.record_kind === 'brigade')).toHaveLength(80);
        expect(violationCodes(report)).not.toContain('missing_provenance');
        expect(violationCodes(report)).not.toContain('missing_court_record_citation');
        expect(violationCodes(report)).not.toContain('unresolved_normalized_identity_collision');

        const blaskic = report.records.find((record) => record.record_key === 'officer:hvo_blaskic');
        expect(blaskic?.identity_relation).toEqual({
            kind: 'tenure_of',
            target_record_key: 'officer:hvo_blaskic_2',
        });
        const petkovic = report.records.find((record) => record.record_key === 'officer:hvo_petkovic');
        expect(petkovic?.identity_relation).toEqual({
            kind: 'tenure_of',
            target_record_key: 'officer:hvo_petkovic_2',
        });
    });

    it('keeps the canonical army-command succession roster closed over exact playable officer ids', () => {
        const officerData = JSON.parse(readFileSync(join(
            process.cwd(),
            'data',
            'scenarios',
            'officers',
            'apr1992_officers.json',
        ), 'utf8')) as {
            officers: Array<{
                id: string;
                available_from_turn: number;
                available_until_turn?: number;
            }>;
        };
        const armyRoster = JSON.parse(readFileSync(join(
            process.cwd(),
            'data',
            'scenarios',
            'army_co_roster.json',
        ), 'utf8')) as {
            rosters: Record<string, {
                schedule: Array<{ officer_id: string; replaces_with: string | null }>;
            }>;
        };
        const playableOfficerIds = new Set(officerData.officers.map((officer) => officer.id));
        const officerById = new Map(officerData.officers.map((officer) => [officer.id, officer]));
        const authoredReferences = Object.values(armyRoster.rosters)
            .flatMap((roster) => roster.schedule)
            .flatMap((entry) => [
                entry.officer_id,
                ...(entry.replaces_with ?? '')
                    .split('|')
                    .filter((candidate) => candidate.length > 0 && candidate !== 'political_bot_pick'),
            ])
            .sort();

        expect(authoredReferences.filter((officerId) => !playableOfficerIds.has(officerId))).toEqual([]);
        expect(armyRoster.rosters.HRHB.schedule.map((entry) => entry.officer_id)).toEqual([
            'hvo_petkovic',
            'hvo_praljak',
            'hvo_roso',
            'hvo_petkovic_2',
            'hvo_blaskic_2',
        ]);
        expect(armyRoster.rosters.HRHB.schedule[2]?.replaces_with).toBe('hvo_petkovic_2');
        expect([
            officerById.get('hvo_petkovic')?.available_until_turn,
            officerById.get('hvo_praljak')?.available_from_turn,
            officerById.get('hvo_praljak')?.available_until_turn,
            officerById.get('hvo_roso')?.available_from_turn,
            officerById.get('hvo_roso')?.available_until_turn,
            officerById.get('hvo_petkovic_2')?.available_from_turn,
            officerById.get('hvo_petkovic_2')?.available_until_turn,
            officerById.get('hvo_blaskic_2')?.available_from_turn,
        ]).toEqual([68, 68, 84, 84, 108, 108, 122, 122]);
    });
});
