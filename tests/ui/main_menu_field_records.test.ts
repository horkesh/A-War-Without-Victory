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

        fireEvent.click(screen.getByRole('button', { name: 'Assume responsibility' }));
        fireEvent.click(screen.getByRole('button', { name: 'Field Records' }));
        expect(await screen.findByText('quicksave')).toBeTruthy();
        expect(screen.getByText(/Week 12/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /Resume quicksave/i }));

        await waitFor(() => expect(loadSaveRecord).toHaveBeenCalledWith('quicksave.json'));
        expect(onLoadGame).toHaveBeenCalledWith('{"meta":{"turn":12}}');
    });

    it.each(['RBiH', 'RS', 'HRHB'])('imports %s through the canonical desktop dialog result', async (faction) => {
        const stateJson = JSON.stringify({ meta: { turn: 39, player_faction: faction } });
        const onLoadGame = vi.fn();
        const loadStateDialog = vi.fn(async () => ({ ok: true, stateJson }));
        (window as Window & { awwv?: unknown }).awwv = {
            listSaveRecords: vi.fn(async () => ({ ok: true, records: [] })),
            loadStateDialog,
        };
        render(createElement(MainMenu, {
            hasSave: false,
            onNewGame: vi.fn(),
            onContinue: vi.fn(),
            onLoadGame,
            onSettings: vi.fn(),
            onCredits: vi.fn(),
            onQuit: vi.fn(),
        }));

        fireEvent.click(screen.getByRole('button', { name: 'Assume responsibility' }));
        fireEvent.click(screen.getByRole('button', { name: 'Field Records' }));
        const importButton = screen.getByRole('button', { name: /Import file/i });
        fireEvent.click(importButton);
        fireEvent.click(importButton);

        await waitFor(() => expect(loadStateDialog).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(onLoadGame).toHaveBeenCalledWith(stateJson));
    });

    it.each([
        { ok: false, error: 'Canceled' },
        { ok: false, error: 'Bad save' },
        { ok: true },
    ])('keeps the Main Menu open when desktop import does not return canonical state: %j', async (result) => {
        const onLoadGame = vi.fn();
        (window as Window & { awwv?: unknown }).awwv = {
            listSaveRecords: vi.fn(async () => ({ ok: true, records: [] })),
            loadStateDialog: vi.fn(async () => result),
        };
        render(createElement(MainMenu, {
            hasSave: false,
            onNewGame: vi.fn(),
            onContinue: vi.fn(),
            onLoadGame,
            onSettings: vi.fn(),
            onCredits: vi.fn(),
            onQuit: vi.fn(),
        }));
        fireEvent.click(screen.getByRole('button', { name: 'Assume responsibility' }));
        fireEvent.click(screen.getByRole('button', { name: 'Field Records' }));
        fireEvent.click(screen.getByRole('button', { name: /Import file/i }));

        expect(await screen.findByRole('alert')).toBeTruthy();
        expect(onLoadGame).not.toHaveBeenCalled();
    });

    it('retains the exact FileReader import path in browser mode', async () => {
        const onLoadGame = vi.fn();
        render(createElement(MainMenu, {
            hasSave: false,
            onNewGame: vi.fn(),
            onContinue: vi.fn(),
            onLoadGame,
            onSettings: vi.fn(),
            onCredits: vi.fn(),
            onQuit: vi.fn(),
        }));
        fireEvent.click(screen.getByRole('button', { name: 'Assume responsibility' }));
        fireEvent.click(screen.getByRole('button', { name: 'Field Records' }));
        const input = screen.getByLabelText('Load save file') as HTMLInputElement;
        const bytes = '{"meta":{"turn":39,"player_faction":"RBiH"},"sentinel":"browser-fallback"}';
        fireEvent.change(input, { target: { files: [new File([bytes], 'resume.json', { type: 'application/json' })] } });
        await waitFor(() => expect(onLoadGame).toHaveBeenCalledWith(JSON.parse(bytes)));
    });
});
