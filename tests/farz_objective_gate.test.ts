import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { checkFarzObjectiveCaptures } = require('../tools/lib/farz_objective_gate.cjs');

const cells = [['Vozuća', 'op:zavidovici:vozuca_2'], ['Briješnica', 'op:lukavac:brijesnica_donja_2']];
const operationId = 'arbih_3rd_corps:Operation Farz 95:t161';
const aar = {
    operation_id: operationId,
    army_hq_telemetry: { army_hq_op_id: 'ahq:RBiH:3:farz_95' },
    started_turn: 161,
    ended_turn: 169,
    objectives_logged_captured: cells.map(([, osid]) => osid),
    participating_brigades: ['third_corps_brigade'],
};
const events = cells.map(([, osid], i) => ({
    settlement_id: osid,
    to: 'RBiH',
    mechanism: 'combat',
    turn: 163 + i,
    attacker_brigade: 'third_corps_brigade',
    battle_id: `battle_${i}`,
}));
const battles = new Map(events.map((e) => [e.battle_id, {
    battle_id: e.battle_id,
    target_osid: e.settlement_id,
    attacker_brigade: e.attacker_brigade,
    attacker_won: true,
    operation_id: operationId,
}]));
const input = {
    cells,
    at188: Object.fromEntries(cells.map(([, osid]) => [osid, 'RBiH'])),
    events,
    battleById: battles,
    aars: [aar],
    corpsOf: (id: string) => ({
        third_corps_brigade: 'arbih_3rd_corps',
        second_corps_brigade: 'arbih_2nd_corps',
        first_corps_brigade: 'arbih_1st_corps',
    } as Record<string, string>)[id] ?? null,
    windowStart: 160,
};

describe('Farz objective gate', () => {
    it('accepts an authored operation taking all objectives even when 3rd Corps lands both captures', () => {
        const result = checkFarzObjectiveCaptures(input);
        expect(result.ok).toBe(true);
        expect(result.rows.every((row: { ok: boolean }) => row.ok)).toBe(true);
        expect(result.secondCorpsParticipated).toBe(false);
    });

    it('accepts a 2nd Corps final capture and rejects 1st Corps or an unknown attacker', () => {
        const secondEvent = { ...events[1], attacker_brigade: 'second_corps_brigade' };
        const secondBattles = new Map(battles);
        secondBattles.set(secondEvent.battle_id, { ...battles.get(secondEvent.battle_id)!,
            attacker_brigade: secondEvent.attacker_brigade });
        expect(checkFarzObjectiveCaptures({ ...input,
            events: [events[0], secondEvent], battleById: secondBattles,
        }).ok).toBe(true);
        for (const attacker of ['first_corps_brigade', 'unknown_brigade']) {
            const wrongEvent = { ...events[1], attacker_brigade: attacker };
            const wrongBattles = new Map(battles);
            wrongBattles.set(wrongEvent.battle_id, { ...battles.get(wrongEvent.battle_id)!,
                attacker_brigade: attacker });
            expect(checkFarzObjectiveCaptures({ ...input,
                events: [events[0], wrongEvent], battleById: wrongBattles,
            }).ok).toBe(false);
        }
    });

    describe('cross-corps donors in the authored operation (RF-3 SD1, ruling 2026-11-14)', () => {
        // The General Staff's 120th was lent to Farz and is in the AAR's participants.
        const donorCorpsOf = (id: string) => (id === 'gs_brigade' ? 'arbih_general_staff' : input.corpsOf(id));
        const donorEvent = { ...events[1], attacker_brigade: 'gs_brigade' };
        const donorBattles = new Map(battles);
        donorBattles.set(donorEvent.battle_id, { ...battles.get(donorEvent.battle_id)!, attacker_brigade: 'gs_brigade' });
        const donorAar = { ...aar, participating_brigades: ['third_corps_brigade', 'gs_brigade'] };
        const donorInput = { ...input, corpsOf: donorCorpsOf, events: [events[0], donorEvent],
            battleById: donorBattles, aars: [donorAar] };

        it('counts a capture by a participant from another command', () => {
            const result = checkFarzObjectiveCaptures(donorInput);
            expect(result.ok).toBe(true);
            expect(result.rows[1]).toMatchObject({ via: 'farz', turn: donorEvent.turn, ok: true });
        });

        it('still rejects the same brigade when it was not a participant', () => {
            expect(checkFarzObjectiveCaptures({ ...donorInput, aars: [aar] }).ok).toBe(false);
        });

        it('a Farz that really fails still fails with a donor participant', () => {
            // The donor's objective never taken.
            expect(checkFarzObjectiveCaptures({ ...donorInput, events: [events[0]] }).ok).toBe(false);
            // Taken, then lost by the last turn.
            expect(checkFarzObjectiveCaptures({ ...donorInput,
                at188: { ...input.at188, [cells[1][1]]: 'RS' } }).ok).toBe(false);
            // Taken by the donor in combat Farz did not own.
            const otherOwner = new Map(donorBattles);
            otherOwner.set(donorEvent.battle_id, { ...donorBattles.get(donorEvent.battle_id)!, operation_id: 'arbih_1st_corps:Operation Other:t161' });
            expect(checkFarzObjectiveCaptures({ ...donorInput, battleById: otherOwner }).ok).toBe(false);
            // Not in Farz's logged captures.
            expect(checkFarzObjectiveCaptures({ ...donorInput,
                aars: [{ ...donorAar, objectives_logged_captured: [cells[0][1]] }] }).ok).toBe(false);
        });
    });

    it('fails closed for a missing capture, missing AAR, or generic-name collision', () => {
        expect(checkFarzObjectiveCaptures({ ...input, events: events.slice(0, 1) }).ok).toBe(false);
        expect(checkFarzObjectiveCaptures({ ...input,
            aars: [{ ...aar, objectives_logged_captured: [cells[0][1]] }],
        }).ok).toBe(false);
        expect(checkFarzObjectiveCaptures({ ...input, aars: [] }).ok).toBe(false);
        expect(checkFarzObjectiveCaptures({ ...input, aars: [{ ...aar, army_hq_telemetry: null }] }).ok).toBe(false);
        expect(checkFarzObjectiveCaptures({ ...input,
            at188: { ...input.at188, [cells[1][1]]: 'RS' },
        }).ok).toBe(false);
    });

    describe('2nd Corps Uragan 95 partner receipts (owner ruling 2026-11-07)', () => {
        const uraganId = 'arbih_2nd_corps:Operation Uragan 95:t162';
        const uragan = {
            operation_id: uraganId,
            started_turn: 162,
            ended_turn: 164,
            objectives_logged_captured: [cells[0][1]],
            participating_brigades: ['second_corps_brigade'],
        };
        const farzWithoutVozuca = { ...aar, objectives_logged_captured: [cells[1][1]] };
        const uraganEvent = { ...events[0], attacker_brigade: 'second_corps_brigade' };
        const uraganBattles = new Map(battles);
        uraganBattles.set(uraganEvent.battle_id, { ...battles.get(uraganEvent.battle_id)!,
            attacker_brigade: 'second_corps_brigade', operation_id: uraganId });
        const partnerInput = { ...input, aars: [farzWithoutVozuca, uragan],
            events: [uraganEvent, events[1]], battleById: uraganBattles };

        it('counts an Uragan-owned 2nd Corps capture inside the Farz window', () => {
            const result = checkFarzObjectiveCaptures(partnerInput);
            expect(result.ok).toBe(true);
            expect(result.rows[0]).toMatchObject({ via: 'uragan', turn: 163, ok: true });
            expect(result.rows[1]).toMatchObject({ via: 'farz', ok: true });
            expect(result.secondCorpsParticipated).toBe(true);
        });

        it('fails closed for a non-2nd-Corps attacker, a capture outside the Farz window, a renamed or duplicated partner, or no Farz AAR', () => {
            const thirdBattles = new Map(uraganBattles);
            thirdBattles.set(uraganEvent.battle_id, { ...uraganBattles.get(uraganEvent.battle_id)!,
                attacker_brigade: 'third_corps_brigade' });
            expect(checkFarzObjectiveCaptures({ ...partnerInput,
                events: [{ ...uraganEvent, attacker_brigade: 'third_corps_brigade' }, events[1]],
                battleById: thirdBattles,
            }).ok).toBe(false);
            expect(checkFarzObjectiveCaptures({ ...partnerInput,
                events: [{ ...uraganEvent, turn: 170 }, events[1]],
            }).ok).toBe(false);
            expect(checkFarzObjectiveCaptures({ ...partnerInput,
                aars: [farzWithoutVozuca, { ...uragan, operation_id: 'arbih_1st_corps:Operation Uragan 95:t162' }],
            }).ok).toBe(false);
            expect(checkFarzObjectiveCaptures({ ...partnerInput,
                aars: [farzWithoutVozuca, uragan, { ...uragan, operation_id: 'arbih_2nd_corps:Operation Uragan 95:t163' }],
            }).ok).toBe(false);
            expect(checkFarzObjectiveCaptures({ ...partnerInput, aars: [uragan] }).ok).toBe(false);
        });
    });

    it('rejects an early, operationless, or contradictory combat receipt', () => {
        expect(checkFarzObjectiveCaptures({ ...input, events: [{ ...events[0], turn: 150 }, events[1]] }).ok).toBe(false);
        const wrongOperation = new Map(battles);
        wrongOperation.set(events[1].battle_id, { ...battles.get(events[1].battle_id)!, operation_id: 'generic Farz' });
        expect(checkFarzObjectiveCaptures({ ...input, battleById: wrongOperation }).ok).toBe(false);
        const lostBattle = new Map(battles);
        lostBattle.set(events[1].battle_id, { ...battles.get(events[1].battle_id)!, attacker_won: false });
        expect(checkFarzObjectiveCaptures({ ...input, battleById: lostBattle }).ok).toBe(false);
    });

    describe('Farz still in progress at the last turn (no AAR yet)', () => {
        // The live operation as the final save holds it; its id rebuilds to `operationId`.
        const liveFarz = {
            corps_id: 'arbih_3rd_corps',
            op: {
                name: 'Operation Farz 95',
                army_hq_op_id: 'ahq:RBiH:3:farz_95',
                started_turn: 161,
                phase: 'recovery',
                objectives: cells.map(([, osid]) => osid),
                participating_brigades: ['third_corps_brigade'],
            },
        };
        const liveInput = { ...input, aars: [], liveOperations: [liveFarz], finalTurn: 188 };

        it('reads operation-owned captures from the live operation', () => {
            const result = checkFarzObjectiveCaptures(liveInput);
            expect(result.ok).toBe(true);
            expect(result.provisional).toBe(true);
        });

        it('still fails when Farz did not take its objectives', () => {
            // One objective never captured.
            expect(checkFarzObjectiveCaptures({ ...liveInput, events: events.slice(0, 1) }).ok).toBe(false);
            // Captured, but lost again by the last turn.
            expect(checkFarzObjectiveCaptures({ ...liveInput,
                at188: { ...input.at188, [cells[1][1]]: 'RS' } }).ok).toBe(false);
            // Captured by combat no Farz operation owned.
            const otherOwner = new Map(battles);
            otherOwner.set(events[1].battle_id, { ...battles.get(events[1].battle_id)!, operation_id: 'arbih_3rd_corps:Operation Other:t161' });
            expect(checkFarzObjectiveCaptures({ ...liveInput, battleById: otherOwner }).ok).toBe(false);
            // An objective the operation was never given.
            expect(checkFarzObjectiveCaptures({ ...liveInput, liveOperations: [{ ...liveFarz,
                op: { ...liveFarz.op, objectives: [cells[0][1]] } }] }).ok).toBe(false);
        });

        it('fails closed with no live Farz, two live Farz, a non-Farz Army HQ op, or no final turn', () => {
            expect(checkFarzObjectiveCaptures({ ...liveInput, liveOperations: [] }).ok).toBe(false);
            expect(checkFarzObjectiveCaptures({ ...liveInput, liveOperations: [liveFarz, liveFarz] }).ok).toBe(false);
            expect(checkFarzObjectiveCaptures({ ...liveInput, liveOperations: [{ ...liveFarz,
                op: { ...liveFarz.op, army_hq_op_id: 'ahq:RBiH:3:other_95' } }] }).ok).toBe(false);
            expect(checkFarzObjectiveCaptures({ ...liveInput, finalTurn: undefined }).ok).toBe(false);
        });

        it('a closed Farz AAR wins over the live operation', () => {
            const result = checkFarzObjectiveCaptures({ ...liveInput, aars: [aar] });
            expect(result.ok).toBe(true);
            expect(result.provisional).toBe(false);
        });
    });
});
