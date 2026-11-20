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

    it('v40 fixture: the v41 migration strips the retired negotiation_capital effects from a pending decision', () => {
        const migrated = deserializeState(readFileSync(resolve(fixtureDir, 'v40_negotiation_capital_pending.json'), 'utf8'));
        const options = migrated.military.pending_event_decisions![0]!.response_options;
        expect(options.map((option) => option.effects)).toEqual([
            [{ kind: 'supply_delta', faction: 'RBiH', delta: 10 }],
            [],
        ]);
        expect(serializeState(migrated)).not.toContain('negotiation_capital');
    });

    it('v41 fixture: the v42 migration renames patron_pressure, applies the E4 SET and DROP lists, and strips the camp shifts', () => {
        const migrated = deserializeState(readFileSync(resolve(fixtureDir, 'v41_patron_pressure_pending.json'), 'utf8'));
        const byEvent = new Map(migrated.military.pending_event_decisions!.map((d) => [d.event_id, d.response_options]));
        expect(byEvent.get('concentration_camps_revealed_1992')!.map((o) => o.effects)).toEqual([
            [{ kind: 'patron_support', faction: 'RS', delta: -10 }],
            [{ kind: 'patron_support', faction: 'RS', delta: -5 }],
            [],
        ]);
        const hrhb = byEvent.get('hrhb_camp_exposure_response_1993')!;
        expect(hrhb.map((o) => o.effects)).toEqual([
            [{ kind: 'patron_support', faction: 'HRHB', delta: -10 }],
            [{ kind: 'patron_support', faction: 'HRHB', delta: -5 }],
            [],
        ]);
        expect(hrhb.flatMap((o) => o.dimension_shifts ?? []).filter((s) => s.dimension === 'patron_confidence')).toEqual([]);
        expect(byEvent.get('un_hostage_crisis_1995')!.map((o) => o.effects)).toEqual([
            [{ kind: 'patron_support', faction: 'RS', delta: -10 }, { kind: 'morale_change', faction: 'RS', delta: 2 }],
            [],
        ]);
        expect(byEvent.get('rs_autonomy_path_decision_1993')!.map((o) => o.effects)).toEqual([
            [{ kind: 'patron_support', faction: 'RS', delta: -5 }],
            [{ kind: 'patron_support', faction: 'RS', delta: 15 }],
        ]);
        expect(serializeState(migrated)).not.toContain('"patron_pressure"');
    });

    it('v43 fixture: the v44 migration gives pending defiance answers their patron_supply_cut and drops pre-panel receipts', () => {
        const migrated = deserializeState(readFileSync(resolve(fixtureDir, 'v43_patron_defiance_pending.json'), 'utf8'));
        const byEvent = new Map(migrated.military.pending_event_decisions!.map((d) => [d.event_id, d.response_options]));
        expect(byEvent.get('zagreb_orders_hrhb_ceasefire')!.map((o) => o.effects)).toEqual([
            [],
            [{ kind: 'patron_supply_cut', faction: 'HRHB', multiplier: 0.85, duration_turns: 52, tag: 'zagreb_orders_hrhb_ceasefire#resist_patron' }],
        ]);
        expect(byEvent.get('hrhb_political_goal')![1]!.effects).toEqual([
            { kind: 'alliance_change', delta: 0.15 },
            { kind: 'patron_supply_cut', faction: 'HRHB', multiplier: 0.85, duration_turns: 52, tag: 'hrhb_political_goal#united_front' },
        ]);
        expect(byEvent.get('belgrade_embargo_rs_1994')![1]!.effects).toEqual([
            { kind: 'patron_support', faction: 'RS', delta: -10 },
            { kind: 'patron_supply_cut', faction: 'RS', multiplier: 0.93, duration_turns: 26, tag: 'belgrade_embargo_rs_1994#defiant' },
        ]);
        expect(migrated.military.patron_defiance_supply_cuts).toBeUndefined();
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
