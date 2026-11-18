/**
 * Staff-sweep disclosure. Stage 1 (Option B, §6 sitting 2026-11-16) told the player that at Assisted, Delegated or Observer the
 * staff decided rear-area paramilitary sweeps without consulting the standing order. §6 D1 stage 2 (ruling 2026-11-18, §8 and A1)
 * binds the staff to the standing order. The copy below is the text the SHDG §4 copy panel (narrative designer + historian) signed
 * unanimously on 2026-11-18 after three rounds, EN and BCS in lockstep; it is pinned word for word. The rule: the staff follows
 * the standing order; Always allow sends sweeps and each counts against the side; any other order, or none, sends none at
 * Assisted, Delegated or Observer; the staff sends nothing before the order is answered; at Observer an order the player has not
 * given is answered automatically with the historical policy, and an order the player gave stays in force; corps operations at
 * Assisted still wait for the President. The copy never calls a sweep "authorized" or the flag "ethnic cleansing"
 * (SENSITIVE_HISTORY_DESIGN_GATE.md §2a(0)), never names Operation Circle (ruling §6), and the RS policy card keeps its
 * pre-#740 "entirely" (reverted by the same panel).
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

/** The signed §4 copy (§6 D1 stage 2, 2026-11-18), EN and BCS. */
const SIGNED: Record<'en' | 'bcs', Record<string, string>> = {
    en: {
        'autonomy.level.assisted.desc':
            'Your staff runs corps and brigade orders. Corps commanders bring stance changes and operation plans to you, and operations wait for your approval. Recruitment stays yours. Rear-area paramilitary sweeps follow your standing order: under Always allow your staff sends them without asking you, and each one counts against your side; under any other order, or none, it sends none.',
        'autonomy.level.delegated.desc':
            'The default. Your staff runs the army, including operations and recruitment, without asking. Corps and OG commanders report their stance changes to you, and each change stands unless you answer. Event decisions still come to you. Rear-area paramilitary sweeps follow your standing order: under Always allow your staff sends them without asking you, and each one counts against your side; under any other order, or none, it sends none.',
        'autonomy.level.observer.desc':
            'As Delegated, except that stance changes are not reported to you and event decisions resolve to their historical response. A decision with no historical response still waits for you. If you have not given the paramilitary standing order, it is answered the same way when its decision comes up, with the historical policy. An order you gave stays in force. Your side\'s forces act under the order in force, and each sweep they carry out counts against your side.',
        'eventDecision.paramilitaryPolicyRule':
            'Your staff follows this order at every command level. If you allow deployment, rear-area sweeps are sent without asking you, and each one counts against your side. If you refuse it, none are sent. If you choose to review each deployment, each request comes to you at Full Control; at Assisted, Delegated or Observer no request comes to you, so none are sent. Your staff sends nothing before this order is answered. Your answer holds at every level, Observer included. At Observer, if you have not given a standing order, this order is answered automatically with the historical policy, and your side\'s forces act under it. At Assisted, corps operations still wait for your approval; this order does not cover them.',
        'paramilitaryReview.policyHint':
            'Use a standing order if you want future paramilitary packets resolved the same way. Your staff follows it at every command level: at Assisted, Delegated or Observer, Always allow sends sweeps without asking you, and each one counts against your side; Always deny, or no standing order, sends none.',
        'decisionConsequences.detail.paramilitary.unrequested':
            'In this campaign a paramilitary sweep was sent into the {place} area for {faction}. No request came to you: under the rule in force when it was sent, your staff at Assisted, Delegated or Observer decided rear-area sweeps without asking. It counts against your side. This is an event of the simulated war, not a statement about what happened in that place.',
        'decisionConsequences.detail.paramilitary.unrequestedDissolved':
            'In this campaign a paramilitary action was sent toward the {place} area for {faction}. No request came to you: under the rule in force when it was sent, your staff at Assisted, Delegated or Observer decided rear-area actions without asking. It was dissolved without taking its target. No harm to civilians was recorded and it does not count against your side. This is an event of the simulated war, not a statement about what happened in that place.',
        'decisionConsequences.detail.paramilitary.unrequestedStandingOrder':
            'In this campaign a paramilitary sweep was sent into the {place} area for {faction}. No request came to you: your standing order of Always allow sent it without one. It counts against your side. This is an event of the simulated war, not a statement about what happened in that place.',
        'decisionConsequences.detail.paramilitary.unrequestedAutomaticOrder':
            'In this campaign a paramilitary sweep was sent into the {place} area for {faction}. No request came to you: your side\'s forces acted under the standing order, answered automatically with the historical policy. It counts against your side. This is an event of the simulated war, not a statement about what happened in that place.',
        'decisionConsequences.detail.paramilitary.unrequestedNeutral':
            'In this campaign a paramilitary sweep was sent into the {place} area for {faction}. No request came to you. It counts against your side. This is an event of the simulated war, not a statement about what happened in that place.',
        'decisionConsequences.detail.paramilitary.unrequestedDissolvedStandingOrder':
            'In this campaign a paramilitary action was sent toward the {place} area for {faction}. No request came to you: your standing order of Always allow sent it without one. It was dissolved without taking its target. No harm to civilians was recorded and it does not count against your side. This is an event of the simulated war, not a statement about what happened in that place.',
        'decisionConsequences.detail.paramilitary.unrequestedDissolvedAutomaticOrder':
            'In this campaign a paramilitary action was sent toward the {place} area for {faction}. No request came to you: your side\'s forces acted under the standing order, answered automatically with the historical policy. It was dissolved without taking its target. No harm to civilians was recorded and it does not count against your side. This is an event of the simulated war, not a statement about what happened in that place.',
        'decisionConsequences.detail.paramilitary.unrequestedDissolvedNeutral':
            'In this campaign a paramilitary action was sent toward the {place} area for {faction}. No request came to you. It was dissolved without taking its target. No harm to civilians was recorded and it does not count against your side. This is an event of the simulated war, not a statement about what happened in that place.',
    },
    bcs: {
        'autonomy.level.assisted.desc':
            'Štab vodi naredbe korpusa i brigada. Komandanti korpusa vam iznose promjene stava i planove operacija, a operacije čekaju vaše odobrenje. Regrutacija ostaje vaša. Paravojne akcije u pozadini slijede vašu stalnu naredbu: uz Uvijek dozvoli štab ih šalje bez pitanja, a svaka takva akcija pada na teret vaše strane; uz bilo koju drugu naredbu, ili bez naredbe, ne šalje nijednu.',
        'autonomy.level.delegated.desc':
            'Zadani nivo. Štab vodi vojsku, uključujući operacije i regrutaciju, bez pitanja. Komandanti korpusa i OG vam prijavljuju promjene stava, a svaka promjena ostaje ako ne odgovorite. Odluke o događajima i dalje dolaze vama. Paravojne akcije u pozadini slijede vašu stalnu naredbu: uz Uvijek dozvoli štab ih šalje bez pitanja, a svaka takva akcija pada na teret vaše strane; uz bilo koju drugu naredbu, ili bez naredbe, ne šalje nijednu.',
        'autonomy.level.observer.desc':
            'Kao Delegirano, osim što vam se promjene stava ne prijavljuju, a odluke o događajima rješavaju se historijskim odgovorom. Odluka bez historijskog odgovora i dalje čeka vas. Ako niste izdali stalnu naredbu o paravojnim akcijama, na nju se odgovara na isti način kad dođe odluka o njoj, historijskom politikom. Naredba koju ste izdali ostaje na snazi. Snage vaše strane djeluju po naredbi koja vrijedi, a svaka akcija koju provedu pada na teret vaše strane.',
        'eventDecision.paramilitaryPolicyRule':
            'Štab slijedi ovu naredbu na svakom nivou komandovanja. Ako dozvolite raspoređivanje, paravojne akcije u pozadini šalju se bez pitanja, a svaka takva akcija pada na teret vaše strane. Ako ga odbijete, ne šalje se nijedna. Ako odaberete da pregledate svako raspoređivanje, na nivou Pune kontrole svaki zahtjev dolazi vama; na nivoima Asistirano, Delegirano i Posmatrač zahtjev vam ne stiže, pa se ne šalje nijedna. Prije odgovora na ovu naredbu štab ne šalje ništa. Vaš odgovor vrijedi na svakom nivou, i na nivou Posmatrač. Na nivou Posmatrač, ako niste izdali stalnu naredbu, na ovu naredbu se automatski odgovara historijskom politikom, a snage vaše strane djeluju po njoj. Na nivou Asistirano operacije korpusa i dalje čekaju vašu saglasnost; ova naredba ih ne obuhvata.',
        'paramilitaryReview.policyHint':
            'Koristite stalnu naredbu ako želite da se budući paravojni paketi riješe na isti način. Štab je slijedi na svakom nivou komandovanja: na nivoima Asistirano, Delegirano i Posmatrač uz Uvijek dozvoli šalje akcije bez pitanja, a svaka takva akcija pada na teret vaše strane; uz Uvijek odbij, ili bez stalne naredbe, ne šalje nijednu.',
        'decisionConsequences.detail.paramilitary.unrequested':
            'U ovoj kampanji paravojna akcija poslana je na područje {place} za {faction}. Zahtjev vam nije stigao: po pravilu koje je vrijedilo kad je poslana, štab je na nivoima Asistirano, Delegirano i Posmatrač o akcijama u pozadini odlučivao bez pitanja. Pada na teret vaše strane. Ovo je događaj simuliranog rata, a ne tvrdnja o tome šta se zaista desilo na tom mjestu.',
        'decisionConsequences.detail.paramilitary.unrequestedDissolved':
            'U ovoj kampanji paravojna akcija poslana je prema području {place} za {faction}. Zahtjev vam nije stigao: po pravilu koje je vrijedilo kad je poslana, štab je na nivoima Asistirano, Delegirano i Posmatrač o akcijama u pozadini odlučivao bez pitanja. Raspuštena je bez zauzimanja cilja. Nije zabilježena nikakva šteta po civile, a akcija se ne upisuje na teret vaše strane. Ovo je događaj simuliranog rata, a ne tvrdnja o tome šta se zaista desilo na tom mjestu.',
        'decisionConsequences.detail.paramilitary.unrequestedStandingOrder':
            'U ovoj kampanji paravojna akcija poslana je na područje {place} za {faction}. Zahtjev vam nije stigao: poslala ju je vaša stalna naredba Uvijek dozvoli. Pada na teret vaše strane. Ovo je događaj simuliranog rata, a ne tvrdnja o tome šta se zaista desilo na tom mjestu.',
        'decisionConsequences.detail.paramilitary.unrequestedAutomaticOrder':
            'U ovoj kampanji paravojna akcija poslana je na područje {place} za {faction}. Zahtjev vam nije stigao: snage vaše strane djelovale su po stalnoj naredbi, na koju je automatski odgovoreno historijskom politikom. Pada na teret vaše strane. Ovo je događaj simuliranog rata, a ne tvrdnja o tome šta se zaista desilo na tom mjestu.',
        'decisionConsequences.detail.paramilitary.unrequestedNeutral':
            'U ovoj kampanji paravojna akcija poslana je na područje {place} za {faction}. Zahtjev vam nije stigao. Pada na teret vaše strane. Ovo je događaj simuliranog rata, a ne tvrdnja o tome šta se zaista desilo na tom mjestu.',
        'decisionConsequences.detail.paramilitary.unrequestedDissolvedStandingOrder':
            'U ovoj kampanji paravojna akcija poslana je prema području {place} za {faction}. Zahtjev vam nije stigao: poslala ju je vaša stalna naredba Uvijek dozvoli. Raspuštena je bez zauzimanja cilja. Nije zabilježena nikakva šteta po civile, a akcija se ne upisuje na teret vaše strane. Ovo je događaj simuliranog rata, a ne tvrdnja o tome šta se zaista desilo na tom mjestu.',
        'decisionConsequences.detail.paramilitary.unrequestedDissolvedAutomaticOrder':
            'U ovoj kampanji paravojna akcija poslana je prema području {place} za {faction}. Zahtjev vam nije stigao: snage vaše strane djelovale su po stalnoj naredbi, na koju je automatski odgovoreno historijskom politikom. Raspuštena je bez zauzimanja cilja. Nije zabilježena nikakva šteta po civile, a akcija se ne upisuje na teret vaše strane. Ovo je događaj simuliranog rata, a ne tvrdnja o tome šta se zaista desilo na tom mjestu.',
        'decisionConsequences.detail.paramilitary.unrequestedDissolvedNeutral':
            'U ovoj kampanji paravojna akcija poslana je prema području {place} za {faction}. Zahtjev vam nije stigao. Raspuštena je bez zauzimanja cilja. Nije zabilježena nikakva šteta po civile, a akcija se ne upisuje na teret vaše strane. Ovo je događaj simuliranog rata, a ne tvrdnja o tome šta se zaista desilo na tom mjestu.',
    },
};

/** The RS card's staff assessment before #740, restored byte for byte by the §4 panel (2026-11-18). */
const RS_CARD_STAFF_ASSESSMENT =
    'Standing authorization mirrors documented RS leadership posture. Per-deployment review introduces command friction; refusal forecloses paramilitary operations entirely and shifts the rear-area burden onto regular formations.';

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

    it('both catalogs carry the signed §4 copy word for word (EN and BCS in lockstep)', () => {
        expect(Object.keys(SIGNED.bcs)).toEqual(Object.keys(SIGNED.en));
        for (const [key, text] of Object.entries(SIGNED.en)) expect(en[key], key).toBe(text);
        for (const [key, text] of Object.entries(SIGNED.bcs)) expect(bcs[key], `${key} (bcs)`).toBe(text);
    });

    it('the signed copy names no operation or place, keeps "your staff" singular, and drops the draft\'s retired phrases', () => {
        for (const key of Object.keys(SIGNED.en)) {
            for (const text of [en[key]!, bcs[key]!]) {
                expect(text, key).not.toMatch(/Circle|Krug|KRUG|Glamo[čc]|Bukvik|Obadi/);
            }
            expect(en[key], key).not.toMatch(/[Yy]our staff follow\b/);
            expect(en[key], key).not.toMatch(/Until you answer|Review each deployment|before you answer|ordered in person/);
            expect(bcs[key], key).not.toMatch(/Dok ne odgovorite|Pregledaj svako raspoređivanje|Prije vašeg odgovora/);
        }
    });

    it('Assisted and Delegated: the staff follows the standing order; Always allow sends sweeps that count; anything else sends none (§6 D1 stage 2)', () => {
        for (const key of DELEGATING_LEVELS) {
            expect(en[key], key).toMatch(/Rear-area paramilitary sweeps follow your standing order/);
            expect(en[key], key).toMatch(/under Always allow your staff sends them without asking you, and each one counts against your side/);
            expect(en[key], key).toMatch(/under any other order, or none, it sends none\./);
            expect(en[key], key).not.toMatch(/even when set to Always deny|does not apply/);
            expect(bcs[key], `${key} (bcs)`).toMatch(/slijede vašu stalnu naredbu/);
            expect(bcs[key], `${key} (bcs)`).toMatch(/uz bilo koju drugu naredbu, ili bez naredbe, ne šalje nijednu\./);
            expect(bcs[key], `${key} (bcs)`).not.toMatch(/čak ni kad|ne odnosi/);
        }
        // At Assisted, operations still need the President's approval.
        expect(en['autonomy.level.assisted.desc']).toMatch(/operations wait for your approval/);
        expect(bcs['autonomy.level.assisted.desc']).toMatch(/operacije čekaju vaše odobrenje/);
        expect(en['autonomy.level.fullControl.desc']).toMatch(/yours to decide/);
    });

    it('Observer: an order not yet given is answered with the historical policy; an order given stays in force; each sweep carried out is charged', () => {
        expect(en['autonomy.level.observer.desc']).toMatch(/If you have not given the paramilitary standing order, it is answered the same way when its decision comes up, with the historical policy\./);
        expect(en['autonomy.level.observer.desc']).toMatch(/An order you gave stays in force\./);
        expect(en['autonomy.level.observer.desc']).toMatch(/each sweep they carry out counts against your side/);
        expect(bcs['autonomy.level.observer.desc']).toMatch(/Naredba koju ste izdali ostaje na snazi\./);
    });

    it('the game-rule block states the signed rule, in both languages', () => {
        const rule = en['eventDecision.paramilitaryPolicyRule']!;
        expect(rule).toMatch(/^Your staff follows this order at every command level\./);
        expect(rule).toMatch(/Your staff sends nothing before this order is answered\./);
        expect(rule).toMatch(/Your answer holds at every level, Observer included\./);
        expect(rule).toMatch(/At Observer, if you have not given a standing order, this order is answered automatically with the historical policy, and your side's forces act under it\./);
        expect(rule).toMatch(/At Assisted, corps operations still wait for your approval; this order does not cover them\./);
        expect(rule).not.toMatch(/even when|only what you decide in person/);
        const ruleBcs = bcs['eventDecision.paramilitaryPolicyRule']!;
        expect(ruleBcs).toMatch(/na svakom nivou komandovanja/);
        expect(ruleBcs).toMatch(/Prije odgovora na ovu naredbu štab ne šalje ništa\./);
        expect(ruleBcs).toMatch(/ako niste izdali stalnu naredbu, na ovu naredbu se automatski odgovara historijskom politikom/);
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
        // The stage-1 cause stays for an old save, stated as the rule in force when the sweep was sent. It names no Full Control
        // cause: a Full Control Always-allow sweep always has a derivable cause (tests/paramilitary_receipt_cause_paths.test.ts).
        for (const key of ['decisionConsequences.detail.paramilitary.unrequested', 'decisionConsequences.detail.paramilitary.unrequestedDissolved']) {
            expect(en[key], key).toMatch(/under the rule in force when it was sent/);
            expect(bcs[key], key).toMatch(/po pravilu koje je vrijedilo kad je poslana/);
            expect(en[key], key).not.toMatch(/Full Control|standing order/);
            expect(bcs[key], key).not.toMatch(/Pune kontrole|stalna naredba/);
        }
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

    it('the reviewed policy event text keeps no meta sentence, and the RS card keeps its pre-#740 "entirely"', () => {
        const raw = readFileSync('data/scenarios/events/war_1992.json', 'utf8');
        expect(raw).not.toMatch(/counts against your side/);
        expect(raw).not.toMatch(/ordered in person/);
        const events = JSON.parse(raw) as { id?: string; staff_assessment?: string }[];
        const rsCard = events.find((event) => event.id === 'rs_paramilitary_policy_1992');
        expect(rsCard?.staff_assessment).toBe(RS_CARD_STAFF_ASSESSMENT);
    });
});
