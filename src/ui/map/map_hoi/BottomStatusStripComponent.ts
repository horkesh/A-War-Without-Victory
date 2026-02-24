/**
 * Bottom status strip: ticker, alert badges, quick-stats.
 */

import { BaseComponent } from './BaseComponent.js';
import type { HoIStatusStripData } from './types.js';

export class BottomStatusStripComponent extends BaseComponent {
  private data: HoIStatusStripData = {
    tickerText: '',
    alerts: [],
    quickStats: { fronts: '—', supply: '—', ivp: '—' },
  };

  constructor(container: HTMLElement) {
    super(container, 'footer', 'hoi-status-strip', true);
    this.el.setAttribute('role', 'contentinfo');
  }

  setData(data: Partial<HoIStatusStripData>): void {
    Object.assign(this.data, data);
  }

  render(): void {
    const { tickerText, alerts, quickStats } = this.data;

    this.el.innerHTML = '';

    const ticker = document.createElement('div');
    ticker.className = 'hoi-status-ticker';
    ticker.textContent = tickerText || '—';
    this.el.appendChild(ticker);

    const alertsEl = document.createElement('div');
    alertsEl.className = 'hoi-status-alerts';
    for (const a of alerts) {
      const badge = document.createElement('span');
      badge.className = `hoi-status-badge hoi-status-badge-${a.kind}`;
      badge.textContent = a.text;
      alertsEl.appendChild(badge);
    }
    this.el.appendChild(alertsEl);

    const quick = document.createElement('div');
    quick.className = 'hoi-status-quickstats';
    quick.textContent = `Fronts: ${quickStats.fronts} | Supply: ${quickStats.supply} | IVP: ${quickStats.ivp}`;
    this.el.appendChild(quick);
  }
}
