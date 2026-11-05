import assert from 'node:assert';
import { createRequire } from 'node:module';
import { test } from 'vitest';

const require = createRequire(import.meta.url);
const { evaluateNativeCalibrationOutcome } = require('../tools/diagnostics/native_calibration_outcome_compare.cjs');

function fixture() {
    const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
    const initial = {
        meta: { turn: 0 },
        political: {
            initial_political_controllers: { a: 'RBiH', b: 'RS' },
            political_controllers: { a: 'RBiH', b: 'RS' },
            control_events: [],
        },
    };
    const turn1 = {
        meta: { turn: 1 },
        political: {
            political_controllers: { a: 'RS', b: 'RS' },
            control_events: [{ settlement_id: 'a', from: 'RBiH', to: 'RS', turn: 1, mechanism: 'combat' }],
        },
    };
    const turn2 = {
        meta: { turn: 2 },
        political: {
            political_controllers: { a: 'RS', b: 'RBiH' },
            control_events: [
                { settlement_id: 'a', from: 'RBiH', to: 'RS', turn: 1, mechanism: 'combat' },
                { settlement_id: 'b', from: 'RS', to: 'RBiH', turn: 2, mechanism: 'combat' },
            ],
        },
    };
    return {
        acceptedInitial: initial,
        nativeInitial: clone(initial),
        acceptedFinal: clone(turn2),
        acceptedCheckpoints: new Map([[1, clone(turn1)], [2, clone(turn2)]]),
        nativeTurns: new Map([[1, turn1], [2, turn2]]),
        paintedTargets: new Map([
            [1, { a: 'RS', b: 'RS' }],
            [2, { a: 'RS', b: 'RBiH' }],
        ]),
        acceptedScores: new Map([[1, 2], [2, 2]]),
        expectedPolicy: {
            scenarioSourceSha256: 'scenario-sha', startupSnapshotSha256: 'startup-sha',
            requestedFaction: 'RBiH', decisionMode: 'historical', autonomyLevel: 2,
            headless: false, seed: 'harness-seed',
        },
        policy: {
            scenarioSourceSha256: 'scenario-sha', startupSnapshotSha256: 'startup-sha',
            requestedFaction: 'RBiH', decisionMode: 'historical', autonomyLevel: 2,
            headless: false, seed: 'harness-seed',
            eventChoiceTranscript: [{ eventId: 'opening', responseId: 'historical', status: 'applied', playerInput: true }],
            campaignModeSelectionEvidence: { requested: 'historical', ariaChecked: 'true' },
            decisionAudit: { pendingIds: [], receiptIds: ['opening'] },
        },
        requiredTurns: [1, 2],
        protectedChecks: [{ id: 'n91:2:b', pass: true }],
        healthChecks: { canonicalTurnArchives: true, controllerCardinality: true, saveLoadRoundTrip: true },
        inputBindingChecks: { acceptedManifest: true, packagedRuntimeInputs: true, startupSnapshot: true },
        referenceIdentityChecks: { scenarioId: true, weeks: true, immutableHashes: true },
    };
}

test('native outcome comparator accepts an exact replay and exposes distinct gates', () => {
    const report = evaluateNativeCalibrationOutcome(fixture());
    assert.equal(report.schemaVersion, 'awwv.native-calibration-outcome-compare.v1');
    assert.equal(report.pass, true);
    assert.equal(report.gates.referenceIntegrity.pass, true);
    assert.equal(report.gates.controllerTimeline.pass, true);
    assert.equal(report.gates.checkpointScores.pass, true);
    assert.equal(report.gates.inputPolicy.pass, true);
    assert.equal(report.gates.protectedControl.pass, true);
    assert.equal(report.gates.calibrationEngineHealth.pass, true);
    assert.equal(report.gates.initialControl.pass, true);
    assert.equal(report.gates.inputBinding.pass, true);
    assert.equal(report.gates.referenceIdentity.pass, true);
});

test('native outcome comparator rejects broken accepted event lineage', () => {
    const input = fixture();
    input.acceptedFinal.political.control_events[1].from = 'RBiH';
    const report = evaluateNativeCalibrationOutcome(input);
    assert.equal(report.gates.referenceIntegrity.pass, false);
    assert.match(report.gates.referenceIntegrity.failures.join('\n'), /event lineage/i);
});

test('native outcome comparator independently rejects controller, timeline, score, and policy mutations', () => {
    const controllerInput = fixture();
    controllerInput.nativeTurns.get(2)!.political.political_controllers.b = 'RS';
    assert.equal(evaluateNativeCalibrationOutcome(controllerInput).gates.controllerTimeline.pass, false);

    const timelineInput = fixture();
    timelineInput.nativeTurns.get(2)!.political.control_events[1].mechanism = 'paramilitary';
    assert.equal(evaluateNativeCalibrationOutcome(timelineInput).gates.controllerTimeline.pass, false);

    const scoreInput = fixture();
    scoreInput.acceptedScores.set(2, 1);
    assert.equal(evaluateNativeCalibrationOutcome(scoreInput).gates.checkpointScores.pass, false);

    const policyInput = fixture();
    policyInput.policy.decisionMode = 'emergent';
    assert.equal(evaluateNativeCalibrationOutcome(policyInput).gates.inputPolicy.pass, false);

    const protectedInput = fixture();
    protectedInput.protectedChecks[0].pass = false;
    assert.equal(evaluateNativeCalibrationOutcome(protectedInput).gates.protectedControl.pass, false);

    const healthInput = fixture();
    healthInput.healthChecks.saveLoadRoundTrip = false;
    assert.equal(evaluateNativeCalibrationOutcome(healthInput).gates.calibrationEngineHealth.pass, false);

    const initialInput = fixture();
    initialInput.nativeInitial.political.political_controllers.a = 'RS';
    assert.equal(evaluateNativeCalibrationOutcome(initialInput).gates.initialControl.pass, false);

    const bindingInput = fixture();
    bindingInput.inputBindingChecks.packagedRuntimeInputs = false;
    assert.equal(evaluateNativeCalibrationOutcome(bindingInput).gates.inputBinding.pass, false);

    const identityInput = fixture();
    identityInput.referenceIdentityChecks.immutableHashes = false;
    assert.equal(evaluateNativeCalibrationOutcome(identityInput).gates.referenceIdentity.pass, false);
});

test('native outcome comparator requires complete turn archives and an applied choice transcript', () => {
    const missingTurn = fixture();
    missingTurn.nativeTurns.delete(1);
    assert.equal(evaluateNativeCalibrationOutcome(missingTurn).gates.controllerTimeline.pass, false);

    const incompleteTranscript = fixture();
    incompleteTranscript.policy.eventChoiceTranscript[0].status = 'planned';
    assert.equal(evaluateNativeCalibrationOutcome(incompleteTranscript).gates.inputPolicy.pass, false);

    const emptyPresentedTranscript = fixture();
    emptyPresentedTranscript.policy.eventChoiceTranscript = [];
    assert.equal(evaluateNativeCalibrationOutcome(emptyPresentedTranscript).gates.inputPolicy.pass, false);

    const missingModeReceipt = fixture();
    (missingModeReceipt.policy as any).campaignModeSelectionEvidence = null;
    assert.equal(evaluateNativeCalibrationOutcome(missingModeReceipt).gates.inputPolicy.pass, false);
});
