/**
 * Regression guard for the 2026-08-26 campaign-start blocker.
 *
 * The `start-new-campaign` IPC handler validated `decisionMode` with no allowance for
 * absence, while the function it guards (`desktop_sim.startNewCampaign`) declares
 * `decisionMode: 'emergent' | 'historical' = 'emergent'`. The handler was therefore
 * stricter than its own callee, and the warroom side picker — which has no mode UI,
 * omits the field, and is what Electron's main window actually loads — could not start
 * a campaign at all. Every New Campaign click showed the player
 * "Invalid decisionMode. Use emergent or historical."
 *
 * Found by tools/playtest/run_electron.ts. No headless test could see it: the headless
 * path calls desktop_sim directly and never crosses the IPC validation layer.
 *
 * electron-main.cjs is main-process CommonJS and cannot be imported here, so this
 * asserts on its source — the same approach desktop_campaign_start_contract.test.ts
 * uses for the same file.
 */
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'vitest';

async function electronMainSource(): Promise<string> {
    return readFile(join(process.cwd(), 'src', 'desktop', 'electron-main.cjs'), 'utf8');
}

test('start-new-campaign accepts a payload that omits decisionMode', async () => {
    const source = await electronMainSource();

    const guard = source.match(/if \(decisionMode !== [^)]*\) \{/);
    assert.ok(guard, 'decisionMode validation guard not found in electron-main.cjs');

    assert.match(
        guard[0],
        /decisionMode !== undefined/,
        'The decisionMode guard must tolerate undefined. Without it the warroom side '
            + 'picker (no mode UI, omits the field) cannot start a campaign — the exact '
            + 'blocker this test exists to prevent.',
    );
});

test('start-new-campaign still rejects an unknown decisionMode', async () => {
    const source = await electronMainSource();

    assert.match(source, /decisionMode !== 'emergent'/);
    assert.match(source, /decisionMode !== 'historical'/);
    assert.match(source, /Invalid decisionMode\. Use emergent or historical\./);
});

test('decisionMode validation is no stricter than the sim default it guards', async () => {
    // If desktop_sim ever drops its default, omitting the field would silently pass
    // undefined into the sim instead of resolving to 'emergent'. The two must move together.
    const sim = await readFile(join(process.cwd(), 'src', 'desktop', 'desktop_sim.ts'), 'utf8');
    assert.match(
        sim,
        /decisionMode: 'emergent' \| 'historical' = 'emergent'/,
        "desktop_sim.startNewCampaign must keep its 'emergent' default; the IPC handler "
            + 'relies on it when a caller omits decisionMode.',
    );
});
