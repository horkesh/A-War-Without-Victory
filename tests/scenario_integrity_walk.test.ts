import assert from 'node:assert';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { test } from 'vitest';

const require = createRequire(import.meta.url);
const integrityWalk = require('../tools/diagnostics/scenario_integrity_walk.cjs');

test('scenario integrity walk classifies missing corps and brigade references deterministically', async () => {
    const root = await mkdtemp(join(tmpdir(), 'awwv-scenario-walk-'));
    const runDir = join(root, 'run');
    const sourceDir = join(root, 'source');
    await mkdir(runDir);
    await mkdir(sourceDir);

    try {
        await writeFile(join(sourceDir, 'oob_corps.json'), JSON.stringify({
            corps: [
                { id: 'known_corps', faction: 'RS' },
            ],
        }));
        await writeFile(join(runDir, 'run_summary.json'), JSON.stringify({
            final_state_hash: 'abc123',
            takeover_displacement: { total_displaced: 5 },
        }));
        await writeFile(join(runDir, 'final_save.json'), JSON.stringify({
            displacement: {
                displacement_humanitarian_aggregates: { total_displaced: 7 },
            },
            military: {
                formations: {
                    brigade_b: { id: 'brigade_b', kind: 'brigade', corps_id: 'known_corps' },
                    brigade_a: { id: 'brigade_a', kind: 'brigade', corps_id: 'missing_corps' },
                },
            },
            operation_history: [
                {
                    operation_id: 'op_z',
                    corps_id: 'missing_corps',
                    participating_brigades: ['missing_brigade', 'brigade_b'],
                },
            ],
        }));

        const result = await integrityWalk.runScenarioIntegrityWalk({
            runDir,
            oobCorpsPath: join(sourceDir, 'oob_corps.json'),
            expectedHash: 'expected456',
        });

        assert.deepStrictEqual(result.summary, {
            errorCount: 3,
            warningCount: 2,
            infoCount: 1,
            finalStateHash: 'abc123',
            expectedHash: 'expected456',
        });
        assert.deepStrictEqual(result.findings.map((finding: { severity: string; code: string; subject: string }) => [
            finding.severity,
            finding.code,
            finding.subject,
        ]), [
            ['ERROR', 'FORMATION_CORPS_MISSING_IN_OOB', 'brigade_a'],
            ['ERROR', 'OPERATION_BRIGADE_MISSING', 'op_z:missing_brigade'],
            ['ERROR', 'OPERATION_CORPS_MISSING_IN_OOB', 'op_z'],
            ['WARNING', 'DISPLACEMENT_TOTAL_MISMATCH', 'total_displaced'],
            ['WARNING', 'RUN_HASH_MISMATCH', 'abc123'],
            ['INFO', 'RUN_HASH_PRESENT', 'abc123'],
        ]);
        assert.strictEqual(result.exitCode, 1);
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});
