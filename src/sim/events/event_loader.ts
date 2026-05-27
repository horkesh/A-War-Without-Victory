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
