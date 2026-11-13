/**
 * OG stance carry-over across sector rebuilds.
 *
 * Front sectors are rebuilt twice a turn (the turn's partition step and the post-combat
 * final reconciliation), and the builders create every sector with stance 'defend' /
 * source 'bot'. Without this, every reader between a rebuild and the next corps commander
 * pass (sector intel's patrol sources, the turn-end save, the president's map) saw 'defend'
 * for every OG whatever it was actually doing.
 *
 * A rebuilt sector takes the stance and source of the previous sector with the same
 * `stableSectorKey` (corps id + smallest edge id: content, not the per-turn sector number).
 * A sector with no previous match keeps the builder's default. Deterministic: lookups by key;
 * the result does not depend on iteration order.
 */

import type { CorpsFrontSector } from '../../state/game_state.js';
import { stableSectorKey } from './sector_intel.js';

export function carrySectorStances(
    previous: Readonly<Record<string, CorpsFrontSector>> | undefined,
    next: Record<string, CorpsFrontSector>,
): void {
    if (!previous) return;
    const byKey = new Map<string, Pick<CorpsFrontSector, 'sector_stance' | 'stance_source'>>();
    for (const sector of Object.values(previous)) {
        if (!sector) continue;
        byKey.set(stableSectorKey(sector), { sector_stance: sector.sector_stance, stance_source: sector.stance_source });
    }
    for (const sector of Object.values(next)) {
        if (!sector) continue;
        const carried = byKey.get(stableSectorKey(sector));
        if (!carried) continue;
        sector.sector_stance = carried.sector_stance;
        sector.stance_source = carried.stance_source;
    }
}
