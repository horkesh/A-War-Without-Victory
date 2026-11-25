/**
 * Staff-sweep disclosure. Stage 1 (Option B, §6 sitting 2026-11-16) told the player that at Assisted, Delegated or Observer the
 * staff decided rear-area paramilitary sweeps without consulting the standing order. §6 D1 stage 2 (ruling 2026-11-18, §8 and A1)
 * binds the staff to the standing order. The copy below is the text the SHDG §4 copy panel (narrative designer + historian) signed
 * unanimously on 2026-11-18 after three rounds, EN and BCS in lockstep; it is pinned word for word. The rule: the staff follows
 * the standing order; Always allow sends sweeps and each counts against the side; any other order, or none, sends none at
 * Assisted, Delegated or Observer; the staff sends nothing before the order is answered; at Observer an order the player has not
 * given is answered automatically with the historical response ("historical policy" until the §4 card-copy panel of 2026-11-23),
 * and an order the player gave stays in force (F1-B, 2026-11-19: the
 * card that comes up after it is answered with that order, at the same effects); corps operations at Assisted still wait for the
 * President. The copy never calls a sweep "authorized" or the flag "ethnic cleansing"
 * (SENSITIVE_HISTORY_DESIGN_GATE.md §2a(0)), never names Operation Circle (ruling §6), and the RS policy card keeps its
 * pre-#740 "entirely" (reverted by the same panel).
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { enMessages } from '../../src/ui/map/i18n/messages.en';
import { bcsMessages } from '../../src/ui/map/i18n/messages.bcs';
import { buildDecisionConsequenceLedger } from '../../src/ui/map/data/decisionConsequenceLedger';
import { resolveEventNotificationDisplay } from '../../src/ui/map/data/eventDisplayCopy';
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
    // Round 4s P2 (owner rule 2026-11-22): a side with no policy card whose staff followed the historical default.
    'decisionConsequences.detail.paramilitary.unrequestedHistoricalDefault',
    'decisionConsequences.detail.paramilitary.unrequestedDissolvedHistoricalDefault',
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

/**
 * The signed §4 copy (§6 D1 stage 2, 2026-11-18), EN and BCS. The §4 card-copy panel (historian + narrative designer,
 * 2026-11-23) replaced "historical policy" with "historical response" in the Observer level and the two automatic-order receipts,
 * and signed the combined rule line.
 */
const SIGNED: Record<'en' | 'bcs', Record<string, string>> = {
    en: {
        // was (assisted EN): '... stance changes and operation plans to you, and operations wait for your approval. Your staff raises ... Rear-area paramilitary sweeps follow your standing order: under Always allow your staff sends them without asking you, and each one counts against your side; under any other order, or none, it sends none.'
        'autonomy.level.assisted.desc':
            'Your staff runs corps and brigade orders. Corps commanders bring stance changes and operation plans to you, and each goes ahead unless you refuse it. Event decisions come to you; one you leave unanswered when the turn goes on is answered by your staff with the historical response. Your staff raises new brigades when they are ready; in Recruitment you can raise one sooner, or hold one so it is not raised. Rear-area paramilitary sweeps follow your standing order: under Always allow your staff sends them without asking you; under Always deny it sends none. If you decide requests one by one, or give no order, no request comes to you: your staff decides, and it may send sweeps. Each sweep that takes its target counts against your side.',
        // was (delegated EN): '... Event decisions still come to you. Rear-area paramilitary sweeps follow your standing order: under Always allow your staff sends them without asking you, and each one counts against your side; under any other order, or none, it sends none.'
        'autonomy.level.delegated.desc':
            'The default. Your staff runs the army, including operations and recruitment, without asking. Corps and OG commanders report their stance changes to you, and each change stands unless you answer. Event decisions still come to you; one you leave unanswered when the turn goes on is answered by your staff with the historical response. Rear-area paramilitary sweeps follow your standing order: under Always allow your staff sends them without asking you; under Always deny it sends none. If you decide requests one by one, or give no order, no request comes to you: your staff decides, and it may send sweeps. Each sweep that takes its target counts against your side.',
        'autonomy.level.observer.desc':
            'As Delegated, except that stance changes are not reported to you and event decisions resolve to their historical response. A decision with no historical response that comes up at Observer is answered by your staff. If one was already on your desk when you chose Observer, it stays there until you answer it. If you have not given the paramilitary standing order, it is answered the same way when its decision comes up, with the historical response. An order you gave stays in force. When its decision comes up, that decision is answered with your order, and the effects are the same as if you had answered it yourself. Your side\'s forces act under the order in force, and each sweep they carry out counts against your side.',
        // The observer.desc sentence on decisions with no historical response: §4 copy panel (historian + narrative),
        // unanimous in round 2, 2026-11-23 (notes s6_obscopy_*), with §6 mechanics item 6.
        // D1's signed text plus §6 M's signed sentences (§4 copy panel, 2026-11-19), appended verbatim when D1 merged onto
        // main; the combined strings were signed by the §4 card-copy panel, 2026-11-23 (tests/ui/s6_modal_cost_copy.test.ts pins the
        // same strings).
        // was (rule EN): '... without asking you, and each one counts against your side. If you refuse it, none are sent. ... no request comes to you, so none are sent. Until an answer to this order takes effect, your staff sends nothing and no paramilitary request comes to you. Your answer holds ... under it. At Assisted, corps operations still wait for your approval; this order does not cover them. Once given, your answer cannot be loosened.'
        'eventDecision.paramilitaryPolicyRule':
            'Your staff follows this order at every command level. If you allow deployment, rear-area sweeps are sent without asking you, and each one that takes its target counts against your side. If you refuse it, none are sent, at any level. If you keep each deployment for your own decision, each request comes to you at Full Control; at Assisted, Delegated or Observer no request comes to you, and none are sent. Your answer holds at every level, Observer included. At Observer, if you have not given a standing order, this order is answered automatically with your side\'s historical response, and your side\'s forces act under it. Once given, your answer cannot be loosened.',
        // was (policyHint EN): '... Always allow sends sweeps without asking you, and each one counts against your side; Always deny, or no standing order, sends none. Each sweep ...'
        'paramilitaryReview.policyHint':
            'Use a standing order if you want future paramilitary packets resolved the same way. Your staff follows it at every command level: at Assisted, Delegated or Observer, Always allow sends sweeps without asking you, and Always deny sends none. With no standing order, or if you decide requests one by one, no request comes to you at those levels: your staff decides, and it may send sweeps. Each sweep that takes its target counts against your side, however it was sent.',
        'decisionConsequences.detail.paramilitary.unrequested':
            'In this campaign a paramilitary sweep was sent into the {place} area for {faction}. No request came to you: under the rule in force when it was sent, your staff at Assisted, Delegated or Observer decided rear-area sweeps without asking. It counts against your side. This is an event of the simulated war, not a statement about what happened in that place.',
        'decisionConsequences.detail.paramilitary.unrequestedDissolved':
            'In this campaign a paramilitary action was sent toward the {place} area for {faction}. No request came to you: under the rule in force when it was sent, your staff at Assisted, Delegated or Observer decided rear-area actions without asking. It was dissolved without taking its target. No harm to civilians was recorded and it does not count against your side. This is an event of the simulated war, not a statement about what happened in that place.',
        'decisionConsequences.detail.paramilitary.unrequestedStandingOrder':
            'In this campaign a paramilitary sweep was sent into the {place} area for {faction}. No request came to you: your standing order of Always allow sent it without one. It counts against your side. This is an event of the simulated war, not a statement about what happened in that place.',
        'decisionConsequences.detail.paramilitary.unrequestedAutomaticOrder':
            'In this campaign a paramilitary sweep was sent into the {place} area for {faction}. No request came to you: your side\'s forces acted under the standing order, answered automatically with the historical response. It counts against your side. This is an event of the simulated war, not a statement about what happened in that place.',
        'decisionConsequences.detail.paramilitary.unrequestedNeutral':
            'In this campaign a paramilitary sweep was sent into the {place} area for {faction}. No request came to you. It counts against your side. This is an event of the simulated war, not a statement about what happened in that place.',
        'decisionConsequences.detail.paramilitary.unrequestedDissolvedStandingOrder':
            'In this campaign a paramilitary action was sent toward the {place} area for {faction}. No request came to you: your standing order of Always allow sent it without one. It was dissolved without taking its target. No harm to civilians was recorded and it does not count against your side. This is an event of the simulated war, not a statement about what happened in that place.',
        'decisionConsequences.detail.paramilitary.unrequestedDissolvedAutomaticOrder':
            'In this campaign a paramilitary action was sent toward the {place} area for {faction}. No request came to you: your side\'s forces acted under the standing order, answered automatically with the historical response. It was dissolved without taking its target. No harm to civilians was recorded and it does not count against your side. This is an event of the simulated war, not a statement about what happened in that place.',
        'decisionConsequences.detail.paramilitary.unrequestedDissolvedNeutral':
            'In this campaign a paramilitary action was sent toward the {place} area for {faction}. No request came to you. It was dissolved without taking its target. No harm to civilians was recorded and it does not count against your side. This is an event of the simulated war, not a statement about what happened in that place.',
    },
    bcs: {
        // was (assisted BCS): '... planove operacija, a operacije čekaju vaše odobrenje. ... uz Uvijek dozvoli štab ih šalje bez pitanja, a svaka takva akcija pada na teret vaše strane; uz bilo koju drugu naredbu, ili bez naredbe, ne šalje nijednu.'
        'autonomy.level.assisted.desc':
            'Štab vodi naredbe korpusa i brigada. Komandanti korpusa vam iznose promjene stava i planove operacija, a svaki se provodi ako ga ne odbijete. Odluke o događajima dolaze vama; na odluku koju ostavite bez odgovora kad potez ide dalje štab odgovara historijskim odgovorom. Štab formira nove brigade kad su spremne; u Regrutaciji jednu možete formirati ranije ili je zadržati da se ne formira. Paravojne akcije u pozadini slijede vašu stalnu naredbu: uz Uvijek dozvoli štab ih šalje bez pitanja; uz Uvijek odbij ne šalje nijednu. Ako o zahtjevima odlučujete jedan po jedan, ili niste izdali naredbu, zahtjev vam ne stiže: štab odlučuje i može slati akcije. Svaka akcija koja zauzme cilj pada na teret vaše strane.',
        // was (delegated BCS): '... Odluke o događajima i dalje dolaze vama. ... uz Uvijek dozvoli ... a svaka takva akcija pada na teret vaše strane; uz bilo koju drugu naredbu, ili bez naredbe, ne šalje nijednu.'
        'autonomy.level.delegated.desc':
            'Zadani nivo. Štab vodi vojsku, uključujući operacije i regrutaciju, bez pitanja. Komandanti korpusa i OG vam prijavljuju promjene stava, a svaka promjena ostaje ako ne odgovorite. Odluke o događajima i dalje dolaze vama; na odluku koju ostavite bez odgovora kad potez ide dalje štab odgovara historijskim odgovorom. Paravojne akcije u pozadini slijede vašu stalnu naredbu: uz Uvijek dozvoli štab ih šalje bez pitanja; uz Uvijek odbij ne šalje nijednu. Ako o zahtjevima odlučujete jedan po jedan, ili niste izdali naredbu, zahtjev vam ne stiže: štab odlučuje i može slati akcije. Svaka akcija koja zauzme cilj pada na teret vaše strane.',
        'autonomy.level.observer.desc':
            'Kao Delegirano, osim što vam se promjene stava ne prijavljuju, a odluke o događajima rješavaju se historijskim odgovorom. Odluku bez historijskog odgovora koja se pojavi na nivou Posmatrač rješava vaš štab. Ako je takva odluka već bila na vašem stolu kad ste izabrali nivo Posmatrač, ostaje tamo dok na nju ne odgovorite. Ako niste izdali stalnu naredbu o paravojnim akcijama, na nju se odgovara na isti način kad dođe odluka o njoj, historijskim odgovorom. Naredba koju ste izdali ostaje na snazi. Kad dođe odluka o njoj, na tu odluku se odgovara vašom naredbom, a učinci su isti kao da ste sami odgovorili. Snage vaše strane djeluju po naredbi koja vrijedi, a svaka akcija koju provedu pada na teret vaše strane.',
        // was (rule BCS): '... a svaka takva akcija pada na teret vaše strane. Ako ga odbijete, ne šalje se nijedna. ... Dok odgovor na ovu naredbu ne stupi na snagu, štab ne šalje ništa ... Na nivou Asistirano operacije korpusa i dalje čekaju vašu saglasnost; ova naredba ih ne obuhvata. Jednom dat ...'
        'eventDecision.paramilitaryPolicyRule':
            'Štab slijedi ovu naredbu na svakom nivou komandovanja. Ako dozvolite raspoređivanje, paravojne akcije u pozadini šalju se bez pitanja, a svaka akcija koja zauzme cilj pada na teret vaše strane. Ako ga odbijete, ne šalje se nijedna, ni na jednom nivou. Ako svako raspoređivanje zadržite za vlastitu odluku, na nivou Pune kontrole svaki zahtjev dolazi vama; na nivoima Asistirano, Delegirano i Posmatrač zahtjev vam ne stiže, pa se ne šalje nijedna. Vaš odgovor vrijedi na svakom nivou, i na nivou Posmatrač. Na nivou Posmatrač, ako niste izdali stalnu naredbu, na ovu naredbu se automatski daje historijski odgovor vaše strane, a snage vaše strane djeluju po njemu. Jednom dat, odgovor se više ne može olabaviti.',
        // was (policyHint BCS): '... uz Uvijek dozvoli šalje akcije bez pitanja, a svaka takva akcija pada na teret vaše strane; uz Uvijek odbij, ili bez stalne naredbe, ne šalje nijednu. Svaka ...'
        'paramilitaryReview.policyHint':
            'Koristite stalnu naredbu ako želite da se budući paravojni paketi riješe na isti način. Štab je slijedi na svakom nivou komandovanja: na nivoima Asistirano, Delegirano i Posmatrač uz Uvijek dozvoli šalje akcije bez pitanja, a uz Uvijek odbij ne šalje nijednu. Bez stalne naredbe, ili kad o zahtjevima odlučujete jedan po jedan, na tim nivoima zahtjev vam ne stiže: štab odlučuje i može slati akcije. Svaka akcija koja zauzme cilj pada na teret vaše strane, bez obzira na to kako je poslana.',
        'decisionConsequences.detail.paramilitary.unrequested':
            'U ovoj kampanji paravojna akcija poslana je na područje {place} za {faction}. Zahtjev vam nije stigao: po pravilu koje je vrijedilo kad je poslana, štab je na nivoima Asistirano, Delegirano i Posmatrač o akcijama u pozadini odlučivao bez pitanja. Pada na teret vaše strane. Ovo je događaj simuliranog rata, a ne tvrdnja o tome šta se zaista desilo na tom mjestu.',
        'decisionConsequences.detail.paramilitary.unrequestedDissolved':
            'U ovoj kampanji paravojna akcija poslana je prema području {place} za {faction}. Zahtjev vam nije stigao: po pravilu koje je vrijedilo kad je poslana, štab je na nivoima Asistirano, Delegirano i Posmatrač o akcijama u pozadini odlučivao bez pitanja. Raspuštena je bez zauzimanja cilja. Nije zabilježena nikakva šteta po civile, a akcija se ne upisuje na teret vaše strane. Ovo je događaj simuliranog rata, a ne tvrdnja o tome šta se zaista desilo na tom mjestu.',
        'decisionConsequences.detail.paramilitary.unrequestedStandingOrder':
            'U ovoj kampanji paravojna akcija poslana je na područje {place} za {faction}. Zahtjev vam nije stigao: poslala ju je vaša stalna naredba Uvijek dozvoli. Pada na teret vaše strane. Ovo je događaj simuliranog rata, a ne tvrdnja o tome šta se zaista desilo na tom mjestu.',
        'decisionConsequences.detail.paramilitary.unrequestedAutomaticOrder':
            'U ovoj kampanji paravojna akcija poslana je na područje {place} za {faction}. Zahtjev vam nije stigao: snage vaše strane djelovale su po stalnoj naredbi, na koju je automatski dat historijski odgovor. Pada na teret vaše strane. Ovo je događaj simuliranog rata, a ne tvrdnja o tome šta se zaista desilo na tom mjestu.',
        'decisionConsequences.detail.paramilitary.unrequestedNeutral':
            'U ovoj kampanji paravojna akcija poslana je na područje {place} za {faction}. Zahtjev vam nije stigao. Pada na teret vaše strane. Ovo je događaj simuliranog rata, a ne tvrdnja o tome šta se zaista desilo na tom mjestu.',
        'decisionConsequences.detail.paramilitary.unrequestedDissolvedStandingOrder':
            'U ovoj kampanji paravojna akcija poslana je prema području {place} za {faction}. Zahtjev vam nije stigao: poslala ju je vaša stalna naredba Uvijek dozvoli. Raspuštena je bez zauzimanja cilja. Nije zabilježena nikakva šteta po civile, a akcija se ne upisuje na teret vaše strane. Ovo je događaj simuliranog rata, a ne tvrdnja o tome šta se zaista desilo na tom mjestu.',
        'decisionConsequences.detail.paramilitary.unrequestedDissolvedAutomaticOrder':
            'U ovoj kampanji paravojna akcija poslana je prema području {place} za {faction}. Zahtjev vam nije stigao: snage vaše strane djelovale su po stalnoj naredbi, na koju je automatski dat historijski odgovor. Raspuštena je bez zauzimanja cilja. Nije zabilježena nikakva šteta po civile, a akcija se ne upisuje na teret vaše strane. Ovo je događaj simuliranog rata, a ne tvrdnja o tome šta se zaista desilo na tom mjestu.',
        'decisionConsequences.detail.paramilitary.unrequestedDissolvedNeutral':
            'U ovoj kampanji paravojna akcija poslana je prema području {place} za {faction}. Zahtjev vam nije stigao. Raspuštena je bez zauzimanja cilja. Nije zabilježena nikakva šteta po civile, a akcija se ne upisuje na teret vaše strane. Ovo je događaj simuliranog rata, a ne tvrdnja o tome šta se zaista desilo na tom mjestu.',
    },
};

/**
 * The RS card's staff assessment: the pre-#740 text restored byte for byte by the §4 panel (2026-11-18), then re-worded by the §4
 * card-copy panel (2026-11-23) so it names the act as the always_allow option does ("A standing order").
 */
const RS_CARD_STAFF_ASSESSMENT =
    'A standing order mirrors the documented RS leadership posture. Per-deployment review introduces command friction; refusal forecloses paramilitary operations entirely and shifts the rear-area burden onto regular formations.';

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

    // was: 'Assisted and Delegated: the staff follows the standing order; Always allow sends sweeps that count; anything else sends none (§6 D1 stage 2)'
    it('Assisted and Delegated: the staff follows the standing order; Always allow sends, Always deny sends none; with no order or one-by-one the staff decides and may send sweeps (S6 copy pass)', () => {
        for (const key of DELEGATING_LEVELS) {
            expect(en[key], key).toMatch(/Rear-area paramilitary sweeps follow your standing order/);
            // was: /under Always allow your staff sends them without asking you, and each one counts against your side/
            expect(en[key], key).toMatch(/under Always allow your staff sends them without asking you; under Always deny it sends none\./);
            expect(en[key], key).toMatch(/Each sweep that takes its target counts against your side\.$/);
            // was: /under any other order, or none, it sends none\./
            expect(en[key], key).toMatch(/If you decide requests one by one, or give no order, no request comes to you: your staff decides, and it may send sweeps\./);
            expect(en[key], key).not.toMatch(/even when set to Always deny|does not apply|under any other order, or none, it sends none/);
            expect(bcs[key], `${key} (bcs)`).toMatch(/slijede vašu stalnu naredbu/);
            // was: /uz bilo koju drugu naredbu, ili bez naredbe, ne šalje nijednu\./
            expect(bcs[key], `${key} (bcs)`).toMatch(/uz Uvijek odbij ne šalje nijednu\./);
            expect(bcs[key], `${key} (bcs)`).toMatch(/Ako o zahtjevima odlučujete jedan po jedan, ili niste izdali naredbu, zahtjev vam ne stiže: štab odlučuje i može slati akcije\./);
            expect(bcs[key], `${key} (bcs)`).toMatch(/Svaka akcija koja zauzme cilj pada na teret vaše strane\.$/);
            expect(bcs[key], `${key} (bcs)`).not.toMatch(/čak ni kad|ne odnosi|uz bilo koju drugu naredbu, ili bez naredbe, ne šalje nijednu/);
        }
        // At Assisted, corps operations go ahead unless the President refuses.
        // was: /operations wait for your approval/ and /operacije čekaju vaše odobrenje/ (the new signed copy states the opposite: each goes ahead unless refused)
        expect(en['autonomy.level.assisted.desc']).toMatch(/operation plans to you, and each goes ahead unless you refuse it\./);
        expect(bcs['autonomy.level.assisted.desc']).toMatch(/planove operacija, a svaki se provodi ako ga ne odbijete\./);
        expect(en['autonomy.level.fullControl.desc']).toMatch(/yours to decide/);
    });

    it('Observer: an order not yet given is answered with the historical response; an order given stays in force; each sweep carried out is charged', () => {
        expect(en['autonomy.level.observer.desc']).toMatch(/If you have not given the paramilitary standing order, it is answered the same way when its decision comes up, with the historical response\./);
        expect(en['autonomy.level.observer.desc']).toMatch(/An order you gave stays in force\./);
        expect(en['autonomy.level.observer.desc']).toMatch(/each sweep they carry out counts against your side/);
        expect(bcs['autonomy.level.observer.desc']).toMatch(/Naredba koju ste izdali ostaje na snazi\./);
    });

    it('Observer, F1-B: a card that comes up after an order you gave is answered with that order, at the same effects (signed 2026-11-19)', () => {
        const observer = en['autonomy.level.observer.desc']!;
        const observerBcs = bcs['autonomy.level.observer.desc']!;
        expect(observer).toMatch(/When its decision comes up, that decision is answered with your order, and the effects are the same as if you had answered it yourself\./);
        expect(observerBcs).toMatch(/na tu odluku se odgovara vašom naredbom, a učinci su isti kao da ste sami odgovorili\./);
        // The new sentence follows "An order you gave stays in force." directly, in both languages.
        expect(observer).toContain('An order you gave stays in force. When its decision comes up, that decision is answered with your order');
        expect(observerBcs).toContain('Naredba koju ste izdali ostaje na snazi. Kad dođe odluka o njoj, na tu odluku se odgovara vašom naredbom');
        // "Consequences" names the Decision Consequences screen, which lists only answers given in person: never in this string.
        expect(observer).not.toMatch(/consequences/i);
        expect(observerBcs).not.toMatch(/posljedic/i);
    });

    it('the game-rule block states the signed rule, in both languages', () => {
        const rule = en['eventDecision.paramilitaryPolicyRule']!;
        expect(rule).toMatch(/^Your staff follows this order at every command level\./);
        // S6 copy pass: the "Until an answer ... takes effect, your staff sends nothing" sentence is gone; a refusal holds at any level.
        // was: /Until an answer to this order takes effect, your staff sends nothing and no paramilitary request comes to you\./
        expect(rule).toMatch(/If you refuse it, none are sent, at any level\./);
        expect(rule).toMatch(/at Assisted, Delegated or Observer no request comes to you, and none are sent\./);
        expect(rule).not.toMatch(/Until an answer to this order takes effect/);
        expect(rule).toMatch(/Your answer holds at every level, Observer included\./);
        expect(rule).toMatch(/At Observer, if you have not given a standing order, this order is answered automatically with your side's historical response, and your side's forces act under it\./);
        // was: /At Assisted, corps operations still wait for your approval; this order does not cover them\./
        expect(rule).not.toMatch(/corps operations still wait for your approval/);
        expect(rule).not.toMatch(/even when|only what you decide in person/);
        const ruleBcs = bcs['eventDecision.paramilitaryPolicyRule']!;
        expect(ruleBcs).toMatch(/na svakom nivou komandovanja/);
        // was: /Dok odgovor na ovu naredbu ne stupi na snagu, štab ne šalje ništa i nijedan paravojni zahtjev vam ne stiže\./
        expect(ruleBcs).toMatch(/Ako ga odbijete, ne šalje se nijedna, ni na jednom nivou\./);
        expect(ruleBcs).toMatch(/zahtjev vam ne stiže, pa se ne šalje nijedna\./);
        expect(ruleBcs).not.toMatch(/Dok odgovor na ovu naredbu ne stupi na snagu/);
        expect(ruleBcs).toMatch(/ako niste izdali stalnu naredbu, na ovu naredbu se automatski daje historijski odgovor vaše strane/);
        expect(ruleBcs).not.toMatch(/čak i kad|samo ono o čemu odlučujete lično/);
        // §6 M's cap sentence closes the block, verbatim, in both languages; it now follows the Observer sentence directly.
        // was: /this order does not cover them\. Once given, your answer cannot be loosened\.$/ and /ova naredba ih ne obuhvata\. Jednom dat, .../
        expect(rule).toMatch(/and your side's forces act under it\. Once given, your answer cannot be loosened\.$/);
        expect(ruleBcs).toMatch(/a snage vaše strane djeluju po njemu\. Jednom dat, odgovor se više ne može olabaviti\.$/);
        // The narrative seat's guard (round 4a (b)): the card can be answered automatically, not only by the player, so the
        // rule never says that "your answer" takes effect.
        expect(rule).not.toMatch(/your answer to this order takes effect/i);
        expect(ruleBcs).not.toMatch(/Dok vaš odgovor/);
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
        expect(automatic.detail).toContain('answered automatically with the historical response');
        expect(automatic.detail).not.toMatch(/you authori[sz]ed|authori[sz]ed/i);

        // Round 4s P2: the historical-default cause for a side with no policy card (HRHB), swept and dissolved.
        const hrhbRow = (captured: boolean) => ({
            id: `para_hrhb_t2_default_${captured}`, turn: 2, target_osid: 'op:kakanj:biljesevo', faction: 'HRHB', captured,
            cause: 'historical_default_staff' as const,
        });
        const hrhbLedger = buildDecisionConsequenceLedger({
            player_faction: 'HRHB',
            rawGameState: { meta: { player_faction: 'HRHB' } },
            paramilitaryUnrequested: [hrhbRow(true), hrhbRow(false)],
        } as any, 100).filter((record) => record.familyId === 'paramilitary-receipt');
        expect(Object.fromEntries(hrhbLedger.map((record) => [record.id, record.detailToken?.key]))).toEqual({
            'paramilitary-staff:para_hrhb_t2_default_true': 'decisionConsequences.detail.paramilitary.unrequestedHistoricalDefault',
            'paramilitary-staff:para_hrhb_t2_default_false': 'decisionConsequences.detail.paramilitary.unrequestedDissolvedHistoricalDefault',
        });
        const swept = hrhbLedger.find((record) => record.id.endsWith('default_true'))!;
        expect(swept.detail).toContain("your staff followed the side's historical default");
        expect(swept.detail).toContain('It counts against your side.');
        expect(swept.detail).not.toMatch(/authori[sz]ed/i);
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

    it('the policy cards\' notifications show the §4 card-copy panel text (2026-11-23) while the persisted pairs stay as saved', () => {
        // Persisted notification text is inside the hashed save, so the signed English is display-only (`localizations.en`).
        const events = JSON.parse(readFileSync('data/scenarios/events/war_1992.json', 'utf8')) as Array<{
            id?: string;
            notifications_to_other_factions?: Record<string, Record<string, { headline: string; body: string }>>;
        }>;
        const signed: Array<[string, string, 'RBiH' | 'RS' | 'HRHB', string, string]> = [
            ['rs_paramilitary_policy_1992', 'always_allow', 'RBiH', 'Pale puts volunteer formations on standing orders',
                'Pale lets the volunteer formations operate alongside regular Serb units on standing orders. Sarajevo reads the order as a continuation of the rear-area pattern seen since Bijeljina.'],
            ['rs_paramilitary_policy_1992', 'always_allow', 'HRHB', 'Pale formalizes paramilitary tolerance',
                'Pale confirms that volunteer formations still deploy at local request. HVO staff note that the order hardens the rear-area pattern across the Krajina and Drina.'],
            ['rs_paramilitary_policy_1992', 'ask', 'HRHB', 'RS introduces paramilitary review process',
                'Pale routes each volunteer deployment through political review; HVO staff assess slower rear-area tempo without a clear break in the pattern.'],
            ['rs_paramilitary_policy_1992', 'always_deny', 'HRHB', 'RS denies paramilitary formations entry',
                'Pale shuts the volunteer formations out of the order of battle. HVO staff note the absence of the documented rear-area pattern; regular Serb units carry the load.'],
            ['rbih_paramilitary_policy_1992', 'always_deny', 'HRHB', 'RBiH formalizes integration-only paramilitary line',
                'Sarajevo records refusal of the parallel paramilitary track; irregulars must integrate into ARBiH regiments or stand down. HVO staff note the contrast with their own practice and weigh the alliance implications.'],
            ['rbih_paramilitary_policy_1992', 'ask', 'HRHB', 'RBiH routes paramilitary requests through political review',
                'Sarajevo routes each volunteer deployment through Presidency files with a casualty projection. HVO staff assess slower ARBiH rear-area tempo without a clear repositioning of the integration line.'],
            ['rbih_paramilitary_policy_1992', 'always_allow', 'HRHB', 'RBiH formalizes paramilitary tolerance',
                'Sarajevo authorizes irregular formations on standing orders. HVO staff note the order departs from the documented ARBiH integration line; international standing will compress quickly as the pattern emerges.'],
        ];
        for (const [eventId, responseId, target, headline, body] of signed) {
            const persisted = events.find((event) => event.id === eventId)?.notifications_to_other_factions?.[responseId]?.[target];
            expect(persisted, `${eventId}.${responseId}.${target}`).toBeDefined();
            // The persisted pair is untouched (hash-neutral route).
            expect(persisted!.body, `${eventId}.${responseId}.${target}`).toMatch(/Mostar staff|regular VRS units|Arkan-style/);
            const shown = resolveEventNotificationDisplay(
                { event_id: eventId, response_id: responseId, target_faction: target, headline: persisted!.headline, body: persisted!.body },
                { locale: 'en' },
            );
            expect(shown, `${eventId}.${responseId}.${target}`).toEqual({ headline, body });
        }
    });
});
