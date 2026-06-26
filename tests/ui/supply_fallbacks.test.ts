// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { FeatureCollection, Polygon } from 'geojson';

import { EconomyPanel } from '../../src/ui/map/components/EconomyPanel.js';
import { SupplyPanel } from '../../src/ui/map/components/SupplyPanel.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { buildSupplyGeoJSON } from '../../src/ui/map/map/builders/buildSupplyGeoJSON.js';

afterEach(() => cleanup());

const controlGeoJson: FeatureCollection<Polygon> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ]],
      },
      properties: { osid: 'op:test:a' },
    },
  ],
};

describe('supply UI fallbacks', () => {
  it('SupplyPanel treats high legacy pressure as cut, not open', () => {
    render(createElement(SupplyPanel, {
      state: {
        player_faction: 'RBiH',
        warPhaseSupplyPressure: { RBiH: 100 },
      } as unknown as LoadedGameState,
    }));

    expect(screen.getByText('0 open')).toBeTruthy();
    expect(screen.getByText('0 strained')).toBeTruthy();
    expect(screen.getByText('1 cut')).toBeTruthy();
  });

  it('SupplyPanel prefers live condition when present', () => {
    render(createElement(SupplyPanel, {
      state: {
        player_faction: 'RBiH',
        warPhaseSupplyPressure: { RBiH: 100 },
        warPhaseSupplyCondition: { RBiH: 100 },
      } as unknown as LoadedGameState,
    }));

    expect(screen.getByText('1 open')).toBeTruthy();
    expect(screen.getByText('0 strained')).toBeTruthy();
    expect(screen.getByText('0 cut')).toBeTruthy();
  });

  it('SupplyPanel scopes legacy fallback to the player faction when live condition is partial', () => {
    render(createElement(SupplyPanel, {
      state: {
        player_faction: 'RBiH',
        warPhaseSupplyPressure: { RBiH: 100, RS: 100 },
        warPhaseSupplyCondition: { RBiH: 100 },
      } as unknown as LoadedGameState,
    }));

    expect(screen.getByText('1 open')).toBeTruthy();
    expect(screen.getByText('0 strained')).toBeTruthy();
    expect(screen.getByText('0 cut')).toBeTruthy();
  });

  it('SupplyPanel shows player-scoped state and corridor counts from summary rows', () => {
    render(createElement(SupplyPanel, {
      state: {
        player_faction: 'RBiH',
        supplySummaryByFaction: {
          RBiH: {
            adequate_count: 2,
            strained_count: 1,
            critical_count: 1,
            corridor_open_count: 3,
            corridor_brittle_count: 1,
            corridor_cut_count: 0,
          },
          RS: {
            adequate_count: 0,
            strained_count: 0,
            critical_count: 99,
            corridor_open_count: 0,
            corridor_brittle_count: 0,
            corridor_cut_count: 99,
          },
        },
      } as unknown as LoadedGameState,
    }));

    expect(screen.getByText('2 adequate')).toBeTruthy();
    expect(screen.getAllByText('1 strained').length).toBeGreaterThan(0);
    expect(screen.getByText('1 critical')).toBeTruthy();
    expect(screen.getByText('3 open')).toBeTruthy();
    expect(screen.getByText('0 cut')).toBeTruthy();
    expect(screen.queryByText('99 critical')).toBeNull();
    expect(screen.queryByText('99 cut')).toBeNull();
  });

  it('SupplyPanel keeps missing player reserve rows unreported instead of depleted zero bars', () => {
    render(createElement(SupplyPanel, {
      state: {
        player_faction: 'RBiH',
        factionReserves: {
          RS: { generalSupply: 80, heavyMunitions: 70 },
        },
      } as unknown as LoadedGameState,
    }));

    expect(screen.getByText('ARBiH')).toBeTruthy();
    expect(screen.getAllByText('Unreported')).toHaveLength(2);
    expect(screen.queryByText('0')).toBeNull();
  });

  it('EconomyPanel keeps partial reserve rows unreported instead of counting missing fields as strained', () => {
    render(createElement(EconomyPanel, {
      state: {
        player_faction: 'RBiH',
        factionReserves: {
          RBiH: { generalSupply: 80 },
        },
        productionFacilities: [],
        smugglingRoutes: [],
      } as unknown as LoadedGameState,
      onClose: () => {},
    }));

    expect(screen.getByText('Strained').parentElement?.textContent).toContain('0');
    expect(screen.getByText('Supply').parentElement?.textContent).toContain('80');
    expect(screen.getByText('Ammo').parentElement?.textContent).toContain('Unreported');
  });

  it('buildSupplyGeoJSON treats high legacy pressure as critical, not adequate', () => {
    const geo = buildSupplyGeoJSON(
      controlGeoJson,
      { 'op:test:a': 'RBiH' },
      undefined,
      { RBiH: 100 },
    );

    expect(geo.features[0]?.properties?.supply_class).toBe('critical');
  });

  it('buildSupplyGeoJSON prefers live condition over legacy pressure', () => {
    const geo = buildSupplyGeoJSON(
      controlGeoJson,
      { 'op:test:a': 'RBiH' },
      undefined,
      { RBiH: 100 },
      { RBiH: 100 },
    );

    expect(geo.features[0]?.properties?.supply_class).toBe('adequate');
  });

  it('buildSupplyGeoJSON prefers explicit OSID supply truth over faction reserves', () => {
    const geo = buildSupplyGeoJSON(
      controlGeoJson,
      { 'op:test:a': 'RBiH' },
      { RBiH: { generalSupply: 100, heavyMunitions: 100 } },
      undefined,
      undefined,
      { 'op:test:a': 'critical' },
    );

    expect(geo.features[0]?.properties?.supply_class).toBe('critical');
  });

  it('buildSupplyGeoJSON falls back per controller when live condition is partial', () => {
    const geo = buildSupplyGeoJSON(
      controlGeoJson,
      { 'op:test:a': 'RS' },
      undefined,
      { RS: 100 },
      { RBiH: 100 },
    );

    expect(geo.features[0]?.properties?.supply_class).toBe('critical');
  });
});
