/**
 * Phase G1: GeoBoundaries triangulation audit + coordinate unification plan
 *
 * Audits ADM0/ADM3 GeoJSON vs canonical settlement substrate. Determines CRS,
 * bounds, geometry validity, and recommends a fix (none, swap_axes, bbox_affine_seed, etc.).
 *
 * Outputs (deterministic, no timestamps):
 *   - data/derived/_debug/geo_triangulation/audit_report.json
 *   - data/derived/_debug/geo_triangulation/audit_report.txt
 *
 * Usage: npm run map:geo:g1:audit
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";


const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../..");
const GEO_SOURCE = resolve(REPO_ROOT, "data/source/geo");
const ADM0_DIR = resolve(GEO_SOURCE, "ADM0");
const ADM3_DIR = resolve(GEO_SOURCE, "ADM3");
const DEBUG_DIR = resolve(REPO_ROOT, "data/derived/_debug/geo_triangulation");
const SUBSTRATE_PATH = resolve(REPO_ROOT, "data/derived/settlements_substrate.geojson");

type Bbox = { minX: number; minY: number; maxX: number; maxY: number };

interface DatasetReport {
  source_file: string;
  feature_count: number;
  polygon_count: number;
  multiPolygon_count: number;
  vertex_count_approx: number;
  bbox: Bbox;
  coord_first: [number, number];
  coord_last: [number, number];
  x_range: { min: number; max: number };
  y_range: { min: number; max: number };
  wgs84_like: boolean;
  axis_swapped: boolean;
  projected_like: boolean;
  pixel_like: boolean;
  invalid_rings: number;
  non_closed_rings: number;
  crs_hint?: string;
}

interface Geometry {
  type: string;
  coordinates: unknown;
}

function collectCoords(geom: Geometry): [number, number][] {
  const out: [number, number][] = [];
  function walk(c: unknown) {
    if (Array.isArray(c)) {
      if (c.length >= 2 && typeof c[0] === "number" && typeof c[1] === "number") {
        out.push([c[0], c[1]]);
      } else {
        c.forEach(walk);
      }
    }
  }
  const c = geom.coordinates as unknown;
  if (geom.type === "Point") {
    out.push(c as [number, number]);
  } else if (geom.type === "LineString") {
    (c as [number, number][]).forEach((p) => out.push(p));
  } else if (geom.type === "Polygon") {
    (c as [number, number][][]).forEach((ring) => ring.forEach((p) => out.push(p)));
  } else if (geom.type === "MultiPolygon") {
    (c as [number, number][][][]).forEach((poly) =>
      poly.forEach((ring) => ring.forEach((p) => out.push(p)))
    );
  }
  return out;
}

function computeBbox(coords: [number, number][]): Bbox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of coords) {
    if (Number.isFinite(x) && Number.isFinite(y)) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return {
    minX: minX === Infinity ? 0 : minX,
    minY: minY === Infinity ? 0 : minY,
    maxX: maxX === -Infinity ? 0 : maxX,
    maxY: maxY === -Infinity ? 0 : maxY,
  };
}

function classifyCoordSpace(bbox: Bbox, coords: [number, number][]): {
  wgs84_like: boolean;
  axis_swapped: boolean;
  projected_like: boolean;
  pixel_like: boolean;
} {
  const { minX, minY, maxX, maxY } = bbox;
  const width = maxX - minX;
  const height = maxY - minY;
  const xRange = { min: minX, max: maxX };
  const yRange = { min: minY, max: maxY };

  // WGS84: lon -180..180, lat -90..90. Bosnia: lon ~15-20, lat ~42-46
  const bosniaLonRange = minX >= 14 && maxX <= 20 && minY >= 42 && maxY <= 46;
  const bosniaLatLonSwapped = minX >= 42 && maxX <= 46 && minY >= 14 && maxY <= 20;
  // Must have BOTH axes in degree-like range (exclude pixel coords like 900+)
  const allInDegreeRange = maxX <= 180 && maxY <= 90 && minX >= -180 && minY >= -90;

  let wgs84_like = false;
  let axis_swapped = false;
  let projected_like = false;
  let pixel_like = false;

  if (bosniaLatLonSwapped && allInDegreeRange) {
    axis_swapped = true;
    wgs84_like = true;
  } else if (bosniaLonRange || (allInDegreeRange && width < 50 && height < 50)) {
    wgs84_like = true;
  }

  // Projected (meters): typically 5–7 digit values, much larger than deg
  if (!wgs84_like && (Math.abs(minX) > 1e5 || Math.abs(maxX) > 1e5 || Math.abs(minY) > 1e5 || Math.abs(maxY) > 1e5)) {
    projected_like = true;
  }

  // Pixel/SVG: moderate ranges, typically 0–1000 or similar, not degrees
  if (!wgs84_like && !projected_like) {
    const extent = Math.max(width, height);
    if (extent > 50 && extent < 1e6 && (minX < -100 || maxX > 200 || minY < -100 || maxY > 200)) {
      pixel_like = true;
    }
  }

  return { wgs84_like, axis_swapped, projected_like, pixel_like };
}

function countInvalidRings(geom: Geometry): { invalid: number; nonClosed: number } {
  let invalid = 0;
  let nonClosed = 0;
  const coords = geom.coordinates as unknown;
  function checkRing(ring: [number, number][]) {
    if (ring.length < 3) invalid++;
    else {
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) nonClosed++;
    }
  }
  if (geom.type === "Polygon") {
    (coords as [number, number][][]).forEach(checkRing);
  } else if (geom.type === "MultiPolygon") {
    (coords as [number, number][][][]).forEach((poly) => poly.forEach(checkRing));
  }
  return { invalid, nonClosed };
}

interface FeatureCollection {
  type: string;
  features?: Array<{ geometry?: Geometry }>;
  crs?: { properties?: { name?: string } };
}

function auditGeoJSON(path: string, fc: FeatureCollection): DatasetReport {
  const coords: [number, number][] = [];
  let polygonCount = 0;
  let multiPolygonCount = 0;
  let invalidRings = 0;
  let nonClosedRings = 0;

  for (const f of fc.features || []) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === "Polygon") polygonCount++;
    else if (g.type === "MultiPolygon") multiPolygonCount++;
    const pts = collectCoords(g);
    coords.push(...pts);
    const { invalid, nonClosed } = countInvalidRings(g);
    invalidRings += invalid;
    nonClosedRings += nonClosed;
  }

  const bbox = computeBbox(coords);
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const c of coords) {
    if (Number.isFinite(c[0])) {
      xMin = Math.min(xMin, c[0]);
      xMax = Math.max(xMax, c[0]);
    }
    if (Number.isFinite(c[1])) {
      yMin = Math.min(yMin, c[1]);
      yMax = Math.max(yMax, c[1]);
    }
  }
  if (xMin === Infinity) xMin = 0;
  if (xMax === -Infinity) xMax = 0;
  if (yMin === Infinity) yMin = 0;
  if (yMax === -Infinity) yMax = 0;
  const { wgs84_like, axis_swapped, projected_like, pixel_like } = classifyCoordSpace(
    bbox,
    coords
  );

  const crsHint = fc.crs?.properties?.name;

  return {
    source_file: path,
    feature_count: fc.features?.length ?? 0,
    polygon_count: polygonCount,
    multiPolygon_count: multiPolygonCount,
    vertex_count_approx: coords.length,
    bbox,
    coord_first: coords[0] ?? [0, 0],
    coord_last: coords[coords.length - 1] ?? [0, 0],
    x_range: { min: xMin, max: xMax },
    y_range: { min: yMin, max: yMax },
    wgs84_like,
    axis_swapped,
    projected_like,
    pixel_like,
    invalid_rings: invalidRings,
    non_closed_rings: nonClosedRings,
    crs_hint: crsHint,
  };
}

function ensureExtracted() {
  const adm0Geojson = resolve(ADM0_DIR, "geoBoundaries-BIH-ADM0.geojson");
  const adm3Geojson = resolve(ADM3_DIR, "geoBoundaries-BIH-ADM3.geojson");

  if (!existsSync(adm0Geojson)) {
    mkdirSync(ADM0_DIR, { recursive: true });
    const zipPath = resolve(GEO_SOURCE, "geoBoundaries-BIH-ADM0-all.zip");
    if (existsSync(zipPath)) {
      const zip = new AdmZip(zipPath);
      zip.extractEntryTo("geoBoundaries-BIH-ADM0.geojson", ADM0_DIR, false, false);
    } else {
      throw new Error(`Missing ${zipPath}; cannot extract ADM0`);
    }
  }
  if (!existsSync(adm3Geojson)) {
    mkdirSync(ADM3_DIR, { recursive: true });
    const zipPath = resolve(GEO_SOURCE, "geoBoundaries-BIH-ADM3-all.zip");
    if (existsSync(zipPath)) {
      const zip = new AdmZip(zipPath);
      zip.extractEntryTo("geoBoundaries-BIH-ADM3.geojson", ADM3_DIR, false, false);
    } else {
      throw new Error(`Missing ${zipPath}; cannot extract ADM3`);
    }
  }
  return { adm0Geojson, adm3Geojson };
}

function main() {
  mkdirSync(DEBUG_DIR, { recursive: true });
  const { adm0Geojson, adm3Geojson } = ensureExtracted();

  const adm0Raw = readFileSync(adm0Geojson, "utf8");
  const adm3Raw = readFileSync(adm3Geojson, "utf8");
  const substrateRaw = readFileSync(SUBSTRATE_PATH, "utf8");

  const adm0 = JSON.parse(adm0Raw) as FeatureCollection;
  const adm3 = JSON.parse(adm3Raw) as FeatureCollection;
  const substrate = JSON.parse(substrateRaw) as FeatureCollection;

  const adm0Report = auditGeoJSON("ADM0/geoBoundaries-BIH-ADM0.geojson", adm0);
  const adm3Report = auditGeoJSON("ADM3/geoBoundaries-BIH-ADM3.geojson", adm3);
  const substrateReport = auditGeoJSON("data/derived/settlements_substrate.geojson", substrate);

  // Determine recommended fix
  let recommended_fix:
    | "none"
    | "swap_axes"
    | "reproject"
    | "bbox_affine_seed"
    | "unknown_need_manual_control_points" = "none";

  if (substrateReport.axis_swapped) {
    recommended_fix = "swap_axes";
  } else if (substrateReport.pixel_like && adm0Report.wgs84_like) {
    recommended_fix = "bbox_affine_seed";
  } else if (substrateReport.projected_like) {
    recommended_fix = "unknown_need_manual_control_points";
  } else if (!substrateReport.wgs84_like && adm0Report.wgs84_like) {
    recommended_fix = "bbox_affine_seed";
  } else if (substrateReport.wgs84_like && !substrateReport.axis_swapped) {
    recommended_fix = "none";
  }

  const report = {
    adm0: adm0Report,
    adm3: adm3Report,
    substrate: substrateReport,
    substrate_is_wgs84_like: substrateReport.wgs84_like,
    substrate_axis_swapped: substrateReport.axis_swapped,
    substrate_is_projected_like: substrateReport.projected_like,
    substrate_is_pixel_like: substrateReport.pixel_like,
    recommended_fix,
    coordinate_unification_plan:
      recommended_fix === "none"
        ? "No fix needed; substrate and reference are in compatible coordinate space."
        : recommended_fix === "swap_axes"
          ? "Swap x/y axes on substrate to align with WGS84 (lon, lat) convention."
          : recommended_fix === "bbox_affine_seed"
            ? "Apply bbox-to-bbox affine (scale+translate) to map substrate bounds onto ADM0 bounds. Seed only; may require additional control points for precise fit."
            : "Unable to auto-determine transform; manual control points or CRS identification required.",
  };

  const reportPath = resolve(DEBUG_DIR, "audit_report.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  const txt = [
    "Phase G1 GeoBoundaries Triangulation Audit",
    "==========================================",
    "",
    "ADM0 (national border):",
    `  Features: ${adm0Report.feature_count}, Polygons: ${adm0Report.polygon_count}, MultiPolygons: ${adm0Report.multiPolygon_count}`,
    `  Bbox: minX=${adm0Report.bbox.minX.toFixed(6)} minY=${adm0Report.bbox.minY.toFixed(6)} maxX=${adm0Report.bbox.maxX.toFixed(6)} maxY=${adm0Report.bbox.maxY.toFixed(6)}`,
    `  WGS84-like: ${adm0Report.wgs84_like}, CRS hint: ${adm0Report.crs_hint ?? "none"}`,
    "",
    "ADM3 (municipalities):",
    `  Features: ${adm3Report.feature_count}, Polygons: ${adm3Report.polygon_count}, MultiPolygons: ${adm3Report.multiPolygon_count}`,
    `  Bbox: minX=${adm3Report.bbox.minX.toFixed(6)} minY=${adm3Report.bbox.minY.toFixed(6)} maxX=${adm3Report.bbox.maxX.toFixed(6)} maxY=${adm3Report.bbox.maxY.toFixed(6)}`,
    `  WGS84-like: ${adm3Report.wgs84_like}`,
    "",
    "Substrate (settlements_substrate.geojson):",
    `  Features: ${substrateReport.feature_count}, Polygons: ${substrateReport.polygon_count}, MultiPolygons: ${substrateReport.multiPolygon_count}`,
    `  Bbox: minX=${substrateReport.bbox.minX.toFixed(6)} minY=${substrateReport.bbox.minY.toFixed(6)} maxX=${substrateReport.bbox.maxX.toFixed(6)} maxY=${substrateReport.bbox.maxY.toFixed(6)}`,
    `  WGS84-like: ${substrateReport.wgs84_like}, axis_swapped: ${substrateReport.axis_swapped}`,
    `  pixel_like: ${substrateReport.pixel_like}, projected_like: ${substrateReport.projected_like}`,
    "",
    "Conclusion:",
    `  substrate_is_wgs84_like: ${report.substrate_is_wgs84_like}`,
    `  substrate_axis_swapped: ${report.substrate_axis_swapped}`,
    `  substrate_is_projected_like: ${report.substrate_is_projected_like}`,
    `  substrate_is_pixel_like: ${report.substrate_is_pixel_like}`,
    `  recommended_fix: ${report.recommended_fix}`,
    "",
    "Coordinate unification plan:",
    `  ${report.coordinate_unification_plan}`,
  ].join("\n");

  writeFileSync(resolve(DEBUG_DIR, "audit_report.txt"), txt, "utf8");
  console.log("Audit complete. Report written to data/derived/_debug/geo_triangulation/");
  console.log("recommended_fix:", recommended_fix);
}

main();
