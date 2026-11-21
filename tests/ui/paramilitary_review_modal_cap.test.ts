// @vitest-environment jsdom
/**
 * §6 design M (M-a, round 2 R2-2): under the standing-order cap the Always allow button stays visible but is
 * unavailable: `aria-disabled` with a visible one-line reason linked by `aria-describedby` (never native
 * `disabled`, never only a tooltip), in a neutral muted style with no red and no lock icon. It reads the cap
 * the adapter derives through the one cap accessor (`paramilitaryPolicyCap`), with the IPC's rank check.
 * The cap line under the policy hint shows only where a cap exists (RBiH, RS), and the IPC's cannot-loosen
 * code is shown in the player's language, never as engine text.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { ParamilitaryReviewModal } from '../../src/ui/map/components/ParamilitaryReviewModal.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { enMessages } from '../../src/ui/map/i18n/messages.en';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';

const en = enMessages as Record<string, string>;
const originalLoadSave = useGameStore.getState().loadSave;
const TARGET = 'op:zvornik:zvornik_2';

function makeState(faction: 'RBiH' | 'RS' | 'HRHB', cap: LoadedGameState['paramilitaryPolicyCap']): LoadedGameState {
    return {
        label: `${faction} turn 6`,
        turn: 6,
        phase: 'war',
        formations: [],
        militiaPools: [],
        controlBySettlement: {},
        statusBySettlement: {},
        brigadeAorByFormationId: {},
        attackOrders: [],
        aorOrders: [],
        recentControlEvents: [],
        allControlEvents: [],
        displacementEventLog: [],
        battlesByOsid: {},
        movementsByOsid: {},
        supplyTransitionsByOsid: {},
        historicalEventsByTurn: [],
        pressureWarning: false,
        latestTurnSummary: null,
        turnSummaries: [],
        player_faction: faction,
        paramilitaryPolicy: cap === 'always_deny' ? 'always_deny' : 'ask',
        paramilitaryPolicyCap: cap,
        pendingParamilitaryRequests: [
            { faction, strength: 150, target_osid: TARGET, mode: 'rear_pocket', estimated_civilian_risk: 40 },
        ],
    } as LoadedGameState;
}

function mount(state: LoadedGameState, ipc?: Record<string, unknown>) {
    if (ipc) Object.defineProperty(window, 'awwv', { configurable: true, value: ipc });
    useGameStore.setState({ loadedGameState: state, osidDisplayNames: { [TARGET]: 'Zvornik' }, osidPropertiesMap: {} });
    render(createElement(ParamilitaryReviewModal, { isOpen: true, onClose: vi.fn() }));
}

describe('ParamilitaryReviewModal: Always allow under the standing-order cap (§6 M-a)', () => {
    afterEach(() => {
        cleanup();
        delete (window as unknown as { awwv?: unknown }).awwv;
        useGameStore.setState({
            loadedGameState: null,
            osidDisplayNames: null,
            osidPropertiesMap: null,
            loadError: null,
            loadSave: originalLoadSave,
        });
        setLocale('en', undefined);
    });

    for (const faction of ['RBiH', 'RS'] as const) {
        for (const cap of ['ask', 'always_deny'] as const) {
            it(`${faction}, cap ${cap}: Always allow is aria-disabled with a visible reason, focusable, muted, and inert`, async () => {
                const resolveParamilitaryRequests = vi.fn(async () => ({ ok: true }));
                const getCurrentGameState = vi.fn(async () => '{"meta":{"player_visible_projection":1}}');
                mount(makeState(faction, cap), { resolveParamilitaryRequests, getCurrentGameState });

                const button = screen.getByTestId('paramilitary-always-allow');
                expect(button.textContent).toBe('Always allow');
                expect(button.getAttribute('aria-disabled')).toBe('true');
                expect(button.hasAttribute('disabled')).toBe(false);
                const reasonId = button.getAttribute('aria-describedby');
                expect(reasonId).toBeTruthy();
                const reason = document.getElementById(reasonId!);
                expect(reason?.textContent).toBe(en['paramilitaryReview.alwaysAllowUnavailable']);
                expect(reason?.getAttribute('data-testid')).toBe('paramilitary-always-allow-unavailable');
                // Neutral muted: no red accent, no lock icon.
                expect(button.className).not.toMatch(/red-/);
                expect(button.className).toContain('text-[#9c917b]');
                expect(button.querySelector('svg')).toBeNull();
                // The cap line shows for RBiH and RS.
                expect(screen.getByText(en['paramilitaryReview.policyCapHint'])).toBeTruthy();

                // A click selects nothing: the packet submits with no standing order.
                fireEvent.click(button);
                fireEvent.click(screen.getByRole('button', { name: /deny packet/i }));
                fireEvent.click(screen.getByRole('button', { name: /submit decisions/i }));
                await waitFor(() => {
                    expect(resolveParamilitaryRequests).toHaveBeenCalledWith([{ target_osid: TARGET, decision: 'deny' }]);
                });
            });
        }
    }

    it('RBiH whose card itself said Always allow: the button is available, with no reason line', () => {
        mount(makeState('RBiH', 'always_allow'));
        const button = screen.getByTestId('paramilitary-always-allow');
        expect(button.getAttribute('aria-disabled')).not.toBe('true');
        expect(button.getAttribute('aria-describedby')).toBeNull();
        expect(screen.queryByTestId('paramilitary-always-allow-unavailable')).toBeNull();
        expect(screen.getByText(en['paramilitaryReview.policyCapHint'])).toBeTruthy();
    });

    it('HRHB (no card, no cap): the button is available, and neither the reason nor the cap line shows', async () => {
        const resolveParamilitaryRequests = vi.fn(async () => ({ ok: true }));
        const getCurrentGameState = vi.fn(async () => '{"meta":{"player_visible_projection":1}}');
        const loadSave = vi.fn(async () => undefined);
        mount(makeState('HRHB', null), { resolveParamilitaryRequests, getCurrentGameState });
        useGameStore.setState({ loadSave });
        const button = screen.getByTestId('paramilitary-always-allow');
        expect(button.getAttribute('aria-disabled')).not.toBe('true');
        expect(screen.queryByTestId('paramilitary-always-allow-unavailable')).toBeNull();
        expect(screen.queryByText(en['paramilitaryReview.policyCapHint'])).toBeNull();
        fireEvent.click(button);
        fireEvent.click(screen.getByRole('button', { name: /submit decisions/i }));
        await waitFor(() => {
            expect(resolveParamilitaryRequests).toHaveBeenCalledWith(
                [{ target_osid: TARGET, decision: 'allow' }],
                { policy: 'always_allow' },
            );
        });
    });

    it('shows the IPC cannot-loosen refusal as copy, never as the engine code', async () => {
        const resolveParamilitaryRequests = vi.fn(async () => ({ ok: false, error: 'paramilitary_policy_cannot_loosen' }));
        mount(makeState('RBiH', 'always_deny'), { resolveParamilitaryRequests, getCurrentGameState: vi.fn() });
        fireEvent.click(screen.getByRole('button', { name: /allow packet/i }));
        fireEvent.click(screen.getByRole('button', { name: /submit decisions/i }));
        await waitFor(() => {
            expect(useGameStore.getState().loadError).toBe(en['paramilitaryReview.error.cannotLoosen']);
        });
    });
});
