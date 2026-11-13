/**
 * Recruitment on the President's Desk (owner, 2026-11-12: "When a brigade is eligible for
 * recruitment, that should be put front and center to the president, not wait until he
 * visits recruitment tab.").
 *
 * Pins the UI-only watch (newly raisable, grouping, clearing when raised or lapsed, set
 * aside), the autonomy wording (decision at 0-1, staff notice at 2-3, EN + BCS), the
 * Home Front card and its Advance standing, the Desk item, and the routing that opens
 * Recruitment straight on the named brigade.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  advanceRecruitmentWatch,
  deriveRecruitmentMatter,
  setAsideRecruitmentMatter,
  type RecruitmentCatalogSnapshot,
  type RecruitmentWatch,
} from '../../src/ui/map/data/recruitmentMatter';
import { buildRecruitmentMatterCopy } from '../../src/ui/map/data/recruitmentMatterCopy';
import { buildPresidentialDecisionRoomView } from '../../src/ui/map/data/presidentialDecisionRoom';
import { buildPreAdvanceCommandReviewView } from '../../src/ui/map/data/preAdvanceCommandReview';
import { cardBelongsToPresidentialCommandCategory } from '../../src/ui/map/data/presidentialCategories';
import { withRecruitmentInboxItem } from '../../src/ui/map/data/inboxItems';
import { openPresidentialDecisionRoomNavigationTarget } from '../../src/ui/map/utils/presidentialDecisionRoomNavigation';
import type { ShellNavigationState } from '../../src/ui/map/utils/shellNavigation';
import { selectInitialRecruitmentBrigade } from '../../src/ui/map/components/RecruitmentModal';
import { useGameStore } from '../../src/ui/map/store/gameStore';
import { setLocale } from '../../src/ui/map/i18n';
import type { RecruitmentCatalogBrigade, RecruitmentEligibilityReason } from '../../src/ui/map/desktop/types';
import type { LoadedGameState } from '../../src/ui/map/data/types';

const MUNICIPALITIES = { visoko: 'Visoko', zepce: 'Žepče', kakanj: 'Kakanj', tesanj: 'Tešanj' };

function brigade(
  id: string,
  homeMun: string,
  options: { eligible?: boolean; reasons?: RecruitmentEligibilityReason[]; faction?: string; name?: string } = {},
): RecruitmentCatalogBrigade {
  return {
    id,
    name: options.name ?? `${id} Brigade`,
    faction: options.faction ?? 'RBiH',
    home_mun: homeMun,
    capital_cost: 10,
    manpower_cost: 800,
    default_equipment_class: 'light',
    available_from: 0,
    mandatory: false,
    eligible: options.eligible ?? true,
    reason_codes: options.reasons ?? [],
  };
}

const raised = (id: string, homeMun: string) => brigade(id, homeMun, { eligible: false, reasons: ['already_recruited'] });
const notYet = (id: string, homeMun: string) => brigade(id, homeMun, { eligible: false, reasons: ['not_yet_available'] });

function snapshot(turn: number, autonomyLevel: number, brigades: RecruitmentCatalogBrigade[]): RecruitmentCatalogSnapshot {
  return { faction: 'RBiH', turn, autonomyLevel, brigades };
}

function fold(...snapshots: RecruitmentCatalogSnapshot[]): RecruitmentWatch {
  let watch: RecruitmentWatch | null = null;
  for (const next of snapshots) watch = advanceRecruitmentWatch(watch, next);
  return watch!;
}

function matterAt(watch: RecruitmentWatch, turn = watch.turn) {
  return deriveRecruitmentMatter(watch, { playerFaction: 'RBiH', turn });
}

function makeState(turn: number): LoadedGameState {
  return {
    label: 'Test',
    turn,
    phase: 'war',
    formations: [],
    militiaPools: [],
    controlBySettlement: {},
    statusBySettlement: {},
    brigadeAorByFormationId: {},
    attackOrders: [],
    aorOrders: [],
    recentControlEvents: [],
    allControlEvents: [],
    displacementEventLog: [],
    battlesByOsid: {},
    movementsByOsid: {},
    supplyTransitionsByOsid: {},
    historicalEventsByTurn: [],
    pressureWarning: false,
    latestTurnSummary: null,
    turnSummaries: [],
    player_faction: 'RBiH',
  } as LoadedGameState;
}

afterEach(() => {
  setLocale('en', undefined);
  useGameStore.getState().resetRecruitmentWatch();
  useGameStore.getState().clearRecruitmentOpenRequest();
});

describe('recruitment watch: what is new', () => {
  it('announces everything raisable once on a fresh watch, in strictCompare id order', () => {
    const watch = fold(snapshot(4, 0, [brigade('b_zepce', 'zepce'), brigade('a_visoko', 'visoko'), notYet('c_kakanj', 'kakanj')]));
    const matter = matterAt(watch);
    expect(matter?.mode).toBe('decision');
    expect(matter?.ready.map((b) => b.id)).toEqual(['a_visoko', 'b_zepce']);
    expect(matter?.focusBrigadeId).toBe('a_visoko');
  });

  it('groups brigades that become raisable in the same week into one matter', () => {
    const watch = fold(
      snapshot(4, 0, [notYet('a', 'visoko'), notYet('b', 'zepce'), notYet('c', 'kakanj')]),
      snapshot(5, 0, [brigade('a', 'visoko'), brigade('b', 'zepce'), notYet('c', 'kakanj')]),
    );
    expect(watch.newlyEligibleIds).toEqual(['a', 'b']);
    const matter = matterAt(watch);
    expect(matter?.id).toBe('recruitment:decision');
    expect(matter?.ready).toHaveLength(2);
  });

  it('shows nothing when no brigade is raisable', () => {
    expect(matterAt(fold(snapshot(4, 0, [notYet('a', 'visoko'), raised('b', 'zepce')])))).toBeNull();
  });

  it('clears a brigade from the matter once it is raised, and the matter when none is left', () => {
    const watch = fold(
      snapshot(4, 0, [brigade('a', 'visoko'), brigade('b', 'zepce')]),
      snapshot(4, 0, [raised('a', 'visoko'), brigade('b', 'zepce')]),
    );
    expect(matterAt(watch)?.ready.map((b) => b.id)).toEqual(['b']);
    const after = advanceRecruitmentWatch(watch, snapshot(4, 0, [raised('a', 'visoko'), raised('b', 'zepce')]));
    expect(matterAt(after)).toBeNull();
  });

  it('clears a brigade that is no longer raisable (lost control, no manpower)', () => {
    const watch = fold(
      snapshot(4, 0, [brigade('a', 'visoko'), brigade('b', 'zepce')]),
      snapshot(5, 0, [brigade('a', 'visoko'), brigade('b', 'zepce', { eligible: false, reasons: ['no_control'] })]),
    );
    expect(matterAt(watch)?.ready.map((b) => b.id)).toEqual(['a']);
  });

  it('a same-week refresh never re-announces, and a set-aside brigade stays quiet until it lapses and returns', () => {
    const first = fold(snapshot(4, 0, [brigade('a', 'visoko')]));
    const setAside = setAsideRecruitmentMatter(first);
    expect(matterAt(setAside)).toBeNull();
    const refreshed = advanceRecruitmentWatch(setAside, snapshot(4, 0, [brigade('a', 'visoko')]));
    expect(matterAt(refreshed)).toBeNull();
    const nextWeek = advanceRecruitmentWatch(refreshed, snapshot(5, 0, [brigade('a', 'visoko')]));
    expect(matterAt(nextWeek)).toBeNull();
    const lapsed = advanceRecruitmentWatch(nextWeek, snapshot(6, 0, [brigade('a', 'visoko', { eligible: false, reasons: ['no_capital'] })]));
    const back = advanceRecruitmentWatch(lapsed, snapshot(7, 0, [brigade('a', 'visoko')]));
    expect(matterAt(back)?.ready.map((b) => b.id)).toEqual(['a']);
  });

  it('an undecided brigade stays on the desk week after week as the same single matter', () => {
    const watch = fold(snapshot(4, 0, [brigade('a', 'visoko')]), snapshot(5, 0, [brigade('a', 'visoko'), brigade('b', 'zepce')]));
    const matter = matterAt(watch);
    expect(matter?.ready.map((b) => b.id)).toEqual(['a', 'b']);
  });

  it('shows nothing for a watch from another week or faction (a snapshot still in flight)', () => {
    const watch = fold(snapshot(4, 0, [brigade('a', 'visoko')]));
    expect(deriveRecruitmentMatter(watch, { playerFaction: 'RBiH', turn: 5 })).toBeNull();
    expect(deriveRecruitmentMatter(watch, { playerFaction: 'RS', turn: 4 })).toBeNull();
  });

  it('ignores other factions in the catalog', () => {
    const watch = fold(snapshot(4, 0, [brigade('rs_a', 'zepce', { faction: 'RS' }), brigade('a', 'visoko')]));
    expect(matterAt(watch)?.ready.map((b) => b.id)).toEqual(['a']);
  });
});

describe('recruitment watch: staff notice at Delegated and Observer', () => {
  it('reports what the staff raised since last week and what is newly ready', () => {
    const watch = fold(
      snapshot(4, 2, [brigade('a', 'visoko'), notYet('b', 'zepce'), brigade('c', 'kakanj')]),
      snapshot(5, 2, [raised('a', 'visoko'), brigade('b', 'zepce'), brigade('c', 'kakanj')]),
    );
    const matter = matterAt(watch);
    expect(matter?.mode).toBe('notice');
    expect(matter?.raised.map((b) => b.id)).toEqual(['a']);
    expect(matter?.ready.map((b) => b.id)).toEqual(['b']);
    expect(matter?.focusBrigadeId).toBe('b');
  });

  it('a raise the president made last week is not reported as the staff', () => {
    const watch = fold(
      snapshot(4, 2, [brigade('a', 'visoko')]),
      snapshot(4, 2, [raised('a', 'visoko')]),
      snapshot(5, 2, [raised('a', 'visoko')]),
    );
    expect(matterAt(watch)).toBeNull();
  });

  it('is a weekly notice: a quiet week has none, and Noted hides it', () => {
    const quiet = fold(snapshot(4, 3, [brigade('a', 'visoko')]), snapshot(5, 3, [brigade('a', 'visoko')]));
    expect(matterAt(quiet)).toBeNull();
    const busy = fold(snapshot(4, 3, [notYet('a', 'visoko')]), snapshot(5, 3, [brigade('a', 'visoko')]));
    expect(matterAt(busy)?.mode).toBe('notice');
    expect(matterAt(setAsideRecruitmentMatter(busy))).toBeNull();
  });

  it('switching to Full Control turns the still-raisable brigades into a decision', () => {
    const delegated = fold(snapshot(4, 2, [brigade('a', 'visoko')]));
    const full = advanceRecruitmentWatch(delegated, snapshot(4, 0, [brigade('a', 'visoko')]));
    expect(matterAt(full)?.mode).toBe('decision');
  });
});

describe('recruitment matter wording', () => {
  it('names the brigade, where it would form and its cost, and says recruitment is the president\'s', () => {
    const matter = matterAt(fold(snapshot(4, 0, [brigade('a', 'zepce', { name: '111th Brigade' })])))!;
    const copy = buildRecruitmentMatterCopy(matter, MUNICIPALITIES);
    expect(copy.title).toBe('111th Brigade can be raised');
    expect(copy.summary).toBe('Forms in Žepče. Cost: 800 manpower, 10 capital.');
    expect(copy.explanation).toContain('At Full Control, recruitment stays yours');
    expect(copy.facts).toEqual(['111th Brigade: forms in Žepče. Cost: 800 manpower, 10 capital.']);
    expect(copy.primaryActionLabel).toBe('Open Recruitment');
  });

  it('uses the Assisted label at autonomy 1 and the staff wording at 2 and 3', () => {
    const assisted = matterAt(fold(snapshot(4, 1, [brigade('a', 'visoko')])))!;
    expect(buildRecruitmentMatterCopy(assisted, MUNICIPALITIES).explanation).toContain('At Assisted, recruitment stays yours');
    const delegated = matterAt(fold(snapshot(4, 2, [brigade('a', 'visoko', { name: '7th Brigade' })])))!;
    const delegatedCopy = buildRecruitmentMatterCopy(delegated, MUNICIPALITIES);
    expect(delegatedCopy.title).toBe('7th Brigade is ready to be raised');
    expect(delegatedCopy.explanation).toContain('At Delegated, your staff raises brigades without asking');
    expect(delegatedCopy.primaryActionLabel).toBe('View in Recruitment');
    const observer = matterAt(fold(snapshot(4, 3, [notYet('a', 'visoko')]), snapshot(5, 3, [raised('a', 'visoko')])))!;
    expect(buildRecruitmentMatterCopy(observer, MUNICIPALITIES).title).toBe('Staff raised a Brigade');
  });

  it('summarises a long list with "and N more"', () => {
    const matter = matterAt(fold(snapshot(4, 0, ['a', 'b', 'c', 'd', 'e'].map((id) => brigade(id, 'visoko', { name: id.toUpperCase() })))))!;
    const copy = buildRecruitmentMatterCopy(matter, MUNICIPALITIES);
    expect(copy.title).toBe('5 brigades can be raised');
    expect(copy.summary).toBe('A, B, C and 2 more.');
  });

  it('speaks BCS with diacritics and falls back to a readable municipality name', () => {
    setLocale('bcs', undefined);
    const matter = matterAt(fold(snapshot(4, 0, [brigade('a', 'han_pijesak', { name: 'Test brigada' })])))!;
    const copy = buildRecruitmentMatterCopy(matter, MUNICIPALITIES);
    // Brigade names go through the BCS formation-name localizer (generic names lower-cased).
    expect(copy.title).toBe('Može se formirati: test brigada');
    expect(copy.summary).toBe('Mjesto formiranja: Han Pijesak. Cijena: ljudstvo 800, kapital 10.');
    expect(copy.explanation).toContain('„Puna kontrola”');
    expect(copy.setAsideLabel).toBe('Ne sada');
    const delegated = matterAt(fold(snapshot(4, 2, [notYet('a', 'visoko')]), snapshot(5, 2, [raised('a', 'visoko')])))!;
    expect(buildRecruitmentMatterCopy(delegated, MUNICIPALITIES).title).toBe('Štab je formirao: a brigada');
  });
});

describe('recruitment matter on the Command Surface and the Desk', () => {
  it('is one Home Front decision card, recommended before Advance but never blocking', () => {
    const matter = matterAt(fold(snapshot(4, 0, [brigade('a', 'visoko'), brigade('b', 'zepce')])));
    const view = buildPresidentialDecisionRoomView({ state: makeState(4), recruitmentMatter: matter, municipalityNames: MUNICIPALITIES });
    const cards = view.cards.filter((card) => card.id.startsWith('recruitment:'));
    expect(cards).toHaveLength(1);
    const card = cards[0]!;
    expect(card.priorityBand).toBe('recommended');
    expect(cardBelongsToPresidentialCommandCategory(card, 'cat_home_front')).toBe(true);
    expect(cardBelongsToPresidentialCommandCategory(card, 'cat_command')).toBe(false);
    expect(card.sourceHandoffTarget).toEqual({ kind: 'recruitment', brigadeId: 'a' });
    const review = buildPreAdvanceCommandReviewView({ state: makeState(4), recruitmentMatter: matter, municipalityNames: MUNICIPALITIES });
    expect(review.items.map((item) => item.id)).toContain('recruitment:decision');
    expect(review.status).not.toBe('blocked');
  });

  it('the staff notice is a Home Front watch item outside the Advance review', () => {
    const matter = matterAt(fold(snapshot(4, 2, [notYet('a', 'visoko')]), snapshot(5, 2, [raised('a', 'visoko')])));
    const view = buildPresidentialDecisionRoomView({ state: makeState(5), recruitmentMatter: matter });
    const card = view.cards.find((entry) => entry.id === 'recruitment:notice')!;
    expect(card.priorityBand).toBe('monitor');
    expect(cardBelongsToPresidentialCommandCategory(card, 'cat_home_front')).toBe(true);
    const review = buildPreAdvanceCommandReviewView({ state: makeState(5), recruitmentMatter: matter });
    expect(review.items.map((item) => item.id)).not.toContain('recruitment:notice');
  });

  it('builders without a matter are unchanged', () => {
    const view = buildPresidentialDecisionRoomView({ state: makeState(4) });
    expect(view.cards.some((card) => card.id.startsWith('recruitment:'))).toBe(false);
  });

  it('adds one Desk item that routes to Recruitment', () => {
    const matter = matterAt(fold(snapshot(4, 0, [brigade('a', 'visoko', { name: 'Guards' })])));
    const items = withRecruitmentInboxItem([], matter, MUNICIPALITIES, 4);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'recruitment:decision',
      type: 'recruitment',
      action: 'recruitment',
      priorityBand: 'recommended',
      title: 'Guards can be raised',
      actionLabel: 'Open Recruitment',
    });
    expect(withRecruitmentInboxItem([], null, MUNICIPALITIES, 4)).toEqual([]);
  });
});

describe('opening Recruitment on the named brigade', () => {
  it('routes the recruitment target to the store request with the brigade id', () => {
    const requestRecruitmentOpen = vi.fn();
    const state = { requestRecruitmentOpen } as unknown as ShellNavigationState;
    expect(openPresidentialDecisionRoomNavigationTarget({ kind: 'recruitment', brigadeId: 'arbih_guards' }, state)).toBe(true);
    expect(requestRecruitmentOpen).toHaveBeenCalledWith('arbih_guards');
  });

  it('the store request is distinct per click and clears once consumed', () => {
    const store = useGameStore.getState();
    store.requestRecruitmentOpen('a');
    const first = useGameStore.getState().recruitmentOpenRequest;
    store.requestRecruitmentOpen('a');
    const second = useGameStore.getState().recruitmentOpenRequest;
    expect(first?.brigadeId).toBe('a');
    expect(second?.seq).toBe((first?.seq ?? 0) + 1);
    store.clearRecruitmentOpenRequest();
    expect(useGameStore.getState().recruitmentOpenRequest).toBeNull();
  });

  it('the modal opens on the requested brigade, or the first raisable one when it is gone', () => {
    const eligible = [brigade('a', 'visoko'), brigade('b', 'zepce')];
    expect(selectInitialRecruitmentBrigade(eligible, 'b')?.id).toBe('b');
    expect(selectInitialRecruitmentBrigade(eligible, 'raised_meanwhile')?.id).toBe('a');
    expect(selectInitialRecruitmentBrigade(eligible, null)?.id).toBe('a');
  });

  it('the store folds snapshots and set-aside through the same pure watch', () => {
    const store = useGameStore.getState();
    store.observeRecruitmentCatalog(snapshot(4, 0, [brigade('a', 'visoko')]));
    expect(useGameStore.getState().recruitmentWatch?.pendingIds).toEqual(['a']);
    useGameStore.getState().setAsideRecruitmentMatter();
    expect(useGameStore.getState().recruitmentWatch?.pendingIds).toEqual([]);
    expect(useGameStore.getState().recruitmentWatch?.setAsideIds).toEqual(['a']);
  });
});
