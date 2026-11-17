// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { preloadTurnAftermathRecordFace, TurnAftermathModal } from '../../src/ui/map/components/TurnAftermathModal.js';

// The full record is its own chunk; load it once so record renders stay synchronous.
beforeAll(async () => { await preloadTurnAftermathRecordFace(); });
import {
  buildTurnAftermathDigest,
  buildTurnAftermathDispatch,
  TURN_AFTERMATH_DISPATCH_MAX_LINES,
  type TurnAftermathView,
} from '../../src/ui/map/data/turnAftermath.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import { withoutComments } from '../helpers/sourceComments';

/**
 * Command loop L2 (proposal §4 2B, 2026-11-14): the turn aftermath opens on a compact
 * "This week" dispatch. At most six lines, empty lines left out, a quiet week in two
 * lines built from the week's own figures, the full record one click away.
 */

function quietView(overrides: Partial<TurnAftermathView> = {}): TurnAftermathView {
  return {
    turn: 20,
    dateLabel: '19 Aug 1992',
    playerFaction: 'RBiH',
    headline: 'Quiet',
    narrativeLine: 'Quiet',
    tone: 'quiet',
    territory: { friendlyNet: 0, gains: 0, losses: 0, breakdownComplete: true, notable: [] },
    combat: { battleCount: 0, friendlyBattleCount: 0, friendlyCasualties: 0, opposingCasualties: 0, territoryFlipsFromBattles: 0 },
    humanitarian: { displacedThisTurn: 0 },
    formations: { spawned: 0, destroyed: 0, ownSpawned: 0, ownDestroyed: 0 },
    supply: { ownSupplyDelta: 0, ownHeavyMunitionsDelta: 0 },
    cost: {
      friendlyMilitaryCasualties: 0,
      theaterMilitaryCasualties: 0,
      displacedThisTurn: 0,
      ownFormationsDestroyed: 0,
      ownSupplySpent: 0,
      ownHeavyMunitionsSpent: 0,
      severity: 'low',
      reasons: [],
    },
    signals: [],
    commandRecord: { directives: [], rows: [] },
    judgment: { headline: 'Quiet', detail: 'Quiet', memoryTone: 'quiet', primarySurface: 'records', secondarySurface: 'codex' },
    nextActions: {
      actionableCount: 0,
      blockingCount: 0,
      opportunityCount: 0,
      reserveCount: 0,
      officerCount: 0,
      eventDecisionCount: 0,
      peaceCount: 0,
      topItems: [],
    },
    ...overrides,
  };
}

function busyView(): TurnAftermathView {
  const base = quietView();
  return quietView({
    tone: 'gain',
    territory: {
      friendlyNet: 2,
      gains: 3,
      losses: 1,
      breakdownComplete: true,
      notable: [
        { osid: 'op:b', label: 'Turbe', direction: 'gain', significance: 'corridor', from: 'RS', to: 'RBiH' },
        { osid: 'op:z', label: 'Vozuća', direction: 'loss', significance: 'generic', from: 'RBiH', to: 'RS' },
        { osid: 'op:a', label: 'Kulen Vakuf', direction: 'gain', significance: 'corridor', from: 'RS', to: 'RBiH' },
        { osid: 'op:c', label: 'Maglaj', direction: 'gain', significance: 'urban', from: 'RS', to: 'RBiH' },
        { osid: 'op:o', label: 'Elsewhere', direction: 'other', significance: 'generic', from: 'RS', to: 'HRHB' },
      ],
    },
    combat: { battleCount: 9, friendlyBattleCount: 4, friendlyCasualties: 120, opposingCasualties: 310, territoryFlipsFromBattles: 3 },
    humanitarian: { displacedThisTurn: 900, hotspotLabel: 'Doboj' },
    formations: { spawned: 1, destroyed: 1, ownSpawned: 0, ownDestroyed: 1 },
    cost: { ...base.cost, friendlyMilitaryCasualties: 120, displacedThisTurn: 900, ownFormationsDestroyed: 1, ownSupplySpent: 8, ownHeavyMunitionsSpent: 4, severity: 'critical' },
    commandRecord: {
      directives: [],
      rows: [
        { id: 'c1', corpsName: '1st Corps', officerName: 'A', assignedRole: 'Primary', interpretation: 'as_issued', interpretationDetail: '', action: '', actionDetail: '' },
        { id: 'c2', corpsName: '2nd Corps', officerName: 'B', assignedRole: 'Contain', interpretation: 'reinterpreted', interpretationDetail: '', action: '', actionDetail: '' },
      ],
    },
    nextActions: {
      ...base.nextActions,
      actionableCount: 3,
      blockingCount: 1,
      topItems: [{
        id: 'item:1', type: 'event_decision', severity: 'blocking', title: 'Paramilitary request', detail: 'Srebrenica sector',
        action: { kind: 'open_event' } as never, actionLabel: 'Decide',
      }],
    },
  });
}

function renderModal(view: TurnAftermathView, extra: Record<string, unknown> = {}) {
  const props = {
    isOpen: true,
    view,
    onClose: vi.fn(),
    onOpenInbox: vi.fn(),
    onOpenSummary: vi.fn(),
    onOpenRecords: vi.fn(),
    onOpenChronicle: vi.fn(),
    onOpenCodex: vi.fn(),
    ...extra,
  };
  render(createElement(TurnAftermathModal, props));
  return props;
}

describe('turn aftermath dispatch builder', () => {
  beforeEach(() => setLocale('en'));
  afterEach(() => setLocale('en'));

  it('gives a quiet week two lines built from the week figures', () => {
    const dispatch = buildTurnAftermathDispatch({
      view: quietView({ supply: { ownSupplyDelta: 4, ownHeavyMunitionsDelta: -1 }, formations: { spawned: 2, destroyed: 0, ownSpawned: 2, ownDestroyed: 0 } }),
    });
    expect(dispatch.quiet).toBe(true);
    expect(dispatch.lines).toHaveLength(1);
    expect(dispatch.lines[0].kind).toBe('quiet');
    expect(dispatch.lines[0].text).toContain('Supply +4, heavy munitions -1.');
    expect(dispatch.lines[0].text).toContain('2 new formations joined the order of battle.');
    // A formation raised outranks the quiet headline in the fixed order.
    expect(dispatch.headline).toBe('2 new formations were raised');
  });

  it('changes the quiet line when the week figures change', () => {
    const steady = buildTurnAftermathDispatch({ view: quietView() }).lines[0].text;
    const moved = buildTurnAftermathDispatch({ view: quietView({ supply: { ownSupplyDelta: -3, ownHeavyMunitionsDelta: 0 } }) }).lines[0].text;
    expect(steady).toContain('Supply and munitions held steady.');
    expect(moved).toContain('Supply -3, heavy munitions 0.');
    expect(moved).not.toBe(steady);
  });

  it('builds the busy dispatch in a fixed order, capped at six lines with the headline', () => {
    const dispatch = buildTurnAftermathDispatch({
      view: busyView(),
      consequences: [{ id: 'r1' }],
      forcedOps: [{ id: 'f1', opName: 'Operation Test', outcome: 'partial' }],
    });
    expect(dispatch.quiet).toBe(false);
    expect(dispatch.headline).toBe('We took 2 settlements');
    expect(dispatch.headlineKind).toBe('territory');
    expect(dispatch.lines.map((line) => line.kind)).toEqual(['ground', 'fighting', 'cost', 'orders', 'needs']);
    expect(dispatch.lines.length).toBeLessThanOrEqual(TURN_AFTERMATH_DISPATCH_MAX_LINES);
    const [ground, fighting, cost, orders, needs] = dispatch.lines;
    expect(ground.text).toBe('Net +2 settlements (3 taken, 1 lost)');
    expect(ground.places?.map((place) => place.label)).toEqual(['Kulen Vakuf', 'Maglaj', 'Turbe']);
    expect(fighting.text).toBe('We fought in 4 of 9 battles · our losses 120, theirs 310');
    expect(fighting.basis).toBe('battle reports');
    expect(cost.text).toBe('900 people displaced, most around Doboj · 1 formation lost · 12 supply spent');
    expect(orders.text).toContain('Operation Test, launched over objection: partial');
    expect(orders.text).toContain('Corps orders carried out as issued: 1; reinterpreted: 1');
    expect(orders.text).toContain('A consequence you were warned about arrived');
    expect(needs.text).toBe('1 required · 2 recommended');
    expect(dispatch.lines.every((line) => line.kind === 'orders' || line.kind === 'needs' || Boolean(line.basis))).toBe(true);
  });

  it('leaves out a line with nothing to report and keeps supply below the threshold out of the cost line', () => {
    const view = busyView();
    view.humanitarian = { displacedThisTurn: 0 };
    view.cost = { ...view.cost, displacedThisTurn: 0, ownFormationsDestroyed: 0, ownSupplySpent: 5, ownHeavyMunitionsSpent: 4 };
    view.commandRecord = { directives: [], rows: [] };
    const kinds = buildTurnAftermathDispatch({ view }).lines.map((line) => line.kind);
    expect(kinds).toEqual(['ground', 'fighting', 'needs']);
  });

  it('chooses the headline in the order territory, formations, decisions', () => {
    const formations = quietView({ formations: { spawned: 1, destroyed: 1, ownSpawned: 0, ownDestroyed: 1 }, cost: { ...quietView().cost, ownFormationsDestroyed: 1 } });
    formations.nextActions = { ...formations.nextActions, actionableCount: 2, blockingCount: 2 };
    expect(buildTurnAftermathDispatch({ view: formations }).headline).toBe('One of our formations was destroyed');
    const decisions = quietView();
    decisions.nextActions = { ...decisions.nextActions, actionableCount: 2, blockingCount: 2 };
    expect(buildTurnAftermathDispatch({ view: decisions }).headline).toBe('2 decisions are required before next week');
  });

  it('is deterministic whatever order the notable flips arrive in', () => {
    const forward = busyView();
    const reversed = busyView();
    reversed.territory = { ...reversed.territory, notable: [...reversed.territory.notable].reverse() };
    expect(buildTurnAftermathDispatch({ view: reversed })).toEqual(buildTurnAftermathDispatch({ view: forward }));
  });

  it('feeds the strip digest from the dispatch headline', () => {
    expect(buildTurnAftermathDigest(busyView())).toEqual({ headline: 'We took 2 settlements' });
  });

  it('renders the dispatch in BCS', () => {
    setLocale('bcs');
    const dispatch = buildTurnAftermathDispatch({ view: busyView() });
    expect(dispatch.headline).toBe('Zauzeta naselja: 2');
    expect(dispatch.lines.find((line) => line.kind === 'needs')?.text).toBe('obavezno 1 · preporučeno 2');
  });
});

describe('TurnAftermathModal dispatch face', () => {
  beforeEach(() => {
    setLocale('en');
    useGameStore.setState(useGameStore.getInitialState());
  });
  afterEach(() => {
    cleanup();
    setLocale('en');
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('opens on the dispatch with the full record one click away and back', () => {
    renderModal(busyView());
    expect(screen.getByTestId('turn-aftermath-dispatch')).toBeTruthy();
    expect(screen.getByText('This week')).toBeTruthy();
    expect(screen.getByTestId('turn-aftermath-dispatch-headline').textContent).toBe('We took 2 settlements');
    expect(screen.queryByText('Command Desk')).toBeNull();

    fireEvent.click(screen.getByTestId('turn-aftermath-full-record'));
    expect(screen.queryByTestId('turn-aftermath-dispatch')).toBeNull();
    expect(screen.getByText('Command Desk')).toBeTruthy();

    fireEvent.click(screen.getByTestId('turn-aftermath-back-to-dispatch'));
    expect(screen.getByTestId('turn-aftermath-dispatch')).toBeTruthy();
  });

  it('renders a quiet week as two lines', () => {
    renderModal(quietView());
    const body = screen.getByTestId('turn-aftermath-dispatch');
    expect(body.getAttribute('data-dispatch-quiet')).toBe('true');
    expect(screen.getByTestId('turn-aftermath-dispatch-headline').textContent).toBe('A quiet week on our fronts');
    expect(body.querySelectorAll('li')).toHaveLength(1);
  });

  it('hands a named place to the owner\'s field-inspection route', () => {
    const onShowOnMap = vi.fn();
    renderModal(busyView(), { onShowOnMap });
    const buttons = screen.getAllByTestId('turn-aftermath-dispatch-show-on-map');
    expect(buttons).toHaveLength(3);
    fireEvent.click(buttons[0]);
    expect(onShowOnMap).toHaveBeenCalledWith('op:a');
  });

  it('routes "Show on map" through the field-inspection handoff that activates the map', () => {
    // Codex review on #643: from the Warroom a direct pan hits an inactive map. App must
    // use the same handoff as the command palette, which leaves the Warroom first.
    const app = withoutComments(readFileSync('src/ui/map/App.tsx', 'utf8'));
    const start = app.indexOf('onShowOnMap={(osid) => {');
    expect(start).toBeGreaterThan(0);
    const handler = app.slice(start, app.indexOf('}}', start));
    expect(handler).toContain("inspectOnField(useGameStore.getState(), { kind: 'field-settlement', osid })");
    expect(handler).toContain('leaveWarroomForGame()');
  });

  it('hides "Show on map" when no owner route is given', () => {
    renderModal(busyView());
    expect(screen.getAllByTestId('turn-aftermath-dispatch-place')).toHaveLength(3);
    expect(screen.queryByTestId('turn-aftermath-dispatch-show-on-map')).toBeNull();
  });

  it('opens the review list from the "Needs you" line', () => {
    const props = renderModal(busyView());
    fireEvent.click(screen.getByTestId('turn-aftermath-dispatch-review'));
    expect(props.onOpenInbox).toHaveBeenCalledOnce();
  });

  it('starts on the dispatch again when the report reopens', () => {
    const view = busyView();
    const props = {
      isOpen: true, view, onClose: vi.fn(), onOpenInbox: vi.fn(), onOpenSummary: vi.fn(),
      onOpenRecords: vi.fn(), onOpenChronicle: vi.fn(), onOpenCodex: vi.fn(),
    };
    const { rerender } = render(createElement(TurnAftermathModal, props));
    fireEvent.click(screen.getByTestId('turn-aftermath-full-record'));
    rerender(createElement(TurnAftermathModal, { ...props, isOpen: false }));
    rerender(createElement(TurnAftermathModal, { ...props, isOpen: true }));
    expect(screen.getByTestId('turn-aftermath-dispatch')).toBeTruthy();
  });

  it('keeps monospace out of the report text', () => {
    for (const file of ['src/ui/map/components/TurnAftermathModal.tsx', 'src/ui/map/components/TurnAftermathRecordFace.tsx']) {
      expect(withoutComments(readFileSync(file, 'utf8'))).not.toContain('font-mono');
    }
  });

  it('keeps the full record out of the entry bundle', () => {
    const modal = withoutComments(readFileSync('src/ui/map/components/TurnAftermathModal.tsx', 'utf8'));
    expect(modal).toContain("import('./TurnAftermathRecordFace')");
    expect(modal).not.toMatch(/^import \{[^}]*\} from '\.\/TurnAftermathRecordFace'/m);
  });
});
