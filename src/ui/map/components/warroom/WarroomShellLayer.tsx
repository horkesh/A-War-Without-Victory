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

function makeProjector(bounds: { minX: number; minY: number; maxX: number; maxY: number }) {
  const rangeX = Math.max(0.000001, bounds.maxX - bounds.minX);
  const rangeY = Math.max(0.000001, bounds.maxY - bounds.minY);
  const scale = Math.min(98 / rangeX, 94 / rangeY);
  const projectedW = rangeX * scale;
  const projectedH = rangeY * scale;
  const offsetX = (100 - projectedW) / 2;
  const offsetY = (100 - projectedH) / 2;

  return ([x, y]: [number, number]): [number, number] => [
    offsetX + (x - bounds.minX) * scale,
    offsetY + (bounds.maxY - y) * scale,
  ];
}

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

  const project = makeProjector(bounds);
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

  return { outlinePaths, territoryPaths, frontLinePaths };
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

function WarroomProjectedMap({ region, model, playerFaction }: {
  region: WarroomRegion;
  model: WarroomMapOverlayModel | null;
  playerFaction: string | null;
}) {
  const box = getWarroomRegionBoxStyle(region);
  const playerInk = factionInkColor(playerFaction);
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        ...box,
        pointerEvents: 'none',
        zIndex: 1,
        padding: '0.74%',
      }}
    >
      <div
        data-testid="warroom-wall-map-paper"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: [
            'radial-gradient(circle at 12% 18%, rgba(255,255,255,0.26), transparent 18%)',
            'radial-gradient(circle at 82% 78%, rgba(95,62,32,0.13), transparent 24%)',
            'repeating-linear-gradient(0deg, rgba(78,58,38,0.05) 0 1px, transparent 1px 9px)',
            'linear-gradient(135deg, rgba(242,232,198,0.98), rgba(212,194,150,0.96))',
          ].join(', '),
          border: '3px solid rgba(83,55,31,0.78)',
          outline: '1px solid rgba(236,204,143,0.42)',
          boxShadow: [
            '0 9px 18px rgba(0,0,0,0.46)',
            '0 1px 0 rgba(255,236,184,0.42) inset',
            '0 0 0 7px rgba(129,85,45,0.28)',
            '0 0 22px rgba(20,12,6,0.28) inset',
          ].join(', '),
          transform: 'perspective(700px) rotateX(0.8deg) rotateY(-1.1deg) rotate(-0.55deg)',
          transformOrigin: '52% 45%',
          overflow: 'hidden',
        }}
      >
        <div
          data-testid="warroom-wall-map-hanging-hardware"
          style={{
            position: 'absolute',
            inset: '2.5% 2.2% auto 2.2%',
            height: '5.6%',
            zIndex: 3,
            borderTop: '1px solid rgba(79,49,24,0.44)',
            boxShadow: '0 1px 0 rgba(255,242,198,0.22) inset',
          }}
        >
          {[
            ['5%', 'rgba(115,48,38,0.92)'],
            ['35%', 'rgba(54,91,61,0.92)'],
            ['64%', 'rgba(128,96,42,0.9)'],
            ['93%', 'rgba(115,48,38,0.92)'],
          ].map(([left, color]) => (
            <span
              key={left}
              style={{
                position: 'absolute',
                left,
                top: '-5px',
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: color,
                border: '1px solid rgba(31,20,13,0.68)',
                boxShadow: '0 2px 5px rgba(0,0,0,0.38), 0 0 0 1px rgba(255,235,185,0.18) inset',
              }}
            />
          ))}
        </div>
        {model ? (
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              filter: 'sepia(0.16) saturate(0.92) contrast(1.03)',
            }}
          >
            <defs>
              <filter id="warroom-wall-map-roughen">
                <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="12" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.18" />
              </filter>
              <pattern id="warroom-wall-map-fold-grid" width="12.5" height="12.5" patternUnits="userSpaceOnUse">
                <path d="M12.5 0H0V12.5" fill="none" stroke="rgba(75,58,40,0.08)" strokeWidth="0.16" />
              </pattern>
            </defs>
            <rect x="0" y="0" width="100" height="100" fill="rgba(233,222,190,0.9)" />
            <rect x="0" y="0" width="100" height="100" fill="url(#warroom-wall-map-fold-grid)" />
            <path d="M49.8 0V100" stroke="rgba(84,62,39,0.16)" strokeWidth="0.34" />
            <path d="M0 50.1H100" stroke="rgba(84,62,39,0.11)" strokeWidth="0.28" />
            <g fill="none" stroke="rgba(66,58,45,0.26)" strokeWidth="0.22">
              {model.outlinePaths.map((path, index) => <path key={`outline-${index}`} d={path} />)}
            </g>
            <g fill={playerInk} stroke="rgba(48,40,31,0.32)" strokeWidth="0.16" filter="url(#warroom-wall-map-roughen)">
              {model.territoryPaths.map((path, index) => <path key={`territory-${index}`} d={path} />)}
            </g>
            <g fill="none" stroke="rgba(26,22,18,0.9)" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1.7 1.1">
              {model.frontLinePaths.map((path, index) => <path key={`front-${index}`} d={path} />)}
            </g>
            <g
              data-testid="warroom-wall-map-staff-marks"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ mixBlendMode: 'multiply' }}
            >
              <path d="M27 31C36 26 44 28 51 36" stroke="rgba(91,37,32,0.62)" strokeWidth="0.62" strokeDasharray="1.4 1.3" />
              <path d="M52 42C62 46 68 54 73 66" stroke="rgba(41,74,58,0.54)" strokeWidth="0.54" strokeDasharray="2 1.5" />
              <path d="M36 72C47 69 55 72 64 79" stroke="rgba(39,51,88,0.42)" strokeWidth="0.46" strokeDasharray="1.1 1.2" />
              <circle cx="27" cy="31" r="1.2" fill="rgba(115,48,38,0.88)" stroke="rgba(39,23,18,0.5)" strokeWidth="0.2" />
              <circle cx="51" cy="36" r="1.05" fill="rgba(115,48,38,0.82)" stroke="rgba(39,23,18,0.5)" strokeWidth="0.2" />
              <circle cx="73" cy="66" r="1.15" fill="rgba(49,93,61,0.82)" stroke="rgba(39,23,18,0.5)" strokeWidth="0.2" />
              <circle cx="64" cy="79" r="1" fill="rgba(42,71,130,0.7)" stroke="rgba(39,23,18,0.46)" strokeWidth="0.2" />
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
              color: 'rgba(55,45,34,0.58)',
              textTransform: 'uppercase',
            }}
          >
            {t('warroomShell.mapUpdating')}
          </div>
        )}
        <div
          data-testid="warroom-wall-map-glare"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 4,
            pointerEvents: 'none',
            background: [
              'linear-gradient(92deg, transparent 0 38%, rgba(255,255,255,0.2) 47%, rgba(255,255,255,0.05) 55%, transparent 68%)',
              'radial-gradient(ellipse at 42% 8%, rgba(255,247,210,0.22), transparent 35%)',
              'linear-gradient(180deg, rgba(30,18,8,0.13), transparent 22%, transparent 76%, rgba(58,35,16,0.14))',
            ].join(', '),
            mixBlendMode: 'screen',
          }}
        />
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        // Left margin inside the board; the bottom padding lifts the line to upper-middle.
        paddingLeft: '10%',
        paddingRight: '4%',
        paddingBottom: '14%',
        boxSizing: 'border-box',
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
            left: '8%',
            opacity: 0.12,
            filter: 'blur(0.6px)',
            transform: `rotate(${MARKER_LINE_TILT_DEGREES}deg) skewX(-6deg) translate(-2%, -14%)`,
          }}
        />
      ) : null}
      <MarkerLine
        label={label}
        turn={turn}
        color={ink.color}
        salt="ink"
        testId="warroom-date-board-label"
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

  // Derive year from metadata.date string (e.g. "April 1992"), clamped to 1992–1995.
  // metadata is optional and only present when a game is loaded.
  const dateString = loadedGameState?.metadata?.date ?? '';
  const parsedYear = parseInt(dateString.slice(-4), 10);
  const year: WarroomSceneYear = parsedYear <= 1992 || isNaN(parsedYear)
    ? 1992
    : parsedYear === 1993
      ? 1993
      : parsedYear === 1994
        ? 1994
        : 1995;

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
