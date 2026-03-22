import { describe, it, expect } from 'vitest';
import { pickBotResponseV1 } from '../src/sim/events/bot_response.js';
import type { EventResponseOption } from '../src/sim/events/event_types.js';

const options: EventResponseOption[] = [
    { id: 'accept', label: 'Accept', effects: [], aggression_affinity: -0.5, risk_level: 0.2 },
    { id: 'reject', label: 'Reject', effects: [], aggression_affinity: 0.8, risk_level: 0.7 },
    { id: 'stall', label: 'Stall', effects: [], aggression_affinity: 0.0, risk_level: 0.4 },
];

describe('bot response v1 — personality weighted', () => {
    it('historical mode picks first option', () => {
        const result = pickBotResponseV1(options, 'historical', { aggressiveness: 3, competence: 3 });
        expect(result.id).toBe('accept');
    });

    it('reject_all picks last option', () => {
        const result = pickBotResponseV1(options, 'reject_all', { aggressiveness: 3, competence: 3 });
        expect(result.id).toBe('stall');
    });

    it('aggressive commander prefers high aggression_affinity', () => {
        const result = pickBotResponseV1(options, 'personality_weighted', { aggressiveness: 5, competence: 3 });
        expect(result.id).toBe('reject');
    });

    it('cautious+competent commander prefers low risk', () => {
        const result = pickBotResponseV1(options, 'personality_weighted', { aggressiveness: 1, competence: 5 });
        expect(result.id).toBe('accept');
    });

    it('moderate commander gets moderate choice', () => {
        const result = pickBotResponseV1(options, 'personality_weighted', { aggressiveness: 3, competence: 3 });
        // At 3/3, aggrNorm=0, compNorm=0 → all scores are 0. First wins tie.
        expect(result.id).toBe('accept');
    });

    it('falls back to first when no scoring hints', () => {
        const noHints: EventResponseOption[] = [
            { id: 'a', label: 'A', effects: [] },
            { id: 'b', label: 'B', effects: [] },
        ];
        const result = pickBotResponseV1(noHints, 'personality_weighted', { aggressiveness: 5, competence: 5 });
        expect(result.id).toBe('a');
    });

    it('single option always returned', () => {
        const single: EventResponseOption[] = [{ id: 'only', label: 'Only', effects: [] }];
        const result = pickBotResponseV1(single, 'personality_weighted', { aggressiveness: 5, competence: 5 });
        expect(result.id).toBe('only');
    });

    it('throws on empty options', () => {
        expect(() => pickBotResponseV1([], 'historical', { aggressiveness: 3, competence: 3 })).toThrow();
    });

    it('accept_first behaves same as historical', () => {
        const result = pickBotResponseV1(options, 'accept_first', { aggressiveness: 5, competence: 5 });
        expect(result.id).toBe('accept');
    });

    it('unknown logic falls back to first', () => {
        const result = pickBotResponseV1(options, 'capital_based', { aggressiveness: 5, competence: 5 });
        expect(result.id).toBe('accept');
    });
});
