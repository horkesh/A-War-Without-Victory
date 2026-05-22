import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadWar1992Events(): any[] {
    return JSON.parse(readFileSync(resolve(__dirname, '..', '..', '..', 'data', 'scenarios', 'events', 'war_1992.json'), 'utf-8'));
}

function loadWar1993Events(): any[] {
    return JSON.parse(readFileSync(resolve(__dirname, '..', '..', '..', 'data', 'scenarios', 'events', 'war_1993.json'), 'utf-8'));
}

function loadWar1994Events(): any[] {
    return JSON.parse(readFileSync(resolve(__dirname, '..', '..', '..', 'data', 'scenarios', 'events', 'war_1994.json'), 'utf-8'));
}

describe('event notification content backfill', () => {
    it('covers narrative-tone 1992 identity decisions for non-source recipients', () => {
        const events = loadWar1992Events();
        const cases = [
            {
                eventId: 'rs_strategic_goals',
                source: 'RS',
                responses: {
                    all_six: ['HRHB', 'RBiH'],
                    selective: ['HRHB', 'RBiH'],
                    aggressive: ['HRHB', 'RBiH'],
                },
            },
            {
                eventId: 'rbih_state_identity',
                source: 'RBiH',
                responses: {
                    civic: ['HRHB', 'RS'],
                    bosniak_national: ['HRHB', 'RS'],
                    pragmatic: ['HRHB', 'RS'],
                },
            },
        ];

        for (const { eventId, source, responses } of cases) {
            const event = events.find((entry) => entry.id === eventId);
            expect(event?.responding_faction).toBe(source);
            expect(event?.notifications_to_other_factions).toBeDefined();

            for (const [responseId, recipients] of Object.entries(responses)) {
                const byRecipient = event.notifications_to_other_factions[responseId];
                expect(Object.keys(byRecipient).sort()).toEqual(recipients);

                for (const target of recipients) {
                    expect(byRecipient[target].headline.trim().length).toBeGreaterThan(0);
                    expect(byRecipient[target].body.trim().length).toBeGreaterThan(0);
                }
            }
        }
    });

    it('covers Washington-timing policy rows for non-source recipients', () => {
        const events = loadWar1994Events();
        const cases = [
            {
                eventId: 'washington_agreement_1994',
                responses: {
                    accept: ['HRHB', 'RS'],
                    reluctant: ['HRHB', 'RS'],
                },
            },
            {
                eventId: 'ic_rbih_restraint_post_washington',
                responses: {
                    acknowledge_pressure: ['HRHB', 'RS'],
                    resist_patron: ['HRHB', 'RS'],
                },
            },
        ];

        for (const { eventId, responses } of cases) {
            const event = events.find((entry) => entry.id === eventId);
            expect(event?.responding_faction).toBe('RBiH');
            expect(event?.notifications_to_other_factions).toBeDefined();

            for (const [responseId, recipients] of Object.entries(responses)) {
                const byRecipient = event.notifications_to_other_factions[responseId];
                expect(Object.keys(byRecipient).sort()).toEqual(recipients);

                for (const target of recipients) {
                    expect(byRecipient[target].headline.trim().length).toBeGreaterThan(0);
                    expect(byRecipient[target].body.trim().length).toBeGreaterThan(0);
                }
            }
        }
    });

    it('covers 1994 late-war diplomacy rows for non-source recipients', () => {
        const events = loadWar1994Events();
        const cases = [
            {
                eventId: 'contact_group_plan_1994',
                source: 'RBiH',
                responses: {
                    accept: ['HRHB', 'RS'],
                    reject: ['HRHB', 'RS'],
                },
            },
            {
                eventId: 'belgrade_embargo_rs_1994',
                source: 'RS',
                responses: {
                    defiant: ['HRHB', 'RBiH'],
                    negotiate: ['HRHB', 'RBiH'],
                },
            },
            {
                eventId: 'carter_ceasefire_1994',
                source: 'RBiH',
                responses: {
                    respect: ['HRHB', 'RS'],
                    exploit: ['HRHB', 'RS'],
                },
            },
        ];

        for (const { eventId, source, responses } of cases) {
            const event = events.find((entry) => entry.id === eventId);
            expect(event?.responding_faction).toBe(source);
            expect(event?.notifications_to_other_factions).toBeDefined();

            for (const [responseId, recipients] of Object.entries(responses)) {
                const byRecipient = event.notifications_to_other_factions[responseId];
                expect(Object.keys(byRecipient).sort()).toEqual(recipients);

                for (const target of recipients) {
                    expect(byRecipient[target].headline.trim().length).toBeGreaterThan(0);
                    expect(byRecipient[target].body.trim().length).toBeGreaterThan(0);
                }
            }
        }
    });

    it('covers London Conference responses for non-RBiH recipients', () => {
        const events = loadWar1992Events();
        const event = events.find((entry) => entry.id === 'london_conference_1992');

        expect(event?.responding_faction).toBe('RBiH');
        expect(event?.notifications_to_other_factions).toEqual({
            accept: {
                HRHB: {
                    headline: expect.any(String),
                    body: expect.any(String),
                },
                RS: {
                    headline: expect.any(String),
                    body: expect.any(String),
                },
            },
            reject: {
                HRHB: {
                    headline: expect.any(String),
                    body: expect.any(String),
                },
                RS: {
                    headline: expect.any(String),
                    body: expect.any(String),
                },
            },
        });

        for (const byRecipient of Object.values(event.notifications_to_other_factions) as Array<Record<string, { headline: string; body: string }>>) {
            expect(Object.keys(byRecipient).sort()).toEqual(['HRHB', 'RS']);
            for (const text of Object.values(byRecipient)) {
                expect(text.headline.trim().length).toBeGreaterThan(0);
                expect(text.body.trim().length).toBeGreaterThan(0);
            }
        }
    });

    it('covers strategic posture review responses for non-source recipients', () => {
        const events = loadWar1993Events();
        const cases = [
            { eventId: 'strategic_posture_review_rbih', source: 'RBiH', recipients: ['HRHB', 'RS'] },
            { eventId: 'strategic_posture_review_rs', source: 'RS', recipients: ['HRHB', 'RBiH'] },
            { eventId: 'strategic_posture_review_hrhb', source: 'HRHB', recipients: ['RBiH', 'RS'] },
        ];

        for (const { eventId, source, recipients } of cases) {
            const event = events.find((entry) => entry.id === eventId);

            expect(event?.responding_faction).toBe(source);
            expect(event?.notifications_to_other_factions).toBeDefined();

            for (const response of event.response_options) {
                const byRecipient = event.notifications_to_other_factions[response.id];
                expect(Object.keys(byRecipient).sort()).toEqual(recipients);

                for (const target of recipients) {
                    expect(byRecipient[target].headline.trim().length).toBeGreaterThan(0);
                    expect(byRecipient[target].body.trim().length).toBeGreaterThan(0);
                }
            }
        }
    });

    it('covers safe 1993 conflict and diplomacy response notifications for non-source recipients', () => {
        const events = loadWar1993Events();
        const cases = [
            { eventId: 'gornji_vakuf_clashes_1993', source: 'HRHB', recipients: ['RBiH', 'RS'] },
            { eventId: 'ic_pressure_vopp_engagement', source: 'RBiH', recipients: ['HRHB', 'RS'] },
            { eventId: 'vance_owen_plan_1993', source: 'RBiH', recipients: ['HRHB', 'RS'] },
            { eventId: 'rs_assembly_rejects_voplan_1993', source: 'RS', recipients: ['HRHB', 'RBiH'] },
            { eventId: 'owen_stoltenberg_plan_1993', source: 'RBiH', recipients: ['HRHB', 'RS'] },
            { eventId: 'os_rbih_tactical_acceptance_1993', source: 'RBiH', recipients: ['HRHB', 'RS'] },
        ];

        for (const { eventId, source, recipients } of cases) {
            const event = events.find((entry) => entry.id === eventId);

            expect(event?.responding_faction).toBe(source);
            expect(event?.notifications_to_other_factions).toBeDefined();

            for (const response of event.response_options) {
                const byRecipient = event.notifications_to_other_factions[response.id];
                expect(Object.keys(byRecipient).sort()).toEqual(recipients);

                for (const target of recipients) {
                    expect(byRecipient[target].headline.trim().length).toBeGreaterThan(0);
                    expect(byRecipient[target].body.trim().length).toBeGreaterThan(0);
                }
            }
        }
    });

    it('covers safe front-visit residual response notifications for non-source recipients', () => {
        const events = loadWar1993Events();
        const cases = [
            {
                eventId: 'visit_to_front_rbih',
                responses: {
                    visit_eastern_front: ['HRHB', 'RS'],
                    stay_capital_rbih: ['HRHB', 'RS'],
                },
            },
            {
                eventId: 'visit_to_front_rs',
                responses: {
                    visit_posavina: ['HRHB', 'RBiH'],
                    stay_pale_rs: ['HRHB', 'RBiH'],
                },
            },
            {
                eventId: 'visit_to_front_hrhb',
                responses: {
                    visit_posavina_hrhb: ['RBiH', 'RS'],
                    stay_mostar_hrhb: ['RBiH', 'RS'],
                },
            },
        ];

        for (const { eventId, responses } of cases) {
            const event = events.find((entry) => entry.id === eventId);
            expect(event?.notifications_to_other_factions).toBeDefined();

            for (const [responseId, recipients] of Object.entries(responses)) {
                const byRecipient = event.notifications_to_other_factions[responseId];
                expect(Object.keys(byRecipient).sort()).toEqual(recipients);

                for (const target of recipients) {
                    expect(byRecipient[target].headline.trim().length).toBeGreaterThan(0);
                    expect(byRecipient[target].body.trim().length).toBeGreaterThan(0);
                }
            }
        }
    });
});
