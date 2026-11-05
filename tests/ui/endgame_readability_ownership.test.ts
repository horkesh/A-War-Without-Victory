// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { FACTION_COLORS_SUBTLE } from '../../src/ui/map/utils/theme.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import type { GameVerdict, FactionVerdict } from '../../src/state/negotiation_types.js';

// @ts-expect-error TS1378: Vitest supports top-level await in ESM tests.
const { VerdictScreen } = await import('../../src/ui/map/components/VerdictScreen');
// @ts-expect-error TS1378: Vitest supports top-level await in ESM tests.
const { DaytonNegotiationModal } = await import('../../src/ui/map/components/DaytonNegotiationModal');

function makeFV(faction: string, score = 55): FactionVerdict {
    return {
        faction,
        pyrrhic_score: score,
        grade: 'B',
        grade_description: 'Acceptable compromise',
        capital_breakdown: {
            territory_controlled_pct: 30, territory_controlled_km2: 15000,
            military_casualties_inflicted: 20000, military_casualties_taken: 40000,
            operations_launched: 50, operations_successful: 15,
            refugees_created: 500000, refugees_received: 80000,
            civilians_under_protection: 150000, civilian_casualties_caused: 3000,
            peace_plans_accepted: [], peace_plans_rejected: [],
            enclaves_held: [], enclaves_lost: [],
            war_crimes_events: 0, combat_effective_brigades: 20,
        } as FactionVerdict['capital_breakdown'],
        dimension_grades: [
            { dimension: 'military_credibility', label: 'Military Credibility', score: 50, grade: 'C' },
            { dimension: 'territorial_legitimacy', label: 'Territorial Legitimacy', score: 50, grade: 'C' },
            { dimension: 'international_standing', label: 'International Standing', score: 50, grade: 'C' },
            { dimension: 'patron_confidence', label: 'Patron Confidence', score: 50, grade: 'C' },
            { dimension: 'internal_cohesion', label: 'Internal Cohesion', score: 50, grade: 'C' },
            { dimension: 'negotiating_leverage', label: 'Negotiating Leverage', score: 50, grade: 'C' },
        ],
        outcome_class: 'negotiated_escape',
        condemnation_flags: [],
    } as FactionVerdict;
}

function verdictState(): LoadedGameState {
    return {
        turn: 188,
        phase: 'war',
        player_faction: 'RBiH',
        gameOver: true,
        gameOutcome: 'dayton',
        formations: [],
        controlBySettlement: {},
        gameVerdict: {
            outcome_type: 'termination',
            outcome_label: 'Dayton',
            turn: 188,
            date: '1995-10-01',
            duration_weeks: 188,
            faction_verdicts: {
                RBiH: makeFV('RBiH', 55),
                RS: makeFV('RS', 28),
                HRHB: makeFV('HRHB', 42),
            },
        } as GameVerdict,
        costLedger: {
            war_duration_weeks: 188,
            total_military_killed: 46500,
            total_civilian_killed: 38000,
            entries: [],
            rupture_consequences: [],
            findings: [],
        },
        historicalComparison: {
            duration_delta_weeks: 0,
            territory_divergence: {},
            casualty_ratio: 1,
            displacement_ratio: 1,
            rupture_divergence: [],
            divergence_notes: [],
            milestone_comparison: [],
        },
        metadata: { turn: 188, date: '1995-10-01' },
        loadedGameState: undefined,
    } as unknown as LoadedGameState;
}

function seed(overrides: Record<string, unknown> = {}): void {
    useGameStore.setState({
        loadedGameState: verdictState(),
        wrappedOpen: false,
        loadError: null,
        ...overrides,
    } as never);
}

beforeEach(() => {
    setLocale('en');
    seed();
});

afterEach(() => {
    cleanup();
    setLocale('en');
});

describe('endgame readability and foreground ownership', () => {
    it('keeps Dayton decorative art noninteractive and title text above it', () => {
        const pending = {
            territorialPackages: [],
            institutionalPackages: [],
            factionCapital: { RBiH: 80, RS: 60, HRHB: 40 },
            patronOverride: { RBiH: 5, RS: 10, HRHB: 25 },
        } as never;
        const { container } = render(createElement(DaytonNegotiationModal, { dayton: pending }));
        const image = container.querySelector('img');
        expect(image).toBeTruthy();
        expect(image?.getAttribute('aria-hidden')).toBe('true');
        expect(image?.className).toContain('pointer-events-none');
        const title = screen.getByText('Dayton Peace Accords');
        expect(title.className).toContain('relative');
        expect(title.className).toMatch(/z-\d+/);
        const gradients = Array.from(container.querySelectorAll('div')).filter(node => node.className.includes('bg-gradient-to-b'));
        expect(gradients.length).toBe(1);
        expect(gradients[0].getAttribute('aria-hidden')).toBe('true');
        expect(gradients[0].className).toContain('pointer-events-none');
    });

    it('gives full and fallback Verdict a named modal and keeps focus foreground', () => {
        const full = render(createElement(VerdictScreen));
        const fullDialog = screen.getByRole('dialog', { name: 'Game Over' });
        expect(fullDialog.getAttribute('aria-modal')).toBe('true');
        const focusables = fullDialog.querySelectorAll<HTMLElement>('button, [tabindex]:not([tabindex="-1"])');
        expect(focusables.length).toBeGreaterThan(0);
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        first.focus();
        fireEvent.keyDown(fullDialog, { key: 'Tab', shiftKey: true });
        expect(document.activeElement).toBe(last);
        fireEvent.keyDown(fullDialog, { key: 'Tab' });
        expect(document.activeElement).toBe(first);
        cleanup();

        act(() => {
            seed({ loadedGameState: { ...verdictState(), gameVerdict: undefined } });
        });
        const fallback = render(createElement(VerdictScreen));
        expect(screen.getByRole('dialog', { name: 'Game Over' })).toBeTruthy();
        const surface = fallback.container.querySelector('[data-awwv-endgame-surface="fallback"]');
        expect(surface).toBeTruthy();
    });

    it('yields modal ownership to Wrapped and restores it on close', () => {
        const { container } = render(createElement(VerdictScreen));
        expect(screen.getByRole('dialog', { name: 'Game Over' })).toBeTruthy();
        act(() => {
            useGameStore.setState({ wrappedOpen: true } as never);
        });
        const surface = container.querySelector('[data-awwv-endgame-surface="verdict"]') as HTMLElement;
        expect(surface.style.display).toBe('none');
        expect(screen.queryByRole('dialog', { name: 'Game Over' })).toBeNull();
        act(() => {
            useGameStore.setState({ wrappedOpen: false } as never);
        });
        expect(screen.getByRole('dialog', { name: 'Game Over' })).toBeTruthy();
    });

    it('makes the share summary keyboard focusable and named', () => {
        render(createElement(VerdictScreen));
        const summary = screen.getByLabelText('Share Summary');
        expect(summary.tagName).toBe('PRE');
        expect(summary.getAttribute('tabindex')).toBe('0');
        expect(summary.getAttribute('role')).toBe('region');
    });

    it('uses audited subtle faction text tokens with AA contrast and preserves scores', () => {
        const { container } = render(createElement(VerdictScreen));
        const score = container.querySelector('[data-testid="faction-report-score"] > div:nth-of-type(2)') as HTMLElement;
        expect(score.textContent).toContain('55.0');
        expect(score.className).toContain(FACTION_COLORS_SUBTLE.RBiH);
        expect(score.style.color).toBe('');
        const rsTab = screen.getByText('VRS');
        expect(rsTab.className).toContain(FACTION_COLORS_SUBTLE.RS);
        expect(rsTab.style.color).toBe('');
        const footer = screen.getByText(/least bad version of a tragedy/i);
        expect(footer.className).not.toContain('text-secondary/60');
        expect(footer.className).toContain('text-secondary');

        const tokens: Record<string, string> = {
            'faction-rs-subtle': '#e08080',
            'faction-rbih-subtle': '#79b07f',
            'faction-hrhb-subtle': '#6d99c3',
        };
        const luminance = (hex: string) => {
            const channel = (value: number) => {
                const c = value / 255;
                return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            };
            return 0.2126 * channel(parseInt(hex.slice(1, 3), 16))
                + 0.7152 * channel(parseInt(hex.slice(3, 5), 16))
                + 0.0722 * channel(parseInt(hex.slice(5, 7), 16));
        };
        const contrast = (fg: string, bg: string) => {
            const high = Math.max(luminance(fg), luminance(bg));
            const low = Math.min(luminance(fg), luminance(bg));
            return (high + 0.05) / (low + 0.05);
        };
        for (const token of Object.keys(tokens)) {
            for (const background of ['#1c1a17', '#252220']) {
                expect(contrast(tokens[token], background), `${token} on ${background}`).toBeGreaterThanOrEqual(4.5);
            }
        }
    });
});
