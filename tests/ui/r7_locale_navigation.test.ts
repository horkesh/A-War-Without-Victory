// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MainMenu } from '../../src/ui/map/components/MainMenu';
import { PeaceWarTransition } from '../../src/ui/map/components/PeaceWarTransition';
import { WarHasBegunSplash } from '../../src/ui/map/components/WarHasBegunSplash';
import { setLocale, setQaLocale, type RuntimeLocale } from '../../src/ui/map/i18n';

const noop = () => undefined;

describe('locale-independent foundational navigation selectors', () => {
    afterEach(() => {
        cleanup();
        setLocale('en');
        vi.useRealTimers();
    });

    for (const locale of ['en', 'bs', 'qps'] as const satisfies readonly RuntimeLocale[]) {
        it(`executes the menu and intro route in ${locale} without matching copy`, () => {
            if (locale === 'qps') setQaLocale(locale);
            else setLocale(locale);

            const start = vi.fn();
            render(createElement(MainMenu, {
                hasSave: false,
                onNewGame: start,
                onContinue: noop,
                onLoadGame: noop,
                onSettings: noop,
                onCredits: noop,
                onQuit: noop,
            }));
            fireEvent.click(screen.getByTestId('main-menu-faction-RBiH'));
            expect(start).toHaveBeenCalledWith('RBiH');
            cleanup();

            vi.useFakeTimers();
            const acknowledge = vi.fn();
            render(createElement(WarHasBegunSplash, { onDismiss: acknowledge, holdMs: 60_000 }));
            fireEvent.click(screen.getByTestId('war-start-splash-acknowledge'));
            expect(screen.getByTestId('war-start-splash')).toBeTruthy();
            vi.advanceTimersByTime(800);
            expect(acknowledge).toHaveBeenCalledOnce();
            cleanup();
            vi.useRealTimers();

            const begin = vi.fn();
            render(createElement(PeaceWarTransition, {
                onDismiss: begin,
                state: {
                    turn: 0,
                    phase: 'war',
                    player_faction: 'RBiH',
                    formations: [],
                    metadata: { date: '6 Apr 1992' },
                } as never,
            }));
            fireEvent.click(screen.getByTestId('peace-war-briefing-begin'));
            expect(begin).toHaveBeenCalledOnce();
        });
    }
});
