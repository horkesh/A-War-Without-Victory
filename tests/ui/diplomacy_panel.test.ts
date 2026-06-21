// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DiplomacyView } from '../../src/ui/map/data/types.js';
import { DiplomacyPanel } from '../../src/ui/map/components/DiplomacyPanel.js';
import { buildDiplomacyView } from '../../src/ui/map/data/diplomacyView.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { turnToDateString } from '../../src/ui/map/utils/formatters.js';

function makeView(overrides: Partial<DiplomacyView> = {}): DiplomacyView {
    return {
        playerFaction: 'RS',
        hasSignals: true,
        patronStance: {
            faction: 'RS',
            patronId: 'serbia',
            patronLabel: 'Serbia',
            supportBand: 'steady',
            constraintBand: 'high',
            commitmentBand: 'uncertain',
            isolationBand: 'elevated',
            sanctionsActive: true,
            stanceSummary: 'Serbia is constrained by sanctions and keeps the RS channel under pressure.',
            events: ['belgrade_border_pressure'],
        },
        activeProposals: [
            {
                id: 'peace:vance_owen',
                kind: 'peace_plan',
                name: 'Vance-Owen Peace Plan',
                statusLabel: 'Awaiting presidential response',
                detail: 'UN mediators propose decentralized provinces.',
                turnOffered: 40,
                confidence: 'known',
            },
        ],
        externalActors: [
            {
                faction: 'RS',
                patronId: 'serbia',
                patronLabel: 'Serbia',
                supportBand: 'steady',
                constraintBand: 'high',
                commitmentBand: 'uncertain',
                isolationBand: 'elevated',
                sanctionsActive: true,
                stanceSummary: 'Serbia is constrained by sanctions and keeps the RS channel under pressure.',
                events: [],
            },
        ],
        pressureReasons: [
            { key: 'sarajevo_siege_visibility', label: 'Sarajevo siege visibility', band: 'high', confidence: 'known' },
        ],
        activeConsequences: [
            { id: 'international_sanctions', label: 'International sanctions' },
        ],
        negotiationTimeline: [
            {
                id: 'proposal:peace:vance_owen',
                label: 'Vance-Owen Peace Plan',
                detail: 'Awaiting presidential response',
                turn: 40,
                confidence: 'known',
            },
        ],
        needleHints: [
            {
                id: 'pressure:sarajevo_siege_visibility',
                label: 'Reduce Sarajevo siege visibility',
                detail: 'Sarajevo siege visibility is high.',
                confidence: 'known',
            },
        ],
        ...overrides,
    };
}

describe('DiplomacyPanel', () => {
    afterEach(() => {
        cleanup();
        setLocale('en');
    });

    it('renders the reframed Patron Relations packet with the patron promoted', () => {
        render(createElement(DiplomacyPanel, { view: makeView(), onClose: vi.fn() }));

        // Panel is now titled "Patron Relations" — the dialog's accessible name reflects it.
        expect(screen.getByRole('dialog', { name: /patron relations/i })).toBeTruthy();
        // The player's own patron is promoted to the "Your Patron" headline.
        expect(screen.getByText('Your Patron')).toBeTruthy();
        expect(screen.getAllByText('Serbia').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Serbia is constrained by sanctions and keeps the RS channel under pressure.').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Vance-Owen Peace Plan').length).toBeGreaterThan(0);
        // The general-diplomacy signals are demoted into the collapsed "Related Diplomatic
        // Tracks" <details> block — they still render in the DOM (text queries find them).
        expect(screen.getByText('Related Diplomatic Tracks')).toBeTruthy();
        expect(screen.getByText('Sarajevo siege visibility')).toBeTruthy();
        expect(screen.getByText('International sanctions')).toBeTruthy();
        expect(screen.getByText('Negotiation Timeline')).toBeTruthy();
        expect(screen.getByText('What Moves The Needle')).toBeTruthy();
        expect(screen.getByText('Reduce Sarajevo siege visibility')).toBeTruthy();
    });

    it('renders the patron-confidence gauge and a defiance-cut line under Your Patron', () => {
        render(createElement(DiplomacyPanel, {
            view: makeView({
                patronConfidence: { value: 38, band: 'low' },
                patronDefianceCuts: {
                    count: 2,
                    latestCutFraction: 0.3,
                    latestTurn: 44,
                    latestSupportAfter: 0.5,
                    entries: [
                        { turn: 44, cutFraction: 0.3, supportAfter: 0.5 },
                        { turn: 31, cutFraction: 0.15, supportAfter: 0.7 },
                    ],
                },
            }),
            onClose: vi.fn(),
        }));

        expect(screen.getByText('Patron confidence')).toBeTruthy();
        expect(screen.getByText(/38 \/ 100 \(Low\)/)).toBeTruthy();
        // Sober, factual defiance line — never celebratory.
        expect(screen.getByText(`2 defiance cuts on record. Most recent cost 30% of materiel (${turnToDateString(44)}); support fell to 50%.`)).toBeTruthy();
        expect(screen.getByText('Material consequence records')).toBeTruthy();
        expect(screen.getByText(turnToDateString(44))).toBeTruthy();
        expect(screen.getByText('-30% / support 50%')).toBeTruthy();
        expect(screen.getByText(turnToDateString(31))).toBeTruthy();
        expect(screen.getByText('-15% / support 70%')).toBeTruthy();

        const panelText = screen.getByTestId('diplomacy-panel').textContent ?? '';
        expect(panelText).not.toMatch(/\bT(?:31|44)\b/);
        expect(panelText).not.toMatch(/\bP(?:31|44)\b/);
        expect(panelText).not.toMatch(/\bturn 44\b/i);
    });

    it('renders negotiation timeline timing as calendar copy', () => {
        render(createElement(DiplomacyPanel, { view: makeView(), onClose: vi.fn() }));

        const panelText = screen.getByTestId('diplomacy-panel').textContent ?? '';
        expect(panelText).toContain(turnToDateString(40));
        expect(panelText).not.toContain('T40');
    });

    it('renders BCS defiance receipt timing as a calendar date without raw P tokens', () => {
        setLocale('bcs');
        render(createElement(DiplomacyPanel, {
            view: makeView({
                patronConfidence: { value: 38, band: 'low' },
                patronDefianceCuts: {
                    count: 1,
                    latestCutFraction: 0.15,
                    latestTurn: 31,
                    latestSupportAfter: 0.7,
                    entries: [
                        { turn: 31, cutFraction: 0.15, supportAfter: 0.7 },
                    ],
                },
            }),
            onClose: vi.fn(),
        }));

        const panelText = screen.getByTestId('diplomacy-panel').textContent ?? '';
        expect(panelText).toContain(turnToDateString(31));
        expect(panelText).not.toContain('P31');
        expect(panelText).not.toContain('T31');
        expect(panelText).not.toMatch(/\bpotez\s+31\b/i);
    });

    it('localizes related-track headings and qualitative labels in BCS', () => {
        setLocale('bcs');
        render(createElement(DiplomacyPanel, { view: makeView(), onClose: vi.fn() }));

        const panelText = screen.getByTestId('diplomacy-panel').textContent ?? '';
        expect(panelText).toContain('Pregovaračka hronologija');
        expect(panelText).toContain('Šta bi promijenilo stanje');
        expect(panelText).toContain('Visok - Poznato');
        expect(panelText).toContain('Postojana');
        expect(panelText).toContain('Povišena');
        expect(panelText).not.toContain('Negotiation Timeline');
        expect(panelText).not.toContain('What Moves The Needle');
        expect(panelText).not.toContain('High - Known');
        expect(panelText).not.toContain('Steady');
        expect(panelText).not.toContain('Elevated');
    });

    it('renders generated diplomacy read-model tokens in BCS without English pressure labels', () => {
        setLocale('bcs');
        const view = buildDiplomacyView({
            meta: { turn: 44, phase: 'war', player_faction: 'RS' },
            factions: [
                {
                    id: 'RS',
                    patron_state: {
                        material_support_level: 0.62,
                        diplomatic_isolation: 0.41,
                        constraint_severity: 0.74,
                        patron_commitment: 0.55,
                        last_updated: 44,
                    },
                },
            ],
            political: {
                international_visibility_pressure: {
                    sarajevo_siege_visibility: 0.8,
                    enclave_humanitarian_pressure: 0.5,
                    atrocity_visibility: 0.25,
                    negotiation_momentum: 0.3,
                    composite_ivp: 0.55,
                    last_major_shift: 43,
                },
                ivp_consequences_active: ['international_sanctions'],
            },
            military: {
                negotiation: {
                    patron_relationships: {
                        RS: {
                            patron_id: 'serbia',
                            support_level: 66,
                            override_authority: 71,
                            sanctions_active: true,
                            relationship_events: ['belgrade_border_pressure'],
                        },
                    },
                    pending_dayton: {
                        territorial_packages: [{ id: 'brcko' }],
                        institutional_packages: [{ id: 'central_state' }],
                    },
                },
            },
        }, 'RS');

        render(createElement(DiplomacyPanel, { view, onClose: vi.fn() }));

        const panelText = screen.getByTestId('diplomacy-panel').textContent ?? '';
        expect(panelText).toContain('Srbija');
        expect(panelText).toContain('Vidljivost opsade Sarajeva');
        expect(panelText).toContain('Humanitarni pritisak oko enklava');
        expect(panelText).toContain('Daytonski pregovarački meni');
        expect(panelText).not.toContain('Serbia');
        expect(panelText).not.toContain('Sarajevo siege visibility');
        expect(panelText).not.toContain('Enclave humanitarian pressure');
        expect(panelText).not.toContain('Belgrade Border Pressure');
    });

    it('omits the gauge when no patron-confidence or defiance data is present', () => {
        render(createElement(DiplomacyPanel, { view: makeView(), onClose: vi.fn() }));
        expect(screen.queryByText('Patron confidence')).toBeNull();
    });

    it('renders the patron-absent empty state without a patron stance', () => {
        render(createElement(DiplomacyPanel, {
            view: makeView({
                hasSignals: false,
                patronStance: undefined,
                activeProposals: [],
                externalActors: [],
                pressureReasons: [],
                activeConsequences: [],
                negotiationTimeline: [],
                needleHints: [],
            }),
            onClose: vi.fn(),
        }));

        // The old "No active diplomatic packet" empty-state is now the patron-absent fallback.
        expect(screen.getByRole('dialog', { name: /patron relations/i })).toBeTruthy();
        expect(screen.getByText('No patron channel')).toBeTruthy();
        expect(screen.getByText(/Your patron stance will surface here/i)).toBeTruthy();
        // No patron headline when there is no patron stance.
        expect(screen.queryByText('Your Patron')).toBeNull();
    });
});
