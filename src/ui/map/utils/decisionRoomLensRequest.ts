/**
 * decisionRoomLensRequest.ts — a tiny module-level pub/sub for deep-linking the
 * Presidential Decision Room to a specific lens and command-card category.
 *
 * The command-surface card strip needs to open the Decision Room pre-filtered to
 * an exact six-card category, including categories represented by predicates
 * rather than one broad Decision Room lens. The Decision Room panel owns its own
 * internal focus state; rather than lift that state (which would churn the panel
 * and the global game store), the card strip pushes a one-shot request here and
 * the panel consumes it on mount via `useSyncExternalStore`.
 *
 * Pure presentation: no engine/state/scenario touch, no Math.random/Date.now.
 *
 * Canonical owner: src/ui/map/utils/decisionRoomLensRequest.ts
 */

import type { PresidentialDecisionRoomLensId } from '../data/presidentialDecisionRoom';
import type { PresidentialCommandCategoryId } from '../data/presidentialCategories';

type Listener = () => void;

export interface DecisionRoomLensRequest {
  lens: PresidentialDecisionRoomLensId;
  commandCategoryId: PresidentialCommandCategoryId | null;
  cardId?: string | null;
}

let requestedFocus: DecisionRoomLensRequest | null = null;
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) listener();
}

/**
 * Request the Decision Room open pre-filtered to `lens` and, when present, the
 * exact command category. The panel reads and clears this on its next render
 * (one-shot).
 */
export function requestDecisionRoomLens(
  lens: PresidentialDecisionRoomLensId,
  commandCategoryId: PresidentialCommandCategoryId | null = null,
  cardId: string | null = null,
): void {
  requestedFocus = { lens, commandCategoryId, cardId };
  emit();
}

/** Read the pending requested focus (null when none). Does not clear. */
export function peekRequestedDecisionRoomLens(): DecisionRoomLensRequest | null {
  return requestedFocus;
}

/** Read and clear the pending requested focus. Returns null when none. */
export function consumeRequestedDecisionRoomLens(): DecisionRoomLensRequest | null {
  const focus = requestedFocus;
  if (focus !== null) {
    requestedFocus = null;
    emit();
  }
  return focus;
}

/** Subscribe to lens-request changes (for useSyncExternalStore). */
export function subscribeDecisionRoomLensRequest(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Snapshot accessor for useSyncExternalStore. */
export function getDecisionRoomLensRequestSnapshot(): DecisionRoomLensRequest | null {
  return requestedFocus;
}

/** Test-only: reset module state between cases. */
export function __resetDecisionRoomLensRequestForTest(): void {
  requestedFocus = null;
  listeners.clear();
}
