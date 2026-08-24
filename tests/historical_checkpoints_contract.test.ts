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
        const short = { scenario_id: 'apr1992_probe_4w', init_control: 'apr1992', weeks: 4 } as unknown as ScenarioLike;
        expect(usesPaintedControlReference(short), 'this one DOES read a painted reference').toBe(true);
        expect(checkpointsForScenario(short), 'but week 4 reaches no checkpoint').toEqual([]);
    });

    it('checkpoint boundaries are inclusive at the checkpoint week and exclusive below it', () => {
        const at = (weeks: number) =>
            checkpointsForScenario({ scenario_id: 'apr1992_x', init_control: 'apr1992', weeks } as unknown as ScenarioLike)
                .map((c) => c.week);
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
