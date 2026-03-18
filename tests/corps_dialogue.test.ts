// tests/corps_dialogue.test.ts
import { describe, it, expect } from 'vitest';
import {
    buildCorpsDialoguePrompt,
    parseDialogueResponse,
} from '../src/sim/ai_commander/corps_dialogue.js';

// ═══════════════════════════════════════════════════════════════════════════
// Prompt building tests
// ═══════════════════════════════════════════════════════════════════════════

describe('buildCorpsDialoguePrompt', () => {
    const baseInput = {
        officerName: 'Ratko Mladić',
        faction: 'RS' as const,
        corpsId: 'vrs_1st_krajina',
        aggressiveness: 5,
        competence: 4,
        stance: 'offensive',
        hasActiveOperation: false,
        corpsPersonnel: 8000,
        corpsExhaustion: 12.5,
        recentBattleSummary: '',
    };

    it('includes officer name in system prompt', () => {
        const prompt = buildCorpsDialoguePrompt(baseInput);
        expect(prompt.system).toContain('Ratko Mladić');
    });

    it('includes faction name in system prompt', () => {
        const prompt = buildCorpsDialoguePrompt(baseInput);
        expect(prompt.system).toContain('VRS');
    });

    it('labels aggressive officer correctly', () => {
        const prompt = buildCorpsDialoguePrompt({ ...baseInput, aggressiveness: 5 });
        expect(prompt.system).toContain('aggressive');
    });

    it('labels cautious officer correctly', () => {
        const prompt = buildCorpsDialoguePrompt({ ...baseInput, aggressiveness: 1 });
        expect(prompt.system).toContain('cautious');
    });

    it('labels balanced officer correctly', () => {
        const prompt = buildCorpsDialoguePrompt({ ...baseInput, aggressiveness: 3 });
        expect(prompt.system).toContain('balanced');
    });

    it('includes corps stance in user prompt', () => {
        const prompt = buildCorpsDialoguePrompt({ ...baseInput, stance: 'defensive' });
        expect(prompt.user).toContain('defensive');
    });

    it('includes corps id in user prompt', () => {
        const prompt = buildCorpsDialoguePrompt(baseInput);
        expect(prompt.user).toContain('vrs_1st_krajina');
    });

    it('includes personnel count in user prompt', () => {
        const prompt = buildCorpsDialoguePrompt(baseInput);
        expect(prompt.user).toContain('8000');
    });

    it('uses max_tokens of 256', () => {
        const prompt = buildCorpsDialoguePrompt(baseInput);
        expect(prompt.max_tokens).toBe(256);
    });

    it('uses haiku model', () => {
        const prompt = buildCorpsDialoguePrompt(baseInput);
        expect(prompt.model).toBe('claude-haiku-4-5-20251001');
    });

    it('includes operation name when active operation present', () => {
        const prompt = buildCorpsDialoguePrompt({
            ...baseInput,
            hasActiveOperation: true,
            operationName: 'Operation Storm',
        });
        expect(prompt.user).toContain('Operation Storm');
    });

    it('includes recent battle summary when provided', () => {
        const prompt = buildCorpsDialoguePrompt({
            ...baseInput,
            recentBattleSummary: 'attacked (victory), defended (stalemate)',
        });
        expect(prompt.user).toContain('attacked (victory)');
    });

    it('requests JSON schema in system prompt', () => {
        const prompt = buildCorpsDialoguePrompt(baseInput);
        expect(prompt.system).toContain('acknowledgment');
        expect(prompt.system).toContain('concern');
        expect(prompt.system).toContain('confidence');
    });

    it('temperature is 0 (deterministic)', () => {
        const prompt = buildCorpsDialoguePrompt(baseInput);
        expect(prompt.temperature).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Response parsing tests
// ═══════════════════════════════════════════════════════════════════════════

describe('parseDialogueResponse', () => {
    it('parses valid JSON response', () => {
        const raw = JSON.stringify({
            acknowledgment: 'Understood. We advance at dawn.',
            concern: 'Supply lines are stretched thin.',
            confidence: 'high',
        });
        const result = parseDialogueResponse(raw);
        expect(result).not.toBeNull();
        expect(result!.acknowledgment).toBe('Understood. We advance at dawn.');
        expect(result!.concern).toBe('Supply lines are stretched thin.');
        expect(result!.confidence).toBe('high');
    });

    it('strips markdown code block wrapper', () => {
        const raw = '```json\n{"acknowledgment":"Roger.","concern":"","confidence":"medium"}\n```';
        const result = parseDialogueResponse(raw);
        expect(result).not.toBeNull();
        expect(result!.confidence).toBe('medium');
    });

    it('returns null for invalid JSON', () => {
        const result = parseDialogueResponse('not valid json at all');
        expect(result).toBeNull();
    });

    it('returns null when acknowledgment is missing', () => {
        const raw = JSON.stringify({ concern: '', confidence: 'low' });
        const result = parseDialogueResponse(raw);
        expect(result).toBeNull();
    });

    it('returns null when acknowledgment is empty string', () => {
        const raw = JSON.stringify({ acknowledgment: '  ', concern: '', confidence: 'high' });
        const result = parseDialogueResponse(raw);
        expect(result).toBeNull();
    });

    it('returns null for invalid confidence value', () => {
        const raw = JSON.stringify({
            acknowledgment: 'Understood.',
            concern: '',
            confidence: 'excellent',
        });
        const result = parseDialogueResponse(raw);
        expect(result).toBeNull();
    });

    it('accepts all three confidence values', () => {
        for (const confidence of ['high', 'medium', 'low'] as const) {
            const raw = JSON.stringify({
                acknowledgment: 'Orders received.',
                concern: '',
                confidence,
            });
            const result = parseDialogueResponse(raw);
            expect(result).not.toBeNull();
            expect(result!.confidence).toBe(confidence);
        }
    });

    it('handles empty concern gracefully', () => {
        const raw = JSON.stringify({
            acknowledgment: 'Wilco.',
            concern: '',
            confidence: 'high',
        });
        const result = parseDialogueResponse(raw);
        expect(result).not.toBeNull();
        expect(result!.concern).toBe('');
    });

    it('trims whitespace from acknowledgment and concern', () => {
        const raw = JSON.stringify({
            acknowledgment: '  Understood.  ',
            concern: '  Ammo is low.  ',
            confidence: 'low',
        });
        const result = parseDialogueResponse(raw);
        expect(result!.acknowledgment).toBe('Understood.');
        expect(result!.concern).toBe('Ammo is low.');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Objection / concern handling
// ═══════════════════════════════════════════════════════════════════════════

describe('dialogue concern handling', () => {
    it('concern field is non-null string even when officer has no objection', () => {
        const raw = JSON.stringify({
            acknowledgment: 'Confirmed.',
            concern: '',
            confidence: 'high',
        });
        const result = parseDialogueResponse(raw);
        expect(result).not.toBeNull();
        expect(typeof result!.concern).toBe('string');
    });

    it('preserves full concern text without truncation', () => {
        const longConcern = 'Our flanks are exposed and the enemy has reinforced position alpha-3. Advancing without addressing this risks encirclement of the 5th Battalion.';
        const raw = JSON.stringify({
            acknowledgment: 'Order acknowledged.',
            concern: longConcern,
            confidence: 'medium',
        });
        const result = parseDialogueResponse(raw);
        expect(result!.concern).toBe(longConcern);
    });
});
