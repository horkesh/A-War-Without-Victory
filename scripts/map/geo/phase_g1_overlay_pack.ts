/**
 * Phase G1: Overlay pack — bundles ADM0, ADM3, and substrate (with optional transform)
 * for the debug viewer.
 *
 * Reads audit_report.json to determine fix_applied. Applies transform to a COPY of
 * substrate only for overlay preview. Does NOT modify canonical substrate.
 *
 * Outputs:
 *   - data/derived/_debug/geo_triangulation/overlay_data.json
 *   - data/derived/_debug/geo_triangulation/substrate_transformed_preview.geojson
 *
 * Usage: npm run map:geo:g1:overlay
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";


const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../..");
const DEBUG_DIR = resolve(REPO_ROOT, "data/derived/_debug/geo_triangulation");
const GEO_DIR = resolve(REPO_ROOT, "data/source/geo");
const ADM0_PATH = existsSync(resolve(GEO_DIR, "ADM0/geoBoundaries-BIH-ADM0.geojson"))
  ? resolve(GEO_DIR, "ADM0/geoBoundaries-BIH-ADM0.geojson")
  : resolve(GEO_DIR, "geoBoundaries-BIH-ADM0.geojson");
const ADM3_PATH = existsSync(resolve(GEO_DIR, "ADM3/geoBoundaries-BIH-ADM3.geojson"))
  ? resolve(GEO_DIR, "ADM3/geoBoundaries-BIH-ADM3.geojson")
  : resolve(GEO_DIR, "geoBoundaries-BIH-ADM3.geojson");
const SUBSTRATE_PATH = resolve(REPO_ROOT, "data/derived/settlements_substrate.geojson");
const AUDIT_PATH = resolve(DEBUG_DIR, "audit_report.json");

type Point = [number, number];

function transformRing(ring: Point[], fn: (p: Point) => Point): Point[] {
  return ring.map(fn);
}

function transformPolygon(
  coords: Point[][],
  fn: (p: Point) => Point
): Point[][] {
  return coords.map((ring) => transformRing(ring, fn));
}

function transformMultiPolygon(
  coords: Point[][][],
  fn: (p: Point) => Point
): Point[][][] {
  return coords.map((poly) => transformPolygon(poly, fn));
}

function swapAxes(p: Point): Point {
  return [p[1], p[0]];
}

function bboxAffine(
  srcBbox: { minX: number; minY: number; maxX: number; maxY: number },
  dstBbox: { minX: number; minY: number; maxX: number; maxY: number }
): (p: Point) => Point {
  const scaleX =
    dstBbox.maxX - dstBbox.minX !== 0
      ? (dstBbox.maxX - dstBbox.minX) / (srcBbox.maxX - srcBbox.minX)
      : 1;
  const scaleY =
    dstBbox.maxY - dstBbox.minY !== 0
      ? (dstBbox.maxY - dstBbox.minY) / (srcBbox.maxY - srcBbox.minY)
      : 1;
  const scale = Math.min(scaleX, scaleY);
  return (p: Point): Point => {
    const x = (p[0] - srcBbox.minX) * scale + dstBbox.minX;
    const y = (p[1] - srcBbox.minY) * scale + dstBbox.minY;
    return [x, y];
  };
}

function transformFeature(
  feature: { type: string; geometry: { type: string; coordinates: unknown }; properties?: unknown },
  fn: (p: Point) => Point
): { type: string; geometry: { type: string; coordinates: unknown }; properties?: unknown } {
  const geom = feature.geometry;
  let newCoords: unknown;
  if (geom.type === "Polygon") {
    newCoords = transformPolygon(geom.coordinates as Point[][], fn);
  } else if (geom.type === "MultiPolygon") {
    newCoords = transformMultiPolygon(geom.coordinates as Point[][][], fn);
  } else {
    newCoords = geom.coordinates;
  }
  return {
    ...feature,
    geometry: { type: geom.type, coordinates: newCoords },
  };
}

function main() {
  if (!existsSync(AUDIT_PATH)) {
    console.error("Run map:geo:g1:audit first to generate audit_report.json");
    process.exit(1);
  }

  mkdirSync(DEBUG_DIR, { recursive: true });

  const audit = JSON.parse(readFileSync(AUDIT_PATH, "utf8"));
  const fixApplied = audit.recommended_fix as string;

  const adm0Raw = readFileSync(ADM0_PATH, "utf8");
  const adm3Raw = readFileSync(ADM3_PATH, "utf8");
  const substrateRaw = readFileSync(SUBSTRATE_PATH, "utf8");

  const adm0 = JSON.parse(adm0Raw);
  const adm3 = JSON.parse(adm3Raw);
  const substrate = JSON.parse(substrateRaw);

  let substratePreview = JSON.parse(substrateRaw);
  const notes: string[] = [];

  if (fixApplied === "swap_axes") {
    substratePreview = {
      ...substratePreview,
      features: substrate.features.map((f: { type: string; geometry: { type: string; coordinates: unknown }; properties?: unknown }) =>
        transformFeature(f, swapAxes)
      ),
    };
    notes.push("Applied swap_axes (x,y -> y,x) to substrate preview.");
  } else if (fixApplied === "bbox_affine_seed") {
    const srcBbox = audit.substrate.bbox;
    const dstBbox = audit.adm0.bbox;
    const fn = bboxAffine(srcBbox, dstBbox);
    substratePreview = {
      ...substratePreview,
      features: substrate.features.map((f: { type: string; geometry: { type: string; coordinates: unknown }; properties?: unknown }) =>
        transformFeature(f, fn)
      ),
    };
    notes.push(
      "Applied bbox_affine_seed: scale+translate substrate bbox -> ADM0 bbox. Seed only; stronger fit may need control points."
    );
  } else if (fixApplied === "none") {
    notes.push("No transform applied; substrate and reference in compatible space.");
  } else {
    notes.push(
      `recommended_fix is "${fixApplied}"; no automatic transform applied for overlay. Substrate shown as-is for comparison.`
    );
  }

  const overlayData = {
    meta: {
      fix_applied: fixApplied,
      adm0_source_file: "data/source/geo/ADM0/geoBoundaries-BIH-ADM0.geojson",
      adm3_source_file: "data/source/geo/ADM3/geoBoundaries-BIH-ADM3.geojson",
      substrate_source_file: "data/derived/settlements_substrate.geojson",
      notes,
    },
    layers: {
      adm0,
      adm3,
      substrate_preview: substratePreview,
    },
  };

  writeFileSync(
    resolve(DEBUG_DIR, "overlay_data.json"),
    JSON.stringify(overlayData),
    "utf8"
  );
  writeFileSync(
    resolve(DEBUG_DIR, "substrate_transformed_preview.geojson"),
    JSON.stringify(substratePreview),
    "utf8"
  );

  console.log("Overlay pack complete. Output: data/derived/_debug/geo_triangulation/");
  console.log("fix_applied:", fixApplied);
}

main();
