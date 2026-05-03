/**
 * srebrenica_rupture_trace_diagnostic.test.ts
 *
 * Validates that tools/diagnostics/srebrenica_rupture_trace.cjs is:
 *   (1) deterministic — same input → same output across two invocations
 *   (2) read-only — does not mutate any file in <run_dir> when invoked without --write-json
 *   (3) emits the canonical condition keys (c1/c2/c3) on every snapshot
 *
 * The tool is a parametric rupture-event tracer; this suite is part of the
 * LANE-NIGHTSHIFT-ROUND2-SREBRENICA-RUPTURE-DIAGNOSTIC audit deliverable.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

const TOOL_PATH = path.resolve(
    __dirname,
    '..',
    'tools',
    'diagnostics',
    'srebrenica_rupture_trace.cjs',
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

function runTool(args: string[]): string {
    return execFileSync('node', [TOOL_PATH, ...args], { encoding: 'utf8' });
}

function dirSnapshotHash(dir: string): string {
    // Hash file names + sizes + mtime ms (mtime is the only field that would
    // change for a non-mutated file under read-only access). The tool MUST NOT
    // change any of these without --write-json.
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

describe('srebrenica_rupture_trace.cjs', () => {
    it('is deterministic — two invocations against the same fixture produce identical stdout', () => {
        if (!fs.existsSync(FIXTURE_RUN_DIR)) {
            // Fixture not present in this checkout; skip rather than fail (the
            // diagnostic is intended to be run against any compatible run dir).
            return;
        }
        const a = runTool([FIXTURE_RUN_DIR]);
        const b = runTool([FIXTURE_RUN_DIR]);
        expect(sha256(a)).toBe(sha256(b));
    });

    it('is read-only against the run dir when --write-json is not passed', () => {
        if (!fs.existsSync(FIXTURE_RUN_DIR)) return;
        const before = dirSnapshotHash(FIXTURE_RUN_DIR);
        runTool([FIXTURE_RUN_DIR]);
        const after = dirSnapshotHash(FIXTURE_RUN_DIR);
        expect(after).toBe(before);
    });

    it('emits the canonical condition keys c1/c2/c3 in stdout', () => {
        if (!fs.existsSync(FIXTURE_RUN_DIR)) return;
        const out = runTool([FIXTURE_RUN_DIR]);
        expect(out).toContain('c1 enclave_formed_flag');
        expect(out).toContain('c2 capital_rs_controlled');
        expect(out).toContain('c3 turn>=140');
        expect(out).toMatch(/ALL_MET=(true|false)\s+rupture_recorded=(true|false)/);
    });
});
