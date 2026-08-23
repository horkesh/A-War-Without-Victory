// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { MainMenu } from '../../src/ui/map/components/MainMenu';
import { setLocale } from '../../src/ui/map/i18n';

describe('MainMenu Field Records', () => {
    beforeEach(() => {
        setLocale('en');
        window.localStorage.clear();
    });

    afterEach(() => {
        cleanup();
        delete (window as Window & { awwv?: unknown }).awwv;
        window.localStorage.clear();
        setLocale('en');
    });

    it('lists desktop records and loads the selected record through its safe filename', async () => {
        const onLoadGame = vi.fn();
        const listSaveRecords = vi.fn(async () => ({
            ok: true,
            records: [
                { filename: 'quicksave.json', turn: 12, faction: 'RS', modifiedAtMs: 2000 },
                { filename: 'autosave.json', turn: 8, faction: 'RBiH', modifiedAtMs: 1000 },
            ],
        }));
        const loadSaveRecord = vi.fn(async () => ({ ok: true, stateJson: '{"meta":{"turn":12}}' }));
        (window as Window & { awwv?: unknown }).awwv = { listSaveRecords, loadSaveRecord };

        render(createElement(MainMenu, {
            hasSave: true,
            onNewGame: vi.fn(),
            onContinue: vi.fn(),
            onLoadGame,
            onSettings: vi.fn(),
            onCredits: vi.fn(),
            onQuit: vi.fn(),
        }));

        fireEvent.click(screen.getByRole('button', { name: 'Field Records' }));
        expect(await screen.findByText('quicksave')).toBeTruthy();
        expect(screen.getByText(/Week 12/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /Resume quicksave/i }));

        await waitFor(() => expect(loadSaveRecord).toHaveBeenCalledWith('quicksave.json'));
        expect(onLoadGame).toHaveBeenCalledWith('{"meta":{"turn":12}}');
    });
});
