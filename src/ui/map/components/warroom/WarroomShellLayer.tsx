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
import { getPlayerFacingFaction } from '../../../shared/playerFacingLabels';
import { useGameStore } from '../../store/gameStore';
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
  bounds: WarroomRegionBounds;
  polygon?: [number, number][];
  tooltip?: string;
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
      // Diplomacy routes to Army HQ summary until a dedicated diplomacy surface exists.
      return { kind: 'army-hq', tab: 'summary' };
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

function WarroomHotspot({ region, onClick }: WarroomHotspotProps) {
  const [hovered, setHovered] = useState(false);
  const { bounds, tooltip, id } = region;
  const accessibleLabel = getWarroomRegionLabel(region);

  const left = `${(bounds.x / CANVAS_W) * 100}%`;
  const top = `${(bounds.y / CANVAS_H) * 100}%`;
  const width = `${(bounds.width / CANVAS_W) * 100}%`;
  const height = `${(bounds.height / CANVAS_H) * 100}%`;

  return (
    <button
      type="button"
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        cursor: 'pointer',
        boxSizing: 'border-box',
        outline: hovered ? '2px solid rgba(255,220,100,0.7)' : 'none',
        background: hovered ? 'rgba(255,220,100,0.08)' : 'transparent',
        transition: 'outline 0.1s, background 0.1s',
        clipPath: getWarroomRegionClipPath(region),
        border: 'none',
        padding: 0,
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
}

export function WarroomShellLayer({ onNavigate }: WarroomShellLayerProps) {
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
      </div>
    );
  }

  const handleRegionClick = (region: WarroomRegion) => {
    const command = regionToShellHandoff(region.id);
    onNavigate(command);
  };

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
