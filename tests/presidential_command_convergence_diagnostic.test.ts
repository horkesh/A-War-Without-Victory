import { describe, expect, it } from 'vitest';

import { PLAYER_DECISION_FAMILIES } from '../src/state/player_decision_manifest.js';
import { DECISION_SURFACE_REGISTRY } from '../src/ui/map/data/decisionSurfaceRegistry.js';
import {
  PRESIDENTIAL_DECISION_OWNERSHIP,
  PRESIDENTIAL_DECISION_SOURCE_PROOFS,
  assertPresidentialCommandConvergence,
  buildPresidentialCommandConvergenceReport,
  loadPresidentialCommandSourceTexts,
  serializePresidentialCommandConvergenceReport,
  type PresidentialDecisionOwnership,
} from '../tools/diagnostics/presidential_command_convergence.js';

function buildCurrentReport() {
  return buildPresidentialCommandConvergenceReport({
    families: PLAYER_DECISION_FAMILIES,
    surfaces: Object.values(DECISION_SURFACE_REGISTRY),
    ownership: PRESIDENTIAL_DECISION_OWNERSHIP,
    sourceProofs: PRESIDENTIAL_DECISION_SOURCE_PROOFS,
    sourceTexts: loadPresidentialCommandSourceTexts(),
  });
}

describe('presidential command convergence diagnostic', () => {
  it('inventories every manifest family with one reachable action surface and an explicit receipt disposition', () => {
    const report = buildCurrentReport();

    expect(report.summary).toEqual({
      familyCount: 9,
      reachableActionFamilyCount: 9,
      durableReceiptFamilyCount: 9,
      conditionalReceiptFamilyCount: 0,
      unresolvedFindingCount: 0,
      sourceVerifiedFamilyCount: 9,
    });
    expect(report.rows.map((row) => row.familyId)).toEqual([
      'autonomy_proposal',
      'convoy_decision',
      'dayton_negotiation',
      'event_decision',
      'officer_event',
      'operation_opportunity',
      'paramilitary_request',
      'peace_plan',
      'reserve_request',
    ]);
    expect(report.findings).toEqual([]);
    const autonomyRow = report.rows.find((row) => row.familyId === 'autonomy_proposal');
    expect(autonomyRow).toMatchObject({
      receiptOwner: 'meta.proposal_decision_history',
      receiptDurability: 'durable',
      recordsConsumers: ['decision-consequence ledger'],
    });
    expect(autonomyRow?.sourceEvidence.receipt).toEqual(expect.arrayContaining([
      'src/desktop/player_visible_state.cjs#projected.proposal_decision_history = playerFaction',
      'src/state/validateGameState.ts#duplicates durable identity ${identity}',
      'src/state/proposal_decision_history.ts#export function proposalDecisionIdentity(',
    ]));
    expect(report.rows.find((row) => row.familyId === 'event_decision')).toMatchObject({
      producer: 'src/sim/events/evaluate_events.ts -> military.pending_event_decisions',
      blockerPredicate: 'requires_player_response === true',
      actionSurface: 'desk:event_modal',
      receiptOwner: 'military.event_decision_log',
      receiptDurability: 'durable',
      chronicleConsumers: ['decision-consequence ledger'],
      receiptConsumers: ['confirmed consequence receipts'],
      codexConsumers: ['dynamic section builder'],
    });
  });

  it('is byte-identical under family, surface, ownership, and consumer permutation', () => {
    const ownership = [...PRESIDENTIAL_DECISION_OWNERSHIP].reverse();
    const first = serializePresidentialCommandConvergenceReport(buildCurrentReport());
    const second = serializePresidentialCommandConvergenceReport(buildPresidentialCommandConvergenceReport({
      families: [...PLAYER_DECISION_FAMILIES].reverse(),
      surfaces: Object.values(DECISION_SURFACE_REGISTRY).reverse(),
      ownership,
      sourceProofs: [...PRESIDENTIAL_DECISION_SOURCE_PROOFS].reverse(),
      sourceTexts: loadPresidentialCommandSourceTexts(),
    }));

    expect(second).toBe(first);
    expect(first).not.toMatch(/[A-Z]:\\/);
    expect(first).not.toContain('generatedAt');
  });

  it('fails closed on missing and duplicate action ownership and absent durable receipts', () => {
    const durableOwnership = [...PRESIDENTIAL_DECISION_OWNERSHIP];
    const surfaces = Object.values(DECISION_SURFACE_REGISTRY);
    const missing = buildPresidentialCommandConvergenceReport({
      families: PLAYER_DECISION_FAMILIES,
      surfaces: surfaces.filter((surface) => surface.familyId !== 'reserve_request'),
      ownership: durableOwnership,
      sourceProofs: PRESIDENTIAL_DECISION_SOURCE_PROOFS,
      sourceTexts: loadPresidentialCommandSourceTexts(),
    });
    expect(() => assertPresidentialCommandConvergence(missing)).toThrow(/reserve_request.*reachable action/i);

    const duplicate = buildPresidentialCommandConvergenceReport({
      families: PLAYER_DECISION_FAMILIES,
      surfaces: [...surfaces, DECISION_SURFACE_REGISTRY.event_decision],
      ownership: durableOwnership,
      sourceProofs: PRESIDENTIAL_DECISION_SOURCE_PROOFS,
      sourceTexts: loadPresidentialCommandSourceTexts(),
    });
    expect(() => assertPresidentialCommandConvergence(duplicate)).toThrow(/event_decision.*two action surfaces/i);

    const noReceipt = buildPresidentialCommandConvergenceReport({
      families: PLAYER_DECISION_FAMILIES,
      surfaces,
      ownership: PRESIDENTIAL_DECISION_OWNERSHIP.map((row): PresidentialDecisionOwnership => (
        row.familyId === 'autonomy_proposal'
          ? {
              ...row,
              receiptOwner: 'meta.pending_proposal_reviews (conditional retention)',
              receiptDurability: 'conditional',
              receiptDisposition: 'Synthetic missing durable receipt used only by this contract test.',
            }
          : row
      )),
      sourceProofs: PRESIDENTIAL_DECISION_SOURCE_PROOFS,
      sourceTexts: loadPresidentialCommandSourceTexts(),
    });
    expect(() => assertPresidentialCommandConvergence(noReceipt)).toThrow(/autonomy_proposal.*durable receipt/i);
  });

  it('fails closed when a manifest family has no ownership contract', () => {
    const report = buildPresidentialCommandConvergenceReport({
      families: PLAYER_DECISION_FAMILIES,
      surfaces: Object.values(DECISION_SURFACE_REGISTRY),
      ownership: PRESIDENTIAL_DECISION_OWNERSHIP.filter((row) => row.familyId !== 'peace_plan'),
      sourceProofs: PRESIDENTIAL_DECISION_SOURCE_PROOFS,
      sourceTexts: loadPresidentialCommandSourceTexts(),
    });

    expect(report.findings).toContainEqual({
      code: 'missing_family_ownership',
      familyId: 'peace_plan',
      detail: 'No producer, blocker, or receipt ownership contract is registered.',
    });
    expect(() => assertPresidentialCommandConvergence(report)).toThrow(/peace_plan.*ownership contract/i);
  });

  it('fails closed when a real producer, route, receipt, or consumer source anchor is removed', () => {
    const sourceTexts = loadPresidentialCommandSourceTexts();
    const cases = [
      ['src/sim/events/evaluate_events.ts', 'state.military.pending_event_decisions.push({', 'producer'],
      ['src/ui/map/App.tsx', "if (action === 'event_modal')", 'action'],
      ['src/sim/events/evaluate_events.ts', 'state.military.event_decision_log.push({', 'receipt'],
      ['src/sim/endgame/cost_ledger.ts', 'const resolutions = [...(state.military?.operation_opportunity_resolutions ?? [])];', 'consumer'],
    ] as const;

    for (const [path, anchor, kind] of cases) {
      expect(sourceTexts[path]).toContain(anchor);
      const report = buildPresidentialCommandConvergenceReport({
        families: PLAYER_DECISION_FAMILIES,
        surfaces: Object.values(DECISION_SURFACE_REGISTRY),
        ownership: PRESIDENTIAL_DECISION_OWNERSHIP,
        sourceProofs: PRESIDENTIAL_DECISION_SOURCE_PROOFS,
        sourceTexts: { ...sourceTexts, [path]: sourceTexts[path].replace(anchor, '') },
      });
      expect(report.findings).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'source_anchor_missing', detail: expect.stringContaining(kind) }),
      ]));
      expect(() => assertPresidentialCommandConvergence(report)).toThrow(/source anchor/i);
    }
  });

  it('source-anchors the current Records and Cost Ledger consumers omitted by the prose-only inventory', () => {
    const report = buildCurrentReport();
    const operationRow = report.rows.find((row) => row.familyId === 'operation_opportunity');
    expect(operationRow).toMatchObject({
      recordsConsumers: ['operation opportunity records projection'],
      costLedgerConsumers: ['operation opportunity cost ledger'],
    });
    expect(operationRow?.sourceEvidence.consumers).toEqual(expect.arrayContaining([
      'src/ui/map/data/operationOpportunityLedger.ts#const resolutions = Array.isArray(state.military?.operation_opportunity_resolutions)',
      'src/sim/endgame/cost_ledger.ts#const resolutions = [...(state.military?.operation_opportunity_resolutions ?? [])];',
    ]));
    for (const familyId of ['reserve_request', 'paramilitary_request', 'officer_event'] as const) {
      expect(report.rows.find((row) => row.familyId === familyId)?.recordsConsumers)
        .toEqual(['decision-consequence ledger']);
    }
  });
});
