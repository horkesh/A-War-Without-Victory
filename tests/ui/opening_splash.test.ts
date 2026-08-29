// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { OPENING_SPLASH_ART, OpeningSplash } from '../../src/ui/map/components/opening/OpeningSplash';

function renderSplash(onDismiss = vi.fn()) {
    render(createElement(OpeningSplash, {
        title: 'A War Without Victory',
        version: 'v0.9.9',
        actionLabel: 'Enter War Room',
        onDismiss,
    }));
    return onDismiss;
}

describe('OpeningSplash', () => {
    afterEach(cleanup);

    it('renders title and version as real text while keeping scene art decorative', () => {
        renderSplash();

        expect(screen.getByRole('heading', { name: 'A War Without Victory' })).toBeTruthy();
        expect(screen.getByText('v0.9.9')).toBeTruthy();
        const art = screen.getByTestId('opening-splash-art');
        expect(art.getAttribute('alt')).toBe('');
        expect(art.getAttribute('aria-hidden')).toBe('true');
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Enter War Room' }));
    });

    it.each([
        ['Enter', 'Enter'],
        ['Space', ' '],
        ['Escape', 'Escape'],
    ])('dismisses immediately with %s', (_label, key) => {
        const onDismiss = renderSplash();

        fireEvent.keyDown(window, { key });
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('dismisses by click and contains no forced timer', () => {
        const onDismiss = renderSplash();

        fireEvent.click(screen.getByRole('button', { name: 'Enter War Room' }));
        expect(onDismiss).toHaveBeenCalledTimes(1);
        const source = readFileSync('src/ui/map/components/opening/OpeningSplash.tsx', 'utf8');
        expect(source).toContain('assets/opening/opening_splash_neutral.webp');
        expect(source).not.toContain('game start.webp');
        expect(source).not.toContain('setTimeout');
    });

    it('renders the approved owner splash plate rather than the retired desk fallback', () => {
        renderSplash();

        const art = screen.getByTestId('opening-splash-art') as HTMLImageElement;
        expect(OPENING_SPLASH_ART).toContain('opening_splash_neutral');
        expect(OPENING_SPLASH_ART).not.toContain('hq_presidential_desk_1992');
        expect(art.getAttribute('src')).toBe(OPENING_SPLASH_ART);

        const source = readFileSync('src/ui/map/components/opening/OpeningSplash.tsx', 'utf8');
        expect(source).not.toContain('hq_presidential_desk_1992');
    });

    it('stays dismissable and readable when the splash plate fails to decode', () => {
        const onDismiss = renderSplash();

        fireEvent.error(screen.getByTestId('opening-splash-art'));

        expect(screen.getByRole('heading', { name: 'A War Without Victory' })).toBeTruthy();
        expect(screen.getByText('v0.9.9')).toBeTruthy();
        const dismiss = screen.getByRole('button', { name: 'Enter War Room' });
        expect((dismiss as HTMLButtonElement).disabled).toBe(false);
        fireEvent.click(dismiss);
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });
});
