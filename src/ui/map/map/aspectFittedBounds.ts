/**
 * Aspect-fitted camera bounds for the tactical map.
 *
 * MapLibre never lets the viewport grow beyond `maxBounds`. On a wide, short screen
 * (the owner's 2293 × 960 ultrawide) the bounds' WIDTH fills the window long before
 * their HEIGHT does, so the camera could not zoom out far enough to show the whole of
 * Bosnia and Herzegovina: the far north (Bihać, Posavina) or south stayed off-screen
 * and their counters looked like they had vanished (R8, 2026-11-10).
 *
 * Widening the bounds east and west until their shape matches the viewport lets the
 * camera zoom out until the full north–south extent fits, while north/south panning
 * stays exactly as limited as before. Narrower-than-bounds viewports are unchanged.
 *
 * Pure: Web Mercator maths only.
 */

export type LngLatBounds = [[number, number], [number, number]];

const DEG = Math.PI / 180;

function mercatorY(latDeg: number): number {
  return Math.log(Math.tan(Math.PI / 4 + (latDeg * DEG) / 2));
}

export function aspectFittedMaxBounds(base: LngLatBounds, widthPx: number, heightPx: number): LngLatBounds {
  const [[west, south], [east, north]] = base;
  if (!(widthPx > 0) || !(heightPx > 0)) return base;
  const boundsWidth = (east - west) * DEG;
  const boundsHeight = mercatorY(north) - mercatorY(south);
  if (!(boundsWidth > 0) || !(boundsHeight > 0)) return base;
  const viewAspect = widthPx / heightPx;
  if (viewAspect <= boundsWidth / boundsHeight) return base;
  const extraDeg = ((boundsHeight * viewAspect - boundsWidth) / 2) / DEG;
  return [[west - extraDeg, south], [east + extraDeg, north]];
}
