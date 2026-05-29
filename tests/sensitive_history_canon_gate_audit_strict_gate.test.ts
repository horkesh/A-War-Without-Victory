/**
 * Phase G Packet 3 — F2 sensitive-history canon-gate audit strict CI gate.
 *
 * Single-purpose CI integration test: load the real catalog
 * (war_1992/1993/1994/1995/consequences) and assert the audit returns
 * ZERO CRITICAL and ZERO WARNING violations. INFO violations are PERMITTED
 * (observational — §6-reviewed sensitive-design decisions such as
 * seek_clandestine_arms's 1.05x recruitment_modifier surface here for
 * visibility but do not block CI).
 *
 * Per the Phase G3 design call:
 *   - CRITICAL — hard fail (atrocity-reward, §3.6 guard drift, ring 3
 *     enabling)
 *   - WARNING  — hard fail (weak punitive cost floor on a sensitive option)
 *   - INFO     — informational only (reward_risk surfaces small §6-reviewed
 *     boosts; explicitly NOT a CI blocker)
 *
 * If this test fails: a new event-authoring change in
 * data/scenarios/events/*.json has introduced a CRITICAL or WARNING
 * regression. The failure message lists every offending violation so the
 * author can either tighten the option or invoke the canon-compliance
 * panel for §6 review.
 *
 * Determinism: pure given the catalog on disk; sorted iteration in the
 * audit itself; no Math.random / Date.now / timestamps.
 */

import { describe, expect, it } from 'vitest';

import {
    buildSensitiveHistoryAudit,
    type Violation,
} from '../tools/diagnostics/sensitive_history_canon_gate_audit.js';

function formatBlockingViolations(blocking: Violation[]): string {
    const lines: string[] = [];
    lines.push(
        `F2 strict gate FAILED: ${blocking.length} blocking violation(s) ` +
            `(CRITICAL + WARNING) in the real catalog. ` +
            `Fix the offending event(s) or, if intentional and §6-reviewed, ` +
            `adjust the audit heuristic and the SENSITIVE_HISTORY_DESIGN_GATE doc:`,
    );
    for (const v of blocking) {
        lines.push(
            `  [${v.severity}] ${v.event_id} (${v.family ?? '<no-family>'}): ` +
                `${v.kind}${v.locator ? ` @ ${v.locator}` : ''} — ${v.detail}`,
        );
    }
    return lines.join('\n');
}

describe('sensitive_history_canon_gate_audit — strict CI gate', () => {
    it('real catalog has zero CRITICAL and zero WARNING violations', () => {
        const report = buildSensitiveHistoryAudit();
        const blocking = report.violations.filter(
            (v) => v.severity === 'CRITICAL' || v.severity === 'WARNING',
        );
        if (blocking.length > 0) {
            // Helpful diagnostic before the assertion fires.
            // eslint-disable-next-line no-console
            console.error(formatBlockingViolations(blocking));
        }
        expect(blocking).toEqual([]);
        // Hardened assertions on the summary counters as well — protects
        // against any future report-shape drift that might mask blocking
        // violations behind a filter.
        expect(report.summary.violations_by_severity.CRITICAL).toBe(0);
        expect(report.summary.violations_by_severity.WARNING).toBe(0);
    });

    it('INFO violations are PERMITTED and do not block the strict gate', () => {
        const report = buildSensitiveHistoryAudit();
        // Sanity: the strict gate must not require INFO to be zero. We
        // document the observed INFO count for downstream visibility (the
        // §6-reviewed reward_risk surface on small canonical boosts).
        const info = report.violations.filter((v) => v.severity === 'INFO');
        // Lower bound is 0 (no INFO is fine). Upper bound is unconstrained.
        expect(info.length).toBeGreaterThanOrEqual(0);
        expect(report.summary.violations_by_severity.INFO).toBe(info.length);
    });
});
