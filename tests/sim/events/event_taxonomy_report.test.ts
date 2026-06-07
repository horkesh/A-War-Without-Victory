import { describe, expect, it } from 'vitest';

import {
    buildEventTaxonomyReport,
    buildEventTaxonomyRow,
    classifyEventTaxonomy,
    classifyTriggerEmergence,
    collectCatalogFindings,
    loadCatalogRows,
} from '../../../tools/diagnostics/event_taxonomy_report';

describe('event taxonomy diagnostic report', () => {
    it('loads the fixed five-file catalog in deterministic order', () => {
        const rows = loadCatalogRows();

        expect(rows).toHaveLength(289);
        expect([...new Set(rows.map((row) => row.file))]).toEqual([
            'data/scenarios/events/war_1992.json',
            'data/scenarios/events/war_1993.json',
            'data/scenarios/events/war_1994.json',
            'data/scenarios/events/war_1995.json',
            'data/scenarios/events/consequences.json',
        ]);
        expect(rows.map((row) => `${row.file_index}:${row.catalog_index}:${row.id}`).slice(0, 3)).toEqual([
            '0:0:rs_strategic_goals',
            '0:2:rbih_state_identity',
            '0:1:rs_paramilitary_policy_1992',
        ]);
    });

    it('reports one row per current event id and no duplicate ids', () => {
        const report = buildEventTaxonomyReport(loadCatalogRows());

        expect(report.summary.total_events).toBe(289);
        expect(report.summary.duplicate_event_ids).toEqual([]);
        expect(new Set(report.rows.map((row) => row.id)).size).toBe(289);
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

        expect(report.summary.choice_events).toBe(79);
        expect(report.summary.no_choice_events).toBe(210);
        expect(report.summary.required_response_events).toBe(71);
        expect(report.summary.choice_rows_with_title_and_narrative).toBe(79);
        expect(report.summary.choice_rows_with_source).toBe(71);
        expect(report.summary.required_response_rows_with_source).toBe(67);
        expect(report.summary.historical_default_markers).toBe(56);
        expect(report.summary.historical_default_ids).toBe(56);
        expect(report.summary.modal_ready_events).toBe(45);
        expect(new Map(report.rows
            .filter((row) => row.future_consequence_count > 0)
            .map((row) => [row.id, row.future_consequence_count]))).toEqual(new Map([
            ['rs_strategic_goals', 40],
            ['rbih_state_identity', 43],
            ['rs_paramilitary_policy_1992', 3],
            ['hrhb_political_goal', 40],
            ['rbih_paramilitary_policy_1992', 3],
            ['hrhb_1992_graz_cooperation_collapse', 2],
            ['rs_assembly_rejects_voplan_1993', 2],
            ['rbih_nato_ultimatum_compliance_1994', 2],
            ['rbih_washington_agreement_1994', 2],
            ['belgrade_embargo_rs_1994', 2],
        ]));
        expect(report.rows.flatMap((row) => row.future_consequence_opens_events)).toEqual([
            'belgrade_embargo_rs_1994',
            'deliberate_force_rs_compliance_1995',
            'holbrooke_us_belgrade_channel_1995',
            'karadzic_mladic_split_1995',
            'rs_assembly_rejects_voplan_1993',
            'rs_autonomy_path_decision_1993',
            'rs_belgrade_pressure_response_1993',
            'rs_contact_group_response_1994',
            'rs_dayton_acceptance_1995',
            'rs_owen_stoltenberg_response_1993',
            'rs_paramilitary_policy_1992',
            'rs_washington_rejection_1994',
            'un_hostage_crisis_1995',
            'abdic_apwb_declared_1993',
            'bihac_5th_corps_offensive_1994',
            'csq_bosniak_unity_1993',
            'csq_civic_identity_consolidation_1993',
            'csq_international_disillusionment_1993',
            'csq_minority_defections_1992',
            'csq_pragmatic_coalition_1993',
            'dayton_talks_begin_1995',
            'os_rbih_tactical_acceptance_1993',
            'rbih_arms_embargo_lift_advocacy_1993',
            'rbih_contact_group_response_1994',
            'rbih_federation_army_integration_1994',
            'rbih_late_war_offensive_1995',
            'rbih_minority_retention_1992',
            'rbih_nato_ultimatum_compliance_1994',
            'rbih_paramilitary_policy_1992',
            'rbih_reintegration_offers_1993',
            'rbih_washington_agreement_1994',
            'srebrenica_demilitarization_1993',
            'vance_owen_plan_1993',
            'csq_paramilitary_authorization_refused',
            'csq_federation_early_1994',
            'csq_hvo_central_bosnia_offensive_1993',
            'csq_joint_offensive_1994',
            'csq_joint_operations_agreement_1992',
            'csq_territorial_friction_1993',
            'csq_zagreb_displeasure_1993',
            'hrhb_1992_graz_cooperation_collapse',
            'hrhb_central_bosnia_defense_1993',
            'hrhb_contact_group_response_1994',
            'hrhb_dayton_acceptance_1995',
            'hrhb_federation_army_integration_1994',
            'hrhb_federation_overture_1993',
            'hrhb_owen_stoltenberg_response_1993',
            'hrhb_territorial_scope_1993',
            'hrhb_vance_owen_acceptance_1993',
            'hrhb_washington_agreement_1994',
            'hv_hvo_cooperation_1995',
            'zagreb_orders_hrhb_ceasefire',
            'zagreb_restrains_boban_vopp',
            'csq_international_disillusionment_1993',
            'csq_paramilitary_authorization_refused',
            'gornji_vakuf_clashes_1993',
        ]);
        // Phase E/F foreclosure authoring: the three faction-root historical-default
        // options each foreclose the counterfactual-only consequence branches that
        // their non-chosen siblings would have opened. Catalog order: RS root,
        // then RBiH root, then HRHB root (war_1992.json row order).
        expect(report.rows.flatMap((row) => row.future_consequence_closes_events)).toEqual([
            'csq_drina_partisan_resistance_1992',
            'csq_bosniak_unity_1993',
            'csq_minority_defections_1992',
            'csq_pragmatic_coalition_1993',
            'csq_federation_early_1994',
            'csq_joint_operations_agreement_1992',
            'csq_zagreb_displeasure_1993',
        ]);
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

    it('includes pressure modifier condition types in taxonomy and validates them against the event vocabulary', () => {
        const rows = loadCatalogRows();
        const lukavac = rows.find((row) => row.id === 'operation_lukavac_93');
        const fixture = {
            ...rows[0],
            id: 'unknown_pressure_condition_fixture',
            condition_types: ['new_pressure_condition_type'],
            findings: [],
        };

        expect(lukavac).toBeDefined();
        expect(lukavac!.condition_types).toContain('territory_control');
        expect(collectCatalogFindings([lukavac!]).filter((finding) => finding.code === 'unknown_condition_type')).toEqual([]);
        expect(collectCatalogFindings([fixture])).toEqual(expect.arrayContaining([
            expect.objectContaining({
                code: 'unknown_condition_type',
                id: 'unknown_pressure_condition_fixture',
            }),
        ]));
    });

    it('treats all live EventEffect and EventCondition kinds in the current catalog as known vocabulary', () => {
        const findings = collectCatalogFindings(loadCatalogRows());

        expect(findings.filter((finding) => finding.code === 'unknown_effect_kind')).toEqual([]);
        expect(findings.filter((finding) => finding.code === 'unknown_condition_type')).toEqual([]);
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
            expect(row!.presidential_decision_valid).toBe(false);
            expect(row!.catalog_action).toBe('sensitive-gated');
        }
    });

    it('reports missing historical sources for historically specific rows without changing readiness by auto-fix', () => {
        const row = {
            ...loadCatalogRows()[0],
            id: 'historically_specific_missing_source_fixture',
            historical_source_status: 'missing' as const,
            historical_source: null,
            source_note: null,
            is_historically_specific: true,
            findings: [],
        };

        const report = buildEventTaxonomyReport([row]);

        expect(report.rows[0].is_historically_specific).toBe(true);
        expect(report.rows[0].historical_source).toBeNull();
        expect(report.findings).toEqual(expect.arrayContaining([
            expect.objectContaining({
                code: 'missing_historical_source',
                id: 'historically_specific_missing_source_fixture',
                severity: 'warning',
            }),
        ]));
    });

    it('prevents finished presidential-decision rows from retaining legacy calendar conversion debt', () => {
        const row = {
            ...loadCatalogRows()[1],
            id: 'legacy_calendar_finished_fixture',
            trigger_emergence_class: 'legacy_calendar_pending_conversion',
            row_classification: 'finished_modal_ready',
            modal_ready: true,
            presidential_decision_valid: true,
            findings: [],
        };

        const report = buildEventTaxonomyReport([row]);

        expect(report.rows[0].presidential_decision_valid).toBe(false);
        expect(report.rows[0].row_classification).not.toBe('finished_modal_ready');
        expect(report.findings).toEqual(expect.arrayContaining([
            expect.objectContaining({
                code: 'finished_row_has_legacy_calendar_pending_conversion',
                id: 'legacy_calendar_finished_fixture',
                severity: 'error',
            }),
        ]));
    });

    it('keeps current required-response debt visible until source and historical-default markers exist', () => {
        const report = buildEventTaxonomyReport(loadCatalogRows());
        const requiredRows = report.rows.filter((row) => row.requires_player_response);

        expect(requiredRows).toHaveLength(71);
        expect(requiredRows.filter((row) => row.modal_ready).map((row) => row.id)).toEqual([
            'rbih_state_identity',
            'hrhb_political_goal',
            'rbih_paramilitary_policy_1992',
            'hrhb_1992_graz_cooperation_collapse',
            'rbih_minority_retention_1992',
            'gornji_vakuf_clashes_1993',
            'ic_pressure_vopp_engagement',
            'vance_owen_plan_1993',
            'hrhb_vance_owen_acceptance_1993',
            'hrhb_central_bosnia_defense_1993',
            'rs_assembly_rejects_voplan_1993',
            'hrhb_territorial_scope_1993',
            'operation_lukavac_93',
            'os_rbih_tactical_acceptance_1993',
            'rbih_arms_embargo_lift_advocacy_1993',
            'hrhb_owen_stoltenberg_response_1993',
            'rs_owen_stoltenberg_response_1993',
            'rs_belgrade_pressure_response_1993',
            'abdic_apwb_declared_1993',
            'rbih_reintegration_offers_1993',
            'strategic_posture_review_hrhb',
            'visit_to_front_rbih',
            'hrhb_federation_overture_1993',
            'rs_autonomy_path_decision_1993',
            'rbih_nato_ultimatum_compliance_1994',
            'rs_washington_rejection_1994',
            'hrhb_washington_agreement_1994',
            'rbih_washington_agreement_1994',
            'ic_rbih_restraint_post_washington',
            'contact_group_plan_1994',
            'hrhb_contact_group_response_1994',
            'rbih_contact_group_response_1994',
            'rs_contact_group_response_1994',
            'rbih_federation_army_integration_1994',
            'belgrade_embargo_rs_1994',
            'hrhb_federation_army_integration_1994',
            'bihac_5th_corps_offensive_1994',
            'carter_ceasefire_1994',
            'hv_hvo_cooperation_1995',
            'rbih_late_war_offensive_1995',
            'holbrooke_ceasefire_demand_oct95',
            'dayton_talks_begin_1995',
            'hrhb_dayton_acceptance_1995',
            'rs_dayton_acceptance_1995',
            'csq_patron_recovery_offer',
        ]);
        expect(requiredRows.filter((row) => classifyEventTaxonomy(row) === 'finished_modal_ready')).toHaveLength(45);
    });

    it('classifies packet 3 target rows as finished modal-ready after authored defaults and source notes', () => {
        const report = buildEventTaxonomyReport(loadCatalogRows());

        for (const [id, expectedDefault] of [
            ['operation_lukavac_93', 'comply'],
            ['os_rbih_tactical_acceptance_1993', 'reject_via_assembly'],
            ['csq_patron_recovery_offer', 'accept_recovery'],
        ] as const) {
            const row = report.rows.find((entry) => entry.id === id);
            expect(row, id).toBeDefined();
            expect(row!.modal_ready, id).toBe(true);
            expect(row!.row_classification, id).toBe('finished_modal_ready');
            expect(row!.historical_default_response_id, id).toBe(expectedDefault);
            expect(row!.historical_default_option_id, id).toBe(expectedDefault);
            expect(row!.bot_response_logic, id).toBe('historical');
            expect(row!.has_option_descriptions, id).toBe(true);
            expect(row!.has_numeric_option_previews, id).toBe(true);
            expect(row!.findings, id).not.toEqual(expect.arrayContaining([
                expect.objectContaining({ code: 'historical_default_bot_logic_mismatch' }),
                expect.objectContaining({ code: 'missing_historical_default_marker' }),
            ]));
        }
    });

    it('classifies diplomatic packet rows as finished modal-ready after authored defaults and source notes', () => {
        const report = buildEventTaxonomyReport(loadCatalogRows());

        for (const [id, expectedDefault] of [
            ['hrhb_washington_agreement_1994', 'accept'],
            ['contact_group_plan_1994', 'accept'],
            ['dayton_talks_begin_1995', 'accept'],
        ] as const) {
            const row = report.rows.find((entry) => entry.id === id);
            expect(row, id).toBeDefined();
            expect(row!.modal_ready, id).toBe(true);
            expect(row!.row_classification, id).toBe('finished_modal_ready');
            expect(row!.historical_default_response_id, id).toBe(expectedDefault);
            expect(row!.historical_default_option_id, id).toBe(expectedDefault);
            expect(row!.bot_response_logic, id).toBe('historical');
            expect(row!.has_option_descriptions, id).toBe(true);
            expect(row!.has_numeric_option_previews, id).toBe(true);
            expect(row!.findings, id).not.toEqual(expect.arrayContaining([
                expect.objectContaining({ code: 'historical_default_bot_logic_mismatch' }),
                expect.objectContaining({ code: 'missing_historical_default_marker' }),
            ]));
        }
    });

    it('classifies the 1993 required-response packet as finished modal-ready after authored defaults and source notes', () => {
        const report = buildEventTaxonomyReport(loadCatalogRows());

        for (const [id, expectedDefault] of [
            ['gornji_vakuf_clashes_1993', 'escalate'],
            ['ic_pressure_vopp_engagement', 'acknowledge_pressure'],
            ['vance_owen_plan_1993', 'accept'],
            ['strategic_posture_review_hrhb', 'press_croat_objectives'],
        ] as const) {
            const row = report.rows.find((entry) => entry.id === id);
            expect(row, id).toBeDefined();
            expect(row!.modal_ready, id).toBe(true);
            expect(row!.row_classification, id).toBe('finished_modal_ready');
            expect(row!.historical_default_response_id, id).toBe(expectedDefault);
            expect(row!.historical_default_option_id, id).toBe(expectedDefault);
            expect(row!.bot_response_logic, id).toBe('historical');
            expect(row!.has_option_descriptions, id).toBe(true);
            expect(row!.has_numeric_option_previews, id).toBe(true);
            expect(row!.findings, id).not.toEqual(expect.arrayContaining([
                expect.objectContaining({ code: 'historical_default_bot_logic_mismatch' }),
                expect.objectContaining({ code: 'missing_historical_default_marker' }),
            ]));
        }
    });

    it('classifies the Washington restraint row as finished modal-ready after authored defaults and source notes', () => {
        const report = buildEventTaxonomyReport(loadCatalogRows());
        const row = report.rows.find((entry) => entry.id === 'ic_rbih_restraint_post_washington');

        expect(row).toBeDefined();
        expect(row!.modal_ready).toBe(true);
        expect(row!.row_classification).toBe('finished_modal_ready');
        expect(row!.historical_default_response_id).toBe('acknowledge_pressure');
        expect(row!.historical_default_option_id).toBe('acknowledge_pressure');
        expect(row!.bot_response_logic).toBe('historical');
        expect(row!.has_option_descriptions).toBe(true);
        expect(row!.has_numeric_option_previews).toBe(true);
        expect(row!.findings).not.toEqual(expect.arrayContaining([
            expect.objectContaining({ code: 'historical_default_bot_logic_mismatch' }),
            expect.objectContaining({ code: 'missing_historical_default_marker' }),
        ]));
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

    it('summarizes valid future consequence metadata for later modal diagnostics', () => {
        const row = buildEventTaxonomyRow({
            id: 'diagnostic_future_consequence_fixture',
            trigger: { turn_min: 0, phase: 'war' },
            effect: { kind: 'narrative', text: 'Fixture.' },
            response_options: [{
                id: 'accept',
                label: 'Accept',
                description: 'Accept the branch.',
                future_consequences: [{
                    id: 'accept_branch',
                    label: 'Later branch',
                    timing: 'next_turn',
                    certainty: 'conditional',
                    opens_events: ['diagnostic_followup_fixture'],
                    closes_events: ['diagnostic_future_consequence_fixture'],
                    opens_flags: ['accepted_branch'],
                    closes_flags: ['rejected_branch'],
                    material_effect_refs: ['supply_delta.RBiH'],
                    explanation: 'Accepting makes the later branch visible.',
                }],
            }],
        }, 'data/scenarios/events/war_1992.json', 0, 0);
        const followup = buildEventTaxonomyRow({
            id: 'diagnostic_followup_fixture',
            trigger: { turn_min: 1, phase: 'war' },
            effect: { kind: 'narrative', text: 'Followup.' },
        }, 'data/scenarios/events/war_1992.json', 0, 1);

        const report = buildEventTaxonomyReport([row, followup]);

        expect(report.rows[0].future_consequence_count).toBe(1);
        expect(report.rows[0].future_consequence_opens_events).toEqual(['diagnostic_followup_fixture']);
        expect(report.rows[0].future_consequence_closes_events).toEqual(['diagnostic_future_consequence_fixture']);
        expect(report.rows[0].future_consequence_opens_flags).toEqual(['accepted_branch']);
        expect(report.rows[0].future_consequence_closes_flags).toEqual(['rejected_branch']);
        expect(report.rows[0].future_consequence_material_effect_refs).toEqual(['supply_delta.RBiH']);
        expect(report.findings.filter((finding) => finding.code.startsWith('malformed_future_consequence'))).toEqual([]);
        expect(report.findings.filter((finding) => finding.code === 'dangling_future_consequence_event')).toEqual([]);
    });

    it('surfaces malformed future consequence metadata as taxonomy findings', () => {
        const row = buildEventTaxonomyRow({
            id: 'diagnostic_malformed_future_consequence_fixture',
            title: 'Malformed Future Consequence Fixture',
            narrative: 'Fixture narrative.',
            trigger: { turn_min: 0, phase: 'war' },
            effect: { kind: 'narrative', text: 'Fixture.' },
            requires_player_response: true,
            responding_faction: 'RBiH',
            historical_source: 'Diagnostic source.',
            source_note: 'Diagnostic source note.',
            historical_default_response_id: 'accept',
            bot_response_logic: 'historical',
            response_options: [{
                id: 'accept',
                label: 'Accept',
                description: 'Accept the branch.',
                historical_marker: 'historical_default',
                risk_level: 0.1,
                future_consequences: [{
                    id: 'branch',
                    label: 'Branch',
                    timing: 'soon',
                    certainty: 'guaranteed',
                    explanation: 'Malformed timing.',
                }],
            }],
        }, 'data/scenarios/events/war_1992.json', 0, 0);

        expect(row.modal_ready).toBe(true);

        const report = buildEventTaxonomyReport([row]);
        const findings = report.findings;

        expect(findings).toEqual(expect.arrayContaining([
            expect.objectContaining({
                code: 'malformed_future_consequence',
                severity: 'error',
                id: 'diagnostic_malformed_future_consequence_fixture',
            }),
        ]));
        expect(report.rows[0].modal_ready).toBe(false);
        expect(report.rows[0].presidential_decision_valid).toBe(false);
        expect(report.rows[0].row_classification).toBe('required_response_debt');
    });

    it('surfaces dangling future consequence opens/closes event ids as findings', () => {
        const row = buildEventTaxonomyRow({
            id: 'diagnostic_dangling_future_consequence_fixture',
            title: 'Dangling Future Consequence Fixture',
            narrative: 'Fixture narrative.',
            trigger: { turn_min: 0, phase: 'war' },
            effect: { kind: 'narrative', text: 'Fixture.' },
            requires_player_response: true,
            responding_faction: 'RBiH',
            historical_source: 'Diagnostic source.',
            source_note: 'Diagnostic source note.',
            historical_default_response_id: 'accept',
            bot_response_logic: 'historical',
            response_options: [{
                id: 'accept',
                label: 'Accept',
                description: 'Accept the branch.',
                historical_marker: 'historical_default',
                risk_level: 0.1,
                future_consequences: [{
                    id: 'branch',
                    label: 'Branch',
                    timing: 'future',
                    certainty: 'risk',
                    opens_events: ['missing_open_event'],
                    closes_events: ['missing_close_event'],
                    explanation: 'Dangling branch references.',
                }],
            }],
        }, 'data/scenarios/events/war_1992.json', 0, 0);

        expect(row.modal_ready).toBe(true);

        const report = buildEventTaxonomyReport([row]);
        const findings = report.findings;

        expect(findings).toEqual(expect.arrayContaining([
            expect.objectContaining({
                code: 'dangling_future_consequence_event',
                severity: 'error',
                message: expect.stringContaining('opens_events missing_open_event'),
            }),
            expect.objectContaining({
                code: 'dangling_future_consequence_event',
                severity: 'error',
                message: expect.stringContaining('closes_events missing_close_event'),
            }),
        ]));
        expect(report.rows[0].modal_ready).toBe(false);
        expect(report.rows[0].presidential_decision_valid).toBe(false);
        expect(report.rows[0].row_classification).toBe('required_response_debt');
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

    it('surfaces explicit historical defaults with non-historical bot logic as calibration debt', () => {
        const row = {
            ...loadCatalogRows()[0],
            id: 'diagnostic_historical_default_bot_logic_fixture',
            bot_response_logic: 'strategic_weighted',
            requires_player_response: true,
            response_options: [
                { id: 'historical', label: 'Historical', description: 'Historical option' },
                { id: 'alternate', label: 'Alternate', description: 'Alternate option' },
            ],
            historical_default_response_id: 'historical',
            historical_default_option_id: 'historical',
            has_historical_default_marker: true,
            modal_ready: true,
            findings: [],
        };

        const report = buildEventTaxonomyReport([row]);

        expect(report.findings).toEqual(expect.arrayContaining([
            expect.objectContaining({
                code: 'historical_default_bot_logic_mismatch',
                severity: 'warning',
                id: 'diagnostic_historical_default_bot_logic_fixture',
            }),
        ]));
        expect(report.rows[0].modal_ready).toBe(false);
        expect(report.rows[0].row_classification).toBe('required_response_debt');
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
