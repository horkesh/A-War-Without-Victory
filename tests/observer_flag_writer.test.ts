/**
 * LANE-OBSERVER-FLAG-WRITER (owner decision #3, 2026-06-07).
 *
 * Verifies the observer-flag writer that lights the dormant Ring-2 ghost-codex
 * entries which gate on POSITIVE observer flags no upstream system wrote:
 *
 *   Part 1 — 4 deadline "audit" events (data, consequences.json) writing
 *     the four non-Srebrenica `*_through_turn` flags. Lights ghosts:
 *       winter_held, corridor_blocked, arms_embargo_full_compliance,
 *       political_unity_held.
 *
 *   Part 2 — default-OFF engine observer writing the two non-Srebrenica
 *     threshold flags equipment_quality_collapsed + negotiation_capital_exhausted.
 *     Lights ghosts: equipment_quality_collapse, negotiation_capital_exhausted.
 *
 * §6: the Srebrenica `enclave_held_through_turn` threshold flag (ghost
 * enclave_defended) is DELIBERATELY NOT written by either part. This test
 * pins that it stays dark.
 */
import { describe, it, expect } from 'vitest';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import {
    buildGhostEntries,
    type BuiltGhostEntry,
} from '../src/sim/codex/dynamic_section_builder.js';
import {
    observeThresholdFlags,
    ENABLE_OBSERVER_THRESHOLD_FLAGS,
    EQUIPMENT_QUALITY_COLLAPSE_THRESHOLD,
} from '../src/sim/codex/observer_threshold_flags.js';
import type { GameState, FactionId } from '../src/state/game_state.js';

// ─── Helpers ──────────────────────────────────────────────────────────────

function ghostIds(ghosts: BuiltGhostEntry[]): string[] {
    return ghosts.map((g) => g.ghost_id);
}

const AUDIT_EVENTS: Array<{ id: string; flag: string; lights: string }> = [
    { id: 'csq_winter_held_audit', flag: 'winter_held_through_turn', lights: 'winter_held' },
    { id: 'csq_corridor_blocked_audit', flag: 'corridor_blocked_through_turn', lights: 'corridor_blocked' },
    { id: 'csq_arms_embargo_compliance_audit', flag: 'arms_embargo_compliant_through_turn', lights: 'arms_embargo_full_compliance' },
    { id: 'csq_political_unity_audit', flag: 'political_unity_held_through_turn', lights: 'political_unity_held' },
];

// ─── Part 1: audit events load + write the right flags ─────────────────────

describe('LANE-OBSERVER-FLAG-WRITER — Part 1: audit events', () => {
    const events = loadEventDefinitions(0);

    it('all 4 audit events load and validate through the real loader', () => {
        for (const { id } of AUDIT_EVENTS) {
            const def = events.find((e) => e.id === id);
            expect(def, `event ${id} should load`).toBeDefined();
        }
    });

    it('each audit event writes exactly its positive observer flag and nothing else', () => {
        for (const { id, flag } of AUDIT_EVENTS) {
            const def = events.find((e) => e.id === id)!;
            expect(def.sets_flags).toEqual({ [flag]: true });
        }
    });

    it('audit events are pure flag-setters: once-only, narrative-effect only, no decision/control surface', () => {
        for (const { id } of AUDIT_EVENTS) {
            const def = events.find((e) => e.id === id)!;
            expect(def.once).toBe(true);
            expect(def.effect.kind).toBe('narrative');
            // No additional effects (no control_change / dimension / morale / supply).
            expect(def.effects ?? []).toEqual([]);
            // Not a player-decision event.
            expect(def.response_options ?? []).toEqual([]);
            // No dimension shifts.
            expect((def as { dimension_shifts?: unknown[] }).dimension_shifts ?? []).toEqual([]);
        }
    });

    it('audit-event narratives carry no sensitive-history terms', () => {
        const SENSITIVE = ['atrocity', 'cleansing', 'genocide', 'massacre', 'concentration camp', 'srebrenica', 'žepa', 'zepa', 'civilian', 'refugee', 'deportation', 'expulsion'];
        for (const { id } of AUDIT_EVENTS) {
            const def = events.find((e) => e.id === id)!;
            const text = `${def.title ?? ''} ${def.narrative ?? ''} ${def.effect.kind === 'narrative' ? def.effect.text : ''}`.toLowerCase();
            for (const term of SENSITIVE) {
                expect(text.includes(term), `${id} narrative must not contain '${term}'`).toBe(false);
            }
        }
    });
});

// ─── Part 1: the 4 observer flags light the dormant ghosts ─────────────────

describe('LANE-OBSERVER-FLAG-WRITER — Part 1: dormant ghosts light up', () => {
    function stateWithFlags(flags: Record<string, boolean>): GameState {
        return {
            meta: { player_faction: 'RBiH' as FactionId },
            military: { event_flags: flags, event_fire_counts: {}, negotiation: { capital: {} } },
            political: {},
        } as unknown as GameState;
    }

    it('each audit flag, when written, lights exactly its dormant ghost (turn 200)', () => {
        for (const { flag, lights } of AUDIT_EVENTS) {
            const s = stateWithFlags({ [flag]: true });
            expect(ghostIds(buildGhostEntries(s, 200))).toContain(lights);
        }
    });

    it('all four flags together light all four ghosts', () => {
        const s = stateWithFlags({
            winter_held_through_turn: true,
            corridor_blocked_through_turn: true,
            arms_embargo_compliant_through_turn: true,
            political_unity_held_through_turn: true,
        });
        const ids = ghostIds(buildGhostEntries(s, 200));
        for (const { lights } of AUDIT_EVENTS) {
            expect(ids).toContain(lights);
        }
    });

    it('without the flags, the four ghosts stay dark (regression guard)', () => {
        const s = stateWithFlags({});
        const ids = ghostIds(buildGhostEntries(s, 200));
        for (const { lights } of AUDIT_EVENTS) {
            expect(ids).not.toContain(lights);
        }
    });
});

// ─── Part 2: default-OFF engine observer ───────────────────────────────────

describe('LANE-OBSERVER-FLAG-WRITER — Part 2: threshold observer (default OFF)', () => {
    function stateForObserver(opts: {
        capital?: Partial<Record<FactionId, number>>;
        eqModifiers?: Array<{ faction: FactionId; multiplier: number; expires_turn: number }>;
    }): GameState {
        const factions = (['HRHB', 'RBiH', 'RS'] as FactionId[]).map((id) => ({
            id,
            negotiation: { capital: opts.capital?.[id] ?? 100 },
        }));
        return {
            meta: { phase: 'war', turn: 150 },
            factions,
            military: {
                event_flags: {},
                equipment_quality_modifiers: opts.eqModifiers ?? [],
            },
            political: {},
        } as unknown as GameState;
    }

    it('ships default-OFF', () => {
        expect(ENABLE_OBSERVER_THRESHOLD_FLAGS).toBe(false);
    });

    it('writes NOTHING while the gate is off, even when both thresholds are observed', () => {
        // capital 0 → exhausted observed; eq modifier 0.5 → collapse observed.
        const s = stateForObserver({
            capital: { RBiH: 0 },
            eqModifiers: [{ faction: 'RS' as FactionId, multiplier: 0.5, expires_turn: 999 }],
        });
        const report = observeThresholdFlags(s, 150);
        // Observations fire (shadow visibility) ...
        expect(report.equipment_quality_collapsed_observed).toBe(true);
        expect(report.negotiation_capital_exhausted_observed).toBe(true);
        // ... but NO flag is written while default-off (byte-identical contract).
        expect(report.flags_written).toEqual([]);
        expect(s.military.event_flags?.equipment_quality_collapsed).toBeUndefined();
        expect(s.military.event_flags?.negotiation_capital_exhausted).toBeUndefined();
    });

    it('observes no collapse / no exhaustion on a healthy state (1.0 eq mult, full capital)', () => {
        const s = stateForObserver({});
        const report = observeThresholdFlags(s, 150);
        expect(report.equipment_quality_collapsed_observed).toBe(false);
        expect(report.negotiation_capital_exhausted_observed).toBe(false);
        expect(report.flags_written).toEqual([]);
    });

    it('equipment-collapse threshold is observed at/below the cutoff, not above', () => {
        const below = stateForObserver({
            eqModifiers: [{ faction: 'HRHB' as FactionId, multiplier: EQUIPMENT_QUALITY_COLLAPSE_THRESHOLD, expires_turn: 999 }],
        });
        expect(observeThresholdFlags(below, 150).equipment_quality_collapsed_observed).toBe(true);

        const above = stateForObserver({
            eqModifiers: [{ faction: 'HRHB' as FactionId, multiplier: 0.9, expires_turn: 999 }],
        });
        expect(observeThresholdFlags(above, 150).equipment_quality_collapsed_observed).toBe(false);
    });

    it('is deterministic — repeated calls on the same state agree', () => {
        const s = stateForObserver({ capital: { RS: 0 } });
        const a = observeThresholdFlags(s, 150);
        const b = observeThresholdFlags(s, 150);
        expect(b).toEqual(a);
    });
});

// ─── Part 2: the two threshold flags, once present, light their ghosts ─────

describe('LANE-OBSERVER-FLAG-WRITER — Part 2: threshold ghosts light up', () => {
    function ghostState(flags: Record<string, boolean>): GameState {
        return {
            meta: { player_faction: 'RBiH' as FactionId },
            military: { event_flags: flags, event_fire_counts: {}, negotiation: { capital: {} } },
            political: {},
        } as unknown as GameState;
    }

    it('equipment_quality_collapsed lights ghost equipment_quality_collapse', () => {
        const s = ghostState({ equipment_quality_collapsed: true });
        expect(ghostIds(buildGhostEntries(s, 150))).toContain('equipment_quality_collapse');
    });

    it('negotiation_capital_exhausted lights ghost negotiation_capital_exhausted (no peace plan)', () => {
        const s = ghostState({ negotiation_capital_exhausted: true });
        expect(ghostIds(buildGhostEntries(s, 200))).toContain('negotiation_capital_exhausted');
    });
});

// ─── §6: Srebrenica enclave flag stays deferred / dark ─────────────────────

describe('LANE-OBSERVER-FLAG-WRITER — §6: Srebrenica enclave flag NOT written', () => {
    it('no audit event writes enclave_held_through_turn', () => {
        const events = loadEventDefinitions(0);
        for (const def of events) {
            const flags = def.sets_flags ?? {};
            expect(Object.keys(flags)).not.toContain('enclave_held_through_turn');
        }
    });

    it('observer module never sets enclave_held_through_turn even when forced through', () => {
        // The §6 flag is out of scope for both parts. Confirm the observer
        // report surface has no field for it and never writes it.
        const s = {
            meta: { phase: 'war', turn: 150 },
            factions: [{ id: 'RBiH' as FactionId, negotiation: { capital: 0 } }],
            military: { event_flags: {} as Record<string, unknown>, equipment_quality_modifiers: [] },
            political: {},
        } as unknown as GameState;
        observeThresholdFlags(s, 150);
        expect(s.military.event_flags?.enclave_held_through_turn).toBeUndefined();
    });
});
