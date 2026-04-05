/**
 * commander_debug.ts — Deterministic debug helpers for the Commander intelligence system.
 *
 * Pure functions only. No side effects. No imports from game logic.
 * Import only from commander_state.ts (types only).
 * Use for test assertions and console debugging — not player-facing.
 *
 * Deterministic: all sorting uses string comparison, no Math.random(), no Date.now().
 */

import type { CommanderDecisionTrace } from './commander_state.js';

// ─── String comparison (deterministic, no external dependency) ───────────────

function strCompare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

// ─── Lifecycle action header annotation ──────────────────────────────────────

function deriveLifecycleAnnotation(trace: CommanderDecisionTrace): string {
    for (const c of trace.hard_constraints) {
        if (c === 'plan_ready_for_launch') return ' [LAUNCHED]';
        if (c.startsWith('plan_abandoned_')) return ' [ABANDONED]';
        if (c.startsWith('plan_suspended_')) return ' [SUSPENDED]';
    }
    return '';
}

// ─── Format score breakdown ───────────────────────────────────────────────────

function formatBreakdown(breakdown: Readonly<Record<string, number>>): string {
    const entries = Object.entries(breakdown)
        .filter(([, v]) => v !== 0)
        .sort(([a], [b]) => strCompare(a, b))
        .map(([k, v]) => `${k}=${v.toFixed(4)}`);
    return entries.length > 0 ? entries.join(' ') : '(empty)';
}

// ─── formatTraceHeader ────────────────────────────────────────────────────────

/**
 * Format just the header line of a trace.
 * Useful for short failure messages in test output.
 */
export function formatTraceHeader(trace: CommanderDecisionTrace): string {
    const winnerLabel = trace.winning_intent_id ?? '(none)';
    const annotation = deriveLifecycleAnnotation(trace);
    return `Turn ${trace.turn} | Winner: ${winnerLabel}${annotation}`;
}

// ─── formatDecisionTrace ─────────────────────────────────────────────────────

/**
 * Format a full commander decision trace as a human-readable multi-line string.
 * Returns "no trace" when input is undefined.
 *
 * Output is deterministic: candidates sorted WINNER→BLOCKED→LOSER, ties by intent_id.
 * Score breakdown keys sorted alphabetically. All constraint/lesson/relationship lists sorted.
 */
export function formatDecisionTrace(trace: CommanderDecisionTrace | undefined): string {
    if (trace === undefined) return 'no trace';

    const lines: string[] = [];
    lines.push(formatTraceHeader(trace));

    const isLifecycle = trace.candidates.length === 0;

    if (isLifecycle) {
        lines.push('  (lifecycle action — no competition)');
    } else {
        lines.push(`Candidates (${trace.candidates.length}):`);

        // Separate into winner, blocked, losers
        const winner = trace.candidates.find(c => c.intent_id === trace.winning_intent_id);
        const blocked = trace.candidates
            .filter(c => c.blocked_by.length > 0)
            .sort((a, b) => strCompare(a.intent_id, b.intent_id));
        const losers = trace.candidates
            .filter(c => c.blocked_by.length === 0 && c.intent_id !== trace.winning_intent_id)
            .sort((a, b) => {
                const scoreDiff = b.score - a.score;
                if (Math.abs(scoreDiff) > 1e-9) return scoreDiff > 0 ? 1 : -1;
                return strCompare(a.intent_id, b.intent_id);
            });

        const formatCandidate = (label: string, c: { intent_id: string; score: number; score_breakdown: Readonly<Record<string, number>>; blocked_by: readonly string[] }): string => {
            let line = `  [${label}] ${c.intent_id}  score=${c.score.toFixed(4)} | ${formatBreakdown(c.score_breakdown)}`;
            if (c.blocked_by.length > 0) {
                line += ` | blocked_by: ${[...c.blocked_by].sort(strCompare).join(' ')}`;
            }
            return line;
        };

        if (winner) lines.push(formatCandidate('WINNER', winner));
        for (const c of blocked) lines.push(formatCandidate('BLOCKED', c));
        for (const c of losers) lines.push(formatCandidate('LOSER', c));
    }

    if (trace.hard_constraints.length > 0) {
        lines.push(`Hard constraints: ${[...trace.hard_constraints].sort(strCompare).join(' ')}`);
    }
    if (trace.lessons_applied.length > 0) {
        lines.push(`Lessons applied: ${[...trace.lessons_applied].sort(strCompare).join(' ')}`);
    }
    if (trace.relationships_applied.length > 0) {
        lines.push(`Relationships applied: ${[...trace.relationships_applied].sort(strCompare).join(' ')}`);
    }

    return lines.join('\n');
}
