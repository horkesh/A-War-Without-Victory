import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  buildPresidentialCadenceReport,
  type PresidentialCadenceReceipt,
  type PresidentialPositiveHold,
} from '../src/sim/presidency/presidential_cadence.js';
import {
  assertPositiveHoldBundle,
  type PositiveHoldEvidenceBundle,
} from '../tools/diagnostics/presidential_cadence_provenance.js';

interface Fixture extends PositiveHoldEvidenceBundle {
  sourceTurn: number;
  positiveHoldEvidenceIds: string[];
  receipts: PresidentialCadenceReceipt[];
  positiveHolds: PresidentialPositiveHold[];
}

interface HeadlessHoldFixture extends PositiveHoldEvidenceBundle {
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
  it('binds the owner fixture to the actual save bytes, player, run, scenario, and evidence bytes', () => {
    const save = readFileSync(
      'docs/40_reports/playtests/evidence/20260731_session16_rs_104week_player/autosaves/final-autosave.json',
      'utf8',
    );
    const contents = Object.fromEntries(fixture.evidence.map((row) => [row.path, readFileSync(row.path, 'utf8')]));
    expect(() => assertPositiveHoldBundle(fixture, {
      sourceId: 'final-autosave.json',
      scenarioId: 'apr1992_definitive_104w',
      runId: '20260731-session16c-rs-104w-player-final',
      playerFaction: 'RS',
      startTurn: 0,
      endTurn: 104,
      saveTurn: JSON.parse(save).meta.turn,
      sourceSaveSha256: createHash('sha256').update(save).digest('hex'),
    }, contents)).not.toThrow();
  });

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
  it('binds the retained headless hold fixture to the documented replay identity and attested audit bytes', () => {
    const contents = Object.fromEntries(
      headlessHoldFixture.evidence.map((row) => [row.path, readFileSync(row.path, 'utf8')]),
    );
    expect(() => assertPositiveHoldBundle(
      headlessHoldFixture,
      {
        sourceId: 'final_save.json',
        scenarioId: 'apr1992_definitive_104w',
        runId: 'apr1992_definitive_104w__68d77163456892d1__w104',
        playerFaction: null,
        startTurn: 0,
        endTurn: 104,
        saveTurn: 104,
        sourceSaveSha256: 'd83d10c983da384dd7f0e5f957da69e346f9d50df788e4fac8a90923b8260ccc',
      },
      contents,
    )).not.toThrow();
  });

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
    expect(headlessHoldFixture.positiveHolds.find((hold) => hold.id === 'hold:rbih:82-97')).toMatchObject({
      toTurn: 97,
      toReceiptIds: ['event:rbih_nato_ultimatum_compliance_1994'],
      rationale: expect.stringMatching(/NATO ultimatum/i),
    });
    expect(headlessHoldFixture.positiveHolds.find((hold) => hold.id === 'hold:rbih:82-97')?.rationale)
      .not.toMatch(/Washington/i);
    expect(headlessHoldFixture.positiveHolds.every((hold) => (
      hold.rationale.length > 0
      && hold.evidenceIds.every((id) => headlessHoldFixture.positiveHoldEvidenceIds.includes(id))
    ))).toBe(true);
  });
});
