import { describe, expect, it } from 'vitest';

import {
    buildEventTaxonomyReport,
    classifyEventTaxonomy,
    classifyTriggerEmergence,
    collectCatalogFindings,
    loadCatalogRows,
} from '../../../tools/diagnostics/event_taxonomy_report';

describe('event taxonomy diagnostic report', () => {
    it('loads the fixed five-file catalog in deterministic order', () => {
        const rows = loadCatalogRows();

        expect(rows).toHaveLength(247);
        expect([...new Set(rows.map((row) => row.file))]).toEqual([
            'data/scenarios/events/war_1992.json',
            'data/scenarios/events/war_1993.json',
            'data/scenarios/events/war_1994.json',
            'data/scenarios/events/war_1995.json',
            'data/scenarios/events/consequences.json',
        ]);
        expect(rows.map((row) => `${row.file_index}:${row.catalog_index}:${row.id}`).slice(0, 3)).toEqual([
            '0:0:rs_strategic_goals',
            '0:1:rbih_state_identity',
            '0:3:arms_embargo_impact_1992',
        ]);
    });

    it('reports one row per current event id and no duplicate ids', () => {
        const report = buildEventTaxonomyReport(loadCatalogRows());

        expect(report.summary.total_events).toBe(247);
        expect(report.summary.duplicate_event_ids).toEqual([]);
        expect(new Set(report.rows.map((row) => row.id)).size).toBe(247);
    });

    it('classifies trigger emergence from phase, prerequisites, pressure, and condition types', () => {
        const rows = loadCatalogRows();
        const strategicGoals = rows.find((row) => row.id === 'rs_strategic_goals');
        const conditional = rows.find((row) => row.condition_types.length > 0);

        expect(strategicGoals).toBeDefined();
        expect(classifyTriggerEmergence(strategicGoals!)).toBe('scheduled_pressure');
        expect(conditional).toBeDefined();
        expect(classifyTriggerEmergence(conditional!)).toMatch(/condition/);
    });

    it('pins current choice and required-response inventory without changing catalog behavior', () => {
        const report = buildEventTaxonomyReport(loadCatalogRows());

        expect(report.summary.choice_events).toBe(44);
        expect(report.summary.no_choice_events).toBe(203);
        expect(report.summary.required_response_events).toBe(36);
        expect(report.summary.choice_rows_with_title_and_narrative).toBe(44);
        expect(report.summary.choice_rows_with_source).toBe(22);
        expect(report.summary.required_response_rows_with_source).toBe(20);
        expect(report.summary.historical_default_markers).toBe(5);
        expect(report.summary.historical_default_ids).toBe(5);
        expect(report.summary.modal_ready_events).toBe(5);
    });

    it('requires required-response choice rows to declare a valid responding faction', () => {
        const findings = collectCatalogFindings(loadCatalogRows());

        expect(findings.filter((finding) => finding.code === 'missing_responding_faction')).toEqual([]);
        expect(findings.filter((finding) => finding.code === 'invalid_responding_faction')).toEqual([]);
    });

    it('surfaces duplicate event ids and duplicate response ids or labels as findings', () => {
        const rows = loadCatalogRows();
        const duplicatedEvent = { ...rows[0], id: rows[1].id, findings: [] };
        const duplicatedResponse = {
            ...rows[0],
            id: 'diagnostic_duplicate_response_fixture',
            response_options: [
                { id: 'same', label: 'Same', description: null },
                { id: 'same', label: 'Same', description: null },
            ],
            findings: [],
        };

        const findings = collectCatalogFindings([rows[1], duplicatedEvent, duplicatedResponse]);

        expect(findings.some((finding) => finding.code === 'duplicate_event_id')).toBe(true);
        expect(findings.some((finding) => finding.code === 'duplicate_response_id')).toBe(true);
        expect(findings.some((finding) => finding.code === 'duplicate_response_label')).toBe(true);
    });

    it('surfaces missing source, unknown effect kinds, and unknown condition types as diagnostic findings', () => {
        const sourceFinding = collectCatalogFindings(loadCatalogRows()).find((finding) => finding.code === 'missing_source');
        const fixture = {
            ...loadCatalogRows()[0],
            id: 'unknown_taxonomy_fixture',
            effect_kinds: ['new_effect_kind'],
            condition_types: ['new_condition_type'],
            findings: [],
        };
        const fixtureFindings = collectCatalogFindings([fixture]);

        expect(sourceFinding).toBeDefined();
        expect(fixtureFindings.some((finding) => finding.code === 'unknown_effect_kind')).toBe(true);
        expect(fixtureFindings.some((finding) => finding.code === 'unknown_condition_type')).toBe(true);
    });

    it('flags sensitive-history examples and keeps them out of finished modal-ready classification', () => {
        const report = buildEventTaxonomyReport(loadCatalogRows());
        const sensitiveIds = ['drina_cleansing_decision_1992', 'un_hostage_crisis_1995', 'rs_strategic_goals'];

        for (const id of sensitiveIds) {
            const row = report.rows.find((entry) => entry.id === id);
            expect(row, id).toBeDefined();
            expect(row!.sensitive_history_status).not.toBe('clear');
            expect(row!.findings.some((finding) => finding.code === 'sensitive_history_review')).toBe(true);
            expect(row!.modal_ready).toBe(false);
            expect(row!.row_classification).not.toBe('finished_modal_ready');
        }
    });

    it('keeps current required-response debt visible until source and historical-default markers exist', () => {
        const report = buildEventTaxonomyReport(loadCatalogRows());
        const requiredRows = report.rows.filter((row) => row.requires_player_response);

        expect(requiredRows).toHaveLength(36);
        expect(requiredRows.filter((row) => row.modal_ready).map((row) => row.id)).toEqual([
            'rbih_state_identity',
            'hrhb_political_goal',
            'rs_assembly_rejects_voplan_1993',
            'belgrade_embargo_rs_1994',
            'carter_ceasefire_1994',
        ]);
        expect(requiredRows.filter((row) => classifyEventTaxonomy(row) === 'finished_modal_ready')).toHaveLength(5);
    });

    it('counts event-level historical defaults and validates they reference an existing option id', () => {
        const row = {
            ...loadCatalogRows()[0],
            id: 'diagnostic_explicit_historical_default_fixture',
            requires_player_response: true,
            response_options: [
                { id: 'counterfactual', label: 'Counterfactual', description: 'Alternative path' },
                { id: 'historical', label: 'Historical', description: 'Historical path' },
            ],
            historical_default_response_id: 'historical',
            historical_default_option_id: 'historical',
            has_historical_default_marker: true,
            findings: [],
        };

        const report = buildEventTaxonomyReport([row]);

        expect(report.summary.historical_default_ids).toBe(1);
        expect(report.summary.historical_default_markers).toBe(1);
        expect(report.findings.filter((finding) => finding.code === 'invalid_historical_default_response_id')).toEqual([]);
    });

    it('surfaces invalid historical_default_response_id as a taxonomy finding', () => {
        const row = {
            ...loadCatalogRows()[0],
            id: 'diagnostic_invalid_historical_default_fixture',
            requires_player_response: true,
            response_options: [
                { id: 'first', label: 'First', description: 'First option' },
                { id: 'second', label: 'Second', description: 'Second option' },
            ],
            historical_default_response_id: 'missing_option',
            historical_default_option_id: 'missing_option',
            has_historical_default_marker: true,
            findings: [],
        };

        const findings = collectCatalogFindings([row]);

        expect(findings).toEqual(expect.arrayContaining([
            expect.objectContaining({
                code: 'invalid_historical_default_response_id',
                severity: 'error',
                id: 'diagnostic_invalid_historical_default_fixture',
            }),
        ]));
    });

    it('surfaces accept_first conflicts with explicit non-first historical defaults as calibration debt', () => {
        const row = {
            ...loadCatalogRows()[0],
            id: 'diagnostic_accept_first_conflict_fixture',
            bot_response_logic: 'accept_first',
            requires_player_response: true,
            response_options: [
                { id: 'first', label: 'First', description: 'First option' },
                { id: 'historical', label: 'Historical', description: 'Historical option' },
            ],
            historical_default_response_id: 'historical',
            historical_default_option_id: 'historical',
            has_historical_default_marker: true,
            findings: [],
        };

        const findings = collectCatalogFindings([row]);

        expect(findings).toEqual(expect.arrayContaining([
            expect.objectContaining({
                code: 'accept_first_historical_default_conflict',
                severity: 'warning',
                id: 'diagnostic_accept_first_conflict_fixture',
            }),
        ]));
    });

    it('marks source/sensitive blocked defaults as unavailable instead of ordinary missing metadata', () => {
        const report = buildEventTaxonomyReport(loadCatalogRows());
        const blockedIds = [
            'srebrenica_demilitarization_1993',
            'karadzic_mladic_split_1995',
            'un_hostage_crisis_1995',
            'visit_to_front_rs',
        ];

        for (const id of blockedIds) {
            const row = report.rows.find((entry) => entry.id === id);
            expect(row, id).toBeDefined();
            expect(row!.historical_default_unavailable_reason).not.toBeNull();
            expect(row!.findings).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    code: 'historical_default_unavailable',
                    severity: 'warning',
                }),
            ]));
            expect(row!.modal_ready).toBe(false);
        }
    });

    it('treats csq consequence/counterfactual choice rows as blocked for inferred historical defaults', () => {
        const row = {
            ...loadCatalogRows()[0],
            id: 'csq_counterfactual_offer_fixture',
            requires_player_response: true,
            response_options: [
                { id: 'take_offer', label: 'Take offer', description: 'Counterfactual offer' },
                { id: 'decline_offer', label: 'Decline offer', description: 'Counterfactual refusal' },
            ],
            historical_default_unavailable_reason: 'counterfactual_consequence_offer',
            findings: [],
        };

        const report = buildEventTaxonomyReport([row]);

        expect(report.summary.historical_default_unavailable_events).toBe(1);
        expect(report.rows[0].historical_default_unavailable_reason).toBe('counterfactual_consequence_offer');
        expect(report.findings).toEqual(expect.arrayContaining([
            expect.objectContaining({
                code: 'historical_default_unavailable',
                id: 'csq_counterfactual_offer_fixture',
            }),
        ]));
    });
});
