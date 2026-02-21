/**
 * Top command bar: faction banner, turn/date, advance button, menu.
 * Data from state.topBar; no inline DOM state.
 */

import { BaseComponent } from './BaseComponent.js';
import type { HoITopBarData } from './types.js';

export interface TopCommandBarCallbacks {
  onAdvance?: () => void;
  onMenu?: () => void;
  onLoadSave?: () => void;
}

export class TopCommandBarComponent extends BaseComponent {
  private data: HoITopBarData = {
    faction: null,
    phase: '—',
    turn: 0,
    date: '—',
    territoryPercent: null,
  };
  private callbacks: TopCommandBarCallbacks = {};

  constructor(container: HTMLElement, callbacks?: TopCommandBarCallbacks) {
    super(container, 'header', 'hoi-top-bar', true);
    this.callbacks = callbacks ?? {};
    this.el.setAttribute('role', 'banner');
  }

  setData(data: Partial<HoITopBarData>): void {
    Object.assign(this.data, data);
  }

  render(): void {
    const { faction, phase, turn, date, territoryPercent } = this.data;

    const factionZone = this.el.querySelector('.hoi-top-bar-faction') ?? (() => {
      const div = document.createElement('div');
      div.className = 'hoi-top-bar-faction';
      this.el.appendChild(div);
      return div;
    })();
    const centerZone = this.el.querySelector('.hoi-top-bar-center') ?? (() => {
      const div = document.createElement('div');
      div.className = 'hoi-top-bar-center';
      this.el.appendChild(div);
      return div;
    })();
    const actionsZone = this.el.querySelector('.hoi-top-bar-actions') ?? (() => {
      const div = document.createElement('div');
      div.className = 'hoi-top-bar-actions';
      this.el.appendChild(div);
      return div;
    })();

    factionZone.innerHTML = '';
    const factionLabel = document.createElement('span');
    factionLabel.className = 'hoi-top-bar-faction-name';
    factionLabel.textContent = faction ? String(faction) : '—';
    const phaseLabel = document.createElement('span');
    phaseLabel.className = 'hoi-top-bar-phase';
    phaseLabel.textContent = phase;
    factionZone.appendChild(factionLabel);
    factionZone.appendChild(phaseLabel);

    centerZone.textContent = `${turn > 0 ? `Week ${turn} • ${date}` : '—'}${territoryPercent != null ? `  |  Territory: ${territoryPercent.toFixed(1)}%` : ''}`;

    actionsZone.innerHTML = '';
    const loadBtn = document.createElement('button');
    loadBtn.type = 'button';
    loadBtn.className = 'hoi-btn hoi-btn-load';
    loadBtn.textContent = 'Load Save';
    loadBtn.addEventListener('click', () => this.callbacks.onLoadSave?.());
    const advanceBtn = document.createElement('button');
    advanceBtn.type = 'button';
    advanceBtn.className = 'hoi-btn hoi-btn-advance';
    advanceBtn.textContent = '▶ ADVANCE WEEK';
    advanceBtn.addEventListener('click', () => this.callbacks.onAdvance?.());
    const menuBtn = document.createElement('button');
    menuBtn.type = 'button';
    menuBtn.className = 'hoi-btn hoi-btn-menu';
    menuBtn.textContent = 'Menu';
    menuBtn.addEventListener('click', () => this.callbacks.onMenu?.());
    actionsZone.appendChild(loadBtn);
    actionsZone.appendChild(advanceBtn);
    actionsZone.appendChild(menuBtn);
  }
}
