import type { LoadedGameState } from './types';
import type { InboxItem } from './inboxItems';

/**
 * Agenda-aware form used by projections that already hold the canonical inbox.
 * Keeping the near-cap/source-action predicate here prevents a second cadence
 * truth from drifting away from the Header and Warroom status.
 */
export function isPresidentialCadenceHold(
  state: LoadedGameState | null,
  agenda: readonly Pick<InboxItem, 'priorityBand'>[],
): boolean {
  const authority = state?.commandAuthority;
  if (!state || !authority || authority.max <= 0 || authority.current / authority.max < 0.9) return false;

  return !agenda.some((item) =>
    item.priorityBand === 'required' || item.priorityBand === 'recommended'
  );
}
