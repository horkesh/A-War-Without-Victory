/**
 * §6 Srebrenica codex-receipt (#78) — read-model verification.
 *
 * `buildDynamicSections` surfaces a Ring-2 codex receipt for the Srebrenica
 * rupture (`srebrenica_genocide_1995`) ONLY when that rupture is ALREADY
 * recorded on `state.military.negotiation.rupture_consequences` (the locked
 * array written by `evaluateRuptureConsequences`). These tests pin:
 *
 *   - dormant when no rupture is recorded (Phase-0 byte-identical),
 *   - one receipt with the correct target essay + `FINDING:rupture_*` join key
 *     when the rupture is recorded,
 *   - the receipt is NEVER framed as a player `outcome` (§6 refused surface),
 *   - idempotent / deterministic,
 *   - READ-ONLY: building the receipt does not mutate the input state
 *     (calibration-inert by construction — proves the builder writes nothing).
 *
 * Determinism: no Math.random / Date.now; fixed registry order + strictCompare.
 */
import { describe, it, expect } from 'vitest';
import {
    buildDynamicSections,
    buildDynamicCodex,
    type BuilderInput,
} from '../src/sim/codex/dynamic_section_builder.js';
import type { GameState } from '../src/state/game_state.js';

interface RuptureStub {
    id: string;
    recorded_turn?: number;
    perpetrator_faction?: string;
    description?: string;
    condemnation_flag?: string;
}

function makeState(ruptures: RuptureStub[] = []): GameState {
    const baseState = {
        paramilitary_policy: 'ask',
        meta: { player_faction: 'RBiH' },
        military: {
            event_flags: {},
            event_fire_counts: {},
            event_decision_log: [],
            negotiation: {
                capital: {},
                patron_relationships: {},
                peace_plan_history: [],
                rupture_consequences: ruptures,
            },
        },
        political: {},
    };
    return baseState as unknown as GameState;
}

const SREBRENICA_RUPTURE: RuptureStub = {
    id: 'srebrenica_genocide_1995',
    recorded_turn: 142,
    perpetrator_faction: 'RS',
    description: 'Fall of the Srebrenica safe area and subsequent genocide of Bosniak men and boys',
    condemnation_flag: 'genocide_condemnation',
};

describe('§6 Srebrenica codex-receipt (#78)', () => {
    it('emits NO rupture receipt when no rupture is recorded', () => {
        const input: BuilderInput = { state: makeState([]), currentTurn: 188 };
        const sections = buildDynamicSections(input);
        expect(sections.some((s) => s.id.startsWith('rupture_receipt_'))).toBe(false);
    });

    it('surfaces exactly one Srebrenica receipt keyed on the authored FINDING join', () => {
        const input: BuilderInput = { state: makeState([SREBRENICA_RUPTURE]), currentTurn: 188 };
        const sections = buildDynamicSections(input);
        const receipts = sections.filter((s) => s.id === 'rupture_receipt_srebrenica_genocide_1995');
        expect(receipts).toHaveLength(1);
        const r = receipts[0];
        expect(r.target_essay_event_id).toBe('srebrenica_falls_1995');
        expect(r.ring_classification).toBe(2);
        // Join key matches the already-authored essay_index dynamic section.
        expect(r.conditional_on).toEqual(['FINDING:rupture_srebrenica_genocide_1995']);
    });

    it('NEVER frames the receipt as a player outcome (§6 refused surface)', () => {
        const input: BuilderInput = { state: makeState([SREBRENICA_RUPTURE]), currentTurn: 188 };
        const sections = buildDynamicSections(input);
        for (const s of sections) {
            if (s.id.startsWith('rupture_receipt_')) {
                expect(s.variant).not.toBe('outcome');
                expect(s.variant).toBe('divergence');
            }
        }
    });

    it('is idempotent across duplicate recorded entries (one receipt only)', () => {
        const input: BuilderInput = {
            state: makeState([SREBRENICA_RUPTURE, SREBRENICA_RUPTURE]),
            currentTurn: 188,
        };
        const sections = buildDynamicSections(input);
        const receipts = sections.filter((s) => s.id === 'rupture_receipt_srebrenica_genocide_1995');
        expect(receipts).toHaveLength(1);
    });

    it('ignores unknown rupture ids (no receipt for un-registered ruptures)', () => {
        const input: BuilderInput = {
            state: makeState([{ id: 'some_unwired_rupture' }]),
            currentTurn: 188,
        };
        const sections = buildDynamicSections(input);
        expect(sections.some((s) => s.id.startsWith('rupture_receipt_'))).toBe(false);
    });

    it('is deterministic (same input → byte-identical output)', () => {
        const a = buildDynamicSections({ state: makeState([SREBRENICA_RUPTURE]), currentTurn: 188 });
        const b = buildDynamicSections({ state: makeState([SREBRENICA_RUPTURE]), currentTurn: 188 });
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });

    it('is READ-ONLY: building the receipt does not mutate the input state (calibration-inert)', () => {
        const state = makeState([SREBRENICA_RUPTURE]);
        const before = JSON.stringify(state);
        buildDynamicSections({ state, currentTurn: 188 });
        buildDynamicCodex({ state, currentTurn: 188 });
        expect(JSON.stringify(state)).toBe(before);
    });

    it('combined buildDynamicCodex surfaces the receipt under sections', () => {
        const result = buildDynamicCodex({ state: makeState([SREBRENICA_RUPTURE]), currentTurn: 188 });
        expect(
            result.sections.some((s) => s.id === 'rupture_receipt_srebrenica_genocide_1995'),
        ).toBe(true);
    });
});
