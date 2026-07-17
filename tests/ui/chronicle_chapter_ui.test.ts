// @vitest-environment jsdom

import React, { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ChronicleViewModeToggle } from '../../src/ui/map/components/chronicle/ChronicleOverlay.js';
import { setLocale } from '../../src/ui/map/i18n';

afterEach(() => {
    cleanup();
    setLocale('en');
});

describe('Chronicle chapter UI controls', () => {
    it('defaults to contained vertical Chapters and scopes horizontal behavior to Entries', () => {
        const source = readFileSync('src/ui/map/components/chronicle/ChronicleOverlay.tsx', 'utf8');

        expect(source).toContain("useState<ChronicleViewMode>('chapters')");
        expect(source).toContain("viewMode === 'entries' ? 'overflow-x-auto overflow-y-hidden' : 'overflow-x-hidden overflow-y-auto'");
        expect(source).toContain('className="flex-1 flex min-h-0 min-w-0"');
        expect(source).toContain("className=\"fixed inset-0 overflow-hidden bg-[#090a0f] flex flex-col\"");
        expect(source).toContain("if (!el || !open || viewMode !== 'entries') return;");
        expect(source).toContain("{viewMode === 'entries' && allEntries.length > 0 && (");
    });

    it('switches between entry list and chapter view without changing the active filter label', () => {
        let mode: 'entries' | 'chapters' = 'entries';
        const { rerender } = render(createElement(ChronicleViewModeToggle, {
            mode,
            activeFilterLabel: 'Cost',
            chapterCount: 2,
            onModeChange: (next: 'entries' | 'chapters') => { mode = next; },
        }));

        expect(screen.getByText('Lens: Cost')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /Chapters/i }));

        rerender(createElement(ChronicleViewModeToggle, {
            mode,
            activeFilterLabel: 'Cost',
            chapterCount: 2,
            onModeChange: (next: 'entries' | 'chapters') => { mode = next; },
        }));

        expect(screen.getByText('Lens: Cost')).toBeTruthy();
        expect(screen.getByRole('button', { name: /Chapters/i }).getAttribute('aria-pressed')).toBe('true');
    });

    it('localizes Chronicle review controls in BCS mode', () => {
        setLocale('bcs');

        render(createElement(ChronicleViewModeToggle, {
            mode: 'entries',
            activeFilterLabel: 'Cijena',
            chapterCount: 2,
            onModeChange: () => {},
        }));

        expect(screen.getByRole('button', { name: 'Zapisi' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Poglavlja' })).toBeTruthy();
        expect(screen.getByText('Fokus: Cijena')).toBeTruthy();
        expect(screen.getByText('2 poglavlja')).toBeTruthy();
    });
});
