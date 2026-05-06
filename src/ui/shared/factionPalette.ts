/**
 * Faction Palette — single canonical source-of-truth for faction colors across
 * every UI shell (React tactical map, vanilla-TS Warroom, Army HQ, Codex,
 * deck.gl tactical layers).
 *
 * ─── Authority ─────────────────────────────────────────────────────────────
 * The canonical RGB tuples live in
 * `src/ui/map/layers/buildForceQualityOverlay.ts` (Wave 8 Lane D — Force-Quality
 * Glow). They are byte-stable: the four shipped Phase-3 deck.gl features
 * (Map-That-Scars / Force-Quality Glow / Refugee Column / Corridor Heartbeat)
 * have all validated their T1..T8 gates against those exact tuples. Any change
 * to the values would re-open shipped features.
 *
 * This module re-exports those tuples and exposes derived projections (hex,
 * `rgb()` string, `rgba()` string, `{primary, dim, bg}` accent triple) so other
 * shells can canonicalize without duplicating literal RGB values.
 *
 * ─── Faction-symmetric mechanism ──────────────────────────────────────────
 * Every faction enters the same lookup code path:
 *
 *     factionGlowRgb(faction)  →  [r,g,b]
 *     factionHex(faction)      →  '#rrggbb'
 *     factionRgbString(f)      →  'rgb(r,g,b)'
 *     factionRgbaString(f, a)  →  'rgba(r,g,b,a)'
 *     factionAccentTriple(f)   →  { primary, dim, bg }
 *
 * There is NO `if (faction === 'X')` branching anywhere in this module. The
 * palette table is data, not logic. Faction asymmetry of color VALUES is
 * canonical (RS=red / RBiH=green / HRHB=blue per the established symbology);
 * only the LOOKUP MECHANISM is symmetric. This matches the Wave 8 Lane D
 * pattern enshrined in `buildForceQualityOverlay.ts` and validated by
 * `tests/force_quality_overlay_builder.test.ts` T5.
 *
 * Determinism: pure functions; no Math.random, no Date.now, no closures over
 * mutable state.
 */
import {
  FACTION_GLOW_RGB,
  factionGlowRgb,
} from '../map/layers/buildForceQualityOverlay';

/** Re-export the canonical RGB table (Object.frozen tuples). */
export { FACTION_GLOW_RGB, factionGlowRgb };

/** Default RGB for unknown / null faction (faction-neutral grey). */
const DEFAULT_RGB: readonly [number, number, number] = [160, 160, 160];

/** Convert a 0–255 channel to two hex digits. */
function hex2(n: number): string {
  const v = Math.max(0, Math.min(255, Math.round(n)));
  const s = v.toString(16);
  return s.length === 1 ? '0' + s : s;
}

/**
 * Hex color string for a faction: `'#rrggbb'`. Derived from the canonical
 * `FACTION_GLOW_RGB` tuple — never a separately-maintained literal.
 */
export function factionHex(faction: string): string {
  const rgb = FACTION_GLOW_RGB[faction] ?? DEFAULT_RGB;
  return '#' + hex2(rgb[0]) + hex2(rgb[1]) + hex2(rgb[2]);
}

/**
 * CSS `rgb()` string for a faction. Derived from canonical
 * `FACTION_GLOW_RGB`; useful for inline `style="background:..."`.
 */
export function factionRgbString(faction: string): string {
  const rgb = FACTION_GLOW_RGB[faction] ?? DEFAULT_RGB;
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

/**
 * CSS `rgba()` string for a faction with the given alpha (0..1).
 * Derived from canonical `FACTION_GLOW_RGB`.
 */
export function factionRgbaString(faction: string, alpha: number): string {
  const rgb = FACTION_GLOW_RGB[faction] ?? DEFAULT_RGB;
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;
}

/** Accent triple shape used by the Warroom modals. */
export interface FactionAccentTriple {
  primary: string;
  dim: string;
  bg: string;
}

/**
 * Accent triple for Warroom-shell modals: solid `primary`, 30%-opacity `dim`,
 * 8%-opacity `bg`. Derived from the canonical `FACTION_GLOW_RGB` table —
 * never a separately-maintained literal palette.
 *
 * Replaces `src/ui/warroom/components/warroom_utils.ts` `FACTION_COLORS`.
 */
export function factionAccentTriple(faction: string): FactionAccentTriple {
  return {
    primary: factionRgbString(faction),
    dim: factionRgbaString(faction, 0.3),
    bg: factionRgbaString(faction, 0.08),
  };
}

/**
 * ─── A11y: Colorblind palette presets (LANE-NIGHTSHIFT-V093-A11Y-LANE-D) ──
 *
 * Additive — preserves the canonical Wave 8 Lane D RGB tuples byte-identical
 * for the `'default'` preset. The three colorblind-safe presets use
 * Okabe-Ito-derived hues chosen for pairwise distinguishability under the
 * three common color-vision deficiencies. Selection is a UI-preference-only
 * setting (persisted in localStorage by SettingsScreen), not in the
 * save-game schema; deck.gl/Force-Quality/Map-That-Scars tactical layers
 * continue to read from the canonical FACTION_GLOW_RGB table directly,
 * so the four shipped Phase-3 visual gates do NOT regress regardless of
 * preset choice.
 *
 * Faction-symmetric mechanism: every preset is a flat record keyed by the
 * three canonical faction IDs. There is no `if (faction === 'X')` branching
 * — the lookup is identical to the canonical path.
 *
 * Determinism: pure data; no Math.random, no Date.now, no closures.
 */
export type ColorblindPreset =
  | 'default'
  | 'deuteranopia'
  | 'protanopia'
  | 'tritanopia';

export const COLORBLIND_PRESETS: ReadonlyArray<ColorblindPreset> = [
  'default',
  'deuteranopia',
  'protanopia',
  'tritanopia',
];

/**
 * Frozen map of preset → faction → RGB tuple. The `'default'` row is the
 * canonical Wave 8 Lane D table re-stated locally (not re-imported, to keep
 * this projection self-contained for the byte-stability test). Test
 * `tests/v093_a11y_lane_d_contrast_reduced_motion.test.ts` pins both the
 * default-row byte-stability AND the parity with `FACTION_GLOW_RGB`.
 */
export const FACTION_COLORBLIND_PALETTES: Readonly<
  Record<ColorblindPreset, Readonly<Record<string, readonly [number, number, number]>>>
> = Object.freeze({
  default: Object.freeze({
    RS: Object.freeze([200, 70, 70]) as readonly [number, number, number],
    RBiH: Object.freeze([70, 165, 90]) as readonly [number, number, number],
    HRHB: Object.freeze([70, 130, 200]) as readonly [number, number, number],
  }),
  // Okabe-Ito vermillion / blue / yellow — green-blind safe.
  deuteranopia: Object.freeze({
    RS: Object.freeze([213, 94, 0]) as readonly [number, number, number],
    RBiH: Object.freeze([0, 114, 178]) as readonly [number, number, number],
    HRHB: Object.freeze([240, 228, 66]) as readonly [number, number, number],
  }),
  // Okabe-Ito orange / sky-blue / bluish-green — red-blind safe.
  protanopia: Object.freeze({
    RS: Object.freeze([230, 159, 0]) as readonly [number, number, number],
    RBiH: Object.freeze([86, 180, 233]) as readonly [number, number, number],
    HRHB: Object.freeze([0, 158, 115]) as readonly [number, number, number],
  }),
  // Reddish-purple / light-cyan / dark-navy — blue-blind safe; chosen for
  // wide luminance spread (≥8:1 brightest:darkest) so the three factions
  // remain distinguishable on a monochrome readout under tritanopia.
  tritanopia: Object.freeze({
    RS: Object.freeze([204, 121, 167]) as readonly [number, number, number],
    RBiH: Object.freeze([129, 212, 229]) as readonly [number, number, number],
    HRHB: Object.freeze([39, 38, 93]) as readonly [number, number, number],
  }),
});

/**
 * Lookup the preset RGB for a faction. Returns the canonical
 * `FACTION_GLOW_RGB` value when preset is `'default'` (or unknown), so any
 * call site that opts in via this function continues to render the canonical
 * palette by default. UI-preference-only; not consumed by sim/visual-layer
 * paths.
 */
export function colorblindFactionRgb(
  preset: ColorblindPreset,
  faction: string,
): readonly [number, number, number] {
  const row = FACTION_COLORBLIND_PALETTES[preset] ?? FACTION_COLORBLIND_PALETTES.default;
  return row[faction] ?? FACTION_GLOW_RGB[faction] ?? DEFAULT_RGB;
}

/**
 * localStorage key for the colorblind preset (UI preference only — not in
 * save schema). Read by SettingsScreen on mount, written on toggle.
 */
export const COLORBLIND_PRESET_STORAGE_KEY = 'awwv.a11y.colorblindPreset';

/**
 * localStorage key for the in-game reduce-motion toggle (UI preference only).
 * Co-located here so all Lane D persistence keys are discoverable from one
 * file; consumed by SettingsScreen + globals.css `.user-reduce-motion` class.
 */
export const REDUCE_MOTION_STORAGE_KEY = 'awwv.a11y.reduceMotion';
