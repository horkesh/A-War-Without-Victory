/**
 * RB5 halt-card receipt: shown only to a human-controlled HRHB whose halt card was answered `no_halt` (applied no later than the
 * act), with at least one municipality holding a matured HRHB policy-expulsion timer. It states M, never a people count. The real
 * adapter and ledger run on a saved-shape state; the signed EN and BCS strings are pinned word for word.
 */

import { describe, expect, it } from 'vitest';

import { initializeCasualtyLedger } from '../../src/state/casualty_ledger.js';
import { createEmptyCapital } from '../../src/state/negotiation_types.js';
import { parseGameState } from '../../src/ui/map/data/GameStateAdapter.js';
import { buildDecisionConsequenceLedger, resolveDecisionConsequenceCopy } from '../../src/ui/map/data/decisionConsequenceLedger.js';
import { enMessages } from '../../src/ui/map/i18n/messages.en.js';
import { bcsMessages } from '../../src/ui/map/i18n/messages.bcs.js';

const CARD = 'hrhb_minority_policy_1993';
const TAIL_EN = 'This is an event of the simulated war, not a statement about what happened in those places.';
const TAIL_BCS = 'Ovo je događaj simuliranog rata, a ne tvrdnja o tome šta se zaista desilo na tim mjestima.';

const EN = {
    titleInPerson: 'No halt ordered',
    titleAutomatic: 'No halt ordered (automatic answer)',
    outcomeMany: (m: number) => `Your side's historical default ran: Bosniaks were expelled from the ground the HVO held in ${m} municipalities.`,
    outcomeOne: 'Your side\'s historical default ran: Bosniaks were expelled from the ground the HVO held in 1 municipality.',
    detailInPerson: `No halt was ordered. This counts against your side, which left the expulsions unopposed. A halt could be ordered only when the war with the ARBiH began. ${TAIL_EN}`,
    detailAutomatic: `Your staff answered automatically with your side's historical default, and no halt was ordered. This counts against your side, which left the expulsions unopposed. A halt could be ordered only when the war with the ARBiH began, and only if you were playing below Observer level. ${TAIL_EN}`,
    detailNoWarCrimeInPerson: `No halt was ordered. A halt could be ordered only when the war with the ARBiH began. ${TAIL_EN}`,
    detailNoWarCrimeAutomatic: `Your staff answered automatically with your side's historical default, and no halt was ordered. A halt could be ordered only when the war with the ARBiH began, and only if you were playing below Observer level. ${TAIL_EN}`,
};
const BCS = {
    titleInPerson: 'Obustava nije naređena',
    titleAutomatic: 'Obustava nije naređena (automatski odgovor)',
    outcome: (m: number) => `Historijska zadana postavka vaše strane se provela: Bošnjaci su protjerani s područja koje je držao HVO. Broj općina: ${m}.`,
    detailInPerson: `Obustava nije naređena. To pada na teret vaše strane, koja se protjerivanju nije suprotstavila. Obustava se mogla narediti samo kad je počeo rat s ARBiH. ${TAIL_BCS}`,
    detailAutomatic: `Vaš štab je automatski odgovorio historijskom zadanom postavkom vaše strane i obustava nije naređena. To pada na teret vaše strane, koja se protjerivanju nije suprotstavila. Obustava se mogla narediti samo kad je počeo rat s ARBiH, i to samo ako ste igrali ispod nivoa Posmatrač. ${TAIL_BCS}`,
    detailNoWarCrimeInPerson: `Obustava nije naređena. Obustava se mogla narediti samo kad je počeo rat s ARBiH. ${TAIL_BCS}`,
    detailNoWarCrimeAutomatic: `Vaš štab je automatski odgovorio historijskom zadanom postavkom vaše strane i obustava nije naređena. Obustava se mogla narediti samo kad je počeo rat s ARBiH, i to samo ako ste igrali ispod nivoa Posmatrač. ${TAIL_BCS}`,
};

interface Opts {
    viewer?: 'HRHB' | 'RBiH' | 'RS';
    headless?: boolean;
    row?: { turn: number; response_id: string; decision_source: string } | null;
    munIds?: string[];
    maturedTurn?: number | undefined;
    warCrime?: boolean;
    appliedTurn?: number;
    halted?: boolean;
}

function timers(munIds: string[], maturedTurn: number | undefined) {
    const out: Record<string, unknown> = {};
    munIds.forEach((mun, i) => {
        // Two timers for the same municipality still count once.
        out[`op:${mun}:${i}a`] = { mun_id: mun, from_faction: 'RBiH', to_faction: 'HRHB', started_turn: 40, cause: 'policy_expulsion', ...(maturedTurn !== undefined ? { matured_turn: maturedTurn } : {}) };
        out[`op:${mun}:${i}b`] = { mun_id: mun, from_faction: 'RBiH', to_faction: 'HRHB', started_turn: 40, cause: 'policy_expulsion', ...(maturedTurn !== undefined ? { matured_turn: maturedTurn } : {}) };
    });
    return out;
}

function build(opts: Opts = {}) {
    const viewer = opts.viewer ?? 'HRHB';
    const row = opts.row === undefined ? { turn: 40, response_id: 'no_halt', decision_source: 'player' } : opts.row;
    const flags: Record<string, unknown> = { hrhb_minority_policy_applied_turn: opts.appliedTurn ?? 40 };
    if (opts.warCrime) flags.hrhb_minority_policy_war_crime_recorded = true;
    if (opts.halted) flags.hrhb_minority_policy_halted = true;
    const raw = {
        meta: { turn: 60, phase: 'war', schema_version: 1, seed: 'test', player_faction: viewer, ...(opts.headless ? { headless_scenario_auto_control: true } : {}) },
        factions: [{ id: 'RS' }, { id: 'RBiH' }, { id: 'HRHB' }],
        military: {
            formations: {},
            casualty_ledger: initializeCasualtyLedger(['RS', 'RBiH', 'HRHB']),
            negotiation: { capital: { RS: createEmptyCapital(), RBiH: createEmptyCapital(), HRHB: createEmptyCapital() } },
            event_flags: flags,
            event_decision_log: row ? [{ event_id: CARD, faction: 'HRHB', ...row }] : [],
        },
        political: { political_controllers: {}, municipalities: {} },
        displacement: {
            civilian_casualties: { RS: { killed: 0, fled_abroad: 0 }, RBiH: { killed: 0, fled_abroad: 0 }, HRHB: { killed: 0, fled_abroad: 0 } },
            hostile_takeover_timers: timers(opts.munIds ?? ['mun_a', 'mun_b'], 'maturedTurn' in opts ? opts.maturedTurn : 44),
        },
    };
    const parsed = parseGameState(JSON.parse(JSON.stringify(raw)));
    const ledger = buildDecisionConsequenceLedger({ ...parsed, player_faction: viewer, rawGameState: { meta: { player_faction: viewer } } } as any, 100)
        .filter((record) => record.familyId === 'minority-policy-receipt');
    return { parsed, ledger };
}

describe('RB5 halt-card receipt visibility', () => {
    it('shows one Records receipt for a human HRHB with an in-person no_halt answer and two municipalities', () => {
        const { ledger } = build();
        expect(ledger).toHaveLength(1);
        expect(ledger[0]!.recordTarget).toBe('records');
        expect(ledger[0]!.turn).toBe(40);
    });
    it('none without a card row', () => expect(build({ row: null }).ledger).toHaveLength(0));
    it('none when the row is a halt', () => expect(build({ row: { turn: 40, response_id: 'order_halt', decision_source: 'player' } }).ledger).toHaveLength(0));
    it('none when the halt flag is set', () => expect(build({ halted: true }).ledger).toHaveLength(0));
    it('none for a headless (bot) HRHB', () => expect(build({ headless: true }).ledger).toHaveLength(0));
    it('none for an RBiH or RS viewer', () => {
        expect(build({ viewer: 'RBiH' }).ledger).toHaveLength(0);
        expect(build({ viewer: 'RS' }).ledger).toHaveLength(0);
    });
    it('none when no municipality holds a matured policy-expulsion timer', () => {
        expect(build({ munIds: [] }).ledger).toHaveLength(0);
        expect(build({ maturedTurn: undefined }).ledger).toHaveLength(0);
    });
    it('an answer whose turn is after the applied turn is not credited', () => {
        expect(build({ row: { turn: 41, response_id: 'no_halt', decision_source: 'player' }, appliedTurn: 40 }).ledger).toHaveLength(0);
        expect(build({ row: { turn: 40, response_id: 'no_halt', decision_source: 'player' }, appliedTurn: 40 }).ledger).toHaveLength(1);
    });
});

describe('RB5 halt-card receipt wording (signed copy, pinned)', () => {
    const cases: Array<{ name: string; automatic: boolean; warCrime: boolean; titleEn: string; titleBcs: string; detailEn: string; detailBcs: string }> = [
        { name: 'in person, war crime', automatic: false, warCrime: true, titleEn: EN.titleInPerson, titleBcs: BCS.titleInPerson, detailEn: EN.detailInPerson, detailBcs: BCS.detailInPerson },
        { name: 'automatic, war crime', automatic: true, warCrime: true, titleEn: EN.titleAutomatic, titleBcs: BCS.titleAutomatic, detailEn: EN.detailAutomatic, detailBcs: BCS.detailAutomatic },
        { name: 'in person, no war crime', automatic: false, warCrime: false, titleEn: EN.titleInPerson, titleBcs: BCS.titleInPerson, detailEn: EN.detailNoWarCrimeInPerson, detailBcs: BCS.detailNoWarCrimeInPerson },
        { name: 'automatic, no war crime', automatic: true, warCrime: false, titleEn: EN.titleAutomatic, titleBcs: BCS.titleAutomatic, detailEn: EN.detailNoWarCrimeAutomatic, detailBcs: BCS.detailNoWarCrimeAutomatic },
    ];
    for (const c of cases) {
        it(`EN and BCS exact: ${c.name}`, () => {
            const { ledger } = build({
                row: { turn: 40, response_id: 'no_halt', decision_source: c.automatic ? 'bot_ai_default' : 'player' },
                warCrime: c.warCrime,
            });
            expect(ledger).toHaveLength(1);
            const record = ledger[0]!;
            // Catalog strings through the record's tokens, in each language.
            const en = (field: 'title' | 'outcome' | 'detail') => resolveDecisionConsequenceCopy(record, field);
            expect(en('title')).toBe(c.titleEn);
            expect(en('outcome')).toBe(EN.outcomeMany(2));
            expect(en('detail')).toBe(c.detailEn);
            const tok = (field: 'titleToken' | 'outcomeToken' | 'detailToken') => record[field]!;
            const fill = (catalog: Record<string, string>, token: { key: string; params?: Record<string, string | number> }) => (
                Object.entries(token.params ?? {}).reduce((text, [k, v]) => text.replace(`{${k}}`, String(v)), catalog[token.key] as string)
            );
            expect(fill(bcsMessages as any, tok('titleToken'))).toBe(c.titleBcs);
            expect(fill(bcsMessages as any, tok('outcomeToken'))).toBe(BCS.outcome(2));
            expect(fill(bcsMessages as any, tok('detailToken'))).toBe(c.detailBcs);
        });
    }

    it('automatic answer only when the row is not from the player', () => {
        expect(build({ row: { turn: 40, response_id: 'no_halt', decision_source: 'player' } }).parsed.minorityPolicyReceipt?.automatic).toBe(false);
        expect(build({ row: { turn: 40, response_id: 'no_halt', decision_source: 'bot_ai_default' } }).parsed.minorityPolicyReceipt?.automatic).toBe(true);
    });

    it('war-crime variants only when the war-crime flag is true', () => {
        expect(build({ warCrime: true }).ledger[0]!.detail).toBe(EN.detailInPerson);
        expect(build({ warCrime: false }).ledger[0]!.detail).toBe(EN.detailNoWarCrimeInPerson);
        expect(build({ warCrime: false }).ledger[0]!.detail).not.toContain('counts against');
    });

    it('M counts distinct municipalities; M = 1 uses the singular EN string, BCS states M', () => {
        const three = build({ munIds: ['a', 'b', 'c'] });
        expect(three.parsed.minorityPolicyReceipt?.municipalities).toBe(3);
        expect(three.ledger[0]!.outcome).toBe(EN.outcomeMany(3));
        const one = build({ munIds: ['a'] });
        expect(one.parsed.minorityPolicyReceipt?.municipalities).toBe(1);
        expect(one.ledger[0]!.outcome).toBe(EN.outcomeOne);
        expect(one.ledger[0]!.outcomeToken!.params).toEqual({ municipalities: 1 });
        expect((bcsMessages as any)[one.ledger[0]!.outcomeToken!.key].replace('{municipalities}', '1')).toBe(BCS.outcome(1));
    });

    it('never shows a people count and avoids permission words, in either language', () => {
        const keys = Object.keys(enMessages).filter((key) => key.includes('minorityPolicy'));
        expect(keys.length).toBe(9);
        for (const key of keys) {
            expect((bcsMessages as any)[key], `${key} (bcs)`).toBeTypeOf('string');
            for (const text of [(enMessages as any)[key] as string, (bcsMessages as any)[key] as string]) {
                expect(text).not.toMatch(/relocat|clear|allow|authoriz|approv|permit/i);
                expect(text).not.toContain('{people}');
            }
        }
    });
});
