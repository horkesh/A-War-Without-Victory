import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

// Fable consult 10 / orchestrator ruling §26: the Farz receipts in three tiers (GATE, SHAPE, TRIPWIRE).
// Fixtures mirror the three runs named in the memo's appendix A: main emergent (675bf8fb: Boljanić,
// Petrovo and Vitkovci are stopping-line rows), lane B A6 historical (dedbd200: the Maglaj Jablanica
// retake is no longer flagged) and the unlock run (25cef1e3: still fails the eastern gate).
const require = createRequire(import.meta.url);
const gate = require('../tools/lib/farz_objective_gate.cjs');

const VOZUCA = 'op:zavidovici:vozuca_2';
const DONJA = 'op:maglaj:donja_bocinja_2';
const GORNJA = 'op:maglaj:gornja_bocinja';
const BRIJESNICA = 'op:lukavac:brijesnica_donja_2';
const CELLS = [['Vozuća', VOZUCA], ['donja', DONJA], ['gornja', GORNJA], ['Spreča', BRIJESNICA]];
const EAST = ['sekovici', 'vlasenica', 'milici', 'zvornik', 'bratunac', 'lopare', 'ugljevik', 'kalesija', 'osmaci'];

const CORPS: Record<string, string> = {
    b2: 'arbih_2nd_corps', b3: 'arbih_3rd_corps', b1: 'arbih_1st_corps', rs: 'vrs_1st_krajina',
};
const corpsOf = (id: string) => CORPS[id] ?? null;
const factionOf = (id: string) => (id === 'rs' ? 'RS' : id in CORPS ? 'RBiH' : null);

type Ev = { settlement_id: string; to: string; mechanism: string; turn: number; attacker_brigade: string; battle_id: string };
function cap(osid: string, turn: number, attacker: string, op: string | null, mechanism = 'combat') {
    const battle_id = `${turn}:${osid}:${attacker}`;
    const event: Ev = { settlement_id: osid, to: attacker === 'rs' ? 'RS' : 'RBiH', mechanism, turn, attacker_brigade: attacker, battle_id };
    const battle: Record<string, unknown> = { battle_id, target_osid: osid, attacker_brigade: attacker, attacker_won: true };
    if (op) battle.operation_id = op;
    return { event, battle, turn };
}
const battleMap = (caps: ReturnType<typeof cap>[]) => new Map(caps.map((c) => [c.event.battle_id, c.battle]));

const ref = {
    apr1995: {
        'op:doboj:boljanic_2': 'RS', 'op:gracanica:petrovo_2': 'RS', 'op:teslic:vitkovci': 'RS',
        'op:maglaj:jablanica': 'RBiH', 'op:lopare:lopare_selo_2': 'RS', 'op:hanpijesak:nevacka_3': 'RS',
        [VOZUCA]: 'RS', [DONJA]: 'RS', [GORNJA]: 'RS', [BRIJESNICA]: 'RS',
    } as Record<string, string>,
    oct1995: {
        'op:doboj:boljanic_2': 'RS', 'op:gracanica:petrovo_2': 'RS', 'op:teslic:vitkovci': 'RS',
        'op:maglaj:jablanica': 'RBiH', 'op:lopare:lopare_selo_2': 'RS', 'op:hanpijesak:nevacka_3': 'RS',
        [VOZUCA]: 'RBiH', [DONJA]: 'RBiH', [GORNJA]: 'RBiH', [BRIJESNICA]: 'RBiH',
    } as Record<string, string>,
};

describe('Farz receipt tiers: the stopping line (SHAPE)', () => {
    it('reads the 3rd Corps as well as the 2nd (main emergent: Vitkovci, Boljanić, Petrovo)', () => {
        const caps = [
            cap('op:teslic:vitkovci', 170, 'b3', 'arbih_3rd_corps:Operacija Ždral 2:t165'),
            cap('op:doboj:boljanic_2', 176, 'b3', 'arbih_3rd_corps:Operacija Jelen 2:t173'),
            cap('op:gracanica:petrovo_2', 177, 'b3', 'arbih_3rd_corps:Operacija Jelen 2:t173'),
        ];
        const rows = gate.stoppingLineRows({ events: caps.map((c) => c.event), battleById: battleMap(caps), ref, corpsOf, easternMuns: EAST });
        expect(gate.distinctCells(rows)).toEqual(['op:doboj:boljanic_2', 'op:gracanica:petrovo_2', 'op:teslic:vitkovci']);
    });

    it('a retake of a cell the October 1995 reference keeps RBiH is warranted (A6: Maglaj Jablanica)', () => {
        const caps = [cap('op:maglaj:jablanica', 164, 'b2', 'arbih_2nd_corps:Operacija X:t160')];
        expect(gate.stoppingLineRows({ events: caps.map((c) => c.event), battleById: battleMap(caps), ref, corpsOf, easternMuns: EAST })).toEqual([]);
    });

    it('ignores the 1st Corps, captures before t160 and the eastern municipalities (those gate)', () => {
        const caps = [
            cap('op:gracanica:petrovo_2', 170, 'b1', 'arbih_1st_corps:Op:t165'),
            cap('op:gracanica:petrovo_2', 150, 'b2', 'arbih_2nd_corps:Op:t145'),
            cap('op:lopare:lopare_selo_2', 161, 'b2', 'arbih_2nd_corps:Operacija Ihlas:t141'),
        ];
        expect(gate.stoppingLineRows({ events: caps.map((c) => c.event), battleById: battleMap(caps), ref, corpsOf, easternMuns: EAST })).toEqual([]);
    });
});

describe('Farz receipt tiers: GATE rows', () => {
    it('the eastern gate catches any ARBiH corps, operation-owned or not (unlock run: Lopare t161)', () => {
        const events = [
            cap('op:lopare:lopare_selo_2', 161, 'b2', 'arbih_2nd_corps:Operacija Ihlas:t141').event,
            cap('op:lopare:lopare_selo_2', 165, 'b3', 'arbih_3rd_corps:Op:t160').event,
            cap('op:lopare:lopare_selo_2', 150, 'b2', 'arbih_2nd_corps:Op:t145').event,
            cap('op:hanpijesak:nevacka_3', 179, 'b2', 'arbih_2nd_corps:Operacija Ponos 2:t178').event,
        ];
        const rows = gate.easternCaptureGate({ events, ref, factionOf, easternMuns: EAST });
        expect(rows.map((r: { turn: number }) => r.turn)).toEqual([161, 165]);
    });

    it('ownership: an operationless capture of a Farz cell fails in any week; a late 2nd/3rd Corps one fails too', () => {
        const caps = [
            cap(GORNJA, 183, 'b2', null),
            cap(DONJA, 120, 'b1', null),
            cap('op:gracanica:petrovo_2', 176, 'b3', null),
            cap('op:gracanica:petrovo_2', 150, 'b3', null),
            cap(VOZUCA, 180, 'b3', 'arbih_3rd_corps:Operation Farz 95:t178'),
        ];
        const rows = gate.operationOwnershipGate({ events: caps.map((c) => c.event), battleById: battleMap(caps), cells: CELLS, corpsOf });
        expect(rows.map((r: { osid: string; turn: number }) => `${r.osid}@${r.turn}`)).toEqual([
            `${GORNJA}@183`, `${DONJA}@120`, 'op:gracanica:petrovo_2@176',
        ]);
    });

    const farzAar = {
        operation_id: 'arbih_3rd_corps:Operation Farz 95:t178', started_turn: 178, ended_turn: 186,
        participating_brigades: ['b3'], objectives_logged_captured: [GORNJA],
    };
    const partner = { operation_id: 'arbih_2nd_corps:Operation Uragan 95:t179', started_turn: 179, participating_brigades: ['b2'] };
    const allRs = () => Object.fromEntries(CELLS.map(([, o]) => [o, 'RS']));

    it('liveness: Farz or Uragan attacks each objective still RS entering t177, or an operation takes it', () => {
        const caps = [
            cap(GORNJA, 183, 'b3', farzAar.operation_id),
            cap(VOZUCA, 180, 'b2', partner.operation_id),
            cap(BRIJESNICA, 182, 'b2', 'arbih_2nd_corps:Operacija Slap 2:t181'),
        ];
        const events = caps.map((c) => c.event);
        const res = gate.farzLivenessGate({
            cells: CELLS, stateAt: (t: number) => ({ ...allRs(), [DONJA]: t >= 161 ? 'RBiH' : 'RS' }),
            farz: { aar: farzAar, partner }, battles: caps.map((c) => ({ turn: c.turn, battle: c.battle })),
            events, battleById: battleMap(caps),
        });
        expect(res.ok).toBe(true);
        expect(res.rows.map((r: { reason: string }) => r.reason)).toEqual(['attacked', 'attacked', 'taken_by_operation']);
    });

    it('liveness does not accept a capture by an operation outside the 2nd and 3rd Corps', () => {
        const caps = [cap(BRIJESNICA, 182, 'b1', 'arbih_1st_corps:Operacija X:t181')];
        const res = gate.farzLivenessGate({
            cells: [['Spreča', BRIJESNICA]], stateAt: () => allRs(), farz: { aar: farzAar },
            battles: caps.map((c) => ({ turn: c.turn, battle: c.battle })), events: caps.map((c) => c.event), battleById: battleMap(caps),
        });
        expect(res.rows[0].reason).toBe('neither_attacked_nor_taken');
    });

    it('liveness fails when Farz never starts, starts before t160, has no roster, or leaves an objective alone', () => {
        const base = { cells: CELLS, stateAt: () => allRs(), battles: [], events: [], battleById: new Map() };
        expect(gate.farzLivenessGate({ ...base, farz: { aar: null } }).rows[0].reason).toBe('no_authored_farz');
        expect(gate.farzLivenessGate({ ...base, farz: { aar: { ...farzAar, started_turn: 140 } } }).rows[0].reason).toBe('farz_not_started_in_window');
        expect(gate.farzLivenessGate({ ...base, farz: { aar: { ...farzAar, participating_brigades: [] } } }).rows[0].reason).toBe('farz_has_no_roster');
        const res = gate.farzLivenessGate({ ...base, farz: { aar: farzAar } });
        expect(res.ok).toBe(false);
        expect(res.rows.every((r: { reason: string }) => r.reason === 'neither_attacked_nor_taken')).toBe(true);
    });

    it('liveness has nothing to check when every objective was RBiH before t177', () => {
        const res = gate.farzLivenessGate({ cells: CELLS, stateAt: () => Object.fromEntries(CELLS.map(([, o]) => [o, 'RBiH'])),
            farz: { aar: null }, battles: [], events: [], battleById: new Map() });
        expect(res).toMatchObject({ ok: true, rows: [] });
    });
});

describe('Farz receipt tiers: early falls, anchors and the tripwire', () => {
    it('an early fall counts from week 0, not only from t160', () => {
        const caps = [cap(VOZUCA, 109, 'b3', 'arbih_3rd_corps:Op:t105'), cap(DONJA, 161, 'b3', 'arbih_3rd_corps:Operacija Slap:t142'),
            cap(GORNJA, 181, 'b3', 'arbih_3rd_corps:Operation Farz 95:t178')];
        const rows = gate.earlyFarzFalls({ cells: CELLS, events: caps.map((c) => c.event), battleById: battleMap(caps) });
        expect(gate.distinctCells(rows)).toEqual([DONJA, VOZUCA]);
    });

    it('reads the anchor contract and names failed anchors; a missing contract is unknown', () => {
        const checks = [{ anchor_id: 'op:a', passed: true }, { anchor_id: 'op:gracanica:petrovo_2', passed: false }];
        expect(gate.anchorContract({ anchor_contract_evaluation: { anchor_checks: checks } }))
            .toEqual({ known: true, passed: 1, total: 2, failed: ['op:gracanica:petrovo_2'] });
        expect(gate.anchorContract({}).known).toBe(false);
    });

    it('trips on each of the four bounds, and on an unknown anchor contract', () => {
        const ok = { earlyCells: ['x'], stoppingCells: ['a', 'b', 'c'], farzCellsAt188: 3, anchors: { known: true, passed: 29, total: 31 } };
        expect(gate.receiptTripwire(ok)).toEqual([]);
        expect(gate.receiptTripwire({ ...ok, earlyCells: ['x', 'y'] })).toHaveLength(1);
        expect(gate.receiptTripwire({ ...ok, stoppingCells: ['a', 'b', 'c', 'd'] })).toHaveLength(1);
        expect(gate.receiptTripwire({ ...ok, farzCellsAt188: 2 })).toHaveLength(1);
        expect(gate.receiptTripwire({ ...ok, anchors: { known: true, passed: 28, total: 31 } })).toHaveLength(1);
        expect(gate.receiptTripwire({ ...ok, anchors: { known: false } })).toHaveLength(1);
        expect(gate.TRIPWIRE_BOUNDS).toEqual({ maxEarlyFarzCells: 1, maxStoppingLineCells: 3, minFarzCellsAt188: 3, minAnchorsPassed: 29 });
    });
});
