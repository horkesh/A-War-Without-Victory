/**
 * Review item M3 (20261111 player-surface review): the 1st Corps' sector 0 read "OG Bileća" in a
 * turn-0 RBiH game. It is the single RBiH-held village op:bileca:zausje, cut off by RS ground with
 * no brigade in it. The ENGINE keeps building that sector exactly as main does (the engine variant
 * was measured at 188w and shelved; see PROJECT_LEDGER 2026-11-12).
 *
 * Owner rulings (2026-11-12), delivered in the view only:
 * - "OG is supposed to be operating group, grouping of brigades." A brigade-less sector is never
 *   named as an OG: it reads "Unheld front near <place>".
 * - "If it's an isolated pocket, ie one that is unreachable, then it should automatically not be
 *   an OG." With the OSID adjacency, an unreachable brigade-less pocket is left out of every corps
 *   list (hiddenIsolatedPocketSectorIds), not merely renamed.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { startNewCampaign } from '../src/desktop/desktop_sim.js';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';
import { strictCompare } from '../src/state/validateGameState.js';

/** Same construction as DataLoader.loadOsidAdjacency (every contact-graph edge, both ways). */
function loadContactAdjacency(): Map<string, string[]> {
    const payload = JSON.parse(readFileSync(join(process.cwd(), 'data/derived/operational/operational_contact_graph.json'), 'utf8')) as { edges: Array<{ a: string; b: string }> };
    const adj = new Map<string, string[]>();
    for (const edge of payload.edges) {
        if (!edge.a || !edge.b) continue;
        const listA = adj.get(edge.a) ?? []; if (!listA.includes(edge.b)) listA.push(edge.b); adj.set(edge.a, listA);
        const listB = adj.get(edge.b) ?? []; if (!listB.includes(edge.a)) listB.push(edge.a); adj.set(edge.b, listB);
    }
    return adj;
}

function placeToSlug(place: string): string {
    return place
        .replace(/đ/g, 'dj').replace(/Đ/g, 'Dj')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

describe('turn-0 RBiH 1st Corps sectors (M3, presentation only)', () => {
    test('engine unchanged; Zaušje is an unheld front without adjacency and hidden with it', async () => {
        const { state } = await startNewCampaign(process.cwd(), 'RBiH', 'apr_1992');

        // Engine: the sector still exists exactly as on main.
        const raw = (state.military.corps_front_sectors ?? {}) as Record<string, { sub_segments?: Array<{ friendly_osids?: string[] }> }>;
        const zausjeFront = (raw['sector:arbih_1st_corps:0']?.sub_segments ?? []).flatMap((ss) => ss.friendly_osids ?? []);
        expect([...new Set(zausjeFront)]).toEqual(['op:bileca:zausje']);

        // View without adjacency: renamed, never an OG.
        const plain = parseGameState(state);
        const plainZausje = plain.corpsFrontSectors?.find((s) => s.sector_id === 'sector:arbih_1st_corps:0');
        expect(plainZausje?.display_name).toBe('Unheld front near Bileća');
        expect(plainZausje?.unheld_front).toBe(true);
        expect(plain.hiddenIsolatedPocketSectorIds).toBeUndefined();

        // View with adjacency: unreachable brigade-less pockets are not listed at all.
        const view = parseGameState(state, { osidAdjacency: loadContactAdjacency() });
        const hidden = view.hiddenIsolatedPocketSectorIds ?? [];
        expect(hidden).toContain('sector:arbih_1st_corps:0');
        expect(hidden).toContain('sector:arbih_1st_corps:6'); // op:gacko:gacko_2, same shape
        const visibleIds = new Set((view.corpsFrontSectors ?? []).map((s) => s.sector_id));
        for (const id of hidden) expect(visibleIds.has(id), id).toBe(false);

        const firstCorps = (view.corpsFrontSectors ?? [])
            .filter((s) => s.corps_id === 'arbih_1st_corps')
            .sort((a, b) => strictCompare(a.sector_id, b.sector_id));
        expect(firstCorps.length).toBeGreaterThan(0);
        expect(firstCorps.some((s) => s.display_name === 'OG Bileća')).toBe(false);
        const first = firstCorps[0]!;
        expect(first.assigned_brigade_ids.length, `${first.sector_id} has no brigade`).toBeGreaterThan(0);

        // Every sector of every faction: no brigades => never an OG name; brigades => OG naming.
        for (const sector of view.corpsFrontSectors ?? []) {
            const brigadeCount = sector.assigned_brigade_ids.length
                + sector.reserve_brigade_ids.length
                + (sector.rear_brigade_ids ?? []).length;
            if (brigadeCount === 0) {
                expect(sector.unheld_front, sector.sector_id).toBe(true);
                expect(sector.display_name, sector.sector_id).not.toMatch(/\bOG\b|\bTG\b|\bOZ\b/);
            } else {
                expect(sector.unheld_front, sector.sector_id).toBeUndefined();
            }
        }

        // 1st Corps "OG <place>" names one of the sector's own municipalities.
        for (const sector of firstCorps) {
            const name = sector.display_name;
            if (!name.startsWith('OG ')) continue;
            const munSlugs = new Set((sector.sub_segments ?? []).flatMap((ss) => ss.friendly_osids).map((osid) => osid.split(':')[1]));
            const namedSlug = placeToSlug(name.slice(3));
            if (/^\d/.test(namedSlug)) continue;
            expect(munSlugs.has(namedSlug), `${sector.sector_id} "${name}"`).toBe(true);
        }
    }, 300_000);
});
