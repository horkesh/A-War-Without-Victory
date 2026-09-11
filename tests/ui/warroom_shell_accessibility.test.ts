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

    it('writes the Warroom date in the bundled marker hand, sized to the board', () => {
        // A DELIBERATE REVERSAL, and the rationale belongs here because this test is the memory of
        // it. This assertion used to REQUIRE `var(--font-data)` — IBM Plex Mono. That was the last
        // step of a seven-commit retreat: the date was authored as handwriting, depended on
        // `Segoe Print` (a Windows-only system font absent from many SKUs and from the capture
        // rig), silently rendered as Arial, and was replaced with something guaranteed. Monospace
        // is the most machine-like class available, and the owner's complaint was that the date
        // "is too artificial".
        //
        // The fix was not styling: no handwriting face was bundled at all. One is now, so the
        // requirement flips from "the UI data font" to "the bundled marker font".
        const source = readFileSync('src/ui/map/components/warroom/WarroomShellLayer.tsx', 'utf8');
        const css = readFileSync('src/ui/map/styles/globals.css', 'utf8');

        // The bare id, not `data-testid="..."`: the attribute is now applied through a `testId`
        // prop on the shared MarkerLine, since the live date and its ghost are the same component.
        expect(source).toContain('"warroom-date-board-label"');
        expect(source).toContain("fontFamily: 'var(--font-marker)'");
        expect(source).not.toContain("textOverflow: 'ellipsis'");

        // Scoped to the date, not the file. `var(--font-data)` is correct everywhere else in this
        // component — the toolbar and status dock are interface and should stay interface. The
        // claim is only that the WRITING ON THE BOARD is no longer a UI font.
        const markerStart = source.indexOf('function MarkerLine');
        const markerEnd = source.indexOf('function WarroomHotspot');
        expect(markerStart).toBeGreaterThan(-1);
        expect(markerEnd).toBeGreaterThan(markerStart);
        expect(source.slice(markerStart, markerEnd)).not.toContain("fontFamily: 'var(--font-data)'");

        // STILL FORBIDDEN, and this half does not flip. Depending on a system handwriting face is
        // the defect that started the whole retreat, so a bundled font replaces it — it does not
        // license reaching for `cursive` again as a fallback.
        expect(source).not.toContain('Comic Sans MS');
        expect(source).not.toContain('Segoe Print');
        expect(source).not.toMatch(/font-family:[^;}]*cursive/i);
        expect(css).not.toMatch(/--font-marker:[^;]*cursive/i);

        // The old ban was on `vw` in this fontSize, and its intent was right: the text tracked the
        // VIEWPORT while the board tracks the PLATE, and the plate letterboxes independently on
        // both axes. The intent is now stated positively — sizing must track the board — and the
        // component must not pin a fontSize at all, because doing so inline would beat the
        // stylesheet and make the no-container-queries fallback unreachable.
        expect(source.slice(markerStart, markerEnd)).not.toMatch(/fontSize:\s*['"]/);
        expect(source).toContain('--warroom-marker-size-cq');
        expect(source).toContain('--warroom-marker-size-fallback');
        expect(css).toMatch(/\.warroom-date-board\s*{[^}]*container-type:\s*inline-size/s);
        expect(css).toMatch(/@supports\s*\(container-type:\s*inline-size\)/);
        // The fallback path still has to track the plate rather than the viewport alone: the
        // component emits `min(<n>vw, <n>vh)`, which is the plate's own min() in miniature.
        expect(source).toMatch(/min\(\$\{[^}]+\}vw,\s*\$\{[^}]+\}vh\)/);
    });

    it('paints the date as ink on the board, with nothing behind it', () => {
        // The acceptance criterion is "no element of it has a background, border or shadow of its
        // own". A stroke of marker is ink ON the board; anything behind it is a UI label sitting
        // IN FRONT of the board, which is precisely what read as artificial.
        const source = readFileSync('src/ui/map/components/warroom/WarroomShellLayer.tsx', 'utf8');
        const start = source.indexOf('function MarkerLine');
        const end = source.indexOf('function WarroomHotspot');
        expect(start).toBeGreaterThan(-1);
        expect(end).toBeGreaterThan(start);
        const dateSection = source.slice(start, end);

        expect(dateSection).not.toMatch(/background:\s*['"]rgba?\(/);
        expect(dateSection).not.toMatch(/border:\s*['"][^'"]*px/);
        expect(dateSection).not.toMatch(/boxShadow:\s*['"][^'"]*px/);
        expect(dateSection).toContain("background: 'none'");
        expect(dateSection).toContain("border: 'none'");
        expect(dateSection).toContain("boxShadow: 'none'");

        // Left-anchored, not centred. Writing starts at the left edge of the space; `center` is
        // where a layout engine puts a label.
        expect(dateSection).toContain("justifyContent: 'flex-start'");
        expect(dateSection).not.toContain("justifyContent: 'center'");
    });

    it('keeps the Warroom dock and projected map attached to the scene plate', () => {
        const source = readFileSync('src/ui/map/components/warroom/WarroomShellLayer.tsx', 'utf8');
        const appSource = readFileSync('src/ui/map/App.tsx', 'utf8');
        const statusSource = readFileSync('src/ui/map/components/warroom/WarroomStatusBar.tsx', 'utf8');
        const sceneFrameIndex = source.indexOf('<WarroomScenePlate src={scenePlateUrl}>');
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
        expect(appSource).toMatch(
            /<PresidentialDecisionRoomPanel[\s\S]*onNavigateTarget=\{reviewPreAdvanceTarget\}[\s\S]*onInspectFieldPlan=\{inspectFieldOperationPlanFromDossier\}/,
        );
    });

    it('keeps Warroom-hosted Decision Room review text readable over the staff-room background', () => {
        const appSource = readFileSync('src/ui/map/App.tsx', 'utf8');
        const panelSource = readFileSync('src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx', 'utf8');

        expect(appSource).toContain('bg-[#0f131a]/98');
        expect(appSource).not.toContain('bg-panel-bg/96');
        expect(panelSource).toContain('bg-[#121820]/95');
        expect(panelSource).not.toContain('bg-panel-card/55');
        expect(panelSource).not.toContain('max-h-8 overflow-hidden text-[10px]');
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
        expect(chronicleBranch).not.toContain('setIsDecisionHistoryOpen');
        expect(chronicleBranch).toContain('openChronicle(useGameStore.getState())');
        expect(chronicleBranch).not.toContain('setWarroomOverlaySurface(surface)');
    });
});
