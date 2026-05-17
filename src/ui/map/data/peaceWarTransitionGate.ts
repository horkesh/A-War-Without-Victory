import type { LoadedGameState } from './types';

export function shouldShowPeaceWarTransition(
  state: Pick<LoadedGameState, 'phase'> | null | undefined,
  seen: boolean,
): boolean {
  return Boolean(state && !seen && state.phase === 'war');
}

export function shouldMarkPeaceWarTransitionSeenOnLoad(
  previous: Pick<LoadedGameState, 'phase'> | null | undefined,
  next: Pick<LoadedGameState, 'phase'>,
): boolean {
  if (next.phase !== 'war') return false;
  return previous?.phase !== 'peace';
}
