/**
 * Developer text that must never reach a player-visible surface.
 *
 * Council fix 4 (R8 dry run, 2026-11-14, items C1, C7 and C14): presidential dossiers showed
 * worksheet ids, repository paths, turn windows, "the row's", "calibration baseline",
 * "machine-drafted", design-gate citations and "not applicable" evaluator bullets. This module
 * names that vocabulary once, so the display filters and the guard test
 * (`tests/ui/player_copy_developer_terms_guard.test.ts`) use the same list.
 *
 * Pure and deterministic: fixed term order, no locale or clock input.
 */

export interface DeveloperTerm {
    /** Stable id used by the guard's allowlist. */
    id: string;
    pattern: RegExp;
    /** Why it is developer text, for the guard's failure message. */
    why: string;
}

export const DEVELOPER_TERMS: ReadonlyArray<DeveloperTerm> = [
    { id: 'worksheet', pattern: /\bworksheets?\b/i, why: 'authoring worksheet reference' },
    {
        id: 'repo_path',
        pattern: /\b(?:docs|src|data|tools|tests)\/[\w./-]+|\b[\w-]+\.(?:md|tsx?|cjs|mjs)\b/i,
        why: 'repository path or file name',
    },
    { id: 'machine_drafted', pattern: /\bmachine[- ]drafted\b|\bhand[- ]corrected\b/i, why: 'editorial provenance note' },
    { id: 'calibration', pattern: /\bcalibrat\w*|\bkalibr\w*/i, why: 'calibration vocabulary' },
    {
        id: 'design_gate',
        pattern: /\bdesign gate\b|\bpacket §|\bv\d+\.\d+ packet\b|\bRing[- ][123]\b/i,
        why: 'design-gate or packet citation',
    },
    { id: 'not_applicable', pattern: /\bnot applicable\b|\bnije primjenjiv\w*/i, why: 'evaluator "not applicable" output' },
    {
        id: 'row',
        pattern: /\brow's\b|\b(?:this|the|each|that) row\b|\brow only\b|\brecommendation row\b/i,
        why: 'data-row voice',
    },
    {
        id: 'turn_window',
        pattern: /\bturns? \d+(?:\s*[-–]\s*\d+)?\b|\bturn window\b|\bt\d{2,3}\b/i,
        why: 'engine turn number or turn window',
    },
    { id: 'engine_logic', pattern: /\bexogenous\b|\bguardrail\b|\bpredicate\b/i, why: 'trigger-logic vocabulary' },
    { id: 'authoring_voice', pattern: /\bauthoring\b|\bsource text\b/i, why: 'authoring-process voice' },
    {
        id: 'scenario_start',
        pattern: /\bscenario start\b|\bopening OOB\b|\bscenario[- ]authored\b|početk\w* scenarija|\bscenarijsk\w*/i,
        why: 'scenario-setup voice',
    },
    { id: 'modeled_as', pattern: /\bmodell?ed as\b|\bmodelirano kao\b/i, why: 'modelling voice' },
    { id: 'snake_case_id', pattern: /\b[a-z][a-z0-9]*_[a-z0-9]+(?:_[a-z0-9]+)*\b/, why: 'internal id' },
    {
        id: 'process_code',
        pattern: /\bPhase [A-H]\d?\b|\bLANE-[A-Z]|\bWave-\d+|\b[A-H]\d{1,2}[a-z]? (?:branch|worksheet)|\((?:[A-H]\d{1,2}[a-z]?)(?:\s*\/\s*[A-H]\d{1,2}[a-z]?)*\)|\bat [A-H]\d{1,2}\b/,
        why: 'internal phase, lane or worksheet code',
    },
    { id: 'canon_voice', pattern: /\bcanon(?:-bound)?\b/i, why: 'canon-process voice' },
    {
        id: 'evaluator_voice',
        pattern: /\bsupply truth\b|\bistina snabdijevanja\b|\bread[- ]model\b|\baudit-only\b|\breckoning surface\b|\bconsequence surface\b|\bcommander state present\b|\bstate carries\b|\bresolver\b|\bsource review\b|\bin this build\b|\bu ovoj verziji\b/i,
        why: 'evaluator or engine voice',
    },
];

export interface DeveloperTermHit {
    id: string;
    match: string;
    why: string;
}

/** Message placeholders (`{count}`) are code, not prose; strip them before scanning. */
function stripPlaceholders(text: string): string {
    return text.replace(/\{[^{}]*\}/g, ' ');
}

/** Every developer term in `text`, in DEVELOPER_TERMS order, each term at most once. */
export function findDeveloperTerms(text: string): DeveloperTermHit[] {
    const scanned = stripPlaceholders(text);
    const hits: DeveloperTermHit[] = [];
    for (const term of DEVELOPER_TERMS) {
        const match = scanned.match(term.pattern);
        if (match) hits.push({ id: term.id, match: match[0], why: term.why });
    }
    return hits;
}

export function hasDeveloperText(text: string): boolean {
    return findDeveloperTerms(text).length > 0;
}

/**
 * The first candidate that is non-empty and free of developer text, or null.
 * Used for dossier source lines: an authoring note is hidden rather than shown.
 */
export function firstPlayerSafeText(candidates: ReadonlyArray<string | undefined | null>): string | null {
    for (const candidate of candidates) {
        if (typeof candidate !== 'string') continue;
        const text = candidate.trim();
        if (text.length > 0 && !hasDeveloperText(text)) return text;
    }
    return null;
}
