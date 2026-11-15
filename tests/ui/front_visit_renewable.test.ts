// @vitest-environment jsdom
//
// Renewable gestures (Fable consult 1 appendix D): a front visit with no lifetime cap reads as
// renewable on its cooldown, never as exhausted, and the "N visits remaining" line is dropped.

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FrontVisitSection } from '../../src/ui/map/components/army_hq/FrontVisitSection';

function installIpc(availability: Record<string, unknown>) {
    const bridge = { getFrontVisitAvailability: vi.fn(async () => ({ ok: true, ...availability })) };
    Object.defineProperty(window, 'awwv', { configurable: true, value: bridge });
    return bridge;
}

afterEach(() => {
    cleanup();
    Object.defineProperty(window, 'awwv', { configurable: true, value: undefined });
});

describe('front visit, renewable', () => {
    it('never shows "exhausted" when there is no lifetime cap, only the cooldown', async () => {
        installIpc({
            available: false, reason: 'on_cooldown', firesLeft: null, maxFires: null,
            cooldownUntil: 60, onCooldown: true, reachableBranchIds: ['visit_sarajevo'], unreachableBranchIds: [],
        });
        render(React.createElement(FrontVisitSection));
        expect(await screen.findByText(/^On cooldown - available after /)).toBeTruthy();
        expect(screen.queryByText('No further visits available this war.')).toBeNull();
        expect(screen.queryByText(/visits remaining/)).toBeNull();
    });

    it('still counts down and runs out under a capped cadence', async () => {
        installIpc({
            available: false, reason: 'exhausted', firesLeft: 0, maxFires: 5,
            cooldownUntil: null, onCooldown: false, reachableBranchIds: ['visit_sarajevo'], unreachableBranchIds: [],
        });
        render(React.createElement(FrontVisitSection));
        expect(await screen.findByText('No further visits available this war.')).toBeTruthy();
    });
});
