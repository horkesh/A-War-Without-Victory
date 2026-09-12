/**
 * The pinned staff-map sheet: how bright it is, and how the geography is projected onto it.
 *
 * Pure and separate from the component for the same reason the marker ink is — this is the half
 * that can be proved. Design §5 of
 * `docs/plans/2026-09-10-warroom-whiteboard-date-and-corkboard-map-design.md`.
 *
 * Canonical owner: src/ui/map/components/warroom/warroomCorkSheet.ts
 */

import luminanceTable from '../../../warroom/assets/warroom_board_luminance.json';

type SurfaceTable = Record<string, Record<string, number>>;
const cork = (luminanceTable as { cork: SurfaceTable }).cork;
const boards = (luminanceTable as { boards: SurfaceTable }).boards;

/**
 * How brightly the room is lit, estimated from the whiteboard.
 *
 * Not a separate measurement: the whiteboard is the nearest thing in the scene to a constant-albedo
 * white card, so its measured L* moves with the illumination. Cork does not — the art uses light
 * cork in some HQs and dark cork in others, which is why cork alone cannot answer this.
 */
export function roomLight(faction: string | null | undefined, year: number): number {
  const value = faction ? boards[faction]?.[String(year)] : undefined;
  return typeof value === 'number' ? value : 48.8;
}

type BoxTable = Record<string, { left: number; top: number; width: number; height: number }>;
const corkBoxes = (luminanceTable as { cork_box: BoxTable }).cork_box;

export interface CorkBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * The painted corkboard, as fractions of the scene plate.
 *
 * NOT the `desk_map` hotspot rectangle, which is a click target and was authored to different
 * standards per faction: RBiH's is within 1% of the real cork, RS's is 9% short, and HRHB's is 15%
 * short in width and 35% short in height. Sizing the sheet from it gave the same overlay a visibly
 * different size in each HQ — the map filled the RBiH board and floated small on the HRHB one.
 * Measured from the art instead, by `tools/derive_warroom_board_luminance.cjs`.
 */
export function corkBox(faction: string | null | undefined): CorkBox | null {
  return (faction ? corkBoxes[faction] : undefined) ?? null;
}

/** Mid-tone fallback, so an unknown plate gets an unoptimised sheet rather than a glowing one. */
export const REFERENCE_CORK_LSTAR = 40;

export function corkLuminance(faction: string | null | undefined, year: number): number {
  const value = faction ? cork[faction]?.[String(year)] : undefined;
  return typeof value === 'number' ? value : REFERENCE_CORK_LSTAR;
}

// ── Sheet brightness ───────────────────────────────────────────────────────

/**
 * How far above the ROOM'S LIGHT the paper sits, in L*.
 *
 * THE CORK IS NOT A LIGHT METER, and deriving the sheet from it was wrong — measured, in the
 * captures. Paper has a near-fixed reflectance; cork does not, because the art uses different
 * cork. RS 1993 cork is L*59.5 and RBiH 1993 cork is L*28.1, but both rooms are lit: the RBiH wall
 * behind the board is bright cream. A constant lift over cork therefore produced a proper cream
 * sheet on RS (rgb(235,225,197)) and a dead grey card on RBiH (rgb(146,139,122)) — same rule, and
 * only one of them was paper.
 *
 * The WHITEBOARD is the better probe. It is a near-white, near-constant-albedo surface in every
 * plate, so its measured L* varies with the illumination rather than with the material. The sheet
 * is keyed to that instead, which still satisfies design §5 — "a sheet that gets dimmer as the HQ
 * gets dimmer" — while letting paper stay paper in a well-lit room with dark cork.
 *
 * 28 points is read off the plate that already looked right: RS 1993 board L*58.8 with a sheet at
 * roughly L*87.
 */
export const SHEET_LIFT_OVER_ROOM_LSTAR = 28;

/**
 * Minimum lift over the cork, whatever the room light says.
 *
 * The one thing the cork still decides: a sheet must read as lighter than the board it is pinned
 * to, or it stops being a sheet.
 */
export const MIN_SHEET_LIFT_OVER_CORK_LSTAR = 12;

/**
 * Hue of the paper. Only lightness is derived; the cast is fixed.
 *
 * Warmer and a little more saturated than the first pass ([236,226,198]), which read as a neutral
 * off-white once the lightness was keyed to the room. Staff paper of the period is manila-ish
 * stock, not bond.
 */
const SHEET_HUE_RGB: readonly [number, number, number] = [238, 222, 182];

/** The mottle laid over the paper: a warm blotch and a cooler one, in the paper's own family. */
const SHEET_MOTTLE_WARM_RGB: readonly [number, number, number] = [150, 116, 62];
const SHEET_MOTTLE_COOL_RGB: readonly [number, number, number] = [104, 108, 104];

function srgbToLinear(channel: number): number {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(linear: number): number {
  const clamped = Math.min(1, Math.max(0, linear));
  const s = clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055;
  return Math.round(s * 255);
}

function relativeLuminance(rgb: readonly [number, number, number]): number {
  return 0.2126 * srgbToLinear(rgb[0]) + 0.7152 * srgbToLinear(rgb[1]) + 0.0722 * srgbToLinear(rgb[2]);
}

export function lstarOf(rgb: readonly [number, number, number]): number {
  const y = relativeLuminance(rgb);
  const f = y > 0.008856 ? Math.cbrt(y) : 7.787 * y + 16 / 116;
  return 116 * f - 16;
}

function luminanceForLstar(lstar: number): number {
  const f = (lstar + 16) / 116;
  return f ** 3 > 0.008856 ? f ** 3 : (f - 16 / 116) / 7.787;
}

/** Scale an sRGB triple in linear light to hit a target L*, preserving its chromaticity. */
function atLstar(rgb: readonly [number, number, number], targetLstar: number): [number, number, number] {
  const anchor = relativeLuminance(rgb);
  const scale = anchor > 0 ? luminanceForLstar(Math.max(0, targetLstar)) / anchor : 0;
  return [
    linearToSrgb(srgbToLinear(rgb[0]) * scale),
    linearToSrgb(srgbToLinear(rgb[1]) * scale),
    linearToSrgb(srgbToLinear(rgb[2]) * scale),
  ];
}

export interface CorkSheet {
  /**
   * The complete paper surface: base gradient plus mottling plus edge shading, as a CSS
   * `background` value.
   *
   * TEXTURE WITHOUT REVIVING EITHER DEFECT. Design §5 allows "a faint fibre/fold texture or
   * nothing", but the two obvious ways to get one are both things this change deliberately
   * removed: `repeating-linear-gradient` was the ruled-notebook paper that showed through the old
   * seams, and `feTurbulence` was part of the wall-chart treatment. So the texture here is soft
   * irregular mottling — large, low-opacity radial blotches in the paper's own colour family,
   * plus a gentle darkening toward the edges because a sheet is never lit flat. No repeats, so no
   * pattern for the eye to lock onto, and no assets.
   */
  background: string;
  /** Paper colour, `rgb(r, g, b)`. */
  paper: string;
  /** A slightly darker shade of the same paper, for the sheet's own gradient. */
  paperShade: string;
  /** Ink for front lines on this sheet. */
  outlineInk: string;
  /**
   * Fill for the country's landmass.
   *
   * Only a few points darker than the paper. It has to give the country a silhouette without
   * reading as a drawn shape — the borders are gone, so this is all that says where the ground is.
   */
  landTint: string;
  /**
   * OPAQUE fill for the player's controlled territory.
   *
   * Opaque is the whole point. `factionInkColor` returns `rgba(..., 0.72)`, and with ~600 adjacent
   * municipality polygons the translucent fills double-blend along every shared edge — printing
   * the municipality mesh back onto the map as darker lines even with no stroke at all. Widening a
   * same-colour stroke to close the seams made it worse, which is what identified the alpha as the
   * cause. A solid fill has nothing to accumulate.
   */
  territoryInk: string;
  /** Faint blue-grey for the printed graticule. */
  graticuleInk: string;
  /** Pin head colours for this plate, already dimmed to the room. */
  pinHeads: string[];
  /** The shadow a pin head drops onto the paper. */
  pinShadow: string;
  /** Contact shadow under the sheet — tight and soft, never a drop shadow. */
  contactShadow: string;
  /** Measured cork lightness this sheet was derived against. */
  corkLstar: number;
  /** Resulting paper lightness. */
  sheetLstar: number;
}

/**
 * Faction hues for the controlled-territory fill, ALREADY MUTED TOWARD PAPER.
 *
 * Not `factionInkColor`'s values. Those are saturated — `rgba(165,45,45,0.72)` — and they only
 * ever appeared muted because the 0.72 alpha blended them with cream paper underneath. Dropping
 * the alpha to fix the seam mesh removed that blending too, and scaling the raw hue to the same
 * lightness produced a fire-engine red. These are approximately the blended results, so the fill
 * keeps the look the alpha used to give it without the accumulation that came with it.
 */
const FACTION_HUE_RGB: Record<string, readonly [number, number, number]> = {
  RS: [178, 96, 88],
  HRHB: [96, 124, 168],
  RBiH: [104, 150, 116],
};

export function corkSheet(faction: string | null | undefined, year: number): CorkSheet {
  const corkLstar = corkLuminance(faction, year);
  const roomLstar = roomLight(faction, year);
  // Clamped at 94: paper never becomes a light source, however bright the room.
  const sheetLstar = Math.min(94, Math.max(
    roomLstar + SHEET_LIFT_OVER_ROOM_LSTAR,
    corkLstar + MIN_SHEET_LIFT_OVER_CORK_LSTAR,
  ));
  const paper = atLstar(SHEET_HUE_RGB, sheetLstar);
  const shade = atLstar(SHEET_HUE_RGB, Math.max(0, sheetLstar - 7));

  // The mottle dims with the sheet, so a dark room does not get high-contrast blotches on dim
  // paper. Opacities are low on purpose: this should be felt rather than seen.
  const warm = atLstar(SHEET_MOTTLE_WARM_RGB, Math.max(0, sheetLstar - 22));
  const cool = atLstar(SHEET_MOTTLE_COOL_RGB, Math.max(0, sheetLstar - 16));
  const rgba = (c: [number, number, number], a: number): string => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

  const background = [
    // Irregular blotches, at sizes and positions that do not tile.
    `radial-gradient(ellipse 48% 62% at 19% 24%, ${rgba(warm, 0.07)}, transparent 62%)`,
    `radial-gradient(ellipse 38% 52% at 78% 33%, ${rgba(cool, 0.055)}, transparent 58%)`,
    `radial-gradient(ellipse 56% 44% at 62% 79%, ${rgba(warm, 0.05)}, transparent 60%)`,
    `radial-gradient(ellipse 30% 40% at 33% 68%, ${rgba(cool, 0.04)}, transparent 55%)`,
    // A sheet is never lit flat; the edges sit slightly in shadow.
    `radial-gradient(ellipse 74% 74% at 46% 44%, transparent 56%, ${rgba([0, 0, 0], 0.07)})`,
    `linear-gradient(148deg, rgb(${paper[0]}, ${paper[1]}, ${paper[2]}), rgb(${shade[0]}, ${shade[1]}, ${shade[2]}))`,
  ].join(', ');

  // Outline ink sits a fixed distance BELOW the paper, so it stays readable on a dim sheet instead
  // of being a constant near-black that goes muddy as the paper darkens.
  const ink = atLstar([70, 62, 50], Math.max(0, sheetLstar - 46));

  return {
    background,
    paper: `rgb(${paper[0]}, ${paper[1]}, ${paper[2]})`,
    paperShade: `rgb(${shade[0]}, ${shade[1]}, ${shade[2]})`,
    outlineInk: `rgb(${ink[0]}, ${ink[1]}, ${ink[2]})`,
    landTint: (() => {
      const land = atLstar([214, 205, 178], Math.max(0, sheetLstar - 9));
      return `rgb(${land[0]}, ${land[1]}, ${land[2]})`;
    })(),
    graticuleInk: (() => {
      const g = atLstar([96, 108, 124], Math.max(0, sheetLstar - 14));
      return `rgba(${g[0]}, ${g[1]}, ${g[2]}, 0.38)`;
    })(),
    // MATTE, NOT GLOSSY. The first pins were radial-gradient spheres with a bright off-centre
    // specular — a rendered ball sitting in a painted room, which is exactly the "tacked on"
    // reading this whole item is about. Real pin heads at this size are small flat discs of
    // coloured plastic. They are dimmed to the room like everything else on the sheet, so they
    // cannot glow in a dark HQ.
    pinHeads: [[150, 72, 60], [72, 92, 124], [86, 100, 70], [150, 72, 60]].map((hue) => {
      const head = atLstar(hue as [number, number, number], Math.max(0, sheetLstar - 26));
      return `rgb(${head[0]}, ${head[1]}, ${head[2]})`;
    }),
    pinShadow: `rgba(0, 0, 0, ${(0.14 + (corkLstar / 100) * 0.1).toFixed(3)})`,
    territoryInk: (() => {
      const hue = FACTION_HUE_RGB[faction ?? ''] ?? [110, 104, 92];
      const tint = atLstar(hue, Math.max(0, sheetLstar - 34));
      return `rgb(${tint[0]}, ${tint[1]}, ${tint[2]})`;
    })(),
    // Darker rooms swallow shadows; a fixed 0.46 black was part of the cut-out look.
    contactShadow: `rgba(0, 0, 0, ${(0.16 + (corkLstar / 100) * 0.14).toFixed(3)})`,
    corkLstar,
    sheetLstar: Math.round(sheetLstar * 10) / 10,
  };
}

// ── Projection ─────────────────────────────────────────────────────────────

/**
 * Mean latitude of Bosnia and Herzegovina, for the longitude correction below.
 *
 * BiH spans roughly 42.5°N to 45.3°N; 43.9° is the midpoint.
 */
export const BIH_MEAN_LATITUDE_DEGREES = 43.9;

/** cos(mean latitude) ≈ 0.72. */
export const LONGITUDE_SCALE = Math.cos((BIH_MEAN_LATITUDE_DEGREES * Math.PI) / 180);

export interface Projection {
  project: (point: [number, number]) => [number, number];
  /** viewBox width, in the projected units the paths are expressed in. */
  viewWidth: number;
  /** viewBox height. */
  viewHeight: number;
}

/**
 * Project lon/lat into a viewBox whose aspect matches the ground, not the numbers.
 *
 * THE BUG THIS FIXES. The old projector fitted raw lon/lat into a fixed 100x100 box. A degree of
 * longitude at 44°N is only ~0.72 of a degree of latitude on the ground, so BiH — about 1:1 in
 * reality — rendered at roughly 1.39:1, noticeably stretched east-west. Scaling longitude by
 * cos(mean latitude) before fitting is the whole correction.
 *
 * The viewBox is then DERIVED from the corrected extent rather than forced square. The square box
 * was the other half of the old defect: an opaque backing rect covered only the square inside a
 * ~1.85:1 board, so the sheet texture showed through in two side bands with hard vertical seams.
 * With the viewBox matching the geography and the paper drawn by the element underneath, there is
 * nothing to seam.
 */
export function makeProjection(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  marginPercent = 4,
): Projection {
  const rangeLon = Math.max(0.000001, bounds.maxX - bounds.minX) * LONGITUDE_SCALE;
  const rangeLat = Math.max(0.000001, bounds.maxY - bounds.minY);

  // The longer ground axis becomes 100 units, so path coordinates stay in a familiar range and the
  // shorter axis keeps its true proportion instead of being stretched to match.
  const scale = 100 / Math.max(rangeLon, rangeLat);
  const innerWidth = rangeLon * scale;
  const innerHeight = rangeLat * scale;

  // A uniform margin in the same units, so the sheet's blank border is equal on all four sides.
  const margin = (Math.max(0, marginPercent) / 100) * 100;

  const round = (value: number): number => Math.round(value * 1000) / 1000;

  return {
    viewWidth: round(innerWidth + margin * 2),
    viewHeight: round(innerHeight + margin * 2),
    project: ([lon, lat]: [number, number]): [number, number] => [
      round(margin + (lon - bounds.minX) * LONGITUDE_SCALE * scale),
      round(margin + (bounds.maxY - lat) * scale),
    ],
  };
}
