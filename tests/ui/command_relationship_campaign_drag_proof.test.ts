// @vitest-environment jsdom
/**
 * CommandRelationshipSection — Cluster B direct render proof.
 *
 * Proves the new campaign-drag readout (added by the commander-explanation
 * surfaces packet) renders when faction war exhaustion is elevated and
 * disappears otherwise. Also proves the existing silence=healthy path is
 * preserved when the new field is absent.
 *
 * Proof classification: DIRECT RENDER PROOF
 * - Mounts CommandRelationshipSection with jsdom + @testing-library/react.
 * - Mocks useGameStore (collapsible expansion state) and useIPC (no-op).
 * - Threshold under test: FACTION_WAR_EXHAUSTION_ELEVATED = 30, matching
 *   the engine's WAR_EXHAUSTION_TEMPO_THRESHOLD_LOW in combat_math.ts.
 * - Wording under test: "National war strain (N) is narrowing the latitude
 *   this corps has for sustained offensive tempo."
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { createElement } from 'react';

// ── Mocks ────────────────────────────────────────────────────────────────

const storeState: Record<string, any> = {
    armyHQExpandedSections: {},
    toggleArmyHQSection: () => {},
    setLoadError: () => {},
};

vi.mock('../../src/ui/map/store/gameStore', () => ({
    useGameStore: Object.assign(
        (selector: (s: any) => any) => selector(storeState),
        {
            getState: () => storeState,
            setState: (partial: any) => { Object.assign(storeState, partial); },
            subscribe: () => () => {},
        },
    ),
}));

vi.mock('../../src/ui/map/desktop/useIPC', () => ({
    useIPC: () => ({ isAvailable: false }),
}));

// @ts-expect-error TS1378: top-level await — vitest handles at runtime
const { CommandRelationshipSection } = await import(
    '../../src/ui/map/components/army_hq/CommandRelationshipSection'
);

// ── Base props ───────────────────────────────────────────────────────────

type CRSProps = React.ComponentProps<typeof CommandRelationshipSection>;

function baseProps(overrides: Partial<CRSProps> = {}): CRSProps {
    return {
        corpsId: 'arbih_2nd_corps',
        commandStrain: 0,
        commandStrainLabel: 'healthy',
        recoveryForecast: null,
        frictionEvents: [],
        corpsExhaustion: 0,
        delegationSummary: null,
        stabilizationAvailable: false,
        stabilizationCostCA: 0,
        currentTurn: 40,
        ...overrides,
    };
}

afterEach(() => {
    cleanup();
});

// ── Tests ────────────────────────────────────────────────────────────────

describe('CommandRelationshipSection — campaign drag readout', () => {
    it('renders the campaign-drag readout when faction war exhaustion is elevated', () => {
        const { container } = render(
            createElement(CommandRelationshipSection, baseProps({ factionWarExhaustion: 62 })),
        );

        const drag = container.querySelector('[data-testid="faction-campaign-drag"]');
        expect(drag).not.toBeNull();
        expect(drag!.textContent).toContain('National war strain');
        expect(drag!.textContent).toContain('62');
        expect(drag!.textContent).toContain('narrowing the latitude');
        expect(drag!.textContent).toContain('sustained offensive tempo');
    });

    it('does not render the campaign-drag readout below the engine threshold', () => {
        // Threshold matches combat_math.ts WAR_EXHAUSTION_TEMPO_THRESHOLD_LOW = 30.
        // 20 is a low-band value; the whole section should stay silent.
        const { container } = render(
            createElement(CommandRelationshipSection, baseProps({ factionWarExhaustion: 20 })),
        );
        expect(container.querySelector('[data-testid="faction-campaign-drag"]')).toBeNull();
        // Silence=healthy still holds: nothing else to show either.
        expect(container.textContent ?? '').toBe('');
    });

    it('keeps silence=healthy when factionWarExhaustion is undefined', () => {
        const { container } = render(
            createElement(CommandRelationshipSection, baseProps()),
        );
        expect(container.textContent ?? '').toBe('');
    });

    it('renders the campaign-drag readout alongside corps strain when both are present', () => {
        const { container } = render(
            createElement(CommandRelationshipSection, baseProps({
                commandStrain: 3,
                commandStrainLabel: 'strained',
                factionWarExhaustion: 72,
            })),
        );
        // Strain line present
        expect(container.textContent).toContain('Strained');
        // And the new readout
        const drag = container.querySelector('[data-testid="faction-campaign-drag"]');
        expect(drag).not.toBeNull();
        expect(drag!.textContent).toContain('72');
    });

    it('renders the section even when corps is healthy but national strain is elevated', () => {
        // This is the new behaviour: the section now has a reason to appear
        // purely because of campaign drag, independent of corps-level friction.
        const { container } = render(
            createElement(CommandRelationshipSection, baseProps({ factionWarExhaustion: 30 })),
        );
        const drag = container.querySelector('[data-testid="faction-campaign-drag"]');
        expect(drag).not.toBeNull();
    });
});

// ── WarSummaryContent handoff wording (source-only, no mount) ─────────────

describe('WarSummaryContent campaign-drag handoff (source-level)', () => {
    it('advertises Army HQ → Command Relationship for corps-level detail', async () => {
        // Source-only: we assert the handoff wording lives in the component source
        // so the two surfaces do not duplicate CommandRelationshipSection's prose.
        const fs = await import('node:fs');
        const path = await import('node:path');
        const src = fs.readFileSync(
            path.resolve(
                process.cwd(),
                'src/ui/map/components/army_hq/WarSummaryContent.tsx',
            ),
            'utf-8',
        );
        expect(src).toContain('Army HQ');
        expect(src).toContain('Command Relationship');
        // And must NOT repeat the corps-level staff-interpretation line.
        expect(src).not.toContain('narrowing the latitude this corps');
    });
});
