// @vitest-environment jsdom

import { createElement } from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const desktop = vi.hoisted(() => ({
  gameStateListener: null as null | ((stateJson: string, metadata?: { campaignReplacement?: boolean }) => void),
  initialState: null as string | null,
  getCurrentGameState: vi.fn<() => Promise<string | null>>(),
  loadSave: vi.fn(async (_stateJson: string) => undefined),
  setLoadError: vi.fn(),
  setLastTurnReport: vi.fn(),
  setPendingReplaySaveSequence: vi.fn(),
  setPendingReplaySaveManifest: vi.fn(),
  setRuntimeFeatureFlags: vi.fn(),
}));

vi.mock('../../src/ui/map/desktop/useIPC.js', () => ({
  useIPC: () => ({
    isAvailable: true,
    getCurrentGameState: desktop.getCurrentGameState,
    getRuntimeFeatureFlags: vi.fn(async () => null),
    subscribeGameStateUpdated: (listener: typeof desktop.gameStateListener) => {
      desktop.gameStateListener = listener;
      return () => { desktop.gameStateListener = null; };
    },
    subscribeTurnReportUpdated: () => () => undefined,
    subscribeReplaySequenceUpdated: () => () => undefined,
    subscribeReplayManifestUpdated: () => () => undefined,
  }),
}));

vi.mock('../../src/ui/map/store/gameStore.js', () => {
  const state = {
    loadSave: desktop.loadSave,
    setLoadError: desktop.setLoadError,
    setLastTurnReport: desktop.setLastTurnReport,
    setPendingReplaySaveSequence: desktop.setPendingReplaySaveSequence,
    setPendingReplaySaveManifest: desktop.setPendingReplaySaveManifest,
    setRuntimeFeatureFlags: desktop.setRuntimeFeatureFlags,
    loadedGameState: null,
    lastLoadedStateFingerprint: null,
    lastTurnReport: null,
  };
  const useGameStore = Object.assign(
    (selector: (storeState: typeof state) => unknown) => selector(state),
    { getState: () => state },
  );
  return { useGameStore };
});

import { useDesktopSession } from '../../src/ui/map/hooks/useDesktopSession.js';
import {
  createCampaignReplacementCoordinator,
  type CampaignReplacementCoordinator,
} from '../../src/ui/map/utils/campaignViewportLifecycle.js';

function DesktopSessionProbe({ owner }: { owner: CampaignReplacementCoordinator }) {
  useDesktopSession({ campaignReplacementOwner: owner });
  return createElement('div');
}

beforeEach(() => {
  desktop.gameStateListener = null;
  desktop.initialState = 'initial-state';
  desktop.getCurrentGameState.mockReset();
  desktop.getCurrentGameState.mockImplementation(async () => desktop.initialState);
  desktop.loadSave.mockClear();
  desktop.setLoadError.mockClear();
});

afterEach(() => cleanup());

describe('desktop campaign replacement ownership', () => {
  it('routes initial state and tagged packaged replacements through the owner, but not turn updates', async () => {
    const onReplacementSucceeded = vi.fn();
    const owner = createCampaignReplacementCoordinator(onReplacementSucceeded);
    render(createElement(DesktopSessionProbe, { owner }));

    await waitFor(() => expect(desktop.loadSave).toHaveBeenCalledWith('initial-state'));
    expect(onReplacementSucceeded).toHaveBeenCalledTimes(1);

    desktop.gameStateListener?.('turn-update');
    await waitFor(() => expect(desktop.loadSave).toHaveBeenCalledWith('turn-update'));
    expect(onReplacementSucceeded).toHaveBeenCalledTimes(1);

    desktop.gameStateListener?.('loaded-campaign', { campaignReplacement: true });
    await waitFor(() => expect(desktop.loadSave).toHaveBeenCalledWith('loaded-campaign'));
    expect(onReplacementSucceeded).toHaveBeenCalledTimes(2);
  });

  it('does not advance the owner when a tagged packaged replacement fails to load', async () => {
    desktop.initialState = null;
    desktop.loadSave.mockRejectedValueOnce(new Error('invalid packaged save'));
    const onReplacementSucceeded = vi.fn();
    const owner = createCampaignReplacementCoordinator(onReplacementSucceeded);
    render(createElement(DesktopSessionProbe, { owner }));
    await waitFor(() => expect(desktop.gameStateListener).not.toBeNull());

    desktop.gameStateListener?.('invalid-state', { campaignReplacement: true });

    await waitFor(() => expect(desktop.setLoadError).toHaveBeenCalledWith('invalid packaged save'));
    expect(onReplacementSucceeded).not.toHaveBeenCalled();
  });

  it('discards a deferred initial pull after a newer tagged replacement arrives', async () => {
    let resolveInitial!: (stateJson: string | null) => void;
    desktop.getCurrentGameState.mockReturnValueOnce(new Promise((resolve) => {
      resolveInitial = resolve;
    }));
    const onReplacementSucceeded = vi.fn();
    const owner = createCampaignReplacementCoordinator(onReplacementSucceeded);
    render(createElement(DesktopSessionProbe, { owner }));
    await waitFor(() => expect(desktop.gameStateListener).not.toBeNull());

    desktop.gameStateListener?.('new-campaign', { campaignReplacement: true });
    await waitFor(() => expect(desktop.loadSave).toHaveBeenCalledWith('new-campaign'));
    resolveInitial('old-initial-state');
    await Promise.resolve();
    await Promise.resolve();

    expect(desktop.loadSave).not.toHaveBeenCalledWith('old-initial-state');
    expect(onReplacementSucceeded).toHaveBeenCalledOnce();
  });

  it('discards a deferred initial-pull error after a newer tagged replacement succeeds', async () => {
    let rejectInitial!: (reason: Error) => void;
    desktop.getCurrentGameState.mockReturnValueOnce(new Promise((_resolve, reject) => {
      rejectInitial = reject;
    }));
    const onReplacementSucceeded = vi.fn();
    const owner = createCampaignReplacementCoordinator(onReplacementSucceeded);
    render(createElement(DesktopSessionProbe, { owner }));
    await waitFor(() => expect(desktop.gameStateListener).not.toBeNull());

    desktop.gameStateListener?.('new-campaign', { campaignReplacement: true });
    await waitFor(() => expect(desktop.loadSave).toHaveBeenCalledWith('new-campaign'));
    rejectInitial(new Error('stale initial pull failed'));
    await Promise.resolve();
    await Promise.resolve();

    expect(desktop.setLoadError).not.toHaveBeenCalledWith('stale initial pull failed');
    expect(onReplacementSucceeded).toHaveBeenCalledOnce();
  });

  it('coalesces a tagged replacement followed by a newer ordinary state into one replacement apply', async () => {
    desktop.initialState = null;
    const onReplacementSucceeded = vi.fn();
    const owner = createCampaignReplacementCoordinator(onReplacementSucceeded);
    render(createElement(DesktopSessionProbe, { owner }));
    await waitFor(() => expect(desktop.gameStateListener).not.toBeNull());

    desktop.gameStateListener?.('replacement-state', { campaignReplacement: true });
    desktop.gameStateListener?.('newer-turn-state');

    await waitFor(() => expect(desktop.loadSave).toHaveBeenCalledWith('newer-turn-state'));
    expect(desktop.loadSave).not.toHaveBeenCalledWith('replacement-state');
    expect(onReplacementSucceeded).toHaveBeenCalledOnce();
  });
});
