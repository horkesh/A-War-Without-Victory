/**
 * RB5 halt-card receipt: shown only to a human-controlled HRHB whose halt card was answered `no_halt` (applied no later than the
 * act), with at least one municipality holding a matured HRHB policy-expulsion timer that still holds expelled people (a wave
 * that displaced no one is not counted). It states M, never a people count. The real adapter and ledger run on a saved-shape
 * state; the signed EN and BCS strings are pinned word for word.
 */

import { describe, expect, it } from 'vitest';

import type { SettlementRecord } from '../../src/map/settlements.js';
import { processDisplacementTakeover } from '../../src/state/displacement_takeover.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../../src/state/game_state.js';
import type { MunicipalityPopulation1991Map } from '../../src/state/population_share.js';
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
    chip: 'Carried out',
    titleInPerson: 'No halt ordered',
    titleAutomatic: 'No halt ordered (automatic answer)',
    outcomeMany: (m: number) => `Your side's historical default ran: Bosniaks were expelled from the ground the HVO held in ${m} municipalities.`,
    outcomeOne: 'Your side\'s historical default ran: Bosniaks were expelled from the ground the HVO held in 1 municipality.',
    detailInPerson: `No halt was ordered. This counts against your side, which left the expulsions unopposed. A halt could be ordered only when the war with the ARBiH began. ${TAIL_EN}`,
    // was: `Your staff answered automatically with your side's historical default, and no halt was ordered. This counts against ... A halt could be ordered only when the war with the ARBiH began, and only if you were playing below Observer level. ${TAIL_EN}`
    detailAutomatic: `You gave no answer before the turn went on, so your staff kept your side's historical default and no halt was ordered. This counts against your side, which left the expulsions unopposed. A halt could be ordered only when the war with the ARBiH began; that decision comes to you at every command level. ${TAIL_EN}`,
    detailNoWarCrimeInPerson: `No halt was ordered. A halt could be ordered only when the war with the ARBiH began. ${TAIL_EN}`,
    // was: `Your staff answered automatically with your side's historical default, and no halt was ordered. A halt could be ordered only when the war with the ARBiH began, and only if you were playing below Observer level. ${TAIL_EN}`
    detailNoWarCrimeAutomatic: `You gave no answer before the turn went on, so your staff kept your side's historical default and no halt was ordered. A halt could be ordered only when the war with the ARBiH began; that decision comes to you at every command level. ${TAIL_EN}`,
};
const BCS = {
    chip: 'Provedeno',
    titleInPerson: 'Obustava nije naređena',
    titleAutomatic: 'Obustava nije naređena (automatski odgovor)',
    outcome: (m: number) => `Historijska zadana postavka vaše strane se provela: Bošnjaci su protjerani s područja koje je držao HVO. Broj općina: ${m}.`,
    detailInPerson: `Obustava nije naređena. To pada na teret vaše strane, koja se protjerivanju nije suprotstavila. Obustava se mogla narediti samo kad je počeo rat s ARBiH. ${TAIL_BCS}`,
    // was: `Vaš štab je automatski odgovorio historijskom zadanom postavkom vaše strane i obustava nije naređena. To pada na teret ... samo kad je počeo rat s ARBiH, i to samo ako ste igrali ispod nivoa Posmatrač. ${TAIL_BCS}`
    detailAutomatic: `Niste odgovorili prije nego što je potez otišao dalje, pa je štab zadržao historijsku zadanu postavku vaše strane i obustava nije naređena. To pada na teret vaše strane, koja se protjerivanju nije suprotstavila. Obustava se mogla narediti samo kad je počeo rat s ARBiH; ta odluka vam stiže na svakom nivou komandovanja. ${TAIL_BCS}`,
    detailNoWarCrimeInPerson: `Obustava nije naređena. Obustava se mogla narediti samo kad je počeo rat s ARBiH. ${TAIL_BCS}`,
    // was: `Vaš štab je automatski odgovorio historijskom zadanom postavkom vaše strane i obustava nije naređena. Obustava se mogla narediti samo kad je počeo rat s ARBiH, i to samo ako ste igrali ispod nivoa Posmatrač. ${TAIL_BCS}`
    detailNoWarCrimeAutomatic: `Niste odgovorili prije nego što je potez otišao dalje, pa je štab zadržao historijsku zadanu postavku vaše strane i obustava nije naređena. Obustava se mogla narediti samo kad je počeo rat s ARBiH; ta odluka vam stiže na svakom nivou komandovanja. ${TAIL_BCS}`,
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
    /** Municipalities whose matured timers displaced no one (a zero-effect wave: `cumulative_displaced` 0). */
    zeroEffectMunIds?: string[];
    /** Raw timers taken from a real engine run instead of the synthetic ones. */
    rawTimers?: Record<string, unknown>;
}

function timers(munIds: string[], maturedTurn: number | undefined, zeroEffect: string[] = []) {
    const out: Record<string, unknown> = {};
    munIds.forEach((mun, i) => {
        // Two timers for the same municipality still count once.
        const wave = maturedTurn !== undefined
            ? { matured_turn: maturedTurn, cumulative_displaced: zeroEffect.includes(mun) ? 0 : 25 }
            : {};
        out[`op:${mun}:${i}a`] = { mun_id: mun, from_faction: 'RBiH', to_faction: 'HRHB', started_turn: 40, cause: 'policy_expulsion', ...wave };
        out[`op:${mun}:${i}b`] = { mun_id: mun, from_faction: 'RBiH', to_faction: 'HRHB', started_turn: 40, cause: 'policy_expulsion', ...wave };
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
            hostile_takeover_timers: opts.rawTimers
                ?? timers(opts.munIds ?? ['mun_a', 'mun_b'], 'maturedTurn' in opts ? opts.maturedTurn : 44, opts.zeroEffectMunIds),
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
    it('a matured timer whose wave displaced no one is not counted (Codex #854 r4677761549)', () => {
        // Every municipality zero-effect: no receipt at all.
        expect(build({ zeroEffectMunIds: ['mun_a', 'mun_b'] }).ledger).toHaveLength(0);
        // One real wave and one zero-effect municipality: M = 1, the singular string.
        const mixed = build({ zeroEffectMunIds: ['mun_b'] });
        expect(mixed.parsed.minorityPolicyReceipt?.municipalities).toBe(1);
        expect(mixed.ledger[0]!.detail).toBe(`${EN.outcomeOne} ${EN.detailNoWarCrimeInPerson}`);
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
            // The outcome is the short chip; the signed outcome sentence leads the detail line, then the signed detail sentence.
            expect(record.outcome).toBe('Carried out');
            expect(en('outcome')).toBe(EN.chip);
            expect(en('detail')).toBe(`${EN.outcomeMany(2)} ${c.detailEn}`);
            const tok = (field: 'titleToken' | 'outcomeToken' | 'detailToken') => record[field]!;
            const fill = (catalog: Record<string, string>, token: { key: string; params?: Record<string, string | number> }) => (
                Object.entries(token.params ?? {}).reduce((text, [k, v]) => text.replace(`{${k}}`, String(v)), catalog[token.key] as string)
            );
            expect(fill(bcsMessages as any, tok('titleToken'))).toBe(c.titleBcs);
            expect(fill(bcsMessages as any, tok('outcomeToken'))).toBe(BCS.chip);
            expect(fill(bcsMessages as any, tok('detailToken'))).toBe(`${BCS.outcome(2)} ${c.detailBcs}`);
        });
    }

    it('automatic answer only when the row is not from the player', () => {
        expect(build({ row: { turn: 40, response_id: 'no_halt', decision_source: 'player' } }).parsed.minorityPolicyReceipt?.automatic).toBe(false);
        expect(build({ row: { turn: 40, response_id: 'no_halt', decision_source: 'bot_ai_default' } }).parsed.minorityPolicyReceipt?.automatic).toBe(true);
    });

    it('war-crime variants only when the war-crime flag is true', () => {
        expect(build({ warCrime: true }).ledger[0]!.detail).toBe(`${EN.outcomeMany(2)} ${EN.detailInPerson}`);
        expect(build({ warCrime: false }).ledger[0]!.detail).toBe(`${EN.outcomeMany(2)} ${EN.detailNoWarCrimeInPerson}`);
        expect(build({ warCrime: false }).ledger[0]!.detail).not.toContain('counts against');
    });

    it('M counts distinct municipalities; M = 1 uses the singular EN string, BCS states M', () => {
        const three = build({ munIds: ['a', 'b', 'c'] });
        expect(three.parsed.minorityPolicyReceipt?.municipalities).toBe(3);
        expect(three.ledger[0]!.outcome).toBe(EN.chip);
        expect(three.ledger[0]!.detail).toBe(`${EN.outcomeMany(3)} ${EN.detailNoWarCrimeInPerson}`);
        const one = build({ munIds: ['a'] });
        expect(one.parsed.minorityPolicyReceipt?.municipalities).toBe(1);
        expect(one.ledger[0]!.outcome).toBe(EN.chip);
        expect(one.ledger[0]!.detail).toBe(`${EN.outcomeOne} ${EN.detailNoWarCrimeInPerson}`);
        expect(one.ledger[0]!.detailToken!.params).toEqual({ municipalities: 1 });
        expect((bcsMessages as any)[one.ledger[0]!.detailToken!.key].replace('{municipalities}', '1')).toBe(`${BCS.outcome(1)} ${BCS.detailNoWarCrimeInPerson}`);
    });

    it('never shows a people count and avoids permission words, in either language', () => {
        const keys = Object.keys(enMessages).filter((key) => key.includes('minorityPolicy'));
        expect(keys.length).toBe(12);
        for (const key of keys) {
            expect((bcsMessages as any)[key], `${key} (bcs)`).toBeTypeOf('string');
            for (const text of [(enMessages as any)[key] as string, (bcsMessages as any)[key] as string]) {
                expect(text).not.toMatch(/relocat|clear|allow|authoriz|approv|permit/i);
                expect(text).not.toContain('{people}');
            }
        }
    });
});

describe('RB5 halt-card receipt from a real engine run (zero-effect wave, Codex #854 r4677761549)', () => {
    // A Croat-only Vitez OSID: the policy timer matures but its wave displaces no one. A Mostar OSID with Bosniaks: a real wave.
    const pop1991: MunicipalityPopulation1991Map = {
        vitez: { total: 1000, bosniak: 410, serb: 50, croat: 450, other: 90 },
        mostar: { total: 1000, bosniak: 400, serb: 50, croat: 500, other: 50 },
    };
    const osid = (sid: string, total: number, bosniaks: number, croats: number) => ({
        sid,
        source_id: sid,
        mun_code: sid.split(':')[1],
        mun: sid.split(':')[1],
        properties: { population_total: total, population_bosniaks: bosniaks, population_croats: croats, population_serbs: 0, population_others: 0 },
    } as unknown as SettlementRecord);
    const settlements = new Map<string, SettlementRecord>([
        ['op:vitez:vitez', osid('op:vitez:vitez', 1000, 0, 1000)],
        ['op:mostar:zapad', osid('op:mostar:zapad', 2000, 600, 1400)],
    ]);

    function engineRun(): GameState {
        const state = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: { turn: 50, seed: 'rb5-receipt', phase: 'war', war_start_turn: 0, rbih_hrhb_war_earliest_turn: 20, player_faction: 'HRHB', autonomy_level: 2, headless_scenario_auto_control: false },
            factions: [],
            military: {
                formations: {},
                militia_pools: {},
                event_flags: {},
                event_decision_log: [{ event_id: CARD, response_id: 'no_halt', faction: 'HRHB', turn: 50, decision_source: 'player' }],
                war_front_edges_osid: [],
                negotiation: { capital: {
                    HRHB: { war_crimes_events: 0, war_crimes_events_emergent: 0 },
                    RBiH: { war_crimes_events: 0, war_crimes_events_emergent: 0 },
                    RS: { war_crimes_events: 0, war_crimes_events_emergent: 0 },
                } },
            },
            political: {
                war_alliance_rbih_hrhb: 0.05,
                rbih_hrhb_state: { war_started_turn: 49 },
                political_controllers: { 'op:vitez:vitez': 'HRHB', 'op:mostar:zapad': 'HRHB' },
            },
            displacement: {},
        } as unknown as GameState;
        for (let turn = 50; turn <= 80; turn++) {
            state.meta.turn = turn;
            processDisplacementTakeover(state, new Map(), { battles: [] } as any, pop1991, settlements);
        }
        return state;
    }

    it('the engine matures the Vitez timer with no one displaced; the receipt counts only Mostar', () => {
        const state = engineRun();
        const all = state.displacement.hostile_takeover_timers ?? {};
        const vitez = all['op:vitez:vitez|RBiH'];
        const mostar = all['op:mostar:zapad|RBiH'];
        // The premise Codex reported: maturity without effect.
        expect(vitez?.cause).toBe('policy_expulsion');
        expect(vitez?.matured_turn).toBeTypeOf('number');
        expect(vitez?.cumulative_displaced ?? 0).toBe(0);
        expect((state.displacement.displacement_event_log ?? []).filter((e) => e.origin_osid === 'op:vitez:vitez')).toEqual([]);
        expect(mostar?.matured_turn).toBeTypeOf('number');
        expect(mostar?.cumulative_displaced ?? 0).toBeGreaterThan(0);

        const applied = Number(state.military.event_flags.hrhb_minority_policy_applied_turn);
        expect(applied).toBe(50);
        const { parsed, ledger } = build({ rawTimers: all, row: { turn: 50, response_id: 'no_halt', decision_source: 'player' }, appliedTurn: applied });
        expect(parsed.minorityPolicyReceipt?.municipalities).toBe(1);
        expect(ledger).toHaveLength(1);
        expect(ledger[0]!.detail).toBe(`${EN.outcomeOne} ${EN.detailNoWarCrimeInPerson}`);
    });
});
