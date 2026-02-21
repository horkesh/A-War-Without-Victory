/**
 * B2 Campaign branching: playable scenario IDs from completed set and prerequisites.
 * Deterministic: sorted arrays, no randomness.
 */

import { strictCompare } from '../state/validateGameState.js';

/**
 * Return scenario_ids that are playable: either no prerequisites or all prerequisites are in completedIds.
 * Result is sorted for deterministic output.
 */
export function getPlayableScenarioIds(
    allScenarioIds: string[],
    completedIds: Set<string>,
    scenarioPrerequisites: Map<string, string[]>
): string[] {
    const playable: string[] = [];
    for (const id of allScenarioIds) {
        const prereqs = scenarioPrerequisites.get(id);
        if (!prereqs || prereqs.length === 0) {
            playable.push(id);
            continue;
        }
        const allMet = prereqs.every((p) => completedIds.has(p));
        if (allMet) playable.push(id);
    }
    return playable.sort(strictCompare);
}

/**
 * Persist completed scenario IDs to a JSON file (sorted array for determinism).
 * Node-only: uses fs.
 */
export async function writeCompletedScenarioIds(
    filePath: string,
    completedIds: Set<string>
): Promise<void> {
    const { writeFile } = await import('node:fs/promises');
    const ids = Array.from(completedIds).sort(strictCompare);
    await writeFile(filePath, JSON.stringify(ids, null, 2), 'utf8');
}

/**
 * Load completed scenario IDs from a JSON file.
 * Expects a JSON array of strings. Returns empty set on missing or invalid file.
 * Node-only: uses fs.
 */
export async function readCompletedScenarioIds(filePath: string): Promise<Set<string>> {
    const { readFile } = await import('node:fs/promises');
    try {
        const content = await readFile(filePath, 'utf8');
        const raw = JSON.parse(content);
        if (!Array.isArray(raw)) return new Set();
        const ids = (raw as unknown[])
            .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
            .map((x) => x.trim());
        return new Set(ids);
    } catch {
        return new Set();
    }
}

/**
 * Add a scenario_id to the completed set and persist.
 * Loads existing, adds id, writes back (sorted).
 */
export async function markScenarioCompleted(
    filePath: string,
    scenarioId: string
): Promise<void> {
    const completed = await readCompletedScenarioIds(filePath);
    completed.add(scenarioId.trim());
    await writeCompletedScenarioIds(filePath, completed);
}
