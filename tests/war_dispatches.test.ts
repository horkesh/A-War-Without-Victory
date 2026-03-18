import { describe, it, expect } from 'vitest';
import {
    shouldGenerateDispatch,
    getPerspectiveForTurn,
    buildDispatchPrompt,
    parseDispatchResponse,
} from '../src/sim/ai_commander/war_dispatches.js';
import type { DispatchPromptInput } from '../src/sim/ai_commander/war_dispatches.js';

// --- shouldGenerateDispatch ---

describe('shouldGenerateDispatch', () => {
    it('returns true at turn 0', () => {
        expect(shouldGenerateDispatch(0)).toBe(true);
    });

    it('returns true at turn 4', () => {
        expect(shouldGenerateDispatch(4)).toBe(true);
    });

    it('returns true at turn 8', () => {
        expect(shouldGenerateDispatch(8)).toBe(true);
    });

    it('returns false at turn 1', () => {
        expect(shouldGenerateDispatch(1)).toBe(false);
    });

    it('returns false at turn 5', () => {
        expect(shouldGenerateDispatch(5)).toBe(false);
    });

    it('returns false at turn 3', () => {
        expect(shouldGenerateDispatch(3)).toBe(false);
    });

    it('returns false at turn 7', () => {
        expect(shouldGenerateDispatch(7)).toBe(false);
    });
});

// --- getPerspectiveForTurn ---

describe('getPerspectiveForTurn', () => {
    it('rotates through all four perspectives', () => {
        const perspectives = [0, 4, 8, 12].map(t => getPerspectiveForTurn(t));
        expect(new Set(perspectives).size).toBe(4);
    });

    it('wraps back to start at turn 16', () => {
        expect(getPerspectiveForTurn(16)).toBe(getPerspectiveForTurn(0));
    });

    it('turn 0 returns humanitarian', () => {
        expect(getPerspectiveForTurn(0)).toBe('humanitarian');
    });

    it('turn 4 returns military', () => {
        expect(getPerspectiveForTurn(4)).toBe('military');
    });

    it('turn 8 returns civilian', () => {
        expect(getPerspectiveForTurn(8)).toBe('civilian');
    });

    it('turn 12 returns diplomatic', () => {
        expect(getPerspectiveForTurn(12)).toBe('diplomatic');
    });
});

// --- buildDispatchPrompt ---

describe('buildDispatchPrompt', () => {
    const baseInput: DispatchPromptInput = {
        turn: 8,
        perspective: 'humanitarian',
        totalDisplaced: 120000,
        recentDisplaced: 5000,
        siegedCities: ['Sarajevo', 'Gorazde'],
        recentBattleCount: 12,
        territoryPct: { RS: 0.65, RBiH: 0.30, HRHB: 0.05 },
        yearLabel: '1992',
        monthLabel: 'June',
    };

    it('uses haiku model', () => {
        const prompt = buildDispatchPrompt(baseInput);
        expect(prompt.model).toBe('claude-haiku-4-5-20251001');
    });

    it('max_tokens is 384', () => {
        const prompt = buildDispatchPrompt(baseInput);
        expect(prompt.max_tokens).toBe(384);
    });

    it('user prompt contains displaced count', () => {
        const prompt = buildDispatchPrompt(baseInput);
        // toLocaleString output is locale-dependent; check for the number in any format
        expect(prompt.user).toMatch(/120[,.]?000/);
    });

    it('user prompt contains recent displaced', () => {
        const prompt = buildDispatchPrompt(baseInput);
        expect(prompt.user).toMatch(/5[,.]?000/);
    });

    it('user prompt contains sieged cities', () => {
        const prompt = buildDispatchPrompt(baseInput);
        expect(prompt.user).toContain('Sarajevo');
        expect(prompt.user).toContain('Gorazde');
    });

    it('user prompt contains territory percentages', () => {
        const prompt = buildDispatchPrompt(baseInput);
        expect(prompt.user).toContain('RS');
        expect(prompt.user).toContain('65.0%');
    });

    it('user prompt contains turn number', () => {
        const prompt = buildDispatchPrompt(baseInput);
        expect(prompt.user).toContain('8');
    });

    it('user prompt contains month and year', () => {
        const prompt = buildDispatchPrompt(baseInput);
        expect(prompt.user).toContain('June');
        expect(prompt.user).toContain('1992');
    });

    it('system prompt changes with perspective', () => {
        const humanitarianPrompt = buildDispatchPrompt({ ...baseInput, perspective: 'humanitarian' });
        const militaryPrompt = buildDispatchPrompt({ ...baseInput, perspective: 'military' });
        const civilianPrompt = buildDispatchPrompt({ ...baseInput, perspective: 'civilian' });
        const diplomaticPrompt = buildDispatchPrompt({ ...baseInput, perspective: 'diplomatic' });

        const systems = new Set([
            humanitarianPrompt.system,
            militaryPrompt.system,
            civilianPrompt.system,
            diplomaticPrompt.system,
        ]);
        expect(systems.size).toBe(4);
    });

    it('system prompt for humanitarian mentions UNHCR', () => {
        const prompt = buildDispatchPrompt({ ...baseInput, perspective: 'humanitarian' });
        expect(prompt.system.toLowerCase()).toContain('unhcr');
    });

    it('system prompt for military mentions NATO', () => {
        const prompt = buildDispatchPrompt({ ...baseInput, perspective: 'military' });
        expect(prompt.system.toLowerCase()).toContain('nato');
    });

    it('system prompt for diplomatic mentions UN mediator', () => {
        const prompt = buildDispatchPrompt({ ...baseInput, perspective: 'diplomatic' });
        expect(prompt.system.toLowerCase()).toContain('un mediator');
    });
});

// --- parseDispatchResponse ---

describe('parseDispatchResponse', () => {
    it('parses valid JSON response', () => {
        const raw = JSON.stringify({
            source: 'UNHCR Field Officer, Sarajevo',
            headline: 'Displacement Reaches Critical Threshold',
            body: 'Conditions in Sarajevo remain dire.',
            perspective: 'humanitarian',
        });
        const result = parseDispatchResponse(raw);
        expect(result).not.toBeNull();
        expect(result?.source).toBe('UNHCR Field Officer, Sarajevo');
        expect(result?.headline).toBe('Displacement Reaches Critical Threshold');
        expect(result?.perspective).toBe('humanitarian');
    });

    it('strips markdown code blocks', () => {
        const raw = '```json\n{"source":"NATO Analyst","headline":"Advance Stalls","body":"VRS units have slowed.","perspective":"military"}\n```';
        const result = parseDispatchResponse(raw);
        expect(result).not.toBeNull();
        expect(result?.perspective).toBe('military');
    });

    it('returns null for invalid JSON', () => {
        const result = parseDispatchResponse('not valid json at all {{{');
        expect(result).toBeNull();
    });

    it('returns null when perspective is invalid', () => {
        const raw = JSON.stringify({
            source: 'Someone',
            headline: 'Something',
            body: 'Body text',
            perspective: 'propaganda',
        });
        const result = parseDispatchResponse(raw);
        expect(result).toBeNull();
    });

    it('returns null when required fields are missing', () => {
        const raw = JSON.stringify({
            source: 'Someone',
            // missing headline, body, perspective
        });
        const result = parseDispatchResponse(raw);
        expect(result).toBeNull();
    });

    it('accepts all four valid perspective values', () => {
        const perspectives = ['humanitarian', 'military', 'civilian', 'diplomatic'] as const;
        for (const perspective of perspectives) {
            const raw = JSON.stringify({
                source: 'Test',
                headline: 'Test headline',
                body: 'Test body',
                perspective,
            });
            const result = parseDispatchResponse(raw);
            expect(result?.perspective).toBe(perspective);
        }
    });
});
