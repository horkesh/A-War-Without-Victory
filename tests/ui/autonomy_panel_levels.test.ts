// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AutonomyPanel } from '../../src/ui/map/components/AutonomyPanel.js';

describe('AutonomyPanel levels', () => {
    afterEach(() => {
        cleanup();
        delete (window as Window & { awwv?: unknown }).awwv;
    });

    it('allows levels 2-3 and explains that a change applies next turn', async () => {
        const setAutonomyLevel = vi.fn(async () => ({ ok: true }));
        (window as Window & { awwv?: unknown }).awwv = {
            getAutonomyState: vi.fn(async () => ({ autonomy_level: 1 })),
            setAutonomyLevel,
        };

        render(React.createElement(AutonomyPanel, { onClose: vi.fn(), playerFaction: 'RBiH' }));
        await waitFor(() => expect(screen.getByRole('button', { name: /2 - Delegated/ })).toBeTruthy());
        expect(screen.getByTestId('autonomy-level-0')).toBeTruthy();
        expect(screen.getByTestId('autonomy-level-1')).toBeTruthy();
        expect(screen.getByTestId('autonomy-level-2')).toBeTruthy();
        expect(screen.getByTestId('autonomy-level-3')).toBeTruthy();
        expect(screen.getByText('Changes take effect at the start of the next turn.')).toBeTruthy();
        expect(screen.queryByText('soon')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: /2 - Delegated/ }));
        await waitFor(() => expect(setAutonomyLevel).toHaveBeenCalledWith(2));
    });
});
