import type { LoadedGameState } from './types';
import type { TurnBattle, TurnSummary } from '../../../state/turn_summary.js';
import { countActionableItems, deriveInboxItems, type InboxItem } from './inboxItems';
import { turnToDateString } from '../utils/formatters';
import { getOsidDisplayName } from '../utils/osidDisplayName';

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
  action: InboxItem['action'];
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
  if (!hasSummary) return 'Turn advanced.';
  if (tone === 'gain') return `Net territorial gain: +${friendlyNet} OSIDs.`;
  if (tone === 'loss') return `Net territorial loss: ${friendlyNet} OSIDs.`;
  if (tone === 'mixed') return 'Territory changed hands without a net shift.';
  return 'No territorial change this turn.';
}

function buildNarrativeLine(tone: TurnAftermathTone): string {
  if (tone === 'gain') return 'The week ends with ground taken, but the ledger still decides what the advance cost.';
  if (tone === 'loss') return 'The map contracted this week; command must decide whether to stabilize or answer.';
  if (tone === 'mixed') return 'The front traded ground without mercy, leaving staff to sort signal from noise.';
  return 'A quiet week is still a week of depletion, waiting, and staff work.';
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
      friendlyCasualties: battle.attacker_casualties,
      opposingCasualties: battle.defender_casualties,
    };
  }
  if (battle.defender_faction === playerFaction) {
    return {
      involved: true,
      friendlyCasualties: battle.defender_casualties,
      opposingCasualties: battle.attacker_casualties,
    };
  }
  return { involved: false, friendlyCasualties: 0, opposingCasualties: 0 };
}

function buildNextActions(state: LoadedGameState, osidNameMap: Record<string, string> | null): TurnAftermathView['nextActions'] {
  const inboxItems = deriveInboxItems(state, osidNameMap);
  const actionableItems = inboxItems.filter((item) => item.type !== 'situation');
  return {
    actionableCount: countActionableItems(inboxItems),
    blockingCount: actionableItems.filter((item) => item.severity === 'blocking').length,
    opportunityCount: actionableItems.filter((item) => item.type === 'operation_opportunity').length,
    reserveCount: actionableItems.filter((item) => item.type === 'reserve_request').length,
    officerCount: actionableItems.filter((item) => item.type === 'officer_event').length,
    eventDecisionCount: actionableItems.filter((item) => item.type === 'event_decision').length,
    peaceCount: actionableItems.filter((item) => item.type === 'peace_plan').length,
    topItems: actionableItems.slice(0, 3).map((item) => ({
      id: item.id,
      type: item.type,
      severity: item.severity,
      title: item.title,
      action: item.action,
    })),
  };
}

function pluralize(value: number, singular: string, plural: string = `${singular}s`): string {
  return value === 1 ? singular : plural;
}

function buildTurnCost(input: {
  summary: TurnSummary | null;
  playerFaction: string | null;
  friendlyMilitaryCasualties: number;
  ownFormationsDestroyed: number;
}): TurnAftermathCostView {
  const theaterMilitaryCasualties = (input.summary?.battles ?? []).reduce(
    (total, battle) => total + battle.attacker_casualties + battle.defender_casualties,
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
  const displacedThisTurn = input.summary?.displacement_total ?? 0;

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
    reasons.push(`${input.friendlyMilitaryCasualties} friendly ${pluralize(input.friendlyMilitaryCasualties, 'casualty', 'casualties')}`);
  }
  if (input.ownFormationsDestroyed > 0) {
    reasons.push(`${input.ownFormationsDestroyed} ${pluralize(input.ownFormationsDestroyed, 'formation')} destroyed`);
  }
  if (displacedThisTurn > 0) {
    reasons.push(`${displacedThisTurn} displaced`);
  }
  if (reasons.length === 0 && ownSupplySpent + ownHeavyMunitionsSpent > 0) {
    reasons.push(`${ownSupplySpent + ownHeavyMunitionsSpent} supply spent`);
  }
  if (reasons.length === 0) {
    reasons.push('No major costs recorded');
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
): TurnAftermathSignalView[] {
  if (!summary) return [];

  const signals: TurnAftermathSignalView[] = [];

  for (const event of summary.events_fired) {
    signals.push({
      id: `event:${event.id}`,
      kind: 'event',
      label: event.text,
      detail: 'Historical event',
      severity: 'notable',
    });
  }

  summary.notable_events.forEach((event, index) => {
    const kindLabel = humanizeToken(event.kind) ?? 'Notable Event';
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

  for (const award of summary.decoration_awards) {
    signals.push({
      id: `decoration:${award.formation_id}:${award.decoration}`,
      kind: 'decoration',
      label: `${award.formation_name} decorated`,
      detail: humanizeToken(String(award.decoration)) ?? 'Decoration',
      severity: 'notable',
    });
  }

  for (const arc of summary.arc_transitions) {
    const from = humanizeToken(String(arc.from_arc)) ?? String(arc.from_arc);
    const to = humanizeToken(String(arc.to_arc)) ?? String(arc.to_arc);
    signals.push({
      id: `arc:${arc.formation_id}:${arc.from_arc}:${arc.to_arc}`,
      kind: 'arc',
      label: `${arc.formation_name} changed arc`,
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
      label: `${label} supply changed`,
      detail: `${humanizeToken(transition.from) ?? transition.from} -> ${humanizeToken(transition.to) ?? transition.to}`,
      severity: toState.includes('critical') || toState.includes('strained') ? 'urgent' : 'routine',
    });
  });

  summary.movements.slice(0, 6).forEach((movement) => {
    const from = getOsidDisplayName(movement.from_osid, osidNameMap);
    const to = getOsidDisplayName(movement.to_osid, osidNameMap);
    signals.push({
      id: `movement:${movement.formation_id}:${movement.from_osid}:${movement.to_osid}`,
      kind: 'movement',
      label: `${movement.formation_name} moved`,
      detail: `${from} -> ${to}`,
      severity: 'routine',
    });
  });

  return signals.slice(0, 12);
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
      headline: 'Hard turn entered the record.',
      detail: `The turn cost register is ${cost.severity}: ${cost.reasons.slice(0, 3).join(' / ')}.`,
      memoryTone: 'cost',
      primarySurface: 'chronicle',
      secondarySurface: 'codex',
    };
  }
  const urgentSignal = signals.find((signal) => signal.severity === 'urgent') ?? signals[0];
  if (urgentSignal) {
    return {
      headline: 'Strategic signal entered the record.',
      detail: `${urgentSignal.label} (${urgentSignal.detail}).`,
      memoryTone: 'signal',
      primarySurface: 'chronicle',
      secondarySurface: 'codex',
    };
  }
  if (nextActions.actionableCount > 0) {
    const top = nextActions.topItems[0];
    return {
      headline: 'Decision pressure carries forward.',
      detail: top
        ? `${nextActions.actionableCount} actionable desk items remain; first up: ${top.title}.`
        : `${nextActions.actionableCount} actionable desk items remain.`,
      memoryTone: 'action',
      primarySurface: 'records',
      secondarySurface: 'chronicle',
    };
  }
  if (tone === 'gain' || tone === 'loss' || tone === 'mixed') {
    const signed = friendlyNet > 0 ? `+${friendlyNet}` : String(friendlyNet);
    return {
      headline: 'Territory changed the campaign memory.',
      detail: `The front line recorded ${signed} net OSIDs for the player faction.`,
      memoryTone: 'territory',
      primarySurface: 'chronicle',
      secondarySurface: 'records',
    };
  }
  return {
    headline: 'No judgment recorded yet.',
    detail: 'No major cost, signal, action, or territorial change was recorded for this turn.',
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
  const friendlyNet = playerFaction ? (summary?.territory_net?.[playerFaction] ?? 0) : 0;

  const notable = (summary?.notable_flips ?? []).map((flip): TurnAftermathFlipView => {
    const direction = playerFaction && flip.to === playerFaction
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
  for (const battle of summary?.battles ?? []) {
    const result = summarizeBattleForFaction(battle, playerFaction);
    if (!result.involved) continue;
    friendlyBattleCount += 1;
    friendlyCasualties += result.friendlyCasualties;
    opposingCasualties += result.opposingCasualties;
  }
  const ownFormationsDestroyed = (summary?.formation_destructions ?? [])
    .filter((formation) => formation.faction === playerFaction).length;
  const cost = buildTurnCost({
    summary,
    playerFaction,
    friendlyMilitaryCasualties: friendlyCasualties,
    ownFormationsDestroyed,
  });
  const signals = buildStrategicSignals(summary, input.osidNameMap ?? null);
  const nextActions = input.includeNextActions === false
    ? emptyNextActions()
    : buildNextActions(nextState, input.osidNameMap ?? null);

  return {
    turn,
    dateLabel: turnToDateString(turn),
    playerFaction,
    headline: buildHeadline(tone, friendlyNet, summary != null),
    narrativeLine: buildNarrativeLine(tone),
    tone,
    territory: {
      friendlyNet,
      gains,
      losses,
      notable,
    },
    combat: {
      battleCount: summary?.battles.length ?? 0,
      friendlyBattleCount,
      friendlyCasualties,
      opposingCasualties,
      territoryFlipsFromBattles: (summary?.battles ?? []).filter((battle) => battle.territory_flipped).length,
    },
    humanitarian: {
      displacedThisTurn: summary?.displacement_total ?? 0,
      hotspotLabel: humanizeToken(summary?.displacement_hotspot),
    },
    formations: {
      spawned: summary?.formation_spawns.length ?? 0,
      destroyed: summary?.formation_destructions.length ?? 0,
      ownSpawned: (summary?.formation_spawns ?? []).filter((formation) => formation.faction === playerFaction).length,
      ownDestroyed: ownFormationsDestroyed,
    },
    supply: {
      ownSupplyDelta: playerFaction ? (summary?.supply_deltas?.[playerFaction] ?? 0) : 0,
      ownHeavyMunitionsDelta: playerFaction ? (summary?.heavy_munitions_deltas?.[playerFaction] ?? 0) : 0,
    },
    cost,
    signals,
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
    summariesByTurn.set(summary.turn, summary);
  }
  if (state.latestTurnSummary) {
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
  return 'quiet';
}

function buildCampaignBriefing(
  momentum: TurnAftermathCampaignMomentum,
  summary: TurnAftermathLedgerSummary,
  signalCount: number,
): string {
  if (summary.recordCount === 0) return 'No archived turn records are available.';
  if (momentum === 'advancing') {
    return `Archive window is moving forward: ${summary.netFriendlyTerritory >= 0 ? '+' : ''}${summary.netFriendlyTerritory} net OSIDs with ${signalCount} strategic signals.`;
  }
  if (momentum === 'bleeding') {
    return `Archive window is costly: ${summary.netFriendlyTerritory} net OSIDs, ${summary.totalFriendlyMilitaryCasualties} friendly casualties, ${summary.totalDisplaced} displaced.`;
  }
  if (momentum === 'contested') {
    return `Archive window is contested: little net ground movement, but ${summary.totalFriendlyMilitaryCasualties} friendly casualties and ${signalCount} strategic signals.`;
  }
  return 'Archive window is quiet: no major movement or costs in the visible records.';
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
  if (summary.recordCount === 0) return 'No campaign cost records yet.';
  if (severity === 'critical') return 'Campaign cost is critical.';
  if (severity === 'severe') return 'Campaign cost is severe.';
  if (severity === 'moderate') return 'Campaign cost is accumulating.';
  return 'Campaign cost is light.';
}

function buildCampaignCostBriefing(input: {
  severity: TurnAftermathCostSeverity;
  summary: TurnAftermathLedgerSummary;
  totalOpposingMilitaryCasualties: number;
  casualtyExchangeRatio: number | null;
}): string {
  const { severity, summary, casualtyExchangeRatio } = input;
  if (summary.recordCount === 0) return 'No archived turn records are available.';
  const exchange = casualtyExchangeRatio == null
    ? 'no clear casualty exchange'
    : `${casualtyExchangeRatio.toFixed(2)} opposing casualties per friendly casualty`;
  const territory = summary.netFriendlyTerritory >= 0
    ? `+${summary.netFriendlyTerritory}`
    : String(summary.netFriendlyTerritory);
  if (severity === 'critical' || severity === 'severe') {
    return `${summary.recordCount} recorded turns: ${summary.totalFriendlyMilitaryCasualties} friendly casualties, ${summary.totalDisplaced} displaced, ${territory} net OSIDs, ${exchange}.`;
  }
  if (severity === 'moderate') {
    return `${summary.recordCount} recorded turns: cost is present but not dominant, with ${territory} net OSIDs and ${exchange}.`;
  }
  return `${summary.recordCount} recorded turns: no major costs recorded, with ${territory} net OSIDs.`;
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
      label: `${summary.totalFriendlyMilitaryCasualties} friendly casualties`,
      weight: summary.totalFriendlyMilitaryCasualties * 10,
    });
  }
  if (totalOpposingMilitaryCasualties > 0) {
    drivers.push({
      label: `${totalOpposingMilitaryCasualties} opposing casualties`,
      weight: totalOpposingMilitaryCasualties * 6,
    });
  }
  if (summary.totalDisplaced > 0) {
    drivers.push({
      label: `${summary.totalDisplaced} displaced`,
      weight: summary.totalDisplaced,
    });
  }
  if (summary.totalOwnFormationsDestroyed > 0) {
    drivers.push({
      label: `${summary.totalOwnFormationsDestroyed} own ${pluralize(summary.totalOwnFormationsDestroyed, 'formation')} destroyed`,
      weight: summary.totalOwnFormationsDestroyed * 2500,
    });
  }
  const hardTurnCount = summary.criticalTurns + summary.severeTurns;
  if (hardTurnCount > 0) {
    drivers.push({
      label: `${hardTurnCount} hard ${pluralize(hardTurnCount, 'turn')}`,
      weight: hardTurnCount * 1500,
    });
  }
  if (casualtyExchangeRatio != null && casualtyExchangeRatio < 0.75 && summary.totalFriendlyMilitaryCasualties > 0) {
    drivers.push({
      label: `${casualtyExchangeRatio.toFixed(2)} casualty exchange`,
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
    : 'No records';

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
  const severity = classifyCampaignCost(summary, averageFriendlyMilitaryCasualties);
  const latest = records[0]?.dateLabel ?? null;
  const oldest = records[records.length - 1]?.dateLabel ?? null;
  const windowLabel = latest && oldest
    ? latest === oldest ? latest : `${oldest} - ${latest}`
    : 'No records';
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
