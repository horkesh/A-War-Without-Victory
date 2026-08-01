import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  buildPresidentialCadenceReport,
  type PresidentialCadenceReceipt,
  type PresidentialPositiveHold,
} from '../src/sim/presidency/presidential_cadence.js';

interface Fixture {
  sourceTurn: number;
  positiveHoldEvidenceIds: string[];
  receipts: PresidentialCadenceReceipt[];
  positiveHolds: PresidentialPositiveHold[];
}

interface HeadlessHoldFixture {
  sourceTurn: number;
  positiveHoldEvidenceIds: string[];
  positiveHolds: PresidentialPositiveHold[];
}

const fixture = JSON.parse(readFileSync(
  'tests/fixtures/diagnostics/rs_104week_cadence_receipts.json',
  'utf8',
)) as Fixture;

const headlessHoldFixture = JSON.parse(readFileSync(
  'tests/fixtures/diagnostics/all_faction_104week_headless_positive_holds.json',
  'utf8',
)) as HeadlessHoldFixture;

describe('RS 104-week presidential decision cadence', () => {
  it('keeps every positive-hold evidence anchor resolvable in the repository', () => {
    const evidenceIds = fixture.positiveHoldEvidenceIds;

    expect(evidenceIds.length).toBeGreaterThan(0);
    for (const evidenceId of evidenceIds) {
      const [repositoryPath, anchor] = evidenceId.split('#');
      expect(repositoryPath).toMatch(/^docs\//);
      expect(existsSync(repositoryPath)).toBe(true);
      if (anchor) {
        const source = readFileSync(repositoryPath, 'utf8');
        const headingAnchors = source
          .split(/\r?\n/)
          .filter((line) => /^#{1,6}\s/.test(line))
          .map((line) => line.replace(/^#{1,6}\s+/, '').trim().toLowerCase())
          .map((heading) => heading.replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'));
        expect(headingAnchors).toContain(anchor);
      }
    }
  });

  it('reports every long source-backed gap as an explicit positive hold without inventing an initiative', () => {
    const report = buildPresidentialCadenceReport({
      faction: 'RS',
      startTurn: 0,
      endTurn: fixture.sourceTurn,
      targetMaxGapTurns: 10,
      receipts: fixture.receipts,
      positiveHolds: fixture.positiveHolds,
      positiveHoldEvidenceIds: fixture.positiveHoldEvidenceIds,
    });

    expect(report.receiptCounts).toEqual({
      required_authored: 12,
      optional_source_backed: 16,
      ordinary_emergent: 11,
      notice: 5,
    });
    expect(report.maxSourceBackedGapTurns).toBe(23);
    expect(report.gaps.map((gap) => [gap.fromTurn, gap.toTurn, gap.status])).toEqual([
      [17, 40, 'positive_hold'],
      [41, 56, 'positive_hold'],
      [56, 69, 'positive_hold'],
      [76, 89, 'positive_hold'],
    ]);
    expect(report.unresolvedLongGapCount).toBe(0);
    expect(report.invalidPositiveHoldIds).toEqual([]);
    expect(report.receipts.some((receipt) => receipt.id.includes('initiative'))).toBe(false);
  });

  it('keeps Milosevic acknowledgements and personnel arrivals out of source-backed endpoints', () => {
    const report = buildPresidentialCadenceReport({
      faction: 'RS',
      startTurn: 0,
      endTurn: fixture.sourceTurn,
      targetMaxGapTurns: 10,
      receipts: fixture.receipts,
      positiveHolds: fixture.positiveHolds,
      positiveHoldEvidenceIds: fixture.positiveHoldEvidenceIds,
    });

    expect(report.sourceBackedReceiptIds).not.toContain('event:milosevic_vopp_pressure');
    expect(report.sourceBackedReceiptIds).not.toContain('event:milosevic_owen_stoltenberg_distancing');
    expect(report.sourceBackedReceiptIds).not.toContain('officer:zivanovic');
  });
});

describe('all-faction 104-week headless positive holds', () => {
  it('keeps the exact replay endpoints separate from the owner-play RS fixture', () => {
    expect(headlessHoldFixture.sourceTurn).toBe(104);
    expect(headlessHoldFixture.positiveHoldEvidenceIds).toEqual([
      'docs/40_reports/audits/20260801_RS_104W_PRESIDENTIAL_CADENCE_AUDIT.md#positive-hold-source-inventory',
    ]);
    expect(headlessHoldFixture.positiveHolds.map((hold) => [
      hold.faction,
      hold.fromTurn,
      hold.toTurn,
    ])).toEqual([
      ['RBiH', 20, 38],
      ['RBiH', 40, 54],
      ['RBiH', 54, 70],
      ['RBiH', 82, 97],
      ['RS', 17, 40],
      ['RS', 40, 56],
      ['RS', 56, 70],
      ['RS', 76, 89],
      ['HRHB', 40, 51],
      ['HRHB', 52, 65],
      ['HRHB', 87, 102],
    ]);
    expect(headlessHoldFixture.positiveHolds.every((hold) => (
      hold.rationale.length > 0
      && hold.evidenceIds.every((id) => headlessHoldFixture.positiveHoldEvidenceIds.includes(id))
    ))).toBe(true);
  });
});
