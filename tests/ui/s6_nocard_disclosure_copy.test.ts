/**
 * §6 D1 stage 2 round 4s: the no-card disclosure and receipt (owner rule 2026-11-22; the six §6 seats' H4 + P2; §4 copy
 * panel narrative designer + historian + ui-ux, unanimous after round 2 and a term addendum). A side with no paramilitary
 * policy card (HRHB) sees no-card variants of the levels 1-3 descriptions and the review hint, and its staff sweeps under the
 * historical default get their own receipt. RS and RBiH keep their signed strings. Pinned word for word, EN and BCS.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { enMessages } from '../../src/ui/map/i18n/messages.en';
import { bcsMessages } from '../../src/ui/map/i18n/messages.bcs';
import { levelDescriptionKey } from '../../src/ui/map/components/AutonomyPanel';
import { withoutComments } from '../helpers/sourceComments';

const en = enMessages as Record<string, string>;
const bcs = bcsMessages as Record<string, string>;

const P_EN = "No paramilitary policy decision comes up for your side. Until you decide yourself, your staff sends rear-area paramilitary sweeps without asking you, by your side's historical default, and each sweep that takes its target counts against your side. To refuse, take Full Control: each request then comes to you, and your decision there replaces the historical default at every command level. After that, your staff sends sweeps without asking you only under Always allow.";
const P_BCS = 'Za vašu stranu ne dolazi nikakva odluka o paravojnoj politici. Dok sami ne odlučite, štab bez pitanja šalje paravojne akcije u pozadini po historijskoj zadanoj postavci vaše strane, a svaka akcija koja zauzme cilj pada na teret vaše strane. Da biste ih odbili, preuzmite Punu kontrolu: tada vam stiže svaki zahtjev, a vaša odluka tamo zamjenjuje historijsku zadanu postavku na svakom nivou komandovanja. Nakon toga štab bez pitanja šalje akcije samo uz Uvijek dozvoli.';

const NO_CARD_KEYS = [
    'autonomy.level.assisted.descNoCard',
    'autonomy.level.delegated.descNoCard',
    'autonomy.level.observer.descNoCard',
    'paramilitaryReview.policyHintNoCard',
    'decisionConsequences.detail.paramilitary.unrequestedHistoricalDefault',
    'decisionConsequences.detail.paramilitary.unrequestedDissolvedHistoricalDefault',
] as const;

describe('§6 round 4s: the no-card disclosure and receipt', () => {
    it('every new key exists in EN and BCS', () => {
        for (const key of NO_CARD_KEYS) {
            expect(typeof en[key], key).toBe('string');
            expect(typeof bcs[key], key).toBe('string');
        }
    });

    it('the levels 1-3 variants end with the signed passage, and keep the card variants\' opening sentences', () => {
        for (const level of ['assisted', 'delegated', 'observer']) {
            const key = `autonomy.level.${level}.descNoCard`;
            expect(en[key]!.endsWith(P_EN), key).toBe(true);
            expect(bcs[key]!.endsWith(P_BCS), key).toBe(true);
            const enPrefix = en[key]!.slice(0, en[key]!.length - P_EN.length);
            const bcsPrefix = bcs[key]!.slice(0, bcs[key]!.length - P_BCS.length);
            expect(en[`autonomy.level.${level}.desc`]!.startsWith(enPrefix), key).toBe(true);
            expect(bcs[`autonomy.level.${level}.desc`]!.startsWith(bcsPrefix), key).toBe(true);
        }
    });

    it('the no-card texts never claim staff send none without an order, never say "authorized", and use the historian\'s BCS term', () => {
        for (const key of NO_CARD_KEYS) {
            expect(en[key], key).not.toMatch(/or none, it sends none|no standing order, sends none|authori[sz]ed/i);
            expect(bcs[key], key).not.toMatch(/ili bez naredbe, ne šalje nijednu|bez stalne naredbe, ne šalje|historijski zadani izbor|zadano ponašanje|ovlašten/i);
            expect(bcs[key], key).toMatch(/historijsk\w+ zadan\w+ postav\w+/);
        }
        // "Counts against your side" only in the swept receipt; the dissolved one says it does not count.
        expect(en['decisionConsequences.detail.paramilitary.unrequestedHistoricalDefault']).toMatch(/It counts against your side\./);
        expect(en['decisionConsequences.detail.paramilitary.unrequestedDissolvedHistoricalDefault']).toMatch(/does not count against your side/);
    });

    it('HRHB (no card) gets the variants at levels 1-3; RS and RBiH keep the signed descriptions; Full Control is shared', () => {
        expect(levelDescriptionKey(0, 'HRHB')).toBe('autonomy.level.fullControl.desc');
        expect(levelDescriptionKey(1, 'HRHB')).toBe('autonomy.level.assisted.descNoCard');
        expect(levelDescriptionKey(2, 'HRHB')).toBe('autonomy.level.delegated.descNoCard');
        expect(levelDescriptionKey(3, 'HRHB')).toBe('autonomy.level.observer.descNoCard');
        for (const faction of ['RS', 'RBiH', null, undefined]) {
            expect(levelDescriptionKey(1, faction)).toBe('autonomy.level.assisted.desc');
            expect(levelDescriptionKey(2, faction)).toBe('autonomy.level.delegated.desc');
            expect(levelDescriptionKey(3, faction)).toBe('autonomy.level.observer.desc');
        }
    });

    it('the renderers choose the variants by card registry or cap, never by a faction literal', () => {
        const panel = withoutComments(readFileSync('src/ui/map/components/AutonomyPanel.tsx', 'utf8'));
        expect(panel).toMatch(/PARAMILITARY_POLICY_CARD_BY_FACTION\[playerFaction\]/);
        expect(panel).toMatch(/t\(levelDescriptionKey\(level, playerFaction\)\)/);
        expect(panel).not.toMatch(/'HRHB'/);
        const modal = withoutComments(readFileSync('src/ui/map/components/ParamilitaryReviewModal.tsx', 'utf8'));
        expect(modal).toMatch(/policyCap === null \? 'paramilitaryReview\.policyHintNoCard' : 'paramilitaryReview\.policyHint'/);
        const ledger = withoutComments(readFileSync('src/ui/map/data/decisionConsequenceLedger.ts', 'utf8'));
        expect(ledger).toMatch(/'historical_default_staff'\s*\?\s*'HistoricalDefault'/);
    });
});
