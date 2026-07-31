import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MapContainer } from '../map/MapContainer';
import {
  isTacticalMapStateReady,
  type TacticalMapGraphicsController,
  type TacticalMapRenderedRevision,
} from '../map/mapContextLifecycle';
import { useGameStore } from '../store/gameStore';
import { Minimap } from './Minimap';
import { RootErrorBoundary } from './RootErrorBoundary';

interface TacticalMapViewportProps {
  active: boolean;
  onInteractionReadyChange?: (readiness: TacticalMapInteractionReadiness) => void;
}

export interface TacticalMapInteractionReadiness {
  ready: boolean;
  renderedTurn: number | null;
  renderedFingerprint: string | null;
}

function clearTransientTacticalUi(): void {
  const store = useGameStore.getState();
  store.setHoveredOsids([]);
  store.clearTooltipTarget();
  store.setExpandedStackOsid(null);
  store.setPendingAttackConfirmation(null);
  store.setOrderModeForFormation(null);
  store.setOperationTargetOsids([]);
}

/**
 * Campaign-scoped owner for the main map, Deck overlay, and minimap.
 * Navigation only changes visibility; campaign replacement remounts this owner.
 */
export function TacticalMapViewport({ active, onInteractionReadyChange }: TacticalMapViewportProps) {
  const viewportRef = useRef<HTMLElement>(null);
  const [mainController, setMainController] = useState<TacticalMapGraphicsController | null>(null);
  const [minimapController, setMinimapController] = useState<TacticalMapGraphicsController | null>(null);
  const [revealPainted, setRevealPainted] = useState(false);
  const [renderedRevision, setRenderedRevision] = useState<TacticalMapRenderedRevision | null>(null);
  const currentTurn = useGameStore((state) => state.loadedGameState?.turn);
  const currentFingerprint = useGameStore((state) => state.lastLoadedStateFingerprint);
  const currentRevisionReady = isTacticalMapStateReady(
    renderedRevision != null,
    renderedRevision?.turn ?? null,
    currentTurn,
    renderedRevision?.fingerprint ?? null,
    currentFingerprint,
  );
  const interactionReady = active && revealPainted && currentRevisionReady;

  const handleMainController = useCallback((controller: TacticalMapGraphicsController | null) => {
    setMainController(controller);
  }, []);
  const handleMinimapController = useCallback((controller: TacticalMapGraphicsController | null) => {
    setMinimapController(controller);
  }, []);

  useLayoutEffect(() => {
    if (viewportRef.current) viewportRef.current.inert = !interactionReady;
    onInteractionReadyChange?.({
      ready: interactionReady,
      renderedTurn: renderedRevision?.turn ?? null,
      renderedFingerprint: renderedRevision?.fingerprint ?? null,
    });
  }, [interactionReady, onInteractionReadyChange, renderedRevision]);

  useLayoutEffect(() => () => onInteractionReadyChange?.({
    ready: false,
    renderedTurn: null,
    renderedFingerprint: null,
  }), [onInteractionReadyChange]);

  useEffect(() => {
    if (active) return;
    setRevealPainted(false);
    mainController?.stop();
    minimapController?.stop();
    clearTransientTacticalUi();

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && viewportRef.current?.contains(activeElement)) {
      activeElement.blur();
    }
    const warroom = document.querySelector<HTMLElement>('[data-testid="warroom-shell"]');
    warroom?.focus();
  }, [active, mainController, minimapController]);

  useEffect(() => {
    if (!active || !mainController) return undefined;

    let cancelled = false;
    let firstFrame = 0;
    let secondFrame = 0;
    let removeRenderListener: (() => void) | null = null;
    setRevealPainted(false);

    firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        if (cancelled) return;
        mainController.resize();
        minimapController?.resize();
        removeRenderListener = mainController.onceRender(() => {
          if (!cancelled) setRevealPainted(true);
        });
        mainController.triggerRepaint();
        minimapController?.triggerRepaint();
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      removeRenderListener?.();
    };
  }, [active, mainController, minimapController]);

  return (
    <section
      ref={viewportRef}
      data-testid="tactical-map-viewport"
      aria-hidden={!active}
      style={{
        position: 'absolute',
        inset: 0,
        visibility: active ? 'visible' : 'hidden',
        pointerEvents: interactionReady ? 'auto' : 'none',
      }}
    >
      <MapContainer
        active={active}
        inputActive={interactionReady}
        revealPainted={revealPainted}
        onRenderedRevisionChange={setRenderedRevision}
        onGraphicsController={handleMainController}
      />
      <RootErrorBoundary zone="minimap">
        <Minimap active={interactionReady} onGraphicsController={handleMinimapController} />
      </RootErrorBoundary>
    </section>
  );
}
