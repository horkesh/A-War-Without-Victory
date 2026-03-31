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

/** Event JSON file names in chronological order. */
const EVENT_FILES = [
    'war_1992.json',
    'war_1993.json',
    'war_1994.json',
    'war_1995.json',
];

/**
 * Load a single event JSON file. Returns empty array if file is missing or malformed.
 */
function loadEventFile(filename: string): EventDefinition[] {
    const filepath = resolve(EVENTS_DIR, filename);
    if (!existsSync(filepath)) {
        return [];
    }
    try {
        const content = readFileSync(filepath, 'utf8');
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed as EventDefinition[];
    } catch {
        return [];
    }
}

/**
 * Load all historical event definitions from scenario JSON files.
 * Filters events: only includes events with trigger.turn_min >= scenarioStartWeek.
 * Returns events sorted by turn_min for deterministic evaluation order.
 *
 * @param scenarioStartWeek - The scenario's start week (0 = April 6, 1992). Events before this are excluded.
 */
export function loadEventDefinitions(scenarioStartWeek: number): EventDefinition[] {
    const allEvents: EventDefinition[] = [];

    for (const filename of EVENT_FILES) {
        const events = loadEventFile(filename);
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
