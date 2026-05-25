import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

type JsonRecord = Record<string, unknown>;

export type EventTaxonomyFinding = {
    code: string;
    severity: 'info' | 'warning' | 'error';
    message: string;
    file: string;
    id: string;
};

export type EventTaxonomyRow = {
    file: string;
    file_index: number;
    catalog_index: number;
    id: string;
    title: string | null;
    narrative: string | null;
    category: string | null;
    trigger_turn_min: number | null;
    trigger_turn_max: number | null;
    phase: string | null;
    requires: string[];
    condition_types: string[];
    has_pressure: boolean;
    trigger_driver: string;
    trigger_emergence_class: string;
    is_choice_event: boolean;
    choice_count: number;
    responding_faction: string | null;
    requires_player_response: boolean;
    bot_response_logic: string | null;
    response_options: Array<{ id: string | null; label: string | null; description: string | null }>;
    response_ids_unique: boolean;
    response_labels_unique: boolean;
    effect_kinds: string[];
    flag_keys: string[];
    dimension_shifts: string[];
    has_numeric_consequences: boolean;
    numeric_consequence_kinds: string[];
    notification_coverage: {
        has_notifications_to_other_factions: boolean;
        response_options_with_notifications: number;
        response_options_missing_notifications: string[];
    };
    historical_source_status: 'present' | 'missing';
    historical_source: string | null;
    source_note: string | null;
    sensitive_history_ring: 'none' | 'risk';
    sensitive_history_status: 'clear' | 'review_required';
    sensitive_history_keywords: string[];
    has_title: boolean;
    has_narrative: boolean;
    has_source_note: boolean;
    has_historical_default_marker: boolean;
    historical_default_response_id: string | null;
    historical_default_option_id: string | null;
    historical_default_unavailable_reason: string | null;
    has_option_descriptions: boolean;
    has_numeric_option_previews: boolean;
    modal_ready: boolean;
    row_classification: string;
    findings: EventTaxonomyFinding[];
};

export type EventTaxonomyReport = {
    summary: {
        total_events: number;
        choice_events: number;
        no_choice_events: number;
        required_response_events: number;
        choice_rows_with_title_and_narrative: number;
        choice_rows_with_source: number;
        required_response_rows_with_source: number;
        historical_default_markers: number;
        historical_default_ids: number;
        historical_default_unavailable_events: number;
        modal_ready_events: number;
        duplicate_event_ids: string[];
        findings: number;
        errors: number;
        warnings: number;
    };
    rows: EventTaxonomyRow[];
    findings: EventTaxonomyFinding[];
};

const CATALOG_FILES = [
    'data/scenarios/events/war_1992.json',
    'data/scenarios/events/war_1993.json',
    'data/scenarios/events/war_1994.json',
    'data/scenarios/events/war_1995.json',
    'data/scenarios/events/consequences.json',
] as const;

const VALID_FACTIONS = new Set(['RBiH', 'RS', 'HRHB']);

const KNOWN_EFFECT_KINDS = new Set([
    'aggression_modifier',
    'alliance_change',
    'alliance_lock',
    'cohesion_change',
    'cost_ledger_annotation',
    'equipment_grant',
    'equipment_quality_modifier',
    'humanitarian_impact',
    'morale_change',
    'narrative',
    'negotiation_capital',
    'patron_pressure',
    'supply_delta',
]);

const KNOWN_CONDITION_TYPES = new Set([
    'alliance_above',
    'alliance_below',
    'alliance_drift',
    'and',
    'dimension_above',
    'dimension_below',
    'displaced_in_aggregate',
    'enclave_resilience_aggregate',
    'enclave_supply_status',
    'faction_controls_municipality',
    'flag_at_least',
    'flag_equals',
    'flag_not_set',
    'metric_compare_factions',
    'morale_average_below',
    'not',
    'paramilitary_mode_equals',
    'patron_pressure_above',
    'supply_below',
    'territory_loss_window',
    'territory_percentage',
    'war_crimes_above',
]);

const SENSITIVE_KEYWORDS = [
    'atrocity',
    'camp',
    'civilian',
    'cleansing',
    'genocide',
    'hostage',
    'human shield',
    'massacre',
    'srebrenica',
    'war crime',
];

const HISTORICAL_DEFAULT_BLOCKED_IDS = new Set([
    'srebrenica_demilitarization_1993',
    'karadzic_mladic_split_1995',
]);

const SENSITIVE_DEFAULT_BLOCKED_IDS = new Set([
    'rs_strategic_goals',
    'drina_cleansing_decision_1992',
    'concentration_camps_revealed_1992',
    'srebrenica_demilitarization_1993',
    'visit_to_front_hrhb',
    'visit_to_front_rs',
    'un_hostage_crisis_1995',
    'nato_ultimatum_sarajevo_1994',
]);

function strictCompare(a: string, b: string): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textOrNull(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function numberOrNull(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function repoRoot(): string {
    return process.cwd();
}

function readJsonArray(file: string): JsonRecord[] {
    const parsed = JSON.parse(readFileSync(path.join(repoRoot(), file), 'utf8')) as unknown;
    if (!Array.isArray(parsed)) {
        throw new Error(`${file} must contain a JSON array`);
    }
    return parsed.filter(isRecord);
}

function uniqueSorted(values: Iterable<string>): string[] {
    return [...new Set([...values].filter((value) => value.trim().length > 0))].sort(strictCompare);
}

function collectConditionTypes(condition: unknown): string[] {
    if (!isRecord(condition)) return [];
    const current = typeof condition.type === 'string' ? [condition.type] : [];
    const nested = Array.isArray(condition.conditions)
        ? condition.conditions.flatMap((entry) => collectConditionTypes(entry))
        : [];
    const singleNested = collectConditionTypes(condition.condition);
    return uniqueSorted([...current, ...nested, ...singleNested]);
}

function collectEffects(event: JsonRecord): JsonRecord[] {
    const effects: JsonRecord[] = [];
    const append = (value: unknown) => {
        if (Array.isArray(value)) {
            for (const entry of value) append(entry);
            return;
        }
        if (isRecord(value)) effects.push(value);
    };

    append(event.effect);
    append(event.effects);
    const options = Array.isArray(event.response_options) ? event.response_options : [];
    for (const option of options) {
        if (!isRecord(option)) continue;
        append(option.effect);
        append(option.effects);
    }
    return effects;
}

function collectFlagKeys(event: JsonRecord): string[] {
    const keys: string[] = [];
    const append = (value: unknown) => {
        if (!isRecord(value)) return;
        keys.push(...Object.keys(value));
    };

    append(event.sets_flags);
    const options = Array.isArray(event.response_options) ? event.response_options : [];
    for (const option of options) {
        if (isRecord(option)) append(option.sets_flags);
    }
    return uniqueSorted(keys);
}

function collectDimensionShifts(event: JsonRecord): string[] {
    const shifts: string[] = [];
    const append = (value: unknown) => {
        if (!Array.isArray(value)) return;
        for (const entry of value) {
            if (!isRecord(entry)) continue;
            const faction = textOrNull(entry.faction) ?? 'unknown_faction';
            const dimension = textOrNull(entry.dimension) ?? 'unknown_dimension';
            shifts.push(`${faction}:${dimension}`);
        }
    };

    append(event.dimension_shifts);
    const options = Array.isArray(event.response_options) ? event.response_options : [];
    for (const option of options) {
        if (isRecord(option)) append(option.dimension_shifts);
    }
    return uniqueSorted(shifts);
}

function numericConsequenceKinds(effects: JsonRecord[]): string[] {
    const kinds: string[] = [];
    for (const effect of effects) {
        const kind = textOrNull(effect.kind) ?? 'unknown_effect';
        for (const [key, value] of Object.entries(effect)) {
            if (key === 'kind') continue;
            if (typeof value === 'number' && Number.isFinite(value)) {
                kinds.push(`${kind}.${key}`);
            }
        }
    }
    return uniqueSorted(kinds);
}

function notificationCoverage(event: JsonRecord, responseIds: string[]): EventTaxonomyRow['notification_coverage'] {
    const notifications = isRecord(event.notifications_to_other_factions) ? event.notifications_to_other_factions : null;
    const withNotifications: string[] = [];
    const missingNotifications: string[] = [];

    for (const id of responseIds) {
        const block = notifications?.[id];
        if (isRecord(block) && Object.keys(block).length > 0) {
            withNotifications.push(id);
        } else {
            missingNotifications.push(id);
        }
    }

    return {
        has_notifications_to_other_factions: notifications !== null,
        response_options_with_notifications: withNotifications.length,
        response_options_missing_notifications: missingNotifications,
    };
}

function findHistoricalDefaultOptionId(event: JsonRecord): string | null {
    const eventLevelDefault = textOrNull(event.historical_default_response_id);
    if (eventLevelDefault !== null) return eventLevelDefault;

    const options = Array.isArray(event.response_options) ? event.response_options : [];
    for (const option of options) {
        if (!isRecord(option)) continue;
        const hasMarker =
            option.historical_marker === 'historical_default' ||
            option.historical_default === true ||
            option.is_historical_default === true ||
            option.default === 'historical' ||
            option.historical === true;
        if (hasMarker) return textOrNull(option.id);
    }
    return null;
}

function sensitiveKeywordsFor(row: Pick<EventTaxonomyRow, 'id' | 'title' | 'narrative' | 'category'>): string[] {
    const haystack = [row.id, row.title, row.narrative, row.category].filter(Boolean).join(' ').toLowerCase();
    return SENSITIVE_KEYWORDS.filter((keyword) => haystack.includes(keyword));
}

function historicalDefaultUnavailableReason(row: Pick<EventTaxonomyRow, 'id' | 'is_choice_event'>): string | null {
    if (SENSITIVE_DEFAULT_BLOCKED_IDS.has(row.id)) return 'sensitive_history_review_required';
    if (HISTORICAL_DEFAULT_BLOCKED_IDS.has(row.id)) return 'source_or_design_blocked';
    if (row.is_choice_event && row.id.startsWith('csq_')) return 'counterfactual_consequence_offer';
    return null;
}

export function classifyTriggerEmergence(row: EventTaxonomyRow): string {
    const parts: string[] = [];
    if (row.trigger_turn_min !== null || row.trigger_turn_max !== null) parts.push('scheduled');
    if (row.requires.length > 0) parts.push('requires_event');
    if (row.condition_types.length > 0) parts.push('condition');
    if (row.has_pressure) parts.push('pressure');
    return parts.length > 0 ? parts.join('_') : 'unclassified';
}

export function classifyEventTaxonomy(row: EventTaxonomyRow): string {
    if (row.modal_ready) return 'finished_modal_ready';
    if (row.requires_player_response) return 'required_response_debt';
    if (row.is_choice_event) return 'choice_event_debt';
    if (row.sensitive_history_status !== 'clear') return 'sensitive_history_review';
    return 'inventory_only';
}

function buildRow(event: JsonRecord, file: string, fileIndex: number, catalogIndex: number): EventTaxonomyRow {
    const trigger = isRecord(event.trigger) ? event.trigger : {};
    const requires = Array.isArray(trigger.requires_events)
        ? trigger.requires_events.filter((value): value is string => typeof value === 'string')
        : [];
    const conditionTypes = collectConditionTypes(trigger.condition);
    const responseOptions = (Array.isArray(event.response_options) ? event.response_options : [])
        .filter(isRecord)
        .map((option) => ({
            id: textOrNull(option.id),
            label: textOrNull(option.label),
            description: textOrNull(option.description),
        }));
    const responseIds = responseOptions.map((option) => option.id).filter((id): id is string => id !== null);
    const responseLabels = responseOptions.map((option) => option.label).filter((label): label is string => label !== null);
    const effects = collectEffects(event);
    const effectKinds = uniqueSorted(effects.map((effect) => textOrNull(effect.kind) ?? 'unknown'));
    const numericKinds = numericConsequenceKinds(effects);
    const historicalSource = textOrNull(event.historical_source) ?? textOrNull(event.source);
    const sourceNote = textOrNull(event.source_note) ?? textOrNull(event.historical_source_note) ?? historicalSource;
    const historicalDefaultResponseId = textOrNull(event.historical_default_response_id);
    const historicalDefaultOptionId = findHistoricalDefaultOptionId(event);
    const hasNumericOptionPreviews = responseOptions.length > 0 && responseOptions.every((option) => {
        const original = (event.response_options as unknown[]).find((entry) => isRecord(entry) && textOrNull(entry.id) === option.id);
        if (!isRecord(original)) return false;
        return typeof original.risk_level === 'number' || typeof original.aggression_affinity === 'number';
    });

    const row: EventTaxonomyRow = {
        file,
        file_index: fileIndex,
        catalog_index: catalogIndex,
        id: textOrNull(event.id) ?? '',
        title: textOrNull(event.title),
        narrative: textOrNull(event.narrative),
        category: textOrNull(event.category),
        trigger_turn_min: numberOrNull(trigger.turn_min),
        trigger_turn_max: numberOrNull(trigger.turn_max),
        phase: textOrNull(trigger.phase),
        requires,
        condition_types: conditionTypes,
        has_pressure: isRecord(event.pressure),
        trigger_driver: 'unclassified',
        trigger_emergence_class: 'unclassified',
        is_choice_event: responseOptions.length > 0,
        choice_count: responseOptions.length,
        responding_faction: textOrNull(event.responding_faction),
        requires_player_response: event.requires_player_response === true,
        bot_response_logic: textOrNull(event.bot_response_logic),
        response_options: responseOptions,
        response_ids_unique: responseIds.length === new Set(responseIds).size && responseIds.length === responseOptions.length,
        response_labels_unique: responseLabels.length === new Set(responseLabels).size && responseLabels.length === responseOptions.length,
        effect_kinds: effectKinds,
        flag_keys: collectFlagKeys(event),
        dimension_shifts: collectDimensionShifts(event),
        has_numeric_consequences: numericKinds.length > 0,
        numeric_consequence_kinds: numericKinds,
        notification_coverage: notificationCoverage(event, responseIds),
        historical_source_status: historicalSource ? 'present' : 'missing',
        historical_source: historicalSource,
        source_note: sourceNote,
        sensitive_history_ring: 'none',
        sensitive_history_status: 'clear',
        sensitive_history_keywords: [],
        has_title: textOrNull(event.title) !== null,
        has_narrative: textOrNull(event.narrative) !== null,
        has_source_note: sourceNote !== null,
        has_historical_default_marker: historicalDefaultOptionId !== null,
        historical_default_response_id: historicalDefaultResponseId,
        historical_default_option_id: historicalDefaultOptionId,
        historical_default_unavailable_reason: null,
        has_option_descriptions: responseOptions.length > 0 && responseOptions.every((option) => option.description !== null),
        has_numeric_option_previews: hasNumericOptionPreviews,
        modal_ready: false,
        row_classification: 'inventory_only',
        findings: [],
    };

    row.trigger_emergence_class = classifyTriggerEmergence(row);
    row.trigger_driver = row.condition_types.length > 0 ? 'condition' : row.requires.length > 0 ? 'requires_event' : row.trigger_turn_min !== null ? 'turn' : 'unknown';
    row.sensitive_history_keywords = sensitiveKeywordsFor(row);
    row.sensitive_history_ring = row.sensitive_history_keywords.length > 0 ? 'risk' : 'none';
    row.sensitive_history_status = row.sensitive_history_keywords.length > 0 ? 'review_required' : 'clear';
    row.historical_default_unavailable_reason = historicalDefaultUnavailableReason(row);
    row.modal_ready =
        row.requires_player_response &&
        row.has_title &&
        row.has_narrative &&
        row.has_source_note &&
        row.has_historical_default_marker &&
        row.historical_default_unavailable_reason === null &&
        row.has_option_descriptions &&
        row.has_numeric_option_previews &&
        row.sensitive_history_status === 'clear';
    row.row_classification = classifyEventTaxonomy(row);
    return row;
}

export function loadCatalogRows(): EventTaxonomyRow[] {
    const rows = CATALOG_FILES.flatMap((file, fileIndex) =>
        readJsonArray(file).map((event, catalogIndex) => buildRow(event, file, fileIndex, catalogIndex)),
    );

    return rows.sort((a, b) => {
        const fileOrder = a.file_index - b.file_index;
        if (fileOrder !== 0) return fileOrder;
        const aTurn = a.trigger_turn_min ?? Number.MAX_SAFE_INTEGER;
        const bTurn = b.trigger_turn_min ?? Number.MAX_SAFE_INTEGER;
        if (aTurn !== bTurn) return aTurn - bTurn;
        return strictCompare(a.id, b.id);
    });
}

function finding(row: EventTaxonomyRow, code: string, severity: EventTaxonomyFinding['severity'], message: string): EventTaxonomyFinding {
    return { code, severity, message, file: row.file, id: row.id };
}

export function collectCatalogFindings(rows: EventTaxonomyRow[]): EventTaxonomyFinding[] {
    const findings: EventTaxonomyFinding[] = [];
    const byId = new Map<string, EventTaxonomyRow[]>();

    for (const row of rows) {
        const existing = byId.get(row.id) ?? [];
        existing.push(row);
        byId.set(row.id, existing);

        if (row.requires_player_response && row.responding_faction === null) {
            findings.push(finding(row, 'missing_responding_faction', 'error', 'Required-response event has no responding_faction.'));
        } else if (row.requires_player_response && !VALID_FACTIONS.has(row.responding_faction ?? '')) {
            findings.push(finding(row, 'invalid_responding_faction', 'error', `Invalid responding_faction ${row.responding_faction}.`));
        }

        const optionIds = row.response_options.map((option) => option.id);
        const optionLabels = row.response_options.map((option) => option.label);
        if (optionIds.some((id) => id === null)) {
            findings.push(finding(row, 'empty_response_id', 'error', 'Choice event has an empty response id.'));
        }
        if (optionLabels.some((label) => label === null)) {
            findings.push(finding(row, 'empty_response_label', 'error', 'Choice event has an empty response label.'));
        }
        const nonEmptyOptionIds = optionIds.filter((id): id is string => id !== null);
        const nonEmptyOptionLabels = optionLabels.filter((label): label is string => label !== null);
        const responseIdsUnique = nonEmptyOptionIds.length === optionIds.length && new Set(nonEmptyOptionIds).size === nonEmptyOptionIds.length;
        const responseLabelsUnique = nonEmptyOptionLabels.length === optionLabels.length && new Set(nonEmptyOptionLabels).size === nonEmptyOptionLabels.length;

        if (!responseIdsUnique) {
            findings.push(finding(row, 'duplicate_response_id', 'error', 'Choice event has duplicate or missing response ids.'));
        }
        if (!responseLabelsUnique) {
            findings.push(finding(row, 'duplicate_response_label', 'error', 'Choice event has duplicate or missing response labels.'));
        }

        for (const kind of row.effect_kinds) {
            if (!KNOWN_EFFECT_KINDS.has(kind)) {
                findings.push(finding(row, 'unknown_effect_kind', 'warning', `Unknown effect kind ${kind}.`));
            }
        }
        for (const type of row.condition_types) {
            if (!KNOWN_CONDITION_TYPES.has(type)) {
                findings.push(finding(row, 'unknown_condition_type', 'warning', `Unknown condition type ${type}.`));
            }
        }
        if (row.historical_source_status === 'missing') {
            findings.push(finding(row, 'missing_source', 'warning', 'Event has no historical_source or source field.'));
        }
        if (row.sensitive_history_status !== 'clear') {
            findings.push(finding(row, 'sensitive_history_review', 'warning', `Sensitive-history keyword review required: ${row.sensitive_history_keywords.join(', ')}.`));
        }
        if (row.requires_player_response && !row.has_historical_default_marker) {
            findings.push(finding(row, 'missing_historical_default_marker', 'warning', 'Required-response event has no explicit historical default option marker.'));
        }
        if (row.historical_default_unavailable_reason !== null) {
            findings.push(finding(row, 'historical_default_unavailable', 'warning', `Historical default unavailable: ${row.historical_default_unavailable_reason}.`));
        }
        if (row.historical_default_response_id !== null && !nonEmptyOptionIds.includes(row.historical_default_response_id)) {
            findings.push(finding(row, 'invalid_historical_default_response_id', 'error', `historical_default_response_id ${row.historical_default_response_id} does not match a response option id.`));
        }
        if (
            row.bot_response_logic === 'accept_first' &&
            row.historical_default_response_id !== null &&
            nonEmptyOptionIds.length > 0 &&
            row.historical_default_response_id !== nonEmptyOptionIds[0]
        ) {
            findings.push(finding(row, 'accept_first_historical_default_conflict', 'warning', 'accept_first preserves option 0, but historical_default_response_id points to a different option.'));
        }
    }

    for (const [id, matches] of [...byId.entries()].sort(([a], [b]) => strictCompare(a, b))) {
        if (id.length === 0 || matches.length < 2) continue;
        for (const row of matches) {
            findings.push(finding(row, 'duplicate_event_id', 'error', `Duplicate event id ${id}.`));
        }
    }

    return findings.sort((a, b) => strictCompare(`${a.file}:${a.id}:${a.code}:${a.message}`, `${b.file}:${b.id}:${b.code}:${b.message}`));
}

export function buildEventTaxonomyReport(rows: EventTaxonomyRow[] = loadCatalogRows()): EventTaxonomyReport {
    const findings = collectCatalogFindings(rows);
    const findingsByRow = new Map<string, EventTaxonomyFinding[]>();
    for (const entry of findings) {
        const key = `${entry.file}:${entry.id}`;
        const existing = findingsByRow.get(key) ?? [];
        existing.push(entry);
        findingsByRow.set(key, existing);
    }

    const reportRows = rows.map((row) => {
        const rowFindings = findingsByRow.get(`${row.file}:${row.id}`) ?? [];
        const modalReady =
            row.modal_ready &&
            !rowFindings.some((entry) => ['missing_source', 'sensitive_history_review', 'missing_historical_default_marker', 'historical_default_unavailable'].includes(entry.code));
        const nextRow = { ...row, modal_ready: modalReady, findings: rowFindings };
        return { ...nextRow, row_classification: classifyEventTaxonomy(nextRow) };
    });

    const duplicateEventIds = uniqueSorted(
        findings.filter((entry) => entry.code === 'duplicate_event_id').map((entry) => entry.id),
    );

    return {
        summary: {
            total_events: reportRows.length,
            choice_events: reportRows.filter((row) => row.is_choice_event).length,
            no_choice_events: reportRows.filter((row) => !row.is_choice_event).length,
            required_response_events: reportRows.filter((row) => row.requires_player_response).length,
            choice_rows_with_title_and_narrative: reportRows.filter((row) => row.is_choice_event && row.has_title && row.has_narrative).length,
            choice_rows_with_source: reportRows.filter((row) => row.is_choice_event && row.historical_source_status === 'present').length,
            required_response_rows_with_source: reportRows.filter((row) => row.requires_player_response && row.historical_source_status === 'present').length,
            historical_default_markers: reportRows.filter((row) => row.has_historical_default_marker).length,
            historical_default_ids: reportRows.filter((row) => row.historical_default_response_id !== null).length,
            historical_default_unavailable_events: reportRows.filter((row) => row.historical_default_unavailable_reason !== null).length,
            modal_ready_events: reportRows.filter((row) => row.modal_ready).length,
            duplicate_event_ids: duplicateEventIds,
            findings: findings.length,
            errors: findings.filter((entry) => entry.severity === 'error').length,
            warnings: findings.filter((entry) => entry.severity === 'warning').length,
        },
        rows: reportRows,
        findings,
    };
}

function printTextReport(report: EventTaxonomyReport): void {
    process.stdout.write(`Event taxonomy diagnostic: ${report.summary.total_events} rows\n`);
    process.stdout.write(`Choice events: ${report.summary.choice_events}; no-choice events: ${report.summary.no_choice_events}; required-response: ${report.summary.required_response_events}\n`);
    process.stdout.write(`Findings: ${report.summary.findings} (${report.summary.errors} errors, ${report.summary.warnings} warnings)\n`);
}

function main(): void {
    const report = buildEventTaxonomyReport(loadCatalogRows());
    if (process.argv.includes('--json')) {
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
        return;
    }
    printTextReport(report);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main();
}
