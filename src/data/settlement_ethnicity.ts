/**
 * Load settlement ethnicity data (1991 census-based) for ethnic/hybrid init modes.
 * Data source: data/derived/settlement_ethnicity_data.json
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export type EthnicityMajority = 'bosniak' | 'serb' | 'croat' | 'other' | 'unknown';

export interface SettlementEthnicityEntry {
    majority: EthnicityMajority;
    composition: {
        bosniak: number;
        croat: number;
        serb: number;
        other: number;
    };
    provenance: 'settlement_census' | 'no_data' | 'ambiguous_ordering';
}

export interface SettlementEthnicityData {
    meta?: { source?: string; total_settlements?: number };
    by_settlement_id: Record<string, SettlementEthnicityEntry>;
}

let cached: SettlementEthnicityData | null = null;
let cachedPath: string | null = null;

export async function loadSettlementEthnicityData(
    path?: string
): Promise<SettlementEthnicityData> {
    const filePath = resolve(path ?? 'data/derived/settlement_ethnicity_data.json');
    if (cached && cachedPath === filePath) return cached;
    const content = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(content) as unknown;
    if (!parsed || typeof parsed !== 'object' || !(parsed as Record<string, unknown>).by_settlement_id) {
        throw new Error(
            'Invalid settlement_ethnicity_data.json: expected { by_settlement_id: Record<string, EthnicityEntry> }'
        );
    }
    cached = parsed as SettlementEthnicityData;
    cachedPath = filePath;
    return cached;
}

/** Map majority ethnicity to faction (deterministic). unknown/other → null (use fallback). */
export function majorityToFaction(majority: EthnicityMajority): 'RBiH' | 'RS' | 'HRHB' | null {
    if (majority === 'bosniak') return 'RBiH';
    if (majority === 'serb') return 'RS';
    if (majority === 'croat') return 'HRHB';
    return null;
}
