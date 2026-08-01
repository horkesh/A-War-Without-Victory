#!/usr/bin/env node
/**
 * Deterministic inventory of presidential decision producers, action surfaces,
 * durable receipts, and Chronicle/Codex consumers.
 *
 * This is a read-only diagnostic. It deliberately reports the current
 * ordinary-proposal receipt-lifecycle gap instead of treating a current-turn
 * resolved row as durable history.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PLAYER_DECISION_FAMILIES,
  type PlayerDecisionFamilyDefinition,
  type PlayerDecisionFamilyId,
} from '../../src/state/player_decision_manifest.js';
import {
  DECISION_SURFACE_REGISTRY,
  type DecisionSurfaceDefinition,
} from '../../src/ui/map/data/decisionSurfaceRegistry.js';
import { strictCompare } from '../../src/state/validateGameState.js';

export type ReceiptDurability = 'durable' | 'conditional';

export interface PresidentialDecisionOwnership {
  familyId: PlayerDecisionFamilyId;
  producer: string;
  blockerPredicate: string;
  receiptOwner: string;
  receiptDurability: ReceiptDurability;
  receiptDisposition: string;
}

export interface PresidentialSourceAnchor {
  path: string;
  anchors: readonly string[];
}

export type PresidentialConsumerChannel =
  | 'chronicle'
  | 'records'
  | 'receipt'
  | 'codex'
  | 'cost_ledger';

export interface PresidentialConsumerSourceAnchor extends PresidentialSourceAnchor {
  channel: PresidentialConsumerChannel;
  label: string;
}

export interface PresidentialDecisionSourceProof {
  familyId: PlayerDecisionFamilyId;
  producer: readonly PresidentialSourceAnchor[];
  action: readonly PresidentialSourceAnchor[];
  receipt: readonly PresidentialSourceAnchor[];
  consumers: readonly PresidentialConsumerSourceAnchor[];
}

export type PresidentialCommandConvergenceFindingCode =
  | 'missing_family_ownership'
  | 'duplicate_family_ownership'
  | 'unreachable_action_surface'
  | 'duplicate_action_surface'
  | 'missing_durable_receipt'
  | 'missing_source_proof'
  | 'duplicate_source_proof'
  | 'source_anchor_missing';

export interface PresidentialCommandConvergenceFinding {
  code: PresidentialCommandConvergenceFindingCode;
  familyId: PlayerDecisionFamilyId;
  detail: string;
}

export interface PresidentialCommandConvergenceRow {
  familyId: PlayerDecisionFamilyId;
  producer: string;
  statePath: string;
  blockerPredicate: string;
  gatePolicy: PlayerDecisionFamilyDefinition['gatePolicy'];
  actionSurface: string;
  receiptOwner: string;
  receiptDurability: ReceiptDurability | 'unowned';
  receiptDisposition: string;
  chronicleConsumers: string[];
  recordsConsumers: string[];
  receiptConsumers: string[];
  codexConsumers: string[];
  costLedgerConsumers: string[];
  sourceProofStatus: 'verified' | 'failed' | 'unowned';
  sourceEvidence: {
    producer: string[];
    action: string[];
    receipt: string[];
    consumers: string[];
  };
}

export interface PresidentialCommandConvergenceReport {
  schemaVersion: 2;
  rows: PresidentialCommandConvergenceRow[];
  findings: PresidentialCommandConvergenceFinding[];
  summary: {
    familyCount: number;
    reachableActionFamilyCount: number;
    durableReceiptFamilyCount: number;
    conditionalReceiptFamilyCount: number;
    unresolvedFindingCount: number;
    sourceVerifiedFamilyCount: number;
  };
}

export interface BuildPresidentialCommandConvergenceReportInput {
  families: readonly PlayerDecisionFamilyDefinition[];
  surfaces: readonly DecisionSurfaceDefinition[];
  ownership: readonly PresidentialDecisionOwnership[];
  sourceProofs: readonly PresidentialDecisionSourceProof[];
  sourceTexts: Readonly<Record<string, string>>;
}

export const PRESIDENTIAL_DECISION_OWNERSHIP: readonly PresidentialDecisionOwnership[] = [
  {
    familyId: 'event_decision',
    producer: 'src/sim/events/evaluate_events.ts -> military.pending_event_decisions',
    blockerPredicate: 'requires_player_response === true',
    receiptOwner: 'military.event_decision_log',
    receiptDurability: 'durable',
    receiptDisposition: 'Append-only player and bot response log retained in the canonical save.',
  },
  {
    familyId: 'peace_plan',
    producer: 'src/sim/negotiation/peace_plans.ts -> military.negotiation.pending_peace_plan',
    blockerPredicate: 'pending_peace_plan is present',
    receiptOwner: 'military.negotiation.peace_plan_history',
    receiptDurability: 'durable',
    receiptDisposition: 'Resolved plan and all faction responses remain in negotiation history.',
  },
  {
    familyId: 'dayton_negotiation',
    producer: 'src/sim/turn_phases/war_phase_negotiation_steps.ts -> military.negotiation.pending_dayton',
    blockerPredicate: 'pending_dayton is present',
    receiptOwner: 'military.negotiation.dayton_result',
    receiptDurability: 'durable',
    receiptDisposition: 'Signed settlement result persists into the game verdict and final campaign record.',
  },
  {
    familyId: 'paramilitary_request',
    producer: 'src/sim/combat/paramilitary_sweep.ts -> pending_paramilitary_requests',
    blockerPredicate: 'decision is not allow, deny, or regular',
    receiptOwner: 'paramilitary_decision_history',
    receiptDurability: 'durable',
    receiptDisposition: 'Resolved authorization remains in the top-level paramilitary decision history.',
  },
  {
    familyId: 'convoy_decision',
    producer: 'src/state/supply_reserves.ts -> military.pending_convoy_decisions',
    blockerPredicate: 'decision is undefined',
    receiptOwner: 'military.convoy_decision_history',
    receiptDurability: 'durable',
    receiptDisposition: 'Resolved convoy instruction remains in the humanitarian access history.',
  },
  {
    familyId: 'reserve_request',
    producer: 'src/sim/combat/army_reserve_system.ts -> military.pending_reserve_requests',
    blockerPredicate: 'advisory; never blocks Advance',
    receiptOwner: 'military.reserve_request_history',
    receiptDurability: 'durable',
    receiptDisposition: 'Player and staff reserve dispositions remain in Army HQ history.',
  },
  {
    familyId: 'officer_event',
    producer: 'src/sim/combat/officer_system.ts -> military.pending_officer_events',
    blockerPredicate: 'advisory; acknowledged !== true',
    receiptOwner: 'military.officer_decision_history',
    receiptDurability: 'durable',
    receiptDisposition: 'Acknowledgements, overrides, and replacements remain in personnel history.',
  },
  {
    familyId: 'autonomy_proposal',
    producer: 'src/sim/ai_commander/proposal_generation.ts -> meta.pending_proposal_reviews',
    blockerPredicate: 'advisory; unresolved proposal review for the player faction',
    receiptOwner: 'meta.proposal_decision_history',
    receiptDurability: 'durable',
    receiptDisposition: 'Resolved ordinary staff proposals remain in the durable campaign Records history.',
  },
  {
    familyId: 'operation_opportunity',
    producer: 'src/sim/combat/operation_opportunities.ts -> military.operation_opportunities + meta.pending_proposal_reviews',
    blockerPredicate: 'advisory; status === eligible_pending_review',
    receiptOwner: 'military.operation_opportunity_resolutions',
    receiptDurability: 'durable',
    receiptDisposition: 'The canonical opportunity state and resolution ledger retain the response and downstream outcome.',
  },
] as const;

/**
 * Executable proof contract for the current ownership inventory. Each anchor is
 * a repository-relative source fact, not prose emitted by this diagnostic.
 * Removing or moving a producer, route, receipt writer, or declared consumer
 * therefore makes the report fail closed until this contract is reviewed.
 */
export const PRESIDENTIAL_DECISION_SOURCE_PROOFS: readonly PresidentialDecisionSourceProof[] = [
  {
    familyId: 'event_decision',
    producer: [{
      path: 'src/sim/events/evaluate_events.ts',
      anchors: ['def.requires_player_response === true', 'state.military.pending_event_decisions.push({'],
    }],
    action: [{ path: 'src/ui/map/App.tsx', anchors: ["if (action === 'event_modal')"] }],
    receipt: [{
      path: 'src/sim/events/evaluate_events.ts',
      anchors: ['state.military.event_decision_log.push({'],
    }],
    consumers: [
      {
        channel: 'chronicle',
        label: 'decision-consequence ledger',
        path: 'src/ui/map/data/decisionConsequenceLedger.ts',
        anchors: ['for (const event of state.firedEvents ?? [])', "recordTarget: 'chronicle'"],
      },
      {
        channel: 'receipt',
        label: 'confirmed consequence receipts',
        path: 'src/ui/map/data/consequenceReceipts.ts',
        anchors: ['for (const dec of decisionLog)'],
      },
      {
        channel: 'codex',
        label: 'dynamic section builder',
        path: 'src/sim/codex/dynamic_section_builder.ts',
        anchors: ['const log = input.state.military?.event_decision_log ?? [];'],
      },
    ],
  },
  {
    familyId: 'peace_plan',
    producer: [{ path: 'src/sim/negotiation/peace_plans.ts', anchors: ['neg.pending_peace_plan = {'] }],
    action: [{ path: 'src/ui/map/App.tsx', anchors: ["if (action === 'peace_plan_modal')"] }],
    receipt: [{ path: 'src/sim/negotiation/peace_plans.ts', anchors: ['neg.peace_plan_history.push(historyEntry);'] }],
    consumers: [{
      channel: 'chronicle',
      label: 'decision-consequence ledger',
      path: 'src/ui/map/data/decisionConsequenceLedger.ts',
      anchors: ['for (const peace of state.peacePlanHistory ?? [])'],
    }],
  },
  {
    familyId: 'dayton_negotiation',
    producer: [{
      path: 'src/sim/turn_phases/war_phase_negotiation_steps.ts',
      anchors: ['if (negotiation) negotiation.pending_dayton = menu;'],
    }],
    action: [{ path: 'src/ui/map/App.tsx', anchors: ["if (action === 'dayton_modal')"] }],
    receipt: [{ path: 'src/sim/negotiation/dayton_negotiation.ts', anchors: ['neg.dayton_result = result;'] }],
    consumers: [{
      channel: 'chronicle',
      label: 'decision-consequence ledger',
      path: 'src/ui/map/data/decisionConsequenceLedger.ts',
      anchors: ["state.gameVerdict?.outcome_type === 'dayton'", "familyId: 'dayton-settlement'"],
    }],
  },
  {
    familyId: 'paramilitary_request',
    producer: [{
      path: 'src/sim/combat/paramilitary_sweep.ts',
      anchors: ['const requests = state.pending_paramilitary_requests ??= [];', 'requests.push({'],
    }],
    action: [{ path: 'src/ui/map/App.tsx', anchors: ["if (action === 'paramilitary_review')"] }],
    receipt: [{
      path: 'src/sim/combat/paramilitary_sweep.ts',
      anchors: ['state.paramilitary_decision_history = history.sort((a, b) =>'],
    }],
    consumers: [{
      channel: 'records',
      label: 'decision-consequence ledger',
      path: 'src/ui/map/data/decisionConsequenceLedger.ts',
      anchors: ['for (const paramilitary of state.paramilitaryDecisionHistory ?? [])'],
    }],
  },
  {
    familyId: 'convoy_decision',
    producer: [{
      path: 'src/state/supply_reserves.ts',
      anchors: ['state.military.pending_convoy_decisions = pending.sort((a, b) => strictCompare(a.id, b.id));'],
    }],
    action: [{ path: 'src/ui/map/App.tsx', anchors: ["if (action === 'convoy_decision_modal')"] }],
    receipt: [{
      path: 'src/state/supply_reserves.ts',
      anchors: ['state.military.convoy_decision_history = history.sort((a, b) =>'],
    }],
    consumers: [{
      channel: 'chronicle',
      label: 'decision-consequence ledger',
      path: 'src/ui/map/data/decisionConsequenceLedger.ts',
      anchors: ['for (const convoy of state.convoyDecisionHistory ?? [])'],
    }],
  },
  {
    familyId: 'reserve_request',
    producer: [{
      path: 'src/sim/combat/army_reserve_system.ts',
      anchors: ['state.military.pending_reserve_requests = pending'],
    }],
    action: [{ path: 'src/ui/map/App.tsx', anchors: ["if (action === 'army_reserve')"] }],
    receipt: [{
      path: 'src/sim/combat/army_reserve_system.ts',
      anchors: ['state.military.reserve_request_history.push(entry);'],
    }],
    consumers: [{
      channel: 'records',
      label: 'decision-consequence ledger',
      path: 'src/ui/map/data/decisionConsequenceLedger.ts',
      anchors: ['for (const reserve of state.reserveRequestHistory ?? [])'],
    }],
  },
  {
    familyId: 'officer_event',
    producer: [{
      path: 'src/sim/combat/officer_system.ts',
      anchors: ['const pendingEvents = state.military.pending_officer_events;', 'pendingEvents.push({'],
    }],
    action: [{ path: 'src/ui/map/App.tsx', anchors: ["if (action === 'army_hq_personnel')"] }],
    receipt: [{
      path: 'src/desktop/officer_decision_history.cjs',
      anchors: ['state.military.officer_decision_history = existing;'],
    }],
    consumers: [{
      channel: 'records',
      label: 'decision-consequence ledger',
      path: 'src/ui/map/data/decisionConsequenceLedger.ts',
      anchors: ['for (const officer of state.officerDecisionHistory ?? [])'],
    }],
  },
  {
    familyId: 'autonomy_proposal',
    producer: [
      {
        path: 'src/sim/ai_commander/proposal_generation.ts',
        anchors: ['export function generateLevel1StanceProposals('],
      },
      {
        path: 'src/sim/turn_phases/war_phases.ts',
        anchors: ['context.state.meta.pending_proposal_reviews.push(...proposals);'],
      },
    ],
    action: [
      { path: 'src/ui/map/App.tsx', anchors: ["if (action === 'decision_room')"] },
      {
        path: 'src/ui/map/data/presidentialDecisionRoom.ts',
        anchors: ['function addProposalReviewDirectiveCards('],
      },
    ],
    receipt: [{
      path: 'src/sim/turn_phases/war_phases.ts',
      anchors: [
        'meta.proposal_decision_history ??= [];',
        'meta.proposal_decision_history.push({',
        'meta.pending_proposal_reviews = meta.pending_proposal_reviews.filter((proposal) =>',
      ],
    }],
    consumers: [{
      channel: 'records',
      label: 'decision-consequence ledger',
      path: 'src/ui/map/data/decisionConsequenceLedger.ts',
      anchors: [
        'const archivedProposals = state.rawGameState?.meta?.proposal_decision_history ?? [];',
        "familyId: 'autonomy-proposal'",
      ],
    }],
  },
  {
    familyId: 'operation_opportunity',
    producer: [{
      path: 'src/sim/combat/operation_opportunities.ts',
      anchors: ['state.military.operation_opportunities = proposals;'],
    }],
    action: [
      { path: 'src/ui/map/App.tsx', anchors: ["if (action === 'decision_room')"] },
      {
        path: 'src/ui/map/data/presidentialDecisionRoom.ts',
        anchors: ['function addOpportunityCards(state: LoadedGameState, cards: CandidateCard[]): void'],
      },
    ],
    receipt: [{
      path: 'src/sim/combat/operation_opportunities.ts',
      anchors: ['state.military.operation_opportunity_resolutions.push({'],
    }],
    consumers: [
      {
        channel: 'records',
        label: 'operation opportunity records projection',
        path: 'src/ui/map/data/operationOpportunityLedger.ts',
        anchors: [
          'const resolutions = Array.isArray(state.military?.operation_opportunity_resolutions)',
          '? state.military.operation_opportunity_resolutions as RawRecord[]',
        ],
      },
      {
        channel: 'cost_ledger',
        label: 'operation opportunity cost ledger',
        path: 'src/sim/endgame/cost_ledger.ts',
        anchors: ['const resolutions = [...(state.military?.operation_opportunity_resolutions ?? [])];'],
      },
    ],
  },
] as const;

export function loadPresidentialCommandSourceTexts(
  repositoryRoot = resolve('.'),
): Record<string, string> {
  const paths = [...new Set(PRESIDENTIAL_DECISION_SOURCE_PROOFS.flatMap((proof) => [
    ...proof.producer.map((row) => row.path),
    ...proof.action.map((row) => row.path),
    ...proof.receipt.map((row) => row.path),
    ...proof.consumers.map((row) => row.path),
  ]))].sort(strictCompare);
  return Object.fromEntries(paths.map((path) => [path, readFileSync(resolve(repositoryRoot, path), 'utf8')]));
}

function normalizeStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort(strictCompare);
}

function actionSurfaceLabel(surface: DecisionSurfaceDefinition): string {
  return `${surface.ownerShell}:${surface.resolverSurface}`;
}

function compareFindings(
  left: PresidentialCommandConvergenceFinding,
  right: PresidentialCommandConvergenceFinding,
): number {
  return strictCompare(left.familyId, right.familyId)
    || strictCompare(left.code, right.code)
    || strictCompare(left.detail, right.detail);
}

export function buildPresidentialCommandConvergenceReport(
  input: BuildPresidentialCommandConvergenceReportInput,
): PresidentialCommandConvergenceReport {
  const families = [...input.families].sort((left, right) => strictCompare(left.id, right.id));
  const findings: PresidentialCommandConvergenceFinding[] = [];
  const actionSourceVerifiedFamilyIds = new Set<PlayerDecisionFamilyId>();
  const receiptSourceVerifiedFamilyIds = new Set<PlayerDecisionFamilyId>();

  function verifyAnchors(
    familyId: PlayerDecisionFamilyId,
    kind: 'producer' | 'action' | 'receipt' | 'consumer',
    anchors: readonly PresidentialSourceAnchor[],
  ): { verified: boolean; evidence: string[] } {
    if (anchors.length === 0 && kind !== 'consumer') {
      findings.push({
        code: 'missing_source_proof',
        familyId,
        detail: `No ${kind} source anchors are registered.`,
      });
      return { verified: false, evidence: [] };
    }
    let verified = true;
    const evidence: string[] = [];
    for (const row of anchors) {
      const source = input.sourceTexts[row.path];
      for (const anchor of row.anchors) {
        evidence.push(`${row.path}#${anchor}`);
        if (typeof source !== 'string' || !source.includes(anchor)) {
          verified = false;
          findings.push({
            code: 'source_anchor_missing',
            familyId,
            detail: `Missing ${kind} source anchor "${anchor}" in ${row.path}.`,
          });
        }
      }
    }
    return { verified, evidence: normalizeStrings(evidence) };
  }

  const rows = families.map((family): PresidentialCommandConvergenceRow => {
    const ownershipRows = input.ownership.filter((row) => row.familyId === family.id);
    const proofRows = input.sourceProofs.filter((row) => row.familyId === family.id);
    const surfaces = input.surfaces
      .filter((surface) => surface.manifestBacked && surface.familyId === family.id)
      .map(actionSurfaceLabel)
      .sort(strictCompare);
    const ownership = ownershipRows[0];
    const proof = proofRows[0];

    if (ownershipRows.length === 0) {
      findings.push({
        code: 'missing_family_ownership',
        familyId: family.id,
        detail: 'No producer, blocker, or receipt ownership contract is registered.',
      });
    } else if (ownershipRows.length > 1) {
      findings.push({
        code: 'duplicate_family_ownership',
        familyId: family.id,
        detail: `${ownershipRows.length} ownership contracts are registered.`,
      });
    }

    if (proofRows.length === 0) {
      findings.push({
        code: 'missing_source_proof',
        familyId: family.id,
        detail: 'No producer, action, receipt, or consumer source proof is registered.',
      });
    } else if (proofRows.length > 1) {
      findings.push({
        code: 'duplicate_source_proof',
        familyId: family.id,
        detail: `${proofRows.length} source-proof contracts are registered.`,
      });
    }

    const producerProof = proof
      ? verifyAnchors(family.id, 'producer', proof.producer)
      : { verified: false, evidence: [] };
    const actionProof = proof
      ? verifyAnchors(family.id, 'action', proof.action)
      : { verified: false, evidence: [] };
    const receiptProof = proof
      ? verifyAnchors(family.id, 'receipt', proof.receipt)
      : { verified: false, evidence: [] };
    const consumerProof = proof
      ? verifyAnchors(family.id, 'consumer', proof.consumers)
      : { verified: false, evidence: [] };
    if (proofRows.length === 1 && actionProof.verified) actionSourceVerifiedFamilyIds.add(family.id);
    if (proofRows.length === 1 && receiptProof.verified) receiptSourceVerifiedFamilyIds.add(family.id);

    if (surfaces.length === 0) {
      findings.push({
        code: 'unreachable_action_surface',
        familyId: family.id,
        detail: 'No reachable action surface is registered.',
      });
    } else if (surfaces.length > 1) {
      findings.push({
        code: 'duplicate_action_surface',
        familyId: family.id,
        detail: `Two action surfaces are registered: ${surfaces.join(', ')}.`,
      });
    }

    if (ownership && ownership.receiptDurability !== 'durable') {
      findings.push({
        code: 'missing_durable_receipt',
        familyId: family.id,
        detail: ownership.receiptDisposition,
      });
    }

    return {
      familyId: family.id,
      producer: ownership?.producer ?? 'unowned',
      statePath: family.statePath,
      blockerPredicate: ownership?.blockerPredicate ?? 'unowned',
      gatePolicy: family.gatePolicy,
      actionSurface: surfaces.length === 1 ? surfaces[0] : surfaces.length === 0 ? 'unreachable' : 'duplicate',
      receiptOwner: ownership?.receiptOwner ?? 'unowned',
      receiptDurability: ownership?.receiptDurability ?? 'unowned',
      receiptDisposition: ownership?.receiptDisposition ?? 'No receipt ownership contract is registered.',
      chronicleConsumers: normalizeStrings(proof?.consumers
        .filter((row) => row.channel === 'chronicle').map((row) => row.label) ?? []),
      recordsConsumers: normalizeStrings(proof?.consumers
        .filter((row) => row.channel === 'records').map((row) => row.label) ?? []),
      receiptConsumers: normalizeStrings(proof?.consumers
        .filter((row) => row.channel === 'receipt').map((row) => row.label) ?? []),
      codexConsumers: normalizeStrings(proof?.consumers
        .filter((row) => row.channel === 'codex').map((row) => row.label) ?? []),
      costLedgerConsumers: normalizeStrings(proof?.consumers
        .filter((row) => row.channel === 'cost_ledger').map((row) => row.label) ?? []),
      sourceProofStatus: proofRows.length === 1
        && producerProof.verified
        && actionProof.verified
        && receiptProof.verified
        && consumerProof.verified
        ? 'verified'
        : proofRows.length === 0
          ? 'unowned'
          : 'failed',
      sourceEvidence: {
        producer: producerProof.evidence,
        action: actionProof.evidence,
        receipt: receiptProof.evidence,
        consumers: consumerProof.evidence,
      },
    };
  });

  findings.sort(compareFindings);
  return {
    schemaVersion: 2,
    rows,
    findings,
    summary: {
      familyCount: rows.length,
      reachableActionFamilyCount: rows.filter((row) => (
        row.actionSurface !== 'unreachable'
        && row.actionSurface !== 'duplicate'
        && actionSourceVerifiedFamilyIds.has(row.familyId)
      )).length,
      durableReceiptFamilyCount: rows.filter((row) => (
        row.receiptDurability === 'durable'
        && receiptSourceVerifiedFamilyIds.has(row.familyId)
      )).length,
      conditionalReceiptFamilyCount: rows.filter((row) => row.receiptDurability === 'conditional').length,
      unresolvedFindingCount: findings.length,
      sourceVerifiedFamilyCount: rows.filter((row) => row.sourceProofStatus === 'verified').length,
    },
  };
}

export function serializePresidentialCommandConvergenceReport(
  report: PresidentialCommandConvergenceReport,
): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function assertPresidentialCommandConvergence(report: PresidentialCommandConvergenceReport): void {
  if (report.findings.length === 0) return;
  const detail = report.findings
    .map((finding) => `${finding.familyId}: ${finding.code.replace(/_/g, ' ')}: ${finding.detail}`)
    .join(' ');
  throw new Error(`Presidential command convergence failed: ${detail}`);
}

function parseOutPath(argv: readonly string[]): string | null {
  const index = argv.indexOf('--out');
  if (index === -1) return null;
  const value = argv[index + 1];
  if (!value) throw new Error('--out requires a path.');
  return resolve(value);
}

function main(): void {
  const report = buildPresidentialCommandConvergenceReport({
    families: PLAYER_DECISION_FAMILIES,
    surfaces: Object.values(DECISION_SURFACE_REGISTRY),
    ownership: PRESIDENTIAL_DECISION_OWNERSHIP,
    sourceProofs: PRESIDENTIAL_DECISION_SOURCE_PROOFS,
    sourceTexts: loadPresidentialCommandSourceTexts(),
  });
  const serialized = serializePresidentialCommandConvergenceReport(report);
  const outPath = parseOutPath(process.argv.slice(2));
  if (outPath) writeFileSync(outPath, serialized, 'utf8');
  else process.stdout.write(serialized);
  assertPresidentialCommandConvergence(report);
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (entryPath === fileURLToPath(import.meta.url)) main();
