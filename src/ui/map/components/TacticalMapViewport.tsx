import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MapContainer } from '../map/MapContainer';
import {
  isTacticalMapStateReady,
  type TacticalMapGraphicsController,
  type TacticalMapRenderedRevision,
} from '../map/mapContextLifecycle';
import { useGameStore } from '../store/gameStore';
import { Minimap } from './Minimap';
import { RootErrorBoundary } from './RootErrorBoundary';
import type { FieldOperationPlanTarget } from '../utils/fieldInspectionTarget';
import { buildFieldOperationPlanPresentation } from '../data/fieldOperationPlanFocus';
import { FieldOperationPlanContextCard } from './FieldOperationPlanContextCard';
import {
  fieldOperationFocusKey,
  type FieldOperationFocusReceipt,
} from '../map/fieldOperationFocusController';

interface TacticalMapViewportProps {
  active: boolean;
  onInteractionReadyChange?: (readiness: TacticalMapInteractionReadiness) => void;
  operationPlanFocus?: FieldOperationPlanTarget | null;
  onReturnToOperationDossier?: () => void;
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
export function TacticalMapViewport({
  active,
  onInteractionReadyChange,
  operationPlanFocus = null,
  onReturnToOperationDossier,
}: TacticalMapViewportProps) {
  const viewportRef = useRef<HTMLElement>(null);
  const [mainController, setMainController] = useState<TacticalMapGraphicsController | null>(null);
  const [minimapController, setMinimapController] = useState<TacticalMapGraphicsController | null>(null);
  const [minimapMounted, setMinimapMounted] = useState(false);
  const [revealPainted, setRevealPainted] = useState(false);
  const [renderedRevision, setRenderedRevision] = useState<TacticalMapRenderedRevision | null>(null);
  const [fieldOperationFocusReceipt, setFieldOperationFocusReceipt] = useState<FieldOperationFocusReceipt | null>(null);
  const currentTurn = useGameStore((state) => state.loadedGameState?.turn);
  const currentFingerprint = useGameStore((state) => state.lastLoadedStateFingerprint);
  const loadedGameState = useGameStore((state) => state.loadedGameState);
  const osidNameMap = useGameStore((state) => state.osidDisplayNames);
  const operationPlanPresentation = useMemo(
    () => operationPlanFocus
      ? buildFieldOperationPlanPresentation({ target: operationPlanFocus, state: loadedGameState, osidNameMap })
      : null,
    [operationPlanFocus, loadedGameState, osidNameMap],
  );
  const currentRevisionReady = isTacticalMapStateReady(
    renderedRevision != null,
    renderedRevision?.turn ?? null,
    currentTurn,
    renderedRevision?.fingerprint ?? null,
    currentFingerprint,
  );
  const interactionReady = active && revealPainted && currentRevisionReady;

  useEffect(() => {
    if (currentRevisionReady) setMinimapMounted(true);
  }, [currentRevisionReady]);

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
    setRevealPainted(false);

    mainController.resize();
    const removeRenderListener = mainController.onceRender(() => {
      if (!cancelled) setRevealPainted(true);
    });
    mainController.triggerRepaint();

    return () => {
      cancelled = true;
      removeRenderListener();
    };
  }, [active, mainController]);

  useEffect(() => {
    if (!interactionReady || !minimapController) return;
    minimapController.resize();
    minimapController.triggerRepaint();
  }, [interactionReady, minimapController]);

  useEffect(() => {
    if (!operationPlanFocus) {
      setFieldOperationFocusReceipt(null);
      mainController?.fieldOperationFocus?.clear('focus-cleared');
      return undefined;
    }
    const key = fieldOperationFocusKey(operationPlanFocus);
    setFieldOperationFocusReceipt((current) => current?.key === key ? current : {
      key,
      proposalId: operationPlanFocus.proposalId,
      status: 'pending',
      target: null,
      reason: null,
    });
    // Hidden maps never receive camera commands. The existing retained-map
    // reveal handshake guarantees activation order: resize -> render -> focus.
    if (!active || !interactionReady || !mainController?.fieldOperationFocus) return undefined;
    const unsubscribe = mainController.fieldOperationFocus.subscribe(setFieldOperationFocusReceipt);
    const receipt = mainController.fieldOperationFocus.request(operationPlanFocus);
    setFieldOperationFocusReceipt(receipt);
    return () => {
      unsubscribe();
      mainController.fieldOperationFocus?.cancel(key, active ? 'focus-replaced' : 'map-hidden');
    };
  }, [active, interactionReady, mainController, operationPlanFocus]);

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
        operationPlanFocus={operationPlanFocus}
      />
      {interactionReady && operationPlanPresentation && onReturnToOperationDossier && (
        <FieldOperationPlanContextCard
          presentation={operationPlanPresentation}
          focusReceipt={fieldOperationFocusReceipt}
          onSelectObjective={(osid) => useGameStore.getState().setSelectedOsid(osid)}
          onReturn={() => {
            if (operationPlanFocus) {
              mainController?.fieldOperationFocus?.cancel(fieldOperationFocusKey(operationPlanFocus), 'return-to-dossier');
            }
            onReturnToOperationDossier();
          }}
        />
      )}
      {minimapMounted && (
        <RootErrorBoundary zone="minimap">
          <Minimap active={interactionReady} onGraphicsController={handleMinimapController} />
        </RootErrorBoundary>
      )}
    </section>
  );
}
