import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'vitest';

import { startNewCampaign } from '../src/desktop/desktop_sim.js';
import {
    buildStartupSnapshotPayload,
    loadStartupSnapshotPayload,
    loadStartupSnapshotState,
    validateStartupSnapshot,
} from '../src/scenario/startup_snapshot.js';
import {
    isSrkStranglePostureEnabled,
    resetSrkStranglePostureGate,
} from '../src/sim/combat/contain_posture_gate.js';
import { computeSrkStrangleOsids } from '../src/sim/combat/srk_strangle.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';

test('baked April 1992 startup artifact matches canonical builder truth after checkout normalization', async () => {
    const baseDir = process.cwd();
    const [artifactPayload, builderPayload] = await Promise.all([
        loadStartupSnapshotPayload(baseDir, 'apr_1992'),
        buildStartupSnapshotPayload(baseDir, 'apr_1992'),
    ]);

    assert.strictEqual(
        artifactPayload,
        builderPayload,
        'baked startup artifact should remain a one-way derived copy of canonical builder truth',
    );
}, 120_000);

test('baked April 1992 startup artifact stays in canonical loaded-save form', async () => {
    const state = await loadStartupSnapshotState(process.cwd(), 'apr_1992');
    const payload = serializeState(state);

    assert.strictEqual(
        serializeState(deserializeState(payload)),
        payload,
        'baked startup artifact should already be in canonical save/load form',
    );
});

test('desktop new campaign consumes the baked April 1992 startup artifact path', async () => {
    const source = await readFile(
        resolve(process.cwd(), 'src', 'desktop', 'desktop_sim.ts'),
        'utf8',
    );
    const startCampaignStart = source.indexOf('export async function startNewCampaign(');
    const startCampaignEnd = source.indexOf('export async function loadStateFromPath', startCampaignStart);
    const startCampaignBody = source.slice(startCampaignStart, startCampaignEnd === -1 ? undefined : startCampaignEnd);

    assert.ok(startCampaignStart >= 0, 'startNewCampaign should exist');
    assert.match(
        startCampaignBody,
        /const state = key === 'apr_1992'\s*\? await loadStartupSnapshotState\(baseDir, key\)\s*:\s*await createStateFromScenario\(scenarioPath, baseDir\);/s,
        'desktop apr_1992 startup should consume the baked startup artifact while non-baked scenarios keep the builder path',
    );
});

test('desktop new campaign overlays remain canonical after loading the baked artifact', async () => {
    const baseDir = process.cwd();
    const bakedState = await loadStartupSnapshotState(baseDir, 'apr_1992');
    const { state } = await startNewCampaign(baseDir, 'RBiH', 'apr_1992');

    // The baked/headless artifact keeps player_faction unset; desktop
    // startNewCampaign overlays the faction passed by the user.
    assert.strictEqual(bakedState.meta.player_faction, undefined);
    assert.strictEqual(state.meta.player_faction, 'RBiH');
    assert.ok(state.military.recruitment_state, 'desktop new campaign should still inject recruitment_state over the baked artifact');
    assert.strictEqual(
        serializeState(deserializeState(serializeState(state))),
        serializeState(state),
        'desktop overlays over the baked artifact should remain canonical after save/load',
    );
}, 120_000);

test('baked April 1992 startup materializes default-on SRK strangle containment', async () => {
    resetSrkStranglePostureGate();
    const prev = process.env.AWWV_SRK_STRANGLE_POSTURE;
    delete process.env.AWWV_SRK_STRANGLE_POSTURE;
    try {
        const state = await loadStartupSnapshotState(process.cwd(), 'apr_1992');
        const expected = computeSrkStrangleOsids(state);

        assert.strictEqual(isSrkStranglePostureEnabled(), true);
        assert.strictEqual(expected.length, 4, 'startup should expose the four RBiH-held Sarajevo urban-core OSIDs');
        assert.deepStrictEqual(state.political.last_contained_osids_by_faction?.RS, expected);
    } finally {
        if (prev !== undefined) process.env.AWWV_SRK_STRANGLE_POSTURE = prev;
        else delete process.env.AWWV_SRK_STRANGLE_POSTURE;
        resetSrkStranglePostureGate();
    }
}, 120_000);

test('baked April 1992 active opening corps assets have named commanders', async () => {
    const state = await loadStartupSnapshotState(process.cwd(), 'apr_1992');
    const activeCommandedCorps = new Set(
        Object.values(state.military.named_officers ?? {})
            .filter((officer) => officer.status === 'active' && officer.assigned_corps_id)
            .map((officer) => officer.assigned_corps_id!),
    );

    const openingCorpsIds = [
        'vrs_drina',
        'arbih_3rd_corps',
        'arbih_4th_corps',
    ];

    for (const corpsId of openingCorpsIds) {
        const corps = state.military.formations[corpsId];
        const activeBrigades = Object.values(state.military.formations)
            .filter((formation) => formation.status === 'active' && formation.corps_id === corpsId);

        assert.ok(corps, `${corpsId} should exist in the baked startup artifact`);
        assert.strictEqual(corps.status, 'active', `${corpsId} should be an active opening corps asset`);
        assert.ok(activeBrigades.length > 0, `${corpsId} should have active opening brigades`);
        assert.ok(activeCommandedCorps.has(corpsId), `${corpsId} should not render as Command forming at turn 0`);
    }
}, 120_000);

test('baked April 1992 startup seats interim commanders without backdating later official corps commanders', async () => {
    const state = await loadStartupSnapshotState(process.cwd(), 'apr_1992');
    const officers = state.military.named_officers ?? {};

    assert.strictEqual(officers.vrs_andric?.assigned_corps_id, 'vrs_drina');
    assert.strictEqual(officers.vrs_andric?.acting_commander, true);
    assert.strictEqual(officers.arbih_cikotic?.assigned_corps_id, 'arbih_3rd_corps');
    assert.strictEqual(officers.arbih_cikotic?.acting_commander, true);
    assert.strictEqual(officers.arbih_hujdur?.assigned_corps_id, 'arbih_4th_corps');
    assert.strictEqual(officers.arbih_hujdur?.acting_commander, true);

    assert.strictEqual(officers.vrs_zivanovic, undefined, 'Živanović remains a later Drina arrival, not a turn-0 backdate');
    assert.strictEqual(officers.arbih_hadzihasanovic, undefined, 'Hadžihasanović remains a later 3rd Corps arrival, not a turn-0 backdate');
    assert.strictEqual(officers.arbih_pasalic, undefined, 'Pašalić remains a later 4th Corps arrival, not a turn-0 backdate');
}, 120_000);

test('baked April 1992 startup has no false turn-0 combat control history', async () => {
    const state = await loadStartupSnapshotState(process.cwd(), 'apr_1992');
    const turnZeroCombatEvents = (state.political.control_events ?? [])
        .filter((event) => event.turn === 0 && event.mechanism === 'combat');

    assert.deepStrictEqual(turnZeroCombatEvents, []);

    const jnaSetupControlOsids = [
        'op:stolac:stolac_2',
        'op:stolac:rotimlja_2',
        'op:stolac:pjesivac_kula_2',
        'op:capljina:tasovcici_2',
        'op:mostar:hodbina_2',
        'op:kupres:goravci',
        'op:kupres:kupres_2',
    ];

    for (const osid of jnaSetupControlOsids) {
        assert.strictEqual(state.political.political_controllers?.[osid], 'RS');
        assert.strictEqual(state.political.initial_political_controllers?.[osid], 'RS');
    }
}, 120_000);

test('desktop new campaign preserves default-on SRK strangle containment at birth', async () => {
    resetSrkStranglePostureGate();
    const prev = process.env.AWWV_SRK_STRANGLE_POSTURE;
    delete process.env.AWWV_SRK_STRANGLE_POSTURE;
    try {
        const { state } = await startNewCampaign(process.cwd(), 'RBiH', 'apr_1992');
        const expected = computeSrkStrangleOsids(state);

        assert.strictEqual(isSrkStranglePostureEnabled(), true);
        assert.strictEqual(expected.length, 4, 'desktop birth state should expose the four RBiH-held Sarajevo urban-core OSIDs');
        assert.deepStrictEqual(state.political.last_contained_osids_by_faction?.RS, expected);
    } finally {
        if (prev !== undefined) process.env.AWWV_SRK_STRANGLE_POSTURE = prev;
        else delete process.env.AWWV_SRK_STRANGLE_POSTURE;
        resetSrkStranglePostureGate();
    }
}, 120_000);

test('startup snapshot validator reports the committed artifact as current', async () => {
    const result = await validateStartupSnapshot(process.cwd(), 'apr_1992');
    assert.strictEqual(result.matches, true);
}, 120_000);
