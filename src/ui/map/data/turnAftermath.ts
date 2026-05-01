import type { LoadedGameState } from './types';
import type { TurnBattle, TurnSummary } from '../../../state/turn_summary.js';
import { countActionableItems, deriveInboxItems, type InboxItem } from './inboxItems';
import { turnToDateString } from '../utils/formatters';
import { getOsidDisplayName } from '../utils/osidDisplayName';

export type TurnAftermathTone = 'gain' | 'loss' | 'mixed' | 'quiet';

export interface TurnAftermathReportInput {
  turn?: number;
  player_faction?: string | null;
}

export interface TurnAftermathBuildInput {
  previousState?: LoadedGameState | null;
  nextState: LoadedGameState | null;
  lastTurnReport?: TurnAftermathReportInput | null;
  osidNameMap?: Record<string, string> | null;
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

export interface TurnAftermathView {
  turn: number;
  dateLabel: string;
  playerFaction: string | null;
  headline: string;
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

  return {
    turn,
    dateLabel: turnToDateString(turn),
    playerFaction,
    headline: buildHeadline(tone, friendlyNet, summary != null),
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
      ownDestroyed: (summary?.formation_destructions ?? []).filter((formation) => formation.faction === playerFaction).length,
    },
    supply: {
      ownSupplyDelta: playerFaction ? (summary?.supply_deltas?.[playerFaction] ?? 0) : 0,
      ownHeavyMunitionsDelta: playerFaction ? (summary?.heavy_munitions_deltas?.[playerFaction] ?? 0) : 0,
    },
    nextActions: buildNextActions(nextState, input.osidNameMap ?? null),
  };
}
