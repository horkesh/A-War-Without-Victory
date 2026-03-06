import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { loadSettlementEthnicityData } from '../../src/data/settlement_ethnicity.js';
import { loadSettlementGraph } from '../../src/map/settlements.js';
import {
    buildCombatCausalitySummary,
    buildOperationCombatDiagnostics,
} from '../../src/scenario/combat_causality.js';
import {
    loadMunicipalityHqSettlement,
    loadOobBrigades,
} from '../../src/scenario/oob_loader.js';
import { loadOperationalData } from '../../src/data/operational_data.js';
import { deserializeState } from '../../src/state/serialize.js';
import { runTurn } from '../../src/sim/turn_pipeline.js';
import type { GameState } from '../../src/state/game_state.js';
import { strictCompare } from '../../src/state/validateGameState.js';

type MunicipalityPopulation1991 = Record<
    string,
    { total: number; bosniak: number; serb: number; croat: number; other: number }
>;

async function loadTurnInputs(baseDir: string) {
    const graph = await loadSettlementGraph({
        settlementsPath: join(baseDir, 'data/source/settlements_initial_master.json'),
        edgesPath: join(baseDir, 'data/derived/settlement_edges.json'),
    });

    let municipalityPopulation1991: MunicipalityPopulation1991 | undefined;
    try {
        const popPath = join(baseDir, 'data/derived/municipality_population_1991.json');
        const popRaw = JSON.parse(await readFile(popPath, 'utf8')) as {
            by_mun1990_id?: Record<string, { total: number; breakdown?: { bosniak: number; serb: number; croat: number; other: number } }>;
            by_municipality_id?: Record<string, { total: number; breakdown?: { bosniak: number; serb: number; croat: number; other: number }; mun1990_id?: string }>;
        };
        const flat: MunicipalityPopulation1991 = {};
        const addEntry = (munId: string, v: { total: number; breakdown?: { bosniak: number; serb: number; croat: number; other: number } }) => {
            const b = v.breakdown;
            flat[munId] = {
                total: v.total ?? 0,
                bosniak: b?.bosniak ?? 0,
                serb: b?.serb ?? 0,
                croat: b?.croat ?? 0,
                other: b?.other ?? 0,
            };
        };
        if (popRaw.by_mun1990_id && Object.keys(popRaw.by_mun1990_id).length > 0) {
            for (const [munId, value] of Object.entries(popRaw.by_mun1990_id)) addEntry(munId, value);
        } else if (popRaw.by_municipality_id) {
            for (const value of Object.values(popRaw.by_municipality_id)) {
                if (value?.mun1990_id) addEntry(value.mun1990_id, value);
            }
        }
        municipalityPopulation1991 = flat;
    } catch {
        municipalityPopulation1991 = undefined;
    }

    let settlementPopulationBySid: Record<string, number> | undefined;
    try {
        const censusPath = join(baseDir, 'data/derived/census_rolled_up_wgs84.json');
        const censusRaw = JSON.parse(await readFile(censusPath, 'utf8')) as {
            by_sid?: Record<string, { p?: number[] }>;
        };
        const bySid = censusRaw.by_sid ?? {};
        const popBySid: Record<string, number> = {};
        for (const [sid, value] of Object.entries(bySid)) {
            const p = value?.p;
            if (Array.isArray(p) && p.length > 0 && typeof p[0] === 'number' && p[0] > 0) {
                popBySid[sid] = p[0];
            }
        }
        settlementPopulationBySid = Object.keys(popBySid).length > 0 ? popBySid : undefined;
    } catch {
        settlementPopulationBySid = undefined;
    }

    let settlementDataRaw: Array<{ sid: string; ethnicity?: { composition?: Record<string, number> }; population?: number }> | undefined;
    try {
        const ethnicityData = await loadSettlementEthnicityData(join(baseDir, 'data/derived/settlement_ethnicity_data.json'));
        const sids = Array.from(graph.settlements.keys()).sort(strictCompare);
        const raw: Array<{ sid: string; ethnicity?: { composition?: Record<string, number> }; population?: number }> = [];
        for (const sid of sids) {
            const entry = ethnicityData.by_settlement_id?.[sid];
            const pop = settlementPopulationBySid?.[sid];
            raw.push({
                sid,
                ...(entry?.composition ? { ethnicity: { composition: entry.composition } } : {}),
                ...(pop != null ? { population: pop } : {}),
            });
        }
        settlementDataRaw = raw.length > 0 ? raw : undefined;
    } catch {
        settlementDataRaw = undefined;
    }

    const oobBrigades = await loadOobBrigades(baseDir);
    await loadMunicipalityHqSettlement(baseDir);
    const oobNamesByFactionMun = new Map<string, string[]>();
    for (const brigade of oobBrigades) {
        const key = `${brigade.faction}:${brigade.home_mun}`;
        const list = oobNamesByFactionMun.get(key) ?? [];
        list.push(brigade.name);
        oobNamesByFactionMun.set(key, list);
    }
    for (const list of oobNamesByFactionMun.values()) list.sort((a, b) => a.localeCompare(b));
    const historicalNameLookup =
        oobNamesByFactionMun.size > 0
            ? (faction: string, mun_id: string, ordinal: number): string | null => {
                const list = oobNamesByFactionMun.get(`${faction}:${mun_id}`);
                return list != null && ordinal >= 1 && ordinal <= list.length ? list[ordinal - 1] ?? null : null;
            }
            : undefined;

    return {
        graph,
        municipalityPopulation1991,
        settlementPopulationBySid,
        settlementDataRaw,
        historicalNameLookup,
    };
}

function printOperationState(state: GameState, turn: number, diagnostics: ReturnType<typeof buildOperationCombatDiagnostics>) {
    const rsDiagnostics = diagnostics
        .filter((row) => row.faction_id === 'RS')
        .sort((a, b) => strictCompare(a.corps_id, b.corps_id));

    console.log(`\nTURN ${turn}`);
    for (const row of rsDiagnostics) {
        const brigadeStates = row.participating_brigades
            .map((brigadeId) => {
                const brigade = state.formations?.[brigadeId];
                return {
                    brigadeId,
                    loc: brigade?.location_osid ?? null,
                    posture: brigade?.posture ?? null,
                    homeDefense: brigade?.home_defense_active ?? null,
                    fatigue: brigade?.fatigue ?? null,
                };
            });
        console.log(JSON.stringify({
            corps_id: row.corps_id,
            operation_name: row.operation_name,
            operation_phase: row.operation_phase,
            current_objective: row.current_objective,
            attack_attempt_count: row.attack_attempt_count,
            battle_count: row.battle_count,
            current_objective_attack_count: row.current_objective_attack_count,
            invalidation_reasons: row.invalidation_reasons,
            brigade_states: brigadeStates,
        }));
    }
}

async function main() {
    const [, , runDirArg, turnsArg] = process.argv;
    if (!runDirArg) {
        throw new Error('usage: tsx scripts/debug/trace_opening_operations.ts <runDir> [turns]');
    }
    const baseDir = process.cwd();
    const runDir = join(baseDir, runDirArg);
    const turns = turnsArg ? Number(turnsArg) : 20;
    const initialSavePath = join(runDir, 'initial_save.json');
    const initialSave = await readFile(initialSavePath, 'utf8');
    let state = deserializeState(initialSave) as GameState;

    const inputData = await loadTurnInputs(baseDir);
    await loadOperationalData(baseDir);

    for (let i = 0; i < turns; i += 1) {
        const result = await runTurn(state, {
            seed: state.meta.seed,
            settlementGraph: inputData.graph,
            settlementEdges: inputData.graph.edges,
            municipalityPopulation1991: inputData.municipalityPopulation1991,
            settlementPopulationBySid: inputData.settlementPopulationBySid,
            settlementDataRaw: inputData.settlementDataRaw,
            historicalNameLookup: inputData.historicalNameLookup,
        });
        state = result.nextState;
        const operationDiagnostics = buildOperationCombatDiagnostics(
            state,
            result.report.phase_ii_bot_order_diagnostics,
            result.report.phase_ii_attack_resolution_osid,
        );
        const summary = buildCombatCausalitySummary(
            operationDiagnostics,
            result.report.phase_ii_bot_order_diagnostics,
            result.report.phase_ii_attack_resolution_osid,
        );
        console.log(JSON.stringify({
            turn: state.meta.turn,
            combat_causality: summary,
        }));
        printOperationState(state, state.meta.turn, operationDiagnostics);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
