import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
    HISTORICAL_CHECKPOINTS,
    checkpointsForScenario,
    pickHistoricalReferenceKey,
    usesPaintedControlReference,
} from '../src/scenario/scenario_runner.js';

type ScenarioLike = Parameters<typeof checkpointsForScenario>[0];

async function loadScenario(name: string): Promise<ScenarioLike> {
    const path = join(process.cwd(), 'data/scenarios', name);
    return JSON.parse(await readFile(path, 'utf8')) as ScenarioLike;
}

/**
 * ONE DEFINITIVE SCENARIO, MANY SNAPSHOTS (owner, 2026-08-24).
 *
 * Before checkpoint scoring, the only way to get a SCORED intermediate was to run a
 * shorter scenario whose duration selected that reference. Those forks drifted:
 * `apr1992_definitive_104w` was missing `firepower_deficit_penalty_enabled` and scored
 * 639 where the 188w line scored 647 at the same week 104. These tests pin the property
 * that made the forks unnecessary — a single run reaches every checkpoint inside its
 * horizon — so nobody has to reintroduce one.
 */
describe('historical checkpoints', () => {
    it('the table is ascending, unique in both week and key, and matches real painted files', async () => {
        const weeks = HISTORICAL_CHECKPOINTS.map((c) => c.week);
        expect(weeks, 'ascending — the emitted array follows this order')
            .toEqual([...weeks].sort((a, b) => a - b));
        expect(new Set(weeks).size, 'no duplicate weeks').toBe(weeks.length);
        const keys = HISTORICAL_CHECKPOINTS.map((c) => c.key);
        expect(new Set(keys).size, 'no duplicate reference keys').toBe(keys.length);
        // Every key must name a painted file that actually exists and covers the same
        // OSID universe, or a checkpoint would score against a partial reference.
        for (const c of HISTORICAL_CHECKPOINTS) {
            const raw = await readFile(
                join(process.cwd(), `data/source/calibration/painted_control_${c.key}.json`),
                'utf8'
            );
            const parsed = JSON.parse(raw) as { by_settlement_id: Record<string, string> };
            expect(Object.keys(parsed.by_settlement_id).length, `${c.key} OSID count`).toBe(712);
        }
    });

    it('★ the definitive 188w scenario reaches EVERY checkpoint', async () => {
        const scenario = await loadScenario('apr1992_definitive_188w.json');
        const reached = checkpointsForScenario(scenario);
        expect(reached.map((c) => c.key)).toEqual(['jan1993', 'apr1994', 'apr1995', 'oct1995']);
        expect(reached.map((c) => c.week)).toEqual([39, 104, 156, 188]);
    });

    it('pins continuously RS-held Jemanlići, which the April initializer misclassifies', async () => {
        const scenario = await loadScenario('apr1992_definitive_188w.json') as ScenarioLike & {
            osid_control_overrides?: Record<string, string>;
        };
        expect(scenario.osid_control_overrides?.['op:donji_vakuf:jemanlici']).toBe('RS');
    });

    it('pins RS-held Paklarevo, reserved as a target for the 1995 Vlasic offensive', async () => {
        const scenario = await loadScenario('apr1992_definitive_188w.json') as ScenarioLike & {
            osid_control_overrides?: Record<string, string>;
        };
        expect(scenario.osid_control_overrides?.['op:travnik:paklarevo']).toBe('RS');
    });

    it('pins the owner-corrected January painter at Rat and Prozor town', async () => {
        const raw = await readFile(
            join(process.cwd(), 'data/source/calibration/painted_control_jan1993.json'),
            'utf8'
        );
        const painted = (JSON.parse(raw) as { by_settlement_id: Record<string, string> })
            .by_settlement_id;
        expect(painted['op:novi_travnik:rat_2']).toBe('HRHB');
        expect(painted['op:prozor:prozor_2']).toBe('HRHB');
    });

    it('the terminal checkpoint agrees with the duration-based key, so historical_fit keeps its meaning', async () => {
        const scenario = await loadScenario('apr1992_definitive_188w.json');
        const reached = checkpointsForScenario(scenario);
        const terminal = reached[reached.length - 1];
        expect(terminal.key).toBe(pickHistoricalReferenceKey(scenario));
    });

    it('a scenario that reads no painted reference reaches no checkpoints', () => {
        const notPainted = { scenario_id: 'synthetic_probe', weeks: 188 } as unknown as ScenarioLike;
        expect(usesPaintedControlReference(notPainted)).toBe(false);
        expect(checkpointsForScenario(notPainted)).toEqual([]);
    });

    it('CONTROL — a horizon shorter than the first checkpoint reaches none', () => {
        // Declared, so scoring is enabled — this isolates the HORIZON rule from the
        // declaration rule. Without the flag it would return [] for the other reason.
        const short = {
            scenario_id: 'apr1992_probe_4w',
            init_control: 'apr1992',
            calibration_scenario: true,
            weeks: 4,
        } as unknown as ScenarioLike;
        expect(usesPaintedControlReference(short), 'declared, so it DOES read a painted reference').toBe(true);
        expect(checkpointsForScenario(short), 'but week 4 reaches no checkpoint').toEqual([]);
    });

    it('checkpoint boundaries are inclusive at the checkpoint week and exclusive below it', () => {
        const at = (weeks: number) =>
            checkpointsForScenario({
                scenario_id: 'apr1992_x',
                init_control: 'apr1992',
                calibration_scenario: true,
                weeks,
            } as unknown as ScenarioLike).map((c) => c.week);
        expect(at(38), 'one week short of the first checkpoint').toEqual([]);
        expect(at(39), 'exactly on it').toEqual([39]);
        expect(at(103)).toEqual([39]);
        expect(at(104)).toEqual([39, 104]);
        expect(at(187)).toEqual([39, 104, 156]);
        expect(at(188)).toEqual([39, 104, 156, 188]);
    });

    it('a mid-war start skips checkpoints behind it', () => {
        // jan1993_to_dayton starts at week 39 and runs 149 weeks, so it should reach the
        // later three but NOT re-score week 39, which is its own turn zero.
        const midWar = {
            scenario_id: 'jan1993_to_dayton',
            init_control: 'apr1992',
            calibration_scenario: true,
            scenario_start_week: 39,
            weeks: 149,
        } as unknown as ScenarioLike;
        expect(checkpointsForScenario(midWar).map((c) => c.week)).toEqual([104, 156, 188]);
    });

    it('the anchor set is EPOCH-SCOPED — a count quoted without its epoch is meaningless', async () => {
        const { resolveEpochOsidAnchors } = await import('../src/scenario/historical_anchors.js');
        const counts = Object.fromEntries(
            HISTORICAL_CHECKPOINTS.map((c) => [c.key, resolveEpochOsidAnchors(c.key).length])
        );
        // These differ on purpose: each epoch supplements the 27-entry early-war base with
        // its own OSIDs (apr1994 adds Vareš, apr1995 adds the whole Krajina sweep, ...).
        // "31/31" is the OCT1995 figure and was never a global invariant.
        expect(counts).toEqual({ jan1993: 30, apr1994: 31, apr1995: 39, oct1995: 30 });
        expect(new Set(Object.values(counts)).size, 'not all epochs agree — that is the point')
            .toBeGreaterThan(1);
    });
});

/**
 * ONE DEFINITIVE SCENARIO — the declaration, not a duration rule.
 *
 * Scoring used to be inferred from `init_control === 'apr1992'`, which made THIRTY scenarios
 * emit a historical_fit figure: every 4w probe, every bots fork, every historical_mvp_*
 * variant. Any of them could be quoted as "the" calibration number, and one was —
 * apr1992_definitive_104w reported 639 against apr1994 where the definitive line reported 647
 * at the same week, because that fork had silently missed firepower_deficit_penalty_enabled.
 */
describe('exactly one calibration scenario', () => {
    it('★ exactly one scenario in the repo emits historical_fit scoring, and it is the 188w', async () => {
        // THROUGH THE LOADER, NOT JSON.parse. The first version of this test read the raw
        // JSON and passed while the real path was broken: `loadScenario` rebuilds the
        // scenario from named fields and was silently dropping `calibration_scenario`, so
        // the runner saw undefined for EVERY scenario and scored none -- including the
        // calibration one. A test that bypasses the loader cannot see that class of defect.
        const { readdirSync } = await import('node:fs');
        const { loadScenario } = await import('../src/scenario/scenario_loader.js');
        const scoring: string[] = [];
        for (const f of readdirSync('data/scenarios').filter((x) => x.endsWith('.json'))) {
            let s: ScenarioLike & { scenario_id?: string };
            try {
                s = (await loadScenario('data/scenarios/' + f)) as typeof s;
            } catch {
                continue;
            }
            if (!s.scenario_id) continue;
            if (usesPaintedControlReference(s)) scoring.push(s.scenario_id);
        }
        expect(scoring, 'a second scoring scenario is a second calibration number').toEqual([
            'apr1992_definitive_188w',
        ]);
    });

    it('★ the loader CARRIES the declaration — the flag must survive loadScenario', async () => {
        // Regression pin for the silent-drop above. The type and the JSON agreeing is not
        // enough; the loader has to be taught the field too.
        const { loadScenario } = await import('../src/scenario/scenario_loader.js');
        const loaded = (await loadScenario('data/scenarios/apr1992_definitive_188w.json')) as {
            calibration_scenario?: boolean;
        };
        expect(loaded.calibration_scenario, 'dropped by the loader = scoring silently off').toBe(true);
        expect(checkpointsForScenario(loaded as ScenarioLike)).toHaveLength(4);
    });

    it('authors the January 1993 Srebrenica–Zvornik boundary and its stabilizing cells', async () => {
        const { loadScenario } = await import('../src/scenario/scenario_loader.js');
        const loaded = (await loadScenario('data/scenarios/apr1992_definitive_188w.json')) as {
            osid_control_overrides?: Record<string, string>;
        };

        expect(loaded.osid_control_overrides).toMatchObject({
            'op:srebrenica:brezovice_2': 'RS',
            'op:kladanj:brgule': 'RBiH',
            'op:kladanj:vucinici_2': 'RBiH',
            'op:zvornik:djulici': 'RS',
        });
    });

    it('the declaration is what gates it — a 188w clone without the flag does not score', () => {
        const declared = {
            scenario_id: 'apr1992_definitive_188w',
            init_control: 'apr1992',
            weeks: 188,
            calibration_scenario: true,
        } as unknown as ScenarioLike;
        const clone = {
            scenario_id: 'apr1992_definitive_188w_experiment',
            init_control: 'apr1992',
            weeks: 188,
        } as unknown as ScenarioLike;
        expect(usesPaintedControlReference(declared)).toBe(true);
        expect(usesPaintedControlReference(clone), 'identical duration, no declaration').toBe(false);
        expect(checkpointsForScenario(clone), 'and therefore no checkpoints').toEqual([]);
    });

    it('a fixture that stops scoring still runs — the flag gates scoring only', () => {
        // The gate is on the painted-reference read, not on simulation. A non-declaring
        // scenario is a fixture: same sim, same final_save, no opinion about fidelity.
        const fixture = { scenario_id: 'apr1992_4w', init_control: 'apr1992', weeks: 4 } as unknown as ScenarioLike;
        expect(usesPaintedControlReference(fixture)).toBe(false);
        expect(fixture.weeks).toBe(4);
    });
});
