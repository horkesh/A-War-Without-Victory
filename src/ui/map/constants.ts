/**
 * Standalone Tactical Map — constants and theme tokens.
 * Visual identity: 1990s NATO C2 ops center, dark navy, phosphor accents.
 * Imports canonical NATO tokens from src/map/nato_tokens.ts.
 */

import { NATO_TOKENS, factionFill } from '../../map/nato_tokens.js';

export { NATO_TOKENS, factionFill };

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

/** Discrete zoom factors for the three named levels. */
export const ZOOM_FACTORS = [1, 2.5, 5] as const;

/** Human-readable zoom level labels. */
export const ZOOM_LABELS = ['STRATEGIC', 'OPERATIONAL', 'TACTICAL'] as const;

/** Zoom interaction constants. */
export const ZOOM_SNAP_IDLE_MS = 300;
export const ZOOM_WHEEL_SENSITIVITY = 0.0015;

/** Canvas padding in pixels at each edge. */
export const MAP_PADDING = 40;

/** Readiness state colors for formation markers (phosphor-accented). */
export const READINESS_COLORS: Record<string, string> = {
  active: '#00ff88',
  forming: '#ffab00',
  overextended: '#FF9800',
  degraded: '#ff3d00',
};

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

/** Formation kind icons: inner symbol within NATO frame (infantry=bar, corps=XX, militia=triangle). */
export const FORMATION_KIND_SHAPES: Record<string, string> = {
  militia: 'triangle',
  brigade: 'square',
  territorial_defense: 'square',
  operational_group: 'diamond',
  corps_asset: 'xx',
  corps: 'xx',
  og: 'diamond',
};

/** Formation kinds visible at each zoom level (STRATEGIC=corps only, OPERATIONAL=corps+brigades, TACTICAL=all). */
export const ZOOM_FORMATION_FILTER: Record<number, Set<string> | null> = {
  0: new Set(['corps', 'corps_asset']),                            // strategic: corps-level only
  1: null,                                                         // operational: all
  2: null,                                                         // tactical: all
};

/** NATO-style formation marker: width and height by zoom (0=strategic, 1=operational, 2=tactical). Horizontal box: crest left, NATO symbol right. */
export const FORMATION_MARKER_SIZE: Readonly<{ w: number; h: number }[]> = [
  { w: 34, h: 24 },   // strategic
  { w: 42, h: 30 },   // operational
  { w: 52, h: 36 },   // tactical
] as const;

/** Hit-test radius for formation markers (pixels from marker center). Should comfortably contain the largest marker. */
export const FORMATION_HIT_RADIUS = 28;

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

/** Front line rendering — bright white/faction glow on dark background. */
export const FRONT_LINE = {
  color: 'rgba(255, 255, 255, 0.85)',
  width: 2.5,
  dash: [8, 4] as number[],
  /** Glow effect: drawn as wider semi-transparent line behind the main line. */
  glowColor: 'rgba(255, 200, 100, 0.25)',
  glowWidth: 6,
} as const;

/** Brigade AoR highlight — smooth unified region with breathing glow. */
export const AOR_HIGHLIGHT = {
  fillAlpha: 0.15,
  strokeWidth: 2.5,
  glowBlurMin: 2,
  glowBlurMax: 6,
  glowCycleMs: 2000,
} as const;

/** Minimap dimensions. */
export const MINIMAP = {
  width: 200,
  height: 150,
} as const;

/** Settlement panel width. */
export const PANEL_WIDTH = 340;

/** Settlement border colors for the dark map. */
export const SETTLEMENT_BORDER = {
  /** Borders between same-faction settlements — barely visible grid. */
  sameColor: 'rgba(60, 60, 80, 0.3)',
  sameWidth: 0.4,
  /** Borders between different-faction settlements — bright faction boundary. */
  diffColor: 'rgba(255, 255, 255, 0.7)',
  diffWidth: 2,
} as const;

/** Months for turn-to-date conversion. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Convert a turn number to a human-readable date string. */
export function formatTurnDate(turn: number): string {
  const start = new Date(1991, 8, 1); // Sep 1, 1991
  const d = new Date(start);
  d.setDate(d.getDate() + turn * 7);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
