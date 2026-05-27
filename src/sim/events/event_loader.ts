/**
 * v0.4.1 Phase 3+4: Load historical event definitions from scenario JSON files.
 * Events are loaded from data/scenarios/events/ and filtered by scenario start week.
 * Deterministic: sorted by turn_min for stable evaluation order.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EventDefinition } from './event_types.js';
import {
    KNOWN_EVENT_CONDITION_TYPE_SET,
    KNOWN_EVENT_EFFECT_KIND_SET,
    VALID_EVENT_FACTION_SET,
} from './event_vocabulary.js';

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
    if (hasOwn(row, 'pressure')) {
        validatePressure(row.pressure, filename, rowIndex);
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

function collectEventRefs(row: EventDefinition): string[] {
    const refs = [...(row.trigger.requires_events ?? []), ...(row.enables_events ?? [])];
    refs.push(...collectConditionEventRefs(row.trigger.condition));
    const pressure = (row as unknown as JsonObject).pressure;
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
