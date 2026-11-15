/**
 * Command-loop lane L1 (proposal 2C and 2A step A0): the review chip tells the truth, and the weekly
 * army pushback on a directive the President never gave is no longer a card, an inbox tile or a
 * chip item. It is one line in Army HQ Records.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { buildPresidentialDecisionRoomView } from '../../src/ui/map/data/presidentialDecisionRoom.js';
import {
  buildPreAdvanceCommandReviewView,
  formatReviewChipCount,
  REVIEW_CHIP_DISPLAY_CAP,
} from '../../src/ui/map/data/preAdvanceCommandReview.js';
import { buildWarroomPriorityDocketView } from '../../src/ui/map/data/warroomPriorityDocket.js';
import { deriveInboxItems } from '../../src/ui/map/data/inboxItems.js';
import { buildStaffReadingLine } from '../../src/ui/map/data/decisionConsequenceLedger.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import type { LoadedGameState, OperationOpportunityProposalView } from '../../src/ui/map/data/types.js';
import type { TurnSummary } from '../../src/state/turn_summary.js';

afterEach(() => setLocale('en'));

function makeSummary(): TurnSummary {
  return {
    turn: 41,
    battles: [],
    territory_net: {},
    notable_flips: [],
    displacement_total: 0,
    displacement_by_ethnicity: {},
    decoration_awards: [],
    arc_transitions: [],
    formation_spawns: [],
    formation_destructions: [],
    supply_deltas: {},
    heavy_munitions_deltas: {},
    movements: [],
    supply_transitions: [],
    events_fired: [],
    notable_events: [],
  };
}

function makeOpportunity(index: number): OperationOpportunityProposalView {
  return {
    proposal_id: `opp_${index}`,
    opportunity_id: `window_${index}`,
    display_name: `Window ${index}`,
    faction: 'RBiH',
    status: 'eligible_pending_review',
    eligibility_turn: 41,
    expires_turn: 41,
    review_id: `review_${index}`,
    description: `Staff reports window ${index} closing. A second sentence the chip line must drop.`,
    recommendation: 'Review before ending the turn.',
    proposed_action: `OPPORTUNITY:opp_${index}`,
    required_axes_green: 1,
    required_axes_total: 2,
    optional_axes_green: 0,
    optional_axes_total: 1,
    prerequisite_axes: [],
    force_quality_traits: [],
    objectives: [],
    staging: [],
    redirect_variants: [],
    available_actions: [],
  } as OperationOpportunityProposalView;
}

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
  const summary = makeSummary();
  return {
    label: 'Turn 41',
    turn: 41,
    phase: 'war',
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
    latestTurnSummary: summary,
    turnSummaries: [summary],
    player_faction: 'RBiH',
    ...overrides,
  } as LoadedGameState;
}

function officerEvent(
  type: NonNullable<LoadedGameState['pendingOfficerEvents']>[number]['type'],
  id: string,
): NonNullable<LoadedGameState['pendingOfficerEvents']>[number] {
  return {
    event_id: id,
    type,
    faction: 'RBiH',
    turn: 41,
    officer_id: 'officer_a',
    officer_name: 'Sefer Halilović',
    officer_competence: 3,
    officer_aggressiveness: 3,
    officer_defensive_skill: 3,
    acknowledged: false,
    reason: 'Sefer Halilović pushes back on the political directive — corps allocations will deviate from the literal reading.',
    overridable: true,
    override_action: 'override-army-directive',
  };
}

const WEEKLY_TRACE = {
  turn: 41,
  campaign_role: 'PRESS_OFFENSIVE',
  rationale: 'Sefer Halilović pushes back on the political directive — corps allocations will deviate from the literal reading.',
  raw_directive_id: 'directive_41',
};

describe('weekly army_directive_pushback is demoted (step A0)', () => {
  const weeklyState = () => makeState({
    pendingOfficerEvents: [officerEvent('army_directive_pushback', 'army:RBiH:directive:41')],
    armyCoDecisionTraces: { RBiH: [WEEKLY_TRACE] },
  });

  it('is not a Decision Room card, a chip item or a counted row', () => {
    const view = buildPresidentialDecisionRoomView({ state: weeklyState() });
    expect(view.cards.map((card) => card.id)).not.toContain('pushback:player-army-co');
    expect(view.advanceReadiness.items).toEqual([]);
    expect(view.metrics.advanceReviewCount).toBe(0);

    const review = buildPreAdvanceCommandReviewView({ state: weeklyState() });
    expect(review.items).toEqual([]);
    expect(review.metrics.advanceReviewCount).toBe(0);
    expect(review.status).toBe('clear');
  });

  it('is not an inbox tile', () => {
    const items = deriveInboxItems(weeklyState(), null);
    expect(items.filter((item) => item.type === 'officer_event')).toEqual([]);
  });

  it('still lets a real objection to the President\'s own order be a card', () => {
    const state = makeState({
      pendingOfficerEvents: [
        officerEvent('army_directive_pushback', 'army:RBiH:directive:41'),
        { ...officerEvent('order_pushback', 'order:RBiH:corps_1:41'), corps_id: 'corps_1', corps_name: '1st Corps' },
      ],
      armyCoDecisionTraces: { RBiH: [WEEKLY_TRACE] },
    });
    const view = buildPresidentialDecisionRoomView({ state });
    const card = view.cards.find((candidate) => candidate.id === 'pushback:player-army-co');
    expect(card).toBeDefined();
    // The weekly directive event does not weigh on the card: one order objection, not two.
    expect(card?.countWeight).toBe(1);
    expect(card?.sourceIds).toEqual(['order:RBiH:corps_1:41']);
  });

  it('becomes one Records line built from the latest interpretation and the corps roles', () => {
    const state = makeState({
      armyCoDecisionTraces: {
        RBiH: [
          { ...WEEKLY_TRACE, turn: 40, campaign_role: 'HOLD_AT_ALL_COSTS' },
          WEEKLY_TRACE,
          { turn: 41, campaign_role: 'AUTONOMOUS_LAUNCH_PROPOSAL', rationale: 'proposes an operation', raw_directive_id: 'opp' },
        ],
      },
      armyCorpsDirectives: [
        { corpsId: 'c1', role: 'primary', deviated: true },
        { corpsId: 'c2', role: 'secondary', deviated: false },
        { corpsId: 'c3', role: 'secondary', deviated: false },
        { corpsId: 'c4', role: 'contain', deviated: false },
      ],
    });
    expect(buildStaffReadingLine(state)).toEqual({
      turn: 41,
      label: 'Staff reading of policy',
      text: 'press the offensive, carried out as primary effort in 1 corps, supporting effort in 2 corps, containment in 1 corps.',
    });
  });

  it('has no line when the army read no directive, and none for another faction', () => {
    expect(buildStaffReadingLine(makeState())).toBeNull();
    expect(buildStaffReadingLine(makeState({
      armyCoDecisionTraces: { RS: [WEEKLY_TRACE] },
    }))).toBeNull();
    expect(buildStaffReadingLine(null)).toBeNull();
  });

  it('is written in BCS too', () => {
    setLocale('bcs');
    const line = buildStaffReadingLine(makeState({
      armyCoDecisionTraces: { RBiH: [{ ...WEEKLY_TRACE, campaign_role: 'HOLD_AT_ALL_COSTS' }] },
      armyCorpsDirectives: [{ corpsId: 'c1', role: 'primary', deviated: false }],
    }));
    expect(line?.label).toBe('Tumačenje politike u štabu');
    expect(line?.text).toBe('držati po svaku cijenu, provedeno kao glavni napor (1).');
  });
});

describe('the review chip is a true count', () => {
  it('is not padded: one item reads 1, not the old floor of four', () => {
    const state = makeState({ operationOpportunityProposals: [makeOpportunity(1)] });
    const review = buildPreAdvanceCommandReviewView({ state });
    expect(review.items.map((item) => item.id)).toEqual(['opportunity:opp_1']);
    expect(review.metrics.advanceReviewCount).toBe(1);
  });

  it('lists every item, however many, and the count equals the rows', () => {
    const state = makeState({
      operationOpportunityProposals: [1, 2, 3, 4, 5, 6, 7].map(makeOpportunity),
    });
    const docket = buildWarroomPriorityDocketView({ state });
    expect(docket.items).toHaveLength(7);
    expect(docket.metrics.advanceReviewCount).toBe(7);
    expect(new Set(docket.items.map((item) => item.id)).size).toBe(7);
  });

  it('gives each row a tier and a one-line why-now', () => {
    const state = makeState({ operationOpportunityProposals: [makeOpportunity(1)] });
    const [row] = buildPreAdvanceCommandReviewView({ state }).items;
    expect(row.tier).toBe('recommended');
    expect(row.whyNow).toBe('Staff reports window 1 closing.');
    expect(row.whyNow).not.toContain('\n');
  });

  it('says what happens by default for a required item', () => {
    const state = makeState({
      pendingConvoyDecisions: [{
        id: 'convoy_a',
        target_enclave: 'Gorazde',
        route_faction: 'RBiH',
        supply_amount: 20,
      }],
    } as Partial<LoadedGameState>);
    const review = buildPreAdvanceCommandReviewView({ state });
    const required = review.items.filter((item) => item.tier === 'required');
    expect(required.length).toBeGreaterThan(0);
    expect(required[0].whyNow).toBe('Required: Advance stays blocked until you answer.');
    // Required items come first.
    expect(review.items[0].tier).toBe('required');
  });

  it('has no rows and a clear status at zero', () => {
    const review = buildPreAdvanceCommandReviewView({ state: makeState() });
    expect(review.items).toEqual([]);
    expect(review.metrics.advanceReviewCount).toBe(0);
    expect(review.status).toBe('clear');
  });
});

describe('formatReviewChipCount', () => {
  it('shows the true number up to the cap and "9+" beyond it', () => {
    expect(REVIEW_CHIP_DISPLAY_CAP).toBe(9);
    expect(formatReviewChipCount(0)).toBe('0');
    expect(formatReviewChipCount(1)).toBe('1');
    expect(formatReviewChipCount(9)).toBe('9');
    expect(formatReviewChipCount(10)).toBe('9+');
    expect(formatReviewChipCount(250)).toBe('9+');
    expect(formatReviewChipCount(Number.NaN)).toBe('0');
    expect(formatReviewChipCount(-3)).toBe('0');
  });
});
