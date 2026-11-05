// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { WrappedOverlay } from '../../src/ui/map/components/chronicle/WrappedOverlay.js';
import { setLocale } from '../../src/ui/map/i18n';

interface StoreState {
    wrappedOpen: boolean;
    loadedGameState: { player_faction: string } | null;
    setWrappedOpen: (open: boolean) => void;
}

let storeState: StoreState;

vi.mock('../../src/ui/map/store/gameStore', () => ({
    useGameStore: Object.assign(
        (selector: (state: StoreState) => unknown) => selector(storeState),
        { getState: () => storeState },
    ),
}));

vi.mock('../../src/ui/map/components/chronicle/generateWrappedSlides.js', () => ({
    generateWrappedSlides: () => [
        { id: 'slide_one', title: 'Slide One', subtitle: 'First deterministic slide' },
        { id: 'slide_two', title: 'Slide Two', subtitle: 'Second deterministic slide' },
        { id: 'slide_three', title: 'Slide Three', subtitle: 'Third deterministic slide' },
    ],
}));

const PREVIOUS_LABEL = 'Previous campaign wrapped slide';
const NEXT_LABEL = 'Next campaign wrapped slide';

function makeRect(left: number, width: number): DOMRect {
    return {
        x: left,
        y: 0,
        left,
        top: 0,
        right: left + width,
        bottom: 1000,
        width,
        height: 1000,
        toJSON: () => ({}),
    };
}

function clickAt(button: HTMLElement, rect: DOMRect, clientX: number): void {
    button.getBoundingClientRect = () => rect;
    fireEvent.click(button, { clientX, clientY: 500 });
}

const PREVIOUS_RECT = makeRect(0, 500);
const NEXT_RECT = makeRect(500, 500);
const PREVIOUS_COORDINATES = [1, 250, 499];
const NEXT_COORDINATES = [501, 750, 999];

function renderOverlay(): void {
    render(createElement(WrappedOverlay));
}

function expectSlide(label: string): void {
    expect(screen.getByText((_content, element) => {
        if (!element) return false;
        return element.childElementCount === 0
            && element.textContent?.replace(/\s+/g, ' ').trim() === label;
    })).toBeTruthy();
}

describe('WrappedOverlay labeled navigation controls', () => {
    beforeEach(() => {
        setLocale('en');
        storeState = {
            wrappedOpen: true,
            loadedGameState: { player_faction: 'RBiH' },
            setWrappedOpen: (open: boolean) => {
                storeState.wrappedOpen = open;
            },
        };
    });

    afterEach(() => {
        cleanup();
    });

    it('Previous always means backward at center and both edge coordinates', () => {
        for (const clientX of PREVIOUS_COORDINATES) {
            renderOverlay();
            clickAt(screen.getByRole('button', { name: NEXT_LABEL }), NEXT_RECT, 750);
            expectSlide('2 / 3');
            clickAt(screen.getByRole('button', { name: PREVIOUS_LABEL }), PREVIOUS_RECT, clientX);
            expectSlide('1 / 3');
            cleanup();
        }
    });

    it('Next always means forward at center and both edge coordinates', () => {
        for (const clientX of NEXT_COORDINATES) {
            renderOverlay();
            clickAt(screen.getByRole('button', { name: NEXT_LABEL }), NEXT_RECT, clientX);
            expectSlide('2 / 3');
            cleanup();
        }
    });

    it('Previous clamps at the first slide regardless of click coordinate', () => {
        for (const clientX of PREVIOUS_COORDINATES) {
            renderOverlay();
            clickAt(screen.getByRole('button', { name: PREVIOUS_LABEL }), PREVIOUS_RECT, clientX);
            expectSlide('1 / 3');
            cleanup();
        }
    });

    it('Next clamps at the last slide regardless of click coordinate', () => {
        for (const clientX of NEXT_COORDINATES) {
            renderOverlay();
            const next = screen.getByRole('button', { name: NEXT_LABEL });
            clickAt(next, NEXT_RECT, 750);
            clickAt(next, NEXT_RECT, 750);
            expectSlide('3 / 3');
            clickAt(next, NEXT_RECT, clientX);
            expectSlide('3 / 3');
            cleanup();
        }
    });

    it('keeps ordinary ArrowRight/ArrowLeft and Escape close behavior', () => {
        renderOverlay();
        fireEvent.keyDown(window, { key: 'ArrowRight' });
        expectSlide('2 / 3');
        fireEvent.keyDown(window, { key: 'ArrowLeft' });
        expectSlide('1 / 3');
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(storeState.wrappedOpen).toBe(false);
    });

    it('keeps the final-slide Close control', () => {
        renderOverlay();
        const next = screen.getByRole('button', { name: NEXT_LABEL });
        clickAt(next, NEXT_RECT, 750);
        clickAt(next, NEXT_RECT, 750);
        expectSlide('3 / 3');
        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(storeState.wrappedOpen).toBe(false);
    });
});
