/**
 * Phase F Packet 2 — sensitive-history canon-gate audit tool.
 *
 * Static-analysis audit complementing Phase D Packet 44's loader vocabulary
 * validation. Walks every event in the war_1992/1993/1994/1995/consequences
 * catalogs and verifies semantic compliance with:
 *
 *   - SENSITIVE_HISTORY_DESIGN_GATE.md §1.3 — eleven Ring 3 refusals
 *   - SENSITIVE_HISTORY_DESIGN_GATE.md §3.6 — forward-looking guard text on
 *     Ring 3 sensitive-history events (prohibition phrase + sensitive-act
 *     keyword pair)
 *   - SENSITIVE_HISTORY_DESIGN_GATE.md §4 — Cost Ledger wording constraints
 *     (transitively, via the punitive cost-floor heuristic on counterfactual
 *     options that mirror Ring 3 refused decisions)
 *   - Ring 3 enabling rejection (static counterpart of the loader's
 *     `validateRing3EnablingRejection` runtime gate)
 *
 * The tool is intentionally heuristic: it does NOT replace `/historian` or
 * `/game-designer` sign-off, but it does prevent silent §3.6 guard drift
 * (missing prohibition text on a Ring 3 row) and the "rewarded atrocity"
 * authoring failure mode (sensitive counterfactual carrying a positive
 * territorial_legitimacy delta or a recruitment_modifier multiplier > 1.0).
 *
 * CLI:
 *   node node_modules/tsx/dist/cli.mjs tools/diagnostics/sensitive_history_canon_gate_audit.ts [options]
 *
 * Options:
 *   --json              Emit structured JSON; otherwise plain-text report.
 *   --family <id>       Restrict to events whose `family` equals this id.
 *   --violations-only   Print only events with at least one violation.
 *   --strict            Exit non-zero when the audit surfaces any violation.
 *
 * Determinism: sorted iteration via `strictCompare` everywhere; pure function
 * given the catalog files; no Math.random, no Date.now, no timestamps.
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
    isRing3SensitiveFamily,
    RING3_SENSITIVE_FAMILIES,
} from '../../src/sim/events/event_families.js';

const CATALOG_FILES = [
    'data/scenarios/events/war_1992.json',
    'data/scenarios/events/war_1993.json',
    'data/scenarios/events/war_1994.json',
    'data/scenarios/events/war_1995.json',
    'data/scenarios/events/consequences.json',
] as const;

// ─── §3.6 guard heuristic vocabulary ───────────────────────────────────────
// A source_note passes §3.6 when it contains BOTH a prohibition phrase AND a
// sensitive-act keyword (case-insensitive). Either signal alone is
// insufficient. Bonus: explicit "§3.6" / "3.6" mention is recorded for the
// report but not required.

export const PROHIBITION_PHRASES: readonly string[] = [
    'must not',
    'forbidden',
    'prohibited',
    'canon-gated',
    'canon-bound',
    'canon-refused',
    'no [...]',
    'cannot re-author',
    'may not',
    're-author',
] as const;

export const SENSITIVE_ACT_KEYWORDS: readonly string[] = [
    'cleansing',
    'displacement',
    'civilian-targeting',
    'civilian targeting',
    'paramilitary',
    'hostage',
    'atrocity',
    'ethnic-targeting',
    'ethnic targeting',
    'detention-camp',
    'detention camp',
    'genocide',
    'forced-displacement',
    'forced displacement',
] as const;

// ─── Sensitive counterfactual option-id matchers ───────────────────────────
// Options whose ids canonically mirror a Ring 3 refused or sensitive-adjacent
// choice. When detected, the cost floor MUST be punitive (≥2 negative
// canonical dimensions) AND MUST NOT carry positive territorial_legitimacy or
// recruitment_modifier > 1.0.

export const SENSITIVE_OPTION_ID_EXACT: readonly string[] = [
    'transfer_detainees',
    'mandatory_purge',
    'expansive_conquest',
    'maximalist_with_serb_alliance',
    'accept_de_facto_partition',
    'seek_clandestine_arms',
    'escalate_to_strategic_threat',
    'accept_minority_rights_only',
] as const;

export const SENSITIVE_OPTION_ID_PREFIXES: readonly string[] = [
    'breakout_',
] as const;

// ─── Punitive-dimension scoring ────────────────────────────────────────────
// Negative deltas on any of these dimensions count as a "punitive marker."
const PUNITIVE_DIMENSIONS: readonly string[] = [
    'international_standing',
    'internal_cohesion',
    'military_credibility',
];

const FORBIDDEN_POSITIVE_DIMENSIONS: readonly string[] = [
    'territorial_legitimacy',
];

// ─── Types ────────────────────────────────────────────────────────────────

export type Severity = 'CRITICAL' | 'WARNING' | 'INFO';

export type ViolationKind =
    | 'missing_section_3_6_guard'
    | 'weak_punitive_floor'
    | 'forbidden_positive_territorial_legitimacy'
    | 'forbidden_recruitment_modifier_above_one'
    | 'ring3_enabling_target';

export interface Violation {
    event_id: string;
    family: string | null;
    kind: ViolationKind;
    severity: Severity;
    detail: string;
    /** Optional sub-locator (option_id, dimension, target_event_id). */
    locator: string | null;
}

export interface EventComplianceReport {
    event_id: string;
    family: string | null;
    source_tier: string | null;
    is_ring3_family: boolean;
    is_sensitive_adjacent: boolean;
    section_3_6_guard: 'PASS' | 'MISSING' | 'NA';
    section_3_6_explicit_reference: boolean;
    punitive_cost_floor: 'PASS' | 'FAIL' | 'NA';
    ring3_enabling: 'PASS' | 'FAIL' | 'NA';
    forbidden_positive_shifts: 'PASS' | 'FAIL' | 'NA';
    detected_sensitive_options: string[];
    violations: Violation[];
}

export interface AuditSummary {
    total_events_scanned: number;
    total_ring3_family_events: number;
    total_sensitive_adjacent_events: number;
    total_clean_events: number;
    total_events_with_violations: number;
    total_violations: number;
    violations_by_severity: { CRITICAL: number; WARNING: number; INFO: number };
    violations_by_family: Record<string, number>;
    violations_by_kind: Record<ViolationKind, number>;
}

export interface AuditReport {
    catalog_files: readonly string[];
    filter: {
        family: string | null;
        violations_only: boolean;
    };
    events: EventComplianceReport[];
    violations: Violation[];
    summary: AuditSummary;
}

export interface AuditOptions {
    /** Pre-loaded raw event rows. Tests pass this to skip disk I/O. */
    rows?: unknown[] | null;
    /** Restrict to events whose `family` matches. */
    family?: string | null;
    /** Strip events with no violations from the report.events list. */
    violationsOnly?: boolean;
}

// ─── Utilities ────────────────────────────────────────────────────────────

function strictCompare(a: string, b: string): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringOrNull(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
}

function numberOrNull(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function repoRoot(): string {
    return process.cwd();
}

/** Severity rank for stable sort (CRITICAL highest). */
function severityRank(s: Severity): number {
    if (s === 'CRITICAL') return 0;
    if (s === 'WARNING') return 1;
    return 2;
}

function compareViolations(a: Violation, b: Violation): number {
    const sr = severityRank(a.severity) - severityRank(b.severity);
    if (sr !== 0) return sr;
    const idCmp = strictCompare(a.event_id, b.event_id);
    if (idCmp !== 0) return idCmp;
    const kindCmp = strictCompare(a.kind, b.kind);
    if (kindCmp !== 0) return kindCmp;
    return strictCompare(a.locator ?? '', b.locator ?? '');
}

// ─── Catalog loader ───────────────────────────────────────────────────────

/** Load every catalog row from disk. Disk I/O isolated for test injection. */
export function loadCatalogRows(): unknown[] {
    const out: unknown[] = [];
    for (const rel of CATALOG_FILES) {
        const full = path.join(repoRoot(), rel);
        if (!existsSync(full)) continue;
        const parsed = JSON.parse(readFileSync(full, 'utf8')) as unknown;
        if (!Array.isArray(parsed)) continue;
        for (const entry of parsed) out.push(entry);
    }
    return out;
}

// ─── Section 3.6 guard heuristic ──────────────────────────────────────────

export function evaluateSection36Guard(sourceNote: string | null): {
    pass: boolean;
    has_prohibition: boolean;
    has_sensitive_keyword: boolean;
    has_explicit_3_6_reference: boolean;
} {
    if (sourceNote === null) {
        return {
            pass: false,
            has_prohibition: false,
            has_sensitive_keyword: false,
            has_explicit_3_6_reference: false,
        };
    }
    const lower = sourceNote.toLowerCase();
    let hasProhibition = false;
    for (const phrase of PROHIBITION_PHRASES) {
        if (lower.includes(phrase)) {
            hasProhibition = true;
            break;
        }
    }
    let hasKeyword = false;
    for (const kw of SENSITIVE_ACT_KEYWORDS) {
        if (lower.includes(kw)) {
            hasKeyword = true;
            break;
        }
    }
    const explicit = sourceNote.includes('§3.6') || lower.includes('section 3.6') || lower.includes(' 3.6 ');
    return {
        pass: hasProhibition && hasKeyword,
        has_prohibition: hasProhibition,
        has_sensitive_keyword: hasKeyword,
        has_explicit_3_6_reference: explicit,
    };
}

// ─── Sensitive-option detection + cost-floor scoring ──────────────────────

function isSensitiveOptionId(optionId: string | null): boolean {
    if (optionId === null) return false;
    if (SENSITIVE_OPTION_ID_EXACT.includes(optionId)) return true;
    for (const prefix of SENSITIVE_OPTION_ID_PREFIXES) {
        if (optionId.startsWith(prefix)) return true;
    }
    return false;
}

interface OptionCostScan {
    punitive_markers: number;
    positive_territorial_legitimacy: boolean;
    recruitment_modifier_above_one: boolean;
}

/** Scan an option's dimension_shifts[] + effects[] for punitive markers and
 *  forbidden positive markers. Pure given input. */
export function scanOptionCostFloor(option: unknown): OptionCostScan {
    const scan: OptionCostScan = {
        punitive_markers: 0,
        positive_territorial_legitimacy: false,
        recruitment_modifier_above_one: false,
    };
    if (!isRecord(option)) return scan;
    // dimension_shifts[]: count negative deltas on punitive dims; flag any
    // positive forbidden dim.
    const shifts = Array.isArray(option.dimension_shifts) ? option.dimension_shifts : [];
    for (const shift of shifts) {
        if (!isRecord(shift)) continue;
        const dim = stringOrNull(shift.dimension);
        const delta = numberOrNull(shift.delta);
        if (dim === null || delta === null) continue;
        if (PUNITIVE_DIMENSIONS.includes(dim) && delta < 0) {
            scan.punitive_markers += 1;
        }
        if (FORBIDDEN_POSITIVE_DIMENSIONS.includes(dim) && delta > 0) {
            scan.positive_territorial_legitimacy = true;
        }
    }
    // effects[]: recruitment_modifier with multiplier < 1.0 counts as punitive
    // marker; multiplier > 1.0 is a forbidden positive.
    const effects = Array.isArray(option.effects) ? option.effects : [];
    for (const effect of effects) {
        if (!isRecord(effect)) continue;
        if (effect.kind !== 'recruitment_modifier') continue;
        const mult = numberOrNull(effect.multiplier);
        if (mult === null) continue;
        if (mult < 1.0) scan.punitive_markers += 1;
        if (mult > 1.0) scan.recruitment_modifier_above_one = true;
    }
    return scan;
}

// ─── Ring 3 enabling rejection (static counterpart) ───────────────────────

/** Build a map of event-id → row for lookups. */
function indexById(rows: unknown[]): Map<string, Record<string, unknown>> {
    const out = new Map<string, Record<string, unknown>>();
    for (const row of rows) {
        if (!isRecord(row)) continue;
        const id = stringOrNull(row.id);
        if (id === null) continue;
        out.set(id, row);
    }
    return out;
}

/** Find every other row whose response_options carry an enables_events_runtime
 *  reference targeting `targetId`. Returns sorted opener event-ids. */
function findUpstreamEnablers(
    targetId: string,
    rows: unknown[],
): Array<{ opener_id: string; option_id: string | null }> {
    const out: Array<{ opener_id: string; option_id: string | null }> = [];
    for (const row of rows) {
        if (!isRecord(row)) continue;
        const openerId = stringOrNull(row.id);
        if (openerId === null || openerId === targetId) continue;
        const options = Array.isArray(row.response_options) ? row.response_options : [];
        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            if (!isRecord(option)) continue;
            const enables = Array.isArray(option.enables_events_runtime)
                ? option.enables_events_runtime
                : [];
            for (const e of enables) {
                if (typeof e === 'string' && e === targetId) {
                    out.push({ opener_id: openerId, option_id: stringOrNull(option.id) });
                }
            }
        }
        // Also event-level enables_events[]
        const eventLevel = Array.isArray(row.enables_events) ? row.enables_events : [];
        for (const e of eventLevel) {
            if (typeof e === 'string' && e === targetId) {
                out.push({ opener_id: openerId, option_id: null });
            }
        }
    }
    return out.sort((a, b) => {
        const c = strictCompare(a.opener_id, b.opener_id);
        if (c !== 0) return c;
        return strictCompare(a.option_id ?? '', b.option_id ?? '');
    });
}

// ─── Per-event compliance evaluation ──────────────────────────────────────

function evaluateEvent(row: Record<string, unknown>, allRows: unknown[]): EventComplianceReport {
    const eventId = stringOrNull(row.id) ?? '<unknown>';
    const family = stringOrNull(row.family);
    const sourceTier = stringOrNull(row.source_tier);
    const ring3 = isRing3SensitiveFamily(family ?? undefined);

    const violations: Violation[] = [];

    // Detected sensitive options (canonically counterfactual option ids).
    const options = Array.isArray(row.response_options) ? row.response_options : [];
    const detectedSensitive: string[] = [];
    for (const option of options) {
        if (!isRecord(option)) continue;
        const oid = stringOrNull(option.id);
        if (oid !== null && isSensitiveOptionId(oid)) detectedSensitive.push(oid);
    }
    detectedSensitive.sort(strictCompare);

    const sensitiveAdjacent = !ring3 && detectedSensitive.length > 0;

    // ─── §3.6 guard check (Ring 3 only) ────────────────────────────────────
    let section36: EventComplianceReport['section_3_6_guard'] = 'NA';
    let section36Explicit = false;
    if (ring3) {
        const sourceNote = stringOrNull(row.source_note);
        const guard = evaluateSection36Guard(sourceNote);
        section36Explicit = guard.has_explicit_3_6_reference;
        if (guard.pass) {
            section36 = 'PASS';
        } else {
            section36 = 'MISSING';
            const missing: string[] = [];
            if (!guard.has_prohibition) missing.push('prohibition_phrase');
            if (!guard.has_sensitive_keyword) missing.push('sensitive_act_keyword');
            violations.push({
                event_id: eventId,
                family,
                kind: 'missing_section_3_6_guard',
                severity: 'CRITICAL',
                detail: `Ring 3 sensitive-family event missing §3.6 forward-looking guard text (absent: ${missing.join(', ') || 'source_note'})`,
                locator: null,
            });
        }
    }

    // ─── Punitive cost-floor check on sensitive counterfactual options ────
    let punitive: EventComplianceReport['punitive_cost_floor'] = 'NA';
    let forbiddenShifts: EventComplianceReport['forbidden_positive_shifts'] = 'NA';
    if (detectedSensitive.length > 0) {
        punitive = 'PASS';
        forbiddenShifts = 'PASS';
        for (const option of options) {
            if (!isRecord(option)) continue;
            const oid = stringOrNull(option.id);
            if (oid === null || !isSensitiveOptionId(oid)) continue;
            const scan = scanOptionCostFloor(option);
            if (scan.punitive_markers < 2) {
                punitive = 'FAIL';
                violations.push({
                    event_id: eventId,
                    family,
                    kind: 'weak_punitive_floor',
                    severity: 'WARNING',
                    detail: `Sensitive counterfactual option \`${oid}\` has only ${scan.punitive_markers} punitive marker(s); §4 Cost Ledger expects ≥2 negative canonical dimensions (international_standing, internal_cohesion, military_credibility, or recruitment_modifier < 1.0)`,
                    locator: oid,
                });
            }
            if (scan.positive_territorial_legitimacy) {
                forbiddenShifts = 'FAIL';
                violations.push({
                    event_id: eventId,
                    family,
                    kind: 'forbidden_positive_territorial_legitimacy',
                    severity: 'CRITICAL',
                    detail: `Sensitive counterfactual option \`${oid}\` rewards atrocity-adjacent choice with positive territorial_legitimacy delta — violates §1.3 #4 (no body-count optimization surface) and §6 Pyrrhic invariant`,
                    locator: oid,
                });
            }
            if (scan.recruitment_modifier_above_one) {
                forbiddenShifts = 'FAIL';
                violations.push({
                    event_id: eventId,
                    family,
                    kind: 'forbidden_recruitment_modifier_above_one',
                    severity: 'CRITICAL',
                    detail: `Sensitive counterfactual option \`${oid}\` carries recruitment_modifier > 1.0 — violates §1.3 #5 (no "atrocity efficiency" metric)`,
                    locator: oid,
                });
            }
        }
    }

    // ─── Ring 3 enabling rejection (static-text level) ────────────────────
    let enabling: EventComplianceReport['ring3_enabling'] = 'NA';
    if (ring3) {
        const upstream = findUpstreamEnablers(eventId, allRows);
        if (upstream.length === 0) {
            enabling = 'PASS';
        } else {
            enabling = 'FAIL';
            for (const entry of upstream) {
                violations.push({
                    event_id: eventId,
                    family,
                    kind: 'ring3_enabling_target',
                    severity: 'CRITICAL',
                    detail: `Ring 3 sensitive-family event is targeted by upstream enables — packet §3.6 forbids runtime enabling of Ring 3 events (opener: ${entry.opener_id}${entry.option_id ? `#${entry.option_id}` : ''})`,
                    locator: `${entry.opener_id}${entry.option_id ? `#${entry.option_id}` : ''}`,
                });
            }
        }
    }

    violations.sort(compareViolations);

    return {
        event_id: eventId,
        family,
        source_tier: sourceTier,
        is_ring3_family: ring3,
        is_sensitive_adjacent: sensitiveAdjacent,
        section_3_6_guard: section36,
        section_3_6_explicit_reference: section36Explicit,
        punitive_cost_floor: punitive,
        ring3_enabling: enabling,
        forbidden_positive_shifts: forbiddenShifts,
        detected_sensitive_options: detectedSensitive,
        violations,
    };
}

// ─── Build the audit report ───────────────────────────────────────────────

/** Build a sensitive-history canon-gate audit from disk or injected rows.
 *  Pure given inputs. Sorted iteration. Deterministic. */
export function buildSensitiveHistoryAudit(options: AuditOptions = {}): AuditReport {
    const rows: unknown[] = options.rows ?? loadCatalogRows();
    const familyFilter = options.family ?? null;
    const violationsOnly = options.violationsOnly === true;

    // Deterministic iteration: sort rows by id before evaluation.
    const sortedRows = [...rows]
        .filter((r): r is Record<string, unknown> => isRecord(r) && stringOrNull(r.id) !== null)
        .sort((a, b) => strictCompare(String(a.id), String(b.id)));

    const filteredRows = familyFilter === null
        ? sortedRows
        : sortedRows.filter((r) => stringOrNull(r.family) === familyFilter);

    const reports: EventComplianceReport[] = [];
    const allViolations: Violation[] = [];

    for (const row of filteredRows) {
        const report = evaluateEvent(row, sortedRows);
        reports.push(report);
        for (const v of report.violations) allViolations.push(v);
    }

    allViolations.sort(compareViolations);

    const summary = computeSummary(reports, allViolations);

    const events = violationsOnly
        ? reports.filter((r) => r.violations.length > 0)
        : reports;

    return {
        catalog_files: CATALOG_FILES,
        filter: {
            family: familyFilter,
            violations_only: violationsOnly,
        },
        events,
        violations: allViolations,
        summary,
    };
}

function computeSummary(
    reports: EventComplianceReport[],
    violations: Violation[],
): AuditSummary {
    const byFamily: Record<string, number> = {};
    const byKind: Record<ViolationKind, number> = {
        missing_section_3_6_guard: 0,
        weak_punitive_floor: 0,
        forbidden_positive_territorial_legitimacy: 0,
        forbidden_recruitment_modifier_above_one: 0,
        ring3_enabling_target: 0,
    };
    const bySeverity = { CRITICAL: 0, WARNING: 0, INFO: 0 };

    for (const v of violations) {
        const key = v.family ?? '<no-family>';
        byFamily[key] = (byFamily[key] ?? 0) + 1;
        byKind[v.kind] = (byKind[v.kind] ?? 0) + 1;
        bySeverity[v.severity] += 1;
    }

    let ring3 = 0;
    let adj = 0;
    let withViolations = 0;
    for (const r of reports) {
        if (r.is_ring3_family) ring3 += 1;
        if (r.is_sensitive_adjacent) adj += 1;
        if (r.violations.length > 0) withViolations += 1;
    }

    return {
        total_events_scanned: reports.length,
        total_ring3_family_events: ring3,
        total_sensitive_adjacent_events: adj,
        total_clean_events: reports.length - withViolations,
        total_events_with_violations: withViolations,
        total_violations: violations.length,
        violations_by_severity: bySeverity,
        violations_by_family: byFamily,
        violations_by_kind: byKind,
    };
}

// ─── Text rendering ───────────────────────────────────────────────────────

function printTextReport(report: AuditReport): void {
    const lines: string[] = [];
    lines.push('Sensitive-history canon-gate audit');
    lines.push(`  Ring 3 sensitive families (canonical): ${[...RING3_SENSITIVE_FAMILIES].sort(strictCompare).join(', ')}`);
    if (report.filter.family !== null) lines.push(`  filter.family: ${report.filter.family}`);
    if (report.filter.violations_only) lines.push('  filter.violations_only: true');
    lines.push('');
    lines.push('Summary:');
    lines.push(`  total_events_scanned: ${report.summary.total_events_scanned}`);
    lines.push(`  total_ring3_family_events: ${report.summary.total_ring3_family_events}`);
    lines.push(`  total_sensitive_adjacent_events: ${report.summary.total_sensitive_adjacent_events}`);
    lines.push(`  total_clean_events: ${report.summary.total_clean_events}`);
    lines.push(`  total_events_with_violations: ${report.summary.total_events_with_violations}`);
    lines.push(`  total_violations: ${report.summary.total_violations}`);
    lines.push(`    CRITICAL: ${report.summary.violations_by_severity.CRITICAL}`);
    lines.push(`    WARNING: ${report.summary.violations_by_severity.WARNING}`);
    lines.push(`    INFO:    ${report.summary.violations_by_severity.INFO}`);
    lines.push('');

    lines.push('Per-event compliance:');
    if (report.events.length === 0) {
        lines.push('  (no events to report)');
    } else {
        for (const r of report.events) {
            const flags: string[] = [];
            if (r.is_ring3_family) flags.push('ring3');
            if (r.is_sensitive_adjacent) flags.push('sensitive-adjacent');
            const tag = flags.length === 0 ? '' : ` [${flags.join(', ')}]`;
            lines.push(`  - ${r.event_id}${tag} (family=${r.family ?? '<none>'}, tier=${r.source_tier ?? '<none>'})`);
            if (r.is_ring3_family) {
                const explicit = r.section_3_6_explicit_reference ? ' (explicit §3.6 reference)' : '';
                lines.push(`      §3.6 guard:                ${r.section_3_6_guard}${explicit}`);
                lines.push(`      ring3 enabling rejection:  ${r.ring3_enabling}`);
            }
            if (r.detected_sensitive_options.length > 0) {
                lines.push(`      sensitive options:         ${r.detected_sensitive_options.join(', ')}`);
                lines.push(`      punitive cost-floor:       ${r.punitive_cost_floor}`);
                lines.push(`      forbidden positive shifts: ${r.forbidden_positive_shifts}`);
            }
            if (r.violations.length > 0) {
                lines.push('      violations:');
                for (const v of r.violations) {
                    lines.push(`        [${v.severity}] ${v.kind}${v.locator ? ` (${v.locator})` : ''}: ${v.detail}`);
                }
            }
        }
    }
    lines.push('');

    lines.push('Violations table:');
    if (report.violations.length === 0) {
        lines.push('  (none — catalog is clean)');
    } else {
        lines.push('  severity  event_id                                       kind                                          locator');
        for (const v of report.violations) {
            const sev = v.severity.padEnd(9, ' ');
            const id = v.event_id.padEnd(46, ' ');
            const kind = v.kind.padEnd(46, ' ');
            const loc = v.locator ?? '';
            lines.push(`  ${sev}${id}${kind}${loc}`);
        }
    }
    lines.push('');

    process.stdout.write(`${lines.join('\n')}\n`);
}

// ─── CLI ──────────────────────────────────────────────────────────────────

interface CliArgs {
    json: boolean;
    family: string | null;
    violationsOnly: boolean;
    strict: boolean;
}

function parseArgs(argv: string[]): CliArgs {
    const args: CliArgs = {
        json: false,
        family: null,
        violationsOnly: false,
        strict: false,
    };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--json') args.json = true;
        else if (arg === '--violations-only') args.violationsOnly = true;
        else if (arg === '--strict') args.strict = true;
        else if (arg === '--family') {
            args.family = argv[i + 1] ?? null;
            i += 1;
        }
    }
    return args;
}

function main(): void {
    const args = parseArgs(process.argv.slice(2));
    let report: AuditReport;
    try {
        report = buildSensitiveHistoryAudit({
            family: args.family,
            violationsOnly: args.violationsOnly,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(`sensitive_history_canon_gate_audit: ${message}\n`);
        process.exit(1);
    }

    if (args.json) {
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else {
        printTextReport(report);
    }

    if (args.strict && report.summary.total_violations > 0) {
        process.exit(2);
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main();
}
