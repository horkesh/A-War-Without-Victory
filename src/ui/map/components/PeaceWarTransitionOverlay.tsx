import { shouldShowPeaceWarTransition } from '../data/peaceWarTransitionGate';
import { useGameStore } from '../store/gameStore';
import { WarHasBegunSplash } from './WarHasBegunSplash';

export function PeaceWarTransitionOverlay() {
  const state = useGameStore((s) => s.loadedGameState);
  const seen = useGameStore((s) => s.peaceWarTransitionSeen);
  const setSeen = useGameStore((s) => s.setPeaceWarTransitionSeen);
  const shouldShow = state != null && shouldShowPeaceWarTransition(state, seen);
  if (!shouldShow) return null;

  // Retain the active campaign surface beneath this overlay. Announce the date
  // once without replacing that surface or repeating the faction dossier.
  return <WarHasBegunSplash onDismiss={() => setSeen(true)} />;
}
