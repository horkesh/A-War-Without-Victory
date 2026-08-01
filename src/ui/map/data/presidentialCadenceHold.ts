import type { LoadedGameState } from './types';
import { deriveInboxItems } from './inboxItems';

/**
 * True only when the engine-backed Authority balance is near capacity and the
 * current sourced inbox contains no required or recommended presidential act.
 * This is explanatory UI state: it never creates, resolves, or schedules work.
 */
export function isPresidentialCadenceHold(state: LoadedGameState | null): boolean {
  const authority = state?.commandAuthority;
  if (!state || !authority || authority.max <= 0 || authority.current / authority.max < 0.9) return false;

  return !deriveInboxItems(state, null).some((item) =>
    item.priorityBand === 'required' || item.priorityBand === 'recommended'
  );
}
