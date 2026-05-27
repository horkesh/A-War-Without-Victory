import { describe, expect, it } from 'vitest';

import { stableStringify } from '../../../src/utils/stable_json';
import { buildEventAcceptanceReport } from '../../../tools/diagnostics/event_acceptance_report';
import { buildEventPresidentialAcceptanceReport } from '../../../tools/diagnostics/event_presidential_acceptance';

describe('event presidential acceptance diagnostic', () => {
    it('emits stable JSON layered on current catalog acceptance truth', () => {
        const first = buildEventPresidentialAcceptanceReport();
        const second = buildEventPresidentialAcceptanceReport();
        const catalog = buildEventAcceptanceReport();

        expect(stableStringify(first, 2)).toBe(stableStringify(second, 2));
        expect(first.summary.catalog_total_events).toBe(247);
        expect(first.summary.catalog_required_response_events).toBe(36);
        expect(first.summary.catalog_production_modal_authoring_ready_events).toBe(catalog.production_modal_authoring_ready_rows.length);
        expect(first.summary.catalog_acceptance_status).toBe('NOT_READY');
        expect(first.summary.probed_event_count).toBe(17);
        expect(first.summary.staff_recommendation_modal_ready_skipped_count).toBe(1);
        expect(first.summary.status).toBe('READY');
        expect(first.failures).toEqual([]);
    });

    it('surfaces every production-ready event as a pending presidential decision for the responding player', () => {
        const report = buildEventPresidentialAcceptanceReport();

        expect(report.rows).toHaveLength(17);
        for (const row of report.rows) {
            expect(row.player_surface.status, row.event_id).toBe('surfaced');
            expect(row.player_surface.fired_count, row.event_id).toBe(1);
            expect(row.player_surface.pending_count, row.event_id).toBe(1);
            expect(row.player_surface.pending_event_ids, row.event_id).toEqual([row.event_id]);
            expect(row.player_surface.decision_log_count, row.event_id).toBe(0);
        }
        expect(report.summary.player_surfaced_count).toBe(17);
    });

    it('resolves every player pending decision with one historical player decision-log row', () => {
        const report = buildEventPresidentialAcceptanceReport();

        for (const row of report.rows) {
            expect(row.player_resolve.status, row.event_id).toBe('resolved');
            expect(row.player_resolve.pending_count, row.event_id).toBe(0);
            expect(row.player_resolve.decision_log_count, row.event_id).toBe(1);
            expect(row.player_resolve.decision_source, row.event_id).toBe('player');
            expect(row.player_resolve.response_id, row.event_id).toBe(row.historical_default_response_id);
        }
        expect(report.summary.player_resolved_log_count).toBe(17);
    });

    it('auto-resolves every production-ready event in headless mode on the historical default', () => {
        const report = buildEventPresidentialAcceptanceReport();

        for (const row of report.rows) {
            expect(row.headless_auto.status, row.event_id).toBe('auto_resolved');
            expect(row.headless_auto.fired_count, row.event_id).toBe(1);
            expect(row.headless_auto.pending_count, row.event_id).toBe(0);
            expect(row.headless_auto.decision_log_count, row.event_id).toBe(1);
            expect(['bot_v1', 'bot_political', 'bot_ai_default']).toContain(row.headless_auto.decision_source);
            expect(row.headless_auto.response_id, row.event_id).toBe(row.historical_default_response_id);
            expect(row.headless_auto.historical_default_match, row.event_id).toBe(true);
        }
        expect(report.summary.headless_auto_resolved_count).toBe(17);
        expect(report.summary.stuck_pending_count).toBe(0);
    });

    it('includes stable consequence traces for flags, dimensions, and response effects', () => {
        const report = buildEventPresidentialAcceptanceReport();

        for (const row of report.rows) {
            expect(row.consequence_trace.option_count, row.event_id).toBeGreaterThanOrEqual(2);
            expect(row.consequence_trace.option_traces.map((option) => option.response_id), row.event_id).toEqual(
                [...row.consequence_trace.option_traces.map((option) => option.response_id)].sort(),
            );
            expect(row.consequence_trace.option_traces.every((option) => Array.isArray(option.effect_kinds))).toBe(true);
            expect(row.consequence_trace.option_traces.every((option) => Array.isArray(option.flag_keys))).toBe(true);
            expect(row.consequence_trace.option_traces.every((option) => Array.isArray(option.dimension_shifts))).toBe(true);
        }
    });
});
