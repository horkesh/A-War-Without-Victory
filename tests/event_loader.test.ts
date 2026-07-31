import assert from 'node:assert';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, test } from 'vitest';
import { loadEventDefinitions, loadEventDefinitionsFromDir } from '../src/sim/events/event_loader.js';
import type { EventDefinition } from '../src/sim/events/event_types.js';

const REQUIRED_EVENT_FILES = [
    'war_1992.json',
    'war_1992_hrhb_summer.json',
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

test('loadEventDefinitions(0) returns the current 299-row catalog', () => {
    const loaded = loadEventDefinitions(0);

    // 289 → 293: +4 LANE-OBSERVER-FLAG-WRITER deadline "audit" events in
    // consequences.json (csq_winter_held_audit, csq_corridor_blocked_audit,
    // csq_arms_embargo_compliance_audit, csq_political_unity_audit).
    // 293 → 294: +1 §6 atrocity-record event bijeljina_killings_1992 (war_1992.json).
    // 294 → 297: +3 HRHB Jul–Sep 1992 decision events (war_1992_hrhb_summer.json):
    //   hrhb_herceg_bosna_consolidation_1992, hrhb_summer_alliance_strain_1992,
    //   hrhb_zagreb_supply_channel_1992. Calibration-inert (historical-default
    //   path carries only narrative / cost_ledger_annotation / read-model flags).
    // 297 → 299: +2 sourced HRHB October/November 1992 decision events:
    //   hrhb_posavina_orasje_posture_1992, hrhb_jajce_withdrawal_posture_1992.
    assert.strictEqual(loaded.length, 299);
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
    assertCatalogRowsThrow(
        [validCatalogRow({ response_options: [{ id: 'accept', label: 'Accept', future_consequences: {} }] })],
        /Invalid event row in war_1992\.json\[0\]: response_options\[0\]\.future_consequences must be an array when present/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({ response_options: [{ id: 'accept', label: 'Accept', future_consequences: [null] }] })],
        /Invalid event row in war_1992\.json\[0\]: response_options\[0\]\.future_consequences\[0\] must be a non-null object/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({
            response_options: [{
                id: 'accept',
                label: 'Accept',
                future_consequences: [{
                    id: 'branch',
                    label: 'Branch',
                    timing: 'soon',
                    certainty: 'guaranteed',
                    explanation: 'Shows later branch visibility.',
                }],
            }],
        })],
        /Invalid event row in war_1992\.json\[0\]: response_options\[0\]\.future_consequences\[0\]\.timing must be one of immediate, next_turn, future, endgame/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({
            response_options: [{
                id: 'accept',
                label: 'Accept',
                future_consequences: [{
                    id: 'branch',
                    label: 'Branch',
                    timing: 'future',
                    certainty: 'maybe',
                    explanation: 'Shows later branch visibility.',
                }],
            }],
        })],
        /Invalid event row in war_1992\.json\[0\]: response_options\[0\]\.future_consequences\[0\]\.certainty must be one of guaranteed, conditional, risk/,
    );
    assertCatalogRowsThrow(
        [validCatalogRow({
            response_options: [{
                id: 'accept',
                label: 'Accept',
                future_consequences: [{
                    id: 'branch',
                    label: 'Branch',
                    timing: 'future',
                    certainty: 'conditional',
                    opens_events: ['known_event', 7],
                    explanation: 'Shows later branch visibility.',
                }],
            }],
        })],
        /Invalid event row in war_1992\.json\[0\]: response_options\[0\]\.future_consequences\[0\]\.opens_events must be a string array when present/,
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
    assertCatalogRowsThrow(
        [validCatalogRow({
            response_options: [{ id: 'accept', label: 'Accept' }],
            staff_recommended_response_id: 'brief_staff',
        })],
        /Invalid event row in war_1992\.json\[0\]: staff_recommended_response_id must match a response option id: brief_staff/,
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
    assertCatalogRowsThrow(
        [validCatalogRow({
            response_options: [{
                id: 'accept',
                label: 'Accept',
                future_consequences: [{
                    id: 'branch',
                    label: 'Branch',
                    timing: 'future',
                    certainty: 'conditional',
                    opens_events: ['missing_event'],
                    explanation: 'Shows later branch visibility.',
                }],
            }],
        })],
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

// ════════════════════════════════════════════════════════════════════════════
// Event-illustration pipeline — optional `image` key (EventModal wiring).
// UI/data-only, calibration-INERT: the field is purely presentational and no
// shipped event carries it (asserted below), so loading is byte-identical today.
// ════════════════════════════════════════════════════════════════════════════

test('loadEventDefinitionsFromDir accepts and preserves an optional image key', () => {
    const dir = makeTempEventsDir();
    writeCatalogRows(dir, [
        validCatalogRow({ image: 'jna_withdrawal_1992.webp' }),
    ]);

    const loaded = loadEventDefinitionsFromDir(0, dir);

    assert.strictEqual(loaded.length, 1);
    assert.strictEqual(loaded[0]?.id, 'valid_event');
    assert.strictEqual(loaded[0]?.image, 'jna_withdrawal_1992.webp');
});

test('loadEventDefinitionsFromDir throws on an empty image key', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({ image: '' })],
        /image must be a non-empty string when present/,
    );
});

test('shipped events that carry an image key reference a valid .webp basename', () => {
    // Event-illustration wiring is now LIVE: named historical, faction
    // mobilization/supply, and (gated) §6 atrocity stills are wired to their
    // events via an `image` key (2026-06-10). This guard formerly asserted the
    // pipeline was inert (no event carried an image); it now validates that
    // every authored image is a non-empty `.webp` basename the UI resolver
    // (`resolveEventIllustration`) can match. The field is UI-display-only and
    // never persisted (see CALIBRATION GUARD at evaluate_events.ts).
    const loaded = loadEventDefinitions(0);
    const withImage = loaded.filter((event) => event.image != null);
    assert.ok(withImage.length > 0, 'expected at least one wired event image (pipeline is live)');
    for (const event of withImage) {
        assert.ok(
            typeof event.image === 'string' && /^[\w./-]+\.webp$/.test(event.image),
            `event ${event.id} has an invalid image key: ${JSON.stringify(event.image)}`,
        );
    }
});

// ════════════════════════════════════════════════════════════════════════════
// Phase D Packet 44 — vocabulary validation tests for dimension_shifts &
// effect.kind / effects[].kind. Pass A and Pass B are catalog-level static
// defenses against DEAD-write authoring errors (e.g., naming an EffectKind
// where a DimensionId is expected).
// ════════════════════════════════════════════════════════════════════════════

test('Packet 44 Pass A: loadEventDefinitionsFromDir throws on unknown DimensionId in event-level dimension_shifts', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({
            dimension_shifts: [
                { faction: 'RBiH', dimension: 'patron_pressure', delta: -5 },
            ],
        })],
        /Unknown DimensionId in dimension_shifts in required event catalog/,
    );
});

test('Packet 44 Pass A: loadEventDefinitionsFromDir throws on unknown DimensionId in response-option dimension_shifts', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({
            response_options: [{
                id: 'accept',
                label: 'Accept',
                dimension_shifts: [
                    { faction: 'RBiH', dimension: 'alliance_change', delta: -10 },
                ],
            }],
        })],
        /valid_event#accept\[0\]:alliance_change/,
    );
});

test('Packet 44 Pass A: error message lists known DimensionIds and suggests effects[].kind alternative', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({
            response_options: [{
                id: 'accept',
                label: 'Accept',
                dimension_shifts: [
                    { faction: 'RBiH', dimension: 'enclave_resilience', delta: -10 },
                ],
            }],
        })],
        /must be one of \[internal_cohesion, international_standing, military_credibility, negotiating_leverage, patron_confidence, territorial_legitimacy\]\. If you intended an EffectKind, author via effects\[\]\.kind instead/,
    );
});

test('Packet 44 Pass A: multiple violations are reported in deterministic sorted order', () => {
    const dir = makeTempEventsDir();
    writeCatalogRows(dir, [
        validCatalogRow({
            id: 'zeta_row',
            response_options: [{
                id: 'opt_z',
                label: 'Z',
                dimension_shifts: [
                    { faction: 'RBiH', dimension: 'patron_pressure', delta: 1 },
                ],
            }],
        }),
        validCatalogRow({
            id: 'alpha_row',
            response_options: [{
                id: 'opt_a',
                label: 'A',
                dimension_shifts: [
                    { faction: 'RBiH', dimension: 'alliance_change', delta: 1 },
                ],
            }],
        }),
    ]);

    let captured: Error | undefined;
    try {
        loadEventDefinitionsFromDir(0, dir);
    } catch (err) {
        captured = err as Error;
    }
    assert.ok(captured, 'expected catalog load to throw');
    const message = captured!.message;
    // Both entries must appear, sorted (alpha_row before zeta_row).
    const alphaIdx = message.indexOf('alpha_row#opt_a[0]:alliance_change');
    const zetaIdx = message.indexOf('zeta_row#opt_z[0]:patron_pressure');
    assert.ok(alphaIdx >= 0, `alpha_row entry missing in error: ${message}`);
    assert.ok(zetaIdx >= 0, `zeta_row entry missing in error: ${message}`);
    assert.ok(alphaIdx < zetaIdx, `entries not sorted (alpha=${alphaIdx}, zeta=${zetaIdx}): ${message}`);
});

test('Packet 44 Pass A: known DimensionIds pass without throwing', () => {
    const dir = makeTempEventsDir();
    writeCatalogRows(dir, [
        validCatalogRow({
            id: 'valid_event',
            response_options: [{
                id: 'accept',
                label: 'Accept',
                dimension_shifts: [
                    { faction: 'RBiH', dimension: 'military_credibility', delta: -5 },
                    { faction: 'RBiH', dimension: 'territorial_legitimacy', delta: 3 },
                    { faction: 'RS', dimension: 'international_standing', delta: -8 },
                    { faction: 'HRHB', dimension: 'patron_confidence', delta: 2 },
                    { faction: 'RBiH', dimension: 'internal_cohesion', delta: -1 },
                    { faction: 'RS', dimension: 'negotiating_leverage', delta: 4 },
                ],
            }],
        }),
    ]);

    const loaded = loadEventDefinitionsFromDir(0, dir);
    assert.strictEqual(loaded.length, 1);
    assert.strictEqual(loaded[0]?.id, 'valid_event');
});

test('Packet 44 Pass B: loadEventDefinitionsFromDir throws on unknown EffectKind in response-option effects[]', () => {
    // Pass B is layered on top of validateKindedArray (structural); the
    // catalog-level pass throws a row-level structural error first. Either
    // path must reject the unknown kind.
    assertCatalogRowsThrow(
        [validCatalogRow({
            response_options: [{
                id: 'accept',
                label: 'Accept',
                effects: [{ kind: 'imaginary_kind' }],
            }],
        })],
        /imaginary_kind/,
    );
});

test('Packet 44 Pass B: loadEventDefinitionsFromDir throws on unknown EffectKind in top-level effect', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({
            effect: { kind: 'made_up_kind', text: 'x' },
        })],
        /made_up_kind/,
    );
});

test('Packet 44 Pass A: empty/missing dimension_shifts is permitted', () => {
    const dir = makeTempEventsDir();
    writeCatalogRows(dir, [
        validCatalogRow({ id: 'no_shifts_event' }),
        validCatalogRow({
            id: 'empty_shifts_event',
            trigger: { turn_min: 1, phase: 'war' },
            dimension_shifts: [],
            response_options: [{
                id: 'accept',
                label: 'Accept',
                dimension_shifts: [],
            }],
        }),
    ]);

    const loaded = loadEventDefinitionsFromDir(0, dir);
    assert.strictEqual(loaded.length, 2);
});

test('loadEventDefinitionsFromDir accepts valid response option future_consequences metadata without gating runtime behavior', () => {
    const dir = makeTempEventsDir();
    writeCatalogRows(dir, [
        validCatalogRow({
            id: 'valid_event',
            response_options: [{
                id: 'accept',
                label: 'Accept',
                future_consequences: [{
                    id: 'accept_branch',
                    label: 'Later branch',
                    timing: 'next_turn',
                    certainty: 'conditional',
                    opens_events: ['followup_event'],
                    closes_events: ['valid_event'],
                    opens_flags: ['accepted_branch'],
                    closes_flags: ['rejected_branch'],
                    material_effect_refs: ['supply_delta.RBiH'],
                    explanation: 'Accepting makes the later branch visible.',
                }],
            }],
        }),
        validCatalogRow({ id: 'followup_event', trigger: { turn_min: 1, phase: 'war' } }),
    ]);

    const loaded = loadEventDefinitionsFromDir(0, dir);

    assert.strictEqual(loaded.length, 2);
    assert.deepStrictEqual(loaded.find((event) => event.id === 'valid_event')?.response_options?.[0]?.future_consequences, [{
        id: 'accept_branch',
        label: 'Later branch',
        timing: 'next_turn',
        certainty: 'conditional',
        opens_events: ['followup_event'],
        closes_events: ['valid_event'],
        opens_flags: ['accepted_branch'],
        closes_flags: ['rejected_branch'],
        material_effect_refs: ['supply_delta.RBiH'],
        explanation: 'Accepting makes the later branch visible.',
    }]);
});
