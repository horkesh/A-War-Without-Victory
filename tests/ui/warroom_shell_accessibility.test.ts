// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { setLocale } from '../../src/ui/map/i18n';

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
        setLocale('en');
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
            'Army HQ',
            'Chronicle',
            'Faction',
            'War Map',
            'Advance',
        ]) {
            expect(within(toolbar).getByRole('button', { name: label })).toBeTruthy();
        }
    });

    it('renders localized BCS toolbar labels', () => {
        setLocale('bcs');
        storeState = {
            loadedGameState: {
                player_faction: 'RBiH',
                metadata: { date: 'April 1993' },
            },
        };

        renderShell();

        const toolbar = screen.getByRole('navigation', { name: 'Navigacija ratne sobe' });
        expect(toolbar).toBeTruthy();
        for (const label of [
            /Predsjedni/,
            /Komandna plo/,
            /Diplomatija/,
            /Obavje/,
            /tab armije/,
            /Hronika/,
            /Frakcija/,
            /Ratna karta/,
            /Naprijed/,
        ]) {
            expect(within(toolbar).getByRole('button', { name: label })).toBeTruthy();
        }
        expect(within(toolbar).queryByRole('button', { name: "President's Desk" })).toBeNull();
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
        expect(statusSource).toContain('id="warroom-priority-docket-panel"');
        expect(statusSource).toContain('data-testid="warroom-priority-docket-panel"');
        expect(statusSource).toContain('aria-controls="warroom-priority-docket-panel"');
        expect(statusSource).toContain('role="region"');
        expect(statusSource).toContain("aria-label={t('warroom.priorityDocketAria')}");
        expect(statusSource).toContain("if (category === 'command') return t('warroom.status.category.command')");
        expect(statusSource).toContain("if (category === 'counter_offer') return t('warroom.status.category.counterOffer')");
        expect(source).toMatch(/<svg[\s\S]*viewBox="0 0 100 100"[\s\S]*preserveAspectRatio="xMidYMid meet"/);
        expect(source).not.toContain('preserveAspectRatio="xMidYMid slice"');
    });

    it('renders the projected wall map as a physical staff-room object', () => {
        const source = readFileSync('src/ui/map/components/warroom/WarroomShellLayer.tsx', 'utf8');

        expect(source).toContain('data-testid="warroom-wall-map-paper"');
        expect(source).toContain('data-testid="warroom-wall-map-hanging-hardware"');
        expect(source).toContain('data-testid="warroom-wall-map-staff-marks"');
        expect(source).toContain('data-testid="warroom-wall-map-glare"');
        expect(source).toContain('perspective(700px) rotateX(0.8deg) rotateY(-1.1deg)');
        expect(source).toContain('feTurbulence');
        expect(source).toContain('warroom-wall-map-fold-grid');
    });

    it('opens command-surface cards into a Warroom-native Decision Room host, not generic Army HQ briefing', () => {
        const appSource = readFileSync('src/ui/map/App.tsx', 'utf8');
        const openCommandCategoryStart = appSource.indexOf('const openCommandCategory =');
        const openWarroomOverlayStart = appSource.indexOf('const openWarroomOverlay =', openCommandCategoryStart);
        const openCommandCategoryBody = appSource.slice(openCommandCategoryStart, openWarroomOverlayStart);

        expect(openCommandCategoryStart).toBeGreaterThan(-1);
        expect(openWarroomOverlayStart).toBeGreaterThan(openCommandCategoryStart);
        expect(openCommandCategoryBody).toContain('setWarroomDecisionRoomOpen(true)');
        expect(openCommandCategoryBody).not.toContain("openArmyHQTab(useGameStore.getState(), 'briefing')");
        expect(openCommandCategoryBody).not.toContain("setAppScreen('game')");
        expect(appSource).toContain('data-testid="warroom-decision-room-host"');
        expect(appSource).toContain('<PresidentialDecisionRoomPanel onNavigateTarget={reviewPreAdvanceTarget} />');
    });

    it('routes Warroom Diplomacy and Chronicle directly to their mature player-facing panels', () => {
        const appSource = readFileSync('src/ui/map/App.tsx', 'utf8');
        const openWarroomOverlayStart = appSource.indexOf('const openWarroomOverlay =');
        const escapeHandlerStart = appSource.indexOf('useEffect(() => {', openWarroomOverlayStart);
        const openWarroomOverlayBody = appSource.slice(openWarroomOverlayStart, escapeHandlerStart);
        const diplomacyBranch = openWarroomOverlayBody.slice(
            openWarroomOverlayBody.indexOf("if (surface === 'diplomacy')"),
            openWarroomOverlayBody.indexOf("if (surface === 'chronicle')"),
        );
        const fallbackOverlayStart = openWarroomOverlayBody.lastIndexOf([
            '    setWarroomDeskOpen(false);',
            '    setWarroomDecisionRoomOpen(false);',
            '    closeCommandStrip(false);',
            '    setWarroomOverlaySurface(surface);',
        ].join('\n'));
        const chronicleBranch = openWarroomOverlayBody.slice(
            openWarroomOverlayBody.indexOf("if (surface === 'chronicle')"),
            fallbackOverlayStart,
        );

        expect(openWarroomOverlayBody).toContain("if (surface === 'diplomacy')");
        expect(diplomacyBranch).toContain('setDiplomacyOpen(true)');
        expect(diplomacyBranch).not.toContain('setWarroomOverlaySurface(surface)');
        expect(openWarroomOverlayBody).toContain("if (surface === 'chronicle')");
        expect(chronicleBranch).toContain('setIsDecisionHistoryOpen(false)');
        expect(chronicleBranch).toContain('openChronicle(useGameStore.getState())');
        expect(chronicleBranch).not.toContain('setWarroomOverlaySurface(surface)');
    });
});
