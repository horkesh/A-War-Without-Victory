/**
 * Review item M3 (20261111 player-surface review): the 1st Corps' sector 0 read "OG Bileća"
 * in a turn-0 RBiH game. It was the single RBiH-held village op:bileca:zausje, cut off by RS
 * ground with no brigade in it, handed to the 1st Corps by partitionFrontEdges' island fallback.
 *
 * Owner ruling (2026-11-12): "Not a sector". A cut-off pocket with no friendly combat formation
 * forms no corps front sector (see tests/sector_unmanned_pocket_not_a_sector.test.ts).
 *
 * Pinned here against the real April 1992 RBiH start:
 * - no RBiH sector holds Zaušje (or the equally cut-off, brigade-less Gacko village gacko_2);
 * - the 1st Corps' first sector is a real, staffed front;
 * - every 1st Corps "OG <place>" names a municipality among the sector's own front OSIDs.
 */
import { describe, expect, test } from 'vitest';

import { startNewCampaign } from '../src/desktop/desktop_sim.js';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';
import { strictCompare } from '../src/state/validateGameState.js';

function placeToSlug(place: string): string {
    return place
        .replace(/đ/g, 'dj').replace(/Đ/g, 'Dj')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

const CUT_OFF_UNMANNED_VILLAGES = ['op:bileca:zausje', 'op:gacko:gacko_2'];

describe('turn-0 RBiH 1st Corps sectors (M3)', () => {
    test('cut-off brigade-less villages form no sector; first 1st Corps sector is a real front', async () => {
        const { state } = await startNewCampaign(process.cwd(), 'RBiH', 'apr_1992');

        const rawSectors = (state.military.corps_front_sectors ?? {}) as Record<string, {
            faction?: string;
            corps_id?: string;
            territory_osids?: string[];
            sub_segments?: Array<{ friendly_osids?: string[] }>;
        }>;
        for (const [sectorId, sector] of Object.entries(rawSectors)) {
            if (sector.faction !== 'RBiH') continue;
            const held = new Set([
                ...(sector.territory_osids ?? []),
                ...(sector.sub_segments ?? []).flatMap((ss) => ss.friendly_osids ?? []),
            ]);
            for (const village of CUT_OFF_UNMANNED_VILLAGES) {
                expect(held.has(village), `${sectorId} still holds ${village}`).toBe(false);
            }
        }

        const view = parseGameState(state);
        const sectors = (view.corpsFrontSectors ?? [])
            .filter((s) => s.corps_id === 'arbih_1st_corps')
            .sort((a, b) => strictCompare(a.sector_id, b.sector_id));
        expect(sectors.length).toBeGreaterThan(0);
        expect(sectors.some((s) => s.display_name === 'OG Bileća')).toBe(false);

        const first = sectors[0]!;
        const firstFront = new Set((first.sub_segments ?? []).flatMap((ss) => ss.friendly_osids));
        expect(first.assigned_brigade_ids.length, `${first.sector_id} has no brigade`).toBeGreaterThan(0);
        expect(firstFront.size).toBeGreaterThan(1);

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
