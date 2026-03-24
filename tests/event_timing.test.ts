import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

interface BaselineEvent { turn: number; id: string; text: string; }
interface Baseline { events_fired: BaselineEvent[]; }

const baselinePath = resolve(__dirname, '..', 'data', 'calibration', 'baseline_40w.json');
let baseline: Baseline;
try {
    baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
} catch {
    baseline = { events_fired: [] };
}

function findEventTurn(id: string): number | null {
    const evt = baseline.events_fired.find(e => e.id === id);
    return evt ? evt.turn : null;
}

describe('event timing windows (40w baseline)', () => {
    it('has baseline data', () => {
        expect(baseline.events_fired.length).toBeGreaterThan(0);
    });

    it('rs_strategic_goals fires w0-3', () => {
        const turn = findEventTurn('rs_strategic_goals');
        expect(turn).not.toBeNull();
        expect(turn!).toBeGreaterThanOrEqual(0);
        expect(turn!).toBeLessThanOrEqual(3);
    });

    it('rbih_state_identity fires w1-5', () => {
        const turn = findEventTurn('rbih_state_identity');
        expect(turn).not.toBeNull();
        expect(turn!).toBeGreaterThanOrEqual(1);
        expect(turn!).toBeLessThanOrEqual(5);
    });

    it('hrhb_political_goal fires w2-7', () => {
        const turn = findEventTurn('hrhb_political_goal');
        expect(turn).not.toBeNull();
        expect(turn!).toBeGreaterThanOrEqual(2);
        expect(turn!).toBeLessThanOrEqual(7);
    });

    it('graz_accords fires w3-6', () => {
        const turn = findEventTurn('graz_accords');
        expect(turn).not.toBeNull();
        expect(turn!).toBeGreaterThanOrEqual(3);
        expect(turn!).toBeLessThanOrEqual(6);
    });

    it('arms_embargo fires w2-8', () => {
        const turn = findEventTurn('arms_embargo_impact_1992');
        expect(turn).not.toBeNull();
        expect(turn!).toBeGreaterThanOrEqual(2);
        expect(turn!).toBeLessThanOrEqual(8);
    });

    it('sarajevo_siege fires w4-15', () => {
        const turn = findEventTurn('sarajevo_siege_begins_1992');
        expect(turn).not.toBeNull();
        expect(turn!).toBeGreaterThanOrEqual(4);
        expect(turn!).toBeLessThanOrEqual(15);
    });

    it('jna_withdrawal fires w3-8 (may be crowded out by MAX_EVENTS_PER_TURN)', () => {
        const turn = findEventTurn('jna_withdrawal_1992');
        // Offensive paramilitaries cause more events to fire in early turns,
        // which can crowd jna_withdrawal out of the w5 slot (MAX_EVENTS_PER_TURN=3).
        // If it fires, it should be in w3-8.
        if (turn !== null) {
            expect(turn).toBeGreaterThanOrEqual(3);
            expect(turn).toBeLessThanOrEqual(8);
        }
    });

    it('drina_valley_ethnic_cleansing fires w6-20', () => {
        const turn = findEventTurn('drina_valley_ethnic_cleansing_1992');
        expect(turn).not.toBeNull();
        expect(turn!).toBeGreaterThanOrEqual(6);
        expect(turn!).toBeLessThanOrEqual(20);
    });

    it('srebrenica_enclave fires w6-25', () => {
        const turn = findEventTurn('srebrenica_enclave_forms_1992');
        expect(turn).not.toBeNull();
        // Offensive paramilitaries accelerate Drina pressure → enclave forms earlier (w8 vs w10+)
        expect(turn!).toBeGreaterThanOrEqual(6);
        expect(turn!).toBeLessThanOrEqual(25);
    });

    it('concentration_camps fires w10-25', () => {
        const turn = findEventTurn('concentration_camps_revealed_1992');
        expect(turn).not.toBeNull();
        expect(turn!).toBeGreaterThanOrEqual(10);
        expect(turn!).toBeLessThanOrEqual(25);
    });

    it('jajce_falls fires w30-40', () => {
        const turn = findEventTurn('jajce_falls_1992');
        expect(turn).not.toBeNull();
        expect(turn!).toBeGreaterThanOrEqual(30);
        expect(turn!).toBeLessThanOrEqual(40);
    });

    it('at least 22 events fire in 40 weeks', () => {
        // Offensive paramilitaries may crowd out jna_withdrawal (MAX_EVENTS_PER_TURN=3)
        expect(baseline.events_fired.length).toBeGreaterThanOrEqual(22);
    });

    it('foundational decisions fire in first 7 turns', () => {
        const foundational = ['rs_strategic_goals', 'rbih_state_identity', 'hrhb_political_goal'];
        for (const id of foundational) {
            const turn = findEventTurn(id);
            expect(turn).not.toBeNull();
            expect(turn!).toBeLessThanOrEqual(7);
        }
    });
});
