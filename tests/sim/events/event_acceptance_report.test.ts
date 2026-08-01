import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
    APPROVED_FIRST_AUTHORING_PACKET_CANDIDATES,
    CONDITIONAL_AUTHORING_PACKET_CANDIDATES,
    DEFERRED_AUTHORING_PACKET_CANDIDATES,
    SENSITIVE_RING3_REFUSED_IDS,
    SOURCE_OR_DESIGN_DEFAULT_BLOCKED_IDS,
    buildEventAcceptanceReport,
} from '../../../tools/diagnostics/event_acceptance_report';

type EventFixture = {
    id?: string;
    trigger?: {
        turn_min?: number;
        turn_max?: number;
        phase?: string;
        condition?: unknown;
    };
    pressure?: unknown;
    historical_default_response_id?: string;
    response_options?: Array<{ id?: string; historical_marker?: string }>;
};

const EXPECTED_APPROVED_FIRST_PACKET = [
    'rbih_state_identity',
    'hrhb_political_goal',
    'rs_assembly_rejects_voplan_1993',
    'belgrade_embargo_rs_1994',
];

const EXPECTED_CONDITIONAL_PACKET: string[] = [];

const EXPECTED_DEFERRED_PACKET = ['us_halts_federation_advance_1995'];

const EXPECTED_SENSITIVE_BLOCKED = [
    'rs_strategic_goals',
    'drina_cleansing_decision_1992',
    'concentration_camps_revealed_1992',
    'srebrenica_demilitarization_1993',
    'un_hostage_crisis_1995',
    'visit_to_front_rs',
    'nato_ultimatum_sarajevo_1994',
];

const EXPECTED_SOURCE_DESIGN_BLOCKED = [
    'karadzic_mladic_split_1995',
    'visit_to_front_hrhb',
];

const EXPECTED_FIRST_PACKET_DEFAULTS = new Map([
    ['rbih_state_identity', 'civic'],
    ['hrhb_political_goal', 'croat_republic'],
    ['rs_assembly_rejects_voplan_1993', 'accept_rejection'],
    ['belgrade_embargo_rs_1994', 'negotiate'],
]);

const EXPECTED_PACKET_2A_DEFAULTS = new Map([
    ['carter_ceasefire_1994', 'respect'],
]);

const EXPECTED_PACKET_2B_DEFAULTS = new Map([
    ['holbrooke_ceasefire_demand_oct95', 'accept_ceasefire'],
]);

const EXPECTED_PACKET_3_DEFAULTS = new Map([
    ['operation_lukavac_93', 'comply'],
    ['os_rbih_tactical_acceptance_1993', 'reject_via_assembly'],
    ['csq_patron_recovery_offer', 'accept_recovery'],
]);

const EXPECTED_PACKET_4_DEFAULTS = new Map([
    ['hrhb_washington_agreement_1994', 'accept'],
    ['contact_group_plan_1994', 'accept'],
    ['dayton_talks_begin_1995', 'accept'],
]);

const EXPECTED_WASHINGTON_RESTRAINT_DEFAULTS = new Map([
    ['ic_rbih_restraint_post_washington', 'acknowledge_pressure'],
]);

const EXPECTED_1993_MODAL_PACKET_DEFAULTS = new Map([
    ['gornji_vakuf_clashes_1993', 'escalate'],
    ['ic_pressure_vopp_engagement', 'acknowledge_pressure'],
    ['vance_owen_plan_1993', 'accept'],
    ['strategic_posture_review_hrhb', 'press_croat_objectives'],
]);

function loadEventFixtures(file: string): EventFixture[] {
    return JSON.parse(readFileSync(file, 'utf8')) as EventFixture[];
}

function collectConditionTypes(condition: unknown): string[] {
    if (typeof condition !== 'object' || condition === null || Array.isArray(condition)) return [];
    const record = condition as Record<string, unknown>;
    const current = typeof record.type === 'string' ? [record.type] : [];
    const nested = Array.isArray(record.conditions)
        ? record.conditions.flatMap((entry) => collectConditionTypes(entry))
        : [];
    const singleNested = collectConditionTypes(record.condition);
    return [...current, ...nested, ...singleNested].sort();
}

describe('event acceptance diagnostic report', () => {
    it('emits deterministic current acceptance summary counts', () => {
        const first = buildEventAcceptanceReport();
        const second = buildEventAcceptanceReport();

        expect(JSON.stringify(first)).toBe(JSON.stringify(second));
        // 289 → 293: +4 LANE-OBSERVER-FLAG-WRITER deadline "audit" events.
        // 293 → 294: +1 §6 atrocity-record event bijeljina_killings_1992 (no response options).
        // 294 → 297: +3 HRHB Jul–Sep 1992 decision events (war_1992_hrhb_summer.json).
        // 297 → 299: +2 sourced HRHB October/November 1992 decision events.
        // Each carries a historical_default_response_id + markers + source_note,
        // so the debt counts below (missing_*) are unchanged — only the totals move.
        expect(first.summary.total_events).toBe(299);
        expect(first.summary.required_response_events).toBe(76);
        expect(first.summary.production_modal_authoring_ready_events).toBe(47);
        expect(first.summary.acceptance_status).toBe('NOT_READY');
        expect(first.summary.full_catalog_accepted).toBe(false);
        // +6 from the 6 new leadership-action events (address_to_nation /
        // decorate_a_unit ×{RBiH,RS,HRHB}): each is requires_player_response with
        // no historical default/marker (required-response debt), so they add to
        // missing_approved_default / historical_default / historical_marker debt.
        // They DO carry a source_note, so missing_source_note is unchanged.
        // 16 → 15: Owen-Stoltenberg's Presidency stage now carries the
        // historically sourced conditional-acceptance default and historical bot policy.
        expect(first.summary.missing_approved_default_events).toBe(15);
        expect(first.summary.missing_historical_default_response_id_events).toBe(18);
        expect(first.summary.missing_historical_marker_events).toBe(18);
        expect(first.summary.source_blocked_events).toBeGreaterThan(0);
        expect(first.summary.missing_source_note_events).toBe(9);
    });

    it('lists the approved first production authoring packet candidates without changing JSON content', () => {
        const report = buildEventAcceptanceReport();

        expect(APPROVED_FIRST_AUTHORING_PACKET_CANDIDATES).toEqual(EXPECTED_APPROVED_FIRST_PACKET);
        expect(report.approved_first_authoring_packet_candidates.map((row) => row.id)).toEqual(EXPECTED_APPROVED_FIRST_PACKET);
        expect(report.approved_first_authoring_packet_candidates.every((row) => row.candidate_status === 'APPROVED_FIRST_PACKET')).toBe(true);
        expect(report.conditional_authoring_packet_candidates.map((row) => row.id)).toEqual(EXPECTED_CONDITIONAL_PACKET);
        expect(report.deferred_authoring_packet_candidates.map((row) => row.id)).toEqual(EXPECTED_DEFERRED_PACKET);
    });

    it('counts Carter as production-ready once its historical default uses historical bot logic', () => {
        const report = buildEventAcceptanceReport();
        const carter = report.required_response_rows.find((row) => row.id === 'carter_ceasefire_1994');

        expect(carter).toBeDefined();
        expect(carter!.bot_response_logic).toBe('historical');
        expect(carter!.production_modal_authoring_ready).toBe(true);
        expect(carter!.blocking_reasons).toEqual([]);
        expect(carter!.trigger_gate).toBe('external_or_exogenous');
        expect(carter!.candidate_status).toBeNull();
        expect(report.conditional_authoring_packet_candidates.map((row) => row.id)).not.toContain('carter_ceasefire_1994');
    });

    it('blocks explicit historical-default rows from production readiness unless bot logic is historical', () => {
        const report = buildEventAcceptanceReport();
        const holbrooke = report.required_response_rows.find((row) => row.id === 'holbrooke_ceasefire_demand_oct95');
        const mismatchedRows = report.required_response_rows.filter((row) =>
            row.has_historical_default_response_id &&
            row.has_historical_marker &&
            row.bot_response_logic !== 'historical'
        );

        expect(holbrooke).toBeDefined();
        expect(holbrooke!.bot_response_logic).toBe('historical');
        expect(mismatchedRows.map((row) => row.id)).toEqual([]);
    });

    it('counts the packet 3 rows as production modal-ready with no residual blockers', () => {
        const report = buildEventAcceptanceReport();

        expect(report.conditional_authoring_packet_candidates.map((row) => row.id)).toEqual(EXPECTED_CONDITIONAL_PACKET);
        for (const id of EXPECTED_PACKET_3_DEFAULTS.keys()) {
            const row = report.required_response_rows.find((entry) => entry.id === id);
            expect(row, id).toBeDefined();
            expect(row!.candidate_status, id).toBeNull();
            expect(row!.production_modal_authoring_ready, id).toBe(true);
            expect(row!.blocking_reasons, id).toEqual([]);
            expect(row!.bot_response_logic, id).toBe('historical');
        }
    });

    it('counts the diplomatic packet rows as production modal-ready with no residual blockers', () => {
        const report = buildEventAcceptanceReport();

        for (const id of EXPECTED_PACKET_4_DEFAULTS.keys()) {
            const row = report.required_response_rows.find((entry) => entry.id === id);
            expect(row, id).toBeDefined();
            expect(row!.candidate_status, id).toBeNull();
            expect(row!.production_modal_authoring_ready, id).toBe(true);
            expect(row!.blocking_reasons, id).toEqual([]);
            expect(row!.bot_response_logic, id).toBe('historical');
        }
    });

    it('counts the 1993 required-response packet rows as production modal-ready with no residual blockers', () => {
        const report = buildEventAcceptanceReport();

        for (const id of EXPECTED_1993_MODAL_PACKET_DEFAULTS.keys()) {
            const row = report.required_response_rows.find((entry) => entry.id === id);
            expect(row, id).toBeDefined();
            expect(row!.candidate_status, id).toBeNull();
            expect(row!.production_modal_authoring_ready, id).toBe(true);
            expect(row!.blocking_reasons, id).toEqual([]);
            expect(row!.bot_response_logic, id).toBe('historical');
        }
    });

    it('counts the Washington restraint row as production modal-ready with no residual blockers', () => {
        const report = buildEventAcceptanceReport();

        for (const id of EXPECTED_WASHINGTON_RESTRAINT_DEFAULTS.keys()) {
            const row = report.required_response_rows.find((entry) => entry.id === id);
            expect(row, id).toBeDefined();
            expect(row!.candidate_status, id).toBeNull();
            expect(row!.production_modal_authoring_ready, id).toBe(true);
            expect(row!.blocking_reasons, id).toEqual([]);
            expect(row!.bot_response_logic, id).toBe('historical');
        }
    });

    it('cleans Holbrooke and Lukavac scheduled-only debt with state or pressure gates', () => {
        const report = buildEventAcceptanceReport();
        const lukavac = report.required_response_rows.find((entry) => entry.id === 'operation_lukavac_93');
        const holbrooke = report.required_response_rows.find((entry) => entry.id === 'holbrooke_ceasefire_demand_oct95');

        expect(lukavac).toBeDefined();
        expect(lukavac!.trigger_gate).toBe('state_or_pressure');
        expect(lukavac!.blocking_reasons).not.toContain('scheduled_only_trigger_needs_predicate_cleanup_or_exogenous_waiver');
        expect(report.scheduled_only_rows.map((row) => row.id)).not.toContain('operation_lukavac_93');

        expect(holbrooke).toBeDefined();
        expect(holbrooke!.trigger_gate).toBe('state_or_pressure');
        expect(holbrooke!.blocking_reasons).not.toContain('scheduled_only_trigger_needs_predicate_cleanup_or_exogenous_waiver');
        expect(report.scheduled_only_rows.map((row) => row.id)).not.toContain('holbrooke_ceasefire_demand_oct95');
    });

    it('authors Lukavac with the local Sarajevo and Trnovo trigger plus Hadzici route pressure proxies', () => {
        const event = loadEventFixtures('data/scenarios/events/war_1993.json')
            .find((entry) => entry.id === 'operation_lukavac_93');
        const trigger = event?.trigger;
        const pressure = event?.pressure as {
            base_rate?: number;
            threshold?: number;
            decay_rate?: number;
            modifiers?: Array<{ condition?: { type?: string; osid?: string; faction?: string }; rate_bonus?: number }>;
        } | undefined;

        expect(event).toBeDefined();
        expect(trigger).toMatchObject({ turn_min: 69, turn_max: 71, phase: 'war' });
        expect(trigger?.condition).toEqual({
            type: 'and',
            conditions: [
                { type: 'flag_equals', flag: 'sarajevo_siege_active', value: true },
                { type: 'faction_controls_municipality', faction: 'RS', municipality: 'trnovo', threshold: 0.5 },
            ],
        });
        expect(collectConditionTypes(trigger?.condition)).not.toContain('territory_percentage');
        expect(pressure).toMatchObject({ base_rate: 1, threshold: 2, decay_rate: 1 });
        expect(pressure?.modifiers).toEqual([
            { condition: { type: 'territory_control', osid: 'op:hadzici:lokve', faction: 'RS' }, rate_bonus: 1 },
            { condition: { type: 'territory_control', osid: 'op:hadzici:pazaric', faction: 'RS' }, rate_bonus: 1 },
            { condition: { type: 'territory_control', osid: 'op:hadzici:tarcin_2', faction: 'RS' }, rate_bonus: 1 },
        ]);
    });

    it('marks the approved first authoring packet as production modal-ready only after safe-first JSON authoring', () => {
        const report = buildEventAcceptanceReport();

        expect(report.approved_first_authoring_packet_candidates.map((row) => row.id)).toEqual(EXPECTED_APPROVED_FIRST_PACKET);
        for (const row of report.approved_first_authoring_packet_candidates) {
            expect(row.production_modal_authoring_ready, row.id).toBe(true);
            expect(row.blocking_reasons, row.id).toEqual([]);
            expect(row.has_historical_default_response_id, row.id).toBe(true);
            expect(row.has_historical_marker, row.id).toBe(true);
            expect(row.has_source_note, row.id).toBe(true);
            expect(row.sensitive_gate, row.id).toBe('clear');
        }
        expect(report.production_modal_authoring_ready_rows.map((row) => row.id)).toEqual([
            'rbih_state_identity',
            'hrhb_political_goal',
            'rbih_paramilitary_policy_1992',
            'hrhb_1992_graz_cooperation_collapse',
            'rbih_minority_retention_1992',
            'hrhb_posavina_orasje_posture_1992',
            'hrhb_jajce_joint_defense_1992',
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
        expect(report.summary.acceptance_status).toBe('NOT_READY');
        expect(report.summary.full_catalog_accepted).toBe(false);
    });

    it('keeps each authored packet historical default at option 0 with exactly one marker', () => {
        const fixtures = [
            ...loadEventFixtures('data/scenarios/events/war_1992.json'),
            ...loadEventFixtures('data/scenarios/events/war_1993.json'),
            ...loadEventFixtures('data/scenarios/events/war_1994.json'),
            ...loadEventFixtures('data/scenarios/events/war_1995.json'),
            ...loadEventFixtures('data/scenarios/events/consequences.json'),
        ];
        const expectedDefaults = new Map([
            ...EXPECTED_FIRST_PACKET_DEFAULTS,
            ...EXPECTED_PACKET_2A_DEFAULTS,
            ...EXPECTED_PACKET_2B_DEFAULTS,
            ...EXPECTED_PACKET_3_DEFAULTS,
            ...EXPECTED_PACKET_4_DEFAULTS,
            ...EXPECTED_1993_MODAL_PACKET_DEFAULTS,
        ]);

        for (const id of expectedDefaults.keys()) {
            const event = fixtures.find((entry) => entry.id === id);
            const expectedDefault = expectedDefaults.get(id);
            const options = event?.response_options ?? [];
            const markedOptions = options.filter((option) => option.historical_marker === 'historical_default');

            expect(event, id).toBeDefined();
            expect(expectedDefault, id).toBeDefined();
            expect(event!.historical_default_response_id, id).toBe(expectedDefault);
            expect(options[0]?.id, id).toBe(expectedDefault);
            expect(markedOptions.map((option) => option.id), id).toEqual([expectedDefault]);
        }
    });

    it('keeps known Ring 3 and sensitive rows blocked from production readiness', () => {
        const report = buildEventAcceptanceReport();
        const sensitiveBlockedIds = report.sensitive_gated_rows.map((row) => row.id);

        expect(SENSITIVE_RING3_REFUSED_IDS).toEqual(expect.arrayContaining(EXPECTED_SENSITIVE_BLOCKED));
        for (const id of EXPECTED_SENSITIVE_BLOCKED) {
            expect(sensitiveBlockedIds, id).toContain(id);
            const row = report.required_response_rows.find((entry) => entry.id === id);
            expect(row, id).toBeDefined();
            expect(row!.production_modal_authoring_ready).toBe(false);
            expect(row!.blocking_reasons).toContain('sensitive_history_gate');
        }
    });

    it('separates source/design default-blocked rows from sensitive-gated rows', () => {
        const report = buildEventAcceptanceReport();
        const sourceDesignBlockedIds = report.source_design_default_blocked_rows.map((row) => row.id);

        expect(SOURCE_OR_DESIGN_DEFAULT_BLOCKED_IDS).toEqual(EXPECTED_SOURCE_DESIGN_BLOCKED);
        expect(sourceDesignBlockedIds).toEqual(expect.arrayContaining(EXPECTED_SOURCE_DESIGN_BLOCKED));
        for (const id of EXPECTED_SOURCE_DESIGN_BLOCKED) {
            const row = report.required_response_rows.find((entry) => entry.id === id);
            expect(row, id).toBeDefined();
            expect(row!.production_modal_authoring_ready).toBe(false);
            expect(row!.blocking_reasons).toContain('source_or_design_default_blocked');
        }
    });

    it('keeps source/default blocked rows out of ready production modal authoring', () => {
        const report = buildEventAcceptanceReport();

        for (const row of report.required_response_rows) {
            if (
                row.blocking_reasons.includes('missing_source_note') ||
                row.blocking_reasons.includes('source_blocked') ||
                row.blocking_reasons.includes('missing_historical_default_response_id') ||
                row.blocking_reasons.includes('missing_historical_marker') ||
                row.blocking_reasons.includes('default_or_counterfactual_blocked') ||
                row.blocking_reasons.includes('source_or_design_default_blocked')
            ) {
                expect(row.production_modal_authoring_ready, row.id).toBe(false);
            }
        }
    });

    it('reports default-blocked and counterfactual csq overture rows as acceptance debt', () => {
        const report = buildEventAcceptanceReport();
        const defaultBlockedIds = report.default_blocked_counterfactual_rows.map((row) => row.id);

        expect(defaultBlockedIds).toEqual(expect.arrayContaining([
            'srebrenica_demilitarization_1993',
            'karadzic_mladic_split_1995',
            'csq_separate_peace_overture',
            'csq_tripartite_federation_overture',
        ]));
        for (const id of defaultBlockedIds) {
            const row = report.required_response_rows.find((entry) => entry.id === id);
            expect(row, id).toBeDefined();
            expect(row!.production_modal_authoring_ready).toBe(false);
        }
    });

    it('keeps sensitive massacre and atrocity topics out of the first packet', () => {
        const report = buildEventAcceptanceReport();
        const excludedIds = report.first_packet_excluded_sensitive_topics.map((row) => row.id);

        expect(excludedIds).toEqual(expect.arrayContaining([
            'srebrenica_demilitarization_1993',
            'concentration_camps_revealed_1992',
            'drina_cleansing_decision_1992',
            'nato_ultimatum_sarajevo_1994',
        ]));
        for (const id of [
            ...EXPECTED_APPROVED_FIRST_PACKET,
            ...EXPECTED_CONDITIONAL_PACKET,
            ...EXPECTED_DEFERRED_PACKET,
        ]) {
            expect(excludedIds).not.toContain(id);
        }
    });
});
