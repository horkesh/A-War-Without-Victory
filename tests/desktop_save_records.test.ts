import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { readFileSync, readdirSync } from 'node:fs';

import { listSaveRecords, resolveSaveRecordPath, writeFileAtomically } from '../src/desktop/save_records.cjs';

const dirs: string[] = [];

async function fixtureDir(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'awwv-save-records-'));
    dirs.push(dir);
    return dir;
}

afterEach(async () => {
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('desktop save records', () => {
    it('lists valid JSON saves newest-first with a filename tie-break and no paths', async () => {
        const dir = await fixtureDir();
        const older = join(dir, 'autosave.json');
        const newerB = join(dir, 'quicksave.json');
        const newerA = join(dir, 'campaign-01.json');
        await writeFile(older, JSON.stringify({ meta: { turn: 4, player_faction: 'RBiH' } }), 'utf8');
        await writeFile(newerB, JSON.stringify({ meta: { turn: 8, player_faction: 'RS' } }), 'utf8');
        await writeFile(newerA, JSON.stringify({ meta: { turn: 7, player_faction: 'HRHB' } }), 'utf8');
        await writeFile(join(dir, 'notes.txt'), '{}', 'utf8');
        await writeFile(join(dir, 'broken.json'), '{', 'utf8');
        await utimes(older, 1000, 1000);
        await utimes(newerA, 2000, 2000);
        await utimes(newerB, 2000, 2000);

        const records = await listSaveRecords(dir);

        expect(records.map((record) => record.filename)).toEqual(['campaign-01.json', 'quicksave.json', 'autosave.json']);
        expect(records[0]).toEqual({ filename: 'campaign-01.json', turn: 7, faction: 'HRHB', modifiedAtMs: 2_000_000 });
        expect(JSON.stringify(records)).not.toContain(dir);
    });

    it('rejects traversal, nested paths, and non-JSON filenames', async () => {
        const dir = await fixtureDir();

        expect(() => resolveSaveRecordPath(dir, '../autosave.json')).toThrow(/Invalid save record filename/);
        expect(() => resolveSaveRecordPath(dir, 'nested/autosave.json')).toThrow(/Invalid save record filename/);
        expect(() => resolveSaveRecordPath(dir, 'notes.txt')).toThrow(/Invalid save record filename/);
        expect(resolveSaveRecordPath(dir, 'autosave.json')).toBe(join(dir, 'autosave.json'));
    });

    it('writes saves atomically: overwrites in full, leaves no temp file, never offers one', async () => {
        const dir = await fixtureDir();
        const target = join(dir, 'autosave.json');
        const first = JSON.stringify({ meta: { turn: 3, player_faction: 'RBiH' }, pad: 'x'.repeat(2_000_000) });
        const second = JSON.stringify({ meta: { turn: 4, player_faction: 'RBiH' }, pad: 'y'.repeat(3_000_000) });

        writeFileAtomically(target, first);
        expect(readFileSync(target, 'utf8')).toBe(first);
        writeFileAtomically(target, second);
        expect(readFileSync(target, 'utf8')).toBe(second);

        expect(readdirSync(dir)).toEqual(['autosave.json']);
        const records = await listSaveRecords(dir);
        expect(records.map((record) => record.turn)).toEqual([4]);
    });

    it('writes to a sibling temp name and renames it over the target, so the target is never truncated', () => {
        const source = readFileSync(join(__dirname, '../src/desktop/save_records.cjs'), 'utf8');
        const main = readFileSync(join(__dirname, '../src/desktop/electron-main.cjs'), 'utf8');
        expect(source).toMatch(/\.tmp`/);
        expect(source).toMatch(/renameSync\(tempPath, filePath\)/);
        // The save path of the packaged app must use the atomic writer, not an in-place write.
        expect(main).toMatch(/writeFileAtomically\(filePath, currentCanonicalSaveJson\)/);
        expect(main).not.toMatch(/writeFileSync\(filePath, currentCanonicalSaveJson/);
    });
});
