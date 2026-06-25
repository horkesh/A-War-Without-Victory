import { describe, expect, it } from 'vitest';
import { buildOpportunityLedgerPulse } from '../../src/ui/map/data/opportunityLedgerPulse.js';
import type { LoadedGameState, OperationOpportunityRecordView } from '../../src/ui/map/data/types.js';

function record(partial: Partial<OperationOpportunityRecordView> & {
  proposal_id: string;
  opportunity_id: string;
  display_name: string;
  status: OperationOpportunityRecordView['status'];
}): OperationOpportunityRecordView {
  return {
    faction: 'RBiH',
    ...partial,
  };
}

function makeState(records: OperationOpportunityRecordView[] | undefined): LoadedGameState {
  return {
    label: 'Turn 12',
    turn: 12,
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
    latestTurnSummary: null,
    turnSummaries: [],
    player_faction: 'RBiH',
    operationOpportunityRecords: records,
  } as LoadedGameState;
}

describe('buildOpportunityLedgerPulse', () => {
  it('returns an empty pulse when no records exist', () => {
    const pulse = buildOpportunityLedgerPulse(makeState(undefined));
    expect(pulse.total_decisions).toBe(0);
    expect(pulse.taken).toBe(0);
    expect(pulse.missed).toBe(0);
    expect(pulse.in_progress).toBe(0);
    expect(pulse.completed_success).toBe(0);
    expect(pulse.completed_failure).toBe(0);
    expect(pulse.t3_authorized).toBe(0);
    expect(pulse.lifetime_axes.required_green).toBe(0);
    expect(pulse.lifetime_axes.required_total).toBe(0);
    expect(pulse.lifetime_axes.optional_green).toBe(0);
    expect(pulse.lifetime_axes.optional_total).toBe(0);
    expect(pulse.pending).toBe(0);
    expect(pulse.headline).toContain('No');
  });

  it('returns an empty pulse when records is an empty array', () => {
    const pulse = buildOpportunityLedgerPulse(makeState([]));
    expect(pulse.total_decisions).toBe(0);
    expect(pulse.headline).toContain('No');
  });

  it('classifies decisions taken vs missed vs pending', () => {
    const records = [
      record({ proposal_id: 'p1', opportunity_id: 'o1', display_name: 'Op One', status: 'eligible_pending_review' }),
      record({ proposal_id: 'p2', opportunity_id: 'o2', display_name: 'Op Two', status: 'delayed' }),
      record({ proposal_id: 'p3', opportunity_id: 'o3', display_name: 'Op Three', status: 'approved', response: 'approve', exit_class: 'decisive_success' }),
      record({ proposal_id: 'p4', opportunity_id: 'o4', display_name: 'Op Four', status: 'redirected', response: 'redirect', exit_class: 'partial_success' }),
      record({ proposal_id: 'p5', opportunity_id: 'o5', display_name: 'Op Five', status: 'under_resourced_approved', response: 'under_resource' }),
      record({ proposal_id: 'p6', opportunity_id: 'o6', display_name: 'Op Six', status: 'declined', response: 'decline' }),
      record({ proposal_id: 'p7', opportunity_id: 'o7', display_name: 'Op Seven', status: 'expired', response: 'expire' }),
      record({ proposal_id: 'p8', opportunity_id: 'o8', display_name: 'Op Eight', status: 'approved', response: 'approve', exit_class: 'failed' }),
      record({ proposal_id: 'p9', opportunity_id: 'o9', display_name: 'Op Nine', status: 'approved', response: 'approve', exit_class: 'aborted' }),
      record({ proposal_id: 'p10', opportunity_id: 'o10', display_name: 'Op Ten', status: 'approved', response: 'approve', exit_class: 'did_not_launch' }),
      record({ proposal_id: 'p11', opportunity_id: 'o11', display_name: 'Op Eleven', status: 'approved', response: 'approve', exit_class: 't3_authorized_no_offensive' }),
    ];

    const pulse = buildOpportunityLedgerPulse(makeState(records));

    expect(pulse.total_decisions).toBe(11);
    // pending: eligible_pending_review + delayed = 2
    expect(pulse.pending).toBe(2);
    // taken: approved + redirected + under_resourced_approved = 6 (p3,p4,p5,p8,p9,p10,p11) — actually 7
    expect(pulse.taken).toBe(7);
    // missed: declined + expired = 2
    expect(pulse.missed).toBe(2);
    // completed_success: decisive_success + partial_success = 2 (p3,p4)
    expect(pulse.completed_success).toBe(2);
    // completed_failure: failed + aborted + did_not_launch = 3 (p8,p9,p10)
    expect(pulse.completed_failure).toBe(3);
    // t3_authorized: t3_authorized_no_offensive = 1 (p11)
    expect(pulse.t3_authorized).toBe(1);
    // in_progress: taken with no exit_class = 1 (p5)
    expect(pulse.in_progress).toBe(1);
  });

  it('aggregates lifetime axis counters across records', () => {
    const records = [
      record({
        proposal_id: 'p1', opportunity_id: 'o1', display_name: 'Op One', status: 'approved',
        required_axes_green: 3, required_axes_total: 4,
        optional_axes_green: 1, optional_axes_total: 2,
      }),
      record({
        proposal_id: 'p2', opportunity_id: 'o2', display_name: 'Op Two', status: 'declined',
        required_axes_green: 1, required_axes_total: 4,
        optional_axes_green: 0, optional_axes_total: 1,
      }),
      record({
        proposal_id: 'p3', opportunity_id: 'o3', display_name: 'Op Three', status: 'expired',
        // No axis data — should not contribute.
      }),
    ];
    const pulse = buildOpportunityLedgerPulse(makeState(records));
    expect(pulse.lifetime_axes.required_green).toBe(4);
    expect(pulse.lifetime_axes.required_total).toBe(8);
    expect(pulse.lifetime_axes.optional_green).toBe(1);
    expect(pulse.lifetime_axes.optional_total).toBe(3);
  });

  it('excludes unreported axis counts from lifetime axis counters', () => {
    const records = [
      record({
        proposal_id: 'p1', opportunity_id: 'o1', display_name: 'Op One', status: 'approved',
        required_axes_total: 4,
        optional_axes_total: 2,
      }),
      record({
        proposal_id: 'p2', opportunity_id: 'o2', display_name: 'Op Two', status: 'approved',
        required_axes_green: 2, required_axes_total: 3,
        optional_axes_green: 1, optional_axes_total: 1,
      }),
    ];
    const pulse = buildOpportunityLedgerPulse(makeState(records));
    expect(pulse.lifetime_axes.required_green).toBe(2);
    expect(pulse.lifetime_axes.required_total).toBe(3);
    expect(pulse.lifetime_axes.optional_green).toBe(1);
    expect(pulse.lifetime_axes.optional_total).toBe(1);
  });

  it('computes total_decisions excluding pending and produces a non-empty headline', () => {
    const records = [
      record({ proposal_id: 'p1', opportunity_id: 'o1', display_name: 'Op One', status: 'eligible_pending_review' }),
      record({ proposal_id: 'p2', opportunity_id: 'o2', display_name: 'Op Two', status: 'approved', response: 'approve', exit_class: 'decisive_success' }),
      record({ proposal_id: 'p3', opportunity_id: 'o3', display_name: 'Op Three', status: 'expired', response: 'expire' }),
    ];
    const pulse = buildOpportunityLedgerPulse(makeState(records));
    // taken (1) + missed (1) = 2 resolved decisions
    expect(pulse.resolved_decisions).toBe(2);
    // total_decisions includes everything tracked
    expect(pulse.total_decisions).toBe(3);
    expect(pulse.headline).not.toBe('');
    // Headline summarizes resolved counts and at least one of taken/missed/success/failure/desk markers.
    expect(pulse.headline.toLowerCase()).toMatch(/taken|missed|success|failure|desk|opportun|decision/);
  });

  it('produces deterministic output regardless of input record order', () => {
    const a = record({ proposal_id: 'a', opportunity_id: 'oa', display_name: 'A', status: 'approved', response: 'approve', exit_class: 'decisive_success' });
    const b = record({ proposal_id: 'b', opportunity_id: 'ob', display_name: 'B', status: 'declined', response: 'decline' });
    const c = record({ proposal_id: 'c', opportunity_id: 'oc', display_name: 'C', status: 'expired', response: 'expire' });
    const ordered = buildOpportunityLedgerPulse(makeState([a, b, c]));
    const reversed = buildOpportunityLedgerPulse(makeState([c, b, a]));
    expect(ordered).toEqual(reversed);
  });

  it('classifies in_progress as taken records with no exit_class', () => {
    const records = [
      // In progress: approved + no exit_class
      record({ proposal_id: 'p1', opportunity_id: 'o1', display_name: 'Op One', status: 'approved', response: 'approve' }),
      // In progress: redirected + no exit_class
      record({ proposal_id: 'p2', opportunity_id: 'o2', display_name: 'Op Two', status: 'redirected', response: 'redirect' }),
      // Resolved: approved with exit_class
      record({ proposal_id: 'p3', opportunity_id: 'o3', display_name: 'Op Three', status: 'approved', response: 'approve', exit_class: 'decisive_success' }),
    ];
    const pulse = buildOpportunityLedgerPulse(makeState(records));
    expect(pulse.in_progress).toBe(2);
    expect(pulse.taken).toBe(3);
    expect(pulse.completed_success).toBe(1);
  });
});
