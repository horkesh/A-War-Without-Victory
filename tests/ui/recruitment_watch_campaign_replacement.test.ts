/**
 * Recruitment watch across campaign replacements (#578 review, Codex finding at
 * App.tsx:1162). A save loaded at the same faction and turn as the current campaign must
 * start a fresh watch and still get a recruitment matter. The finding named two paths:
 * a main-menu load, and a desktop-session replacement that must not keep a matter the
 * previous campaign had set aside. Both go through the replacement coordinator's success
 * callback, which calls `recruitmentWatchSync.campaignReplaced()`; App re-fetches on the
 * bumped `campaignViewportEpoch`.
 */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { createRecruitmentWatchSync } from '../../src/ui/map/desktop/recruitmentWatchSync';
import type { FetchedRecruitmentCatalog } from '../../src/ui/map/desktop/campaignRecruitmentActions';
import { createCampaignReplacementCoordinator } from '../../src/ui/map/utils/campaignViewportLifecycle';
import { deriveRecruitmentMatter } from '../../src/ui/map/data/recruitmentMatter';
import { useGameStore } from '../../src/ui/map/store/gameStore';
import type { RecruitmentCatalogBrigade } from '../../src/ui/map/desktop/types';
import type { LoadedGameState } from '../../src/ui/map/data/types';

function brigade(id: string): RecruitmentCatalogBrigade {
  return {
    id, name: `${id} Brigade`, faction: 'RBiH', home_mun: 'visoko',
    capital_cost: 10, manpower_cost: 800, default_equipment_class: 'light',
    available_from: 0, mandatory: false, eligible: true, reason_codes: [],
  };
}

const SAME_TURN = 7;
const catalog: FetchedRecruitmentCatalog = { brigades: [brigade('a'), brigade('b')], turn: SAME_TURN, autonomyLevel: 0 };

function loaded(turn: number, label: string): LoadedGameState {
  return { label, turn, player_faction: 'RBiH', formations: [] } as unknown as LoadedGameState;
}

function currentMatter() {
  const s = useGameStore.getState();
  return deriveRecruitmentMatter(s.recruitmentWatch, {
    playerFaction: s.loadedGameState?.player_faction ?? null,
    turn: s.loadedGameState?.turn ?? null,
  });
}

function setup(fetchSnapshot: () => Promise<FetchedRecruitmentCatalog | null> = async () => catalog) {
  const sync = createRecruitmentWatchSync({ fetchSnapshot, getStore: () => useGameStore.getState() });
  // As App wires it: the coordinator's success callback forgets the watch.
  const coordinator = createCampaignReplacementCoordinator(() => sync.campaignReplaced(), () => true);
  return { sync, coordinator };
}

afterEach(() => {
  useGameStore.getState().resetRecruitmentWatch();
  useGameStore.setState({ loadedGameState: null });
});

describe('recruitment watch across campaign replacements', () => {
  it('a main-menu load at the same faction and turn starts a fresh watch and shows the matter again', async () => {
    const { sync, coordinator } = setup();
    useGameStore.setState({ loadedGameState: loaded(SAME_TURN, 'before') });
    await sync.refresh();
    expect(currentMatter()?.ready.map((b) => b.id)).toEqual(['a', 'b']);

    await coordinator.runReplacement(async () => { useGameStore.setState({ loadedGameState: loaded(SAME_TURN, 'loaded save') }); });
    expect(useGameStore.getState().recruitmentWatch).toBeNull();

    // App's effect re-fetches on the bumped campaignViewportEpoch.
    await sync.refresh();
    expect(currentMatter()?.mode).toBe('decision');
    expect(currentMatter()?.ready.map((b) => b.id)).toEqual(['a', 'b']);
  });

  it('a desktop replacement does not keep the previous campaign\'s set-aside matter', async () => {
    const { sync, coordinator } = setup();
    useGameStore.setState({ loadedGameState: loaded(SAME_TURN, 'before') });
    await sync.refresh();
    useGameStore.getState().setAsideRecruitmentMatter();
    expect(currentMatter()).toBeNull();

    const reservation = coordinator.reserveReplacement();
    await coordinator.runReplacement(
      async () => { useGameStore.setState({ loadedGameState: loaded(SAME_TURN, 'desktop replacement') }); },
      () => true,
      reservation,
    );
    await sync.refresh();
    expect(useGameStore.getState().recruitmentWatch?.setAsideIds).toEqual([]);
    expect(currentMatter()?.ready.map((b) => b.id)).toEqual(['a', 'b']);
  });

  it('a failed replacement keeps the current watch', async () => {
    const { sync, coordinator } = setup();
    useGameStore.setState({ loadedGameState: loaded(SAME_TURN, 'before') });
    await sync.refresh();
    useGameStore.getState().setAsideRecruitmentMatter();
    await coordinator.runReplacement(async () => false, (ok) => ok);
    expect(useGameStore.getState().recruitmentWatch?.setAsideIds).toEqual(['a', 'b']);
  });

  it('a catalog fetch still in flight when the campaign is replaced is dropped', async () => {
    let release: (value: FetchedRecruitmentCatalog) => void = () => {};
    const { sync, coordinator } = setup(() => new Promise((resolve) => { release = resolve; }));
    useGameStore.setState({ loadedGameState: loaded(SAME_TURN, 'before') });
    const inFlight = sync.refresh();
    await coordinator.runReplacement(async () => { useGameStore.setState({ loadedGameState: loaded(SAME_TURN, 'replacement') }); });
    release(catalog);
    expect(await inFlight).toBe('stale');
    expect(useGameStore.getState().recruitmentWatch).toBeNull();
  });

  it('App ties the reset to a successful replacement and refreshes on the campaign epoch', () => {
    const app = readFileSync('src/ui/map/App.tsx', 'utf8');
    const succeeded = app.slice(app.indexOf('const markCampaignReplacementSucceeded'), app.indexOf('const markCampaignReplacementSucceeded') + 700);
    expect(succeeded).toContain('recruitmentWatchSync.campaignReplaced();');
    expect(succeeded).toContain('setCampaignViewportEpoch((epoch) => epoch + 1);');
    expect(app).toContain('createCampaignReplacementCoordinator(\n      markCampaignReplacementSucceeded,');
    expect(app).toContain('useDesktopSession({ campaignReplacementOwner });');
    expect(app).toContain('recruitmentWatchGameOver, autonomyOpen, campaignViewportEpoch]);');
  });
});
