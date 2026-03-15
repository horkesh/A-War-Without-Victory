/**
 * Shared arrow geometry helpers used by order arrows, operation arrows, and ops planning modal.
 */

/** Ensure a closed polygon ring is counter-clockwise (GeoJSON exterior ring convention).
 *  MapLibre silently skips clockwise fill polygons. */
function ensureCCW(ring: [number, number][]): [number, number][] {
  // Shoelace signed area: positive = CCW in lon/lat, negative = CW
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    area += (ring[i][0] * ring[i + 1][1]) - (ring[i + 1][0] * ring[i][1]);
  }
  if (area > 0) {
    // CCW — reverse to make CW, preserving closure
    const reversed = ring.slice().reverse();
    return reversed;
  }
  return ring;
}

/** Simple deterministic hash for string→number (used for arrow offset variation). */
export function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return h;
}

/** Square of the distance between two points. */
export function getDistSq(a: [number, number], b: [number, number]): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

/**
 * Find the closest point on a line segment (a-b) to a test point p.
 * Returns the coordinates of the closest point.
 */
export function getClosestPointOnSegment(
  p: [number, number],
  a: [number, number],
  b: [number, number],
): [number, number] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const d2 = dx * dx + dy * dy;
  if (d2 === 0) return a;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / d2));
  return [a[0] + t * dx, a[1] + t * dy];
}

/**
 * Build a quadratic Bezier curve from p0→p2 with a lateral offset for visual separation
 * when multiple arrows share endpoints.
 */
export function buildBezierCurve(
  p0: [number, number],
  p2: [number, number],
  offsetMagnitude: number,
  steps = 20
): [number, number][] {
  const dx = p2[0] - p0[0];
  const dy = p2[1] - p0[1];
  const midX = p0[0] + dx * 0.5;
  const midY = p0[1] + dy * 0.5;

  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = len > 0 ? -dy / len : 0;
  const ny = len > 0 ? dx / len : 0;

  const p1: [number, number] = [midX + nx * offsetMagnitude, midY + ny * offsetMagnitude];

  const curve: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const inv = 1 - t;
    curve.push([
      inv * inv * p0[0] + 2 * inv * t * p1[0] + t * t * p2[0],
      inv * inv * p0[1] + 2 * inv * t * p1[1] + t * t * p2[1],
    ]);
  }
  return curve;
}

/**
 * Build a triangle polygon at the end of a curve to serve as an arrowhead.
 * The triangle points forward along the last segment of the curve.
 */
export function buildArrowheadTriangle(
  curve: [number, number][],
  headLengthDeg = 0.012,
  headWidthDeg = 0.006,
): [number, number][] | null {
  if (curve.length < 2) return null;

  const tip = curve[curve.length - 1];
  const prev = curve[curve.length - 2];

  const dx = tip[0] - prev[0];
  const dy = tip[1] - prev[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return null;

  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;

  const baseX = tip[0] - ux * headLengthDeg;
  const baseY = tip[1] - uy * headLengthDeg;

  const left: [number, number] = [baseX + px * headWidthDeg, baseY + py * headWidthDeg];
  const right: [number, number] = [baseX - px * headWidthDeg, baseY - py * headWidthDeg];

  return ensureCCW([tip, left, right, tip]);
}

/**
 * Build a HoI-style tapered arrow body as a filled polygon.
 * Wide at the base (baseHalfWidth), narrows linearly to tipHalfWidth near the arrowhead.
 * Returns a closed ring suitable for a GeoJSON Polygon.
 */
export function buildTaperedArrowBody(
  curve: [number, number][],
  baseHalfWidth: number,
  tipHalfWidth: number,
): [number, number][] | null {
  if (curve.length < 2) return null;

  const leftEdge: [number, number][] = [];
  const rightEdge: [number, number][] = [];

  for (let i = 0; i < curve.length; i++) {
    const t = i / (curve.length - 1); // 0 at base, 1 at tip
    const halfW = baseHalfWidth + (tipHalfWidth - baseHalfWidth) * t;

    // Compute perpendicular at this point
    let dx: number, dy: number;
    if (i < curve.length - 1) {
      dx = curve[i + 1][0] - curve[i][0];
      dy = curve[i + 1][1] - curve[i][1];
    } else {
      dx = curve[i][0] - curve[i - 1][0];
      dy = curve[i][1] - curve[i - 1][1];
    }
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) continue;
    const px = -dy / len;
    const py = dx / len;

    leftEdge.push([curve[i][0] + px * halfW, curve[i][1] + py * halfW]);
    rightEdge.push([curve[i][0] - px * halfW, curve[i][1] - py * halfW]);
  }

  // Close: left edge forward, right edge reversed — then ensure CCW for MapLibre fill
  const ring = [...leftEdge, ...rightEdge.reverse(), leftEdge[0]];
  return ensureCCW(ring);
}

/**
 * Find the closest point on a polyline (edgeList) to a target objective.
 * This is used to snap arrow origins from a unit's centroid to its sector's front line.
 */
export function getClosestPointOnSectorEdge(
  objective: [number, number],
  edgeList: [number, number][],
): [number, number] | null {
  if (edgeList.length < 2) return edgeList[0] || null;

  let minPoint = edgeList[0];
  let minDistSq = Infinity;

  for (let i = 0; i < edgeList.length - 1; i++) {
    const p = getClosestPointOnSegment(objective, edgeList[i], edgeList[i + 1]);
    const d2 = getDistSq(p, objective);
    if (d2 < minDistSq) {
      minDistSq = d2;
      minPoint = p;
    }
  }

  return minPoint;
}
