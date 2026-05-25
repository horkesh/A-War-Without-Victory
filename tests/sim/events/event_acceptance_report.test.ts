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
    historical_default_response_id?: string;
    response_options?: Array<{ id?: string; historical_marker?: string }>;
};

const EXPECTED_APPROVED_FIRST_PACKET = [
    'rbih_state_identity',
    'hrhb_political_goal',
    'rs_assembly_rejects_voplan_1993',
    'belgrade_embargo_rs_1994',
];

const EXPECTED_CONDITIONAL_PACKET = [
    'operation_lukavac_93',
    'carter_ceasefire_1994',
    'holbrooke_ceasefire_demand_oct95',
];

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
    ['belgrade_embargo_rs_1994', 'defiant'],
]);

function loadEventFixtures(file: string): EventFixture[] {
    return JSON.parse(readFileSync(file, 'utf8')) as EventFixture[];
}

describe('event acceptance diagnostic report', () => {
    it('emits deterministic current acceptance summary counts', () => {
        const first = buildEventAcceptanceReport();
        const second = buildEventAcceptanceReport();

        expect(JSON.stringify(first)).toBe(JSON.stringify(second));
        expect(first.summary.total_events).toBe(247);
        expect(first.summary.required_response_events).toBe(36);
        expect(first.summary.production_modal_authoring_ready_events).toBe(4);
        expect(first.summary.acceptance_status).toBe('NOT_READY');
        expect(first.summary.full_catalog_accepted).toBe(false);
        expect(first.summary.missing_historical_default_response_id_events).toBe(32);
        expect(first.summary.missing_historical_marker_events).toBe(32);
        expect(first.summary.source_blocked_events).toBeGreaterThan(0);
        expect(first.summary.missing_source_note_events).toBe(32);
    });

    it('lists the approved first production authoring packet candidates without changing JSON content', () => {
        const report = buildEventAcceptanceReport();

        expect(APPROVED_FIRST_AUTHORING_PACKET_CANDIDATES).toEqual(EXPECTED_APPROVED_FIRST_PACKET);
        expect(report.approved_first_authoring_packet_candidates.map((row) => row.id)).toEqual(EXPECTED_APPROVED_FIRST_PACKET);
        expect(report.approved_first_authoring_packet_candidates.every((row) => row.candidate_status === 'APPROVED_FIRST_PACKET')).toBe(true);
        expect(report.conditional_authoring_packet_candidates.map((row) => row.id)).toEqual(EXPECTED_CONDITIONAL_PACKET);
        expect(report.deferred_authoring_packet_candidates.map((row) => row.id)).toEqual(EXPECTED_DEFERRED_PACKET);
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
        expect(report.production_modal_authoring_ready_rows.map((row) => row.id)).toEqual(EXPECTED_APPROVED_FIRST_PACKET);
        expect(report.summary.acceptance_status).toBe('NOT_READY');
        expect(report.summary.full_catalog_accepted).toBe(false);
    });

    it('keeps each approved first-packet historical default at option 0 with exactly one marker', () => {
        const fixtures = [
            ...loadEventFixtures('data/scenarios/events/war_1992.json'),
            ...loadEventFixtures('data/scenarios/events/war_1993.json'),
            ...loadEventFixtures('data/scenarios/events/war_1994.json'),
        ];

        for (const id of EXPECTED_APPROVED_FIRST_PACKET) {
            const event = fixtures.find((entry) => entry.id === id);
            const expectedDefault = EXPECTED_FIRST_PACKET_DEFAULTS.get(id);
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
