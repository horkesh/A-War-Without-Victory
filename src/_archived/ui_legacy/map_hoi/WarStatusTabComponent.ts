/**
 * War Status tab: territory % per faction, personnel, front stability.
 */

import { BaseComponent } from './BaseComponent.js';
import type { HoIWarStatusData } from './types.js';

export class WarStatusTabComponent extends BaseComponent {
  private data: HoIWarStatusData | null = null;

  constructor(container: HTMLElement) {
    super(container, 'div', 'hoi-war-status-tab');
  }

  setData(data: HoIWarStatusData | null): void {
    this.data = data;
  }

  render(): void {
    this.el.innerHTML = '';
    if (!this.data) {
      this.el.textContent = 'No war status data.';
      return;
    }
    const { territoryPercentByFaction, personnelByFaction, frontStability } = this.data;
    const factions = Object.keys(territoryPercentByFaction).sort((a, b) => a.localeCompare(b));
    const wrap = document.createElement('div');
    wrap.className = 'hoi-war-status-bars';
    for (const f of factions) {
      const pct = territoryPercentByFaction[f] ?? 0;
      const bar = document.createElement('div');
      bar.className = `hoi-territory-bar-row hoi-territory-faction-${f.toLowerCase()}`;
      bar.innerHTML = `<span class="hoi-territory-faction">${f}</span><div class="hoi-territory-bar-wrap"><div class="hoi-territory-bar" style="width:${Math.min(100, pct)}%"></div></div><span class="hoi-territory-pct">${pct.toFixed(1)}%</span>`;
      wrap.appendChild(bar);
    }
    this.el.appendChild(wrap);
    const personnelWrap = document.createElement('div');
    personnelWrap.className = 'hoi-personnel-by-faction';
    const persKeys = Object.keys(personnelByFaction).sort((a, b) => a.localeCompare(b));
    for (const f of persKeys) {
      const p = personnelWrap.appendChild(document.createElement('div'));
      p.className = 'hoi-personnel-row';
      p.textContent = `${f}: ${(personnelByFaction[f] ?? 0).toLocaleString()} personnel`;
    }
    this.el.appendChild(personnelWrap);
    if (frontStability) {
      const st = document.createElement('div');
      st.className = 'hoi-front-stability';
      st.textContent = `Fronts: static ${frontStability.static}, fluid ${frontStability.fluid}, oscillating ${frontStability.oscillating}`;
      this.el.appendChild(st);
    }
  }
}
