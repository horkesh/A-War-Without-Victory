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

function validCatalogRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        id: 'valid_event',
        trigger: { turn_min: 0, phase: 'war' },
        effect: { kind: 'narrative', text: 'Valid event fired.' },
        once: true,
        ...overrides,
    };
}

function writeCatalogRows(targetDir: string, rows: unknown[]): void {
    mkdirSync(targetDir, { recursive: true });
    for (const filename of REQUIRED_EVENT_FILES) {
        const fileRows = filename === 'war_1992.json' ? rows : [];
        writeFileSync(resolve(targetDir, filename), JSON.stringify(fileRows, null, 2), 'utf8');
    }
}

function assertCatalogRowsThrow(rows: unknown[], expected: RegExp): void {
    const dir = makeTempEventsDir();
    writeCatalogRows(dir, rows);

    assert.throws(
        () => loadEventDefinitionsFromDir(0, dir),
        expected,
    );
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

test('loadEventDefinitionsFromDir throws on non-object row', () => {
    assertCatalogRowsThrow(
        [null],
        /Invalid event row in war_1992\.json\[0\]: row must be a non-null object/,
    );
    assertCatalogRowsThrow(
        [[]],
        /Invalid event row in war_1992\.json\[0\]: row must be a non-null object/,
    );
    assertCatalogRowsThrow(
        [42],
        /Invalid event row in war_1992\.json\[0\]: row must be a non-null object/,
    );
});

test('loadEventDefinitionsFromDir throws on missing or blank id', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({ id: undefined })],
        /Invalid event row in war_1992\.json\[0\]: id must be a non-empty string/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ id: '   ' })],
        /Invalid event row in war_1992\.json\[0\]: id must be a non-empty string/,
    );
});

test('loadEventDefinitionsFromDir throws on missing or non-object trigger', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({ trigger: undefined })],
        /Invalid event row in war_1992\.json\[0\]: trigger must be a non-null object/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ trigger: [] })],
        /Invalid event row in war_1992\.json\[0\]: trigger must be a non-null object/,
    );
});

test('loadEventDefinitionsFromDir throws on non-finite trigger turn bound', () => {
    const dir = makeTempEventsDir();
    writeCatalogRows(dir, []);
    writeFileSync(
        resolve(dir, 'war_1992.json'),
        '[{"id":"bad_turn","trigger":{"turn_min":1e999},"effect":{"kind":"narrative"}}]',
        'utf8',
    );

    assert.throws(
        () => loadEventDefinitionsFromDir(0, dir),
        /Invalid event row in war_1992\.json\[0\]: trigger\.turn_min must be a finite number when present/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ trigger: { turn_min: null } })],
        /Invalid event row in war_1992\.json\[0\]: trigger\.turn_min must be a finite number when present/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ trigger: { turn_max: '12' } })],
        /Invalid event row in war_1992\.json\[0\]: trigger\.turn_max must be a finite number when present/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ trigger: { turn_min: 5, turn_max: 4 } })],
        /Invalid event row in war_1992\.json\[0\]: trigger\.turn_min must be less than or equal to trigger\.turn_max/,
    );
});

test('loadEventDefinitionsFromDir throws on unknown trigger phase', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({ trigger: { turn_min: 0, phase: 'peace' } })],
        /Invalid event row in war_1992\.json\[0\]: trigger\.phase must be "war" when present/,
    );
});

test('loadEventDefinitionsFromDir throws on malformed requires_events', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({ trigger: { turn_min: 0, requires_events: 'event_a' } })],
        /Invalid event row in war_1992\.json\[0\]: trigger\.requires_events must be a string array when present/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ trigger: { turn_min: 0, requires_events: ['event_a', 2] } })],
        /Invalid event row in war_1992\.json\[0\]: trigger\.requires_events must be a string array when present/,
    );
});

test('loadEventDefinitionsFromDir throws on malformed enables_events', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({ enables_events: 'event_a' })],
        /Invalid event row in war_1992\.json\[0\]: enables_events must be a string array when present/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ enables_events: ['event_a', 2] })],
        /Invalid event row in war_1992\.json\[0\]: enables_events must be a string array when present/,
    );
});

test('loadEventDefinitionsFromDir throws on missing or non-object effect', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({ effect: undefined })],
        /Invalid event row in war_1992\.json\[0\]: effect must be a non-null object/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ effect: [] })],
        /Invalid event row in war_1992\.json\[0\]: effect must be a non-null object/,
    );
});

test('loadEventDefinitionsFromDir throws on missing or non-string effect.kind', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({ effect: {} })],
        /Invalid event row in war_1992\.json\[0\]: effect\.kind must be a non-empty string/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ effect: { kind: 7 } })],
        /Invalid event row in war_1992\.json\[0\]: effect\.kind must be a non-empty string/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ effect: { kind: '' } })],
        /Invalid event row in war_1992\.json\[0\]: effect\.kind must be a non-empty string/,
    );
});

test('loadEventDefinitionsFromDir throws on unknown effect kind', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({ effect: { kind: 'new_unregistered_effect' } })],
        /Invalid event row in war_1992\.json\[0\]: effect\.kind must be a known event effect kind: new_unregistered_effect/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ effects: [{ kind: 'new_unregistered_effect' }] })],
        /Invalid event row in war_1992\.json\[0\]: effects\[0\]\.kind must be a known event effect kind: new_unregistered_effect/,
    );
});

test('loadEventDefinitionsFromDir throws on malformed effects', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({ effects: { kind: 'narrative' } })],
        /Invalid event row in war_1992\.json\[0\]: effects must be an array when present/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ effects: [null] })],
        /Invalid event row in war_1992\.json\[0\]: effects\[0\] must be a non-null object/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ effects: [{ kind: '   ' }] })],
        /Invalid event row in war_1992\.json\[0\]: effects\[0\]\.kind must be a non-empty string/,
    );
});

test('loadEventDefinitionsFromDir throws on malformed response_options', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({ response_options: { id: 'accept', label: 'Accept' } })],
        /Invalid event row in war_1992\.json\[0\]: response_options must be an array when present/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ response_options: [null] })],
        /Invalid event row in war_1992\.json\[0\]: response_options\[0\] must be a non-null object/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ response_options: [{ id: '', label: 'Accept' }] })],
        /Invalid event row in war_1992\.json\[0\]: response_options\[0\]\.id must be a non-empty string/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ response_options: [{ id: 'accept', label: ' ' }] })],
        /Invalid event row in war_1992\.json\[0\]: response_options\[0\]\.label must be a non-empty string/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ response_options: [{ id: 'accept', label: 'Accept', effects: 'bad' }] })],
        /Invalid event row in war_1992\.json\[0\]: response_options\[0\]\.effects must be an array when present/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ response_options: [{ id: 'accept', label: 'Accept', effects: [{ kind: '' }] }] })],
        /Invalid event row in war_1992\.json\[0\]: response_options\[0\]\.effects\[0\]\.kind must be a non-empty string/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({
            response_options: [
                { id: 'accept', label: 'Accept' },
                { id: 'accept', label: 'Accept again' },
            ],
        })],
        /Invalid event row in war_1992\.json\[0\]: response_options\[1\]\.id must be unique within response_options: accept/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ response_options: [{ id: 'accept', label: 'Accept', effect: { kind: '' } }] })],
        /Invalid event row in war_1992\.json\[0\]: response_options\[0\]\.effect\.kind must be a non-empty string/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ response_options: [{ id: 'accept', label: 'Accept', effects: [{ kind: 'new_unregistered_effect' }] }] })],
        /Invalid event row in war_1992\.json\[0\]: response_options\[0\]\.effects\[0\]\.kind must be a known event effect kind: new_unregistered_effect/,
    );
});

test('loadEventDefinitionsFromDir throws on unknown condition types', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({ trigger: { turn_min: 0, condition: { type: 'new_condition_type' } } })],
        /Invalid event row in war_1992\.json\[0\]: trigger\.condition\.type must be a known event condition type: new_condition_type/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({
            trigger: {
                turn_min: 0,
                condition: {
                    type: 'and',
                    conditions: [
                        { type: 'flag_equals', flag: 'fixture', value: true },
                        { type: 'new_nested_condition' },
                    ],
                },
            },
        })],
        /Invalid event row in war_1992\.json\[0\]: trigger\.condition\.conditions\[1\]\.type must be a known event condition type: new_nested_condition/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({
            pressure: {
                base_rate: 1,
                threshold: 1,
                decay_rate: 0,
                modifiers: [{ condition: { type: 'new_pressure_condition' }, rate_bonus: 1 }],
            },
        })],
        /Invalid event row in war_1992\.json\[0\]: pressure\.modifiers\[0\]\.condition\.type must be a known event condition type: new_pressure_condition/,
    );
});

test('loadEventDefinitionsFromDir throws on semantic enum and response metadata violations', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({ category: 'unknown_category' })],
        /Invalid event row in war_1992\.json\[0\]: category must be a known event category when present: unknown_category/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ bot_response_logic: 'random_choice' })],
        /Invalid event row in war_1992\.json\[0\]: bot_response_logic must be a known response logic when present: random_choice/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ probability: 2 })],
        /Invalid event row in war_1992\.json\[0\]: probability must be between 0 and 1 when present/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ once: 'yes' })],
        /Invalid event row in war_1992\.json\[0\]: once must be a boolean when present/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ requires_player_response: 'true' })],
        /Invalid event row in war_1992\.json\[0\]: requires_player_response must be a boolean when present/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ responding_faction: 'XYZ' })],
        /Invalid event row in war_1992\.json\[0\]: responding_faction must be a valid event faction: XYZ/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ requires_player_response: true })],
        /Invalid event row in war_1992\.json\[0\]: responding_faction must be a non-empty string for required-response events/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({
            response_options: [{ id: 'accept', label: 'Accept' }],
            historical_default_response_id: 'reject',
        })],
        /Invalid event row in war_1992\.json\[0\]: historical_default_response_id must match a response option id: reject/,
    );
});

test('loadEventDefinitionsFromDir throws on duplicate ids and unknown event references', () => {
    assertCatalogRowsThrow(
        [validCatalogRow(), validCatalogRow()],
        /Duplicate event id\(s\) in required event catalog: valid_event/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ trigger: { turn_min: 0, requires_events: ['missing_event'] } })],
        /Unknown event reference\(s\) in required event catalog: valid_event->missing_event/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ enables_events: ['missing_event'] })],
        /Unknown event reference\(s\) in required event catalog: valid_event->missing_event/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ trigger: { turn_min: 0, condition: { type: 'week_since_event', event_id: 'missing_event' } } })],
        /Unknown event reference\(s\) in required event catalog: valid_event->missing_event/,
    );
});

test('loadEventDefinitionsFromDir accepts a response option without effects', () => {
    const dir = makeTempEventsDir();
    writeCatalogRows(dir, [
        validCatalogRow({
            response_options: [
                { id: 'accept', label: 'Accept' },
            ],
        }),
    ]);

    const loaded = loadEventDefinitionsFromDir(0, dir);

    assert.strictEqual(loaded.length, 1);
    assert.strictEqual(loaded[0]?.id, 'valid_event');
});
