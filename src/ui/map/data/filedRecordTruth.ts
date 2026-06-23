import type { LoadedGameState } from './types';
import { buildDecisionConsequenceLedger } from './decisionConsequenceLedger';
import { shouldNarrateTerritorySummary } from './territorySummaryGuard';

export function countFiledTurnRecords(state: LoadedGameState | null | undefined): number {
  if (!state) return 0;
  const turns = new Set<number>();
  for (const summary of state.turnSummaries ?? []) {
    if (!shouldNarrateTerritorySummary(summary)) continue;
    if (typeof summary.turn === 'number') turns.add(summary.turn);
  }
  if (state.latestTurnSummary && shouldNarrateTerritorySummary(state.latestTurnSummary)) {
    if (typeof state.latestTurnSummary.turn === 'number') turns.add(state.latestTurnSummary.turn);
  }
  return turns.size;
}

export function countFiledDecisionRecords(state: LoadedGameState | null | undefined): number {
  return buildDecisionConsequenceLedger(state, Number.MAX_SAFE_INTEGER).length;
}

export function hasFiledRecord(state: LoadedGameState | null | undefined): boolean {
  if (!state) return false;
  if (countFiledTurnRecords(state) > 0) return true;
  if (countFiledDecisionRecords(state) > 0) return true;
  if ((state.operationHistory ?? []).length > 0) return true;
  if ((state.reserveRequestHistory ?? []).length > 0) return true;
  if ((state.peacePlanHistory ?? []).length > 0) return true;
  if ((state.convoyDecisionHistory ?? []).length > 0) return true;
  if ((state.paramilitaryDecisionHistory ?? []).length > 0) return true;
  if ((state.officerDecisionHistory ?? []).length > 0) return true;
  return false;
}
