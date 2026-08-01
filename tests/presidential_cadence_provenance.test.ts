import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  assertAuthorityObservationBundle,
  assertPositiveHoldBundle,
  type AuthorityObservationEvidenceBundle,
  type CadenceProvenanceContext,
  type PositiveHoldEvidenceBundle,
} from '../tools/diagnostics/presidential_cadence_provenance.js';

const EVIDENCE_PATH = 'docs/evidence.md';
const EVIDENCE_CONTENT = '# Evidence\n\n## Positive hold source inventory\n\nVerified.\n';
const EVIDENCE_SHA = createHash('sha256').update(EVIDENCE_CONTENT).digest('hex');
const AUTHORITY_EVIDENCE_PATH = 'docs/authority-observations.json';
const AUTHORITY_EVIDENCE_CONTENT = `${JSON.stringify({
  schemaVersion: 1,
  observations: [{ faction: 'RS', turn: 104, current: 100, cap: 100 }],
}, null, 2)}\n`;
const AUTHORITY_EVIDENCE_SHA = createHash('sha256').update(AUTHORITY_EVIDENCE_CONTENT).digest('hex');

const CONTEXT: CadenceProvenanceContext = {
  sourceId: 'final_save.json',
  scenarioId: 'apr1992_definitive_104w',
  runId: 'apr1992_definitive_104w__fixture__w104',
  playerFaction: 'RS',
  startTurn: 0,
  endTurn: 104,
  saveTurn: 104,
  sourceSaveSha256: 'a'.repeat(64),
};

const HOLDS: PositiveHoldEvidenceBundle = {
  schemaVersion: 1,
  provenance: CONTEXT,
  evidence: [{
    id: `${EVIDENCE_PATH}#positive-hold-source-inventory`,
    path: EVIDENCE_PATH,
    sha256: EVIDENCE_SHA,
    anchor: 'positive-hold-source-inventory',
  }],
  positiveHoldEvidenceIds: [`${EVIDENCE_PATH}#positive-hold-source-inventory`],
  positiveHolds: [{
    id: 'hold:rs:20-40',
    faction: 'RS',
    fromTurn: 20,
    toTurn: 40,
    rationale: 'The attested source inventory contains no executable lever.',
    evidenceIds: [`${EVIDENCE_PATH}#positive-hold-source-inventory`],
  }],
};

const AUTHORITY: AuthorityObservationEvidenceBundle = {
  schemaVersion: 1,
  provenance: CONTEXT,
  evidence: [{
    id: 'authority:run-log',
    path: AUTHORITY_EVIDENCE_PATH,
    sha256: AUTHORITY_EVIDENCE_SHA,
  }],
  observations: [{
    faction: 'RS',
    turn: 104,
    current: 100,
    cap: 100,
    evidenceIds: ['authority:run-log'],
  }],
};

const CONTENTS = {
  [EVIDENCE_PATH]: EVIDENCE_CONTENT,
  [AUTHORITY_EVIDENCE_PATH]: AUTHORITY_EVIDENCE_CONTENT,
};

describe('presidential cadence provenance', () => {
  it('accepts a schema-versioned hold bundle bound to the exact source context and evidence bytes', () => {
    expect(() => assertPositiveHoldBundle(HOLDS, CONTEXT, CONTENTS)).not.toThrow();
  });

  it.each([
    ['sourceId', 'other.json'],
    ['scenarioId', 'invented_scenario'],
    ['runId', 'invented_run'],
    ['playerFaction', 'RBiH'],
    ['startTurn', 1],
    ['endTurn', 103],
    ['saveTurn', 103],
    ['sourceSaveSha256', 'b'.repeat(64)],
  ] as const)('rejects hold provenance tampering of %s', (field, value) => {
    const bundle = {
      ...HOLDS,
      provenance: { ...HOLDS.provenance, [field]: value },
    } as PositiveHoldEvidenceBundle;
    expect(() => assertPositiveHoldBundle(bundle, CONTEXT, CONTENTS)).toThrow(new RegExp(field, 'i'));
  });

  it('rejects a schema mismatch and an end turn that does not equal the actual save turn', () => {
    expect(() => assertPositiveHoldBundle(
      { ...HOLDS, schemaVersion: 2 } as unknown as PositiveHoldEvidenceBundle,
      CONTEXT,
      CONTENTS,
    )).toThrow(/schemaVersion/i);
    expect(() => assertPositiveHoldBundle(
      HOLDS,
      { ...CONTEXT, endTurn: 105 },
      CONTENTS,
    )).toThrow(/saveTurn.*endTurn/i);
  });

  it('rejects unattested, hash-tampered, and missing-anchor positive-hold evidence', () => {
    expect(() => assertPositiveHoldBundle(
      { ...HOLDS, positiveHoldEvidenceIds: ['invented:evidence'] },
      CONTEXT,
      CONTENTS,
    )).toThrow(/invented:evidence.*attested/i);
    expect(() => assertPositiveHoldBundle(
      { ...HOLDS, evidence: [{ ...HOLDS.evidence[0], sha256: '0'.repeat(64) }] },
      CONTEXT,
      CONTENTS,
    )).toThrow(/sha-256/i);
    expect(() => assertPositiveHoldBundle(
      { ...HOLDS, evidence: [{ ...HOLDS.evidence[0], anchor: 'invented-anchor' }] },
      CONTEXT,
      CONTENTS,
    )).toThrow(/anchor/i);
  });

  it('accepts Authority observations only when every row is bound to actual evidence', () => {
    expect(() => assertAuthorityObservationBundle(AUTHORITY, CONTEXT, CONTENTS)).not.toThrow();
    expect(() => assertAuthorityObservationBundle({
      ...AUTHORITY,
      observations: [{ ...AUTHORITY.observations[0], evidenceIds: ['invented:evidence'] }],
    }, CONTEXT, CONTENTS)).toThrow(/invented:evidence.*attested/i);
  });

  it.each([
    ['turn', 103],
    ['current', 99],
    ['cap', 101],
  ] as const)('rejects Authority %s values not present in parsed attested evidence', (field, value) => {
    expect(() => assertAuthorityObservationBundle({
      ...AUTHORITY,
      observations: [{ ...AUTHORITY.observations[0], [field]: value }],
    }, CONTEXT, CONTENTS)).toThrow(/parsed attested evidence/i);
  });

  it('rejects generic prose even when its bytes and anchor are attested', () => {
    const generic = {
      ...AUTHORITY,
      evidence: [{
        id: 'authority:run-log',
        path: EVIDENCE_PATH,
        sha256: EVIDENCE_SHA,
        anchor: 'evidence',
      }],
    };
    expect(() => assertAuthorityObservationBundle(generic, CONTEXT, CONTENTS))
      .toThrow(/parsed attested evidence/i);
  });

  it('rejects Authority rows for another player or outside the bound range', () => {
    expect(() => assertAuthorityObservationBundle({
      ...AUTHORITY,
      observations: [{ ...AUTHORITY.observations[0], faction: 'RBiH' }],
    }, CONTEXT, CONTENTS)).toThrow(/playerFaction/i);
    expect(() => assertAuthorityObservationBundle({
      ...AUTHORITY,
      observations: [{ ...AUTHORITY.observations[0], turn: 105 }],
    }, CONTEXT, CONTENTS)).toThrow(/range/i);
  });
});
