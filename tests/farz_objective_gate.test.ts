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

    it('rejects an early, operationless, or contradictory combat receipt', () => {
        expect(checkFarzObjectiveCaptures({ ...input, events: [{ ...events[0], turn: 150 }, events[1]] }).ok).toBe(false);
        const wrongOperation = new Map(battles);
        wrongOperation.set(events[1].battle_id, { ...battles.get(events[1].battle_id)!, operation_id: 'generic Farz' });
        expect(checkFarzObjectiveCaptures({ ...input, battleById: wrongOperation }).ok).toBe(false);
        const lostBattle = new Map(battles);
        lostBattle.set(events[1].battle_id, { ...battles.get(events[1].battle_id)!, attacker_won: false });
        expect(checkFarzObjectiveCaptures({ ...input, battleById: lostBattle }).ok).toBe(false);
    });
});
