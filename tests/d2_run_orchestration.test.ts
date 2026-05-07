/**
 * LANE-NIGHTSHIFT-D1-D2-CLAUDE-PERSONAS — D2 run orchestration + telemetry
 * tests.
 *
 * Verifies:
 *   - parseEnvFlags correctly parses individual + wildcard env flags into a
 *     per-(faction, role, corps) opt-in matrix (T1).
 *   - Default (no env flags) yields zero opt-ins (T2).
 *   - CLAUDE_AS_ALL=true wildcard opts in all layers/factions/corps (T3).
 *   - persona_telemetry.emitDecision writes to side-channel JSONL (T4).
 *   - Telemetry side-channel disabled by env flag (T5).
 *   - Faction-symmetric (no per-faction branches in run_personas.ts) (T6).
 *   - Static-grep guard: no Math.random / Date.now / new Date /
 *     setTimeout (T7).
 *
 * Determinism: tests use temporary cwd-relative output paths and clean up
 * after themselves.
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync, rmSync, mkdtempSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

import {
    parseEnvFlags,
    isMatrixEmpty,
    activeLayersForFaction,
    estimateApiCost,
} from '../tools/claude_plays_vrs/run_personas.js';
import {
    emitDecision,
    isPersonaTelemetryDisabled,
    D2_TELEMETRY_OUTPUT_REL_PATH,
    type PersonaDecisionRecord,
} from '../tools/claude_plays_vrs/persona_telemetry.js';

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

function makeRecord(over: Partial<PersonaDecisionRecord> = {}): PersonaDecisionRecord {
    return {
        turn: 1,
        faction: 'RS',
        role: 'president',
        officer_id: 'karadzic',
        prompt_tokens: 100,
        completion_tokens: 50,
        latency_ms: 200,
        decision_summary: 'verb=hold_corridor',
        chain_context_section_present: true,
        ...over,
    };
}

beforeEach(() => {
    // Clear persona-related env flags so the gate-off default holds.
    for (const key of Object.keys(process.env)) {
        if (key.startsWith('CLAUDE_AS_') || key === 'CLAUDE_PERSONA_TELEMETRY_DISABLED') {
            delete process.env[key];
        }
    }
});

afterEach(() => {
    for (const key of Object.keys(process.env)) {
        if (key.startsWith('CLAUDE_AS_') || key === 'CLAUDE_PERSONA_TELEMETRY_DISABLED') {
            delete process.env[key];
        }
    }
});

describe('D2 run orchestration + telemetry', () => {
    // ─── T1: parseEnvFlags reads individual + wildcard flags ────────────

    it('T1: parseEnvFlags reads individual per-faction and wildcard flags', () => {
        const env: NodeJS.ProcessEnv = {
            CLAUDE_AS_PRESIDENT_RS: 'true',
            CLAUDE_AS_ARMY_CO_RBiH: 'true',
            CLAUDE_AS_CORPS_CO_RS_VRS_DRINA: 'true',
            CLAUDE_AS_ALL_LAYERS_HRHB: 'true',
        };
        const matrix = parseEnvFlags(env);
        expect(matrix.president.RS).toBe(true);
        expect(matrix.president.RBiH).toBe(false);
        expect(matrix.president.HRHB).toBe(true); // via ALL_LAYERS
        expect(matrix.army_co.RBiH).toBe(true);
        expect(matrix.army_co.HRHB).toBe(true); // via ALL_LAYERS
        expect(matrix.corps_co_specific.RS.VRS_DRINA).toBe(true);
        // RBiH corps_co_faction is NOT set; ALL_LAYERS_RBiH is also NOT set.
        expect(matrix.corps_co_faction.RBiH).toBe(false);
    });

    // ─── T2: default empty matrix ───────────────────────────────────────

    it('T2: empty env yields zero opt-ins', () => {
        const matrix = parseEnvFlags({});
        expect(isMatrixEmpty(matrix)).toBe(true);
    });

    // ─── T3: CLAUDE_AS_ALL=true wildcard ────────────────────────────────

    it('T3: CLAUDE_AS_ALL=true opts in all factions, all roles', () => {
        const matrix = parseEnvFlags({ CLAUDE_AS_ALL: 'true' });
        expect(isMatrixEmpty(matrix)).toBe(false);
        for (const faction of ['HRHB', 'RBiH', 'RS'] as const) {
            expect(matrix.president[faction]).toBe(true);
            expect(matrix.army_co[faction]).toBe(true);
            expect(matrix.corps_co_faction[faction]).toBe(true);
        }
    });

    // ─── T4: emitDecision writes to side-channel JSONL ──────────────────

    it('T4: emitDecision writes a JSONL line to the side-channel path', () => {
        const tmp = mkdtempSync(join(tmpdir(), 'd2-telemetry-'));
        try {
            const record = makeRecord();
            emitDecision(record, tmp);
            const expectedPath = join(tmp, D2_TELEMETRY_OUTPUT_REL_PATH);
            expect(existsSync(expectedPath)).toBe(true);
            const contents = readFileSync(expectedPath, 'utf8');
            const lines = contents.trim().split('\n');
            expect(lines.length).toBe(1);
            const parsed = JSON.parse(lines[0]);
            expect(parsed.event_type).toBe('persona_decision');
            expect(parsed.faction).toBe('RS');
            expect(parsed.role).toBe('president');
            expect(parsed.officer_id).toBe('karadzic');
            expect(parsed.turn).toBe(1);
            expect(parsed.prompt_tokens).toBe(100);
            expect(parsed.completion_tokens).toBe(50);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    // ─── T5: env flag disables telemetry ────────────────────────────────

    it('T5: CLAUDE_PERSONA_TELEMETRY_DISABLED=true short-circuits emitDecision', () => {
        return withEnv({ CLAUDE_PERSONA_TELEMETRY_DISABLED: 'true' }, () => {
            expect(isPersonaTelemetryDisabled()).toBe(true);
            const tmp = mkdtempSync(join(tmpdir(), 'd2-telemetry-disabled-'));
            try {
                const record = makeRecord();
                emitDecision(record, tmp);
                const expectedPath = join(tmp, D2_TELEMETRY_OUTPUT_REL_PATH);
                expect(existsSync(expectedPath)).toBe(false);
            } finally {
                rmSync(tmp, { recursive: true, force: true });
            }
        });
    });

    // ─── T6: faction-symmetric — no per-faction branches in source ──────

    it('T6: run_personas.ts source has no per-faction string-equality branches', () => {
        const src = readFileSync(resolve(process.cwd(), 'tools/claude_plays_vrs/run_personas.ts'), 'utf8');
        // Block hardcoded faction-specific conditionals like
        //   if (faction === 'RS') ... / if (faction === "RBiH") ...
        expect(src).not.toMatch(/faction\s*===\s*['"]RS['"]/);
        expect(src).not.toMatch(/faction\s*===\s*['"]RBiH['"]/);
        expect(src).not.toMatch(/faction\s*===\s*['"]HRHB['"]/);
    });

    // ─── T7: static-grep guard for non-determinism in D2 source files ───

    it('T7: D2 source files contain no Math.random / new Date / setTimeout / Date.now calls', () => {
        const files = [
            'tools/claude_plays_vrs/run_personas.ts',
            'tools/claude_plays_vrs/persona_telemetry.ts',
        ];
        // Strip line and block comments so prose mentions in
        // determinism-doctrine comments don't trigger the guard.
        const stripComments = (src: string): string => src
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
        for (const rel of files) {
            const raw = readFileSync(resolve(process.cwd(), rel), 'utf8');
            const src = stripComments(raw);
            expect(src, `${rel} must not call Math.random()`).not.toMatch(/Math\.random\s*\(/);
            expect(src, `${rel} must not call new Date()`).not.toMatch(/new\s+Date\s*\(/);
            expect(src, `${rel} must not call setTimeout`).not.toMatch(/setTimeout\s*\(/);
            expect(src, `${rel} must not call Date.now()`).not.toMatch(/Date\.now\s*\(/);
        }
    });

    // ─── Bonus: activeLayersForFaction returns sorted/deterministic list ─

    it('T8: activeLayersForFaction returns deterministic ordered list', () => {
        const env: NodeJS.ProcessEnv = {
            CLAUDE_AS_PRESIDENT_RS: 'true',
            CLAUDE_AS_ARMY_CO_RS: 'true',
            CLAUDE_AS_CORPS_CO_RS_VRS_DRINA: 'true',
            CLAUDE_AS_CORPS_CO_RS_VRS_1ST_KRAJINA: 'true',
        };
        const matrix = parseEnvFlags(env);
        const layers = activeLayersForFaction(matrix, 'RS');
        // Order: president, army_co, then corps_co_specific in alphabetical
        // order (VRS_1ST_KRAJINA before VRS_DRINA).
        expect(layers[0]).toEqual({ role: 'president' });
        expect(layers[1]).toEqual({ role: 'army_co' });
        expect(layers[2]).toEqual({ role: 'corps_co', corps_id: 'VRS_1ST_KRAJINA' });
        expect(layers[3]).toEqual({ role: 'corps_co', corps_id: 'VRS_DRINA' });
    });

    // ─── Bonus: estimateApiCost arithmetic ──────────────────────────────

    it('T9: estimateApiCost matches pricing formula for haiku', () => {
        const cost = estimateApiCost(1_000_000, 1_000_000, 'claude-haiku-4-5-20251001');
        // 1M prompt @ $0.80/M + 1M completion @ $4.00/M = $4.80
        expect(cost).toBeCloseTo(4.80, 4);
    });
});
