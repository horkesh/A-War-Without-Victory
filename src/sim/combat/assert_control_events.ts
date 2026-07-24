import type { ControlEvent, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { ValidationIssue } from '../../validate/validate.js';

const RECOGNIZED_CONTROL_EVENT_MECHANISMS = new Set<ControlEvent['mechanism']>([
    'abandoned',
    'combat',
    'consolidation',
    'event',
    'paramilitary',
]);

/** Snapshot political controllers at turn start by value. */
export function snapshotPoliticalControllers(state: GameState): Record<string, string | null> {
    return { ...(state.political?.political_controllers ?? {}) };
}

/** Return deterministic issues for final control changes lacking exact event evidence. */
export function assertControlEventConsistency(
    state: GameState,
    turnStartSnapshot: Record<string, string | null>,
): ValidationIssue[] {
    const currentControllers = state.political?.political_controllers ?? {};
    const turn = state.meta?.turn ?? 0;
    const events = state.political?.control_events ?? [];
    const osids = [...new Set([
        ...Object.keys(turnStartSnapshot),
        ...Object.keys(currentControllers),
    ])].sort(strictCompare);
    const issues: ValidationIssue[] = [];

    for (const osid of osids) {
        const from = turnStartSnapshot[osid] ?? null;
        const to = currentControllers[osid] ?? null;
        if (from === to) continue;

        const hasEvidence = events.some(event =>
            event.turn === turn
            && event.settlement_id === osid
            && event.from === from
            && event.to === to
            && RECOGNIZED_CONTROL_EVENT_MECHANISMS.has(event.mechanism)
        );
        if (hasEvidence) continue;

        issues.push({
            severity: 'error',
            code: 'control_event.missing_evidence',
            message: `Control change ${osid} from ${from ?? 'null'} to ${to ?? 'null'} has no matching turn ${turn} control_event with recognized mechanism`,
            path: `political.political_controllers.${osid}`,
        });
    }

    return issues;
}
