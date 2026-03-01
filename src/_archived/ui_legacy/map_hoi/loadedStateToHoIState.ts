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
  HoIStatusAlert,
  HoIWarStatusData,
  HoIDiplomacyData,
  HoILogisticsData,
} from './types.js';

const FACTIONS = ['RS', 'RBiH', 'HRHB'] as const;

/** Derive status strip alerts from loaded state (enclave/corridor/operation placeholders). */
function deriveAlerts(loaded: LoadedGameState): HoIStatusAlert[] {
  const alerts: HoIStatusAlert[] = [];
  // Placeholder: when enclave integrity data exists and < 30%, add red alert
  // When corridor strained, add yellow; when operation complete, add green
  return alerts;
}

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
        faction: b.faction ?? undefined,
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
    alerts: deriveAlerts(loaded),
    quickStats: {
      fronts: String(frontCount),
      supply: '—',
      ivp: '—',
    },
  };

  const territoryPercentByFaction: Record<string, number> = {};
  for (const f of FACTIONS) {
    const p = territoryPercent(loaded.controlBySettlement, f);
    if (p != null) territoryPercentByFaction[f] = p;
  }
  const personnelByFaction: Record<string, number> = {};
  for (const f of (loaded.formations ?? [])) {
    const fac = f.faction ?? 'RS';
    personnelByFaction[fac] = (personnelByFaction[fac] ?? 0) + (typeof f.personnel === 'number' ? f.personnel : 0);
  }
  const warStatus: HoIWarStatusData = {
    territoryPercentByFaction,
    personnelByFaction,
    frontStability: null,
  };

  const rbihHrhbAlliance = loaded.war_alliance_rbih_hrhb ?? null;
  const diplomacy: HoIDiplomacyData = {
    rbihHrhbAlliance: typeof rbihHrhbAlliance === 'number' ? rbihHrhbAlliance : null,
    warEarliestTurn: loaded.rbih_hrhb_war_earliest_turn ?? null,
    patronCommitment: null,
  };

  const recruitmentCapital: Record<string, number> = {};
  const rec = loaded.recruitment;
  if (rec?.capitalByFaction) {
    const keys = Object.keys(rec.capitalByFaction).sort((a, b) => a.localeCompare(b));
    for (const k of keys) recruitmentCapital[k] = rec.capitalByFaction[k] ?? 0;
  }
  const logistics: HoILogisticsData = {
    recruitmentCapital,
    corridorPlaceholder: null,
    equipmentPlaceholder: null,
  };

  return { topBar, corps, statusStrip, warStatus, diplomacy, logistics };
}
