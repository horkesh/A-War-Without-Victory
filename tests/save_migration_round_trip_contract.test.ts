import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';
import { createEmptyBrigadeHistory, type TgParticipationRecord } from '../src/state/brigade_history.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';

const fixtureDir = resolve(process.cwd(), 'tests', 'fixtures', 'save_migration');

function loadCurrentStateWithParticipation(
    record: TgParticipationRecord,
): { formationId: string; state: GameState } {
    const raw = JSON.parse(readFileSync(
        resolve(process.cwd(), 'data', 'derived', 'startup', 'apr_1992_initial_save.json'),
        'utf8',
    )) as GameState;
    const formationId = Object.keys(raw.military.formations ?? {}).sort()[0]!;
    const formation = raw.military.formations![formationId]!;
    formation.brigade_history = createEmptyBrigadeHistory(formation.personnel ?? 0);
    formation.brigade_history.tg_participations = [record];
    return { formationId, state: deserializeState(JSON.stringify(raw)) };
}

describe('save migration round-trip fixture contract', () => {
    const fixtureFiles = readdirSync(fixtureDir)
        .filter((name) => /^v\d{2}_.+\.json$/.test(name))
        .sort();

    it('has one fixture for every schema version before the current startup artifact', () => {
        expect(fixtureFiles.map((name) => name.slice(0, 3))).toEqual(
            Array.from({ length: CURRENT_SCHEMA_VERSION - 1 }, (_, index) => `v${String(index + 1).padStart(2, '0')}`),
        );
    });

    it.each(fixtureFiles)('%s migrates and save/loads byte-stably', (fileName) => {
        const payload = readFileSync(resolve(fixtureDir, fileName), 'utf8');

        const migrated = deserializeState(payload);
        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);

        const serialized = serializeState(migrated);
        expect(serializeState(deserializeState(serialized))).toBe(serialized);
    });

    it('current startup artifact is already canonical after migration', () => {
        const payload = readFileSync(
            resolve(process.cwd(), 'data', 'derived', 'startup', 'apr_1992_initial_save.json'),
            'utf8',
        );

        const migrated = deserializeState(payload);
        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);

        const serialized = serializeState(migrated);
        expect(serializeState(deserializeState(serialized))).toBe(serialized);
    });

    it('loads and round-trips an old participation without inventing terminal zeroes', () => {
        const record: TgParticipationRecord = {
            tg_id: 'tg:legacy:op:anchor',
            op_id: 'legacy_op',
            role: 'donor',
            formed_turn: 4,
            personnel_lent: 300,
        };
        const { formationId, state } = loadCurrentStateWithParticipation(record);
        const reloaded = deserializeState(serializeState(state));
        const actual = reloaded.military.formations![formationId]!.brigade_history!.tg_participations![0]!;
        expect(actual).toEqual(record);
        expect(actual.dissolved_turn).toBeUndefined();
        expect(actual.personnel_returned).toBeUndefined();
        expect(actual.casualties).toBeUndefined();
    });

    it('round-trips completed participation telemetry without changing exact values', () => {
        const record: TgParticipationRecord = {
            tg_id: 'tg:terminal:op:anchor',
            op_id: 'terminal_op',
            role: 'donor',
            formed_turn: 4,
            personnel_lent: 300,
            dissolved_turn: 12,
            personnel_returned: 250,
            casualties: 50,
        };
        const { formationId, state } = loadCurrentStateWithParticipation(record);
        const reloaded = deserializeState(serializeState(state));
        expect(
            reloaded.military.formations![formationId]!.brigade_history!.tg_participations![0],
        ).toEqual(record);
    });
});
