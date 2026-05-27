/**
 * v0.4.1 Phase 3+4: Load historical event definitions from scenario JSON files.
 * Events are loaded from data/scenarios/events/ and filtered by scenario start week.
 * Deterministic: sorted by turn_min for stable evaluation order.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EventDefinition } from './event_types.js';

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

function validateKindedObject(value: unknown, path: string, filename: string, rowIndex: number): void {
    if (!isObject(value)) {
        failRow(filename, rowIndex, `${path} must be a non-null object`);
    }
    if (!isNonEmptyString(value.kind)) {
        failRow(filename, rowIndex, `${path}.kind must be a non-empty string`);
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
        if (hasOwn(option, 'effects')) {
            validateKindedArray(option.effects, `${path}.effects`, filename, rowIndex);
        }
    });
}

function validateEventRow(row: unknown, filename: string, rowIndex: number): void {
    if (!isObject(row)) {
        failRow(filename, rowIndex, 'row must be a non-null object');
    }
    if (!isNonEmptyString(row.id)) {
        failRow(filename, rowIndex, 'id must be a non-empty string');
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
    if (hasOwn(row.trigger, 'requires_events')) {
        const requiresEvents = row.trigger.requires_events;
        if (!Array.isArray(requiresEvents) || !requiresEvents.every((id) => typeof id === 'string')) {
            failRow(filename, rowIndex, 'trigger.requires_events must be a string array when present');
        }
    }

    validateKindedObject(row.effect, 'effect', filename, rowIndex);
    if (hasOwn(row, 'effects')) {
        validateKindedArray(row.effects, 'effects', filename, rowIndex);
    }
    if (hasOwn(row, 'response_options')) {
        validateResponseOptions(row.response_options, filename, rowIndex);
    }
}

function validateEventRows(rows: unknown[], filename: string): void {
    rows.forEach((row, rowIndex) => validateEventRow(row, filename, rowIndex));
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
