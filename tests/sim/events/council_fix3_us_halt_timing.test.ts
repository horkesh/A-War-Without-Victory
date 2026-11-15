/**
 * Council fix 3, H4 (docs/40_reports/playtests/20261114_r8_dry_rbih_council_diary.md):
 * "Washington halts the Federation advance" belongs in mid/late September 1995, before the
 * ceasefire card, and must not fire once a ceasefire has been accepted or has taken effect.
 *
 * The US pressed Zagreb and Sarajevo to stop short of Banja Luka in September 1995, after
 * Maestral (BB Vol. I p.462 endnotes 821/823). Turn 179 is 11-17 Sep 1995, turn 181 is
 * 25 Sep-1 Oct 1995; the Holbrooke ceasefire demand opens at turn 183 (9-15 Oct 1995).
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { triggerMatches } from '../../../src/sim/events/event_types.js';
import type { EventDefinition } from '../../../src/sim/events/event_types.js';
import type { GameState } from '../../../src/state/game_state.js';

const WAR_1995 = join(process.cwd(), 'data', 'scenarios', 'events', 'war_1995.json');
const events = JSON.parse(readFileSync(WAR_1995, 'utf8')) as EventDefinition[];
const byId = (id: string): EventDefinition => {
    const def = events.find((e) => e.id === id);
    if (!def) throw new Error(`missing ${id}`);
    return def;
};

const HALT = byId('us_halts_federation_advance_1995');
const DEMAND = byId('holbrooke_ceasefire_demand_oct95');

function state(opts: {
    rsShare?: number;
    flags?: Record<string, boolean | string | number>;
    fireCounts?: Record<string, number>;
} = {}): GameState {
    return {
        meta: { turn: 180, phase: 'war', seed: 'h4' },
        political: {},
        military: {
            formations: {},
            fired_event_ids: ['federation_ground_offensive_1995', ...Object.keys(opts.fireCounts ?? {})],
            event_fire_counts: { federation_ground_offensive_1995: 1, ...(opts.fireCounts ?? {}) },
            event_flags: { ...(opts.flags ?? {}) },
        },
        turn_summaries: [{ territory_snapshot: { RS: opts.rsShare ?? 0.49 } }],
    } as unknown as GameState;
}

describe('council fix 3 / H4: the US halt is a September 1995 event', () => {
    it('opens at turn 179 and closes at turn 181, before the Holbrooke ceasefire demand', () => {
        expect(HALT.trigger.turn_min).toBe(179);
        expect(HALT.trigger.turn_max).toBe(181);
        expect(HALT.trigger.turn_max!).toBeLessThan(DEMAND.trigger.turn_min!);
    });

    it('fires inside its window while the Federation advance is real and no ceasefire exists', () => {
        for (const turn of [179, 180, 181]) {
            expect(triggerMatches(HALT, state(), turn)).toBe(true);
        }
    });

    it('does not fire after its window (the council run saw it on 13 Nov 1995, turn 188)', () => {
        for (const turn of [182, 183, 184, 188]) {
            expect(triggerMatches(HALT, state(), turn)).toBe(false);
        }
    });

    it('stays emergent: no halt when Republika Srpska still holds more than 51% by area', () => {
        expect(triggerMatches(HALT, state({ rsShare: 0.53 }), 180)).toBe(false);
    });

    it('is suppressed once the October 1995 ceasefire has been accepted', () => {
        expect(triggerMatches(HALT, state({ flags: { ceasefire_oct1995_in_force: true } }), 180)).toBe(false);
    });

    it('is suppressed once the general ceasefire card has fired', () => {
        expect(triggerMatches(HALT, state({ fireCounts: { ceasefire_1995: 1 } }), 180)).toBe(false);
    });

    it('accept_ceasefire is the response that records the ceasefire flag the halt reads', () => {
        const accept = DEMAND.response_options!.find((o) => o.id === 'accept_ceasefire')!;
        const refuse = DEMAND.response_options!.find((o) => o.id === 'continue_offensive')!;
        expect(accept.sets_flags?.ceasefire_oct1995_in_force).toBe(true);
        expect(refuse.sets_flags?.ceasefire_oct1995_in_force).toBeUndefined();
    });
});
