/**
 * B2 Campaign unlock: getPlayableScenarioIds and persistence (read/write completed IDs).
 */

import assert from 'node:assert';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import {
    getPlayableScenarioIds,
    markScenarioCompleted,
    readCompletedScenarioIds,
    writeCompletedScenarioIds
} from '../src/scenario/campaign_unlock.js';

test('getPlayableScenarioIds: no prerequisites => all playable', () => {
    const all = ['a', 'b', 'c'];
    const completed = new Set<string>();
    const prereqs = new Map<string, string[]>();
    const playable = getPlayableScenarioIds(all, completed, prereqs);
    assert.deepStrictEqual(playable, ['a', 'b', 'c']);
});

test('getPlayableScenarioIds: prerequisites met => included', () => {
    const all = ['first', 'second'];
    const completed = new Set(['first']);
    const prereqs = new Map([['second', ['first']]]);
    const playable = getPlayableScenarioIds(all, completed, prereqs);
    assert.deepStrictEqual(playable, ['first', 'second']);
});

test('getPlayableScenarioIds: prerequisites not met => excluded', () => {
    const all = ['first', 'second'];
    const completed = new Set<string>();
    const prereqs = new Map([['second', ['first']]]);
    const playable = getPlayableScenarioIds(all, completed, prereqs);
    assert.deepStrictEqual(playable, ['first']);
});

test('getPlayableScenarioIds: result is sorted', () => {
    const all = ['z', 'a', 'm'];
    const completed = new Set(['a']);
    const prereqs = new Map([['z', ['a']], ['m', []]]);
    const playable = getPlayableScenarioIds(all, completed, prereqs);
    assert.deepStrictEqual(playable, ['a', 'm', 'z']);
});

test('getPlayableScenarioIds: multiple prerequisites all must be met', () => {
    const all = ['a', 'b', 'c', 'd'];
    const completed = new Set(['a', 'b']);
    const prereqs = new Map([['c', ['a']], ['d', ['a', 'b']]]);
    const playable = getPlayableScenarioIds(all, completed, prereqs);
    assert.deepStrictEqual(playable, ['a', 'b', 'c', 'd']);
});

test('getPlayableScenarioIds: multiple prerequisites one missing => excluded', () => {
    const all = ['a', 'b', 'd'];
    const completed = new Set(['a']);
    const prereqs = new Map([['d', ['a', 'b']]]);
    const playable = getPlayableScenarioIds(all, completed, prereqs);
    assert.deepStrictEqual(playable, ['a', 'b']);
});

test('writeCompletedScenarioIds and readCompletedScenarioIds round-trip', async () => {
    const dir = join(process.cwd(), 'data', 'derived', 'scenario');
    await mkdir(dir, { recursive: true });
    const path = join(dir, 'completed_scenario_ids_test.json');
    const ids = new Set(['apr1992_50w_bots', 'first_scenario']);
    await writeCompletedScenarioIds(path, ids);
    const read = await readCompletedScenarioIds(path);
    assert.strictEqual(read.size, 2);
    assert.ok(read.has('apr1992_50w_bots'));
    assert.ok(read.has('first_scenario'));
    await rm(path, { force: true });
});

test('readCompletedScenarioIds on missing file returns empty set', async () => {
    const read = await readCompletedScenarioIds(join(process.cwd(), 'nonexistent_completed_999.json'));
    assert.strictEqual(read.size, 0);
});

test('markScenarioCompleted adds id and persists', async () => {
    const dir = join(process.cwd(), 'data', 'derived', 'scenario');
    await mkdir(dir, { recursive: true });
    const path = join(dir, 'completed_scenario_ids_mark_test.json');
    await writeCompletedScenarioIds(path, new Set(['existing']));
    await markScenarioCompleted(path, 'new_one');
    const read = await readCompletedScenarioIds(path);
    assert.strictEqual(read.size, 2);
    assert.ok(read.has('existing'));
    assert.ok(read.has('new_one'));
    await rm(path, { force: true });
});
