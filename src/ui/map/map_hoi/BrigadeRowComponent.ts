/**
 * Single brigade row: name, personnel, cohesion bar, posture badge.
 * Rich tooltip on hover (300ms delay) via TooltipLayer.
 */

import { BaseComponent } from './BaseComponent.js';
import type { HoIBrigadeRowData } from './types.js';
import { scheduleShow, cancel, formatFormationTooltip } from './TooltipLayer.js';

export class BrigadeRowComponent extends BaseComponent {
  private data: HoIBrigadeRowData = {
    id: '',
    name: '',
    personnel: 0,
    cohesion: 0,
    posture: '',
    isOg: false,
    degraded: false,
    critical: false,
  };

  constructor(container: HTMLElement) {
    super(container, 'div', 'hoi-brigade-row');
  }

  setData(data: HoIBrigadeRowData): void {
    this.data = data;
  }

  render(): void {
    const { name, personnel, cohesion, posture, isOg, degraded, critical } = this.data;
    const segments = 5;
    const filled = Math.min(segments, Math.max(0, Math.floor((cohesion / 100) * segments)));

    this.el.innerHTML = '';
    this.el.classList.toggle('hoi-brigade-row-og', isOg);
    this.el.classList.toggle('hoi-brigade-row-degraded', degraded);
    this.el.classList.toggle('hoi-brigade-row-critical', critical);

    const nameEl = document.createElement('span');
    nameEl.className = 'hoi-brigade-name';
    nameEl.textContent = name;
    this.el.appendChild(nameEl);

    const persEl = document.createElement('span');
    persEl.className = 'hoi-brigade-personnel';
    persEl.textContent = String(personnel);
    this.el.appendChild(persEl);

    const barEl = document.createElement('span');
    barEl.className = 'hoi-cohesion-bar';
    barEl.setAttribute('aria-label', `Cohesion ${cohesion}`);
    for (let i = 0; i < segments; i++) {
      const seg = document.createElement('span');
      seg.className = 'hoi-cohesion-segment' + (i < filled ? ' filled' : '');
      barEl.appendChild(seg);
    }
    this.el.appendChild(barEl);

    const postureEl = document.createElement('span');
    postureEl.className = 'hoi-brigade-posture';
    postureEl.textContent = posture || '—';
    this.el.appendChild(postureEl);

    if (degraded) {
      const warn = document.createElement('span');
      warn.className = 'hoi-brigade-warn';
      warn.textContent = '⚠';
      warn.setAttribute('aria-label', 'Low cohesion');
      this.el.appendChild(warn);
    }
    if (critical) {
      const crit = document.createElement('span');
      crit.className = 'hoi-brigade-critical';
      crit.textContent = '⛔';
      crit.setAttribute('aria-label', 'Critical cohesion');
      this.el.appendChild(crit);
    }

    if (this._onMouseEnter) this.el.removeEventListener('mouseenter', this._onMouseEnter);
    if (this._onMouseLeave) this.el.removeEventListener('mouseleave', this._onMouseLeave);
    this._onMouseEnter = (e: MouseEvent) => {
      scheduleShow(e.clientX, e.clientY, formatFormationTooltip({
        name: this.data.name,
        personnel: this.data.personnel,
        cohesion: this.data.cohesion,
        posture: this.data.posture,
        corpsName: this.data.corpsName,
      }));
    };
    this._onMouseLeave = () => cancel();
    this.el.addEventListener('mouseenter', this._onMouseEnter);
    this.el.addEventListener('mouseleave', this._onMouseLeave);
  }

  private _onMouseEnter: ((e: MouseEvent) => void) | null = null;
  private _onMouseLeave: (() => void) | null = null;
}
