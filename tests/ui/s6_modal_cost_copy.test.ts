/**
 * §6 design M (M-a): the review-modal cap copy, signed by the §4 copy panel (narrative designer and historian,
 * 2026-11-19, two rounds, unanimous). EN and BCS are pinned word for word.
 *
 * Rules the strings must keep (SHDG §2a(0), §3; red-team R2-2): no "authorized" in any form, no crime named,
 * no trade framing, and nothing that suggests a later or paid way to loosen the order. The cap sentence is its
 * own key, rendered only for RBiH and RS (HRHB has no card and no cap).
 */

import { describe, expect, it } from 'vitest';

import { bcsMessages } from '../../src/ui/map/i18n/messages.bcs';
import { enMessages } from '../../src/ui/map/i18n/messages.en';

const en = enMessages as Record<string, string>;
const bcs = bcsMessages as Record<string, string>;

/**
 * `paramilitaryReview.policyHint` and `eventDecision.paramilitaryPolicyRule`: since §6 D1 stage 2 merged onto main, each is D1's
 * signed text (§4 panel, 2026-11-18; it replaced the "only at Full Control" rule this panel's strings were written against) with
 * M's signed sentences appended verbatim. The combined strings are PENDING §4 PANEL; tests/ui/staff_sweep_disclosure_copy.test.ts
 * pins the same strings.
 */
const SIGNED: Record<string, { en: string; bcs: string }> = {
    'paramilitaryReview.policyHint': {
        en: 'Use a standing order if you want future paramilitary packets resolved the same way. Your staff follows it at every command level: at Assisted, Delegated or Observer, Always allow sends sweeps without asking you, and each one counts against your side; Always deny, or no standing order, sends none. Each sweep that takes its target counts against your side, however it was sent.',
        bcs: 'Koristite stalnu naredbu ako želite da se budući paravojni paketi riješe na isti način. Štab je slijedi na svakom nivou komandovanja: na nivoima Asistirano, Delegirano i Posmatrač uz Uvijek dozvoli šalje akcije bez pitanja, a svaka takva akcija pada na teret vaše strane; uz Uvijek odbij, ili bez stalne naredbe, ne šalje nijednu. Svaka akcija koja zauzme cilj pada na teret vaše strane, bez obzira na to kako je poslana.',
    },
    'paramilitaryReview.policyCapHint': {
        en: "A standing order can keep your side's paramilitary policy or tighten it to Always deny, never loosen it.",
        bcs: 'Stalna naredba može zadržati paravojnu politiku vaše strane ili je pooštriti na Uvijek odbij, ali je nikad ne može olabaviti.',
    },
    'paramilitaryReview.error.cannotLoosen': {
        en: "Your side's paramilitary policy cannot be loosened. Nothing was recorded.",
        bcs: 'Paravojna politika vaše strane ne može se olabaviti. Ništa nije zabilježeno.',
    },
    'paramilitaryReview.alwaysAllowUnavailable': {
        en: "Always allow is unavailable: your side's paramilitary policy cannot be loosened.",
        bcs: 'Opcija Uvijek dozvoli nije dostupna: paravojna politika vaše strane ne može se olabaviti.',
    },
    'eventDecision.paramilitaryPolicyRule': {
        en: 'Your staff follows this order at every command level. If you allow deployment, rear-area sweeps are sent without asking you, and each one counts against your side. If you refuse it, none are sent. If you choose to review each deployment, each request comes to you at Full Control; at Assisted, Delegated or Observer no request comes to you, so none are sent. Your staff sends nothing before this order is answered. Your answer holds at every level, Observer included. At Observer, if you have not given a standing order, this order is answered automatically with the historical policy, and your side\'s forces act under it. At Assisted, corps operations still wait for your approval; this order does not cover them. No paramilitary request comes to you before your answer takes effect. Once given, your answer cannot be loosened.',
        bcs: 'Štab slijedi ovu naredbu na svakom nivou komandovanja. Ako dozvolite raspoređivanje, paravojne akcije u pozadini šalju se bez pitanja, a svaka takva akcija pada na teret vaše strane. Ako ga odbijete, ne šalje se nijedna. Ako odaberete da pregledate svako raspoređivanje, na nivou Pune kontrole svaki zahtjev dolazi vama; na nivoima Asistirano, Delegirano i Posmatrač zahtjev vam ne stiže, pa se ne šalje nijedna. Prije odgovora na ovu naredbu štab ne šalje ništa. Vaš odgovor vrijedi na svakom nivou, i na nivou Posmatrač. Na nivou Posmatrač, ako niste izdali stalnu naredbu, na ovu naredbu se automatski odgovara historijskom politikom, a snage vaše strane djeluju po njoj. Na nivou Asistirano operacije korpusa i dalje čekaju vašu saglasnost; ova naredba ih ne obuhvata. Nijedan paravojni zahtjev ne stiže vam prije nego što vaš odgovor stupi na snagu. Jednom dat, odgovor se više ne može olabaviti.',
    },
};

/** The strings that state the cap itself: none may suggest a later or paid way to loosen it. */
const CAP_KEYS = [
    'paramilitaryReview.policyCapHint',
    'paramilitaryReview.error.cannotLoosen',
    'paramilitaryReview.alwaysAllowUnavailable',
] as const;

describe('§6 M-a copy (signed §4 panel)', () => {
    it('pins every M string word for word, EN and BCS', () => {
        for (const [key, text] of Object.entries(SIGNED)) {
            expect(en[key], key).toBe(text.en);
            expect(bcs[key], `${key} (bcs)`).toBe(text.bcs);
        }
    });

    it('never says authorized, names a crime, or frames the order as a trade', () => {
        for (const key of Object.keys(SIGNED)) {
            expect(en[key], key).not.toMatch(/authori[sz]|ethnic cleansing|war crime|atrocit|genocid|\btrade\b|in exchange/i);
            expect(bcs[key], `${key} (bcs)`).not.toMatch(/odobr|ovlast|etničk\w* čišćenj|ratn\w* zločin|genocid|u zamjenu/i);
        }
    });

    it('the cap strings suggest no later or paid way to loosen the order', () => {
        for (const key of CAP_KEYS) {
            expect(en[key], key).not.toMatch(/\b(later|until|unless|yet|pay|paid|price|cost|purchase)\b/i);
            expect(bcs[key], `${key} (bcs)`).not.toMatch(/\b(kasnije|dok ne|osim ako|plati|cijen|košta)\w*/i);
        }
        // The rule box's M sentence too.
        expect(en['eventDecision.paramilitaryPolicyRule']).toMatch(/Once given, your answer cannot be loosened\.$/);
    });
});
