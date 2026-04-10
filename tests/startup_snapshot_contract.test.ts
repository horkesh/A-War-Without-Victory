import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import { startNewCampaign } from '../src/desktop/desktop_sim.js';
import {
    buildStartupSnapshotPayload,
    loadStartupSnapshotPayload,
    loadStartupSnapshotState,
    validateStartupSnapshot,
} from '../src/scenario/startup_snapshot.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';

test('baked April 1992 startup artifact matches canonical builder truth after checkout normalization', { timeout: 120_000 }, async () => {
    const baseDir = process.cwd();
    const [artifactPayload, builderPayload] = await Promise.all([
        loadStartupSnapshotPayload(baseDir, 'apr_1992'),
        buildStartupSnapshotPayload(baseDir, 'apr_1992'),
    ]);

    assert.strictEqual(
        artifactPayload,
        builderPayload,
        'baked startup artifact should remain a one-way derived copy of canonical builder truth',
    );
});

test('baked April 1992 startup artifact stays in canonical loaded-save form', async () => {
    const state = await loadStartupSnapshotState(process.cwd(), 'apr_1992');
    const payload = serializeState(state);

    assert.strictEqual(
        serializeState(deserializeState(payload)),
        payload,
        'baked startup artifact should already be in canonical save/load form',
    );
});

test('desktop new campaign consumes the baked April 1992 startup artifact path', async () => {
    const source = await readFile(
        resolve(process.cwd(), 'src', 'desktop', 'desktop_sim.ts'),
        'utf8',
    );
    const startCampaignStart = source.indexOf('export async function startNewCampaign(');
    const startCampaignEnd = source.indexOf('export async function loadStateFromPath', startCampaignStart);
    const startCampaignBody = source.slice(startCampaignStart, startCampaignEnd === -1 ? undefined : startCampaignEnd);

    assert.ok(startCampaignStart >= 0, 'startNewCampaign should exist');
    assert.match(
        startCampaignBody,
        /const state = key === 'apr_1992'\s*\? await loadStartupSnapshotState\(baseDir, key\)\s*:\s*await createStateFromScenario\(scenarioPath, baseDir\);/s,
        'desktop apr_1992 startup should consume the baked startup artifact while non-baked scenarios keep the builder path',
    );
});

test('desktop new campaign overlays remain canonical after loading the baked artifact', { timeout: 120_000 }, async () => {
    const baseDir = process.cwd();
    const bakedState = await loadStartupSnapshotState(baseDir, 'apr_1992');
    const { state } = await startNewCampaign(baseDir, 'RBiH', 'apr_1992');

    assert.strictEqual(bakedState.meta.player_faction, undefined);
    assert.strictEqual(state.meta.player_faction, 'RBiH');
    assert.ok(state.military.recruitment_state, 'desktop new campaign should still inject recruitment_state over the baked artifact');
    assert.strictEqual(
        serializeState(deserializeState(serializeState(state))),
        serializeState(state),
        'desktop overlays over the baked artifact should remain canonical after save/load',
    );
});

test('startup snapshot validator reports the committed artifact as current', { timeout: 120_000 }, async () => {
    const result = await validateStartupSnapshot(process.cwd(), 'apr_1992');
    assert.strictEqual(result.matches, true);
});
