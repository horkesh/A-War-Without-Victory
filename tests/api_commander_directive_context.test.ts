/**
 * LANE-NIGHTSHIFT-API-DIRECTIVE-BRIDGE
 *
 * Tests for the political → army chain context section that
 * `tools/claude_plays_vrs/api_commander.ts` injects into the Claude API
 * commander's user prompt. The section bridges the deterministic C1 substrate
 * (`state.military.army_corps_directives_by_faction[faction][corpsId]`) and
 * B1 producer slot (`state.military.political_directives_by_faction[faction]`)
 * into the API path so it sees the same context the deterministic corps
 * commander gets via `briefing.campaign_role`.
 *
 * Refs:
 *   • C1 (persistence): commit 5084071d (re-applied as c084dd86) —
 *     `src/sim/combat/army_order_interpretation.ts:persistCorpsDirectives`
 *   • C-lane DDR: docs/40_reports/audits/20260506_C_LANE_BOT_CORPS_ORDERS_CONSUMER_DDR.md
 *   • B-lane DDR: docs/40_reports/audits/20260506_B_LANE_POLITICAL_DIRECTIVE_PRODUCER_DDR.md
 *
 * Tests use the exported helper `buildChainContextSection(state, faction)`
 * directly. We mock `@anthropic-ai/sdk` at the module level so any code path
 * that touches the Anthropic client cannot make real network calls.
 *
 * Determinism: pure function over a hand-rolled `state.military` slot. No
 * Math.random / Date.now / timestamps in either the helper or the tests.
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

// ─── Mock the Anthropic SDK at the module level ────────────────────────────
// The helper under test does not call into the SDK, but importing api_commander
// re-exports the top-level `import Anthropic from '@anthropic-ai/sdk'`. We
// neutralize the SDK so even an accidental client.messages.create() in the
// helper path would not make a network call.
vi.mock('@anthropic-ai/sdk', () => {
    const messagesCreate = vi.fn(async () => ({
        content: [{ type: 'text', text: '{}' }],
        model: 'mock-model',
        usage: { input_tokens: 0, output_tokens: 0 },
    }));
    class MockAnthropic {
        messages = { create: messagesCreate };
    }
    return { default: MockAnthropic };
});

import type { GameState, FactionId } from '../src/state/game_state.js';
import { buildChainContextSection } from '../tools/claude_plays_vrs/api_commander.js';

// ─── Minimal state fixture ─────────────────────────────────────────────────

/**
 * The helper reads only `state.military.political_directives_by_faction` and
 * `state.military.army_corps_directives_by_faction`. We can pass any object
 * shaped to those slots — cast to `GameState` to satisfy the public signature.
 */
function makeState(opts: {
    political_directives_by_faction?: Record<string, {
        verb: string;
        target_corps_id?: string;
        directive_id?: string;
        magnitude?: string;
        permission_flags?: string[];
    } | undefined>;
    army_corps_directives_by_faction?: Record<string, Record<string, {
        corps_id: string;
        role: 'primary' | 'secondary' | 'economy' | 'contain';
        deviated: boolean;
    }>>;
} = {}): GameState {
    return {
        military: {
            political_directives_by_faction: opts.political_directives_by_faction,
            army_corps_directives_by_faction: opts.army_corps_directives_by_faction,
        },
    } as unknown as GameState;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function withEnv(key: string, value: string | undefined, fn: () => void): void {
    const prior = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
    try {
        fn();
    } finally {
        if (prior === undefined) delete process.env[key];
        else process.env[key] = prior;
    }
}

const HEADER = '=== Political-Army Chain Context ===';
const FALLBACK = '(no political directive issued this turn)';

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('LANE-NIGHTSHIFT-API-DIRECTIVE-BRIDGE — buildChainContextSection', () => {
    beforeEach(() => {
        // Ensure env flag is unset for the default path.
        delete process.env.C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED;
    });

    afterEach(() => {
        delete process.env.C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED;
    });

    // T1: prompt includes the political directive verb when state has one populated.
    it('T1: surfaces political directive verb when slot is populated', () => {
        const state = makeState({
            political_directives_by_faction: {
                RS: {
                    verb: 'PRESS_OFFENSIVE',
                    target_corps_id: 'vrs_drina',
                    directive_id: 'b1:RS:PRESS_OFFENSIVE:5',
                    magnitude: 'maximum',
                    permission_flags: ['authorize_offensive', 'authorize_reserve_commitment'],
                },
            },
        });
        const out = buildChainContextSection(state, 'RS' as FactionId);
        expect(out).toContain(HEADER);
        expect(out).toContain('Political directive (from president): PRESS_OFFENSIVE');
        expect(out).toContain('target corps_id=vrs_drina');
        expect(out).toContain('magnitude=maximum');
        expect(out).toContain('permissions=authorize_offensive,authorize_reserve_commitment');
    });

    // T2: prompt includes per-corps role overlays sorted by corps_id alphabetically.
    it('T2: per-corps role overlays sorted alphabetically by corps_id', () => {
        const state = makeState({
            army_corps_directives_by_faction: {
                RS: {
                    vrs_sarajevo_romanija: { corps_id: 'vrs_sarajevo_romanija', role: 'contain', deviated: false },
                    vrs_drina:             { corps_id: 'vrs_drina',             role: 'primary', deviated: false },
                    vrs_east_bosnian:      { corps_id: 'vrs_east_bosnian',      role: 'secondary', deviated: false },
                },
            },
        });
        const out = buildChainContextSection(state, 'RS' as FactionId);
        const idxDrina   = out.indexOf('vrs_drina');
        const idxEast    = out.indexOf('vrs_east_bosnian');
        const idxSarRom  = out.indexOf('vrs_sarajevo_romanija');
        expect(idxDrina).toBeGreaterThan(0);
        expect(idxEast).toBeGreaterThan(idxDrina);
        expect(idxSarRom).toBeGreaterThan(idxEast);
        expect(out).toContain('role=primary');
        expect(out).toContain('role=secondary');
        expect(out).toContain('role=contain');
    });

    // T3: prompt notes deviation when corps_directives[i].deviated === true.
    it('T3: notes deviation flag when deviated=true', () => {
        const state = makeState({
            army_corps_directives_by_faction: {
                RS: {
                    vrs_drina: { corps_id: 'vrs_drina', role: 'primary', deviated: false },
                    vrs_sarajevo_romanija: { corps_id: 'vrs_sarajevo_romanija', role: 'contain', deviated: true },
                },
            },
        });
        const out = buildChainContextSection(state, 'RS' as FactionId);
        // vrs_drina: full
        expect(out).toMatch(/vrs_drina:.*compliance: full/);
        // vrs_sarajevo_romanija: deviated
        expect(out).toMatch(/vrs_sarajevo_romanija:.*compliance: deviated/);
    });

    // T4: prompt falls back to "no directive" when slot absent.
    it('T4: emits fallback when neither slot is populated', () => {
        const state = makeState();
        const out = buildChainContextSection(state, 'RS' as FactionId);
        expect(out).toBe(`${HEADER}\n${FALLBACK}`);
    });

    // T5: env flag → forced fallback even when slot would otherwise produce content.
    it('T5: C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED=true forces fallback', () => {
        const state = makeState({
            political_directives_by_faction: {
                RS: { verb: 'PRESS_OFFENSIVE', target_corps_id: 'vrs_drina' },
            },
            army_corps_directives_by_faction: {
                RS: {
                    vrs_drina: { corps_id: 'vrs_drina', role: 'primary', deviated: false },
                },
            },
        });
        withEnv('C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED', 'true', () => {
            const out = buildChainContextSection(state, 'RS' as FactionId);
            expect(out).toBe(`${HEADER}\n${FALLBACK}`);
            expect(out).not.toContain('PRESS_OFFENSIVE');
            expect(out).not.toContain('vrs_drina');
        });
    });

    // T6: deterministic — re-build prompt from same state produces byte-identical text.
    it('T6: deterministic — same state yields byte-identical output', () => {
        const state = makeState({
            political_directives_by_faction: {
                RS: { verb: 'HOLD_AT_ALL_COSTS', target_corps_id: 'vrs_east_bosnian' },
            },
            army_corps_directives_by_faction: {
                RS: {
                    vrs_drina:        { corps_id: 'vrs_drina',        role: 'secondary', deviated: false },
                    vrs_east_bosnian: { corps_id: 'vrs_east_bosnian', role: 'primary',   deviated: false },
                    vrs_sarajevo_romanija: { corps_id: 'vrs_sarajevo_romanija', role: 'contain', deviated: true },
                },
            },
        });
        const out1 = buildChainContextSection(state, 'RS' as FactionId);
        const out2 = buildChainContextSection(state, 'RS' as FactionId);
        const out3 = buildChainContextSection(state, 'RS' as FactionId);
        expect(out1).toBe(out2);
        expect(out2).toBe(out3);
    });

    // T7 (faction-symmetric): same code path produces same shape for RBiH/RS/HRHB.
    it('T7: faction-symmetric — same shape for RBiH/RS/HRHB', () => {
        const factions: FactionId[] = ['RBiH', 'RS', 'HRHB'];
        const directives: Record<string, { verb: string; target_corps_id: string }> = {
            RBiH: { verb: 'BALANCE_FRONTS',  target_corps_id: 'arbih_2nd_corps' },
            RS:   { verb: 'PRESS_OFFENSIVE', target_corps_id: 'vrs_drina'       },
            HRHB: { verb: 'HOLD_AT_ALL_COSTS', target_corps_id: 'hvo_central_bosnia' },
        };
        const corpsMaps: Record<string, Record<string, { corps_id: string; role: 'primary'; deviated: false }>> = {
            RBiH: { arbih_2nd_corps:    { corps_id: 'arbih_2nd_corps',    role: 'primary', deviated: false } },
            RS:   { vrs_drina:          { corps_id: 'vrs_drina',          role: 'primary', deviated: false } },
            HRHB: { hvo_central_bosnia: { corps_id: 'hvo_central_bosnia', role: 'primary', deviated: false } },
        };
        const state = makeState({
            political_directives_by_faction: directives as any,
            army_corps_directives_by_faction: corpsMaps as any,
        });
        for (const f of factions) {
            const out = buildChainContextSection(state, f);
            expect(out).toContain(HEADER);
            expect(out).toContain('Political directive (from president):');
            expect(out).toContain('Army CO translation (per-corps role overlays):');
        }
    });
});
