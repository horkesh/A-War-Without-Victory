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

    it('round-trips absent and present TG exhaustion/AHQ recovery markers without a schema bump', () => {
        const raw = JSON.parse(readFileSync(
            resolve(process.cwd(), 'data', 'derived', 'startup', 'apr_1992_initial_save.json'),
            'utf8',
        )) as GameState;
        const oldShape = structuredClone(raw);
        expect(serializeState(deserializeState(JSON.stringify(oldShape)))).not.toContain('last_exhaustion_tick_turn');
        expect(serializeState(deserializeState(JSON.stringify(oldShape)))).not.toContain('recovery_started_turn');

        const formationId = Object.keys(raw.military.formations ?? {}).sort()[0]!;
        const formation = raw.military.formations![formationId]!;
        formation.corps_id ??= formationId;
        formation.location_osid ??= 'op:test:marker';
        raw.military.tactical_groups = {
            'tg:marker:op:anchor': {
                id: 'tg:marker:op:anchor',
                corps_id: formation.corps_id,
                op_id: 'Marker Op',
                anchor_brigade_id: formationId,
                donor_contributions: [],
                location_osid: formation.location_osid,
                status: 'engaged',
                formed_on_turn: 4,
                cohesion: 88,
                last_exhaustion_tick_turn: 9,
            },
        };
        raw.military.army_hq_operations = {
            'ahq:RBiH:marker': {
                id: 'ahq:RBiH:marker',
                faction_id: 'RBiH',
                name: 'Marker Op',
                anchor_corps_id: formation.corps_id,
                donor_corps_ids: [],
                status: 'completed',
                formed_on_turn: 4,
                scenario_year: 0,
                recovery_started_turn: 9,
            },
        };

        const serialized = serializeState(deserializeState(JSON.stringify(raw)));
        const reloaded = deserializeState(serialized);
        expect(reloaded.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(reloaded.military.tactical_groups?.['tg:marker:op:anchor']?.last_exhaustion_tick_turn).toBe(9);
        expect(reloaded.military.army_hq_operations?.['ahq:RBiH:marker']?.recovery_started_turn).toBe(9);
        expect(serializeState(reloaded)).toBe(serialized);
    });
});
