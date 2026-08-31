/**
 * Shared `runTurn` input loading — ONE owner for the census/OOB-derived inputs that
 * both execution paths must feed the war pipeline.
 *
 * WHY THIS EXISTS (2026-08-31). `scenario_runner` (calibration) passed seven of these
 * to `runTurn`; `desktop_sim.advanceTurn` (the shipped campaign + every `tools/ai_play`
 * playthrough) passed none of them. The load-bearing omission was
 * `municipalityPopulation1991`: `formation_spawn.ts` skips its minimum-eligible-
 * population gate entirely when the map is absent
 * (`if (population1991ByMun != null) { … }`), so the player path spawned brigades in
 * municipalities the calibration path suppressed — divergent orders of battle from
 * turn 1, compounding for 188 weeks.
 *
 * Two copies of this loading logic would recreate exactly the drift that caused the
 * problem (see the `apr1992_definitive_52w` fork, PROJECT_LEDGER 2026-08-31). So it
 * lives here once and both callers use it.
 *
 * PURE EXTRACTION: the bodies below are moved verbatim from
 * `scenario_runner.buildScenarioStartupState`, including the swallow-to-`undefined`
 * catch behaviour, the two population keying schemes, and the sorted SID iteration
 * that makes `settlementDataRaw` deterministic. Nothing here is new logic; changing
 * any of it changes calibration.
 *
 * Deterministic: sorted SID iteration; no RNG, no wall-clock.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { loadSettlementEthnicityData } from '../data/settlement_ethnicity.js';
import { strictCompare } from '../state/validateGameState.js';
import type { MunicipalityPopulation1991 } from '../sim/turn_pipeline.js';
import { loadMunicipalityHqSettlement, loadOobBrigades, type OobBrigade } from './oob_loader.js';

/** Historical emergent-brigade lookup: (faction, home_mun, ordinal) -> value or null. */
export type HistoricalOrdinalLookup = (faction: string, mun_id: string, ordinal: number) => string | null;

export interface SharedTurnInputs {
    municipalityPopulation1991: MunicipalityPopulation1991 | undefined;
    settlementPopulationBySid: Record<string, number> | undefined;
    settlementDataRaw: Array<{ sid: string; ethnicity?: { composition?: Record<string, number> }; population?: number }> | undefined;
    municipalityHqSettlement: Record<string, string> | undefined;
    historicalNameLookup: HistoricalOrdinalLookup | undefined;
    historicalCorpsLookup: HistoricalOrdinalLookup | undefined;
    historicalOobIdLookup: HistoricalOrdinalLookup | undefined;
}

/** 1991 municipality population, flattened across both census keying schemes. */
export async function loadMunicipalityPopulation1991(
    baseDir: string
): Promise<MunicipalityPopulation1991 | undefined> {
    try {
        const popPath = join(baseDir, 'data/derived/municipality_population_1991.json');
        const popRaw = JSON.parse(await readFile(popPath, 'utf8')) as {
            by_mun1990_id?: Record<string, { total: number; breakdown?: { bosniak: number; serb: number; croat: number; other: number } }>;
            by_municipality_id?: Record<string, { total: number; breakdown?: { bosniak: number; serb: number; croat: number; other: number }; mun1990_id?: string }>;
        };
        // Support both keying schemes: by_mun1990_id (kebab-case keys) or
        // by_municipality_id (numeric keys with mun1990_id field).
        const byMunDirect = popRaw.by_mun1990_id;
        const byNumericId = popRaw.by_municipality_id;
        const flat: MunicipalityPopulation1991 = {};
        const addEntry = (munId: string, v: { total: number; breakdown?: { bosniak: number; serb: number; croat: number; other: number } }) => {
            const b = v?.breakdown;
            flat[munId] = { total: v?.total ?? 0, bosniak: b?.bosniak ?? 0, serb: b?.serb ?? 0, croat: b?.croat ?? 0, other: b?.other ?? 0 };
        };
        if (byMunDirect && Object.keys(byMunDirect).length > 0) {
            for (const [munId, v] of Object.entries(byMunDirect)) addEntry(munId, v);
        } else if (byNumericId) {
            for (const [_numId, v] of Object.entries(byNumericId)) {
                if (v?.mun1990_id) addEntry(v.mun1990_id, v);
            }
        }
        return flat;
    } catch {
        return undefined;
    }
}

/** Per-settlement 1991 population, first census column only, positive values only. */
export async function loadSettlementPopulationBySid(
    baseDir: string
): Promise<Record<string, number> | undefined> {
    try {
        const censusPath = join(baseDir, 'data/derived/census_rolled_up_wgs84.json');
        const censusRaw = JSON.parse(await readFile(censusPath, 'utf8')) as {
            by_sid?: Record<string, { p?: number[] }>;
        };
        const bySid = censusRaw.by_sid ?? {};
        const popBySid: Record<string, number> = {};
        for (const [sid, v] of Object.entries(bySid)) {
            const p = v?.p;
            if (Array.isArray(p) && p.length > 0 && typeof p[0] === 'number' && p[0] > 0) {
                popBySid[sid] = p[0];
            }
        }
        return Object.keys(popBySid).length > 0 ? popBySid : undefined;
    } catch {
        return undefined;
    }
}

/** Per-settlement ethnicity + population rows, in sorted SID order. */
export async function loadSettlementDataRaw(
    baseDir: string,
    sids: Iterable<string>,
    settlementPopulationBySid: Record<string, number> | undefined
): Promise<Array<{ sid: string; ethnicity?: { composition?: Record<string, number> }; population?: number }> | undefined> {
    try {
        const ethnicityData = await loadSettlementEthnicityData(join(baseDir, 'data/derived/settlement_ethnicity_data.json'));
        const sorted = Array.from(sids).sort(strictCompare);
        const raw: Array<{ sid: string; ethnicity?: { composition?: Record<string, number> }; population?: number }> = [];
        for (const sid of sorted) {
            const entry = ethnicityData.by_settlement_id?.[sid];
            const pop = settlementPopulationBySid?.[sid];
            raw.push({
                sid,
                ...(entry?.composition ? { ethnicity: { composition: entry.composition } } : {}),
                ...(pop != null ? { population: pop } : {})
            });
        }
        return raw.length > 0 ? raw : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Build the three historical emergent-brigade ordinal lookups from an OOB list.
 * Entries are grouped by `faction:home_mun` and sorted by NAME, so the ordinal a
 * caller passes selects the same brigade on every run.
 */
export function buildHistoricalOobLookups(oobBrigades: readonly OobBrigade[]): {
    historicalNameLookup: HistoricalOrdinalLookup | undefined;
    historicalCorpsLookup: HistoricalOrdinalLookup | undefined;
    historicalOobIdLookup: HistoricalOrdinalLookup | undefined;
} {
    const oobEntriesByFactionMun = new Map<string, Array<{ id: string; name: string; corps: string | null }>>();
    for (const b of oobBrigades) {
        const key = `${b.faction}:${b.home_mun}`;
        const list = oobEntriesByFactionMun.get(key) ?? [];
        list.push({ id: b.id, name: b.name, corps: b.corps ?? null });
        oobEntriesByFactionMun.set(key, list);
    }
    for (const list of oobEntriesByFactionMun.values()) {
        list.sort((a, b) => strictCompare(a.name, b.name));
    }
    if (oobEntriesByFactionMun.size === 0) {
        return {
            historicalNameLookup: undefined,
            historicalCorpsLookup: undefined,
            historicalOobIdLookup: undefined,
        };
    }
    const pick = (field: 'id' | 'name' | 'corps'): HistoricalOrdinalLookup =>
        (faction: string, mun_id: string, ordinal: number): string | null => {
            const list = oobEntriesByFactionMun.get(`${faction}:${mun_id}`);
            return list != null && ordinal >= 1 && ordinal <= list.length
                ? list[ordinal - 1]?.[field] ?? null
                : null;
        };
    return {
        historicalNameLookup: pick('name'),
        historicalCorpsLookup: pick('corps'),
        historicalOobIdLookup: pick('id'),
    };
}

/**
 * Load every shared `runTurn` input in one call. Used by `desktop_sim.advanceTurn`;
 * `scenario_runner` composes the same helpers inline because it already holds the
 * OOB lists and graph it needs for other purposes.
 *
 * `sids` should be the canonical settlement-graph SID set, so `settlementDataRaw`
 * covers the same settlements the calibration path covers.
 */
export async function loadSharedTurnInputs(baseDir: string, sids: Iterable<string>): Promise<SharedTurnInputs> {
    const [municipalityPopulation1991, settlementPopulationBySid, oobBrigades, municipalityHqSettlement] =
        await Promise.all([
            loadMunicipalityPopulation1991(baseDir),
            loadSettlementPopulationBySid(baseDir),
            loadOobBrigades(baseDir).catch((): OobBrigade[] => []),
            loadMunicipalityHqSettlement(baseDir).catch((): Record<string, string> => ({})),
        ]);
    const settlementDataRaw = await loadSettlementDataRaw(baseDir, sids, settlementPopulationBySid);
    const lookups = buildHistoricalOobLookups(oobBrigades);
    return {
        municipalityPopulation1991,
        settlementPopulationBySid,
        settlementDataRaw,
        municipalityHqSettlement: Object.keys(municipalityHqSettlement).length > 0 ? municipalityHqSettlement : undefined,
        ...lookups,
    };
}
