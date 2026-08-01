import { describe, expect, it } from 'vitest';

import {
  buildPresidentialAuthorityCadenceSummary,
  buildPresidentialCadenceReport,
  projectPresidentialCadenceReceipts,
  type PresidentialCadenceReceipt,
} from '../src/sim/presidency/presidential_cadence.js';

const BASE_RECEIPTS: PresidentialCadenceReceipt[] = [
  { id: 'event:opening', faction: 'RS', turn: 0, classification: 'required_authored', sourceIds: ['BB1:p177'] },
  { id: 'operation:cerska', faction: 'RS', turn: 40, classification: 'optional_source_backed', sourceIds: ['BB2:p404'] },
  { id: 'notice:milosevic', faction: 'RS', turn: 54, classification: 'notice', sourceIds: ['ICTY:Krajisnik'] },
  { id: 'event:assembly', faction: 'RS', turn: 56, classification: 'required_authored', sourceIds: ['ICTY:Krajisnik'] },
  { id: 'reserve:gap', faction: 'RS', turn: 62, classification: 'ordinary_emergent', sourceIds: [] },
  { id: 'peace:owen-stoltenberg', faction: 'RS', turn: 70, classification: 'required_authored', sourceIds: ['Owen:ch7'] },
];

describe('presidential cadence report', () => {
  it('separates source-backed presidential receipts from emergent work and notices', () => {
    const report = buildPresidentialCadenceReport({
      faction: 'RS',
      startTurn: 0,
      endTurn: 70,
      targetMaxGapTurns: 10,
      receipts: BASE_RECEIPTS,
      positiveHolds: [],
      positiveHoldEvidenceIds: [],
    });

    expect(report.receiptCounts).toEqual({
      required_authored: 3,
      optional_source_backed: 1,
      ordinary_emergent: 1,
      notice: 1,
    });
    expect(report.sourceBackedReceiptIds).toEqual([
      'event:opening',
      'operation:cerska',
      'event:assembly',
      'peace:owen-stoltenberg',
    ]);
    expect(report.maxSourceBackedGapTurns).toBe(40);
    expect(report.gaps.map((gap) => [gap.fromTurn, gap.toTurn, gap.status])).toEqual([
      [0, 40, 'unresolved'],
      [40, 56, 'unresolved'],
      [56, 70, 'unresolved'],
    ]);
  });

  it('closes only an exact long gap with an evidenced positive-hold disposition', () => {
    const report = buildPresidentialCadenceReport({
      faction: 'RS',
      startTurn: 0,
      endTurn: 70,
      targetMaxGapTurns: 10,
      receipts: BASE_RECEIPTS,
      positiveHoldEvidenceIds: ['audit:all-faction-event-catalog'],
      positiveHolds: [{
        id: 'hold:rs:40-56',
        faction: 'RS',
        fromTurn: 40,
        toTurn: 56,
        rationale: 'No additional executable RS presidential lever is supported in this interval.',
        evidenceIds: ['audit:all-faction-event-catalog'],
      }],
    });

    expect(report.gaps.find((gap) => gap.fromTurn === 40 && gap.toTurn === 56)).toMatchObject({
      status: 'positive_hold',
      positiveHoldId: 'hold:rs:40-56',
    });
    expect(report.unresolvedLongGapCount).toBe(2);
    expect(report.invalidPositiveHoldIds).toEqual([]);
  });

  it('rejects empty, mismatched, short-gap, and cross-faction hold dispositions', () => {
    const report = buildPresidentialCadenceReport({
      faction: 'RS',
      startTurn: 0,
      endTurn: 70,
      targetMaxGapTurns: 10,
      receipts: BASE_RECEIPTS,
      positiveHoldEvidenceIds: ['audit'],
      positiveHolds: [
        { id: 'hold:empty', faction: 'RS', fromTurn: 40, toTurn: 56, rationale: '', evidenceIds: [] },
        { id: 'hold:mismatch', faction: 'RS', fromTurn: 41, toTurn: 56, rationale: 'Mismatch.', evidenceIds: ['audit'] },
        { id: 'hold:short', faction: 'RS', fromTurn: 56, toTurn: 60, rationale: 'Short.', evidenceIds: ['audit'] },
        { id: 'hold:other', faction: 'RBiH', fromTurn: 40, toTurn: 56, rationale: 'Other.', evidenceIds: ['audit'] },
      ],
    });

    expect(report.invalidPositiveHoldIds).toEqual([
      'hold:empty',
      'hold:mismatch',
      'hold:other',
      'hold:short',
    ]);
    expect(report.gaps.every((gap) => gap.status === 'unresolved')).toBe(true);
  });

  it('rejects a hold whose evidence label is not in the supplied evidence inventory', () => {
    const report = buildPresidentialCadenceReport({
      faction: 'RS',
      startTurn: 0,
      endTurn: 70,
      targetMaxGapTurns: 10,
      receipts: BASE_RECEIPTS,
      positiveHoldEvidenceIds: ['audit:registered'],
      positiveHolds: [{
        id: 'hold:unregistered-evidence',
        faction: 'RS',
        fromTurn: 40,
        toTurn: 56,
        rationale: 'No supported lever.',
        evidenceIds: ['audit:invented-label'],
      }],
    });

    expect(report.invalidPositiveHoldIds).toEqual(['hold:unregistered-evidence']);
    expect(report.gaps.find((gap) => gap.fromTurn === 40 && gap.toTurn === 56)?.status)
      .toBe('unresolved');
  });

  it('is invariant under receipt and disposition permutation and deduplicates exact receipts', () => {
    const first = buildPresidentialCadenceReport({
      faction: 'RS',
      startTurn: 0,
      endTurn: 70,
      targetMaxGapTurns: 10,
      receipts: [...BASE_RECEIPTS, BASE_RECEIPTS[1]],
      positiveHoldEvidenceIds: ['audit:a', 'audit:b'],
      positiveHolds: [{
        id: 'hold:rs:40-56',
        faction: 'RS',
        fromTurn: 40,
        toTurn: 56,
        rationale: 'No supported lever.',
        evidenceIds: ['audit:b', 'audit:a'],
      }],
    });
    const second = buildPresidentialCadenceReport({
      faction: 'RS',
      startTurn: 0,
      endTurn: 70,
      targetMaxGapTurns: 10,
      receipts: [...BASE_RECEIPTS].reverse(),
      positiveHoldEvidenceIds: ['audit:b', 'audit:a'],
      positiveHolds: [{
        id: 'hold:rs:40-56',
        faction: 'RS',
        fromTurn: 40,
        toTurn: 56,
        rationale: 'No supported lever.',
        evidenceIds: ['audit:a', 'audit:b'],
      }],
    });

    expect(first).toEqual(second);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});

describe('presidential Authority cadence summary', () => {
  it('records near-cap weeks with explicit complete coverage', () => {
    const summary = buildPresidentialAuthorityCadenceSummary({
      faction: 'RS',
      startTurn: 0,
      endTurn: 2,
      nearCapThresholdFraction: 0.9,
      observations: [
        { faction: 'RS', turn: 2, current: 100, cap: 100 },
        { faction: 'RS', turn: 0, current: 90, cap: 100 },
        { faction: 'RS', turn: 1, current: 89, cap: 100 },
        { faction: 'RS', turn: 2, current: 100, cap: 100 },
      ],
    });

    expect(summary).toEqual({
      faction: 'RS',
      startTurn: 0,
      endTurn: 2,
      nearCapThresholdFraction: 0.9,
      coverage: 'complete',
      observationCount: 3,
      observedTurns: [0, 1, 2],
      missingTurns: [],
      nearCapAuthorityWeekCount: 2,
      nearCapAuthorityTurns: [0, 2],
    });
  });

  it('is permutation-stable and reports absent player-only Authority evidence honestly', () => {
    const observations = [
      { faction: 'RBiH', turn: 1, current: 100, cap: 100 },
      { faction: 'RBiH', turn: 0, current: 100, cap: 100 },
      { faction: 'RS', turn: 0, current: 100, cap: 100 },
    ];
    const first = buildPresidentialAuthorityCadenceSummary({
      faction: 'RBiH',
      startTurn: 0,
      endTurn: 2,
      nearCapThresholdFraction: 0.9,
      observations,
    });
    const second = buildPresidentialAuthorityCadenceSummary({
      faction: 'RBiH',
      startTurn: 0,
      endTurn: 2,
      nearCapThresholdFraction: 0.9,
      observations: [...observations].reverse(),
    });
    const unreported = buildPresidentialAuthorityCadenceSummary({
      faction: 'HRHB',
      startTurn: 0,
      endTurn: 2,
      nearCapThresholdFraction: 0.9,
      observations,
    });

    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(first).toMatchObject({
      coverage: 'partial',
      observationCount: 2,
      missingTurns: [2],
      nearCapAuthorityWeekCount: 2,
    });
    expect(unreported).toMatchObject({
      coverage: 'unreported',
      observationCount: 0,
      missingTurns: [0, 1, 2],
      nearCapAuthorityWeekCount: 0,
    });
  });

  it('fails closed on conflicting observations for the same faction and turn', () => {
    expect(() => buildPresidentialAuthorityCadenceSummary({
      faction: 'RS',
      startTurn: 0,
      endTurn: 0,
      nearCapThresholdFraction: 0.9,
      observations: [
        { faction: 'RS', turn: 0, current: 90, cap: 100 },
        { faction: 'RS', turn: 0, current: 91, cap: 100 },
      ],
    })).toThrow(/conflicting.*RS.*turn 0/i);
  });
});

describe('presidential cadence receipt projection', () => {
  it('aggregates every decision owner without letting notices or abstract actions close sourced gaps', () => {
    const receipts = projectPresidentialCadenceReceipts({
      faction: 'RS',
      eventCatalog: [
        { id: 'rs_assembly', requiresPlayerResponse: true, sourceBacked: true, sourceIds: ['BB2:p400'] },
        { id: 'milosevic_notice', requiresPlayerResponse: false, sourceBacked: true, sourceIds: ['ICTY:notice'] },
        { id: 'address_to_nation_rs', requiresPlayerResponse: true, sourceBacked: false, sourceIds: ['design:abstract'] },
      ],
      state: {
        eventDecisionLog: [
          { eventId: 'rs_assembly', faction: 'RS', turn: 56 },
          { eventId: 'milosevic_notice', faction: 'RS', turn: 54 },
          { eventId: 'address_to_nation_rs', faction: 'RS', turn: 84 },
        ],
        peacePlanHistory: [{ planId: 'vance_owen', turn: 40, responses: { RS: 'rejected' } }],
        proposalReviews: [
          { id: 'hist-op', faction: 'RS', turn: 41, resolvedTurn: 41, proposedAction: 'HISTORICAL_OP:triggered:vrs_drina:Pracha' },
          { id: 'ordinary-op', faction: 'RS', turn: 42, resolvedTurn: 42, proposedAction: 'APPROVE_OP:vrs_drina:plan' },
          { id: 'opportunity-review', faction: 'RS', turn: 43, resolvedTurn: 43, proposedAction: 'OPPORTUNITY:proposal-rs' },
        ],
        officerDecisionHistory: [
          { id: 'replacement', faction: 'RS', turn: 28, eventId: 'replacement:vrs', decision: 'replacement_accepted' },
          { id: 'arrival', faction: 'RS', turn: 18, eventId: 'arrival:vrs', decision: 'acknowledged' },
        ],
        reserveDecisionHistory: [{ id: 'reserve', faction: 'RS', turn: 20 }],
        convoyDecisionHistory: [{ id: 'convoy', routeFaction: 'RS', turn: 30 }],
        paramilitaryDecisionHistory: [{ id: 'paramilitary', faction: 'RS', turn: 3 }],
        playerFaction: 'RS',
        daytonResult: { turn: 70 },
        operationOpportunities: [
          { proposalId: 'proposal-rs', approverFaction: 'RS' },
          { proposalId: 'proposal-rbih', approverFaction: 'RBiH' },
        ],
        operationOpportunityResolutions: [
          { proposalId: 'proposal-rs', opportunityId: 'sana_95', responseTurn: 43, response: 'approve' },
          { proposalId: 'proposal-rbih', opportunityId: 'sarajevo', responseTurn: 44, response: 'decline' },
        ],
      },
    });

    expect(receipts.map((receipt) => [receipt.id, receipt.classification])).toEqual([
      ['paramilitary:paramilitary', 'ordinary_emergent'],
      ['officer:arrival', 'notice'],
      ['reserve:reserve', 'ordinary_emergent'],
      ['officer:replacement', 'optional_source_backed'],
      ['convoy:convoy', 'ordinary_emergent'],
      ['peace-plan:vance_owen:RS', 'required_authored'],
      ['proposal:hist-op', 'optional_source_backed'],
      ['proposal:ordinary-op', 'ordinary_emergent'],
      ['opportunity:proposal-rs', 'optional_source_backed'],
      ['event:milosevic_notice', 'notice'],
      ['event:rs_assembly', 'required_authored'],
      ['dayton:70:RS', 'required_authored'],
      ['event:address_to_nation_rs', 'ordinary_emergent'],
    ]);
    expect(receipts.filter((receipt) => receipt.id === 'opportunity:proposal-rs')).toHaveLength(1);
    expect(receipts.some((receipt) => receipt.id.includes('proposal-rbih'))).toBe(false);
  });

  it('does not credit bot, cross-faction, or expired operation opportunity outcomes', () => {
    const receipts = projectPresidentialCadenceReceipts({
      faction: 'RS',
      eventCatalog: [],
      state: {
        playerFaction: 'RBiH',
        daytonResult: { turn: 60 },
        operationOpportunities: [
          { proposalId: 'rs-expired', approverFaction: 'RS' },
          { proposalId: 'rbih-declined', approverFaction: 'RBiH' },
        ],
        operationOpportunityResolutions: [
          { proposalId: 'rs-expired', opportunityId: 'expired', responseTurn: 20, response: 'expire' },
          { proposalId: 'rbih-declined', opportunityId: 'cross-faction', responseTurn: 21, response: 'decline' },
        ],
      },
    });

    expect(receipts).toEqual([]);
  });

  it('is conservative when an event receipt has no catalog row', () => {
    const receipts = projectPresidentialCadenceReceipts({
      faction: 'RBiH',
      eventCatalog: [],
      state: {
        eventDecisionLog: [{ eventId: 'unknown_event', faction: 'RBiH', turn: 12 }],
      },
    });

    expect(receipts).toEqual([{
      id: 'event:unknown_event',
      faction: 'RBiH',
      turn: 12,
      classification: 'notice',
      sourceIds: [],
    }]);
  });
});
