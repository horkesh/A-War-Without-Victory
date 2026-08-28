// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  OPENING_TRANSITION_TIMINGS,
  createInitialOpeningTransitionState,
  createOpeningTransitionController,
  type OpeningScene,
  type OpeningSceneLoader,
} from '../../src/ui/map/components/opening/openingTransition';
import { OpeningCinematicLayer } from '../../src/ui/map/components/opening/OpeningCinematicLayer';
import { OPENING_WARROOM_SCENES } from '../../src/ui/map/components/opening/openingScenes';

const repoRoot = resolve(__dirname, '../..');

interface PendingLoad {
  ready: () => void;
  fail: () => void;
  cancel: ReturnType<typeof vi.fn>;
}

function controlledLoader() {
  const pending = new Map<OpeningScene, PendingLoad>();
  const load: OpeningSceneLoader = (scene, handlers) => {
    const cancel = vi.fn();
    pending.set(scene, { ready: handlers.ready, fail: handlers.fail, cancel });
    return cancel;
  };
  return { load, pending };
}

describe('opening transition controller', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('starts settled on the faction-neutral scene', () => {
    expect(createInitialOpeningTransitionState(false)).toEqual({
      displayedScene: 'neutral',
      requestedScene: 'neutral',
      token: 0,
      phase: 'idle',
      reducedMotion: false,
    });
  });

  it('treats an explicit faction request as presentation only', () => {
    const campaignStart = vi.fn();
    const { load } = controlledLoader();
    const controller = createOpeningTransitionController({ loadScene: load });

    controller.request('RS');

    expect(controller.getState()).toMatchObject({
      displayedScene: 'neutral',
      requestedScene: 'RS',
      phase: 'push',
    });
    expect(campaignStart).not.toHaveBeenCalled();
    controller.dispose();
  });

  it('lets only the latest request complete during an active transition', () => {
    vi.useFakeTimers();
    const { load, pending } = controlledLoader();
    const controller = createOpeningTransitionController({ loadScene: load });

    controller.request('RS');
    const staleRs = pending.get('RS')!;
    controller.request('HRHB');
    expect(staleRs.cancel).toHaveBeenCalledOnce();

    staleRs.ready();
    pending.get('HRHB')!.ready();
    vi.advanceTimersByTime(
      OPENING_TRANSITION_TIMINGS.push
      + OPENING_TRANSITION_TIMINGS.masked
      + OPENING_TRANSITION_TIMINGS.resolve,
    );

    expect(controller.getState()).toMatchObject({
      displayedScene: 'HRHB',
      requestedScene: 'HRHB',
      phase: 'idle',
      token: 2,
    });
    controller.dispose();
  });

  it.each(['ready', 'fail'] as const)(
    'ignores a stale %s callback fired synchronously by replacement cleanup',
    (outcome) => {
      const controller = createOpeningTransitionController({
        loadScene: (scene, handlers) => (
          scene === 'RS' ? () => handlers[outcome]() : vi.fn()
        ),
      });
      controller.request('RS');

      expect(() => controller.request('HRHB')).not.toThrow();

      expect(controller.getState()).toMatchObject({
        displayedScene: 'neutral',
        requestedScene: 'HRHB',
        phase: 'push',
      });
      expect(controller.getFailedScene()).toBeNull();
      controller.dispose();
    },
  );

  it.each(['ready', 'fail'] as const)(
    'ignores a stale %s callback fired synchronously by cancellation cleanup',
    (outcome) => {
      const controller = createOpeningTransitionController({
        loadScene: (_scene, handlers) => () => handlers[outcome](),
      });
      controller.request('RS');

      expect(() => controller.cancel()).not.toThrow();

      expect(controller.getState()).toMatchObject({
        displayedScene: 'neutral',
        requestedScene: 'neutral',
        phase: 'idle',
      });
      expect(controller.getFailedScene()).toBeNull();
      controller.dispose();
    },
  );

  it.each(['ready', 'fail'] as const)(
    'ignores a stale %s callback fired synchronously by disposal cleanup',
    (outcome) => {
      const cleanup = vi.fn();
      const controller = createOpeningTransitionController({
        loadScene: (_scene, handlers) => () => {
          cleanup();
          handlers[outcome]();
        },
      });
      controller.request('RS');

      expect(() => controller.dispose()).not.toThrow();
      expect(cleanup).toHaveBeenCalledOnce();
      expect(controller.getFailedScene()).toBeNull();
    },
  );

  it('retains the displayed scene and clears busy state when decode fails', () => {
    const { load, pending } = controlledLoader();
    const controller = createOpeningTransitionController({ loadScene: load });
    controller.request('RBiH');

    pending.get('RBiH')!.fail();

    expect(controller.getState()).toMatchObject({
      displayedScene: 'neutral',
      requestedScene: 'neutral',
      phase: 'idle',
    });
    expect(controller.getFailedScene()).toBe('RBiH');
    controller.dispose();
  });

  it('detaches a loader that reports failure synchronously', () => {
    const detach = vi.fn();
    const controller = createOpeningTransitionController({
      loadScene: (_scene, handlers) => {
        handlers.fail();
        return detach;
      },
    });

    controller.request('RS');

    expect(detach).toHaveBeenCalledOnce();
    expect(controller.getState().phase).toBe('idle');
    controller.dispose();
  });

  it('schedules one handoff when a reduced-motion decode resolves synchronously', () => {
    vi.useFakeTimers();
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const controller = createOpeningTransitionController({
      reducedMotion: true,
      loadScene: (_scene, handlers) => {
        handlers.ready();
        return vi.fn();
      },
    });

    controller.request('RS');

    expect(setTimeoutSpy).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(OPENING_TRANSITION_TIMINGS.reduced);
    expect(controller.getState().displayedScene).toBe('RS');
    controller.dispose();
    setTimeoutSpy.mockRestore();
  });

  it('uses a short dissolve in reduced motion without a camera phase', () => {
    vi.useFakeTimers();
    const { load, pending } = controlledLoader();
    const controller = createOpeningTransitionController({
      loadScene: load,
      reducedMotion: true,
    });

    controller.request('RBiH');
    pending.get('RBiH')!.ready();
    expect(controller.getState().phase).toBe('resolve');
    vi.advanceTimersByTime(OPENING_TRANSITION_TIMINGS.reduced);

    expect(controller.getState()).toMatchObject({
      displayedScene: 'RBiH',
      requestedScene: 'RBiH',
      phase: 'idle',
      reducedMotion: true,
    });
    controller.dispose();
  });

  it('cancels pending loads and clears every timer on cancellation and disposal', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { load, pending } = controlledLoader();
    const controller = createOpeningTransitionController({ loadScene: load });

    controller.request('RS');
    const rs = pending.get('RS')!;
    controller.cancel();
    expect(rs.cancel).toHaveBeenCalledOnce();
    expect(clearTimeoutSpy).toHaveBeenCalled();

    controller.request('HRHB');
    const hrhb = pending.get('HRHB')!;
    controller.dispose();
    expect(hrhb.cancel).toHaveBeenCalledOnce();
    const snapshot = controller.getState();
    vi.runAllTimers();
    expect(controller.getState()).toEqual(snapshot);
    clearTimeoutSpy.mockRestore();
  });

  it('does not make campaign submission wait for presentation completion', () => {
    const campaignStart = vi.fn();
    const { load } = controlledLoader();
    const controller = createOpeningTransitionController({ loadScene: load });
    controller.request('RS');

    campaignStart({ playerFaction: 'RS', decisionMode: 'emergent' });

    expect(campaignStart).toHaveBeenCalledOnce();
    expect(controller.getState().phase).toBe('push');
    const source = readFileSync(
      resolve(repoRoot, 'src/ui/map/components/opening/openingTransition.ts'),
      'utf8',
    );
    expect(source).not.toMatch(/GameState|campaign(?:Start|Submission)|onCampaign/i);
    controller.dispose();
  });
});

describe('OpeningCinematicLayer', () => {
  afterEach(() => cleanup());

  it('renders a neutral initial plate and never mounts more than current plus incoming', () => {
    const { load } = controlledLoader();
    const view = render(createElement(OpeningCinematicLayer, {
      scene: 'neutral',
      neutralSrc: '/neutral.webp',
      loadScene: load,
    }));
    expect(screen.getAllByTestId('warroom-scene-plate')).toHaveLength(1);
    expect(screen.getByRole('region', { name: 'Opening scene' }).getAttribute('aria-busy')).toBe('false');

    view.rerender(createElement(OpeningCinematicLayer, {
      scene: 'RS',
      neutralSrc: '/neutral.webp',
      loadScene: load,
    }));
    expect(screen.getAllByTestId('warroom-scene-plate')).toHaveLength(2);
    expect((view.container.querySelector('.opening-cinematic__plate--current') as HTMLElement).style.transformOrigin).toBe('50% 44%');
    expect((view.container.querySelector('.opening-cinematic__plate--incoming') as HTMLElement).style.transformOrigin).toBe(OPENING_WARROOM_SCENES.RS.transformOrigin);
  });

  it('settles accessibly on asset failure and announces the unavailable preview', () => {
    const { load, pending } = controlledLoader();
    render(createElement(OpeningCinematicLayer, {
      scene: 'RS',
      neutralSrc: '/neutral.webp',
      loadScene: load,
    }));
    expect(screen.getByRole('region', { name: 'Opening scene' }).getAttribute('aria-busy')).toBe('true');

    act(() => pending.get('RS')!.fail());

    expect(screen.getByRole('region', { name: 'Opening scene' }).getAttribute('aria-busy')).toBe('false');
    expect(screen.getByRole('status').textContent).toContain('RS preview unavailable');
    expect(screen.getAllByTestId('warroom-scene-plate')).toHaveLength(1);
  });

  it('removes its reduced-motion listener and cancels work on unmount', () => {
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener,
      removeEventListener,
    });
    const { load, pending } = controlledLoader();
    const view = render(createElement(OpeningCinematicLayer, {
      scene: 'HRHB',
      neutralSrc: '/neutral.webp',
      loadScene: load,
    }));

    view.unmount();

    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(window.matchMedia).toHaveBeenCalledWith(
      '(prefers-reduced-motion: reduce), (max-width: 720px), (max-height: 600px)',
    );
    expect(pending.get('HRHB')!.cancel).toHaveBeenCalledOnce();
    window.matchMedia = originalMatchMedia;
  });

  it('ignores a stale decode failure fired synchronously during unmount cleanup', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const cleanup = vi.fn();
    const view = render(createElement(OpeningCinematicLayer, {
      scene: 'RS',
      neutralSrc: '/neutral.webp',
      loadScene: (_scene, handlers) => () => {
        cleanup();
        handlers.fail();
      },
    }));

    expect(() => view.unmount()).not.toThrow();
    expect(cleanup).toHaveBeenCalledOnce();
    window.matchMedia = originalMatchMedia;
  });

  it('defines transform/opacity-only cinematic motion and transform-free fallback gates', () => {
    const css = readFileSync(resolve(repoRoot, 'src/ui/map/styles/globals.css'), 'utf8');
    expect(css).toMatch(/\.opening-cinematic__plate\s*{[\s\S]*?transition-property:\s*transform,\s*opacity/);
    expect(css).toMatch(/\.opening-cinematic__portal\s*{[\s\S]*?transition-property:\s*transform,\s*opacity/);
    expect(css).not.toMatch(/\.opening-cinematic[^}]*transition-property:[^}]*(?:filter|blur)/);
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.opening-cinematic__plate[\s\S]*?transform:\s*none/);
    expect(css).toMatch(/@media\s*\(max-width:\s*720px\)[\s\S]*?\.opening-cinematic__plate[\s\S]*?transform:\s*none/);
    expect(css).toMatch(/@media\s*\(max-height:\s*600px\)[\s\S]*?\.opening-cinematic__plate[\s\S]*?transform:\s*none/);
    expect(css).toMatch(/data-reduced-motion="true"[^}]*\.opening-cinematic__portal\s*{[^}]*opacity:\s*0\s*!important/);
    expect(css).toContain('155ms');
  });
});
