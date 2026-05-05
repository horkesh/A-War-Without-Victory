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
