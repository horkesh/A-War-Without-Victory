/**
 * Event registry: loaded from scenario JSON files at init time.
 * Order is stable (sorted by turn_min, then id); same scenario + seed + turn → same events.
 *
 * v0.4.1: replaced hardcoded placeholders with JSON-loaded events via event_loader.ts.
 * Call initEventRegistry() from the scenario runner before the first turn.
 * evaluateEvents() uses the registry passed as parameter, falling back to this module default.
 */

import type { EventDefinition } from './event_types.js';
import { loadEventDefinitions } from './event_loader.js';

/** Mutable registry populated by initEventRegistry(). Empty until init. */
let _registry: EventDefinition[] = [];

/**
 * Initialize the event registry from scenario JSON files.
 * Must be called before the first turn. Filters events by scenario start week.
 */
export function initEventRegistry(scenarioStartWeek: number): void {
    _registry = loadEventDefinitions(scenarioStartWeek);
}

/** Get the current event registry. Returns empty array if not initialized. */
export function getEventRegistry(): EventDefinition[] {
    return _registry;
}

