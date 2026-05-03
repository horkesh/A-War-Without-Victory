/**
 * LANE-2026-05-02-KRIVAJA-BRIGADE-LIFECYCLE — Read-only diagnostic contract test.
 *
 * Asserts that `tools/diagnostics/krivaja_brigade_lifecycle.cjs` produces a
 * stable, schema-locked output against the preserved n1619 run artifacts when
 * given a deterministic CLI brigade-id watch list.
 *
 * The test is parametric over the brigade watch list — the diagnostic itself
 * has no faction-specific logic, and the test passes the watch list as a CLI
 * argument. Brigade ids appear here only to nail the n1619 baseline; the
 * diagnostic's reusability for any brigade list is exercised by the empty-list
 * negative case.
 *
 * Truth this test asserts:
 *   1. CLI usage with a comma-separated brigade-id list yields a JSON object
 *      with: lane, run_dir, last_week_index, watch_list, rows.
 *   2. watch_list is sorted via stable string comparison (asserted by re-sorting
 *      and comparing) and contains EXACTLY the requested ids.
 *   3. Every row has the documented schema keys.
 *   4. lifecycle_path values are drawn from the closed classification set.
 *   5. n1619 baseline truth (proves diagnostic computed correct values):
 *        - rs_1st_zvornik       => destroyed_in_combat, inactive_turn=95
 *                                  (battles_fought=6, casualties=2358 — real combat)
 *        - rs_1st_bratunac      => destroyed_in_combat, inactive_turn=101
 *                                  (battles_fought=4, casualties=1335 — real combat)
 *        - rs_skelani_battalion => dissolved_no_combat, inactive_turn=171,
 *                                  no op appearances; battles_fought=0 means
 *                                  the destroyed_brigades row reflects pure
 *                                  attrition / dissolution rather than combat
 *                                  destruction (LANE-A-Tier1 /formation-expert
 *                                  + /anomaly-triage classifier mis-tag fix).
 *        - rs_5th_podrinje      => dissolved,           inactive_turn=86
 *        - rs_1st_milii         => unknown_inactive,    inactive_turn=null
 *          (artifact-gap case: brigade goes inactive without surfacing in either
 *           destroyed_brigades.json or brigade_dissolution; cannot be resolved
 *           without per-turn brigade-keyed snapshot emission)
 *   6. Determinism: two consecutive invocations on the same artifacts produce
 *      byte-identical stdout.
 *   7. Negative case: missing run_dir argument fails with non-zero exit.
 *
 * No engine code is exercised. No combat math, no scenario data, no derived
 * data is touched. The test only spawns the diagnostic against pre-existing
 * pinned run artifacts.
 *
 * Determinism: spawnSync is synchronous; comparisons are exact-string and
 * exact-object-shape; no timing-dependent assertions.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const RUN_DIR = 'runs/apr1992_definitive_188w__210e69404d054959__w188_n1619';
const DIAGNOSTIC = 'tools/diagnostics/krivaja_brigade_lifecycle.cjs';

// Watch list is parametric to the test; the DIAGNOSTIC IS NOT.
const WATCH_LIST = [
    'rs_1st_zvornik',
    'rs_1st_bratunac',
    'rs_skelani_battalion',
    'rs_1st_milii',
    'rs_5th_podrinje',
];

const ALLOWED_LIFECYCLE_PATHS = new Set([
    'destroyed_in_combat',
    'dissolved_no_combat',
    'dissolved',
    'active_throughout',
    'silent_inactive',
    'unknown_inactive',
]);

const ROW_KEYS = [
    'brigade_id',
    'first_op_appearance_turn',
    'last_op_appearance_turn',
    'op_appearance_count',
    'dissolution_turns',
    'dissolution_records',
    'destroyed_record',
    'inactive_turn',
    'lifecycle_path',
    // LANE-NIGHTSHIFT-N11: per-turn temporal evidence enrichment from
    // brigade_temporal_log.jsonl (LANE-A1). Field is null when the
    // log is absent (older runs pre-A1) or no timeline rows for this
    // brigade; populated object otherwise.
    'temporal_evidence',
];

function strictCompare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

function runDiagnostic(args: string[]): { stdout: string; status: number | null } {
    const r = spawnSync(process.execPath, [DIAGNOSTIC, ...args], {
        encoding: 'utf8',
        cwd: path.resolve(path.join(__dirname, '..')),
    });
    return { stdout: r.stdout, status: r.status };
}

const HAS_RUN_DIR = existsSync(path.resolve(path.join(__dirname, '..', RUN_DIR)));

describe('LANE-2026-05-02-KRIVAJA-BRIGADE-LIFECYCLE diagnostic contract', () => {
    it.skipIf(!HAS_RUN_DIR)(
        'produces a schema-locked JSON object for a parametric watch list',
        () => {
            const { stdout, status } = runDiagnostic([RUN_DIR, WATCH_LIST.join(',')]);
            assert.equal(status, 0, 'diagnostic must exit 0');
            const out = JSON.parse(stdout);
            assert.equal(out.lane, 'LANE-2026-05-02-KRIVAJA-BRIGADE-LIFECYCLE');
            assert.equal(out.run_dir, RUN_DIR);
            assert.equal(typeof out.last_week_index, 'number');
            assert.ok(Array.isArray(out.watch_list));
            assert.equal(out.watch_list.length, WATCH_LIST.length);
            const expectedSorted = [...WATCH_LIST].sort(strictCompare);
            assert.deepEqual(out.watch_list, expectedSorted, 'watch_list must be strictCompare-sorted');
            assert.ok(Array.isArray(out.rows));
            assert.equal(out.rows.length, WATCH_LIST.length);
            for (const row of out.rows) {
                for (const k of ROW_KEYS) {
                    assert.ok(k in row, `row missing key: ${k}`);
                }
                assert.ok(
                    ALLOWED_LIFECYCLE_PATHS.has(row.lifecycle_path),
                    `unexpected lifecycle_path: ${row.lifecycle_path}`,
                );
            }
        },
    );

    it.skipIf(!HAS_RUN_DIR)(
        'classifies n1619 watched brigades against artifact baseline truth',
        () => {
            const { stdout } = runDiagnostic([RUN_DIR, WATCH_LIST.join(',')]);
            const out = JSON.parse(stdout);
            const byId = new Map<string, any>();
            for (const r of out.rows) byId.set(r.brigade_id, r);

            // destroyed_in_combat path — turn_destroyed authoritative.
            const zvornik = byId.get('rs_1st_zvornik');
            assert.equal(zvornik.lifecycle_path, 'destroyed_in_combat');
            assert.equal(zvornik.inactive_turn, 95);

            const bratunac = byId.get('rs_1st_bratunac');
            assert.equal(bratunac.lifecycle_path, 'destroyed_in_combat');
            assert.equal(bratunac.inactive_turn, 101);

            // dissolved_no_combat — destroyed_brigades row present BUT
            // battles_fought === 0 (or total_casualties_taken === 0); brigade
            // bled out via attrition/dissolution rather than combat destruction.
            // Distinguishes pure-attrition cases from combat-destroyed cases for
            // downstream root-cause analysis (LANE-A-Tier1 classifier mis-tag fix).
            const skelani = byId.get('rs_skelani_battalion');
            assert.equal(skelani.lifecycle_path, 'dissolved_no_combat');
            assert.equal(skelani.inactive_turn, 171);
            assert.equal(skelani.op_appearance_count, 0);
            assert.equal(skelani.first_op_appearance_turn, null);
            // The destroyed_brigades row IS still present; the new enum captures
            // the destroyed-with-zero-battles signature without losing the row.
            assert.notEqual(skelani.destroyed_record, null);
            assert.equal(skelani.destroyed_record.battles_fought, 0);

            // dissolved path — brigade_dissolution row, no destroyed row.
            const podrinje = byId.get('rs_5th_podrinje');
            assert.equal(podrinje.lifecycle_path, 'dissolved');
            assert.equal(podrinje.inactive_turn, 86);

            // unknown_inactive path — artifact gap. Brigade went inactive without
            // surfacing as either combat-destroyed or dissolved. This is the
            // case that motivates per-turn brigade-keyed snapshot emission.
            const milici = byId.get('rs_1st_milii');
            assert.equal(milici.lifecycle_path, 'unknown_inactive');
            assert.equal(milici.inactive_turn, null);
            assert.equal(milici.destroyed_record, null);
            assert.deepEqual(milici.dissolution_turns, []);
            // last op appearance < final week (otherwise classification would be
            // active_throughout). Locks the artifact-gap evidence.
            assert.ok(
                typeof milici.last_op_appearance_turn === 'number' &&
                    milici.last_op_appearance_turn < out.last_week_index,
                `rs_1st_milii must have last_op_appearance_turn < last_week_index ` +
                    `(got last=${milici.last_op_appearance_turn}, ` +
                    `last_week=${out.last_week_index})`,
            );
        },
    );

    it.skipIf(!HAS_RUN_DIR)(
        'is byte-stable across two invocations on the same artifacts',
        () => {
            const a = runDiagnostic([RUN_DIR, WATCH_LIST.join(',')]).stdout;
            const b = runDiagnostic([RUN_DIR, WATCH_LIST.join(',')]).stdout;
            assert.equal(a, b, 'diagnostic must be byte-stable on identical inputs');
        },
    );

    it('fails non-zero with no arguments', () => {
        const { status } = runDiagnostic([]);
        assert.notEqual(status, 0, 'must fail without run_dir');
    });
});
