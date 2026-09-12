/**
 * WarroomShellLayer — React foundation for Warroom shell ownership.
 *
 * Renders the faction-appropriate scene plate as a background image and
 * overlays hotspot regions from the regions JSON as absolutely-positioned
 * React elements. Activated by `?view=warroom` in the React app URL.
 *
 * Runtime owner for the loaded-game Warroom room shell when warroom.ts loads
 * the tactical iframe with `?view=warroom`. warroom.ts still owns the outer
 * host window, iframe lifecycle, and legacy desk fallback for non-shell scenes.
 *
 * Canonical owner: src/ui/map/components/warroom/WarroomShellLayer.tsx
 */

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { Feature, FeatureCollection, Geometry, LineString, MultiPolygon, Polygon } from 'geojson';
import { getPlayerFacingFaction } from '../../../shared/playerFacingLabels';
import { loadOperationalSettlements } from '../../data/DataLoader';
import type { LoadedGameState } from '../../data/types';
import { buildControlGeoJSON } from '../../map/builders/buildControlGeoJSON';
import { buildFrontLinesGeoJSON } from '../../map/builders/buildFrontLinesGeoJSON';
import { useGameStore } from '../../store/gameStore';
import { formatTurnLabel, turnToDateString } from '../../utils/formatters';
import {
  WARROOM_ROUTE_ENTRIES,
  commandForWarroomRegion,
  commandForWarroomRoute,
  type WarroomNavigationCommand,
} from '../../utils/warroomNavigation';
import { t } from '../../i18n';
import { WARROOM_SCENE_URLS, type WarroomSceneYear } from './warroom-asset-urls';
import {
  WARROOM_SCENE_ASPECT,
  WARROOM_SCENE_HEIGHT,
  WARROOM_SCENE_WIDTH,
  WarroomScenePlate,
} from './WarroomScenePlate';
import {
  MARKER_LINE_TILT_DEGREES,
  markerGlyphJitter,
  markerInk,
} from './warroomMarkerInk';
import { corkBox, corkSheet, makeProjection } from './warroomCorkSheet';
import fallbackRbihRegions from '../../../warroom/assets/hq_rbih_regions.json';
import fallbackRsRegions from '../../../warroom/assets/hq_rs_regions.json';
import fallbackHrhbRegions from '../../../warroom/assets/hq_hrhb_regions.json';

// ── Region types (subset of regions JSON schema v2.1) ──────────────────────

interface WarroomRegionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface WarroomRegion {
  id: string;
  type?: string;
  bounds: WarroomRegionBounds;
  polygon?: [number, number][];
  tooltip?: string;
}

interface WarroomRegionManifestRegion {
  id: string;
  type?: string;
  bounds: WarroomRegionBounds;
  polygon?: number[][];
  tooltip?: string;
}

interface WarroomRegionManifest {
  regions: WarroomRegionManifestRegion[];
}

interface WarroomMapOverlayModel {
  outlinePaths: string[];
  territoryPaths: string[];
  frontLinePaths: string[];
  /**
   * The viewBox the paths were projected into, derived from the ground shape of the country.
   *
   * Carried on the model rather than fixed at `0 0 100 100` in the SVG, because the correct aspect
   * is a property of the projection and only the projection knows it.
   */
  viewWidth: number;
  viewHeight: number;
  /**
   * Whole-degree meridians and parallels, spanning the ENTIRE sheet rather than just the country.
   *
   * A staff map is printed paper, and the print does not stop where the land does. Running the
   * graticule edge to edge is also what gives the blank margins either side something to be: the
   * country is roughly square and the sheet is not, so those bands are unavoidable, and empty
   * paper reads as an oversight where ruled paper reads as a map.
   */
  graticulePaths: string[];
}

// Authoring canvas dimensions (schema v2.1)
const CANVAS_W = WARROOM_SCENE_WIDTH;
const CANVAS_H = WARROOM_SCENE_HEIGHT;

// ── Region → Warroom navigation mapping ────────────────────────────────────

/**
 * Maps a Warroom region ID to the corresponding Warroom navigation command.
 * Cross-shell commands stay on the shared shell handoff path. Warroom-local
 * overlay commands stay inside the React shell and never enter the shared
 * handoff union.
 *
 * War Map regions use an explicit local command; unknown regions are a no-op.
 * All other known hotspots are explicitly mapped by the shared route table.
 *
 * Exported for unit testing.
 */
export function regionToShellHandoff(regionId: string): WarroomNavigationCommand | undefined {
  return commandForWarroomRegion(regionId);
}

// ── Hotspot overlay ────────────────────────────────────────────────────────

interface WarroomHotspotProps {
  region: WarroomRegion;
  onClick: () => void;
}

function humanizeRegionId(id: string): string {
  return id
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getWarroomRegionLabel(region: Pick<WarroomRegion, 'id' | 'tooltip'>): string {
  return region.tooltip?.trim() || humanizeRegionId(region.id);
}

export function getWarroomRegionClipPath(region: WarroomRegion): string | undefined {
  if (!region.polygon || region.polygon.length < 3) return undefined;

  const { bounds } = region;
  const points = region.polygon.map(([x, y]) => {
    const localX = ((x - bounds.x) / bounds.width) * 100;
    const localY = ((y - bounds.y) / bounds.height) * 100;
    return `${localX}% ${localY}%`;
  });

  return `polygon(${points.join(', ')})`;
}

function getWarroomRegionBoxStyle(region: WarroomRegion): {
  left: string;
  top: string;
  width: string;
  height: string;
  clipPath?: string;
} {
  const { bounds } = region;
  return {
    left: `${(bounds.x / CANVAS_W) * 100}%`,
    top: `${(bounds.y / CANVAS_H) * 100}%`,
    width: `${(bounds.width / CANVAS_W) * 100}%`,
    height: `${(bounds.height / CANVAS_H) * 100}%`,
    clipPath: getWarroomRegionClipPath(region),
  };
}

function collectPositions(geometry: Geometry | null | undefined): Array<[number, number]> {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') {
    return (geometry.coordinates as Polygon['coordinates']).flat().map(([x, y]) => [x, y]);
  }
  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates as MultiPolygon['coordinates']).flat(2).map(([x, y]) => [x, y]);
  }
  if (geometry.type === 'LineString') {
    return (geometry.coordinates as LineString['coordinates']).map(([x, y]) => [x, y]);
  }
  return [];
}

function computeMapBounds(features: Feature[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const feature of features) {
    for (const [x, y] of collectPositions(feature.geometry)) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }
  return { minX, minY, maxX, maxY };
}

// The projector moved to warroomCorkSheet.ts as `makeProjection`. It used to fit raw lon/lat into
// a fixed 100x100 box, which stretched the country east-west by about 39% (a degree of longitude
// at 44°N is only ~0.72 of a degree of latitude on the ground) and forced a square viewBox that
// produced the seam bands. Both are corrected there, together, because they are one problem.

function fmtSvg(value: number): string {
  return Number.isFinite(value) ? value.toFixed(3).replace(/\.?0+$/, '') : '0';
}

function ringToPath(ring: Array<[number, number]>, project: (point: [number, number]) => [number, number]): string {
  if (ring.length === 0) return '';
  const [firstX, firstY] = project(ring[0]);
  const parts = [`M${fmtSvg(firstX)} ${fmtSvg(firstY)}`];
  for (const point of ring.slice(1)) {
    const [x, y] = project(point);
    parts.push(`L${fmtSvg(x)} ${fmtSvg(y)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

function polygonGeometryToPath(
  geometry: Polygon | MultiPolygon,
  project: (point: [number, number]) => [number, number],
): string {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons
    .flatMap((polygon) => polygon.map((ring) => ringToPath(ring.map(([x, y]) => [x, y]), project)))
    .filter(Boolean)
    .join(' ');
}

function lineGeometryToPath(
  geometry: LineString,
  project: (point: [number, number]) => [number, number],
): string {
  const coords = geometry.coordinates.map(([x, y]) => project([x, y]));
  if (coords.length === 0) return '';
  const [[firstX, firstY], ...rest] = coords;
  return [
    `M${fmtSvg(firstX)} ${fmtSvg(firstY)}`,
    ...rest.map(([x, y]) => `L${fmtSvg(x)} ${fmtSvg(y)}`),
  ].join(' ');
}

function featureSortKey(feature: Feature): string {
  const props = feature.properties as { osid?: unknown; edge_id?: unknown } | null;
  if (typeof props?.osid === 'string') return props.osid;
  if (typeof props?.edge_id === 'string') return props.edge_id;
  return JSON.stringify(feature.geometry);
}

export function buildWarroomProjectedMapModel(
  baseGeoJson: FeatureCollection,
  controlBySettlement: Record<string, string | null>,
  playerFaction: string | null | undefined,
  rbihHrhbAlliance?: number | null,
): WarroomMapOverlayModel | null {
  if (!playerFaction || !Array.isArray(baseGeoJson.features) || baseGeoJson.features.length === 0) {
    return null;
  }

  const bounds = computeMapBounds(baseGeoJson.features as Feature[]);
  if (!bounds) return null;

  const { project, viewWidth, viewHeight } = makeProjection(bounds);
  const controlledGeoJson = buildControlGeoJSON(baseGeoJson, controlBySettlement);
  const sortedControlFeatures = [...controlledGeoJson.features].sort((a, b) => featureSortKey(a).localeCompare(featureSortKey(b)));

  const outlinePaths = sortedControlFeatures
    .filter((feature): feature is Feature<Polygon | MultiPolygon> => feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon')
    .map((feature) => polygonGeometryToPath(feature.geometry, project))
    .filter(Boolean);

  const territoryPaths = sortedControlFeatures
    .filter((feature): feature is Feature<Polygon | MultiPolygon, { controller?: string | null }> =>
      (feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon')
      && (feature.properties as { controller?: string | null } | null)?.controller === playerFaction)
    .map((feature) => polygonGeometryToPath(feature.geometry, project))
    .filter(Boolean);

  const frontLinePaths = buildFrontLinesGeoJSON(controlledGeoJson, rbihHrhbAlliance)
    .features
    .filter((feature): feature is Feature<LineString, { lineType?: string }> =>
      feature.geometry?.type === 'LineString'
      && (feature.properties as { lineType?: string } | null)?.lineType === 'front')
    .map((feature) => lineGeometryToPath(feature.geometry, project))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  // Whole-degree graticule, extended to the sheet edges. `project` gives the position of a
  // meridian or parallel; the line itself then runs the full height or width of the viewBox.
  const graticulePaths: string[] = [];
  for (let lon = Math.ceil(bounds.minX); lon <= Math.floor(bounds.maxX); lon += 1) {
    const [x] = project([lon, bounds.maxY]);
    graticulePaths.push(`M${fmtSvg(x)} 0 L${fmtSvg(x)} ${fmtSvg(viewHeight)}`);
  }
  for (let lat = Math.ceil(bounds.minY); lat <= Math.floor(bounds.maxY); lat += 1) {
    const [, y] = project([bounds.minX, lat]);
    graticulePaths.push(`M0 ${fmtSvg(y)} L${fmtSvg(viewWidth)} ${fmtSvg(y)}`);
  }

  return { outlinePaths, territoryPaths, frontLinePaths, viewWidth, viewHeight, graticulePaths };
}

/**
 * Which year's scene plate this save should be shown in.
 *
 * THE BUG THIS FIXES, found by photographing the room rather than by any test. The year was read
 * as `parseInt(metadata.date.slice(-4))`. `metadata.date` is `'UNKNOWN'` whenever the save has no
 * `meta.date` — which is every save produced by the scenario harness, since the field simply is
 * not written. `'NOWN'` parses as NaN, NaN fell to the 1992 branch, and **every such save rendered
 * the 1992 room whatever year it was in**. A turn-68 save showed `26 Jul 1993` written on a 1992
 * whiteboard.
 *
 * It went unnoticed because both halves were independently plausible: the date came from the turn
 * and was right, the plate came from the metadata and was a real plate. Only the pair is wrong,
 * and nothing compared them.
 *
 * The turn is the reliable source — `turnToDateString` is what the date label itself uses — so the
 * metadata string is now only a hint, and the turn is the fallback that actually answers.
 */
export function warroomSceneYear(
  state: (Pick<LoadedGameState, 'metadata' | 'turn'>) | null | undefined,
): WarroomSceneYear {
  const fromMetadata = Number.parseInt(String(state?.metadata?.date ?? '').slice(-4), 10);
  const fromTurn = typeof state?.turn === 'number'
    ? Number.parseInt(turnToDateString(state.turn).slice(-4), 10)
    : Number.NaN;
  const parsed = Number.isNaN(fromMetadata) ? fromTurn : fromMetadata;

  if (Number.isNaN(parsed) || parsed <= 1992) return 1992;
  if (parsed === 1993) return 1993;
  if (parsed === 1994) return 1994;
  return 1995;
}

export function getWarroomBoardDateLabel(
  state: (Pick<LoadedGameState, 'metadata' | 'turn'> & Partial<Pick<LoadedGameState, 'label'>>) | null | undefined,
): string {
  const rawDate = state?.metadata?.date?.trim();
  const cleanRawDate = rawDate?.split('·')[0].trim();
  const hasTurn = typeof state?.turn === 'number';
  const hasFullRawDate = cleanRawDate
    && cleanRawDate !== 'UNKNOWN'
    && /\b\d{1,2}\b/.test(cleanRawDate)
    && /\b\d{4}\b/.test(cleanRawDate);
  if (hasFullRawDate) return cleanRawDate;
  if (hasTurn) return turnToDateString(state.turn);
  if (cleanRawDate && cleanRawDate !== 'UNKNOWN') return cleanRawDate;
  const labelDate = state?.label ? formatTurnLabel(state.label).split('·')[0].trim() : '';
  if (labelDate && !labelDate.toLowerCase().startsWith('turn ')) return labelDate;
  return t('warroomShell.datePending');
}

function factionInkColor(faction: string | null): string {
  if (faction === 'RS') return 'rgba(165, 45, 45, 0.72)';
  if (faction === 'HRHB') return 'rgba(42, 91, 160, 0.72)';
  return 'rgba(35, 112, 63, 0.72)';
}

/**
 * The staff map: a paper sheet pinned to the corkboard.
 *
 * WHAT IT WAS, AND WHY IT READ AS "TACKED ON". Design §1.3 and §1.4 found four independent causes,
 * and none of them was the map drawing itself:
 *
 *   1. A square `viewBox="0 0 100 100"` inside a ~1.85:1 board, with an OPAQUE backing rect that
 *      covered only the square. The sheet texture showed through in two side bands with hard
 *      vertical seams. Fixed by construction: the viewBox is now derived from the ground shape of
 *      the country, the SVG is transparent, and the paper is painted by the element beneath it, so
 *      there is nothing left to seam.
 *   2. A second frame drawn inside the frame the ART already has — a 3px border, an outline, a
 *      `0 0 0 7px` ring and an 18px drop shadow. All removed. Paper on cork casts a tight contact
 *      shadow of a few pixels, and nothing else.
 *   3. Ruled notebook paper (`repeating-linear-gradient`) as the texture, which is what showed in
 *      the seam bands. Gone.
 *   4. No latitude correction, so the country rendered about 39% too wide. Corrected in
 *      `makeProjection`.
 *
 * And the cause §1.4 named as mattering most: the overlay ignored the room's light. The sheet was a
 * constant cream at roughly L*90 while the cork beneath it ranges L*20.4 to L*63.6 across the
 * fifteen plates. A sheet seventy points brighter than the board it sits on is not paper in a dim
 * room, it is a light source — and no amount of border removal fixes that. The paper now holds a
 * constant lift above the measured cork instead.
 */
function WarroomProjectedMap({ region, model, playerFaction, year }: {
  region: WarroomRegion;
  model: WarroomMapOverlayModel | null;
  playerFaction: string | null;
  year: WarroomSceneYear;
}) {
  // The MEASURED cork, not the click target. See corkBox() for why they differ per faction. The
  // hotspot box remains the fallback for anything the measurement does not cover.
  const measured = corkBox(playerFaction);
  const box = measured
    ? {
      left: `${measured.left * 100}%`,
      top: `${measured.top * 100}%`,
      width: `${measured.width * 100}%`,
      height: `${measured.height * 100}%`,
    }
    : getWarroomRegionBoxStyle(region);
  const sheet = corkSheet(playerFaction, year);

  // Pins at the sheet corners, inset slightly so the head sits ON the paper rather than off its
  // edge. Colours are the pin heads themselves, not faction coding — a staff officer's pins are
  // whatever was in the tin.
  const pinPositions = [
    { left: '4%', top: '5%' },
    { left: '95%', top: '4%' },
    { left: '5%', top: '95%' },
    { left: '94%', top: '96%' },
  ];
  const pins = pinPositions.map((position, index) => ({ ...position, head: sheet.pinHeads[index] }));

  return (
    <div
      aria-hidden="true"
      data-testid="warroom-wall-map"
      data-cork-lstar={sheet.corkLstar}
      data-sheet-lstar={sheet.sheetLstar}
      style={{
        position: 'absolute',
        ...box,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <div
        data-testid="warroom-wall-map-paper"
        style={{
          // THE MARGIN IS THE DESIGN. Cork shows all round because a real staff sheet does not
          // reach the frame. The old side bands were an accident of the square viewBox; this is
          // deliberate and equal on every side.
          position: 'absolute',
          inset: '7%',
          background: sheet.background,
          // A CONTACT shadow: paper lying on cork, a few pixels, tight and soft. Not a drop
          // shadow, which is what a cut-out floating above a background casts.
          boxShadow: `0 1px 2px ${sheet.contactShadow}, 0 2px 4px ${sheet.contactShadow}`,
          // The sheet is not pinned perfectly square. One degree, not five.
          transform: 'rotate(-0.6deg)',
          transformOrigin: '50% 50%',
        }}
      >
        {model ? (
          <svg
            data-testid="warroom-wall-map-svg"
            viewBox={`0 0 ${model.viewWidth} ${model.viewHeight}`}
            preserveAspectRatio="xMidYMid meet"
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
            }}
          >
            {/*
              NO BACKING RECT. The paper is the div behind this SVG, which fills the sheet
              completely, so `meet` letterboxing simply shows more paper instead of showing a seam.
              That is the whole fix for §1.3.1 — it is a deletion, not an addition.
            */}
            {/*
              NO MUNICIPALITY BORDERS. These used to be stroked, drawing every one of ~600 OSID
              outlines as a fine black mesh over the whole country — administrative data on an
              operational map. Owner, 2026-09-12: "map should not show OSID or municipality
              borders, just fronts".

              The paths are still drawn, but FILLED and unstroked, so the country keeps its
              silhouette — without it the map would be a coloured blob and some dashes floating on
              blank paper — while every internal line disappears. Adjacent fills of one colour read
              as a single landmass.
            */}
            {/*
              Each group is stroked in ITS OWN FILL COLOUR at a hairline width. That is not a
              border: adjacent polygons sharing an edge leave a one-pixel antialiasing seam where
              neither covers the boundary fully, and with `stroke="none"` those seams drew the
              municipality mesh back in as pale hairlines — visible on RS, whose large contiguous
              red area showed it most. Stroking in the fill colour closes the gap and stays
              invisible.
            */}
            {/*
              Graticule UNDER the land, so the country prints over it the way it would on a real
              sheet, and edge to edge so the margins are map paper rather than blank paper.
            */}
            <g fill="none" stroke={sheet.graticuleInk} strokeWidth="0.16">
              {model.graticulePaths.map((path, index) => <path key={`grat-${index}`} d={path} />)}
            </g>
            <g fill={sheet.landTint} stroke={sheet.landTint} strokeWidth="0.22" strokeLinejoin="round">
              {model.outlinePaths.map((path, index) => <path key={`outline-${index}`} d={path} />)}
            </g>
            <g fill={sheet.territoryInk} stroke={sheet.territoryInk} strokeWidth="0.22" strokeLinejoin="round">
              {model.territoryPaths.map((path, index) => <path key={`territory-${index}`} d={path} />)}
            </g>
            <g
              fill="none"
              stroke={sheet.outlineInk}
              strokeWidth="0.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="1.7 1.1"
            >
              {model.frontLinePaths.map((path, index) => <path key={`front-${index}`} d={path} />)}
            </g>
          </svg>
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-data)',
              fontSize: '12px',
              letterSpacing: '0.12em',
              color: sheet.outlineInk,
              textTransform: 'uppercase',
            }}
          >
            {t('warroomShell.mapUpdating')}
          </div>
        )}

        {/*
          PINS, NOT DOTS. The old strip was a horizontal rule with four flat circles hanging off it
          — hardware for a wall chart, which is not what this object is. A pin head is a small
          sphere: a radial gradient with the highlight off-centre, and a short shadow offset DOWN
          AND RIGHT onto the paper, because the room's key light is the window at frame-left.
        */}
        {pins.map((pin) => (
          <span
            key={`${pin.left}-${pin.top}`}
            data-testid="warroom-wall-map-pin"
            style={{
              position: 'absolute',
              left: pin.left,
              top: pin.top,
              // Smaller and flat. A faint light edge at the top-left is the only modelling — the
              // window is at frame-left — and there is no specular highlight, because a bright
              // white dot is what made these read as rendered spheres rather than plastic.
              width: '2.3%',
              aspectRatio: '1',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: pin.head,
              boxShadow: [
                `inset 0.5px 0.5px 0 rgba(255,255,255,0.22)`,
                `inset -0.5px -0.5px 0 rgba(0,0,0,0.18)`,
                `0.5px 1px 1.5px ${sheet.pinShadow}`,
              ].join(', '),
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Board width as a fraction of the scene plate.
 *
 * `wall_calendar_area` is 304–307 of the plate's 2752 across all three factions, so one constant
 * covers them. It exists only to express the no-container-queries fallback size, which has to be
 * stated in plate units because there is no board element to measure against in that path.
 */
const BOARD_WIDTH_FRACTION_OF_PLATE = 0.11;

/** Text width to aim for, as a percentage of the board. Design §4.3: "roughly 60–70%". */
const MARKER_TARGET_WIDTH_PERCENT = 68;

/** Mean advance width of Caveat Bold, in em. Estimated from the face, not measured. */
const MARKER_MEAN_ADVANCE_EM = 0.44;

/**
 * Font size for a date, as a percentage of the board's width.
 *
 * Sized from the string rather than fixed, because the label is not a fixed width: short-month
 * dates run 10–11 characters ("6 Apr 1992"), `metadata.date` can carry a full month name, and
 * `t('warroomShell.datePending')` is 'Date Pending' or 'Datum čeka'. A single size would either
 * overrun the board on the long ones or leave the short ones looking timid. Holding the WIDTH
 * constant instead is what a person writing on a board actually does.
 */
function markerFontSizeCqw(labelLength: number): number {
  const raw = MARKER_TARGET_WIDTH_PERCENT / (Math.max(1, labelLength) * MARKER_MEAN_ADVANCE_EM);
  return Math.round(Math.min(16, Math.max(8, raw)) * 100) / 100;
}

/** One line of marker writing: per-glyph jitter over a whole-line uphill tilt. */
function MarkerLine({
  label,
  turn,
  color,
  salt,
  testId,
  style,
}: {
  label: string;
  turn: number;
  color: string;
  salt: string;
  testId: string;
  style?: CSSProperties;
}) {
  const sizeCqw = markerFontSizeCqw(label.length);
  const platePercent = sizeCqw * BOARD_WIDTH_FRACTION_OF_PLATE;

  return (
    <div
      className="warroom-date-ink"
      data-testid={testId}
      style={{
        // Both candidate sizes, so globals.css can choose between them with @supports. Setting
        // fontSize here instead would beat the stylesheet and make the fallback unreachable.
        ['--warroom-marker-size-cq' as string]: `${sizeCqw}cqw`,
        ['--warroom-marker-size-fallback' as string]:
          `min(${platePercent.toFixed(3)}vw, ${(platePercent * WARROOM_SCENE_ASPECT).toFixed(3)}vh)`,
        color,
        fontFamily: 'var(--font-marker)',
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        // People write slightly uphill. Anchored left because that is where the writing started.
        transform: `rotate(${MARKER_LINE_TILT_DEGREES}deg)`,
        transformOrigin: 'left center',
        // No background, border or shadow. A marker stroke is ink on the board; anything behind it
        // is a UI label sitting in front of the board, which is the defect this replaces.
        background: 'none',
        border: 'none',
        boxShadow: 'none',
        textShadow: 'none',
        ...style,
      }}
    >
      {Array.from(label).map((glyph, index) => {
        const jitter = markerGlyphJitter(turn, index, salt);
        return (
          <span
            // Index-keyed deliberately: this is a fixed-length render of one string, glyphs are not
            // reordered, and repeated characters would collide on any content-derived key.
            key={`${salt}-${index}`}
            style={{
              display: 'inline-block',
              // A space with a transform still collapses; leave it alone and it holds its width.
              transform: glyph === ' '
                ? undefined
                : `translateY(${jitter.baselineDriftPx}px) rotate(${jitter.rotationDegrees}deg)`,
              opacity: jitter.opacity,
              whiteSpace: 'pre',
            }}
          >
            {glyph}
          </span>
        );
      })}
    </div>
  );
}

/**
 * The date, written on the whiteboard.
 *
 * Not centred and not boxed. Design §4.2: writing starts at the left with a margin inside the
 * region and sits upper-middle, because that is where a hand starts on a board — `center` is where
 * a layout engine puts a label.
 */
function WarroomDateBoard({
  region,
  label,
  ghostLabel,
  turn,
  faction,
  year,
}: {
  region: WarroomRegion;
  label: string;
  ghostLabel: string | null;
  turn: number;
  faction: string | null;
  year: number;
}) {
  const box = getWarroomRegionBoxStyle(region);
  const ink = markerInk(faction, year);

  return (
    <div
      aria-hidden="true"
      className="warroom-date-board"
      data-testid="warroom-date-board"
      data-board-lstar={ink.boardLstar}
      data-ink-reaches-target={String(ink.reachesTarget)}
      style={{
        position: 'absolute',
        ...box,
        pointerEvents: 'none',
        zIndex: 1,
        // NO PERCENTAGE PADDING HERE, and the reason is worth keeping.
        //
        // This started as `paddingLeft: '10%'` with `justifyContent: 'flex-start'` to get the
        // "10% margin inside the region" the design asks for. Percentage padding resolves against
        // the CONTAINING BLOCK's inline size, not the element's own — and this element is
        // absolutely positioned on the scene plate, so 10% meant 10% of 1920px, not of the 212px
        // board. Measured: padding-left became 192px and padding-bottom 268px on a 212px box.
        //
        // That did two things, one obvious and one silent. The box inflated to a 269px square,
        // because a border-box cannot be narrower than its own padding. And the CONTENT box
        // collapsed to exactly zero inline size — so `cqw`, which resolves against the container's
        // content box, became 0 and every glyph rendered at font-size: 0px. The date was in the
        // DOM, correct in every string assertion, and invisible.
        //
        // The line is positioned instead, because percentage `left`/`top` on an absolutely
        // positioned child DO resolve against this element.
      }}
    >
      {ghostLabel ? (
        // Last week's date, wiped. Wiped marker leaves a faint DARKER residue, so the ghost is the
        // same hue at low opacity — never a lighter colour. Texture, not information: aria-hidden
        // and excluded from every accessible name.
        <MarkerLine
          label={ghostLabel}
          turn={turn - 1}
          color={ink.color}
          salt="ghost"
          testId="warroom-date-board-ghost"
          style={{
            position: 'absolute',
            // A CLEAR LINE ABOVE, not a few pixels above. Design §4.5 says "offset slightly up
            // and left", which at this size put the ghost straight through the live date and read
            // as a double-exposure rather than as last week's entry wiped off. A person writing
            // the new date does not write it on top of the old one; they write below where the
            // old one was. Measured on the captures, not reasoned about.
            left: '6%',
            top: '5%',
            opacity: 0.12,
            filter: 'blur(0.6px)',
            transform: `rotate(${MARKER_LINE_TILT_DEGREES}deg) skewX(-6deg)`,
          }}
        />
      ) : null}
      <MarkerLine
        label={label}
        turn={turn}
        color={ink.color}
        salt="ink"
        testId="warroom-date-board-label"
        style={{
          // Left-anchored with a margin inside the board, sitting upper-middle. Writing starts at
          // the left of the space; `center` is where a layout engine puts a label.
          position: 'absolute',
          left: '10%',
          top: '40%',
        }}
      />
    </div>
  );
}

function WarroomHotspot({ region, onClick }: WarroomHotspotProps) {
  const [hovered, setHovered] = useState(false);
  const { bounds, tooltip, id } = region;
  const accessibleLabel = getWarroomRegionLabel(region);

  const left = `${(bounds.x / CANVAS_W) * 100}%`;
  const top = `${(bounds.y / CANVAS_H) * 100}%`;
  const width = `${(bounds.width / CANVAS_W) * 100}%`;
  const height = `${(bounds.height / CANVAS_H) * 100}%`;

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        overflow: 'visible',
        pointerEvents: 'none',
        zIndex: hovered ? 4 : 2,
      }}
    >
      {hovered ? (
        <span
          style={{
            position: 'absolute',
            left: 0,
            bottom: 'calc(100% + 4px)',
            pointerEvents: 'none',
            border: '1px solid rgba(214,174,76,0.48)',
            background: 'rgba(15,18,22,0.96)',
            color: 'rgba(245,197,90,0.98)',
            padding: '4px 7px',
            fontFamily: 'var(--font-command)',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            lineHeight: 1,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
            zIndex: 5,
          }}
        >
          {accessibleLabel}
        </span>
      ) : null}
      <button
        type="button"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          cursor: 'pointer',
          boxSizing: 'border-box',
          outline: hovered ? '2px solid rgba(255,220,100,0.7)' : 'none',
          background: hovered ? 'rgba(255,220,100,0.08)' : 'transparent',
          transition: 'outline 0.1s, background 0.1s',
          clipPath: getWarroomRegionClipPath(region),
          border: 'none',
          padding: 0,
          pointerEvents: 'auto',
        }}
        aria-label={accessibleLabel}
        title={accessibleLabel}
        onClick={onClick}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick();
          }
        }}
      />
    </div>
  );
}

// ── Region data by faction ─────────────────────────────────────────────────

const FALLBACK_REGION_MANIFESTS_BY_FACTION: Record<string, WarroomRegionManifest> = {
  RBiH: fallbackRbihRegions,
  RS: fallbackRsRegions,
  HRHB: fallbackHrhbRegions,
};

function normalizeWarroomRegionPolygon(points: number[][] | undefined): [number, number][] | undefined {
  if (!points) return undefined;
  const polygon = points
    .filter((point) => point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]))
    .map((point): [number, number] => [point[0], point[1]]);
  return polygon.length >= 3 ? polygon : undefined;
}

function normalizeWarroomRegions(manifest: WarroomRegionManifest): WarroomRegion[] {
  return manifest.regions.map((region) => ({
    id: region.id,
    type: region.type,
    bounds: region.bounds,
    polygon: normalizeWarroomRegionPolygon(region.polygon),
    tooltip: region.tooltip,
  }));
}

const FALLBACK_REGIONS_BY_FACTION: Record<string, WarroomRegion[]> = {
  RBiH: normalizeWarroomRegions(FALLBACK_REGION_MANIFESTS_BY_FACTION.RBiH),
  RS: normalizeWarroomRegions(FALLBACK_REGION_MANIFESTS_BY_FACTION.RS),
  HRHB: normalizeWarroomRegions(FALLBACK_REGION_MANIFESTS_BY_FACTION.HRHB),
};

const CANONICAL_REGION_URLS_BY_FACTION: Record<string, string> = {
  RBiH: '/data/ui/hq_rbih_clickable_regions.json',
  RS: '/data/ui/hq_rs_clickable_regions.json',
  HRHB: '/data/ui/hq_hrhb_clickable_regions.json',
};

export function warroomRegionsUrlForFaction(faction: string): string | undefined {
  return CANONICAL_REGION_URLS_BY_FACTION[faction];
}

function fallbackRegionsForFaction(faction: string | null): WarroomRegion[] {
  return faction ? (FALLBACK_REGIONS_BY_FACTION[faction] ?? []) : [];
}

function regionsFromPayload(payload: unknown): WarroomRegion[] {
  if (!payload || typeof payload !== 'object') return [];

  const regions = (payload as { regions?: unknown }).regions;
  return Array.isArray(regions) ? (regions as WarroomRegion[]) : [];
}

// ── WarroomShellLayer ──────────────────────────────────────────────────────

export interface WarroomShellLayerProps {
  /** Called when the player clicks a hotspot. command is undefined for unmapped regions. */
  onNavigate: (command?: WarroomNavigationCommand) => void;
  /** Opens the existing campaign side picker when the Warroom has no loaded side. */
  onOpenSidePicker?: () => void;
  /** Warroom-local status dock rendered inside the scene plate frame. */
  statusDock?: ReactNode;
}

function WarroomToolbar({ onNavigate }: { onNavigate: (command?: WarroomNavigationCommand) => void }) {
  return (
    <nav
      aria-label={t('warroomShell.navigation')}
      data-testid="warroom-toolbar"
      style={{
        position: 'absolute',
        left: '50%',
        top: '1.6%',
        transform: 'translateX(-50%)',
        zIndex: 6,
        display: 'flex',
        maxWidth: 'calc(100% - 32px)',
        gap: '6px',
        overflowX: 'auto',
        border: '1px solid rgba(214,174,76,0.34)',
        background: 'rgba(13,16,20,0.84)',
        padding: '6px',
        boxShadow: '0 16px 42px rgba(0,0,0,0.42)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {WARROOM_ROUTE_ENTRIES.map((entry) => (
        <button
          key={entry.id}
          type="button"
          data-testid={`warroom-toolbar-${entry.id}`}
          onClick={() => onNavigate(commandForWarroomRoute(entry.id))}
          style={{
            flex: '0 0 auto',
            cursor: 'pointer',
            border: '1px solid rgba(214,174,76,0.26)',
            background: 'rgba(0,0,0,0.24)',
            color: entry.id === 'advance' ? 'rgba(255,214,190,0.96)' : 'rgba(236,220,174,0.96)',
            padding: '7px 9px',
            fontFamily: 'var(--font-command)',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            lineHeight: 1,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          {t(entry.labelKey)}
        </button>
      ))}
    </nav>
  );
}

export function WarroomShellLayer({ onNavigate, onOpenSidePicker, statusDock }: WarroomShellLayerProps) {
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const playerFaction = getPlayerFacingFaction(loadedGameState);

  const year = warroomSceneYear(loadedGameState);

  const scenePlateUrl = playerFaction
    ? (WARROOM_SCENE_URLS[playerFaction]?.[year] ?? WARROOM_SCENE_URLS[playerFaction]?.[1992])
    : null;

  const [activeRegions, setActiveRegions] = useState<WarroomRegion[]>(
    fallbackRegionsForFaction(playerFaction),
  );
  const [projectedMapModel, setProjectedMapModel] = useState<WarroomMapOverlayModel | null>(null);

  useEffect(() => {
    const fallbackRegions = fallbackRegionsForFaction(playerFaction);
    setActiveRegions(fallbackRegions);

    const regionsUrl = playerFaction ? warroomRegionsUrlForFaction(playerFaction) : undefined;
    if (!regionsUrl) return undefined;

    let cancelled = false;

    fetch(regionsUrl)
      .then((response) => (response.ok ? response.json() : undefined))
      .then((payload) => {
        if (cancelled) return;
        const canonicalRegions = regionsFromPayload(payload);
        if (canonicalRegions.length > 0) setActiveRegions(canonicalRegions);
      })
      .catch(() => {
        if (!cancelled) setActiveRegions(fallbackRegions);
      });

    return () => {
      cancelled = true;
    };
  }, [playerFaction]);

  useEffect(() => {
    if (!loadedGameState?.controlBySettlement || !playerFaction) {
      setProjectedMapModel(null);
      return undefined;
    }

    let cancelled = false;
    loadOperationalSettlements()
      .then((geojson) => {
        if (cancelled) return;
        setProjectedMapModel(buildWarroomProjectedMapModel(
          geojson,
          loadedGameState.controlBySettlement,
          playerFaction,
          loadedGameState.war_alliance_rbih_hrhb,
        ));
      })
      .catch(() => {
        if (!cancelled) setProjectedMapModel(null);
      });

    return () => {
      cancelled = true;
    };
  }, [
    loadedGameState?.controlBySettlement,
    loadedGameState?.war_alliance_rbih_hrhb,
    playerFaction,
  ]);

  if (!playerFaction || !scenePlateUrl) {
    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: '#000',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div
          role="status"
          aria-live="polite"
          style={{
            color: 'rgba(255,255,255,0.72)',
            fontFamily: 'var(--font-data)',
            fontSize: '12px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          {t('warroomShell.unavailable')}
        </div>
        <button
          type="button"
          onClick={() => onOpenSidePicker?.()}
          style={{
            cursor: 'pointer',
            border: '1px solid rgba(214,174,76,0.55)',
            background: 'rgba(18,22,28,0.92)',
            color: 'rgba(245,197,90,0.98)',
            padding: '10px 14px',
            fontFamily: 'var(--font-command)',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            boxShadow: '0 8px 22px rgba(0,0,0,0.38)',
          }}
        >
          {t('warroomShell.openSidePicker')}
        </button>
      </div>
    );
  }

  const handleRegionClick = (region: WarroomRegion) => {
    const command = regionToShellHandoff(region.id);
    onNavigate(command);
  };

  const deskMapRegion = activeRegions.find((region) => region.id === 'desk_map' || region.id === 'wall_cork_board');
  const dateBoardRegion = activeRegions.find((region) => region.id === 'wall_calendar_area' || region.id === 'wall_calendar');
  const dateLabel = getWarroomBoardDateLabel(loadedGameState);
  const dateTurn = typeof loadedGameState?.turn === 'number' ? loadedGameState.turn : 0;
  // Last week's date, wiped but not gone. Suppressed at turn 0: nothing preceded the first week,
  // and a ghost there would be inventing a history the save does not have.
  const ghostDateLabel = dateTurn > 0 ? turnToDateString(dateTurn - 1) : null;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#000',
        overflow: 'hidden',
      }}
    >
      <WarroomScenePlate src={scenePlateUrl}>
        <WarroomToolbar onNavigate={onNavigate} />
        {statusDock}
        {deskMapRegion ? (
          <WarroomProjectedMap
            region={deskMapRegion}
            model={projectedMapModel}
            playerFaction={playerFaction}
            year={year}
          />
        ) : null}
        {dateBoardRegion ? (
          <WarroomDateBoard
            region={dateBoardRegion}
            label={dateLabel}
            ghostLabel={ghostDateLabel}
            turn={dateTurn}
            faction={playerFaction}
            year={year}
          />
        ) : null}
        {activeRegions.map((region) => (
          <WarroomHotspot
            key={region.id}
            region={region}
            onClick={() => handleRegionClick(region)}
          />
        ))}
      </WarroomScenePlate>
    </div>
  );
}
