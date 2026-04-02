import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { injectPrePlannedOperations, _ALL_PRE_PLANNED } from '../src/sim/combat/pre_planned_operations.js';
import type {
    CorpsCommandState,
    CorpsFrontSector,
    FactionId,
    FormationState,
    GameState,
} from '../src/state/game_state.js';

function makeMinimalState(): GameState {
    const formations: Record<string, FormationState> = {};
    const corpsCommand: Record<string, CorpsCommandState> = {};
    const corpsFrontSectors: Record<string, CorpsFrontSector> = {};

    for (const def of _ALL_PRE_PLANNED) {
        if (!corpsCommand[def.corps]) {
            corpsCommand[def.corps] = {
                command_span: 5,
                subordinate_count: 10,
                og_slots: 0,
                active_ogs: [],
                active_operations: [],
                corps_exhaustion: 0,
                stance: 'balanced',
            };
        }

        if (!corpsFrontSectors[`sector:${def.corps}:0`]) {
            corpsFrontSectors[`sector:${def.corps}:0`] = {
                sector_id: `sector:${def.corps}:0`,
                corps_id: def.corps,
                assigned_brigade_ids: [],
                reserve_brigade_ids: [],
                length_edges: 1,
                territory_osids: [],
            } as CorpsFrontSector;
        }

        for (const axisDef of def.axes) {
            for (const brigadeId of axisDef.brigades) {
                if (!formations[brigadeId]) {
                    formations[brigadeId] = {
                        id: brigadeId,
                        name: brigadeId,
                        faction: def.faction,
                        kind: brigadeId.startsWith('jna_') ? 'jna_phantom' : 'brigade',
                        status: 'active',
                        personnel: 1000,
                        corps_id: def.corps,
                        location_osid: axisDef.staging_osid ?? def.staging_osid,
                    } as FormationState;
                    corpsFrontSectors[`sector:${def.corps}:0`]!.assigned_brigade_ids.push(brigadeId);
                }
            }
        }
    }

    const politicalControllers: Record<string, string> = {};
    const enemyFaction: Record<string, string> = { RS: 'RBiH', RBiH: 'RS', HRHB: 'RBiH' };
    for (const def of _ALL_PRE_PLANNED) {
        politicalControllers[def.staging_osid] = def.faction;
        for (const axisDef of def.axes) {
            if (axisDef.staging_osid) politicalControllers[axisDef.staging_osid] = def.faction;
            for (const osid of axisDef.objectives) {
                politicalControllers[osid] = enemyFaction[def.faction] ?? 'RBiH';
            }
        }
    }

    return {
        meta: {
            turn: 0,
            phase: 'war',
            scenario_start_date: { year: 1992, month: 4, day: 6 },
            seed: 'test',
        } as unknown as GameState['meta'],
        factions: [{ id: 'RS' as FactionId }, { id: 'RBiH' as FactionId }, { id: 'HRHB' as FactionId }] as GameState['factions'],
        military: {
            formations,
            corps_command: corpsCommand,
            corps_front_sectors: corpsFrontSectors,
        } as any,
        political: {
            political_controllers: politicalControllers,
        } as any,
    } as unknown as GameState;
}

describe('pre-planned operations', () => {
    it('defines the current pre-planned operation catalog', () => {
        assert.equal(_ALL_PRE_PLANNED.length, 14);
        assert.deepEqual(
            _ALL_PRE_PLANNED.map((def) => def.name),
            [
                'Operation Koridor',
                'Operation Drina',
                'Operation Podrinje Sweep',
                'Operation Visegrad',
                'Operation Prsten',
                'Operation Herzegovina',
                'Operation Foca',
                'Operation Prijedor',
                'Operation Corridor',
                'Operation Jajce',
                'Operation Donji Vakuf',
                'Operation Bosanski Novi',
                'Operation Jackal',
                'Operation Teočak',
            ],
        );
    });

    it('injects one active operation per corps and preserves current queue chains', () => {
        const state = makeMinimalState();
        injectPrePlannedOperations(state);

        assert.equal(state.military.corps_command?.vrs_herzegovina?.active_operations[0]?.name, 'Operation Visegrad');
        assert.deepEqual(state.military.corps_command?.vrs_herzegovina?.queued_operations, ['Operation Foca']);

        assert.equal(state.military.corps_command?.vrs_1st_krajina?.active_operations[0]?.name, 'Operation Prijedor');
        assert.deepEqual(
            state.military.corps_command?.vrs_1st_krajina?.queued_operations,
            ['Operation Corridor', 'Operation Jajce', 'Operation Donji Vakuf', 'Operation Bosanski Novi'],
        );

        assert.equal(state.military.corps_command?.vrs_drina?.active_operations[0]?.name, 'Operation Drina');
        assert.deepEqual(state.military.corps_command?.vrs_drina?.queued_operations, ['Operation Podrinje Sweep']);

        assert.equal(state.military.corps_command?.hvo_southeast_herzegovina?.queued_operations?.[0], 'Operation Jackal');
        assert.equal(state.military.corps_command?.arbih_2nd_corps?.queued_operations?.[0], 'Operation Teočak');
    });

    it('anchors injected operations to the primary sector of their participating brigades', () => {
        const state = makeMinimalState();
        injectPrePlannedOperations(state);

        const koridor = state.military.corps_command?.vrs_east_bosnian?.active_operations[0];
        const drina = state.military.corps_command?.vrs_drina?.active_operations[0];
        const prijedor = state.military.corps_command?.vrs_1st_krajina?.active_operations[0];

        assert.equal(koridor?.sector_id, 'sector:vrs_east_bosnian:0');
        assert.equal(drina?.sector_id, 'sector:vrs_drina:0');
        assert.equal(prijedor?.sector_id, 'sector:vrs_1st_krajina:0');
    });

    it('keeps multi-axis structure and phantom participation intact', () => {
        const state = makeMinimalState();
        injectPrePlannedOperations(state);

        const koridor = state.military.corps_command?.vrs_east_bosnian?.active_operations[0];
        assert.ok(koridor?.axes);
        assert.equal(koridor!.axes!.length, 2);
        assert.equal(koridor!.axes![0]!.axis_id, 'brcko_corridor');
        assert.equal(koridor!.axes![1]!.axis_id, 'posavina_flank');
        assert.ok(koridor!.participating_brigades.includes('jna_17th_corps_tg'));

        const prsten = state.military.corps_command?.vrs_sarajevo_romanija?.active_operations[0];
        assert.ok(prsten?.participating_brigades.includes('jna_4th_corps_tg'));
    });

    it('filters already-controlled objectives without dropping viable axes', () => {
        const state = makeMinimalState();
        state.political.political_controllers!['op:zvornik:zvornik'] = 'RS';
        state.political.political_controllers!['op:zvornik:novo_selo'] = 'RS';

        injectPrePlannedOperations(state);

        const drina = state.military.corps_command?.vrs_drina?.active_operations[0];
        const zvornikAxis = drina?.axes?.find((axis) => axis.axis_id === 'zvornik_sweep');
        assert.ok(zvornikAxis);
        assert.ok(!zvornikAxis!.objectives.includes('op:zvornik:zvornik'));
        assert.ok(!zvornikAxis!.objectives.includes('op:zvornik:novo_selo'));
        assert.ok(zvornikAxis!.objectives.length > 0);
    });
});
