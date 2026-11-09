// @vitest-environment jsdom
/**
 * DC stage 3, inspection by place: a place on the Boundary Map names its entity, its
 * Federation canton and who sets the rules for police, education and defense there and who
 * runs them, and labels what is pending (Brčko's arbitration, a change of entity, a canton the
 * treaty leaves open). The canton table covers the 712 scored cells, never the 744 drawn.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { enMessages } from '../../src/ui/map/i18n/messages.en';
import { bcsMessages } from '../../src/ui/map/i18n/messages.bcs';
import { AUTHORITY_POWERS, POWER_AUTHORITY, bodiesFor } from '../../src/sim/negotiation/power_authority.js';
import { cantonOf, placeCard, scoredOsid } from '../../src/ui/map/dayton_conference/place_authority';
import { PlaceCard } from '../../src/ui/map/dayton_conference/PlaceCard';
import cantonData from '../../data/derived/peace/osid_cantons.json';
import mergeMap from '../../data/derived/operational/micro_osid_merge_map.json';
import cantonSource from '../../data/source/peace_plans/federation_cantons.json';

afterEach(() => {
    cleanup();
    setLocale('en');
});

const ENTITY = { comp_police: 'entity', comp_education: 'entity', comp_defense: 'entity' } as const;
const SAPNA = 'op:zvornik:sapna';
const NONE = new Set<string>();

describe('DC stage 3 inspection by place', () => {
    it('places the 712 scored cells in a canton, never the merged micro-cells', () => {
        const cells = (cantonData as { cells: Record<string, unknown> }).cells;
        expect(Object.keys(cells)).toHaveLength(712);
        const children = Object.keys(mergeMap as Record<string, string>);
        expect(children).toHaveLength(32);
        for (const child of children) {
            expect(cells[child]).toBeUndefined();
            expect(scoredOsid(child)).toBe((mergeMap as Record<string, string>)[child]);
        }
        // Ten cantons, 79 Federation municipalities, none listed twice.
        const codes = Object.values(cantonSource.cantons).flat();
        expect(Object.keys(cantonSource.cantons)).toHaveLength(10);
        expect(new Set(codes).size).toBe(79);
        expect(cantonOf(SAPNA)).toBe('tuzla');
        expect(cantonOf('op:foca:ustikolina')).toBe('bosnian_podrinje');
        expect(cantonOf('op:trnovo:trnovo')).toBe('sarajevo');
    });

    it('is the derivation tool\'s current output', () => {
        execFileSync(process.execPath, ['tools/peace/derive_osid_cantons.cjs', '--check'], { stdio: 'pipe' });
        expect(readFileSync('data/derived/peace/osid_cantons.json', 'utf8')).toContain('"osid_cantons/v1"');
    });

    it('names the canton for police and education in the Federation, the RS government in Republika Srpska', () => {
        const fed = placeCard({ osid: SAPNA, stage: 'signed', controllers: { [SAPNA]: 'RBiH' }, front: { [SAPNA]: 'RBiH' }, special: NONE, owners: ENTITY });
        expect(fed.entity).toBe('federation');
        expect(fed.canton).toBe('tuzla');
        expect(fed.pending).toEqual([]);
        const police = fed.powers.find(p => p.power === 'comp_police');
        expect(police?.operates).toContainEqual({ kind: 'canton', canton: 'tuzla' });
        expect(fed.powers.map(p => p.power)).toEqual([...AUTHORITY_POWERS]);

        const rs = placeCard({ osid: SAPNA, stage: 'signed', controllers: { [SAPNA]: 'RS' }, front: { [SAPNA]: 'RS' }, special: NONE, owners: ENTITY });
        expect(rs.canton).toBeNull();
        expect(rs.powers.find(p => p.power === 'comp_education')?.rules).toEqual([{ kind: 'entity', role: 'government', entity: 'rs' }]);
        // A state owner swaps the bodies the catalog names for that owner.
        const state = placeCard({ osid: SAPNA, stage: 'signed', controllers: { [SAPNA]: 'RBiH' }, front: undefined, special: NONE, owners: { ...ENTITY, comp_police: 'state' } });
        expect(state.powers[0]?.operates).toEqual(bodiesFor(POWER_AUTHORITY.comp_police.state.operates, 'federation').map(id => ({ kind: 'body', id })));
    });

    it('labels Brčko, a change of entity and an open canton as pending', () => {
        const brcko = placeCard({ osid: 'op:brcko:brcko', stage: 'signed', controllers: { 'op:brcko:brcko': 'RS' }, front: { 'op:brcko:brcko': 'RS' }, special: new Set(['op:brcko:brcko']), owners: ENTITY });
        expect(brcko.entity).toBe('brcko');
        expect(brcko.pending).toEqual(['brcko']);
        expect(brcko.powers).toEqual([]);

        const moved = placeCard({ osid: SAPNA, stage: 'draft', controllers: { [SAPNA]: 'RBiH' }, front: { [SAPNA]: 'RS' }, special: NONE, owners: ENTITY });
        expect(moved.pending).toEqual(['transfer']);
        // A swap between the Federation's parties is not a change of entity.
        const swap = placeCard({ osid: SAPNA, stage: 'draft', controllers: { [SAPNA]: 'HRHB' }, front: { [SAPNA]: 'RBiH' }, special: NONE, owners: ENTITY });
        expect(swap.pending).toEqual([]);

        const prijedor = Object.entries((cantonData as { cells: Record<string, { canton: string | null }> }).cells)
            .find(([id, c]) => id.startsWith('op:prijedor:') && c.canton === null)?.[0] ?? '';
        const open = placeCard({ osid: prijedor, stage: 'signed', controllers: { [prijedor]: 'RBiH' }, front: { [prijedor]: 'RBiH' }, special: NONE, owners: ENTITY });
        expect(open.pending).toEqual(['canton']);
        expect(open.powers[0]?.operates).toContainEqual({ kind: 'canton', canton: null });
    });

    it('shows no authorities on the wartime front or before a preview', () => {
        const front = placeCard({ osid: SAPNA, stage: 'front', controllers: { [SAPNA]: 'RBiH' }, front: { [SAPNA]: 'RBiH' }, special: NONE, owners: ENTITY });
        expect(front.powers).toEqual([]);
        expect(front.entity).toBe('federation');
        const unpreviewed = placeCard({ osid: SAPNA, stage: 'opening', controllers: { [SAPNA]: 'RBiH' }, front: undefined, special: NONE, owners: undefined });
        expect(unpreviewed.powers).toEqual([]);
    });

    it('renders the card in English and BCS', () => {
        const card = placeCard({ osid: SAPNA, stage: 'draft', controllers: { [SAPNA]: 'RBiH' }, front: { [SAPNA]: 'RS' }, special: NONE, owners: ENTITY });
        const view = (locale: 'en' | 'bcs') => {
            setLocale(locale);
            return render(createElement(PlaceCard, { card, name: 'Sapna', titleId: 't', onTreatyLine: true, hasTerms: true, onClose: () => undefined }));
        };
        const en = view('en');
        expect(screen.getByText('Tuzla-Podrinje Canton')).toBeTruthy();
        expect(en.container.querySelector('[data-dayton-pending="transfer"]')?.textContent).toContain('Annex 1A');
        expect(en.container.textContent).toContain('the Federation government');
        cleanup();
        const bcs = view('bcs');
        expect(bcs.container.textContent).toContain('Tuzlansko-podrinjski kanton');
        expect(bcs.container.textContent).toContain('Aneksu 1A');
    });

    it('has every place key in both locales', () => {
        const keys = Object.keys(enMessages).filter(k => k.startsWith('dayton.place.'));
        expect(keys.length).toBeGreaterThan(30);
        for (const id of Object.keys(cantonSource.cantons)) expect(keys).toContain(`dayton.place.canton.${id}`);
        for (const k of keys) expect(bcsMessages[k as keyof typeof bcsMessages], k).toBeTruthy();
        expect(Object.keys(bcsMessages).filter(k => k.startsWith('dayton.place.')).sort()).toEqual([...keys].sort());
    });
});
