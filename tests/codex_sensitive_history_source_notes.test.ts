import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'vitest';

type EventRow = {
    id: string;
    narrative?: string;
    source_note?: string;
};

const EVENT_FILES = [
    'data/scenarios/events/war_1992.json',
    'data/scenarios/events/war_1993.json',
    'data/scenarios/events/war_1995.json',
] as const;

const SOURCE_NOTE_EVENT_IDS = [
    'srebrenica_enclave_forms_1992',
    'morillon_enters_srebrenica_1993',
    'srebrenica_shelling_1993',
    'un_resolution_819_srebrenica_1993',
    'srebrenica_demilitarization_1993',
    'srebrenica_falls_1995',
    'zepa_falls_1995',
] as const;

const REQUIRED_BOUNDARY_PHRASES = [
    'adds no casualty figures',
    'causal claims',
    'prohibited player choices',
    'alternate-outcome prevention framing',
] as const;

function loadRows(): EventRow[] {
    return EVENT_FILES.flatMap((file) => JSON.parse(readFileSync(file, 'utf8')) as EventRow[]);
}

test('sensitive-history Srebrenica/Zepa rows carry provenance-only source notes', () => {
    const rowsById = new Map(loadRows().map((row) => [row.id, row]));

    for (const id of SOURCE_NOTE_EVENT_IDS) {
        const row = rowsById.get(id);
        assert.ok(row, `missing event row ${id}`);
        assert.ok(row.source_note, `missing source_note for ${id}`);
        for (const phrase of REQUIRED_BOUNDARY_PHRASES) {
            assert.ok(
                row.source_note.includes(phrase),
                `source_note for ${id} must preserve boundary phrase: ${phrase}`,
            );
        }
    }
});

test('Srebrenica/Zepa source notes do not introduce forbidden gameplay framing', () => {
    const sourceNotes = loadRows()
        .filter((row) => SOURCE_NOTE_EVENT_IDS.includes(row.id as (typeof SOURCE_NOTE_EVENT_IDS)[number]))
        .map((row) => row.source_note ?? '')
        .join('\n');

    for (const forbidden of ['prevent genocide', 'prevented genocide', 'reward', 'lever']) {
        assert.ok(
            !sourceNotes.toLowerCase().includes(forbidden),
            `source notes must not introduce forbidden sensitive-history framing: ${forbidden}`,
        );
    }
});
