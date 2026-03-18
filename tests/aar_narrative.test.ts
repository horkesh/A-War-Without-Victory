// tests/aar_narrative.test.ts
import { describe, it, expect } from 'vitest';
import {
    isSignificantBattle,
    buildAARPrompt,
    parseAARResponse,
    type AARPromptInput,
} from '../src/sim/ai_commander/aar_narrative.js';

// ── isSignificantBattle ────────────────────────────────────────────────────

describe('isSignificantBattle', () => {
    it('returns true for decisive_victory outcome', () => {
        expect(isSignificantBattle({
            outcome: 'decisive_victory',
            territoryChanged: false,
            attackerCasualties: 10,
            defenderCasualties: 10,
        })).toBe(true);
    });

    it('returns true for catastrophic outcome', () => {
        expect(isSignificantBattle({
            outcome: 'catastrophic',
            territoryChanged: false,
            attackerCasualties: 50,
            defenderCasualties: 5,
        })).toBe(true);
    });

    it('returns true when territory changed', () => {
        expect(isSignificantBattle({
            outcome: 'victory',
            territoryChanged: true,
            attackerCasualties: 30,
            defenderCasualties: 40,
        })).toBe(true);
    });

    it('returns true when total casualties >= 200', () => {
        expect(isSignificantBattle({
            outcome: 'stalemate',
            territoryChanged: false,
            attackerCasualties: 100,
            defenderCasualties: 100,
        })).toBe(true);
    });

    it('returns true when total casualties == 200 exactly', () => {
        expect(isSignificantBattle({
            outcome: 'stalemate',
            territoryChanged: false,
            attackerCasualties: 150,
            defenderCasualties: 50,
        })).toBe(true);
    });

    it('returns false for an insignificant stalemate with few casualties', () => {
        expect(isSignificantBattle({
            outcome: 'stalemate',
            territoryChanged: false,
            attackerCasualties: 50,
            defenderCasualties: 50,
        })).toBe(false);
    });

    it('returns false for repulsed with no territory change and low casualties', () => {
        expect(isSignificantBattle({
            outcome: 'repulsed',
            territoryChanged: false,
            attackerCasualties: 40,
            defenderCasualties: 20,
        })).toBe(false);
    });

    it('returns false for costly_victory with no territory change and low casualties', () => {
        expect(isSignificantBattle({
            outcome: 'costly_victory',
            territoryChanged: false,
            attackerCasualties: 80,
            defenderCasualties: 80,
        })).toBe(false);
    });
});

// ── buildAARPrompt ─────────────────────────────────────────────────────────

describe('buildAARPrompt', () => {
    const baseInput: AARPromptInput = {
        officerName: 'Ratko Mladić',
        faction: 'RS',
        corpsId: 'vrs_1st_krajina',
        targetOsid: 'op:banja_luka:banja_luka_2',
        outcome: 'decisive_victory',
        attackerCasualties: 120,
        defenderCasualties: 350,
        attackerBrigades: ['vrs_1st_krajina_brig', 'vrs_2nd_krajina_brig'],
        defenderBrigades: ['arbih_307th_mtn'],
        territoryChanged: true,
    };

    it('includes officer name in system prompt', () => {
        const prompt = buildAARPrompt(baseInput);
        expect(prompt.system).toContain('Ratko Mladić');
    });

    it('includes faction label in system prompt', () => {
        const prompt = buildAARPrompt(baseInput);
        expect(prompt.system).toContain('VRS');
    });

    it('includes target location in user prompt', () => {
        const prompt = buildAARPrompt(baseInput);
        // OSID slug converted to readable location
        expect(prompt.user).toContain('banja luka');
    });

    it('includes outcome in user prompt', () => {
        const prompt = buildAARPrompt(baseInput);
        expect(prompt.user).toContain('decisive victory');
    });

    it('includes casualty figures in user prompt', () => {
        const prompt = buildAARPrompt(baseInput);
        expect(prompt.user).toContain('120');
        expect(prompt.user).toContain('350');
    });

    it('uses Haiku model', () => {
        const prompt = buildAARPrompt(baseInput);
        expect(prompt.model).toBe('claude-haiku-4-5-20251001');
    });

    it('caps at 384 max tokens', () => {
        const prompt = buildAARPrompt(baseInput);
        expect(prompt.max_tokens).toBe(384);
    });

    it('uses ARBiH label for RBiH faction', () => {
        const prompt = buildAARPrompt({ ...baseInput, faction: 'RBiH' });
        expect(prompt.system).toContain('ARBiH');
    });

    it('uses HVO label for HRHB faction', () => {
        const prompt = buildAARPrompt({ ...baseInput, faction: 'HRHB' });
        expect(prompt.system).toContain('HVO');
    });

    it('notes territory change in user prompt', () => {
        const prompt = buildAARPrompt(baseInput);
        expect(prompt.user).toContain('Territory changed hands');
    });

    it('notes no territory change when false', () => {
        const prompt = buildAARPrompt({ ...baseInput, territoryChanged: false });
        expect(prompt.user).toContain('No territory changed hands');
    });
});

// ── parseAARResponse ───────────────────────────────────────────────────────

describe('parseAARResponse', () => {
    it('parses valid JSON response', () => {
        const raw = JSON.stringify({ narrative: 'We held the line.', tone: 'resolute' });
        const result = parseAARResponse(raw);
        expect(result).not.toBeNull();
        expect(result!.narrative).toBe('We held the line.');
        expect(result!.tone).toBe('resolute');
    });

    it('strips markdown code fences', () => {
        const raw = '```json\n{"narrative":"The enemy broke.","tone":"satisfied"}\n```';
        const result = parseAARResponse(raw);
        expect(result).not.toBeNull();
        expect(result!.narrative).toBe('The enemy broke.');
        expect(result!.tone).toBe('satisfied');
    });

    it('strips opening code fence only', () => {
        const raw = '```\n{"narrative":"Heavy losses.","tone":"grim"}\n```';
        const result = parseAARResponse(raw);
        expect(result).not.toBeNull();
        expect(result!.narrative).toBe('Heavy losses.');
    });

    it('returns null for invalid JSON', () => {
        expect(parseAARResponse('not json')).toBeNull();
    });

    it('returns null when narrative field is missing', () => {
        const raw = JSON.stringify({ tone: 'grim' });
        expect(parseAARResponse(raw)).toBeNull();
    });

    it('returns null when tone field is missing', () => {
        const raw = JSON.stringify({ narrative: 'We advanced.' });
        expect(parseAARResponse(raw)).toBeNull();
    });

    it('returns null when narrative is empty string', () => {
        const raw = JSON.stringify({ narrative: '', tone: 'grim' });
        expect(parseAARResponse(raw)).toBeNull();
    });

    it('returns null for empty string input', () => {
        expect(parseAARResponse('')).toBeNull();
    });

    it('trims whitespace from narrative and tone', () => {
        const raw = JSON.stringify({ narrative: '  Brutal fighting.  ', tone: '  exhausted  ' });
        const result = parseAARResponse(raw);
        expect(result!.narrative).toBe('Brutal fighting.');
        expect(result!.tone).toBe('exhausted');
    });
});
