/**
 * map_hoi state and view types.
 * State is held in HoIMapState; components receive view slices for render.
 */

export interface HoITopBarData {
  faction: string | null;
  phase: string;
  turn: number;
  date: string;
  territoryPercent: number | null;
}

export interface HoIBrigadeRowData {
  id: string;
  name: string;
  personnel: number;
  cohesion: number;
  posture: string;
  isOg: boolean;
  degraded: boolean;  // cohesion < 30
  critical: boolean; // cohesion < 15
  /** Optional for tooltip (e.g. corps name). */
  corpsName?: string;
}

export interface HoICorpsCardData {
  id: string;
  name: string;
  stance: string;
  exhaustion: number;
  ogSlots: { used: number; total: number };
  personnel: number;
  brigades: HoIBrigadeRowData[];
  collapsed: boolean;
}

export interface HoIStatusAlert {
  kind: 'alert' | 'warning' | 'success';
  text: string;
}

export interface HoIStatusStripData {
  tickerText: string;
  alerts: HoIStatusAlert[];
  quickStats: { fronts: string; supply: string; ivp: string };
}

export type HoISidebarTabId = 'army' | 'war_status' | 'diplomacy' | 'logistics';

export interface HoIMapStateData {
  topBar: HoITopBarData;
  sidebarTab: HoISidebarTabId;
  corps: HoICorpsCardData[];
  statusStrip: HoIStatusStripData;
}
