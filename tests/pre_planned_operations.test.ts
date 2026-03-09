import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { injectPrePlannedOperations, _ALL_PRE_PLANNED } from '../src/sim/combat/pre_planned_operations.js';
import type { CorpsCommandState, FactionId, FormationState, GameState } from '../src/state/game_state.js';

function makeMinimalState(): GameState {
    const formations: Record<string, FormationState> = {};
    const corpsCommand: Record<string, CorpsCommandState> = {};

    const defs = _ALL_PRE_PLANNED;
    for (const def of defs) {
        formations[def.corps] = {
            id: def.corps,
            name: def.corps,
            faction: def.faction,
            kind: 'corps',
            status: 'active',
            personnel: 0,
        } as FormationState;
        corpsCommand[def.corps] = {
            command_span: 5,
            subordinate_count: 10,
            og_slots: 0,
            active_ogs: [],
            corps_exhaustion: 0,
            stance: 'balanced',
        };
        for (const axisDef of def.axes) {
            for (const brigadeId of axisDef.brigades) {
                if (formations[brigadeId]) continue;
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
            }
        }
    }

    const politicalControllers: Record<string, string> = {};
    // Assign enemy control to objectives so they're valid targets
    const enemyFaction: Record<string, string> = { RS: 'RBiH', RBiH: 'RS', HRHB: 'RBiH' };
    for (const def of defs) {
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
  factions: [{ id: 'RS' as FactionId }, { id: 'RBiH' as FactionId }] as GameState['factions'],
  formations,
  military: {
    corps_command: corpsCommand
  } as any,
  political: {
    political_controllers: politicalControllers
  } as any,
} as unknown as GameState;
}

describe('pre-planned operations', () => {
    it('defines nine pre-planned operations (8 VRS + 1 ARBiH)', () => {
        assert.equal(_ALL_PRE_PLANNED.length, 9);
        for (const def of _ALL_PRE_PLANNED) {
            assert.ok(def.axes.length >= 1, `${def.name} should have at least one axis`);
            for (const axis of def.axes) {
                assert.ok(axis.brigades.length >= 1, `${def.name}/${axis.name} should have brigades`);
                assert.ok(axis.objectives.length >= 1, `${def.name}/${axis.name} should have objectives`);
            }
        }
    });

    it('injects one operation per corps (first match wins)', () => {
        const state = makeMinimalState();
        injectPrePlannedOperations(state);

        // Herzegovina gets Visegrad (listed first), not Foca
        const herzOp = state.military.corps_command?.vrs_herzegovina?.active_operation;
        assert.ok(herzOp);
        assert.equal(herzOp?.name, 'Operation Visegrad');

        // 1KK gets Prijedor (listed first), not Bosanski Novi
        const kkOp = state.military.corps_command?.vrs_1st_krajina?.active_operation;
        assert.ok(kkOp);
        assert.equal(kkOp?.name, 'Operation Prijedor');
    });

    it('queues second ops for corps with multiple operations', () => {
        const state = makeMinimalState();
        injectPrePlannedOperations(state);

        // Herzegovina should have Foca queued
        const herzCmd = state.military.corps_command?.vrs_herzegovina;
        assert.ok(herzCmd?.queued_operations);
        assert.deepEqual(herzCmd!.queued_operations, ['Operation Foca']);

        // 1KK should have Bosanski Novi queued
        const kkCmd = state.military.corps_command?.vrs_1st_krajina;
        assert.ok(kkCmd?.queued_operations);
        assert.deepEqual(kkCmd!.queued_operations, ['Operation Corridor', 'Operation Bosanski Novi']);
    });

    it('creates multi-axis operations with proper axis structure', () => {
        const state = makeMinimalState();
        injectPrePlannedOperations(state);

        const koridor = state.military.corps_command?.vrs_east_bosnian?.active_operation;
        assert.ok(koridor);
        assert.ok(koridor?.axes);
        assert.equal(koridor!.axes!.length, 2);
        assert.equal(koridor!.axes![0]!.axis_id, 'brcko_corridor');
        assert.equal(koridor!.axes![1]!.axis_id, 'posavina_flank');
    });

    it('includes JNA phantom brigades in participating list', () => {
        const state = makeMinimalState();
        injectPrePlannedOperations(state);

        const koridor = state.military.corps_command?.vrs_east_bosnian?.active_operation;
        assert.ok(koridor?.participating_brigades.includes('jna_17th_corps_tg'));

        const prsten = state.military.corps_command?.vrs_sarajevo_romanija?.active_operation;
        assert.ok(prsten?.participating_brigades.includes('jna_4th_corps_tg'));
    });

    it('filters out already RS-controlled objectives without dropping the axis', () => {
        const state = makeMinimalState();
        state.political.political_controllers!['op:zvornik:zvornik'] = 'RS';
        state.political.political_controllers!['op:zvornik:drinjaca'] = 'RS';

        injectPrePlannedOperations(state);

        const drina = state.military.corps_command?.vrs_drina?.active_operation;
        assert.ok(drina);
        // Zvornik sweep axis should still exist with remaining objectives
        const zvornikAxis = drina!.axes!.find(a => a.axis_id === 'zvornik_sweep');
        assert.ok(zvornikAxis);
        assert.ok(!zvornikAxis!.objectives.includes('op:zvornik:zvornik'));
        assert.ok(!zvornikAxis!.objectives.includes('op:zvornik:drinjaca'));
        assert.ok(zvornikAxis!.objectives.length > 0); // still has objectives
    });
});
