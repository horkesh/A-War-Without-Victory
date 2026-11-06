// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SettingsScreen } from '../../src/ui/map/components/SettingsScreen';
import { GameOverModal } from '../../src/ui/map/components/GameOverModal';
import { OnboardingOverlay } from '../../src/ui/map/components/onboarding/OnboardingOverlay';
import { AdvanceTurnModal } from '../../src/ui/map/components/warroom/AdvanceTurnModal';
import { advanceTurnAndSync } from '../../src/ui/map/desktop/orderActions';
import { useGameStore } from '../../src/ui/map/store/gameStore';
import { playCue } from '../../src/ui/map/audio/audio_engine';
import type { LoadedGameState } from '../../src/ui/map/data/types';
vi.mock('../../src/ui/map/audio/audio_engine', async importOriginal => ({
  ...await importOriginal<typeof import('../../src/ui/map/audio/audio_engine')>(),
  playCue: vi.fn(async () => {}),
}));
vi.mock('../../src/ui/map/desktop/orderActions', () => ({ advanceTurnAndSync: vi.fn(async () => {}) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); window.localStorage.clear(); useGameStore.setState(useGameStore.getInitialState()); });

it('offers restrained Settings open, explicit control-click and close cues', () => {
  const onClose = vi.fn(); render(createElement(SettingsScreen, { onClose }));
  expect(playCue).toHaveBeenCalledWith('ui_open_panel');
  fireEvent.click(screen.getByRole('button', { name: 'Audio' }));
  expect(playCue).toHaveBeenCalledWith('ui_click');
  fireEvent.click(screen.getByRole('button', { name: /^Close$/ }));
  expect(playCue).toHaveBeenCalledWith('ui_close_panel'); expect(onClose).toHaveBeenCalledTimes(1);
});

it('offers one terminal cue when the existing game-over surface becomes visible', () => {
  const state = { turn: 40, gameOver: false, formations: [], controlBySettlement: {} } as unknown as LoadedGameState;
  useGameStore.setState({ loadedGameState: state });
  render(createElement(GameOverModal)); expect(playCue).not.toHaveBeenCalled();
  act(() => useGameStore.setState({ loadedGameState: { ...state, gameOver: true } }));
  expect(playCue).toHaveBeenCalledWith('game_over');
  act(() => useGameStore.setState({ loadedGameState: { ...state, gameOver: true, turn: 41 } }));
  expect(playCue).toHaveBeenCalledTimes(1);
});

it('offers tutorial completion feedback after local preview advancement, but not skip', async () => {
  render(createElement(OnboardingOverlay, { tutorialState: null, ipc: null }));
  const buttons = screen.getAllByRole('button');
  const advance = buttons.find(button => !/skip/i.test(button.textContent ?? ''))!;
  await act(async () => fireEvent.click(advance));
  expect(playCue).toHaveBeenCalledWith('tutorial_objective_complete');
  vi.mocked(playCue).mockClear();
  fireEvent.click(screen.getByRole('button', { name: /skip/i }));
  expect(playCue).not.toHaveBeenCalled();
});

it('offers the turn-request cue only when the player confirms an available advance', async () => {
  useGameStore.setState({ loadedGameState: {
    turn: 40, phase: 'war', formations: [], player_faction: 'RS', controlBySettlement: {},
    turnSummaries: [], latestTurnSummary: null, operationHistory: [],
  } as unknown as LoadedGameState, advanceTurnPending: true });
  render(createElement(AdvanceTurnModal));
  expect(playCue).not.toHaveBeenCalledWith('turn_advance');
  await act(async () => fireEvent.click(screen.getByRole('button', { name: /^Advance/ })));
  expect(advanceTurnAndSync).toHaveBeenCalledTimes(1);
  expect(playCue).toHaveBeenCalledWith('turn_advance');
});
