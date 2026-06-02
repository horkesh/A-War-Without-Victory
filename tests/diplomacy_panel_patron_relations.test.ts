/**
 * @vitest-environment jsdom
 *
 * Focused render test for DiplomacyPanel after its "Patron Relations" reframe.
 * Verifies the patron headline is promoted to the top, the panel title/subtitle use the
 * new patronRelations.* i18n keys, and the de-emphasised general-diplomacy signals
 * (IVP pressure / needle hints) render inside the collapsed "Related Diplomatic Tracks"
 * <details> block rather than leading the panel.
 *
 * Uses React.createElement (file is .ts, the repo test discoverer only scans tests/ for
 * .test.ts) + renderToStaticMarkup, which the map vitest alias config resolves to the
 * root react-dom/server.
 */
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DiplomacyPanel } from '../src/ui/map/components/DiplomacyPanel';
import type { DiplomacyActorView, DiplomacyView } from '../src/ui/map/data/types';

function actor(overrides: Partial<DiplomacyActorView> = {}): DiplomacyActorView {
    return {
        faction: 'RS',
        patronId: 'belgrade',
        patronLabel: 'Belgrade',
        supportBand: 'steady',
        constraintBand: 'elevated',
        commitmentBand: 'likely',
        isolationBand: 'limited',
        sanctionsActive: false,
        stanceSummary: 'Milosevic keeps the pipeline open but warns against open annexation.',
        events: [],
        ...overrides,
    };
}

function baseView(overrides: Partial<DiplomacyView> = {}): DiplomacyView {
    return {
        playerFaction: 'RS',
        hasSignals: true,
        patronStance: actor(),
        activeProposals: [],
        externalActors: [],
        pressureReasons: [],
        activeConsequences: [],
        negotiationTimeline: [],
        needleHints: [],
        ...overrides,
    };
}

function render(view: DiplomacyView): string {
    return renderToStaticMarkup(createElement(DiplomacyPanel, { view, onClose: () => {} }));
}

describe('DiplomacyPanel — Patron Relations reframe', () => {
    it('renders the Patron Relations title and promotes the patron headline', () => {
        const html = render(baseView());
        expect(html).toContain('Patron Relations');
        expect(html).toContain('Your Patron');
        expect(html).toContain('Belgrade');
        // The old "Diplomacy" word must no longer be the panel heading text.
        expect(html).not.toContain('>Diplomacy<');
    });

    it('shows the patron-absent fallback when there is no patron stance', () => {
        const html = render(baseView({ patronStance: undefined }));
        expect(html).toContain('No patron channel');
        expect(html).not.toContain('Your Patron');
    });

    it('demotes general-diplomacy signals into a collapsed Related Diplomatic Tracks section', () => {
        const html = render(
            baseView({
                pressureReasons: [
                    { key: 'sarajevo', label: 'Sarajevo siege visibility', band: 'high', confidence: 'known' },
                ],
                needleHints: [
                    { id: 'h1', label: 'Allow a humanitarian convoy', detail: 'Eases international pressure.', confidence: 'likely' },
                ],
            }),
        );
        expect(html).toContain('Related Diplomatic Tracks');
        expect(html).toContain('<details');
        // The demoted signals still render (data not deleted), just inside the collapsed block.
        expect(html).toContain('Sarajevo siege visibility');
        expect(html).toContain('Allow a humanitarian convoy');
    });

    it('keeps other patrons (external actors) as context', () => {
        const html = render(
            baseView({
                externalActors: [actor({ faction: 'HRHB', patronId: 'zagreb', patronLabel: 'Zagreb' })],
            }),
        );
        expect(html).toContain('Other Patrons');
        expect(html).toContain('Zagreb');
    });
});
