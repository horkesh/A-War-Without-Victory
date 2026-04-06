/**
 * Destroyed brigade tracking tests.
 *
 * Tests the destroyed_brigades artifact written by scenario_runner.ts.
 *
 * The artifact is built from final formations using these criteria:
 *   - status === 'inactive'
 *   - lifecycle_status != null
 *   - kind === 'brigade'
 *   - id does NOT start with 'para_' or 'opara_'
 *   - sorted by brigade_id (strictCompare)
 *
 * Fields per entry:
 *   brigade_id, faction, name, corps_id, turn_destroyed, location_osid,
 *   lifecycle_status, battles_fought, total_casualties_taken
 *
 * We test the reconstruction logic directly (same code path as scenario_runner)
 * rather than running a full scenario.
 */

import { describe, expect, it } from 'vitest';
import { strictCompare } from '../src/state/validateGameState.js';

// ── Mirror the reconstruction logic from scenario_runner.ts ──────────────────
// This is a verbatim extraction of the destroyedBrigades computation so we can
// unit-test the filter/map/sort pipeline without running a full scenario.

interface DestroyedBrigadeEntry {
    brigade_id: string;
    faction: string | null;
    name: string;
    corps_id: string | null;
    turn_destroyed: number | null;
    location_osid: string | null;
    lifecycle_status: string;
    battles_fought: number;
    total_casualties_taken: number;
}

function computeDestroyedBrigades(
    formations: Record<string, any>,
): DestroyedBrigadeEntry[] {
    return Object.entries(formations)
        .filter(([, f]) =>
            f.status === 'inactive' &&
            f.lifecycle_status != null &&
            f.kind === 'brigade' &&
            !f.id.startsWith('para_') &&
            !f.id.startsWith('opara_')
        )
        .map(([id, f]) => ({
            brigade_id: id,
            faction: f.faction ?? null,
            name: f.name ?? id,
            corps_id: f.corps_id ?? null,
            turn_destroyed: f.destruction_turn ?? null,
            location_osid: f.location_osid ?? null,
            lifecycle_status: f.lifecycle_status,
            battles_fought: f.brigade_history?.battles_fought ?? 0,
            total_casualties_taken: f.brigade_history?.total_casualties_taken ?? 0,
        }))
        .sort((a, b) => strictCompare(a.brigade_id, b.brigade_id));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('destroyedBrigades reconstruction logic', () => {
    it('inactive brigade with lifecycle_status is included', () => {
        const formations = {
            'arbih_5th_mountain': {
                id: 'arbih_5th_mountain',
                faction: 'RBiH',
                name: '5th Mountain Brigade',
                corps_id: 'arbih_2nd_corps',
                status: 'inactive',
                kind: 'brigade',
                lifecycle_status: 'destroyed',
                destruction_turn: 18,
                location_osid: 'op:gorazde:gorazde_1',
                brigade_history: { battles_fought: 3, total_casualties_taken: 450 },
            },
        };

        const result = computeDestroyedBrigades(formations);
        expect(result).toHaveLength(1);
        expect(result[0]!.brigade_id).toBe('arbih_5th_mountain');
        expect(result[0]!.faction).toBe('RBiH');
        expect(result[0]!.turn_destroyed).toBe(18);
        expect(result[0]!.lifecycle_status).toBe('destroyed');
        expect(result[0]!.battles_fought).toBe(3);
        expect(result[0]!.total_casualties_taken).toBe(450);
    });

    it('active brigade is excluded', () => {
        const formations = {
            'arbih_1st_bih': {
                id: 'arbih_1st_bih',
                faction: 'RBiH',
                kind: 'brigade',
                status: 'active',
                lifecycle_status: 'active',
            },
        };

        const result = computeDestroyedBrigades(formations);
        expect(result).toHaveLength(0);
    });

    it('inactive brigade with null lifecycle_status is excluded', () => {
        // lifecycle_status null means it was never properly flagged — exclude
        const formations = {
            'arbih_mystery': {
                id: 'arbih_mystery',
                faction: 'RBiH',
                kind: 'brigade',
                status: 'inactive',
                lifecycle_status: null,
            },
        };

        const result = computeDestroyedBrigades(formations);
        expect(result).toHaveLength(0);
    });

    it('paramilitaries (para_ prefix) are excluded', () => {
        const formations = {
            'para_arkan_tigers': {
                id: 'para_arkan_tigers',
                faction: 'RS',
                kind: 'brigade',
                status: 'inactive',
                lifecycle_status: 'disbanded',
            },
            'opara_cetnik_unit': {
                id: 'opara_cetnik_unit',
                faction: 'RS',
                kind: 'brigade',
                status: 'inactive',
                lifecycle_status: 'disbanded',
            },
            'rs_16th_krajina_motorized': {
                id: 'rs_16th_krajina_motorized',
                faction: 'RS',
                kind: 'brigade',
                status: 'inactive',
                lifecycle_status: 'destroyed',
                destruction_turn: 22,
            },
        };

        const result = computeDestroyedBrigades(formations);
        expect(result).toHaveLength(1);
        expect(result[0]!.brigade_id).toBe('rs_16th_krajina_motorized');
    });

    it('non-brigade formations (corps_asset, og) are excluded', () => {
        const formations = {
            'arbih_2nd_corps': {
                id: 'arbih_2nd_corps',
                faction: 'RBiH',
                kind: 'corps_asset',
                status: 'inactive',
                lifecycle_status: 'disbanded',
            },
            'og_tuzla_group': {
                id: 'og_tuzla_group',
                faction: 'RBiH',
                kind: 'operational_group',
                status: 'inactive',
                lifecycle_status: 'disbanded',
            },
        };

        const result = computeDestroyedBrigades(formations);
        expect(result).toHaveLength(0);
    });

    it('multiple destroyed brigades are sorted deterministically by brigade_id', () => {
        const formations = {
            'rs_zvornik_brigade': {
                id: 'rs_zvornik_brigade', faction: 'RS', kind: 'brigade',
                status: 'inactive', lifecycle_status: 'destroyed',
                destruction_turn: 30, name: 'Zvornik Brigade',
            },
            'arbih_444th_mountain': {
                id: 'arbih_444th_mountain', faction: 'RBiH', kind: 'brigade',
                status: 'inactive', lifecycle_status: 'destroyed',
                destruction_turn: 35, name: '444th Mountain Brigade',
            },
            'hvo_1st_guards': {
                id: 'hvo_1st_guards', faction: 'HRHB', kind: 'brigade',
                status: 'inactive', lifecycle_status: 'destroyed',
                destruction_turn: 12, name: '1st Guards Brigade',
            },
        };

        const result = computeDestroyedBrigades(formations);
        expect(result).toHaveLength(3);

        // Must be sorted by strictCompare (lexicographic on brigade_id)
        const ids = result.map(r => r.brigade_id);
        const sorted = [...ids].sort(strictCompare);
        expect(ids).toEqual(sorted);

        // Verify deterministic order
        expect(ids[0]).toBe('arbih_444th_mountain');
        expect(ids[1]).toBe('hvo_1st_guards');
        expect(ids[2]).toBe('rs_zvornik_brigade');
    });

    it('turn_destroyed is null when destruction_turn not set', () => {
        const formations = {
            'arbih_orphan_brigade': {
                id: 'arbih_orphan_brigade',
                faction: 'RBiH',
                kind: 'brigade',
                status: 'inactive',
                lifecycle_status: 'disbanded',
                // No destruction_turn field
            },
        };

        const result = computeDestroyedBrigades(formations);
        expect(result).toHaveLength(1);
        expect(result[0]!.turn_destroyed).toBeNull();
    });

    it('brigade_history fields default to 0 when absent', () => {
        const formations = {
            'arbih_fresh_brigade': {
                id: 'arbih_fresh_brigade',
                faction: 'RBiH',
                kind: 'brigade',
                status: 'inactive',
                lifecycle_status: 'destroyed',
                destruction_turn: 5,
                // No brigade_history
            },
        };

        const result = computeDestroyedBrigades(formations);
        expect(result[0]!.battles_fought).toBe(0);
        expect(result[0]!.total_casualties_taken).toBe(0);
    });

    it('empty formations produces empty result', () => {
        const result = computeDestroyedBrigades({});
        expect(result).toHaveLength(0);
        expect(result).toEqual([]);
    });
});
