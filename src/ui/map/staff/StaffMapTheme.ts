/**
 * Staff Map — paper-map visual constants.
 * Parchment/cream aesthetic inspired by hand-drawn military maps.
 * All colors are deterministic; no randomness.
 */

// ─── Parchment Palette ─────────────────────────────
export const PARCHMENT = {
  base: '#f4e8c8',
  stain: '#d4c090',
  /** Fold crease shadow. */
  creaseShadow: 'rgba(80, 60, 30, 0.06)',
  /** Fold crease highlight (opposite side). */
  creaseHighlight: 'rgba(255, 245, 220, 0.04)',
} as const;

// ─── Ink Colors ────────────────────────────────────
export const INK = {
  dark: '#2a1a0a',
  medium: '#5a3a1a',
  light: '#8a6a3a',
  /** River/water blue. */
  water: '#2a5a7a',
  waterLight: '#6a9aba',
  /** Front line crimson. */
  front: '#8a1a1a',
  frontGlow: 'rgba(138, 26, 26, 0.3)',
  /** Pencil crosshatch for contested zones. */
  pencil: 'rgba(42, 26, 10, 0.06)',
} as const;

// ─── Faction Colors (desaturated for paper) ────────
export const PAPER_FACTION_COLORS: Record<string, { border: string; text: string; rgb: [number, number, number] }> = {
  RBiH: {
    border: 'rgba(60, 100, 60, 0.6)',
    text: '#3a5a3a',
    rgb: [60, 100, 60],
  },
  RS: {
    border: 'rgba(140, 50, 50, 0.6)',
    text: '#7a2a2a',
    rgb: [140, 50, 50],
  },
  HRHB: {
    border: 'rgba(50, 80, 120, 0.6)',
    text: '#2a4a6a',
    rgb: [50, 80, 120],
  },
};

export function paperFactionFill(faction: string | null, alpha = 0.12): string {
  const c = faction ? PAPER_FACTION_COLORS[faction] : null;
  if (!c) return `rgba(80, 70, 50, ${alpha})`;
  return `rgba(${c.rgb[0]}, ${c.rgb[1]}, ${c.rgb[2]}, ${alpha})`;
}

export function paperFactionBorder(faction: string | null): string {
  return (faction ? PAPER_FACTION_COLORS[faction]?.border : null) ?? 'rgba(80, 70, 50, 0.4)';
}

export function paperFactionText(faction: string | null): string {
  return (faction ? PAPER_FACTION_COLORS[faction]?.text : null) ?? INK.medium;
}

/** Get the raw RGB tuple for a faction (for custom alpha blending). */
export function paperFactionRgb(faction: string | null): [number, number, number] {
  return (faction ? PAPER_FACTION_COLORS[faction]?.rgb : null) ?? [80, 70, 50];
}

// ─── Typography ────────────────────────────────────
export const FONTS = {
  /** Serif for place names. */
  placeName: "'Palatino Linotype', 'Georgia', 'Times New Roman', serif",
  /** Monospace for military data (strength numbers, etc.). */
  data: "'IBM Plex Mono', 'Consolas', monospace",
} as const;

export const FONT_SIZES = {
  urbanCenter: 13,
  town: 10,
  /** Formation counter text. */
  counterName: 9,
  counterStrength: 11,
  counterPosture: 8,
  /** Decorations. */
  cartoucheTitle: 16,
  cartoucheSubtitle: 10,
  scaleBar: 9,
  compassLabel: 12,
  /** Margin annotations. */
  annotation: 8,
  /** Crest labels. */
  crestLabel: 7,
} as const;

// ─── Terrain Hatching ──────────────────────────────
export const TERRAIN = {
  /** Hatching line color. */
  hatchColor: 'rgba(90, 58, 26, 0.18)',
  /** Hatching line width. */
  hatchWidth: 0.7,
  /** Spacing thresholds by terrain_friction_index. */
  hatchSpacing: {
    none: 0.15,   // friction < 0.15: no hatching
    sparse: 8,    // friction 0.15-0.40: lines every 8px
    medium: 5,    // friction 0.40-0.70: lines every 5px
    dense: 3,     // friction 0.70+: lines every 3px
  },
  /** Elevation tinting colors (subtle, low alpha). */
  elevationTints: [
    { max: 400, color: 'rgba(160, 190, 140, 0.10)' },  // lowland green
    { max: 800, color: 'rgba(190, 170, 130, 0.08)' },   // neutral brown
    { max: 1200, color: 'rgba(170, 140, 100, 0.12)' },  // darker brown
    { max: Infinity, color: 'rgba(140, 110, 80, 0.15)' }, // mountain brown
  ],
  /** River crossing wash. */
  riverWashColor: 'rgba(74, 122, 154, 0.08)',
  riverWashThreshold: 0.3,
  /** Contour line thresholds (elevation in meters). */
  contourThresholds: [400, 800, 1200],
  contourColors: [
    'rgba(120, 100, 60, 0.15)',   // 400m — light brown
    'rgba(100, 80, 50, 0.20)',    // 800m — medium brown
    'rgba(80, 60, 40, 0.25)',     // 1200m — dark brown
  ],
  contourWidth: 0.5,
  contourDash: [4, 4] as number[],
} as const;

// ─── Roads ─────────────────────────────────────────
export const ROADS = {
  msrColor: INK.dark,
  msrWidth: 1.2,
  msrAlpha: 0.6,
  secondaryColor: INK.medium,
  secondaryWidth: 0.8,
  secondaryAlpha: 0.4,
} as const;

// ─── Rivers ────────────────────────────────────────
export const RIVERS = {
  color: INK.water,
  width: 1.5,
  bleedColor: INK.waterLight,
  bleedWidth: 4,
  bleedAlpha: 0.08,
} as const;

// ─── Front Lines ───────────────────────────────────
export const FRONT_LINES = {
  color: INK.front,
  width: 2.5,
  glowColor: INK.frontGlow,
  glowWidth: 6,
  /** Bézier curve offset for organic curves (perpendicular to segment direction). */
  curveOffset: 12,
  /** Barbed-wire barb tick spacing in pixels along the curve. */
  barbSpacing: 12,
  /** Barbed-wire barb tick length in pixels. */
  barbLength: 4,
  /** Barbed-wire barb tick width. */
  barbWidth: 1.5,
} as const;

// ─── Formation Counters ────────────────────────────
export const COUNTER = {
  width: 100,
  height: 60,
  bgColor: 'rgba(244, 232, 200, 0.92)',
  borderWidth: 2,
  cornerRadius: 3,
  /** Faction stripe width on left edge. */
  stripeWidth: 6,
  /** Cohesion bar dimensions. */
  cohesionBarWidth: 60,
  cohesionBarHeight: 4,
  /** Fatigue indicator. */
  fatigueColors: {
    low: '#3a7a3a',      // < 0.3
    medium: '#8a7a2a',   // 0.3-0.6
    high: '#8a2a2a',     // > 0.6
  },
  /** Posture badge colors. */
  postureColors: {
    defend: '#3a5a8a',
    probe: '#5a7a3a',
    attack: '#8a2a2a',
    elastic_defense: '#6a5a8a',
  } as Record<string, string>,
} as const;

// ─── Decorations ───────────────────────────────────
export const DECORATIONS = {
  /** Compass rose size in pixels. */
  compassSize: 60,
  /** Cartouche padding. */
  cartouchePadding: 12,
  /** Vignette inset from canvas edge. */
  vignetteInset: 40,
  /** Faction crest stamp (single, top-left). */
  crestHeight: 144,
  crestAlpha: 0.55,
  /** Slight CCW tilt for stamp feel (~3.4°). */
  crestRotation: -0.06,
  crestBorderColor: INK.medium,
  crestBorderWidth: 1.5,
} as const;

// ─── Contested Zones ──────────────────────────────
export const CONTESTED = {
  /** Pencil crosshatch color. */
  hatchColor: INK.pencil,
  /** Crosshatch line spacing in pixels. */
  hatchSpacing: 6,
  /** Crosshatch line width. */
  hatchWidth: 0.5,
  /** Minimum number of cross-faction neighbors to qualify. */
  minCrossFactionNeighbors: 2,
} as const;

// ─── Selection / Interaction ───────────────────────
export const SELECTION = {
  /** AoR fill when brigade selected. */
  aorFillAlpha: 0.15,
  /** AoR crosshatch pattern — strong pencil crossings. */
  aorHatchSpacing: 5,
  aorHatchWidth: 1.5,
  aorHatchAlpha: 0.55,
} as const;
