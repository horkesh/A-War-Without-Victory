import { useEffect, useState } from 'react';
import { shouldShowPeaceWarTransition } from '../data/peaceWarTransitionGate';
import { useGameStore } from '../store/gameStore';
import { PeaceWarTransition } from './PeaceWarTransition';
import { WarHasBegunSplash } from './WarHasBegunSplash';

type IntroStep = 'splash' | 'briefing';

function getPeaceWarTransitionHandoffKey(state: {
  phase: string;
  player_faction?: string | null;
  turn?: number;
  label?: string;
  metadata?: { date?: string | null } | null;
}): string {
  return [
    state.phase,
    state.player_faction ?? '',
    state.turn ?? '',
    state.metadata?.date ?? '',
    state.label ?? '',
  ].join('|');
}

export function PeaceWarTransitionOverlay() {
  const state = useGameStore((s) => s.loadedGameState);
  const seen = useGameStore((s) => s.peaceWarTransitionSeen);
  const setSeen = useGameStore((s) => s.setPeaceWarTransitionSeen);
  const [introState, setIntroState] = useState<{ key: string | null; step: IntroStep }>({
    key: null,
    step: 'splash',
  });

  // Two-step game-start intro, driven by local component state and gated by the
  // single shared `peaceWarTransitionSeen` flag (no new save flag / migration):
  //   'splash'   -> step 1: the "WAR HAS STARTED" blood-red splash
  //   'briefing' -> step 2: the PeaceWarTransition faction briefing + identity
  const shouldShow = state != null && shouldShowPeaceWarTransition(state, seen);
  const handoffKey = shouldShow && state ? getPeaceWarTransitionHandoffKey(state) : null;
  const step: IntroStep = handoffKey != null && handoffKey !== introState.key ? 'splash' : introState.step;

  // Reset when the overlay closes so the next in-session campaign start begins
  // at the splash. The handoff key also prevents a newly-started faction from
  // inheriting the previous faction's briefing step while this component stays
  // mounted.
  useEffect(() => {
    if (!shouldShow && (introState.key !== null || introState.step !== 'splash')) {
      setIntroState({ key: null, step: 'splash' });
    }
  }, [introState.key, introState.step, shouldShow]);

  if (!shouldShow || state == null || handoffKey == null) return null;

  if (step === 'splash') {
    return (
      <WarHasBegunSplash
        onDismiss={() => setIntroState({ key: handoffKey, step: 'briefing' })}
      />
    );
  }

  return <PeaceWarTransition state={state} onDismiss={() => setSeen(true)} />;
}

