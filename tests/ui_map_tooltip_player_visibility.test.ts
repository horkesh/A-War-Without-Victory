import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
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
    expect(own.posture).toBe('Defending');
    expect(own.orderLine).toContain('Doboj');
    expect(own.orderLine).not.toContain('->');

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
        { id: 'own_bde', name: '2nd Tuzla Brigade', faction: 'RBiH', kind: 'brigade', status: 'active', readiness: 'ready', location_osid: 'op:tuzla', personnel: 1800 },
        { id: 'own_forming_bde', name: 'Forming Brigade', faction: 'RBiH', kind: 'brigade', status: 'active', readiness: 'forming', location_osid: 'op:tuzla', personnel: 900 },
        { id: 'own_destroyed_bde', name: 'Destroyed Brigade', faction: 'RBiH', kind: 'brigade', status: 'destroyed', readiness: 'destroyed', location_osid: 'op:tuzla', personnel: 200 },
        { id: 'enemy_bde', name: '1st Krajina Motorized', faction: 'RS', kind: 'brigade', status: 'active', readiness: 'ready', location_osid: 'op:tuzla', personnel: 2200 },
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
        readiness: 'ready',
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
        readiness: 'ready',
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
        readiness: 'ready',
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
    expect(model.densityLabel).toBe('Reinforced');
    expect(model.ownFormationLabels).toEqual(['2nd Tuzla Brigade - Defending']);
    expect(model.enemyContactSummary).toBe('1 enemy contact observed');
  });

  it('excludes forming own formations from front tooltip line summaries', () => {
    const formations = [
      {
        id: 'own_fielded',
        name: 'Fielded Brigade',
        faction: 'RBiH',
        kind: 'brigade',
        readiness: 'ready',
        cohesion: 80,
        fatigue: 0,
        status: 'active',
        createdTurn: 1,
        tags: [],
        location_osid: 'op:tuzla',
        aorSettlementIds: ['op:tuzla', 'op:doboj'],
        posture: 'defend',
      },
      {
        id: 'own_forming',
        name: 'Forming Brigade',
        faction: 'RBiH',
        kind: 'brigade',
        readiness: 'forming',
        cohesion: 40,
        fatigue: 0,
        status: 'active',
        createdTurn: 1,
        tags: [],
        location_osid: 'op:tuzla',
        aorSettlementIds: ['op:tuzla', 'op:doboj'],
        posture: 'defend',
      },
    ] satisfies FormationView[];

    const model = buildPlayerSafeFrontTooltipModel({
      edgeId: 'op:tuzla::op:doboj',
      frontEdgesOsid: [{ edge_id: 'op:tuzla::op:doboj', a: 'op:tuzla', b: 'op:doboj', side_a: 'RBiH', side_b: 'RS' }],
      frontPressureByEdge: { 'op:tuzla::op:doboj': { value: 0, max_abs: 1 } },
      formations,
      fogOfWar: { visibleEnemyOsids: [], visibleEnemySectorIds: [] },
      corpsFrontSectors: [],
      playerFaction: 'RBiH',
    });

    expect(model.ownFormationLabels).toEqual(['Fielded Brigade - Defending']);
  });

  it('does not show favorable density or threat for own sectors with no current fielded formations', () => {
    const model = buildPlayerSafeFrontTooltipModel({
      edgeId: 'op:tuzla::op:doboj',
      frontEdgesOsid: [{ edge_id: 'op:tuzla::op:doboj', a: 'op:tuzla', b: 'op:doboj', side_a: 'RBiH', side_b: 'RS' }],
      frontPressureByEdge: { 'op:tuzla::op:doboj': { value: 0, max_abs: 1 } },
      formations: [],
      fogOfWar: { visibleEnemyOsids: [], visibleEnemySectorIds: [] },
      corpsFrontSectors: [{
        sector_id: 'sector_uncovered',
        corps_id: 'arbih_2nd_corps',
        corps_name: '2nd Corps',
        faction: 'RBiH',
        display_name: 'Uncovered front',
        opposing_factions: ['RS'],
        edge_ids: ['op:tuzla::op:doboj'],
        sub_segment_count: 1,
        length_edges: 3,
        density: 1.25,
        threat_ratio: 0.5,
        assigned_brigade_ids: ['stale_brigade'],
        reserve_brigade_ids: [],
        defensive_power: 1,
        offensive_signs: false,
        intel_confidence: 0.6,
        combat_strength_class: 'adequate',
      }],
      playerFaction: 'RBiH',
    });

    expect(model.sectorName).toBe('Uncovered front');
    expect(model.sectorStatusLine).toBe('No friendly line');
    expect(model.densityValue).toBeNull();
    expect(model.densityLabel).toBeNull();
    expect(model.threatSummary).toBeNull();
  });

  it('does not treat reserve-only own sectors as a friendly front line', () => {
    const formations = [{
      id: 'own_reserve',
      name: 'Reserve Brigade',
      faction: 'RBiH',
      kind: 'brigade',
      readiness: 'ready',
      status: 'active',
      cohesion: 70,
      fatigue: 0,
      createdTurn: 1,
      tags: [],
      location_osid: 'op:tuzla',
      aorSettlementIds: ['op:tuzla', 'op:doboj'],
      posture: 'reserve',
    }] satisfies FormationView[];

    const model = buildPlayerSafeFrontTooltipModel({
      edgeId: 'op:tuzla::op:doboj',
      frontEdgesOsid: [{ edge_id: 'op:tuzla::op:doboj', a: 'op:tuzla', b: 'op:doboj', side_a: 'RBiH', side_b: 'RS' }],
      frontPressureByEdge: { 'op:tuzla::op:doboj': { value: 0, max_abs: 1 } },
      formations,
      fogOfWar: { visibleEnemyOsids: [], visibleEnemySectorIds: [] },
      corpsFrontSectors: [{
        sector_id: 'sector_reserve_only',
        corps_id: 'arbih_2nd_corps',
        corps_name: '2nd Corps',
        faction: 'RBiH',
        display_name: 'Reserve-only front',
        opposing_factions: ['RS'],
        edge_ids: ['op:tuzla::op:doboj'],
        sub_segment_count: 1,
        length_edges: 3,
        density: 1.25,
        threat_ratio: 0.5,
        assigned_brigade_ids: [],
        reserve_brigade_ids: ['own_reserve'],
        defensive_power: 1,
        offensive_signs: false,
        intel_confidence: 0.6,
        combat_strength_class: 'adequate',
      }],
      playerFaction: 'RBiH',
    });

    expect(model.sectorStatusLine).toBe('No friendly line');
    expect(model.densityValue).toBeNull();
    expect(model.densityLabel).toBeNull();
    expect(model.threatSummary).toBeNull();
  });

  it('does not label reserve or AoR-only own formations as live line holders on front tooltips', () => {
    const formations = [{
      id: 'own_reserve',
      name: 'Reserve Brigade',
      faction: 'RBiH',
      kind: 'brigade',
      readiness: 'ready',
      status: 'active',
      cohesion: 70,
      fatigue: 0,
      createdTurn: 1,
      tags: [],
      location_osid: 'op:tuzla:rear',
      aorSettlementIds: ['op:tuzla:front', 'op:doboj:front'],
      posture: 'reserve',
    }] satisfies FormationView[];

    const model = buildPlayerSafeFrontTooltipModel({
      edgeId: 'op:tuzla:front::op:doboj:front',
      frontEdgesOsid: [{ edge_id: 'op:tuzla:front::op:doboj:front', a: 'op:tuzla:front', b: 'op:doboj:front', side_a: 'RBiH', side_b: 'RS' }],
      frontPressureByEdge: { 'op:tuzla:front::op:doboj:front': { value: 0, max_abs: 1 } },
      formations,
      fogOfWar: { visibleEnemyOsids: [], visibleEnemySectorIds: [] },
      corpsFrontSectors: [{
        sector_id: 'sector_reserve_only',
        corps_id: 'arbih_2nd_corps',
        corps_name: '2nd Corps',
        faction: 'RBiH',
        display_name: 'Reserve-only front',
        opposing_factions: ['RS'],
        edge_ids: ['op:tuzla:front::op:doboj:front'],
        sub_segment_count: 1,
        length_edges: 3,
        density: 1.25,
        threat_ratio: 0.5,
        assigned_brigade_ids: [],
        reserve_brigade_ids: ['own_reserve'],
        defensive_power: 1,
        offensive_signs: false,
        intel_confidence: 0.6,
        combat_strength_class: 'adequate',
      }],
      playerFaction: 'RBiH',
    });

    expect(model.ownFormationLabels).toEqual([]);
    expect(model.sectorStatusLine).toBe('No friendly line');
  });

  it('sanitizes raw sector names in front tooltip models', () => {
    const model = buildPlayerSafeFrontTooltipModel({
      edgeId: 'op:tuzla::op:doboj',
      frontEdgesOsid: [{ edge_id: 'op:tuzla::op:doboj', a: 'op:tuzla', b: 'op:doboj', side_a: 'RBiH', side_b: 'RS' }],
      frontPressureByEdge: { 'op:tuzla::op:doboj': { value: 0, max_abs: 1 } },
      formations: [],
      fogOfWar: { visibleEnemyOsids: [], visibleEnemySectorIds: [] },
      corpsFrontSectors: [{
        sector_id: 'sector:arbih_2nd_corps:0',
        corps_id: 'arbih_2nd_corps',
        corps_name: '2nd Corps',
        faction: 'RBiH',
        display_name: 'sector:arbih_2nd_corps:0',
        opposing_factions: ['RS'],
        edge_ids: ['op:tuzla::op:doboj'],
        sub_segment_count: 1,
        length_edges: 3,
        density: 1.25,
        threat_ratio: 0.5,
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        defensive_power: 1,
        offensive_signs: false,
        intel_confidence: 0.6,
        combat_strength_class: 'adequate',
      }],
      playerFaction: 'RBiH',
    });

    expect(model.sectorName).toBe('Assigned sector');
    expect(model.sectorName).not.toMatch(/sector:|arbih|2nd Corps 0/i);
  });

  it('localizes formation posture labels in tooltip models', () => {
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
        location_osid: 'op:tuzla',
      },
    ] as Array<any>;

    const model = buildPlayerSafeFormationTooltipModel({
      formationId: 'own_bde',
      formations,
      attackOrders: [],
      osidDisplayNames: null,
      playerFaction: 'RBiH',
      locale: 'bcs',
    });

    expect(model.posture).toBe('Odbrana');
    expect(model.posture).not.toBe('defend');
  });

  it('keeps tooltip player copy free of OSID, OPSEC jargon, raw posture, and shorthand chrome', () => {
    const tooltipSource = readFileSync('src/ui/map/components/Tooltip.tsx', 'utf8');
    const englishMessages = readFileSync('src/ui/map/i18n/messages.en.ts', 'utf8');
    const tooltipMessages = englishMessages
      .split(/\r?\n/)
      .filter((line) => line.includes("'tooltip."))
      .join('\n');
    const playerCopy = `${tooltipSource}\n${tooltipMessages}`;

    expect(playerCopy).not.toContain('Defender OPSEC');
    expect(playerCopy).not.toContain('at OSID');
    expect(playerCopy).not.toContain('No brigades at OSID');
    expect(playerCopy).not.toContain('Posture:');
    expect(playerCopy).not.toContain('AoR:');
    expect(playerCopy).not.toContain('Order:');
    expect(playerCopy).not.toContain('Status:');
    expect(tooltipSource).not.toContain(' edges');
    expect(playerCopy).not.toContain('THIN');
    expect(playerCopy).not.toContain('DENSE');
    expect(playerCopy).not.toContain('Active Def.');
    expect(playerCopy).not.toMatch(/>\s*reactive\s*</i);
    expect(tooltipSource).toContain('filterPlayerFacingSectors(loadedGameState)');
    expect(tooltipSource).not.toContain('sectors={loadedGameState?.corpsFrontSectors}');
  });
});
