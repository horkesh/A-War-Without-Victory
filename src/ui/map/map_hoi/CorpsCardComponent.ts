/**
 * Corps card: header (name, stance), exhaustion, OG slots, list of brigade rows.
 * Collapse/expand; stance change and Plan Operation / Form OG trigger callbacks.
 */

import { BaseComponent } from './BaseComponent.js';
import type { HoICorpsCardData } from './types.js';
import { BrigadeRowComponent } from './BrigadeRowComponent.js';

export interface CorpsCardCallbacks {
  onStanceChange?: (corpsId: string, stance: string) => void;
  onPlanOperation?: (corpsId: string) => void;
  onFormOg?: (corpsId: string) => void;
}

export class CorpsCardComponent extends BaseComponent {
  private data: HoICorpsCardData = {
    id: '',
    name: '',
    stance: '',
    exhaustion: 0,
    ogSlots: { used: 0, total: 0 },
    personnel: 0,
    brigades: [],
    collapsed: false,
  };
  private callbacks: CorpsCardCallbacks = {};
  private brigadeRows: BrigadeRowComponent[] = [];

  constructor(container: HTMLElement, callbacks?: CorpsCardCallbacks) {
    super(container, 'div', 'hoi-corps-card');
    this.callbacks = callbacks ?? {};
  }

  setData(data: Partial<HoICorpsCardData>): void {
    Object.assign(this.data, data);
  }

  render(): void {
    const { id, name, stance, exhaustion, ogSlots, personnel, brigades, collapsed } = this.data;

    this.el.innerHTML = '';
    this.el.classList.toggle('hoi-corps-card-collapsed', collapsed);

    const header = document.createElement('div');
    header.className = 'hoi-corps-header';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'hoi-corps-toggle';
    toggle.textContent = collapsed ? '▶' : '▼';
    toggle.setAttribute('aria-label', collapsed ? 'Expand' : 'Collapse');
    toggle.addEventListener('click', () => {
      this.data.collapsed = !this.data.collapsed;
      this.render();
    });
    const title = document.createElement('span');
    title.className = 'hoi-corps-name';
    title.textContent = name;
    const stanceSpan = document.createElement('span');
    stanceSpan.className = 'hoi-corps-stance';
    stanceSpan.textContent = stance;
    header.appendChild(toggle);
    header.appendChild(title);
    header.appendChild(stanceSpan);
    this.el.appendChild(header);

    if (!collapsed) {
      const meta = document.createElement('div');
      meta.className = 'hoi-corps-meta';
      meta.innerHTML = `Stance: <select class="hoi-corps-stance-select" data-corps-id="${id}">${stance}</select>  Exhaustion: ${exhaustion.toFixed(1)}  OG: ${ogSlots.used}/${ogSlots.total}  Personnel: ${personnel.toLocaleString()}`;
      const select = meta.querySelector('.hoi-corps-stance-select') as HTMLSelectElement;
      if (select) {
        select.innerHTML = '<option value="DEFENSIVE">DEFENSIVE</option><option value="BALANCED">BALANCED</option><option value="OFFENSIVE">OFFENSIVE</option>';
        select.value = stance;
        select.addEventListener('change', () => this.callbacks.onStanceChange?.(id, select.value));
      }
      this.el.appendChild(meta);

      const list = document.createElement('div');
      list.className = 'hoi-corps-brigades';
      this.el.appendChild(list);

      // Reuse or create brigade row components
      while (this.brigadeRows.length > brigades.length) {
        const last = this.brigadeRows.pop();
        last?.destroy();
      }
      for (let i = 0; i < brigades.length; i++) {
        let row = this.brigadeRows[i];
        if (!row) {
          row = new BrigadeRowComponent(list);
          this.brigadeRows.push(row);
        } else {
          list.appendChild(row.el);
        }
        row.setData(brigades[i]);
        row.render();
      }

      const actions = document.createElement('div');
      actions.className = 'hoi-corps-actions';
      const planBtn = document.createElement('button');
      planBtn.type = 'button';
      planBtn.className = 'hoi-btn hoi-btn-sm';
      planBtn.textContent = '+ Plan Operation';
      planBtn.addEventListener('click', () => this.callbacks.onPlanOperation?.(id));
      const ogBtn = document.createElement('button');
      ogBtn.type = 'button';
      ogBtn.className = 'hoi-btn hoi-btn-sm';
      ogBtn.textContent = '+ Form OG';
      ogBtn.addEventListener('click', () => this.callbacks.onFormOg?.(id));
      actions.appendChild(planBtn);
      actions.appendChild(ogBtn);
      this.el.appendChild(actions);
    }
  }

  override destroy(): void {
    for (const row of this.brigadeRows) row.destroy();
    this.brigadeRows = [];
    super.destroy();
  }
}
