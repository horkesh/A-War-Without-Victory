import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEvents(filename: string) {
    const raw = readFileSync(resolve(__dirname, '..', 'data', 'scenarios', 'events', filename), 'utf-8');
    return JSON.parse(raw);
}

describe('Event timeline historical integrity', () => {
    const all1992 = loadEvents('war_1992.json');
    const all1993 = loadEvents('war_1993.json');
    const all1994 = loadEvents('war_1994.json');
    const all1995 = loadEvents('war_1995.json');
    const allEvents = [...all1992, ...all1993, ...all1994, ...all1995];

    it('no event IDs are duplicated across files', () => {
        const ids = allEvents.map((e: any) => e.id);
        const dupes = ids.filter((id: string, i: number) => ids.indexOf(id) !== i);
        expect(dupes).toEqual([]);
    });

    it('all events are once-only', () => {
        for (const event of allEvents) {
            expect(event.once, `${event.id} should be once-only`).toBe(true);
        }
    });

    it('events within each file are sorted by turn_min', () => {
        for (const [name, events] of [['1992', all1992], ['1993', all1993], ['1994', all1994], ['1995', all1995]] as const) {
            for (let i = 1; i < (events as any[]).length; i++) {
                const prev = (events as any[])[i - 1].trigger.turn_min ?? 0;
                const curr = (events as any[])[i].trigger.turn_min ?? 0;
                expect(curr, `${name}: ${(events as any[])[i].id} (turn ${curr}) should not precede ${(events as any[])[i - 1].id} (turn ${prev})`).toBeGreaterThanOrEqual(prev);
            }
        }
    });

    it('requires_events references point to events with earlier or equal turn_min', () => {
        const turnMap = new Map(allEvents.map((e: any) => [e.id, e.trigger.turn_min ?? 0]));
        for (const event of allEvents) {
            const reqs = event.trigger?.requires_events;
            if (!reqs) continue;
            for (const reqId of reqs) {
                expect(turnMap.has(reqId), `${event.id} requires unknown event ${reqId}`).toBe(true);
                const reqTurn = turnMap.get(reqId)!;
                const eventTurn = event.trigger.turn_min ?? 0;
                expect(eventTurn, `${event.id} (turn ${eventTurn}) must fire after prerequisite ${reqId} (turn ${reqTurn})`).toBeGreaterThanOrEqual(reqTurn);
            }
        }
    });

    // Causal ordering guardrails
    it('Croat-Bosniak war cannot start before Vance-Owen plan', () => {
        const vanceOwen = allEvents.find((e: any) => e.id === 'vance_owen_plan_1993');
        const cbWar = allEvents.find((e: any) => e.id === 'croat_bosniak_war_begins_1993');
        expect(cbWar.trigger.turn_min).toBeGreaterThan(vanceOwen.trigger.turn_min);
    });

    it('East Mostar siege requires Croat-Bosniak war', () => {
        const siege = allEvents.find((e: any) => e.id === 'east_mostar_siege_1993');
        expect(siege).toBeDefined();
        expect(siege.trigger.requires_events).toContain('croat_bosniak_war_begins_1993');
    });

    it('Stari Most destruction requires East Mostar siege', () => {
        const bridge = allEvents.find((e: any) => e.id === 'mostar_bridge_destroyed_1993');
        expect(bridge.trigger.requires_events).toContain('east_mostar_siege_1993');
    });

    it('Zepa requires Srebrenica', () => {
        const zepa = allEvents.find((e: any) => e.id === 'zepa_falls_1995');
        expect(zepa.trigger.requires_events).toContain('srebrenica_falls_1995');
    });

    it('ceasefire fires before Dayton talks', () => {
        const ceasefire = allEvents.find((e: any) => e.id === 'ceasefire_1995');
        const dayton = allEvents.find((e: any) => e.id === 'dayton_talks_begin_1995');
        expect(ceasefire.trigger.turn_min).toBeLessThan(dayton.trigger.turn_min);
    });

    it('Washington Agreement requires Croat-Bosniak war', () => {
        const wa = allEvents.find((e: any) => e.id === 'washington_agreement_1994');
        expect(wa.trigger.requires_events).toContain('croat_bosniak_war_begins_1993');
    });

    it('NATO ultimatum requires Markale massacre', () => {
        const ult = allEvents.find((e: any) => e.id === 'nato_ultimatum_sarajevo_1994');
        expect(ult.trigger.requires_events).toContain('markale_massacre_1994');
    });

    it('Federation ground offensive requires both Washington and Deliberate Force', () => {
        const fgo = allEvents.find((e: any) => e.id === 'federation_ground_offensive_1995');
        expect(fgo.trigger.requires_events).toContain('washington_agreement_1994');
        expect(fgo.trigger.requires_events).toContain('nato_deliberate_force_1995');
    });

    it('no anachronistic Mostar siege event exists in 1992 file', () => {
        expect(all1992.find((e: any) => e.id === 'mostar_siege_begins_1992')).toBeUndefined();
    });

    it('no premature UN safe areas event exists in 1992 file', () => {
        expect(all1992.find((e: any) => e.id === 'first_un_safe_areas_1992')).toBeUndefined();
    });

    it('Mostar liberation event reimplemented in v0.6.0 Phase 6', () => {
        expect(all1992.find((e: any) => e.id === 'mostar_liberation_1992')).toBeDefined();
    });

    it('all events have required fields', () => {
        for (const event of allEvents) {
            expect(event.id, 'event missing id').toBeTruthy();
            expect(event.trigger, `${event.id} missing trigger`).toBeTruthy();
            expect(event.effect, `${event.id} missing effect`).toBeTruthy();
        }
    });

    it('total event count is 109', () => {
        expect(allEvents.length).toBe(109);
    });
});
