/**
 * Staff-sweep disclosure. Stage 1 (Option B, §6 sitting 2026-11-16) told the player that at Assisted, Delegated or Observer the
 * staff decided rear-area paramilitary sweeps without consulting the standing order. §6 D1 stage 2 (ruling 2026-11-18, §8 and A1)
 * binds the staff to the standing order, so the copy states the new rule: staff follow the standing order; Always allow sends sweeps
 * and each counts against the side; Always deny and Review each deployment send none at Assisted, Delegated or Observer; nothing is
 * sent before the player answers; at Assisted operations need the President's approval; at Observer the side's forces act under the
 * standing order, answered automatically with the historical policy. The copy never calls a sweep "authorized" or the flag "ethnic
 * cleansing" (SENSITIVE_HISTORY_DESIGN_GATE.md §2a(0)). Every changed string is a DRAFT for the §4 copy panel.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { enMessages } from '../../src/ui/map/i18n/messages.en';
import { bcsMessages } from '../../src/ui/map/i18n/messages.bcs';
import { buildDecisionConsequenceLedger } from '../../src/ui/map/data/decisionConsequenceLedger';
import { withoutComments } from '../helpers/sourceComments';

const en = enMessages as Record<string, string>;
const bcs = bcsMessages as Record<string, string>;

const RECEIPT_DETAIL_KEYS = [
    'decisionConsequences.detail.paramilitary.unrequested',
    'decisionConsequences.detail.paramilitary.unrequestedStandingOrder',
    'decisionConsequences.detail.paramilitary.unrequestedAutomaticOrder',
    'decisionConsequences.detail.paramilitary.unrequestedNeutral',
    'decisionConsequences.detail.paramilitary.unrequestedDissolved',
    'decisionConsequences.detail.paramilitary.unrequestedDissolvedStandingOrder',
    'decisionConsequences.detail.paramilitary.unrequestedDissolvedAutomaticOrder',
    'decisionConsequences.detail.paramilitary.unrequestedDissolvedNeutral',
] as const;

const FLAG_AND_RECEIPT_KEYS = [
    'verdict.condemnation.authorizedCleansing',
    'dayton.folder.condemnation.cleansing',
    'decisionConsequences.title.paramilitary.unrequested',
    'decisionConsequences.outcome.unrequested',
    ...RECEIPT_DETAIL_KEYS,
    'warCost.finding.paramilitary.text',
    'warCost.finding.paramilitary.textOne',
    'eventDecision.paramilitaryPolicyRule',
    'autonomy.level.observer.desc',
    'paramilitaryReview.policyHint',
] as const;

const DELEGATING_LEVELS = ['autonomy.level.assisted.desc', 'autonomy.level.delegated.desc'] as const;

describe('staff-sweep disclosure copy', () => {
    it('never calls a sweep authorized or the flag ethnic cleansing, in either language', () => {
        for (const key of FLAG_AND_RECEIPT_KEYS) {
            expect(en[key], key).toBeTypeOf('string');
            expect(bcs[key], `${key} (bcs)`).toBeTypeOf('string');
            expect(en[key], key).not.toMatch(/authori[sz]ed|ethnic cleansing/i);
            expect(bcs[key], `${key} (bcs)`).not.toMatch(/odobr|etničk\w* čišćenj/i);
        }
    });

    it('the Dayton flag line is an assessment attributed to the side\'s forces, never a court finding, and BCS never says convicted or sentenced', () => {
        expect(en['dayton.folder.condemnation.cleansing']).toMatch(/political assessment, not a court finding/);
        expect(en['dayton.folder.condemnation.cleansing']).toMatch(/by its forces/);
        expect(bcs['dayton.folder.condemnation.cleansing']).toMatch(/politička ocjena, a ne sudska presuda/);
        expect(bcs['dayton.folder.condemnation.cleansing']).not.toMatch(/osuđen/i);
    });

    it('Assisted and Delegated say the staff follow the standing order: Always allow sends sweeps that count, Always deny and Review send none, nothing before an answer (§6 D1 stage 2)', () => {
        for (const key of DELEGATING_LEVELS) {
            expect(en[key], key).toMatch(/Rear-area paramilitary sweeps follow your standing order/);
            expect(en[key], key).toMatch(/under Always allow your staff sends them without asking you, and each one counts against your side/);
            expect(en[key], key).toMatch(/under Always deny or Review each deployment it sends none/);
            expect(en[key], key).toMatch(/Until you answer, it sends none\./);
            expect(en[key], key).not.toMatch(/even when set to Always deny|does not apply/);
            expect(bcs[key], `${key} (bcs)`).toMatch(/slijede vašu stalnu naredbu/);
            expect(bcs[key], `${key} (bcs)`).toMatch(/Uvijek dozvoli/);
            expect(bcs[key], `${key} (bcs)`).toMatch(/Uvijek odbij ili Pregledaj svako raspoređivanje ne šalje nijednu/);
            expect(bcs[key], `${key} (bcs)`).toMatch(/Dok ne odgovorite, ne šalje nijednu\./);
            expect(bcs[key], `${key} (bcs)`).not.toMatch(/čak ni kad|ne odnosi/);
        }
        // At Assisted, operations still need the President's approval.
        expect(en['autonomy.level.assisted.desc']).toMatch(/operations wait for your approval/);
        expect(bcs['autonomy.level.assisted.desc']).toMatch(/operacije čekaju vaše odobrenje/);
        expect(en['autonomy.level.fullControl.desc']).toMatch(/yours to decide/);
    });

    it('Observer: the order is answered with the historical policy, the side\'s forces act under it, and what they do is charged', () => {
        expect(en['autonomy.level.observer.desc']).toMatch(/answered the same way, with the historical policy: your side's forces act under it, and what they do counts against your side/);
        expect(bcs['autonomy.level.observer.desc']).toMatch(/historijskom politikom: snage vaše strane djeluju po njoj, a ono što učine pada na teret vaše strane/);
    });

    it('the game-rule block states the new rule, in both languages', () => {
        const rule = en['eventDecision.paramilitaryPolicyRule']!;
        expect(rule).toMatch(/Your staff follow this order at every command level\./);
        expect(rule).toMatch(/Always allow sends rear-area sweeps without asking you, and each one counts against your side\./);
        expect(rule).toMatch(/Always deny and Review each deployment send none at Assisted, Delegated or Observer/);
        expect(rule).toMatch(/Nothing is sent before you answer\./);
        expect(rule).toMatch(/At Assisted, operations still need your approval\./);
        expect(rule).toMatch(/At Observer this order is answered automatically with the historical policy, and your side's forces act under it\./);
        expect(rule).not.toMatch(/even when|only what you decide in person/);
        const ruleBcs = bcs['eventDecision.paramilitaryPolicyRule']!;
        expect(ruleBcs).toMatch(/na svakom nivou komandovanja/);
        expect(ruleBcs).toMatch(/Prije vašeg odgovora ne šalje se ništa\./);
        expect(ruleBcs).toMatch(/historijskom politikom/);
        expect(ruleBcs).not.toMatch(/čak i kad|samo ono o čemu odlučujete lično/);
    });

    it('the receipts name the municipality scale and say each is a simulated-war event, not a statement about the place', () => {
        for (const key of RECEIPT_DETAIL_KEYS) {
            for (const text of [en[key]!, bcs[key]!]) {
                expect(text, key).toContain('{place}');
                expect(text, key).toContain('{faction}');
            }
            expect(en[key], key).toMatch(/not a statement about what happened in that place/);
            expect(bcs[key], key).toMatch(/simuliranog rata/);
        }
        // The stage-1 cause stays for an old save, stated as the rule in force when the sweep was sent.
        expect(en['decisionConsequences.detail.paramilitary.unrequested']).toMatch(/under the rule in force when it was sent/);
        expect(bcs['decisionConsequences.detail.paramilitary.unrequested']).toMatch(/po pravilu koje je vrijedilo kad je poslana/);
    });

    it('the receipt names one true cause, taken from the saved basis (A3)', () => {
        const row = (cause?: 'standing_order' | 'standing_order_automatic' | 'neutral', captured = true) => ({
            id: `para_rbih_t2_${cause ?? 'none'}_${captured}`, turn: 2, target_osid: 'op:kakanj:biljesevo', faction: 'RBiH', captured,
            ...(cause ? { cause } : {}),
        });
        const ledger = buildDecisionConsequenceLedger({
            player_faction: 'RBiH',
            rawGameState: { meta: { player_faction: 'RBiH' } },
            paramilitaryUnrequested: [
                row(), row('standing_order'), row('standing_order_automatic'), row('neutral'),
                row(undefined, false), row('standing_order', false), row('standing_order_automatic', false), row('neutral', false),
            ],
        } as any, 100).filter((record) => record.familyId === 'paramilitary-receipt');
        const keyById = Object.fromEntries(ledger.map((record) => [record.id, record.detailToken?.key]));
        expect(keyById).toEqual({
            'paramilitary-staff:para_rbih_t2_none_true': 'decisionConsequences.detail.paramilitary.unrequested',
            'paramilitary-staff:para_rbih_t2_standing_order_true': 'decisionConsequences.detail.paramilitary.unrequestedStandingOrder',
            'paramilitary-staff:para_rbih_t2_standing_order_automatic_true': 'decisionConsequences.detail.paramilitary.unrequestedAutomaticOrder',
            'paramilitary-staff:para_rbih_t2_neutral_true': 'decisionConsequences.detail.paramilitary.unrequestedNeutral',
            'paramilitary-staff:para_rbih_t2_none_false': 'decisionConsequences.detail.paramilitary.unrequestedDissolved',
            'paramilitary-staff:para_rbih_t2_standing_order_false': 'decisionConsequences.detail.paramilitary.unrequestedDissolvedStandingOrder',
            'paramilitary-staff:para_rbih_t2_standing_order_automatic_false': 'decisionConsequences.detail.paramilitary.unrequestedDissolvedAutomaticOrder',
            'paramilitary-staff:para_rbih_t2_neutral_false': 'decisionConsequences.detail.paramilitary.unrequestedDissolvedNeutral',
        });
        const standing = ledger.find((record) => record.id.endsWith('standing_order_true'))!;
        expect(standing.detail).toContain('your standing order of Always allow sent it without one');
        expect(standing.detail).toContain('It counts against your side.');
        const automatic = ledger.find((record) => record.id.endsWith('standing_order_automatic_true'))!;
        expect(automatic.detail).toContain('answered automatically with the historical policy');
        expect(automatic.detail).not.toMatch(/you authori[sz]ed|authori[sz]ed/i);
    });

    it('both opening paramilitary policy cards carry the game-rule block in the decision modal', () => {
        const source = withoutComments(readFileSync('src/ui/map/components/EventDecisionModal.tsx', 'utf8'));
        expect(source).toContain("'rbih_paramilitary_policy_1992'");
        expect(source).toContain("'rs_paramilitary_policy_1992'");
        expect(source).toContain("t('eventDecision.paramilitaryPolicyRule')");
        expect(en['eventDecision.gameRule']).toBe('Game rule');
        expect(bcs['eventDecision.gameRule']).toBe('Pravilo igre');
    });

    it('the reviewed policy event text keeps no meta sentence (the rule lives in the game-rule block, not in the 1992 card)', () => {
        const events = readFileSync('data/scenarios/events/war_1992.json', 'utf8');
        expect(events).not.toMatch(/counts against your side/);
    });
});
