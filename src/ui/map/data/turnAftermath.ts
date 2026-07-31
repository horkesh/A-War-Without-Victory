import type { LoadedGameState } from './types';
import type { TurnBattle, TurnSummary } from '../../../state/turn_summary.js';
import { countActionableItems, deriveInboxItems, effectiveInboxSeverity, type InboxItem } from './inboxItems';
import { getDecisionSurfaceForInboxType } from './decisionSurfaceRegistry';
import { shouldNarrateTerritorySummary } from './territorySummaryGuard';
import { turnToDateString } from '../utils/formatters';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { t, type MessageKey } from '../i18n';
import { playerFactionMatch } from './playerFactionMatch';

export type TurnAftermathTone = 'gain' | 'loss' | 'mixed' | 'quiet';
export type TurnAftermathCostSeverity = 'low' | 'moderate' | 'severe' | 'critical';
export type TurnAftermathSignalKind = 'event' | 'decoration' | 'arc' | 'supply' | 'movement';
export type TurnAftermathSignalSeverity = 'routine' | 'notable' | 'urgent';
export type TurnAftermathCampaignMomentum = 'advancing' | 'contested' | 'bleeding' | 'quiet';
export type TurnAftermathRecordFilter = 'all' | 'hard' | 'signals' | 'actions' | 'territory';
export type TurnAftermathMemoryTone = 'cost' | 'signal' | 'action' | 'territory' | 'quiet';
export type TurnAftermathMemorySurface = 'chronicle' | 'codex' | 'records';

export interface TurnAftermathReportInput {
  turn?: number;
  player_faction?: string | null;
}

export interface TurnAftermathBuildInput {
  previousState?: LoadedGameState | null;
  nextState: LoadedGameState | null;
  lastTurnReport?: TurnAftermathReportInput | null;
  osidNameMap?: Record<string, string> | null;
  includeNextActions?: boolean;
  includeCurrentCommandState?: boolean;
}

export interface TurnAftermathRecordsInput {
  state: LoadedGameState | null;
  osidNameMap?: Record<string, string> | null;
  limit?: number;
}

export interface TurnAftermathFlipView {
  osid: string;
  label: string;
  direction: 'gain' | 'loss' | 'other';
  significance: string;
  from?: string | null;
  to?: string | null;
}

export interface TurnAftermathTopAction {
  id: string;
  type: InboxItem['type'];
  severity: InboxItem['severity'];
  title: string;
  detail?: string;
  action: InboxItem['action'];
  actionLabel: string;
}

export interface TurnAftermathCostView {
  friendlyMilitaryCasualties: number;
  theaterMilitaryCasualties: number;
  displacedThisTurn: number;
  ownFormationsDestroyed: number;
  ownSupplySpent: number;
  ownHeavyMunitionsSpent: number;
  severity: TurnAftermathCostSeverity;
  reasons: string[];
}

export interface TurnAftermathSignalView {
  id: string;
  kind: TurnAftermathSignalKind;
  label: string;
  detail: string;
  severity: TurnAftermathSignalSeverity;
}

export interface TurnAftermathJudgmentView {
  headline: string;
  detail: string;
  memoryTone: TurnAftermathMemoryTone;
  primarySurface: TurnAftermathMemorySurface;
  secondarySurface: TurnAftermathMemorySurface;
}

export interface TurnAftermathCommandRecordView {
  directives: Array<{
    label: string;
    rationale: string;
  }>;
  rows: Array<{
    id: string;
    corpsName: string;
    officerName: string;
    assignedRole: string;
    interpretation: 'as_issued' | 'reinterpreted' | 'unreported';
    interpretationDetail: string;
    action: string;
    actionDetail: string;
  }>;
}

export interface TurnAftermathLedgerSummary {
  recordCount: number;
  netFriendlyTerritory: number;
  totalFriendlyMilitaryCasualties: number;
  totalTheaterMilitaryCasualties: number;
  totalDisplaced: number;
  totalOwnFormationsDestroyed: number;
  criticalTurns: number;
  severeTurns: number;
}

export interface TurnAftermathCampaignPulse {
  recordCount: number;
  windowLabel: string;
  momentum: TurnAftermathCampaignMomentum;
  briefing: string;
  netFriendlyTerritory: number;
  totalFriendlyMilitaryCasualties: number;
  totalTheaterMilitaryCasualties: number;
  totalDisplaced: number;
  hardTurnCount: number;
  signalCount: number;
  eventCount: number;
  decorationCount: number;
}

export interface TurnAftermathCampaignCostView {
  recordCount: number;
  windowLabel: string;
  severity: TurnAftermathCostSeverity;
  headline: string;
  briefing: string;
  netFriendlyTerritory: number;
  totalFriendlyMilitaryCasualties: number;
  totalOpposingMilitaryCasualties: number;
  totalTheaterMilitaryCasualties: number;
  totalDisplaced: number;
  totalOwnFormationsDestroyed: number;
  hardTurnCount: number;
  averageFriendlyMilitaryCasualties: number;
  casualtyExchangeRatio: number | null;
  displayFriendlyMilitaryCasualties: number;
  friendlyMilitaryCasualtyScope: 'campaign_ledger' | 'turn_archive';
  topDrivers: string[];
  mostCostlyTurn: {
    turn: number;
    dateLabel: string;
    severity: TurnAftermathCostSeverity;
    friendlyMilitaryCasualties: number;
    displacedThisTurn: number;
    ownFormationsDestroyed: number;
    headline: string;
  } | null;
}

export interface TurnAftermathView {
  turn: number;
  dateLabel: string;
  playerFaction: string | null;
  headline: string;
  narrativeLine: string;
  tone: TurnAftermathTone;
  territory: {
    friendlyNet: number;
    gains: number;
    losses: number;
    breakdownComplete: boolean;
    notable: TurnAftermathFlipView[];
  };
  combat: {
    battleCount: number;
    friendlyBattleCount: number;
    friendlyCasualties: number;
    opposingCasualties: number;
    territoryFlipsFromBattles: number;
  };
  humanitarian: {
    displacedThisTurn: number;
    hotspotLabel?: string;
  };
  formations: {
    spawned: number;
    destroyed: number;
    ownSpawned: number;
    ownDestroyed: number;
  };
  supply: {
    ownSupplyDelta: number;
    ownHeavyMunitionsDelta: number;
  };
  cost: TurnAftermathCostView;
  signals: TurnAftermathSignalView[];
  commandRecord: TurnAftermathCommandRecordView;
  judgment: TurnAftermathJudgmentView;
  nextActions: {
    actionableCount: number;
    blockingCount: number;
    opportunityCount: number;
    reserveCount: number;
    officerCount: number;
    eventDecisionCount: number;
    peaceCount: number;
    topItems: TurnAftermathTopAction[];
  };
}

export interface TurnAftermathDigest {
  headline: string;
}

export type TurnAftermathWeight = 'quiet' | 'heavy';

const TURN_AFTERMATH_VIEW_KEYS = [
  'turn',
  'dateLabel',
  'playerFaction',
  'headline',
  'narrativeLine',
  'tone',
  'territory',
  'combat',
  'humanitarian',
  'formations',
  'supply',
  'cost',
  'signals',
  'commandRecord',
  'judgment',
  'nextActions',
] as const;
const TURN_AFTERMATH_TERRITORY_KEYS = ['friendlyNet', 'gains', 'losses', 'breakdownComplete', 'notable'] as const;
const TURN_AFTERMATH_FLIP_KEYS = ['osid', 'label', 'direction', 'significance', 'from', 'to'] as const;
const TURN_AFTERMATH_COMBAT_KEYS = ['battleCount', 'friendlyBattleCount', 'friendlyCasualties', 'opposingCasualties', 'territoryFlipsFromBattles'] as const;
const TURN_AFTERMATH_HUMANITARIAN_KEYS = ['displacedThisTurn', 'hotspotLabel'] as const;
const TURN_AFTERMATH_FORMATION_KEYS = ['spawned', 'destroyed', 'ownSpawned', 'ownDestroyed'] as const;
const TURN_AFTERMATH_SUPPLY_KEYS = ['ownSupplyDelta', 'ownHeavyMunitionsDelta'] as const;
const TURN_AFTERMATH_COST_KEYS = [
  'friendlyMilitaryCasualties',
  'theaterMilitaryCasualties',
  'displacedThisTurn',
  'ownFormationsDestroyed',
  'ownSupplySpent',
  'ownHeavyMunitionsSpent',
  'severity',
  'reasons',
] as const;
const TURN_AFTERMATH_SIGNAL_KEYS = ['id', 'kind', 'label', 'detail', 'severity'] as const;
const TURN_AFTERMATH_COMMAND_RECORD_KEYS = ['directives', 'rows'] as const;
const TURN_AFTERMATH_COMMAND_DIRECTIVE_KEYS = ['label', 'rationale'] as const;
const TURN_AFTERMATH_COMMAND_ROW_KEYS = [
  'id',
  'corpsName',
  'officerName',
  'assignedRole',
  'interpretation',
  'interpretationDetail',
  'action',
  'actionDetail',
] as const;
const TURN_AFTERMATH_JUDGMENT_KEYS = ['headline', 'detail', 'memoryTone', 'primarySurface', 'secondarySurface'] as const;
const TURN_AFTERMATH_NEXT_ACTION_KEYS = [
  'actionableCount',
  'blockingCount',
  'opportunityCount',
  'reserveCount',
  'officerCount',
  'eventDecisionCount',
  'peaceCount',
  'topItems',
] as const;
const TURN_AFTERMATH_TOP_ACTION_KEYS = ['id', 'type', 'severity', 'title', 'detail', 'action', 'actionLabel'] as const;

function hasOnlyKeys(value: unknown, allowedKeys: readonly string[]): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const allowed = new Set<string>(allowedKeys);
  return Object.keys(value as Record<string, unknown>).every((key) => allowed.has(key));
}

function arrayItemsHaveOnlyKeys(values: unknown, allowedKeys: readonly string[]): boolean {
  return Array.isArray(values) && values.every((value) => hasOnlyKeys(value, allowedKeys));
}

function hasRecognizedTurnAftermathShape(view: TurnAftermathView): boolean {
  return hasOnlyKeys(view, TURN_AFTERMATH_VIEW_KEYS)
    && hasOnlyKeys(view.territory, TURN_AFTERMATH_TERRITORY_KEYS)
    && arrayItemsHaveOnlyKeys(view.territory.notable, TURN_AFTERMATH_FLIP_KEYS)
    && hasOnlyKeys(view.combat, TURN_AFTERMATH_COMBAT_KEYS)
    && hasOnlyKeys(view.humanitarian, TURN_AFTERMATH_HUMANITARIAN_KEYS)
    && hasOnlyKeys(view.formations, TURN_AFTERMATH_FORMATION_KEYS)
    && hasOnlyKeys(view.supply, TURN_AFTERMATH_SUPPLY_KEYS)
    && hasOnlyKeys(view.cost, TURN_AFTERMATH_COST_KEYS)
    && Array.isArray(view.cost.reasons)
    && arrayItemsHaveOnlyKeys(view.signals, TURN_AFTERMATH_SIGNAL_KEYS)
    && hasOnlyKeys(view.commandRecord, TURN_AFTERMATH_COMMAND_RECORD_KEYS)
    && arrayItemsHaveOnlyKeys(view.commandRecord.directives, TURN_AFTERMATH_COMMAND_DIRECTIVE_KEYS)
    && arrayItemsHaveOnlyKeys(view.commandRecord.rows, TURN_AFTERMATH_COMMAND_ROW_KEYS)
    && hasOnlyKeys(view.judgment, TURN_AFTERMATH_JUDGMENT_KEYS)
    && hasOnlyKeys(view.nextActions, TURN_AFTERMATH_NEXT_ACTION_KEYS)
    && arrayItemsHaveOnlyKeys(view.nextActions.topItems, TURN_AFTERMATH_TOP_ACTION_KEYS);
}

export function classifyTurnAftermathWeight(view: TurnAftermathView): TurnAftermathWeight {
  if (!hasRecognizedTurnAftermathShape(view)) return 'heavy';
  if (view.nextActions.actionableCount > 0 || view.nextActions.blockingCount > 0 || view.nextActions.topItems.length > 0) return 'heavy';
  if (view.nextActions.eventDecisionCount > 0 || view.nextActions.peaceCount > 0) return 'heavy';
  if (view.signals.length > 0) return 'heavy';
  if (view.commandRecord.directives.length > 0 || view.commandRecord.rows.length > 0) return 'heavy';
  if (view.territory.friendlyNet !== 0 || view.territory.gains > 0 || view.territory.losses > 0 || view.territory.notable.length > 0) return 'heavy';
  if (view.combat.battleCount > 0 || view.combat.friendlyBattleCount > 0 || view.combat.territoryFlipsFromBattles > 0) return 'heavy';
  if (view.combat.friendlyCasualties > 0 || view.combat.opposingCasualties > 0) return 'heavy';
  if (view.humanitarian.displacedThisTurn > 0 || view.humanitarian.hotspotLabel) return 'heavy';
  if (view.formations.ownDestroyed > 0 || view.cost.ownFormationsDestroyed > 0) return 'heavy';
  if (view.cost.friendlyMilitaryCasualties > 0 || view.cost.theaterMilitaryCasualties > 0 || view.cost.displacedThisTurn > 0) return 'heavy';
  if (view.cost.severity === 'critical' || view.cost.severity === 'severe') return 'heavy';
  return 'quiet';
}

export function buildTurnAftermathDigest(_view: TurnAftermathView): TurnAftermathDigest {
  return {
    headline: t('aftermath.digest.quiet'),
  };
}

function strictStringCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function humanizeToken(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function sentenceCaseToken(value: string): string {
  const humanized = humanizeToken(value) ?? value;
  return humanized.charAt(0) + humanized.slice(1).toLowerCase();
}

const COMMAND_ROLE_KEYS: Record<string, MessageKey> = {
  primary: 'turnAftermath.commandRecord.role.primary',
  secondary: 'turnAftermath.commandRecord.role.secondary',
  economy: 'turnAftermath.commandRecord.role.economy',
  contain: 'turnAftermath.commandRecord.role.contain',
};

const COMMAND_DEVIATION_KEYS: Record<string, MessageKey> = {
  aggressive_preference: 'turnAftermath.commandRecord.deviation.aggressive',
  cautious_preference: 'turnAftermath.commandRecord.deviation.cautious',
  compliance_score_low: 'turnAftermath.commandRecord.deviation.lowCompliance',
};

const COMMAND_ACTION_KEYS: Record<string, MessageKey> = {
  created: 'turnAftermath.commandRecord.action.created',
  advanced: 'turnAftermath.commandRecord.action.advanced',
  suspended: 'turnAftermath.commandRecord.action.suspended',
  abandoned: 'turnAftermath.commandRecord.action.abandoned',
  launched: 'turnAftermath.commandRecord.action.launched',
  none: 'turnAftermath.commandRecord.action.none',
};

function buildCommandRecord(
  state: LoadedGameState,
  turn: number,
  includeCurrentCommandState: boolean,
): TurnAftermathCommandRecordView {
  const playerFaction = state.player_faction ?? null;
  const directives = (playerFaction ? state.armyCoDecisionTraces?.[playerFaction] ?? [] : [])
    .filter((trace) => trace.turn === turn)
    .map((trace) => ({
      label: sentenceCaseToken(trace.campaign_role),
      rationale: trace.rationale || t('turnAftermath.commandRecord.unreported'),
    }));

  if (!includeCurrentCommandState || !playerFaction) return { directives, rows: [] };

  const formationById = new Map(state.formations.map((formation) => [formation.id, formation]));
  const directiveByCorps = new Map(
    (state.armyCorpsDirectives ?? [])
      .filter((directive) => formationById.get(directive.corpsId)?.faction === playerFaction)
      .map((directive) => [directive.corpsId, directive]),
  );
  const actionByCorps = new Map(
    (state.corpsCommanderActions ?? [])
      .filter((action) => action.turn === turn)
      .filter((action) => formationById.get(action.corpsId)?.faction === playerFaction)
      .map((action) => [action.corpsId, action]),
  );
  const corpsIds = [...new Set([...directiveByCorps.keys(), ...actionByCorps.keys()])].sort(strictStringCompare);
  const officers = [...(state.namedOfficerData ?? [])]
    .filter((officer) => officer.faction === playerFaction && officer.status === 'active')
    .sort((a, b) => strictStringCompare(a.id, b.id));

  const rows: TurnAftermathCommandRecordView['rows'] = corpsIds.map((corpsId) => {
    const formation = formationById.get(corpsId);
    const directive = directiveByCorps.get(corpsId);
    const action = actionByCorps.get(corpsId);
    const officer = officers.find((candidate) => candidate.assigned_corps_id === corpsId);
    const interpretation = directive
      ? directive.deviated ? 'reinterpreted' : 'as_issued'
      : 'unreported';
    const interpretationDetail = directive
      ? directive.deviated
        ? t(COMMAND_DEVIATION_KEYS[directive.deviationReason ?? '']
          ?? 'turnAftermath.commandRecord.deviation.unreported')
        : t('turnAftermath.commandRecord.asIssuedDetail')
      : t('turnAftermath.commandRecord.unreported');
    return {
      id: corpsId,
      corpsName: formation?.name || t('turnAftermath.commandRecord.corpsFallback'),
      officerName: officer?.name || t('turnAftermath.commandRecord.staffFallback'),
      assignedRole: directive
        ? t(COMMAND_ROLE_KEYS[directive.role] ?? 'turnAftermath.commandRecord.unreported')
        : t('turnAftermath.commandRecord.unreported'),
      interpretation,
      interpretationDetail,
      action: action
        ? t(COMMAND_ACTION_KEYS[action.action] ?? 'turnAftermath.commandRecord.unreported')
        : t('turnAftermath.commandRecord.unreported'),
      actionDetail: action?.reason || t('turnAftermath.commandRecord.unreported'),
    };
  });

  return { directives, rows };
}

function notableEventKindLabel(kind: string | undefined): string {
  switch (kind) {
    case 'truce_broken':
      return t('turnAftermath.signal.detail.truceBroken');
    case 'siege_formed':
      return t('turnAftermath.signal.detail.siegeFormed');
    case 'territory_shift':
      return t('turnAftermath.signal.detail.territoryShift');
    case 'operation_completed':
      return t('turnAftermath.signal.detail.operationCompleted');
    default:
      return t('turnAftermath.signal.detail.notableEvent');
  }
}

function decorationLabel(decoration: string | undefined): string {
  switch (decoration) {
    case 'order_of_hero':
      return t('turnAftermath.signal.detail.decorationHero');
    case 'citation':
    case 'unit_citation':
      return t('turnAftermath.signal.detail.decorationCitation');
    default:
      return t('turnAftermath.signal.detail.decoration');
  }
}

function arcLabel(arc: string | undefined): string {
  switch (arc) {
    case 'recruiting':
      return t('turnAftermath.signal.detail.arcRecruiting');
    case 'green':
      return t('turnAftermath.signal.detail.arcGreen');
    case 'blooded':
      return t('turnAftermath.signal.detail.arcBlooded');
    case 'veteran':
      return t('turnAftermath.signal.detail.arcVeteran');
    case 'exhausted':
      return t('turnAftermath.signal.detail.arcExhausted');
    default:
      return t('turnAftermath.signal.detail.arcChanged');
  }
}

function supplyStateLabel(state: string | undefined): string {
  switch (state) {
    case 'secure':
      return t('turnAftermath.signal.detail.supplySecure');
    case 'strained':
      return t('turnAftermath.signal.detail.supplyStrained');
    case 'critical':
      return t('turnAftermath.signal.detail.supplyCritical');
    case 'isolated':
      return t('turnAftermath.signal.detail.supplyIsolated');
    default:
      return t('turnAftermath.signal.detail.supplyChanged');
  }
}

function getPlayerFaction(input: TurnAftermathBuildInput): string | null {
  return input.nextState?.player_faction ?? input.lastTurnReport?.player_faction ?? null;
}

function classifyTone(friendlyNet: number, gains: number, losses: number): TurnAftermathTone {
  if (friendlyNet > 0) return 'gain';
  if (friendlyNet < 0) return 'loss';
  if (gains > 0 || losses > 0) return 'mixed';
  return 'quiet';
}

function buildHeadline(tone: TurnAftermathTone, friendlyNet: number, hasSummary: boolean): string {
  if (!hasSummary) return t('turnAftermath.headline.advanced');
  if (tone === 'gain') return t('turnAftermath.headline.gain', { net: `+${friendlyNet}` });
  if (tone === 'loss') return t('turnAftermath.headline.loss', { net: friendlyNet });
  if (tone === 'mixed') return t('turnAftermath.headline.mixed');
  return t('turnAftermath.headline.quiet');
}

function buildNarrativeLine(tone: TurnAftermathTone, actionableCount: number): string {
  if (tone === 'gain') return t('turnAftermath.narrative.gain');
  if (tone === 'loss') {
    return t(actionableCount > 0
      ? 'turnAftermath.narrative.lossAction'
      : 'turnAftermath.narrative.lossHold');
  }
  if (tone === 'mixed') return t('turnAftermath.narrative.mixed');
  return t('turnAftermath.narrative.quiet');
}

function reportedNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function summarizeBattleForFaction(battle: TurnBattle, playerFaction: string | null): {
  involved: boolean;
  friendlyCasualties: number;
  opposingCasualties: number;
} {
  if (!playerFaction) {
    return { involved: false, friendlyCasualties: 0, opposingCasualties: 0 };
  }
  if (battle.attacker_faction === playerFaction) {
    return {
      involved: true,
      friendlyCasualties: reportedNumber(battle.attacker_casualties) ?? 0,
      opposingCasualties: reportedNumber(battle.defender_casualties) ?? 0,
    };
  }
  if (battle.defender_faction === playerFaction) {
    return {
      involved: true,
      friendlyCasualties: reportedNumber(battle.defender_casualties) ?? 0,
      opposingCasualties: reportedNumber(battle.attacker_casualties) ?? 0,
    };
  }
  return { involved: false, friendlyCasualties: 0, opposingCasualties: 0 };
}

function buildNextActions(state: LoadedGameState, osidNameMap: Record<string, string> | null): TurnAftermathView['nextActions'] {
  const inboxItems = deriveInboxItems(state, osidNameMap);
  const actionableItems = inboxItems.filter((item) => item.type !== 'situation');
  const severityPriority: Record<InboxItem['severity'], number> = {
    blocking: 0,
    urgent: 1,
    normal: 2,
    info: 3,
  };
  const actionableItemsWithSeverity = actionableItems.map((item) => ({
    item,
    severity: effectiveInboxSeverity(item),
  })).sort((a, b) => (
    severityPriority[a.severity] - severityPriority[b.severity]
    || a.item.priority - b.item.priority
    || strictStringCompare(a.item.id, b.item.id)
  ));
  return {
    actionableCount: countActionableItems(inboxItems),
    blockingCount: actionableItemsWithSeverity.filter(({ severity }) => severity === 'blocking').length,
    opportunityCount: actionableItems.filter((item) => item.type === 'operation_opportunity').length,
    reserveCount: actionableItems.filter((item) => item.type === 'reserve_request').length,
    officerCount: actionableItems.filter((item) => item.type === 'officer_event').length,
    eventDecisionCount: actionableItems.filter((item) => item.type === 'event_decision').length,
    peaceCount: actionableItems.filter((item) => item.type === 'peace_plan').length,
    topItems: actionableItemsWithSeverity.slice(0, 6).map(({ item, severity }) => ({
      id: item.id,
      type: item.type,
      severity,
      title: item.title,
      detail: item.subtitle,
      action: item.action,
      actionLabel: getDecisionSurfaceForInboxType(item.type)?.actionLabel ?? t('records.actionType.reviewItem'),
    })),
  };
}

function costReason(key: MessageKey, count: number): string {
  return t(key, { count });
}

function buildTurnCost(input: {
  summary: TurnSummary | null;
  playerFaction: string | null;
  friendlyMilitaryCasualties: number;
  ownFormationsDestroyed: number;
}): TurnAftermathCostView {
  const theaterMilitaryCasualties = (input.summary?.battles ?? []).reduce(
    (total, battle) => total
      + (reportedNumber(battle.attacker_casualties) ?? 0)
      + (reportedNumber(battle.defender_casualties) ?? 0),
    0,
  );
  const ownSupplyDelta = input.playerFaction
    ? (input.summary?.supply_deltas?.[input.playerFaction] ?? 0)
    : 0;
  const ownHeavyMunitionsDelta = input.playerFaction
    ? (input.summary?.heavy_munitions_deltas?.[input.playerFaction] ?? 0)
    : 0;
  const ownSupplySpent = Math.max(0, -ownSupplyDelta);
  const ownHeavyMunitionsSpent = Math.max(0, -ownHeavyMunitionsDelta);
  const displacedThisTurn = reportedNumber(input.summary?.displacement_total) ?? 0;

  let severity: TurnAftermathCostSeverity = 'low';
  if (
    input.ownFormationsDestroyed > 0
    || input.friendlyMilitaryCasualties >= 100
    || displacedThisTurn >= 1000
  ) {
    severity = 'critical';
  } else if (
    input.friendlyMilitaryCasualties >= 50
    || displacedThisTurn >= 500
    || ownSupplySpent + ownHeavyMunitionsSpent >= 10
  ) {
    severity = 'severe';
  } else if (
    input.friendlyMilitaryCasualties > 0
    || theaterMilitaryCasualties > 0
    || displacedThisTurn > 0
    || ownSupplySpent + ownHeavyMunitionsSpent > 0
  ) {
    severity = 'moderate';
  }

  const reasons: string[] = [];
  if (input.friendlyMilitaryCasualties > 0) {
    reasons.push(costReason(
      input.friendlyMilitaryCasualties === 1 ? 'turnAftermath.cost.reason.friendlyCasualty.one' : 'turnAftermath.cost.reason.friendlyCasualty.many',
      input.friendlyMilitaryCasualties,
    ));
  }
  if (input.ownFormationsDestroyed > 0) {
    reasons.push(costReason(
      input.ownFormationsDestroyed === 1 ? 'turnAftermath.cost.reason.formationDestroyed.one' : 'turnAftermath.cost.reason.formationDestroyed.many',
      input.ownFormationsDestroyed,
    ));
  }
  if (displacedThisTurn > 0) {
    reasons.push(costReason('turnAftermath.cost.reason.displaced', displacedThisTurn));
  }
  if (reasons.length === 0 && ownSupplySpent + ownHeavyMunitionsSpent > 0) {
    reasons.push(costReason('turnAftermath.cost.reason.supplySpent', ownSupplySpent + ownHeavyMunitionsSpent));
  }
  if (reasons.length === 0) {
    reasons.push(t('turnAftermath.cost.reason.none'));
  }

  return {
    friendlyMilitaryCasualties: input.friendlyMilitaryCasualties,
    theaterMilitaryCasualties,
    displacedThisTurn,
    ownFormationsDestroyed: input.ownFormationsDestroyed,
    ownSupplySpent,
    ownHeavyMunitionsSpent,
    severity,
    reasons,
  };
}

function buildStrategicSignals(
  summary: TurnSummary | null,
  osidNameMap: Record<string, string> | null,
  state: LoadedGameState | null,
  playerFaction: string | null,
): TurnAftermathSignalView[] {
  if (!summary) return [];

  const signals: TurnAftermathSignalView[] = [];

  for (const event of summary.events_fired) {
    if (!shouldRenderTurnSummaryEventSignal(state, event.id, playerFaction)) continue;
    signals.push({
      id: `event:${event.id}`,
      kind: 'event',
      label: event.text,
      detail: t('turnAftermath.signal.detail.historicalEvent'),
      severity: 'notable',
    });
  }

  summary.notable_events.forEach((event, index) => {
    const kindLabel = notableEventKindLabel(event.kind);
    const osidLabel = event.osid ? getOsidDisplayName(event.osid, osidNameMap) : null;
    const urgentKinds = new Set(['truce_broken', 'siege_formed']);
    signals.push({
      id: `notable:${event.kind}:${event.osid ?? 'none'}:${index}`,
      kind: 'event',
      label: event.description,
      detail: osidLabel ? `${kindLabel} / ${osidLabel}` : kindLabel,
      severity: urgentKinds.has(event.kind) ? 'urgent' : 'notable',
    });
  });

  summary.decoration_awards.forEach((award, index) => {
    const decoration = award.decoration;
    signals.push({
      id: `decoration:${award.formation_id}:${decoration.tier}:${decoration.awarded_turn}:${index}`,
      kind: 'decoration',
      label: t('turnAftermath.signal.label.decorated', { formation: award.formation_name }),
      detail: decorationLabel(decoration.tier),
      severity: 'notable',
    });
  });

  for (const arc of summary.arc_transitions) {
    const from = arcLabel(String(arc.from_arc));
    const to = arcLabel(String(arc.to_arc));
    signals.push({
      id: `arc:${arc.formation_id}:${arc.from_arc}:${arc.to_arc}`,
      kind: 'arc',
      label: t('turnAftermath.signal.label.changedArc', { formation: arc.formation_name }),
      detail: `${from} -> ${to}`,
      severity: 'routine',
    });
  }

  summary.supply_transitions.forEach((transition, index) => {
    const label = getOsidDisplayName(transition.osid, osidNameMap);
    const toState = transition.to.toLowerCase();
    signals.push({
      id: `supply:${transition.osid}:${transition.from}:${transition.to}:${index}`,
      kind: 'supply',
      label: t('turnAftermath.signal.label.supplyChanged', { label }),
      detail: `${supplyStateLabel(transition.from)} -> ${supplyStateLabel(transition.to)}`,
      severity: toState.includes('critical') || toState.includes('strained') ? 'urgent' : 'routine',
    });
  });

  summary.movements.slice(0, 6).forEach((movement) => {
    const from = getOsidDisplayName(movement.from_osid, osidNameMap);
    const to = getOsidDisplayName(movement.to_osid, osidNameMap);
    signals.push({
      id: `movement:${movement.formation_id}:${movement.from_osid}:${movement.to_osid}`,
      kind: 'movement',
      label: t('turnAftermath.signal.label.moved', { formation: movement.formation_name }),
      detail: `${from} -> ${to}`,
      severity: 'routine',
    });
  });

  return signals.slice(0, 12);
}

type TurnAftermathDecisionLogEntry = {
  event_id?: unknown;
  decision_source?: unknown;
  faction?: string | null;
};

type TurnAftermathPendingDecision = {
  event_id?: unknown;
  faction?: string | null;
};

function rawTurnAftermathDecisionLog(state: LoadedGameState | null): TurnAftermathDecisionLogEntry[] | null {
  const rawLog = state?.rawGameState?.military?.event_decision_log;
  return Array.isArray(rawLog) ? rawLog as TurnAftermathDecisionLogEntry[] : null;
}

function collectTurnAftermathPendingDecisions(state: LoadedGameState | null): TurnAftermathPendingDecision[] {
  const decisions: TurnAftermathPendingDecision[] = [];
  if (Array.isArray(state?.pendingEventDecisions)) {
    decisions.push(...state.pendingEventDecisions);
  }
  const rawPending = state?.rawGameState?.military?.pending_event_decisions;
  if (Array.isArray(rawPending)) {
    decisions.push(...rawPending as TurnAftermathPendingDecision[]);
  }
  return decisions;
}

function hasPendingTurnAftermathDecision(state: LoadedGameState | null, eventId: string): boolean {
  return collectTurnAftermathPendingDecisions(state).some((decision) => decision.event_id === eventId);
}

function hasPlayerFiledTurnAftermathDecision(
  log: readonly TurnAftermathDecisionLogEntry[],
  eventId: string,
  playerFaction: string | null,
): boolean {
  return log.some((entry) => (
    entry.event_id === eventId
    && entry.decision_source === 'player'
    && playerFactionMatch(entry.faction, playerFaction)
  ));
}

function isTurnAftermathDecisionEvent(state: LoadedGameState | null, eventId: string): boolean {
  if (!eventId) return false;
  if (hasPendingTurnAftermathDecision(state, eventId)) return true;
  const log = rawTurnAftermathDecisionLog(state);
  if (log?.some((entry) => entry.event_id === eventId)) return true;
  return (state?.firedEvents ?? []).some((event) => event.id === eventId && event.isDecision === true);
}

function shouldRenderTurnSummaryEventSignal(
  state: LoadedGameState | null,
  eventId: string,
  playerFaction: string | null,
): boolean {
  if (!isTurnAftermathDecisionEvent(state, eventId)) return true;

  const log = rawTurnAftermathDecisionLog(state);
  if (log) {
    return hasPlayerFiledTurnAftermathDecision(log, eventId, playerFaction);
  }
  if (hasPendingTurnAftermathDecision(state, eventId)) return false;
  return (state?.firedEvents ?? []).some((event) => event.id === eventId && event.isDecision === true);
}

function buildTurnJudgment(input: {
  tone: TurnAftermathTone;
  friendlyNet: number;
  cost: TurnAftermathCostView;
  signals: readonly TurnAftermathSignalView[];
  nextActions: TurnAftermathView['nextActions'];
}): TurnAftermathJudgmentView {
  const { tone, friendlyNet, cost, signals, nextActions } = input;
  if (cost.severity === 'critical' || cost.severity === 'severe') {
    return {
      headline: t('turnAftermath.judgment.cost.headline'),
      detail: t('turnAftermath.judgment.cost.detail', {
        severity: t(`turnAftermath.severity.${cost.severity}` as MessageKey),
        reasons: cost.reasons.slice(0, 3).join(' / '),
      }),
      memoryTone: 'cost',
      primarySurface: 'chronicle',
      secondarySurface: 'codex',
    };
  }
  const urgentSignal = signals.find((signal) => signal.severity === 'urgent') ?? signals[0];
  if (urgentSignal) {
    return {
      headline: t('turnAftermath.judgment.signal.headline'),
      detail: t('turnAftermath.judgment.signal.detail', { label: urgentSignal.label, detail: urgentSignal.detail }),
      memoryTone: 'signal',
      primarySurface: 'chronicle',
      secondarySurface: 'codex',
    };
  }
  if (nextActions.actionableCount > 0) {
    const top = nextActions.topItems[0];
    return {
      headline: t('turnAftermath.judgment.action.headline'),
      detail: top
        ? t('turnAftermath.judgment.action.detailWithTop', { count: nextActions.actionableCount, title: top.title })
        : t('turnAftermath.judgment.action.detail', { count: nextActions.actionableCount }),
      memoryTone: 'action',
      primarySurface: 'records',
      secondarySurface: 'chronicle',
    };
  }
  if (tone === 'gain' || tone === 'loss' || tone === 'mixed') {
    const signed = friendlyNet > 0 ? `+${friendlyNet}` : String(friendlyNet);
    return {
      headline: t('turnAftermath.judgment.territory.headline'),
      detail: t('turnAftermath.judgment.territory.detail', { signed }),
      memoryTone: 'territory',
      primarySurface: 'chronicle',
      secondarySurface: 'records',
    };
  }
  return {
    headline: t('turnAftermath.judgment.quiet.headline'),
    detail: t('turnAftermath.judgment.quiet.detail'),
    memoryTone: 'quiet',
    primarySurface: 'records',
    secondarySurface: 'codex',
  };
}

function emptyNextActions(): TurnAftermathView['nextActions'] {
  return {
    actionableCount: 0,
    blockingCount: 0,
    opportunityCount: 0,
    reserveCount: 0,
    officerCount: 0,
    eventDecisionCount: 0,
    peaceCount: 0,
    topItems: [],
  };
}

export function buildTurnAftermathView(input: TurnAftermathBuildInput): TurnAftermathView | null {
  const nextState = input.nextState;
  if (!nextState) return null;

  const summary: TurnSummary | null = nextState.latestTurnSummary ?? null;
  const playerFaction = getPlayerFaction(input);
  const turn = summary?.turn ?? nextState.turn ?? input.lastTurnReport?.turn ?? 0;
  const narrateTerritory = shouldNarrateTerritorySummary(summary);
  const narratedSummary = narrateTerritory ? summary : null;
  const friendlyNet = playerFaction && narrateTerritory ? (summary?.territory_net?.[playerFaction] ?? 0) : 0;

  const notable = (narrateTerritory ? (summary?.notable_flips ?? []) : []).map((flip): TurnAftermathFlipView => {
    const direction = !narrateTerritory
      ? 'other'
      : playerFaction && flip.to === playerFaction
      ? 'gain'
      : playerFaction && flip.from === playerFaction
        ? 'loss'
        : 'other';
    return {
      osid: flip.osid,
      label: getOsidDisplayName(flip.osid, input.osidNameMap ?? null),
      direction,
      significance: flip.significance,
      from: flip.from,
      to: flip.to,
    };
  });
  const gains = notable.filter((flip) => flip.direction === 'gain').length;
  const losses = notable.filter((flip) => flip.direction === 'loss').length;
  const tone = classifyTone(friendlyNet, gains, losses);

  let friendlyBattleCount = 0;
  let friendlyCasualties = 0;
  let opposingCasualties = 0;
  for (const battle of narratedSummary?.battles ?? []) {
    const result = summarizeBattleForFaction(battle, playerFaction);
    if (!result.involved) continue;
    friendlyBattleCount += 1;
    friendlyCasualties += result.friendlyCasualties;
    opposingCasualties += result.opposingCasualties;
  }
  const ownFormationsDestroyed = (narratedSummary?.formation_destructions ?? [])
    .filter((formation) => formation.faction === playerFaction).length;
  const cost = buildTurnCost({
    summary: narratedSummary,
    playerFaction,
    friendlyMilitaryCasualties: friendlyCasualties,
    ownFormationsDestroyed,
  });
  const commandRecord = buildCommandRecord(
    nextState,
    turn,
    input.includeCurrentCommandState !== false,
  );
  const signals = buildStrategicSignals(narratedSummary, input.osidNameMap ?? null, nextState, playerFaction);
  const nextActions = input.includeNextActions === false
    ? emptyNextActions()
    : buildNextActions(nextState, input.osidNameMap ?? null);

  return {
    turn,
    dateLabel: turnToDateString(turn),
    playerFaction,
    headline: buildHeadline(tone, friendlyNet, summary != null),
    narrativeLine: buildNarrativeLine(tone, nextActions.actionableCount),
    tone,
    territory: {
      friendlyNet,
      gains,
      losses,
      breakdownComplete: gains - losses === friendlyNet,
      notable,
    },
    combat: {
      battleCount: narratedSummary?.battles.length ?? 0,
      friendlyBattleCount,
      friendlyCasualties,
      opposingCasualties,
      territoryFlipsFromBattles: (narratedSummary?.battles ?? []).filter((battle) => battle.territory_flipped).length,
    },
    humanitarian: {
      displacedThisTurn: narratedSummary?.displacement_total ?? 0,
      hotspotLabel: humanizeToken(narratedSummary?.displacement_hotspot),
    },
    formations: {
      spawned: narratedSummary?.formation_spawns.length ?? 0,
      destroyed: narratedSummary?.formation_destructions.length ?? 0,
      ownSpawned: (narratedSummary?.formation_spawns ?? []).filter((formation) => formation.faction === playerFaction).length,
      ownDestroyed: ownFormationsDestroyed,
    },
    supply: {
      ownSupplyDelta: playerFaction ? (narratedSummary?.supply_deltas?.[playerFaction] ?? 0) : 0,
      ownHeavyMunitionsDelta: playerFaction ? (narratedSummary?.heavy_munitions_deltas?.[playerFaction] ?? 0) : 0,
    },
    cost,
    signals,
    commandRecord,
    judgment: buildTurnJudgment({
      tone,
      friendlyNet,
      cost,
      signals,
      nextActions,
    }),
    nextActions,
  };
}

export function buildTurnAftermathRecordViews(input: TurnAftermathRecordsInput): TurnAftermathView[] {
  const state = input.state;
  if (!state) return [];

  const summariesByTurn = new Map<number, TurnSummary>();
  for (const summary of state.turnSummaries ?? []) {
    if (!shouldNarrateTerritorySummary(summary)) continue;
    summariesByTurn.set(summary.turn, summary);
  }
  if (state.latestTurnSummary && shouldNarrateTerritorySummary(state.latestTurnSummary)) {
    summariesByTurn.set(state.latestTurnSummary.turn, state.latestTurnSummary);
  }

  const limit = Math.max(0, Math.floor(input.limit ?? 12));
  return [...summariesByTurn.values()]
    .sort((a, b) => b.turn - a.turn)
    .slice(0, limit)
    .map((summary) => buildTurnAftermathView({
      nextState: {
        ...state,
        turn: summary.turn,
        latestTurnSummary: summary,
      },
      osidNameMap: input.osidNameMap ?? null,
      includeNextActions: summary.turn === state.latestTurnSummary?.turn,
      includeCurrentCommandState: summary.turn === state.latestTurnSummary?.turn,
    }))
    .filter((view): view is TurnAftermathView => view != null);
}

export function buildTurnAftermathLedgerSummary(records: readonly TurnAftermathView[]): TurnAftermathLedgerSummary {
  return records.reduce<TurnAftermathLedgerSummary>((summary, record) => {
    summary.recordCount += 1;
    summary.netFriendlyTerritory += record.territory.friendlyNet;
    summary.totalFriendlyMilitaryCasualties += record.cost.friendlyMilitaryCasualties;
    summary.totalTheaterMilitaryCasualties += record.cost.theaterMilitaryCasualties;
    summary.totalDisplaced += record.cost.displacedThisTurn;
    summary.totalOwnFormationsDestroyed += record.cost.ownFormationsDestroyed;
    if (record.cost.severity === 'critical') {
      summary.criticalTurns += 1;
    } else if (record.cost.severity === 'severe') {
      summary.severeTurns += 1;
    }
    return summary;
  }, {
    recordCount: 0,
    netFriendlyTerritory: 0,
    totalFriendlyMilitaryCasualties: 0,
    totalTheaterMilitaryCasualties: 0,
    totalDisplaced: 0,
    totalOwnFormationsDestroyed: 0,
    criticalTurns: 0,
    severeTurns: 0,
  });
}

function classifyCampaignMomentum(
  summary: TurnAftermathLedgerSummary,
  signalCount: number,
): TurnAftermathCampaignMomentum {
  if (summary.recordCount === 0) return 'quiet';
  const hardTurnCount = summary.criticalTurns + summary.severeTurns;
  if (summary.netFriendlyTerritory >= 2 && hardTurnCount <= Math.floor(summary.recordCount / 2)) {
    return 'advancing';
  }
  if (
    summary.netFriendlyTerritory < 0
    && (hardTurnCount > 0 || summary.totalFriendlyMilitaryCasualties > 0 || summary.totalDisplaced > 0)
  ) {
    return 'bleeding';
  }
  if (
    Math.abs(summary.netFriendlyTerritory) <= 1
    && (summary.totalFriendlyMilitaryCasualties > 0 || summary.totalDisplaced > 0 || signalCount > 0)
  ) {
    return 'contested';
  }
  if (
    hardTurnCount > 0
    || summary.totalFriendlyMilitaryCasualties > 0
    || summary.totalDisplaced > 0
    || signalCount > 0
  ) {
    return 'contested';
  }
  return 'quiet';
}

function buildCampaignBriefing(
  momentum: TurnAftermathCampaignMomentum,
  summary: TurnAftermathLedgerSummary,
  signalCount: number,
): string {
  if (summary.recordCount === 0) return t('turnAftermath.campaign.briefing.noRecords');
  if (momentum === 'advancing') {
    return t('turnAftermath.campaign.briefing.advancing', {
      net: `${summary.netFriendlyTerritory >= 0 ? '+' : ''}${summary.netFriendlyTerritory}`,
      signals: signalCount,
    });
  }
  if (momentum === 'bleeding') {
    return t('turnAftermath.campaign.briefing.bleeding', {
      net: summary.netFriendlyTerritory,
      casualties: summary.totalFriendlyMilitaryCasualties,
      displaced: summary.totalDisplaced,
    });
  }
  if (momentum === 'contested') {
    return t('turnAftermath.campaign.briefing.contested', {
      casualties: summary.totalFriendlyMilitaryCasualties,
      signals: signalCount,
    });
  }
  return t('turnAftermath.campaign.briefing.quiet');
}

function classifyCampaignCost(
  summary: TurnAftermathLedgerSummary,
  averageFriendlyMilitaryCasualties: number,
): TurnAftermathCostSeverity {
  if (summary.recordCount === 0) return 'low';
  const hardTurnCount = summary.criticalTurns + summary.severeTurns;
  if (
    summary.totalOwnFormationsDestroyed >= 2
    || summary.criticalTurns >= 2
    || averageFriendlyMilitaryCasualties >= 100
    || summary.totalDisplaced >= 5000
  ) {
    return 'critical';
  }
  if (
    summary.totalOwnFormationsDestroyed >= 1
    || summary.criticalTurns >= 1
    || summary.severeTurns >= 2
    || averageFriendlyMilitaryCasualties >= 50
    || summary.totalDisplaced >= 2000
  ) {
    return 'severe';
  }
  if (
    hardTurnCount > 0
    || summary.totalFriendlyMilitaryCasualties > 0
    || summary.totalDisplaced > 0
    || summary.totalTheaterMilitaryCasualties > 0
  ) {
    return 'moderate';
  }
  return 'low';
}

function buildCampaignCostHeadline(
  severity: TurnAftermathCostSeverity,
  summary: TurnAftermathLedgerSummary,
): string {
  if (summary.recordCount === 0) return t('turnAftermath.campaignCost.headline.noRecords');
  if (severity === 'critical') return t('turnAftermath.campaignCost.headline.critical');
  if (severity === 'severe') return t('turnAftermath.campaignCost.headline.severe');
  if (severity === 'moderate') return t('turnAftermath.campaignCost.headline.moderate');
  return t('turnAftermath.campaignCost.headline.low');
}

function buildCampaignCostBriefing(input: {
  severity: TurnAftermathCostSeverity;
  summary: TurnAftermathLedgerSummary;
  totalOpposingMilitaryCasualties: number;
  casualtyExchangeRatio: number | null;
}): string {
  const { severity, summary, casualtyExchangeRatio } = input;
  if (summary.recordCount === 0) return t('turnAftermath.campaign.briefing.noRecords');
  const exchange = casualtyExchangeRatio == null
    ? t('turnAftermath.campaignCost.exchange.none')
    : t('turnAftermath.campaignCost.exchange.ratio', { ratio: casualtyExchangeRatio.toFixed(2) });
  const territory = summary.netFriendlyTerritory >= 0
    ? `+${summary.netFriendlyTerritory}`
    : String(summary.netFriendlyTerritory);
  if (severity === 'critical' || severity === 'severe') {
    return t('turnAftermath.campaignCost.briefing.hard', {
      turns: summary.recordCount,
      casualties: summary.totalFriendlyMilitaryCasualties,
      displaced: summary.totalDisplaced,
      territory,
      exchange,
    });
  }
  if (severity === 'moderate') {
    return t('turnAftermath.campaignCost.briefing.moderate', {
      turns: summary.recordCount,
      territory,
      exchange,
    });
  }
  return t('turnAftermath.campaignCost.briefing.low', {
    turns: summary.recordCount,
    territory,
  });
}

function buildCampaignCostDrivers(input: {
  summary: TurnAftermathLedgerSummary;
  totalOpposingMilitaryCasualties: number;
  casualtyExchangeRatio: number | null;
}): string[] {
  const drivers: Array<{ label: string; weight: number }> = [];
  const { summary, totalOpposingMilitaryCasualties, casualtyExchangeRatio } = input;
  if (summary.totalFriendlyMilitaryCasualties > 0) {
    drivers.push({
      label: t('turnAftermath.campaignCost.driver.friendlyCasualties', { count: summary.totalFriendlyMilitaryCasualties }),
      weight: summary.totalFriendlyMilitaryCasualties * 10,
    });
  }
  if (totalOpposingMilitaryCasualties > 0) {
    drivers.push({
      label: t('turnAftermath.campaignCost.driver.opposingCasualties', { count: totalOpposingMilitaryCasualties }),
      weight: totalOpposingMilitaryCasualties * 6,
    });
  }
  if (summary.totalDisplaced > 0) {
    drivers.push({
      label: t('turnAftermath.campaignCost.driver.displaced', { count: summary.totalDisplaced }),
      weight: summary.totalDisplaced,
    });
  }
  if (summary.totalOwnFormationsDestroyed > 0) {
    drivers.push({
      label: t(
        summary.totalOwnFormationsDestroyed === 1
          ? 'turnAftermath.campaignCost.driver.ownFormationDestroyed.one'
          : 'turnAftermath.campaignCost.driver.ownFormationDestroyed.many',
        { count: summary.totalOwnFormationsDestroyed },
      ),
      weight: summary.totalOwnFormationsDestroyed * 2500,
    });
  }
  const hardTurnCount = summary.criticalTurns + summary.severeTurns;
  if (hardTurnCount > 0) {
    drivers.push({
      label: t(
        hardTurnCount === 1 ? 'turnAftermath.campaignCost.driver.hardTurn.one' : 'turnAftermath.campaignCost.driver.hardTurn.many',
        { count: hardTurnCount },
      ),
      weight: hardTurnCount * 1500,
    });
  }
  if (casualtyExchangeRatio != null && casualtyExchangeRatio < 0.75 && summary.totalFriendlyMilitaryCasualties > 0) {
    drivers.push({
      label: t('turnAftermath.campaignCost.driver.casualtyExchange', { ratio: casualtyExchangeRatio.toFixed(2) }),
      weight: 1200,
    });
  }

  return drivers
    .sort((a, b) => b.weight - a.weight || strictStringCompare(a.label, b.label))
    .slice(0, 4)
    .map((driver) => driver.label);
}

function campaignCostScore(record: TurnAftermathView): number {
  const severityScore: Record<TurnAftermathCostSeverity, number> = {
    low: 0,
    moderate: 1,
    severe: 2,
    critical: 3,
  };
  return severityScore[record.cost.severity] * 100000
    + record.cost.ownFormationsDestroyed * 5000
    + record.cost.friendlyMilitaryCasualties * 20
    + record.cost.displacedThisTurn;
}

export function buildTurnAftermathCampaignPulse(records: readonly TurnAftermathView[]): TurnAftermathCampaignPulse {
  const summary = buildTurnAftermathLedgerSummary(records);
  const signalCount = records.reduce((total, record) => total + record.signals.length, 0);
  const eventCount = records.reduce(
    (total, record) => total + record.signals.filter((signal) => signal.kind === 'event').length,
    0,
  );
  const decorationCount = records.reduce(
    (total, record) => total + record.signals.filter((signal) => signal.kind === 'decoration').length,
    0,
  );
  const hardTurnCount = summary.criticalTurns + summary.severeTurns;
  const momentum = classifyCampaignMomentum(summary, signalCount);
  const latest = records[0]?.dateLabel ?? null;
  const oldest = records[records.length - 1]?.dateLabel ?? null;
  const windowLabel = latest && oldest
    ? latest === oldest ? latest : `${oldest} - ${latest}`
    : t('turnAftermath.records.noRecords');

  return {
    recordCount: summary.recordCount,
    windowLabel,
    momentum,
    briefing: buildCampaignBriefing(momentum, summary, signalCount),
    netFriendlyTerritory: summary.netFriendlyTerritory,
    totalFriendlyMilitaryCasualties: summary.totalFriendlyMilitaryCasualties,
    totalTheaterMilitaryCasualties: summary.totalTheaterMilitaryCasualties,
    totalDisplaced: summary.totalDisplaced,
    hardTurnCount,
    signalCount,
    eventCount,
    decorationCount,
  };
}

export function buildTurnAftermathCampaignCost(input: TurnAftermathRecordsInput): TurnAftermathCampaignCostView {
  const records = buildTurnAftermathRecordViews({
    state: input.state,
    osidNameMap: input.osidNameMap ?? null,
    limit: input.limit ?? Number.MAX_SAFE_INTEGER,
  });
  const summary = buildTurnAftermathLedgerSummary(records);
  const totalOpposingMilitaryCasualties = records.reduce(
    (total, record) => total + record.combat.opposingCasualties,
    0,
  );
  const hardTurnCount = summary.criticalTurns + summary.severeTurns;
  const averageFriendlyMilitaryCasualties = summary.recordCount > 0
    ? summary.totalFriendlyMilitaryCasualties / summary.recordCount
    : 0;
  const casualtyExchangeRatio = summary.totalFriendlyMilitaryCasualties > 0
    ? totalOpposingMilitaryCasualties / summary.totalFriendlyMilitaryCasualties
    : null;
  const playerFaction = input.state?.player_faction ?? null;
  const casualtyLedgerEntry = playerFaction ? input.state?.casualtyLedger?.[playerFaction] : undefined;
  const ledgerKilled = reportedNumber(casualtyLedgerEntry?.killed);
  const ledgerWounded = reportedNumber(casualtyLedgerEntry?.wounded);
  const ledgerMissingCaptured = reportedNumber(casualtyLedgerEntry?.missing_captured);
  const hasCampaignCasualtyLedger = ledgerKilled != null || ledgerWounded != null || ledgerMissingCaptured != null;
  const displayFriendlyMilitaryCasualties = hasCampaignCasualtyLedger
    ? (ledgerKilled ?? 0) + (ledgerWounded ?? 0) + (ledgerMissingCaptured ?? 0)
    : summary.totalFriendlyMilitaryCasualties;
  const severity = classifyCampaignCost(summary, averageFriendlyMilitaryCasualties);
  const latest = records[0]?.dateLabel ?? null;
  const oldest = records[records.length - 1]?.dateLabel ?? null;
  const windowLabel = latest && oldest
    ? latest === oldest ? latest : `${oldest} - ${latest}`
    : t('turnAftermath.records.noRecords');
  const mostCostlyRecord = records.reduce<TurnAftermathView | null>((best, record) => {
    if (!best) return record;
    const score = campaignCostScore(record);
    const bestScore = campaignCostScore(best);
    if (score !== bestScore) return score > bestScore ? record : best;
    return record.turn > best.turn ? record : best;
  }, null);

  return {
    recordCount: summary.recordCount,
    windowLabel,
    severity,
    headline: buildCampaignCostHeadline(severity, summary),
    briefing: buildCampaignCostBriefing({
      severity,
      summary,
      totalOpposingMilitaryCasualties,
      casualtyExchangeRatio,
    }),
    netFriendlyTerritory: summary.netFriendlyTerritory,
    totalFriendlyMilitaryCasualties: summary.totalFriendlyMilitaryCasualties,
    totalOpposingMilitaryCasualties,
    totalTheaterMilitaryCasualties: summary.totalTheaterMilitaryCasualties,
    totalDisplaced: summary.totalDisplaced,
    totalOwnFormationsDestroyed: summary.totalOwnFormationsDestroyed,
    hardTurnCount,
    averageFriendlyMilitaryCasualties,
    casualtyExchangeRatio,
    displayFriendlyMilitaryCasualties,
    friendlyMilitaryCasualtyScope: hasCampaignCasualtyLedger ? 'campaign_ledger' : 'turn_archive',
    topDrivers: buildCampaignCostDrivers({
      summary,
      totalOpposingMilitaryCasualties,
      casualtyExchangeRatio,
    }),
    mostCostlyTurn: mostCostlyRecord ? {
      turn: mostCostlyRecord.turn,
      dateLabel: mostCostlyRecord.dateLabel,
      severity: mostCostlyRecord.cost.severity,
      friendlyMilitaryCasualties: mostCostlyRecord.cost.friendlyMilitaryCasualties,
      displacedThisTurn: mostCostlyRecord.cost.displacedThisTurn,
      ownFormationsDestroyed: mostCostlyRecord.cost.ownFormationsDestroyed,
      headline: mostCostlyRecord.headline,
    } : null,
  };
}

export function filterTurnAftermathRecords(
  records: readonly TurnAftermathView[],
  filter: TurnAftermathRecordFilter,
): TurnAftermathView[] {
  if (filter === 'all') return [...records];
  return records.filter((record) => {
    if (filter === 'hard') {
      return record.cost.severity === 'critical' || record.cost.severity === 'severe';
    }
    if (filter === 'signals') {
      return record.signals.length > 0;
    }
    if (filter === 'actions') {
      return record.nextActions.actionableCount > 0;
    }
    if (filter === 'territory') {
      return record.territory.friendlyNet !== 0;
    }
    return true;
  });
}
