import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { test } from 'vitest';

import { startNewCampaign } from '../src/desktop/desktop_sim.js';
import { createStateFromScenario, runScenario } from '../src/scenario/scenario_runner.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';

async function ensureRemoved(dir: string): Promise<void> {
    if (existsSync(dir)) {
        await rm(dir, { recursive: true, force: true });
    }
}

test('initial_save is already in canonical loaded-save form at campaign birth', async () => {
    const baseDir = process.cwd();
    const scenarioPath = join(baseDir, 'data', 'scenarios', 'apr1992_definitive_52w.json');
    const outDir = join(baseDir, '.tmp_desktop_campaign_start_contract');

    await ensureRemoved(outDir);
    const result = await runScenario({
        scenarioPath,
        baseDir,
        outDirBase: outDir,
        initialStateOnly: true,
    });

    const initialSave = await readFile(result.paths.initial_save, 'utf8');
    const hydrated = deserializeState(initialSave);
    const inMemoryState = await createStateFromScenario(scenarioPath, baseDir, { initialStateOnly: true });

    assert.strictEqual(
        serializeState(hydrated),
        initialSave,
        'initial_save.json should already match the canonical loaded-save contract',
    );
    assert.strictEqual(
        serializeState(inMemoryState),
        initialSave,
        'desktop in-memory startup state should match the canonical initial_save exactly',
    );
    assert.deepStrictEqual(
        inMemoryState.military.unresolved_sector_brigades ?? [],
        [],
        'desktop campaign birth should not leave active brigades outside sector ownership',
    );

    await ensureRemoved(outDir);
}, 120_000);

test('startNewCampaign returns canonicalized state before the first manual save', async () => {
    const { state } = await startNewCampaign(process.cwd(), 'RBiH', 'apr_1992');
    const payload = serializeState(state);
    const hydrated = deserializeState(payload);

    assert.strictEqual(hydrated.meta.player_faction, 'RBiH');
    assert.ok(hydrated.military.recruitment_state, 'desktop new campaign should include recruitment_state at birth');
    assert.strictEqual(
        serializeState(hydrated),
        payload,
        'desktop new-campaign state should already be in canonical save/load form',
    );
}, 120_000);

test('startNewCampaign queues the selected faction foundational decision at campaign birth', async () => {
    const cases = [
        { faction: 'RBiH' as const, eventId: 'rbih_state_identity' },
        { faction: 'RS' as const, eventId: 'rs_strategic_goals' },
        { faction: 'HRHB' as const, eventId: 'hrhb_political_goal' },
    ];
    const allFoundationalIds = cases.map((entry) => entry.eventId);
    const gatedFollowUpIds = [
        'rbih_paramilitary_policy_1992',
        'rs_paramilitary_policy_1992',
        'hrhb_1992_graz_cooperation_collapse',
    ];

    for (const { faction, eventId } of cases) {
        const { state } = await startNewCampaign(process.cwd(), faction, 'apr_1992');
        const pending = state.military.pending_event_decisions ?? [];

        assert.strictEqual(
            pending.length,
            1,
            `${faction} campaign birth should queue exactly one opening foundational decision`,
        );
        assert.strictEqual(pending[0]?.event_id, eventId);
        assert.strictEqual(pending[0]?.faction, faction);
        assert.strictEqual(pending[0]?.requires_player_response, true);
        assert.ok(
            (pending[0]?.response_options ?? []).length >= 2,
            `${eventId} should carry authored response options for the player`,
        );
        assert.ok(
            state.military.fired_event_ids.includes(eventId),
            `${eventId} should be marked fired when queued so once-only gating holds`,
        );
        for (const otherEventId of allFoundationalIds.filter((id) => id !== eventId)) {
            assert.ok(
                !state.military.fired_event_ids.includes(otherEventId),
                `${faction} startup should not fire another faction's foundational decision`,
            );
        }
        for (const followUpId of gatedFollowUpIds) {
            assert.ok(
                !pending.some((decision) => decision.event_id === followUpId),
                `${followUpId} should remain gated behind the player's foundational response`,
            );
            assert.ok(
                !state.military.fired_event_ids.includes(followUpId),
                `${followUpId} should not be fired at campaign birth`,
            );
        }

        const payload = serializeState(state);
        assert.strictEqual(
            serializeState(deserializeState(payload)),
            payload,
            `${faction} startup decision state should remain canonical after save/load`,
        );
    }
}, 120_000);

test('desktop startup path uses the in-memory startup builder instead of harness artifacts by default', async () => {
    const source = await readFile(
        resolve(process.cwd(), 'src', 'scenario', 'scenario_runner.ts'),
        'utf8',
    );
    const createStateStart = source.indexOf('export async function createStateFromScenario(');
    const createStateEnd = source.indexOf('export async function loadScenarioFromPath', createStateStart);
    const createStateBody = source.slice(createStateStart, createStateEnd === -1 ? undefined : createStateEnd);

    assert.ok(createStateStart >= 0, 'createStateFromScenario should exist');
    assert.match(
        createStateBody,
        /const \{ state \} = await buildScenarioStartupState\(scenario, baseDir\);/,
        'desktop initialStateOnly path should use the shared in-memory startup builder',
    );
    assert.match(
        createStateBody,
        /pushRoutineConsoleDiagnosticsSuppressed\(\);[\s\S]*try \{[\s\S]*buildScenarioStartupState\(scenario, baseDir\)[\s\S]*finally \{[\s\S]*popRoutineConsoleDiagnosticsSuppressed\(\);[\s\S]*\}/,
        'desktop initialStateOnly path should suppress routine startup diagnostics',
    );
    assert.match(
        createStateBody,
        /if \(!initialStateOnly\) \{\s*const result = await runScenario\(/s,
        'harness artifact generation should remain the explicit non-default compatibility path',
    );
});
