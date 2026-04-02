import { describe, expect, it } from 'vitest';
import type { FormationView, LoadedGameState } from '../src/ui/map/data/types.js';
import {
  buildPlayerSafeFormationTooltipModel,
  buildPlayerSafeFrontTooltipModel,
  getPlayerSafeSettlementTooltipFormations,
} from '../src/ui/map/components/tooltipPlayerSafe.js';

describe('player-safe tooltip models', () => {
  it('keeps exact detail for own formations but abstracts enemy contacts', () => {
    const formations = [
      {
        id: 'own_bde',
        name: '2nd Tuzla Brigade',
        faction: 'RBiH',
        corps_id: 'arbih_2nd_corps',
        personnel: 1800,
        cohesion: 77,
        posture: 'defend',
        aorSettlementIds: ['op:tuzla'],
        home_osid: 'op:tuzla',
        location_osid: 'op:tuzla',
      },
      {
        id: 'arbih_2nd_corps',
        name: '2nd Corps',
        faction: 'RBiH',
      },
      {
        id: 'enemy_bde',
        name: '1st Krajina Motorized',
        faction: 'RS',
        corps_id: 'vrs_1st_krajina',
        personnel: 2200,
        cohesion: 84,
        posture: 'attack',
        aorSettlementIds: ['op:doboj'],
        location_osid: 'op:doboj',
      },
    ] as Array<any>;

    const own = buildPlayerSafeFormationTooltipModel({
      formationId: 'own_bde',
      formations,
      attackOrders: [{ brigadeId: 'own_bde', targetSettlementId: 'op:doboj' }],
      osidDisplayNames: { 'op:doboj': 'Doboj' },
      playerFaction: 'RBiH',
    });
    const enemy = buildPlayerSafeFormationTooltipModel({
      formationId: 'enemy_bde',
      formations,
      attackOrders: [],
      osidDisplayNames: { 'op:doboj': 'Doboj' },
      playerFaction: 'RBiH',
    });

    expect(own.classification).toBe('own');
    expect(own.title).toBe('2nd Tuzla Brigade');
    expect(own.subtitle).toBe('2nd Corps');
    expect(own.personnel).toBe(1800);
    expect(own.posture).toBe('defend');
    expect(own.orderLine).toContain('Doboj');

    expect(enemy.classification).toBe('enemy_contact');
    expect(enemy.title).toBe('Enemy contact');
    expect(enemy.personnel).toBeNull();
    expect(enemy.posture).toBeNull();
    expect(enemy.orderLine).toBeNull();
    expect(enemy.title).not.toContain('1st Krajina');
  });

  it('keeps settlement tooltip unit lists to own formations only', () => {
    const state = {
      player_faction: 'RBiH',
      formations: [
        { id: 'own_bde', name: '2nd Tuzla Brigade', faction: 'RBiH', kind: 'brigade', location_osid: 'op:tuzla', personnel: 1800 },
        { id: 'enemy_bde', name: '1st Krajina Motorized', faction: 'RS', kind: 'brigade', location_osid: 'op:tuzla', personnel: 2200 },
      ],
    } as unknown as LoadedGameState;

    expect(getPlayerSafeSettlementTooltipFormations(state, 'op:tuzla').map((entry) => entry.id)).toEqual(['own_bde']);
  });

  it('shows own line detail but abstracts enemy contacts on front tooltips', () => {
    const formations = [
      {
        id: 'own_bde',
        name: '2nd Tuzla Brigade',
        faction: 'RBiH',
        kind: 'brigade',
        readiness: 'active',
        cohesion: 80,
        fatigue: 0,
        status: 'active',
        createdTurn: 1,
        tags: [],
        location_osid: 'op:tuzla',
        aorSettlementIds: ['op:tuzla', 'op:majevica'],
        posture: 'defend',
      },
      {
        id: 'enemy_seen',
        name: '1st Krajina Motorized',
        faction: 'RS',
        kind: 'brigade',
        readiness: 'active',
        cohesion: 80,
        fatigue: 0,
        status: 'active',
        createdTurn: 1,
        tags: [],
        location_osid: 'op:doboj',
        aorSettlementIds: ['op:doboj', 'op:majevica'],
        posture: 'attack',
      },
      {
        id: 'enemy_hidden',
        name: 'Drina Brigade',
        faction: 'RS',
        kind: 'brigade',
        readiness: 'active',
        cohesion: 80,
        fatigue: 0,
        status: 'active',
        createdTurn: 1,
        tags: [],
        location_osid: 'op:hidden',
        aorSettlementIds: ['op:tuzla', 'op:majevica'],
        posture: 'attack',
      },
    ] satisfies FormationView[];

    const model = buildPlayerSafeFrontTooltipModel({
      edgeId: 'op:tuzla::op:doboj',
      frontEdgesOsid: [{ edge_id: 'op:tuzla::op:doboj', a: 'op:tuzla', b: 'op:doboj', side_a: 'RBiH', side_b: 'RS' }],
      frontPressureByEdge: { 'op:tuzla::op:doboj': { value: 1.2, max_abs: 2, last_updated_turn: 5 } },
      formations,
      fogOfWar: { visibleEnemyOsids: ['op:doboj'], visibleEnemySectorIds: [] },
      assignableFrontSegments: [{ front_id: 'front_1', edge_ids: ['op:tuzla::op:doboj'], side_a: 'RBiH', side_b: 'RS' }],
      corpsFrontSectors: [{
        sector_id: 'sector_rbih',
        corps_id: 'arbih_2nd_corps',
        corps_name: '2nd Corps',
        faction: 'RBiH',
        display_name: 'Tuzla Front',
        opposing_factions: ['RS'],
        edge_ids: ['op:tuzla::op:doboj'],
        sub_segment_count: 1,
        length_edges: 1,
        density: 1.1,
        threat_ratio: 0.9,
        assigned_brigade_ids: ['own_bde'],
        reserve_brigade_ids: [],
        defensive_power: 1,
        offensive_signs: false,
        intel_confidence: 0.6,
        combat_strength_class: 'adequate',
      }],
      playerFaction: 'RBiH',
    });

    expect(model.sectorName).toBe('Tuzla Front');
    expect(model.ownFormationLabels).toEqual(['2nd Tuzla Brigade (defend)']);
    expect(model.enemyContactSummary).toBe('1 enemy contact observed');
  });
});
