/**
 * Phase H2: Build settlement ethnicity dataset
 * 
 * Produces deterministic attribute dataset for settlement majority ethnicity + composition.
 * Loads from substrate viewer index (which already computes ethnicity from census).
 * 
 * Usage:
 *   npm run map:build:ethnicity
 *   or: tsx scripts/map/build_settlement_ethnicity_data.ts
 * 
 * Outputs:
 *   - data/derived/settlement_ethnicity_data.json
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { computeSha256Hex } from './lib/awwv_contracts.js';

// Mistake guard

interface SettlementIndexEntry {
  name: string | null;
  municipality_id: string | null;
  bbox: [number, number, number, number];
  centroid: [number, number];
  majority: 'bosniak' | 'serb' | 'croat' | 'other' | 'unknown';
  shares: {
    bosniak: number;
    croat: number;
    serb: number;
    other: number;
  };
  provenance: 'settlement' | 'no_settlement_census' | 'ambiguous_ordering';
}

interface ViewerIndex {
  meta: {
    geometry_path: string;
    census_path: string;
    settlement_census_key: string | null;
    ordering_mode: 'named' | 'ambiguous' | 'missing';
    counts: {
      features: number;
      matched_settlement_census: number;
      unknown: number;
      majority: {
        bosniak: number;
        serb: number;
        croat: number;
        other: number;
        unknown: number;
      };
    };
    global_bbox: [number, number, number, number];
  };
  by_sid: Record<string, SettlementIndexEntry>;
}

interface EthnicityEntry {
  majority: 'bosniak' | 'serb' | 'croat' | 'other' | 'unknown';
  composition: {
    bosniak: number;
    croat: number;
    serb: number;
    other: number;
  };
  provenance: 'settlement_census' | 'no_data' | 'ambiguous_ordering';
}

interface EthnicityDataset {
  meta: {
    source: string;
    total_settlements: number;
    counts: {
      bosniak: number;
      serb: number;
      croat: number;
      other: number;
      unknown: number;
    };
  };
  by_settlement_id: Record<string, EthnicityEntry>;
}

async function main(): Promise<void> {
  const viewerIndexPath = resolve('data/derived/substrate_viewer/data_index.json');
  const outputPath = resolve('data/derived/settlement_ethnicity_data.json');
  
  process.stdout.write(`Loading ${viewerIndexPath}...\n`);
  const viewerIndexContent = readFileSync(viewerIndexPath, 'utf8');
  const viewerIndex = JSON.parse(viewerIndexContent) as ViewerIndex;
  
  process.stdout.write(`Loaded ${Object.keys(viewerIndex.by_sid).length} settlements\n`);
  
  // Build ethnicity dataset (deterministic ordering by sid)
  const bySid: Record<string, EthnicityEntry> = {};
  const counts = {
    bosniak: 0,
    serb: 0,
    croat: 0,
    other: 0,
    unknown: 0,
  };
  
  // Sort keys deterministically
  const sortedSids = Object.keys(viewerIndex.by_sid).sort((a, b) => a.localeCompare(b));
  
  for (const sid of sortedSids) {
    const entry = viewerIndex.by_sid[sid];
    
    let provenance: 'settlement_census' | 'no_data' | 'ambiguous_ordering';
    if (entry.provenance === 'settlement') {
      provenance = 'settlement_census';
    } else if (entry.provenance === 'ambiguous_ordering') {
      provenance = 'ambiguous_ordering';
    } else {
      provenance = 'no_data';
    }
    
    bySid[sid] = {
      majority: entry.majority,
      composition: { ...entry.shares },
      provenance,
    };
    
    counts[entry.majority]++;
  }
  
  const ethnicityDataset: EthnicityDataset = {
    meta: {
      source: 'substrate_viewer/data_index.json',
      total_settlements: sortedSids.length,
      counts,
    },
    by_settlement_id: bySid,
  };
  
  const outputJson = JSON.stringify(ethnicityDataset, null, 2);
  writeFileSync(outputPath, outputJson, 'utf8');
  
  const checksum = computeSha256Hex(Buffer.from(outputJson, 'utf8'));
  
  process.stdout.write(`\nWrote ${sortedSids.length} ethnicity entries to ${outputPath}\n`);
  process.stdout.write(`Checksum: ${checksum.slice(0, 12)}...\n`);
  process.stdout.write(`\nCounts:\n`);
  process.stdout.write(`  Bosniak: ${counts.bosniak}\n`);
  process.stdout.write(`  Serb: ${counts.serb}\n`);
  process.stdout.write(`  Croat: ${counts.croat}\n`);
  process.stdout.write(`  Other: ${counts.other}\n`);
  process.stdout.write(`  Unknown: ${counts.unknown}\n`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exitCode = 1;
});
