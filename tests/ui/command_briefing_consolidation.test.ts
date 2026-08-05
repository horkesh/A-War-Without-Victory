import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/ui/rs_turn104_priority_projection.json';
import { buildPresidentialDecisionRoomView } from '../../src/ui/map/data/presidentialDecisionRoom.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import type { CommandBriefingItemView, LoadedGameState } from '../../src/ui/map/data/types.js';

function makeState(items: CommandBriefingItemView[] = fixture.commandBriefing.items as CommandBriefingItemView[]): LoadedGameState {
  return {
    label: '4 Apr 1994 (war)',
    turn: fixture.turn,
    phase: fixture.phase,
    formations: [],
    militiaPools: [],
    controlBySettlement: {},
    statusBySettlement: {},
    brigadeAorByFormationId: {},
    attackOrders: [],
    aorOrders: [],
    recentControlEvents: [],
    allControlEvents: [],
    displacementEventLog: [],
    battlesByOsid: {},
    movementsByOsid: {},
    supplyTransitionsByOsid: {},
    historicalEventsByTurn: [],
    pressureWarning: false,
    latestTurnSummary: null,
    turnSummaries: [],
    player_faction: fixture.playerFaction,
    commandBriefing: {
      ...fixture.commandBriefing,
      items,
    },
  } as LoadedGameState;
}

describe('command briefing consolidation', () => {
  it('turns nine enclave inputs into one visible monitor card while retaining all source ids', () => {
    const view = buildPresidentialDecisionRoomView({ state: makeState() });
    const cards = view.cards.filter((card) => card.sourceIds?.some((id) => id.startsWith('hum-enclave-')));

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      countWeight: 9,
      priorityBand: 'monitor',
      navigationTarget: { kind: 'enclave-dashboard' },
      sourceIds: fixture.expectedSourceIds,
    });
    expect(cards[0]?.evidence).toHaveLength(9);
  });

  it('is invariant under input permutation', () => {
    const forward = buildPresidentialDecisionRoomView({ state: makeState() });
    const reverse = buildPresidentialDecisionRoomView({
      state: makeState([...(fixture.commandBriefing.items as CommandBriefingItemView[])].reverse()),
    });
    const project = (view: typeof forward) => view.cards.map((card) => ({
      id: card.id,
      title: card.title,
      explanation: card.explanation,
      sourceIds: card.sourceIds,
      evidence: card.evidence,
      countWeight: card.countWeight,
      priorityBand: card.priorityBand,
    }));

    expect(project(reverse)).toEqual(project(forward));
  });

  it('does not merge an unrelated critical briefing into the enclave theatre summary', () => {
    const unrelated = {
      id: 'mil-front-collapse',
      kind: 'military' as const,
      category: 'military',
      briefingCategory: 'defense' as const,
      severity: 'critical' as const,
      title: 'Front line at risk',
      detail: 'A filed staff report needs inspection.',
      target: { type: 'summary' as const },
    };
    const view = buildPresidentialDecisionRoomView({
      state: makeState([...(fixture.commandBriefing.items as CommandBriefingItemView[]), unrelated]),
    });

    expect(view.cards.filter((card) => card.sourceIds?.some((id) => id.startsWith('hum-enclave-')))).toHaveLength(1);
    expect(view.cards.find((card) => card.id === 'briefing:mil-front-collapse')).toBeDefined();
  });

  it('uses count-aware enclave severity copy in EN and BCS', () => {
    const items = (fixture.commandBriefing.items as CommandBriefingItemView[]).slice(0, 2).map((item, index) => ({
      ...item,
      severity: index === 0 ? 'critical' as const : 'warning' as const,
    }));

    setLocale('en');
    const en = buildPresidentialDecisionRoomView({ state: makeState(items) }).cards
      .find((card) => card.id.startsWith('briefing-group:'))?.explanation;
    setLocale('bcs');
    const bcs = buildPresidentialDecisionRoomView({ state: makeState(items) }).cards
      .find((card) => card.id.startsWith('briefing-group:'))?.explanation;
    setLocale('en');

    expect(en).toMatch(/1 critical, 1 warning\./);
    expect(bcs).toMatch(/1 kritična, 1 upozorenje\./);
  });

});
