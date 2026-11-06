/**
 * mapPaperPalette — the period-cartographic palette of the tactical map.
 *
 * The base map reads as a printed 1990s staff map: linen paper, a light grey
 * relief, slate water, sepia roads, and three printed faction inks. Every
 * colour that `awwv_map_style.json` uses for its base layers is named here,
 * and `tests/ui/map_style_contract.test.ts` pins the style file to these
 * values so the two cannot drift apart. The counter painter
 * (`formationIcons.ts`), the Deck label builder and the map legend read the
 * same tokens, so one ink has one owner.
 *
 * Faction inks are a PROJECTION of the canonical `FACTION_GLOW_RGB` tuples
 * (`buildForceQualityOverlay.ts`): the same hue, pulled toward a dark
 * sepia so it prints on paper. No second literal faction table exists here.
 *
 * Pure data and pure functions: no Math.random, no Date.now, no DOM.
 *
 * Canonical owner: src/ui/map/map/mapPaperPalette.ts
 */
import { normalizeFactionId } from '../../../state/identity.js';
import { FACTION_GLOW_RGB } from '../layers/buildForceQualityOverlay';

export type Rgb = readonly [number, number, number];

/** The sepia every ink is pulled toward before it is printed on the paper. */
const SEPIA_INK: Rgb = [38, 28, 18];

/** Neutral ink for unknown or unowned ground, and for a counter of unknown faction. */
const NEUTRAL_INK: Rgb = [112, 102, 88];

/** Dark ink for map text. */
export const INK_TEXT_RGB: Rgb = [52, 38, 26];
/** Paper halo behind map text. */
export const PAPER_HALO_RGB: Rgb = [230, 220, 196];
/** Opaque paper halo behind every counter. */
export const COUNTER_HALO_RGB: Rgb = [235, 225, 205];

const INK_PULL = 0.3;
const BORDER_PULL = 0.55;
const CONTROL_WASH_ALPHA = 0.34;
const FRONT_GLOW_ALPHA = 0.85;

/** Mix `rgb` toward `SEPIA_INK` by `amount` (0 = unchanged, 1 = pure sepia). */
export function toInk(rgb: Rgb, amount: number): Rgb {
  const a = Math.max(0, Math.min(1, amount));
  return [
    Math.round(rgb[0] * (1 - a) + SEPIA_INK[0] * a),
    Math.round(rgb[1] * (1 - a) + SEPIA_INK[1] * a),
    Math.round(rgb[2] * (1 - a) + SEPIA_INK[2] * a),
  ];
}

export function rgbaString(rgb: Rgb, alpha: number): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function glowFor(faction: string | null | undefined): Rgb | undefined {
  return faction ? FACTION_GLOW_RGB[normalizeFactionId(faction)] : undefined;
}

/** Printed body ink of a faction, as it appears on counters and control washes. */
export function factionInk(faction: string | null | undefined): Rgb {
  const glow = glowFor(faction);
  return glow ? toInk(glow, INK_PULL) : NEUTRAL_INK;
}

/** Darker edge ink of a faction, for counter borders. */
export function factionBorderInk(faction: string | null | undefined): Rgb {
  const glow = glowFor(faction);
  return glow ? toInk(glow, BORDER_PULL) : toInk(NEUTRAL_INK, 0.4);
}

/**
 * Named colours of the base map. Keys are stable identifiers used by the
 * style contract test; values are the exact strings written in the style.
 */
export const MAP_PAPER_PALETTE = Object.freeze({
  paper: '#e6dcc3',
  paperEarth: '#d9ceb3',
  paperHalo: rgbaString(PAPER_HALO_RGB, 0.9),
  inkText: rgbaString(INK_TEXT_RGB, 0.9),
  inkTextSoft: 'rgba(72, 58, 44, 0.75)',
  water: '#8fa6ad',
  waterway: '#6f8a94',
  forest: '#a9b48a',
  roadMajor: 'rgba(92, 70, 48, 0.55)',
  roadSecondary: 'rgba(92, 70, 48, 0.32)',
  frontInk: '#2b241e',
  frontPaperTick: '#e6dcc3',
  frontUnderstroke: 'rgba(92, 70, 48, 0.35)',
  controlRS: rgbaString(factionInk('RS'), CONTROL_WASH_ALPHA),
  controlRBiH: rgbaString(factionInk('RBiH'), CONTROL_WASH_ALPHA),
  controlHRHB: rgbaString(factionInk('HRHB'), CONTROL_WASH_ALPHA),
  controlNeutral: rgbaString(NEUTRAL_INK, 0.18),
  glowRS: rgbaString(factionInk('RS'), FRONT_GLOW_ALPHA),
  glowRBiH: rgbaString(factionInk('RBiH'), FRONT_GLOW_ALPHA),
  glowHRHB: rgbaString(factionInk('HRHB'), FRONT_GLOW_ALPHA),
  glowNeutral: rgbaString(NEUTRAL_INK, 0.4),
  haloAlarm: 'rgba(196, 84, 70, 0.95)',
  fog: 'rgba(40, 30, 20, 0.38)',
});

/** Relief raster paint: light, low-contrast, so the paper shows through. */
export const HILLSHADE_PAINT = Object.freeze({
  'raster-opacity': 0.42,
  'raster-contrast': -0.25,
  'raster-brightness-min': 0.18,
  'raster-brightness-max': 0.98,
  'raster-saturation': -1,
});

/** Counter print inks, read by the counter painter and the map legend. */
export const COUNTER_PRINT = Object.freeze({
  haloFill: rgbaString(COUNTER_HALO_RGB, 0.98),
  haloBorder: 'rgba(18, 14, 10, 0.72)',
  symbol: 'rgba(240, 232, 214, 1)',
  bevelLight: 'rgba(255, 250, 238, 0.22)',
  bevelShade: 'rgba(20, 14, 8, 0.28)',
  barTrack: 'rgba(20, 14, 8, 0.45)',
  strengthBar: 'rgba(236, 226, 206, 0.95)',
  strengthBarLow: 'rgba(196, 84, 70, 0.95)',
  moraleBar: 'rgba(214, 178, 94, 0.95)',
  formingFill: 'rgba(104, 108, 112, 1)',
  formingBorder: 'rgba(54, 58, 62, 1)',
});
