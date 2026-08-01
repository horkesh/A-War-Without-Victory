// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FieldOperationPlanTarget } from '../../src/ui/map/utils/fieldInspectionTarget.js';

const fixture = vi.hoisted(() => {
  const events: string[] = [];
  let renderListener: (() => void) | null = null;
  const fieldOperationFocus = {
    request: vi.fn((target: FieldOperationPlanTarget) => {
      events.push(`focus:${target.proposalId}`);
      return {
        key: `${target.proposalId}|objective`,
        proposalId: target.proposalId,
        status: 'applied' as const,
        target: { center: [18, 44] as [number, number], zoom: 8.5 },
        reason: null,
      };
    }),
    cancel: vi.fn((key: string) => {
      events.push(`cancel:${key}`);
      return null;
    }),
    clear: vi.fn(() => null),
    getReceipt: vi.fn(() => null),
    getCameraOwner: vi.fn(() => 'ordinary' as const),
    getDiagnostics: vi.fn(() => ({
      requestCount: 0,
      appliedCount: 0,
      cancelCount: 0,
      safeViewportAttempts: [],
      boundsSuspended: false,
    })),
    subscribe: vi.fn(() => () => undefined),
  };
  const controller = {
    resize: vi.fn(() => events.push('resize')),
    triggerRepaint: vi.fn(() => {
      events.push('render');
      renderListener?.();
    }),
    onceRender: vi.fn((listener: () => void) => {
      renderListener = listener;
      return () => { if (renderListener === listener) renderListener = null; };
    }),
    stop: vi.fn(() => events.push('stop')),
    fieldOperationFocus,
  };
  const store = {
    loadedGameState: {
      turn: 40,
      player_faction: 'RS',
      formations: [],
    },
    lastLoadedStateFingerprint: 'turn-40-fingerprint',
    osidDisplayNames: { objective: 'Objective' },
    setHoveredOsids: vi.fn(),
    clearTooltipTarget: vi.fn(),
    setExpandedStackOsid: vi.fn(),
    setPendingAttackConfirmation: vi.fn(),
    setOrderModeForFormation: vi.fn(),
    setOperationTargetOsids: vi.fn(),
    setSelectedOsid: vi.fn(),
  };
  return { events, controller, fieldOperationFocus, store };
});

vi.mock('../../src/ui/map/store/gameStore.js', () => {
  const useGameStore = Object.assign(
    (selector: (state: typeof fixture.store) => unknown) => selector(fixture.store),
    { getState: () => fixture.store },
  );
  return { useGameStore };
});

vi.mock('../../src/ui/map/map/MapContainer.js', async () => {
  const ReactModule = await import('react');
  return {
    MapContainer: ({ onGraphicsController, onRenderedRevisionChange, revealPainted }: {
      onGraphicsController?: (controller: typeof fixture.controller | null) => void;
      onRenderedRevisionChange?: (revision: { turn: number; fingerprint: string } | null) => void;
      revealPainted: boolean;
    }) => {
      ReactModule.useEffect(() => {
        onGraphicsController?.(fixture.controller);
        onRenderedRevisionChange?.({ turn: 40, fingerprint: 'turn-40-fingerprint' });
        return () => {
          onGraphicsController?.(null);
          onRenderedRevisionChange?.(null);
        };
      }, [onGraphicsController, onRenderedRevisionChange]);
      return ReactModule.createElement('div', { 'data-testid': 'mock-map', 'data-reveal-painted': revealPainted });
    },
  };
});

vi.mock('../../src/ui/map/components/Minimap.js', () => ({ Minimap: () => null }));

import { TacticalMapViewport } from '../../src/ui/map/components/TacticalMapViewport.js';

afterEach(() => {
  cleanup();
  fixture.events.length = 0;
  vi.clearAllMocks();
});

const focus: FieldOperationPlanTarget = {
  kind: 'field-operation-plan',
  proposalId: 'review-cerska',
  corpsId: 'vrs_drina',
  objectiveOsids: ['objective'],
  stagingOsids: [],
  formationIds: [],
};

describe('retained viewport field-focus activation', () => {
  it('makes zero hidden camera calls, then orders resize -> render receipt -> one focus command', async () => {
    const view = render(React.createElement(TacticalMapViewport, {
      active: false,
      operationPlanFocus: focus,
      onReturnToOperationDossier: vi.fn(),
    }));
    await waitFor(() => expect(fixture.controller.onceRender).not.toHaveBeenCalled());
    expect(fixture.fieldOperationFocus.request).not.toHaveBeenCalled();
    fixture.events.length = 0;

    view.rerender(React.createElement(TacticalMapViewport, {
      active: true,
      operationPlanFocus: focus,
      onReturnToOperationDossier: vi.fn(),
    }));
    await waitFor(() => expect(fixture.fieldOperationFocus.request).toHaveBeenCalledOnce());
    expect(fixture.events.slice(0, 3)).toEqual(['resize', 'render', 'focus:review-cerska']);
  });

  it('cancels the keyed receipt when the map hides', async () => {
    const view = render(React.createElement(TacticalMapViewport, {
      active: true,
      operationPlanFocus: focus,
      onReturnToOperationDossier: vi.fn(),
    }));
    await waitFor(() => expect(fixture.fieldOperationFocus.request).toHaveBeenCalledOnce());
    view.rerender(React.createElement(TacticalMapViewport, {
      active: false,
      operationPlanFocus: focus,
      onReturnToOperationDossier: vi.fn(),
    }));
    await waitFor(() => expect(fixture.fieldOperationFocus.cancel).toHaveBeenCalled());
    expect(fixture.fieldOperationFocus.cancel).toHaveBeenCalledWith('review-cerska|objective', expect.any(String));
  });
});
