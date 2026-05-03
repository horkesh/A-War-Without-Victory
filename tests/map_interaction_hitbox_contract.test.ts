import { describe, expect, it } from 'vitest';

import {
  FRONT_SURFACE_HITBOX_WIDTHS,
  FRONT_SURFACE_VISIBLE_WIDTHS,
  INTERACTION_HITBOX_OPACITY,
  SECTOR_DEMARCATION_HITBOX_WIDTHS,
  SECTOR_DEMARCATION_VISIBLE_WIDTHS,
  toZoomWidthExpression,
} from '../src/ui/map/map/interactionLayerConfig.js';

describe('map interaction hitbox contract', () => {
  it('keeps interaction hit layers queryable instead of fully transparent', () => {
    expect(INTERACTION_HITBOX_OPACITY).toBeGreaterThan(0);
  });

  it('keeps front hitboxes wider than the visible front line at every zoom stop', () => {
    expect(FRONT_SURFACE_HITBOX_WIDTHS.z6).toBeGreaterThan(FRONT_SURFACE_VISIBLE_WIDTHS.z6);
    expect(FRONT_SURFACE_HITBOX_WIDTHS.z10).toBeGreaterThan(FRONT_SURFACE_VISIBLE_WIDTHS.z10);
    expect(FRONT_SURFACE_HITBOX_WIDTHS.z14).toBeGreaterThan(FRONT_SURFACE_VISIBLE_WIDTHS.z14);
  });

  it('keeps demarcation hitboxes wider than the visible demarcation at every zoom stop', () => {
    expect(SECTOR_DEMARCATION_HITBOX_WIDTHS.z6).toBeGreaterThan(SECTOR_DEMARCATION_VISIBLE_WIDTHS.z6);
    expect(SECTOR_DEMARCATION_HITBOX_WIDTHS.z10).toBeGreaterThan(SECTOR_DEMARCATION_VISIBLE_WIDTHS.z10);
    expect(SECTOR_DEMARCATION_HITBOX_WIDTHS.z14).toBeGreaterThan(SECTOR_DEMARCATION_VISIBLE_WIDTHS.z14);
  });

  it('serializes stable maplibre zoom expressions from the shared width config', () => {
    expect(toZoomWidthExpression(FRONT_SURFACE_HITBOX_WIDTHS)).toEqual([
      'interpolate',
      ['linear'],
      ['zoom'],
      6,
      FRONT_SURFACE_HITBOX_WIDTHS.z6,
      10,
      FRONT_SURFACE_HITBOX_WIDTHS.z10,
      14,
      FRONT_SURFACE_HITBOX_WIDTHS.z14,
    ]);
  });

});
