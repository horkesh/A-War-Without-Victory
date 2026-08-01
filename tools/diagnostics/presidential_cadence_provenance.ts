import { createHash } from 'node:crypto';
import { isAbsolute } from 'node:path';

import type {
  PresidentialAuthorityObservation,
  PresidentialPositiveHold,
} from '../../src/sim/presidency/presidential_cadence.js';

export type CadencePlayerFaction = 'RBiH' | 'RS' | 'HRHB';

export interface CadenceProvenanceContext {
  sourceId: string;
  scenarioId: string;
  runId: string;
  playerFaction: CadencePlayerFaction | null;
  startTurn: number;
  endTurn: number;
  saveTurn: number;
  sourceSaveSha256: string;
}

export interface CadenceEvidenceAttestation {
  id: string;
  path: string;
  sha256: string;
  anchor?: string;
}

export interface PositiveHoldEvidenceBundle {
  schemaVersion: 1;
  provenance: CadenceProvenanceContext;
  evidence: CadenceEvidenceAttestation[];
  positiveHoldEvidenceIds: string[];
  positiveHolds: PresidentialPositiveHold[];
}

export interface BoundPresidentialAuthorityObservation extends PresidentialAuthorityObservation {
  evidenceIds: string[];
}

export interface AuthorityObservationEvidenceBundle {
  schemaVersion: 1;
  provenance: CadenceProvenanceContext;
  evidence: CadenceEvidenceAttestation[];
  observations: BoundPresidentialAuthorityObservation[];
}

export type CadenceEvidenceContents = Readonly<Record<string, string>>;

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
}

function headingAnchors(source: string): Set<string> {
  return new Set(source
    .split(/\r?\n/)
    .filter((line) => /^#{1,6}\s/.test(line))
    .map((line) => line.replace(/^#{1,6}\s+/, '').trim().toLowerCase())
    .map((heading) => heading.replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')));
}

function assertContextShape(context: CadenceProvenanceContext): void {
  for (const field of ['sourceId', 'scenarioId', 'runId'] as const) {
    if (typeof context[field] !== 'string' || context[field].trim().length === 0) {
      throw new Error(`Cadence provenance ${field} must be a non-empty string.`);
    }
  }
  if (
    context.playerFaction !== null
    && context.playerFaction !== 'RBiH'
    && context.playerFaction !== 'RS'
    && context.playerFaction !== 'HRHB'
  ) {
    throw new Error('Cadence provenance playerFaction must be RBiH, RS, HRHB, or null.');
  }
  if (
    !isNonNegativeInteger(context.startTurn)
    || !isNonNegativeInteger(context.endTurn)
    || context.endTurn < context.startTurn
  ) {
    throw new Error('Cadence provenance range must be ordered and non-negative.');
  }
  if (!isNonNegativeInteger(context.saveTurn)) {
    throw new Error('Cadence provenance saveTurn must be a non-negative integer.');
  }
  if (context.saveTurn !== context.endTurn) {
    throw new Error('Cadence provenance saveTurn must equal endTurn.');
  }
  if (!isSha256(context.sourceSaveSha256)) {
    throw new Error('Cadence provenance sourceSaveSha256 must be a SHA-256 digest.');
  }
}

function assertExactProvenance(
  actual: CadenceProvenanceContext,
  expected: CadenceProvenanceContext,
): void {
  assertContextShape(expected);
  assertContextShape(actual);
  for (const field of [
    'sourceId',
    'scenarioId',
    'runId',
    'playerFaction',
    'startTurn',
    'endTurn',
    'saveTurn',
    'sourceSaveSha256',
  ] as const) {
    if (actual[field] !== expected[field]) {
      throw new Error(`Cadence provenance ${field} does not match the actual source context.`);
    }
  }
}

function assertAttestedEvidence(
  evidence: readonly CadenceEvidenceAttestation[],
  contents: CadenceEvidenceContents,
): Set<string> {
  if (!Array.isArray(evidence) || evidence.length === 0) {
    throw new Error('Cadence evidence bundle must contain at least one attestation.');
  }
  const admitted = new Set<string>();
  for (const row of evidence) {
    if (!row || typeof row !== 'object' || typeof row.id !== 'string' || row.id.trim().length === 0) {
      throw new Error('Cadence evidence attestation id must be non-empty.');
    }
    if (admitted.has(row.id)) throw new Error(`Cadence evidence id is duplicated: ${row.id}.`);
    if (
      typeof row.path !== 'string'
      || row.path.trim().length === 0
      || isAbsolute(row.path)
      || row.path.includes('..')
      || row.path.includes('\\')
    ) {
      throw new Error(`Cadence evidence path must be repository-relative POSIX text: ${row.path}.`);
    }
    const source = contents[row.path];
    if (typeof source !== 'string') {
      throw new Error(`Cadence evidence file is not resolved: ${row.path}.`);
    }
    if (!isSha256(row.sha256)) {
      throw new Error(`Cadence evidence ${row.id} has an invalid SHA-256 attestation.`);
    }
    const actualSha = createHash('sha256').update(source).digest('hex');
    if (actualSha !== row.sha256.toLowerCase()) {
      throw new Error(`Cadence evidence ${row.id} SHA-256 does not match resolved bytes.`);
    }
    if (row.anchor && !headingAnchors(source).has(row.anchor)) {
      throw new Error(`Cadence evidence ${row.id} anchor is not present: ${row.anchor}.`);
    }
    admitted.add(row.id);
  }
  return admitted;
}

function assertEvidenceIds(
  evidenceIds: readonly string[],
  admitted: ReadonlySet<string>,
  owner: string,
): void {
  if (!Array.isArray(evidenceIds) || evidenceIds.length === 0) {
    throw new Error(`${owner} must cite at least one attested evidence id.`);
  }
  for (const evidenceId of evidenceIds) {
    if (!admitted.has(evidenceId)) {
      throw new Error(`${owner} evidence ${evidenceId} is not attested.`);
    }
  }
}

function authorityEvidenceRows(source: string): Array<{
  faction: unknown;
  turn: unknown;
  current: unknown;
  cap: unknown;
}> {
  try {
    const parsed = JSON.parse(source) as {
      schemaVersion?: unknown;
      observations?: unknown;
    };
    if (
      !parsed
      || typeof parsed !== 'object'
      || parsed.schemaVersion !== 1
      || !Array.isArray(parsed.observations)
    ) {
      return [];
    }
    return parsed.observations.filter((row): row is {
      faction: unknown;
      turn: unknown;
      current: unknown;
      cap: unknown;
    } => Boolean(row) && typeof row === 'object') as Array<{
      faction: unknown;
      turn: unknown;
      current: unknown;
      cap: unknown;
    }>;
  } catch {
    return [];
  }
}

export function assertPositiveHoldBundle(
  bundle: PositiveHoldEvidenceBundle,
  expected: CadenceProvenanceContext,
  contents: CadenceEvidenceContents,
): void {
  if (!bundle || typeof bundle !== 'object' || bundle.schemaVersion !== 1) {
    throw new Error('Positive-hold bundle schemaVersion must be 1.');
  }
  assertExactProvenance(bundle.provenance, expected);
  const admitted = assertAttestedEvidence(bundle.evidence, contents);
  assertEvidenceIds(bundle.positiveHoldEvidenceIds, admitted, 'Positive-hold bundle');
  if (!Array.isArray(bundle.positiveHolds)) throw new Error('Positive-hold bundle must contain positiveHolds.');
  for (const hold of bundle.positiveHolds) {
    if (
      !hold
      || typeof hold !== 'object'
      || !isNonNegativeInteger(hold.fromTurn)
      || !isNonNegativeInteger(hold.toTurn)
      || hold.fromTurn < expected.startTurn
      || hold.toTurn > expected.endTurn
      || hold.toTurn <= hold.fromTurn
    ) {
      throw new Error(`Positive hold ${hold?.id ?? '<unknown>'} is outside the bound range.`);
    }
    if (expected.playerFaction !== null && hold.faction !== expected.playerFaction) {
      throw new Error(`Positive hold ${hold.id} faction does not match playerFaction.`);
    }
    assertEvidenceIds(hold.evidenceIds, admitted, `Positive hold ${hold.id}`);
  }
}

export function assertAuthorityObservationBundle(
  bundle: AuthorityObservationEvidenceBundle,
  expected: CadenceProvenanceContext,
  contents: CadenceEvidenceContents,
): void {
  if (!bundle || typeof bundle !== 'object' || bundle.schemaVersion !== 1) {
    throw new Error('Authority-observation bundle schemaVersion must be 1.');
  }
  assertExactProvenance(bundle.provenance, expected);
  const admitted = assertAttestedEvidence(bundle.evidence, contents);
  if (!Array.isArray(bundle.observations) || bundle.observations.length === 0) {
    throw new Error('Authority-observation bundle must contain observations.');
  }
  if (expected.playerFaction === null) {
    throw new Error('Authority-observation bundle requires a playerFaction-bound source.');
  }
  const evidenceById = new Map(bundle.evidence.map((row) => [row.id, row]));
  for (const observation of bundle.observations) {
    if (observation.faction !== expected.playerFaction) {
      throw new Error(`Authority observation faction does not match playerFaction at turn ${observation.turn}.`);
    }
    if (
      !isNonNegativeInteger(observation.turn)
      || observation.turn < expected.startTurn
      || observation.turn > expected.endTurn
    ) {
      throw new Error(`Authority observation turn ${observation.turn} is outside the bound range.`);
    }
    if (
      !Number.isFinite(observation.current)
      || !Number.isFinite(observation.cap)
      || observation.current < 0
      || observation.cap <= 0
      || observation.current > observation.cap
    ) {
      throw new Error(`Authority observation at turn ${observation.turn} has invalid values.`);
    }
    assertEvidenceIds(observation.evidenceIds, admitted, `Authority observation at turn ${observation.turn}`);
    const semanticallyAttested = observation.evidenceIds.some((evidenceId) => {
      const attestation = evidenceById.get(evidenceId);
      if (!attestation) return false;
      const source = contents[attestation.path];
      if (typeof source !== 'string') return false;
      return authorityEvidenceRows(source).some((row) => (
        row.faction === observation.faction
        && row.turn === observation.turn
        && row.current === observation.current
        && row.cap === observation.cap
      ));
    });
    if (!semanticallyAttested) {
      throw new Error(
        `Authority observation at turn ${observation.turn} is not present in parsed attested evidence.`,
      );
    }
  }
}
