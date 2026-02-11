/**
 * Merge post-1995 ADM3 GeoJSON into 1990 municipalities.
 *
 * Reads:
 *   - data/source/1990 to 1995 municipalities_BiH.xlsx (Municipality → Pre-1995 municipality)
 *   - data/source/boundaries/bih_adm3.geojson (post-1995 boundaries)
 *   - data/source/boundaries/bih_adm0.geojson (BiH boundary, for difference-derived munis)
 *
 * Dissolves polygons by mun1990 (Pre-1995 municipality). Municipalities missing from post-1995
 * (e.g. Višegrad) are derived by difference: BiH minus union of others, so borders align.
 *
 * Deterministic: stable ordering, no timestamps, explicit sort.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import * as XLSX from 'xlsx';
import * as turf from '@turf/turf';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const EXCEL_PATH = resolve(ROOT, 'data/source/1990 to 1995 municipalities_BiH.xlsx');
const ADM3_PATH = resolve(ROOT, 'data/source/boundaries/bih_adm3.geojson');
const BIH_BOUNDARY_PATH = resolve(ROOT, 'data/source/boundaries/bih_adm0.geojson');
const OUTPUT_PATH = resolve(ROOT, 'data/source/boundaries/bih_adm3_1990.geojson');

/** Municipalities not in post-1995 ADM3; derive by difference (BiH minus others). [lon, lat] = centroid for disambiguation. */
const DERIVE_BY_DIFFERENCE: Record<string, [number, number]> = {
  Višegrad: [19.2948, 43.794], // Višegrad town
};

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Normalize for matching: NFD strip marks, hyphens→space, strip (FBiH)/(RS) suffix. */
function normalizeForMatch(s: string): string {
  let step = normalizeWhitespace(s)
    .replace(/\s*\((?:FBiH|RS|BiH)\)\s*$/i, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return step.normalize('NFD').replace(/\p{M}/gu, '');
}

/** shapeName (from GeoJSON) → Excel "Municipality" when they differ. Deterministic overrides. */
const SHAPE_NAME_TO_EXCEL_MUNICIPALITY: Record<string, string> = {
  'Brcko District': 'Brčko',
  'Centar': 'Centar Sarajevo',
  'Stari Grad': 'Stari Grad Sarajevo',
  'Doboj East': 'Doboj-Istok',
  'Doboj Jug': 'Doboj-Jug',
  'Kupra na Uni': 'Krupa na Uni',
  'Kupres (BiH)': 'Kupres',
  'Istočni Mostar': 'Grad Mostar',
  'Foča-Ustikolina': 'Foča',
  'Pale-Prača': 'Pale',
  'Trnovo (BiH)': 'Trnovo',
  'Mostar': 'Grad Mostar',
  'Goražde': 'Novo Goražde',
};

/**
 * Sarajevo bbox (lon, lat): post-1995 "Novi Grad" appears twice—
 * (1) Novi Grad Sarajevo (Sarajevo borough, ~18.3°E 43.86°N)
 * (2) Bosanski Novi renamed to Novi Grad (northwest, ~16.4°E 45.0°N).
 * Disambiguate by centroid.
 */
const SARAJEVO_LON_MIN = 18.2;
const SARAJEVO_LON_MAX = 18.6;
const SARAJEVO_LAT_MIN = 43.78;
const SARAJEVO_LAT_MAX = 44.05;

/** shapeName → mun1990 when not in Excel or to override Excel. */
const SHAPE_NAME_TO_MUN1990_DIRECT: Record<string, string | null> = {
  'Milići': 'Vlasenica',
  'Ribnik': 'Ključ',
  'Ustiprača': 'Goražde',
  'Republika Srpska': null, // exclude – entity boundary, not a municipality
  'Istočni Stari Grad': 'Stari Grad Sarajevo', // merge into Stari Grad Sarajevo (not Novi Grad Sarajevo)
  'Istočno Novo Sarajevo': 'Novo Sarajevo', // merge into Novo Sarajevo (not Stari Grad Sarajevo)
  Petrovo: 'Gračanica', // post-1995 Petrovo split from Gračanica; merge back for 1990 boundaries
};

interface ExcelRow {
  post1995: string;
  mun1990: string;
}

async function loadExcelMapping(): Promise<Map<string, string>> {
  const buffer = await readFile(EXCEL_PATH);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet || !sheet['!ref']) throw new Error('Excel sheet empty');

  const range = XLSX.utils.decode_range(sheet['!ref']);
  const colPost = 0;
  const colPre = 1;

  const postToPre = new Map<string, string>();
  for (let r = 1; r <= range.e.r; r++) {
    const cellA = sheet[XLSX.utils.encode_cell({ r, c: colPost })];
    const cellB = sheet[XLSX.utils.encode_cell({ r, c: colPre })];
    const post = cellA && cellA.v != null ? normalizeWhitespace(String(cellA.v)) : '';
    const pre = cellB && cellB.v != null ? normalizeWhitespace(String(cellB.v)) : '';
    if (post && pre) {
      postToPre.set(post, pre);
      postToPre.set(normalizeForMatch(post), pre);
    }
  }
  return postToPre;
}

async function loadExpectedMun1990FromExcel(): Promise<Set<string>> {
  const buffer = await readFile(EXCEL_PATH);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet || !sheet['!ref']) return new Set();

  const range = XLSX.utils.decode_range(sheet['!ref']);
  const colPre = 1;
  const set = new Set<string>();
  for (let r = 1; r <= range.e.r; r++) {
    const cell = sheet[XLSX.utils.encode_cell({ r, c: colPre })];
    const pre = cell && cell.v != null ? normalizeWhitespace(String(cell.v)) : '';
    if (pre) set.add(pre);
  }
  return set;
}

/** Ensure ring is closed and has 4+ positions. */
function validRing(ring: number[][]): number[][] | null {
  if (!ring || ring.length < 3) return null;
  const closed =
    ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
      ? ring
      : [...ring, ring[0]];
  return closed.length >= 4 ? closed : null;
}

/** Flatten Polygon/MultiPolygon to array of valid Polygon features (turf.union needs Polygons). */
function flattenToPolygons(
  f: turf.helpers.Feature<turf.helpers.Polygon | turf.helpers.MultiPolygon>
): turf.helpers.Feature<turf.helpers.Polygon>[] {
  const g = f.geometry;
  const out: turf.helpers.Feature<turf.helpers.Polygon>[] = [];

  if (g.type === 'Polygon') {
    const outer = validRing(g.coordinates[0]);
    if (outer) {
      const holes = g.coordinates.slice(1).map(validRing).filter((r): r is number[][] => r != null);
      out.push(turf.polygon([outer, ...holes]));
    }
    return out;
  }

  for (const polyCoords of g.coordinates) {
    if (!Array.isArray(polyCoords) || polyCoords.length === 0) continue;
    const outer = validRing(polyCoords[0] as number[][]);
    if (!outer) continue;
    const holes = (polyCoords as number[][][]).slice(1).map(validRing).filter((r): r is number[][] => r != null);
    try {
      out.push(turf.polygon([outer, ...holes]));
    } catch {
      // skip degenerate
    }
  }
  return out;
}

function resolveMun1990(
  shapeName: string,
  excelMap: Map<string, string>,
  feature?: GeoJSON.Feature
): string | null {
  const direct = SHAPE_NAME_TO_MUN1990_DIRECT[shapeName];
  if (direct !== undefined) return direct;

  if (shapeName === 'Novi Grad' && feature) {
    const c = turf.centroid(feature as turf.helpers.Feature);
    const [lon, lat] = c.geometry.coordinates;
    const inSarajevo =
      lon >= SARAJEVO_LON_MIN &&
      lon <= SARAJEVO_LON_MAX &&
      lat >= SARAJEVO_LAT_MIN &&
      lat <= SARAJEVO_LAT_MAX;
    return inSarajevo ? 'Novi Grad Sarajevo' : 'Bosanski Novi';
  }

  const excelName = SHAPE_NAME_TO_EXCEL_MUNICIPALITY[shapeName] ?? shapeName;
  const byExact = excelMap.get(excelName);
  if (byExact) return byExact;

  const norm = normalizeForMatch(excelName);
  return excelMap.get(norm) ?? null;
}

async function main(): Promise<void> {
  console.log('Merge post-1995 ADM3 → 1990 municipalities');
  console.log('  Excel:', EXCEL_PATH);
  console.log('  ADM3:', ADM3_PATH);
  console.log('  Output:', OUTPUT_PATH);

  const excelMap = await loadExcelMapping();
  const geojson = JSON.parse(await readFile(ADM3_PATH, 'utf8')) as GeoJSON.FeatureCollection;

  const byMun1990 = new Map<string, turf.helpers.Feature<turf.helpers.Polygon | turf.helpers.MultiPolygon>[]>();
  const unmapped: string[] = [];

  for (const f of geojson.features) {
    const shapeName = (f.properties?.shapeName as string) ?? '';
    const mun1990 = resolveMun1990(shapeName, excelMap, f);

    if (!mun1990) {
      unmapped.push(shapeName);
      continue;
    }

    const geom = f.geometry;
    if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) continue;

    const poly = turf.feature(geom) as turf.helpers.Feature<
      turf.helpers.Polygon | turf.helpers.MultiPolygon
    >;
    if (!turf.booleanValid(poly)) continue;

    const list = byMun1990.get(mun1990) ?? [];
    list.push(poly);
    byMun1990.set(mun1990, list);
  }

  if (unmapped.length > 0) {
    const unique = [...new Set(unmapped)].sort((a, b) => a.localeCompare(b));
    console.warn('Unmapped shapeNames:', unique.join(', '));
  }

  const mun1990Names = [...byMun1990.keys()].sort((a, b) => a.localeCompare(b));
  const features: GeoJSON.Feature[] = [];

  for (const mun1990 of mun1990Names) {
    const polys = byMun1990.get(mun1990)!;
    const flat: turf.helpers.Feature<turf.helpers.Polygon>[] = [];
    for (const p of polys) {
      flat.push(...flattenToPolygons(p));
    }
    if (flat.length === 0) {
      console.warn('No valid polygons for', mun1990);
      continue;
    }

    let merged: turf.helpers.Feature<turf.helpers.Polygon | turf.helpers.MultiPolygon>;

    if (flat.length === 1) {
      merged = flat[0];
    } else {
      // Turf v7 union takes FeatureCollection, not (poly1, poly2)
      const fc = turf.featureCollection(flat);
      try {
        const u = turf.union(fc);
        if (u && turf.booleanValid(u)) {
          merged = u as turf.helpers.Feature<
            turf.helpers.Polygon | turf.helpers.MultiPolygon
          >;
        } else {
          console.warn('Union invalid for', mun1990);
          merged = flat[0];
        }
      } catch (err) {
        console.warn('Union failed for', mun1990, '- using MultiPolygon fallback');
        // Fallback: output all parts as MultiPolygon so no geometry is lost
        const coords = flat.map((f) => (f.geometry as turf.helpers.Polygon).coordinates);
        merged = turf.multiPolygon(coords);
      }
    }

    features.push({
      type: 'Feature',
      properties: {
        mun1990_name: mun1990,
        mun1990_id: mun1990
          .toLowerCase()
          .normalize('NFD')
          .replace(/\p{M}/gu, '')
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, ''),
      },
      geometry: merged.geometry,
    });
  }

  const hasMun1990 = new Set(features.map((f) => (f.properties as { mun1990_name: string }).mun1990_name));
  const expectedMun1990 = await loadExpectedMun1990FromExcel();

  const bihBoundary = JSON.parse(await readFile(BIH_BOUNDARY_PATH, 'utf8')) as GeoJSON.FeatureCollection;
  for (const mun1990 of Object.keys(DERIVE_BY_DIFFERENCE).sort((a, b) => a.localeCompare(b))) {
    if (hasMun1990.has(mun1990) || !expectedMun1990.has(mun1990)) continue;

    const centroid = DERIVE_BY_DIFFERENCE[mun1990];
    const bihPoly = bihBoundary.features[0];
    if (!bihPoly?.geometry || (bihPoly.geometry.type !== 'Polygon' && bihPoly.geometry.type !== 'MultiPolygon')) {
      throw new Error('BiH boundary missing or invalid');
    }

    const bihFeature = turf.feature(bihPoly.geometry) as turf.helpers.Feature<
      turf.helpers.Polygon | turf.helpers.MultiPolygon
    >;
    const otherPolys: turf.helpers.Feature<turf.helpers.Polygon | turf.helpers.MultiPolygon>[] = [];
    for (const f of features) {
      const g = f.geometry;
      if (g && (g.type === 'Polygon' || g.type === 'MultiPolygon')) {
        otherPolys.push(turf.feature(g) as turf.helpers.Feature<turf.helpers.Polygon | turf.helpers.MultiPolygon>);
      }
    }
    if (otherPolys.length === 0) {
      console.warn('No polygons to subtract for', mun1990);
      continue;
    }

    const unionOfOthers =
      otherPolys.length === 1
        ? otherPolys[0]
        : (turf.union(turf.featureCollection(otherPolys)) as turf.helpers.Feature<
            turf.helpers.Polygon | turf.helpers.MultiPolygon
          >);
    const diff = turf.difference(turf.featureCollection([bihFeature, unionOfOthers]));
    if (!diff || !diff.geometry) {
      console.warn('Difference null for', mun1990);
      continue;
    }

    const polys: GeoJSON.Position[][][] =
      diff.geometry.type === 'Polygon'
        ? [diff.geometry.coordinates]
        : diff.geometry.coordinates;
    const pt = turf.point(centroid);
    let chosen: GeoJSON.Polygon | null = null;
    for (const polyCoords of polys) {
      const polyFeat = turf.polygon(polyCoords);
      if (turf.booleanPointInPolygon(pt, polyFeat)) {
        chosen = { type: 'Polygon', coordinates: polyCoords };
        break;
      }
    }
    if (!chosen && polys.length === 1) {
      chosen = { type: 'Polygon', coordinates: polys[0] };
    }
    if (!chosen) {
      console.warn(`No gap polygon contains centroid for ${mun1990}, skipping`);
      continue;
    }

    features.push({
      type: 'Feature',
      properties: {
        mun1990_name: mun1990,
        mun1990_id: mun1990
          .toLowerCase()
          .normalize('NFD')
          .replace(/\p{M}/gu, '')
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, ''),
      },
      geometry: chosen,
    });
    console.log('Derived by difference (aligned with neighbors):', mun1990);
  }

  features.sort((a, b) => {
    const na = (a.properties as { mun1990_name: string }).mun1990_name;
    const nb = (b.properties as { mun1990_name: string }).mun1990_name;
    return na.localeCompare(nb);
  });

  const out: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features,
  };

  await writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2), 'utf8');
  console.log('Wrote', OUTPUT_PATH, ':', features.length, '1990 municipalities');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
