// @vitest-environment jsdom
//
// Command loop L7: the army-clash Command Surface card, the lazily loaded answer component,
// the inbox row, the adapter projection and the clash.* strings in both locales.

import React from 'react';
import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DirectiveCard } from '../../src/ui/map/components/army_hq/DirectiveCard';
import { buildPresidentialDecisionRoomView, type PresidentialDecisionRoomDirective } from '../../src/ui/map/data/presidentialDecisionRoom';
import { deriveInboxItems } from '../../src/ui/map/data/inboxItems';
import { parseGameState } from '../../src/ui/map/data/GameStateAdapter';
import { setLocale } from '../../src/ui/map/i18n';
import type { ArmyClashView, LoadedGameState } from '../../src/ui/map/data/types';

const DIRECTIVE: PresidentialDecisionRoomDirective = { lever: 'army_clash', corpsId: 'arbih_2nd_corps', cost: 15, payload: { clashId: 'CLASH_40_RBiH' } };

function clash(overrides: Partial<ArmyClashView> = {}): ArmyClashView {
  return {
    id: 'CLASH_40_RBiH', turn: 40, act: 'stop_op', corpsId: 'arbih_2nd_corps', corpsName: '2nd Corps',
    corpsCommanderName: 'Sead Delić', armyCommanderName: 'Rasim Delić', conflict: 'main_effort',
    compliance: 'partial', counterOrder: 'continue_operation', orderRef: 'Operation Vozuca',
    orderName: 'Operation Vozuća', stagedCost: 25, acceptCost: 0, corpsObjection: false, previousClash: null, ...overrides,
  };
}

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
  return {
    label: 'Turn 40', turn: 40, phase: 'war', formations: [], militiaPools: [], controlBySettlement: {},
    statusBySettlement: {}, brigadeAorByFormationId: {}, attackOrders: [], aorOrders: [], recentControlEvents: [],
    allControlEvents: [], displacementEventLog: [], battlesByOsid: {}, movementsByOsid: {},
    supplyTransitionsByOsid: {}, historicalEventsByTurn: [], pressureWarning: false, turnSummaries: [],
    player_faction: 'RBiH', commandAuthority: { current: 60, max: 100, spentThisTurn: 0, lifetimeSpent: 0 },
    ...overrides,
  } as LoadedGameState;
}

function installIpc() {
  const bridge = { resolveArmyClash: vi.fn(async () => ({ ok: true, cost: 15 })) };
  Object.defineProperty(window, 'awwv', { configurable: true, value: bridge });
  return bridge;
}

afterEach(() => {
  cleanup();
  setLocale('en');
  Object.defineProperty(window, 'awwv', { configurable: true, value: undefined });
});

describe('army clash: Command Surface card', () => {
  it('emits one advisory command card with the army_clash lever priced at Insist', () => {
    const view = buildPresidentialDecisionRoomView({ state: makeState({ armyClashes: [clash()] }) });
    const card = view.cards.find((c) => c.id === 'command:army-clash:CLASH_40_RBiH');
    expect(card).toBeDefined();
    expect(card!.directive).toMatchObject({ lever: 'army_clash', cost: 15, payload: { clashId: 'CLASH_40_RBiH' } });
    expect(card!.title).toBe('Rasim Delić objects to: halt Operation Vozuća');
    expect(card!.explanation).toBe('Unanswered at Advance, your order to the 2nd Corps stands as given.');
    expect(card!.title).not.toMatch(/CLASH_|arbih_/);
    expect(view.advanceReadiness.blockedByExistingSystems).toBe(false);
    expect(card!.severity).toBe('warning');
    const mild = buildPresidentialDecisionRoomView({ state: makeState({ armyClashes: [clash({ compliance: 'modified' })] }) })
      .cards.find((c) => c.id === 'command:army-clash:CLASH_40_RBiH');
    expect(mild!.severity).toBe('info');
  });

  it('shows the order, the army\'s version, the corps, his reason and three priced answers', async () => {
    installIpc();
    render(React.createElement(DirectiveCard, { directive: DIRECTIVE, gameState: makeState({ armyClashes: [clash({ previousClash: { turn: 20, outcome: 'insist' } })] }) }));
    expect((await screen.findByTestId('army-clash-order')).textContent).toBe('Halt Operation Vozuća');
    expect(screen.getByTestId('army-clash-counter').textContent).toBe('The army wants the operation to run on.');
    expect(screen.getByTestId('army-clash-corps').textContent).toBe('2nd Corps');
    expect(screen.getByTestId('army-clash-reason').textContent).toBe('It is the main effort of the army\'s campaign plan.');
    expect(screen.getByTestId('army-clash-severity').textContent).toBe('He would carry out only part of it.');
    expect(screen.getByTestId('army-clash-previous').textContent).toContain('you insisted');
    expect(screen.getByRole('button', { name: 'Accept the army\'s version. Free.' }).textContent).toContain('Free');
    expect(screen.getByRole('button', { name: 'Insist on your order. Costs 15 Authority.' }).textContent).toContain('15 Authority');
    const replace = screen.getByRole('button', { name: 'Replace the corps commander. Costs 25 Authority.' });
    expect(replace.textContent).toContain('Replace Sead Delić');
    expect(replace.textContent).toContain('25 Authority');
    expect(screen.getByTestId('army-clash-balance').textContent).toBe('You have 60 Authority.');
  });

  it('answers through resolve-army-clash', async () => {
    const bridge = installIpc();
    const onReceipt = vi.fn();
    render(React.createElement(DirectiveCard, { directive: DIRECTIVE, gameState: makeState({ armyClashes: [clash()] }), onReceipt }));
    fireEvent.click(await screen.findByTestId('army-clash-insist'));
    await waitFor(() => expect(bridge.resolveArmyClash).toHaveBeenCalledWith({ clashId: 'CLASH_40_RBiH', answer: 'insist' }));
    await waitFor(() => expect(onReceipt).toHaveBeenCalledWith({ kind: 'success', message: 'You insisted over Rasim Delić.' }));
  });

  it('disables what the balance cannot pay for, and Replace when the corps has no commander', async () => {
    installIpc();
    render(React.createElement(DirectiveCard, {
      directive: DIRECTIVE,
      gameState: makeState({ armyClashes: [clash({ corpsCommanderName: null })], commandAuthority: { current: 12, max: 100, spentThisTurn: 0, lifetimeSpent: 0 } as never }),
    }));
    expect((await screen.findByTestId('army-clash-accept')).hasAttribute('disabled')).toBe(false);
    expect(screen.getByTestId('army-clash-insist').hasAttribute('disabled')).toBe(true);
    expect(screen.getByTestId('army-clash-replace').hasAttribute('disabled')).toBe(true);
    expect(screen.getByTestId('army-clash-replace').textContent).toContain('Replace the corps commander');
  });

  it('prices Accept at the backing cost when the army\'s version is an approval', async () => {
    installIpc();
    render(React.createElement(DirectiveCard, {
      directive: DIRECTIVE,
      gameState: makeState({ armyClashes: [clash({ act: 'withhold_plan', counterOrder: 'launch_plan', conflict: 'primary_corps', orderName: null, acceptCost: 10 })], commandAuthority: { current: 8, max: 100, spentThisTurn: 0, lifetimeSpent: 0 } as never }),
    }));
    const accept = await screen.findByTestId('army-clash-accept');
    expect(accept.textContent).toContain('10 Authority');
    expect(accept.getAttribute('aria-label')).toBe('Accept the army\'s version and approve the operation. Costs 10 Authority.');
    expect(accept.hasAttribute('disabled')).toBe(true);
  });

  it('shows both voices when the corps commander objected too', async () => {
    installIpc();
    render(React.createElement(DirectiveCard, { directive: DIRECTIVE, gameState: makeState({ armyClashes: [clash({ act: 'request_op', orderRef: 'op:doboj:doboj_1', orderName: null, corpsObjection: true, counterOrder: 'resubmit_next_week', conflict: 'economy_corps' })] }) }));
    expect((await screen.findByTestId('army-clash-corps-objection')).textContent).toBe('Sead Delić also advised against this order.');
  });

  it('renders in BCS', async () => {
    installIpc();
    setLocale('bcs');
    render(React.createElement(DirectiveCard, { directive: DIRECTIVE, gameState: makeState({ armyClashes: [clash()] }) }));
    expect((await screen.findByTestId('army-clash-insist')).textContent).toContain('Insistiraj');
    expect(screen.getByTestId('army-clash-counter').textContent).toBe('Armija želi da se operacija nastavi.');
  });
});

describe('army clash: inbox and adapter', () => {
  it('puts this week\'s clash in the inbox', () => {
    const items = deriveInboxItems(makeState({ armyClashes: [clash()] }), {});
    const item = items.find((i) => i.id === 'command:army-clash:CLASH_40_RBiH');
    expect(item).toMatchObject({ type: 'army_clash', title: 'The army objects to an order', subtitle: 'Rasim Delić objects to: halt Operation Vozuća' });
  });

  it('projects the open clash and receipts player-safe, and drops a lapsed clash', () => {
    const raw = JSON.parse(readFileSync('data/derived/startup/apr_1992_initial_save.json', 'utf8'));
    raw.meta.player_faction = 'RBiH';
    const turn = raw.meta.turn;
    const armyChief = (raw.military.named_officer_data as any[]).find((o) => o.faction === 'RBiH' && o.rank === 'army_commander');
    raw.meta.army_clashes = [{
      id: `CLASH_${turn}_RBiH`, faction: 'RBiH', turn, act: 'withhold_plan', corps_id: 'arbih_2nd_corps',
      army_officer_id: armyChief.id, conflict: 'primary_corps', compliance: 'partial', counter_order: 'launch_plan',
      order_ref: 'plan_1', proposal_id: 'P', staged_cost: 0,
    }];
    raw.meta.army_clash_history = [{
      id: 'CLASH_0_RBiH', faction: 'RBiH', turn: 0, act: 'stop_op', corps_id: 'arbih_2nd_corps',
      army_officer_id: armyChief.id, conflict: 'main_effort', outcome: 'insist', resolved_turn: 0, cost: 15,
    }];
    raw.meta.pending_proposal_reviews = [
      ...(raw.meta.pending_proposal_reviews ?? []),
      { id: 'P', turn, faction: 'RBiH', domain: 'ops', description: 'Operation approval', proposed_action: 'APPROVE_OP:arbih_2nd_corps:plan_1', accepted: false, resolved_turn: turn },
    ];
    const loaded = parseGameState(raw);
    expect(loaded.armyClashes).toHaveLength(1);
    // Accept's price comes from the restaged review, the same source as the IPC debit.
    expect(loaded.armyClashes![0]).toMatchObject({ act: 'withhold_plan', armyCommanderName: armyChief.name, counterOrder: 'launch_plan', acceptCost: 10 });
    expect(loaded.armyClashes![0]!.corpsName).not.toMatch(/arbih_/);
    expect(loaded.armyClashHistory![0]).toMatchObject({ outcome: 'insist', cost: 15 });
    raw.meta.turn = turn + 1;
    expect(parseGameState(raw).armyClashes).toBeUndefined();
  });

  it('an old save carries no clash views', () => {
    const raw = JSON.parse(readFileSync('data/derived/startup/apr_1992_initial_save.json', 'utf8'));
    const loaded = parseGameState(raw);
    expect(loaded.armyClashes).toBeUndefined();
    expect(loaded.armyClashHistory).toBeUndefined();
  });
});
