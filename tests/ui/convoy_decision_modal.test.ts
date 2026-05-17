// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import type { PendingConvoyDecisionView } from '../../src/ui/map/data/types.js';
import { ConvoyDecisionModal } from '../../src/ui/map/components/ConvoyDecisionModal.js';

function makeConvoy(overrides: Partial<PendingConvoyDecisionView> = {}): PendingConvoyDecisionView {
    return {
        id: 'convoy_srebrenica_rs',
        target_enclave: 'Srebrenica',
        route_faction: 'RS',
        supply_amount: 25,
        ...overrides,
    };
}

describe('ConvoyDecisionModal', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders nothing without a selected convoy', () => {
        const { container } = render(createElement(ConvoyDecisionModal, {
            convoy: null,
            onClose: vi.fn(),
            onDecide: vi.fn(),
        }));

        expect(container.textContent).toBe('');
    });

    it('renders all convoy decision buttons for a pending convoy', () => {
        render(createElement(ConvoyDecisionModal, {
            convoy: makeConvoy(),
            onClose: vi.fn(),
            onDecide: vi.fn(),
        }));

        expect(screen.getByText('Humanitarian Convoy')).toBeTruthy();
        expect(screen.getByText(/Srebrenica/i)).toBeTruthy();
        expect(screen.getByRole('button', { name: /allow convoy/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /block convoy/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /divert convoy/i })).toBeTruthy();
    });

    it('submits a decision and closes after success', async () => {
        const onClose = vi.fn();
        const onDecide = vi.fn(async () => ({ ok: true }));

        render(createElement(ConvoyDecisionModal, {
            convoy: makeConvoy(),
            onClose,
            onDecide,
        }));

        fireEvent.click(screen.getByRole('button', { name: /allow convoy/i }));

        await waitFor(() => {
            expect(onDecide).toHaveBeenCalledWith('convoy_srebrenica_rs', 'allow');
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    it('disables the already staged decision and surfaces failed staging', async () => {
        const onClose = vi.fn();
        const onDecide = vi.fn(async () => ({ ok: false, error: 'Desktop bridge unavailable.' }));

        render(createElement(ConvoyDecisionModal, {
            convoy: makeConvoy({ decision: 'block' }),
            onClose,
            onDecide,
        }));

        expect(screen.getByRole('button', { name: /block convoy/i }).hasAttribute('disabled')).toBe(true);

        fireEvent.click(screen.getByRole('button', { name: /divert convoy/i }));

        await screen.findByText('Desktop bridge unavailable.');
        expect(onClose).not.toHaveBeenCalled();
    });
});
