/**
 * EU4-style map mode toolbar — floats at the bottom of the map canvas.
 *
 * Shows a row of toggleable map overlay buttons (Terrain, Political Control,
 * Front Lines, Formations, Labels). Each button has a small icon-like label
 * and lights up gold when active. Keyboard shortcuts F1–F5 toggle each mode.
 *
 * Modelled after Europa Universalis IV's bottom-center map mode selector.
 * Uses the HoI warm charcoal/gold palette from styles_hoi.css.
 */

import type { HoILayerName, HoILayerVisibility } from '../renderer/HoIMapRenderer.js';

export interface MapModeToolbarCallbacks {
  onToggleLayer: (layer: HoILayerName, visible: boolean) => void;
}

interface LayerButton {
  layer: HoILayerName;
  label: string;
  shortcut: string;     // display label for keyboard shortcut
  shortcutKey: string;  // keyboard event.key value
}

const LAYER_BUTTONS: LayerButton[] = [
  { layer: 'terrain',    label: 'Terrain',    shortcut: 'F1', shortcutKey: 'F1' },
  { layer: 'control',    label: 'Political',  shortcut: 'F2', shortcutKey: 'F2' },
  { layer: 'frontLines', label: 'Front Lines', shortcut: 'F3', shortcutKey: 'F3' },
  { layer: 'formations', label: 'Formations', shortcut: 'F4', shortcutKey: 'F4' },
  { layer: 'labels',     label: 'Labels',     shortcut: 'F5', shortcutKey: 'F5' },
  { layer: 'zoc',        label: 'ZoC',        shortcut: 'F6', shortcutKey: 'F6' },
];

export class MapModeToolbar {
  readonly el: HTMLElement;
  private buttons: Map<HoILayerName, HTMLButtonElement> = new Map();
  private state: HoILayerVisibility;
  private callbacks: MapModeToolbarCallbacks;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(container: HTMLElement, callbacks: MapModeToolbarCallbacks, initialState?: Partial<HoILayerVisibility>) {
    this.callbacks = callbacks;
    this.state = {
      terrain: true,
      control: true,
      frontLines: true,
      formations: true,
      labels: true,
      zoc: false,
      ...initialState,
    };

    // Create toolbar container
    this.el = document.createElement('div');
    this.el.className = 'hoi-map-mode-toolbar';
    this.el.setAttribute('role', 'toolbar');
    this.el.setAttribute('aria-label', 'Map overlays');

    // Build buttons
    for (const def of LAYER_BUTTONS) {
      const btn = document.createElement('button');
      btn.className = 'hoi-map-mode-btn';
      btn.setAttribute('data-layer', def.layer);
      btn.setAttribute('title', `${def.label} (${def.shortcut})`);
      btn.setAttribute('aria-pressed', String(this.state[def.layer]));

      // Button inner: shortcut badge + label
      const shortcutSpan = document.createElement('span');
      shortcutSpan.className = 'hoi-map-mode-shortcut';
      shortcutSpan.textContent = def.shortcut;

      const labelSpan = document.createElement('span');
      labelSpan.className = 'hoi-map-mode-label';
      labelSpan.textContent = def.label;

      btn.appendChild(shortcutSpan);
      btn.appendChild(labelSpan);

      if (this.state[def.layer]) btn.classList.add('active');

      btn.addEventListener('click', () => this.toggle(def.layer));
      this.buttons.set(def.layer, btn);
      this.el.appendChild(btn);
    }

    container.appendChild(this.el);

    // Keyboard shortcuts (F1–F5)
    this.keyHandler = (e: KeyboardEvent) => {
      const def = LAYER_BUTTONS.find(b => b.shortcutKey === e.key);
      if (def) {
        e.preventDefault();
        this.toggle(def.layer);
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  private toggle(layer: HoILayerName): void {
    this.state[layer] = !this.state[layer];
    const btn = this.buttons.get(layer);
    if (btn) {
      btn.classList.toggle('active', this.state[layer]);
      btn.setAttribute('aria-pressed', String(this.state[layer]));
    }
    this.callbacks.onToggleLayer(layer, this.state[layer]);
  }

  /** Update button state to match external changes (e.g., from renderer). */
  syncState(vis: Readonly<HoILayerVisibility>): void {
    for (const def of LAYER_BUTTONS) {
      this.state[def.layer] = vis[def.layer];
      const btn = this.buttons.get(def.layer);
      if (btn) {
        btn.classList.toggle('active', vis[def.layer]);
        btn.setAttribute('aria-pressed', String(vis[def.layer]));
      }
    }
  }

  destroy(): void {
    window.removeEventListener('keydown', this.keyHandler);
    this.el.remove();
  }
}
