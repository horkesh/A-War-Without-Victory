/**
 * Source-bounded presidential initiative registry and pure cadence evaluator.
 *
 * The shipped April 1992 registry is deliberately empty. The accepted
 * all-faction BB1/BB2 audit found no additional initiative that could be
 * offered without inventing a presidential decision. This module therefore
 * makes `positive_hold` an explicit, deterministic result instead of treating
 * the absence of authored content as an implementation gap.
 *
 * Registry rows are data, not permission to add mechanics. Every row must use
 * one of the five existing presidential levers and its canonical Authority
 * cost. Adding a live row still requires the existing lever's owner surface;
 * this evaluator never applies an effect or debits Authority.
 */

import rawApr1992Registry from '../../../data/scenarios/presidential_initiatives/apr1992.json';
import type { FactionId, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

export const PRESIDENTIAL_INITIATIVE_MIN_REVIEW_GAP_TURNS = 8;
export const PRESIDENTIAL_INITIATIVE_NEAR_CAP_FRACTION = 0.9;

export type PresidentialInitiativeLeverKind =
  | 'authorize_operation'
  | 'request_operation'
  | 'stop_operation'
  | 'deploy_elite_formation'
  | 'replace_corps_commander';

/** Canonical costs of the existing five levers; no generic Authority spend. */
export const PRESIDENTIAL_INITIATIVE_LEVER_COSTS: Readonly<Record<PresidentialInitiativeLeverKind, number>> = {
  authorize_operation: 0,
  request_operation: 25,
  stop_operation: 25,
  deploy_elite_formation: 25,
  replace_corps_commander: 25,
};

export type PresidentialInitiativePredicate =
  | { kind: 'event_fired'; event_id: string }
  | { kind: 'event_flag_equals'; flag: string; value: boolean }
  | { kind: 'formation_active'; formation_id: string }
  | { kind: 'operation_active'; operation_name: string };

export interface PresidentialInitiativeRow {
  id: string;
  faction: FactionId;
  turn_window: { start: number; end: number };
  state_predicate: { all_of: PresidentialInitiativePredicate[] };
  source: {
    authority: 'BB1' | 'BB2' | 'UN' | 'IRMCT';
    locator: string;
    claim: string;
    supports_historical_default: boolean;
  };
  historical_default: 'accept' | 'decline' | null;
  presentation: 'optional_counterfactual' | 'historical_disposition';
  lever: { kind: PresidentialInitiativeLeverKind; authority_cost: number };
  cooldown_turns: number;
  once: boolean;
}

export interface PresidentialInitiativeRegistry {
  schema_version: 1;
  scenario_id: string;
  source_audit: {
    disposition: 'positive_hold' | 'supported_rows';
    report: string;
    evidence_ids: string[];
    rationale: string;
  };
  initiatives: PresidentialInitiativeRow[];
}

export interface PresidentialInitiativeReceipt {
  initiative_id: string;
  turn: number;
}

export interface EvaluatePresidentialInitiativeCadenceInput {
  registry: PresidentialInitiativeRegistry;
  state: GameState;
  faction: FactionId;
  turn: number;
  authority: { current: number; max: number };
  last_source_backed_review_turn: number | null;
  required_decision_count: number;
  pending_optional_initiative_ids: readonly string[];
  initiative_receipts: readonly PresidentialInitiativeReceipt[];
}

export type PresidentialInitiativeCadenceResult =
  | {
    kind: 'initiative';
    initiative: PresidentialInitiativeRow;
    historical_default: 'accept' | 'decline' | null;
  }
  | {
    kind: 'none';
    reason:
      | 'invalid_authority'
      | 'authority_below_threshold'
      | 'review_gap_too_short'
      | 'required_decision_pending'
      | 'optional_initiative_pending'
      | 'no_eligible_source_row';
  };

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${path} must be a non-empty string`);
  }
  return value.trim();
}

function integer(value: unknown, path: string, minimum = 0): number {
  if (!Number.isInteger(value) || (value as number) < minimum) {
    throw new Error(`${path} must be an integer >= ${minimum}`);
  }
  return value as number;
}

function booleanValue(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${path} must be boolean`);
  return value;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], path: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new Error(`${path} must be one of: ${allowed.join(', ')}`);
  }
  return value as T;
}

function parsePredicate(value: unknown, path: string): PresidentialInitiativePredicate {
  const row = record(value, path);
  const kind = enumValue(row.kind, [
    'event_fired',
    'event_flag_equals',
    'formation_active',
    'operation_active',
  ] as const, `${path}.kind`);
  if (kind === 'event_fired') {
    return { kind, event_id: stringValue(row.event_id, `${path}.event_id`) };
  }
  if (kind === 'event_flag_equals') {
    return {
      kind,
      flag: stringValue(row.flag, `${path}.flag`),
      value: booleanValue(row.value, `${path}.value`),
    };
  }
  if (kind === 'formation_active') {
    return { kind, formation_id: stringValue(row.formation_id, `${path}.formation_id`) };
  }
  return { kind, operation_name: stringValue(row.operation_name, `${path}.operation_name`) };
}

function parseInitiative(value: unknown, index: number): PresidentialInitiativeRow {
  const path = `initiatives[${index}]`;
  const row = record(value, path);
  const id = stringValue(row.id, `${path}.id`);
  if (!/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(id)) {
    throw new Error(`${path}.id must be stable lower_snake_case`);
  }
  const faction = enumValue(row.faction, ['RBiH', 'RS', 'HRHB'] as const, `${path}.faction`);
  const window = record(row.turn_window, `${path}.turn_window`);
  const start = integer(window.start, `${path}.turn_window.start`);
  const end = integer(window.end, `${path}.turn_window.end`);
  if (end < start) throw new Error(`${path}.turn_window.end must be >= start`);

  const predicate = record(row.state_predicate, `${path}.state_predicate`);
  if (!Array.isArray(predicate.all_of) || predicate.all_of.length === 0) {
    throw new Error(`${path}.state_predicate.all_of must contain at least one deterministic fact`);
  }
  const allOf = predicate.all_of.map((entry, predicateIndex) => (
    parsePredicate(entry, `${path}.state_predicate.all_of[${predicateIndex}]`)
  ));

  const source = record(row.source, `${path}.source`);
  const sourceAuthority = enumValue(source.authority, ['BB1', 'BB2', 'UN', 'IRMCT'] as const, `${path}.source.authority`);
  const supportsHistoricalDefault = booleanValue(
    source.supports_historical_default,
    `${path}.source.supports_historical_default`,
  );
  const historicalDefault = row.historical_default === null
    ? null
    : enumValue(row.historical_default, ['accept', 'decline'] as const, `${path}.historical_default`);
  const presentation = enumValue(
    row.presentation,
    ['optional_counterfactual', 'historical_disposition'] as const,
    `${path}.presentation`,
  );
  if (historicalDefault !== null && !supportsHistoricalDefault) {
    throw new Error(`${path} historical default requires explicit source support`);
  }
  if (historicalDefault === null && presentation !== 'optional_counterfactual') {
    throw new Error(`${path} without a historical default must be optional_counterfactual`);
  }
  if (historicalDefault !== null && presentation !== 'historical_disposition') {
    throw new Error(`${path} with a historical default must use historical_disposition presentation`);
  }

  const lever = record(row.lever, `${path}.lever`);
  const leverKind = enumValue(
    lever.kind,
    Object.keys(PRESIDENTIAL_INITIATIVE_LEVER_COSTS) as PresidentialInitiativeLeverKind[],
    `${path}.lever.kind`,
  );
  const authorityCost = integer(lever.authority_cost, `${path}.lever.authority_cost`);
  if (authorityCost !== PRESIDENTIAL_INITIATIVE_LEVER_COSTS[leverKind]) {
    throw new Error(`${path}.lever.authority_cost must match the existing ${leverKind} lever`);
  }

  return {
    id,
    faction,
    turn_window: { start, end },
    state_predicate: { all_of: allOf },
    source: {
      authority: sourceAuthority,
      locator: stringValue(source.locator, `${path}.source.locator`),
      claim: stringValue(source.claim, `${path}.source.claim`),
      supports_historical_default: supportsHistoricalDefault,
    },
    historical_default: historicalDefault,
    presentation,
    lever: { kind: leverKind, authority_cost: authorityCost },
    cooldown_turns: integer(row.cooldown_turns, `${path}.cooldown_turns`),
    once: booleanValue(row.once, `${path}.once`),
  };
}

/** Validate, normalize, and stable-sort an authored registry. */
export function parsePresidentialInitiativeRegistry(value: unknown): PresidentialInitiativeRegistry {
  const root = record(value, 'presidential initiative registry');
  if (root.schema_version !== 1) throw new Error('presidential initiative registry schema_version must be 1');
  const scenarioId = stringValue(root.scenario_id, 'scenario_id');
  const audit = record(root.source_audit, 'source_audit');
  const disposition = enumValue(
    audit.disposition,
    ['positive_hold', 'supported_rows'] as const,
    'source_audit.disposition',
  );
  const report = stringValue(audit.report, 'source_audit.report');
  if (!report.startsWith('docs/')) throw new Error('source_audit.report must be a repository documentation path');
  if (!Array.isArray(audit.evidence_ids) || audit.evidence_ids.length === 0) {
    throw new Error('source_audit.evidence_ids must contain at least one evidence identifier');
  }
  const evidenceIds = audit.evidence_ids
    .map((entry, index) => stringValue(entry, `source_audit.evidence_ids[${index}]`))
    .sort(strictCompare);
  if (!Array.isArray(root.initiatives)) throw new Error('initiatives must be an array');
  const initiatives = root.initiatives.map(parseInitiative).sort((left, right) => strictCompare(left.id, right.id));
  const ids = new Set<string>();
  for (const row of initiatives) {
    if (ids.has(row.id)) throw new Error(`initiative id must be unique: ${row.id}`);
    ids.add(row.id);
  }
  if (disposition === 'positive_hold' && initiatives.length > 0) {
    throw new Error('positive_hold source audit cannot admit initiative rows');
  }
  return {
    schema_version: 1,
    scenario_id: scenarioId,
    source_audit: {
      disposition,
      report,
      evidence_ids: evidenceIds,
      rationale: stringValue(audit.rationale, 'source_audit.rationale'),
    },
    initiatives,
  };
}

export const APR1992_PRESIDENTIAL_INITIATIVE_REGISTRY = parsePresidentialInitiativeRegistry(rawApr1992Registry);

/**
 * Runtime source gate for the currently shipped catalog.
 *
 * Phase 2 intentionally wires only the accepted empty/positive-hold
 * disposition. A later supported row must first be connected to the owner of
 * its named existing lever; otherwise it would surface a choice whose action
 * semantics are fictional or incomplete. Throwing is the deterministic,
 * fail-closed outcome for that authoring error.
 */
export function assertPresidentialInitiativeRuntimeCatalog(
  registry: PresidentialInitiativeRegistry = APR1992_PRESIDENTIAL_INITIATIVE_REGISTRY,
): 'positive_hold' {
  if (registry.source_audit.disposition !== 'positive_hold' || registry.initiatives.length !== 0) {
    throw new Error('Presidential initiative rows must be wired to their existing lever owner before runtime');
  }
  return 'positive_hold';
}

// Validate the shipped authoring disposition at module initialization. This
// fails closed before a future supported row can reach any runtime owner while
// keeping the accepted zero-row catalog entirely out of TurnReport ordering.
assertPresidentialInitiativeRuntimeCatalog();

function predicateMatches(predicate: PresidentialInitiativePredicate, state: GameState): boolean {
  if (predicate.kind === 'event_fired') {
    return (state.military?.fired_event_ids ?? []).includes(predicate.event_id);
  }
  if (predicate.kind === 'event_flag_equals') {
    return state.military?.event_flags?.[predicate.flag] === predicate.value;
  }
  if (predicate.kind === 'formation_active') {
    const formation = state.military?.formations?.[predicate.formation_id];
    return formation !== undefined && formation.status === 'active';
  }
  for (const corpsId of Object.keys(state.military?.corps_command ?? {}).sort(strictCompare)) {
    const operations = state.military?.corps_command?.[corpsId]?.active_operations ?? [];
    if (operations.some((operation) => operation.name === predicate.operation_name)) return true;
  }
  return false;
}

function rowEligible(
  row: PresidentialInitiativeRow,
  input: EvaluatePresidentialInitiativeCadenceInput,
): boolean {
  if (row.faction !== input.faction) return false;
  if (input.turn < row.turn_window.start || input.turn > row.turn_window.end) return false;
  if (row.lever.authority_cost > input.authority.current) return false;
  if (!row.state_predicate.all_of.every((predicate) => predicateMatches(predicate, input.state))) return false;

  const priorTurns = input.initiative_receipts
    .filter((receipt) => receipt.initiative_id === row.id && Number.isInteger(receipt.turn))
    .map((receipt) => receipt.turn)
    .sort((left, right) => left - right);
  if (row.once && priorTurns.length > 0) return false;
  const lastTurn = priorTurns[priorTurns.length - 1];
  if (lastTurn !== undefined && input.turn - lastTurn < row.cooldown_turns) return false;
  return true;
}

/**
 * Pure cadence decision. It selects zero or one authored initiative. The
 * existing `presidentialCadenceHold.ts` selector remains the single owner of
 * quiet-week/positive-hold presentation; this evaluator never creates a
 * competing hold predicate.
 */
export function evaluatePresidentialInitiativeCadence(
  input: EvaluatePresidentialInitiativeCadenceInput,
): PresidentialInitiativeCadenceResult {
  const { current, max } = input.authority;
  if (!Number.isFinite(current) || !Number.isFinite(max) || max <= 0 || current < 0) {
    return { kind: 'none', reason: 'invalid_authority' };
  }
  if (current / max < PRESIDENTIAL_INITIATIVE_NEAR_CAP_FRACTION) {
    return { kind: 'none', reason: 'authority_below_threshold' };
  }
  const lastReviewTurn = input.last_source_backed_review_turn;
  const reviewGap = lastReviewTurn === null ? input.turn : input.turn - lastReviewTurn;
  if (!Number.isInteger(reviewGap) || reviewGap < PRESIDENTIAL_INITIATIVE_MIN_REVIEW_GAP_TURNS) {
    return { kind: 'none', reason: 'review_gap_too_short' };
  }
  if (input.required_decision_count > 0) {
    return { kind: 'none', reason: 'required_decision_pending' };
  }
  if (input.pending_optional_initiative_ids.length > 0) {
    return { kind: 'none', reason: 'optional_initiative_pending' };
  }

  const initiative = input.registry.initiatives
    .filter((row) => rowEligible(row, input))
    .sort((left, right) => strictCompare(left.id, right.id))[0];
  if (initiative) {
    return {
      kind: 'initiative',
      initiative,
      historical_default: initiative.historical_default,
    };
  }

  return { kind: 'none', reason: 'no_eligible_source_row' };
}
