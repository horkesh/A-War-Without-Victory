/**
 * v0.8.2 Phase 5c — Holbrooke 1995 Shuttle Diplomacy Events
 * Focused tests for the three Holbrooke-era events added to war_1995.json.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEvents(filename: string): any[] {
    const raw = readFileSync(resolve(__dirname, '..', '..', '..', 'data', 'scenarios', 'events', filename), 'utf-8');
    return JSON.parse(raw);
}

describe('v0.8.2 Phase 5c — Holbrooke 1995 Shuttle Diplomacy Events', () => {
    let events1995: any[];
    let allEvents: any[];

    beforeAll(() => {
        events1995 = loadEvents('war_1995.json');
        const events1992 = loadEvents('war_1992.json');
        const events1993 = loadEvents('war_1993.json');
        const events1994 = loadEvents('war_1994.json');
        allEvents = [...events1992, ...events1993, ...events1994, ...events1995];
    });

    // ── Presence tests ────────────────────────────────────────────────────────

    it('holbrooke_us_belgrade_channel_1995 is present in the event timeline', () => {
        const ev = allEvents.find((e: any) => e.id === 'holbrooke_us_belgrade_channel_1995');
        expect(ev).toBeDefined();
    });

    it('deliberate_force_rs_compliance_1995 is present in the event timeline', () => {
        const ev = allEvents.find((e: any) => e.id === 'deliberate_force_rs_compliance_1995');
        expect(ev).toBeDefined();
    });

    it('holbrooke_ceasefire_demand_oct95 is present in the event timeline', () => {
        const ev = allEvents.find((e: any) => e.id === 'holbrooke_ceasefire_demand_oct95');
        expect(ev).toBeDefined();
    });

    // ── turn_min and requires_player_response ─────────────────────────────────

    it('holbrooke_us_belgrade_channel_1995 has turn_min 176 and requires_player_response false', () => {
        const ev = allEvents.find((e: any) => e.id === 'holbrooke_us_belgrade_channel_1995');
        expect(ev.trigger.turn_min).toBe(176);
        expect(ev.requires_player_response).toBe(false);
    });

    it('deliberate_force_rs_compliance_1995 has turn_min 178 and requires_player_response false', () => {
        const ev = allEvents.find((e: any) => e.id === 'deliberate_force_rs_compliance_1995');
        expect(ev.trigger.turn_min).toBe(178);
        expect(ev.requires_player_response).toBe(false);
    });

    it('holbrooke_ceasefire_demand_oct95 has turn_min 183 and requires_player_response true', () => {
        const ev = allEvents.find((e: any) => e.id === 'holbrooke_ceasefire_demand_oct95');
        expect(ev.trigger.turn_min).toBe(183);
        expect(ev.requires_player_response).toBe(true);
    });

    it('holbrooke_ceasefire_demand_oct95 requires the Federation ground offensive before it can fire', () => {
        const ev = allEvents.find((e: any) => e.id === 'holbrooke_ceasefire_demand_oct95');
        expect(ev.trigger.requires_events).toContain('federation_ground_offensive_1995');
    });

    // ── bot_response_logic ────────────────────────────────────────────────────

    it('keeps RS Phase 5c events strategic_weighted while Holbrooke ceasefire uses historical calibration', () => {
        const ids = [
            'holbrooke_us_belgrade_channel_1995',
            'deliberate_force_rs_compliance_1995',
        ];
        for (const id of ids) {
            const ev = allEvents.find((e: any) => e.id === id);
            expect(ev.bot_response_logic, `${id} should have bot_response_logic strategic_weighted`).toBe('strategic_weighted');
        }
        const holbrooke = allEvents.find((e: any) => e.id === 'holbrooke_ceasefire_demand_oct95');
        expect(holbrooke.bot_response_logic).toBe('historical');
    });

    // ── responding_faction ────────────────────────────────────────────────────

    it('holbrooke_ceasefire_demand_oct95 has responding_faction RBiH', () => {
        const ev = allEvents.find((e: any) => e.id === 'holbrooke_ceasefire_demand_oct95');
        expect(ev.responding_faction).toBe('RBiH');
    });

    it('RS events have responding_faction RS', () => {
        const rsIds = ['holbrooke_us_belgrade_channel_1995', 'deliberate_force_rs_compliance_1995'];
        for (const id of rsIds) {
            const ev = allEvents.find((e: any) => e.id === id);
            expect(ev.responding_faction, `${id} should have responding_faction RS`).toBe('RS');
        }
    });

    // ── aggression_affinity on all options ────────────────────────────────────

    it('all response options on Phase 5c events have aggression_affinity set', () => {
        const ids = [
            'holbrooke_us_belgrade_channel_1995',
            'deliberate_force_rs_compliance_1995',
            'holbrooke_ceasefire_demand_oct95',
        ];
        for (const id of ids) {
            const ev = allEvents.find((e: any) => e.id === id);
            expect(ev.response_options, `${id} should have response_options`).toBeDefined();
            expect(ev.response_options.length, `${id} should have at least 2 options`).toBeGreaterThanOrEqual(2);
            for (const opt of ev.response_options) {
                expect(opt.aggression_affinity, `${id}.${opt.id} missing aggression_affinity`).toBeDefined();
                expect(typeof opt.aggression_affinity, `${id}.${opt.id} aggression_affinity must be a number`).toBe('number');
            }
        }
    });

    // ── once flag ─────────────────────────────────────────────────────────────

    it('all three Phase 5c events are once-only', () => {
        const ids = [
            'holbrooke_us_belgrade_channel_1995',
            'deliberate_force_rs_compliance_1995',
            'holbrooke_ceasefire_demand_oct95',
        ];
        for (const id of ids) {
            const ev = allEvents.find((e: any) => e.id === id);
            expect(ev.once, `${id} should be once:true`).toBe(true);
        }
    });

    // ── dimension_shifts on fire ──────────────────────────────────────────────

    it('holbrooke_us_belgrade_channel_1995 fires with RS patron_confidence -12', () => {
        const ev = allEvents.find((e: any) => e.id === 'holbrooke_us_belgrade_channel_1995');
        const shift = ev.dimension_shifts?.find((s: any) => s.faction === 'RS' && s.dimension === 'patron_confidence');
        expect(shift).toBeDefined();
        expect(shift.delta).toBe(-12);
    });

    it('deliberate_force_rs_compliance_1995 fires with RS patron_confidence -15 and international_standing -10', () => {
        const ev = allEvents.find((e: any) => e.id === 'deliberate_force_rs_compliance_1995');
        const pc = ev.dimension_shifts?.find((s: any) => s.faction === 'RS' && s.dimension === 'patron_confidence');
        const is_ = ev.dimension_shifts?.find((s: any) => s.faction === 'RS' && s.dimension === 'international_standing');
        expect(pc).toBeDefined();
        expect(pc.delta).toBe(-15);
        expect(is_).toBeDefined();
        expect(is_.delta).toBe(-10);
    });

    it('holbrooke_ceasefire_demand_oct95 fires with RBiH patron_confidence -8', () => {
        const ev = allEvents.find((e: any) => e.id === 'holbrooke_ceasefire_demand_oct95');
        const shift = ev.dimension_shifts?.find((s: any) => s.faction === 'RBiH' && s.dimension === 'patron_confidence');
        expect(shift).toBeDefined();
        expect(shift.delta).toBe(-8);
    });
});
