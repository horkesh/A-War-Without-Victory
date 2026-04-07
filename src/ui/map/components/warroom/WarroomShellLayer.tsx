/**
 * WarroomShellLayer — React foundation for Warroom shell ownership.
 *
 * Renders the faction-appropriate scene plate as a background image and
 * overlays hotspot regions from the regions JSON as absolutely-positioned
 * React elements. Activated by `?view=warroom` in the React app URL.
 *
 * TRANSITIONAL: warroom.ts canvas rendering is still the active runtime path.
 * This component runs in parallel only when `?view=warroom` is present.
 * Runtime wiring (changing the Electron entry point or warroom.ts iframe URL)
 * is the next slice.
 *
 * Canonical owner: src/ui/map/components/warroom/WarroomShellLayer.tsx
 */

import { useEffect, useState } from 'react';
import type { ShellHandoffCommand } from '../../../shared/shellHandoff';
import { useGameStore } from '../../store/gameStore';
import { WARROOM_SCENE_URLS } from './warroom-asset-urls';
import rbihRegions from '../../../warroom/assets/hq_rbih_regions.json';
import rsRegions from '../../../warroom/assets/hq_rs_regions.json';
import hrhbRegions from '../../../warroom/assets/hq_hrhb_regions.json';

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
  tooltip?: string;
}

// Authoring canvas dimensions (schema v2.1)
const CANVAS_W = 2752;
const CANVAS_H = 1536;

// ── Region → ShellHandoffCommand mapping ───────────────────────────────────

/**
 * Maps a Warroom region ID to the corresponding ShellHandoffCommand.
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
export function regionToShellHandoff(regionId: string): ShellHandoffCommand | undefined {
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
      return { kind: 'strategic-overview' };
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

function WarroomHotspot({ region, onClick }: WarroomHotspotProps) {
  const [hovered, setHovered] = useState(false);
  const { bounds, tooltip, id } = region;

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
        cursor: 'pointer',
        boxSizing: 'border-box',
        outline: hovered ? '2px solid rgba(255,220,100,0.7)' : 'none',
        background: hovered ? 'rgba(255,220,100,0.08)' : 'transparent',
        transition: 'outline 0.1s, background 0.1s',
      }}
      title={tooltip ?? id}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    />
  );
}

// ── Region data by faction ─────────────────────────────────────────────────

const REGIONS_BY_FACTION: Record<string, WarroomRegion[]> = {
  RBiH: (rbihRegions as { regions: WarroomRegion[] }).regions,
  RS: (rsRegions as { regions: WarroomRegion[] }).regions,
  HRHB: (hrhbRegions as { regions: WarroomRegion[] }).regions,
};

// ── WarroomShellLayer ──────────────────────────────────────────────────────

export interface WarroomShellLayerProps {
  /** Called when the player clicks a hotspot. command is undefined for unmapped regions. */
  onNavigate: (command?: ShellHandoffCommand) => void;
}

export function WarroomShellLayer({ onNavigate }: WarroomShellLayerProps) {
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const playerFaction = loadedGameState?.player_faction ?? 'RBiH';

  // Derive year from metadata.date string (e.g. "April 1992"), clamped to 1992–1995.
  // metadata is optional and only present when a game is loaded.
  const dateString = loadedGameState?.metadata?.date ?? '';
  const parsedYear = parseInt(dateString.slice(-4), 10);
  const year = isNaN(parsedYear) ? 1992 : Math.max(1992, Math.min(1995, parsedYear));

  const scenePlateUrl = WARROOM_SCENE_URLS[playerFaction]?.[year]
    ?? WARROOM_SCENE_URLS['RBiH'][1992];

  const regions = REGIONS_BY_FACTION[playerFaction] ?? REGIONS_BY_FACTION['RBiH'];

  // Suppress unused-effect warning: regions are imported statically, no async needed.
  // The useState/useEffect pattern is retained for future dynamic loading if required.
  const [activeRegions, setActiveRegions] = useState<WarroomRegion[]>(regions);

  useEffect(() => {
    setActiveRegions(REGIONS_BY_FACTION[playerFaction] ?? REGIONS_BY_FACTION['RBiH']);
  }, [playerFaction]);

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
      <img
        src={scenePlateUrl}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          objectFit: 'contain',
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
  );
}
