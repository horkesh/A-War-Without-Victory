#!/usr/bin/env node
/**
 * Pure all-faction presidential-cadence diagnostic for a durable save.
 *
 * Usage:
 *   tsx tools/diagnostics/presidential_cadence_report.ts --save <final_save.json>
 *     [--holds <positive_holds.json>] [--end-turn 104] [--out <report.json>]
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import { loadEventDefinitions } from '../../src/sim/events/event_loader.js';
import {
  buildPresidentialCadenceReport,
  projectPresidentialCadenceReceipts,
  type PresidentialCadenceEventCatalogRow,
  type PresidentialCadenceProjectionState,
  type PresidentialPositiveHold,
} from '../../src/sim/presidency/presidential_cadence.js';
import type { GameState } from '../../src/state/game_state.js';
import { strictCompare } from '../../src/state/validateGameState.js';

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
  holdsPath?: string;
  outPath?: string;
  endTurn: number;
}

function parseArgs(argv: readonly string[]): Args {
  let savePath = '';
  let holdsPath: string | undefined;
  let outPath: string | undefined;
  let endTurn = 104;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--save' && argv[index + 1]) savePath = argv[++index];
    else if (arg === '--holds' && argv[index + 1]) holdsPath = argv[++index];
    else if (arg === '--out' && argv[index + 1]) outPath = argv[++index];
    else if (arg === '--end-turn' && argv[index + 1]) endTurn = Number.parseInt(argv[++index], 10);
  }

  if (savePath.length === 0) throw new Error('--save <final_save.json> is required.');
  if (!Number.isInteger(endTurn) || endTurn < 1) throw new Error('--end-turn must be a positive integer.');
  return { savePath: resolve(savePath), holdsPath, outPath, endTurn };
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
  return {
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
  };
}

interface PositiveHoldBundle {
  positiveHolds: PresidentialPositiveHold[];
  positiveHoldEvidenceIds: string[];
}

function loadHolds(path: string | undefined): PositiveHoldBundle {
  if (!path) return { positiveHolds: [], positiveHoldEvidenceIds: [] };
  const parsed = JSON.parse(readFileSync(resolve(path), 'utf8')) as unknown;
  if (
    !parsed
    || typeof parsed !== 'object'
    || !Array.isArray((parsed as Partial<PositiveHoldBundle>).positiveHolds)
    || !Array.isArray((parsed as Partial<PositiveHoldBundle>).positiveHoldEvidenceIds)
  ) {
    throw new Error('Positive-hold file must contain positiveHolds and positiveHoldEvidenceIds arrays.');
  }
  return parsed as PositiveHoldBundle;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const serializedSave = readFileSync(args.savePath, 'utf8');
  const state = JSON.parse(serializedSave) as GameState;
  const catalog = eventCatalogRows();
  const holdBundle = loadHolds(args.holdsPath);
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
  const output = {
    schemaVersion: 1,
    sourceSave: basename(args.savePath),
    sourceSaveSha256: createHash('sha256').update(serializedSave).digest('hex'),
    sourceTurn: state.meta.turn,
    targetEndTurn: args.endTurn,
    sourceBackedClassifications: ['required_authored', 'optional_source_backed'],
    excludedFromSourceBackedCadence: ['ordinary_emergent', 'notice'],
    genericCommandPresenceIds: [...GENERIC_COMMAND_PRESENCE_IDS].sort(strictCompare),
    reports,
  };
  const serialized = `${JSON.stringify(output, null, 2)}\n`;

  if (args.outPath) writeFileSync(resolve(args.outPath), serialized, 'utf8');
  else process.stdout.write(serialized);
}

main();
