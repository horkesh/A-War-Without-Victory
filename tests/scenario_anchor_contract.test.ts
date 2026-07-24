import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import {
    evaluateHistoricalControlBand,
    HISTORICAL_CONTROL_BAND_ANCHORS_APR1992_TO_DEC1992,
    HISTORICAL_OSID_ANCHORS_APR1992_TO_DEC1992,
} from '../src/scenario/historical_anchors.js';
import { runScenario } from '../src/scenario/scenario_runner.js';
import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import type { FormationKind, FormationState, GameState } from '../src/state/game_state.js';

const SCENARIO_52W = join(process.cwd(), 'data', 'scenarios', 'apr1992_definitive_52w.json');
const OUT_DIR_52W = join(process.cwd(), '.tmp_workstream_e_turn52_invariants');
const NON_PHYSICAL_KINDS = new Set<FormationKind>(['corps', 'corps_asset', 'army_hq']);
const YEAR_ONE_ENCLAVE_CORES = [
    'op:bihac:bihac_2',
    'op:gorazde:gorazde_2',
    'op:rogatica:zepa_2',
    'op:srebrenica:srebrenica_2',
] as const;

describe('historical scenario anchor contract', () => {
    it('grades the volatile Brcko front as a corridor band instead of pinning Brka', () => {
        expect(HISTORICAL_OSID_ANCHORS_APR1992_TO_DEC1992).not.toContainEqual(
            expect.objectContaining({ osid: 'op:brcko:brka_2' }),
        );
        const corridor = HISTORICAL_CONTROL_BAND_ANCHORS_APR1992_TO_DEC1992.find(
            anchor => anchor.anchor_id === 'brcko_corridor_jan1993',
        );
        expect(corridor).toBeDefined();

        const result = evaluateHistoricalControlBand(corridor!, {
            'op:brcko:brcko': 'RS',
            'op:brcko:krepsic': 'RS',
            'op:brcko:brezovo_polje_selo_2': 'RS',
            'op:brcko:potocari_2': 'RS',
            'op:brcko:donji_rahic': 'RS',
            'op:brcko:skakava_donja': 'RS',
            'op:brcko:brka_2': 'RS',
            'op:brcko:bukvik_gornji_2': 'RBiH',
            'op:brcko:palanka': 'RBiH',
            'op:brcko:gornji_rahic_2': 'RBiH',
            'op:brcko:bijela_2': 'RBiH',
            'op:brcko:boce_2': 'RBiH',
            'op:brcko:maoca_2': 'RBiH',
        });

        expect(result.passed).toBe(true);
        expect(result.clauses.map(clause => clause.actual_count)).toEqual([6, 6]);
    });

    it('fails the Brcko band when RS consumes the southern shoulder', () => {
        const corridor = HISTORICAL_CONTROL_BAND_ANCHORS_APR1992_TO_DEC1992[0]!;
        const allRs = Object.fromEntries(
            corridor.clauses.flatMap(clause => clause.osids).map(osid => [osid, 'RS']),
        );

        expect(evaluateHistoricalControlBand(corridor, allRs).passed).toBe(false);
    });

    it('does not contain duplicate OSID anchors', () => {
        const ids = HISTORICAL_OSID_ANCHORS_APR1992_TO_DEC1992.map(anchor => anchor.osid);

        expect(new Set(ids).size).toBe(ids.length);
    });
});

describe('Workstream E turn-52 invariants', () => {
    let state: GameState | undefined;

    beforeAll(async () => {
        const prereq = checkDataPrereqs({ baseDir: process.cwd() });
        if (!prereq.ok) return;
        if (existsSync(OUT_DIR_52W)) await rm(OUT_DIR_52W, { recursive: true });
        const result = await runScenario({ scenarioPath: SCENARIO_52W, outDirBase: OUT_DIR_52W });
        state = JSON.parse(await readFile(result.paths.final_save, 'utf8')) as GameState;
    }, 600_000);

    it('locates every active physical combat formation on a faction-controlled OSID', () => {
        if (!state) return;
        expect(state.meta.turn).toBe(52);
        const controllers = state.political.political_controllers ?? {};
        const violations = Object.values(state.military.formations ?? {})
            .filter((formation): formation is FormationState => formation?.status === 'active')
            .filter(formation => !NON_PHYSICAL_KINDS.has(formation.kind ?? 'brigade'))
            .filter(formation => (
                !formation.location_osid
                || !formation.location_osid.startsWith('op:')
                || controllers[formation.location_osid] !== formation.faction
            ))
            .map(formation => `${formation.id}:${formation.kind ?? 'brigade'}:${formation.location_osid ?? 'missing'}`)
            .sort();

        expect(violations).toEqual([]);
    });

    it('keeps all four year-one enclave cores under RBiH control without changing historical anchors', () => {
        if (!state) return;
        const controllers = state.political.political_controllers ?? {};

        for (const osid of YEAR_ONE_ENCLAVE_CORES) {
            const anchor = HISTORICAL_OSID_ANCHORS_APR1992_TO_DEC1992.find(entry => entry.osid === osid);
            expect(anchor?.expected_controller).toBe('RBiH');
            expect(controllers[osid], osid).toBe('RBiH');
        }
    });

    it('persists the offered peace plans as a resolved chronology through Vance-Owen', () => {
        if (!state) return;
        const negotiation = state.military.negotiation;
        const history = negotiation?.peace_plan_history ?? [];

        expect(negotiation?.pending_peace_plan).toBeUndefined();
        expect(history.every(entry => entry.resolved)).toBe(true);
        expect(history.map(entry => entry.turn_offered)).toEqual(
            history.map(entry => entry.turn_offered).sort((a, b) => a - b),
        );
        expect(history).toContainEqual(expect.objectContaining({
            plan_id: 'vance_owen',
            turn_offered: 40,
            resolved: true,
        }));
    });

    afterAll(async () => {
        if (existsSync(OUT_DIR_52W)) await rm(OUT_DIR_52W, { recursive: true });
    });
});
