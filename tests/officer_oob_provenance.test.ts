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

    it('fails closed when a repo source target is missing, escaping, or malformed', () => {
        const buildWithRoot = buildOfficerOobProvenanceReport as unknown as (
            input: OfficerOobProvenanceInput,
            rootDir: string,
        ) => ReturnType<typeof buildOfficerOobProvenanceReport>;
        const cases = [
            ['repo_source_missing', 'repo://docs/knowledge/does-not-exist.md'],
            ['repo_source_escapes_root', 'repo://../outside.md'],
            ['repo_source_malformed', 'repo://'],
        ] as const;

        for (const [expectedCode, sourceUrl] of cases) {
            const input = structuredClone(fixture.valid);
            input.manifest.records['officer:officer_exact']!.source_url = sourceUrl;
            const report = buildWithRoot(input, process.cwd());
            expect(violationCodes(report), sourceUrl).toContain(expectedCode);
        }
    });

    it('requires temporal evidence for turn-zero availability', () => {
        const input = structuredClone(fixture.valid);
        input.officers.officers[0]!.available_from_turn = 0;
        input.manifest.records['officer:officer_exact']!.temporal_evidence = [];

        const report = buildOfficerOobProvenanceReport(input);

        expect(violationCodes(report)).toContain('missing_temporal_evidence');
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

    it('fails closed on missing or calendar-inconsistent officer chronology evidence', () => {
        const officer = fixture.valid.officers.officers[0]!;
        const input: OfficerOobProvenanceInput = {
            ...fixture.valid,
            officers: {
                officers: fixture.valid.officers.officers.map((row) => row.id === officer.id
                    ? { ...row, available_from_turn: 2 }
                    : row),
            },
        };

        const missing = buildOfficerOobProvenanceReport(input);
        expect(violationCodes(missing)).toContain('missing_temporal_evidence');

        const inconsistent = buildOfficerOobProvenanceReport({
            ...input,
            manifest: {
                ...input.manifest,
                records: {
                    ...input.manifest.records,
                    [`officer:${officer.id}`]: {
                        ...input.manifest.records[`officer:${officer.id}`],
                        temporal_evidence: [{
                            field: 'available_from_turn',
                            source_date: '1992-04-21',
                            precision: 'exact_date',
                            modeled_turn: 2,
                            boundary_rule: 'first campaign-week boundary on or after the exact source date',
                            citation: 'Official appointment record, item 2',
                        }],
                    },
                },
            },
        });

        expect(violationCodes(inconsistent)).toContain('temporal_boundary_mismatch');

        const invalidDate = buildOfficerOobProvenanceReport({
            ...input,
            manifest: {
                ...input.manifest,
                records: {
                    ...input.manifest.records,
                    [`officer:${officer.id}`]: {
                        ...input.manifest.records[`officer:${officer.id}`],
                        temporal_evidence: [{
                            field: 'available_from_turn',
                            source_date: '1992-04-31',
                            precision: 'exact_date',
                            modeled_turn: 2,
                            boundary_rule: 'first campaign-week boundary on or after the exact source date',
                            citation: 'Official appointment record, item 2',
                        }],
                    },
                },
            },
        });

        expect(violationCodes(invalidDate)).toContain('invalid_temporal_source_date');
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

        expect(report.records.filter((record) => record.record_kind === 'officer')).toHaveLength(63);
        expect(report.records.filter((record) => record.record_kind === 'corps')).toHaveLength(19);
        expect(report.records.filter((record) => record.record_kind === 'brigade')).toHaveLength(238);
        expect(report.records.filter((record) => record.record_kind === 'elite_commander')).toHaveLength(3);
        expect(report.summary).toMatchObject({
            total_records: 323,
            manifest_records: 323,
            supported_records: 323,
            unsupported_records: 0,
            omitted_records: 51,
            blocking_violations: 0,
        });
        expect(report.records.every((record) => record.disposition === 'supported')).toBe(true);
        expect(report.omissions.filter((record) => record.record_kind === 'brigade')).toHaveLength(11);
        expect(violationCodes(report)).not.toContain('missing_provenance');
        expect(violationCodes(report)).not.toContain('missing_court_record_citation');
        expect(violationCodes(report)).not.toContain('unresolved_normalized_identity_collision');

        const playableOfficers = JSON.parse(readFileSync(join(
            process.cwd(),
            'data',
            'scenarios',
            'officers',
            'apr1992_officers.json',
        ), 'utf8')) as { officers: Array<{ id: string; historical_role?: string }> };
        expect(playableOfficers.officers.every((officer) => officer.historical_role != null)).toBe(true);
        expect(playableOfficers.officers.find((officer) => officer.id === 'arbih_nanic')?.historical_role)
            .toBe('brigade_commander');
        expect(playableOfficers.officers.find((officer) => officer.id === 'arbih_oric')?.historical_role)
            .toBe('enclave_commander');
        expect(playableOfficers.officers.find((officer) => officer.id === 'hvo_kordic')?.historical_role)
            .toBe('political_military_authority');

        const playableBrigades = JSON.parse(readFileSync(join(
            process.cwd(),
            'data',
            'source',
            'oob_brigades.json',
        ), 'utf8')) as Array<{ id: string; faction: string; recruit_pool_faction?: string }>;
        expect(playableBrigades.find((brigade) => brigade.id === 'arbih_107th_gradacac_brigade'))
            .toMatchObject({ faction: 'RBiH', recruit_pool_faction: 'RBiH' });
        expect(playableBrigades.some((brigade) => brigade.id === 'hrhb_107th_gradaac_brigade')).toBe(false);

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

    it('keeps every generated or runtime-authored historical formation dependency in the playable OOB', () => {
        const root = process.cwd();
        const oob = JSON.parse(readFileSync(join(root, 'data', 'source', 'oob_brigades.json'), 'utf8')) as Array<{ id: string }>;
        const designations = JSON.parse(readFileSync(
            join(root, 'data', 'source', 'oob_brigade_designations.json'),
            'utf8',
        )) as { rows: Array<{ id: string }> };
        const startup = readFileSync(
            join(root, 'data', 'derived', 'startup', 'apr_1992_initial_save.json'),
            'utf8',
        );
        const authoredRuntime = [
            'src/sim/combat/triggered_operations.ts',
            'src/sim/combat/pre_planned_operations.ts',
            'src/sim/combat/operation_opportunity_catalog_5th_corps.ts',
            'src/sim/combat/operation_opportunity_catalog_central_bosnia.ts',
            'src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts',
            'src/sim/combat/enclave_resilience.ts',
            'src/sim/combat/sector_offensive_launch_helpers.ts',
            'src/sim/combat/sector_territory.ts',
            'src/sim/combat/tactical_group_anchor.ts',
        ].map((relativePath) => readFileSync(join(root, ...relativePath.split('/')), 'utf8')).join('\n');
        const referencedText = `${startup}\n${authoredRuntime}`;
        const playableIds = new Set(oob.map((row) => row.id));
        const missing = designations.rows
            .map((row) => row.id)
            .filter((id) => referencedText.includes(`\"${id}\"`) || referencedText.includes(`'${id}'`))
            .filter((id) => !playableIds.has(id))
            .sort();

        expect(missing).toEqual([]);
    });

    it('contains no generated officer residue from omitted identities', () => {
        const root = process.cwd();
        const officerData = JSON.parse(readFileSync(join(
            root,
            'data',
            'scenarios',
            'officers',
            'apr1992_officers.json',
        ), 'utf8')) as { officers: Array<{ id: string }> };
        const startup = JSON.parse(readFileSync(join(
            root,
            'data',
            'derived',
            'startup',
            'apr_1992_initial_save.json',
        ), 'utf8')) as {
            military: {
                named_officer_data: Array<{ id: string }>;
                named_officers: Record<string, unknown>;
            };
        };
        const manifest = JSON.parse(readFileSync(join(
            root,
            'docs',
            'provenance',
            'OFFICER_OOB_PROVENANCE.json',
        ), 'utf8')) as {
            omissions: Record<string, { record_kind: string; record_id: string }>;
        };
        const sourceIds = new Set(officerData.officers.map((officer) => officer.id));
        const omittedOfficerIds = Object.values(manifest.omissions)
            .filter((row) => row.record_kind === 'officer')
            .map((row) => row.record_id)
            .sort();
        const staleDataIds = startup.military.named_officer_data
            .map((officer) => officer.id)
            .filter((id) => !sourceIds.has(id))
            .sort();
        const staleStateIds = Object.keys(startup.military.named_officers)
            .filter((id) => !sourceIds.has(id))
            .sort();

        expect(omittedOfficerIds).toHaveLength(35);
        expect(staleDataIds).toEqual([]);
        expect(staleStateIds).toEqual([]);
    });

    it('models sourced chronology at weekly boundaries without inventing exact dates', () => {
        const root = process.cwd();
        const officerData = JSON.parse(readFileSync(join(
            root,
            'data',
            'scenarios',
            'officers',
            'apr1992_officers.json',
        ), 'utf8')) as { officers: Array<{ id: string; available_from_turn: number }> };
        const manifest = JSON.parse(readFileSync(join(
            root,
            'docs',
            'provenance',
            'OFFICER_OOB_PROVENANCE.json',
        ), 'utf8')) as {
            records: Record<string, {
                temporal_evidence?: Array<{
                    field: string;
                    source_date: string;
                    precision: string;
                    modeled_turn: number;
                }>;
            }>;
        };
        const byId = new Map(officerData.officers.map((officer) => [officer.id, officer]));

        expect(byId).toHaveLength(63);
        expect(byId.get('arbih_drekovic')?.available_from_turn).toBe(29);
        expect(byId.get('hvo_petkovic')?.available_from_turn).toBe(2);
        expect(byId.get('vrs_boric')?.available_from_turn).toBe(39);
        expect(byId.get('hvo_matuzovic')?.available_from_turn).toBe(69);

        expect(manifest.records['officer:arbih_drekovic']?.temporal_evidence).toContainEqual(
            expect.objectContaining({
                field: 'available_from_turn',
                source_date: '1992-10-20',
                precision: 'exact_date',
                modeled_turn: 29,
            }),
        );
        expect(manifest.records['officer:hvo_petkovic']?.temporal_evidence).toContainEqual(
            expect.objectContaining({
                field: 'available_from_turn',
                source_date: '1992-04-14',
                precision: 'exact_date',
                modeled_turn: 2,
            }),
        );
        expect(manifest.records['officer:vrs_boric']?.temporal_evidence).toContainEqual(
            expect.objectContaining({
                field: 'available_from_turn',
                source_date: '1992-12-31',
                precision: 'on_or_before',
                modeled_turn: 39,
            }),
        );
        expect(manifest.records['officer:hvo_matuzovic']).toMatchObject({
            source: 'Court of Bosnia and Herzegovina',
            source_url: 'https://sudbih.gov.ba/Post/Read/20504-potvrdjena-optuznica-u-predmetu-djuro-matuzovic-i-dr',
            source_tier: 'official',
        });
        expect(manifest.records['officer:hvo_matuzovic']?.temporal_evidence).toContainEqual(
            expect.objectContaining({
                field: 'available_from_turn',
                source_date: '1993-07-31',
                precision: 'on_or_before',
                modeled_turn: 69,
            }),
        );
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
                schedule: Array<{ officer_id: string; tenure_start: number; replaces_with: string | null }>;
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
        expect(armyRoster.rosters.HRHB.schedule[0]?.tenure_start).toBe(2);
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
