/**
 * Diplomacy tab: RBiH–HRHB alliance gauge, war earliest turn, placeholders.
 */

import { BaseComponent } from './BaseComponent.js';
import type { HoIDiplomacyData } from './types.js';

export class DiplomacyTabComponent extends BaseComponent {
  private data: HoIDiplomacyData | null = null;

  constructor(container: HTMLElement) {
    super(container, 'div', 'hoi-diplomacy-tab');
  }

  setData(data: HoIDiplomacyData | null): void {
    this.data = data;
  }

  render(): void {
    this.el.innerHTML = '';
    if (!this.data) {
      this.el.textContent = 'No diplomacy data.';
      return;
    }
    const { rbihHrhbAlliance, warEarliestTurn, patronCommitment } = this.data;
    const val = typeof rbihHrhbAlliance === 'number' ? rbihHrhbAlliance : 0;
    const pct = Math.min(100, Math.max(0, (val + 1) * 50));
    const gauge = document.createElement('div');
    gauge.className = 'hoi-alliance-gauge';
    gauge.innerHTML = `
      <span class="hoi-alliance-label">RBiH–HRHB alliance</span>
      <div class="hoi-alliance-bar-wrap"><div class="hoi-alliance-bar" style="width:${pct}%"></div></div>
      <span class="hoi-alliance-value">${val.toFixed(2)}</span>
    `;
    this.el.appendChild(gauge);
    if (warEarliestTurn != null) {
      const turn = document.createElement('div');
      turn.className = 'hoi-diplomacy-row';
      turn.textContent = `War earliest turn: ${warEarliestTurn}`;
      this.el.appendChild(turn);
    }
    if (patronCommitment) {
      const p = document.createElement('div');
      p.className = 'hoi-diplomacy-row';
      p.textContent = `Patron commitment: ${patronCommitment}`;
      this.el.appendChild(p);
    }
  }
}
