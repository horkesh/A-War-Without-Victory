// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';

let storeState: Record<string, any> = { loadedGameState: null };

vi.mock('../../src/ui/map/store/gameStore', () => ({
    useGameStore: Object.assign(
        (selector: (state: any) => any) => selector(storeState),
        {
            getState: () => storeState,
            setState: (partial: any) => { Object.assign(storeState, partial); },
            subscribe: () => () => {},
        },
    ),
}));

// @ts-expect-error TS1378: top-level await is supported by vitest runtime.
const { WarroomShellLayer, getWarroomBoardDateLabel } = await import('../../src/ui/map/components/warroom/WarroomShellLayer');

function renderShell(onNavigate = vi.fn(), onOpenSidePicker = vi.fn()) {
    return {
        onNavigate,
        onOpenSidePicker,
        ...render(createElement(WarroomShellLayer, { onNavigate, onOpenSidePicker })),
    };
}

describe('WarroomShellLayer accessibility proof', () => {
    beforeEach(() => {
        storeState = { loadedGameState: null };
        vi.stubGlobal('fetch', vi.fn(async () => ({
            ok: false,
            json: async () => ({}),
        })));
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('exposes hotspots as keyboard-focusable buttons with stable labels', () => {
        storeState = {
            loadedGameState: {
                player_faction: 'RBiH',
                metadata: { date: 'April 1993' },
            },
        };

        renderShell();

        expect(screen.getByRole('button', { name: 'Faction Overview' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Command Briefing' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'News & Press' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Calendar' })).toBeTruthy();
    });

    it('renders the Warroom-only toolbar with the accepted IA entries', () => {
        storeState = {
            loadedGameState: {
                player_faction: 'RBiH',
                metadata: { date: 'April 1993' },
            },
        };

        renderShell();

        const toolbar = screen.getByRole('navigation', { name: 'Warroom navigation' });
        expect(toolbar).toBeTruthy();
        for (const label of [
            "President's Desk",
            'Command Surface',
            'Diplomacy',
            'Intelligence',
            'Staff',
            'Chronicle',
            'Faction',
            'War Map',
            'Advance',
        ]) {
            expect(within(toolbar).getByRole('button', { name: label })).toBeTruthy();
        }
    });

    it('activates mapped hotspots with Enter and Space', () => {
        storeState = {
            loadedGameState: {
                player_faction: 'RBiH',
                metadata: { date: 'April 1993' },
            },
        };

        const { onNavigate } = renderShell();

        fireEvent.keyDown(screen.getByRole('button', { name: 'Faction Overview' }), { key: 'Enter' });
        fireEvent.keyDown(screen.getByRole('button', { name: 'News & Press' }), { key: ' ' });

        expect(onNavigate).toHaveBeenNthCalledWith(1, { kind: 'warroom-overlay', surface: 'faction' });
        expect(onNavigate).toHaveBeenNthCalledWith(2, { kind: 'warroom-overlay', surface: 'chronicle' });
    });

    it('announces the unavailable state through a live status region', () => {
        renderShell();

        const status = screen.getByRole('status');
        expect(status.textContent).toContain('Warroom unavailable until a campaign side is selected.');
    });

    it('offers a no-state side picker CTA', () => {
        const { onOpenSidePicker } = renderShell();

        const button = screen.getByRole('button', { name: /choose side|open side picker/i });
        fireEvent.click(button);

        expect(button.textContent).toMatch(/choose side|open side picker/i);
        expect(onOpenSidePicker).toHaveBeenCalledTimes(1);
    });

    it('renders a visible hotspot label on hover and keyboard focus', () => {
        storeState = {
            loadedGameState: {
                player_faction: 'RBiH',
                metadata: { date: 'April 1993' },
            },
        };

        renderShell();

        const calendar = screen.getByRole('button', { name: 'Calendar' });
        expect(screen.queryByText('Calendar')).toBeNull();

        fireEvent.mouseEnter(calendar);
        expect(screen.getByText('Calendar')).toBeTruthy();

        fireEvent.mouseLeave(calendar);
        expect(screen.queryByText('Calendar')).toBeNull();

        fireEvent.focus(calendar);
        expect(screen.getByText('Calendar')).toBeTruthy();
    });

    it('loads canonical /data/ui clickable regions and maps desk_map to the game view', async () => {
        storeState = {
            loadedGameState: {
                player_faction: 'RBiH',
                metadata: { date: 'April 1993' },
            },
        };
        vi.stubGlobal('fetch', vi.fn(async () => ({
            ok: true,
            json: async () => ({
                regions: [
                    {
                        id: 'desk_map',
                        bounds: { x: 854, y: 576, width: 602, height: 325 },
                        polygon: [
                            [854, 584],
                            [1456, 576],
                            [1454, 896],
                            [854, 901],
                        ],
                        tooltip: 'Operational Map',
                    },
                ],
            }),
        })));

        const { onNavigate } = renderShell();

        const mapButton = await screen.findByRole('button', { name: 'Operational Map' });
        fireEvent.click(mapButton);

        expect(fetch).toHaveBeenCalledWith('/data/ui/hq_rbih_clickable_regions.json');
        expect(onNavigate).toHaveBeenCalledWith({ kind: 'war-map' });
    });

    it('formats Warroom calendar labels as full dates when metadata is partial', () => {
        expect(getWarroomBoardDateLabel({
            turn: 188,
            metadata: { turn: 188, date: '8 Nov' },
            label: 'Turn 188',
        })).toMatch(/\d{1,2} \w{3} 1995/);
        expect(getWarroomBoardDateLabel({
            turn: 52,
            metadata: { turn: 52, date: 'April 1993' },
            label: 'Turn 52',
        })).toMatch(/\d{1,2} \w{3} 1993/);
    });

    it('renders the Warroom calendar without Comic Sans fallback or ellipsis truncation', () => {
        const source = readFileSync('src/ui/map/components/warroom/WarroomShellLayer.tsx', 'utf8');
        expect(source).not.toContain('Comic Sans MS');
        expect(source).not.toContain('Segoe Print');
        expect(source).not.toContain("textOverflow: 'ellipsis'");
        expect(source).not.toMatch(/fontSize:\s*['"][^'"]*vw/i);
        expect(source).toContain('data-testid="warroom-date-board-label"');
        expect(source).toContain('fontFamily: \'"IBM Plex Sans Condensed", "Segoe UI", Arial, sans-serif\'');
    });

    it('keeps the Warroom dock and projected map attached to the scene plate', () => {
        const source = readFileSync('src/ui/map/components/warroom/WarroomShellLayer.tsx', 'utf8');
        const appSource = readFileSync('src/ui/map/App.tsx', 'utf8');
        const statusSource = readFileSync('src/ui/map/components/warroom/WarroomStatusBar.tsx', 'utf8');
        const sceneFrameIndex = source.indexOf('aspectRatio: `${CANVAS_ASPECT}`');
        const toolbarRenderIndex = source.indexOf('<WarroomToolbar onNavigate={onNavigate} />');
        const statusDockRenderIndex = source.indexOf('{statusDock}');
        const projectedMapIndex = source.indexOf('<WarroomProjectedMap');

        expect(sceneFrameIndex).toBeGreaterThan(0);
        expect(toolbarRenderIndex).toBeGreaterThan(sceneFrameIndex);
        expect(statusDockRenderIndex).toBeGreaterThan(toolbarRenderIndex);
        expect(projectedMapIndex).toBeGreaterThan(statusDockRenderIndex);
        expect(appSource).toContain('statusDock={(');
        expect(statusSource).not.toContain('className="fixed ');
        expect(statusSource).not.toContain("t('warroom.advance')");
        expect(source).toContain('<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"');
        expect(source).not.toContain('preserveAspectRatio="xMidYMid slice"');
    });
});
