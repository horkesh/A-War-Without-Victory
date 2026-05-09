/**
 * LANE-NIGHTSHIFT-D1-D2-CLAUDE-PERSONAS — D1 persona infrastructure tests.
 *
 * Verifies:
 *   - Persona JSON files load with valid schema (T1, T10).
 *   - loadPersona returns named-officer voice with decision priors (T2).
 *   - Archetype fallback for unnamed corps_co (T3).
 *   - api_president opt-in gate is OFF by default (T4).
 *   - api_president call path returns shaped directive with mocked SDK (T5).
 *   - Auto-swap by tenure honours A4 roster successor schedule (T6).
 *   - Faction-symmetric code paths (T7).
 *   - Prompt assembly is deterministic (T8).
 *   - Static-grep guard: no Math.random / Date.now / new Date / setTimeout
 *     in source (T9).
 *
 * Determinism: pure file IO + sorted iteration. No timestamps. SDK mocked
 * at module level so api_president cannot make real network calls.
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ─── Mock the Anthropic SDK at the module level ────────────────────────────

vi.mock('@anthropic-ai/sdk', () => {
    const messagesCreate = vi.fn(async () => ({
        content: [{
            type: 'text',
            text: JSON.stringify({
                verb: 'maintain_siege',
                target_corps_id: 'vrs_sarajevo_romanija',
                magnitude: 'limited',
                permission_flags: ['avoid_escalation'],
                scratchpad_reasoning: 'Holding the siege as negotiation card.',
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

import {
    loadPersona,
    loadPersonaByTenure,
    rosterOfficerIdToPersonaId,
    resetPersonaCache,
    validatePersonaSchema,
    type Persona,
} from '../tools/claude_plays_vrs/persona_loader.js';
import {
    producePresidentDirective,
    isPresidentLayerEnabled,
    buildPresidentSystemPrompt,
    buildPresidentUserPrompt,
} from '../tools/claude_plays_vrs/api_president.js';
import type { GameState } from '../src/state/game_state.js';

const PERSONAS_DIR = resolve(process.cwd(), 'tools/claude_plays_vrs/personas');

const PRESIDENT_PERSONA_IDS = ['karadzic', 'izetbegovic', 'boban'];
const ARMY_CO_PERSONA_IDS = ['mladic', 'halilovic', 'delic', 'petkovic', 'praljak', 'roso'];
const CORPS_CO_PERSONA_IDS = ['vrs_drina_corps_co', 'vrs_srk_corps_co', 'vrs_1kk_corps_co', 'default_corps_co'];
const ALL_PERSONA_IDS = [...PRESIDENT_PERSONA_IDS, ...ARMY_CO_PERSONA_IDS, ...CORPS_CO_PERSONA_IDS];

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
        if (result instanceof Promise) {
            return result.finally(restore);
        }
        restore();
    } catch (err) {
        restore();
        throw err;
    }
}

function makeMinimalState(turn: number = 0): GameState {
    return {
        meta: { turn },
        political: { political_controllers: {} },
        military: { fired_event_ids: [] },
    } as unknown as GameState;
}

beforeEach(() => {
    resetPersonaCache();
    // Clear any test-set env flags so the gate-off default path holds.
    for (const key of Object.keys(process.env)) {
        if (key.startsWith('CLAUDE_AS_')) delete process.env[key];
    }
});

afterEach(() => {
    resetPersonaCache();
});

describe('D1 persona infrastructure', () => {
    // ─── T1: persona JSON files load with valid schema ──────────────────

    it('T1: all persona JSON files load with valid schema', () => {
        for (const id of ALL_PERSONA_IDS) {
            const persona = loadPersona(id);
            expect(persona, `persona for ${id} must load`).not.toBeNull();
            const violation = validatePersonaSchema(persona, id);
            expect(violation, `persona ${id} schema violations`).toBeNull();
        }
    });

    // ─── T2: Mladić named-officer persona with decision priors ──────────

    it('T2: loadPersona(mladic) returns Mladić structured persona with hawkish priors', () => {
        const persona = loadPersona('mladic') as Persona;
        expect(persona).not.toBeNull();
        expect(persona.id).toBe('mladic');
        expect(persona.role).toBe('army_co');
        expect(persona.faction).toBe('RS');
        expect(persona.name).toMatch(/Mladi/);
        // voice_prose should reference JNA / corridor / siege idiom.
        expect(persona.voice_prose).toMatch(/JNA/);
        expect(persona.voice_prose).toMatch(/corridor|Corridor|Posavina/);
        expect(persona.voice_prose).toMatch(/Sarajevo/);
        // decision_priors should reflect canonical hawkishness (5/5).
        const priors = persona.decision_priors as Record<string, unknown>;
        expect(priors.competence).toBe(5);
        expect(priors.aggressiveness).toBe(5);
        expect(priors.stubbornness).toBe(5);
    });

    // ─── T3: archetype fallback for unnamed corps_co ────────────────────

    it('T3: loadPersona(vrs_5th_corps_co, role=corps_co) falls back to default_corps_co archetype', () => {
        const persona = loadPersona('vrs_5th_corps_co', { role: 'corps_co' }) as Persona;
        expect(persona).not.toBeNull();
        expect(persona.id).toBe('default_corps_co');
        expect(persona.role).toBe('corps_co');
        // Archetype should be faction-null.
        expect(persona.faction).toBeNull();
    });

    // Archetype should NOT be returned when no role hint is provided.
    it('T3b: loadPersona(unknown_id) without role hint returns null', () => {
        const persona = loadPersona('unknown_officer_xyz');
        expect(persona).toBeNull();
    });

    // ─── T4: env flag absent = no API call ──────────────────────────────

    it('T4: producePresidentDirective returns null when env flag absent', async () => {
        await withEnv({}, async () => {
            const Anthropic = (await import('@anthropic-ai/sdk')).default;
            const client = new (Anthropic as any)({ apiKey: 'test' });
            const state = makeMinimalState(5);
            const result = await producePresidentDirective(client, state, 'RS');
            expect(result).toBeNull();
        });
    });

    // ─── T5: env flag set + mocked SDK = shaped directive ───────────────

    it('T5: with env flag + mocked SDK, producePresidentDirective returns valid directive', async () => {
        await withEnv({ CLAUDE_AS_PRESIDENT_RS: 'true' }, async () => {
            const Anthropic = (await import('@anthropic-ai/sdk')).default;
            const client = new (Anthropic as any)({ apiKey: 'test' });
            const state = makeMinimalState(5);
            const result = await producePresidentDirective(client, state, 'RS');
            expect(result).not.toBeNull();
            expect(result!.faction).toBe('RS');
            expect(result!.leader_name).toMatch(/Karad/);
            expect(result!.turn).toBe(5);
            expect(['hold_corridor', 'consolidate_drina', 'maintain_siege', 'reject_partition_plan',
                'selective_advance', 'defend_enclave', 'negotiate', 'preserve_republic',
                'accept_ceasefire', 'mobilize_general', 'consolidate_herzegovina',
                'hold_central_bosnia', 'screen_arbih_axis', 'accept_zagreb_directive',
                'accept_washington_framework', 'no_directive']).toContain(result!.verb);
            expect(result!.magnitude).toBe('limited');
            expect(result!.permission_flags).toEqual(['avoid_escalation']);
            expect(typeof result!.scratchpad_reasoning).toBe('string');
            expect(typeof result!.prompt_tokens).toBe('number');
            expect(typeof result!.completion_tokens).toBe('number');
        });
    });

    // ─── T6: auto-swap on A4 successor schedule ─────────────────────────

    it('T6: auto-swap returns successor persona when turn >= successor tenure_start', () => {
        // RBiH: Halilović w0 → Delić w60.
        const before = loadPersonaByTenure('RBiH', 'army_co', 30) as Persona;
        const at = loadPersonaByTenure('RBiH', 'army_co', 60) as Persona;
        const after = loadPersonaByTenure('RBiH', 'army_co', 90) as Persona;
        expect(before).not.toBeNull();
        expect(before.id).toBe('halilovic');
        expect(at).not.toBeNull();
        expect(at.id).toBe('delic');
        expect(after).not.toBeNull();
        expect(after.id).toBe('delic');
    });

    it('T6b: auto-swap honours HRHB three-step succession (Petković → Praljak → Roso)', () => {
        const w10 = loadPersonaByTenure('HRHB', 'army_co', 10) as Persona;
        const w64 = loadPersonaByTenure('HRHB', 'army_co', 64) as Persona;
        const w80 = loadPersonaByTenure('HRHB', 'army_co', 80) as Persona;
        expect(w10).not.toBeNull();
        expect(w10.id).toBe('petkovic');
        expect(w64).not.toBeNull();
        expect(w64.id).toBe('praljak');
        expect(w80).not.toBeNull();
        expect(w80.id).toBe('roso');
    });

    // ─── T7: faction-symmetric code path ────────────────────────────────

    it('T7: same loadPersona code path works for all three factions', () => {
        const rs = loadPersona('mladic') as Persona;
        const rbih = loadPersona('halilovic') as Persona;
        const hrhb = loadPersona('petkovic') as Persona;
        expect(rs).not.toBeNull();
        expect(rbih).not.toBeNull();
        expect(hrhb).not.toBeNull();
        expect(rs.faction).toBe('RS');
        expect(rbih.faction).toBe('RBiH');
        expect(hrhb.faction).toBe('HRHB');
    });

    // ─── T8: deterministic prompt assembly ──────────────────────────────

    it('T8: buildPresidentSystemPrompt + buildPresidentUserPrompt are deterministic', () => {
        const persona = loadPersona('karadzic') as Persona;
        const state = makeMinimalState(7);
        const sys1 = buildPresidentSystemPrompt(persona);
        const sys2 = buildPresidentSystemPrompt(persona);
        const usr1 = buildPresidentUserPrompt(state, 'RS');
        const usr2 = buildPresidentUserPrompt(state, 'RS');
        expect(sys1).toBe(sys2);
        expect(usr1).toBe(usr2);
    });

    // ─── T9: static-grep guard for non-determinism ──────────────────────

    it('T9: persona_loader.ts / api_president.ts / persona_telemetry.ts / run_personas.ts contain no Math.random / new Date / setTimeout calls', () => {
        const files = [
            'tools/claude_plays_vrs/persona_loader.ts',
            'tools/claude_plays_vrs/api_president.ts',
            'tools/claude_plays_vrs/persona_telemetry.ts',
            'tools/claude_plays_vrs/run_personas.ts',
        ];
        // Strip line and block comments before pattern-matching so prose
        // mentions of "no Math.random" in determinism-doctrine comments do
        // not trigger the static-grep guard. The patterns then look for
        // function-call shape (Math.random( etc.) on remaining source.
        const stripComments = (src: string): string => src
            .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
            .replace(/(^|[^:])\/\/[^\n]*/g, '$1'); // line comments (keep URLs)
        for (const rel of files) {
            const raw = readFileSync(resolve(process.cwd(), rel), 'utf8');
            const src = stripComments(raw);
            expect(src, `${rel} must not call Math.random()`).not.toMatch(/Math\.random\s*\(/);
            expect(src, `${rel} must not call new Date()`).not.toMatch(/new\s+Date\s*\(/);
            expect(src, `${rel} must not call setTimeout`).not.toMatch(/setTimeout\s*\(/);
            // Date.now() is permitted ONLY in api_president.ts for latency_ms
            // measurement; not in persona_loader / telemetry / run.
            if (!rel.endsWith('api_president.ts')) {
                expect(src, `${rel} must not call Date.now()`).not.toMatch(/Date\.now\s*\(/);
            }
        }
    });

    // ─── T10: persona schema conformance for every JSON file in dir ─────

    it('T10: every persona JSON file in personas/ has id matching filename', () => {
        const files = readdirSync(PERSONAS_DIR).filter(f => f.endsWith('.json'));
        expect(files.length).toBeGreaterThanOrEqual(13);
        for (const file of files) {
            const expectedId = file.replace(/\.json$/, '');
            const raw = readFileSync(join(PERSONAS_DIR, file), 'utf8');
            const obj = JSON.parse(raw);
            expect(obj.id, `${file} id must match filename stem`).toBe(expectedId);
            const violation = validatePersonaSchema(obj, expectedId);
            expect(violation, `${file} schema violations`).toBeNull();
        }
    });

    // ─── Bonus: rosterOfficerIdToPersonaId stripping ────────────────────

    it('T11: rosterOfficerIdToPersonaId strips faction prefixes', () => {
        expect(rosterOfficerIdToPersonaId('vrs_mladic')).toBe('mladic');
        expect(rosterOfficerIdToPersonaId('arbih_halilovic')).toBe('halilovic');
        expect(rosterOfficerIdToPersonaId('hvo_petkovic')).toBe('petkovic');
        // Unprefixed id is returned unchanged.
        expect(rosterOfficerIdToPersonaId('mladic')).toBe('mladic');
    });

    // ─── Bonus: isPresidentLayerEnabled gate ────────────────────────────

    it('T12: isPresidentLayerEnabled honours per-faction, all-layers, and ALL flags', () => {
        return withEnv({
            CLAUDE_AS_PRESIDENT_RS: 'true',
            CLAUDE_AS_PRESIDENT_RBiH: undefined,
            CLAUDE_AS_PRESIDENT_HRHB: undefined,
            CLAUDE_AS_ALL_LAYERS_RBiH: 'true',
            CLAUDE_AS_ALL: undefined,
        }, () => {
            expect(isPresidentLayerEnabled('RS')).toBe(true);
            expect(isPresidentLayerEnabled('RBiH')).toBe(true);
            expect(isPresidentLayerEnabled('HRHB')).toBe(false);
        });
    });
});
