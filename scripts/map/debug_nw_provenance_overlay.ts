/**
 * NW provenance overlay debug: Bihać raw vs viewBox transforms vs emitted substrate.
 * Produces deterministic debug GeoJSON and summary under data/derived/_debug/.
 * Does NOT change canonical geometry. Debug-only.
 *
 * Usage: npm run map:debug:nw:provenance
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import parseSVG from 'svg-path-parser';


type Point = [number, number];
type Ring = Point[];
type Polygon = Ring[];

interface ParsedShape {
  path: string;
  shapeIndex: number;
}

interface ParsedBihac {
  viewBox: { x: number; y: number; width: number; height: number } | null;
  shapes: ParsedShape[];
}

function flattenCurve(
  x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number,
  segments: number = 16
): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;
    const x = mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3;
    const y = mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3;
    points.push([x, y]);
  }
  return points;
}

function flattenQuadraticCurve(
  x0: number, y0: number, x1: number, y1: number, x2: number, y2: number,
  segments: number = 16
): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;
    const x = mt * mt * x0 + 2 * mt * t * x1 + t * t * x2;
    const y = mt * mt * y0 + 2 * mt * t * y1 + t * t * y2;
    points.push([x, y]);
  }
  return points;
}

function computeRingArea(ring: Point[]): number {
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    area += ring[i][0] * ring[j][1];
    area -= ring[j][0] * ring[i][1];
  }
  return area / 2;
}

function svgPathToPolygon(svgPath: string): Polygon | null {
  if (!svgPath || !svgPath.trim()) return null;
  try {
    const commands = parseSVG(svgPath);
    parseSVG.makeAbsolute(commands);
    const coordinates: Point[] = [];
    let startX = 0, startY = 0, lastX = 0, lastY = 0;
    let hasMove = false;

    for (const cmd of commands) {
      const code = cmd.code.toUpperCase();
      switch (code) {
        case 'M': {
          const x = cmd.x!;
          const y = cmd.y!;
          if (hasMove && coordinates.length > 0 &&
              (coordinates[coordinates.length - 1][0] !== startX || coordinates[coordinates.length - 1][1] !== startY)) {
            coordinates.push([startX, startY]);
          }
          startX = x;
          startY = y;
          lastX = x;
          lastY = y;
          hasMove = true;
          coordinates.push([x, y]);
          break;
        }
        case 'L':
          lastX = cmd.x!;
          lastY = cmd.y!;
          coordinates.push([lastX, lastY]);
          break;
        case 'H':
          lastX = cmd.x!;
          coordinates.push([lastX, lastY]);
          break;
        case 'V':
          lastY = cmd.y!;
          coordinates.push([lastX, lastY]);
          break;
        case 'Z':
          if (coordinates.length > 0 && (coordinates[coordinates.length - 1][0] !== startX || coordinates[coordinates.length - 1][1] !== startY)) {
            coordinates.push([startX, startY]);
          }
          break;
        case 'C': {
          const curvePoints = flattenCurve(lastX, lastY, cmd.x1!, cmd.y1!, cmd.x2!, cmd.y2!, cmd.x!, cmd.y!, 16);
          for (let i = 1; i < curvePoints.length; i++) coordinates.push(curvePoints[i]);
          lastX = cmd.x!;
          lastY = cmd.y!;
          break;
        }
        case 'Q': {
          const curvePoints = flattenQuadraticCurve(lastX, lastY, cmd.x1!, cmd.y1!, cmd.x!, cmd.y!, 16);
          for (let i = 1; i < curvePoints.length; i++) coordinates.push(curvePoints[i]);
          lastX = cmd.x!;
          lastY = cmd.y!;
          break;
        }
        default: {
          const x = cmd.x!;
          const y = cmd.y!;
          lastX = x;
          lastY = y;
          coordinates.push([x, y]);
        }
      }
    }

    if (coordinates.length > 0 && hasMove &&
        (coordinates[coordinates.length - 1][0] !== startX || coordinates[coordinates.length - 1][1] !== startY)) {
      coordinates.push([startX, startY]);
    }
    if (coordinates.length < 4) return null;

    const area = computeRingArea(coordinates);
    if (area > 0) coordinates.reverse();
    return [coordinates];
  } catch {
    return null;
  }
}

function closeRingDeterministically(ring: Ring): Ring {
  if (ring.length === 0) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, [first[0], first[1]]];
}

function closePolygonRings(polygon: Polygon): Polygon {
  return polygon.map((ring) => (ring && ring.length ? closeRingDeterministically(ring) : ring));
}

function translatePolygon(polygon: Polygon, dx: number, dy: number): Polygon {
  return polygon.map((ring) =>
    ring.map((pt) => [pt[0] + dx, pt[1] + dy] as Point)
  );
}

function deepCopyPolygon(polygon: Polygon): Polygon {
  return polygon.map((ring) => ring.map((pt) => [pt[0], pt[1]] as Point));
}

/** Parse Bihac JS file (same regex as derive script). */
function parseBihacFile(filePath: string): ParsedBihac {
  const content = readFileSync(filePath, 'utf8');
  const viewBoxMatch = content.match(/R\.setViewBox\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/);
  const viewBox = viewBoxMatch
    ? { x: parseFloat(viewBoxMatch[1]), y: parseFloat(viewBoxMatch[2]), width: parseFloat(viewBoxMatch[3]), height: parseFloat(viewBoxMatch[4]) }
    : null;

  const shapes: ParsedShape[] = [];
  let shapeIndex = 0;
  const pathWithMunIDRegex = /R\.path\s*\(\s*"([^"]+)"\s*\)\s*\.data\s*\(\s*"munID"\s*,\s*(\d+)\s*\)/g;
  let match;
  while ((match = pathWithMunIDRegex.exec(content)) !== null) {
    shapes.push({ path: match[1], shapeIndex: shapeIndex++ });
  }
  if (shapes.length === 0) {
    const simplePathRegex = /R\.path\s*\(\s*"([^"]+)"\s*\)/g;
    let simpleMatch;
    while ((simpleMatch = simplePathRegex.exec(content)) !== null) {
      shapes.push({ path: simpleMatch[1], shapeIndex: shapeIndex++ });
    }
  }
  return { viewBox, shapes };
}

function bboxFromPolygon(polygon: Polygon): { minx: number; miny: number; maxx: number; maxy: number } {
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const ring of polygon) {
    for (const pt of ring) {
      if (isFinite(pt[0]) && isFinite(pt[1])) {
        minx = Math.min(minx, pt[0]);
        miny = Math.min(miny, pt[1]);
        maxx = Math.max(maxx, pt[0]);
        maxy = Math.max(maxy, pt[1]);
      }
    }
  }
  return { minx, miny, maxx, maxy };
}

function bboxFromFeatures(features: Array<{ geometry: { coordinates: Polygon } }>): [number, number, number, number] {
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const f of features) {
    const geom = f.geometry;
    if (!geom || !geom.coordinates) continue;
    const poly = geom.coordinates as Polygon;
    for (const ring of poly) {
      if (!Array.isArray(ring)) continue;
      for (const pt of ring) {
        if (Array.isArray(pt) && pt.length >= 2 && isFinite(pt[0]) && isFinite(pt[1])) {
          minx = Math.min(minx, pt[0]);
          miny = Math.min(miny, pt[1]);
          maxx = Math.max(maxx, pt[0]);
          maxy = Math.max(maxy, pt[1]);
        }
      }
    }
  }
  if (!isFinite(minx)) return [0, 0, 0, 0];
  return [minx, miny, maxx, maxy];
}

const BIHAC_SOURCE_FILE = 'Bihac_10049.js';
const BIHAC_MUN_ID = '10049';

function main(): void {
  const settlementsDir = resolve('data/source/settlements');
  const derivedDir = resolve('data/derived');
  const debugDir = resolve(derivedDir, '_debug');
  const substratePath = resolve(derivedDir, 'settlements_substrate.geojson');

  mkdirSync(debugDir, { recursive: true });

  const bihacPath = resolve(settlementsDir, BIHAC_SOURCE_FILE);
  const parsed = parseBihacFile(bihacPath);
  const vx = parsed.viewBox?.x ?? 0;
  const vy = parsed.viewBox?.y ?? 0;

  type LayerName = 'raw_none' | 'raw_plus_viewbox' | 'raw_minus_viewbox' | 'emitted_substrate';
  const layers: LayerName[] = ['raw_none', 'raw_plus_viewbox', 'raw_minus_viewbox', 'emitted_substrate'];
  const features: Array<{ type: 'Feature'; properties: { layer: LayerName; source_file: string; note: string }; geometry: { type: 'Polygon'; coordinates: Polygon } }> = [];
  const layerCounts: Record<LayerName, number> = { raw_none: 0, raw_plus_viewbox: 0, raw_minus_viewbox: 0, emitted_substrate: 0 };
  const layerBboxes: Record<LayerName, { minx: number; miny: number; maxx: number; maxy: number } | null> = {
    raw_none: null,
    raw_plus_viewbox: null,
    raw_minus_viewbox: null,
    emitted_substrate: null,
  };

  for (let i = 0; i < parsed.shapes.length; i++) {
    const shape = parsed.shapes[i];
    const rawPoly = svgPathToPolygon(shape.path);
    if (!rawPoly || !rawPoly[0] || rawPoly[0].length < 4) continue;
    const closed = closePolygonRings(deepCopyPolygon(rawPoly));

    const polyNone = closed;
    const polyPlus = translatePolygon(deepCopyPolygon(closed), vx, vy);
    const polyMinus = translatePolygon(deepCopyPolygon(closed), -vx, -vy);

    for (const [layer, coords] of [
      ['raw_none', polyNone],
      ['raw_plus_viewbox', polyPlus],
      ['raw_minus_viewbox', polyMinus],
    ] as const) {
      features.push({
        type: 'Feature',
        properties: {
          layer,
          source_file: BIHAC_SOURCE_FILE,
          note: `shape_${shape.shapeIndex} ${layer}`,
        },
        geometry: { type: 'Polygon', coordinates: coords },
      });
      layerCounts[layer]++;
      const b = bboxFromPolygon(coords);
      if (!layerBboxes[layer]) layerBboxes[layer] = b;
      else {
        layerBboxes[layer]!.minx = Math.min(layerBboxes[layer]!.minx, b.minx);
        layerBboxes[layer]!.miny = Math.min(layerBboxes[layer]!.miny, b.miny);
        layerBboxes[layer]!.maxx = Math.max(layerBboxes[layer]!.maxx, b.maxx);
        layerBboxes[layer]!.maxy = Math.max(layerBboxes[layer]!.maxy, b.maxy);
      }
    }
  }

  const substrateContent = readFileSync(substratePath, 'utf8');
  const substrate = JSON.parse(substrateContent) as { type: string; features: Array<{ type: string; properties: Record<string, unknown>; geometry: { type: string; coordinates: unknown } }> };
  if (substrate.type === 'FeatureCollection' && Array.isArray(substrate.features)) {
    const bihacFeatures = substrate.features.filter(
      (f) => String(f.properties?.municipality_id ?? '') === BIHAC_MUN_ID
    );
    for (const f of bihacFeatures) {
      const geom = f.geometry;
      if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) continue;
      const coords = geom.coordinates as Polygon | Polygon[];
      const polys: Polygon[] =
        geom.type === 'MultiPolygon'
          ? (coords as Polygon[])
          : [coords as Polygon];
      for (const poly of polys) {
        if (!poly || !poly[0]) continue;
        features.push({
          type: 'Feature',
          properties: {
            layer: 'emitted_substrate',
            source_file: BIHAC_SOURCE_FILE,
            note: `substrate municipality_id=${BIHAC_MUN_ID}`,
          },
          geometry: { type: 'Polygon', coordinates: poly },
        });
        layerCounts.emitted_substrate++;
        const b = bboxFromPolygon(poly);
        if (!layerBboxes.emitted_substrate) layerBboxes.emitted_substrate = b;
        else {
          layerBboxes.emitted_substrate!.minx = Math.min(layerBboxes.emitted_substrate!.minx, b.minx);
          layerBboxes.emitted_substrate!.miny = Math.min(layerBboxes.emitted_substrate!.miny, b.miny);
          layerBboxes.emitted_substrate!.maxx = Math.max(layerBboxes.emitted_substrate!.maxx, b.maxx);
          layerBboxes.emitted_substrate!.maxy = Math.max(layerBboxes.emitted_substrate!.maxy, b.maxy);
        }
      }
    }
  }

  features.sort((a, b) => {
    const layerCmp = a.properties.layer.localeCompare(b.properties.layer);
    if (layerCmp !== 0) return layerCmp;
    return a.properties.note.localeCompare(b.properties.note);
  });

  const bbox = bboxFromFeatures(features);
  const fc = {
    type: 'FeatureCollection',
    awwv_meta: {
      schema: 'awwv://schemas/debug_nw_provenance_v0.json',
      coordinate_space: 'SVG_PIXELS_LEGACY',
      bbox_world: bbox,
    },
    features,
  };

  const outPath = resolve(debugDir, 'nw_provenance_overlay_bihac.geojson');
  writeFileSync(outPath, JSON.stringify(fc, null, 2), 'utf8');
  process.stdout.write(`Wrote ${outPath}\n`);

  const summaryLines = [
    'NW provenance overlay — Bihać',
    '=============================',
    '',
    `viewBox: ${parsed.viewBox ? `x=${vx} y=${vy} width=${parsed.viewBox.width} height=${parsed.viewBox.height}` : 'null'}`,
    '',
    'bbox per layer:',
    ...layers.map((l) => {
      const b = layerBboxes[l];
      const str = b ? `[${b.minx}, ${b.miny}, ${b.maxx}, ${b.maxy}]` : 'N/A';
      return `  ${l}: ${str}`;
    }),
    '',
    'polygon count per layer:',
    ...layers.map((l) => `  ${l}: ${layerCounts[l]}`),
    '',
  ];
  const summaryPath = resolve(debugDir, 'nw_provenance_overlay_bihac.summary.txt');
  writeFileSync(summaryPath, summaryLines.join('\n'), 'utf8');
  process.stdout.write(`Wrote ${summaryPath}\n`);
}

main();
