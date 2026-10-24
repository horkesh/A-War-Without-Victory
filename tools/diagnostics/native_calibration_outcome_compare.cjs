'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}

function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

function hash(value) {
  return crypto.createHash('sha256').update(stableJson(value)).digest('hex');
}

function mapFromState(state, initial = false) {
  const political = state?.political ?? {};
  const map = initial
    ? political.initial_political_controllers ?? political.political_controllers
    : political.political_controllers;
  return map && typeof map === 'object' && !Array.isArray(map) ? { ...map } : null;
}

function eventsFromState(state) {
  return Array.isArray(state?.political?.control_events) ? state.political.control_events : [];
}

function replayAcceptedReference(initialState, finalState, requiredTurns) {
  const failures = [];
  const current = mapFromState(initialState, true);
  const finalMap = mapFromState(finalState);
  const events = eventsFromState(finalState);
  const mapsByTurn = new Map();
  const eventsByTurn = new Map();
  if (!current) failures.push('Accepted initial state has no controller map');
  if (!finalMap) failures.push('Accepted final state has no controller map');
  let priorTurn = 0;
  let eventIndex = 0;
  const maxTurn = Math.max(0, ...requiredTurns, Number(finalState?.meta?.turn ?? 0));
  for (let turn = 1; turn <= maxTurn && current; turn += 1) {
    while (eventIndex < events.length && Number(events[eventIndex]?.turn) === turn) {
      const event = events[eventIndex];
      const osid = event?.settlement_id;
      if (typeof osid !== 'string' || !osid) {
        failures.push(`Accepted event ${eventIndex} lacks settlement_id`);
      } else if (current[osid] !== event.from) {
        failures.push(`Accepted event lineage mismatch at event ${eventIndex} turn ${turn} ${osid}: reconstructed ${current[osid]} != from ${event.from}`);
      } else {
        current[osid] = event.to;
      }
      priorTurn = turn;
      eventIndex += 1;
    }
    if (eventIndex < events.length && Number(events[eventIndex]?.turn) < turn) {
      failures.push(`Accepted control events are not in persisted turn order at event ${eventIndex}`);
      break;
    }
    mapsByTurn.set(turn, { ...current });
    eventsByTurn.set(turn, events.slice(0, eventIndex));
  }
  if (eventIndex !== events.length) failures.push(`Accepted control events were not fully replayed: ${eventIndex}/${events.length}; last replayed turn ${priorTurn}`);
  if (current && finalMap && stableJson(current) !== stableJson(finalMap)) {
    failures.push(`Accepted replay final controller map ${hash(current)} != accepted final ${hash(finalMap)}`);
  }
  return { failures, mapsByTurn, eventsByTurn, eventCount: events.length, finalMapHash: current ? hash(current) : null };
}

function evaluateNativeCalibrationOutcome(input) {
  const requiredTurns = [...(input.requiredTurns ?? [])].sort((a, b) => a - b);
  const reference = replayAcceptedReference(input.acceptedInitial, input.acceptedFinal, requiredTurns);
  const referenceFailures = [...reference.failures];
  for (const [turn, checkpoint] of input.acceptedCheckpoints ?? []) {
    const expectedMap = reference.mapsByTurn.get(turn);
    const expectedEvents = reference.eventsByTurn.get(turn);
    if (!expectedMap || stableJson(mapFromState(checkpoint)) !== stableJson(expectedMap)) {
      referenceFailures.push(`Accepted checkpoint turn ${turn} controller map disagrees with replay`);
    }
    if (!expectedEvents || stableJson(eventsFromState(checkpoint)) !== stableJson(expectedEvents)) {
      referenceFailures.push(`Accepted checkpoint turn ${turn} event prefix disagrees with replay`);
    }
  }

  const timelineFailures = [];
  const turnResults = [];
  for (const turn of requiredTurns) {
    const native = input.nativeTurns?.get(turn);
    if (!native) {
      timelineFailures.push(`Missing canonical native end-of-turn autosave for turn ${turn}`);
      continue;
    }
    if (Number(native?.meta?.turn) !== turn) timelineFailures.push(`Native archive key ${turn} contains turn ${native?.meta?.turn}`);
    const nativeMap = mapFromState(native);
    const expectedMap = reference.mapsByTurn.get(turn);
    const nativeEvents = eventsFromState(native);
    const expectedEvents = reference.eventsByTurn.get(turn);
    const mapMatch = Boolean(nativeMap && expectedMap && stableJson(nativeMap) === stableJson(expectedMap));
    const timelineMatch = Boolean(expectedEvents && stableJson(nativeEvents) === stableJson(expectedEvents));
    if (!mapMatch) timelineFailures.push(`Controller map mismatch at turn ${turn}: native ${nativeMap ? hash(nativeMap) : 'missing'} != accepted ${expectedMap ? hash(expectedMap) : 'missing'}`);
    if (!timelineMatch) timelineFailures.push(`Ordered control-event timeline mismatch at turn ${turn}: native ${hash(nativeEvents)} != accepted ${expectedEvents ? hash(expectedEvents) : 'missing'}`);
    turnResults.push({
      turn,
      mapMatch,
      timelineMatch,
      nativeControllerMapHash: nativeMap ? hash(nativeMap) : null,
      acceptedControllerMapHash: expectedMap ? hash(expectedMap) : null,
      nativeEventPrefixHash: hash(nativeEvents),
      acceptedEventPrefixHash: expectedEvents ? hash(expectedEvents) : null,
    });
  }

  const scoreFailures = [];
  const scoreResults = [];
  for (const [turn, expectedScore] of input.acceptedScores ?? []) {
    const native = input.nativeTurns?.get(turn);
    const painted = input.paintedTargets?.get(turn);
    const nativeMap = native ? mapFromState(native) : null;
    if (!nativeMap || !painted) {
      scoreFailures.push(`Checkpoint score inputs missing at turn ${turn}`);
      continue;
    }
    const keys = Object.keys(painted).sort();
    const score = keys.reduce((count, osid) => count + (nativeMap[osid] === painted[osid] ? 1 : 0), 0);
    if (score !== expectedScore) scoreFailures.push(`Checkpoint score mismatch at turn ${turn}: ${score} != ${expectedScore}`);
    scoreResults.push({ turn, matchedOsids: score, expectedMatchedOsids: expectedScore, totalOsids: keys.length });
  }

  const policyFailures = [];
  for (const [key, expected] of Object.entries(input.expectedPolicy ?? {})) {
    if (input.policy?.[key] !== expected) policyFailures.push(`Input policy ${key} mismatch: ${JSON.stringify(input.policy?.[key])} != ${JSON.stringify(expected)}`);
  }
  const transcript = input.policy?.eventChoiceTranscript;
  if (!Array.isArray(transcript)) {
    policyFailures.push('Visible historical choice transcript is missing');
  } else {
    transcript.forEach((row, index) => {
      if (!row || typeof row.eventId !== 'string' || typeof row.responseId !== 'string'
          || row.status !== 'applied' || row.playerInput !== true) {
        policyFailures.push(`Visible historical choice transcript row ${index} is incomplete or unapplied`);
      }
    });
  }
  const modeSelection = input.policy?.campaignModeSelectionEvidence;
  if (modeSelection?.requested !== 'historical' || modeSelection?.ariaChecked !== 'true') {
    policyFailures.push('Visible Historical campaign mode selection receipt is missing or unselected');
  }
  const decisionAudit = input.policy?.decisionAudit;
  if (!decisionAudit || !Array.isArray(decisionAudit.pendingIds) || !Array.isArray(decisionAudit.receiptIds)) {
    policyFailures.push('Player decision audit is missing');
  } else {
    if (decisionAudit.pendingIds.length > 0) policyFailures.push(`Player decision audit retains pending IDs: ${decisionAudit.pendingIds.join(',')}`);
    const transcriptIds = new Set((transcript ?? []).filter((row) => row?.status === 'applied').map((row) => row.eventId));
    const unauditedReceipts = decisionAudit.receiptIds.filter((id) => !transcriptIds.has(id));
    if (unauditedReceipts.length > 0) policyFailures.push(`Applied player decision receipts absent from visible transcript: ${unauditedReceipts.join(',')}`);
  }

  const acceptedInitialMap = mapFromState(input.acceptedInitial, true);
  const nativeInitialMap = mapFromState(input.nativeInitial);
  const initialFailures = [];
  if (!acceptedInitialMap || !nativeInitialMap || stableJson(acceptedInitialMap) !== stableJson(nativeInitialMap)) {
    initialFailures.push(`Native t0 controller map ${nativeInitialMap ? hash(nativeInitialMap) : 'missing'} != accepted initial ${acceptedInitialMap ? hash(acceptedInitialMap) : 'missing'}`);
  }

  const protectedFailures = (input.protectedChecks ?? [])
    .filter((check) => check.pass !== true)
    .map((check) => `Protected control check failed: ${check.id ?? 'unnamed'}`);
  const healthFailures = Object.entries(input.healthChecks ?? {})
    .filter(([, passed]) => passed !== true)
    .map(([name]) => `Calibration engine health check failed: ${name}`);
  const inputBindingFailures = Object.entries(input.inputBindingChecks ?? {})
    .filter(([, passed]) => passed !== true)
    .map(([name]) => `Input binding check failed: ${name}`);
  const referenceIdentityFailures = Object.entries(input.referenceIdentityChecks ?? {})
    .filter(([, passed]) => passed !== true)
    .map(([name]) => `Reference identity check failed: ${name}`);

  const gates = {
    referenceIntegrity: { pass: referenceFailures.length === 0, failures: referenceFailures },
    controllerTimeline: { pass: timelineFailures.length === 0, failures: timelineFailures },
    checkpointScores: { pass: scoreFailures.length === 0, failures: scoreFailures },
    inputPolicy: { pass: policyFailures.length === 0, failures: policyFailures },
    protectedControl: { pass: protectedFailures.length === 0, failures: protectedFailures },
    calibrationEngineHealth: { pass: healthFailures.length === 0, failures: healthFailures },
    initialControl: { pass: initialFailures.length === 0, failures: initialFailures },
    inputBinding: { pass: inputBindingFailures.length === 0, failures: inputBindingFailures },
    referenceIdentity: { pass: referenceIdentityFailures.length === 0, failures: referenceIdentityFailures },
  };
  return {
    schemaVersion: 'awwv.native-calibration-outcome-compare.v1',
    pass: Object.values(gates).every((gate) => gate.pass),
    gates,
    reference: { eventCount: reference.eventCount, finalControllerMapHash: reference.finalMapHash },
    turns: turnResults,
    checkpointScores: scoreResults,
    protectedChecks: input.protectedChecks ?? [],
    healthChecks: input.healthChecks ?? {},
    inputBindingChecks: input.inputBindingChecks ?? {},
    referenceIdentityChecks: input.referenceIdentityChecks ?? {},
    initial: {
      nativeControllerMapHash: nativeInitialMap ? hash(nativeInitialMap) : null,
      acceptedControllerMapHash: acceptedInitialMap ? hash(acceptedInitialMap) : null,
    },
  };
}

function fileSha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function existingAcceptedCheckpoints(acceptedDir) {
  const checkpoints = new Map();
  for (const name of fs.readdirSync(acceptedDir)) {
    const match = /^save_w(\d+)\.json$/.exec(name);
    if (match) checkpoints.set(Number(match[1]), readJson(path.join(acceptedDir, name)));
  }
  const final = readJson(path.join(acceptedDir, 'final_save.json'));
  checkpoints.set(Number(final.meta?.turn), final);
  return checkpoints;
}

function resolveEvidencePath(progressPath, evidencePath) {
  if (path.isAbsolute(evidencePath)) return evidencePath;
  return path.resolve(path.dirname(progressPath), evidencePath);
}

function loadNativeTurnArchives(progressPath, faction) {
  const progress = readJson(progressPath);
  const entry = progress.factions?.find((row) => row.faction === faction);
  if (!entry) throw new Error(`Native progress has no ${faction} entry`);
  if (entry.failed) throw new Error(`Native ${faction} lane failed: ${entry.error ?? 'unknown error'}`);
  const records = entry.playtest?.turnAutosaveEvidence;
  if (!Array.isArray(records)) throw new Error('Native progress lacks turnAutosaveEvidence');
  const nativeTurns = new Map();
  const rawSaveEvidence = [];
  const initialRecord = entry.initialEvidence?.initialAutosaveEvidence;
  if (!initialRecord?.path) throw new Error('Native progress lacks initial autosave evidence');
  const initialPath = resolveEvidencePath(progressPath, initialRecord.path);
  const initialSha256 = fileSha256(initialPath);
  if (initialRecord.sha256 && initialRecord.sha256 !== initialSha256) throw new Error(`Native initial archive hash changed: ${initialSha256} != ${initialRecord.sha256}`);
  const nativeInitial = readJson(initialPath);
  rawSaveEvidence.push({ turn: 0, path: initialPath, sha256: initialSha256, bytes: fs.statSync(initialPath).size });
  for (const record of records) {
    const turn = Number(record.turn);
    const savePath = resolveEvidencePath(progressPath, record.path);
    if (!Number.isSafeInteger(turn) || turn < 1 || nativeTurns.has(turn)) throw new Error(`Invalid or duplicate native turn archive: ${record.turn}`);
    const actualSha = fileSha256(savePath);
    if (record.sha256 && record.sha256 !== actualSha) throw new Error(`Native turn ${turn} archive hash changed: ${actualSha} != ${record.sha256}`);
    nativeTurns.set(turn, readJson(savePath));
    rawSaveEvidence.push({ turn, path: savePath, sha256: actualSha, bytes: fs.statSync(savePath).size });
  }
  return { progress, entry, nativeInitial, nativeTurns, rawSaveEvidence };
}

function paintedTarget(repo, key) {
  const json = readJson(path.join(repo, 'data', 'source', 'calibration', `painted_control_${key}.json`));
  return json.by_settlement_id;
}

function buildProtectedChecks(nativeTurns, acceptedCheckpoints, baselineDirs) {
  const checks = [];
  for (const baselineDir of baselineDirs) {
    const label = path.basename(baselineDir);
    const baselineCheckpoints = existingAcceptedCheckpoints(baselineDir);
    for (const turn of [39, 104, 156, 188]) {
      const nativeMap = mapFromState(nativeTurns.get(turn));
      const acceptedMap = mapFromState(acceptedCheckpoints.get(turn));
      const baselineMap = mapFromState(baselineCheckpoints.get(turn));
      if (!nativeMap || !acceptedMap || !baselineMap) continue;
      const protectedOsids = Object.keys(acceptedMap).filter((osid) => baselineMap[osid] === acceptedMap[osid]).sort();
      const losses = protectedOsids.filter((osid) => nativeMap[osid] !== acceptedMap[osid]);
      checks.push({ id: `${label}:turn-${turn}`, turn, baseline: label, protectedOsids: protectedOsids.length, losses, pass: losses.length === 0 });
    }
  }
  return checks;
}

function topLevelDifferenceCategories(candidate, accepted) {
  const keys = [...new Set([...Object.keys(candidate ?? {}), ...Object.keys(accepted ?? {})])].sort();
  return keys.filter((key) => stableJson(candidate?.[key]) !== stableJson(accepted?.[key]));
}

function parseArgs(argv) {
  const values = {};
  for (const arg of argv) {
    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

function runCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const repo = path.resolve(__dirname, '..', '..');
  if (!args['native-progress'] || !args['accepted-dir'] || !args['n91-dir'] || !args['n92-dir'] || !args['input-binding'] || !args.faction || !args.out) {
    throw new Error('Usage: node tools/diagnostics/native_calibration_outcome_compare.cjs --native-progress=<json> --accepted-dir=<n94-dir> --n91-dir=<n91-dir> --n92-dir=<n92-dir> --input-binding=<json> --faction=<RBiH|RS|HRHB> --out=<json>');
  }
  const progressPath = path.resolve(repo, args['native-progress']);
  const acceptedDir = path.resolve(repo, args['accepted-dir']);
  const outPath = path.resolve(repo, args.out);
  if (fs.existsSync(outPath)) throw new Error(`Refusing to overwrite outcome comparison: ${outPath}`);
  const acceptedInitialPath = path.join(acceptedDir, 'initial_save.json');
  const acceptedFinalPath = path.join(acceptedDir, 'final_save.json');
  const summaryPath = path.join(acceptedDir, 'run_summary.json');
  const metaPath = path.join(acceptedDir, 'run_meta.json');
  const acceptedInitial = readJson(acceptedInitialPath);
  const acceptedFinal = readJson(acceptedFinalPath);
  const acceptedSummary = readJson(summaryPath);
  const acceptedMeta = readJson(metaPath);
  const acceptedCheckpoints = existingAcceptedCheckpoints(acceptedDir);
  const { entry, nativeInitial, nativeTurns, rawSaveEvidence } = loadNativeTurnArchives(progressPath, args.faction);
  const targetTurn = Math.max(0, ...nativeTurns.keys());
  const requiredTurns = Array.from({ length: targetTurn }, (_, index) => index + 1);
  const scoreEpochs = new Map([[39, 'jan1993'], [104, 'apr1994'], [156, 'apr1995'], [188, 'oct1995']]);
  const acceptedScoreRows = new Map((acceptedSummary.historical_fit?.checkpoints ?? [])
    .map((row) => [Number(row.week), Number(row.osid_pair_match?.matched_osids)]));
  const requiredScores = new Map([[39, 707], [104, 707], [156, 706], [188, 706]]);
  const acceptedScores = new Map();
  const paintedTargets = new Map();
  for (const [turn, expected] of requiredScores) {
    if (turn > targetTurn) continue;
    if (acceptedScoreRows.get(turn) !== expected) throw new Error(`Accepted n94 score contract failed at turn ${turn}: ${acceptedScoreRows.get(turn)} != ${expected}`);
    acceptedScores.set(turn, expected);
    paintedTargets.set(turn, paintedTarget(repo, scoreEpochs.get(turn)));
  }
  const provenance = entry.initialEvidence?.initialScenarioProvenance ?? {};
  const scenarioPath = path.join(repo, 'data', 'scenarios', 'apr1992_definitive_188w.json');
  const startupPath = path.join(repo, 'data', 'derived', 'startup', 'apr_1992_initial_save.json');
  const inputBindingPath = path.resolve(repo, args['input-binding']);
  const inputBinding = readJson(inputBindingPath);
  const expectedReferenceHashes = {
    initial: '413ce64acaa420e130e293230dfa470dcaa46c5b4df2c6d3706d7e31cb8455e1',
    final: 'ff003195e966d163c27916cb0b9bb6293e9e8b0f2312684688318761cf6def34',
    summary: 'f8429e29760314d256f822d2f4d5aa9c997d5cfc053035e1859dcac560df71d5',
    meta: '0bb77fb1bf4b50456265f4839d934fd837d7ff5a569a590887d32e4cfa41b5b0',
  };
  const classifications = inputBinding.classifications ?? {};
  const inputBindingChecks = {
    schema: inputBinding.schemaVersion === 'awwv.native-calibration-input-binding-classification.v1',
    acceptedManifest: inputBinding.inputs === 32
      && inputBinding.acceptedConsumedInputDigest === '88cf2d9ad4913bc62dde684d71465a28622c28b559713e4d0f13124ad8031c69',
    packagedRuntimeInputs: classifications['package-raw-exact'] === 25
      && classifications['package-json-whitespace-equivalent-crlf-to-lf'] === 1
      && !Object.hasOwn(classifications, 'mismatch'),
    startupInputs: classifications['startup-only-input-embodied-in-byte-exact-startup-snapshot-and-bundled-sim-contract'] === 6
      && inputBinding.rows?.filter((row) => row.classification.startsWith('startup-only')).every((row) => row.sourceMatchesN94 === true),
    startupSnapshot: inputBinding.startupSnapshot?.byteExact === true
      && inputBinding.startupSnapshot?.rawSha256 === expectedReferenceHashes.initial,
    packagedSim: inputBinding.packagedDesktopSim?.sha256 === '9ba897b97c5be8662e617d3a171147043bdcd643e0c57f56ad71f357a1a87001',
  };
  const referenceIdentityChecks = {
    scenarioId: acceptedMeta.scenario_id === 'apr1992_definitive_188w',
    weeks: acceptedMeta.weeks === 188,
    consumedInputs: acceptedMeta.provenance?.consumed_inputs?.digest === '88cf2d9ad4913bc62dde684d71465a28622c28b559713e4d0f13124ad8031c69'
      && acceptedMeta.provenance?.consumed_inputs?.files?.length === 32,
    immutableHashes: fileSha256(acceptedInitialPath) === expectedReferenceHashes.initial
      && fileSha256(acceptedFinalPath) === expectedReferenceHashes.final
      && fileSha256(summaryPath) === expectedReferenceHashes.summary
      && fileSha256(metaPath) === expectedReferenceHashes.meta,
  };
  const protectedChecks = buildProtectedChecks(
    nativeTurns,
    acceptedCheckpoints,
    [path.resolve(repo, args['n91-dir']), path.resolve(repo, args['n92-dir'])],
  );
  const saveLoadProof = entry.playtest?.saveLoadProof;
  const healthChecks = {
    canonicalTurnArchives: nativeTurns.size === targetTurn && requiredTurns.every((turn) => nativeTurns.has(turn)),
    controllerCardinality: [...nativeTurns.values()].every((state) => Object.keys(mapFromState(state) ?? {}).length === 712),
    exactTurnIdentity: [...nativeTurns.entries()].every(([turn, state]) => Number(state?.meta?.turn) === turn),
    saveLoadRoundTrip: saveLoadProof?.hashProof?.canonicalBytesEqual === true
      && Boolean(saveLoadProof?.hashProof?.loadedProjectionProof),
    evidenceManifest: Boolean(entry.evidenceManifest),
  };
  const report = evaluateNativeCalibrationOutcome({
    acceptedInitial,
    nativeInitial,
    acceptedFinal,
    acceptedCheckpoints,
    nativeTurns,
    paintedTargets,
    acceptedScores,
    requiredTurns,
    protectedChecks,
    healthChecks,
    inputBindingChecks,
    referenceIdentityChecks,
    expectedPolicy: {
      scenarioSourceSha256: fileSha256(scenarioPath),
      startupSnapshotSha256: fileSha256(startupPath),
      requestedFaction: args.faction,
      decisionMode: 'historical',
      autonomyLevel: 2,
      headless: false,
      seed: 'harness-seed',
    },
    policy: {
      scenarioSourceSha256: provenance.scenarioSourceSha256,
      startupSnapshotSha256: provenance.startupSnapshotSha256,
      requestedFaction: provenance.requestedFaction,
      decisionMode: provenance.decisionMode ?? entry.initialEvidence?.state?.decisionMode,
      autonomyLevel: provenance.autonomyLevel ?? entry.initialEvidence?.state?.autonomyLevel,
      headless: provenance.headless,
      seed: provenance.scenarioSeed ?? entry.initialEvidence?.scenarioSeed,
      eventChoiceTranscript: entry.eventChoiceTranscript,
      campaignModeSelectionEvidence: entry.campaignModeSelectionEvidence,
      decisionAudit: {
        pendingIds: entry.playtest?.finalState?.pendingEventDecisionIds ?? [],
        receiptIds: entry.playtest?.finalState?.eventDecisionReceiptIds ?? [],
      },
    },
  });
  const rawCheckpointDifferences = [];
  for (const [turn, acceptedState] of acceptedCheckpoints) {
    const nativeState = nativeTurns.get(turn);
    if (!nativeState) continue;
    rawCheckpointDifferences.push({
      turn,
      nativeStateHash: hash(nativeState),
      acceptedStateHash: hash(acceptedState),
      fullStateEqual: stableJson(nativeState) === stableJson(acceptedState),
      changedTopLevelCategories: topLevelDifferenceCategories(nativeState, acceptedState),
    });
  }
  report.provenance = {
    nativeProgressPath: progressPath,
    acceptedRunDirectory: acceptedDir,
    acceptedInitialSha256: fileSha256(acceptedInitialPath),
    acceptedFinalSha256: fileSha256(acceptedFinalPath),
    acceptedSummarySha256: fileSha256(summaryPath),
    acceptedMetaSha256: fileSha256(metaPath),
    inputBindingPath,
    inputBindingSha256: fileSha256(inputBindingPath),
  };
  report.rawSaveEvidence = rawSaveEvidence;
  report.rawCheckpointDifferences = rawCheckpointDifferences;
  report.notes = ['Full save equality is reported as evidence only; it is not an acceptance gate because player metadata and receipts are legitimate differences.'];
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  process.stdout.write(`${JSON.stringify({ pass: report.pass, out: outPath, gates: report.gates }, null, 2)}\n`);
  return report.pass ? 0 : 1;
}

if (require.main === module) {
  try {
    process.exitCode = runCli();
  } catch (error) {
    process.stderr.write(`${error?.stack ?? error}\n`);
    process.exitCode = 2;
  }
}

module.exports = {
  evaluateNativeCalibrationOutcome,
  replayAcceptedReference,
  stableJson,
  loadNativeTurnArchives,
  runCli,
};
