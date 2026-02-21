/**
 * Phase H2.2: Control events vs control_delta consistency.
 * Asserts that every settlement flip in control_delta has exactly one matching event in control_events.jsonl
 * with same settlement_id, from, to, and mechanism === "phase_i_control_flip".
 */

import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

import { runScenario } from '../src/scenario/scenario_runner.js';


const SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'noop_4w.json');
const BASE_OUT = join(process.cwd(), '.tmp_scenario_control_events_h2_2');

function isMissingMappingError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    return (
        msg.includes('Municipality controller mapping file not found') ||
        msg.includes('not in municipality_political_controllers')
    );
}

async function ensureRemoved(dir: string): Promise<void> {
    if (existsSync(dir)) {
        await rm(dir, { recursive: true });
    }
}

test('control_events vs control_delta consistency: every flip has one event with same settlement_id, from, to', async () => {
    await ensureRemoved(BASE_OUT);

    let run_id: string;
    try {
        const result = await runScenario({ scenarioPath: SCENARIO_PATH, outDirBase: BASE_OUT });
        run_id = result.run_id;
    } catch (err) {
        if (isMissingMappingError(err)) {
            return;
        }
        throw err;
    }

    const outDir = join(BASE_OUT, run_id);
    const controlDeltaRaw = await readFile(join(outDir, 'control_delta.json'), 'utf8');
    const controlDelta = JSON.parse(controlDeltaRaw) as {
        total_flips: number;
        flips: Array<{ settlement_id: string; from: string | null; to: string | null }>;
    };

    const controlEventsRaw = await readFile(join(outDir, 'control_events.jsonl'), 'utf8');
    const lines = controlEventsRaw.trim() ? controlEventsRaw.trim().split('\n') : [];
    const events = lines.map((line) =>
        JSON.parse(line) as {
            turn: number;
            settlement_id: string;
            from: string | null;
            to: string | null;
            mechanism: string;
            mun_id: string | null;
        }
    );

    assert.strictEqual(
        events.length,
        controlDelta.total_flips,
        'control_events count must equal control_delta.total_flips'
    );

    for (const ev of events) {
        assert.strictEqual(
            ev.mechanism,
            'phase_i_control_flip',
            'all events must have mechanism phase_i_control_flip'
        );
    }

    for (const flip of controlDelta.flips) {
        const matching = events.filter(
            (e) =>
                e.settlement_id === flip.settlement_id &&
                (e.from === flip.from || (e.from == null && flip.from == null)) &&
                (e.to === flip.to || (e.to == null && flip.to == null))
        );
        assert.strictEqual(
            matching.length,
            1,
            `expected exactly one event for flip settlement_id=${flip.settlement_id} from=${flip.from} to=${flip.to}; got ${matching.length}`
        );
    }

    await ensureRemoved(BASE_OUT);
});

test('formation_delta.json exists and has required keys', async () => {
    await ensureRemoved(BASE_OUT);

    let run_id: string;
    try {
        const result = await runScenario({ scenarioPath: SCENARIO_PATH, outDirBase: BASE_OUT });
        run_id = result.run_id;
    } catch (err) {
        if (isMissingMappingError(err)) {
            return;
        }
        throw err;
    }

    const outDir = join(BASE_OUT, run_id);
    const formationDeltaRaw = await readFile(join(outDir, 'formation_delta.json'), 'utf8');
    const formationDelta = JSON.parse(formationDeltaRaw) as Record<string, unknown>;

    assert.ok(Array.isArray(formationDelta.formations_added), 'formations_added must be array');
    assert.ok(Array.isArray(formationDelta.formations_removed), 'formations_removed must be array');
    assert.ok(
        typeof formationDelta.counts_initial_by_kind === 'object' && formationDelta.counts_initial_by_kind !== null,
        'counts_initial_by_kind must be object'
    );
    assert.ok(
        typeof formationDelta.counts_final_by_kind === 'object' && formationDelta.counts_final_by_kind !== null,
        'counts_final_by_kind must be object'
    );
    assert.ok(
        typeof formationDelta.counts_added_by_kind === 'object' && formationDelta.counts_added_by_kind !== null,
        'counts_added_by_kind must be object'
    );
    assert.ok(
        typeof formationDelta.counts_removed_by_kind === 'object' && formationDelta.counts_removed_by_kind !== null,
        'counts_removed_by_kind must be object'
    );

    await ensureRemoved(BASE_OUT);
});
