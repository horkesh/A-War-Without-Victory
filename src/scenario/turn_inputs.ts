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
 * The shared preparation contract preserves both municipality population keying
 * schemes and sorted SID iteration, while production callers require validated
 * source rows. Explicit minimal fixtures may select named omissions at construction.
 * Changing the accepted production shapes or transformations changes calibration.
 *
 * Deterministic: sorted SID iteration; no RNG, no wall-clock.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

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

export interface SharedTurnInputRequirements {
    municipalityPopulation1991: boolean;
    settlementPopulationBySid: boolean;
    settlementDataRaw: boolean;
    historicalOobLookups: boolean;
    municipalityHqSettlement: boolean;
}

export const DESKTOP_PRODUCTION_TURN_INPUT_REQUIREMENTS: Readonly<SharedTurnInputRequirements> = Object.freeze({
    municipalityPopulation1991: true,
    settlementPopulationBySid: true,
    settlementDataRaw: true,
    historicalOobLookups: true,
    municipalityHqSettlement: true,
});

export const EXPLICIT_MINIMAL_FIXTURE_TURN_INPUT_REQUIREMENTS: Readonly<SharedTurnInputRequirements> = Object.freeze({
    municipalityPopulation1991: false,
    settlementPopulationBySid: false,
    settlementDataRaw: false,
    historicalOobLookups: false,
    municipalityHqSettlement: false,
});

export function scenarioProductionTurnInputRequirements(options: {
    historicalOobLookups: boolean;
    municipalityHqSettlement: boolean;
}): Readonly<SharedTurnInputRequirements> {
    return {
        municipalityPopulation1991: true,
        settlementPopulationBySid: true,
        settlementDataRaw: true,
        historicalOobLookups: options.historicalOobLookups,
        municipalityHqSettlement: options.municipalityHqSettlement,
    };
}

export interface PrepareSharedTurnInputsOptions {
    baseDir: string;
    sids: Iterable<string>;
    requirements: Readonly<SharedTurnInputRequirements>;
    /** Scenario startup may supply its already-loaded OOB catalog to avoid a second read. */
    oobBrigades?: readonly OobBrigade[];
    /** Scenario startup may supply its already-loaded HQ map to avoid a second read. */
    municipalityHqSettlement?: Record<string, string>;
}

const INPUT_PATHS = {
    municipalityPopulation1991: 'data/derived/municipality_population_1991.json',
    settlementPopulationBySid: 'data/derived/census_rolled_up_wgs84.json',
    settlementDataRaw: 'data/derived/settlement_ethnicity_data.json',
    historicalOobLookups: 'data/source/oob_brigades.json',
    municipalityHqSettlement: 'data/derived/municipality_hq_settlement.json',
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function inputError(relativePath: string, error: unknown): Error {
    const detail = error instanceof Error ? error.message : String(error);
    return new Error(`Shared turn input ${relativePath}: ${detail}`);
}

export async function loadRequiredHistoricalOob(baseDir: string): Promise<OobBrigade[]> {
    try {
        return await loadOobBrigades(baseDir);
    } catch (error) {
        throw inputError(INPUT_PATHS.historicalOobLookups, error);
    }
}

export async function loadRequiredMunicipalityHqSettlement(baseDir: string): Promise<Record<string, string>> {
    try {
        return await loadMunicipalityHqSettlement(baseDir);
    } catch (error) {
        throw inputError(INPUT_PATHS.municipalityHqSettlement, error);
    }
}

function requireFiniteNonNegative(value: unknown, label: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new Error(`${label} must be a finite non-negative number`);
    }
    return value;
}

/** 1991 municipality population, flattened across both census keying schemes. */
export async function loadMunicipalityPopulation1991(
    baseDir: string,
    required = false,
): Promise<MunicipalityPopulation1991 | undefined> {
    const relativePath = INPUT_PATHS.municipalityPopulation1991;
    try {
        const popPath = join(baseDir, relativePath);
        const parsed: unknown = JSON.parse(await readFile(popPath, 'utf8'));
        if (!isRecord(parsed)) throw new Error('expected a JSON object');
        const popRaw = parsed as {
            by_mun1990_id?: Record<string, { total: number; breakdown?: { bosniak: number; serb: number; croat: number; other: number } }>;
            by_municipality_id?: Record<string, { total: number; breakdown?: { bosniak: number; serb: number; croat: number; other: number }; mun1990_id?: string }>;
        };
        // Support both keying schemes: by_mun1990_id (kebab-case keys) or
        // by_municipality_id (numeric keys with mun1990_id field).
        const byMunDirect = popRaw.by_mun1990_id;
        const byNumericId = popRaw.by_municipality_id;
        const flat: MunicipalityPopulation1991 = {};
        const addEntry = (munId: string, v: { total: number; breakdown?: { bosniak: number; serb: number; croat: number; other: number } }) => {
            if (!isRecord(v) || munId.length === 0) throw new Error('population row must be an object with a non-empty municipality id');
            const b = v?.breakdown;
            if (b != null && !isRecord(b)) throw new Error(`population row ${munId}.breakdown must be an object`);
            flat[munId] = {
                total: requireFiniteNonNegative(v.total, `${munId}.total`),
                bosniak: b == null ? 0 : requireFiniteNonNegative(b.bosniak, `${munId}.breakdown.bosniak`),
                serb: b == null ? 0 : requireFiniteNonNegative(b.serb, `${munId}.breakdown.serb`),
                croat: b == null ? 0 : requireFiniteNonNegative(b.croat, `${munId}.breakdown.croat`),
                other: b == null ? 0 : requireFiniteNonNegative(b.other, `${munId}.breakdown.other`),
            };
        };
        if (isRecord(byMunDirect) && Object.keys(byMunDirect).length > 0) {
            for (const [munId, v] of Object.entries(byMunDirect)) addEntry(munId, v);
        } else if (isRecord(byNumericId) && Object.keys(byNumericId).length > 0) {
            for (const [_numId, v] of Object.entries(byNumericId)) {
                if (!isRecord(v) || typeof v.mun1990_id !== 'string' || v.mun1990_id.length === 0) {
                    throw new Error(`numeric population row ${_numId} requires a non-empty mun1990_id`);
                }
                addEntry(v.mun1990_id, v as unknown as { total: number; breakdown?: { bosniak: number; serb: number; croat: number; other: number } });
            }
        }
        if (Object.keys(flat).length === 0) throw new Error('expected non-empty by_mun1990_id or by_municipality_id rows');
        return flat;
    } catch (error) {
        if (required) throw inputError(relativePath, error);
        return undefined;
    }
}

/** Per-settlement 1991 population, first census column only, positive values only. */
export async function loadSettlementPopulationBySid(
    baseDir: string,
    required = false,
): Promise<Record<string, number> | undefined> {
    const relativePath = INPUT_PATHS.settlementPopulationBySid;
    try {
        const censusPath = join(baseDir, relativePath);
        const parsed: unknown = JSON.parse(await readFile(censusPath, 'utf8'));
        if (!isRecord(parsed) || !isRecord(parsed.by_sid) || Object.keys(parsed.by_sid).length === 0) {
            throw new Error('expected { by_sid: non-empty record }');
        }
        const censusRaw = parsed as {
            by_sid?: Record<string, { p?: number[] }>;
        };
        const bySid = censusRaw.by_sid ?? {};
        const popBySid: Record<string, number> = {};
        for (const [sid, v] of Object.entries(bySid)) {
            if (!isRecord(v) || !Array.isArray(v.p) || v.p.length === 0) {
                throw new Error(`by_sid.${sid}.p must be a non-empty array`);
            }
            const population = v.p[0];
            if (typeof population !== 'number' || !Number.isFinite(population) || population < 0) {
                throw new Error(`by_sid.${sid}.p[0] must be a finite non-negative number`);
            }
            if (population > 0) {
                popBySid[sid] = population;
            }
        }
        if (Object.keys(popBySid).length === 0) throw new Error('by_sid contains no positive first-column population values');
        return popBySid;
    } catch (error) {
        if (required) throw inputError(relativePath, error);
        return undefined;
    }
}

/** Per-settlement ethnicity + population rows, in sorted SID order. */
export async function loadSettlementDataRaw(
    baseDir: string,
    sids: Iterable<string>,
    settlementPopulationBySid: Record<string, number> | undefined,
    required = false,
): Promise<Array<{ sid: string; ethnicity?: { composition?: Record<string, number> }; population?: number }> | undefined> {
    const relativePath = INPUT_PATHS.settlementDataRaw;
    try {
        const parsed: unknown = JSON.parse(await readFile(join(baseDir, relativePath), 'utf8'));
        if (!isRecord(parsed) || !isRecord(parsed.by_settlement_id) || Object.keys(parsed.by_settlement_id).length === 0) {
            throw new Error('expected non-empty by_settlement_id record');
        }
        const bySettlementId = parsed.by_settlement_id;
        for (const [sid, entry] of Object.entries(bySettlementId)) {
            if (!isRecord(entry)) throw new Error(`by_settlement_id.${sid} must be an object`);
            if (!isRecord(entry.composition)) {
                throw new Error(`by_settlement_id.${sid}.composition must be an object`);
            }
            for (const key of ['bosniak', 'croat', 'serb', 'other'] as const) {
                requireFiniteNonNegative(entry.composition[key], `by_settlement_id.${sid}.composition.${key}`);
            }
        }
        const validatedBySettlementId = bySettlementId as Record<string, { composition: Record<string, number> }>;
        const sorted = Array.from(sids).sort(strictCompare);
        const raw: Array<{ sid: string; ethnicity?: { composition?: Record<string, number> }; population?: number }> = [];
        for (const sid of sorted) {
            const entry = validatedBySettlementId[sid];
            const pop = settlementPopulationBySid?.[sid];
            raw.push({
                sid,
                ...(entry?.composition ? { ethnicity: { composition: entry.composition } } : {}),
                ...(pop != null ? { population: pop } : {})
            });
        }
        if (required && raw.length === 0) throw new Error('settlement SID set is empty');
        return raw.length > 0 ? raw : undefined;
    } catch (error) {
        if (required) throw inputError(relativePath, error);
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
 * Prepare every shared `runTurn` input in one call. Desktop loads the full
 * production set; scenario startup supplies OOB/HQ values it already owns.
 *
 * `sids` should be the canonical settlement-graph SID set, so `settlementDataRaw`
 * covers the same settlements the calibration path covers.
 */
export async function prepareSharedTurnInputs(options: PrepareSharedTurnInputsOptions): Promise<SharedTurnInputs> {
    const { baseDir, sids, requirements } = options;
    const shouldLoadOob = requirements.historicalOobLookups && options.oobBrigades == null;
    const shouldLoadHq = requirements.municipalityHqSettlement && options.municipalityHqSettlement == null;
    const [municipalityPopulation1991, settlementPopulationBySid, loadedOobBrigades, loadedMunicipalityHqSettlement] =
        await Promise.all([
            requirements.municipalityPopulation1991
                ? loadMunicipalityPopulation1991(baseDir, true)
                : Promise.resolve(undefined),
            requirements.settlementPopulationBySid
                ? loadSettlementPopulationBySid(baseDir, true)
                : Promise.resolve(undefined),
            shouldLoadOob
                ? loadRequiredHistoricalOob(baseDir)
                : Promise.resolve(undefined),
            shouldLoadHq
                ? loadRequiredMunicipalityHqSettlement(baseDir)
                : Promise.resolve(undefined),
        ]);
    const oobBrigades = requirements.historicalOobLookups
        ? options.oobBrigades ?? loadedOobBrigades ?? []
        : [];
    if (requirements.historicalOobLookups && oobBrigades.length === 0) {
        throw inputError(INPUT_PATHS.historicalOobLookups, new Error('expected at least one OOB brigade'));
    }
    const municipalityHqSettlement = requirements.municipalityHqSettlement
        ? options.municipalityHqSettlement ?? loadedMunicipalityHqSettlement ?? {}
        : {};
    if (requirements.municipalityHqSettlement && Object.keys(municipalityHqSettlement).length === 0) {
        throw inputError(INPUT_PATHS.municipalityHqSettlement, new Error('expected non-empty by_mun1990_id mapping'));
    }
    const settlementDataRaw = requirements.settlementDataRaw
        ? await loadSettlementDataRaw(baseDir, sids, settlementPopulationBySid, true)
        : undefined;
    const lookups = buildHistoricalOobLookups(oobBrigades);
    return {
        municipalityPopulation1991,
        settlementPopulationBySid,
        settlementDataRaw,
        municipalityHqSettlement: Object.keys(municipalityHqSettlement).length > 0 ? municipalityHqSettlement : undefined,
        ...lookups,
    };
}

/** Production desktop compatibility wrapper. */
export async function loadSharedTurnInputs(baseDir: string, sids: Iterable<string>): Promise<SharedTurnInputs> {
    return prepareSharedTurnInputs({
        baseDir,
        sids,
        requirements: DESKTOP_PRODUCTION_TURN_INPUT_REQUIREMENTS,
    });
}
