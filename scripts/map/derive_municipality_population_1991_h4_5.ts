/**
 * Phase H4.5 Task A: Derive municipality population rollups from 1991 census
 * 
 * Reads bih_census_1991.json and rolls up population to both post-1995 municipality_id
 * and mun1990_id levels.
 * 
 * Usage:
 *   npm run map:derive:municipality-population-1991:h4_5
 *   or: tsx scripts/map/derive_municipality_population_1991_h4_5.ts
 * 
 * Outputs:
 *   - data/derived/municipality_population_1991.json
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadCanonicalMun1990Registry } from './_shared/mun1990_registry_selector.js';

// Mistake guard

interface CensusData {
  metadata?: {
    description?: string;
    source?: string;
    total_population?: number;
    settlement_count?: number;
    municipality_count?: number;
  };
  municipalities?: Record<string, {
    n: string;  // name
    s: string[];  // settlement IDs
    p: number[];  // population breakdown [total, bosniak, serb, croat, other]
  }>;
  settlements?: Record<string, {
    n?: string;  // name
    m?: string;  // municipality_id
    p?: number[];  // population breakdown
  }>;
}

interface MunicipalityAggData {
  awwv_meta?: {
    role?: string;
    version?: string;
    source?: string[];
  };
  by_municipality_id?: Record<string, {
    mun1990_id?: string;
    display_name?: string;
    post1995_municipality_ids?: string[];
    settlement_count_total?: number;
  }>;
}

interface Mun1990NamesData {
  meta?: {
    total_municipalities?: number;
  };
  by_municipality_id?: Record<string, {
    mun1990_id?: string;
    display_name?: string;
  }>;
  by_mun1990_id?: Record<string, {
    display_name?: string;
    post1995_municipality_ids?: string[];
  }>;
}

interface PopulationBreakdown {
  total: number;
  bosniak: number;
  serb: number;
  croat: number;
  other: number;
}

interface MunicipalityPopulation {
  total: number;
  breakdown: PopulationBreakdown;
  mun1990_id: string;
}

interface Mun1990Population {
  total: number;
  breakdown: PopulationBreakdown;
}

interface OutputData {
  awwv_meta: {
    role: string;
    version: string;
    source: string[];
  };
  by_municipality_id: Record<string, MunicipalityPopulation>;
  by_mun1990_id: Record<string, Mun1990Population>;
  meta: {
    coverage: {
      municipality_ids_total: number;
      municipality_ids_with_population: number;
      mun1990_ids_total: number;
      mun1990_ids_with_population: number;
    };
    missing_municipality_ids: string[];
    notes: string[];
  };
}

/**
 * Map census p array to canonical breakdown.
 * Source bih_census_1991.json municipalities.p is [total, bosniak, croat, serb, other].
 * Index 2 = Croat, index 3 = Serb (single source of truth to avoid swap).
 */
function breakdownFromCensusP(p: number[]): PopulationBreakdown {
  const a = p ?? [0, 0, 0, 0, 0];
  return {
    total: a[0] ?? 0,
    bosniak: a[1] ?? 0,
    serb: a[3] ?? 0,
    croat: a[2] ?? 0,
    other: a[4] ?? 0,
  };
}

function main(): void {
  const censusPath = resolve('data/source/bih_census_1991.json');
  const munAggPath = resolve('data/derived/municipality_agg_post1995.json');
  const mun1990NamesPath = resolve('data/derived/mun1990_names.json');
  const { path: registryPath } = loadCanonicalMun1990Registry(resolve());
  const outputPath = resolve('data/derived/municipality_population_1991.json');

  // Load census data
  if (!existsSync(censusPath)) {
    console.error(`FAIL: Census data not found at ${censusPath}`);
    process.exit(1);
  }
  const census: CensusData = JSON.parse(readFileSync(censusPath, 'utf8'));
  
  // Load municipality aggregates for mun1990_id mapping
  if (!existsSync(munAggPath)) {
    console.error(`FAIL: Municipality aggregates not found at ${munAggPath}`);
    process.exit(1);
  }
  const munAgg: MunicipalityAggData = JSON.parse(readFileSync(munAggPath, 'utf8'));
  
  // Load mun1990 names for display names
  if (!existsSync(mun1990NamesPath)) {
    console.error(`FAIL: Mun1990 names not found at ${mun1990NamesPath}`);
    process.exit(1);
  }
  const mun1990Names: Mun1990NamesData = JSON.parse(readFileSync(mun1990NamesPath, 'utf8'));
  
  // Load canonical registry for mun1990_id list
  if (!existsSync(registryPath)) {
    console.error(`FAIL: Registry not found (tried 110 and 109)`);
    process.exit(1);
  }
  const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as {
    count?: number;
    rows?: Array<{ mun1990_id: string }>;
  };
  const canonicalMun1990Ids = (registry.rows ?? []).map(r => r.mun1990_id);
  
  console.log('Loaded census data with:');
  console.log(`  Municipalities: ${census.metadata?.municipality_count ?? 0}`);
  console.log(`  Total population: ${census.metadata?.total_population ?? 0}`);
  console.log(`  Registry mun1990_ids: ${canonicalMun1990Ids.length}`);
  
  // Build output structure
  const byMunicipalityId: Record<string, MunicipalityPopulation> = {};
  const byMun1990Id: Record<string, Mun1990Population> = {};
  
  // Initialize byMun1990Id with all canonical registry keys (zero population by default)
  for (const mun1990Id of canonicalMun1990Ids) {
    byMun1990Id[mun1990Id] = {
      total: 0,
      breakdown: {
        total: 0,
        bosniak: 0,
        serb: 0,
        croat: 0,
        other: 0,
      },
    };
  }
  
  // Collect all municipality_ids from munAgg
  const allMunicipalityIds = new Set<string>(
    Object.keys(munAgg.by_municipality_id ?? {})
  );
  
  // Track unmatched census mun1990 keys
  const unmatchedCensusMun1990Ids = new Set<string>();
  
  // Process census municipalities
  if (census.municipalities) {
    for (const [munId, munData] of Object.entries(census.municipalities)) {
      const breakdown = breakdownFromCensusP(munData.p ?? []);
      
      // Get mun1990_id from munAgg
      const mun1990Id = munAgg.by_municipality_id?.[munId]?.mun1990_id;
      
      if (!mun1990Id) {
        console.warn(`  Warning: municipality_id ${munId} has no mun1990_id mapping (skipped)`);
        continue;
      }
      
      // Check if this mun1990_id is in the canonical registry
      if (!byMun1990Id[mun1990Id]) {
        unmatchedCensusMun1990Ids.add(mun1990Id);
        console.warn(`  Warning: mun1990_id ${mun1990Id} from census not in registry (skipped)`);
        continue;
      }
      
      // Store by municipality_id
      byMunicipalityId[munId] = {
        total: breakdown.total,
        breakdown,
        mun1990_id: mun1990Id,
      };
      
      // Accumulate to mun1990_id (already initialized)
      byMun1990Id[mun1990Id].total += breakdown.total;
      byMun1990Id[mun1990Id].breakdown.total += breakdown.total;
      byMun1990Id[mun1990Id].breakdown.bosniak += breakdown.bosniak;
      byMun1990Id[mun1990Id].breakdown.serb += breakdown.serb;
      byMun1990Id[mun1990Id].breakdown.croat += breakdown.croat;
      byMun1990Id[mun1990Id].breakdown.other += breakdown.other;
    }
  }

  // Regression guard: Banja Luka (20010) must have Serb > Croat (known census values)
  const banjaLuka = byMunicipalityId['20010'];
  if (!banjaLuka) {
    console.error('FAIL: Regression guard — municipality_id 20010 (Banja Luka) missing from rollups');
    process.exit(1);
  }
  if (banjaLuka.breakdown.serb <= banjaLuka.breakdown.croat) {
    console.error(
      `FAIL: Regression guard — Banja Luka (20010) Serb/Croat swap detected: serb=${banjaLuka.breakdown.serb}, croat=${banjaLuka.breakdown.croat}. Expected Serb > Croat.`
    );
    process.exit(1);
  }
  
  // Find missing municipalities
  const missingMunicipalityIds: string[] = [];
  for (const munId of allMunicipalityIds) {
    if (!byMunicipalityId[munId]) {
      missingMunicipalityIds.push(munId);
    }
  }
  
  // Sort missing IDs (stable numeric sort)
  missingMunicipalityIds.sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });
  
  // Cap to first 50
  const cappedMissing = missingMunicipalityIds.slice(0, 50);
  
  // Build notes
  const notes: string[] = [];
  if (missingMunicipalityIds.length > 0) {
    notes.push(`${missingMunicipalityIds.length} municipality_ids from munAgg have no census population data`);
    if (missingMunicipalityIds.length > 50) {
      notes.push(`Missing IDs list capped to first 50 of ${missingMunicipalityIds.length} total`);
    }
  }
  if (unmatchedCensusMun1990Ids.size > 0) {
    notes.push(`${unmatchedCensusMun1990Ids.size} mun1990_ids from census not in registry (unmatched): ${[...unmatchedCensusMun1990Ids].sort().join(', ')}`);
  }
  notes.push('Population data directly from bih_census_1991.json municipalities section');
  notes.push('mun1990_id totals are rolled up from post-1995 municipality_id populations');
  notes.push(`by_mun1990_id initialized with all ${canonicalMun1990Ids.length} canonical registry keys (zero if no census data)`);
  
  // Build output
  const output: OutputData = {
    awwv_meta: {
      role: 'municipality_population_1991',
      version: 'h4_7',
      source: [
        'data/source/bih_census_1991.json',
        'data/source/municipalities_1990_registry (canonical)',
        'data/derived/municipality_agg_post1995.json',
        'data/derived/mun1990_names.json',
      ],
    },
    by_municipality_id: byMunicipalityId,
    by_mun1990_id: byMun1990Id,
    meta: {
      coverage: {
        municipality_ids_total: allMunicipalityIds.size,
        municipality_ids_with_population: Object.keys(byMunicipalityId).length,
        mun1990_ids_total: canonicalMun1990Ids.length,
        mun1990_ids_with_population: Object.keys(byMun1990Id).filter(k => byMun1990Id[k].total > 0).length,
      },
      missing_municipality_ids: cappedMissing,
      notes,
    },
  };
  
  // Write output (deterministic JSON)
  writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
  
  console.log(`\nWrote ${outputPath}`);
  console.log(`  Municipality IDs with population: ${output.meta.coverage.municipality_ids_with_population} / ${output.meta.coverage.municipality_ids_total}`);
  console.log(`  Mun1990 IDs with population: ${output.meta.coverage.mun1990_ids_with_population} / ${output.meta.coverage.mun1990_ids_total}`);
  console.log(`  Missing municipalities: ${missingMunicipalityIds.length}`);
  
  if (missingMunicipalityIds.length > 0) {
    console.log(`\nFirst few missing municipality IDs: ${cappedMissing.slice(0, 10).join(', ')}`);
  }
}

main();
