import assert from 'node:assert';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'vitest';

const MATRIX_RELATIVE_ROOT = 'data/derived/scenario/recruitment_test_matrix_2026_02_11';

const RUN_SHAPES: Record<string, string[]> = {
    '_tmp_player_choice_recruitment_4w__acc3c9d910eb73d8__w4': [
        'failure_report.json',
        'failure_report.txt',
        'initial_save.json',
        'replay.jsonl',
        'run_meta.json',
        'weekly_report.jsonl',
    ],
    'baseline_ops_4w__e5f478f75692aede__w4': [
        'activity_summary.json',
        'control_delta.json',
        'control_events.jsonl',
        'end_report.md',
        'final_save.json',
        'formation_delta.json',
        'initial_save.json',
        'replay.jsonl',
        'run_meta.json',
        'run_summary.json',
        'weekly_report.jsonl',
    ],
    'ethnic_1991_init_4w__74c48dae1e3cd0e3__w4': [
        'initial_save.json',
        'replay.jsonl',
        'run_meta.json',
        'weekly_report.jsonl',
    ],
    'hybrid_1992_init_4w__f9347f6e907f3187__w4': [
        'initial_save.json',
        'replay.jsonl',
        'run_meta.json',
        'weekly_report.jsonl',
    ],
};

function strictCompare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

async function readJson<T>(path: string): Promise<T> {
    return JSON.parse(await readFile(path, 'utf8')) as T;
}

test('recruitment test matrix retained artifact tree has static ownership and fixed per-run shape', async () => {
    const repoRoot = process.cwd();
    const matrixRoot = join(repoRoot, ...MATRIX_RELATIVE_ROOT.split('/'));
    const ownershipDoc = await readFile(join(repoRoot, 'docs', '20_engineering', 'GENERATED_ARTIFACT_OWNERSHIP.md'), 'utf8');

    const ownershipRow = ownershipDoc
        .split(/\r?\n/)
        .find((line) => line.startsWith(`| \`${MATRIX_RELATIVE_ROOT}/\``));
    assert.ok(ownershipRow, 'ownership docs should include the retained recruitment test matrix tree');
    assert.ok(
        ownershipRow.includes('tests/recruitment_test_matrix_artifact_ownership.test.ts'),
        'ownership row should name this static ownership guard',
    );
    assert.ok(
        ownershipRow.includes('retained static evidence'),
        'ownership row should classify the tree as retained static evidence rather than a refresh target',
    );
    assert.ok(
        ownershipRow.includes('Do not delete, refresh, or rerun'),
        'ownership row should explicitly forbid in-place refresh/rerun of this committed tree',
    );

    for (const runDir of Object.keys(RUN_SHAPES)) {
        assert.ok(ownershipRow.includes(`\`${runDir}\``), `ownership row should classify retained run directory ${runDir}`);
    }
    assert.ok(
        ownershipRow.includes('failed player-choice recruitment evidence'),
        'ownership row should classify the retained _tmp player-choice failure evidence',
    );

    const rootEntries = (await readdir(matrixRoot, { withFileTypes: true })).sort((a, b) => strictCompare(a.name, b.name));
    assert.deepStrictEqual(
        rootEntries.filter((entry) => entry.isFile()).map((entry) => entry.name),
        [],
        'recruitment matrix root should contain only retained run directories',
    );
    const runDirs = rootEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort(strictCompare);
    assert.deepStrictEqual(runDirs, Object.keys(RUN_SHAPES).sort(strictCompare), 'retained recruitment matrix run directory set should stay fixed');

    for (const runDir of runDirs) {
        const files = (await readdir(join(matrixRoot, runDir))).sort(strictCompare);
        assert.deepStrictEqual(files, [...RUN_SHAPES[runDir]].sort(strictCompare), `${runDir} artifact set should stay fixed`);

        const runMeta = await readJson<{
            out_dir: string;
            run_id: string;
            scenario_id: string;
            scenario_path: string;
            weeks: number;
        }>(join(matrixRoot, runDir, 'run_meta.json'));
        assert.strictEqual(runMeta.run_id, runDir, `${runDir} run_meta run_id should match directory`);
        assert.strictEqual(runMeta.weeks, 4, `${runDir} should remain the committed 4w evidence slice`);
        assert.strictEqual(
            runMeta.out_dir.replaceAll('\\', '/'),
            `${MATRIX_RELATIVE_ROOT}/${runDir}`,
            `${runDir} run_meta out_dir should point at the committed matrix tree`,
        );
        assert.ok(
            runDir.startsWith(`${runMeta.scenario_id}__`),
            `${runDir} should preserve scenario_id as the run_id prefix`,
        );
        assert.strictEqual(
            runMeta.scenario_path,
            `data/scenarios/${runMeta.scenario_id}.json`,
            `${runDir} scenario_path should identify the scenario fixture used for the retained run`,
        );
    }

    const failureDir = join(matrixRoot, '_tmp_player_choice_recruitment_4w__acc3c9d910eb73d8__w4');
    const [failureReport, failureText] = await Promise.all([
        readJson<{
            error_message: string;
            error_name: string;
            run_id: string;
            scenario_id: string;
            weeks: number;
        }>(join(failureDir, 'failure_report.json')),
        readFile(join(failureDir, 'failure_report.txt'), 'utf8'),
    ]);
    assert.strictEqual(failureReport.scenario_id, '_tmp_player_choice_recruitment_4w');
    assert.strictEqual(failureReport.error_name, 'Error');
    assert.match(failureReport.error_message, /unexpected top-level key "recruitment_state"/);
    assert.ok(
        failureText.includes('SCENARIO RUN FAILED') && failureText.includes(failureReport.error_message),
        'text failure report should preserve the same failure evidence as the JSON report',
    );
});
