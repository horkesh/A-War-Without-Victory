import { shouldShowPeaceWarTransition } from '../data/peaceWarTransitionGate';
import { useGameStore } from '../store/gameStore';
import { WarHasBegunSplash } from './WarHasBegunSplash';

export function PeaceWarTransitionOverlay() {
  const state = useGameStore((s) => s.loadedGameState);
  const seen = useGameStore((s) => s.peaceWarTransitionSeen);
  const setSeen = useGameStore((s) => s.setPeaceWarTransitionSeen);
  const shouldShow = state != null && shouldShowPeaceWarTransition(state, seen);
  if (!shouldShow) return null;

  // The faction dossier now lives before campaign creation. At the live handoff
  // we announce the date once, then reveal the command room without repeating it.
  return <WarHasBegunSplash onDismiss={() => setSeen(true)} />;
}
