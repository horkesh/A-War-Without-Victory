import { describe, expect, it } from 'vitest';

import { classifyBrigadesByTerritory } from '../src/sim/combat/brigade_assignment';
import type {
  CorpsFrontSector,
  CorpsFrontSubSegment,
  FormationState,
  GameState,
} from '../src/state/game_state.js';

type FormationOverrides = Partial<FormationState> & {
  id: string;
  faction: FormationState['faction'];
  location_osid: string;
  corps_id?: string;
  equipment?: Record<string, number>;
};

type SectorOverrides = Partial<CorpsFrontSector> & {
  sector_id: string;
  corps_id: string;
  front_osids?: string[];
  enemy_osids?: string[];
  pressure_level?: string;
  threat_score?: number;
  neighbor_sector_ids?: string[];
  centroid?: { x: number; y: number };
  contiguous_components?: number;
  needs_brigade?: boolean;
  sub_segments?: CorpsFrontSubSegment[];
};

function makeFormation(overrides: FormationOverrides): FormationState {
  const {
    id,
    faction,
    location_osid,
    corps_id = 'test_corps',
    equipment = {},
    ...rest
  } = overrides;

  return {
    id,
    kind: 'brigade',
    faction,
    name: id,
    status: 'active',
    corps_id,
    location_osid,
    personnel: overrides.personnel ?? 1000,
    equipment,
    readiness: overrides.readiness ?? 1,
    assignment: overrides.assignment,
    posture: overrides.posture,
    home_osid: overrides.home_osid,
    ...rest,
  } as unknown as FormationState;
}

function makeSector(overrides: SectorOverrides): CorpsFrontSector {
  const frontOsids = overrides.front_osids ? [...overrides.front_osids] : [];
  const enemyOsids = overrides.enemy_osids ? [...overrides.enemy_osids] : [];
  const edgeIds = frontOsids.map((osid, idx) => `${overrides.sector_id}:edge:${idx}:${osid}`);

  return {
    sector_id: overrides.sector_id,
    corps_id: overrides.corps_id,
    faction: 'RS',
    opposing_factions: ['RBiH'],
    edge_ids: edgeIds,
    length_edges: overrides.length_edges ?? 1,
    front_osids: frontOsids,
    enemy_osids: enemyOsids,
    territory_osids: overrides.territory_osids ? [...overrides.territory_osids] : [],
    assigned_brigade_ids: overrides.assigned_brigade_ids ? [...overrides.assigned_brigade_ids] : [],
    reserve_brigade_ids: overrides.reserve_brigade_ids ? [...overrides.reserve_brigade_ids] : [],
    pressure_level: overrides.pressure_level ?? 'balanced',
    threat_score: overrides.threat_score ?? 0,
    neighbor_sector_ids: overrides.neighbor_sector_ids ? [...overrides.neighbor_sector_ids] : [],
    centroid: overrides.centroid ?? { x: 0, y: 0 },
    contiguous_components: overrides.contiguous_components ?? 1,
    needs_brigade: overrides.needs_brigade ?? false,
    sub_segments: overrides.sub_segments ?? [{
      sub_segment_id: `${overrides.sector_id}:segment`,
      friendly_osids: frontOsids,
      enemy_osids: enemyOsids,
      edge_ids: edgeIds,
      length_edges: overrides.length_edges ?? (frontOsids.length || 1),
      primary_brigade_ids: [],
    }],
    density: 0,
    threat_ratio: 0,
    defensive_power: 0,
    sector_stance: 'defend',
    stance_source: 'bot',
  } as unknown as CorpsFrontSector;
}

describe('classifyBrigadesByTerritory shared-front assignment', () => {
  it('assigns a brigade at a shared front OSID to the neediest sibling sector instead of the highest-threat one', () => {
    const sectors: CorpsFrontSector[] = [
      makeSector({
        sector_id: 'sector:test:0',
        corps_id: 'test_corps',
        length_edges: 4,
        front_osids: ['shared_front'],
        enemy_osids: ['enemy_heavy'],
        territory_osids: ['rear_a'],
      }),
      makeSector({
        sector_id: 'sector:test:1',
        corps_id: 'test_corps',
        length_edges: 9,
        front_osids: ['shared_front', 'needy_front'],
        enemy_osids: ['enemy_light'],
        territory_osids: ['rear_b'],
      }),
    ];

    const formations: Record<string, FormationState> = {
      brig_shared: makeFormation({
        id: 'brig_shared',
        faction: 'vrs',
        corps_id: 'test_corps',
        location_osid: 'shared_front',
        personnel: 1800,
      }),
      enemy_heavy: makeFormation({
        id: 'enemy_heavy',
        faction: 'arbih',
        corps_id: 'enemy_corps',
        location_osid: 'enemy_heavy',
        personnel: 5000,
      }),
      enemy_light: makeFormation({
        id: 'enemy_light',
        faction: 'arbih',
        corps_id: 'enemy_corps',
        location_osid: 'enemy_light',
        personnel: 500,
      }),
    };

    const state = {
      political: {
        control: {},
      },
      map: {
        osid_owner: {},
      },
      military: {
        elite_loan_assignments: {},
      },
    } as unknown as GameState;

    const componentOf = new Map<string, number>([
      ['shared_front', 0],
      ['needy_front', 0],
      ['rear_a', 0],
      ['rear_b', 0],
      ['enemy_heavy', 1],
      ['enemy_light', 1],
    ]);
    const friendlyOsids = new Set(['shared_front', 'needy_front', 'rear_a', 'rear_b']);

    classifyBrigadesByTerritory(
      sectors,
      'vrs',
      formations,
      new Map(),
      friendlyOsids,
      componentOf,
      new Map(),
      undefined,
      state,
    );

    expect(sectors[0]!.assigned_brigade_ids).toEqual([]);
    expect(sectors[1]!.assigned_brigade_ids).toEqual(['brig_shared']);
  });
});
