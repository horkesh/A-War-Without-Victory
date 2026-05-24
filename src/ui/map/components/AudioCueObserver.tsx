import { useEffect, useRef } from 'react';
import type { LoadedGameState } from '../data/types.js';
import { useGameStore } from '../store/gameStore.js';
import { buildAudioCueEventsForState } from '../audio/audio_event_adapter.js';
import { playCue } from '../audio/audio_engine.js';

export interface AudioCueObserverProps {
  nowProvider?: () => number;
}

function defaultNowProvider(): number {
  if (typeof performance !== 'undefined' && Number.isFinite(performance.now())) {
    return performance.now();
  }
  return 0;
}

export function AudioCueObserver({ nowProvider = defaultNowProvider }: AudioCueObserverProps) {
  const loadedGameState = useGameStore((state) => state.loadedGameState);
  const previousStateRef = useRef<LoadedGameState | null>(null);

  useEffect(() => {
    const previousState = previousStateRef.current;
    previousStateRef.current = loadedGameState;
    const cueEvents = buildAudioCueEventsForState(previousState, loadedGameState);
    if (cueEvents.length === 0) return;

    const nowMs = nowProvider();
    for (const cueEvent of cueEvents) {
      void playCue(cueEvent.cueId, nowMs);
    }
  }, [loadedGameState, nowProvider]);

  return null;
}
