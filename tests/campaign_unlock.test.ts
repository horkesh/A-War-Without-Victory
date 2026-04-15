/**
 * B2 Campaign unlock: getPlayableScenarioIds and persistence (read/write completed IDs).
 */

import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
    getPlayableScenarioIds,
    markScenarioCompleted,
    readCompletedScenarioIds,
    writeCompletedScenarioIds
} from '../src/scenario/campaign_unlock.js';

const TMP_DIR = join(process.cwd(), '.tmp_campaign_unlock');

describe('campaign unlock', () => {
    it('returns all scenarios when no prerequisites exist', () => {
        const all = ['a', 'b', 'c'];
        const completed = new Set<string>();
        const prereqs = new Map<string, string[]>();
        const playable = getPlayableScenarioIds(all, completed, prereqs);
        expect(playable).toEqual(['a', 'b', 'c']);
    });

    it('includes scenarios whose prerequisites are met', () => {
        const all = ['first', 'second'];
        const completed = new Set(['first']);
        const prereqs = new Map([['second', ['first']]]);
        const playable = getPlayableScenarioIds(all, completed, prereqs);
        expect(playable).toEqual(['first', 'second']);
    });

    it('excludes scenarios whose prerequisites are not met', () => {
        const all = ['first', 'second'];
        const completed = new Set<string>();
        const prereqs = new Map([['second', ['first']]]);
        const playable = getPlayableScenarioIds(all, completed, prereqs);
        expect(playable).toEqual(['first']);
    });

    it('sorts playable scenario ids deterministically', () => {
        const all = ['z', 'a', 'm'];
        const completed = new Set(['a']);
        const prereqs = new Map([['z', ['a']], ['m', []]]);
        const playable = getPlayableScenarioIds(all, completed, prereqs);
        expect(playable).toEqual(['a', 'm', 'z']);
    });

    it('requires all multiple prerequisites to be met', () => {
        const all = ['a', 'b', 'c', 'd'];
        const completed = new Set(['a', 'b']);
        const prereqs = new Map([['c', ['a']], ['d', ['a', 'b']]]);
        const playable = getPlayableScenarioIds(all, completed, prereqs);
        expect(playable).toEqual(['a', 'b', 'c', 'd']);
    });

    it('excludes scenarios when one multiple prerequisite is missing', () => {
        const all = ['a', 'b', 'd'];
        const completed = new Set(['a']);
        const prereqs = new Map([['d', ['a', 'b']]]);
        const playable = getPlayableScenarioIds(all, completed, prereqs);
        expect(playable).toEqual(['a', 'b']);
    });

    it('round-trips completed scenario ids through persistence', async () => {
        await mkdir(TMP_DIR, { recursive: true });
        const path = join(TMP_DIR, 'completed_scenario_ids_test.json');
        const ids = new Set(['apr1992_50w_bots', 'first_scenario']);
        await writeCompletedScenarioIds(path, ids);
        const read = await readCompletedScenarioIds(path);
        expect(read.size).toBe(2);
        expect(read.has('apr1992_50w_bots')).toBe(true);
        expect(read.has('first_scenario')).toBe(true);
        await rm(path, { force: true });
    });

    it('returns an empty set when the completed file is missing', async () => {
        const read = await readCompletedScenarioIds(join(TMP_DIR, 'nonexistent_completed_999.json'));
        expect(read.size).toBe(0);
    });

    it('adds a completed scenario id and persists it', async () => {
        await mkdir(TMP_DIR, { recursive: true });
        const path = join(TMP_DIR, 'completed_scenario_ids_mark_test.json');
        await writeCompletedScenarioIds(path, new Set(['existing']));
        await markScenarioCompleted(path, 'new_one');
        const read = await readCompletedScenarioIds(path);
        expect(read.size).toBe(2);
        expect(read.has('existing')).toBe(true);
        expect(read.has('new_one')).toBe(true);
        await rm(path, { force: true });
    });
});
