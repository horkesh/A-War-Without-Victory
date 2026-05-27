import assert from 'node:assert';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, test } from 'vitest';
import { loadEventDefinitions, loadEventDefinitionsFromDir } from '../src/sim/events/event_loader.js';
import type { EventDefinition } from '../src/sim/events/event_types.js';

const REQUIRED_EVENT_FILES = [
    'war_1992.json',
    'war_1993.json',
    'war_1994.json',
    'war_1995.json',
    'consequences.json',
] as const;

const REPO_EVENTS_DIR = resolve(__dirname, '..', 'data', 'scenarios', 'events');

const tempDirs: string[] = [];

afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
        rmSync(dir, { recursive: true, force: true });
    }
});

function makeTempEventsDir(): string {
    const dir = mkdtempSync(join(tmpdir(), 'awwv-event-loader-'));
    tempDirs.push(dir);
    return dir;
}

function copyRequiredCatalogFiles(targetDir: string): void {
    mkdirSync(targetDir, { recursive: true });
    for (const filename of REQUIRED_EVENT_FILES) {
        const source = resolve(REPO_EVENTS_DIR, filename);
        assert.ok(existsSync(source), `source catalog file missing: ${filename}`);
        writeFileSync(resolve(targetDir, filename), readFileSync(source, 'utf8'), 'utf8');
    }
}

function minimalEvent(id: string, turnMin: number): EventDefinition {
    return {
        id,
        trigger: { turn_min: turnMin, phase: 'war' },
        effect: { kind: 'narrative', text: `${id} fired.` },
        once: true,
    };
}

function writeMinimalCatalog(targetDir: string): void {
    mkdirSync(targetDir, { recursive: true });
    REQUIRED_EVENT_FILES.forEach((filename, index) => {
        const event = minimalEvent(`event_${index}`, index);
        writeFileSync(resolve(targetDir, filename), JSON.stringify([event], null, 2), 'utf8');
    });
}

test('loadEventDefinitions(0) returns the current 247-row catalog', () => {
    const loaded = loadEventDefinitions(0);

    assert.strictEqual(loaded.length, 247);
});

test('loadEventDefinitions(0) returns deterministic order by trigger turn_min then id', () => {
    const loaded = loadEventDefinitions(0);
    const sortedIds = [...loaded]
        .sort((a, b) => {
            const aMin = a.trigger.turn_min ?? Number.MAX_SAFE_INTEGER;
            const bMin = b.trigger.turn_min ?? Number.MAX_SAFE_INTEGER;
            if (aMin !== bMin) return aMin - bMin;
            return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
        })
        .map((event) => event.id);

    assert.deepStrictEqual(loaded.map((event) => event.id), sortedIds);
});

test('scenarioStartWeek filters events before the scenario start', () => {
    const allEvents = loadEventDefinitions(0);
    const filtered = loadEventDefinitions(52);

    assert.ok(filtered.length < allEvents.length);
    assert.ok(filtered.every((event) => {
        const turnMin = event.trigger.turn_min;
        return turnMin == null || turnMin >= 52;
    }));
    assert.ok(allEvents.some((event) => (event.trigger.turn_min ?? Number.MAX_SAFE_INTEGER) < 52));
});

test('loadEventDefinitionsFromDir throws when a required event file is missing', () => {
    const dir = makeTempEventsDir();
    copyRequiredCatalogFiles(dir);
    rmSync(resolve(dir, 'war_1994.json'));

    assert.throws(
        () => loadEventDefinitionsFromDir(0, dir),
        /Required event file missing: war_1994\.json/,
    );
});

test('loadEventDefinitionsFromDir throws on malformed JSON', () => {
    const dir = makeTempEventsDir();
    copyRequiredCatalogFiles(dir);
    writeFileSync(resolve(dir, 'war_1993.json'), '[{', 'utf8');

    assert.throws(
        () => loadEventDefinitionsFromDir(0, dir),
        /Failed to parse required event file war_1993\.json/,
    );
});

test('loadEventDefinitionsFromDir throws on valid non-array JSON', () => {
    const dir = makeTempEventsDir();
    copyRequiredCatalogFiles(dir);
    writeFileSync(resolve(dir, 'consequences.json'), '{"id":"not_an_array"}', 'utf8');

    assert.throws(
        () => loadEventDefinitionsFromDir(0, dir),
        /Required event file consequences\.json must contain a JSON array/,
    );
});

test('one bad required file does not silently drop while returning partial valid rows', () => {
    const dir = makeTempEventsDir();
    writeMinimalCatalog(dir);
    writeFileSync(resolve(dir, 'war_1995.json'), '{"id":"bad_file"}', 'utf8');

    assert.throws(
        () => loadEventDefinitionsFromDir(0, dir),
        /Required event file war_1995\.json must contain a JSON array/,
    );
});
