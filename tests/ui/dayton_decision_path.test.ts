// @vitest-environment jsdom
/**
 * DC stage 3: constitution depth for police, education and defense. Each subject can be
 * inspected by power: who makes the rules, runs it, pays, must agree and rules on a
 * dispute, plus the subject's case; both views where the delegation asked for one owner
 * and the treaty projects another.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { enMessages } from '../../src/ui/map/i18n/messages.en';
import { bcsMessages } from '../../src/ui/map/i18n/messages.bcs';
import { AUTHORITY_POWERS, POWER_AUTHORITY, bodiesFor, type Bodies } from '../../src/sim/negotiation/power_authority.js';
import { COMPETENCY_PACKAGES } from '../../src/sim/negotiation/competency_packages.js';
import type { DaytonAgreementRecord } from '../../src/state/negotiation_types.js';
import { DecisionPath } from '../../src/ui/map/dayton_conference/DecisionPath';
import { TreatyAnnexes } from '../../src/ui/map/dayton_conference/TreatyAnnexes';

afterEach(() => {
    cleanup();
    setLocale('en');
});

const OWNERS = ['state', 'entity', 'shared'] as const;
const ROLES = ['rules', 'operates', 'pays', 'consents', 'disputes'] as const;
const all = (b: Bodies) => [...bodiesFor(b, 'federation'), ...bodiesFor(b, 'rs')];

describe('DC stage 3 decision paths', () => {
    it('covers every owner of the three subjects, with the signed treaty marked as such', () => {
        expect(AUTHORITY_POWERS).toEqual(['comp_police', 'comp_education', 'comp_defense']);
        for (const power of AUTHORITY_POWERS) {
            // The 1995 treaty left all three with the entities.
            expect(COMPETENCY_PACKAGES.find(p => p.id === power)?.default_owner).toBe('entity');
            expect(POWER_AUTHORITY[power].entity.effective).toBe('signing');
            for (const owner of OWNERS) {
                const profile = POWER_AUTHORITY[power][owner];
                for (const role of ['rules', 'operates', 'pays', 'disputes'] as const) expect(all(profile[role]).length).toBeGreaterThan(0);
                expect(profile.case.length).toBeGreaterThanOrEqual(3);
                if (owner !== 'entity') expect(profile.effective).toBe('authored');
            }
        }
        // The Federation's cantons hold police and education; Republika Srpska has none.
        expect(bodiesFor(POWER_AUTHORITY.comp_education.entity.rules, 'federation')).toEqual(['cantons']);
        expect(bodiesFor(POWER_AUTHORITY.comp_education.entity.rules, 'rs')).toEqual(['own_government']);
    });

    it('has every body, step and note in English and BCS', () => {
        const keys = new Set<string>();
        for (const power of AUTHORITY_POWERS) {
            keys.add(`dayton.path.case.${power}`);
            for (const owner of OWNERS) {
                const profile = POWER_AUTHORITY[power][owner];
                for (const role of ROLES) all(profile[role]).forEach(id => keys.add(`dayton.body.${id}`));
                for (const step of profile.case) {
                    keys.add(`dayton.path.act.${step.act}`);
                    all(step.who).forEach(id => keys.add(`dayton.body.${id}`));
                }
                if (profile.later) keys.add(`dayton.path.later.${profile.later}`);
            }
        }
        for (const k of ['summary', 'nobody', 'asked', 'to.state', 'to.entity', 'to.shared', 'effective.signing', 'effective.authored',
            ...ROLES.map(r => `role.${r}`), 'role.effective']) keys.add(`dayton.path.${k}`);
        const en = enMessages as Record<string, string>;
        const bcs = bcsMessages as Record<string, string>;
        expect([...keys].filter(k => !en[k])).toEqual([]);
        expect([...keys].filter(k => !bcs[k])).toEqual([]);
    });

    it('traces the police case for the player\'s entity first', () => {
        render(createElement(DecisionPath, { power: 'comp_police', owner: 'entity', entity: 'rs' }));
        expect(screen.getByText('How a decision is made')).toBeTruthy();
        expect(screen.getByRole('heading', { name: 'Case: an investigation crosses the entity line' })).toBeTruthy();
        const steps = screen.getAllByRole('listitem').map(li => li.textContent);
        expect(steps[0]).toBe('Opens the investigation where the crime happened: Republika Srpska: its own government; The Federation: the cantons');
        expect(steps[1]).toBe('Holds inter-entity enforcement on paper, with no state police yet: the Presidency, the Council of Ministers');
        expect(steps).toContain('Monitors the police on both sides: the UN International Police Task Force');
        expect(steps.at(-1)).toBe('Rules if the entities dispute who acts: the Constitutional Court');
        expect(document.body.textContent).toContain('From signature, as the treaty was signed in 1995.');
    });

    it('shows both where the delegation asked for one owner and the treaty gives another', () => {
        render(createElement(DecisionPath, { power: 'comp_defense', owner: 'entity', entity: 'federation', asked: 'state' }));
        expect(screen.getByRole('note').textContent).toBe('Your delegation asked for this power to go to the state. The treaty as drafted gives it to the entities.');
        // The note stays visible while the path is collapsed.
        expect(screen.getByRole('note').closest('details')).toBeNull();
        expect(document.body.textContent).toContain('Both must consent before troops enter the other entity: the other entity, the Presidency');
        expect(document.body.textContent).toContain('Holds civilian command authority: the Presidency members from that entity');
    });

    it('marks an authored arrangement and names the later reform', () => {
        render(createElement(DecisionPath, { power: 'comp_defense', owner: 'state', entity: 'federation' }));
        expect(document.body.textContent).toContain('This arrangement is a game alternative to the 1995 treaty.');
        expect(document.body.textContent).toContain('from 1 January 2006, the entity armies merged');
        expect(document.body.textContent).not.toContain('Annex');
    });

    it('sits under police, education and defense in the treaty annexes, in BCS too', () => {
        setLocale('bcs');
        const agreement = {
            version: 1,
            terms: { territorial_packages_accepted: [], territorial_packages_rejected: [], institutional_choices: {},
                final_territory_split: {}, patron_overrides_applied: [], competency_allocation: { comp_education: 'shared' } },
            map: { controllers: {}, wartimeControllers: {}, specialOsids: [], territoryPct: {} },
        } as DaytonAgreementRecord;
        const { container } = render(createElement(TreatyAnnexes, { agreement, faction: 'RBiH', asked: { comp_education: 'state' } }));
        expect([...container.querySelectorAll('[data-dayton-path]')].map(e => e.getAttribute('data-dayton-path')))
            .toEqual(['comp_defense', 'comp_police', 'comp_education']);
        const education = within(container.querySelector<HTMLElement>('[data-dayton-path="comp_education"]')!.parentElement!);
        expect(education.getByText('Kako se donosi odluka')).toBeTruthy();
        expect(education.getByRole('note').textContent).toContain('Vaša delegacija tražila je');
    });
});
