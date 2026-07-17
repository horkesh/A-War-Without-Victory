import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  getFormationIconScreenSize,
  pickNearestFormationAtPoint,
  resolveDeckFormationClickTarget,
} from '../src/ui/map/map/clickSelectionPriority.js';

describe('deck click selection priority', () => {
  it('keeps an exact brigade click on the brigade even when a nearby sector hit exists', () => {
    const result = resolveDeckFormationClickTarget({
      deckObjectProperties: {
        id: 'vrs_herzegovina_brigade',
        location_osid: 'op:foca:donje_zesce',
      },
      nearbyFrontFeature: {
        properties: {
          sector_id: 'sector:vrs_herzegovina:0',
        },
      },
    });

    expect(result).toEqual({
      kind: 'formation',
      formationId: 'vrs_herzegovina_brigade',
    });
  });

  it('falls back to sector selection when no brigade was actually clicked', () => {
    const result = resolveDeckFormationClickTarget({
      deckObjectProperties: null,
      nearbyFrontFeature: {
        properties: {
          sector_id: 'sector:vrs_herzegovina:0',
        },
      },
    });

    expect(result).toEqual({
      kind: 'sector',
      sectorId: 'sector:vrs_herzegovina:0',
    });
  });

  it('uses the same deterministic icon size curve as the deck formation layer', () => {
    expect(getFormationIconScreenSize(6)).toEqual({ width: 32, height: 16 });
    expect(getFormationIconScreenSize(9)).toEqual({ width: 48, height: 24 });
    expect(getFormationIconScreenSize(14)).toEqual({ width: 80, height: 40 });
  });

  it('recovers a near-miss brigade click before sector or OSID fallback can own it', () => {
    const result = pickNearestFormationAtPoint({
      zoom: 9,
      point: { x: 128, y: 105 },
      formations: [
        {
          geometry: { type: 'Point', coordinates: [18, 44] },
          properties: { id: 'zeta_brigade', location_osid: 'op:test:zeta' },
        },
        {
          geometry: { type: 'Point', coordinates: [17, 43] },
          properties: { id: 'alpha_brigade', location_osid: 'op:test:alpha' },
        },
      ],
      project: ([lng]) => (lng === 17 ? { x: 100, y: 100 } : { x: 500, y: 500 }),
    });

    expect(result).toEqual({
      id: 'alpha_brigade',
      properties: { id: 'alpha_brigade', location_osid: 'op:test:alpha' },
    });
  });

  it('uses formation id order as the deterministic tie-breaker for fallback hits', () => {
    const result = pickNearestFormationAtPoint({
      zoom: 9,
      point: { x: 100, y: 100 },
      formations: [
        {
          geometry: { type: 'Point', coordinates: [18, 44] },
          properties: { id: 'zeta_brigade' },
        },
        {
          geometry: { type: 'Point', coordinates: [17, 43] },
          properties: { id: 'alpha_brigade' },
        },
      ],
      project: () => ({ x: 100, y: 100 }),
    });

    expect(result?.id).toBe('alpha_brigade');
  });

  it('matches fallback hit testing to rendered stack pixel offsets', () => {
    const result = pickNearestFormationAtPoint({
      zoom: 9,
      point: { x: 104, y: 94 },
      formations: [
        {
          geometry: { type: 'Point', coordinates: [17, 43] },
          properties: { id: 'alpha_brigade', stack_index: 0, stack_count: 3 },
        },
        {
          geometry: { type: 'Point', coordinates: [17, 43] },
          properties: { id: 'zeta_brigade', stack_index: 2, stack_count: 3 },
        },
      ],
      project: () => ({ x: 100, y: 100 }),
    });

    expect(result?.id).toBe('zeta_brigade');
  });

  it('MapContainer does not discard a resolved formation fallback when Deck has no object payload', () => {
    const source = readFileSync(resolve('src/ui/map/map/MapContainer.tsx'), 'utf8');

    expect(source).not.toContain("clickTarget.kind !== 'formation' || !info?.object?.properties");
    expect(source).toContain('const props = info?.object?.properties ?? formationFallback?.properties;');
  });
});
