/**
 * Standalone Tactical Map — constants and theme tokens.
 * Imports canonical NATO tokens from src/map/nato_tokens.ts.
 */

import { NATO_TOKENS, factionFill } from '../../map/nato_tokens.js';

export { NATO_TOKENS, factionFill };

/** Faction fill colors with alpha for map polygon overlay. */
export const SIDE_COLORS: Record<string, string> = {
  RBiH: factionFill('RBiH', 0.55),
  RS: factionFill('RS', 0.55),
  HRHB: factionFill('HRHB', 0.55),
  null: 'rgba(100, 100, 100, 0.3)',
};

/** Solid faction colors for panel borders, badges, etc. */
export const SIDE_SOLID_COLORS: Record<string, string> = {
  RBiH: NATO_TOKENS.RBiH,
  RS: NATO_TOKENS.RS,
  HRHB: NATO_TOKENS.HRHB,
  null: 'rgb(100, 100, 100)',
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
  bosniak: factionFill('RBiH', 0.55),
  serb: factionFill('RS', 0.55),
  croat: factionFill('HRHB', 0.55),
  other: 'rgba(100, 100, 100, 0.3)',
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

/** Readiness state colors for formation markers. */
export const READINESS_COLORS: Record<string, string> = {
  active: '#4CAF50',
  forming: '#FFC107',
  overextended: '#FF9800',
  degraded: '#F44336',
};

/** Formation kind icons: inner symbol within NATO frame (infantry=bar, corps=diamond, militia=triangle). */
export const FORMATION_KIND_SHAPES: Record<string, string> = {
  militia: 'triangle',
  brigade: 'square',
  territorial_defense: 'square',
  operational_group: 'diamond',
  corps_asset: 'diamond',
};

/** NATO-style formation marker: width and height by zoom (0=strategic, 1=operational, 2=tactical). 1.5:1 frame ratio. */
export const FORMATION_MARKER_SIZE: Readonly<{ w: number; h: number }[]> = [
  { w: 22, h: 16 },   // strategic
  { w: 28, h: 20 },   // operational
  { w: 34, h: 24 },   // tactical
] as const;

/** Hit-test radius for formation markers (pixels from marker center). Should comfortably contain the largest marker. */
export const FORMATION_HIT_RADIUS = 22;

/** Base map layer colors (from napkin: roads grey, rivers dusty blue). */
export const BASE_LAYER_COLORS = {
  boundary: '#333333',
  river: NATO_TOKENS.hydrography,
  roadMSR: NATO_TOKENS.MSR,
  roadSecondary: NATO_TOKENS.secondaryRoad,
  controlRegionFill: 'rgba(180, 170, 150, 0.03)',
  controlRegionStroke: 'rgba(80, 60, 40, 0.35)',
} as const;

/** Line widths for base map features. */
export const BASE_LAYER_WIDTHS = {
  boundary: 2,
  river: 1.5,
  roadMSR: 2,
  roadSecondary: 0.8,
  controlRegion: 1,
} as const;

/** Front line rendering. */
export const FRONT_LINE = {
  color: '#000000',
  width: 3,
  dash: [6, 4] as number[],
} as const;

/** Minimap dimensions. */
export const MINIMAP = {
  width: 180,
  height: 120,
} as const;

/** Settlement panel width. */
export const PANEL_WIDTH = 340;

/** Months for turn-to-date conversion. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Convert a turn number to a human-readable date string. */
export function formatTurnDate(turn: number): string {
  const start = new Date(1991, 8, 1); // Sep 1, 1991
  const d = new Date(start);
  d.setDate(d.getDate() + turn * 7);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
