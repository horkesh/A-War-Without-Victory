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

import { useEffect, useState } from 'react';
import type { Feature, FeatureCollection, Geometry, LineString, MultiPolygon, Polygon } from 'geojson';
import { getPlayerFacingFaction } from '../../../shared/playerFacingLabels';
import { loadOperationalSettlements } from '../../data/DataLoader';
import type { LoadedGameState } from '../../data/types';
import { buildControlGeoJSON } from '../../map/builders/buildControlGeoJSON';
import { buildFrontLinesGeoJSON } from '../../map/builders/buildFrontLinesGeoJSON';
import { useGameStore } from '../../store/gameStore';
import { formatTurnLabel, turnToDateString } from '../../utils/formatters';
import type { WarroomNavigationCommand } from '../../utils/warroomNavigation';
import { WARROOM_SCENE_URLS } from './warroom-asset-urls';
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

interface WarroomMapOverlayModel {
  outlinePaths: string[];
  territoryPaths: string[];
  frontLinePaths: string[];
}

// Authoring canvas dimensions (schema v2.1)
const CANVAS_W = 2752;
const CANVAS_H = 1536;
const CANVAS_ASPECT = CANVAS_W / CANVAS_H;

// ── Region → Warroom navigation mapping ────────────────────────────────────

/**
 * Maps a Warroom region ID to the corresponding Warroom navigation command.
 * Cross-shell commands stay on the shared shell handoff path. Warroom-local
 * overlay commands stay inside the React shell and never enter the shared
 * handoff union.
 *
 * Returns undefined for regions that intentionally navigate to the game view
 * (tactical map) without opening a specific panel — the undefined return value
 * propagates to onNavigate, which calls warroomCommandStaysInRoom(undefined) → false
 * → setAppScreen('game'), showing the map.
 *
 * Unmapped regions (intentional — navigate to game/map view):
 *   desk_map — clicking the desk map shows the tactical map (game screen).
 *
 * All other known hotspots are explicitly mapped below.
 *
 * Exported for unit testing.
 */
export function regionToShellHandoff(regionId: string): WarroomNavigationCommand | undefined {
  switch (regionId) {
    case 'wall_flag_area':
    case 'commander_coatrack':
      return { kind: 'army-hq', tab: 'summary' };
    case 'command_briefing_folio':
      return { kind: 'army-hq', tab: 'briefing' };
    case 'newspaper_stack':
      return { kind: 'chronicle' };
    case 'intelligence_journal':
      return { kind: 'army-hq', tab: 'records', recordsSubTab: 'aar' };
    case 'wall_calendar_area':
    case 'wall_calendar':
      // Most-used Warroom hotspot: clicking the wall calendar advances the turn.
      return { kind: 'advance-turn' };
    case 'wall_cork_board':
      // Legacy alias for the authored cork-board region. The Warroom contract
      // treats this as primary map access, same as desk_map.
      return undefined;
    case 'desk_radio':
      return { kind: 'event-log' };
    case 'diplomatic_telephone':
      return { kind: 'diplomacy' };
    default:
      return undefined;
  }
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
  return 'Date Pending';
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
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        ...box,
        pointerEvents: 'none',
        zIndex: 1,
        padding: '0.9%',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, rgba(242,232,198,0.98), rgba(212,194,150,0.96))',
          border: '2px solid rgba(68,48,30,0.62)',
          boxShadow: '0 5px 14px rgba(0,0,0,0.34), inset 0 0 18px rgba(84,59,35,0.24)',
          transform: 'rotate(-0.6deg)',
          overflow: 'hidden',
        }}
      >
        {model ? (
          <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" style={{ display: 'block', width: '100%', height: '100%' }}>
            <rect x="0" y="0" width="100" height="100" fill="rgba(233,222,190,0.9)" />
            <g fill="none" stroke="rgba(66,58,45,0.26)" strokeWidth="0.22">
              {model.outlinePaths.map((path, index) => <path key={`outline-${index}`} d={path} />)}
            </g>
            <g fill={factionInkColor(playerFaction)} stroke="rgba(48,40,31,0.32)" strokeWidth="0.16">
              {model.territoryPaths.map((path, index) => <path key={`territory-${index}`} d={path} />)}
            </g>
            <g fill="none" stroke="rgba(26,22,18,0.9)" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1.7 1.1">
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
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: '9px',
              letterSpacing: '0.12em',
              color: 'rgba(55,45,34,0.58)',
              textTransform: 'uppercase',
            }}
          >
            Map updating
          </div>
        )}
      </div>
    </div>
  );
}

function WarroomDateBoard({ region, label }: { region: WarroomRegion; label: string }) {
  const box = getWarroomRegionBoxStyle(region);
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        ...box,
        pointerEvents: 'none',
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        data-testid="warroom-date-board-label"
        style={{
          color: 'rgba(28, 84, 172, 0.86)',
          fontFamily: '"Segoe Print", "Segoe UI", Arial, sans-serif',
          fontSize: 'clamp(9px, 1.35vw, 24px)',
          fontWeight: 700,
          lineHeight: 1.05,
          transform: 'rotate(-1.4deg)',
          textShadow: '0 0 1px rgba(255,255,255,0.24)',
          whiteSpace: 'normal',
          textAlign: 'center',
          maxWidth: '96%',
          overflowWrap: 'break-word',
        }}
      >
        {label}
      </div>
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
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '9px',
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
        title={tooltip ?? id}
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

const FALLBACK_REGIONS_BY_FACTION: Record<string, WarroomRegion[]> = {
  RBiH: (fallbackRbihRegions as { regions: WarroomRegion[] }).regions,
  RS: (fallbackRsRegions as { regions: WarroomRegion[] }).regions,
  HRHB: (fallbackHrhbRegions as { regions: WarroomRegion[] }).regions,
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
}

export function WarroomShellLayer({ onNavigate, onOpenSidePicker }: WarroomShellLayerProps) {
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const playerFaction = getPlayerFacingFaction(loadedGameState);

  // Derive year from metadata.date string (e.g. "April 1992"), clamped to 1992–1995.
  // metadata is optional and only present when a game is loaded.
  const dateString = loadedGameState?.metadata?.date ?? '';
  const parsedYear = parseInt(dateString.slice(-4), 10);
  const year = isNaN(parsedYear) ? 1992 : Math.max(1992, Math.min(1995, parsedYear));

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
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '12px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          Warroom unavailable until a campaign side is selected.
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
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            boxShadow: '0 8px 22px rgba(0,0,0,0.38)',
          }}
        >
          Open Side Picker
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
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: `min(100%, calc(100vh * ${CANVAS_ASPECT}))`,
          height: `min(100%, calc(100vw / ${CANVAS_ASPECT}))`,
          aspectRatio: `${CANVAS_ASPECT}`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <img
          src={scenePlateUrl}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            display: 'block',
            userSelect: 'none',
          }}
        />
        {deskMapRegion ? (
          <WarroomProjectedMap
            region={deskMapRegion}
            model={projectedMapModel}
            playerFaction={playerFaction}
          />
        ) : null}
        {dateBoardRegion ? (
          <WarroomDateBoard region={dateBoardRegion} label={dateLabel} />
        ) : null}
        {activeRegions.map((region) => (
          <WarroomHotspot
            key={region.id}
            region={region}
            onClick={() => handleRegionClick(region)}
          />
        ))}
      </div>
    </div>
  );
}
