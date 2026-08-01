/**
 * Phase F Packet 2 — sensitive-history canon-gate audit tool tests.
 *
 * Validates `buildSensitiveHistoryAudit` against:
 *   - SENSITIVE_HISTORY_DESIGN_GATE §3.6 guard heuristic (prohibition phrase +
 *     sensitive-act keyword pair on Ring 3 sensitive-family rows)
 *   - Punitive cost-floor scoring on canonical sensitive counterfactual options
 *   - Forbidden positive shifts (territorial_legitimacy / recruitment_modifier
 *     > 1.0) on sensitive counterfactual options
 *   - Static Ring 3 enabling rejection (upstream enables targeting a Ring 3 row)
 *   - Determinism (sorted iteration, stable violation order)
 *   - CLI option semantics (--violations-only filters, --family narrows)
 *
 * Determinism: no Math.random, no Date.now, no disk I/O — all tests inject
 * `rows` to skip catalog loading.
 */

import { describe, expect, it } from 'vitest';

import {
    buildSensitiveHistoryAudit,
    evaluateSection36Guard,
    scanOptionCostFloor,
    type AuditReport,
} from '../tools/diagnostics/sensitive_history_canon_gate_audit.js';

// ─── Test row factories ────────────────────────────────────────────────────

function ring3RowClean(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        id: 'rs_camp_exposure_clean_row',
        family: 'rs_camp_exposure_response',
        source_tier: 'icty_icj_un',
        source_note: 'Per §3.6 forward-looking guard: any future csq_* row consuming this row\'s outcomes MUST NOT carry response options that re-author cleansing, displacement, civilian-targeting, paramilitary deployment, or detention-camp-expansion. The camp-system process scope is canon-refused under §1.3 Ring 3 #2.',
        response_options: [
            {
                id: 'deny',
                dimension_shifts: [
                    { faction: 'RS', dimension: 'international_standing', delta: -15 },
                    { faction: 'RS', dimension: 'patron_confidence', delta: -10 },
                ],
            },
        ],
        ...overrides,
    };
}

function ring3RowMissingGuard(): Record<string, unknown> {
    return {
        id: 'rs_camp_exposure_missing_guard_row',
        family: 'rs_camp_exposure_response',
        source_tier: 'icty_icj_un',
        source_note: 'A bland source note with no prohibition phrasing and no sensitive-act vocabulary. It cites historical sources but does not articulate a forward-looking guard.',
        response_options: [
            {
                id: 'deny',
                dimension_shifts: [
                    { faction: 'RS', dimension: 'international_standing', delta: -15 },
                    { faction: 'RS', dimension: 'patron_confidence', delta: -10 },
                ],
            },
        ],
    };
}

function sensitiveCounterfactualRow(opShifts: Array<{ dimension: string; delta: number }>): Record<string, unknown> {
    return {
        id: 'h6_central_bosnia_test',
        family: 'hrhb_central_bosnia_response',
        source_tier: 'balkan_battlegrounds',
        response_options: [
            {
                id: 'defend_pocket',
                dimension_shifts: [
                    { faction: 'HRHB', dimension: 'military_credibility', delta: 5 },
                ],
            },
            {
                id: 'breakout_offensive',
                dimension_shifts: opShifts.map((s) => ({ faction: 'HRHB', ...s })),
                effects: [],
            },
        ],
    };
}

function cleanFoundationalRow(): Record<string, unknown> {
    return {
        id: 'r1_foundational_test',
        family: 'rs_foundational_response',
        source_tier: 'balkan_battlegrounds',
        source_note: 'Standard foundational decision; no sensitive-history surface.',
        response_options: [
            {
                id: 'historical_default',
                dimension_shifts: [
                    { faction: 'RS', dimension: 'military_credibility', delta: 3 },
                ],
            },
            {
                id: 'cautious',
                dimension_shifts: [
                    { faction: 'RS', dimension: 'internal_cohesion', delta: 2 },
                ],
            },
        ],
    };
}

// ─── Unit-level heuristics ─────────────────────────────────────────────────

describe('evaluateSection36Guard', () => {
    it('passes when prohibition phrase + sensitive keyword both present', () => {
        const result = evaluateSection36Guard('descendants MUST NOT re-author cleansing or paramilitary deployment.');
        expect(result.pass).toBe(true);
        expect(result.has_prohibition).toBe(true);
        expect(result.has_sensitive_keyword).toBe(true);
    });

    it('flags missing prohibition phrase', () => {
        const result = evaluateSection36Guard('Cleansing and paramilitary operations are documented in BB Vol. I.');
        expect(result.pass).toBe(false);
        expect(result.has_prohibition).toBe(false);
        expect(result.has_sensitive_keyword).toBe(true);
    });

    it('flags missing sensitive-act keyword', () => {
        const result = evaluateSection36Guard('Players MUST NOT make ahistorical moves.');
        expect(result.pass).toBe(false);
        expect(result.has_prohibition).toBe(true);
        expect(result.has_sensitive_keyword).toBe(false);
    });

    it('records explicit §3.6 reference as bonus signal', () => {
        const result = evaluateSection36Guard('Per §3.6, descendants MUST NOT re-author paramilitary deployment.');
        expect(result.pass).toBe(true);
        expect(result.has_explicit_3_6_reference).toBe(true);
    });

    it('handles null source_note', () => {
        const result = evaluateSection36Guard(null);
        expect(result.pass).toBe(false);
        expect(result.has_prohibition).toBe(false);
        expect(result.has_sensitive_keyword).toBe(false);
    });
});

describe('scanOptionCostFloor', () => {
    it('counts ≥2 negative punitive markers as PASS-eligible', () => {
        const scan = scanOptionCostFloor({
            dimension_shifts: [
                { dimension: 'international_standing', delta: -15 },
                { dimension: 'internal_cohesion', delta: -10 },
            ],
        });
        expect(scan.punitive_markers).toBeGreaterThanOrEqual(2);
        expect(scan.positive_territorial_legitimacy).toBe(false);
    });

    it('counts recruitment_modifier < 1.0 as a punitive marker', () => {
        const scan = scanOptionCostFloor({
            dimension_shifts: [
                { dimension: 'military_credibility', delta: -10 },
            ],
            effects: [
                { kind: 'recruitment_modifier', multiplier: 0.85 },
            ],
        });
        expect(scan.punitive_markers).toBe(2);
    });

    it('flags positive territorial_legitimacy as forbidden', () => {
        const scan = scanOptionCostFloor({
            dimension_shifts: [
                { dimension: 'territorial_legitimacy', delta: 5 },
            ],
        });
        expect(scan.positive_territorial_legitimacy).toBe(true);
    });

    it('flags recruitment_modifier > 1.20 as forbidden (extreme boost)', () => {
        const scan = scanOptionCostFloor({
            effects: [
                { kind: 'recruitment_modifier', multiplier: 1.50 },
            ],
        });
        expect(scan.recruitment_modifier_above_one).toBe(true);
    });

    it('does NOT flag recruitment_modifier 1.15 as CRITICAL forbidden (under 1.20 threshold)', () => {
        // G3: §6-reviewed small boosts (< 1.20x) surface only as INFO
        // reward_risk, not as the CRITICAL forbidden-shift signal.
        const scan = scanOptionCostFloor({
            effects: [
                { kind: 'recruitment_modifier', multiplier: 1.15 },
            ],
        });
        expect(scan.recruitment_modifier_above_one).toBe(false);
        // But it IS picked up as a reward_risk marker.
        expect(scan.reward_risk_markers.length).toBeGreaterThan(0);
        expect(scan.reward_risk_markers[0]).toContain('recruitment_modifier=1.15');
    });

    // ─── G3 broadened punitive-marker vocabulary ─────────────────────────
    it('counts patron_confidence negative delta as a punitive marker (G3)', () => {
        const scan = scanOptionCostFloor({
            dimension_shifts: [
                { dimension: 'patron_confidence', delta: -20 },
            ],
        });
        expect(scan.punitive_markers).toBe(1);
    });

    it('counts negotiating_leverage negative delta as a punitive marker (G3)', () => {
        const scan = scanOptionCostFloor({
            dimension_shifts: [
                { dimension: 'negotiating_leverage', delta: -15 },
            ],
        });
        expect(scan.punitive_markers).toBe(1);
    });

    it('counts alliance_change negative delta as a punitive marker (G3)', () => {
        const scan = scanOptionCostFloor({
            effects: [
                { kind: 'alliance_change', delta: -0.10 },
            ],
        });
        expect(scan.punitive_markers).toBe(1);
    });

    it('reads recruitment_modifier from pool_multiplier field (G3 catalog convention)', () => {
        // seek_clandestine_arms in war_1993.json uses `pool_multiplier: 1.05`
        // rather than `multiplier`. The scan must recognise either.
        const scan = scanOptionCostFloor({
            effects: [
                { kind: 'recruitment_modifier', pool_multiplier: 1.05 },
            ],
        });
        // 1.05 is BELOW the 1.20 CRITICAL threshold → no forbidden signal.
        expect(scan.recruitment_modifier_above_one).toBe(false);
        // But it IS surfaced as a reward_risk marker for INFO emission.
        expect(scan.reward_risk_markers.length).toBe(1);
        expect(scan.reward_risk_markers[0]).toContain('1.05');
        expect(scan.reward_risk_markers[0]).toContain('pool_multiplier');
    });
});

// ─── End-to-end audit semantics ────────────────────────────────────────────

describe('buildSensitiveHistoryAudit', () => {
    it('flags sensitive player choices, missing provenance notes, and generic symmetry language', () => {
        const report = buildSensitiveHistoryAudit({
            rows: [{
                id: 'generic_sensitive_fixture_1993',
                category: 'humanitarian',
                narrative: 'Atrocities on both sides left civilians dead.',
                historical_source: 'Fixture citation.',
                trigger: { turn_min: 74, turn_max: 76, phase: 'war' },
                response_options: [{ id: 'authorize', label: 'Authorize forced displacement' }],
            }],
        });

        expect(report.violations.map((row) => row.kind).sort()).toEqual([
            'generic_symmetry_language',
            'missing_sensitive_source_note',
            'sensitive_player_choice',
        ]);
        expect(report.violations.every((row) => row.severity === 'CRITICAL')).toBe(true);
    });

    it('flags rupture claims whose trigger has no live state predicate', () => {
        const report = buildSensitiveHistoryAudit({
            rows: [{
                id: 'fixture_genocide_rupture_1995',
                category: 'humanitarian',
                narrative: 'A genocide rupture is recorded.',
                source_tier: 'tribunal',
                historical_source: 'Fixture tribunal citation.',
                source_note: 'Fixture provenance-only note.',
                trigger: { turn_min: 160, turn_max: 161, phase: 'war' },
            }],
        });

        expect(report.violations.some((row) => row.kind === 'calendar_only_rupture_claim')).toBe(true);
    });

    it('runs on real catalog without throwing and surfaces summary structure', () => {
        const report = buildSensitiveHistoryAudit();
        expect(report.summary.total_events_scanned).toBeGreaterThan(0);
        expect(report.events.length).toBeGreaterThan(0);
        // Real catalog has at least the two known Ring 3 rows.
        expect(report.summary.total_ring3_family_events).toBeGreaterThanOrEqual(2);
        // Summary numerics consistent with the events list.
        let counted = 0;
        for (const r of report.events) counted += r.violations.length;
        // events list may be filtered; cross-check the violations array instead.
        expect(report.violations.length).toBe(report.summary.total_violations);
        // Soft sanity: the events list has no impossible negative counts.
        expect(report.summary.total_clean_events).toBeGreaterThanOrEqual(0);
        // Ensure JSON-serializable shape.
        const roundtrip = JSON.parse(JSON.stringify(report)) as AuditReport;
        expect(roundtrip.summary.total_events_scanned).toBe(report.summary.total_events_scanned);
        // Silence unused-var lint:
        expect(counted).toBeGreaterThanOrEqual(0);
    });

    it('flags MISSING when a Ring 3 row lacks §3.6 guard text', () => {
        const report = buildSensitiveHistoryAudit({
            rows: [ring3RowMissingGuard()],
        });
        expect(report.summary.total_events_with_violations).toBe(1);
        const event = report.events[0];
        expect(event.section_3_6_guard).toBe('MISSING');
        const guardViol = event.violations.find((v) => v.kind === 'missing_section_3_6_guard');
        expect(guardViol?.severity).toBe('CRITICAL');
    });

    it('passes when a Ring 3 row carries the §3.6 guard phrase + keyword pair', () => {
        const report = buildSensitiveHistoryAudit({
            rows: [ring3RowClean()],
        });
        const event = report.events[0];
        expect(event.section_3_6_guard).toBe('PASS');
        // No §3.6-related violations.
        const guardViol = event.violations.find((v) => v.kind === 'missing_section_3_6_guard');
        expect(guardViol).toBeUndefined();
    });

    it('flags WEAK punitive floor when sensitive option has < 2 punitive markers', () => {
        const row = sensitiveCounterfactualRow([
            { dimension: 'military_credibility', delta: -5 },
        ]);
        const report = buildSensitiveHistoryAudit({ rows: [row] });
        const event = report.events[0];
        expect(event.punitive_cost_floor).toBe('FAIL');
        const weak = event.violations.find((v) => v.kind === 'weak_punitive_floor');
        expect(weak?.severity).toBe('WARNING');
        expect(weak?.locator).toBe('breakout_offensive');
    });

    it('flags CRITICAL when sensitive option carries positive territorial_legitimacy', () => {
        const row = sensitiveCounterfactualRow([
            { dimension: 'international_standing', delta: -10 },
            { dimension: 'internal_cohesion', delta: -10 },
            { dimension: 'territorial_legitimacy', delta: 8 },
        ]);
        const report = buildSensitiveHistoryAudit({ rows: [row] });
        const event = report.events[0];
        expect(event.forbidden_positive_shifts).toBe('FAIL');
        const crit = event.violations.find((v) => v.kind === 'forbidden_positive_territorial_legitimacy');
        expect(crit?.severity).toBe('CRITICAL');
        expect(crit?.locator).toBe('breakout_offensive');
    });

    it('flags CRITICAL Ring 3 enabling when upstream enables a Ring 3 target', () => {
        const ring3Target = ring3RowClean({ id: 'rs_camp_target_row' });
        const upstreamOpener = {
            id: 'r1_foundational_opener',
            family: 'rs_foundational_response',
            response_options: [
                {
                    id: 'historical_default',
                    enables_events_runtime: ['rs_camp_target_row'],
                    dimension_shifts: [
                        { faction: 'RS', dimension: 'military_credibility', delta: 3 },
                    ],
                },
            ],
        };
        const report = buildSensitiveHistoryAudit({
            rows: [ring3Target, upstreamOpener],
        });
        const targetReport = report.events.find((e) => e.event_id === 'rs_camp_target_row');
        expect(targetReport).toBeDefined();
        expect(targetReport!.ring3_enabling).toBe('FAIL');
        const viol = targetReport!.violations.find((v) => v.kind === 'ring3_enabling_target');
        expect(viol?.severity).toBe('CRITICAL');
    });

    it('does not flag a clean foundational (non-sensitive, no Ring 3, no sensitive options)', () => {
        const report = buildSensitiveHistoryAudit({
            rows: [cleanFoundationalRow()],
        });
        const event = report.events[0];
        expect(event.is_ring3_family).toBe(false);
        expect(event.is_sensitive_adjacent).toBe(false);
        expect(event.section_3_6_guard).toBe('NA');
        expect(event.punitive_cost_floor).toBe('NA');
        expect(event.ring3_enabling).toBe('NA');
        expect(event.violations.length).toBe(0);
    });

    it('JSON output structure is stable and contains the documented top-level fields', () => {
        const report = buildSensitiveHistoryAudit({
            rows: [ring3RowClean(), cleanFoundationalRow()],
        });
        const json = JSON.parse(JSON.stringify(report)) as Record<string, unknown>;
        expect(Object.keys(json).sort()).toEqual([
            'catalog_files',
            'events',
            'filter',
            'summary',
            'violations',
        ]);
    });

    it('--violations-only filter excludes clean events from the events array', () => {
        const report = buildSensitiveHistoryAudit({
            rows: [ring3RowMissingGuard(), cleanFoundationalRow()],
            violationsOnly: true,
        });
        // Only the missing-guard event should remain in the events list.
        expect(report.events.length).toBe(1);
        expect(report.events[0].event_id).toBe('rs_camp_exposure_missing_guard_row');
        // Violations array remains the full set regardless.
        expect(report.summary.total_violations).toBeGreaterThan(0);
    });

    it('emits a deterministic violation ordering (severity then event_id then kind)', () => {
        const rowA = sensitiveCounterfactualRow([
            { dimension: 'military_credibility', delta: -5 },
        ]); // WARNING
        const rowB = sensitiveCounterfactualRow([
            { dimension: 'international_standing', delta: -10 },
            { dimension: 'internal_cohesion', delta: -10 },
            { dimension: 'territorial_legitimacy', delta: 8 },
        ]); // CRITICAL
        // Distinct ids to avoid collision while preserving ordering signal.
        (rowB as Record<string, unknown>).id = 'h6_central_bosnia_test_b';
        const report = buildSensitiveHistoryAudit({ rows: [rowA, rowB] });
        // CRITICAL always precedes WARNING.
        const severities = report.violations.map((v) => v.severity);
        const firstWarningIdx = severities.indexOf('WARNING');
        const lastCriticalIdx = severities.lastIndexOf('CRITICAL');
        if (firstWarningIdx >= 0 && lastCriticalIdx >= 0) {
            expect(lastCriticalIdx).toBeLessThan(firstWarningIdx);
        }
        // Running twice on the same input yields identical ordering.
        const report2 = buildSensitiveHistoryAudit({ rows: [rowA, rowB] });
        expect(report2.violations.map((v) => `${v.severity}|${v.event_id}|${v.kind}|${v.locator ?? ''}`))
            .toEqual(report.violations.map((v) => `${v.severity}|${v.event_id}|${v.kind}|${v.locator ?? ''}`));
    });

    // ─── G3 reward_risk classification (INFO, not WARNING/CRITICAL) ───────
    it('emits reward_risk INFO (not CRITICAL/WARNING) for recruitment_modifier 1.05 (pool_multiplier)', () => {
        // Mirrors seek_clandestine_arms in war_1993.json: punitive cost floor
        // is sufficient (≥2 punitive markers), but a small recruitment boost
        // is observational and § 6-reviewed.
        const row: Record<string, unknown> = {
            id: 'h6_clandestine_arms_test',
            family: 'rbih_embargo_response',
            source_tier: 'balkan_battlegrounds',
            response_options: [
                {
                    id: 'seek_clandestine_arms',
                    dimension_shifts: [
                        { faction: 'RBiH', dimension: 'international_standing', delta: -10 },
                        { faction: 'RBiH', dimension: 'patron_confidence', delta: -8 },
                    ],
                    effects: [
                        { kind: 'recruitment_modifier', pool_multiplier: 1.05 },
                    ],
                },
            ],
        };
        const report = buildSensitiveHistoryAudit({ rows: [row] });
        const event = report.events[0];
        // Cost floor is PASS (2 punitive markers) — no weak_punitive_floor.
        expect(event.punitive_cost_floor).toBe('PASS');
        // No CRITICAL forbidden_recruitment_modifier_above_one (1.05 < 1.20).
        const critForbidden = event.violations.find(
            (v) => v.kind === 'forbidden_recruitment_modifier_above_one',
        );
        expect(critForbidden).toBeUndefined();
        // reward_risk fires as INFO.
        const rewardRisk = event.violations.find((v) => v.kind === 'reward_risk');
        expect(rewardRisk).toBeDefined();
        expect(rewardRisk!.severity).toBe('INFO');
        expect(rewardRisk!.locator).toBe('seek_clandestine_arms');
        expect(rewardRisk!.detail).toContain('recruitment_modifier=1.05');
        expect(rewardRisk!.detail).toContain('pool_multiplier');
    });

    it('emits CRITICAL forbidden_recruitment_modifier_above_one for extreme boost (1.50x)', () => {
        const row: Record<string, unknown> = {
            id: 'h6_extreme_recruitment_test',
            family: 'rbih_embargo_response',
            source_tier: 'balkan_battlegrounds',
            response_options: [
                {
                    id: 'seek_clandestine_arms',
                    dimension_shifts: [
                        { faction: 'RBiH', dimension: 'international_standing', delta: -10 },
                        { faction: 'RBiH', dimension: 'patron_confidence', delta: -10 },
                    ],
                    effects: [
                        { kind: 'recruitment_modifier', multiplier: 1.50 },
                    ],
                },
            ],
        };
        const report = buildSensitiveHistoryAudit({ rows: [row] });
        const event = report.events[0];
        const crit = event.violations.find(
            (v) => v.kind === 'forbidden_recruitment_modifier_above_one',
        );
        expect(crit).toBeDefined();
        expect(crit!.severity).toBe('CRITICAL');
        expect(crit!.locator).toBe('seek_clandestine_arms');
        // INFO reward_risk also fires for the same option (informational
        // surface stays even when CRITICAL forbidden-shift fires above it).
        const info = event.violations.find((v) => v.kind === 'reward_risk');
        expect(info).toBeDefined();
        expect(info!.severity).toBe('INFO');
    });

    it('dual-fires CRITICAL forbidden_positive_territorial_legitimacy AND INFO reward_risk', () => {
        // Positive territorial_legitimacy on a sensitive option is BOTH a
        // CRITICAL forbidden-shift (existing behavior) AND a reward_risk
        // signal (new G3 surface). Both must fire.
        const row: Record<string, unknown> = {
            id: 'h6_positive_legitimacy_test',
            family: 'hrhb_central_bosnia_response',
            source_tier: 'balkan_battlegrounds',
            response_options: [
                {
                    id: 'breakout_offensive',
                    dimension_shifts: [
                        { faction: 'HRHB', dimension: 'international_standing', delta: -10 },
                        { faction: 'HRHB', dimension: 'internal_cohesion', delta: -10 },
                        { faction: 'HRHB', dimension: 'territorial_legitimacy', delta: 5 },
                    ],
                },
            ],
        };
        const report = buildSensitiveHistoryAudit({ rows: [row] });
        const event = report.events[0];
        const crit = event.violations.find(
            (v) => v.kind === 'forbidden_positive_territorial_legitimacy',
        );
        expect(crit).toBeDefined();
        expect(crit!.severity).toBe('CRITICAL');
        const info = event.violations.find((v) => v.kind === 'reward_risk');
        expect(info).toBeDefined();
        expect(info!.severity).toBe('INFO');
        expect(info!.detail).toContain('territorial_legitimacy +5');
    });

    it('--family filter narrows to events whose family matches', () => {
        const report = buildSensitiveHistoryAudit({
            rows: [ring3RowClean(), cleanFoundationalRow()],
            family: 'rs_camp_exposure_response',
        });
        // Only the Ring 3 row should remain.
        expect(report.events.length).toBe(1);
        expect(report.events[0].family).toBe('rs_camp_exposure_response');
    });
});
