import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const OFFICER_OOB_PROVENANCE_MANIFEST_PATH = 'docs/provenance/OFFICER_OOB_PROVENANCE.json';

export type ProvenanceRecordKind = 'officer' | 'corps' | 'brigade' | 'elite_commander' | 'manifest_orphan';
export type ProvenanceSeverity = 'blocking' | 'warning';
export type SourceTier = 'official' | 'primary' | 'tribunal' | 'scholarly' | 'archival' | 'dataset' | 'unverified';
export type IdentityConfidence = 'exact' | 'inferred' | 'conflict' | 'unverified';
export type IdentityDisposition = 'supported' | 'unsupported_pending_research' | 'conflict' | 'omitted';

export interface IdentityRelation {
    kind: 'same_person' | 'tenure_of' | 'inferred_name_similarity';
    target_record_key: string;
}

export interface OfficerOobProvenanceEntry {
    source: string | null;
    source_url: string | null;
    citation: string | null;
    source_tier: SourceTier;
    confidence: IdentityConfidence;
    identity_relation: IdentityRelation | null;
    court_record_citation: string | null;
    conflict_note: string | null;
    disposition: IdentityDisposition;
    notes: string | null;
}

export interface OfficerOobProvenanceManifest {
    schema_version: 1;
    defaults?: OfficerOobProvenanceEntry;
    records: Record<string, Partial<OfficerOobProvenanceEntry>>;
}

export interface OfficerLike {
    id: string;
    name: string;
    faction: string;
    home_corps_id?: string | null;
    historical_corps_id?: string | null;
    compatible_corps_ids?: string[];
    war_crimes_record?: unknown;
}

export interface CorpsLike {
    id: string;
    name: string;
    faction: string;
}

export interface BrigadeLike {
    id: string;
    name: string;
    faction: string;
    corps?: string | null;
    corps_id?: string | null;
    elite_commander?: {
        name?: string;
        war_crimes_record?: unknown;
    } | null;
}

export interface OfficerOobProvenanceInput {
    officers: { officers: OfficerLike[] };
    corps: { corps: CorpsLike[] };
    brigades: BrigadeLike[];
    manifest: OfficerOobProvenanceManifest;
}

export interface ProvenanceViolation {
    code: string;
    severity: ProvenanceSeverity;
    message: string;
}

export interface OfficerOobProvenanceRecord {
    record_key: string;
    record_kind: ProvenanceRecordKind;
    record_id: string;
    display_name: string;
    faction: string;
    formation_ref: string | null;
    corps_refs: string[];
    source: string | null;
    source_url: string | null;
    citation: string | null;
    source_tier: SourceTier | null;
    confidence: IdentityConfidence | null;
    identity_relation: IdentityRelation | null;
    court_record_citation: string | null;
    duplicate_record_keys: string[];
    conflict: string | null;
    disposition: IdentityDisposition | null;
    notes: string | null;
    violations: ProvenanceViolation[];
}

export interface OfficerOobProvenanceReport {
    schema_version: 1;
    inputs: {
        officers: string;
        corps: string;
        brigades: string;
        manifest: string;
    };
    summary: {
        total_records: number;
        manifest_records: number;
        supported_records: number;
        unsupported_records: number;
        blocking_violations: number;
        warning_violations: number;
        violations_by_code: Record<string, number>;
    };
    records: OfficerOobProvenanceRecord[];
}

interface DerivedIdentity {
    record_key: string;
    record_kind: Exclude<ProvenanceRecordKind, 'manifest_orphan'>;
    record_id: string;
    display_name: string;
    faction: string;
    formation_ref: string | null;
    corps_refs: string[];
    has_court_record: boolean;
    duplicate_source_id: boolean;
}

const ACCEPTED_SOURCE_TIERS = new Set<SourceTier>([
    'official',
    'primary',
    'tribunal',
    'scholarly',
    'archival',
    'dataset',
]);
const EXPLICIT_RELATION_KINDS = new Set<IdentityRelation['kind']>(['same_person', 'tenure_of']);
const REQUIRED_EXPLICIT_SUPPORTED_FIELDS = [
    'source',
    'source_url',
    'citation',
    'source_tier',
    'confidence',
    'disposition',
] as const satisfies ReadonlyArray<keyof OfficerOobProvenanceEntry>;

function compareText(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

function asNonEmpty(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
}

function normalizedIdentityName(name: string): string {
    return name
        .normalize('NFKD')
        .replace(/\p{Mark}/gu, '')
        .replace(/\s*\([^)]*\)\s*$/u, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
    return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0))]
        .sort(compareText);
}

function deriveIdentities(input: OfficerOobProvenanceInput): DerivedIdentity[] {
    const sourceIdCounts = new Map<string, number>();
    const countSourceId = (key: string): void => {
        sourceIdCounts.set(key, (sourceIdCounts.get(key) ?? 0) + 1);
    };

    for (const officer of input.officers.officers) countSourceId(`officer:${officer.id}`);
    for (const corps of input.corps.corps) countSourceId(`corps:${corps.id}`);
    for (const brigade of input.brigades) {
        countSourceId(`brigade:${brigade.id}`);
        if (asNonEmpty(brigade.elite_commander?.name)) countSourceId(`elite_commander:${brigade.id}`);
    }

    const byKey = new Map<string, DerivedIdentity>();
    const add = (identity: Omit<DerivedIdentity, 'duplicate_source_id'>): void => {
        if (byKey.has(identity.record_key)) return;
        byKey.set(identity.record_key, {
            ...identity,
            duplicate_source_id: (sourceIdCounts.get(identity.record_key) ?? 0) > 1,
        });
    };

    for (const officer of [...input.officers.officers].sort((a, b) =>
        compareText(`${a.id}\u0000${a.name}`, `${b.id}\u0000${b.name}`))) {
        add({
            record_key: `officer:${officer.id}`,
            record_kind: 'officer',
            record_id: officer.id,
            display_name: officer.name,
            faction: officer.faction,
            formation_ref: null,
            corps_refs: uniqueSorted([
                officer.home_corps_id,
                officer.historical_corps_id,
                ...(officer.compatible_corps_ids ?? []),
            ]),
            has_court_record: officer.war_crimes_record != null,
        });
    }

    for (const corps of [...input.corps.corps].sort((a, b) => compareText(a.id, b.id))) {
        add({
            record_key: `corps:${corps.id}`,
            record_kind: 'corps',
            record_id: corps.id,
            display_name: corps.name,
            faction: corps.faction,
            formation_ref: null,
            corps_refs: [],
            has_court_record: false,
        });
    }

    for (const brigade of [...input.brigades].sort((a, b) => compareText(a.id, b.id))) {
        const corpsId = brigade.corps ?? brigade.corps_id ?? null;
        add({
            record_key: `brigade:${brigade.id}`,
            record_kind: 'brigade',
            record_id: brigade.id,
            display_name: brigade.name,
            faction: brigade.faction,
            formation_ref: brigade.id,
            corps_refs: uniqueSorted([corpsId]),
            has_court_record: false,
        });

        const commanderName = asNonEmpty(brigade.elite_commander?.name);
        if (commanderName) {
            add({
                record_key: `elite_commander:${brigade.id}`,
                record_kind: 'elite_commander',
                record_id: brigade.id,
                display_name: commanderName,
                faction: brigade.faction,
                formation_ref: brigade.id,
                corps_refs: uniqueSorted([corpsId]),
                has_court_record: brigade.elite_commander?.war_crimes_record != null,
            });
        }
    }

    return [...byKey.values()].sort((a, b) => compareText(a.record_key, b.record_key));
}

function violation(code: string, message: string, severity: ProvenanceSeverity = 'blocking'): ProvenanceViolation {
    return { code, severity, message };
}

function sortViolations(violations: ProvenanceViolation[]): ProvenanceViolation[] {
    return violations.sort((a, b) => compareText(`${a.code}\u0000${a.message}`, `${b.code}\u0000${b.message}`));
}

function hasOwnField(
    row: Partial<OfficerOobProvenanceEntry>,
    field: keyof OfficerOobProvenanceEntry,
): boolean {
    return Object.prototype.hasOwnProperty.call(row, field);
}

export function buildOfficerOobProvenanceReport(input: OfficerOobProvenanceInput): OfficerOobProvenanceReport {
    const identities = deriveIdentities(input);
    const identityByKey = new Map(identities.map((identity) => [identity.record_key, identity]));
    const corpsById = new Map(input.corps.corps.map((corps) => [corps.id, corps]));
    const nameGroups = new Map<string, string[]>();

    for (const identity of identities.filter((candidate) =>
        candidate.record_kind === 'officer' || candidate.record_kind === 'elite_commander')) {
        const normalized = normalizedIdentityName(identity.display_name);
        if (!normalized) continue;
        const members = nameGroups.get(normalized) ?? [];
        members.push(identity.record_key);
        nameGroups.set(normalized, members);
    }
    for (const members of nameGroups.values()) members.sort(compareText);

    const records: OfficerOobProvenanceRecord[] = identities.map((identity) => {
        const manifestRow = input.manifest.records[identity.record_key];
        const entry = manifestRow == null
            ? undefined
            : { ...input.manifest.defaults, ...manifestRow } as OfficerOobProvenanceEntry;
        const violations: ProvenanceViolation[] = [];
        const duplicateRecordKeys = (nameGroups.get(normalizedIdentityName(identity.display_name)) ?? [])
            .filter((recordKey) => recordKey !== identity.record_key);

        if (identity.duplicate_source_id) {
            violations.push(violation('duplicate_record_id', `Source data repeats immutable key ${identity.record_key}.`));
        }

        for (const corpsId of identity.corps_refs) {
            const corps = corpsById.get(corpsId);
            if (!corps) {
                violations.push(violation('missing_corps_ref', `${identity.record_key} references absent corps ${corpsId}.`));
            } else if (corps.faction !== identity.faction) {
                violations.push(violation(
                    'cross_faction_corps_ref',
                    `${identity.record_key} (${identity.faction}) references ${corpsId} (${corps.faction}).`,
                ));
            }
        }

        if (!entry) {
            violations.push(violation('missing_provenance', `${identity.record_key} has no sidecar provenance row.`));
        } else {
            if (entry.disposition === 'supported' && manifestRow) {
                const requiredFields: Array<keyof OfficerOobProvenanceEntry> = [
                    ...REQUIRED_EXPLICIT_SUPPORTED_FIELDS,
                ];
                if (identity.has_court_record) requiredFields.push('court_record_citation');
                if (entry.identity_relation != null) requiredFields.push('identity_relation');
                const inheritedPositiveFields = requiredFields.filter((field) => !hasOwnField(manifestRow, field));
                if (inheritedPositiveFields.length > 0) {
                    violations.push(violation(
                        'inherited_positive_provenance',
                        `${identity.record_key} inherits positive evidence instead of owning fields: ${inheritedPositiveFields.join(', ')}.`,
                    ));
                }
            }
            if (!asNonEmpty(entry.source)) {
                violations.push(violation('missing_source', `${identity.record_key} has no exact source.`));
            }
            if (!asNonEmpty(entry.source_url)) {
                violations.push(violation('missing_source_url', `${identity.record_key} has no source URL.`));
            }
            if (!asNonEmpty(entry.citation)) {
                violations.push(violation('missing_citation', `${identity.record_key} has no exact citation.`));
            }
            if (!ACCEPTED_SOURCE_TIERS.has(entry.source_tier)) {
                violations.push(violation(
                    'unsupported_source_tier',
                    `${identity.record_key} uses source tier ${entry.source_tier}.`,
                ));
            }
            if (entry.confidence !== 'exact') {
                violations.push(violation(
                    'non_exact_confidence',
                    `${identity.record_key} confidence is ${entry.confidence}, not exact.`,
                ));
            }
            if (entry.disposition !== 'supported') {
                violations.push(violation(
                    'unsupported_disposition',
                    `${identity.record_key} disposition is ${entry.disposition}.`,
                ));
            }
            if (entry.identity_relation) {
                if (entry.identity_relation.kind === 'inferred_name_similarity') {
                    violations.push(violation(
                        'inferred_identity_relation',
                        `${identity.record_key} relies on name similarity for identity.`,
                    ));
                }
                if (!identityByKey.has(entry.identity_relation.target_record_key)) {
                    violations.push(violation(
                        'identity_relation_target_missing',
                        `${identity.record_key} relation target ${entry.identity_relation.target_record_key} is absent.`,
                    ));
                }
            }
            if (identity.has_court_record && !asNonEmpty(entry.court_record_citation)) {
                violations.push(violation(
                    'missing_court_record_citation',
                    `${identity.record_key} carries a court record without an exact court citation.`,
                ));
            }
        }

        if (duplicateRecordKeys.length > 0) {
            const relation = manifestRow?.identity_relation;
            const explicitlyResolved = relation != null
                && EXPLICIT_RELATION_KINDS.has(relation.kind)
                && duplicateRecordKeys.includes(relation.target_record_key);
            const reverseResolved = duplicateRecordKeys.some((recordKey) => {
                const candidate = input.manifest.records[recordKey]?.identity_relation;
                return candidate != null
                    && EXPLICIT_RELATION_KINDS.has(candidate.kind)
                    && candidate.target_record_key === identity.record_key;
            });
            if (!explicitlyResolved && !reverseResolved) {
                violations.push(violation(
                    'unresolved_normalized_identity_collision',
                    `${identity.record_key} shares a normalized name with ${duplicateRecordKeys.join(', ')} without an exact relation.`,
                ));
            }
        }

        return {
            record_key: identity.record_key,
            record_kind: identity.record_kind,
            record_id: identity.record_id,
            display_name: identity.display_name,
            faction: identity.faction,
            formation_ref: identity.formation_ref,
            corps_refs: identity.corps_refs,
            source: entry?.source ?? null,
            source_url: entry?.source_url ?? null,
            citation: entry?.citation ?? null,
            source_tier: entry?.source_tier ?? null,
            confidence: entry?.confidence ?? null,
            identity_relation: entry?.identity_relation ?? null,
            court_record_citation: entry?.court_record_citation ?? null,
            duplicate_record_keys: duplicateRecordKeys,
            conflict: entry?.conflict_note ?? (duplicateRecordKeys.length > 0 ? 'normalized_name_collision' : null),
            disposition: entry?.disposition ?? null,
            notes: entry?.notes ?? null,
            violations: sortViolations(violations),
        };
    });

    for (const recordKey of Object.keys(input.manifest.records).sort(compareText)) {
        if (identityByKey.has(recordKey)) continue;
        const entry = {
            ...input.manifest.defaults,
            ...input.manifest.records[recordKey],
        } as OfficerOobProvenanceEntry;
        records.push({
            record_key: `manifest_orphan:${recordKey}`,
            record_kind: 'manifest_orphan',
            record_id: recordKey,
            display_name: recordKey,
            faction: '',
            formation_ref: null,
            corps_refs: [],
            source: entry.source ?? null,
            source_url: entry.source_url ?? null,
            citation: entry.citation ?? null,
            source_tier: entry.source_tier ?? null,
            confidence: entry.confidence ?? null,
            identity_relation: entry.identity_relation ?? null,
            court_record_citation: entry.court_record_citation ?? null,
            duplicate_record_keys: [],
            conflict: 'manifest_record_orphaned',
            disposition: entry.disposition ?? null,
            notes: entry.notes ?? null,
            violations: [violation('manifest_record_orphaned', `Manifest key ${recordKey} has no source-data row.`)],
        });
    }
    records.sort((a, b) => compareText(a.record_key, b.record_key));

    const allViolations = records.flatMap((record) => record.violations);
    const violationCounts = new Map<string, number>();
    for (const item of allViolations) violationCounts.set(item.code, (violationCounts.get(item.code) ?? 0) + 1);
    const supportedRecords = records.filter((record) =>
        record.record_kind !== 'manifest_orphan'
        && record.disposition === 'supported'
        && record.violations.every((item) => item.severity !== 'blocking')).length;
    const sourceRecordCount = records.filter((record) => record.record_kind !== 'manifest_orphan').length;

    return {
        schema_version: 1,
        inputs: {
            officers: 'data/scenarios/officers/apr1992_officers.json',
            corps: 'data/source/oob_corps.json',
            brigades: 'data/source/oob_brigades.json',
            manifest: OFFICER_OOB_PROVENANCE_MANIFEST_PATH,
        },
        summary: {
            total_records: sourceRecordCount,
            manifest_records: Object.keys(input.manifest.records).length,
            supported_records: supportedRecords,
            unsupported_records: sourceRecordCount - supportedRecords,
            blocking_violations: allViolations.filter((item) => item.severity === 'blocking').length,
            warning_violations: allViolations.filter((item) => item.severity === 'warning').length,
            violations_by_code: Object.fromEntries([...violationCounts.entries()].sort(([a], [b]) => compareText(a, b))),
        },
        records,
    };
}

function readJson<T>(rootDir: string, relativePath: string): T {
    return JSON.parse(readFileSync(resolve(rootDir, ...relativePath.split('/')), 'utf8')) as T;
}

export function loadOfficerOobProvenanceReport(rootDir = process.cwd()): OfficerOobProvenanceReport {
    return buildOfficerOobProvenanceReport({
        officers: readJson(rootDir, 'data/scenarios/officers/apr1992_officers.json'),
        corps: readJson(rootDir, 'data/source/oob_corps.json'),
        brigades: readJson(rootDir, 'data/source/oob_brigades.json'),
        manifest: readJson(rootDir, OFFICER_OOB_PROVENANCE_MANIFEST_PATH),
    });
}

export function serializeOfficerOobProvenanceReport(report: OfficerOobProvenanceReport): string {
    return `${JSON.stringify(report, null, 2)}\n`;
}

function isMainModule(): boolean {
    const entry = process.argv[1];
    return entry != null && resolve(entry) === resolve(fileURLToPath(import.meta.url));
}

if (isMainModule()) {
    const report = loadOfficerOobProvenanceReport(process.cwd());
    process.stdout.write(serializeOfficerOobProvenanceReport(report));
    if (process.argv.includes('--strict') && report.summary.blocking_violations > 0) process.exitCode = 1;
}
