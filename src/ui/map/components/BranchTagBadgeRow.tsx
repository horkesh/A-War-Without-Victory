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
import { toTitleCase } from '../utils/formatters';
import { ActiveBranchPathRow } from './ActiveBranchPathRow';

const PLAYER_SAFE_BRANCH_TAG_LABELS: Record<string, string> = {
    rbih_state_identity: 'Civic republic',
    rbih_civic: 'Civic republic',
    rbih_civic_identity: 'Civic republic',
    rbih_dayton_accept: 'Dayton acceptance',
    rbih_paramilitary_allow: 'Paramilitary authorization',
    rs_strategic_goals: 'Six strategic goals',
    rs_assembly_override: 'Assembly override',
    hrhb_political_goal: 'Herzeg-Bosna posture',
    hrhb_alliance_sustained: 'Alliance sustained',
    hrhb_dayton_accept: 'Dayton acceptance',
};

export function getPlayerSafeBranchTagLabel(tag: string): string {
    const safeTag = tag.trim();
    if (!safeTag) return 'Campaign branch';
    const curated = PLAYER_SAFE_BRANCH_TAG_LABELS[safeTag];
    if (curated) return curated;
    return toTitleCase(safeTag.replace(/^(rbih|rs|hrhb)_/i, '').replace(/_/g, ' ')) || 'Campaign branch';
}

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
    const labels = tags.map((tag) => ({ tag, label: getPlayerSafeBranchTagLabel(tag) }));
    return (
        <div className="ml-auto min-w-0 shrink-0">
            <ActiveBranchPathRow faction={faction ?? undefined} paths={labels.map(({ tag, label }) => ({ id: tag, label }))} />
        </div>
    );
}
