import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
    buildEventTaxonomyReport,
    loadCatalogRows,
    type EventTaxonomyRow,
} from './event_taxonomy_report.js';

export type AcceptanceStatus = 'READY' | 'NOT_READY';

export type CandidateStatus =
    | 'APPROVED_FIRST_PACKET'
    | 'CONDITIONAL_TRIGGER_CLEANUP_REQUIRED'
    | 'DEFERRED_188W_PROOF_REQUIRED';

export type EventAcceptanceRow = {
    file: string;
    id: string;
    title: string | null;
    trigger_turn_min: number | null;
    responding_faction: string | null;
    requires_player_response: boolean;
    production_modal_authoring_ready: boolean;
    blocking_reasons: string[];
    candidate_status: CandidateStatus | null;
    trigger_gate: 'state_or_pressure' | 'scheduled_only' | 'external_or_exogenous' | 'unclassified';
    source_status: 'present' | 'missing';
    has_source_note: boolean;
    has_historical_default_response_id: boolean;
    has_historical_marker: boolean;
    bot_response_logic: string | null;
    historical_default_option0: boolean | null;
    sensitive_gate: 'clear' | 'sensitive_or_ring_review' | 'ring3_refused';
    default_block_status: 'clear' | 'source_or_design_blocked' | 'counterfactual_blocked';
};

export type EventAcceptanceReport = {
    summary: {
        total_events: number;
        required_response_events: number;
        production_modal_authoring_ready_events: number;
        missing_historical_default_response_id_events: number;
        missing_historical_marker_events: number;
        source_blocked_events: number;
        missing_source_note_events: number;
        sensitive_gated_events: number;
        default_blocked_counterfactual_events: number;
        scheduled_only_required_response_events: number;
        approved_first_packet_candidates: number;
        conditional_authoring_packet_candidates: number;
        deferred_authoring_packet_candidates: number;
        duplicate_event_ids: string[];
        full_catalog_accepted: boolean;
        acceptance_status: AcceptanceStatus;
        not_ready_reason: string;
    };
    required_response_rows: EventAcceptanceRow[];
    production_modal_authoring_ready_rows: EventAcceptanceRow[];
    missing_historical_default_rows: EventAcceptanceRow[];
    source_blocked_rows: EventAcceptanceRow[];
    missing_source_note_rows: EventAcceptanceRow[];
    sensitive_gated_rows: EventAcceptanceRow[];
    source_design_default_blocked_rows: EventAcceptanceRow[];
    default_blocked_counterfactual_rows: EventAcceptanceRow[];
    scheduled_only_rows: EventAcceptanceRow[];
    approved_first_authoring_packet_candidates: EventAcceptanceRow[];
    conditional_authoring_packet_candidates: EventAcceptanceRow[];
    deferred_authoring_packet_candidates: EventAcceptanceRow[];
    first_packet_excluded_sensitive_topics: EventAcceptanceRow[];
};

export const APPROVED_FIRST_AUTHORING_PACKET_CANDIDATES = [
    'rbih_state_identity',
    'hrhb_political_goal',
    'rs_assembly_rejects_voplan_1993',
    'belgrade_embargo_rs_1994',
] as const;

export const CONDITIONAL_AUTHORING_PACKET_CANDIDATES = [
    'operation_lukavac_93',
] as const;

export const DEFERRED_AUTHORING_PACKET_CANDIDATES = [
    'us_halts_federation_advance_1995',
] as const;

export const SENSITIVE_RING3_REFUSED_IDS = [
    'rs_strategic_goals',
    'drina_cleansing_decision_1992',
    'concentration_camps_revealed_1992',
    'srebrenica_demilitarization_1993',
    'un_hostage_crisis_1995',
    'visit_to_front_rs',
    'nato_ultimatum_sarajevo_1994',
] as const;

export const SOURCE_OR_DESIGN_DEFAULT_BLOCKED_IDS = [
    'karadzic_mladic_split_1995',
    'visit_to_front_hrhb',
] as const;

const COUNTERFACTUAL_BLOCKED_IDS = new Set([
    'srebrenica_demilitarization_1993',
    'karadzic_mladic_split_1995',
]);

const FIRST_PACKET_SENSITIVE_EXCLUSION_KEYWORDS = [
    'ahmici',
    'atrocity',
    'camp',
    'cleansing',
    'grabovica',
    'massacre',
    'markale',
    'srebrenica',
    'stupni do',
    'tuzla gate',
    'war crime',
    'zepa',
    'žepa',
];

function strictCompare(a: string, b: string): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

function idSet(values: readonly string[]): Set<string> {
    return new Set(values);
}

function sourceNoteIsAuthored(row: EventTaxonomyRow): boolean {
    return row.source_note !== null && row.source_note !== row.historical_source;
}

function candidateStatusFor(id: string): CandidateStatus | null {
    if (idSet(APPROVED_FIRST_AUTHORING_PACKET_CANDIDATES).has(id)) return 'APPROVED_FIRST_PACKET';
    if (idSet(CONDITIONAL_AUTHORING_PACKET_CANDIDATES).has(id)) return 'CONDITIONAL_TRIGGER_CLEANUP_REQUIRED';
    if (idSet(DEFERRED_AUTHORING_PACKET_CANDIDATES).has(id)) return 'DEFERRED_188W_PROOF_REQUIRED';
    return null;
}

function defaultBlockStatusFor(row: EventTaxonomyRow): EventAcceptanceRow['default_block_status'] {
    if (idSet(SOURCE_OR_DESIGN_DEFAULT_BLOCKED_IDS).has(row.id)) return 'source_or_design_blocked';
    if (COUNTERFACTUAL_BLOCKED_IDS.has(row.id)) return 'counterfactual_blocked';
    if (row.id.startsWith('csq_') && row.id.includes('overture')) return 'counterfactual_blocked';
    return 'clear';
}

function triggerGateFor(row: EventTaxonomyRow): EventAcceptanceRow['trigger_gate'] {
    if (row.condition_types.length > 0 || row.requires.length > 0 || row.has_pressure) return 'state_or_pressure';
    if (row.trigger_turn_min !== null || row.trigger_turn_max !== null) {
        if (row.category === 'diplomatic' || row.category === 'economic') return 'external_or_exogenous';
        return 'scheduled_only';
    }
    return 'unclassified';
}

function historicalDefaultOption0(row: EventTaxonomyRow): boolean | null {
    if (row.historical_default_response_id === null) return null;
    const firstOptionId = row.response_options[0]?.id ?? null;
    return row.historical_default_response_id === firstOptionId;
}

function sensitiveGateFor(row: EventTaxonomyRow): EventAcceptanceRow['sensitive_gate'] {
    if (idSet(SENSITIVE_RING3_REFUSED_IDS).has(row.id)) return 'ring3_refused';
    if (row.sensitive_history_status !== 'clear') return 'sensitive_or_ring_review';
    return 'clear';
}

function containsFirstPacketSensitiveTopic(row: EventTaxonomyRow): boolean {
    const haystack = [row.id, row.title, row.narrative, row.category].filter(Boolean).join(' ').toLowerCase();
    return FIRST_PACKET_SENSITIVE_EXCLUSION_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

function blockingReasonsFor(row: EventTaxonomyRow): string[] {
    const reasons: string[] = [];
    const defaultBlockStatus = defaultBlockStatusFor(row);
    const triggerGate = triggerGateFor(row);
    const defaultOption0 = historicalDefaultOption0(row);

    if (row.historical_default_response_id === null) reasons.push('missing_historical_default_response_id');
    if (!row.has_historical_default_marker) reasons.push('missing_historical_marker');
    if (row.historical_default_response_id !== null && row.has_historical_default_marker && row.bot_response_logic !== 'historical') {
        reasons.push('historical_default_requires_historical_bot_logic');
    }
    if (defaultOption0 === false) reasons.push('historical_default_not_option0');
    if (row.historical_source_status === 'missing') reasons.push('source_blocked');
    if (!sourceNoteIsAuthored(row)) reasons.push('missing_source_note');
    if (sensitiveGateFor(row) !== 'clear') reasons.push('sensitive_history_gate');
    if (defaultBlockStatus === 'source_or_design_blocked') reasons.push('source_or_design_default_blocked');
    if (defaultBlockStatus === 'counterfactual_blocked') reasons.push('default_or_counterfactual_blocked');
    if (triggerGate === 'scheduled_only') reasons.push('scheduled_only_trigger_needs_predicate_cleanup_or_exogenous_waiver');
    if (!row.has_title) reasons.push('missing_title');
    if (!row.has_narrative) reasons.push('missing_narrative');
    if (!row.has_option_descriptions) reasons.push('missing_option_descriptions');
    if (!row.has_numeric_option_previews) reasons.push('missing_numeric_or_mechanical_preview');

    return reasons.sort(strictCompare);
}

function toAcceptanceRow(row: EventTaxonomyRow): EventAcceptanceRow {
    const blockingReasons = blockingReasonsFor(row);
    return {
        file: row.file,
        id: row.id,
        title: row.title,
        trigger_turn_min: row.trigger_turn_min,
        responding_faction: row.responding_faction,
        requires_player_response: row.requires_player_response,
        production_modal_authoring_ready: row.requires_player_response && blockingReasons.length === 0,
        blocking_reasons: blockingReasons,
        candidate_status: candidateStatusFor(row.id),
        trigger_gate: triggerGateFor(row),
        source_status: row.historical_source_status,
        has_source_note: sourceNoteIsAuthored(row),
        has_historical_default_response_id: row.historical_default_response_id !== null,
        has_historical_marker: row.has_historical_default_marker,
        bot_response_logic: row.bot_response_logic,
        historical_default_option0: historicalDefaultOption0(row),
        sensitive_gate: sensitiveGateFor(row),
        default_block_status: defaultBlockStatusFor(row),
    };
}

function orderedCandidates(rows: EventAcceptanceRow[], ids: readonly string[]): EventAcceptanceRow[] {
    return ids.map((id) => {
        const row = rows.find((entry) => entry.id === id);
        if (!row) {
            throw new Error(`Acceptance candidate ${id} is missing from the catalog.`);
        }
        return row;
    });
}

function sortById(rows: EventAcceptanceRow[]): EventAcceptanceRow[] {
    return [...rows].sort((a, b) => strictCompare(a.id, b.id));
}

export function buildEventAcceptanceReport(taxonomyRows: EventTaxonomyRow[] = loadCatalogRows()): EventAcceptanceReport {
    const taxonomyReport = buildEventTaxonomyReport(taxonomyRows);
    const requiredRows = taxonomyReport.rows
        .filter((row) => row.requires_player_response)
        .map(toAcceptanceRow);
    const allRows = taxonomyReport.rows.map(toAcceptanceRow);
    const readyRows = requiredRows.filter((row) => row.production_modal_authoring_ready);
    const sourceBlockedRows = requiredRows.filter((row) => row.blocking_reasons.includes('source_blocked'));
    const missingSourceNoteRows = requiredRows.filter((row) => row.blocking_reasons.includes('missing_source_note'));
    const sensitiveGatedRows = requiredRows.filter((row) => row.sensitive_gate !== 'clear');
    const defaultBlockedRows = requiredRows.filter((row) => row.default_block_status !== 'clear');
    const scheduledOnlyRows = requiredRows.filter((row) => row.trigger_gate === 'scheduled_only');
    const approvedFirst = orderedCandidates(allRows, APPROVED_FIRST_AUTHORING_PACKET_CANDIDATES);
    const conditional = orderedCandidates(allRows, CONDITIONAL_AUTHORING_PACKET_CANDIDATES);
    const deferred = orderedCandidates(allRows, DEFERRED_AUTHORING_PACKET_CANDIDATES);

    const fullCatalogAccepted =
        taxonomyReport.summary.duplicate_event_ids.length === 0 &&
        requiredRows.length > 0 &&
        readyRows.length === requiredRows.length &&
        sensitiveGatedRows.length === 0 &&
        defaultBlockedRows.length === 0 &&
        scheduledOnlyRows.length === 0;

    return {
        summary: {
            total_events: taxonomyReport.summary.total_events,
            required_response_events: requiredRows.length,
            production_modal_authoring_ready_events: readyRows.length,
            missing_historical_default_response_id_events: requiredRows.filter((row) => !row.has_historical_default_response_id).length,
            missing_historical_marker_events: requiredRows.filter((row) => !row.has_historical_marker).length,
            source_blocked_events: sourceBlockedRows.length,
            missing_source_note_events: missingSourceNoteRows.length,
            sensitive_gated_events: sensitiveGatedRows.length,
            default_blocked_counterfactual_events: defaultBlockedRows.length,
            scheduled_only_required_response_events: scheduledOnlyRows.length,
            approved_first_packet_candidates: approvedFirst.length,
            conditional_authoring_packet_candidates: conditional.length,
            deferred_authoring_packet_candidates: deferred.length,
            duplicate_event_ids: taxonomyReport.summary.duplicate_event_ids,
            full_catalog_accepted: fullCatalogAccepted,
            acceptance_status: fullCatalogAccepted ? 'READY' : 'NOT_READY',
            not_ready_reason: fullCatalogAccepted
                ? ''
                : 'Full catalog remains NOT_READY until production JSON authoring adds explicit historical defaults/source notes, resolves source/design debt, gates or rewrites sensitive rows, and cleans scheduled-only required-response triggers unless exogenous.',
        },
        required_response_rows: requiredRows,
        production_modal_authoring_ready_rows: readyRows,
        missing_historical_default_rows: requiredRows.filter((row) => !row.has_historical_default_response_id || !row.has_historical_marker),
        source_blocked_rows: sourceBlockedRows,
        missing_source_note_rows: missingSourceNoteRows,
        sensitive_gated_rows: sensitiveGatedRows,
        source_design_default_blocked_rows: requiredRows.filter((row) => row.default_block_status === 'source_or_design_blocked'),
        default_blocked_counterfactual_rows: defaultBlockedRows,
        scheduled_only_rows: scheduledOnlyRows,
        approved_first_authoring_packet_candidates: approvedFirst,
        conditional_authoring_packet_candidates: conditional,
        deferred_authoring_packet_candidates: deferred,
        first_packet_excluded_sensitive_topics: sortById(allRows.filter((row) => {
            const taxonomyRow = taxonomyReport.rows.find((entry) => entry.id === row.id);
            return taxonomyRow ? containsFirstPacketSensitiveTopic(taxonomyRow) : false;
        })),
    };
}

function printTextReport(report: EventAcceptanceReport): void {
    process.stdout.write(`Event acceptance diagnostic: ${report.summary.acceptance_status}\n`);
    process.stdout.write(`Required-response events: ${report.summary.required_response_events}; production modal-ready: ${report.summary.production_modal_authoring_ready_events}\n`);
    process.stdout.write(`Missing defaults: ${report.summary.missing_historical_default_response_id_events}; missing source notes: ${report.summary.missing_source_note_events}; sensitive-gated: ${report.summary.sensitive_gated_events}\n`);
    process.stdout.write(`Approved first packet: ${report.approved_first_authoring_packet_candidates.map((row) => row.id).join(', ')}\n`);
}

function main(): void {
    const report = buildEventAcceptanceReport();
    if (process.argv.includes('--json')) {
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
        return;
    }
    printTextReport(report);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main();
}
