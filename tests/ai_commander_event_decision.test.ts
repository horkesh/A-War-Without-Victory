import { describe, it, expect } from 'vitest';
import { buildEventDecisionPrompt, generateEventDecision } from '../src/sim/ai_commander/event_decision_ai.js';
import type { GameState, FactionId } from '../src/state/game_state.js';
import type { EventDefinition, EventResponseOption } from '../src/sim/events/event_types.js';
import type { AiClient } from '../src/sim/ai_commander/ai_client.js';
import type { AiPrompt, AiResponse } from '../src/sim/ai_commander/ai_types.js';

/** Minimal GameState stub for testing. */
function stubState(turn = 10): GameState {
    return { meta: { turn } } as unknown as GameState;
}

/** Minimal EventDefinition stub. */
function stubEvent(overrides: Partial<EventDefinition> = {}): EventDefinition {
    return {
        id: 'test_event',
        title: 'Test Event',
        trigger: { turn_min: 1 },
        effect: { kind: 'narrative', text: 'Something happened.' },
        response_options: [
            { id: 'accept', label: 'Accept the terms', effects: [] },
            { id: 'reject', label: 'Reject outright', effects: [] },
        ],
        ...overrides,
    };
}

/** Mock AiClient that returns a controlled response. */
function mockClient(choiceId: string): AiClient {
    return {
        provider: 'mock',
        isAvailable: () => true,
        generateDecision: async (_prompt: AiPrompt): Promise<AiResponse> => ({
            content: JSON.stringify({ choice: choiceId, reasoning: 'Test reasoning.' }),
            model: 'mock',
            prompt_tokens: 10,
            completion_tokens: 5,
            latency_ms: 1,
        }),
    };
}

describe('buildEventDecisionPrompt', () => {
    it('builds prompt with event context and response options', () => {
        const eventDef = stubEvent({
            id: 'drina_cleansing',
            title: 'The Drina Valley Question',
            narrative: 'Reports from the field indicate ethnic cleansing operations.',
            response_options: [
                { id: 'systematic', label: 'Systematic cleansing', effects: [] },
                { id: 'restrained', label: 'Restrained approach', effects: [] },
            ],
        });
        const prompt = buildEventDecisionPrompt(stubState(), 'RS', eventDef);
        expect(prompt.user).toContain('Drina Valley');
        expect(prompt.user).toContain('systematic');
        expect(prompt.user).toContain('restrained');
        expect(prompt.system).toContain('Republika Srpska');
    });

    it('includes faction personality for RBiH', () => {
        const prompt = buildEventDecisionPrompt(stubState(), 'RBiH', stubEvent());
        expect(prompt.system).toContain('Bosnian government');
    });

    it('includes faction personality for HRHB', () => {
        const prompt = buildEventDecisionPrompt(stubState(), 'HRHB', stubEvent());
        expect(prompt.system).toContain('Croatian Defence Council');
    });

    it('handles event with no response options', () => {
        const eventDef = stubEvent({ response_options: [] });
        const prompt = buildEventDecisionPrompt(stubState(), 'RS', eventDef);
        expect(prompt.user).toContain('Test Event');
        expect(prompt.user).toContain('notification event');
        expect(prompt.user).not.toContain('OPTIONS');
    });

    it('handles event with undefined response_options', () => {
        const eventDef = stubEvent({ response_options: undefined });
        const prompt = buildEventDecisionPrompt(stubState(), 'RS', eventDef);
        expect(prompt.user).toContain('notification event');
    });

    it('includes narrative text when present', () => {
        const eventDef = stubEvent({ narrative: 'The siege intensifies around the city.' });
        const prompt = buildEventDecisionPrompt(stubState(), 'RS', eventDef);
        expect(prompt.user).toContain('siege intensifies');
    });

    it('falls back to event id when title is missing', () => {
        const eventDef = stubEvent({ title: undefined });
        const prompt = buildEventDecisionPrompt(stubState(), 'RS', eventDef);
        expect(prompt.user).toContain('test_event');
    });

    it('includes turn number in prompt', () => {
        const prompt = buildEventDecisionPrompt(stubState(25), 'RS', stubEvent());
        expect(prompt.user).toContain('Turn: 25');
    });

    it('uses correct model and token limits', () => {
        const prompt = buildEventDecisionPrompt(stubState(), 'RS', stubEvent());
        expect(prompt.model).toBe('claude-haiku-4-5-20251001');
        expect(prompt.max_tokens).toBe(256);
        expect(prompt.temperature).toBe(0);
    });

    it('includes option descriptions when present', () => {
        const eventDef = stubEvent({
            response_options: [
                { id: 'opt_a', label: 'Option A', description: 'Risky but rewarding', effects: [] },
            ],
        });
        const prompt = buildEventDecisionPrompt(stubState(), 'RS', eventDef);
        expect(prompt.user).toContain('Risky but rewarding');
    });

    it('instructs JSON response format', () => {
        const prompt = buildEventDecisionPrompt(stubState(), 'RS', stubEvent());
        expect(prompt.user).toContain('"choice"');
        expect(prompt.user).toContain('"reasoning"');
    });
});

describe('generateEventDecision', () => {
    it('returns chosen option when AI responds correctly', async () => {
        const eventDef = stubEvent();
        const result = await generateEventDecision(stubState(), 'RS', eventDef, mockClient('reject'));
        expect(result).not.toBeNull();
        expect(result!.id).toBe('reject');
    });

    it('falls back to first option when AI returns unknown choice', async () => {
        const eventDef = stubEvent();
        const result = await generateEventDecision(stubState(), 'RS', eventDef, mockClient('nonexistent'));
        expect(result).not.toBeNull();
        expect(result!.id).toBe('accept'); // first option
    });

    it('returns null when client is null', async () => {
        const result = await generateEventDecision(stubState(), 'RS', stubEvent(), null);
        expect(result).toBeNull();
    });

    it('returns null when no response options', async () => {
        const eventDef = stubEvent({ response_options: [] });
        const result = await generateEventDecision(stubState(), 'RS', eventDef, mockClient('accept'));
        expect(result).toBeNull();
    });

    it('returns null when client is unavailable', async () => {
        const unavailableClient: AiClient = {
            provider: 'mock',
            isAvailable: () => false,
            generateDecision: async () => { throw new Error('should not be called'); },
        };
        const result = await generateEventDecision(stubState(), 'RS', stubEvent(), unavailableClient);
        expect(result).toBeNull();
    });

    it('returns null on API failure (falls back to formula bot)', async () => {
        const failingClient: AiClient = {
            provider: 'mock',
            isAvailable: () => true,
            generateDecision: async () => { throw new Error('API timeout'); },
        };
        const result = await generateEventDecision(stubState(), 'RS', stubEvent(), failingClient);
        expect(result).toBeNull();
    });

    it('returns null on invalid JSON response', async () => {
        const badJsonClient: AiClient = {
            provider: 'mock',
            isAvailable: () => true,
            generateDecision: async (): Promise<AiResponse> => ({
                content: 'I think we should accept the terms.',
                model: 'mock',
                prompt_tokens: 10,
                completion_tokens: 20,
                latency_ms: 1,
            }),
        };
        const result = await generateEventDecision(stubState(), 'RS', stubEvent(), badJsonClient);
        expect(result).toBeNull();
    });

    it('returns null when parsed JSON has no choice field', async () => {
        const noChoiceClient: AiClient = {
            provider: 'mock',
            isAvailable: () => true,
            generateDecision: async (): Promise<AiResponse> => ({
                content: JSON.stringify({ reasoning: 'no choice given' }),
                model: 'mock',
                prompt_tokens: 10,
                completion_tokens: 5,
                latency_ms: 1,
            }),
        };
        const result = await generateEventDecision(stubState(), 'RS', stubEvent(), noChoiceClient);
        expect(result).toBeNull();
    });
});
