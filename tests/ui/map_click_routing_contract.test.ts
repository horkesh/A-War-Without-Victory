import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import {
  resolveMapFormationInspectionTarget,
  resolveMapSectorInspectionTarget,
} from '../../src/ui/map/map/mapSelectionRouting.js';

function loadedState(): LoadedGameState {
  return {
    label: 'test',
    turn: 1,
    phase: 'war',
    formations: [
      {
        id: 'brigade_alpha',
        faction: 'RBiH',
        name: 'Alpha Brigade',
        kind: 'brigade',
        readiness: 'ready',
        cohesion: 70,
        fatigue: 0,
        status: 'active',
        createdTurn: 0,
        tags: [],
        corps_id: 'corps_alpha',
        location_osid: 'sarajevo_1',
      },
      {
        id: 'brigade_bravo',
        faction: 'RBiH',
        name: 'Bravo Brigade',
        kind: 'brigade',
        readiness: 'ready',
        cohesion: 70,
        fatigue: 0,
        status: 'active',
        createdTurn: 0,
        tags: [],
        corps_id: 'corps_bravo',
        location_osid: 'tuzla_1',
      },
    ],
    militiaPools: [],
    controlBySettlement: {},
    statusBySettlement: {},
    brigadeAorByFormationId: {},
    attackOrders: [],
    aorOrders: [],
    recentControlEvents: [],
    allControlEvents: [],
    displacementEventLog: [],
    battlesByOsid: {},
    movementsByOsid: {},
    supplyTransitionsByOsid: {},
    historicalEventsByTurn: [],
    corpsFrontSectors: [
      {
        sector_id: 'sector_alpha',
        corps_id: 'corps_alpha',
        corps_name: 'Alpha Corps',
        display_name: 'Alpha Sector',
        faction: 'RBiH',
        opposing_factions: ['RS'],
        edge_ids: ['edge_1'],
        territory_osids: ['sarajevo_1'],
        sub_segment_count: 1,
        length_edges: 1,
        assigned_brigade_ids: ['brigade_alpha'],
        reserve_brigade_ids: [],
        density: 1,
        threat_ratio: 1,
        defensive_power: 10,
        intel_confidence: 1,
        offensive_signs: false,
      },
    ],
  } as unknown as LoadedGameState;
}

describe('direct tactical map click routing', () => {
  it('routes sector clicks with known corps context through the compound sector target', () => {
    expect(resolveMapSectorInspectionTarget('sector_alpha', loadedState())).toEqual({
      kind: 'field-sector-in-corps',
      sectorId: 'sector_alpha',
      corpsId: 'corps_alpha',
    });
  });

  it('routes formation marker clicks through sector context before falling back to corps context', () => {
    expect(resolveMapFormationInspectionTarget('brigade_alpha', {
      sector_id: 'sector_alpha',
      corps_id: 'corps_alpha',
      location_osid: 'sarajevo_1',
    }, loadedState())).toEqual({
      kind: 'field-formation-in-sector',
      formationId: 'brigade_alpha',
      sectorId: 'sector_alpha',
    });

    expect(resolveMapFormationInspectionTarget('brigade_bravo', {
      corps_id: 'corps_bravo',
      location_osid: 'tuzla_1',
    }, loadedState())).toEqual({
      kind: 'field-formation-in-corps',
      formationId: 'brigade_bravo',
      corpsId: 'corps_bravo',
    });
  });

  it('resolves stack clicks from loaded formation and sector state when marker props are absent', () => {
    expect(resolveMapFormationInspectionTarget('brigade_alpha', null, loadedState())).toEqual({
      kind: 'field-formation-in-sector',
      formationId: 'brigade_alpha',
      sectorId: 'sector_alpha',
    });
  });

  it('keeps MapContainer direct clicks on the field inspection route', () => {
    const source = readFileSync(new URL('../../src/ui/map/map/MapContainer.tsx', import.meta.url), 'utf8');

    expect(source).toContain('inspectFormationFromMap(id, props)');
    expect(source).toContain('inspectSectorFromMap(sectorId, props)');
    expect(source).not.toMatch(/setSelectedFormationId\(id\)/);
    expect(source).not.toMatch(/(?:\.|\b)setSelectedCorpsFrontSectorId\(sectorId\)/);
  });
});
