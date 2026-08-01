import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { isDirectRefusedSensitiveChoice } = require(
    '../tools/diagnostics/sensitive_history_semantics.cjs',
) as { isDirectRefusedSensitiveChoice: (text: string) => boolean };

function war1992Events(): Array<Record<string, any>> {
    return JSON.parse(readFileSync(resolve('data/scenarios/events/war_1992.json'), 'utf8'));
}

function requireEvent(events: Array<Record<string, any>>, eventId: string): Record<string, any> {
    const event = events.find((row) => row.id === eventId);
    if (!event) throw new Error(`missing event ${eventId}`);
    return event;
}

function directChoiceFields(event: Record<string, any>): string[] {
    return (event.response_options ?? []).flatMap((option: Record<string, unknown>) => (
        ['label', 'description', 'narrative', 'text']
            .map((field) => option[field])
            .filter((value): value is string => typeof value === 'string')
    ));
}

describe('sensitive-history player-choice content boundary', () => {
    it('keeps the Six Strategic Goals record while framing every option as strategic policy', () => {
        const event = requireEvent(war1992Events(), 'rs_strategic_goals');
        expect(event.trigger).toEqual({ turn_min: 1, turn_max: 3, phase: 'war' });
        expect(event.narrative).toContain('Six strategic goals');
        expect(event.narrative).toContain('constitute genocide');
        expect(event.historical_source).toContain('ICTY Mladic Trial Judgment');
        expect(event.source_tier).toBe('icty_icj_un');
        expect(event.source_note).toContain('Sensitive History Design Gate');
        expect(directChoiceFields(event).some(isDirectRefusedSensitiveChoice)).toBe(false);

        const aggressive = event.response_options.find((option: Record<string, unknown>) => option.id === 'aggressive');
        expect(aggressive).toMatchObject({
            label: 'Centralize operational command',
            sets_flags: { rs_strategic_goals: 'aggressive' },
        });
        expect(aggressive.description).toContain('Assembly decision is part of the historical record');
        expect(event.localizations.bcs.response_options.aggressive).toEqual({
            label: 'Centralizovati operativnu komandu',
            description: 'Skupstinska odluka je dio historijskog zapisa; ovdje odredjujete centralizovane operativne naredbe i izvjestavanje komandnog lanca. Upozorenje generala Mladica ostaje u zapisniku i obavezuje komandu.',
        });
        expect(aggressive.effects.some((effect: Record<string, unknown>) => (
            effect.kind === 'humanitarian_impact'
        ))).toBe(false);
    });

    it('turns the Drina response into accountability/restraint policy and leaves atrocity as consequence', () => {
        const events = war1992Events();
        const decision = requireEvent(events, 'drina_cleansing_decision_1992');
        const consequence = requireEvent(events, 'drina_valley_ethnic_cleansing_1992');
        expect(decision.trigger).toMatchObject({ turn_min: 8, turn_max: 30, phase: 'war' });
        expect(decision.narrative).toContain('Reports from the field');
        expect(decision.historical_source).toContain('BB Vol. I Ch. 8-9');
        expect(decision.source_tier).toBe('icty_icj_un');
        expect(decision.source_note).toContain('Sensitive History Design Gate');
        expect(directChoiceFields(decision).some(isDirectRefusedSensitiveChoice)).toBe(false);
        expect(decision.response_options.map((option: Record<string, unknown>) => option.label)).toEqual([
            'Open command-accountability proceedings',
            'Impose immediate civilian-protection restraints',
        ]);
        for (const option of decision.response_options) {
            expect(option.effects?.some((effect: Record<string, unknown>) => (
                effect.kind === 'humanitarian_impact'
            )) ?? false).toBe(false);
            expect(option.sets_flags).not.toHaveProperty('drina_cleansing_intensity');
            expect(option.sets_flags).toHaveProperty('drina_command_accountability');
        }

        expect(consequence.requires_player_response).not.toBe(true);
        expect(consequence.narrative).toContain('systematically expel');
        expect(consequence.effect).toMatchObject({ kind: 'humanitarian_impact', war_crimes_delta: 3 });
    });
});
