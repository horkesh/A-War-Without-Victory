// @vitest-environment jsdom
//
// Posture model option 2: the stance-matter Command Surface card, the shared answer
// component, the sector panel stance step, the inbox row and the Records line.

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DirectiveCard } from '../../src/ui/map/components/army_hq/DirectiveCard';
import { SectorStanceStep } from '../../src/ui/map/components/SectorStanceStep';
import { buildPresidentialDecisionRoomView } from '../../src/ui/map/data/presidentialDecisionRoom';
import { deriveInboxItems } from '../../src/ui/map/data/inboxItems';
import { buildDecisionConsequenceLedger } from '../../src/ui/map/data/decisionConsequenceLedger';
import { stanceMatterReceiptLine, stanceHoldLine } from '../../src/ui/map/data/stanceMatterCopy';
import { setLocale } from '../../src/ui/map/i18n';
import type { LoadedGameState, StanceMatterView } from '../../src/ui/map/data/types';
import type { PresidentialDecisionRoomDirective } from '../../src/ui/map/data/presidentialDecisionRoom';

const STANCE_DIRECTIVE: PresidentialDecisionRoomDirective = { lever: 'stance_matter', cost: 0, payload: { matterId: 'STANCE_11_arbih_2nd_corps' } };

function matter(overrides: Partial<StanceMatterView> = {}): StanceMatterView {
  return {
    id: 'STANCE_11_arbih_2nd_corps', turn: 11, scope: 'corps', corpsId: 'arbih_2nd_corps', corpsName: '2nd Corps',
    sectorId: null, ogName: null, fromStance: 'balanced', toStance: 'offensive', commanderName: 'Sead Delić',
    reason: 'opportunity', avgCohesion: 61, avgStrength: 0.74, sectorThreat: 0.4, patronCeiling: null,
    deadlineTurn: 12, constraintOptions: ['ceiling_balanced', 'ceiling_defensive'], countermandAllowed: true,
    mainStaffDelayTurns: 0, patronShift: 0, answer: null, constraint: null, ...overrides,
  };
}

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
  return {
    label: 'Turn 11', turn: 11, phase: 'war', formations: [], militiaPools: [], controlBySettlement: {},
    statusBySettlement: {}, brigadeAorByFormationId: {}, attackOrders: [], aorOrders: [], recentControlEvents: [],
    allControlEvents: [], displacementEventLog: [], battlesByOsid: {}, movementsByOsid: {},
    supplyTransitionsByOsid: {}, historicalEventsByTurn: [], pressureWarning: false, turnSummaries: [],
    player_faction: 'RBiH', commandAuthority: { current: 60, max: 100, spentThisTurn: 0, recoveryPerTurn: 2 },
    ...overrides,
  } as LoadedGameState;
}

function installIpc() {
  const bridge = { resolveStanceMatter: vi.fn(async () => ({ ok: true })) };
  Object.defineProperty(window, 'awwv', { configurable: true, value: bridge });
  return bridge;
}

afterEach(() => {
  cleanup();
  setLocale('en');
  Object.defineProperty(window, 'awwv', { configurable: true, value: undefined });
});

describe('stance matter: Command Surface card', () => {
  it('emits one advisory command card per open matter with the stance_matter lever', () => {
    const view = buildPresidentialDecisionRoomView({ state: makeState({ stanceMatters: [matter()] }) });
    const card = view.cards.find((c) => c.id === 'command:stance-matter:STANCE_11_arbih_2nd_corps');
    expect(card).toBeDefined();
    expect(card!.directive).toMatchObject({ lever: 'stance_matter', cost: 0, payload: { matterId: 'STANCE_11_arbih_2nd_corps' } });
    expect(card!.title).toBe('2nd Corps: Balanced to Offensive');
    expect(card!.explanation).toContain('stands unless you answer');
    expect(card!.evidence.join(' ')).toContain('Commander\'s reasoning');
    expect(card!.title).not.toMatch(/arbih_|STANCE_/);
    expect(view.advanceReadiness.blockedByExistingSystems).toBe(false);
  });

  it('answers through resolve-stance-matter: Confirm, Countermand, Constrain with an option', async () => {
    const bridge = installIpc();
    const state = makeState({ stanceMatters: [matter()] });
    render(React.createElement(DirectiveCard, { directive: STANCE_DIRECTIVE, gameState: state }));
    fireEvent.click(screen.getByRole('button', { name: 'Countermand' }));
    await waitFor(() => expect(bridge.resolveStanceMatter).toHaveBeenCalledWith({ matterId: 'STANCE_11_arbih_2nd_corps', answer: 'countermand' }));
    fireEvent.click(screen.getByRole('button', { name: 'Constrain' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hold the line, no new offensives' }));
    await waitFor(() => expect(bridge.resolveStanceMatter).toHaveBeenCalledWith({ matterId: 'STANCE_11_arbih_2nd_corps', answer: 'constrain', constraint: 'ceiling_defensive' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(bridge.resolveStanceMatter).toHaveBeenCalledWith({ matterId: 'STANCE_11_arbih_2nd_corps', answer: 'confirm' }));
  });

  it('offers Confirm only inside the overrule window', () => {
    installIpc();
    const state = makeState({ stanceMatters: [matter({ countermandAllowed: false, constraintOptions: [] })] });
    render(React.createElement(DirectiveCard, { directive: STANCE_DIRECTIVE, gameState: state }));
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Countermand' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Constrain' })).toBeNull();
  });

  it('shows the orphaned stage-stance failure copy when the send fails', async () => {
    const bridge = { resolveStanceMatter: vi.fn(async () => ({ ok: false, error: 'overrule_window' })) };
    Object.defineProperty(window, 'awwv', { configurable: true, value: bridge });
    render(React.createElement(DirectiveCard, { directive: STANCE_DIRECTIVE, gameState: makeState({ stanceMatters: [matter()] }) }));
    fireEvent.click(screen.getByRole('button', { name: 'Countermand' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Could not send your stance decision.'));
  });
});

describe('stance matter: sector panel stance step', () => {
  it('shows who sets the OG stance, the OG matter with answers, and a hold', () => {
    installIpc();
    const og = matter({ id: 'STANCE_11_arbih_2nd_corps_og0', scope: 'og', sectorId: 'sector:arbih_2nd_corps:1', ogName: 'OG Majevica', fromStance: 'defend', toStance: 'active_defense', reason: 'enemy_massing', constraintOptions: ['no_active_defense', 'hold_no_counterattacks'] });
    const state = makeState({
      stanceMatters: [og],
      stanceHolds: [{ matterId: 'STANCE_8_x', scope: 'corps', corpsId: 'arbih_2nd_corps', sectorId: null, mode: 'ceiling', stance: 'balanced', allowed: [], effectiveFromTurn: 9, untilTurn: 12, suspendedTurn: null }],
    });
    render(React.createElement(SectorStanceStep, { sectorId: 'sector:arbih_2nd_corps:1', corpsId: 'arbih_2nd_corps', gameState: state }));
    expect(screen.getByText(/The OG's commanders set its stance/)).toBeTruthy();
    expect(screen.getByText('OG Majevica (2nd Corps): Defend to Active defense')).toBeTruthy();
    expect(screen.getByTestId('sector-stance-hold').textContent).toContain('at most Balanced by your order. Weeks left: 2.');
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeTruthy();
  });

  it('says plainly when nothing is waiting', () => {
    render(React.createElement(SectorStanceStep, { sectorId: 'sector:x:0', corpsId: 'x', gameState: makeState() }));
    expect(screen.getByText('No stance change is waiting for you here.')).toBeTruthy();
  });
});

describe('stance matter: inbox, Records, holds and BCS', () => {
  it('adds a non-blocking inbox row for an unanswered matter', () => {
    const items = deriveInboxItems(makeState({ stanceMatters: [matter()] }), {});
    const row = items.find((i) => i.type === 'stance_matter');
    expect(row?.severity).toBe('normal');
  });

  it('files every receipt in Records, with the delayed-countermand stance in force stated', () => {
    const line = stanceMatterReceiptLine({
      id: 'STANCE_11_c', turn: 11, scope: 'corps', corpsId: 'c', corpsName: 'Drina Corps', sectorId: null,
      fromStance: 'balanced', toStance: 'offensive', outcome: 'countermanded', resolvedTurn: 12, constraint: null,
      effectiveFromTurn: 14, untilTurn: 17, mainStaffDelayTurns: 2, patronShift: 0, notPutReason: null, lapseReason: null,
    });
    expect(line).toBe('Drina Corps: you countermanded the move from Balanced to Offensive. The order went out after a Main Staff delay, and Offensive stayed in force until then. Balanced was then held for 4 weeks.');
    expect(line).not.toMatch(/tried to/);
    const ledger = buildDecisionConsequenceLedger(makeState({
      stanceMatterHistory: [{
        id: 'STANCE_11_c', turn: 11, scope: 'corps', corpsId: 'c', corpsName: 'Drina Corps', sectorId: null,
        fromStance: 'balanced', toStance: 'offensive', outcome: 'stood', resolvedTurn: 12, constraint: null,
        effectiveFromTurn: null, untilTurn: null, mainStaffDelayTurns: 0, patronShift: 0, notPutReason: null, lapseReason: null,
      }],
    }));
    expect(ledger.some((r) => r.familyId === 'stance-matter' && r.outcome === 'Stood')).toBe(true);
  });

  it('describes a pending (Main Staff delayed) and a suspended hold', () => {
    const base = { matterId: 'm', scope: 'og' as const, corpsId: 'c', sectorId: 's', mode: 'fixed' as const, stance: 'defend', allowed: [], effectiveFromTurn: 14, untilTurn: 17, suspendedTurn: null };
    expect(stanceHoldLine(base, 12)).toContain('still with the Main Staff');
    expect(stanceHoldLine({ ...base, effectiveFromTurn: 10, suspendedTurn: 12 }, 12)).toContain('suspended');
  });

  it('has BCS copy for the card', () => {
    setLocale('bcs');
    const view = buildPresidentialDecisionRoomView({ state: makeState({ stanceMatters: [matter()] }) });
    const card = view.cards.find((c) => c.id === 'command:stance-matter:STANCE_11_arbih_2nd_corps');
    expect(card!.title).toBe('2nd Corps: Uravnoteženo u Ofanzivno');
    expect(card!.explanation).toContain('ostaje ako ne odgovorite');
  });
});
