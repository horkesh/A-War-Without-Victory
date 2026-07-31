import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

type EventRow = {
    id: string;
    trigger?: {
        turn_min?: number;
        turn_max?: number;
        phase?: string;
        condition?: {
            type?: string;
            faction?: string;
            municipality?: string;
            threshold?: number;
        };
    };
};

const events = JSON.parse(readFileSync(
    join(process.cwd(), 'data', 'scenarios', 'events', 'war_1992.json'),
    'utf8',
)) as EventRow[];

function eventById(id: string): EventRow {
    const event = events.find((candidate) => candidate.id === id);
    if (!event) throw new Error(`Missing event ${id}`);
    return event;
}

describe('April 1992 eastern-Bosnia takeover chronology', () => {
    it.each([
        ['zvornik_takeover_1992', 'zvornik'],
        ['foca_1992', 'foca'],
    ])('%s is eligible during April rather than first becoming eligible in June', (id, municipality) => {
        const event = eventById(id);

        expect(event.trigger).toMatchObject({
            turn_min: 1,
            turn_max: 3,
            phase: 'war',
            condition: {
                type: 'faction_controls_municipality',
                faction: 'RS',
                municipality,
                threshold: 0.5,
            },
        });
    });
});
