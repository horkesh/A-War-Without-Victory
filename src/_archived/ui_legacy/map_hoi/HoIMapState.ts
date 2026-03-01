/**
 * Single observable state holder for map_hoi.
 * IPC or DataLoader updates this state; components subscribe and re-render.
 */

import type { HoIMapStateData } from './types.js';

const DEFAULT_STATE: HoIMapStateData = {
  topBar: {
    faction: null,
    phase: '—',
    turn: 0,
    date: '—',
    territoryPercent: null,
  },
  sidebarTab: 'army',
  corps: [],
  statusStrip: {
    tickerText: 'Load a game state to see ticker.',
    alerts: [],
    quickStats: { fronts: '—', supply: '—', ivp: '—' },
  },
  warStatus: null,
  diplomacy: null,
  logistics: null,
};

type Listener = () => void;

function cloneDefault(): HoIMapStateData {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

export class HoIMapState {
  private data: HoIMapStateData = cloneDefault();
  private listeners: Listener[] = [];

  getSnapshot(): Readonly<HoIMapStateData> {
    return this.data;
  }

  setState(update: Partial<HoIMapStateData>): void {
    let changed = false;
    if (update.topBar !== undefined && JSON.stringify(this.data.topBar) !== JSON.stringify(update.topBar)) {
      this.data.topBar = update.topBar;
      changed = true;
    }
    if (update.sidebarTab !== undefined && this.data.sidebarTab !== update.sidebarTab) {
      this.data.sidebarTab = update.sidebarTab;
      changed = true;
    }
    if (update.corps !== undefined && JSON.stringify(this.data.corps) !== JSON.stringify(update.corps)) {
      this.data.corps = update.corps;
      changed = true;
    }
    if (update.statusStrip !== undefined && JSON.stringify(this.data.statusStrip) !== JSON.stringify(update.statusStrip)) {
      this.data.statusStrip = update.statusStrip;
      changed = true;
    }
    if (update.warStatus !== undefined) {
      this.data.warStatus = update.warStatus;
      changed = true;
    }
    if (update.diplomacy !== undefined) {
      this.data.diplomacy = update.diplomacy;
      changed = true;
    }
    if (update.logistics !== undefined) {
      this.data.logistics = update.logistics;
      changed = true;
    }
    if (changed) this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      const i = this.listeners.indexOf(listener);
      if (i >= 0) this.listeners.splice(i, 1);
    };
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }
}

