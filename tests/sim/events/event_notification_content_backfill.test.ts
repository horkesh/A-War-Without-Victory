import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadWar1992Events(): any[] {
    return JSON.parse(readFileSync(resolve(__dirname, '..', '..', '..', 'data', 'scenarios', 'events', 'war_1992.json'), 'utf-8'));
}

describe('event notification content backfill', () => {
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
});
