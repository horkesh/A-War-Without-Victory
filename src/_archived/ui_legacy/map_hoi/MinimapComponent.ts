/**
 * Minimap: 250×180px canvas, bottom-left of map.
 * Stub: canvas and viewport rect; full draw (terrain + faction fill + front strokes) TBD.
 */

import { BaseComponent } from './BaseComponent.js';

export class MinimapComponent extends BaseComponent {
  private canvas: HTMLCanvasElement | null = null;
  private width = 250;
  private height = 180;

  constructor(container: HTMLElement) {
    super(container, 'div', 'hoi-minimap');
    this.el.style.position = 'absolute';
    this.el.style.left = '8px';
    this.el.style.bottom = '8px';
    this.el.style.width = `${this.width}px`;
    this.el.style.height = `${this.height}px`;
    this.el.style.border = '1px solid rgba(180,160,130,0.3)';
    this.el.style.borderRadius = '4px';
    this.el.style.zIndex = '50';
    this.el.style.overflow = 'hidden';
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.display = 'block';
    this.el.appendChild(this.canvas);
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1c1a17';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = '#9a9080';
      ctx.font = '11px sans-serif';
      ctx.fillText('Minimap', 8, 20);
    }
  }

  /** Update viewport rectangle (pan/zoom from renderer). Called by map_hoi on camera sync. */
  setViewport(_xNorm: number, _yNorm: number, _wNorm: number, _hNorm: number): void {
    // TODO: draw white rect on canvas
  }

  override render(): void {
    // Canvas drawn in constructor; no-op.
  }
}
