/**
 * Review item M3 (20261111 player-surface review): the 1st Corps' sector 0 reads "OG Bileća"
 * in a turn-0 RBiH game.
 *
 * Pinned finding: the label is geographically TRUE. sector:arbih_1st_corps:0 is the single
 * RBiH-held village op:bileca:zausje, an island surrounded by RS ground with no brigade in it.
 * mapOsidsToCorps leaves it unmapped (no brigade home, no friendly path), and
 * partitionFrontEdges' island fallback (bfsNearestClaimedCorps) hands its front edges to the
 * corps owning the hop-nearest claimed OSID (op:gacko:bahori, claimed by the 1st Corps from its
 * Foča/Goražde brigades). Whether such islands should belong to the 1st or 4th Corps, or be shown
 * as an OG at all, is a sim-side/design question and is NOT changed here.
 *
 * Invariant pinned for every 1st Corps sector: the adapter's fallback "OG <municipality>" names a
 * municipality that actually appears among the sector's own front-line friendly OSIDs, so the
 * label always says where the sector really is.
 */
import { describe, expect, test } from 'vitest';

import { startNewCampaign } from '../src/desktop/desktop_sim.js';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';

function placeToSlug(place: string): string {
    return place
        .replace(/đ/g, 'dj').replace(/Đ/g, 'Dj')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

describe('turn-0 RBiH 1st Corps sector names (M3)', () => {
    test('sector names point at the sector\'s own municipalities; sector 0 is the Zaušje island', async () => {
        const { state } = await startNewCampaign(process.cwd(), 'RBiH', 'apr_1992');
        const view = parseGameState(state);
        const sectors = (view.corpsFrontSectors ?? []).filter((s) => s.corps_id === 'arbih_1st_corps');
        expect(sectors.length).toBeGreaterThan(0);

        const sector0 = sectors.find((s) => s.sector_id === 'sector:arbih_1st_corps:0');
        expect(sector0).toBeDefined();
        const sector0Friendly = (sector0!.sub_segments ?? []).flatMap((ss) => ss.friendly_osids);
        expect([...new Set(sector0Friendly)]).toEqual(['op:bileca:zausje']);
        expect(sector0!.assigned_brigade_ids).toEqual([]);
        expect(sector0!.display_name).toBe('OG Bileća');

        for (const sector of sectors) {
            const name = sector.display_name;
            if (!name.startsWith('OG ')) continue;
            const munSlugs = new Set(
                (sector.sub_segments ?? [])
                    .flatMap((ss) => ss.friendly_osids)
                    .map((osid) => osid.split(':')[1])
                    .filter((slug): slug is string => typeof slug === 'string'),
            );
            const namedSlug = placeToSlug(name.slice(3));
            // Attested designations (e.g. "OG 6") carry no municipality; only check place names.
            if (/^\d/.test(namedSlug)) continue;
            expect(munSlugs.has(namedSlug), `${sector.sector_id} "${name}" vs ${[...munSlugs].join(',')}`).toBe(true);
        }
    }, 300_000);
});
