// @vitest-environment jsdom

import React, { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ChronicleViewModeToggle } from '../../src/ui/map/components/chronicle/ChronicleOverlay.js';

afterEach(() => cleanup());

describe('Chronicle chapter UI controls', () => {
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
});
