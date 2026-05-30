/**
 * ARBiH OG→Division promotion tests (ADR-0006 historical reorganization).
 *
 * Historian basis: ARBiH numbered OGs were transitional and promoted into permanent Divisions
 * (2nd Corps Tuzla: 1st OG→21st Division, 5th OG→25th Division). Faction-specific to ARBiH.
 *
 * Covers:
 *   1. Pure helpers: resolveDivisionNumber (historical map + default offset), divisionDisplayName.
 *   2. evaluateOgPromotions: criterion (formation-count threshold), RBiH-only, one-way.
 *   3. applyOgPromotions: writes the one-way record; idempotent (no re-promote).
 *   4. projectPromotionDisplayNames: Division identity lands on the derived sector.
 *   5. NO FORCE INFLATION (flag-on): formTacticalGroup increments the per-corps counter but
 *      brigade COUNT + personnel + equipment are UNCHANGED by promotion.
 */

import { describe, expect, it, vi } from 'vitest';
import type {
    CorpsFrontSector,
    FormationState,
    GameState,
    MilitaryState,
} from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import {
    divisionDisplayName,
    resolveDivisionNumber,
    evaluateOgPromotions,
    applyOgPromotions,
    projectPromotionDisplayNames,
} from '../src/sim/combat/tactical_group_promotion.js';
import { PROMOTION_TG_FORMATION_THRESHOLD } from '../src/sim/combat/tactical_group_config.js';

// ═══════════════════════════════════════════════════════════════════════════
// Fixtures
// ═══════════════════════════════════════════════════════════════════════════

function corps(id: string, faction: FormationState['faction']): FormationState {
    return {
        id, faction, name: id, created_turn: 0, status: 'active', assignment: null,
        formation_kind: 'corps',
    } as FormationState;
}

function sector(corpsId: string, faction: FormationState['faction']): CorpsFrontSector {
    return {
        sector_id: `sector:${corpsId}`,
        corps_id: corpsId,
        faction,
        opposing_factions: ['RS'],
        edge_ids: [], sub_segments: [], length_edges: 0, territory_osids: [],
        assigned_brigade_ids: [], reserve_brigade_ids: [],
        density: 0, threat_ratio: 0, defensive_power: 0,
        sector_stance: 'defend', stance_source: 'bot',
    } as CorpsFrontSector;
}

function stateWith(opts: {
    formations: Record<string, FormationState>;
    counts?: Record<string, number>;
    promotions?: MilitaryState['og_promotions'];
    sectors?: Record<string, CorpsFrontSector>;
    turn?: number;
}): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: opts.turn ?? 30, seed: 'tg-promo', phase: 'war', player_faction: 'RBiH' } as any,
        military: {
            formations: opts.formations,
            tactical_groups: {},
            tg_formations_by_corps: opts.counts,
            og_promotions: opts.promotions,
            corps_front_sectors: opts.sectors,
        } as Partial<MilitaryState> as MilitaryState,
    } as GameState;
}

const TH = PROMOTION_TG_FORMATION_THRESHOLD;

// ═══════════════════════════════════════════════════════════════════════════
// 1. Pure helpers
// ═══════════════════════════════════════════════════════════════════════════

describe('resolveDivisionNumber / divisionDisplayName', () => {
    it('uses the historian-confirmed 2nd Corps map (1st OG→21, 5th OG→25)', () => {
        expect(resolveDivisionNumber('arbih_2nd_corps', 1)).toBe(21);
        expect(resolveDivisionNumber('arbih_2nd_corps', 5)).toBe(25);
    });

    it('falls back to og_ordinal + 20 when unmapped', () => {
        expect(resolveDivisionNumber('arbih_3rd_corps', 1)).toBe(21);
        expect(resolveDivisionNumber('arbih_1st_corps', 2)).toBe(22);
    });

    it('formats the Division display identity', () => {
        expect(divisionDisplayName(21)).toBe('21. Division');
        expect(divisionDisplayName(25)).toBe('25. Division');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. evaluateOgPromotions — criterion, RBiH-only, one-way
// ═══════════════════════════════════════════════════════════════════════════

describe('evaluateOgPromotions', () => {
    it('promotes a RBiH corps that meets the formation-count threshold', () => {
        const state = stateWith({
            formations: { arbih_2nd_corps: corps('arbih_2nd_corps', 'RBiH') },
            counts: { arbih_2nd_corps: TH },
            turn: 42,
        });
        const promos = evaluateOgPromotions(state, 42);
        expect(promos).toHaveLength(1);
        expect(promos[0]).toMatchObject({
            corps_id: 'arbih_2nd_corps',
            faction: 'RBiH',
            division_number: 21,
            division_display_name: '21. Division',
            promoted_on_turn: 42,
        });
    });

    it('does NOT promote below the threshold', () => {
        const state = stateWith({
            formations: { arbih_2nd_corps: corps('arbih_2nd_corps', 'RBiH') },
            counts: { arbih_2nd_corps: TH - 1 },
        });
        expect(evaluateOgPromotions(state, 30)).toHaveLength(0);
    });

    it('is RBiH-only: a VRS or HVO corps at threshold is NOT promoted', () => {
        const state = stateWith({
            formations: {
                vrs_drina: corps('vrs_drina', 'RS'),
                hvo_oz: corps('hvo_oz', 'HRHB'),
            },
            counts: { vrs_drina: TH + 5, hvo_oz: TH + 5 },
        });
        expect(evaluateOgPromotions(state, 30)).toHaveLength(0);
    });

    it('is one-way: an already-promoted corps is not re-promoted', () => {
        const state = stateWith({
            formations: { arbih_2nd_corps: corps('arbih_2nd_corps', 'RBiH') },
            counts: { arbih_2nd_corps: TH + 10 },
            promotions: {
                arbih_2nd_corps: {
                    corps_id: 'arbih_2nd_corps', faction: 'RBiH', og_ordinal: 1,
                    division_number: 21, division_display_name: '21. Division', promoted_on_turn: 12,
                },
            },
        });
        expect(evaluateOgPromotions(state, 30)).toHaveLength(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. applyOgPromotions — writes record, idempotent
// ═══════════════════════════════════════════════════════════════════════════

describe('applyOgPromotions', () => {
    it('writes the one-way record and is idempotent', () => {
        const state = stateWith({
            formations: { arbih_2nd_corps: corps('arbih_2nd_corps', 'RBiH') },
            counts: { arbih_2nd_corps: TH },
            turn: 40,
        });
        const first = applyOgPromotions(state, 40);
        expect(first).toHaveLength(1);
        expect(state.military.og_promotions!.arbih_2nd_corps.promoted_on_turn).toBe(40);

        // Second call (later turn, higher count): record unchanged, no new promotion.
        state.military.tg_formations_by_corps!.arbih_2nd_corps = TH + 5;
        const second = applyOgPromotions(state, 99);
        expect(second).toHaveLength(0);
        expect(state.military.og_promotions!.arbih_2nd_corps.promoted_on_turn).toBe(40);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. projectPromotionDisplayNames — Division identity on derived sector
// ═══════════════════════════════════════════════════════════════════════════

describe('projectPromotionDisplayNames', () => {
    it('sets the promoted corps sector display_name to the Division identity', () => {
        const state = stateWith({
            formations: { arbih_2nd_corps: corps('arbih_2nd_corps', 'RBiH') },
            counts: { arbih_2nd_corps: TH },
            sectors: { 'sector:arbih_2nd_corps': sector('arbih_2nd_corps', 'RBiH') },
            turn: 40,
        });
        applyOgPromotions(state, 40);
        projectPromotionDisplayNames(state);
        expect(state.military.corps_front_sectors!['sector:arbih_2nd_corps'].display_name)
            .toBe('21. Division');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. NO FORCE INFLATION — flag-on formTacticalGroup counter + promotion preserve forces
// ═══════════════════════════════════════════════════════════════════════════

async function withPromotionFlagOn() {
    vi.resetModules();
    vi.doMock('../src/sim/combat/tactical_group_config.js', async () => {
        const actual = await vi.importActual<typeof import('../src/sim/combat/tactical_group_config.js')>(
            '../src/sim/combat/tactical_group_config.js',
        );
        return { ...actual, ENABLE_TG_OG_PROMOTION: true };
    });
    return {
        lifecycle: await import('../src/sim/combat/tactical_group_lifecycle.js'),
        promotion: await import('../src/sim/combat/tactical_group_promotion.js'),
    };
}

function brigade(id: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id, faction: 'RBiH', name: id, created_turn: 0, status: 'active', assignment: null,
        corps_id: 'arbih_2nd_corps', location_osid: 'tuzla',
        personnel: 2000, cohesion: 80,
        ...overrides,
    } as FormationState;
}

describe('OG→Division promotion — NO force inflation (flag-on)', () => {
    it('promotion does not change brigade count, personnel, or equipment', async () => {
        const { lifecycle, promotion } = await withPromotionFlagOn();

        const formations: Record<string, FormationState> = {
            arbih_2nd_corps: corps('arbih_2nd_corps', 'RBiH'),
            anchor: brigade('anchor', { personnel: 2500, composition: { infantry: 2400, tanks: 2, artillery: 4, aa_systems: 1, tank_condition: 'serviceable', artillery_condition: 'serviceable' } as any }),
            d1: brigade('d1', { personnel: 1800 }),
        };
        const state = stateWith({ formations, turn: 30 });

        // Snapshot force totals BEFORE any promotion activity.
        const brigadeIdsBefore = Object.keys(state.military.formations).sort();
        const personnelBefore = brigadeIdsBefore.reduce((s, id) => s + (state.military.formations[id].personnel ?? 0), 0);

        // Form TGs up to threshold (each formation increments the per-corps counter).
        for (let i = 0; i < PROMOTION_TG_FORMATION_THRESHOLD; i++) {
            const tgId = `tg:arbih_2nd_corps:op${i}:anchor`;
            // Manually drive the counter as formTacticalGroup does, then dissolve so the anchor
            // is free to re-form (mirrors a standing OG launching repeated ops over time).
            const res = lifecycle.formTacticalGroup(state, {
                op_id: `op${i}`,
                anchor_brigade_id: 'anchor',
                donors: [],
                current_turn: 30 + i,
            });
            expect(res.tg_id).not.toBeNull();
            lifecycle.dissolveTacticalGroup(state, res.tg_id!, 30 + i);
            void tgId;
        }

        // Counter reached threshold via flag-on formation path.
        expect(state.military.tg_formations_by_corps!.arbih_2nd_corps).toBe(PROMOTION_TG_FORMATION_THRESHOLD);

        // Apply promotion.
        const promos = promotion.applyOgPromotions(state, 50);
        expect(promos).toHaveLength(1);
        expect(state.military.og_promotions!.arbih_2nd_corps.division_display_name).toBe('21. Division');

        // ── NO FORCE INFLATION assertions ──
        const brigadeIdsAfter = Object.keys(state.military.formations).sort();
        const personnelAfter = brigadeIdsAfter.reduce((s, id) => s + (state.military.formations[id].personnel ?? 0), 0);

        // Same set of formations — no new brigades spawned by promotion.
        expect(brigadeIdsAfter).toEqual(brigadeIdsBefore);
        // Total personnel unchanged.
        expect(personnelAfter).toBe(personnelBefore);
        // Anchor's equipment (composition) unchanged.
        expect((state.military.formations.anchor as any).composition)
            .toEqual({ infantry: 2400, tanks: 2, artillery: 4, aa_systems: 1, tank_condition: 'serviceable', artillery_condition: 'serviceable' });
    });
});
