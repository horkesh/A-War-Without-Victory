// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { SettingsScreen } from '../../src/ui/map/components/SettingsScreen';

describe('SettingsScreen shell cleanup', () => {
    afterEach(() => {
        cleanup();
        window.localStorage.clear();
        document.documentElement.className = '';
        document.documentElement.removeAttribute('data-cb-preset');
    });

    it('does not expose dead local-only settings controls', () => {
        render(createElement(SettingsScreen, { onClose: () => {} }));

        expect(screen.queryByRole('button', { name: 'Display' })).toBeNull();
        expect(screen.queryByText('Turn Confirmation')).toBeNull();
        expect(screen.queryByText('Fog of War')).toBeNull();
        expect(screen.queryByRole('combobox', { name: 'Map quality' })).toBeNull();
    });

    it('keeps only settings backed by existing UI substrates visible in the shell', () => {
        render(createElement(SettingsScreen, { onClose: () => {} }));

        expect(screen.getByRole('button', { name: 'Audio' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Accessibility' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Language' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Diagnostics' })).toBeTruthy();
    });
});
