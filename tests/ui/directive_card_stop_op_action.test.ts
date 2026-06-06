// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DirectiveCard } from '../../src/ui/map/components/army_hq/DirectiveCard';
import { OperationsSection } from '../../src/ui/map/components/army_hq/OperationsSection';
import type { LoadedGameState } from '../../src/ui/map/data/types';
import type { PresidentialDecisionRoomDirective } from '../../src/ui/map/data/presidentialDecisionRoom';
import { useGameStore } from '../../src/ui/map/store/gameStore';

const baseGameState = {
  turn: 12,
  phase: 'war',
  formations: [
    { id: 'arbih_3rd_corps', faction: 'RBiH', name: '3rd Corps', kind: 'corps' },
  ],
  commandAuthority: { current: 60, max: 100, spentThisTurn: 0, recoveryPerTurn: 2 },
  namedOfficerData: [],
} as unknown as LoadedGameState;

const gameStateWithCommander = {
  ...baseGameState,
  namedOfficerData: [
    {
      id: 'officer_mujic',
      name: 'Adem Mujic',
      rank: 'colonel',
      assigned_corps_id: 'arbih_3rd_corps',
      status: 'active',
      competence: 4,
      political_reliability: 4,
      stubbornness: 2,
      override_tolerance: 3,
    },
  ],
} as unknown as LoadedGameState;

const stopOpDirective: PresidentialDecisionRoomDirective = {
  lever: 'stop_op',
  corpsId: 'arbih_3rd_corps',
  cost: 25,
  payload: { corpsId: 'arbih_3rd_corps', opName: 'Operation Breakthrough' },
};

const authorizeDirective: PresidentialDecisionRoomDirective = {
  lever: 'authorize_op',
  cost: 0,
  payload: { proposalId: 'proposal_alpha' },
};

const requestOpDirective: PresidentialDecisionRoomDirective = {
  lever: 'request_op',
  corpsId: 'arbih_3rd_corps',
  cost: 25,
  payload: {},
};

const forceLaunchDirective: PresidentialDecisionRoomDirective = {
  lever: 'force_launch',
  corpsId: 'arbih_3rd_corps',
  cost: 15,
  payload: { opName: 'Operation Holdfast' },
};

const replaceCoDirective: PresidentialDecisionRoomDirective = {
  lever: 'replace_co',
  corpsId: 'arbih_3rd_corps',
  cost: 25,
  payload: {},
};

const eliteDeployDirective: PresidentialDecisionRoomDirective = {
  lever: 'elite_deploy',
  corpsId: 'arbih_3rd_corps',
  cost: 25,
  payload: { requestId: 'reserve_request_alpha', brigadeId: 'elite_brigade_alpha' },
};

const frontVisitDirective: PresidentialDecisionRoomDirective = {
  lever: 'front_visit',
  cost: 10,
  payload: {},
};

function installIpc(overrides: Record<string, unknown> = {}) {
  const bridge = {
    stageOpHaltOrder: vi.fn(async () => ({ ok: true })),
    acceptProposal: vi.fn(async () => ({ ok: true })),
    queryDirectiveObjection: vi.fn(async () => ({
      ok: true,
      data: { forceRatio: 1.4, estimatedCasualties: 120, recommendedAction: 'launch' },
    })),
    stageOpDirectiveOrder: vi.fn(async () => ({ ok: true })),
    stageOperationForceLaunch: vi.fn(async () => ({ ok: true })),
    stageCoReplacementOrder: vi.fn(async () => ({ ok: true })),
    approveReserveRequest: vi.fn(async () => ({ ok: true })),
    getFrontVisitAvailability: vi.fn(async () => ({
      ok: true,
      available: true,
      reachableBranchIds: ['visit_sarajevo'],
      unreachableBranchIds: [],
    })),
    initiateFrontVisit: vi.fn(async () => ({ ok: true })),
    ...overrides,
  };
  Object.defineProperty(window, 'awwv', {
    configurable: true,
    value: bridge,
  });
  return bridge;
}

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, 'awwv');
  useGameStore.setState(useGameStore.getInitialState());
  vi.restoreAllMocks();
});

describe('DirectiveCard stop-op action host', () => {
  it('stages a halt directive and shows a next-turn receipt', async () => {
    const { stageOpHaltOrder } = installIpc();

    render(React.createElement(DirectiveCard, { directive: stopOpDirective, gameState: baseGameState }));

    fireEvent.click(screen.getByRole('button', { name: 'Issue (25)' }));

    await waitFor(() => {
      expect(stageOpHaltOrder).toHaveBeenCalledWith({
        corpsId: 'arbih_3rd_corps',
        opName: 'Operation Breakthrough',
      });
    });
    expect((await screen.findByRole('status', { name: 'Directive receipt' })).textContent).toContain(
      'Directive staged for next turn',
    );
  });

  it('offers a cancel path that does not stage a halt', () => {
    const { stageOpHaltOrder } = installIpc();

    render(React.createElement(DirectiveCard, { directive: stopOpDirective, gameState: baseGameState }));

    fireEvent.click(screen.getByRole('button', { name: 'Cancel directive' }));

    expect(stageOpHaltOrder).not.toHaveBeenCalled();
    expect(screen.getByRole('status', { name: 'Directive receipt' }).textContent).toContain(
      'Directive cancelled',
    );
  });

  it('shows the same receipt contract after authorizing an operation proposal', async () => {
    const { acceptProposal } = installIpc();

    render(React.createElement(DirectiveCard, { directive: authorizeDirective, gameState: baseGameState }));

    fireEvent.click(screen.getByRole('button', { name: 'Authorize' }));

    await waitFor(() => {
      expect(acceptProposal).toHaveBeenCalledWith('proposal_alpha');
    });
    expect((await screen.findByRole('status', { name: 'Directive receipt' })).textContent).toContain(
      'Directive staged for next turn',
    );
  });

  it('shows a failure receipt when a directive IPC refuses the issue', async () => {
    const acceptProposal = vi.fn(async () => ({ ok: false, error: 'proposal_expired' }));
    installIpc({ acceptProposal });

    render(React.createElement(DirectiveCard, { directive: authorizeDirective, gameState: baseGameState }));

    fireEvent.click(screen.getByRole('button', { name: 'Authorize' }));

    await waitFor(() => {
      expect(acceptProposal).toHaveBeenCalledWith('proposal_alpha');
    });
    expect((await screen.findByRole('status', { name: 'Directive receipt' })).textContent).toContain(
      'Directive was not staged: proposal_expired',
    );
  });

  it('shows a receipt after request-op clears objection review and stages', async () => {
    const { queryDirectiveObjection, stageOpDirectiveOrder } = installIpc();

    render(React.createElement(DirectiveCard, { directive: requestOpDirective, gameState: baseGameState }));

    fireEvent.change(screen.getByLabelText('Objective settlement'), { target: { value: 'zenica' } });
    fireEvent.click(screen.getByRole('button', { name: 'Issue (25)' }));

    await waitFor(() => {
      expect(queryDirectiveObjection).toHaveBeenCalledWith({ corpsId: 'arbih_3rd_corps', targetOsid: 'zenica' });
      expect(stageOpDirectiveOrder).toHaveBeenCalledWith({ corpsId: 'arbih_3rd_corps', targetOsid: 'zenica' });
    });
    expect((await screen.findByRole('status', { name: 'Directive receipt' })).textContent).toContain(
      'Directive staged for next turn',
    );
  });

  it('resolves a typed settlement display name before request-op objection review', async () => {
    useGameStore.setState({
      osidDisplayNames: {
        'op:bihac:bihac_1': 'Bihać',
        'op:zenica:zenica_1': 'Zenica',
      },
    });
    const { queryDirectiveObjection, stageOpDirectiveOrder } = installIpc();

    render(React.createElement(DirectiveCard, { directive: requestOpDirective, gameState: baseGameState }));

    fireEvent.change(screen.getByLabelText('Objective settlement'), { target: { value: 'Bihać' } });
    fireEvent.click(screen.getByRole('button', { name: 'Issue (25)' }));

    await waitFor(() => {
      expect(queryDirectiveObjection).toHaveBeenCalledWith({
        corpsId: 'arbih_3rd_corps',
        targetOsid: 'op:bihac:bihac_1',
      });
      expect(stageOpDirectiveOrder).toHaveBeenCalledWith({
        corpsId: 'arbih_3rd_corps',
        targetOsid: 'op:bihac:bihac_1',
      });
    });
  });

  it('offers a deterministic known-objective picker before request-op objection review', async () => {
    useGameStore.setState({
      osidDisplayNames: {
        'op:zenica:zenica_1': 'Zenica',
        'op:bihac:bihac_1': 'Bihać',
      },
    });
    const { queryDirectiveObjection, stageOpDirectiveOrder } = installIpc();

    render(React.createElement(DirectiveCard, { directive: requestOpDirective, gameState: baseGameState }));

    const picker = screen.getByLabelText('Known objective settlement') as HTMLSelectElement;
    const optionTexts = Array.from(picker.options).map((option) => option.textContent);
    expect(optionTexts).toEqual([
      'Choose a known objective...',
      'Bihać',
      'Zenica',
    ]);

    fireEvent.change(picker, { target: { value: 'op:bihac:bihac_1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Issue (25)' }));

    await waitFor(() => {
      expect(queryDirectiveObjection).toHaveBeenCalledWith({
        corpsId: 'arbih_3rd_corps',
        targetOsid: 'op:bihac:bihac_1',
      });
      expect(stageOpDirectiveOrder).toHaveBeenCalledWith({
        corpsId: 'arbih_3rd_corps',
        targetOsid: 'op:bihac:bihac_1',
      });
    });
  });

  it('blocks ambiguous typed settlement display names before request-op objection review', () => {
    useGameStore.setState({
      osidDisplayNames: {
        'op:alpha:kamenica_1': 'Kamenica',
        'op:beta:kamenica_1': 'Kamenica',
      },
    });
    const { queryDirectiveObjection, stageOpDirectiveOrder } = installIpc();

    render(React.createElement(DirectiveCard, { directive: requestOpDirective, gameState: baseGameState }));

    fireEvent.change(screen.getByLabelText('Objective settlement'), { target: { value: 'Kamenica' } });

    const alert = screen.getByRole('alert', { name: 'Ambiguous objective settlement' });
    expect(alert.textContent).toContain('op:alpha:kamenica_1, op:beta:kamenica_1');
    const issue = screen.getByRole('button', { name: 'Issue (25)' });
    expect(issue.hasAttribute('disabled')).toBe(true);
    fireEvent.click(issue);
    expect(queryDirectiveObjection).not.toHaveBeenCalled();
    expect(stageOpDirectiveOrder).not.toHaveBeenCalled();
  });

  it('offers the same known-objective picker in the Army HQ operations request row', async () => {
    useGameStore.setState({
      osidDisplayNames: {
        'op:zenica:zenica_1': 'Zenica',
        'op:bihac:bihac_1': 'Bihać',
      },
    });
    const { queryDirectiveObjection, stageOpDirectiveOrder } = installIpc();

    render(React.createElement(OperationsSection, {
      corpsId: 'arbih_3rd_corps',
      operations: [],
      gameState: baseGameState,
    }));

    fireEvent.click(screen.getByRole('button', { name: /Operations/i }));
    const picker = screen.getByLabelText('Known request-operation objective') as HTMLSelectElement;
    fireEvent.change(picker, { target: { value: 'op:zenica:zenica_1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Request op (25)' }));

    await waitFor(() => {
      expect(queryDirectiveObjection).toHaveBeenCalledWith({
        corpsId: 'arbih_3rd_corps',
        targetOsid: 'op:zenica:zenica_1',
      });
      expect(stageOpDirectiveOrder).toHaveBeenCalledWith({
        corpsId: 'arbih_3rd_corps',
        targetOsid: 'op:zenica:zenica_1',
      });
    });
  });

  it('resolves fixed request-op target captions to display names', () => {
    useGameStore.setState({
      osidDisplayNames: {
        'op:bihac:bihac_1': 'Bihac',
      },
    });
    installIpc();
    const fixedTargetDirective: PresidentialDecisionRoomDirective = {
      ...requestOpDirective,
      payload: { targetOsid: 'op:bihac:bihac_1' },
    };

    render(React.createElement(DirectiveCard, { directive: fixedTargetDirective, gameState: baseGameState }));

    expect(screen.getByText(/Direct corps to objective .* Bihac/)).toBeTruthy();
    expect(screen.queryByText(/op:bihac:bihac_1/)).toBeNull();
  });

  it('surfaces commander pushback before staging a request-op directive', async () => {
    const { queryDirectiveObjection, stageOpDirectiveOrder } = installIpc({
      queryDirectiveObjection: vi.fn(async () => ({
        ok: true,
        data: { forceRatio: 0.7, estimatedCasualties: 380, recommendedAction: 'delay' },
      })),
    });

    render(React.createElement(DirectiveCard, { directive: requestOpDirective, gameState: gameStateWithCommander }));

    fireEvent.change(screen.getByLabelText('Objective settlement'), { target: { value: 'zenica' } });
    fireEvent.click(screen.getByRole('button', { name: 'Issue (25)' }));

    expect(await screen.findByRole('alertdialog', { name: 'Commander objection' })).toBeTruthy();
    expect(screen.getByText(/Colonel Adem Mujic advises against it/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Force anyway' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Stand down' })).toBeTruthy();
    expect(screen.queryByRole('status', { name: 'Directive receipt' })).toBeNull();
    expect(queryDirectiveObjection).toHaveBeenCalledWith({ corpsId: 'arbih_3rd_corps', targetOsid: 'zenica' });
    expect(stageOpDirectiveOrder).not.toHaveBeenCalled();
  });

  it('forces a request-op directive over commander pushback and shows a receipt', async () => {
    const { stageOpDirectiveOrder } = installIpc({
      queryDirectiveObjection: vi.fn(async () => ({
        ok: true,
        data: { forceRatio: 0.7, estimatedCasualties: 380, recommendedAction: 'abort' },
      })),
    });

    render(React.createElement(DirectiveCard, { directive: requestOpDirective, gameState: gameStateWithCommander }));

    fireEvent.change(screen.getByLabelText('Objective settlement'), { target: { value: 'zenica' } });
    fireEvent.click(screen.getByRole('button', { name: 'Issue (25)' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Force anyway' }));

    await waitFor(() => {
      expect(stageOpDirectiveOrder).toHaveBeenCalledWith({
        corpsId: 'arbih_3rd_corps',
        targetOsid: 'zenica',
        forced_over_objection: true,
      });
    });
    expect((await screen.findByRole('status', { name: 'Directive receipt' })).textContent).toContain(
      'Directive staged for next turn',
    );
  });

  it('records a stand-down receipt after dismissing commander pushback without staging', async () => {
    const { stageOpDirectiveOrder } = installIpc({
      queryDirectiveObjection: vi.fn(async () => ({
        ok: true,
        data: { forceRatio: 0.7, estimatedCasualties: 380, recommendedAction: 'delay' },
      })),
    });

    render(React.createElement(DirectiveCard, { directive: requestOpDirective, gameState: gameStateWithCommander }));

    fireEvent.change(screen.getByLabelText('Objective settlement'), { target: { value: 'zenica' } });
    fireEvent.click(screen.getByRole('button', { name: 'Issue (25)' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Stand down' }));

    expect(screen.queryByRole('alertdialog', { name: 'Commander objection' })).toBeNull();
    expect(stageOpDirectiveOrder).not.toHaveBeenCalled();
    expect(screen.getByRole('status', { name: 'Directive receipt' }).textContent).toContain(
      'Directive cancelled',
    );
  });

  it('blocks unbuildable request-op directives without offering force-anyway', async () => {
    const { stageOpDirectiveOrder } = installIpc({
      queryDirectiveObjection: vi.fn(async () => ({
        ok: true,
        data: {
          forceRatio: 0,
          estimatedCasualties: 0,
          recommendedAction: 'abort',
          rejectionReason: 'objective_unreachable',
        },
      })),
    });

    render(React.createElement(DirectiveCard, { directive: requestOpDirective, gameState: gameStateWithCommander }));

    fireEvent.change(screen.getByLabelText('Objective settlement'), { target: { value: 'zenica' } });
    fireEvent.click(screen.getByRole('button', { name: 'Issue (25)' }));

    expect(await screen.findByRole('alert', { name: 'Directive cannot be issued' })).toBeTruthy();
    expect(screen.getByText(/no friendly ground adjacent/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Force anyway' })).toBeNull();
    expect(screen.queryByRole('status', { name: 'Directive receipt' })).toBeNull();
    expect(stageOpDirectiveOrder).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: 'force launch',
      directive: forceLaunchDirective,
      button: 'Issue (15)',
      method: 'stageOperationForceLaunch',
      payload: { corpsId: 'arbih_3rd_corps', operationName: 'Operation Holdfast' },
    },
    {
      label: 'replace commander',
      directive: replaceCoDirective,
      button: 'Issue (25)',
      method: 'stageCoReplacementOrder',
      payload: { corpsId: 'arbih_3rd_corps' },
    },
    {
      label: 'release elite reserve',
      directive: eliteDeployDirective,
      button: 'Issue (25)',
      method: 'approveReserveRequest',
      payload: ['reserve_request_alpha', 'elite_brigade_alpha', undefined],
    },
  ])('shows a receipt after $label issues', async ({ directive, button, method, payload }) => {
    const bridge = installIpc();

    render(React.createElement(DirectiveCard, { directive, gameState: baseGameState }));

    fireEvent.click(screen.getByRole('button', { name: button }));

    await waitFor(() => {
      if (Array.isArray(payload)) {
        expect(bridge[method as keyof typeof bridge]).toHaveBeenCalledWith(...payload);
      } else {
        expect(bridge[method as keyof typeof bridge]).toHaveBeenCalledWith(payload);
      }
    });
    expect((await screen.findByRole('status', { name: 'Directive receipt' })).textContent).toContain(
      'Directive staged for next turn',
    );
  });

  it('shows a receipt after front visit initiation succeeds', async () => {
    const { getFrontVisitAvailability, initiateFrontVisit } = installIpc();

    render(React.createElement(DirectiveCard, { directive: frontVisitDirective, gameState: baseGameState }));

    await waitFor(() => {
      expect(getFrontVisitAvailability).toHaveBeenCalled();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Issue (10)' }));

    await waitFor(() => {
      expect(initiateFrontVisit).toHaveBeenCalled();
    });
    expect((await screen.findByRole('status', { name: 'Directive receipt' })).textContent).toContain(
      'Directive staged for next turn',
    );
  });

  it('blocks front visit issue when availability says no front is reachable', async () => {
    const initiateFrontVisit = vi.fn(async () => ({ ok: true }));
    installIpc({
      initiateFrontVisit,
      getFrontVisitAvailability: vi.fn(async () => ({
        ok: true,
        available: false,
        reason: 'No front is reachable.',
        reachableBranchIds: [],
        unreachableBranchIds: ['visit_sarajevo'],
      })),
    });

    render(React.createElement(DirectiveCard, { directive: frontVisitDirective, gameState: baseGameState }));

    expect((await screen.findByRole('status', { name: 'Leadership action unavailable' })).textContent).toContain(
      'No front is reachable.',
    );
    const issue = screen.getByRole('button', { name: 'Issue (10)' });
    expect(issue.hasAttribute('disabled')).toBe(true);
    fireEvent.click(issue);
    expect(initiateFrontVisit).not.toHaveBeenCalled();
  });
});
