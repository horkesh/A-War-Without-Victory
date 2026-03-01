/**
 * Deterministic heightmap smoothing for terrain mesh build.
 * Shared by HoI map and operational 3D paths. In-place; no cross-run variance.
 * See TACTICAL_MAP_SYSTEM §2 and 20260223_HOI_MAP_3D_TILT_AND_TEXTURE_ON_TERRAIN.
 */

import type { HeightmapData } from './TerrainMeshBuilder.js';

/**
 * Smooth heightmap elevations in-place with multiple box-blur passes.
 * Each pass averages each pixel with its neighbours in a (2*radius+1) kernel.
 * Two passes of box-blur ≈ one Gaussian blur, producing gently rolling terrain.
 */
export function smoothHeightmap(hm: HeightmapData, passes = 2, radius = 2): void {
  const { width: w, height: h, elevations } = hm;
  const buf = new Float64Array(w * h);

  for (let pass = 0; pass < passes; pass++) {
    // Horizontal pass
    for (let y = 0; y < h; y++) {
      let sum = 0;
      let count = 0;
      for (let x = 0; x <= radius && x < w; x++) {
        sum += elevations[y * w + x]!;
        count++;
      }
      for (let x = 0; x < w; x++) {
        buf[y * w + x] = sum / count;
        const right = x + radius + 1;
        if (right < w) { sum += elevations[y * w + right]!; count++; }
        const left = x - radius;
        if (left >= 0) { sum -= elevations[y * w + left]!; count--; }
      }
    }
    for (let i = 0; i < w * h; i++) elevations[i] = buf[i]!;

    // Vertical pass
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      for (let y = 0; y <= radius && y < h; y++) {
        sum += elevations[y * w + x]!;
        count++;
      }
      for (let y = 0; y < h; y++) {
        buf[y * w + x] = sum / count;
        const bot = y + radius + 1;
        if (bot < h) { sum += elevations[bot * w + x]!; count++; }
        const top = y - radius;
        if (top >= 0) { sum -= elevations[top * w + x]!; count--; }
      }
    }
    for (let i = 0; i < w * h; i++) elevations[i] = buf[i]!;
  }
}
