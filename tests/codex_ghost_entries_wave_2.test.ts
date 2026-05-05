/**
 * LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION — Wave 2 ghost-entry verification.
 *
 * Tests for 8 new ghost entries added on top of the Mission E Wave 1 set:
 *   - paramilitary_streak_refused (clean_record + paramilitary_authorization_refused, turn>=80)
 *   - winter_held (winter_held_through_turn + NOT winter_supply_attrition_active_<player>, turn>=80)
 *   - corridor_blocked (corridor_blocked_through_turn + NOT corridor_secured + NOT operation_corridor_1992 fired, turn>=30)
 *   - doctrine_reform_completed (reform_initiated + modernization_active + NOT drift, per-faction)
 *   - arms_embargo_full_compliance (arms_embargo_compliant_through_turn + NOT pipeline flags, turn>=100)
 *   - political_unity_held (political_unity_held_through_turn + NOT political_split flag, turn>=100)
 *   - equipment_quality_collapse (equipment_quality_collapsed flag)
 *   - negotiation_capital_exhausted (negotiation_capital_exhausted flag + no peace plan acceptance)
 *
 * 12 tests:
 *   W1:  paramilitary_streak_refused gating (turn floor + both flags required)
 *   W2:  winter_held gating (turn floor + observer flag + per-faction absence)
 *   W3:  corridor_blocked gating (turn floor + observer flag + NOT secured + event not fired)
 *   W4:  doctrine_reform_completed (per-faction substitution; all three predicates required)
 *   W5:  arms_embargo_full_compliance (turn floor + observer flag + NOT both pipeline flags)
 *   W6:  political_unity_held (turn floor + observer flag + per-faction absence)
 *   W7:  equipment_quality_collapse (single-flag gate)
 *   W8:  negotiation_capital_exhausted (no peace acceptance, no Dayton)
 *   W9:  Wave 2 predicates remain faction-agnostic (RBiH/RS/HRHB) when input is symmetric
 *  W10:  Wave 2 ghosts emit ring_classification=2 and variant='context'
 *  W11:  benign empty state at turn 50 emits zero ghosts (Wave 1 + Wave 2)
 *  W12:  full Wave-2-active state — alphabetical determinism preserved across multiple builds
 */
import { describe, it, expect } from 'vitest';
import {
    buildGhostEntries,
    type BuiltGhostEntry,
} from '../src/sim/codex/dynamic_section_builder.js';
import type { GameState, FactionId } from '../src/state/game_state.js';

// ─── Test helpers (parallel to dynamic_codex_slice_v1 helpers) ─────────────

interface MakeStateOptions {
    event_flags?: Record<string, string | number | boolean>;
    event_fire_counts?: Record<string, number>;
    paramilitary_policy?: 'always_allow' | 'always_deny' | 'ask';
    player_faction?: FactionId;
}

function makeState(options: MakeStateOptions = {}): GameState {
    const military = {
        event_flags: options.event_flags ?? {},
        event_fire_counts: options.event_fire_counts ?? {},
        negotiation: {
            capital: {},
            patron_relationships: {},
            peace_plan_history: [],
        },
    };
    const baseState = {
        paramilitary_policy: options.paramilitary_policy ?? 'ask',
        meta: { player_faction: options.player_faction ?? ('RBiH' as FactionId) },
        military,
        political: {},
    };
    return baseState as unknown as GameState;
}

function findGhost(ghosts: BuiltGhostEntry[], id: string): BuiltGhostEntry | undefined {
    return ghosts.find((g) => g.ghost_id === id);
}

// ─── W1: paramilitary_streak_refused ──────────────────────────────────────

describe('LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION — W1: paramilitary_streak_refused gating', () => {
    it('does not fire when turn < 80 even with both flags set', () => {
        const s = makeState({
            event_flags: {
                paramilitary_authorization_refused: true,
                clean_record: true,
            },
        });
        expect(findGhost(buildGhostEntries(s, 79), 'paramilitary_streak_refused')).toBeUndefined();
    });

    it('does not fire when paramilitary_authorization_refused is missing', () => {
        const s = makeState({ event_flags: { clean_record: true } });
        expect(findGhost(buildGhostEntries(s, 100), 'paramilitary_streak_refused')).toBeUndefined();
    });

    it('does not fire when clean_record is missing', () => {
        const s = makeState({ event_flags: { paramilitary_authorization_refused: true } });
        expect(findGhost(buildGhostEntries(s, 100), 'paramilitary_streak_refused')).toBeUndefined();
    });

    it('fires when both flags set AND turn >= 80', () => {
        const s = makeState({
            event_flags: {
                paramilitary_authorization_refused: true,
                clean_record: true,
            },
        });
        const got = findGhost(buildGhostEntries(s, 80), 'paramilitary_streak_refused');
        expect(got).toBeDefined();
        expect(got?.path).toBe('data/codex/ghost_entries/paramilitary_streak_refused.md');
        expect(got?.ring_classification).toBe(2);
        expect(got?.variant).toBe('context');
    });
});

// ─── W2: winter_held ──────────────────────────────────────────────────────

describe('LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION — W2: winter_held gating', () => {
    it('does not fire without winter_held_through_turn observer flag', () => {
        const s = makeState({});
        expect(findGhost(buildGhostEntries(s, 150), 'winter_held')).toBeUndefined();
    });

    it('does not fire when player faction winter_supply_attrition_active flag is set', () => {
        const s = makeState({
            event_flags: {
                winter_held_through_turn: true,
                winter_supply_attrition_active_RBiH: true,
            },
            player_faction: 'RBiH' as FactionId,
        });
        expect(findGhost(buildGhostEntries(s, 150), 'winter_held')).toBeUndefined();
    });

    it('does not fire when turn < 80 even with observer flag set', () => {
        const s = makeState({ event_flags: { winter_held_through_turn: true } });
        expect(findGhost(buildGhostEntries(s, 79), 'winter_held')).toBeUndefined();
    });

    it('fires when observer flag set AND faction-specific attrition unset AND turn >= 80', () => {
        const s = makeState({ event_flags: { winter_held_through_turn: true } });
        const got = findGhost(buildGhostEntries(s, 80), 'winter_held');
        expect(got).toBeDefined();
        expect(got?.path).toBe('data/codex/ghost_entries/winter_held.md');
    });

    it('reads per-faction attrition flag for RS player', () => {
        // RS player; RBiH attrition set should not block firing.
        const s = makeState({
            event_flags: {
                winter_held_through_turn: true,
                winter_supply_attrition_active_RBiH: true, // wrong faction; should not block RS
            },
            player_faction: 'RS' as FactionId,
        });
        expect(findGhost(buildGhostEntries(s, 100), 'winter_held')).toBeDefined();

        // Now set the RS-specific attrition flag — must block.
        const s2 = makeState({
            event_flags: {
                winter_held_through_turn: true,
                winter_supply_attrition_active_RS: true,
            },
            player_faction: 'RS' as FactionId,
        });
        expect(findGhost(buildGhostEntries(s2, 100), 'winter_held')).toBeUndefined();
    });
});

// ─── W3: corridor_blocked ─────────────────────────────────────────────────

describe('LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION — W3: corridor_blocked gating', () => {
    it('does not fire without corridor_blocked_through_turn observer flag', () => {
        const s = makeState({});
        expect(findGhost(buildGhostEntries(s, 100), 'corridor_blocked')).toBeUndefined();
    });

    it('does not fire when corridor_secured flag is set', () => {
        const s = makeState({
            event_flags: {
                corridor_blocked_through_turn: true,
                corridor_secured: true,
            },
        });
        expect(findGhost(buildGhostEntries(s, 100), 'corridor_blocked')).toBeUndefined();
    });

    it('does not fire when operation_corridor_1992 event has fired', () => {
        const s = makeState({
            event_flags: { corridor_blocked_through_turn: true },
            event_fire_counts: { operation_corridor_1992: 1 },
        });
        expect(findGhost(buildGhostEntries(s, 100), 'corridor_blocked')).toBeUndefined();
    });

    it('does not fire when turn < 30', () => {
        const s = makeState({ event_flags: { corridor_blocked_through_turn: true } });
        expect(findGhost(buildGhostEntries(s, 29), 'corridor_blocked')).toBeUndefined();
    });

    it('fires when observer flag set AND no corridor_secured AND no event fire AND turn >= 30', () => {
        const s = makeState({ event_flags: { corridor_blocked_through_turn: true } });
        const got = findGhost(buildGhostEntries(s, 30), 'corridor_blocked');
        expect(got).toBeDefined();
        expect(got?.path).toBe('data/codex/ghost_entries/corridor_blocked.md');
    });
});

// ─── W4: doctrine_reform_completed ────────────────────────────────────────

describe('LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION — W4: doctrine_reform_completed gating', () => {
    it('requires per-faction reform-initiated flag', () => {
        const s = makeState({
            event_flags: { doctrine_modernization_active_RBiH: true },
            player_faction: 'RBiH' as FactionId,
        });
        expect(findGhost(buildGhostEntries(s, 150), 'doctrine_reform_completed')).toBeUndefined();
    });

    it('requires per-faction modernization flag', () => {
        const s = makeState({
            event_flags: { doctrine_reform_initiated_RBiH: true },
            player_faction: 'RBiH' as FactionId,
        });
        expect(findGhost(buildGhostEntries(s, 150), 'doctrine_reform_completed')).toBeUndefined();
    });

    it('does not fire when drift flag is set', () => {
        const s = makeState({
            event_flags: {
                doctrine_reform_initiated_RBiH: true,
                doctrine_modernization_active_RBiH: true,
                doctrine_drift_active_RBiH: true,
            },
            player_faction: 'RBiH' as FactionId,
        });
        expect(findGhost(buildGhostEntries(s, 150), 'doctrine_reform_completed')).toBeUndefined();
    });

    it('fires when reform + modernization set and drift unset for player faction', () => {
        const s = makeState({
            event_flags: {
                doctrine_reform_initiated_RBiH: true,
                doctrine_modernization_active_RBiH: true,
            },
            player_faction: 'RBiH' as FactionId,
        });
        const got = findGhost(buildGhostEntries(s, 150), 'doctrine_reform_completed');
        expect(got).toBeDefined();
    });

    it('faction-substitutes — RS-suffixed flags fire only for RS player', () => {
        const flagsRS = {
            doctrine_reform_initiated_RS: true,
            doctrine_modernization_active_RS: true,
        };
        // Same flags but RBiH player — should not fire.
        const sRBiHReader = makeState({
            event_flags: flagsRS,
            player_faction: 'RBiH' as FactionId,
        });
        expect(findGhost(buildGhostEntries(sRBiHReader, 150), 'doctrine_reform_completed')).toBeUndefined();
        const sRSReader = makeState({
            event_flags: flagsRS,
            player_faction: 'RS' as FactionId,
        });
        expect(findGhost(buildGhostEntries(sRSReader, 150), 'doctrine_reform_completed')).toBeDefined();
    });
});

// ─── W5: arms_embargo_full_compliance ─────────────────────────────────────

describe('LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION — W5: arms_embargo_full_compliance gating', () => {
    it('does not fire without arms_embargo_compliant_through_turn observer flag', () => {
        const s = makeState({});
        expect(findGhost(buildGhostEntries(s, 150), 'arms_embargo_full_compliance')).toBeUndefined();
    });

    it('does not fire when third_party_arms_channel is active for player faction', () => {
        const s = makeState({
            event_flags: {
                arms_embargo_compliant_through_turn: true,
                third_party_arms_channel_active_RBiH: true,
            },
            player_faction: 'RBiH' as FactionId,
        });
        expect(findGhost(buildGhostEntries(s, 150), 'arms_embargo_full_compliance')).toBeUndefined();
    });

    it('does not fire when iran_arms_channel_attenuation is active for player faction', () => {
        const s = makeState({
            event_flags: {
                arms_embargo_compliant_through_turn: true,
                iran_arms_channel_attenuation_active_RBiH: true,
            },
            player_faction: 'RBiH' as FactionId,
        });
        expect(findGhost(buildGhostEntries(s, 150), 'arms_embargo_full_compliance')).toBeUndefined();
    });

    it('does not fire when turn < 100', () => {
        const s = makeState({ event_flags: { arms_embargo_compliant_through_turn: true } });
        expect(findGhost(buildGhostEntries(s, 99), 'arms_embargo_full_compliance')).toBeUndefined();
    });

    it('fires when observer flag set AND no pipeline flags AND turn >= 100', () => {
        const s = makeState({ event_flags: { arms_embargo_compliant_through_turn: true } });
        const got = findGhost(buildGhostEntries(s, 100), 'arms_embargo_full_compliance');
        expect(got).toBeDefined();
    });
});

// ─── W6: political_unity_held ─────────────────────────────────────────────

describe('LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION — W6: political_unity_held gating', () => {
    it('does not fire without political_unity_held_through_turn observer flag', () => {
        const s = makeState({});
        expect(findGhost(buildGhostEntries(s, 150), 'political_unity_held')).toBeUndefined();
    });

    it('does not fire when split flag is active for player faction', () => {
        const s = makeState({
            event_flags: {
                political_unity_held_through_turn: true,
                political_split_temporary_active_RBiH: true,
            },
            player_faction: 'RBiH' as FactionId,
        });
        expect(findGhost(buildGhostEntries(s, 150), 'political_unity_held')).toBeUndefined();
    });

    it('faction-substitutes — split for HRHB does not block RBiH player', () => {
        const s = makeState({
            event_flags: {
                political_unity_held_through_turn: true,
                political_split_temporary_active_HRHB: true,
            },
            player_faction: 'RBiH' as FactionId,
        });
        expect(findGhost(buildGhostEntries(s, 150), 'political_unity_held')).toBeDefined();
    });

    it('does not fire when turn < 100', () => {
        const s = makeState({ event_flags: { political_unity_held_through_turn: true } });
        expect(findGhost(buildGhostEntries(s, 99), 'political_unity_held')).toBeUndefined();
    });
});

// ─── W7: equipment_quality_collapse ───────────────────────────────────────

describe('LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION — W7: equipment_quality_collapse gating', () => {
    it('does not fire without equipment_quality_collapsed flag', () => {
        const s = makeState({});
        expect(findGhost(buildGhostEntries(s, 150), 'equipment_quality_collapse')).toBeUndefined();
    });

    it('fires when equipment_quality_collapsed flag is set', () => {
        const s = makeState({ event_flags: { equipment_quality_collapsed: true } });
        const got = findGhost(buildGhostEntries(s, 50), 'equipment_quality_collapse');
        expect(got).toBeDefined();
        expect(got?.path).toBe('data/codex/ghost_entries/equipment_quality_collapse.md');
        expect(got?.ring_classification).toBe(2);
        expect(got?.variant).toBe('context');
    });
});

// ─── W8: negotiation_capital_exhausted ────────────────────────────────────

describe('LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION — W8: negotiation_capital_exhausted gating', () => {
    it('does not fire without negotiation_capital_exhausted flag', () => {
        const s = makeState({});
        expect(findGhost(buildGhostEntries(s, 200), 'negotiation_capital_exhausted')).toBeUndefined();
    });

    it('does not fire when vance_owen_accepted is set', () => {
        const s = makeState({
            event_flags: {
                negotiation_capital_exhausted: true,
                vance_owen_accepted: true,
            },
        });
        expect(findGhost(buildGhostEntries(s, 200), 'negotiation_capital_exhausted')).toBeUndefined();
    });

    it('does not fire when owen_stoltenberg_accepted is set', () => {
        const s = makeState({
            event_flags: {
                negotiation_capital_exhausted: true,
                owen_stoltenberg_accepted: true,
            },
        });
        expect(findGhost(buildGhostEntries(s, 200), 'negotiation_capital_exhausted')).toBeUndefined();
    });

    it('does not fire when dayton_signed_1995 has fired', () => {
        const s = makeState({
            event_flags: { negotiation_capital_exhausted: true },
            event_fire_counts: { dayton_signed_1995: 1 },
        });
        expect(findGhost(buildGhostEntries(s, 200), 'negotiation_capital_exhausted')).toBeUndefined();
    });

    it('fires when capital exhausted AND no peace acceptance AND no Dayton', () => {
        const s = makeState({ event_flags: { negotiation_capital_exhausted: true } });
        const got = findGhost(buildGhostEntries(s, 200), 'negotiation_capital_exhausted');
        expect(got).toBeDefined();
    });
});

// ─── W9: faction-agnostic across RBiH/RS/HRHB on Wave 2 predicates ────────

describe('LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION — W9: Wave 2 predicates remain faction-agnostic on symmetric input', () => {
    it('emits identical id sets across RBiH/RS/HRHB when per-faction flags are absent', () => {
        function stateForFaction(faction: FactionId): GameState {
            return makeState({
                event_flags: {
                    // Observer audit flags (faction-agnostic).
                    winter_held_through_turn: true,
                    corridor_blocked_through_turn: true,
                    arms_embargo_compliant_through_turn: true,
                    political_unity_held_through_turn: true,
                    // Single-flag gates (faction-agnostic).
                    equipment_quality_collapsed: true,
                    negotiation_capital_exhausted: true,
                    paramilitary_authorization_refused: true,
                    clean_record: true,
                    // Per-faction reform/modernization flags FOR THIS FACTION.
                    [`doctrine_reform_initiated_${faction}`]: true,
                    [`doctrine_modernization_active_${faction}`]: true,
                },
                player_faction: faction,
            });
        }

        const idsRBiH = buildGhostEntries(stateForFaction('RBiH' as FactionId), 200).map((g) => g.ghost_id);
        const idsRS = buildGhostEntries(stateForFaction('RS' as FactionId), 200).map((g) => g.ghost_id);
        const idsHRHB = buildGhostEntries(stateForFaction('HRHB' as FactionId), 200).map((g) => g.ghost_id);

        expect(idsRS).toEqual(idsRBiH);
        expect(idsHRHB).toEqual(idsRBiH);

        // All Wave 2 ids must be present.
        const wave2 = [
            'paramilitary_streak_refused',
            'winter_held',
            'corridor_blocked',
            'doctrine_reform_completed',
            'arms_embargo_full_compliance',
            'political_unity_held',
            'equipment_quality_collapse',
            'negotiation_capital_exhausted',
        ];
        for (const id of wave2) {
            expect(idsRBiH).toContain(id);
        }
    });
});

// ─── W10: ring + variant invariants on Wave 2 ─────────────────────────────

describe('LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION — W10: Wave 2 ghosts emit ring=2 and variant=context', () => {
    it('all Wave 2 ghosts emit ring_classification=2 and variant=context', () => {
        const s = makeState({
            event_flags: {
                paramilitary_authorization_refused: true,
                clean_record: true,
                winter_held_through_turn: true,
                corridor_blocked_through_turn: true,
                arms_embargo_compliant_through_turn: true,
                political_unity_held_through_turn: true,
                equipment_quality_collapsed: true,
                negotiation_capital_exhausted: true,
                doctrine_reform_initiated_RBiH: true,
                doctrine_modernization_active_RBiH: true,
            },
            player_faction: 'RBiH' as FactionId,
        });
        const ghosts = buildGhostEntries(s, 200);
        const wave2Ids = new Set([
            'paramilitary_streak_refused',
            'winter_held',
            'corridor_blocked',
            'doctrine_reform_completed',
            'arms_embargo_full_compliance',
            'political_unity_held',
            'equipment_quality_collapse',
            'negotiation_capital_exhausted',
        ]);
        for (const g of ghosts) {
            if (wave2Ids.has(g.ghost_id)) {
                expect(g.ring_classification).toBe(2);
                expect(g.variant).toBe('context');
                expect(g.path).toMatch(/^data\/codex\/ghost_entries\/.+\.md$/);
            }
        }
    });
});

// ─── W11: benign empty state at turn 50 emits zero ghosts ─────────────────

describe('LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION — W11: benign empty state emits zero ghosts', () => {
    it('makeState() at turn 50 emits no ghosts (Wave 1 or Wave 2)', () => {
        // Critical regression: Wave 2 absence-pattern predicates must NOT
        // fire on empty state — they require a positive observer flag.
        const s = makeState();
        expect(buildGhostEntries(s, 50)).toEqual([]);
    });

    it('makeState() at turn 200 still emits zero ghosts on benign input', () => {
        // Wave 2 absence-only-by-mistake patterns would fire here without the
        // positive observer-flag guard. This test pins the guard.
        const s = makeState();
        expect(buildGhostEntries(s, 200)).toEqual([]);
    });
});

// ─── W12: deterministic ordering on Wave 2 ────────────────────────────────

describe('LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION — W12: deterministic ordering across builds', () => {
    it('emits Wave 2 ghosts in stable strictCompare order across multiple builds', () => {
        const s = makeState({
            event_flags: {
                paramilitary_authorization_refused: true,
                clean_record: true,
                winter_held_through_turn: true,
                corridor_blocked_through_turn: true,
                arms_embargo_compliant_through_turn: true,
                political_unity_held_through_turn: true,
                equipment_quality_collapsed: true,
                negotiation_capital_exhausted: true,
                doctrine_reform_initiated_RBiH: true,
                doctrine_modernization_active_RBiH: true,
            },
            player_faction: 'RBiH' as FactionId,
        });

        const a = buildGhostEntries(s, 200).map((g) => g.ghost_id);
        const b = buildGhostEntries(s, 200).map((g) => g.ghost_id);
        const c = buildGhostEntries(s, 200).map((g) => g.ghost_id);

        expect(b).toEqual(a);
        expect(c).toEqual(a);

        // Output is alphabetical ASCII (strictCompare is lex on ASCII).
        const sorted = [...a].sort();
        expect(a).toEqual(sorted);
    });
});
