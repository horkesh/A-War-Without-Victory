// @vitest-environment jsdom
/**
 * Dayton institutional-expansion Phase 3 — render/interaction tests for
 * DaytonInstitutionalDimensions (jsdom). Mirrors the modal test patterns.
 *
 * Verifies the surface RENDERS (dial / competency owners / constitutional + rj
 * options), that picking a non-default control records the deviation via onChange,
 * and that the anti-power-fantasy reachability lock disables any option whose
 * post-dial cost exceeds the faction's earned capital.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, within } from '@testing-library/react';
import { createElement } from 'react';
import { setLocale } from '../../src/ui/map/i18n/index.js';

// @ts-expect-error TS1378: Vitest supports top-level await in ESM tests.
const { DaytonInstitutionalDimensions, defaultInstitutionalSelections } = await import(
    '../../src/ui/map/components/DaytonInstitutionalDimensions'
);
// @ts-expect-error TS1378: top-level await in ESM test.
const { getDialDeclarationCost } = await import('../../src/sim/negotiation/dayton_dial_cost.js');

afterEach(() => {
    cleanup();
    setLocale('en');
});

describe('DaytonInstitutionalDimensions — render + interaction (EN)', () => {
    beforeEach(() => setLocale('en'));

    function renderSurface(opts: { faction?: string; capital?: number } = {}) {
        const onChange = vi.fn();
        render(
            createElement(DaytonInstitutionalDimensions, {
                selections: defaultInstitutionalSelections(),
                onChange,
                playerFaction: opts.faction ?? 'RS',
                capitalAvailable: opts.capital ?? 1000,
            }),
        );
        return { onChange };
    }

    it('renders the four dimension sections and their controls', () => {
        renderSurface();
        // Dimension titles.
        expect(screen.getByText('Entity Autonomy — Master Frame')).toBeTruthy();
        expect(screen.getByText('State Competencies (Annex 4)')).toBeTruthy();
        expect(screen.getByText('Constitutional Architecture')).toBeTruthy();
        expect(screen.getByText('Return & Justice')).toBeTruthy();
        // Dial buttons (all four frames).
        expect(screen.getByText('Confederation')).toBeTruthy();
        expect(screen.getByText('Unitary State')).toBeTruthy();
        // A competency row + its three owner buttons exist.
        expect(screen.getByText('Defense')).toBeTruthy();
        expect(screen.getAllByText('State').length).toBeGreaterThan(0);
        // Constitutional + return/justice options.
        expect(screen.getByText('Single Elected President')).toBeTruthy();
        expect(screen.getByText('Full Right of Return')).toBeTruthy();
    });

    it('records a non-default dial pick via onChange', () => {
        const { onChange } = renderSurface({ faction: 'RS', capital: 1000 });
        fireEvent.click(screen.getByText('Unitary State'));
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0]).toMatchObject({ dial: 'unitary' });
    });

    it('records a non-default competency owner via onChange', () => {
        const { onChange } = renderSurface({ faction: 'RS', capital: 1000 });
        // Defense default owner is "entity"; click its "State" owner button.
        const defenseRow = screen.getByText('Defense').closest('div')!;
        const stateBtn = within(defenseRow).getByText('State');
        fireEvent.click(stateBtn);
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0].competency).toEqual({ comp_defense: 'state' });
    });

    it('records a non-default constitutional option via onChange', () => {
        const { onChange } = renderSurface({ faction: 'RS', capital: 1000 });
        fireEvent.click(screen.getByText('Single Elected President'));
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0].constitutional).toEqual({ arch_presidency: 'single_elected' });
    });

    it('locks (disables) an option whose cost exceeds the faction capital — reachability gate', () => {
        // RS pays getDialDeclarationCost('unitary', 'RS') = 24 to declare a unitary
        // frame. With only 10 capital it is unreachable → the button is disabled.
        const unitaryDecl = getDialDeclarationCost('unitary', 'RS');
        expect(unitaryDecl).toBeGreaterThan(10);

        const onChange = vi.fn();
        render(
            createElement(DaytonInstitutionalDimensions, {
                selections: defaultInstitutionalSelections(),
                onChange,
                playerFaction: 'RS',
                capitalAvailable: 10,
            }),
        );
        const unitaryBtn = screen.getByText('Unitary State').closest('button')! as HTMLButtonElement;
        expect(unitaryBtn.disabled).toBe(true);
        // Clicking a locked control is a no-op (disabled button fires nothing).
        fireEvent.click(unitaryBtn);
        expect(onChange).not.toHaveBeenCalled();
    });
});
