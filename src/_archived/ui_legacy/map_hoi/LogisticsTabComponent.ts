/**
 * Logistics tab: recruitment capital, corridor/equipment placeholders.
 */

import { BaseComponent } from './BaseComponent.js';
import type { HoILogisticsData } from './types.js';

export class LogisticsTabComponent extends BaseComponent {
  private data: HoILogisticsData | null = null;

  constructor(container: HTMLElement) {
    super(container, 'div', 'hoi-logistics-tab');
  }

  setData(data: HoILogisticsData | null): void {
    this.data = data;
  }

  render(): void {
    this.el.innerHTML = '';
    if (!this.data) {
      this.el.textContent = 'No logistics data.';
      return;
    }
    const { recruitmentCapital, corridorPlaceholder, equipmentPlaceholder } = this.data;
    const capWrap = document.createElement('div');
    capWrap.className = 'hoi-recruitment-capital';
    const keys = Object.keys(recruitmentCapital).sort((a, b) => a.localeCompare(b));
    for (const f of keys) {
      const row = document.createElement('div');
      row.className = 'hoi-logistics-row';
      row.textContent = `${f} capital: ${(recruitmentCapital[f] ?? 0).toLocaleString()}`;
      capWrap.appendChild(row);
    }
    this.el.appendChild(capWrap);
    if (corridorPlaceholder) {
      const c = document.createElement('div');
      c.className = 'hoi-logistics-placeholder';
      c.textContent = `Corridor: ${corridorPlaceholder}`;
      this.el.appendChild(c);
    }
    if (equipmentPlaceholder) {
      const e = document.createElement('div');
      e.className = 'hoi-logistics-placeholder';
      e.textContent = `Equipment: ${equipmentPlaceholder}`;
      this.el.appendChild(e);
    }
  }
}
