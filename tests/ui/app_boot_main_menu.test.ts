/**
 * Task #80 - boot-to-Main-Menu contract (source-assertion tests).
 *
 * The intrusive "CHOOSE YOUR FACTION" modal used to auto-pop on every launch
 * because (a) `appScreen` defaulted to 'game' so boot skipped the Main Menu,
 * and (b) a useEffect force-opened the SidePicker whenever no save was loaded.
 *
 * OWNER DECISION: boot lands on the Main Menu first; New Game side selection is
 * inline on the menu/splash surface. The old SidePicker modal must not be the
 * New Game path.
 *
 * App.tsx pulls in IPC, the Zustand store, and heavy map chrome, so there is no
 * full-mount harness. We assert on the App.tsx source the same way
 * `warroom_shell_ownership.test.ts` does, pinning the boot contract.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

function read(path: string): string {
    return readFileSync(path, 'utf8');
}

describe('App boot - Main Menu first, faction choice menu-only (#80)', () => {
    const app = read('src/ui/map/App.tsx');

    it("defaults the boot screen to the Main Menu, not straight into the game", () => {
        expect(app).toContain(
            "useState<'game' | 'mainMenu' | 'warroom'>('mainMenu')",
        );
        expect(app).not.toContain(
            "useState<'game' | 'mainMenu' | 'warroom'>('game')",
        );
    });

    it('renders the Main Menu (New Game / Load / Continue) when on the mainMenu screen', () => {
        expect(app).toContain("{appScreen === 'mainMenu' && (");
        expect(app).toContain('<MainMenu');
        expect(app).toContain('onNewGame={');
        expect(app).toContain('onLoadGame={');
        expect(app).toContain('onContinue={');
    });

    it('does NOT auto-open the SidePicker when no save is loaded', () => {
        expect(app).not.toContain('if (!sidePickerDismissed) {\n      setSidePickerOpen(true);');
        expect(app).not.toContain('Show side picker automatically');
    });

    it('still closes the SidePicker once a save/state loads', () => {
        expect(app).toContain('if (loadedGameState) {');
        expect(app).toContain('setSidePickerOpen(false);');
    });

    it('gates the SidePicker on sidePickerOpen alone for non-menu legacy paths', () => {
        expect(app).toContain('isOpen={sidePickerOpen}');
        expect(app).not.toContain('isOpen={sidePickerOpen && !loadedGameState}');
    });

    it('does not open the SidePicker modal from Main Menu New Game or Load', () => {
        expect(app).toContain('onNewGame={(faction) => void handleSelectFaction(faction)}');
        expect(app).toContain('onLoadGame={(json) => void handleMainMenuLoadGame(json)}');
        expect(app).not.toContain("onNewGame={() => { setAppScreen('game'); setSidePickerOpen(true); }}");
        expect(app).not.toContain("onLoadGame={() => { setAppScreen('game'); setSidePickerOpen(true); }}");
        expect(app).not.toContain('clearLoadedGameState');
    });

    it('renders faction choices inline on the Main Menu', () => {
        const menu = read('src/ui/map/components/MainMenu.tsx');
        expect(menu).toContain("const FACTIONS: StartNewCampaignPayload['playerFaction'][] = ['RBiH', 'RS', 'HRHB'];");
        expect(menu).toContain('onClick={() => onNewGame(faction)}');
        expect(menu).not.toContain('<Modal');
    });

    it('enters the game only after a campaign side successfully starts', () => {
        const startIdx = app.indexOf('const handleSelectFaction = async');
        const okIdx = app.indexOf('if (ok) {', startIdx);
        const routeIdx = app.indexOf("setAppScreen('game');", okIdx);
        expect(startIdx).toBeGreaterThan(-1);
        expect(okIdx).toBeGreaterThan(startIdx);
        expect(routeIdx).toBeGreaterThan(okIdx);
    });

    it('keeps Continue gated on a loaded save (does not clear it)', () => {
        expect(app).toContain("onContinue={() => setAppScreen('game')}");
    });

    it('honors ?view=game and ?view=warroom deep-link overrides for dev/automation', () => {
        expect(app).toContain("if (view === 'warroom') {");
        expect(app).toContain("} else if (view === 'game') {");
    });

    it('treats ?desktop_window=... as a game deep-link for packaged tactical windows', () => {
        expect(app).toContain("} else if (params.has('desktop_window')) {");
    });

    it('routes a ?shellHandoff=... deep-link to the game shell after applying it', () => {
        expect(app).toContain('applyShellHandoffCommand(useGameStore.getState(), command);');
        const handoffIdx = app.indexOf('applyShellHandoffCommand(useGameStore.getState(), command);');
        const deleteIdx = app.indexOf("params.delete('shellHandoff');");
        const routeIdx = app.indexOf("setAppScreen('game');", handoffIdx);
        expect(handoffIdx).toBeGreaterThan(-1);
        expect(deleteIdx).toBeGreaterThan(handoffIdx);
        expect(routeIdx).toBeGreaterThan(handoffIdx);
        expect(routeIdx).toBeLessThan(deleteIdx);
    });

    it('defers auto-pop gameplay modals while booted to the Main Menu', () => {
        const menuGuards = app.split("if (appScreen === 'mainMenu') return;").length - 1;
        expect(menuGuards).toBeGreaterThanOrEqual(2);
        expect(app).toContain("{appScreen !== 'mainMenu' && showPeacePlanModal && pendingPeacePlan && (");
        expect(app).toContain("{appScreen !== 'mainMenu' && loadedGameState?.pendingDayton && !loadedGameState?.gameOver && (");
    });
});

describe('gameStore - no eager loaded-state clear (#138 follow-up)', () => {
    const store = read('src/ui/map/store/gameStore.ts');

    it('does not retain the now-unused clearLoadedGameState action', () => {
        expect(store).not.toContain('clearLoadedGameState');
    });
});
