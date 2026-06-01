/**
 * decisionRoomLensRequest.ts — a tiny module-level pub/sub for deep-linking the
 * Presidential Decision Room to a specific lens (category).
 *
 * The command-surface card strip needs to open the Decision Room PRE-FILTERED to
 * a category's lens. The Decision Room panel owns its own `activeLens` internal
 * state; rather than lift that state (which would churn the panel and the global
 * game store), the card strip pushes a one-shot "requested lens" here and the
 * panel consumes it on mount via `useSyncExternalStore`. This keeps the global
 * game store untouched and the panel change minimal (a single consume effect).
 *
 * Pure presentation: no engine/state/scenario touch, no Math.random/Date.now.
 *
 * Canonical owner: src/ui/map/utils/decisionRoomLensRequest.ts
 */

import type { PresidentialDecisionRoomLensId } from '../data/presidentialDecisionRoom';

type Listener = () => void;

let requestedLens: PresidentialDecisionRoomLensId | null = null;
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) listener();
}

/**
 * Request the Decision Room open pre-filtered to `lens`. The panel reads and
 * clears this on its next render (one-shot). Idempotent for identical lenses.
 */
export function requestDecisionRoomLens(lens: PresidentialDecisionRoomLensId): void {
  requestedLens = lens;
  emit();
}

/** Read the pending requested lens (null when none). Does not clear. */
export function peekRequestedDecisionRoomLens(): PresidentialDecisionRoomLensId | null {
  return requestedLens;
}

/** Read and clear the pending requested lens. Returns null when none. */
export function consumeRequestedDecisionRoomLens(): PresidentialDecisionRoomLensId | null {
  const lens = requestedLens;
  if (lens !== null) {
    requestedLens = null;
    emit();
  }
  return lens;
}

/** Subscribe to lens-request changes (for useSyncExternalStore). */
export function subscribeDecisionRoomLensRequest(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Snapshot accessor for useSyncExternalStore. */
export function getDecisionRoomLensRequestSnapshot(): PresidentialDecisionRoomLensId | null {
  return requestedLens;
}

/** Test-only: reset module state between cases. */
export function __resetDecisionRoomLensRequestForTest(): void {
  requestedLens = null;
  listeners.clear();
}
