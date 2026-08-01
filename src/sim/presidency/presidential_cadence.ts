/**
 * Pure presidential-cadence diagnostic.
 *
 * The report deliberately distinguishes authored/source-backed presidential
 * work from ordinary emergent work and acknowledgements. A notice or generic
 * proposal therefore cannot make an authored-decision drought look shorter.
 * Long gaps remain unresolved unless an explicit, evidenced positive-hold
 * disposition matches the exact source-backed endpoints.
 */

import { strictCompare } from '../../state/validateGameState.js';

export type PresidentialCadenceClassification =
  | 'required_authored'
  | 'optional_source_backed'
  | 'ordinary_emergent'
  | 'notice';

export interface PresidentialCadenceReceipt {
  id: string;
  faction: string;
  turn: number;
  classification: PresidentialCadenceClassification;
  sourceIds: string[];
}

export interface PresidentialPositiveHold {
  id: string;
  faction: string;
  fromTurn: number;
  toTurn: number;
  rationale: string;
  evidenceIds: string[];
}

export interface PresidentialCadenceGap {
  fromTurn: number;
  toTurn: number;
  gapTurns: number;
  fromReceiptIds: string[];
  toReceiptIds: string[];
  status: 'unresolved' | 'positive_hold';
  positiveHoldId?: string;
  positiveHoldRationale?: string;
  positiveHoldEvidenceIds?: string[];
}

export interface PresidentialCadenceReport {
  faction: string;
  startTurn: number;
  endTurn: number;
  targetMaxGapTurns: number;
  receipts: PresidentialCadenceReceipt[];
  receiptCounts: Record<PresidentialCadenceClassification, number>;
  sourceBackedReceiptIds: string[];
  maxSourceBackedGapTurns: number;
  gaps: PresidentialCadenceGap[];
  unresolvedLongGapCount: number;
  invalidPositiveHoldIds: string[];
}

export interface BuildPresidentialCadenceReportInput {
  faction: string;
  startTurn: number;
  endTurn: number;
  targetMaxGapTurns: number;
  receipts: readonly PresidentialCadenceReceipt[];
  positiveHolds: readonly PresidentialPositiveHold[];
  /** Evidence identifiers admitted by the caller's resolvable source inventory. */
  positiveHoldEvidenceIds: readonly string[];
}

export interface PresidentialCadenceEventCatalogRow {
  id: string;
  requiresPlayerResponse: boolean;
  sourceBacked: boolean;
  sourceIds: string[];
}

export interface PresidentialCadenceProjectionState {
  eventDecisionLog?: Array<{ eventId: string; faction: string | null; turn: number }>;
  peacePlanHistory?: Array<{
    planId: string;
    turn: number;
    responses: Record<string, 'accepted' | 'rejected' | 'pending'>;
  }>;
  proposalReviews?: Array<{
    id: string;
    faction: string;
    turn: number;
    resolvedTurn?: number;
    proposedAction: string;
  }>;
  officerDecisionHistory?: Array<{
    id: string;
    faction: string;
    turn: number;
    eventId: string;
    decision: 'acknowledged' | 'override_confirmed' | 'replacement_accepted';
  }>;
  reserveDecisionHistory?: Array<{ id: string; faction: string; turn: number }>;
  convoyDecisionHistory?: Array<{ id: string; routeFaction: string; turn: number }>;
  paramilitaryDecisionHistory?: Array<{ id: string; faction: string; turn: number }>;
}

export interface ProjectPresidentialCadenceReceiptsInput {
  faction: string;
  eventCatalog: readonly PresidentialCadenceEventCatalogRow[];
  state: PresidentialCadenceProjectionState;
}

const CLASSIFICATION_ORDER: Record<PresidentialCadenceClassification, number> = {
  required_authored: 0,
  optional_source_backed: 1,
  ordinary_emergent: 2,
  notice: 3,
};

function isValidTurn(turn: number): boolean {
  return Number.isInteger(turn) && turn >= 0;
}

function normalizedIds(ids: readonly string[]): string[] {
  return [...new Set(ids.filter((id) => id.trim().length > 0))].sort(strictCompare);
}

function receiptKey(receipt: PresidentialCadenceReceipt): string {
  return `${receipt.turn}\u0000${receipt.classification}\u0000${receipt.id}`;
}

function normalizeReceipts(
  receipts: readonly PresidentialCadenceReceipt[],
  faction: string,
  startTurn: number,
  endTurn: number,
): PresidentialCadenceReceipt[] {
  const byKey = new Map<string, PresidentialCadenceReceipt>();

  for (const receipt of receipts) {
    if (
      receipt.faction !== faction
      || receipt.id.trim().length === 0
      || !isValidTurn(receipt.turn)
      || receipt.turn < startTurn
      || receipt.turn > endTurn
    ) {
      continue;
    }

    const normalized: PresidentialCadenceReceipt = {
      ...receipt,
      sourceIds: normalizedIds(receipt.sourceIds),
    };
    const key = receiptKey(normalized);
    const prior = byKey.get(key);
    byKey.set(key, prior
      ? { ...prior, sourceIds: normalizedIds([...prior.sourceIds, ...normalized.sourceIds]) }
      : normalized);
  }

  return [...byKey.values()].sort((left, right) => (
    left.turn - right.turn
    || CLASSIFICATION_ORDER[left.classification] - CLASSIFICATION_ORDER[right.classification]
    || strictCompare(left.id, right.id)
  ));
}

function isSourceBacked(receipt: PresidentialCadenceReceipt): boolean {
  return receipt.classification === 'required_authored'
    || receipt.classification === 'optional_source_backed';
}

interface SourceBackedTurn {
  turn: number;
  receiptIds: string[];
}

function sourceBackedTurns(
  receipts: readonly PresidentialCadenceReceipt[],
  startTurn: number,
  endTurn: number,
): SourceBackedTurn[] {
  const byTurn = new Map<number, string[]>();
  for (const receipt of receipts) {
    if (!isSourceBacked(receipt)) continue;
    const ids = byTurn.get(receipt.turn) ?? [];
    ids.push(receipt.id);
    byTurn.set(receipt.turn, ids);
  }

  if (!byTurn.has(startTurn)) byTurn.set(startTurn, []);
  if (!byTurn.has(endTurn)) byTurn.set(endTurn, []);

  return [...byTurn.entries()]
    .map(([turn, receiptIds]) => ({ turn, receiptIds: normalizedIds(receiptIds) }))
    .sort((left, right) => left.turn - right.turn);
}

function normalizePositiveHold(hold: PresidentialPositiveHold): PresidentialPositiveHold {
  return {
    ...hold,
    evidenceIds: normalizedIds(hold.evidenceIds),
  };
}

/**
 * Project the durable decision owners used by the cadence diagnostic.
 *
 * Unknown event rows are conservatively treated as notices. This prevents a
 * missing catalog join from falsely satisfying the sourced-cadence target.
 */
export function projectPresidentialCadenceReceipts(
  input: ProjectPresidentialCadenceReceiptsInput,
): PresidentialCadenceReceipt[] {
  const { faction, state } = input;
  const eventCatalog = new Map(input.eventCatalog.map((row) => [row.id, row]));
  const projected: PresidentialCadenceReceipt[] = [];

  for (const entry of state.eventDecisionLog ?? []) {
    if (entry.faction !== faction) continue;
    const catalog = eventCatalog.get(entry.eventId);
    const classification: PresidentialCadenceClassification = !catalog
      ? 'notice'
      : !catalog.requiresPlayerResponse
        ? 'notice'
        : catalog.sourceBacked
          ? 'required_authored'
          : 'ordinary_emergent';
    projected.push({
      id: `event:${entry.eventId}`,
      faction,
      turn: entry.turn,
      classification,
      sourceIds: catalog?.sourceIds ?? [],
    });
  }

  for (const plan of state.peacePlanHistory ?? []) {
    if (plan.responses[faction] == null || plan.responses[faction] === 'pending') continue;
    projected.push({
      id: `peace-plan:${plan.planId}:${faction}`,
      faction,
      turn: plan.turn,
      classification: 'required_authored',
      sourceIds: [`peace-plan:${plan.planId}`],
    });
  }

  for (const review of state.proposalReviews ?? []) {
    if (review.faction !== faction || !isValidTurn(review.resolvedTurn ?? Number.NaN)) continue;
    const historicalOperation = review.proposedAction.startsWith('HISTORICAL_OP:');
    projected.push({
      id: `proposal:${review.id}`,
      faction,
      turn: review.resolvedTurn!,
      classification: historicalOperation ? 'optional_source_backed' : 'ordinary_emergent',
      sourceIds: historicalOperation ? [review.proposedAction] : [],
    });
  }

  for (const record of state.officerDecisionHistory ?? []) {
    if (record.faction !== faction) continue;
    const sourceBacked = record.decision === 'replacement_accepted';
    projected.push({
      id: `officer:${record.id}`,
      faction,
      turn: record.turn,
      classification: sourceBacked ? 'optional_source_backed' : 'notice',
      sourceIds: sourceBacked ? [`officer-event:${record.eventId}`] : [],
    });
  }

  for (const record of state.reserveDecisionHistory ?? []) {
    if (record.faction !== faction) continue;
    projected.push({
      id: `reserve:${record.id}`,
      faction,
      turn: record.turn,
      classification: 'ordinary_emergent',
      sourceIds: [],
    });
  }

  for (const record of state.convoyDecisionHistory ?? []) {
    if (record.routeFaction !== faction) continue;
    projected.push({
      id: `convoy:${record.id}`,
      faction,
      turn: record.turn,
      classification: 'ordinary_emergent',
      sourceIds: [],
    });
  }

  for (const record of state.paramilitaryDecisionHistory ?? []) {
    if (record.faction !== faction) continue;
    projected.push({
      id: `paramilitary:${record.id}`,
      faction,
      turn: record.turn,
      classification: 'ordinary_emergent',
      sourceIds: [],
    });
  }

  return normalizeReceipts(projected, faction, 0, Number.MAX_SAFE_INTEGER);
}

export function buildPresidentialCadenceReport(
  input: BuildPresidentialCadenceReportInput,
): PresidentialCadenceReport {
  const { faction, startTurn, endTurn, targetMaxGapTurns } = input;
  if (!isValidTurn(startTurn) || !isValidTurn(endTurn) || endTurn < startTurn) {
    throw new Error('Presidential cadence report requires an ordered, non-negative turn range.');
  }
  if (!Number.isInteger(targetMaxGapTurns) || targetMaxGapTurns < 1) {
    throw new Error('Presidential cadence report targetMaxGapTurns must be a positive integer.');
  }

  const receipts = normalizeReceipts(input.receipts, faction, startTurn, endTurn);
  const counts: Record<PresidentialCadenceClassification, number> = {
    required_authored: 0,
    optional_source_backed: 0,
    ordinary_emergent: 0,
    notice: 0,
  };
  for (const receipt of receipts) counts[receipt.classification] += 1;

  const backedReceipts = receipts.filter(isSourceBacked);
  const turns = sourceBackedTurns(receipts, startTurn, endTurn);
  const gapCandidates = turns.slice(0, -1).map((from, index) => {
    const to = turns[index + 1];
    return {
      fromTurn: from.turn,
      toTurn: to.turn,
      gapTurns: to.turn - from.turn,
      fromReceiptIds: from.receiptIds,
      toReceiptIds: to.receiptIds,
    };
  });
  const longGapCandidates = gapCandidates.filter((gap) => gap.gapTurns > targetMaxGapTurns);

  const holds = input.positiveHolds
    .map(normalizePositiveHold)
    .sort((left, right) => strictCompare(left.id, right.id));
  const admittedEvidenceIds = new Set(normalizedIds(input.positiveHoldEvidenceIds));
  const invalidPositiveHoldIds: string[] = [];
  const claimedGapKeys = new Set<string>();
  const validHoldByGap = new Map<string, PresidentialPositiveHold>();

  for (const hold of holds) {
    const key = `${hold.fromTurn}:${hold.toTurn}`;
    const exactLongGap = longGapCandidates.some(
      (gap) => gap.fromTurn === hold.fromTurn && gap.toTurn === hold.toTurn,
    );
    const valid = hold.id.trim().length > 0
      && hold.faction === faction
      && hold.rationale.trim().length > 0
      && hold.evidenceIds.length > 0
      && hold.evidenceIds.every((evidenceId) => admittedEvidenceIds.has(evidenceId))
      && exactLongGap
      && !claimedGapKeys.has(key);

    if (!valid) {
      if (hold.id.trim().length > 0) invalidPositiveHoldIds.push(hold.id);
      continue;
    }
    claimedGapKeys.add(key);
    validHoldByGap.set(key, hold);
  }

  const gaps: PresidentialCadenceGap[] = longGapCandidates.map((gap) => {
    const hold = validHoldByGap.get(`${gap.fromTurn}:${gap.toTurn}`);
    if (!hold) return { ...gap, status: 'unresolved' };
    return {
      ...gap,
      status: 'positive_hold',
      positiveHoldId: hold.id,
      positiveHoldRationale: hold.rationale.trim(),
      positiveHoldEvidenceIds: hold.evidenceIds,
    };
  });

  return {
    faction,
    startTurn,
    endTurn,
    targetMaxGapTurns,
    receipts,
    receiptCounts: counts,
    sourceBackedReceiptIds: backedReceipts.map((receipt) => receipt.id),
    maxSourceBackedGapTurns: gapCandidates.reduce((max, gap) => Math.max(max, gap.gapTurns), 0),
    gaps,
    unresolvedLongGapCount: gaps.filter((gap) => gap.status === 'unresolved').length,
    invalidPositiveHoldIds: normalizedIds(invalidPositiveHoldIds),
  };
}
