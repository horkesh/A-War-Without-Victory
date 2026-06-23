import type { LoadedGameState } from './types';
import { resolvePlayerFacingFaction } from '../../shared/playerVisibility';

export function shouldShowOpeningBrief(
  state: LoadedGameState | null | undefined,
  openingBriefDismissed: boolean,
): boolean {
  return !openingBriefDismissed
    && state?.turn === 0
    && resolvePlayerFacingFaction(state) != null;
}
