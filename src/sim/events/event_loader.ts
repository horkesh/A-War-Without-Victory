/**
 * v0.4.1 Phase 3+4: Load historical event definitions from scenario JSON files.
 * Events are loaded from data/scenarios/events/ and filtered by scenario start week.
 * Deterministic: sorted by turn_min for stable evaluation order.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EventDefinition, EventResponseOption } from './event_types.js';
import {
    KNOWN_EVENT_CONDITION_TYPE_SET,
    KNOWN_EVENT_EFFECT_KIND_SET,
    VALID_EVENT_FACTION_SET,
} from './event_vocabulary.js';
import {
    ALL_BRANCH_TAGS,
    COMPOSITE_TAG_SET,
    isCampExposureFamily,
    isRing3SensitiveFamily,
} from './event_families.js';
import { DIMENSION_IDS } from './strategic_dimensions.js';

/**
 * Phase D Packet 44 — typed DimensionId vocabulary as a runtime Set. Mirrors
 * the `DimensionId` union in event_types.ts. Authoring shifts against an
 * unknown dimension is silently a DEAD write (apply_dimension_shifts.ts only
 * writes into `store[faction][dimension]` and skips when the dimension is not
 * present in the typed `DimensionStore`). Catching at load prevents the bug
 * class outright. */
const KNOWN_DIMENSION_ID_SET: ReadonlySet<string> = new Set<string>(DIMENSION_IDS);

function getModuleDir(): string {
    if (typeof __dirname === 'string') {
        return __dirname;
    }
    return dirname(fileURLToPath(import.meta.url));
}

const EVENTS_DIR = resolve(getModuleDir(), '../../../data/scenarios/events');

/** Event JSON file names in chronological order. Historical events first,
 *  then v0.9.0 Consequence System events (gated on ahistorical flags —
 *  calibration-safe by construction since they literally cannot fire on the
 *  historical path). */
const EVENT_FILES = [
    'war_1992.json',
    'war_1993.json',
    'war_1994.json',
    'war_1995.json',
    'consequences.json',
];

type JsonObject = Record<string, unknown>;

const VALID_CATEGORIES = new Set(['military', 'political', 'humanitarian', 'diplomatic', 'economic', 'command', 'territorial']);
const VALID_BOT_RESPONSE_LOGIC = new Set(['accept_first', 'reject_all', 'capital_based', 'capital_weighted', 'historical', 'personality_weighted', 'strategic_weighted']);
const VALID_FUTURE_CONSEQUENCE_TIMING = new Set(['immediate', 'next_turn', 'future', 'endgame']);
const VALID_FUTURE_CONSEQUENCE_CERTAINTY = new Set(['guaranteed', 'conditional', 'risk']);

/** Phase B Sub-slice B1 — `EventDefinition.source_tier` enum. */
const VALID_SOURCE_TIERS = new Set([
    'icty_icj_un',
    'agreement_text',
    'balkan_battlegrounds',
    'corroborated_participant',
    'design_counterfactual',
    'pending',
]);

/** Phase B Sub-slice B1 — `EventDefinition.emergence_class` enum. */
const VALID_EMERGENCE_CLASSES = new Set([
    'incident',
    'pressure',
    'threshold',
    'duration',
    'compound',
    'exogenous',
    'legacy_calendar_pending_conversion',
]);

/** Camp-exposure freeze: option set per R4 + H6 must be exactly these three. */
const CAMP_EXPOSURE_OPTION_IDS: readonly string[] = ['deny', 'obstruct', 'cooperate'];

/** Test plan gate 21 — rupture-foreclosure prohibition target ids.
 *  Per Canon Compliance Wave 2 review and Sensitive History Design Gate §1 #3
 *  ("no negotiable condemnation"), once a rupture is recorded it is permanent;
 *  no response option may foreclose it. Applies to EVERY catalog row. */
const RUPTURE_FORECLOSURE_FORBIDDEN_IDS: readonly string[] = [
    'srebrenica_falls_1995',
    'srebrenica_genocide_1995',
];

/**
 * Per Canon Compliance Wave 2 review: no row may foreclose
 * `srebrenica_falls_1995` or `srebrenica_genocide_1995` without explicit
 * user-level Sensitive History Design Gate §6 sign-off. The allowlist is
 * intentionally EMPTY in B1; add entries only with a citation block.
 *
 * Future Gate §6 sign-off candidates (B4 `accept_*`, X4 counterfactual A,
 * X5 D/E) go in as `${parent_event_id}#${response_option_id}` tuples with
 * a file-comment provenance line per entry (one line of citation per add).
 */
const SREBRENICA_FORECLOSURE_ALLOWLIST: ReadonlySet<string> = new Set<string>([
    // (empty in B1; do not add without explicit Gate §6 user sign-off + citation)
]);

/**
 * Phase B Sub-slice B1 — forbidden family slugs whose rows are categorically
 * rejected on load. Per Foundational packet `drina_cleansing_decision_1992`
 * ruling and the Stupčanica-95 "data-not-comment" lesson
 * (memory feedback_bot_pool_name_collision): canonical exclusions must be
 * enforced in data/loader code, never via author-side comments alone. The
 * loader treats any row carrying `family: 'rs_drina_campaign'` as a structural
 * canon violation regardless of intent.
 */
const FORBIDDEN_FAMILY_SLUGS: ReadonlySet<string> = new Set<string>([
    'rs_drina_campaign',
]);

/** Phase B Sub-slice B1 — packet §3.6 named-row carve-out for sensitive-act
 *  continuation. Only this event id may carry an option whose effects extend
 *  an in-state sensitive act (R12 maintain_hostages). */
const SENSITIVE_ACT_CONTINUATION_CARVE_OUTS: ReadonlySet<string> = new Set([
    'un_hostage_crisis_1995',
]);

/** Test plan gate 18 — §3.6 clause-overlap heuristic.
 *  Effect-kind `'doctrine_constraint'` or `'cost_ledger_annotation'` whose
 *  `sets_flags` key matches one of these patterns scales an existing
 *  sensitive-history act without authoring a new Ring-3 event. */
const CAMP_OPERATION_SCALING_FLAG_KEYS: readonly string[] = [
    'paramilitary_policy',
    'detention_camp_operation',
    'detention_camp_scale',
    'detention_operation',
];

function isObject(value: unknown): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function hasOwn(obj: JsonObject, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

function failRow(filename: string, rowIndex: number, message: string): never {
    throw new Error(`Invalid event row in ${filename}[${rowIndex}]: ${message}`);
}

function strictCompare(a: string, b: string): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

function validateKindedObject(value: unknown, path: string, filename: string, rowIndex: number): void {
    if (!isObject(value)) {
        failRow(filename, rowIndex, `${path} must be a non-null object`);
    }
    if (!isNonEmptyString(value.kind)) {
        failRow(filename, rowIndex, `${path}.kind must be a non-empty string`);
    }
    if (!KNOWN_EVENT_EFFECT_KIND_SET.has(value.kind)) {
        failRow(filename, rowIndex, `${path}.kind must be a known event effect kind: ${value.kind}`);
    }
}

function validateKindedArray(value: unknown, path: string, filename: string, rowIndex: number): void {
    if (!Array.isArray(value)) {
        failRow(filename, rowIndex, `${path} must be an array when present`);
    }

    value.forEach((entry, entryIndex) => {
        validateKindedObject(entry, `${path}[${entryIndex}]`, filename, rowIndex);
    });
}

function validateStringArray(value: unknown, path: string, filename: string, rowIndex: number): void {
    if (!Array.isArray(value) || !value.every((entry) => typeof entry === 'string')) {
        failRow(filename, rowIndex, `${path} must be a string array when present`);
    }
}

function validateFutureConsequences(value: unknown, path: string, filename: string, rowIndex: number): void {
    if (!Array.isArray(value)) {
        failRow(filename, rowIndex, `${path} must be an array when present`);
    }

    value.forEach((entry, entryIndex) => {
        const consequencePath = `${path}[${entryIndex}]`;
        if (!isObject(entry)) {
            failRow(filename, rowIndex, `${consequencePath} must be a non-null object`);
        }
        if (!isNonEmptyString(entry.id)) {
            failRow(filename, rowIndex, `${consequencePath}.id must be a non-empty string`);
        }
        if (!isNonEmptyString(entry.label)) {
            failRow(filename, rowIndex, `${consequencePath}.label must be a non-empty string`);
        }
        if (!isNonEmptyString(entry.explanation)) {
            failRow(filename, rowIndex, `${consequencePath}.explanation must be a non-empty string`);
        }
        if (!isNonEmptyString(entry.timing) || !VALID_FUTURE_CONSEQUENCE_TIMING.has(entry.timing)) {
            failRow(filename, rowIndex, `${consequencePath}.timing must be one of immediate, next_turn, future, endgame`);
        }
        if (!isNonEmptyString(entry.certainty) || !VALID_FUTURE_CONSEQUENCE_CERTAINTY.has(entry.certainty)) {
            failRow(filename, rowIndex, `${consequencePath}.certainty must be one of guaranteed, conditional, risk`);
        }
        for (const key of ['opens_events', 'closes_events', 'opens_flags', 'closes_flags', 'material_effect_refs']) {
            if (hasOwn(entry, key)) {
                validateStringArray(entry[key], `${consequencePath}.${key}`, filename, rowIndex);
            }
        }
    });
}

function validateResponseOptions(value: unknown, filename: string, rowIndex: number): void {
    if (!Array.isArray(value)) {
        failRow(filename, rowIndex, 'response_options must be an array when present');
    }

    const optionIds = new Set<string>();
    value.forEach((option, optionIndex) => {
        const path = `response_options[${optionIndex}]`;
        if (!isObject(option)) {
            failRow(filename, rowIndex, `${path} must be a non-null object`);
        }
        if (!isNonEmptyString(option.id)) {
            failRow(filename, rowIndex, `${path}.id must be a non-empty string`);
        }
        if (!isNonEmptyString(option.label)) {
            failRow(filename, rowIndex, `${path}.label must be a non-empty string`);
        }
        if (optionIds.has(option.id)) {
            failRow(filename, rowIndex, `${path}.id must be unique within response_options: ${option.id}`);
        }
        optionIds.add(option.id);
        if (hasOwn(option, 'effect')) {
            validateKindedObject(option.effect, `${path}.effect`, filename, rowIndex);
        }
        if (hasOwn(option, 'effects')) {
            validateKindedArray(option.effects, `${path}.effects`, filename, rowIndex);
        }
        if (hasOwn(option, 'future_consequences')) {
            validateFutureConsequences(option.future_consequences, `${path}.future_consequences`, filename, rowIndex);
        }
        // Phase B Sub-slice B1 — schema-only validation for new runtime-causality fields.
        if (hasOwn(option, 'branch_tag')) {
            if (!isNonEmptyString(option.branch_tag)) {
                failRow(filename, rowIndex, `${path}.branch_tag must be a non-empty string when present`);
            }
            if (!ALL_BRANCH_TAGS.has(option.branch_tag)) {
                failRow(filename, rowIndex, `${path}.branch_tag must be a known branch tag in event_families.ts: ${option.branch_tag}`);
            }
        }
        if (hasOwn(option, 'enables_events_runtime')) {
            validateStringArray(option.enables_events_runtime, `${path}.enables_events_runtime`, filename, rowIndex);
        }
        if (hasOwn(option, 'closes_events_runtime')) {
            validateStringArray(option.closes_events_runtime, `${path}.closes_events_runtime`, filename, rowIndex);
        }
        // Disjointness: an option cannot have the same id in both arrays.
        const enables = Array.isArray(option.enables_events_runtime) ? (option.enables_events_runtime as string[]) : [];
        const closes = Array.isArray(option.closes_events_runtime) ? (option.closes_events_runtime as string[]) : [];
        if (enables.length > 0 && closes.length > 0) {
            const enablesSet = new Set(enables);
            const overlap: string[] = [];
            for (const id of closes) {
                if (enablesSet.has(id)) overlap.push(id);
            }
            if (overlap.length > 0) {
                overlap.sort(strictCompare);
                failRow(
                    filename,
                    rowIndex,
                    `${path}.enables_events_runtime and closes_events_runtime must be disjoint: ${overlap.join(', ')}`,
                );
            }
        }
        // Alignment: every id in enables_events_runtime must also appear in some
        //   future_consequences[*].opens_events on the same option. Symmetric for closes.
        const fcs = Array.isArray(option.future_consequences) ? option.future_consequences : [];
        const fcOpens = new Set<string>();
        const fcCloses = new Set<string>();
        for (const fc of fcs) {
            if (!isObject(fc)) continue;
            if (Array.isArray(fc.opens_events)) {
                for (const id of fc.opens_events) {
                    if (typeof id === 'string') fcOpens.add(id);
                }
            }
            if (Array.isArray(fc.closes_events)) {
                for (const id of fc.closes_events) {
                    if (typeof id === 'string') fcCloses.add(id);
                }
            }
        }
        const enablesUnaligned: string[] = [];
        for (const id of enables) {
            if (!fcOpens.has(id)) enablesUnaligned.push(id);
        }
        if (enablesUnaligned.length > 0) {
            enablesUnaligned.sort(strictCompare);
            failRow(
                filename,
                rowIndex,
                `${path}.enables_events_runtime ids must each appear in some future_consequences[*].opens_events on the same option: ${enablesUnaligned.join(', ')}`,
            );
        }
        const closesUnaligned: string[] = [];
        for (const id of closes) {
            if (!fcCloses.has(id)) closesUnaligned.push(id);
        }
        if (closesUnaligned.length > 0) {
            closesUnaligned.sort(strictCompare);
            failRow(
                filename,
                rowIndex,
                `${path}.closes_events_runtime ids must each appear in some future_consequences[*].closes_events on the same option: ${closesUnaligned.join(', ')}`,
            );
        }
    });
}

function validateCondition(value: unknown, path: string, filename: string, rowIndex: number): void {
    if (!isObject(value)) {
        failRow(filename, rowIndex, `${path} must be a non-null object`);
    }
    if (!isNonEmptyString(value.type)) {
        failRow(filename, rowIndex, `${path}.type must be a non-empty string`);
    }
    if (!KNOWN_EVENT_CONDITION_TYPE_SET.has(value.type)) {
        failRow(filename, rowIndex, `${path}.type must be a known event condition type: ${value.type}`);
    }

    if (hasOwn(value, 'conditions')) {
        if (!Array.isArray(value.conditions)) {
            failRow(filename, rowIndex, `${path}.conditions must be an array when present`);
        }
        value.conditions.forEach((entry, entryIndex) => {
            validateCondition(entry, `${path}.conditions[${entryIndex}]`, filename, rowIndex);
        });
    }
    if (hasOwn(value, 'condition')) {
        validateCondition(value.condition, `${path}.condition`, filename, rowIndex);
    }
}

function validatePressure(value: unknown, filename: string, rowIndex: number): void {
    if (!isObject(value)) {
        failRow(filename, rowIndex, 'pressure must be a non-null object when present');
    }
    if (!hasOwn(value, 'modifiers')) return;
    if (!Array.isArray(value.modifiers)) {
        failRow(filename, rowIndex, 'pressure.modifiers must be an array when present');
    }
    value.modifiers.forEach((modifier, modifierIndex) => {
        const path = `pressure.modifiers[${modifierIndex}]`;
        if (!isObject(modifier)) {
            failRow(filename, rowIndex, `${path} must be a non-null object`);
        }
        if (hasOwn(modifier, 'condition')) {
            validateCondition(modifier.condition, `${path}.condition`, filename, rowIndex);
        }
    });
}

function validateOptionalFiniteNumber(value: unknown, path: string, filename: string, rowIndex: number): void {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        failRow(filename, rowIndex, `${path} must be a finite number when present`);
    }
}

function validateOptionalBoolean(value: unknown, path: string, filename: string, rowIndex: number): void {
    if (typeof value !== 'boolean') {
        failRow(filename, rowIndex, `${path} must be a boolean when present`);
    }
}

function validateEventRow(row: unknown, filename: string, rowIndex: number): void {
    if (!isObject(row)) {
        failRow(filename, rowIndex, 'row must be a non-null object');
    }
    if (!isNonEmptyString(row.id)) {
        failRow(filename, rowIndex, 'id must be a non-empty string');
    }
    if (hasOwn(row, 'category') && (!isNonEmptyString(row.category) || !VALID_CATEGORIES.has(row.category))) {
        failRow(filename, rowIndex, `category must be a known event category when present: ${String(row.category)}`);
    }
    if (hasOwn(row, 'bot_response_logic') && (!isNonEmptyString(row.bot_response_logic) || !VALID_BOT_RESPONSE_LOGIC.has(row.bot_response_logic))) {
        failRow(filename, rowIndex, `bot_response_logic must be a known response logic when present: ${String(row.bot_response_logic)}`);
    }
    if (hasOwn(row, 'probability')) {
        validateOptionalFiniteNumber(row.probability, 'probability', filename, rowIndex);
        if ((row.probability as number) < 0 || (row.probability as number) > 1) {
            failRow(filename, rowIndex, 'probability must be between 0 and 1 when present');
        }
    }
    if (hasOwn(row, 'once')) {
        validateOptionalBoolean(row.once, 'once', filename, rowIndex);
    }
    if (hasOwn(row, 'requires_player_response')) {
        validateOptionalBoolean(row.requires_player_response, 'requires_player_response', filename, rowIndex);
    }
    // Optional documentary-realism illustration key (EventModal renders it when an
    // asset resolves; absent → text-only). Validated as a non-empty string only —
    // the asset itself need not exist on disk yet (the UI degrades gracefully).
    if (hasOwn(row, 'image') && !isNonEmptyString(row.image)) {
        failRow(filename, rowIndex, 'image must be a non-empty string when present');
    }
    if (!isObject(row.trigger)) {
        failRow(filename, rowIndex, 'trigger must be a non-null object');
    }

    if (hasOwn(row.trigger, 'turn_min') && (typeof row.trigger.turn_min !== 'number' || !Number.isFinite(row.trigger.turn_min))) {
        failRow(filename, rowIndex, 'trigger.turn_min must be a finite number when present');
    }
    if (hasOwn(row.trigger, 'turn_max') && (typeof row.trigger.turn_max !== 'number' || !Number.isFinite(row.trigger.turn_max))) {
        failRow(filename, rowIndex, 'trigger.turn_max must be a finite number when present');
    }
    if (
        typeof row.trigger.turn_min === 'number' &&
        typeof row.trigger.turn_max === 'number' &&
        row.trigger.turn_min > row.trigger.turn_max
    ) {
        failRow(filename, rowIndex, 'trigger.turn_min must be less than or equal to trigger.turn_max');
    }
    if (hasOwn(row.trigger, 'phase') && row.trigger.phase !== 'war') {
        failRow(filename, rowIndex, 'trigger.phase must be "war" when present');
    }
    if (hasOwn(row.trigger, 'requires_events')) {
        const requiresEvents = row.trigger.requires_events;
        if (!Array.isArray(requiresEvents) || !requiresEvents.every((id) => typeof id === 'string')) {
            failRow(filename, rowIndex, 'trigger.requires_events must be a string array when present');
        }
    }
    if (hasOwn(row, 'enables_events')) {
        const enablesEvents = row.enables_events;
        if (!Array.isArray(enablesEvents) || !enablesEvents.every((id) => typeof id === 'string')) {
            failRow(filename, rowIndex, 'enables_events must be a string array when present');
        }
    }
    if (hasOwn(row.trigger, 'condition')) {
        validateCondition(row.trigger.condition, 'trigger.condition', filename, rowIndex);
    }

    validateKindedObject(row.effect, 'effect', filename, rowIndex);
    if (hasOwn(row, 'effects')) {
        validateKindedArray(row.effects, 'effects', filename, rowIndex);
    }
    if (hasOwn(row, 'response_options')) {
        validateResponseOptions(row.response_options, filename, rowIndex);
    }
    if (row.requires_player_response === true) {
        if (!isNonEmptyString(row.responding_faction)) {
            failRow(filename, rowIndex, 'responding_faction must be a non-empty string for required-response events');
        }
        if (!VALID_EVENT_FACTION_SET.has(row.responding_faction)) {
            failRow(filename, rowIndex, `responding_faction must be a valid event faction: ${row.responding_faction}`);
        }
    }
    if (hasOwn(row, 'responding_faction') && isNonEmptyString(row.responding_faction) && !VALID_EVENT_FACTION_SET.has(row.responding_faction)) {
        failRow(filename, rowIndex, `responding_faction must be a valid event faction: ${row.responding_faction}`);
    }
    if (hasOwn(row, 'historical_default_response_id') && isNonEmptyString(row.historical_default_response_id)) {
        const options = Array.isArray(row.response_options) ? row.response_options.filter(isObject) : [];
        const optionIds = new Set(options.map((option) => option.id).filter((id): id is string => typeof id === 'string'));
        if (!optionIds.has(row.historical_default_response_id)) {
            failRow(filename, rowIndex, `historical_default_response_id must match a response option id: ${row.historical_default_response_id}`);
        }
    }
    if (hasOwn(row, 'staff_recommended_response_id') && isNonEmptyString(row.staff_recommended_response_id)) {
        const options = Array.isArray(row.response_options) ? row.response_options.filter(isObject) : [];
        const optionIds = new Set(options.map((option) => option.id).filter((id): id is string => typeof id === 'string'));
        if (!optionIds.has(row.staff_recommended_response_id)) {
            failRow(filename, rowIndex, `staff_recommended_response_id must match a response option id: ${row.staff_recommended_response_id}`);
        }
    }
    if (hasOwn(row, 'pressure')) {
        validatePressure(row.pressure, filename, rowIndex);
    }
    // ─── Phase B Sub-slice B1 schema-only fields. ─────────────────────────
    if (hasOwn(row, 'requires_enabled')) {
        validateOptionalBoolean(row.requires_enabled, 'requires_enabled', filename, rowIndex);
    }
    if (hasOwn(row, 'family')) {
        if (!isNonEmptyString(row.family)) {
            failRow(filename, rowIndex, 'family must be a non-empty string when present');
        }
    }
    if (hasOwn(row, 'source_tier')) {
        if (!isNonEmptyString(row.source_tier) || !VALID_SOURCE_TIERS.has(row.source_tier)) {
            failRow(filename, rowIndex, `source_tier must be a known source tier when present: ${String(row.source_tier)}`);
        }
    }
    if (hasOwn(row, 'emergence_class')) {
        if (!isNonEmptyString(row.emergence_class) || !VALID_EMERGENCE_CLASSES.has(row.emergence_class)) {
            failRow(filename, rowIndex, `emergence_class must be a known emergence class when present: ${String(row.emergence_class)}`);
        }
    }
    // Composite-tag forbids meta-flag writer (test plan gate 10).
    if (hasOwn(row, 'sets_flags') && isObject(row.sets_flags)) {
        for (const key of Object.keys(row.sets_flags).sort(strictCompare)) {
            if (COMPOSITE_TAG_SET.has(key)) {
                failRow(
                    filename,
                    rowIndex,
                    `sets_flags must not write composite tag keys (compose via and/or trigger conditions instead): ${key}`,
                );
            }
        }
    }
    if (Array.isArray(row.response_options)) {
        for (let optionIndex = 0; optionIndex < row.response_options.length; optionIndex++) {
            const option = row.response_options[optionIndex];
            if (!isObject(option)) continue;
            if (!hasOwn(option, 'sets_flags') || !isObject(option.sets_flags)) continue;
            for (const key of Object.keys(option.sets_flags).sort(strictCompare)) {
                if (COMPOSITE_TAG_SET.has(key)) {
                    failRow(
                        filename,
                        rowIndex,
                        `response_options[${optionIndex}].sets_flags must not write composite tag keys (compose via and/or trigger conditions instead): ${key}`,
                    );
                }
            }
        }
    }
    // Camp-exposure option-set freeze (test plan gate 2).
    const familySlug = isNonEmptyString(row.family) ? row.family : undefined;
    const isCampExposureRow =
        row.id === 'concentration_camps_revealed_1992' ||
        isCampExposureFamily(familySlug) ||
        (isNonEmptyString(row.id) && row.id.startsWith('hvo_detention_camps_'));
    if (isCampExposureRow && Array.isArray(row.response_options) && row.response_options.length > 0) {
        const actualIds: string[] = [];
        for (const option of row.response_options) {
            if (isObject(option) && isNonEmptyString(option.id)) {
                actualIds.push(option.id);
            }
        }
        const actualSorted = [...actualIds].sort(strictCompare);
        const expectedSorted = [...CAMP_EXPOSURE_OPTION_IDS].sort(strictCompare);
        const sameLength = actualSorted.length === expectedSorted.length;
        const sameContents = sameLength && actualSorted.every((id, i) => id === expectedSorted[i]);
        if (!sameContents) {
            failRow(
                filename,
                rowIndex,
                `camp-exposure event ${String(row.id)} must use option set [deny, obstruct, cooperate] exactly; got [${actualSorted.join(', ')}]`,
            );
        }
    }
    // Staff-recommendation runtime-causality rejection (test plan gate 15).
    // A response option that carries runtime-causality arrays cannot belong to
    // a row whose modal-ready path is staff_recommended_response_id without
    // also having a historical_default_response_id.
    if (
        isNonEmptyString(row.staff_recommended_response_id) &&
        !isNonEmptyString(row.historical_default_response_id) &&
        Array.isArray(row.response_options)
    ) {
        for (let optionIndex = 0; optionIndex < row.response_options.length; optionIndex++) {
            const option = row.response_options[optionIndex];
            if (!isObject(option)) continue;
            const hasEnables = Array.isArray(option.enables_events_runtime) && option.enables_events_runtime.length > 0;
            const hasCloses = Array.isArray(option.closes_events_runtime) && option.closes_events_runtime.length > 0;
            if (hasEnables || hasCloses) {
                failRow(
                    filename,
                    rowIndex,
                    `response_options[${optionIndex}] on a staff-recommendation row must not carry enables_events_runtime or closes_events_runtime`,
                );
            }
        }
    }
    // §3.6 clause-overlap rejection (test plan gate 18) — heuristic detection
    // of an option whose effects scale an existing sensitive-history act.
    // Camp-exposure carve-out: the R4/H6 rows themselves are PERMITTED to
    // carry response-level paramilitary_policy effects because they ARE the
    // authored Ring-3 surfaces. Other rows that author the same flag keys are
    // assumed to be scaling continuation without authoring a new Ring-3 event.
    const isCarveOutId =
        SENSITIVE_ACT_CONTINUATION_CARVE_OUTS.has(String(row.id)) ||
        isCampExposureRow;
    if (!isCarveOutId && Array.isArray(row.response_options)) {
        for (let optionIndex = 0; optionIndex < row.response_options.length; optionIndex++) {
            const option = row.response_options[optionIndex];
            if (!isObject(option)) continue;
            if (isObject(option.sets_flags)) {
                for (const key of Object.keys(option.sets_flags).sort(strictCompare)) {
                    if (CAMP_OPERATION_SCALING_FLAG_KEYS.includes(key)) {
                        failRow(
                            filename,
                            rowIndex,
                            `response_options[${optionIndex}].sets_flags writes sensitive-history scaling key '${key}' outside the camp-exposure carve-out; author a new Ring-3 event instead`,
                        );
                    }
                }
            }
        }
    }
}

function validateEventRows(rows: unknown[], filename: string): void {
    rows.forEach((row, rowIndex) => validateEventRow(row, filename, rowIndex));
}

function validateUniqueEventIds(rows: EventDefinition[]): void {
    const byId = new Map<string, number>();
    for (const row of rows) {
        byId.set(row.id, (byId.get(row.id) ?? 0) + 1);
    }
    const duplicates = [...byId.entries()]
        .filter(([, count]) => count > 1)
        .map(([id]) => id)
        .sort(strictCompare);
    if (duplicates.length > 0) {
        throw new Error(`Duplicate event id(s) in required event catalog: ${duplicates.join(', ')}`);
    }
}

function collectConditionEventRefs(condition: unknown): string[] {
    if (!isObject(condition)) return [];
    const refs: string[] = [];
    if (
        (condition.type === 'week_since_event' || condition.type === 'event_fire_count') &&
        isNonEmptyString(condition.event_id)
    ) {
        refs.push(condition.event_id);
    }
    if (Array.isArray(condition.conditions)) {
        for (const entry of condition.conditions) refs.push(...collectConditionEventRefs(entry));
    }
    refs.push(...collectConditionEventRefs(condition.condition));
    return refs;
}

function collectFutureConsequenceEventRefs(row: EventDefinition): string[] {
    const refs: string[] = [];
    for (const option of row.response_options ?? []) {
        for (const consequence of option.future_consequences ?? []) {
            refs.push(...(consequence.opens_events ?? []), ...(consequence.closes_events ?? []));
        }
    }
    return refs;
}

function collectResponseOptionRuntimeRefs(row: EventDefinition): string[] {
    const refs: string[] = [];
    for (const option of row.response_options ?? []) {
        if (Array.isArray(option.enables_events_runtime)) {
            refs.push(...option.enables_events_runtime);
        }
        if (Array.isArray(option.closes_events_runtime)) {
            refs.push(...option.closes_events_runtime);
        }
    }
    return refs;
}

function collectEventRefs(row: EventDefinition): string[] {
    const refs = [...(row.trigger.requires_events ?? []), ...(row.enables_events ?? [])];
    refs.push(...collectConditionEventRefs(row.trigger.condition));
    refs.push(...collectFutureConsequenceEventRefs(row));
    // Phase B Sub-slice B1 — runtime-causality arrays use the same dangling-ref pass.
    refs.push(...collectResponseOptionRuntimeRefs(row));
    const pressure = (row as EventDefinition & { pressure?: unknown }).pressure;
    if (isObject(pressure) && Array.isArray(pressure.modifiers)) {
        for (const modifier of pressure.modifiers) {
            if (isObject(modifier)) refs.push(...collectConditionEventRefs(modifier.condition));
        }
    }
    return refs;
}

function validateEventReferences(rows: EventDefinition[]): void {
    const ids = new Set(rows.map((row) => row.id));
    const missing = rows.flatMap((row) =>
        collectEventRefs(row)
            .filter((id) => !ids.has(id))
            .map((id) => `${row.id}->${id}`),
    ).sort(strictCompare);
    if (missing.length > 0) {
        throw new Error(`Unknown event reference(s) in required event catalog: ${missing.join(', ')}`);
    }
}

/**
 * Cross-faction option-id rejection (test plan gate 9). Two option ids
 * identical across rows of different `responding_faction` are rejected
 * WHEN the option carries runtime causality (`enables_events_runtime` or
 * `closes_events_runtime`). Generic shared option ids without causality
 * (`accept` / `reject` / `acknowledge_pressure`) are common authoring
 * practice in the existing 247-row catalog and remain permitted.
 *
 * Defense against near-name reintroduction: if a future authoring pass
 * adds runtime causality to an option whose id is already in use by a
 * different faction's row, the gate fires and forces an id rename so
 * causality cannot silently flow across factions.
 */
function validateCrossFactionOptionIds(rows: EventDefinition[]): void {
    const sorted = [...rows].sort((a, b) => strictCompare(a.id, b.id));
    type Entry = { rowId: string; faction: string; hasCausality: boolean };
    const optionEntries = new Map<string, Entry[]>();
    for (const row of sorted) {
        const faction = row.responding_faction;
        if (!faction) continue;
        if (!Array.isArray(row.response_options)) continue;
        for (const option of row.response_options) {
            if (typeof option.id !== 'string' || option.id.length === 0) continue;
            const hasCausality =
                (Array.isArray(option.enables_events_runtime) && option.enables_events_runtime.length > 0) ||
                (Array.isArray(option.closes_events_runtime) && option.closes_events_runtime.length > 0);
            const list = optionEntries.get(option.id) ?? [];
            list.push({ rowId: row.id, faction, hasCausality });
            optionEntries.set(option.id, list);
        }
    }
    const collisions: string[] = [];
    const sortedIds = Array.from(optionEntries.keys()).sort(strictCompare);
    for (const id of sortedIds) {
        const entries = optionEntries.get(id)!;
        // Find a cross-faction pair where at least one side carries runtime causality.
        for (let i = 0; i < entries.length; i++) {
            for (let j = i + 1; j < entries.length; j++) {
                if (entries[i].faction === entries[j].faction) continue;
                if (!entries[i].hasCausality && !entries[j].hasCausality) continue;
                const pair = [
                    `${entries[i].rowId}:${entries[i].faction}`,
                    `${entries[j].rowId}:${entries[j].faction}`,
                ].sort(strictCompare);
                collisions.push(`${id} (${pair[0]} & ${pair[1]})`);
            }
        }
    }
    if (collisions.length > 0) {
        const unique: string[] = [];
        const seen = new Set<string>();
        for (const c of collisions) {
            if (!seen.has(c)) {
                seen.add(c);
                unique.push(c);
            }
        }
        unique.sort(strictCompare);
        throw new Error(
            `Cross-faction option id collision(s) carrying runtime causality in required event catalog: ${unique.join(', ')}`,
        );
    }
}

/**
 * Ring-3 enabling rejection (test plan gate 14 / packet §3.6).
 * A response option's `enables_events_runtime[]` may not target an event
 * whose own `family` falls inside the Ring-3 sensitive-history set.
 */
function validateRing3EnablingRejection(rows: EventDefinition[]): void {
    const byId = new Map<string, EventDefinition>();
    for (const row of rows) byId.set(row.id, row);
    const violations: string[] = [];
    const sortedRows = [...rows].sort((a, b) => strictCompare(a.id, b.id));
    for (const row of sortedRows) {
        if (!Array.isArray(row.response_options)) continue;
        for (let optionIndex = 0; optionIndex < row.response_options.length; optionIndex++) {
            const option = row.response_options[optionIndex];
            const enables = Array.isArray(option.enables_events_runtime)
                ? [...option.enables_events_runtime].sort(strictCompare)
                : [];
            for (const targetId of enables) {
                const target = byId.get(targetId);
                if (!target) continue; // dangling ref handled elsewhere
                if (isRing3SensitiveFamily(target.family)) {
                    violations.push(`${row.id}#${option.id ?? optionIndex}->${targetId}(${target.family ?? '?'})`);
                }
            }
        }
    }
    if (violations.length > 0) {
        violations.sort(strictCompare);
        throw new Error(
            `Ring-3 enabling rejection in required event catalog (response cannot runtime-enable a sensitive-history event): ${violations.join(', ')}`,
        );
    }
}

/**
 * Rupture-foreclosure prohibition (test plan gate 21, widened by Canon
 * Compliance Wave 2 review). Per Sensitive History Design Gate §1 #3
 * ("no negotiable condemnation"), once a rupture is recorded it is permanent.
 *
 * Rule: NO row in the catalog — regardless of family — may carry a response
 * option whose `closes_events_runtime` references `srebrenica_falls_1995`
 * or `srebrenica_genocide_1995`, UNLESS the `(event_id, response_id)` tuple
 * is present in {@link SREBRENICA_FORECLOSURE_ALLOWLIST}. The allowlist is
 * empty in B1; future Gate §6 sign-off (B4 `accept_*`, X4 counterfactual A,
 * X5 D/E) populates it with provenance citations.
 */
function validateRuptureForeclosurePolicy(rows: EventDefinition[]): void {
    const violations: string[] = [];
    const sortedRows = [...rows].sort((a, b) => strictCompare(a.id, b.id));
    for (const row of sortedRows) {
        if (!Array.isArray(row.response_options)) continue;
        for (let optionIndex = 0; optionIndex < row.response_options.length; optionIndex++) {
            const option = row.response_options[optionIndex];
            const closes = Array.isArray(option.closes_events_runtime)
                ? [...option.closes_events_runtime].sort(strictCompare)
                : [];
            for (const targetId of closes) {
                if (!RUPTURE_FORECLOSURE_FORBIDDEN_IDS.includes(targetId)) continue;
                const optionId = isNonEmptyString(option.id) ? option.id : String(optionIndex);
                const allowlistKey = `${row.id}#${optionId}`;
                if (SREBRENICA_FORECLOSURE_ALLOWLIST.has(allowlistKey)) continue;
                violations.push(`${row.id}#${optionId}->${targetId}`);
            }
        }
    }
    if (violations.length > 0) {
        violations.sort(strictCompare);
        throw new Error(
            `Rupture-foreclosure prohibition violated (no row may close srebrenica_falls_1995 or srebrenica_genocide_1995 without an explicit Gate §6 allowlist entry): ${violations.join(', ')}`,
        );
    }
}

/**
 * Gate 3 explicit reject pass — forbidden family slugs.
 *
 * Per the Foundational packet `drina_cleansing_decision_1992` ruling and the
 * Stupčanica-95 data-not-comment lesson: canonical exclusions must be
 * enforced at the loader level, not via author comments. Any row whose
 * `family` is listed in {@link FORBIDDEN_FAMILY_SLUGS} fails catalog load.
 */
function validateForbiddenFamilyExclusions(rows: EventDefinition[]): void {
    const violations: string[] = [];
    const sortedRows = [...rows].sort((a, b) => strictCompare(a.id, b.id));
    for (const row of sortedRows) {
        if (typeof row.family !== 'string') continue;
        if (FORBIDDEN_FAMILY_SLUGS.has(row.family)) {
            violations.push(`${row.id}(family=${row.family})`);
        }
    }
    if (violations.length > 0) {
        violations.sort(strictCompare);
        throw new Error(
            `Forbidden family slug(s) in required event catalog (canon exclusion enforced via data, not comments): ${violations.join(', ')}`,
        );
    }
}

/**
 * Unreachable-gate rejection (test plan gate 16 / packet §3.6).
 * Every event with `requires_enabled: true` must be referenced in some
 * `EventDefinition.enables_events` or some
 * `EventResponseOption.enables_events_runtime` in the catalog. Additionally,
 * at least one such opener must itself be reachable via a
 * `historical_default_response_id` ancestor path — implemented as: there
 * exists an opener whose own row is NOT itself `requires_enabled`, OR whose
 * historical-default option (or row-level `enables_events`) opens it.
 *
 * Conservative implementation: trace whether any opener row has no
 * `requires_enabled` of its own (i.e., is calendar/condition-reachable on the
 * historical path) OR has a `historical_default_response_id`. Catches
 * obvious unreachable gates while keeping the loader fast.
 */
function validateUnreachableGates(rows: EventDefinition[]): void {
    const byId = new Map<string, EventDefinition>();
    for (const row of rows) byId.set(row.id, row);
    // Build reverse openers: targetId -> [opener row id].
    const openersByTarget = new Map<string, Set<string>>();
    const sortedRows = [...rows].sort((a, b) => strictCompare(a.id, b.id));
    for (const row of sortedRows) {
        const eventLevel = Array.isArray(row.enables_events) ? row.enables_events : [];
        for (const targetId of eventLevel) {
            if (!openersByTarget.has(targetId)) openersByTarget.set(targetId, new Set());
            openersByTarget.get(targetId)!.add(row.id);
        }
        if (Array.isArray(row.response_options)) {
            for (const option of row.response_options) {
                const optEnables = Array.isArray(option.enables_events_runtime)
                    ? option.enables_events_runtime
                    : [];
                for (const targetId of optEnables) {
                    if (!openersByTarget.has(targetId)) openersByTarget.set(targetId, new Set());
                    openersByTarget.get(targetId)!.add(row.id);
                }
            }
        }
    }
    const unreachable: string[] = [];
    for (const row of sortedRows) {
        if (row.requires_enabled !== true) continue;
        const openers = openersByTarget.get(row.id);
        if (!openers || openers.size === 0) {
            unreachable.push(`${row.id}(no_opener)`);
            continue;
        }
        // At least one opener must be reachable on the historical path:
        //   - opener does NOT itself require_enabled, OR
        //   - opener has a historical_default_response_id, OR
        //   - opener is calendar-triggered (turn_min set, no requires_enabled).
        let reachableOpenerFound = false;
        const openerIds = Array.from(openers).sort(strictCompare);
        for (const openerId of openerIds) {
            const opener = byId.get(openerId);
            if (!opener) continue;
            const openerRequiresEnabled = opener.requires_enabled === true;
            const openerHasHistDefault = isNonEmptyString(opener.historical_default_response_id);
            if (!openerRequiresEnabled || openerHasHistDefault) {
                reachableOpenerFound = true;
                break;
            }
        }
        if (!reachableOpenerFound) {
            unreachable.push(`${row.id}(no_historical_default_path)`);
        }
    }
    if (unreachable.length > 0) {
        unreachable.sort(strictCompare);
        throw new Error(
            `Unreachable requires_enabled event(s) in required event catalog: ${unreachable.join(', ')}`,
        );
    }
}

/**
 * Phase D Packet 44 — Pass A: DimensionId vocabulary check.
 *
 * For every `dimension_shifts[].dimension` (event-level and option-level),
 * assert membership in the typed {@link DIMENSION_IDS} set. An unknown
 * dimension name is a DEAD write: `applyDimensionShift()` no-ops when the
 * dimension is not present in the typed `DimensionStore`, and the catalog
 * silently loses the authored effect.
 *
 * Common authoring failure mode is to pass an `EffectKind` (e.g.
 * `'patron_pressure'`, `'alliance_change'`) into a dimension slot. The error
 * message names the offending row/option/dimension and suggests authoring via
 * `effects[].kind` instead.
 */
function validateDimensionShiftVocabulary(rows: EventDefinition[]): void {
    const violations: string[] = [];
    const knownList = [...DIMENSION_IDS].sort(strictCompare).join(', ');
    const sortedRows = [...rows].sort((a, b) => strictCompare(a.id, b.id));
    for (const row of sortedRows) {
        // Event-level dimension_shifts.
        const eventLevel = (row as EventDefinition & { dimension_shifts?: unknown }).dimension_shifts;
        if (Array.isArray(eventLevel)) {
            for (let shiftIndex = 0; shiftIndex < eventLevel.length; shiftIndex++) {
                const shift = eventLevel[shiftIndex];
                if (!isObject(shift)) continue;
                const dim = shift.dimension;
                if (typeof dim !== 'string' || dim.length === 0) continue;
                if (!KNOWN_DIMENSION_ID_SET.has(dim)) {
                    violations.push(`${row.id}#event[${shiftIndex}]:${dim}`);
                }
            }
        }
        // Response-option-level dimension_shifts.
        if (!Array.isArray(row.response_options)) continue;
        for (let optionIndex = 0; optionIndex < row.response_options.length; optionIndex++) {
            const option = row.response_options[optionIndex];
            if (!isObject(option)) continue;
            const optShifts = (option as { dimension_shifts?: unknown }).dimension_shifts;
            if (!Array.isArray(optShifts)) continue;
            const optionId = isNonEmptyString((option as { id?: unknown }).id)
                ? (option as { id: string }).id
                : String(optionIndex);
            for (let shiftIndex = 0; shiftIndex < optShifts.length; shiftIndex++) {
                const shift = optShifts[shiftIndex];
                if (!isObject(shift)) continue;
                const dim = shift.dimension;
                if (typeof dim !== 'string' || dim.length === 0) continue;
                if (!KNOWN_DIMENSION_ID_SET.has(dim)) {
                    violations.push(`${row.id}#${optionId}[${shiftIndex}]:${dim}`);
                }
            }
        }
    }
    if (violations.length > 0) {
        violations.sort(strictCompare);
        throw new Error(
            `Unknown DimensionId in dimension_shifts in required event catalog — must be one of [${knownList}]. ` +
            `If you intended an EffectKind, author via effects[].kind instead. Offending entries: ${violations.join(', ')}`,
        );
    }
}

/**
 * Phase D Packet 44 — Pass B: EffectKind vocabulary check.
 *
 * For every `effect.kind` (top-level) and every `effects[].kind` (event-level
 * and option-level), assert membership in {@link KNOWN_EVENT_EFFECT_KIND_SET}.
 *
 * Per-row structural validation (validateKindedObject/validateKindedArray)
 * already enforces this on the row's own `effect`/`effects` paths AND on each
 * response option's `effect`/`effects` paths during `validateEventRow`. This
 * catalog-level pass walks the same surface a second time to provide a single
 * load-time gate: any future authoring pass that bypasses the structural
 * walker (e.g., new top-level kinded field) still gets caught here.
 *
 * The error message names the offending row/option/path so authors can locate
 * the typo immediately.
 */
function validateEffectKindVocabulary(rows: EventDefinition[]): void {
    const violations: string[] = [];
    const sortedRows = [...rows].sort((a, b) => strictCompare(a.id, b.id));
    function checkKind(value: unknown, label: string): void {
        if (!isObject(value)) return;
        const kind = (value as { kind?: unknown }).kind;
        if (typeof kind !== 'string' || kind.length === 0) return;
        if (!KNOWN_EVENT_EFFECT_KIND_SET.has(kind)) {
            violations.push(`${label}:${kind}`);
        }
    }
    function checkKindArray(value: unknown, label: string): void {
        if (!Array.isArray(value)) return;
        for (let i = 0; i < value.length; i++) {
            checkKind(value[i], `${label}[${i}]`);
        }
    }
    for (const row of sortedRows) {
        checkKind((row as EventDefinition & { effect?: unknown }).effect, `${row.id}#event.effect`);
        checkKindArray((row as EventDefinition & { effects?: unknown }).effects, `${row.id}#event.effects`);
        if (!Array.isArray(row.response_options)) continue;
        for (let optionIndex = 0; optionIndex < row.response_options.length; optionIndex++) {
            const option = row.response_options[optionIndex];
            if (!isObject(option)) continue;
            const optionId = isNonEmptyString((option as { id?: unknown }).id)
                ? (option as { id: string }).id
                : String(optionIndex);
            checkKind((option as { effect?: unknown }).effect, `${row.id}#${optionId}.effect`);
            checkKindArray((option as { effects?: unknown }).effects, `${row.id}#${optionId}.effects`);
        }
    }
    if (violations.length > 0) {
        violations.sort(strictCompare);
        throw new Error(
            `Unknown EffectKind in required event catalog (must appear in KNOWN_EVENT_EFFECT_KIND_SET in event_vocabulary.ts): ${violations.join(', ')}`,
        );
    }
}

/**
 * Load a single required event JSON file. Required catalog files fail closed:
 * missing, malformed, or non-array JSON is a loader error.
 */
function loadRequiredEventFile(eventsDir: string, filename: string): EventDefinition[] {
    const filepath = resolve(eventsDir, filename);
    if (!existsSync(filepath)) {
        throw new Error(`Required event file missing: ${filename}`);
    }

    const content = readFileSync(filepath, 'utf8');
    let parsed: unknown;
    try {
        parsed = JSON.parse(content);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to parse required event file ${filename}: ${message}`);
    }

    if (!Array.isArray(parsed)) {
        throw new Error(`Required event file ${filename} must contain a JSON array`);
    }

    validateEventRows(parsed, filename);

    return parsed as EventDefinition[];
}

/**
 * Load all historical event definitions from scenario JSON files.
 * Filters events: only includes events with trigger.turn_min >= scenarioStartWeek.
 * Returns events sorted by turn_min for deterministic evaluation order.
 *
 * @param scenarioStartWeek - The scenario's start week (0 = April 6, 1992). Events before this are excluded.
 */
export function loadEventDefinitionsFromDir(scenarioStartWeek: number, eventsDir: string): EventDefinition[] {
    const allEvents: EventDefinition[] = [];

    for (const filename of EVENT_FILES) {
        const events = loadRequiredEventFile(eventsDir, filename);
        allEvents.push(...events);
    }
    validateUniqueEventIds(allEvents);
    validateEventReferences(allEvents);
    // ─── Phase D Packet 44 vocabulary passes. ──────────────────────────────
    // Run vocabulary checks before family/structural causality passes so a
    // typo on `dimension_shifts[].dimension` or `effects[].kind` fails with
    // a precise message rather than cascading into downstream "DEAD write"
    // bug-class symptoms at runtime.
    validateDimensionShiftVocabulary(allEvents);
    validateEffectKindVocabulary(allEvents);
    // ─── Phase B Sub-slice B1 catalog-level passes. ────────────────────────
    validateCrossFactionOptionIds(allEvents);
    validateRing3EnablingRejection(allEvents);
    validateRuptureForeclosurePolicy(allEvents);
    validateForbiddenFamilyExclusions(allEvents);
    validateUnreachableGates(allEvents);

    // Filter: only events at or after the scenario start week
    const filtered = allEvents.filter(ev => {
        const turnMin = ev.trigger.turn_min;
        // Events without turn_min always pass the filter
        if (turnMin == null) return true;
        return turnMin >= scenarioStartWeek;
    });

    // Sort by turn_min (ascending) for deterministic order. Events without turn_min sort last.
    filtered.sort((a, b) => {
        const aMin = a.trigger.turn_min ?? Number.MAX_SAFE_INTEGER;
        const bMin = b.trigger.turn_min ?? Number.MAX_SAFE_INTEGER;
        if (aMin !== bMin) return aMin - bMin;
        // Stable secondary sort by id
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

    return filtered;
}

export function loadEventDefinitions(scenarioStartWeek: number): EventDefinition[] {
    return loadEventDefinitionsFromDir(scenarioStartWeek, EVENTS_DIR);
}
