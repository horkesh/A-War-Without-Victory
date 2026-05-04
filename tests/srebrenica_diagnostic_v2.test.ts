/**
 * srebrenica_diagnostic_v2.test.ts
 *
 * LANE-NIGHTSHIFT-SREBRENICA-DIAGNOSTIC-V2 verification suite.
 *
 * Covers:
 *   T1: extended tracer (`tools/diagnostics/srebrenica_rupture_trace.cjs`) is deterministic
 *       — same run dir produces identical stdout across two invocations.
 *   T2: extended tracer is read-only against the run dir (no mtime/size change without --write-json).
 *   T3: late_war_atrocity_pre_conditions tool is parametric — works for a non-Srebrenica
 *       rupture event id (`__test_zepa_fall_1995` registry entry).
 *   T4: late_war_atrocity_pre_conditions tool is deterministic — same input → same output.
 *
 * The suite is a sibling of `tests/srebrenica_rupture_trace_diagnostic.test.ts`
 * (R2-6); it does NOT replace those tests, it extends coverage for V2.
 *
 * Audit-only: tests do not exercise engine code, only the diagnostic tools.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

const TRACE_TOOL = path.resolve(
    __dirname,
    '..',
    'tools',
    'diagnostics',
    'srebrenica_rupture_trace.cjs',
);

const PRECOND_TOOL = path.resolve(
    __dirname,
    '..',
    'tools',
    'diagnostics',
    'late_war_atrocity_pre_conditions.cjs',
);

const FIXTURE_RUN_DIR = path.resolve(
    __dirname,
    '..',
    'runs',
    'apr1992_definitive_188w__210e69404d054959__w188_n1623',
);

function sha256(buf: Buffer | string): string {
    return crypto.createHash('sha256').update(buf).digest('hex');
}

function runTool(toolPath: string, args: string[]): string {
    return execFileSync('node', [toolPath, ...args], { encoding: 'utf8' });
}

function dirSnapshotHash(dir: string): string {
    const entries = fs.readdirSync(dir).sort();
    const parts: string[] = [];
    for (const e of entries) {
        const p = path.join(dir, e);
        const st = fs.statSync(p);
        if (st.isFile()) {
            parts.push(`${e}|${st.size}|${st.mtimeMs}`);
        }
    }
    return sha256(parts.join('\n'));
}

describe('Srebrenica diagnostic V2', () => {
    it('T1: extended tracer is deterministic — two invocations produce identical stdout', () => {
        if (!fs.existsSync(FIXTURE_RUN_DIR)) {
            // Fixture not present in this checkout; skip rather than fail.
            return;
        }
        const a = runTool(TRACE_TOOL, [FIXTURE_RUN_DIR]);
        const b = runTool(TRACE_TOOL, [FIXTURE_RUN_DIR]);
        expect(sha256(a)).toBe(sha256(b));
        // Sanity-check: V2 sections must appear so we know we're testing the
        // extended tool, not an accidental rollback.
        expect(a).toContain('Concentration ratios');
        expect(a).toContain('VRS Drina-perimeter brigade roster');
        expect(a).toContain('Predictor force_ratio_estimate for enclave ops');
    });

    it('T2: extended tracer is read-only against the run dir (no mtime/size mutation)', () => {
        if (!fs.existsSync(FIXTURE_RUN_DIR)) return;
        const before = dirSnapshotHash(FIXTURE_RUN_DIR);
        runTool(TRACE_TOOL, [FIXTURE_RUN_DIR]);
        const after = dirSnapshotHash(FIXTURE_RUN_DIR);
        expect(after).toBe(before);
    });

    it('T3: late_war_atrocity_pre_conditions tool is parametric — works for a non-Srebrenica rupture event id', () => {
        if (!fs.existsSync(FIXTURE_RUN_DIR)) return;
        // The Srebrenica registry entry must exit cleanly with non-empty output.
        const sreb = runTool(PRECOND_TOOL, [FIXTURE_RUN_DIR, 'srebrenica_genocide_1995']);
        expect(sreb).toContain('late_war_atrocity_pre_conditions: srebrenica_genocide_1995');
        expect(sreb).toContain('canon_source: src/sim/negotiation/rupture_consequences.ts');

        // The non-Srebrenica registry entry (test-only Žepa probe) must also exit
        // cleanly — this is the *parametricity* assertion: the same code path
        // accepts a different rupture_event_id without Srebrenica-specific code.
        const zepa = runTool(PRECOND_TOOL, [FIXTURE_RUN_DIR, '__test_zepa_fall_1995']);
        expect(zepa).toContain('late_war_atrocity_pre_conditions: __test_zepa_fall_1995');
        expect(zepa).toContain('test-only');

        // The two registry entries must classify their unmet c2 with different
        // class labels in the same fixture run (Srebrenica = d combat math,
        // Žepa = c bot AI). This pins the parametricity behaviour: registry
        // shape, not Srebrenica-specific shortcut.
        expect(sreb).toMatch(/c2 .*UNMET.*class=\(d\)/);
        expect(zepa).toMatch(/c2 .*UNMET.*class=\(c\)/);
    });

    it('T4: late_war_atrocity_pre_conditions tool is deterministic — same input → same output', () => {
        if (!fs.existsSync(FIXTURE_RUN_DIR)) return;
        const a = runTool(PRECOND_TOOL, [FIXTURE_RUN_DIR, 'srebrenica_genocide_1995']);
        const b = runTool(PRECOND_TOOL, [FIXTURE_RUN_DIR, 'srebrenica_genocide_1995']);
        expect(sha256(a)).toBe(sha256(b));
        // And for the parametric Žepa test entry as well.
        const za = runTool(PRECOND_TOOL, [FIXTURE_RUN_DIR, '__test_zepa_fall_1995']);
        const zb = runTool(PRECOND_TOOL, [FIXTURE_RUN_DIR, '__test_zepa_fall_1995']);
        expect(sha256(za)).toBe(sha256(zb));
    });
});
