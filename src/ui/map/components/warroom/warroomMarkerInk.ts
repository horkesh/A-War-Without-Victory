/**
 * Marker ink and hand-jitter for the warroom whiteboard date.
 *
 * Pure, deterministic, and separate from the component on purpose — this is the half that has to
 * be provable. Design §4.2 of
 * `docs/plans/2026-09-10-warroom-whiteboard-date-and-corkboard-map-design.md` asks for writing that
 * reads as a hand rather than a font, and the obvious way to do that is random jitter. Random
 * jitter is banned: determinism is sacred across all of `src/`, not just sim code, and a
 * `Math.random()` here would also mean the date visibly redrew itself on every React re-render.
 *
 * So every jitter value is derived from a pure FNV-1a hash over `${turn}:${index}:${channel}`.
 * The same turn always produces the same scrawl; a new turn produces a different one, which is
 * correct — a person rewrote the board this week.
 *
 * Canonical owner: src/ui/map/components/warroom/warroomMarkerInk.ts
 */

import boardLuminanceTable from '../../../warroom/assets/warroom_board_luminance.json';

// ── Deterministic jitter ───────────────────────────────────────────────────

const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;

/** FNV-1a, 32-bit. Pure: same string in, same number out, forever. */
export function fnv1a(input: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

/** A hash mapped to [0, 1). */
function unitFor(seed: string): number {
  return fnv1a(seed) / 4294967296;
}

/** A hash mapped to [-1, 1). */
function signedFor(seed: string): number {
  return unitFor(seed) * 2 - 1;
}

/** Per-glyph jitter bounds, from design §4.2. */
export const MARKER_BASELINE_DRIFT_PX = 1.5;
export const MARKER_ROTATION_DEGREES = 2.5;
export const MARKER_OPACITY_MIN = 0.78;
export const MARKER_OPACITY_MAX = 0.95;

/** Whole-line tilt. People write slightly uphill, so this is negative. */
export const MARKER_LINE_TILT_DEGREES = -1.8;

export interface MarkerGlyphJitter {
  /** Vertical drift off the baseline, px at the plate's own scale. */
  baselineDriftPx: number;
  /** Per-glyph rotation, degrees. */
  rotationDegrees: number;
  /** Ink density for this glyph. */
  opacity: number;
}

/**
 * Jitter for one glyph of one turn's date.
 *
 * `salt` separates lines that are drawn at the same time — the live date and the ghost of last
 * week's — so they do not receive identical wobble and betray themselves as the same stamp.
 */
export function markerGlyphJitter(turn: number, index: number, salt = 'ink'): MarkerGlyphJitter {
  const key = `${turn}:${index}:${salt}`;
  // Rounded, because these land in inline styles. Unrounded floats would produce a different
  // style string on machines that print doubles differently, and the tests compare style strings.
  const round = (value: number, places: number): number => {
    const factor = 10 ** places;
    return Math.round(value * factor) / factor;
  };
  return {
    baselineDriftPx: round(signedFor(`${key}:dy`) * MARKER_BASELINE_DRIFT_PX, 2),
    rotationDegrees: round(signedFor(`${key}:rot`) * MARKER_ROTATION_DEGREES, 2),
    opacity: round(
      MARKER_OPACITY_MIN + unitFor(`${key}:alpha`) * (MARKER_OPACITY_MAX - MARKER_OPACITY_MIN),
      3,
    ),
  };
}

// ── Ink colour, derived from the room's light ──────────────────────────────

type BoardLuminanceBoards = Record<string, Record<string, number>>;
const boards = (boardLuminanceTable as { boards: BoardLuminanceBoards }).boards;

/**
 * The board this plate actually shows, in CIE L*.
 *
 * Falls back to the mid-tone reference plate rather than to white: an unknown faction or year
 * should produce ink that is merely unoptimised, not ink that is invisible.
 */
export const REFERENCE_BOARD_LSTAR = 48.8; // RBiH 1993 — the plate design §4.4 sampled.

export function boardLuminance(faction: string | null | undefined, year: number): number {
  const byYear = faction ? boards[faction] : undefined;
  const value = byYear?.[String(year)];
  return typeof value === 'number' ? value : REFERENCE_BOARD_LSTAR;
}

/**
 * Target lightness gap between board and ink.
 *
 * NOT a taste number. Design §4.4 calls the existing `rgba(21,35,58,0.88)` navy "a reasonable hue"
 * on RBiH 1993, and says colour was never the defect. That navy is L*13.63 and that board is
 * L*48.8, so the look the design signed off on is a gap of 35. Anchoring the target there means
 * the one plate judged acceptable is unchanged, and every other plate is moved to match it.
 *
 * That round-trips: feeding RBiH 1993 back through `markerInk` returns `rgb(21, 35, 59)` — the
 * original navy to within one 8-bit step. Only two plates fall short of the target, HRHB 1994
 * (gap 31) and HRHB 1995 (gap 24.5), and those are the dark-plate review list.
 */
export const TARGET_CONTRAST_LSTAR = 35;

/** The hue of the ink. Only its lightness is derived; the hue is the one design §4.4 kept. */
const INK_HUE_RGB: readonly [number, number, number] = [21, 35, 58];

function srgbChannelToLinear(channel: number): number {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function linearChannelToSrgb(linear: number): number {
  const clamped = Math.min(1, Math.max(0, linear));
  const s = clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055;
  return Math.round(s * 255);
}

function relativeLuminance(rgb: readonly [number, number, number]): number {
  return (
    0.2126 * srgbChannelToLinear(rgb[0])
    + 0.7152 * srgbChannelToLinear(rgb[1])
    + 0.0722 * srgbChannelToLinear(rgb[2])
  );
}

/** CIE L* (0–100) of an sRGB triple, D65. Same transform the generator script uses. */
export function lstarOf(rgb: readonly [number, number, number]): number {
  const y = relativeLuminance(rgb);
  const f = y > 0.008856 ? Math.cbrt(y) : 7.787 * y + 16 / 116;
  return 116 * f - 16;
}

function luminanceForLstar(lstar: number): number {
  const f = (lstar + 16) / 116;
  return f ** 3 > 0.008856 ? f ** 3 : (f - 16 / 116) / 7.787;
}

export interface MarkerInk {
  /** `rgb(r, g, b)` — opaque. Alpha is per-glyph, per design §4.2. */
  color: string;
  /** Board lightness this ink was derived against. */
  boardLstar: number;
  /** Lightness gap actually achieved. */
  contrastLstar: number;
  /** False where the board is too dark for the ink to reach TARGET_CONTRAST_LSTAR. */
  reachesTarget: boolean;
}

/**
 * Ink for a given plate.
 *
 * The hue is fixed and the lightness is scaled in linear light, which preserves the hue's
 * chromaticity instead of sliding it toward grey. Where the board is darker than the target gap,
 * the ink bottoms out at black and the gap is simply smaller — design §4.4's explicit decision to
 * accept lower contrast rather than invert to a light "chalk" ink, which would stop reading as a
 * marker. `reachesTarget` is false there, which is what the dark-plate review list is built from.
 */
export function markerInk(faction: string | null | undefined, year: number): MarkerInk {
  const boardLstar = boardLuminance(faction, year);
  const targetLstar = Math.max(0, boardLstar - TARGET_CONTRAST_LSTAR);

  const anchorLuminance = relativeLuminance(INK_HUE_RGB);
  const targetLuminance = luminanceForLstar(targetLstar);
  const scale = anchorLuminance > 0 ? targetLuminance / anchorLuminance : 0;

  const rgb: [number, number, number] = [
    linearChannelToSrgb(srgbChannelToLinear(INK_HUE_RGB[0]) * scale),
    linearChannelToSrgb(srgbChannelToLinear(INK_HUE_RGB[1]) * scale),
    linearChannelToSrgb(srgbChannelToLinear(INK_HUE_RGB[2]) * scale),
  ];

  const achieved = boardLstar - lstarOf(rgb);
  return {
    color: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
    boardLstar,
    contrastLstar: Math.round(achieved * 10) / 10,
    reachesTarget: boardLstar - TARGET_CONTRAST_LSTAR >= 0,
  };
}

/**
 * Plates where the board is too dark for the ink to reach target contrast.
 *
 * Design §4.4 requires these to be surfaced for owner review rather than silently accepted: if
 * they should be brighter, that is an art-side fix and art is generated externally.
 */
export function dimBoardPlates(): { faction: string; year: number; boardLstar: number }[] {
  const flagged: { faction: string; year: number; boardLstar: number }[] = [];
  for (const faction of Object.keys(boards).sort()) {
    for (const year of Object.keys(boards[faction]).sort()) {
      const boardLstar = boards[faction][year];
      if (boardLstar - TARGET_CONTRAST_LSTAR < 0) {
        flagged.push({ faction, year: Number(year), boardLstar });
      }
    }
  }
  return flagged;
}
