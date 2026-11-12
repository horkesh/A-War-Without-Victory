// @vitest-environment jsdom
/**
 * DC A4: the binder reads as the treaty's annexes, each clause with a plain line on what
 * it means for the player's entity, in English and BCS.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { enMessages } from '../../src/ui/map/i18n/messages.en';
import { bcsMessages } from '../../src/ui/map/i18n/messages.bcs';
import { COMPETENCY_PACKAGES } from '../../src/sim/negotiation/competency_packages.js';
import { CONSTITUTIONAL_CHOICES, RETURN_JUSTICE_CHOICES } from '../../src/sim/negotiation/constitutional_packages.js';
import type { DaytonAgreementRecord } from '../../src/state/negotiation_types.js';
import { treatyAnnexes } from '../../src/ui/map/dayton_conference/annexes';
import { TreatyAnnexes } from '../../src/ui/map/dayton_conference/TreatyAnnexes';

const agreement = {
    version: 1,
    terms: {
        territorial_packages_accepted: [], territorial_packages_rejected: [], institutional_choices: {},
        final_territory_split: {}, patron_overrides_applied: [], brcko_status: 'arbitration',
        entity_autonomy: 'dayton-historical',
        competency_allocation: Object.fromEntries(COMPETENCY_PACKAGES.map(p => [p.id, p.default_owner])),
        constitutional_choices: Object.fromEntries(CONSTITUTIONAL_CHOICES.map(c => [c.id, c.options.find(o => o.is_default)!.id])),
        return_justice: Object.fromEntries(RETURN_JUSTICE_CHOICES.map(c => [c.id, c.options.find(o => o.is_default)!.id])),
    },
    map: {
        controllers: { a: 'RBiH', b: 'RS', c: 'HRHB', d: 'RS' },
        wartimeControllers: { a: 'RBiH', b: 'RS', c: 'HRHB', d: 'RBiH' },
        specialOsids: [],
        territoryPct: { RBiH: 31.5, HRHB: 20.0, RS: 48.5 },
    },
} as DaytonAgreementRecord;

afterEach(() => {
    cleanup();
    setLocale('en');
});

describe('DC A4 treaty annexes', () => {
    it('orders the binder by annex and shows each power once', () => {
        const annexes = treatyAnnexes(agreement, 'RBiH', false);
        expect(annexes.map(a => a.id)).toEqual(['1a', '2', 'brcko', '4', '7', '10']);
        const ids = annexes.flatMap(a => a.clauses.map(c => c.id));
        expect(new Set(ids).size).toBe(ids.length);
        for (const pkg of COMPETENCY_PACKAGES) expect(ids.filter(id => id === pkg.id)).toHaveLength(1);
        expect(annexes[0]!.clauses.map(c => c.id)).toEqual(['separation', 'comp_defense']);
        expect(annexes[4]!.clauses.map(c => c.id)).toEqual(['rj_refugee_return']);
        expect(annexes[3]!.clauses.at(-1)!.id).toBe('rj_icty_cooperation');
        expect(annexes[5]!.clauses.map(c => c.id)).toEqual(['arch_ohr_authority']);
    });

    it('says what each clause means for the player\'s entity', () => {
        const fed = treatyAnnexes(agreement, 'HRHB', false);
        const rs = treatyAnnexes(agreement, 'RS', false);
        const boundary = (annexes: typeof fed) => annexes.find(a => a.id === '2')!.clauses[0]!;
        expect(boundary(fed).value).toBe('Federation 51.5 %, Republika Srpska 48.5 %');
        expect(boundary(fed).means).toBe('The Federation holds 51.5 % of the country under this draft. Places that change hands from the front line: 1.');
        expect(boundary(rs).means).toContain('Republika Srpska holds 48.5 % of the country');
        const police = (annexes: typeof fed) => annexes.find(a => a.id === '4')!.clauses.find(c => c.id === 'comp_police')!;
        expect(police(rs).value).toBe('Entity');
        expect(police(rs).means).toBe('Police stays with the entities. Republika Srpska sets the rules and runs it on its own ground.');
        const signed = treatyAnnexes(agreement, 'RBiH', true);
        expect(boundary(signed).means).toContain('under the treaty');
    });

    it('follows the operative power when the terms change it', () => {
        const centralised = { ...agreement, terms: { ...agreement.terms, competency_allocation: { ...agreement.terms.competency_allocation, comp_police: 'state' as const } } };
        const police = treatyAnnexes(centralised, 'RBiH', false).find(a => a.id === '4')!.clauses.find(c => c.id === 'comp_police')!;
        expect(police.value).toBe('State');
        expect(police.means).toBe('Police is decided in Sarajevo for the whole country. The Federation follows the state\'s rules there.');
    });

    it('has every generated line in English and BCS', () => {
        const keys = [
            // Fixed keys: BCS is Partial, so the type checker does not guard these.
            ...['intro', 'introSigned', 'meansLabel', 'openMap', 'separation', 'separation.value', 'separation.means', 'boundary',
                'boundary.value', 'boundary.means', 'boundary.meansSigned', 'dialLabel', 'brckoLabel']
                .map(k => `dayton.annex.${k}`),
            ...['1a', '2', 'brcko', '4', '7', '10'].map(a => `dayton.annex.title.${a}`),
            ...COMPETENCY_PACKAGES.map(p => `dayton.power.${p.id}`),
            ...['state', 'entity', 'shared'].map(o => `dayton.annex.owner.${o}`),
            ...['federation', 'rs'].map(e => `dayton.annex.entity.${e}`),
            ...['confederation', 'dayton-historical', 'federalized', 'unitary'].map(d => `dayton.annex.dial.${d}`),
            ...['arbitration', 'federation', 'rs'].map(b => `dayton.annex.brcko.${b}`),
            ...[...CONSTITUTIONAL_CHOICES, ...RETURN_JUSTICE_CHOICES].flatMap(c => [
                `dayton.choice.${c.id}`,
                ...c.options.flatMap(o => [`dayton.choice.${c.id}.${o.id}`, `dayton.choice.${c.id}.${o.id}.means`]),
            ]),
        ];
        const en = enMessages as Record<string, string>;
        const bcs = bcsMessages as Record<string, string>;
        expect(keys.filter(k => !en[k])).toEqual([]);
        expect(keys.filter(k => !bcs[k])).toEqual([]);
    });

    it('renders each annex with a "what this means for you" line and opens the map from Annex 2', () => {
        const onOpenMap = vi.fn();
        render(createElement(TreatyAnnexes, { agreement, faction: 'RBiH', onOpenMap }));
        expect(screen.getByRole('heading', { name: 'Annex 1A: military aspects' })).toBeTruthy();
        expect(screen.getByRole('heading', { name: 'Annex 4: the Constitution' })).toBeTruthy();
        const annex7 = screen.getByRole('region', { name: 'Annex 7: refugees and displaced persons' });
        expect(within(annex7).getByText('Voluntary return only, as implemented')).toBeTruthy();
        expect(annex7.textContent).toContain('What this means for you:');
        fireEvent.click(screen.getByRole('button', { name: 'Open the boundary on the map' }));
        expect(onOpenMap).toHaveBeenCalledOnce();
    });

    it('speaks BCS', () => {
        setLocale('bcs');
        render(createElement(TreatyAnnexes, { agreement, faction: 'RS', signed: true }));
        expect(screen.getByRole('heading', { name: 'Aneks 4: Ustav' })).toBeTruthy();
        expect(document.body.textContent).toContain('Oblast „Policija“ ostaje entitetima. Republika Srpska postavlja pravila');
        expect(screen.queryByRole('button', { name: 'Otvori liniju razgraničenja na mapi' })).toBeNull();
    });
});
