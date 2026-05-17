#!/usr/bin/env node
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const DEFAULT_OOB_CORPS_PATH = path.join(process.cwd(), 'data', 'source', 'oob_corps.json');
const DEFAULT_EXPECTED_HASH = '583aaa2f33875d8c';

function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function asRecordValues(value) {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value;
  return Object.keys(value).sort(compareText).map((key) => value[key]);
}

function numberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function makeFinding(severity, code, subject, message, details = {}) {
  return { severity, code, subject, message, details };
}

function compareSeverity(a, b) {
  const order = { ERROR: 0, WARNING: 1, INFO: 2 };
  return (order[a] ?? 99) - (order[b] ?? 99);
}

function collectOperations(finalSave, operationAars) {
  const operations = [];
  for (const op of asRecordValues(finalSave.operation_history)) {
    operations.push(op);
  }
  if (Array.isArray(operationAars)) {
    for (const op of operationAars) operations.push(op);
  }
  const corpsCommand = finalSave.military?.corps_command ?? {};
  for (const corpsId of Object.keys(corpsCommand).sort(compareText)) {
    const command = corpsCommand[corpsId];
    for (const op of asRecordValues(command?.active_operations)) {
      operations.push(op);
    }
    for (const op of asRecordValues(command?.operation_history)) {
      operations.push(op);
    }
  }
  return operations;
}

function uniqueByOperationId(operations) {
  const seen = new Set();
  const unique = [];
  for (const op of operations) {
    if (!op || typeof op !== 'object') continue;
    const id = String(op.operation_id ?? op.id ?? `${op.corps_id ?? 'unknown'}:${op.operation_name ?? op.name ?? unique.length}`);
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push({ id, op });
  }
  unique.sort((a, b) => compareText(a.id, b.id));
  return unique;
}

function collectDisplacementTotals(finalSave, runSummary) {
  const totals = [];
  const summaryTotal = numberOrNull(runSummary.takeover_displacement?.total_displaced);
  const aggregateTotal = numberOrNull(finalSave.displacement?.displacement_humanitarian_aggregates?.total_displaced);
  if (summaryTotal !== null) totals.push({ label: 'run_summary.takeover_displacement.total_displaced', value: summaryTotal });
  if (aggregateTotal !== null) totals.push({ label: 'final_save.displacement.displacement_humanitarian_aggregates.total_displaced', value: aggregateTotal });
  return totals;
}

async function maybeReadOperationAars(runDir) {
  try {
    return await readJson(path.join(runDir, 'operation_aars.json'));
  } catch (error) {
    if (error && error.code === 'ENOENT') return [];
    throw error;
  }
}

async function runScenarioIntegrityWalk(options = {}) {
  const runDir = options.runDir;
  if (!runDir) throw new Error('runDir is required');

  const oobCorpsPath = options.oobCorpsPath ?? DEFAULT_OOB_CORPS_PATH;
  const expectedHash = options.expectedHash ?? DEFAULT_EXPECTED_HASH;
  const [oobCorps, runSummary, finalSave, initialSave, operationAars] = await Promise.all([
    readJson(oobCorpsPath),
    readJson(path.join(runDir, 'run_summary.json')),
    readJson(path.join(runDir, 'final_save.json')),
    readJson(path.join(runDir, 'initial_save.json')).catch((error) => {
      if (error && error.code === 'ENOENT') return { military: { formations: {} } };
      throw error;
    }),
    maybeReadOperationAars(runDir),
  ]);

  const findings = [];
  const corpsIds = new Set(asRecordValues(oobCorps.corps).map((corps) => corps?.id).filter(Boolean));
  const formationIds = new Set();
  for (const formation of asRecordValues(initialSave.military?.formations)) {
    if (!formation || typeof formation !== 'object') continue;
    const formationId = String(formation.id ?? '');
    if (formationId) formationIds.add(formationId);
  }
  const formations = asRecordValues(finalSave.military?.formations);

  for (const formation of formations) {
    if (!formation || typeof formation !== 'object') continue;
    const formationId = String(formation.id ?? '');
    if (formationId) formationIds.add(formationId);
    const corpsId = formation.corps_id;
    if (corpsId && !corpsIds.has(corpsId)) {
      findings.push(makeFinding(
        'ERROR',
        'FORMATION_CORPS_MISSING_IN_OOB',
        formationId || String(corpsId),
        `Formation references corps '${corpsId}', which is absent from oob_corps.json.`,
        { formationId, corpsId },
      ));
    }
  }

  for (const { id, op } of uniqueByOperationId(collectOperations(finalSave, operationAars))) {
    const corpsId = op.corps_id;
    if (corpsId && !corpsIds.has(corpsId)) {
      findings.push(makeFinding(
        'ERROR',
        'OPERATION_CORPS_MISSING_IN_OOB',
        id,
        `Operation references corps '${corpsId}', which is absent from oob_corps.json.`,
        { operationId: id, corpsId },
      ));
    }
    const brigadeIds = Array.isArray(op.participating_brigades) ? op.participating_brigades.slice().sort(compareText) : [];
    for (const brigadeId of brigadeIds) {
      if (!formationIds.has(brigadeId)) {
        findings.push(makeFinding(
          'ERROR',
          'OPERATION_BRIGADE_MISSING',
          `${id}:${brigadeId}`,
          `Operation participating_brigades references missing formation '${brigadeId}'.`,
          { operationId: id, brigadeId },
        ));
      }
    }
  }

  const finalStateHash = runSummary.final_state_hash ?? null;
  if (finalStateHash) {
    findings.push(makeFinding('INFO', 'RUN_HASH_PRESENT', String(finalStateHash), `Run final_state_hash is '${finalStateHash}'.`, { finalStateHash }));
    if (expectedHash && finalStateHash !== expectedHash) {
      findings.push(makeFinding(
        'WARNING',
        'RUN_HASH_MISMATCH',
        String(finalStateHash),
        `Run hash '${finalStateHash}' does not match expected baseline '${expectedHash}'.`,
        { finalStateHash, expectedHash },
      ));
    }
  } else {
    findings.push(makeFinding('ERROR', 'RUN_HASH_MISSING', 'run_summary.json', 'run_summary.json does not expose final_state_hash.'));
  }

  const displacementTotals = collectDisplacementTotals(finalSave, runSummary);
  if (displacementTotals.length >= 2) {
    const values = new Set(displacementTotals.map((entry) => entry.value));
    if (values.size > 1) {
      findings.push(makeFinding(
        'WARNING',
        'DISPLACEMENT_TOTAL_MISMATCH',
        'total_displaced',
        'Displacement aggregate total_displaced values differ between exposed current-state surfaces.',
        { totals: displacementTotals },
      ));
    } else {
      findings.push(makeFinding('INFO', 'DISPLACEMENT_TOTAL_MATCH', 'total_displaced', 'Displacement aggregate total_displaced values match.', { totals: displacementTotals }));
    }
  } else {
    findings.push(makeFinding('INFO', 'DISPLACEMENT_TOTAL_UNAVAILABLE', 'total_displaced', 'Fewer than two displacement total surfaces were exposed for reconciliation.', { totals: displacementTotals }));
  }

  findings.sort((a, b) => (
    compareSeverity(a.severity, b.severity)
    || compareText(a.code, b.code)
    || compareText(a.subject, b.subject)
  ));

  const errorCount = findings.filter((finding) => finding.severity === 'ERROR').length;
  const warningCount = findings.filter((finding) => finding.severity === 'WARNING').length;
  const infoCount = findings.filter((finding) => finding.severity === 'INFO').length;

  return {
    summary: {
      errorCount,
      warningCount,
      infoCount,
      finalStateHash,
      expectedHash,
    },
    findings,
    exitCode: errorCount > 0 ? 1 : 0,
  };
}

function formatMarkdown(result) {
  const lines = [
    '# Scenario Integrity Walk',
    '',
    `Final hash: ${result.summary.finalStateHash ?? 'MISSING'}`,
    `Expected hash: ${result.summary.expectedHash ?? 'not provided'}`,
    `Findings: ${result.summary.errorCount} ERROR / ${result.summary.warningCount} WARNING / ${result.summary.infoCount} INFO`,
    '',
    '| Severity | Code | Subject | Message |',
    '|---|---|---|---|',
  ];
  for (const finding of result.findings) {
    lines.push(`| ${finding.severity} | ${finding.code} | ${finding.subject} | ${finding.message} |`);
  }
  return `${lines.join('\n')}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const runDir = args.find((arg) => !arg.startsWith('--'));
  const expectedIndex = args.indexOf('--expected-hash');
  const oobIndex = args.indexOf('--oob-corps');
  const outIndex = args.indexOf('--out');
  const json = args.includes('--json');
  const markdown = args.includes('--markdown');
  const result = await runScenarioIntegrityWalk({
    runDir,
    expectedHash: expectedIndex >= 0 ? args[expectedIndex + 1] : DEFAULT_EXPECTED_HASH,
    oobCorpsPath: oobIndex >= 0 ? args[oobIndex + 1] : DEFAULT_OOB_CORPS_PATH,
  });

  if (outIndex >= 0) {
    const outPath = args[outIndex + 1];
    const content = markdown ? formatMarkdown(result) : `${JSON.stringify(result, null, 2)}\n`;
    await fs.writeFile(outPath, content);
  } else if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(formatMarkdown(result));
  }
  process.exitCode = result.exitCode;
}

module.exports = {
  formatMarkdown,
  runScenarioIntegrityWalk,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
