/**
 * Keeps the UI-only recruitment watch (data/recruitmentMatter.ts) in step with the
 * campaign on screen.
 *
 * - `refresh()` fetches the state-aware catalog and folds it into the watch. A result
 *   superseded by a newer refresh or by a campaign replacement is dropped ('stale').
 * - `campaignReplaced()` is called from the campaign-replacement coordinator's success
 *   callback, which every path shares (main-menu load and new war, Continue, desktop
 *   session replacements). It forgets the previous campaign's watch, including a matter
 *   the president set aside, and invalidates any fetch still in flight. Even a save at
 *   the same faction and turn therefore starts fresh. App then refreshes on the bumped
 *   `campaignViewportEpoch`.
 *
 * Canonical owner: src/ui/map/desktop/recruitmentWatchSync.ts
 */

import type { GameStore } from '../store/gameStore';
import type { FetchedRecruitmentCatalog } from './campaignRecruitmentActions';

type RecruitmentWatchStore = Pick<GameStore, 'loadedGameState' | 'observeRecruitmentCatalog' | 'resetRecruitmentWatch'>;

export interface RecruitmentWatchSyncDeps {
  fetchSnapshot: () => Promise<FetchedRecruitmentCatalog | null>;
  getStore: () => RecruitmentWatchStore;
}

export interface RecruitmentWatchSync {
  refresh: () => Promise<FetchedRecruitmentCatalog | null | 'stale'>;
  campaignReplaced: () => void;
}

export function createRecruitmentWatchSync({ fetchSnapshot, getStore }: RecruitmentWatchSyncDeps): RecruitmentWatchSync {
  let requestId = 0;
  return {
    async refresh() {
      const id = ++requestId;
      const snapshot = await fetchSnapshot();
      if (id !== requestId) return 'stale';
      const store = getStore();
      const faction = store.loadedGameState?.player_faction ?? null;
      if (snapshot && faction && snapshot.turn !== null && snapshot.autonomyLevel !== null) {
        store.observeRecruitmentCatalog({
          faction,
          turn: snapshot.turn,
          autonomyLevel: snapshot.autonomyLevel,
          brigades: snapshot.brigades,
        });
      }
      return snapshot;
    },
    campaignReplaced() {
      requestId += 1;
      getStore().resetRecruitmentWatch();
    },
  };
}
