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

const SIGNED: Record<string, { en: string; bcs: string }> = {
    'paramilitaryReview.policyHint': {
        en: 'Use a standing order if you want future paramilitary packets resolved the same way. It applies only at Full Control: at Assisted, Delegated or Observer your staff decides rear-area sweeps without it. Each sweep that takes its target counts against your side, however it was sent.',
        bcs: 'Koristite stalnu naredbu ako želite da se budući paravojni paketi riješe na isti način. Vrijedi samo na nivou Pune kontrole: na nivoima Asistirano, Delegirano i Posmatrač štab o paravojnim akcijama u pozadini odlučuje bez nje. Svaka akcija koja zauzme cilj pada na teret vaše strane, bez obzira na to kako je poslana.',
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
        en: 'This order binds only what you decide in person (Full Control). At Assisted, Delegated or Observer your staff decides rear-area sweeps without asking you, even when it is set to Always deny, and each sweep counts against your side. No paramilitary request comes to you before your answer takes effect. Once given, your answer cannot be loosened.',
        bcs: 'Ova naredba obvezuje samo ono o čemu odlučujete lično (Puna kontrola). Na nivoima Asistirano, Delegirano i Posmatrač štab o paravojnim akcijama u pozadini odlučuje bez pitanja, čak i kad je postavljena na Uvijek odbij, a svaka takva akcija pada na teret vaše strane. Nijedan paravojni zahtjev ne stiže vam prije nego što vaš odgovor stupi na snagu. Jednom dat, odgovor se više ne može olabaviti.',
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
