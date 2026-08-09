import { describe, expect, it } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import {
    getCoordinationCoherence,
    computeCoordinationCoherence,
    updateCoordinationCoherence,
    buildCoordinationCoherenceSnapshot,
    COORDINATION_COHERENCE_FLOOR,
    C2_SEVERED_COHERENCE_MULT,
    NATO_DELIBERATE_FORCE_EVENT_ID,
} from '../src/sim/combat/corps_coordination_coherence.js';

// E-B1 slice 4.1 — pure per-corps coordination_coherence derivation (diagnostics-only,
// behavior-inert). Mirrors the strategic_depth derivation shape; deterministic.

interface BuildOpts {
    depth?: number;            // strategic_depth to stamp on the corps
    aor?: string[];            // AOR OSIDs (all in one sector owned by the corps)
    control?: Record<string, string>; // political_controllers overrides
    firedEvents?: string[];
    faction?: 'RBiH' | 'RS' | 'HRHB';
    kind?: string;
}

function makeState(opts: BuildOpts = {}): GameState {
    const faction = opts.faction ?? 'RS';
    const aor = opts.aor ?? ['op:a:1', 'op:a:2', 'op:a:3', 'op:a:4'];
    // Default: whole AOR held by the corps faction.
    const control: Record<string, string> = {};
    for (const o of aor) control[o] = faction;
    Object.assign(control, opts.control ?? {});
    return {
        schema_version: 1,
        meta: { turn: 160, seed: 'eb1', phase: 'war' },
        factions: [{ id: faction, profile: {} }],
        military: {
            formations: {
                test_corps: {
                    id: 'test_corps',
                    faction,
                    kind: opts.kind ?? 'corps',
                    strategic_depth: opts.depth ?? 1.0,
                } as any,
            },
            corps_front_sectors: {
                'sector:test_corps:0': { corps_id: 'test_corps', territory_osids: aor } as any,
            },
            fired_event_ids: opts.firedEvents ?? [],
        } as any,
        political: { political_controllers: control } as any,
        displacement: {} as any,
    } as unknown as GameState;
}

describe('coordination_coherence — accessor default', () => {
    it('getCoordinationCoherence returns 1.0 for absent/invalid/undefined', () => {
        expect(getCoordinationCoherence(undefined)).toBe(1.0);
        expect(getCoordinationCoherence(null)).toBe(1.0);
        expect(getCoordinationCoherence({} as any)).toBe(1.0);
        expect(getCoordinationCoherence({ coordination_coherence: Number.NaN } as any)).toBe(1.0);
        expect(getCoordinationCoherence({ coordination_coherence: 0.42 } as any)).toBe(0.42);
    });

    it('non-corps formations compute to 1.0 (no effect)', () => {
        expect(computeCoordinationCoherence(makeState({ kind: 'brigade' }), 'test_corps' as any)).toBe(1.0);
        expect(computeCoordinationCoherence(makeState(), 'missing_corps' as any)).toBe(1.0);
    });
});

describe('coordination_coherence — derivation', () => {
    it('benign case (full depth, C2 intact, AOR fully held) = 1.0', () => {
        expect(computeCoordinationCoherence(makeState({ depth: 1.0 }), 'test_corps' as any)).toBe(1.0);
    });

    it('is deterministic — identical state yields identical value', () => {
        const a = computeCoordinationCoherence(makeState({ depth: 0.6 }), 'test_corps' as any);
        const b = computeCoordinationCoherence(makeState({ depth: 0.6 }), 'test_corps' as any);
        expect(a).toBe(b);
    });

    it('is bounded to [FLOOR, 1.0]', () => {
        // Worst case: low depth + C2 severed + fully contested AOR.
        const worst = computeCoordinationCoherence(
            makeState({
                depth: 0.1,
                firedEvents: [NATO_DELIBERATE_FORCE_EVENT_ID],
                control: { 'op:a:1': 'RBiH', 'op:a:2': 'RBiH', 'op:a:3': 'RBiH', 'op:a:4': 'RBiH' },
            }),
            'test_corps' as any,
        );
        expect(worst).toBeGreaterThanOrEqual(COORDINATION_COHERENCE_FLOOR);
        expect(worst).toBeLessThanOrEqual(1.0);
        // Best case caps at 1.0.
        expect(computeCoordinationCoherence(makeState({ depth: 1.0 }), 'test_corps' as any)).toBeLessThanOrEqual(1.0);
    });

    it('severed C2 (Deliberate Force fired) strictly lowers coherence', () => {
        const intact = computeCoordinationCoherence(makeState({ depth: 1.0 }), 'test_corps' as any);
        const severed = computeCoordinationCoherence(
            makeState({ depth: 1.0, firedEvents: [NATO_DELIBERATE_FORCE_EVENT_ID] }),
            'test_corps' as any,
        );
        expect(severed).toBeLessThan(intact);
        expect(severed).toBeCloseTo(C2_SEVERED_COHERENCE_MULT, 10);
    });

    it('contested AOR (adjacent-OSID losses) strictly lowers coherence', () => {
        const held = computeCoordinationCoherence(makeState({ depth: 1.0 }), 'test_corps' as any);
        const lost = computeCoordinationCoherence(
            makeState({ depth: 1.0, control: { 'op:a:1': 'RBiH', 'op:a:2': 'RBiH' } }), // half lost
            'test_corps' as any,
        );
        expect(lost).toBeLessThan(held);
    });

    it('lower strategic_depth lowers coherence (depth modulates)', () => {
        const high = computeCoordinationCoherence(makeState({ depth: 1.0 }), 'test_corps' as any);
        const low = computeCoordinationCoherence(makeState({ depth: 0.4 }), 'test_corps' as any);
        expect(low).toBeLessThan(high);
    });
});

describe('coordination_coherence — update + snapshot', () => {
    it('updateCoordinationCoherence persists the field on corps only, deterministically', () => {
        const s = makeState({ depth: 0.5, firedEvents: [NATO_DELIBERATE_FORCE_EVENT_ID] });
        updateCoordinationCoherence(s);
        const corps = s.military.formations!.test_corps as any;
        expect(typeof corps.coordination_coherence).toBe('number');
        expect(corps.coordination_coherence).toBe(computeCoordinationCoherence(s, 'test_corps' as any));
    });

    it('buildCoordinationCoherenceSnapshot returns sorted per-corps rows with turn', () => {
        const snap = buildCoordinationCoherenceSnapshot(makeState({ depth: 0.8 }));
        expect(snap.turn).toBe(160);
        expect(snap.corps.length).toBe(1);
        expect(snap.corps[0]).toMatchObject({ corps_id: 'test_corps', faction: 'RS' });
        expect(snap.corps[0].coordination_coherence).toBeGreaterThan(0);
    });
});
