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
