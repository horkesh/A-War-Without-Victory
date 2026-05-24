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

    it('renders a compact non-empty diplomacy packet', () => {
        render(createElement(DiplomacyPanel, { view: makeView(), onClose: vi.fn() }));

        expect(screen.getByRole('dialog', { name: /diplomacy/i })).toBeTruthy();
        expect(screen.getAllByText('Serbia').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Vance-Owen Peace Plan').length).toBeGreaterThan(0);
        expect(screen.getByText('Sarajevo siege visibility')).toBeTruthy();
        expect(screen.getByText('International sanctions')).toBeTruthy();
        expect(screen.getByText('Negotiation Timeline')).toBeTruthy();
        expect(screen.getByText('What Moves The Needle')).toBeTruthy();
        expect(screen.getByText('Reduce Sarajevo siege visibility')).toBeTruthy();
    });

    it('renders an empty state without active diplomacy signals', () => {
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

        expect(screen.getByText('No active diplomatic packet')).toBeTruthy();
        expect(screen.getByText(/Staff will surface proposals/i)).toBeTruthy();
    });
});
