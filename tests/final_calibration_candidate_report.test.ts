/**
 * R6 Phase 0.2 — final-calibration candidate report determinism tests.
 *
 * The candidate report is calibration TOOLING (no engine effect). Its whole value
 * is a STABLE, side-by-side comparison across configs/horizons, so the two things
 * that must be proven are:
 *   (1) ordering is stable and canonical (configs, horizons 40/104/188, and the
 *       named historical rows appear in a fixed deterministic order), and
 *   (2) repeated execution over identical inputs is BYTE-IDENTICAL (no wall-clock,
 *       no RNG, no Map/Set iteration leakage).
 *
 * These tests exercise the PURE render layer over a fixed in-test report object,
 * so they are hermetic (green in CI without any live run artifacts).
 */

import { describe, expect, it } from 'vitest';
import {
    CONFIGS,
    HORIZONS,
    HISTORICAL_ROWS,
    renderCandidateReport,
    type CandidateReport,
} from '../tools/diagnostics/final_calibration_candidate_report.js';

function fixedReport(): CandidateReport {
    // Deliberately construct cells OUT OF canonical order to prove the renderer
    // imposes a stable order rather than echoing input order.
    return {
        cells: [
            { config: 'intel_ambush', horizon: 188, status: 'runnable', run_id: 'r-ia-188',
              metrics: { matched_osids: 634, anchors_pass: 30, anchors_total: 31, kw_ratio: 3.804,
                         dead_ops: 0, ghost: 2, stranded: 8,
                         s6: { srebrenica_fell: true, zepa_fell: true, gorazde_held: true, bihac_held: true, sarajevo_held: true } } },
            { config: 'default', horizon: 40, status: 'runnable', run_id: 'r-d-40',
              metrics: { matched_osids: 700, anchors_pass: 31, anchors_total: 31, kw_ratio: 3.5,
                         dead_ops: 0, ghost: 0, stranded: 2,
                         s6: { srebrenica_fell: false, zepa_fell: false, gorazde_held: true, bihac_held: true, sarajevo_held: true } } },
            { config: 'default', horizon: 188, status: 'runnable', run_id: 'r-d-188',
              metrics: { matched_osids: 634, anchors_pass: 30, anchors_total: 31, kw_ratio: 3.804,
                         dead_ops: 0, ghost: 2, stranded: 8,
                         s6: { srebrenica_fell: true, zepa_fell: true, gorazde_held: true, bihac_held: true, sarajevo_held: true } } },
            { config: 'intl_only', horizon: 188, status: 'flag_not_wired' },
            { config: 'cohesion_only', horizon: 188, status: 'flag_not_wired' },
            { config: 'default', horizon: 104, status: 'no_artifact' },
        ],
        historical: [
            { row: 'dayton_end_state', config: 'default', horizon: 188, note: 'RS 634/712 matched' },
            { row: 'drina_apr1992', config: 'default', horizon: 40, note: 'RS takeovers present' },
        ],
    };
}

describe('final calibration candidate report — determinism', () => {
    it('repeated render over identical input is byte-identical', () => {
        const a = renderCandidateReport(fixedReport());
        const b = renderCandidateReport(fixedReport());
        expect(a).toBe(b);
    });

    it('output contains no wall-clock / timestamp leakage', () => {
        const out = renderCandidateReport(fixedReport());
        // No ISO datetime and no bare 13-digit epoch-millis in the deterministic report.
        expect(out).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
        expect(out).not.toMatch(/\b1[0-9]{12}\b/);
    });

    it('renders configs in canonical CONFIGS order regardless of input cell order', () => {
        const out = renderCandidateReport(fixedReport());
        const positions = CONFIGS.map((c) => out.indexOf(`| ${c.label}`)).filter((p) => p >= 0);
        const sorted = [...positions].sort((x, y) => x - y);
        expect(positions).toEqual(sorted);
        // default appears before intel_ambush before the not-wired configs.
        expect(out.indexOf('default')).toBeLessThan(out.indexOf('intel_ambush'));
    });

    it('renders horizons in ascending 40/104/188 order', () => {
        const out = renderCandidateReport(fixedReport());
        const p40 = out.indexOf('40w');
        const p104 = out.indexOf('104w');
        const p188 = out.indexOf('188w');
        expect(p40).toBeGreaterThanOrEqual(0);
        expect(p40).toBeLessThan(p104);
        expect(p104).toBeLessThan(p188);
    });

    it('renders the named historical rows in the fixed canonical order', () => {
        const out = renderCandidateReport(fixedReport());
        const positions = HISTORICAL_ROWS.map((r) => out.indexOf(r.label)).filter((p) => p >= 0);
        const sorted = [...positions].sort((x, y) => x - y);
        expect(positions).toEqual(sorted);
        expect(HISTORICAL_ROWS.length).toBeGreaterThanOrEqual(6);
    });

    it('surfaces flag-not-wired configs explicitly rather than omitting them', () => {
        const out = renderCandidateReport(fixedReport());
        expect(out).toMatch(/intl_only/);
        expect(out).toMatch(/cohesion_only/);
        expect(out).toMatch(/not wired|flag_not_wired|not runnable/i);
    });

    it('exposes the canonical horizon set 40/104/188', () => {
        expect([...HORIZONS]).toEqual([40, 104, 188]);
    });
});
