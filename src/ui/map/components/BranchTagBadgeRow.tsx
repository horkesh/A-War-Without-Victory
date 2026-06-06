/**
 * Phase H Packet 4 — Component D (Branch-tag faction badge).
 *
 * Renders the canonical branch tags currently active for a given faction,
 * surfaced as a chip row from the foundational state via the H2 wave 1
 * helper `getBranchTagsActive`. Per H1 scoping doc §4.2D, the proposed
 * host for this component is the player-faction header or command-record
 * area; wiring is deferred. This file ships the standalone component only.
 *
 * Conservative scope per H1 §6:
 *   - data display only (no behavior changes)
 *   - graceful degradation when state / catalog are absent or when
 *     the faction has no active tags
 *   - no new CSS files — plain `<span>` chips with inline styling
 *     reusing token classes already present elsewhere in the map UI
 *   - both inputs (`eventCatalog`, `state`) are required for the helper
 *     to resolve any tags, so the component renders nothing without
 *     both — matching H3's pattern in `EventDecisionModal.tsx`
 *     `DecisionContextSection`
 *
 * Determinism: `getBranchTagsActive` returns tags sorted via
 * `strictCompare`; render order is therefore deterministic alphabetical.
 *
 * Reference:
 *   - `docs/40_reports/proposals/20260528_UI_CODEX_INTEGRATION_SCOPING.md` §4.2D
 *   - `src/sim/events/causality_query.ts` (H2 wave 1)
 *   - `src/sim/events/event_families.ts` (RBIH/RS/HRHB branch-tag vocabulary)
 */

import React from 'react';
import { getBranchTagsActive } from '../../../sim/events/causality_query';
import type { EventDefinition } from '../../../sim/events/event_types';
import type { FactionId, GameState } from '../../../state/game_state';

export interface BranchTagBadgeRowProps {
    /** Faction whose branch tags should be surfaced. Filtering uses
     *  the documented lowercase-prefix convention
     *  (e.g. `rbih_`, `rs_`, `hrhb_`). */
    faction: FactionId;
    /** Optional event catalog. Required for chosen-option `sets_flags`
     *  lookup — without it the helper returns `[]`. */
    eventCatalog?: ReadonlyMap<string, EventDefinition>;
    /** Optional GameState handle. Required to enumerate
     *  `fired_event_ids` and `event_decision_log`. */
    state?: GameState;
}

/** Component D — branch-tag faction badge row.
 *
 *  Graceful degradation rules (all return `null`):
 *   - eventCatalog absent
 *   - state absent
 *   - no active tags for the faction
 *
 *  When rendered, emits a row of `<span>` chips, one per tag, in
 *  alphabetical order (deterministic via `strictCompare` inside the
 *  H2 helper). A `title` (browser tooltip) on the row carries the
 *  full count + tag list for hover discoverability.
 */
export function BranchTagBadgeRow({
    faction,
    eventCatalog,
    state,
}: BranchTagBadgeRowProps): React.ReactElement | null {
    if (!eventCatalog || !state) return null;
    const tags = getBranchTagsActive(state, faction, eventCatalog);
    if (tags.length === 0) return null;
    const tooltip = `Active branch tags (${tags.length}): ${tags.join(', ')}`;
    return (
        <div
            className="branch-tag-badge-row flex flex-wrap items-center gap-1.5"
            data-testid="branch-tag-badge-row"
            data-faction={faction}
            title={tooltip}
        >
            {tags.map((tag) => (
                <span
                    key={tag}
                    className="rounded-sm border border-panel-border bg-panel-card px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-text-secondary"
                    data-testid="branch-tag-chip"
                    data-tag={tag}
                >
                    [{tag}]
                </span>
            ))}
        </div>
    );
}
