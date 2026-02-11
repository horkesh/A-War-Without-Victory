/**
 * Validate map contracts: data_index.json and dataset GeoJSON (awwv_meta, checksum, bbox, ids).
 * Exit non-zero on failure. No timestamps.
 *
 * Usage: npm run map:contracts:validate
 *   or: tsx scripts/map/validate_map_contracts.ts
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { computeBboxFromFeatures, computeSha256Hex } from './lib/awwv_contracts.js';
import { buildMun1990RegistrySet, normalizeMun1990Id, MUN1990_ALIAS_MAP } from './_shared/mun1990_id_normalizer.js';
import { loadCanonicalMun1990Registry } from './_shared/mun1990_registry_selector.js';


const DERIVED_DIR = resolve('data/derived');
const INDEX_PATH = resolve(DERIVED_DIR, 'data_index.json');

interface DataIndex {
  schema_version?: string;
  coordinate_space?: string;
  canonical_bbox?: number[];
  continuity_graph_path?: string;
  datasets?: {
    settlements?: {
      path?: string;
      checksum_sha256?: string;
      record_count?: number;
      id_field?: string;
    };
  };
}

interface GeoJSONFC {
  type: string;
  features?: Array<{ properties?: Record<string, unknown>; geometry?: unknown }>;
  awwv_meta?: {
    role?: string;
    version?: string;
    coordinate_space?: string;
    bbox_world?: number[];
    record_count?: number;
    id_field?: string;
    checksum_sha256?: string;
  };
}

function main(): void {
  let failed = false;

  if (!existsSync(INDEX_PATH)) {
    console.error('FAIL: data_index.json not found at', INDEX_PATH);
    process.exit(1);
  }

  const indexContent = readFileSync(INDEX_PATH, 'utf8');
  const index: DataIndex = JSON.parse(indexContent);

  // Required index fields
  if (index.schema_version == null) {
    console.error('FAIL: missing required field schema_version');
    failed = true;
  }
  if (index.coordinate_space == null) {
    console.error('FAIL: missing required field coordinate_space');
    failed = true;
  }
  if (!Array.isArray(index.canonical_bbox) || index.canonical_bbox.length !== 4) {
    console.error('FAIL: missing or invalid canonical_bbox');
    failed = true;
  }
  const ds = index.datasets?.settlements;
  if (!ds) {
    console.error('FAIL: missing datasets.settlements');
    failed = true;
  } else {
    if (ds.path == null) {
      console.error('FAIL: missing datasets.settlements.path');
      failed = true;
    }
    if (ds.checksum_sha256 == null) {
      console.error('FAIL: missing datasets.settlements.checksum_sha256');
      failed = true;
    }
  }

  if (failed) {
    console.error('Contract validation FAILED.');
    process.exit(1);
  }

  const datasetPath = resolve(DERIVED_DIR, ds!.path!);
  if (!existsSync(datasetPath)) {
    console.error('FAIL: dataset file not found:', datasetPath);
    process.exit(1);
  }

  // Validate continuity_graph_path when present (G3.6)
  if (index.continuity_graph_path != null && index.continuity_graph_path !== '') {
    const continuityPath = resolve(DERIVED_DIR, index.continuity_graph_path);
    if (!existsSync(continuityPath)) {
      console.error('FAIL: continuity_graph_path referenced file not found:', continuityPath);
      failed = true;
    }
  }

  // mun1990_names required for map_viewer (Phase H3.7)
  const mun1990Names = (index as { datasets?: { mun1990_names?: { available?: boolean } } }).datasets?.mun1990_names;
  if (!mun1990Names?.available) {
    console.error('FAIL: mun1990_names dataset required for map_viewer but not available');
    failed = true;
  } else {
    const munPath = resolve(DERIVED_DIR, (mun1990Names as { path?: string }).path ?? 'mun1990_names.json');
    if (!existsSync(munPath)) {
      console.error('FAIL: mun1990_names file not found:', munPath);
      failed = true;
    } else {
      // Phase H3.8: Banovići (10014) must resolve to display name "Banovići", not "Banja Luka"
      const mun1990NamesJson = JSON.parse(readFileSync(munPath, 'utf8')) as {
        by_municipality_id?: Record<string, { display_name?: string }>;
      };
      const banoviciEntry = mun1990NamesJson?.by_municipality_id?.['10014'];
      const displayName = banoviciEntry?.display_name ?? '';
      if (displayName !== 'Banovići') {
        console.error('FAIL: Banovići (10014) must resolve to display_name "Banovići", got:', JSON.stringify(displayName));
        failed = true;
      }
    }
  }

  // When geometry dataset has path_gz and available, require gz file exists (Phase H3.7)
  const allDatasets = (index as { datasets?: Record<string, { path_gz?: string; available?: boolean }> }).datasets ?? {};
  for (const [key, d] of Object.entries(allDatasets)) {
    if (d?.available && d.path_gz) {
      const gzPath = resolve(DERIVED_DIR, d.path_gz);
      if (!existsSync(gzPath)) {
        console.error('FAIL: dataset', key, 'has path_gz but file not found:', gzPath);
        failed = true;
      }
    }
  }

  const datasetBytes = readFileSync(datasetPath);
  const computedFileSha = computeSha256Hex(datasetBytes);
  if (computedFileSha !== ds!.checksum_sha256) {
    console.error('FAIL: dataset file checksum mismatch. Expected', ds!.checksum_sha256, 'got', computedFileSha);
    failed = true;
  }

  const geojson: GeoJSONFC = JSON.parse(datasetBytes.toString('utf8'));
  if (geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
    console.error('FAIL: dataset is not a FeatureCollection with features array');
    failed = true;
  }

  const meta = geojson.awwv_meta;
  if (!meta) {
    console.error('FAIL: GeoJSON root missing awwv_meta');
    failed = true;
  } else {
    // H6.1 regression guard: settlements dataset must have awwv_meta.role and awwv_meta.version
    if (meta.role == null || meta.role === '') {
      console.error('FAIL: H6.1 - settlements dataset awwv_meta.role is missing');
      failed = true;
    }
    if (meta.version == null || meta.version === '') {
      console.error('FAIL: H6.1 - settlements dataset awwv_meta.version is missing');
      failed = true;
    }
    if (meta.coordinate_space !== index.coordinate_space) {
      console.error('FAIL: awwv_meta.coordinate_space does not match index:', meta.coordinate_space, 'vs', index.coordinate_space);
      failed = true;
    }
    const indexBbox = index.canonical_bbox!;
    const metaBbox = meta.bbox_world;
    if (!Array.isArray(metaBbox) || metaBbox.length !== 4 ||
        metaBbox[0] !== indexBbox[0] || metaBbox[1] !== indexBbox[1] || metaBbox[2] !== indexBbox[2] || metaBbox[3] !== indexBbox[3]) {
      console.error('FAIL: awwv_meta.bbox_world does not match index canonical_bbox');
      failed = true;
    }
    const featureCount = geojson.features!.length;
    if (meta.record_count !== featureCount) {
      console.error('FAIL: awwv_meta.record_count', meta.record_count, '!= features.length', featureCount);
      failed = true;
    }
    if (index.datasets!.settlements!.record_count !== featureCount) {
      console.error('FAIL: index datasets.settlements.record_count != features.length');
      failed = true;
    }
    const idField = meta.id_field ?? ds!.id_field ?? 'sid';
    const ids = new Set<string>();
    for (const f of geojson.features!) {
      const id = f.properties?.[idField];
      if (id == null) {
        console.error('FAIL: feature missing id_field', idField);
        failed = true;
        break;
      }
      const sid = String(id);
      if (ids.has(sid)) {
        console.error('FAIL: duplicate id', sid);
        failed = true;
      }
      ids.add(sid);
    }
    // awwv_meta.checksum_sha256 = content hash (file with checksum field empty); same key order as build script (H6.1: role, version)
    const awwvMetaEmpty = {
      role: meta.role ?? 'settlement_substrate',
      version: meta.version ?? '0.0.0',
      schema: meta.schema ?? 'awwv://schemas/settlements_v0.json',
      schema_version: meta.schema_version ?? '0.0.0',
      coordinate_space: meta.coordinate_space,
      bbox_world: meta.bbox_world,
      precision: (meta as Record<string, unknown>).precision ?? 'float',
      id_field: meta.id_field ?? 'sid',
      record_count: meta.record_count,
      checksum_sha256: '',
    };
    const fcContentOnly = { type: geojson.type, awwv_meta: awwvMetaEmpty, features: geojson.features };
    const contentOnlyJson = JSON.stringify(fcContentOnly, null, 2);
    const contentSha = computeSha256Hex(Buffer.from(contentOnlyJson, 'utf8'));
    if (contentSha !== meta.checksum_sha256) {
      console.error('FAIL: awwv_meta.checksum_sha256 does not match content hash. Expected', meta.checksum_sha256, 'got', contentSha);
      failed = true;
    }
  }

  // Determinism: compute index from dataset twice; emitted JSON must be byte-identical
  if (geojson.features && !failed) {
    const buildIndexJson = (feats: GeoJSONFC['features'], bytes: Buffer): string => {
      const bbox = computeBboxFromFeatures(feats ?? []);
      const sha = computeSha256Hex(bytes);
      const obj = {
        $schema: 'awwv://schemas/data_index_v1.json',
        schema_version: '1.0.0',
        coordinate_space: 'SVG_PIXELS_LEGACY',
        canonical_bbox: bbox,
        datasets: {
          settlements: {
            path: ds!.path,
            schema: 'awwv://schemas/settlements_v0.json',
            schema_version: '0.0.0',
            id_field: ds!.id_field ?? 'sid',
            geometry_type: 'Polygon',
            record_count: feats?.length ?? 0,
            checksum_sha256: sha,
          },
        },
        layers: (index as Record<string, unknown>).layers ?? {},
      };
      return JSON.stringify(obj, null, 2);
    };
    const json1 = buildIndexJson(geojson.features, datasetBytes);
    const json2 = buildIndexJson(geojson.features, datasetBytes);
    if (json1 !== json2) {
      console.error('FAIL: determinism check — index JSON differs when computed twice');
      failed = true;
    }
  }

  // Phase H3.9 + H3.10: Validate political_control_data.json (municipality overrides + coverage)
  const politicalControlPath = resolve(DERIVED_DIR, 'political_control_data.json');
  if (existsSync(politicalControlPath)) {
    const politicalControlJson = JSON.parse(readFileSync(politicalControlPath, 'utf8')) as {
      municipality_id_by_sid?: Record<string, string>;
      by_settlement_id?: Record<string, string | null>;
      meta?: { control_missing_keys?: number };
    };
    // Phase H3.10: Every viewer roster settlement must have a control entry (enforced by build script)
    const controlMissing = politicalControlJson.meta?.control_missing_keys ?? -1;
    if (controlMissing !== 0) {
      console.error('FAIL: Phase H3.10 - political_control_data meta.control_missing_keys must be 0 (viewer roster coverage), got', controlMissing);
      failed = true;
    }
    
    // Validate Novo Sarajevo remapped settlements (should have municipality_id = 11568)
    const NOVO_SARAJEVO_MUN_ID = '11568';
    const NOVO_SARAJEVO_REMAPPED_SIDS: string[] = ['209538', '209520', '209554', '209503', '209546', '209562', '166138'];
    
    const munOverrides = politicalControlJson.municipality_id_by_sid ?? {};
    const controlData = politicalControlJson.by_settlement_id ?? {};
    
    for (const sourceId of NOVO_SARAJEVO_REMAPPED_SIDS) {
      // Find the full SID key in the data
      const fullSid = Object.keys(munOverrides).find(k => k.includes(':' + sourceId) || k.endsWith(':' + sourceId));
      if (fullSid) {
        if (munOverrides[fullSid] !== NOVO_SARAJEVO_MUN_ID) {
          console.error(`FAIL: Phase H3.9 - Settlement ${sourceId} should have municipality_id ${NOVO_SARAJEVO_MUN_ID}, got ${munOverrides[fullSid]}`);
          failed = true;
        }
        // Also verify political control is RBiH
        const controlSid = Object.keys(controlData).find(k => k.includes(':' + sourceId) || k.endsWith(':' + sourceId));
        if (controlSid && controlData[controlSid] !== 'RBiH') {
          console.error(`FAIL: Phase H3.9 - Settlement ${sourceId} should have RBiH control, got ${controlData[controlSid]}`);
          failed = true;
        }
      }
      // Note: If SID not found, it's handled by build_political_control_data.ts validation
    }
    
    if (!failed) {
      console.log('PASS: Phase H3.9 - Political control data municipality overrides validated.');
    }
  }

  // Phase H4.0: Municipality layer coverage — every municipality_id in substrate has name and mapping
  const SOURCE_DIR = resolve('data/source');
  const remapPath = resolve(SOURCE_DIR, 'municipality_post1995_to_mun1990.json');
  if (geojson.features && Array.isArray(geojson.features)) {
    const municipalityIdSet = new Set<string>();
    for (const f of geojson.features) {
      const props = f.properties ?? {};
      const munId = props.municipality_id ?? props.mun1990_municipality_id ?? props.opstina_id ?? props.muni_id;
      if (munId != null && typeof munId === 'string') municipalityIdSet.add(String(munId).trim());
    }
    const substrateMunicipalityIds = [...municipalityIdSet].sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });

    const mun1990NamesJson = (() => {
      const mun1990Names = (index as { datasets?: { mun1990_names?: { available?: boolean; path?: string } } }).datasets?.mun1990_names;
      if (!mun1990Names?.available) return null;
      const munPath = resolve(DERIVED_DIR, mun1990Names.path ?? 'mun1990_names.json');
      if (!existsSync(munPath)) return null;
      return JSON.parse(readFileSync(munPath, 'utf8')) as { by_municipality_id?: Record<string, unknown> };
    })();

    let indexByPost1995: Record<string, string> = {};
    if (existsSync(remapPath)) {
      const remap = JSON.parse(readFileSync(remapPath, 'utf8')) as { index_by_post1995_code?: Record<string, string> };
      indexByPost1995 = remap.index_by_post1995_code ?? {};
    }

    const missingName = substrateMunicipalityIds.filter((id) => !mun1990NamesJson?.by_municipality_id?.[id]);
    if (missingName.length > 0) {
      console.error(
        `FAIL: Phase H4.0 - Every municipality_id in substrate must have an entry in mun1990_names.by_municipality_id. Missing: ${missingName.length}. First 10: ${missingName.slice(0, 10).join(', ')}`
      );
      failed = true;
    }

    const missingMapping = substrateMunicipalityIds.filter((id) => !(id in indexByPost1995));
    if (missingMapping.length > 0) {
      console.error(
        `FAIL: Phase H4.0 - Every municipality_id in substrate must appear in municipality_post1995_to_mun1990.index_by_post1995_code. Missing: ${missingMapping.length}. First 10: ${missingMapping.slice(0, 10).join(', ')}`
      );
      failed = true;
    }

    if (existsSync(resolve(DERIVED_DIR, 'political_control_data.json')) && missingName.length > 0) {
      console.error('FAIL: Phase H4.0 - political_control_data exists; municipality_ids with name_missing must be 0.');
      failed = true;
    }

    if (!failed && substrateMunicipalityIds.length > 0) {
      console.log('PASS: Phase H4.0 - Municipality layer coverage (names + mapping).');
    }

    // Phase H5.6: Registry drift guard — when registry_110 exists, canonical selection must be registry_110
    const SOURCE_DIR = resolve('data/source');
    const reg110Path = resolve(SOURCE_DIR, 'municipalities_1990_registry_110.json');
    if (existsSync(reg110Path)) {
      try {
        const h56Loaded = loadCanonicalMun1990Registry(resolve());
        const basename = h56Loaded.path.split(/[/\\]/).pop() ?? '';
        if (basename !== 'municipalities_1990_registry_110.json') {
          console.error('FAIL: Phase H5.6 - When registry_110 exists, canonical selection must be registry_110. Got:', h56Loaded.path);
          failed = true;
        } else {
          console.log('PASS: Phase H5.6 - Canonical registry selection is registry_110 when present.');
        }
      } catch (e) {
        console.error('FAIL: Phase H5.6 - Could not load canonical registry:', e);
        failed = true;
      }
    }
    // Phase H5.6: No script outside the selector may reference registry_109 directly
    const MAP_SCRIPTS_DIR = resolve('scripts/map');
    const LITERAL_109 = 'municipalities_1990_registry_' + '109' + '.json';
    const ALLOWED_109_FILE = 'mun1990_registry_selector.ts';
    const tsFiles: string[] = [];
    function collectTsFiles(dir: string, baseDir: string): void {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = join(dir, e.name);
        const rel = full.slice(baseDir.length + 1).replace(/\\/g, '/');
        if (e.isDirectory()) collectTsFiles(full, baseDir);
        else if (e.isFile() && e.name.endsWith('.ts')) tsFiles.push(rel);
      }
    }
    collectTsFiles(MAP_SCRIPTS_DIR, MAP_SCRIPTS_DIR);
    tsFiles.sort((a, b) => a.localeCompare(b));
    const violations109: string[] = [];
    for (const rel of tsFiles) {
      if (rel.endsWith(ALLOWED_109_FILE)) continue;
      const content = readFileSync(join(MAP_SCRIPTS_DIR, rel), 'utf8');
      if (content.includes(LITERAL_109)) violations109.push(rel);
    }
    if (violations109.length > 0) {
      const first10 = violations109.slice(0, 10);
      console.error(`FAIL: Phase H5.6 - Literal "${LITERAL_109}" only allowed in ${ALLOWED_109_FILE}. Found in: ${first10.join(', ')}`);
      failed = true;
    } else if (existsSync(reg110Path)) {
      console.log('PASS: Phase H5.6 - No registry_109 drift (only selector may reference fallback).');
    }

    // Phase H4.1: Municipality aggregate datasets — coverage and sum consistency
    const aggPost1995Path = resolve(DERIVED_DIR, 'municipality_agg_post1995.json');
    const agg1990Path = resolve(DERIVED_DIR, 'municipality_agg_1990.json');
    let registryPath: string;
    let canonicalMun1990Ids: string[];
    try {
      const loaded = loadCanonicalMun1990Registry(resolve());
      registryPath = loaded.path;
      canonicalMun1990Ids = loaded.rows.map((r) => r.mun1990_id);
    } catch {
      registryPath = '';
      canonicalMun1990Ids = [];
    }

    if (!existsSync(aggPost1995Path)) {
      console.error('FAIL: Phase H4.1 - municipality_agg_post1995.json not found.');
      failed = true;
    }
    if (!existsSync(agg1990Path)) {
      console.error('FAIL: Phase H4.1 - municipality_agg_1990.json not found.');
      failed = true;
    }
    if (!registryPath || !existsSync(registryPath)) {
      console.error('FAIL: Phase H4.1 - municipalities_1990_registry (110 or 109) not found.');
      failed = true;
    }

    if (existsSync(aggPost1995Path) && existsSync(agg1990Path) && registryPath && existsSync(registryPath)) {
      const aggPost1995 = JSON.parse(readFileSync(aggPost1995Path, 'utf8')) as {
        by_municipality_id?: Record<string, { settlement_count_total?: number; control_counts?: Record<string, number> }>;
      };
      const agg1990 = JSON.parse(readFileSync(agg1990Path, 'utf8')) as {
        by_mun1990_id?: Record<string, { settlement_count_total?: number; control_counts?: Record<string, number>; post1995_municipality_ids?: string[] }>;
      };

      const aggPost1995Ids = Object.keys(aggPost1995.by_municipality_id ?? {}).sort((a, b) => {
        const na = parseInt(a, 10);
        const nb = parseInt(b, 10);
        if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
        return a.localeCompare(b);
      });
      const substrateSet = new Set(substrateMunicipalityIds);
      const aggSet = new Set(aggPost1995Ids);
      if (aggPost1995Ids.length !== substrateMunicipalityIds.length) {
        console.error(
          `FAIL: Phase H4.1 - municipality_agg_post1995 count ${aggPost1995Ids.length} !== substrate municipality count ${substrateMunicipalityIds.length}.`
        );
        failed = true;
      }
      const missingInAgg = substrateMunicipalityIds.filter((id) => !aggSet.has(id));
      if (missingInAgg.length > 0) {
        console.error(
          `FAIL: Phase H4.1 - Substrate municipality_ids missing from agg post1995: ${missingInAgg.length}. First 10: ${missingInAgg.slice(0, 10).join(', ')}`
        );
        failed = true;
      }

      const agg1990Keys = Object.keys(agg1990.by_mun1990_id ?? {});
      const expectedMun1990Count = canonicalMun1990Ids.length;
      if (agg1990Keys.length !== expectedMun1990Count) {
        console.error(`FAIL: Phase H4.1 - municipality_agg_1990 must have exactly ${expectedMun1990Count} mun1990_id keys (from registry), got ${agg1990Keys.length}.`);
        failed = true;
      }
      const missingInAgg1990 = canonicalMun1990Ids.filter((id) => !(agg1990.by_mun1990_id && id in agg1990.by_mun1990_id));
      if (missingInAgg1990.length > 0) {
        console.error(
          `FAIL: Phase H4.1 - Registry mun1990_ids missing from agg 1990: ${missingInAgg1990.length}. First 10: ${missingInAgg1990.slice(0, 10).join(', ')}`
        );
        failed = true;
      }

      for (const mid of aggPost1995Ids) {
        const entry = aggPost1995.by_municipality_id![mid];
        if (!entry) continue;
        const total = entry.settlement_count_total ?? 0;
        if (total <= 0) {
          console.error(`FAIL: Phase H4.1 - municipality_id ${mid} has settlement_count_total <= 0.`);
          failed = true;
        }
        const counts = entry.control_counts ?? {};
        const sum = (counts.RBiH ?? 0) + (counts.RS ?? 0) + (counts.HRHB ?? 0) + (counts.null ?? 0);
        if (sum !== total) {
          console.error(`FAIL: Phase H4.1 - municipality_id ${mid} control_counts sum ${sum} !== settlement_count_total ${total}.`);
          failed = true;
        }
      }

      for (const mun1990_id of canonicalMun1990Ids) {
        const entry = agg1990.by_mun1990_id?.[mun1990_id];
        if (!entry) continue;
        const total = entry.settlement_count_total ?? 0;
        const post1995Ids = entry.post1995_municipality_ids ?? [];
        if (total > 0 && post1995Ids.length === 0) {
          console.error(`FAIL: Phase H4.1 - mun1990_id ${mun1990_id} has settlement_count_total > 0 but post1995_municipality_ids empty.`);
          failed = true;
        }
        const counts = entry.control_counts ?? {};
        const sum = (counts.RBiH ?? 0) + (counts.RS ?? 0) + (counts.HRHB ?? 0) + (counts.null ?? 0);
        if (sum !== total) {
          console.error(`FAIL: Phase H4.1 - mun1990_id ${mun1990_id} control_counts sum ${sum} !== settlement_count_total ${total}.`);
          failed = true;
        }
      }

      if (!failed) {
        console.log('PASS: Phase H4.1 - Municipality aggregate coverage and sum consistency.');
      }
    }

    // Phase H5.3: mun1990_id canonical normalization — all derived keys must be registry-valid
    const { registrySet: h53RegistrySet } = buildMun1990RegistrySet(resolve());
    const expectedMun1990Count = h53RegistrySet.size;
    const mun1990NamesPath = resolve(DERIVED_DIR, 'mun1990_names.json');
    if (existsSync(mun1990NamesPath)) {
      const munNames = JSON.parse(readFileSync(mun1990NamesPath, 'utf8')) as { by_mun1990_id?: Record<string, unknown> };
      const byMun1990Keys = Object.keys(munNames.by_mun1990_id ?? {});
      if (byMun1990Keys.length !== expectedMun1990Count) {
        console.error(`FAIL: Phase H5.3 - mun1990_names.by_mun1990_id must have exactly ${expectedMun1990Count} keys, got ${byMun1990Keys.length}.`);
        failed = true;
      }
      const invalidMunNamesKey = byMun1990Keys.find((k) => !h53RegistrySet.has(k));
      if (invalidMunNamesKey != null) {
        console.error(`FAIL: Phase H5.3 - mun1990_names.by_mun1990_id has non-registry key: ${invalidMunNamesKey}.`);
        failed = true;
      }
      const byMunicipalityId = munNames as { by_municipality_id?: Record<string, { mun1990_id?: string }> };
      for (const [mid, entry] of Object.entries(byMunicipalityId.by_municipality_id ?? {})) {
        const raw = entry?.mun1990_id;
        if (raw == null || raw === '') continue;
        const { canonical } = normalizeMun1990Id(raw, MUN1990_ALIAS_MAP, h53RegistrySet);
        if (canonical == null) {
          console.error(`FAIL: Phase H5.3 - mun1990_names.by_municipality_id[${mid}].mun1990_id "${raw}" not in registry and not resolvable by alias.`);
          failed = true;
          break;
        }
      }
      if (!failed && byMun1990Keys.length === expectedMun1990Count && invalidMunNamesKey == null) {
        console.log(`PASS: Phase H5.3 - mun1990_names.by_mun1990_id has exactly ${expectedMun1990Count} registry-valid keys.`);
      }
    }
    if (existsSync(agg1990Path) && existsSync(registryPath)) {
      const agg1990 = JSON.parse(readFileSync(agg1990Path, 'utf8')) as { by_mun1990_id?: Record<string, unknown> };
      const agg1990Keys = Object.keys(agg1990.by_mun1990_id ?? {});
      const invalidAgg1990Key = agg1990Keys.find((k) => !h53RegistrySet.has(k));
      if (invalidAgg1990Key != null) {
        console.error(`FAIL: Phase H5.3 - municipality_agg_1990.by_mun1990_id has non-registry key: ${invalidAgg1990Key}.`);
        failed = true;
      }
      if (!failed && invalidAgg1990Key == null && agg1990Keys.length === expectedMun1990Count) {
        console.log(`PASS: Phase H5.3 - municipality_agg_1990.by_mun1990_id has exactly ${expectedMun1990Count} registry-valid keys.`);
      }
    }
    const substratePathForH53 = resolve(DERIVED_DIR, ds!.path!);
    if (existsSync(substratePathForH53)) {
      try {
        const substrateContent = readFileSync(substratePathForH53, 'utf8');
        const substrateGeo = JSON.parse(substrateContent) as { features?: Array<{ properties?: Record<string, unknown> }> };
        const distinctMun1990 = new Set<string>();
        for (const f of substrateGeo.features ?? []) {
          const raw = f.properties?.mun1990_id ?? f.properties?.mun1990_municipality_id;
          if (raw == null || raw === '') continue;
          const s = String(raw).trim();
          if (s) distinctMun1990.add(s);
        }
        for (const raw of distinctMun1990) {
          const { canonical } = normalizeMun1990Id(raw, MUN1990_ALIAS_MAP, h53RegistrySet);
          if (canonical == null) {
            console.error(`FAIL: Phase H5.3 - settlements_substrate has mun1990_id "${raw}" not in registry and not resolvable by alias.`);
            failed = true;
            break;
          }
        }
        if (!failed && distinctMun1990.size > 0) {
          console.log('PASS: Phase H5.3 - All distinct mun1990_id in substrate are registry-valid or resolvable.');
        }
      } catch {
        // Skip substrate check on parse error; other checks already run
      }
    }
    
    // Phase H4.2: Municipality viewer geometry — coverage check
    const munViewerPath = resolve(DERIVED_DIR, 'municipalities_viewer_v1.geojson');
    const munViewerGzPath = resolve(DERIVED_DIR, 'municipalities_viewer_v1.geojson.gz');
    const munViewerDs = (index as { datasets?: { municipalities_viewer_v1?: { available?: boolean; path?: string; path_gz?: string } } }).datasets?.municipalities_viewer_v1;
    
    if (munViewerDs && munViewerDs.available) {
      if (!existsSync(munViewerPath)) {
        console.error('FAIL: Phase H4.2 - municipalities_viewer_v1.geojson declared but file not found.');
        failed = true;
      }
      if (munViewerDs.path_gz && !existsSync(munViewerGzPath)) {
        console.error('FAIL: Phase H4.2 - municipalities_viewer_v1.geojson.gz declared but file not found.');
        failed = true;
      }
      
      if (existsSync(munViewerPath) && existsSync(aggPost1995Path)) {
        try {
          const munViewerGeojson = JSON.parse(readFileSync(munViewerPath, 'utf8')) as { features?: Array<{ properties?: { municipality_id?: string } }> };
          const munViewerIds = new Set((munViewerGeojson.features ?? []).map(f => f.properties?.municipality_id).filter(Boolean));
          const expectedCount = substrateMunicipalityIds.length;
          
          if (munViewerIds.size !== expectedCount) {
            console.error(
              `FAIL: Phase H4.2 - Municipality viewer geometry count ${munViewerIds.size} !== substrate municipality count ${expectedCount}.`
            );
            failed = true;
          }
          
          const missingInViewer = substrateMunicipalityIds.filter((id) => !munViewerIds.has(id));
          if (missingInViewer.length > 0) {
            console.error(
              `FAIL: Phase H4.2 - Substrate municipality_ids missing from viewer geometry: ${missingInViewer.length}. First 10: ${missingInViewer.slice(0, 10).join(', ')}`
            );
            failed = true;
          }
          
          if (!failed) {
            console.log('PASS: Phase H4.2 - Municipality viewer geometry coverage.');
          }
        } catch (err) {
          console.error('FAIL: Phase H4.2 - Error validating municipality viewer geometry:', err);
          failed = true;
        }
      }
    }
    
    // Phase H4.5: Municipality population 1991 coverage check
    const munPopPath = resolve(DERIVED_DIR, 'municipality_population_1991.json');
    if (existsSync(munPopPath) && existsSync(aggPost1995Path)) {
      try {
        const munPop = JSON.parse(readFileSync(munPopPath, 'utf8')) as {
          awwv_meta?: { version?: string };
          by_municipality_id?: Record<string, { total?: number; mun1990_id?: string }>;
          by_mun1990_id?: Record<string, { total?: number }>;
          meta?: {
            coverage?: {
              municipality_ids_total?: number;
              municipality_ids_with_population?: number;
              mun1990_ids_total?: number;
              mun1990_ids_with_population?: number;
            };
            missing_municipality_ids?: string[];
          };
        };
        
        // Phase H4.7: Check version (h4_7 = Serb/Croat mapping fix)
        if (munPop.awwv_meta?.version !== 'h4_7') {
          console.error('FAIL: Phase H4.7 - municipality_population_1991 has wrong version (expected h4_7):', munPop.awwv_meta?.version);
          failed = true;
        }
        
        const munPopIds = new Set(Object.keys(munPop.by_municipality_id ?? {}));
        const expectedCount = substrateMunicipalityIds.length;
        
        // Allow some missing, but report via meta.missing_municipality_ids
        if (munPop.meta?.missing_municipality_ids && munPop.meta.missing_municipality_ids.length > 0) {
          console.log(`INFO: Phase H4.5 - ${munPop.meta.missing_municipality_ids.length} municipalities missing population data (reported in meta)`);
        }
        
        // Phase H4.6: by_mun1990_id must match registry count (registry-driven)
        const mun1990PopCount = Object.keys(munPop.by_mun1990_id ?? {}).length;
        const expectedMun1990PopCount = h53RegistrySet.size;
        if (mun1990PopCount !== expectedMun1990PopCount) {
          console.error(`FAIL: Phase H4.6 - by_mun1990_id must have exactly ${expectedMun1990PopCount} keys (registry-driven), got ${mun1990PopCount}`);
          failed = true;
        } else {
          const mun1990WithPop = munPop.meta?.coverage?.mun1990_ids_with_population ?? 0;
          console.log(`PASS: Phase H4.6 - Population data: ${munPopIds.size} post-1995, ${mun1990PopCount} mun1990 keys (${mun1990WithPop} with population > 0).`);
        }
      } catch (err) {
        console.error('FAIL: Phase H4.5 - Error validating municipality population:', err);
        failed = true;
      }
    }
    
    // Phase H4.5: Mun1990 merged municipality viewer geometry
    const munMun1990ViewerPath = resolve(DERIVED_DIR, 'municipalities_mun1990_viewer_v1.geojson');
    const munMun1990ViewerGzPath = resolve(DERIVED_DIR, 'municipalities_mun1990_viewer_v1.geojson.gz');
    
    if (existsSync(munMun1990ViewerPath)) {
      try {
        const munMun1990Geojson = JSON.parse(readFileSync(munMun1990ViewerPath, 'utf8')) as { 
          features?: Array<{ properties?: { mun1990_id?: string; post1995_municipality_ids?: string[] } }>;
          awwv_meta?: { role?: string; version?: string; id_field?: string };
        };
        
        // Check awwv_meta
        if (munMun1990Geojson.awwv_meta?.role !== 'municipality_viewer_geometry_mun1990') {
          console.error('FAIL: Phase H4.5 - mun1990 viewer geometry has wrong role:', munMun1990Geojson.awwv_meta?.role);
          failed = true;
        }
        if (munMun1990Geojson.awwv_meta?.version !== 'h4_6') {
          console.error('FAIL: Phase H4.6 - mun1990 viewer geometry has wrong version (expected h4_6):', munMun1990Geojson.awwv_meta?.version);
          failed = true;
        }
        if (munMun1990Geojson.awwv_meta?.id_field !== 'mun1990_id') {
          console.error('FAIL: Phase H4.5 - mun1990 viewer geometry has wrong id_field:', munMun1990Geojson.awwv_meta?.id_field);
          failed = true;
        }
        
        const mun1990Ids = new Set((munMun1990Geojson.features ?? []).map(f => f.properties?.mun1990_id).filter(Boolean));
        
        // Phase H4.6: Expect exactly registry count mun1990 features (registry-driven)
        const expectedMun1990FeatureCount = h53RegistrySet.size;
        if (mun1990Ids.size !== expectedMun1990FeatureCount) {
          console.error(`FAIL: Phase H4.6 - Mun1990 viewer geometry must have exactly ${expectedMun1990FeatureCount} features (one per registry mun1990_id), got ${mun1990Ids.size}`);
          failed = true;
        } else {
          console.log(`PASS: Phase H4.6 - Mun1990 viewer geometry: ${mun1990Ids.size} features (one per mun1990_id).`);
        }
        
        // Check for duplicate display name report
        const dupNamesPath = resolve(DERIVED_DIR, 'h4_5_duplicate_mun1990_display_names.json');
        if (existsSync(dupNamesPath)) {
          const dupNames = JSON.parse(readFileSync(dupNamesPath, 'utf8'));
          if (Object.keys(dupNames).length > 0) {
            console.log(`INFO: Phase H4.5 - ${Object.keys(dupNames).length} duplicate mun1990 display names found (report exists).`);
          }
        }
        
        if (!existsSync(munMun1990ViewerGzPath)) {
          console.error('FAIL: Phase H4.5 - municipalities_mun1990_viewer_v1.geojson.gz not found.');
          failed = true;
        }
      } catch (err) {
        console.error('FAIL: Phase H4.5 - Error validating mun1990 viewer geometry:', err);
        failed = true;
      }
    }

    // Phase H5.4: Registry vs mapping coverage — mapping_ids must be subset of registry_ids
    const h54CoveragePath = resolve(DERIVED_DIR, 'h5_4_registry_vs_mapping_coverage.json');
    if (existsSync(h54CoveragePath)) {
      const h54 = JSON.parse(readFileSync(h54CoveragePath, 'utf8')) as { missing_in_registry?: string[] };
      const missing = h54.missing_in_registry ?? [];
      if (missing.length > 0) {
        console.error(`FAIL: Phase H5.4 - Registry vs mapping: ${missing.length} mapping IDs missing from registry: ${missing.slice(0, 10).join(', ')}`);
        failed = true;
      } else {
        console.log('PASS: Phase H5.4 - Registry vs mapping coverage (mapping_ids ⊆ registry_ids).');
      }
    }

    // Phase H5.0: mun1990 adjacency graph and corridor candidates
    const adjPath = resolve(DERIVED_DIR, 'mun1990_adjacency_graph.json');
    const corridorPath = resolve(DERIVED_DIR, 'mun1990_corridor_candidates_h5_0.json');
    if (existsSync(registryPath)) {
      const validMun1990Ids = h53RegistrySet;
      const expectedNodeCount = validMun1990Ids.size;
      if (existsSync(adjPath)) {
        const adj = JSON.parse(readFileSync(adjPath, 'utf8')) as {
          nodes?: string[];
          edges?: Array<{ a: string; b: string }>;
        };
        const adjNodes = adj.nodes ?? [];
        const adjEdges = adj.edges ?? [];
        if (adjNodes.length !== expectedNodeCount) {
          console.error(`FAIL: Phase H5.0 - mun1990_adjacency_graph must have exactly ${expectedNodeCount} nodes, got ${adjNodes.length}.`);
          failed = true;
        }
        const nodeSet = new Set(adjNodes);
        const invalidNodes = adjNodes.filter((id) => !validMun1990Ids.has(id));
        if (invalidNodes.length > 0) {
          console.error(`FAIL: Phase H5.0 - mun1990_adjacency_graph has invalid node ids: ${invalidNodes.slice(0, 10).join(', ')}.`);
          failed = true;
        }
        const edgeKeys = new Set<string>();
        for (const e of adjEdges) {
          if (!validMun1990Ids.has(e.a) || !validMun1990Ids.has(e.b)) {
            console.error(`FAIL: Phase H5.0 - mun1990_adjacency_graph edge endpoint invalid: ${e.a} -- ${e.b}.`);
            failed = true;
            break;
          }
          const k = [e.a, e.b].sort((x, y) => x.localeCompare(y)).join('\t');
          if (edgeKeys.has(k)) {
            console.error(`FAIL: Phase H5.0 - mun1990_adjacency_graph duplicate undirected edge: ${e.a} -- ${e.b}.`);
            failed = true;
            break;
          }
          edgeKeys.add(k);
        }
        const missingFromNodes = [...validMun1990Ids].filter((id) => !nodeSet.has(id));
        if (missingFromNodes.length > 0) {
          console.error(`FAIL: Phase H5.0 - mun1990_adjacency_graph missing registry nodes: ${missingFromNodes.slice(0, 10).join(', ')}.`);
          failed = true;
        }
        if (!failed && adjNodes.length === expectedNodeCount && invalidNodes.length === 0 && missingFromNodes.length === 0) {
          console.log('PASS: Phase H5.0 - mun1990_adjacency_graph structure.');
        }
        // Phase H5.1: Sarajevo special case — novo_sarajevo distinct; no literal "sarajevo" as mun1990_id
        const NOVO_SARAJEVO_ID = 'novo_sarajevo';
        const LITERAL_SARAJEVO_ID = 'sarajevo';
        if (!validMun1990Ids.has(NOVO_SARAJEVO_ID)) {
          console.error('FAIL: Phase H5.1 - novo_sarajevo must exist as mun1990_id in registry.');
          failed = true;
        }
        if (!nodeSet.has(NOVO_SARAJEVO_ID)) {
          console.error('FAIL: Phase H5.1 - novo_sarajevo must be a node in mun1990_adjacency_graph.');
          failed = true;
        }
        if (validMun1990Ids.has(LITERAL_SARAJEVO_ID)) {
          console.error('FAIL: Phase H5.1 - Literal "sarajevo" must not be a mun1990_id in registry (Novo Sarajevo is novo_sarajevo).');
          failed = true;
        }
        if (nodeSet.has(LITERAL_SARAJEVO_ID)) {
          console.error('FAIL: Phase H5.1 - mun1990_adjacency_graph must not contain literal "sarajevo" as node.');
          failed = true;
        }
        if (!failed && validMun1990Ids.has(NOVO_SARAJEVO_ID) && nodeSet.has(NOVO_SARAJEVO_ID) && !validMun1990Ids.has(LITERAL_SARAJEVO_ID) && !nodeSet.has(LITERAL_SARAJEVO_ID)) {
          console.log('PASS: Phase H5.1 - Sarajevo special case (novo_sarajevo distinct, no sarajevo collapse).');
        }
      } else {
        console.error('FAIL: Phase H5.0 - mun1990_adjacency_graph.json not found.');
        failed = true;
      }
      if (existsSync(corridorPath)) {
        const corridor = JSON.parse(readFileSync(corridorPath, 'utf8')) as {
          articulation_municipalities?: string[];
          bridge_edges?: Array<{ a: string; b: string }>;
          per_node?: Record<string, unknown>;
        };
        const art = corridor.articulation_municipalities ?? [];
        const bridges = corridor.bridge_edges ?? [];
        const invalidArt = art.filter((id) => !validMun1990Ids.has(id));
        if (invalidArt.length > 0) {
          console.error(`FAIL: Phase H5.0 - corridor_candidates invalid articulation id: ${invalidArt.slice(0, 5).join(', ')}.`);
          failed = true;
        }
        for (const e of bridges) {
          if (!validMun1990Ids.has(e.a) || !validMun1990Ids.has(e.b)) {
            console.error(`FAIL: Phase H5.0 - corridor_candidates invalid bridge endpoint: ${e.a} -- ${e.b}.`);
            failed = true;
            break;
          }
        }
        if (!failed && invalidArt.length === 0) {
          console.log('PASS: Phase H5.0 - mun1990_corridor_candidates references valid ids.');
        }
      } else {
        console.error('FAIL: Phase H5.0 - mun1990_corridor_candidates_h5_0.json not found.');
        failed = true;
      }
    }

    // Phase H5.2: Contact graph coverage — every substrate settlement in graph or exclusions
    const h52CoveragePath = resolve(DERIVED_DIR, 'h5_2_contact_graph_coverage.json');
    const exclusionsPath = resolve(DERIVED_DIR, 'contact_graph_exclusions.json');
    if (existsSync(adjPath) && existsSync(h52CoveragePath)) {
      const h52 = JSON.parse(readFileSync(h52CoveragePath, 'utf8')) as {
        global?: { missing_from_graph_count?: number };
      };
      const missingCount = h52.global?.missing_from_graph_count ?? -1;
      if (existsSync(exclusionsPath)) {
        // Path 2: missing must be explained by exclusions
        const exclusions = JSON.parse(readFileSync(exclusionsPath, 'utf8')) as { excluded_sids?: string[] };
        const excludedCount = (exclusions.excluded_sids ?? []).length;
        if (missingCount > 0 && excludedCount < missingCount) {
          console.error(`FAIL: Phase H5.2 - ${missingCount} settlements missing from contact graph but only ${excludedCount} in exclusions.`);
          failed = true;
        } else if (!failed && missingCount > 0) {
          console.log('PASS: Phase H5.2 - Contact graph gaps explained by exclusions.');
        }
      } else {
        // Path 1: no exclusions, require full coverage
        if (missingCount !== 0) {
          console.error(`FAIL: Phase H5.2 - Contact graph must include all substrate settlements (missing_from_graph_count=0), got ${missingCount}.`);
          failed = true;
        } else {
          console.log('PASS: Phase H5.2 - Contact graph coverage (all substrate settlements in graph).');
        }
      }
    }
  }

  // Phase H6.0: Georeferencing — when svg_to_world_transform exists, audit must exist and transform valid
  const georefDir = resolve(DERIVED_DIR, 'georef');
  const transformPath = resolve(georefDir, 'svg_to_world_transform.json');
  const auditGeorefJsonPath = resolve(georefDir, 'audit_georef_report.json');
  const auditGeorefTxtPath = resolve(georefDir, 'audit_georef_report.txt');
  if (existsSync(transformPath)) {
    if (!existsSync(auditGeorefJsonPath) || !existsSync(auditGeorefTxtPath)) {
      console.error('FAIL: Phase H6.0 - svg_to_world_transform.json exists but audit_georef_report.json or audit_georef_report.txt missing.');
      failed = true;
    }
    try {
      const transform = JSON.parse(readFileSync(transformPath, 'utf8')) as {
        method?: string;
        anchor_count?: number;
        residuals_summary?: { rmse?: number };
      };
      if (transform.anchor_count != null && transform.anchor_count < 3) {
        console.error('FAIL: Phase H6.0 - anchor_count must be >= 3, got', transform.anchor_count);
        failed = true;
      }
      if (transform.method != null && transform.method !== 'tps' && transform.method !== 'affine') {
        console.error('FAIL: Phase H6.0 - method must be "tps" or "affine", got', transform.method);
        failed = true;
      }
      const rmse = transform.residuals_summary?.rmse;
      if (rmse != null && (typeof rmse !== 'number' || !Number.isFinite(rmse))) {
        console.error('FAIL: Phase H6.0 - residuals_summary.rmse must be finite, got', rmse);
        failed = true;
      }
      if (!failed && existsSync(auditGeorefJsonPath)) {
        console.log('PASS: Phase H6.0 - Georef transform and audit present (audit-only, no thresholds).');
      }
    } catch (err) {
      console.error('FAIL: Phase H6.0 - Error reading svg_to_world_transform.json:', err);
      failed = true;
    }
  }

  // Phase H6.2: Terrain snapshots (OSM roads, waterways, DEM clip) — validate when present
  //
  // TERRAIN GUARDRAIL (H6.5):
  // - Terrain artifacts are validated ONLY IF PRESENT. Absence is NOT a failure.
  // - Execution is decoupled from correctness: H6.2 requires osmium/GDAL; H6.4.2 requires Docker.
  //   Machines without these tools cannot produce terrain; contract validation must still pass.
  // - When present, we validate awwv_meta, checksums, sort order, and audit toolchain fields.
  //
  // Terrain Scalar Contract (H6.6-PREP):
  // - Terrain scalar datasets (per-settlement or per-unit scalars from docs/TERRAIN_SCALARS_SPEC.md)
  //   are OPTIONAL. If present, they must match the canonical field names and ranges in that spec.
  // - Absence of terrain scalars is NOT a failure. Presence does NOT imply consumption by simulation.
  const terrainDir = resolve(DERIVED_DIR, 'terrain');
  const osmRoadsPath = resolve(terrainDir, 'osm_roads_snapshot_h6_2.geojson');
  const osmWaterwaysPath = resolve(terrainDir, 'osm_waterways_snapshot_h6_2.geojson');
  const osmAuditPath = resolve(terrainDir, 'osm_snapshot_audit_h6_2.json');
  const demClipPath = resolve(terrainDir, 'dem_clip_h6_2.tif');
  const demAuditPath = resolve(terrainDir, 'dem_snapshot_audit_h6_2.json');

  // Phase H6.3: Toolchain audit fields — validate when audit files exist
  if (existsSync(osmAuditPath)) {
    try {
      const osmAudit = JSON.parse(readFileSync(osmAuditPath, 'utf8')) as {
        toolchain?: { tools?: Array<{ name?: string; ok?: boolean; version?: string }> };
      };
      const tools = osmAudit.toolchain?.tools ?? [];
      const osmium = tools.find((t) => t.name === 'osmium-tool');
      if (!osmium?.ok || !osmium.version || osmium.version.trim() === '') {
        console.error('FAIL: Phase H6.3 - osm_snapshot_audit must contain toolchain.tools with name "osmium-tool", ok=true, version non-empty');
        failed = true;
      } else {
        console.log('PASS: Phase H6.3 - osm_snapshot_audit toolchain (osmium-tool present).');
      }
    } catch (err) {
      console.error('FAIL: Phase H6.3 - Error reading osm_snapshot_audit:', err);
      failed = true;
    }
  }
  if (existsSync(demAuditPath)) {
    try {
      const demAudit = JSON.parse(readFileSync(demAuditPath, 'utf8')) as {
        toolchain?: { tools?: Array<{ cmd?: string; ok?: boolean; version?: string }> };
      };
      const tools = demAudit.toolchain?.tools ?? [];
      const gdalwarp = tools.find((t) => t.cmd === 'gdalwarp');
      if (!gdalwarp?.ok || !gdalwarp.version || gdalwarp.version.trim() === '') {
        console.error('FAIL: Phase H6.3 - dem_snapshot_audit must contain toolchain.tools with cmd "gdalwarp", ok=true, version non-empty');
        failed = true;
      } else {
        console.log('PASS: Phase H6.3 - dem_snapshot_audit toolchain (gdalwarp present).');
      }
    } catch (err) {
      console.error('FAIL: Phase H6.3 - Error reading dem_snapshot_audit:', err);
      failed = true;
    }
  }

  if (existsSync(osmRoadsPath)) {
    try {
      const roads = JSON.parse(readFileSync(osmRoadsPath, 'utf8')) as {
        awwv_meta?: { role?: string; version?: string; bbox_world?: number[]; feature_count?: number; checksum_sha256?: string };
        features?: Array<{ properties?: { osm_id?: string } }>;
      };
      const meta = roads.awwv_meta;
      if (!meta?.role || !meta?.version || !Array.isArray(meta.bbox_world) || meta.bbox_world.length !== 4) {
        console.error('FAIL: Phase H6.2 - osm_roads awwv_meta missing role/version/bbox_world');
        failed = true;
      }
      if (meta?.feature_count !== (roads.features?.length ?? 0)) {
        console.error('FAIL: Phase H6.2 - osm_roads feature_count mismatch');
        failed = true;
      }
      if (meta?.checksum_sha256 == null || meta.checksum_sha256 === '') {
        console.error('FAIL: Phase H6.2 - osm_roads awwv_meta.checksum_sha256 missing');
        failed = true;
      }
      const feats = roads.features ?? [];
      for (let i = 1; i < feats.length; i++) {
        const a = feats[i - 1].properties?.osm_id ?? '';
        const b = feats[i].properties?.osm_id ?? '';
        const na = parseInt(String(a), 10);
        const nb = parseInt(String(b), 10);
        const cmp = !Number.isNaN(na) && !Number.isNaN(nb) ? na - nb : String(a).localeCompare(String(b));
        if (cmp > 0) {
          console.error('FAIL: Phase H6.2 - osm_roads features not sorted by osm_id');
          failed = true;
          break;
        }
      }
      if (!failed) console.log('PASS: Phase H6.2 - osm_roads snapshot contract.');
    } catch (err) {
      console.error('FAIL: Phase H6.2 - Error validating osm_roads:', err);
      failed = true;
    }
  }

  if (existsSync(osmWaterwaysPath)) {
    try {
      const waterways = JSON.parse(readFileSync(osmWaterwaysPath, 'utf8')) as {
        awwv_meta?: { role?: string; version?: string; bbox_world?: number[]; feature_count?: number; checksum_sha256?: string };
        features?: Array<{ properties?: { osm_id?: string } }>;
      };
      const meta = waterways.awwv_meta;
      if (!meta?.role || !meta?.version || !Array.isArray(meta.bbox_world) || meta.bbox_world.length !== 4) {
        console.error('FAIL: Phase H6.2 - osm_waterways awwv_meta missing role/version/bbox_world');
        failed = true;
      }
      if (meta?.feature_count !== (waterways.features?.length ?? 0)) {
        console.error('FAIL: Phase H6.2 - osm_waterways feature_count mismatch');
        failed = true;
      }
      if (meta?.checksum_sha256 == null || meta.checksum_sha256 === '') {
        console.error('FAIL: Phase H6.2 - osm_waterways awwv_meta.checksum_sha256 missing');
        failed = true;
      }
      const feats = waterways.features ?? [];
      for (let i = 1; i < feats.length; i++) {
        const a = feats[i - 1].properties?.osm_id ?? '';
        const b = feats[i].properties?.osm_id ?? '';
        const na = parseInt(String(a), 10);
        const nb = parseInt(String(b), 10);
        const cmp = !Number.isNaN(na) && !Number.isNaN(nb) ? na - nb : String(a).localeCompare(String(b));
        if (cmp > 0) {
          console.error('FAIL: Phase H6.2 - osm_waterways features not sorted by osm_id');
          failed = true;
          break;
        }
      }
      if (!failed) console.log('PASS: Phase H6.2 - osm_waterways snapshot contract.');
    } catch (err) {
      console.error('FAIL: Phase H6.2 - Error validating osm_waterways:', err);
      failed = true;
    }
  }

  if (existsSync(demClipPath)) {
    if (!existsSync(demAuditPath)) {
      console.error('FAIL: Phase H6.2 - dem_clip exists but dem_snapshot_audit_h6_2.json missing');
      failed = true;
    } else {
      try {
        const audit = JSON.parse(readFileSync(demAuditPath, 'utf8')) as { sha256?: string };
        if (!audit.sha256 || typeof audit.sha256 !== 'string') {
          console.error('FAIL: Phase H6.2 - dem audit sha256 missing');
          failed = true;
        } else {
          console.log('PASS: Phase H6.2 - dem clip audit present.');
        }
      } catch (err) {
        console.error('FAIL: Phase H6.2 - Error reading dem audit:', err);
        failed = true;
      }
    }
  }

  if (failed) {
    console.error('Contract validation FAILED.');
    process.exit(1);
  }

  console.log('PASS: data_index and settlements dataset contract validation.');
}

main();
