/**
 * LANE-NIGHTSHIFT-D2-TELEMETRY-WIRE-FIX (2026-05-07).
 *
 * Verifies the wire-up gap closed by this lane: each of the three persona
 * API entry points
 *   - tools/claude_plays_vrs/api_president.ts
 *   - tools/claude_plays_vrs/api_commander.ts
 *   - tools/claude_plays_vrs/api_corps_commander.ts
 * now calls `persona_telemetry.emitDecision()` exactly once per API
 * response with the correct payload shape (turn, faction, role,
 * officer_id, token counts, latency_ms, decision_summary, chain context
 * flag).
 *
 * We mock both `@anthropic-ai/sdk` (so no network call is made) and
 * `tools/claude_plays_vrs/persona_telemetry.ts` (so we can spy on
 * emitDecision without touching the JSONL filesystem). The
 * `persona_telemetry.ts` source itself is frozen by a sibling lane (D2)
 * and is NOT modified by this lane.
 *
 * Determinism: vi.mock + vi.fn; no Math.random / Date.now / setTimeout
 * in the test source. The api_*.ts modules use Date.now() for latency
 * measurement, which is permitted by the D1+D2 static-grep guard.
 *
 * Sensitive-history compliance: Ring 0 / tooling-only QA harness;
 * no engine touch; no §6 surface; faction-symmetric.
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

// ─── Mock the Anthropic SDK at the module level ────────────────────────────
// Default mock returns a parseable JSON envelope; individual tests override
// the return value via mockResolvedValueOnce.

vi.mock('@anthropic-ai/sdk', () => {
    const messagesCreate = vi.fn(async () => ({
        content: [{
            type: 'text',
            text: JSON.stringify({
                verb: 'maintain_siege',
                target_corps_id: 'vrs_sarajevo_romanija',
                scratchpad_reasoning: 'Siege as leverage.',
            }),
        }],
        model: 'mock-model',
        usage: { input_tokens: 100, output_tokens: 50 },
    }));
    class MockAnthropic {
        messages = { create: messagesCreate };
    }
    return { default: MockAnthropic };
});

// ─── Mock persona_telemetry.ts so we can spy on emitDecision ───────────────
// We DO NOT touch the real persona_telemetry.ts file; we replace it at
// import time with a vi.fn() spy. The spy lets each test assert that the
// api_*.ts call site invoked emitDecision exactly once with the expected
// payload shape.

vi.mock('../tools/claude_plays_vrs/persona_telemetry.js', () => {
    const emitDecision = vi.fn();
    return {
        emitDecision,
        isPersonaTelemetryDisabled: vi.fn(() => false),
        D2_TELEMETRY_OUTPUT_REL_PATH: 'data/derived/_debug/d_lane_persona_decisions.jsonl',
        D2_TELEMETRY_SCHEMA_VERSION: 1,
    };
});

import { producePresidentDirective } from '../tools/claude_plays_vrs/api_president.js';
import { generateApiDecision } from '../tools/claude_plays_vrs/api_commander.js';
import { generateCorpsApiDecision } from '../tools/claude_plays_vrs/api_corps_commander.js';
import { emitDecision } from '../tools/claude_plays_vrs/persona_telemetry.js';
import { resetPersonaCache } from '../tools/claude_plays_vrs/persona_loader.js';
import type { GameState } from '../src/state/game_state.js';

// ─── Helpers ───────────────────────────────────────────────────────────────

function withEnv(updates: Record<string, string | undefined>, fn: () => void | Promise<void>): void | Promise<void> {
    const prior: Record<string, string | undefined> = {};
    for (const key of Object.keys(updates)) {
        prior[key] = process.env[key];
        if (updates[key] === undefined) delete process.env[key];
        else process.env[key] = updates[key];
    }
    const restore = () => {
        for (const key of Object.keys(prior)) {
            if (prior[key] === undefined) delete process.env[key];
            else process.env[key] = prior[key];
        }
    };
    try {
        const result = fn();
        if (result instanceof Promise) return result.finally(restore);
        restore();
    } catch (err) {
        restore();
        throw err;
    }
}

function makeMinimalState(turn: number = 5): GameState {
    return {
        meta: { turn },
        political: { political_controllers: {} },
        military: {
            fired_event_ids: [],
            formations: {},
            corps_command: {},
            corps_front_sectors: {},
        },
    } as unknown as GameState;
}

// Minimal CommanderProfile shape for api_commander.generateApiDecision.
function makeProfile(faction: 'RS' | 'RBiH' | 'HRHB') {
    return {
        faction,
        commander: faction === 'RS' ? 'Mladić' : faction === 'RBiH' ? 'Halilović' : 'Petković',
        personality: { voice: 'test', competence: 4, aggressiveness: 4, risk_tolerance: 'medium' },
        strategic_doctrine: { priorities: ['hold'], red_lines: ['none'], historical_expectations: {} },
    };
}

beforeEach(() => {
    resetPersonaCache();
    (emitDecision as unknown as ReturnType<typeof vi.fn>).mockClear();
    for (const key of Object.keys(process.env)) {
        if (key.startsWith('CLAUDE_AS_') || key === 'CLAUDE_PERSONA_TELEMETRY_DISABLED') {
            delete process.env[key];
        }
    }
});

afterEach(() => {
    resetPersonaCache();
    for (const key of Object.keys(process.env)) {
        if (key.startsWith('CLAUDE_AS_') || key === 'CLAUDE_PERSONA_TELEMETRY_DISABLED') {
            delete process.env[key];
        }
    }
});

describe('LANE-NIGHTSHIFT-D2-TELEMETRY-WIRE-FIX — emitDecision wire-up', () => {
    // ─── T1: api_president calls emitDecision once with role=president ──

    it('T1: producePresidentDirective calls emitDecision once with role=president', async () => {
        await withEnv({ CLAUDE_AS_PRESIDENT_RS: 'true' }, async () => {
            const Anthropic = (await import('@anthropic-ai/sdk')).default;
            const client = new (Anthropic as any)({ apiKey: 'test' });
            const state = makeMinimalState(7);
            const result = await producePresidentDirective(client, state, 'RS');
            expect(result).not.toBeNull();
            const spy = emitDecision as unknown as ReturnType<typeof vi.fn>;
            expect(spy).toHaveBeenCalledTimes(1);
            const record = spy.mock.calls[0][0];
            expect(record.role).toBe('president');
            expect(record.faction).toBe('RS');
            expect(record.turn).toBe(7);
            expect(record.officer_id).toBe('karadzic');
            expect(record.prompt_tokens).toBe(100);
            expect(record.completion_tokens).toBe(50);
            expect(typeof record.latency_ms).toBe('number');
            expect(record.decision_summary).toMatch(/^verb=/);
            expect(record.chain_context_section_present).toBe(false);
        });
    });

    // ─── T2: api_president skips emit when env flag is OFF (early return) ─

    it('T2: producePresidentDirective does NOT call emitDecision when env flag absent', async () => {
        await withEnv({}, async () => {
            const Anthropic = (await import('@anthropic-ai/sdk')).default;
            const client = new (Anthropic as any)({ apiKey: 'test' });
            const state = makeMinimalState(7);
            const result = await producePresidentDirective(client, state, 'RS');
            expect(result).toBeNull();
            const spy = emitDecision as unknown as ReturnType<typeof vi.fn>;
            expect(spy).not.toHaveBeenCalled();
        });
    });

    // ─── T3: api_commander calls emitDecision once with role=army_co ────

    it('T3: generateApiDecision calls emitDecision once with role=army_co', async () => {
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        // Override default mock to return an army-CO-shaped JSON.
        const client = new (Anthropic as any)({ apiKey: 'test' });
        client.messages.create = vi.fn(async () => ({
            content: [{
                type: 'text',
                text: JSON.stringify({
                    corps_stances: { vrs_drina: 'offensive', vrs_sarajevo_romanija: 'balanced' },
                    briefing: 'Hold the corridor; press on Drina axis.',
                    strategic_reasoning: 'Corridor is fragile.',
                    observations: [],
                }),
            }],
            model: 'mock-model',
            usage: { input_tokens: 200, output_tokens: 80 },
        }));
        const profile = makeProfile('RS');
        const state = makeMinimalState(11);
        const result = await generateApiDecision(client, profile as any, state, 11, {});
        expect(result).not.toBeNull();
        const spy = emitDecision as unknown as ReturnType<typeof vi.fn>;
        expect(spy).toHaveBeenCalledTimes(1);
        const record = spy.mock.calls[0][0];
        expect(record.role).toBe('army_co');
        expect(record.faction).toBe('RS');
        expect(record.turn).toBe(11);
        expect(typeof record.officer_id).toBe('string');
        expect(record.officer_id.length).toBeGreaterThan(0);
        expect(record.prompt_tokens).toBe(200);
        expect(record.completion_tokens).toBe(80);
        expect(record.decision_summary).toMatch(/briefing_len=\d+/);
        expect(record.decision_summary).toMatch(/stances=/);
        expect(record.chain_context_section_present).toBe(true);
    });

    // ─── T4: api_commander emits even on parse-failure path ─────────────

    it('T4: generateApiDecision emits telemetry on parse-failure path', async () => {
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const client = new (Anthropic as any)({ apiKey: 'test' });
        client.messages.create = vi.fn(async () => ({
            content: [{ type: 'text', text: 'not valid json at all' }],
            model: 'mock-model',
            usage: { input_tokens: 50, output_tokens: 5 },
        }));
        const profile = makeProfile('RBiH');
        const state = makeMinimalState(3);
        const result = await generateApiDecision(client, profile as any, state, 3, {});
        // Parse failure returns a fallback object, not null.
        expect(result).not.toBeNull();
        expect(result.briefing).toMatch(/parse failure/);
        const spy = emitDecision as unknown as ReturnType<typeof vi.fn>;
        expect(spy).toHaveBeenCalledTimes(1);
        const record = spy.mock.calls[0][0];
        expect(record.role).toBe('army_co');
        expect(record.faction).toBe('RBiH');
        expect(record.decision_summary).toBe('parse_failure');
        expect(record.chain_context_section_present).toBe(true);
    });

    // ─── T5: api_corps_commander calls emitDecision once with role=corps_co ─

    it('T5: generateCorpsApiDecision calls emitDecision once with role=corps_co', async () => {
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const client = new (Anthropic as any)({ apiKey: 'test' });
        client.messages.create = vi.fn(async () => ({
            content: [{
                type: 'text',
                text: JSON.stringify({
                    sector_stances: { 'sector_a': 'fortify', 'sector_b': 'defend' },
                    assessment: 'Holding firm on both flanks.',
                }),
            }],
            model: 'mock-model',
            usage: { input_tokens: 150, output_tokens: 30 },
        }));
        const state = makeMinimalState(9);
        const result = await generateCorpsApiDecision(
            client,
            state,
            'RS',
            'vrs_drina',
            'Žıvanović',
            4,
            5,
            'Hold the Drina line.',
            {},
        );
        expect(result).not.toBeNull();
        const spy = emitDecision as unknown as ReturnType<typeof vi.fn>;
        expect(spy).toHaveBeenCalledTimes(1);
        const record = spy.mock.calls[0][0];
        expect(record.role).toBe('corps_co');
        expect(record.faction).toBe('RS');
        expect(record.turn).toBe(9);
        // vrs_drina maps to vrs_drina_corps_co persona id.
        expect(record.officer_id).toBe('vrs_drina_corps_co');
        expect(record.prompt_tokens).toBe(150);
        expect(record.completion_tokens).toBe(30);
        expect(record.decision_summary).toMatch(/assessment_len=\d+/);
        expect(record.decision_summary).toMatch(/sectors=/);
        expect(record.chain_context_section_present).toBe(false);
    });

    // ─── T6: faction-symmetric — same wire-up for RBiH, RS, HRHB ────────

    it('T6: emitDecision wire-up is faction-symmetric for president layer', async () => {
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const factions: Array<'RS' | 'RBiH' | 'HRHB'> = ['RBiH', 'RS', 'HRHB'];
        const expectedOfficerIds: Record<string, string> = {
            RBiH: 'izetbegovic',
            RS: 'karadzic',
            HRHB: 'boban',
        };
        const spy = emitDecision as unknown as ReturnType<typeof vi.fn>;
        for (const f of factions) {
            spy.mockClear();
            await withEnv({ [`CLAUDE_AS_PRESIDENT_${f}`]: 'true' }, async () => {
                const client = new (Anthropic as any)({ apiKey: 'test' });
                const state = makeMinimalState(2);
                const result = await producePresidentDirective(client, state, f);
                expect(result).not.toBeNull();
                expect(spy).toHaveBeenCalledTimes(1);
                const record = spy.mock.calls[0][0];
                expect(record.faction).toBe(f);
                expect(record.role).toBe('president');
                expect(record.officer_id).toBe(expectedOfficerIds[f]);
            });
        }
    });
});
