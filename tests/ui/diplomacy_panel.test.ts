// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DiplomacyView } from '../../src/ui/map/data/types.js';
import { DiplomacyPanel } from '../../src/ui/map/components/DiplomacyPanel.js';

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
    afterEach(() => cleanup());

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
