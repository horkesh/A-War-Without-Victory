// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DiplomacyPanel } from '../../src/ui/map/components/DiplomacyPanel.js';
import type { DiplomacyView } from '../../src/ui/map/data/types.js';

describe('DiplomacyPanel player truth', () => {
    afterEach(() => cleanup());

    it('uses qualitative confidence copy and does not print hidden raw thresholds', () => {
        const view: DiplomacyView = {
            playerFaction: 'RS',
            hasSignals: true,
            patronStance: {
                faction: 'RS',
                patronId: 'serbia',
                patronLabel: 'Serbia',
                supportBand: 'steady',
                constraintBand: 'high',
                commitmentBand: 'likely',
                isolationBand: 'elevated',
                sanctionsActive: false,
                stanceSummary: 'Serbia support is steady, but constraint is high; expect limited room for independent bargaining.',
                events: [],
            },
            activeProposals: [
                {
                    id: 'dayton',
                    kind: 'dayton',
                    name: 'Dayton negotiation menu',
                    statusLabel: 'Menu prepared',
                    detail: 'Territorial and institutional packages are ready for review.',
                    confidence: 'known',
                },
            ],
            externalActors: [],
            pressureReasons: [
                { key: 'sarajevo_siege_visibility', label: 'Sarajevo siege visibility', band: 'high', confidence: 'likely' },
                { key: 'negotiation_momentum', label: 'Negotiation momentum', band: 'medium', confidence: 'uncertain' },
            ],
            activeConsequences: [],
            negotiationTimeline: [
                {
                    id: 'proposal:dayton',
                    label: 'Dayton negotiation menu',
                    detail: 'Menu prepared',
                    confidence: 'known',
                },
            ],
            needleHints: [
                {
                    id: 'pressure:sarajevo_siege_visibility',
                    label: 'Reduce Sarajevo siege visibility',
                    detail: 'Sarajevo siege visibility is high.',
                    confidence: 'likely',
                },
            ],
        };

        render(createElement(DiplomacyPanel, { view, onClose: vi.fn() }));

        const panelText = screen.getByTestId('diplomacy-panel').textContent ?? '';
        expect(panelText).toContain('Likely');
        expect(panelText).toContain('Uncertain');
        expect(panelText).toContain('Known');
        expect(panelText).not.toMatch(/\b0\.\d+\b/);
        expect(panelText).not.toMatch(/\b\d{2,3}%\b/);
        expect(panelText.toLowerCase()).not.toContain('threshold');
        expect(panelText.toLowerCase()).not.toContain('formula');
    });
});
