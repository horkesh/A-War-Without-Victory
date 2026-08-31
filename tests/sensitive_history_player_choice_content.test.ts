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

        // RELABELLED 2026-08-31 by unanimous four-seat §6 panel. The option previously read
        // "Centralize operational command" — administrative-reform wording on what is in fact the
        // maximum-atrocity branch: 16 downstream events gate on flag value `aggressive`, including
        // csq_accelerated_camps_discovery_1992 and csq_early_war_crimes_tribunal_1993. A player
        // could select the camps branch believing they were centralising command. The label came
        // from commit 3c2e8a47f, which relabelled Ring-3 options but left their ids and
        // dimension_shifts untouched ("Pursue with maximum force" -> "Centralize operational
        // command", numbers byte-identical). See
        // docs/plans/2026-08-31-s6-ring3-half-migration-packet.md.
        //
        // The flag VALUE is deliberately unchanged: option id and flag value are separable, and
        // the 16 conditions read the value. Renaming it would be a 16-gate change for no benefit.
        const aggressive = event.response_options.find((option: Record<string, unknown>) => option.id === 'aggressive');
        expect(aggressive).toMatchObject({
            label: 'Pursue all six goals by maximum force',
            sets_flags: { rs_strategic_goals: 'aggressive' },
        });

        // THE GAP THAT LET THE MISMATCH THROUGH: this suite asserted labels and flags and read
        // `dimension_shifts` and option `id`s NOWHERE, so a half-migrated option — new label over
        // old id and old numbers — passed as correct. Assert both, or this recurs on the next
        // content migration.
        expect(aggressive.dimension_shifts).toEqual([
            { faction: 'RS', dimension: 'military_credibility', delta: 15 },
            { faction: 'RS', dimension: 'internal_cohesion', delta: 15 },
            { faction: 'RS', dimension: 'international_standing', delta: -15 },
        ]);
        expect(event.response_options.map((option: Record<string, unknown>) => option.id))
            .toEqual(['all_six', 'selective', 'aggressive']);
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
        // Ids and dimension_shifts asserted for the same reason as rs_strategic_goals above: this
        // suite previously read neither, which is how the half-migration survived. The drina
        // numbers are asserted AS-IS and are known mispriced — opening command-accountability
        // proceedings costs -25 international standing versus -15 for denying the camps exist.
        // Repair is queued in docs/plans/2026-08-31-s6-ring3-half-migration-packet.md; this
        // assertion exists so the repair cannot land silently.
        expect(decision.response_options.map((option: Record<string, unknown>) => option.id))
            .toEqual(['systematic', 'restrained']);
        expect(decision.response_options[0].dimension_shifts).toEqual([
            { faction: 'RS', dimension: 'international_standing', delta: -25 },
            { faction: 'RS', dimension: 'territorial_legitimacy', delta: -10 },
        ]);
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
