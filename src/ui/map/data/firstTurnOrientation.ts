/**
 * First-turn orientation read-model (NIGHTSHIFT-G2).
 *
 * Pure projection — produces the payload for the one-time onboarding overlay
 * that points a fresh player at four EXISTING surfaces (Inbox, Advance Turn,
 * Chronicle, Codex). The read-model NEVER mutates state; the dismiss flag
 * is passed in as `hasSeenIntro` by the App shell's current-session state.
 *
 * Returns null when:
 *   - state is null (no save loaded)
 *   - hasSeenIntro is true (player already dismissed in a prior session)
 *   - state.turn > 1 (player has advanced past the first turn)
 *
 * Items reference EXISTING surfaces only — the component dispatches them
 * through the canonical `shellNavigation` helpers (`openArmyHQTab`,
 * `openChronicle`, `openCodex`) plus the warroom `advance-turn` handoff.
 */

import type { LoadedGameState } from './types';

export type FirstTurnOrientationItemKey =
    | 'inbox'
    | 'advance-turn'
    | 'chronicle'
    | 'codex';

export type FirstTurnOrientationTarget =
    | { kind: 'inbox-home' }
    | { kind: 'advance-turn' }
    | { kind: 'chronicle' }
    | { kind: 'codex' };

export interface FirstTurnOrientationItem {
    key: FirstTurnOrientationItemKey;
    label: string;
    description: string;
    target: FirstTurnOrientationTarget;
}

export interface FirstTurnOrientationView {
    headline: string;
    body: string;
    dismissLabel: string;
    items: FirstTurnOrientationItem[];
}

/**
 * Canonical, ordered item set. Order is fixed at module load — no sort, no
 * locale, no random. The component renders this list verbatim.
 */
const ORIENTATION_ITEMS: ReadonlyArray<FirstTurnOrientationItem> = [
    {
        key: 'inbox',
        label: 'Inbox',
        description: 'Decisions and signals from the front.',
        target: { kind: 'inbox-home' },
    },
    {
        key: 'advance-turn',
        label: 'Advance Turn',
        description: 'End this turn when you have reviewed everything.',
        target: { kind: 'advance-turn' },
    },
    {
        key: 'chronicle',
        label: 'Chronicle',
        description: 'Your war’s running history.',
        target: { kind: 'chronicle' },
    },
    {
        key: 'codex',
        label: 'Codex',
        description: 'The canon entries you have unlocked.',
        target: { kind: 'codex' },
    },
];

export function buildFirstTurnOrientation(
    state: LoadedGameState | null,
    hasSeenIntro: boolean,
): FirstTurnOrientationView | null {
    if (!state) return null;
    if (hasSeenIntro) return null;
    const turn = typeof state.turn === 'number' ? state.turn : 0;
    // First turn = turn 0 or 1. The instant the player advances past 1 we stop
    // showing the card; caller-owned session state prevents repeat display.
    if (turn > 1) return null;

    return {
        headline: 'Where to start',
        body: 'Four surfaces are open to you. Visit them in any order, then advance the turn when you’re ready.',
        dismissLabel: 'Got it',
        items: ORIENTATION_ITEMS.map(item => ({ ...item })),
    };
}
