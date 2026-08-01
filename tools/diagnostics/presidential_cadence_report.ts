#!/usr/bin/env node
/**
 * Pure all-faction presidential-cadence diagnostic for a durable save.
 *
 * Usage:
 *   tsx tools/diagnostics/presidential_cadence_report.ts --save <final_save.json>
 *     --scenario <scenario.json> --run-id <stable-run-id>
 *     [--holds <positive_holds.json>] [--authority-observations <observations.json>]
 *     [--near-cap-threshold 0.9] [--end-turn 104] [--out <report.json>]
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { computeRunId, loadScenario } from '../../src/scenario/scenario_loader.js';
import { loadEventDefinitions } from '../../src/sim/events/event_loader.js';
import {
  buildPresidentialAuthorityCadenceSummary,
  buildPresidentialCadenceReport,
  projectPresidentialCadenceReceipts,
  type PresidentialAuthorityObservation,
  type PresidentialCadenceEventCatalogRow,
  type PresidentialCadenceProjectionState,
  type PresidentialPositiveHold,
} from '../../src/sim/presidency/presidential_cadence.js';
import type { GameState } from '../../src/state/game_state.js';
import { strictCompare } from '../../src/state/validateGameState.js';
import {
  assertAuthorityObservationBundle,
  assertPositiveHoldBundle,
  type AuthorityObservationEvidenceBundle,
  type CadenceEvidenceAttestation,
  type CadenceEvidenceContents,
  type CadencePlayerFaction,
  type CadenceProvenanceContext,
  type PositiveHoldEvidenceBundle,
} from './presidential_cadence_provenance.js';

const FACTIONS = ['RBiH', 'RS', 'HRHB'] as const;
const GENERIC_COMMAND_PRESENCE_IDS = new Set(
  ['rbih', 'rs', 'hrhb'].flatMap((faction) => [
    `strategic_posture_review_${faction}`,
    `visit_to_front_${faction}`,
    `address_to_nation_${faction}`,
    `decorate_a_unit_${faction}`,
  ]),
);

interface Args {
  savePath: string;
  scenarioPath: string;
  runId: string;
  holdsPath?: string;
  authorityObservationsPath?: string;
  outPath?: string;
  endTurn: number;
  nearCapThresholdFraction: number;
}

function parseArgs(argv: readonly string[]): Args {
  let savePath = '';
  let scenarioPath = '';
  let runId = '';
  let holdsPath: string | undefined;
  let authorityObservationsPath: string | undefined;
  let outPath: string | undefined;
  let endTurn = 104;
  let nearCapThresholdFraction = 0.9;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--save' && argv[index + 1]) savePath = argv[++index];
    else if (arg === '--scenario' && argv[index + 1]) scenarioPath = argv[++index];
    else if (arg === '--run-id' && argv[index + 1]) runId = argv[++index];
    else if (arg === '--holds' && argv[index + 1]) holdsPath = argv[++index];
    else if (arg === '--authority-observations' && argv[index + 1]) {
      authorityObservationsPath = argv[++index];
    }
    else if (arg === '--near-cap-threshold' && argv[index + 1]) {
      nearCapThresholdFraction = Number.parseFloat(argv[++index]);
    }
    else if (arg === '--out' && argv[index + 1]) outPath = argv[++index];
    else if (arg === '--end-turn' && argv[index + 1]) endTurn = Number.parseInt(argv[++index], 10);
  }

  if (savePath.length === 0) throw new Error('--save <final_save.json> is required.');
  if (scenarioPath.length === 0) throw new Error('--scenario <scenario.json> is required.');
  if (runId.trim().length === 0) throw new Error('--run-id <stable-run-id> is required.');
  if (!Number.isInteger(endTurn) || endTurn < 1) throw new Error('--end-turn must be a positive integer.');
  if (
    !Number.isFinite(nearCapThresholdFraction)
    || nearCapThresholdFraction <= 0
    || nearCapThresholdFraction > 1
  ) {
    throw new Error('--near-cap-threshold must be greater than zero and at most one.');
  }
  return {
    savePath: resolve(savePath),
    scenarioPath: resolve(scenarioPath),
    runId: runId.trim(),
    holdsPath,
    authorityObservationsPath,
    outPath,
    endTurn,
    nearCapThresholdFraction,
  };
}

function isDesignAbstraction(id: string, provenance: string): boolean {
  const normalized = provenance.toLowerCase();
  return GENERIC_COMMAND_PRESENCE_IDS.has(id)
    || normalized.includes('fictionalized')
    || normalized.includes('abstracted')
    || normalized.includes('no specific historical');
}

function eventCatalogRows(): PresidentialCadenceEventCatalogRow[] {
  return loadEventDefinitions(0)
    .map((event) => {
      const provenance = `${event.historical_source ?? ''} ${event.source_note ?? ''}`.trim();
      return {
        id: event.id,
        requiresPlayerResponse: event.requires_player_response === true,
        sourceBacked: provenance.length > 0 && !isDesignAbstraction(event.id, provenance),
        sourceIds: provenance.length > 0 ? [`event-source:${event.id}`] : [],
      };
    })
    .sort((left, right) => strictCompare(left.id, right.id));
}

function projectionState(state: GameState): PresidentialCadenceProjectionState {
  const snapshotTurn = (state.meta.endgame_snapshot as { verdict?: { turn?: unknown } } | undefined)
    ?.verdict?.turn;
  const daytonTurn = typeof snapshotTurn === 'number' && Number.isInteger(snapshotTurn)
    ? snapshotTurn
    : state.meta.turn;
  return {
    playerFaction: state.meta.player_faction ?? null,
    eventDecisionLog: (state.military.event_decision_log ?? []).map((entry) => ({
      eventId: entry.event_id,
      faction: entry.faction,
      turn: entry.turn,
    })),
    peacePlanHistory: (state.military.negotiation?.peace_plan_history ?? []).map((entry) => ({
      planId: entry.plan_id,
      turn: entry.turn_offered,
      responses: entry.responses,
    })),
    proposalReviews: (state.meta.pending_proposal_reviews ?? []).map((entry) => ({
      id: entry.id,
      faction: entry.faction,
      turn: entry.turn,
      resolvedTurn: entry.resolved_turn,
      proposedAction: entry.proposed_action,
    })),
    officerDecisionHistory: (state.military.officer_decision_history ?? []).map((entry) => ({
      id: entry.id,
      faction: entry.faction,
      turn: entry.turn,
      eventId: entry.event_id,
      decision: entry.decision,
    })),
    reserveDecisionHistory: (state.military.reserve_request_history ?? []).map((entry) => ({
      id: entry.request_id,
      faction: entry.faction,
      turn: entry.turn,
    })),
    convoyDecisionHistory: (state.military.convoy_decision_history ?? []).map((entry) => ({
      id: entry.id,
      routeFaction: entry.route_faction,
      turn: entry.turn,
    })),
    paramilitaryDecisionHistory: (state.paramilitary_decision_history ?? []).map((entry) => ({
      id: entry.id,
      faction: entry.faction,
      turn: entry.turn,
    })),
    ...(state.military.negotiation?.dayton_result ? { daytonResult: { turn: daytonTurn } } : {}),
    operationOpportunities: (state.military.operation_opportunities ?? []).map((entry) => ({
      proposalId: entry.proposal_id,
      approverFaction: entry.approver_faction,
    })),
    operationOpportunityResolutions: (state.military.operation_opportunity_resolutions ?? []).map((entry) => ({
      proposalId: entry.proposal_id,
      opportunityId: entry.opportunity_id,
      responseTurn: entry.response_turn,
      response: entry.response,
    })),
  };
}

interface LoadedPositiveHolds {
  positiveHolds: PresidentialPositiveHold[];
  positiveHoldEvidenceIds: string[];
  source: string | null;
  sourceSha256: string | null;
}

interface LoadedAuthorityObservations {
  observations: PresidentialAuthorityObservation[];
  source: string | null;
  sourceSha256: string | null;
}

function evidenceContents(
  attestations: readonly CadenceEvidenceAttestation[],
): CadenceEvidenceContents {
  const repositoryRoot = resolve('.');
  const contents: Record<string, string> = {};
  for (const attestation of attestations) {
    const resolvedPath = resolve(repositoryRoot, attestation.path);
    if (resolvedPath !== repositoryRoot && !resolvedPath.startsWith(`${repositoryRoot}${sep}`)) {
      throw new Error(`Cadence evidence path escapes the repository: ${attestation.path}.`);
    }
    contents[attestation.path] = readFileSync(resolvedPath, 'utf8');
  }
  return contents;
}

function loadHolds(
  path: string | undefined,
  context: CadenceProvenanceContext,
): LoadedPositiveHolds {
  if (!path) {
    return { positiveHolds: [], positiveHoldEvidenceIds: [], source: null, sourceSha256: null };
  }
  const resolvedPath = resolve(path);
  const serialized = readFileSync(resolvedPath, 'utf8');
  const parsed = JSON.parse(serialized) as unknown;
  const bundle = parsed as PositiveHoldEvidenceBundle;
  const attestations = parsed && typeof parsed === 'object' && Array.isArray(bundle.evidence)
    ? bundle.evidence
    : [];
  assertPositiveHoldBundle(bundle, context, evidenceContents(attestations));
  return {
    positiveHolds: bundle.positiveHolds,
    positiveHoldEvidenceIds: bundle.positiveHoldEvidenceIds,
    source: basename(resolvedPath),
    sourceSha256: createHash('sha256').update(serialized).digest('hex'),
  };
}

function loadAuthorityObservations(
  path: string | undefined,
  context: CadenceProvenanceContext,
): LoadedAuthorityObservations {
  if (!path) return { observations: [], source: null, sourceSha256: null };
  const resolvedPath = resolve(path);
  const serialized = readFileSync(resolvedPath, 'utf8');
  const parsed = JSON.parse(serialized) as unknown;
  const bundle = parsed as AuthorityObservationEvidenceBundle;
  const attestations = parsed && typeof parsed === 'object' && Array.isArray(bundle.evidence)
    ? bundle.evidence
    : [];
  assertAuthorityObservationBundle(bundle, context, evidenceContents(attestations));
  return {
    observations: bundle.observations,
    source: basename(resolvedPath),
    sourceSha256: createHash('sha256').update(serialized).digest('hex'),
  };
}

function playerFactionFromState(state: GameState): CadencePlayerFaction | null {
  const faction = state.meta.player_faction;
  return faction === 'RBiH' || faction === 'RS' || faction === 'HRHB' ? faction : null;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const serializedSave = readFileSync(args.savePath, 'utf8');
  const state = JSON.parse(serializedSave) as GameState;
  if (state.meta.turn !== args.endTurn) {
    throw new Error(`Source save turn ${state.meta.turn} does not equal --end-turn ${args.endTurn}.`);
  }
  const scenario = await loadScenario(args.scenarioPath);
  if (args.endTurn > scenario.weeks) {
    throw new Error(`--end-turn ${args.endTurn} exceeds scenario horizon ${scenario.weeks}.`);
  }
  const context: CadenceProvenanceContext = {
    sourceId: basename(args.savePath),
    scenarioId: scenario.scenario_id,
    runId: args.runId,
    playerFaction: playerFactionFromState(state),
    startTurn: 0,
    endTurn: args.endTurn,
    saveTurn: state.meta.turn,
    sourceSaveSha256: createHash('sha256').update(serializedSave).digest('hex'),
  };
  const catalog = eventCatalogRows();
  const holdBundle = loadHolds(args.holdsPath, context);
  const authorityBundle = loadAuthorityObservations(args.authorityObservationsPath, context);
  const projectedState = projectionState(state);
  const reports = Object.fromEntries(FACTIONS.map((faction) => {
    const receipts = projectPresidentialCadenceReceipts({ faction, eventCatalog: catalog, state: projectedState });
    return [faction, buildPresidentialCadenceReport({
      faction,
      startTurn: 0,
      endTurn: args.endTurn,
      targetMaxGapTurns: 10,
      receipts,
      positiveHolds: holdBundle.positiveHolds.filter((hold) => hold.faction === faction),
      positiveHoldEvidenceIds: holdBundle.positiveHoldEvidenceIds,
    })];
  }));
  const authorityReports = Object.fromEntries(FACTIONS.map((faction) => [
    faction,
    buildPresidentialAuthorityCadenceSummary({
      faction,
      startTurn: 0,
      endTurn: args.endTurn,
      nearCapThresholdFraction: args.nearCapThresholdFraction,
      observations: authorityBundle.observations,
    }),
  ]));
  const output = {
    schemaVersion: 3,
    sourceSave: basename(args.savePath),
    sourceSaveSha256: context.sourceSaveSha256,
    sourceTurn: state.meta.turn,
    targetEndTurn: args.endTurn,
    provenance: context,
    computedScenarioRunId: computeRunId(scenario),
    sourceBackedClassifications: ['required_authored', 'optional_source_backed'],
    excludedFromSourceBackedCadence: ['ordinary_emergent', 'notice'],
    genericCommandPresenceIds: [...GENERIC_COMMAND_PRESENCE_IDS].sort(strictCompare),
    reports,
    positiveHoldBundleSource: holdBundle.source,
    positiveHoldBundleSha256: holdBundle.sourceSha256,
    authorityObservationSource: authorityBundle.source,
    authorityObservationSha256: authorityBundle.sourceSha256,
    authorityReports,
  };
  const serialized = `${JSON.stringify(output, null, 2)}\n`;

  if (args.outPath) writeFileSync(resolve(args.outPath), serialized, 'utf8');
  else process.stdout.write(serialized);
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (entryPath === fileURLToPath(import.meta.url)) void main();
