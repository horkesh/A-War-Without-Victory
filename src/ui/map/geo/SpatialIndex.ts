/**
 * Simple uniform-grid spatial index for fast point queries and viewport culling.
 * For ~6,000 settlement bounding boxes, a 50x50 grid gives ~2.5 items per cell.
 */

import type { BBox } from '../types.js';

export class SpatialIndex<T> {
  private gridW: number;
  private gridH: number;
  private cellW: number;
  private cellH: number;
  private bounds: BBox;
  private cells: Map<number, Array<{ item: T; bbox: BBox }>>;

  constructor(bounds: BBox, gridSize = 50) {
    this.bounds = bounds;
    this.gridW = gridSize;
    this.gridH = gridSize;
    this.cellW = (bounds.maxX - bounds.minX) / gridSize;
    this.cellH = (bounds.maxY - bounds.minY) / gridSize;
    this.cells = new Map();
  }

  private cellKey(col: number, row: number): number {
    return row * this.gridW + col;
  }

  private clampCol(x: number): number {
    return Math.max(0, Math.min(this.gridW - 1, Math.floor((x - this.bounds.minX) / this.cellW)));
  }

  private clampRow(y: number): number {
    return Math.max(0, Math.min(this.gridH - 1, Math.floor((y - this.bounds.minY) / this.cellH)));
  }

  /** Insert an item with its bounding box into the grid. */
  insert(item: T, bbox: BBox): void {
    const c0 = this.clampCol(bbox.minX);
    const c1 = this.clampCol(bbox.maxX);
    const r0 = this.clampRow(bbox.minY);
    const r1 = this.clampRow(bbox.maxY);
    const entry = { item, bbox };
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const key = this.cellKey(c, r);
        let cell = this.cells.get(key);
        if (!cell) {
          cell = [];
          this.cells.set(key, cell);
        }
        cell.push(entry);
      }
    }
  }

  /** Query all items whose bounding box intersects the given bbox. Deduplicates. */
  query(bbox: BBox): T[] {
    const c0 = this.clampCol(bbox.minX);
    const c1 = this.clampCol(bbox.maxX);
    const r0 = this.clampRow(bbox.minY);
    const r1 = this.clampRow(bbox.maxY);
    const seen = new Set<T>();
    const results: T[] = [];
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const cell = this.cells.get(this.cellKey(c, r));
        if (!cell) continue;
        for (const entry of cell) {
          if (!seen.has(entry.item) && this.bboxIntersects(entry.bbox, bbox)) {
            seen.add(entry.item);
            results.push(entry.item);
          }
        }
      }
    }
    return results;
  }

  /** Query all items whose bounding box contains the given point. Deduplicates. */
  queryPoint(x: number, y: number): T[] {
    const col = this.clampCol(x);
    const row = this.clampRow(y);
    const cell = this.cells.get(this.cellKey(col, row));
    if (!cell) return [];
    const seen = new Set<T>();
    const results: T[] = [];
    for (const entry of cell) {
      if (!seen.has(entry.item) &&
          x >= entry.bbox.minX && x <= entry.bbox.maxX &&
          y >= entry.bbox.minY && y <= entry.bbox.maxY) {
        seen.add(entry.item);
        results.push(entry.item);
      }
    }
    return results;
  }

  private bboxIntersects(a: BBox, b: BBox): boolean {
    return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
  }
}
