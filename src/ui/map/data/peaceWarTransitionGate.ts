import type { LoadedGameState } from './types';

export function shouldShowPeaceWarTransition(
  state: Pick<LoadedGameState, 'phase'> | null | undefined,
  seen: boolean,
): boolean {
  return Boolean(state && !seen && state.phase === 'war');
}

/**
 * Loading a save never arms the war-start intro: it is re-armed explicitly when a fresh
 * campaign starts (App.tsx resets the seen flag there). Before the peace phase was retired
 * this also left the intro armed for a live peace-to-war handoff; no game can be in peace
 * now, so every war-phase load marks it seen.
 */
export function shouldMarkPeaceWarTransitionSeenOnLoad(
  next: Pick<LoadedGameState, 'phase'>,
): boolean {
  return next.phase === 'war';
}
