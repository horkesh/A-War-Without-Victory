import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { runScenario } from '../src/scenario/scenario_runner.js';

const SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'noop_13w.json');

async function makeTempRunRoot(): Promise<string> {
    return mkdtemp(join(tmpdir(), 'awwv-replay-mode-'));
}

describe('scenario replay payload mode contract', () => {
    it('defaults to manifest-only replay output without changing final save bytes', async () => {
        const prereq = checkDataPrereqs({ baseDir: process.cwd() });
        if (!prereq.ok) {
            return;
        }

        const defaultOut = await makeTempRunRoot();
        const fullOut = await makeTempRunRoot();
        try {
            const manifestOnlyRun = await runScenario({
                scenarioPath: SCENARIO_PATH,
                outDirBase: defaultOut,
                weeksOverride: 2,
                consoleDiagnostics: false,
            });
            const fullRun = await runScenario({
                scenarioPath: SCENARIO_PATH,
                outDirBase: fullOut,
                weeksOverride: 2,
                consoleDiagnostics: false,
                replayPayloadMode: 'full',
            });

            expect(manifestOnlyRun.paths.replay_save_manifest).toBe(join(manifestOnlyRun.outDir, 'replay_save_manifest.json'));
            expect(existsSync(manifestOnlyRun.paths.replay_save_manifest)).toBe(true);
            expect(manifestOnlyRun.paths.replay_sequence_log).toBe('');
            expect(manifestOnlyRun.paths.replay_save_sequence).toBe('');
            expect(existsSync(join(manifestOnlyRun.outDir, 'replay_sequence.jsonl'))).toBe(false);
            expect(existsSync(join(manifestOnlyRun.outDir, 'replay_save_sequence.json'))).toBe(false);

            const manifest = JSON.parse(await readFile(manifestOnlyRun.paths.replay_save_manifest, 'utf8')) as {
                schema_version: number;
                frame_count: number;
                frames: unknown[];
            };
            expect(manifest.schema_version).toBe(1);
            expect(manifest.frame_count).toBe(2);
            expect(manifest.frames).toHaveLength(2);

            expect(fullRun.paths.replay_sequence_log).toBe(join(fullRun.outDir, 'replay_sequence.jsonl'));
            expect(fullRun.paths.replay_save_sequence).toBe(join(fullRun.outDir, 'replay_save_sequence.json'));
            expect(existsSync(fullRun.paths.replay_sequence_log)).toBe(true);
            expect(existsSync(fullRun.paths.replay_save_sequence)).toBe(true);
            expect(existsSync(fullRun.paths.replay_save_manifest)).toBe(true);

            const fullSequence = JSON.parse(await readFile(fullRun.paths.replay_save_sequence, 'utf8')) as unknown[];
            expect(fullSequence).toHaveLength(2);

            const [manifestOnlyFinal, fullFinal] = await Promise.all([
                readFile(manifestOnlyRun.paths.final_save, 'utf8'),
                readFile(fullRun.paths.final_save, 'utf8'),
            ]);
            expect(manifestOnlyFinal).toBe(fullFinal);
            expect(manifestOnlyRun.final_state_hash).toBe(fullRun.final_state_hash);
        } finally {
            await rm(defaultOut, { recursive: true, force: true });
            await rm(fullOut, { recursive: true, force: true });
        }
    }, 20_000);
});
