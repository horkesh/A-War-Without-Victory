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
                const currentId = (events as any[])[i].id;
                const previousId = (events as any[])[i - 1].id;
                if (currentId === 'zepa_falls_1995' && previousId === 'srebrenica_falls_1995') {
                    expect(curr).toBe(160);
                    expect(prev).toBe(169);
                } else if (currentId === 'un_safe_area_enforcement_1995' && previousId === 'srebrenica_column_breakout_1995') {
                    expect(curr).toBe(160);
                    expect(prev).toBe(171);
                } else if (currentId === 'federation_ground_offensive_1995' && previousId === 'nato_deliberate_force_1995') {
                    expect(curr).toBe(165);
                    expect(prev).toBe(178);
                } else {
                    expect(curr, `${name}: ${currentId} (turn ${curr}) should not precede ${previousId} (turn ${prev})`).toBeGreaterThanOrEqual(prev);
                }
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
                if (
                    ['zepa_falls_1995', 'un_safe_area_enforcement_1995'].includes(event.id)
                    && reqId === 'srebrenica_falls_1995'
                ) {
                    expect(eventTurn).toBe(160);
                    expect(reqTurn).toBe(169);
                } else if (event.id === 'federation_ground_offensive_1995' && reqId === 'nato_deliberate_force_1995') {
                    expect(eventTurn).toBe(165);
                    expect(reqTurn).toBe(178);
                } else {
                    expect(eventTurn, `${event.id} (turn ${eventTurn}) must fire after prerequisite ${reqId} (turn ${reqTurn})`).toBeGreaterThanOrEqual(reqTurn);
                }
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

    it('Ahmici uses the HRHB Vitez basing cell while preserving its historical contract', () => {
        const ahmici = allEvents.find((e: any) => e.id === 'ahmici_massacre_1993');

        expect(ahmici).toBeDefined();
        expect(ahmici.trigger.turn_min).toBe(54);
        expect(ahmici.trigger.turn_max).toBe(70);
        expect(ahmici.trigger.requires_events).toEqual(['croat_bosniak_war_begins_1993']);
        expect(ahmici.trigger.condition).toEqual({
            type: 'and',
            conditions: [
                { type: 'territory_control', osid: 'op:vitez:vitez_2', faction: 'HRHB' },
                { type: 'flag_equals', flag: 'hvo_arbih_tensions_rising', value: true },
            ],
        });
        expect(JSON.stringify(ahmici.trigger.condition)).not.toContain('op:vitez:preocica_3');
        expect(ahmici.once).toBe(true);
        expect(ahmici.effect).toEqual({
            kind: 'humanitarian_impact',
            faction: 'HRHB',
            war_crimes_delta: 3,
        });
        expect(ahmici.effects).toEqual([
            {
                kind: 'negotiation_capital',
                faction: 'HRHB',
                dimension: 'international_credibility',
                delta: -25,
            },
            {
                kind: 'narrative',
                text: 'The Ahmici massacre shocks the international community. HVO credibility suffers a devastating blow.',
            },
        ]);
    });

    it('Stari Most destruction requires East Mostar siege', () => {
        const bridge = allEvents.find((e: any) => e.id === 'mostar_bridge_destroyed_1993');
        expect(bridge.trigger.requires_events).toContain('east_mostar_siege_1993');
    });

    it('Zepa requires Srebrenica', () => {
        const zepa = allEvents.find((e: any) => e.id === 'zepa_falls_1995');
        expect(zepa.trigger.requires_events).toContain('srebrenica_falls_1995');
    });

    it('forms the Srebrenica pocket from local Drina control truth, not a global share or withdrawal flag', () => {
        const formation = allEvents.find((e: any) => e.id === 'srebrenica_enclave_forms_1992');
        expect(formation.trigger.condition).toEqual({
            type: 'and',
            conditions: [
                { type: 'territory_control', osid: 'op:srebrenica:srebrenica_2', faction: 'RBiH' },
                { type: 'territory_control', osid: 'op:zvornik:zvornik', faction: 'RS' },
                { type: 'territory_control', osid: 'op:bratunac:bratunac_2', faction: 'RS' },
            ],
        });
        expect(JSON.stringify(formation.trigger.condition)).not.toContain('territory_percentage');
        expect(JSON.stringify(formation.trigger.condition)).not.toContain('jna_withdrawn');
    });

    it('Srebrenica and Zepa fall rows are event-authored territorial receipts', () => {
        const srebrenica = allEvents.find((e: any) => e.id === 'srebrenica_falls_1995');
        const zepa = allEvents.find((e: any) => e.id === 'zepa_falls_1995');

        expect(srebrenica.trigger.turn_min).toBe(169);
        expect(srebrenica.pressure?.threshold).toBe(8);
        expect(srebrenica.trigger.condition.conditions).toContainEqual({
            type: 'territory_control',
            osid: 'op:srebrenica:srebrenica_2',
            faction: 'RBiH',
        });
        const srebrenicaControl = (srebrenica.effects ?? []).find((effect: any) => effect.kind === 'control_change');
        expect(srebrenicaControl?.faction).toBe('RS');
        expect(srebrenicaControl?.osids).toContain('op:srebrenica:srebrenica_2');
        expect(srebrenicaControl?.osids).toContain('op:srebrenica:donji_potocari_2');
        expect(srebrenicaControl?.osids).toContain('op:srebrenica:bostahovine_2');

        expect(zepa.trigger.turn_min).toBe(160);
        expect(zepa.pressure?.threshold).toBe(6);
        expect(zepa.trigger.condition).toEqual({
            type: 'territory_control',
            osid: 'op:rogatica:zepa_2',
            faction: 'RBiH',
        });
        const zepaControl = (zepa.effects ?? []).find((effect: any) => effect.kind === 'control_change');
        expect(zepaControl?.faction).toBe('RS');
        expect(zepaControl?.osids).toEqual(['op:rogatica:zepa_2']);
    });

    it('pins the coherent 1995 completed-week receipt packet and protected windows', () => {
        const byId = (id: string) => allEvents.find((event: any) => event.id === id);
        const tuzla = byId('tuzla_gate_massacre_1995');
        const hostage = byId('un_hostage_crisis_1995');
        const srebrenica = byId('srebrenica_falls_1995');
        const column = byId('srebrenica_column_breakout_1995');
        const zepa = byId('zepa_falls_1995');
        const markale = byId('second_markale_massacre_1995');
        const deliberateForce = byId('nato_deliberate_force_1995');

        expect([tuzla.trigger.turn_min, tuzla.trigger.turn_max]).toEqual([164, 164]);
        expect([hostage.trigger.turn_min, hostage.trigger.turn_max]).toEqual([164, 167]);
        expect([srebrenica.trigger.turn_min, srebrenica.trigger.turn_max]).toEqual([169, 185]);
        expect([column.trigger.turn_min, column.trigger.turn_max]).toEqual([171, 190]);
        expect([zepa.trigger.turn_min, zepa.trigger.turn_max]).toEqual([160, 190]);
        expect([markale.trigger.turn_min, markale.trigger.turn_max]).toEqual([177, 190]);
        expect([deliberateForce.trigger.turn_min, deliberateForce.trigger.turn_max]).toEqual([178, 195]);
        expect(column.trigger.requires_events).toEqual(['srebrenica_falls_1995']);
        expect(column.trigger.condition).toEqual({ type: 'flag_equals', flag: 'srebrenica_fell', value: true });
        expect(column.same_turn_requires_events).toBe(true);
        expect(deliberateForce.trigger.requires_events).toEqual(['second_markale_massacre_1995']);
        expect(deliberateForce.same_turn_requires_events).toBe(true);
        expect(zepa.same_turn_requires_events).toBeUndefined();
        expect(byId('un_safe_area_enforcement_1995').same_turn_requires_events).toBeUndefined();
    });

    it('ceasefire fires before Dayton talks', () => {
        const ceasefire = allEvents.find((e: any) => e.id === 'ceasefire_1995');
        const dayton = allEvents.find((e: any) => e.id === 'dayton_talks_begin_1995');
        expect(ceasefire.trigger.turn_min).toBeLessThan(dayton.trigger.turn_min);
    });

    it('COHA expiry clears the active ceasefire suppression flag', () => {
        const cohaBegins = allEvents.find((e: any) => e.id === 'coha_ceasefire_begins_1995');
        const cohaExpires = allEvents.find((e: any) => e.id === 'coha_expires_1995');

        expect(cohaBegins.sets_flags?.coha_active).toBe(true);
        expect(cohaExpires.sets_flags?.coha_active).toBe(false);
        expect(cohaExpires.sets_flags?.coha_expired).toBe(true);
    });

    it('Washington Agreement requires Croat-Bosniak war', () => {
        const wa = allEvents.find((e: any) => e.id === 'hrhb_washington_agreement_1994');
        expect(wa.trigger.requires_events).toContain('croat_bosniak_war_begins_1993');
    });

    it('NATO ultimatum and Sarajevo exclusion zone retain their bounded chronology and effects', () => {
        const ult = allEvents.find((e: any) => e.id === 'nato_ultimatum_sarajevo_1994');
        const exclusion = allEvents.find((e: any) => e.id === 'sarajevo_exclusion_zone_1994');

        expect([ult.trigger.turn_min, ult.trigger.turn_max]).toEqual([96, 97]);
        expect(ult.trigger.requires_events).toEqual(['markale_massacre_1994']);
        expect(ult.same_turn_requires_events).toBeUndefined();
        expect(ult.response_options.map((option: any) => option.id)).toEqual([
            'comply_withdraw_hwez',
            'defy_ultimatum_hwez',
        ]);
        expect(ult.effect).toEqual({ kind: 'patron_pressure', faction: 'RS', delta: 10 });
        expect(ult.effects).toEqual([{
            kind: 'narrative',
            text: "NATO demands VRS withdrawal of heavy weapons from around Sarajevo. The threat of air strikes becomes credible for the first time.",
        }]);

        expect([exclusion.trigger.turn_min, exclusion.trigger.turn_max]).toEqual([97, 98]);
        expect(exclusion.trigger.requires_events).toEqual(['nato_ultimatum_sarajevo_1994']);
        expect(exclusion.effect).toEqual({ kind: 'supply_delta', faction: 'RS', delta: -5 });
        expect(exclusion.effects).toEqual([
            { kind: 'morale_change', faction: 'RBiH', delta: 5 },
            { kind: 'aggression_modifier', faction: 'RS', delta: -0.1, duration_turns: 12 },
            {
                kind: 'narrative',
                text: 'VRS heavy weapons are withdrawn from around Sarajevo. The exclusion zone brings the first sustained relief to the besieged capital.',
            },
        ]);
    });

    it('Federation ground offensive requires both Washington and Deliberate Force', () => {
        const fgo = allEvents.find((e: any) => e.id === 'federation_ground_offensive_1995');
        expect(fgo.trigger.requires_events).toContain('hrhb_washington_agreement_1994');
        expect(fgo.trigger.requires_events).toContain('nato_deliberate_force_1995');
    });

    it('Holbrooke ceasefire demand requires the Federation ground offensive', () => {
        const holbrooke = allEvents.find((e: any) => e.id === 'holbrooke_ceasefire_demand_oct95');
        expect(holbrooke).toBeDefined();
        expect(holbrooke.trigger.requires_events).toContain('federation_ground_offensive_1995');
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

    it('total event count is 159', () => {
        expect(allEvents.length).toBe(159);
    });
});
