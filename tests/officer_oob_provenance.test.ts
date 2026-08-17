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

/**
 * Officers KEPT IN PLAYABLE DATA WITHOUT AN UPSTREAM.
 *
 * This is not a parking lot for work in progress. It is the deliberate output of
 * the rule "absence of evidence downgrades confidence, it never deletes a person":
 * the historian searched both Balkan Battlegrounds volumes in full and swept the
 * repository, found no upstream, and these men stay in the game anyway. Erasing
 * them is what this whole lane exists to undo — a prior pass deleted 30 officers
 * after searching a 406-of-1,152-page index and reading the null as a defect in
 * the record.
 *
 * Adding an entry means asserting that the search is EXHAUSTED, not pending. If
 * you are still looking, the record is not ready for this list.
 */
const NEEDS_EVIDENCE_ALLOWLIST = [
    {
        id: 'officer:hvo_bilonjic',
        basis:
            'Mato Bilonjić. Every non-derived mention traces to ONE authoring event, the 2026-03-15 roster '
            + 'session: docs/40_reports/20260315_OFFICER_ROSTER_OVERHAUL.md:105 (§4) and :122 (§5). '
            + 'docs/PROJECT_LEDGER_ARCHIVE_2026Q1.md:17319 and :17321 are that same session recorded a second '
            + 'time, not corroboration — :17321 reads "Added `elite_commander` field to all 8 elite brigades '
            + '(...Bilonjić/4th Sinovi Posavine)". docs/knowledge/WIKIPEDIA_OOB_CROSS_REFERENCE.md:456 names the '
            + '4th Guards "Sinovi Posavine" and NO commander — the upstream is silent exactly where it would '
            + 'have to speak. Balkan Battlegrounds: zero hits for "Bilonj" and zero for "Sinovi Posavine" across '
            + 'both volumes. Restored to playable data because absence downgrades confidence and never deletes. '
            + 'Moves as one with the allowlisted elite_commander:hvo_4th_guard_sinovi_posavine gap, because both '
            + 'rest on that same authoring event.',
    },
    {
        id: 'officer:hvo_obradovic',
        basis:
            'Nedjeljko Obradović. docs/knowledge/WIKIPEDIA_OOB_CROSS_REFERENCE.md:375 names the 1st "Knez '
            + 'Domagoj" Čapljina brigade and NO commander; the only person-to-brigade attribution is a project '
            + 'design document plus audit reports derived from this same data. THE MAN IS REAL, THE COMMAND IS '
            + 'UNSOURCED — and both halves matter: Slobodna Bosna reports an indictment raised in Croatia against '
            + 'Nedjeljko Obradović, which establishes him as an identifiable HVO general rather than a phantom, '
            + 'while still not sourcing his brigade command. The NEEDS-EVIDENCE finding stands on the OOB '
            + 'question only. NEAR-MISS TRAP, and more necessary for a downgraded record than for any other, '
            + 'because this is the one someone will try to "confirm": Balkan Battlegrounds contains eleven '
            + 'occurrences of "Obradovic" and every one is VUK Obradović, a JNA colonel and chef de cabinet to '
            + 'Federal Secretary Veljko Kadijević (Volume II, PDF p. 204 / printed 185). Different man, '
            + 'different army. Do not cite BB on this record.',
    },
] as const;

const needsEvidenceAllowlistedIds = NEEDS_EVIDENCE_ALLOWLIST
    .map((entry) => entry.id)
    .slice()
    .sort();

describe('officer/OOB provenance inventory', () => {
    it('accepts exact, sourced identities and emits the required report fields', () => {
        const report = buildOfficerOobProvenanceReport(fixture.valid);

        expect(report.schema_version).toBe(1);
        expect(report.summary).toMatchObject({
            total_records: 3,
            omitted_candidate_records: 1,
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
        expect(report.omitted_candidates).toEqual([
            expect.objectContaining({
                record_key: 'officer:officer_candidate',
                record_kind: 'omitted_candidate',
                disposition: 'omitted',
                conflict: 'Identity or assignment is not supported by an accepted source.',
                violations: [],
            }),
        ]);
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
            'missing_provenance',
            'missing_corps_ref',
            'non_exact_confidence',
            'unsupported_disposition',
            'unsupported_source_tier',
            'unresolved_normalized_identity_collision',
        ]));
        expect(report.summary.blocking_violations).toBeGreaterThan(0);
    });

    it('treats an uncited court record as a citation TODO, never as grounds to drop the finding', () => {
        const report = buildOfficerOobProvenanceReport(fixture.invalid);
        const todos = report.records
            .flatMap((record) => record.violations)
            .filter((item) => item.code === 'court_record_citation_todo');

        // Uncited != untrue. The finding stays in playable data; only the paperwork is owed.
        expect(todos.length).toBeGreaterThan(0);
        expect(todos.every((item) => item.severity === 'warning')).toBe(true);
        expect(violationCodes(report)).not.toContain('missing_court_record_citation');
    });

    it('keeps a supported identity supported when only its court citation is outstanding', () => {
        const officers = fixture.valid.officers.officers.map((officer) => (
            officer.id === 'officer_exact'
                ? { ...officer, war_crimes_record: { court: 'ICTY', verdict: 'convicted' } }
                : officer
        ));
        const report = buildOfficerOobProvenanceReport({ ...fixture.valid, officers: { officers } });

        expect(report.summary).toMatchObject({
            supported_records: 3,
            unsupported_records: 0,
            blocking_violations: 0,
        });
        expect(report.summary.violations_by_code).toMatchObject({ court_record_citation_todo: 1 });
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

        // Counts after the historian's full-text BB pass restored 22 officers and
        // 2 elite-commander pairings that an earlier search had missed against a
        // 406-of-1,152-page index, plus brigade:rs_visegrad_brigade, which had been
        // deleted as an "exact alias" of rs_5th_podrinje but is a separate brigade
        // merged into it only in mid/late 1994 (BB2 p.310/291 fns 118 and 121).
        // ...and hvo_hrvoje_vukcic_brigade, which was deleted on name grounds and is
        // in fact the JAJCE formation (BB2 Annex 29, p.349/330), re-homed there under
        // Central Bosnia rather than the post-fall Tomislavgrad assignment.
        // Officers 68 -> 90, elite commanders 3 -> 5, brigades 244 -> 246,
        // omitted candidates 40 -> 14.
        expect(report.summary.total_records).toBe(360);
        expect(report.records.filter((record) => record.record_kind === 'officer')).toHaveLength(90);
        expect(report.records.filter((record) => record.record_kind === 'corps')).toHaveLength(19);
        expect(report.records.filter((record) => record.record_kind === 'brigade')).toHaveLength(246);
        expect(report.records.filter((record) => record.record_kind === 'elite_commander')).toHaveLength(5);
        expect(report.summary.manifest_records).toBe(360);
        expect(report.summary.omitted_candidate_records).toBe(14);
        expect(violationCodes(report)).not.toContain('missing_provenance');

        const petkovic = report.records.find((record) => record.record_key === 'officer:hvo_petkovic');
        const petkovicSecond = report.records.find((record) => record.record_key === 'officer:hvo_petkovic_2');
        expect(petkovic?.duplicate_record_keys).toContain('officer:hvo_petkovic_2');
        expect(petkovicSecond?.duplicate_record_keys).toContain('officer:hvo_petkovic');
        expect(petkovicSecond?.identity_relation).toEqual({
            kind: 'tenure_of',
            target_record_key: 'officer:hvo_petkovic',
        });
        expect(violationCodes(report)).not.toContain('unresolved_normalized_identity_collision');

        const exactRelations = report.records
            .filter((record) => record.identity_relation != null)
            .map((record) => [record.record_key, record.identity_relation])
            .sort(([a], [b]) => String(a).localeCompare(String(b)));
        expect(exactRelations).toEqual([
            ['elite_commander:hvo_1st_guard_abb', {
                kind: 'same_person',
                target_record_key: 'officer:hvo_glasnovic',
            }],
            ['elite_commander:hvo_2nd_guard_mechanized', {
                kind: 'same_person',
                target_record_key: 'officer:hvo_sopta',
            }],
            // Ilija Nakić. This relation is what stops the two Nakićs collapsing
            // into one identity: officer:hvo_nakic is FRANJO (Blaškić's deputy at
            // the Central Bosnia OZ, BB2 p.446/427), officer:hvo_i_nakic is ILIJA
            // (Frankopan Brigade, then 3rd Guards "Jastrebovi"). A previous pass
            // erased Ilija and kept Franjo. The pairing and the person must move
            // together or the repository asserts and denies the same fact.
            ['elite_commander:hvo_3rd_guard_jastrebovi', {
                kind: 'same_person',
                target_record_key: 'officer:hvo_i_nakic',
            }],
            ['officer:hvo_blaskic_2', {
                kind: 'tenure_of',
                target_record_key: 'officer:hvo_blaskic',
            }],
            ['officer:hvo_petkovic_2', {
                kind: 'tenure_of',
                target_record_key: 'officer:hvo_petkovic',
            }],
        ]);
    });

    it('requires every playable corps identity to own exact row-level provenance', () => {
        const report = loadOfficerOobProvenanceReport(process.cwd());
        const corpsRecords = report.records.filter((record) => record.record_kind === 'corps');

        expect(corpsRecords).toHaveLength(19);
        expect(corpsRecords.map((record) => record.record_key)).toEqual(
            [...corpsRecords.map((record) => record.record_key)].sort(),
        );
        expect(corpsRecords.every((record) => record.disposition === 'supported')).toBe(true);
        expect(corpsRecords.flatMap((record) => record.violations)).toEqual([]);
    });

    it('promotes the exact Appendix G/H and HVO-list brigade packet with row-owned evidence', () => {
        const report = loadOfficerOobProvenanceReport(process.cwd());
        const supportedBrigades = report.records.filter((record) =>
            record.record_kind === 'brigade' && record.disposition === 'supported');

        expect(supportedBrigades.length).toBeGreaterThanOrEqual(212);
        expect(supportedBrigades.flatMap((record) => record.violations)).toEqual([]);
        expect(supportedBrigades.map((record) => record.record_key)).toEqual(expect.arrayContaining([
            'brigade:arbih_120th_liberation_black_swans',
            'brigade:rs_1st_guards_motorized',
            'brigade:hrhb_101st_oraje_brigade',
            'brigade:hrhb_115th_zrinski_brigade',
        ]));
    });

    it('fails closed: every playable identity is supported except an exhaustive NEEDS-EVIDENCE allowlist', () => {
        const report = loadOfficerOobProvenanceReport(process.cwd());

        const unsupported = report.records
            .filter((record) => record.disposition !== 'supported')
            .map((record) => record.record_key)
            .sort();

        // EXHAUSTIVE, both directions. A new unsupported record fails here, and so
        // does an allowlist entry that has since been sourced — which forces the
        // entry to be removed rather than left to rot.
        expect(unsupported).toEqual(needsEvidenceAllowlistedIds);

        // Every blocking violation must belong to an allowlisted record. This is the
        // discriminating half: the gate stays fully strict for all 356 other records.
        const allowlisted = new Set<string>(needsEvidenceAllowlistedIds);
        const strayBlocking = report.records
            .filter((record) => !allowlisted.has(record.record_key))
            .flatMap((record) => record.violations
                .filter((violation) => violation.severity === 'blocking')
                .map((violation) => `${record.record_key}:${violation.code}`))
            .sort();
        expect(strayBlocking).toEqual([]);

        expect(report.summary.omitted_candidate_records).toBeGreaterThan(0);
        expect(report.omitted_candidates.every((record) =>
            record.disposition === 'omitted' && record.violations.length === 0)).toBe(true);
    });

    it('every NEEDS-EVIDENCE allowlist entry states its basis', () => {
        // A bare id list is what let five elite-commander attributions be dropped
        // with no way to see on what grounds. Require the grounds to exist here too.
        for (const entry of NEEDS_EVIDENCE_ALLOWLIST) {
            expect(entry.basis.length).toBeGreaterThan(120);
        }
    });
});
