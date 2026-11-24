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

    describe("the operation's own Army HQ id, with no TG telemetry (orchestrator ruling 2026-11-16)", () => {
        // Farz injected as the Army HQ op but formed no TG (faction TG cap full): the AAR has
        // no army_hq_telemetry; the final save's registry holds the Army HQ record.
        const noTgAar = { ...aar, army_hq_telemetry: null };
        const registry = {
            'ahq:RBiH:3:farz_95': {
                id: 'ahq:RBiH:3:farz_95', faction_id: 'RBiH', name: 'Operation Farz 95',
                anchor_corps_id: 'arbih_3rd_corps', formed_on_turn: 161, status: 'completed',
            },
        };
        const ownIdInput = { ...input, aars: [noTgAar], armyHqOperations: registry };

        it('accepts the registered Farz Army HQ operation without TG telemetry', () => {
            const result = checkFarzObjectiveCaptures(ownIdInput);
            expect(result.ok).toBe(true);
            expect(result.authoredCount).toBe(1);
        });

        it('does not accept a capture by any other operation', () => {
            // Same cells taken, but by a non-Farz operation: its AAR id matches no Farz record.
            const otherId = 'arbih_3rd_corps:Operation Other:t161';
            const otherAar = { ...noTgAar, operation_id: otherId };
            const otherBattles = new Map([...battles].map(([k, b]) => [k, { ...b, operation_id: otherId }]));
            expect(checkFarzObjectiveCaptures({ ...ownIdInput, aars: [otherAar], battleById: otherBattles }).ok).toBe(false);
            // A Farz-named AAR from another corps or start turn is not the registered operation.
            for (const operation_id of ['arbih_2nd_corps:Operation Farz 95:t161', 'arbih_3rd_corps:Operation Farz 95:t162']) {
                expect(checkFarzObjectiveCaptures({ ...ownIdInput, aars: [{ ...noTgAar, operation_id }] }).ok).toBe(false);
            }
            // A registry entry for another Army HQ operation does not identify Farz.
            expect(checkFarzObjectiveCaptures({ ...ownIdInput, armyHqOperations: {
                'ahq:RBiH:3:krivaja_95': { ...registry['ahq:RBiH:3:farz_95'], id: 'ahq:RBiH:3:krivaja_95' },
            } }).ok).toBe(false);
            // No registry: the TG-less AAR still fails, as before.
            expect(checkFarzObjectiveCaptures({ ...ownIdInput, armyHqOperations: undefined }).ok).toBe(false);
        });

        it('still fails when the registered Farz did not take its objectives', () => {
            expect(checkFarzObjectiveCaptures({ ...ownIdInput, events: events.slice(0, 1) }).ok).toBe(false);
        });

        it('counts one authored AAR when both the telemetry and the registry identify it', () => {
            const result = checkFarzObjectiveCaptures({ ...input, armyHqOperations: registry });
            expect(result.ok).toBe(true);
            expect(result.authoredCount).toBe(1);
        });
    });

    describe('cases from other lanes (orchestrator, 2026-11-17)', () => {
        // §6 lane E1: identical territory to main, but Farz is injected a week later (t179) with no
        // cross-corps donor, so no Tactical Group and no army_hq_telemetry. It still counts: the
        // registry names the operation.
        it('E1: the same Farz launched a week later with no donor or telemetry still counts', () => {
            const id = 'arbih_3rd_corps:Operation Farz 95:t179';
            const late = { ...aar, operation_id: id, army_hq_telemetry: null, started_turn: 179, ended_turn: 186 };
            const lateEvents = events.map((e, i) => ({ ...e, turn: 180 + 2 * i }));
            const lateBattles = new Map([...battles].map(([k, b]) => [k, { ...b, operation_id: id }]));
            const result = checkFarzObjectiveCaptures({
                ...input, aars: [late], events: lateEvents, battleById: lateBattles,
                armyHqOperations: { 'ahq:RBiH:3:farz_95': {
                    id: 'ahq:RBiH:3:farz_95', faction_id: 'RBiH', name: 'Operation Farz 95',
                    anchor_corps_id: 'arbih_3rd_corps', formed_on_turn: 179, status: 'completed',
                } },
            });
            expect(result.ok).toBe(true);
            expect(result.authoredCount).toBe(1);
        });

        // RF-ROSTER RB9 emergent: generic 1st/2nd/3rd Corps operations took the cells at t166-170, so
        // Farz had no live objective at t179 and never launched. That early fall must fail P-A.
        it('RF-ROSTER: generic operations taking the cells early, with Farz never launched, fail', () => {
            const genericId = 'arbih_3rd_corps:Operacija Zamah:t160';
            const earlyEvents = events.map((e, i) => ({ ...e, turn: 166 + 4 * i }));
            const earlyBattles = new Map([...battles].map(([k, b]) => [k, { ...b, operation_id: genericId }]));
            const generic = { ...aar, operation_id: genericId, army_hq_telemetry: null, started_turn: 160, ended_turn: 172 };
            const result = checkFarzObjectiveCaptures({
                ...input, aars: [generic], events: earlyEvents, battleById: earlyBattles, armyHqOperations: {},
            });
            expect(result.ok).toBe(false);
            expect(result.authoredCount).toBe(0);
        });
    });

    describe("seats' ruling on the window and emergent semantics (2026-11-17)", () => {
        // P-A window opens at t177; an RBiH capture in [160, 177) is an early fall and fails the cell.
        // Emergent mode credits any RBiH operation-owned capture inside the window; historical keeps
        // the authored Farz/Uragan receipts.
        const ruled = { windowStart: 177, earlyStart: 160 };
        const farzId = 'arbih_3rd_corps:Operation Farz 95:t179';
        const registry = { 'ahq:RBiH:3:farz_95': {
            id: 'ahq:RBiH:3:farz_95', faction_id: 'RBiH', name: 'Operation Farz 95',
            anchor_corps_id: 'arbih_3rd_corps', formed_on_turn: 179, status: 'completed',
        } };
        const farz = { ...aar, operation_id: farzId, army_hq_telemetry: null, started_turn: 179, ended_turn: 186 };
        const inWindow = events.map((e, i) => ({ ...e, turn: 180 + 2 * i }));
        const owned = (opId: string, eventsIn: typeof events) =>
            new Map(eventsIn.map((e) => [e.battle_id, { ...battles.get(e.battle_id)!, operation_id: opId }]));
        const genericId = 'arbih_2nd_corps:Operacija Lavina:t178';

        for (const mode of ['historical', 'emergent'] as const) {
            it(`${mode}: E1 (Farz at t179, no donor, no telemetry) counts`, () => {
                const result = checkFarzObjectiveCaptures({ ...input, ...ruled, mode, aars: [farz], events: inWindow,
                    battleById: owned(farzId, inWindow), armyHqOperations: registry });
                expect(result.ok).toBe(true);
            });

            it(`${mode}: RB9 (generic captures at t166-170, Farz never launched) fails and names the early captures`, () => {
                const early = events.map((e, i) => ({ ...e, turn: 166 + 4 * i }));
                const result = checkFarzObjectiveCaptures({ ...input, ...ruled, mode, aars: [], events: early,
                    battleById: owned('arbih_3rd_corps:Operacija Zamah:t160', early), armyHqOperations: {} });
                expect(result.ok).toBe(false);
                expect(result.rows.map((row: { early_captures: Array<{ turn: number }> }) => row.early_captures.map((c) => c.turn)))
                    .toEqual([[166], [170]]);
            });

            it(`${mode}: an early capture, retaken by RS and recaptured in the window, still fails`, () => {
                const retaken = [
                    { ...events[0], turn: 168, battle_id: 'early_0' },
                    { settlement_id: cells[0][1], to: 'RS', mechanism: 'combat', turn: 172, attacker_brigade: 'rs_x', battle_id: 'rs_0' },
                    ...inWindow,
                ];
                const map = owned(farzId, inWindow);
                map.set('early_0', { ...battles.get('battle_0')!, battle_id: 'early_0', operation_id: 'arbih_3rd_corps:Operacija Zamah:t160' });
                const result = checkFarzObjectiveCaptures({ ...input, ...ruled, mode, aars: [farz], events: retaken,
                    battleById: map, armyHqOperations: registry });
                expect(result.ok).toBe(false);
                expect(result.rows[0].early_captures.map((c: { turn: number }) => c.turn)).toEqual([168]);
            });
        }

        it('emergent: a generic operation capture inside the window counts; historical does not credit it', () => {
            const generic = { ...aar, operation_id: genericId, army_hq_telemetry: null, started_turn: 178, ended_turn: 186 };
            const base = { ...input, ...ruled, aars: [generic], events: inWindow, battleById: owned(genericId, inWindow), armyHqOperations: {} };
            expect(checkFarzObjectiveCaptures({ ...base, mode: 'emergent' }).ok).toBe(true);
            expect(checkFarzObjectiveCaptures({ ...base, mode: 'historical' }).ok).toBe(false);
        });

        it('emergent: a capture no operation owned never counts', () => {
            const noOp = new Map(inWindow.map((e) => {
                const { operation_id: _drop, ...rest } = battles.get(e.battle_id)! as Record<string, unknown>;
                return [e.battle_id, rest];
            }));
            const result = checkFarzObjectiveCaptures({ ...input, ...ruled, mode: 'emergent', aars: [], events: inWindow,
                battleById: noOp, armyHqOperations: {} });
            expect(result.ok).toBe(false);
        });

        it('no mode recorded behaves as historical', () => {
            const generic = { ...aar, operation_id: genericId, army_hq_telemetry: null, started_turn: 178, ended_turn: 186 };
            const result = checkFarzObjectiveCaptures({ ...input, ...ruled, aars: [generic], events: inWindow,
                battleById: owned(genericId, inWindow), armyHqOperations: {} });
            expect(result.ok).toBe(false);
        });
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

// Historical-mode third path (orchestrator ruling 2026-11-22, lane B historian + operations sitting):
// another 2nd or 3rd Corps operation of the September 1995 offensive may take a Farz cell (BB1 printed
// pp. 384-388). Shaped on k_bfsd: Farz started t180 and took Vozuća; the 2nd Corps' Operacija Slap 2
// (started t181, targeting Briješnica) took Briješnica at t182 while Farz was still running.
describe('Farz P-A historical mode: the joint-offensive path', () => {
    const VOZUCA = 'op:zavidovici:vozuca_2';
    const BRIJESNICA = 'op:lukavac:brijesnica_donja_2';
    const farzId = 'arbih_3rd_corps:Operation Farz 95:t180';
    const slapId = 'arbih_2nd_corps:Operacija Slap 2:t181';
    const farzAar = {
        operation_id: farzId,
        corps_id: 'arbih_3rd_corps',
        army_hq_telemetry: { army_hq_op_id: 'ahq:RBiH:3:farz_95' },
        started_turn: 180,
        ended_turn: 186,
        // The AAR over-claims Briješnica (it logs control changes, not battle ownership); the gate
        // reads the battle receipt, so this does not make it Farz's own capture.
        objectives_logged_captured: [VOZUCA, BRIJESNICA],
        objectives_targeted: [VOZUCA, BRIJESNICA],
        participating_brigades: ['third_corps_brigade'],
    };
    const opAar = (id: string, corps: string, start: number, end: number, targeted: string[]) => ({
        operation_id: id, corps_id: corps, started_turn: start, ended_turn: end,
        objectives_logged_captured: [], objectives_targeted: targeted, participating_brigades: [],
    });
    const capture = (osid: string, turn: number, opId: string, brigade: string, battleId: string) => ({
        event: { settlement_id: osid, to: 'RBiH', mechanism: 'combat', turn, attacker_brigade: brigade, battle_id: battleId },
        battle: { battle_id: battleId, target_osid: osid, attacker_brigade: brigade, attacker_won: true, operation_id: opId },
    });
    const build = (second: ReturnType<typeof capture>, extraAars: object[], first = capture(VOZUCA, 181, farzId, 'third_corps_brigade', 'b_voz')) => ({
        cells: [['Vozuća', VOZUCA], ['Briješnica', BRIJESNICA]],
        at188: { [VOZUCA]: 'RBiH', [BRIJESNICA]: 'RBiH' },
        events: [first.event, second.event],
        battleById: new Map([[first.battle.battle_id, first.battle], [second.battle.battle_id, second.battle]]),
        aars: [farzAar, ...extraAars],
        corpsOf: input.corpsOf,
        windowStart: 177,
        earlyStart: 160,
        mode: 'historical',
    });
    const slap = opAar(slapId, 'arbih_2nd_corps', 181, 183, [BRIJESNICA]);
    const slapCapture = capture(BRIJESNICA, 182, slapId, 'second_corps_brigade', 'b_brij');

    it('k_bfsd Slap 2: a 2nd Corps operation started in the window, targeting the cell, passes', () => {
        const result = checkFarzObjectiveCaptures(build(slapCapture, [slap]));
        expect(result.ok).toBe(true);
        const row = result.rows.find((r: { osid: string }) => r.osid === BRIJESNICA);
        expect(row).toMatchObject({ ok: true, turn: 182, via: 'joint', operation_id: slapId });
        expect(result.rows.find((r: { osid: string }) => r.osid === VOZUCA).via).toBe('farz');
    });

    it('Nada 2 and Odbrana: a 3rd Corps operation started before the window stays out, even running into it', () => {
        for (const [name, start] of [['Operacija Nada 2', 167], ['Operacija Odbrana', 171]] as const) {
            const id = `arbih_3rd_corps:${name}:t${start}`;
            const carried = opAar(id, 'arbih_3rd_corps', start, 184, [BRIJESNICA]);
            const result = checkFarzObjectiveCaptures(build(capture(BRIJESNICA, 182, id, 'third_corps_brigade', 'b_brij'), [carried]));
            expect(result.ok).toBe(false);
            expect(result.rows.find((r: { osid: string }) => r.osid === BRIJESNICA).via).toBeNull();
        }
    });

    it('an operation aimed elsewhere, or of another corps, stays out', () => {
        const elsewhere = opAar(slapId, 'arbih_2nd_corps', 181, 183, ['op:somewhere:else']);
        expect(checkFarzObjectiveCaptures(build(slapCapture, [elsewhere])).ok).toBe(false);
        const firstId = 'arbih_1st_corps:Operacija Rijeka:t181';
        const first = opAar(firstId, 'arbih_1st_corps', 181, 183, [BRIJESNICA]);
        expect(checkFarzObjectiveCaptures(build(capture(BRIJESNICA, 182, firstId, 'first_corps_brigade', 'b_brij'), [first])).ok).toBe(false);
    });

    it('a capture before the joint launch, or after Farz ended, stays out', () => {
        const early = opAar('arbih_2nd_corps:Operacija Slap 2:t177', 'arbih_2nd_corps', 177, 183, [BRIJESNICA]);
        expect(checkFarzObjectiveCaptures(build(
            capture(BRIJESNICA, 178, early.operation_id, 'second_corps_brigade', 'b_brij'), [early])).ok).toBe(false);
        const late = opAar('arbih_2nd_corps:Operacija Slap 3:t185', 'arbih_2nd_corps', 185, 188, [BRIJESNICA]);
        expect(checkFarzObjectiveCaptures(build(
            capture(BRIJESNICA, 187, late.operation_id, 'second_corps_brigade', 'b_brij'), [late])).ok).toBe(false);
    });

    it('the Uragan start opens the joint window when it is earlier than Farz', () => {
        const uragan = opAar('arbih_2nd_corps:Operation Uragan 95:t178', 'arbih_2nd_corps', 178, 182, []);
        const early = opAar('arbih_2nd_corps:Operacija Slap 2:t178', 'arbih_2nd_corps', 178, 183, [BRIJESNICA]);
        const result = checkFarzObjectiveCaptures(build(
            capture(BRIJESNICA, 179, early.operation_id, 'second_corps_brigade', 'b_brij'), [uragan, early]));
        expect(result.ok).toBe(true);
    });

    it('the path is closed when Farz itself took no cell', () => {
        const slapVoz = opAar('arbih_2nd_corps:Operacija Slap 1:t181', 'arbih_2nd_corps', 181, 183, [VOZUCA]);
        const result = checkFarzObjectiveCaptures(build(slapCapture, [slap, slapVoz],
            capture(VOZUCA, 181, slapVoz.operation_id, 'second_corps_brigade', 'b_voz')));
        expect(result.ok).toBe(false);
        expect(result.rows.every((r: { via: string | null }) => r.via === null)).toBe(true);
    });

    it('a probe or operationless capture never counts', () => {
        const probe = capture(BRIJESNICA, 182, '', 'second_corps_brigade', 'b_brij');
        delete (probe.battle as { operation_id?: string }).operation_id;
        expect(checkFarzObjectiveCaptures(build(probe, [slap])).ok).toBe(false);
    });

    it('emergent mode is unchanged by the joint path', () => {
        const result = checkFarzObjectiveCaptures({ ...build(slapCapture, [slap]), mode: 'emergent' });
        expect(result.ok).toBe(true);
        expect(result.rows.every((r: { via: string }) => r.via === 'operation')).toBe(true);
    });
});
