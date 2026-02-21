import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { FactionId } from '../state/game_state.js';

export interface MunicipalityPopulationBreakdown {
    total: number;
    bosniak: number;
    serb: number;
    croat: number;
    other: number;
}

export interface MunicipalityPopulationRecord {
    total: number;
    breakdown: MunicipalityPopulationBreakdown;
    mun1990_id: string;
}

export interface MunicipalityPopulationData {
    by_municipality_id: Record<string, MunicipalityPopulationRecord>;
}

let cached: MunicipalityPopulationData | null = null;

export async function loadMunicipalityPopulation1991(
    path?: string
): Promise<MunicipalityPopulationData> {
    if (cached) return cached;
    const filePath = resolve(path ?? 'data/derived/municipality_population_1991.json');
    const content = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(content) as MunicipalityPopulationData;
    if (!parsed || typeof parsed !== 'object' || !parsed.by_municipality_id) {
        throw new Error('Invalid municipality_population_1991.json: missing by_municipality_id');
    }
    cached = parsed;
    return parsed;
}

export function getFactionDemographicFraction(
    data: MunicipalityPopulationData,
    munId: string,
    factionId: FactionId | null
): number {
    if (!factionId) return 0.5;
    const record = data.by_municipality_id?.[munId];
    if (!record || !record.breakdown || record.breakdown.total <= 0) return 0.5;
    const total = record.breakdown.total;
    let value = 0.5;
    if (factionId === 'RBiH') value = record.breakdown.bosniak / total;
    else if (factionId === 'RS') value = record.breakdown.serb / total;
    else if (factionId === 'HRHB') value = record.breakdown.croat / total;
    return Math.max(0, Math.min(1, value));
}
