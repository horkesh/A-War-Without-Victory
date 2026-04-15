import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { test } from 'vitest';

import { startNewCampaign } from '../src/desktop/desktop_sim.js';
import { createStateFromScenario, runScenario } from '../src/scenario/scenario_runner.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';

async function ensureRemoved(dir: string): Promise<void> {
    if (existsSync(dir)) {
        await rm(dir, { recursive: true, force: true });
    }
}

test('initial_save is already in canonical loaded-save form at campaign birth', async () => {
    const baseDir = process.cwd();
    const scenarioPath = join(baseDir, 'data', 'scenarios', 'apr1992_definitive_52w.json');
    const outDir = join(baseDir, '.tmp_desktop_campaign_start_contract');

    await ensureRemoved(outDir);
    const result = await runScenario({
        scenarioPath,
        baseDir,
        outDirBase: outDir,
        initialStateOnly: true,
    });

    const initialSave = await readFile(result.paths.initial_save, 'utf8');
    const hydrated = deserializeState(initialSave);
    const inMemoryState = await createStateFromScenario(scenarioPath, baseDir, { initialStateOnly: true });

    assert.strictEqual(
        serializeState(hydrated),
        initialSave,
        'initial_save.json should already match the canonical loaded-save contract',
    );
    assert.strictEqual(
        serializeState(inMemoryState),
        initialSave,
        'desktop in-memory startup state should match the canonical initial_save exactly',
    );

    await ensureRemoved(outDir);
}, 120_000);

test('startNewCampaign returns canonicalized state before the first manual save', async () => {
    const { state } = await startNewCampaign(process.cwd(), 'RBiH', 'apr_1992');
    const payload = serializeState(state);
    const hydrated = deserializeState(payload);

    assert.strictEqual(hydrated.meta.player_faction, 'RBiH');
    assert.ok(hydrated.military.recruitment_state, 'desktop new campaign should include recruitment_state at birth');
    assert.strictEqual(
        serializeState(hydrated),
        payload,
        'desktop new-campaign state should already be in canonical save/load form',
    );
}, 120_000);

test('desktop startup path uses the in-memory startup builder instead of harness artifacts by default', async () => {
    const source = await readFile(
        resolve(process.cwd(), 'src', 'scenario', 'scenario_runner.ts'),
        'utf8',
    );
    const createStateStart = source.indexOf('export async function createStateFromScenario(');
    const createStateEnd = source.indexOf('export async function loadScenarioFromPath', createStateStart);
    const createStateBody = source.slice(createStateStart, createStateEnd === -1 ? undefined : createStateEnd);

    assert.ok(createStateStart >= 0, 'createStateFromScenario should exist');
    assert.match(
        createStateBody,
        /const \{ state \} = await buildScenarioStartupState\(scenario, baseDir\);/,
        'desktop initialStateOnly path should use the shared in-memory startup builder',
    );
    assert.match(
        createStateBody,
        /if \(!initialStateOnly\) \{\s*const result = await runScenario\(/s,
        'harness artifact generation should remain the explicit non-default compatibility path',
    );
});
