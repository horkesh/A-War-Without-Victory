/**
 * Convert LoadedGameState to HoIMapStateData for map_hoi components.
 */

import type { LoadedGameState, FormationView } from '../types.js';
import type {
  HoIMapStateData,
  HoITopBarData,
  HoICorpsCardData,
  HoIBrigadeRowData,
  HoIStatusStripData,
} from './types.js';

const FACTIONS = ['RS', 'RBiH', 'HRHB'] as const;

/** Derive territory % for a faction from control lookup. */
function territoryPercent(controlBySettlement: Record<string, string | null>, faction: string): number | null {
  const entries = Object.entries(controlBySettlement);
  if (entries.length === 0) return null;
  let count = 0;
  for (const [, c] of entries) {
    if (c === faction) count++;
  }
  return (100 * count) / entries.length;
}

/** Format turn/phase as short date string (e.g. "15 Sep 1992"). */
function formatDate(turn: number, phase: string): string {
  if (turn <= 0) return '—';
  // Approximate: April 1992 start => week 1 = early Apr; 52 weeks ~ 1 year
  const startYear = 1992;
  const startMonth = 4;
  const weeksPerYear = 52;
  const year = startYear + Math.floor((turn - 1) / weeksPerYear);
  const weekInYear = ((turn - 1) % weeksPerYear) + 1;
  const month = Math.min(12, Math.floor((weekInYear / weeksPerYear) * 12) + 1);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${Math.min(28, weekInYear * 7 % 28 || 1)} ${months[month - 1]} ${year}`;
}

/** Build corps cards from formations (corps + their brigades). */
function buildCorps(formations: FormationView[], playerFaction: string | null): HoICorpsCardData[] {
  const byId = new Map<string, FormationView>();
  for (const f of formations) byId.set(f.id, f);

  const corpsList = formations.filter(
    (f) => (f.kind === 'corps' || f.kind === 'corps_asset') && (!playerFaction || f.faction === playerFaction)
  );
  corpsList.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

  const result: HoICorpsCardData[] = [];
  for (const corps of corpsList) {
    const subordinateIds = corps.subordinateIds ?? formations.filter((s) => s.corps_id === corps.id).map((s) => s.id).sort();
    const corpsName = corps.name ?? corps.id;
    const brigades: HoIBrigadeRowData[] = [];
    for (const bid of subordinateIds) {
      const b = byId.get(bid);
      if (!b || (b.kind !== 'brigade' && b.kind !== 'og')) continue;
      const cohesion = typeof b.cohesion === 'number' ? b.cohesion : 0;
      brigades.push({
        id: b.id,
        name: b.name ?? b.id,
        personnel: typeof b.personnel === 'number' ? b.personnel : 0,
        cohesion,
        posture: (b.posture ?? '').toUpperCase().slice(0, 3) || '—',
        isOg: b.kind === 'og',
        degraded: cohesion < 30,
        critical: cohesion < 15,
        corpsName,
      });
    }
    const ogSlots = typeof corps.corpsOgSlots === 'number' ? corps.corpsOgSlots : 0;
    const activeOgs = corps.corpsActiveOgIds?.length ?? 0;
    let personnel = 0;
    for (const b of brigades) personnel += b.personnel;
    result.push({
      id: corps.id,
      name: corps.name ?? corps.id,
      stance: (corps.corpsStance ?? 'BALANCED').toUpperCase(),
      exhaustion: typeof corps.corpsExhaustion === 'number' ? corps.corpsExhaustion * 100 : 0,
      ogSlots: { used: activeOgs, total: ogSlots },
      personnel,
      brigades,
      collapsed: false,
    });
  }
  return result;
}

export function loadedStateToHoIMapState(loaded: LoadedGameState | null): Partial<HoIMapStateData> {
  if (!loaded) {
    return {
      topBar: { faction: null, phase: '—', turn: 0, date: '—', territoryPercent: null },
      sidebarTab: 'army',
      corps: [],
      statusStrip: {
        tickerText: 'Load a game state to see ticker.',
        alerts: [],
        quickStats: { fronts: '—', supply: '—', ivp: '—' },
      },
    };
  }

  const playerFaction = loaded.player_faction ?? null;
  const territory = playerFaction ? territoryPercent(loaded.controlBySettlement, playerFaction) : null;

  const topBar: HoITopBarData = {
    faction: playerFaction,
    phase: loaded.phase ?? '—',
    turn: loaded.turn ?? 0,
    date: formatDate(loaded.turn ?? 0, loaded.phase ?? ''),
    territoryPercent: territory,
  };

  const corps = buildCorps(loaded.formations, playerFaction);

  const frontCount = loaded.frontEdgesOsid?.length ?? loaded.frontEdges?.length ?? loaded.assignableFrontSegments?.length ?? 0;
  const statusStrip: HoIStatusStripData = {
    tickerText: loaded.label ?? `Turn ${loaded.turn}`,
    alerts: [],
    quickStats: {
      fronts: String(frontCount),
      supply: '—',
      ivp: '—',
    },
  };

  return { topBar, corps, statusStrip };
}
