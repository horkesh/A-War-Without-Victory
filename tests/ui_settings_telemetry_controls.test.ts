// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SettingsScreen } from '../src/ui/map/components/SettingsScreen';
import { createCrashDiagnosticsQueue } from '../src/ui/map/services/telemetry/telemetryQueue';

describe('SettingsScreen crash diagnostics controls', () => {
    afterEach(() => {
        cleanup();
        window.localStorage.clear();
    });

    it('renders diagnostics default-off with approved privacy copy', () => {
        render(createElement(SettingsScreen, { onClose: () => {} }));
        fireEvent.click(screen.getByRole('button', { name: 'Diagnostics' }));

        expect(screen.getByRole('button', { name: 'Share crash diagnostics' }).getAttribute('aria-pressed')).toBe('false');
        expect(screen.getByText(/Reports never include saves, scenario dumps, player notes, or local usernames/i)).toBeTruthy();
        expect(screen.getByText(/Local reports: 0/i)).toBeTruthy();
    });

    it('can enable, export, clear, and withdraw local crash reports offline', () => {
        render(createElement(SettingsScreen, { onClose: () => {} }));
        fireEvent.click(screen.getByRole('button', { name: 'Diagnostics' }));

        fireEvent.click(screen.getByRole('button', { name: 'Share crash diagnostics' }));
        const queue = createCrashDiagnosticsQueue({ storage: window.localStorage, sessionId: 'ui-test-session' });
        queue.recordCrash({
            appVersion: '0.9.6-alpha.1',
            platform: 'browser',
            osFamily: 'windows',
            uiSurface: 'settings',
            errorCategory: 'unhandled_error',
            stack: 'Error: UI crash at C:\\Users\\LocalUser\\save.json',
        });

        fireEvent.click(screen.getByRole('button', { name: 'Diagnostics' }));
        expect(screen.getByText(/Local reports: 1/i)).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Export local crash reports' }));
        const exported = screen.getByLabelText('Exported crash diagnostics JSON') as HTMLTextAreaElement;
        expect(exported.value).not.toBe('');
        expect(exported.value).not.toContain('LocalUser');

        fireEvent.click(screen.getByRole('button', { name: 'Clear local crash reports' }));
        expect(screen.getByText(/Local reports: 0/i)).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Share crash diagnostics' }));
        expect(screen.getByRole('button', { name: 'Share crash diagnostics' }).getAttribute('aria-pressed')).toBe('false');
    });
});
