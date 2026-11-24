/**
 * C3 (RB8): a brigade spawned past its municipality's OOB list gets a corps at spawn.
 *
 * Before this fix a pool that crossed batch size beyond the OOB entries for (faction, mun)
 * produced a brigade with no corps_id, and nothing adopted it later. Brigades attack only
 * through CorpsOperation, so such a brigade could never attack.
 *
 * Ruling (formation-expert + corps-army-commander, 2026-11-24): the fallback runs only when an
 * OOB lookup is present and returns null. Order: (1) the faction sector whose territory holds
 * the spawn OSID; (2) the majority corps of the faction's brigades in the municipality;
 * (3) the faction sector with the most territory in the municipality; (4) none: corps_id unset
 * and the formation listed in report.unassigned_corps. Ties: strictCompare on corps_id.
 * Candidates are active corps formations of the same faction, never staff (exempt) ids.
 */

import assert from 'node:assert';
import { createRequire } from 'node:module';
import { test } from 'vitest';
import { spawnFormationsFromPools } from '../src/sim/formation_spawn.js';
import type { FormationState, GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { militiaPoolKey } from '../src/state/militia_pool_key.js';

const require = createRequire(import.meta.url);
const { collectCorpslessBrigadeIssues } = require('../tools/validate_run_consistency.cjs') as {
    collectCorpslessBrigadeIssues: (state: any) => string[];
};

const MUN = 'travnik';
const SPAWN_OSID = 'op:travnik:a_spawn';

function baseState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 150, seed: 'c3-fixture', phase: 'war' },
        factions: [
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: false, declaration_turn: null },
            { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: false, declaration_turn: null },
        ],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            formation_spawn_directive: { kind: 'brigade' },
        } as any,
        political: {
            political_controllers: { [SPAWN_OSID]: 'HRHB', 'op:travnik:b_other': 'HRHB' },
            municipalities: { [MUN]: { control: 'consolidated' } },
        } as any,
        displacement: {} as any,
    };
}

function addCorps(state: GameState, id: string, faction: string, status: 'active' | 'inactive' = 'active', kind: FormationState['kind'] = 'corps_asset'): void {
    state.military.formations![id] = { id, faction, name: id, created_turn: 0, status, assignment: null, kind } as FormationState;
}

function addBrigade(state: GameState, id: string, faction: string, corpsId: string, mun = MUN): void {
    state.military.formations![id] = {
        id, faction, name: id, created_turn: 0, status: 'active', assignment: null, kind: 'brigade',
        corps_id: corpsId, tags: [`mun:${mun}`], personnel: 1000, location_osid: `op:${mun}:b_other`,
    } as FormationState;
}

function addSector(state: GameState, corpsId: string, faction: string, territory: string[], n = 0): void {
    const sectors = (state.military.corps_front_sectors ??= {} as any) as Record<string, any>;
    const sectorId = `sector:${corpsId}:${n}`;
    sectors[sectorId] = {
        sector_id: sectorId, corps_id: corpsId, faction, opposing_factions: [], edge_ids: [], sub_segments: [],
        length_edges: 0, territory_osids: territory, assigned_brigade_ids: [], reserve_brigade_ids: [],
    };
}

function addPool(state: GameState, available: number): void {
    state.military.militia_pools![militiaPoolKey(MUN, 'HRHB')] = {
        mun_id: MUN, faction: 'HRHB', available, committed: 0, exhausted: 0, updated_turn: 150,
    };
}

/** The OOB lookup exists and covers no ordinal here: every spawn is past the OOB list. */
const pastOobLookup = () => null;

/** `'none'` = a caller with no OOB lookup at all (undefined would trigger the default). */
function spawn(state: GameState, lookup: ((f: string, m: string, o: number) => string | null) | 'none' = pastOobLookup) {
    const historicalCorpsLookup = lookup === 'none' ? undefined : lookup;
    return spawnFormationsFromPools(state, {
        batchSize: null, factionFilter: null, munFilter: null, maxPerMun: 1, customTags: [], applyChanges: true,
        formationKind: 'brigade',
        municipalityHqSettlement: { [MUN]: 'hq:travnik' },
        canonicalToOperational: { 'hq:travnik': SPAWN_OSID },
        historicalCorpsLookup,
    });
}

function spawned(state: GameState, report: ReturnType<typeof spawn>): FormationState {
    assert.strictEqual(report.formations_created, 1, 'one brigade spawns');
    const id = report.created[0]!.formation_id;
    return state.military.formations![id] as FormationState;
}

test('C3 step 1: a brigade past the OOB list takes the corps whose sector territory holds its spawn OSID', () => {
    const state = baseState();
    addCorps(state, 'hvo_central_bosnia', 'HRHB');
    addCorps(state, 'hvo_tomislavgrad', 'HRHB');
    addSector(state, 'hvo_central_bosnia', 'HRHB', [SPAWN_OSID]);
    addSector(state, 'hvo_tomislavgrad', 'HRHB', ['op:travnik:b_other', 'op:travnik:c', 'op:travnik:d']);
    addBrigade(state, 'hrhb_sibling', 'HRHB', 'hvo_tomislavgrad');
    addPool(state, 3000);
    const f = spawned(state, spawn(state));
    assert.strictEqual(f.corps_id, 'hvo_central_bosnia');
});

test('C3 step 1 tie-break: two sectors hold the spawn OSID -> strictCompare on corps_id', () => {
    const state = baseState();
    addCorps(state, 'hvo_zz_corps', 'HRHB');
    addCorps(state, 'hvo_aa_corps', 'HRHB');
    addSector(state, 'hvo_zz_corps', 'HRHB', [SPAWN_OSID]);
    addSector(state, 'hvo_aa_corps', 'HRHB', [SPAWN_OSID]);
    addPool(state, 3000);
    assert.strictEqual(spawned(state, spawn(state)).corps_id, 'hvo_aa_corps');
});

test('C3 step 1 skips another faction, an inactive corps and a staff (exempt) corps', () => {
    const state = baseState();
    addCorps(state, 'arbih_3rd_corps', 'RBiH');
    addCorps(state, 'hvo_dead_corps', 'HRHB', 'inactive');
    addCorps(state, 'hvo_main_staff', 'HRHB', 'active', 'army_hq');
    addCorps(state, 'hvo_tomislavgrad', 'HRHB');
    addSector(state, 'arbih_3rd_corps', 'RBiH', [SPAWN_OSID]);
    addSector(state, 'hvo_dead_corps', 'HRHB', [SPAWN_OSID]);
    addSector(state, 'hvo_main_staff', 'HRHB', [SPAWN_OSID]);
    addBrigade(state, 'hrhb_sibling', 'HRHB', 'hvo_tomislavgrad');
    addPool(state, 3000);
    assert.strictEqual(spawned(state, spawn(state)).corps_id, 'hvo_tomislavgrad');
});

test('C3 step 2: no sector holds the OSID -> the corps of the faction brigades in the municipality (not faction-wide)', () => {
    // Travnik allows two brigades per faction, so one sibling leaves room for the spawn.
    const state = baseState();
    addCorps(state, 'hvo_central_bosnia', 'HRHB');
    addCorps(state, 'hvo_tomislavgrad', 'HRHB');
    addBrigade(state, 'hrhb_b1', 'HRHB', 'hvo_tomislavgrad');
    addBrigade(state, 'hrhb_far', 'HRHB', 'hvo_central_bosnia', 'mostar');
    addBrigade(state, 'hrhb_far2', 'HRHB', 'hvo_central_bosnia', 'mostar');
    addPool(state, 3000);
    assert.strictEqual(spawned(state, spawn(state)).corps_id, 'hvo_tomislavgrad');
});

test('C3 step 3: no sector holds the OSID and no sibling -> the faction sector with most territory in the municipality', () => {
    const state = baseState();
    addCorps(state, 'hvo_central_bosnia', 'HRHB');
    addCorps(state, 'hvo_tomislavgrad', 'HRHB');
    addSector(state, 'hvo_central_bosnia', 'HRHB', ['op:travnik:b_other', 'op:vitez:x', 'op:vitez:y', 'op:vitez:z']);
    addSector(state, 'hvo_tomislavgrad', 'HRHB', ['op:travnik:b_other', 'op:travnik:c']);
    addPool(state, 3000);
    assert.strictEqual(spawned(state, spawn(state)).corps_id, 'hvo_tomislavgrad');
});

test('C3 step 4: a pocket with no own sector or sibling stays unassigned and is reported', () => {
    const state = baseState();
    addCorps(state, 'hvo_tomislavgrad', 'HRHB');
    addSector(state, 'hvo_tomislavgrad', 'HRHB', ['op:mostar:far']);
    addPool(state, 3000);
    const report = spawn(state);
    const f = spawned(state, report);
    assert.strictEqual(f.corps_id, undefined);
    assert.deepStrictEqual(report.unassigned_corps, [f.id]);
});

test('C3 guard: no OOB lookup at all -> behaviour unchanged (no corps, no report field)', () => {
    const state = baseState();
    addCorps(state, 'hvo_central_bosnia', 'HRHB');
    addSector(state, 'hvo_central_bosnia', 'HRHB', [SPAWN_OSID]);
    addPool(state, 3000);
    const report = spawn(state, 'none');
    assert.strictEqual(spawned(state, report).corps_id, undefined);
    assert.strictEqual(report.unassigned_corps, undefined);
});

test('C3 guard: an OOB ordinal keeps its OOB corps even where a sector of another corps holds the OSID', () => {
    const state = baseState();
    addCorps(state, 'hvo_central_bosnia', 'HRHB');
    addCorps(state, 'hvo_tomislavgrad', 'HRHB');
    addSector(state, 'hvo_central_bosnia', 'HRHB', [SPAWN_OSID]);
    addPool(state, 3000);
    const report = spawn(state, (_f, _m, ordinal) => (ordinal === 1 ? 'hvo_tomislavgrad' : null));
    assert.strictEqual(spawned(state, report).corps_id, 'hvo_tomislavgrad');
    assert.strictEqual(report.unassigned_corps, undefined);
});

test('C3 tripwire: the run-consistency validator lists active brigades with no corps (and only those)', () => {
    const state = baseState();
    addCorps(state, 'hvo_tomislavgrad', 'HRHB');
    addBrigade(state, 'hrhb_ok', 'HRHB', 'hvo_tomislavgrad');
    state.military.formations!['hrhb_b_none'] = { id: 'hrhb_b_none', faction: 'HRHB', name: 'x', created_turn: 0, status: 'active', assignment: null, kind: 'brigade' } as FormationState;
    state.military.formations!['hrhb_a_none'] = { id: 'hrhb_a_none', faction: 'HRHB', name: 'x', created_turn: 0, status: 'active', assignment: null, kind: 'brigade' } as FormationState;
    state.military.formations!['hrhb_gone'] = { id: 'hrhb_gone', faction: 'HRHB', name: 'x', created_turn: 0, status: 'inactive', assignment: null, kind: 'brigade' } as FormationState;
    state.military.formations!['to_militia'] = { id: 'to_militia', faction: 'HRHB', name: 'x', created_turn: 0, status: 'active', assignment: null, kind: 'militia' } as FormationState;
    assert.deepStrictEqual(collectCorpslessBrigadeIssues(state), ['hrhb_a_none', 'hrhb_b_none']);
});
