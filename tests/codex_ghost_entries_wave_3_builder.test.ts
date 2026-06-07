/**
 * LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION-WAVE-3 — builder-emission verification.
 *
 * Wave 3 authored 6 counterfactual/divergence ghost-entry markdown bodies
 * (EN + BCS) under `data/codex/ghost_entries/` (covered for content shape by
 * `codex_ghost_entries_wave_3.test.ts`, which is filesystem-only). This test
 * pins the *builder wiring* added in `dynamic_section_builder.ts`: that each of
 * the 6 entries is emitted by `buildGhostEntries` under its gating predicate,
 * stays faction-agnostic on symmetric input, emits Ring 2 / variant=context,
 * and — critically — does NOT fire on benign empty state (the byte-identical
 * dormancy guarantee: the upstream observer flags are unwritten today, so a
 * real run emits none of these).
 *
 * Mirrors the Wave-2 builder test (`codex_ghost_entries_wave_2.test.ts`).
 * Deterministic: no Math.random(), no Date.now(), no hidden ordering.
 *
 * Wave 3 entries (6):
 *   - ceasefire_streak_held
 *   - mediator_trust_sustained
 *   - rear_pocket_sustained
 *   - civilian_displacement_contained
 *   - equipment_quality_recovered
 *   - negotiation_capital_recovered
 */
import { describe, it, expect } from 'vitest';
import {
    buildGhostEntries,
    type BuiltGhostEntry,
} from '../src/sim/codex/dynamic_section_builder.js';
import type { GameState, FactionId } from '../src/state/game_state.js';

// ─── Test helpers (parallel to Wave 2 helpers) ─────────────────────────────

interface MakeStateOptions {
    event_flags?: Record<string, string | number | boolean>;
    event_fire_counts?: Record<string, number>;
    war_crimes_events?: number;
    player_faction?: FactionId;
}

function makeState(options: MakeStateOptions = {}): GameState {
    const faction = options.player_faction ?? ('RBiH' as FactionId);
    const capital: Record<string, { war_crimes_events: number }> = {};
    if (options.war_crimes_events !== undefined) {
        capital[faction] = { war_crimes_events: options.war_crimes_events };
    }
    const military = {
        event_flags: options.event_flags ?? {},
        event_fire_counts: options.event_fire_counts ?? {},
        negotiation: {
            capital,
            patron_relationships: {},
            peace_plan_history: [],
        },
    };
    const baseState = {
        paramilitary_policy: 'ask',
        meta: { player_faction: faction },
        military,
        political: {},
    };
    return baseState as unknown as GameState;
}

function findGhost(ghosts: BuiltGhostEntry[], id: string): BuiltGhostEntry | undefined {
    return ghosts.find((g) => g.ghost_id === id);
}

const WAVE_3_IDS = [
    'ceasefire_streak_held',
    'mediator_trust_sustained',
    'rear_pocket_sustained',
    'civilian_displacement_contained',
    'equipment_quality_recovered',
    'negotiation_capital_recovered',
] as const;

// Symmetric, fully-active Wave-3 flag set (no per-faction exclusion flags set).
function activeWave3Flags(): Record<string, string | number | boolean> {
    return {
        ceasefire_held_through_turn: true,
        mediator_trust_held_through_turn: true,
        rear_pocket_discipline_held_through_turn: true,
        civilian_displacement_contained_through_turn: true,
        equipment_quality_recovered: true,
        negotiation_capital_recovered: true,
    };
}

// ─── W1: ceasefire_streak_held ─────────────────────────────────────────────

describe('WAVE-3 builder — W1: ceasefire_streak_held gating', () => {
    it('does not fire without the observer flag', () => {
        expect(findGhost(buildGhostEntries(makeState(), 100), 'ceasefire_streak_held')).toBeUndefined();
    });
    it('does not fire when turn < 80', () => {
        const s = makeState({ event_flags: { ceasefire_held_through_turn: true } });
        expect(findGhost(buildGhostEntries(s, 79), 'ceasefire_streak_held')).toBeUndefined();
    });
    it('does not fire when a violation is attributed to the player faction', () => {
        const s = makeState({
            event_flags: {
                ceasefire_held_through_turn: true,
                ceasefire_violation_attributed_RBiH: true,
            },
            player_faction: 'RBiH' as FactionId,
        });
        expect(findGhost(buildGhostEntries(s, 100), 'ceasefire_streak_held')).toBeUndefined();
    });
    it('fires when observer flag set, no attribution, turn >= 80', () => {
        const s = makeState({ event_flags: { ceasefire_held_through_turn: true } });
        const got = findGhost(buildGhostEntries(s, 80), 'ceasefire_streak_held');
        expect(got).toBeDefined();
        expect(got?.path).toBe('data/codex/ghost_entries/ceasefire_streak_held.md');
        expect(got?.ring_classification).toBe(2);
        expect(got?.variant).toBe('context');
    });
    it('faction-substitutes — RS-attributed violation does not block RBiH player', () => {
        const s = makeState({
            event_flags: {
                ceasefire_held_through_turn: true,
                ceasefire_violation_attributed_RS: true,
            },
            player_faction: 'RBiH' as FactionId,
        });
        expect(findGhost(buildGhostEntries(s, 100), 'ceasefire_streak_held')).toBeDefined();
    });
});

// ─── W2: mediator_trust_sustained ──────────────────────────────────────────

describe('WAVE-3 builder — W2: mediator_trust_sustained gating', () => {
    it('does not fire without the observer flag', () => {
        expect(findGhost(buildGhostEntries(makeState(), 100), 'mediator_trust_sustained')).toBeUndefined();
    });
    it('does not fire when turn < 80', () => {
        const s = makeState({ event_flags: { mediator_trust_held_through_turn: true } });
        expect(findGhost(buildGhostEntries(s, 79), 'mediator_trust_sustained')).toBeUndefined();
    });
    it('does not fire when player faction denounced a mediator', () => {
        const s = makeState({
            event_flags: {
                mediator_trust_held_through_turn: true,
                mediator_denounced_RBiH: true,
            },
            player_faction: 'RBiH' as FactionId,
        });
        expect(findGhost(buildGhostEntries(s, 100), 'mediator_trust_sustained')).toBeUndefined();
    });
    it('fires when observer flag set, no denouncement, turn >= 80', () => {
        const s = makeState({ event_flags: { mediator_trust_held_through_turn: true } });
        expect(findGhost(buildGhostEntries(s, 80), 'mediator_trust_sustained')).toBeDefined();
    });
});

// ─── W3: rear_pocket_sustained (real war_crimes_events counter) ────────────

describe('WAVE-3 builder — W3: rear_pocket_sustained gating', () => {
    it('does not fire without the observer flag', () => {
        expect(findGhost(buildGhostEntries(makeState(), 100), 'rear_pocket_sustained')).toBeUndefined();
    });
    it('does not fire when turn < 80', () => {
        const s = makeState({ event_flags: { rear_pocket_discipline_held_through_turn: true } });
        expect(findGhost(buildGhostEntries(s, 79), 'rear_pocket_sustained')).toBeUndefined();
    });
    it('does not fire when war_crimes_events > 0 on the player faction capital', () => {
        const s = makeState({
            event_flags: { rear_pocket_discipline_held_through_turn: true },
            war_crimes_events: 1,
            player_faction: 'RBiH' as FactionId,
        });
        expect(findGhost(buildGhostEntries(s, 100), 'rear_pocket_sustained')).toBeUndefined();
    });
    it('fires when observer flag set AND war_crimes_events == 0 AND turn >= 80', () => {
        const s = makeState({
            event_flags: { rear_pocket_discipline_held_through_turn: true },
            war_crimes_events: 0,
        });
        const got = findGhost(buildGhostEntries(s, 80), 'rear_pocket_sustained');
        expect(got).toBeDefined();
        expect(got?.path).toBe('data/codex/ghost_entries/rear_pocket_sustained.md');
    });
});

// ─── W4: civilian_displacement_contained ──────────────────────────────────

describe('WAVE-3 builder — W4: civilian_displacement_contained gating', () => {
    it('does not fire without the observer flag', () => {
        expect(findGhost(buildGhostEntries(makeState(), 100), 'civilian_displacement_contained')).toBeUndefined();
    });
    it('does not fire when turn < 80', () => {
        const s = makeState({ event_flags: { civilian_displacement_contained_through_turn: true } });
        expect(findGhost(buildGhostEntries(s, 79), 'civilian_displacement_contained')).toBeUndefined();
    });
    it('does not fire when mass displacement is attributed to the player faction', () => {
        const s = makeState({
            event_flags: {
                civilian_displacement_contained_through_turn: true,
                mass_displacement_attributed_RBiH: true,
            },
            player_faction: 'RBiH' as FactionId,
        });
        expect(findGhost(buildGhostEntries(s, 100), 'civilian_displacement_contained')).toBeUndefined();
    });
    it('fires when observer flag set, no attribution, turn >= 80', () => {
        const s = makeState({ event_flags: { civilian_displacement_contained_through_turn: true } });
        expect(findGhost(buildGhostEntries(s, 80), 'civilian_displacement_contained')).toBeDefined();
    });
});

// ─── W5: equipment_quality_recovered (mutually exclusive w/ collapse) ──────

describe('WAVE-3 builder — W5: equipment_quality_recovered gating', () => {
    it('does not fire without the flag', () => {
        expect(findGhost(buildGhostEntries(makeState(), 100), 'equipment_quality_recovered')).toBeUndefined();
    });
    it('does not fire when equipment_quality_collapsed is also set (mutual exclusion)', () => {
        const s = makeState({
            event_flags: {
                equipment_quality_recovered: true,
                equipment_quality_collapsed: true,
            },
        });
        expect(findGhost(buildGhostEntries(s, 100), 'equipment_quality_recovered')).toBeUndefined();
    });
    it('fires on the legacy aggregate flag (back-compat)', () => {
        const s = makeState({ event_flags: { equipment_quality_recovered: true } });
        const got = findGhost(buildGhostEntries(s, 50), 'equipment_quality_recovered');
        expect(got).toBeDefined();
        expect(got?.path).toBe('data/codex/ghost_entries/equipment_quality_recovered.md');
    });
    // #267: the recovery consequence sets PER-FACTION streak flags, not the
    // aggregate. The ghost must emit when any per-faction streak flag is set.
    it('fires when the RBiH per-faction recovery streak flag is set (#267)', () => {
        const s = makeState({ event_flags: { equipment_quality_recovery_streak_active_RBiH: true } });
        const got = findGhost(buildGhostEntries(s, 50), 'equipment_quality_recovered');
        expect(got).toBeDefined();
        expect(got?.path).toBe('data/codex/ghost_entries/equipment_quality_recovered.md');
    });
    it('fires when the RS per-faction recovery streak flag is set (#267)', () => {
        const s = makeState({ event_flags: { equipment_quality_recovery_streak_active_RS: true } });
        expect(findGhost(buildGhostEntries(s, 50), 'equipment_quality_recovered')).toBeDefined();
    });
    it('fires when the HRHB per-faction recovery streak flag is set (#267)', () => {
        const s = makeState({ event_flags: { equipment_quality_recovery_streak_active_HRHB: true } });
        expect(findGhost(buildGhostEntries(s, 50), 'equipment_quality_recovered')).toBeDefined();
    });
    it('does not fire when a per-faction streak flag is set but collapse is also set (mutual exclusion)', () => {
        const s = makeState({
            event_flags: {
                equipment_quality_recovery_streak_active_RBiH: true,
                equipment_quality_collapsed: true,
            },
        });
        expect(findGhost(buildGhostEntries(s, 100), 'equipment_quality_recovered')).toBeUndefined();
    });
});

// ─── W6: negotiation_capital_recovered (mutually exclusive w/ exhausted) ───

describe('WAVE-3 builder — W6: negotiation_capital_recovered gating', () => {
    it('does not fire without the flag', () => {
        expect(findGhost(buildGhostEntries(makeState(), 100), 'negotiation_capital_recovered')).toBeUndefined();
    });
    it('does not fire when negotiation_capital_exhausted is also set (mutual exclusion)', () => {
        const s = makeState({
            event_flags: {
                negotiation_capital_recovered: true,
                negotiation_capital_exhausted: true,
            },
        });
        expect(findGhost(buildGhostEntries(s, 100), 'negotiation_capital_recovered')).toBeUndefined();
    });
    it('fires on the single flag', () => {
        const s = makeState({ event_flags: { negotiation_capital_recovered: true } });
        expect(findGhost(buildGhostEntries(s, 50), 'negotiation_capital_recovered')).toBeDefined();
    });
});

// ─── W7: faction-agnostic on symmetric input ──────────────────────────────

describe('WAVE-3 builder — W7: predicates remain faction-agnostic on symmetric input', () => {
    it('emits identical Wave-3 id sets across RBiH/RS/HRHB', () => {
        function idsFor(faction: FactionId): string[] {
            const s = makeState({
                event_flags: activeWave3Flags(),
                war_crimes_events: 0,
                player_faction: faction,
            });
            return buildGhostEntries(s, 200)
                .map((g) => g.ghost_id)
                .filter((id) => (WAVE_3_IDS as readonly string[]).includes(id));
        }
        const rbih = idsFor('RBiH' as FactionId);
        expect(idsFor('RS' as FactionId)).toEqual(rbih);
        expect(idsFor('HRHB' as FactionId)).toEqual(rbih);
        for (const id of WAVE_3_IDS) {
            expect(rbih).toContain(id);
        }
    });
});

// ─── W8: ring + variant invariants ────────────────────────────────────────

describe('WAVE-3 builder — W8: ring=2 and variant=context', () => {
    it('all Wave-3 ghosts emit ring_classification=2 and variant=context', () => {
        const s = makeState({ event_flags: activeWave3Flags(), war_crimes_events: 0 });
        const ghosts = buildGhostEntries(s, 200);
        const w3 = new Set<string>(WAVE_3_IDS);
        for (const g of ghosts) {
            if (w3.has(g.ghost_id)) {
                expect(g.ring_classification).toBe(2);
                expect(g.variant).toBe('context');
                expect(g.path).toMatch(/^data\/codex\/ghost_entries\/.+\.md$/);
            }
        }
    });
});

// ─── W9: byte-identical dormancy — empty state emits zero Wave-3 ghosts ────

describe('WAVE-3 builder — W9: benign empty state emits zero Wave-3 ghosts', () => {
    it('emits no Wave-3 ghosts at turn 50 or turn 200 on empty state', () => {
        for (const turn of [50, 200]) {
            const emitted = buildGhostEntries(makeState(), turn)
                .map((g) => g.ghost_id)
                .filter((id) => (WAVE_3_IDS as readonly string[]).includes(id));
            expect(emitted).toEqual([]);
        }
    });
});

// ─── W10: deterministic ordering across builds ────────────────────────────

describe('WAVE-3 builder — W10: deterministic ordering across builds', () => {
    it('emits a stable strictCompare (ASCII-sorted) order across repeated builds', () => {
        const s = makeState({ event_flags: activeWave3Flags(), war_crimes_events: 0 });
        const a = buildGhostEntries(s, 200).map((g) => g.ghost_id);
        const b = buildGhostEntries(s, 200).map((g) => g.ghost_id);
        expect(b).toEqual(a);
        expect(a).toEqual([...a].sort());
    });
});
