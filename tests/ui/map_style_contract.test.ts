/**
 * Map style contract — the tactical map's base layers read as a printed staff
 * map, and the style file cannot drift from `mapPaperPalette.ts`.
 *
 * Pins:
 *   1. base layer order: paper → relief → water → forest → rivers → roads →
 *      control wash → fronts → borders → counters → labels;
 *   2. every colour literal in a base layer is a named palette value;
 *   3. the relief raster stays light enough for the paper to show through;
 *   4. glyphs are served locally and no remote URL enters the style.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  HILLSHADE_PAINT,
  MAP_PAPER_PALETTE,
  factionInk,
  toInk,
} from '../../src/ui/map/map/mapPaperPalette.js';

interface StyleLayer {
  id: string;
  type: string;
  paint?: Record<string, unknown>;
  layout?: Record<string, unknown>;
}

const stylePath = resolve(__dirname, '../../src/ui/map/map/awwv_map_style.json');
const styleText = readFileSync(stylePath, 'utf8');
const style = JSON.parse(styleText) as { glyphs?: string; sprite?: string; layers: StyleLayer[] };
const layerIndex = (id: string): number => style.layers.findIndex((layer) => layer.id === id);

/** Layers whose colours must all come from the palette. */
const BASE_LAYER_IDS = [
  'background',
  'earth-fill',
  'water-polygons',
  'forest',
  'waterway-lines',
  'roads-major',
  'roads-secondary',
  'osid-control-fill',
  'faction-border-glow-pos',
  'faction-border-glow-neg',
  'front-line-understroke',
  'front-line-base',
  'front-line-stripe',
  'formation-labels',
  'place-labels-city',
  'place-labels-village',
] as const;

const COLOUR_PROPS = new Set([
  'background-color',
  'fill-color',
  'line-color',
  'text-color',
  'text-halo-color',
  'icon-color',
]);

const COLOUR_RE = /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\()/i;

function collectColourLiterals(value: unknown, out: string[]): void {
  if (typeof value === 'string') {
    if (COLOUR_RE.test(value)) out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectColourLiterals(item, out);
  }
}

describe('tactical map style contract', () => {
  it('keeps the printed-map layer order', () => {
    const order = [
      'background',
      'earth-fill',
      'hillshade',
      'water-polygons',
      'forest',
      'waterway-lines',
      'roads-major',
      'roads-secondary',
      'osid-control-fill',
      'faction-border-glow-pos',
      'front-line-understroke',
      'front-line-base',
      'front-line-stripe',
      'mun-borders',
      'formation-markers',
      'formation-labels',
      'place-labels-city',
      'place-labels-village',
    ];
    const indices = order.map(layerIndex);
    for (const [i, id] of order.entries()) {
      expect(indices[i], `layer ${id} is missing`).toBeGreaterThanOrEqual(0);
      if (i > 0) expect(indices[i], `${id} must come after ${order[i - 1]}`).toBeGreaterThan(indices[i - 1]);
    }
  });

  it('paints every base layer only with named palette inks', () => {
    const palette = new Set<string>(Object.values(MAP_PAPER_PALETTE));
    for (const id of BASE_LAYER_IDS) {
      const layer = style.layers[layerIndex(id)];
      expect(layer, `layer ${id} is missing`).toBeDefined();
      const literals: string[] = [];
      for (const [prop, value] of Object.entries(layer.paint ?? {})) {
        if (COLOUR_PROPS.has(prop)) collectColourLiterals(value, literals);
      }
      expect(literals.length, `layer ${id} declares no colour`).toBeGreaterThan(0);
      for (const literal of literals) {
        expect(palette.has(literal), `layer ${id} uses an unnamed colour ${literal}`).toBe(true);
      }
    }
  });

  it('keeps the relief light enough for the paper to show through', () => {
    const hillshade = style.layers[layerIndex('hillshade')];
    expect(hillshade.paint).toMatchObject(HILLSHADE_PAINT);
    expect(HILLSHADE_PAINT['raster-opacity']).toBeLessThanOrEqual(0.5);
  });

  it('serves glyphs locally and introduces no remote URL', () => {
    expect(style.glyphs?.startsWith('/font/')).toBe(true);
    expect(style.sprite).toBeUndefined();
    expect(styleText).not.toMatch(/https?:\/\//);
  });

  it('prints faction inks as sepia-pulled projections of the canonical palette', () => {
    expect(toInk([200, 70, 70], 0)).toEqual([200, 70, 70]);
    expect(toInk([200, 70, 70], 1)).toEqual([38, 28, 18]);
    const rs = factionInk('RS');
    const rbih = factionInk('RBiH');
    const hrhb = factionInk('HRHB');
    expect(rs[0]).toBeGreaterThan(rs[1]);
    expect(rbih[1]).toBeGreaterThan(rbih[0]);
    expect(hrhb[2]).toBeGreaterThan(hrhb[0]);
    expect(factionInk('VRS')).toEqual(rs);
    expect(factionInk(null)).toEqual(factionInk('not-a-faction'));
  });
});
