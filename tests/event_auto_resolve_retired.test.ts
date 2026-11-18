/**
 * `auto_resolve_turns` retired 2026-11-17 (L7 pre-freeze inert-content sweep).
 *
 * The field promised "auto-resolve after N turns if the player does not respond; worst option applied",
 * but nothing in the engine reads it: an unanswered decision stays pending until it is answered (or the
 * observer autonomy level answers it). The eight events that carried it had it removed, no UI showed a
 * countdown or a promise from it, and the loader now rejects the field so it cannot come back.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadEventDefinitionsFromDir } from '../src/sim/events/event_loader.js';

const EVENT_FILES = ['war_1992.json', 'war_1992_hrhb_summer.json', 'war_1993.json', 'war_1994.json', 'war_1995.json', 'consequences.json'] as const;
const REPO_EVENTS_DIR = resolve(__dirname, '..', 'data', 'scenarios', 'events');
const tempDirs: string[] = [];

afterEach(() => {
    for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function copyCatalog(): string {
    const dir = mkdtempSync(join(tmpdir(), 'awwv-auto-resolve-'));
    tempDirs.push(dir);
    mkdirSync(dir, { recursive: true });
    for (const file of EVENT_FILES) writeFileSync(join(dir, file), readFileSync(join(REPO_EVENTS_DIR, file)));
    return dir;
}

describe('auto_resolve_turns is retired', () => {
    it('no shipped event carries the field', () => {
        const carrying = EVENT_FILES.filter((file) => readFileSync(join(REPO_EVENTS_DIR, file)).toString().includes('"auto_resolve_turns"'));
        expect(carrying).toEqual([]);
    });

    it('the loader rejects an event that carries it', () => {
        const dir = copyCatalog();
        const path = join(dir, 'war_1992.json');
        const rows = JSON.parse(readFileSync(path).toString()) as Array<Record<string, unknown>>;
        rows[0]!.auto_resolve_turns = 2;
        writeFileSync(path, JSON.stringify(rows));
        expect(() => loadEventDefinitionsFromDir(0, dir)).toThrow(/auto_resolve_turns is retired/);
    });

    it('the unmodified catalog still loads', () => {
        expect(() => loadEventDefinitionsFromDir(0, copyCatalog())).not.toThrow();
    });
});
