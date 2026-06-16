// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

import { AutonomyPanel } from '../../src/ui/map/components/AutonomyPanel.js';
import { ChiefOfStaffBriefing, generateCoSBriefing } from '../../src/ui/map/components/army_hq/ChiefOfStaffBriefing.js';
import { CommandTopBar } from '../../src/ui/map/components/plan_ui/CommandTopBar.js';
import { WarroomShellLayer } from '../../src/ui/map/components/warroom/WarroomShellLayer.js';
import { makeMockLoadedGameState } from '../../src/ui/map/__mocks__/loadedGameState.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import type { CommandBriefingItemView } from '../../src/ui/map/data/types.js';

let storeState: Record<string, any> = { loadedGameState: null };

vi.mock('../../src/ui/map/store/gameStore', () => ({
  useGameStore: Object.assign(
    (selector: (state: any) => any) => selector(storeState),
    {
      getState: () => storeState,
      setState: (partial: any) => { Object.assign(storeState, partial); },
      subscribe: () => () => {},
    },
  ),
}));

function flatten(paragraphs: ReturnType<typeof generateCoSBriefing>): string {
  return paragraphs
    .map((segments) => segments.map((segment) => segment.type === 'link' ? segment.label : segment.value).join(''))
    .join('\n');
}

describe('UI copy raw-id fallbacks', () => {
  beforeEach(() => {
    storeState = { loadedGameState: null };
  });

  afterEach(() => {
    cleanup();
    delete (window as unknown as { awwv?: unknown }).awwv;
    vi.unstubAllGlobals();
  });

  it('CommandTopBar shows a neutral commander placeholder when only an internal commander id is available', () => {
    const { container } = render(createElement(CommandTopBar, {
      opName: 'Test directive',
      onNameChange: vi.fn(),
      onClose: vi.fn(),
      sectorName: 'Central sector',
      commanderId: 'officer_rbih_slug_001',
      commanderName: undefined,
      onCommanderClick: vi.fn(),
    }));

    expect(screen.getByRole('button', { name: /Unassigned command authority/i })).toBeTruthy();
    expect(container.textContent).not.toContain('officer_rbih_slug_001');
  });

  it('ChiefOfStaffBriefing uses neutral corps copy when command-strain prose lacks a player-facing corps name', () => {
    const base = makeMockLoadedGameState();
    const state = {
      ...base,
      latestTurnSummary: null,
      formations: [
        {
          id: 'rbih_internal_corps_slug',
          name: '',
          faction: 'RBiH',
          kind: 'corps',
          readiness: 'active',
          cohesion: 70,
          fatigue: 10,
          status: 'active',
          createdTurn: 1,
          tags: [],
          personnel: 10000,
          commandStrainLabel: 'strained',
        },
      ],
    } as unknown as LoadedGameState;

    const text = flatten(generateCoSBriefing([], state, 'RBiH'));

    expect(text).toContain('a corps command');
    expect(text).not.toContain('rbih_internal_corps_slug');
  });

  it('ChiefOfStaffBriefing keeps raw corps ids out of rendered prose while preserving click payloads', () => {
    const state = {
      ...makeMockLoadedGameState(),
      latestTurnSummary: null,
    } as LoadedGameState;
    const item: CommandBriefingItemView = {
      id: 'cohesion',
      kind: 'military',
      category: 'cohesion',
      severity: 'critical',
      title: 'Corps command cohesion critical',
      detail: 'Existing source detail.',
      corpsId: 'rbih_internal_corps_slug',
      target: { type: 'corps', corpsId: 'rbih_internal_corps_slug' },
    };
    const onCorpsClick = vi.fn();

    const { container } = render(createElement(ChiefOfStaffBriefing, {
      briefingItems: [item],
      gameState: state,
      faction: 'RBiH',
      onCorpsClick,
    }));

    screen.getByRole('button', { name: 'Corps command' }).click();

    expect(onCorpsClick).toHaveBeenCalledWith('rbih_internal_corps_slug');
    expect(container.textContent).not.toContain('rbih_internal_corps_slug');
  });

  it('Warroom region hover title uses the same player-facing label as the accessible name', async () => {
    storeState = {
      loadedGameState: {
        player_faction: 'RBiH',
        metadata: { date: 'April 1993' },
      },
    };
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        regions: [{
          id: 'desk_radio_channel_internal',
          bounds: { x: 100, y: 100, width: 200, height: 100 },
        }],
      }),
    })));

    render(createElement(WarroomShellLayer, { onNavigate: vi.fn() }));

    const hotspot = await screen.findByRole('button', { name: 'Desk Radio Channel Internal' });
    expect(hotspot.getAttribute('title')).toBe('Desk Radio Channel Internal');
    expect(hotspot.getAttribute('title')).not.toBe('desk_radio_channel_internal');
  });

  it('AutonomyPanel formats current and proposed proposal values without exposing slug payload values', async () => {
    (window as unknown as { awwv?: unknown }).awwv = {
      getAutonomyState: vi.fn(async () => ({
        autonomy_level: 1,
        pending_proposal_reviews: [{
          id: 'proposal_1',
          turn: 12,
          faction: 'RBiH',
          domain: 'military',
          description: 'Formation commander proposes a posture change.',
          proposed_action: 'SET_STANCE:rbih_1st_corps:offensive',
          current_value: 'pending_review',
          proposed_value: 'approve',
        }],
      })),
      setAutonomyLevel: vi.fn(async () => ({ ok: true })),
    };

    const { container } = render(createElement(AutonomyPanel, {
      onClose: vi.fn(),
      playerFaction: 'RBiH',
    }));

    await waitFor(() => expect(screen.getByText('Pending Review')).toBeTruthy());

    expect(screen.getByText('Approve')).toBeTruthy();
    expect(container.textContent).not.toContain('pending_review');
    expect(container.innerHTML).not.toContain('>approve<');
  });
});
