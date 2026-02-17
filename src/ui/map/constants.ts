/**
 * Standalone Tactical Map — constants and theme tokens.
 * Visual identity: 1990s NATO C2 ops center, dark navy, phosphor accents.
 * Imports canonical NATO tokens from src/map/nato_tokens.ts.
 */

import { NATO_TOKENS, factionFill } from '../../map/nato_tokens.js';

export { NATO_TOKENS };

/** Faction fill colors with alpha for map polygon overlay. Higher alpha for dark bg contrast. */
export const SIDE_COLORS: Record<string, string> = {
  RBiH: factionFill('RBiH', 0.65),
  RS: factionFill('RS', 0.65),
  HRHB: factionFill('HRHB', 0.65),
  null: 'rgba(60, 60, 70, 0.35)',
};

/** Solid faction colors for panel borders, badges, etc. */
export const SIDE_SOLID_COLORS: Record<string, string> = {
  RBiH: NATO_TOKENS.RBiH,
  RS: NATO_TOKENS.RS,
  HRHB: NATO_TOKENS.HRHB,
  null: 'rgb(80, 80, 90)',
};

/** Human-readable faction labels. */
export const SIDE_LABELS: Record<string, string> = {
  RBiH: 'RBiH (ARBiH)',
  RS: 'RS (VRS)',
  HRHB: 'HRHB (HVO)',
  null: 'Neutral',
};

/** Deterministic order for OOB sidebar and army strength display. */
export const FACTION_DISPLAY_ORDER: readonly string[] = ['RBiH', 'RS', 'HRHB'];

/** Ethnicity fill colors (1991 census majority) — same hue as factions for consistency. Keys lowercase. */
export const ETHNICITY_COLORS: Record<string, string> = {
  bosniak: factionFill('RBiH', 0.65),
  serb: factionFill('RS', 0.65),
  croat: factionFill('HRHB', 0.65),
  other: 'rgba(60, 60, 70, 0.35)',
};

/** Human-readable ethnicity labels for legend and tooltip. */
export const ETHNICITY_LABELS: Record<string, string> = {
  bosniak: 'Bosniak',
  serb: 'Serb',
  croat: 'Croat',
  other: 'Other',
};

/** Discrete zoom factors for the four named levels. */
export const ZOOM_FACTORS = [1, 2.5, 5, 8] as const;

/** Human-readable zoom level labels. */
export const ZOOM_LABELS = ['STRATEGIC', 'OPERATIONAL', 'TACTICAL', 'STAFF MAP'] as const;

/** Canvas padding in pixels at each edge. */
export const MAP_PADDING = 40;

/** Readiness state colors for panel UI (Material Design palette, higher contrast on dark panels). */
const PANEL_READINESS_COLORS: Record<string, string> = {
  active: '#4CAF50',
  forming: '#FFC107',
  overextended: '#FF9800',
  degraded: '#F44336',
};

/** Look up the panel readiness color for a given readiness string (defaults to degraded/red). */
export function panelReadinessColor(readiness: string): string {
  return PANEL_READINESS_COLORS[readiness] ?? PANEL_READINESS_COLORS.degraded;
}

/** Formation kind icons: inner symbol within NATO frame (infantry=bar, corps=XX, army=XXX, militia=triangle). */
export const FORMATION_KIND_SHAPES: Record<string, string> = {
  militia: 'triangle',
  brigade: 'square',
  territorial_defense: 'square',
  operational_group: 'diamond',
  corps_asset: 'xx',
  corps: 'xx',
  army_hq: 'xxx',
  og: 'diamond',
};

/** Formation kinds visible at each zoom level (STRATEGIC=corps only, OPERATIONAL=corps+brigades, TACTICAL=all). */
export const ZOOM_FORMATION_FILTER: Record<number, Set<string> | null> = {
  0: new Set(['corps', 'corps_asset', 'army_hq']),                  // strategic: corps + army level
  1: null,                                                         // operational: all
  2: null,                                                         // tactical: all
};

/** NATO-style formation marker: width and height by zoom (0=strategic, 1=operational, 2=tactical). Horizontal box: crest left, NATO symbol right. */
export const FORMATION_MARKER_SIZE: Readonly<{ w: number; h: number }[]> = [
  { w: 44, h: 30 },   // strategic
  { w: 54, h: 38 },   // operational
  { w: 66, h: 46 },   // tactical
] as const;

/** Base map layer colors — subdued for dark background, infrastructure barely visible. */
export const BASE_LAYER_COLORS = {
  boundary: 'rgba(100, 100, 120, 0.6)',
  river: NATO_TOKENS.hydrography,
  roadMSR: NATO_TOKENS.MSR,
  roadSecondary: NATO_TOKENS.secondaryRoad,
  controlRegionFill: 'rgba(60, 60, 80, 0.08)',
  controlRegionStroke: 'rgba(80, 80, 100, 0.25)',
} as const;

/** Line widths for base map features. */
export const BASE_LAYER_WIDTHS = {
  boundary: 2,
  river: 1.2,
  roadMSR: 1.5,
  roadSecondary: 0.6,
  controlRegion: 1,
} as const;

/** Pre-computed faction RGB triplets for arc rendering (avoids runtime regex). */
export const SIDE_RGB: Record<string, string> = {
  RBiH: '55, 140, 75',
  RS: '180, 50, 50',
  HRHB: '50, 110, 170',
  null: '80, 80, 90',
};

/** Dual defensive arc front line — faction-colored paired arcs with barbed-wire ticks. */
export const FRONT_LINE = {
  /** Bézier curve offset for organic feel (px). */
  curveOffset: 10,
  /** Pixel offset from geometric border toward faction territory. */
  arcOffset: 4,
  /** Arc line stroke width. */
  arcWidth: 1.5,
  /** Arc line alpha (applied to faction RGB). */
  arcAlpha: 0.7,
  /** Barb tick spacing along the arc (px). */
  barbSpacing: 10,
  /** Barb tick length — extends outward toward enemy (px). */
  barbLength: 4,
  /** Barb tick stroke width. */
  barbWidth: 1.0,
  /** Barb tick alpha (brighter than arc). */
  barbAlpha: 0.85,
  /** Glow width behind each arc for visibility on dark bg. */
  glowWidth: 5,
  /** Glow alpha (applied to faction RGB). */
  glowAlpha: 0.15,
  /** Skip sub-segments shorter than this (px). */
  minSubSegLen: 3,
} as const;

/** Brigade AoR highlight — faction fill + strong pencil crosshatch. */
export const AOR_HIGHLIGHT = {
  fillAlpha: 0.12,
  strokeWidth: 2,
  /** Crosshatch pattern (45° diagonal lines). */
  hatchSpacing: 5,
  hatchWidth: 1.5,
  hatchAlpha: 0.55,
} as const;

/** Minimap dimensions. */
export const MINIMAP = {
  width: 200,
  height: 150,
} as const;

/** Months for turn-to-date conversion. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Convert a turn number to a human-readable date string (phase-aware anchor). */
export function formatTurnDate(turn: number, phase = ''): string {
  const anchorMs = phase.toLowerCase() === 'phase_0'
    ? Date.UTC(1991, 8, 1)   // 1 Sep 1991
    : Date.UTC(1992, 3, 6);  // 6 Apr 1992 (phase_i / phase_ii / default)
  const dayMs = 24 * 60 * 60 * 1000;
  const d = new Date(anchorMs + Math.max(0, turn) * 7 * dayMs);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Deterministic hash for procedural visual effects (0..1). No Math.random(). */
export function detHash(x: number, y: number, seed = 0): number {
  let h = (seed * 2654435761) ^ (x * 73856093) ^ (y * 19349669);
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = (h >>> 16) ^ h;
  return (h & 0x7fffffff) / 0x7fffffff;
}
