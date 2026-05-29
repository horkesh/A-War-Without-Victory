/**
 * DecisionHistoryOverlay - Phase H Packet 8 (Component B per H1 scoping §4.2B).
 *
 * Full-screen overlay that lists every player decision recorded in the
 * causality substrate (via `getPlayerDecisionHistory`). Each row shows:
 *   - Turn number
 *   - Event id + family lookup from `eventCatalog`
 *   - Chosen option id
 *   - Was-divergence badge (comparison vs `historical_default_response_id`)
 *
 * Rows are click-to-expand: expansion surfaces the chosen-decision's
 * downstream causal descendants (`getCausalDescendants`) and a short
 * source-note excerpt from the catalog. Rows are sorted by turn ascending
 * via the underlying `getPlayerDecisionHistory` contract.
 *
 * Backward compatibility:
 *   - When `isOpen === false`: returns null (no DOM).
 *   - When both optional props are absent: renders an empty-state message
 *     ("Decision history requires game catalog") so the user knows the
 *     overlay opened but the catalog substrate is not yet loaded.
 *   - When `state` is present but no player decisions exist: empty-state
 *     ("No player decisions recorded yet").
 *
 * Zero new CSS files: reuses existing CodexPanel / WrappedOverlay class
 * conventions (Tailwind + `Z` token from `src/ui/shared/zIndex.ts`).
 *
 * See `docs/40_reports/proposals/20260528_UI_CODEX_INTEGRATION_SCOPING.md` §4.2B.
 */
import { useEffect, useMemo, useState } from 'react';
import type { EventDefinition } from '../../../sim/events/event_types.js';
import type { GameState } from '../../../state/game_state.js';
import {
    getPlayerDecisionHistory,
    getCausalDescendants,
    type EventDecision,
} from '../../../sim/events/causality_query.js';
import { Z } from '../../shared/zIndex.js';

export interface DecisionHistoryOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    /**
     * Phase H Packet 8 — optional event catalog for family + historical-
     * default + source-note lookups. When omitted, the empty-state message
     * is shown instead of decision rows. Backward compatible.
     */
    eventCatalog?: ReadonlyMap<string, EventDefinition>;
    /**
     * Phase H Packet 8 — optional GameState handle. Read paths:
     *   - `state.military.event_decision_log` (via getPlayerDecisionHistory)
     *   - `state.military.event_causality_log` (via getCausalDescendants)
     * When omitted, empty-state shown.
     */
    state?: GameState;
}

/** Phase H Packet 8 — Maximum chars of source-note excerpt rendered in
 *  the expanded row. Mirrors EventDecisionModal's 200-char truncation. */
const SOURCE_NOTE_EXCERPT_MAX_CHARS = 200;

function truncateSourceNote(text: string): string {
    if (text.length <= SOURCE_NOTE_EXCERPT_MAX_CHARS) return text;
    return text.slice(0, SOURCE_NOTE_EXCERPT_MAX_CHARS) + '...';
}

/** Compute whether a player decision diverged from the event's historical
 *  default. Returns false when the catalog has no entry or no
 *  `historical_default_response_id`. Deterministic. */
function isDivergenceFromHistorical(
    decision: EventDecision,
    eventCatalog: ReadonlyMap<string, EventDefinition> | undefined,
): boolean {
    if (!eventCatalog) return false;
    const def = eventCatalog.get(decision.event_id);
    if (!def) return false;
    const histDefault = def.historical_default_response_id;
    if (typeof histDefault !== 'string' || histDefault.length === 0) return false;
    return decision.response_id !== histDefault;
}

function DecisionRow({
    decision,
    eventCatalog,
    state,
    isExpanded,
    onToggle,
}: {
    decision: EventDecision;
    eventCatalog: ReadonlyMap<string, EventDefinition> | undefined;
    state: GameState;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const def = eventCatalog?.get(decision.event_id);
    const family = def?.family ?? 'unknown';
    const diverged = isDivergenceFromHistorical(decision, eventCatalog);
    const rawSourceNote = def?.source_note ?? def?.historical_source ?? null;
    const sourceNoteExcerpt = rawSourceNote ? truncateSourceNote(rawSourceNote) : null;

    // Descendants are only computed when row is expanded — keeps the
    // un-expanded list render-cheap.
    const descendants = useMemo(
        () => (isExpanded ? getCausalDescendants(decision.event_id, state) : []),
        [isExpanded, decision.event_id, state],
    );

    return (
        <li
            data-testid="decision-history-row"
            data-event-id={decision.event_id}
            data-response-id={decision.response_id}
            data-turn={decision.turn}
            className="border-b border-neutral-700/40 bg-[#0d0f16]"
        >
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-white/5 transition-colors"
            >
                <span
                    data-testid="decision-history-turn"
                    className="text-[10px] font-mono text-neutral-400 tabular-nums w-12 shrink-0"
                >
                    T{decision.turn}
                </span>
                <span className="flex-1 min-w-0">
                    <span
                        data-testid="decision-history-event-id"
                        className="block text-[10px] text-neutral-200 font-semibold leading-snug truncate"
                    >
                        {decision.event_id}
                    </span>
                    <span className="block text-[8px] uppercase tracking-[0.1em] text-neutral-500 mt-0.5">
                        <span data-testid="decision-history-family">[family={family}]</span>
                        {' '}
                        <span data-testid="decision-history-chosen-option">[chose={decision.response_id}]</span>
                    </span>
                </span>
                {diverged ? (
                    <span
                        data-testid="decision-history-divergence-badge"
                        className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] rounded bg-amber-400/15 text-amber-400 shrink-0"
                    >
                        Diverged
                    </span>
                ) : (
                    <span
                        data-testid="decision-history-historical-badge"
                        className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] rounded bg-neutral-600/30 text-neutral-400 shrink-0"
                    >
                        Historical
                    </span>
                )}
            </button>
            {isExpanded && (
                <div
                    data-testid="decision-history-row-expanded"
                    className="px-3 pb-2 pt-1 bg-[#0a0b12]"
                >
                    <div className="text-[8px] uppercase tracking-[0.1em] text-neutral-500 mb-1">
                        Downstream descendants ({descendants.length})
                    </div>
                    {descendants.length > 0 ? (
                        <ul
                            data-testid="decision-history-descendants-list"
                            className="space-y-0.5 mb-2"
                        >
                            {descendants.map((id) => (
                                <li
                                    key={id}
                                    data-testid="decision-history-descendant-row"
                                    data-event-id={id}
                                    className="text-[9px] text-neutral-300 leading-snug"
                                >
                                    {id}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div
                            data-testid="decision-history-no-descendants"
                            className="text-[9px] text-neutral-500 italic mb-2"
                        >
                            No downstream causal descendants recorded.
                        </div>
                    )}
                    {sourceNoteExcerpt && (
                        <div
                            data-testid="decision-history-source-note"
                            className="text-[9px] text-neutral-400 leading-relaxed"
                        >
                            <span className="text-neutral-500 uppercase text-[8px] tracking-[0.1em]">Source: </span>
                            {sourceNoteExcerpt}
                        </div>
                    )}
                </div>
            )}
        </li>
    );
}

export function DecisionHistoryOverlay({
    isOpen,
    onClose,
    eventCatalog,
    state,
}: DecisionHistoryOverlayProps) {
    const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

    // ESC closes the overlay — matches WrappedOverlay / CodexPanel pattern.
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    // Reset expansion when overlay closes — prevents stale expansion state
    // leaking into the next open.
    useEffect(() => {
        if (!isOpen) setExpandedEventId(null);
    }, [isOpen]);

    const decisions = useMemo(
        () => (state ? getPlayerDecisionHistory(state) : []),
        [state],
    );

    if (!isOpen) return null;

    const hasInputs = Boolean(state && eventCatalog);
    const hasDecisions = decisions.length > 0;

    return (
        <div
            data-testid="decision-history-overlay"
            className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            style={{ zIndex: Z.CODEX }}
        >
            <div className="w-[640px] max-w-[95vw] h-[80vh] bg-[#0c0e14] border border-neutral-700/50 rounded-lg shadow-2xl flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-700/50 bg-[#10131a]">
                    <div className="flex items-center gap-2.5">
                        <div className="text-amber-400 text-[13px] font-bold tracking-[0.13em] uppercase">
                            Decision History
                        </div>
                        {hasInputs && (
                            <div
                                data-testid="decision-history-count"
                                className="text-[9px] text-neutral-500"
                            >
                                {decisions.length === 1
                                    ? '1 decision'
                                    : `${decisions.length} decisions`}
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        data-testid="decision-history-close"
                        onClick={onClose}
                        className="text-neutral-500 hover:text-neutral-300 transition-colors text-[11px] px-2 py-0.5"
                    >
                        ESC
                    </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto">
                    {!hasInputs ? (
                        <div
                            data-testid="decision-history-empty-state"
                            className="flex items-center justify-center h-full px-6"
                        >
                            <div className="text-center text-neutral-500 text-[11px] max-w-[320px]">
                                Decision history requires game catalog. Open this overlay after
                                a save is loaded with the event catalog initialized.
                            </div>
                        </div>
                    ) : !hasDecisions ? (
                        <div
                            data-testid="decision-history-no-decisions"
                            className="flex items-center justify-center h-full px-6"
                        >
                            <div className="text-center text-neutral-500 text-[11px] max-w-[320px]">
                                No player decisions recorded yet. Decisions appear here once
                                you have responded to a presidential event.
                            </div>
                        </div>
                    ) : (
                        <ul
                            data-testid="decision-history-list"
                            className="divide-y divide-neutral-800/40"
                        >
                            {decisions.map((decision) => (
                                <DecisionRow
                                    key={`${decision.event_id}::${decision.turn}::${decision.response_id}`}
                                    decision={decision}
                                    eventCatalog={eventCatalog}
                                    state={state!}
                                    isExpanded={expandedEventId === decision.event_id}
                                    onToggle={() => setExpandedEventId(
                                        expandedEventId === decision.event_id
                                            ? null
                                            : decision.event_id,
                                    )}
                                />
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
