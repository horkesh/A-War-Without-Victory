/**
 * Task #80 — boot-to-Main-Menu contract (source-assertion tests).
 *
 * The intrusive "CHOOSE YOUR FACTION" modal used to auto-pop on every launch
 * because (a) `appScreen` defaulted to 'game' so boot skipped the Main Menu,
 * and (b) a useEffect force-opened the SidePicker whenever no save was loaded.
 *
 * OWNER DECISION: boot lands on the Main Menu first; faction choice is offered
 * ONLY via explicit user actions (MainMenu New Game / Load, warroom handoff) —
 * never an auto-popping modal.
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

describe('App boot — Main Menu first, faction choice menu-only (#80)', () => {
    const app = read('src/ui/map/App.tsx');

    it("defaults the boot screen to the Main Menu, not straight into the game", () => {
        // Initial appScreen state must boot to the menu.
        expect(app).toContain(
            "useState<'game' | 'mainMenu' | 'warroom'>('mainMenu')",
        );
        // The old auto-into-game default must be gone.
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
        // The removed auto-open branch set the picker open whenever the player
        // had not yet dismissed it. That line must be gone so the picker only
        // opens from explicit user actions.
        expect(app).not.toContain('if (!sidePickerDismissed) {\n      setSidePickerOpen(true);');
        expect(app).not.toContain('Show side picker automatically');
    });

    it('still closes the SidePicker once a save/state loads', () => {
        // The "close on load" half of the effect must remain.
        expect(app).toContain('if (loadedGameState) {');
        expect(app).toContain('setSidePickerOpen(false);');
    });

    it('gates the SidePicker on sidePickerOpen alone (#138 follow-up)', () => {
        // The render gate must be `sidePickerOpen` alone, NOT
        // `sidePickerOpen && !loadedGameState`. An explicit open (New Game /
        // Load / warroom handoff) must show the picker even when a save is
        // already auto-loaded. Safe because the auto-open branch is gone, so
        // `sidePickerOpen` is only ever set true by explicit user actions.
        expect(app).toContain('isOpen={sidePickerOpen}');
        expect(app).not.toContain('isOpen={sidePickerOpen && !loadedGameState}');
    });

    it('opens the picker from explicit New Game / Load without eager-clearing state (#138 follow-up)', () => {
        // MainMenu New Game and Load go to the game screen and open the picker.
        expect(app).toContain("onNewGame={() => { setAppScreen('game'); setSidePickerOpen(true); }}");
        expect(app).toContain("onLoadGame={() => { setAppScreen('game'); setSidePickerOpen(true); }}");
        // The eager-clear (which threw away the in-memory campaign on the
        // cancel path) must be gone — state is preserved until commit.
        expect(app).not.toContain('clearLoadedGameState');
    });

    it('cancelling the picker never drops to the loading skeleton (#138 follow-up)', () => {
        // onClose: close + mark dismissed, and when NO game is loaded (cancelled
        // a true New Game) return to the Main Menu rather than leaving an empty
        // 'game' screen that falls through to the loading skeleton. With a save
        // loaded, the existing campaign is preserved and resumes.
        expect(app).toContain('if (!loadedGameState) {');
        expect(app).toContain("setAppScreen('mainMenu');");
    });

    it('keeps Continue gated on a loaded save (does not clear it)', () => {
        // Continue must NOT clear the loaded state — it resumes the campaign.
        expect(app).toContain('onContinue={() => setAppScreen(\'game\')}');
    });

    it('honors ?view=game and ?view=warroom deep-link overrides for dev/automation', () => {
        expect(app).toContain("if (view === 'warroom') {");
        expect(app).toContain("} else if (view === 'game') {");
    });

    it('treats ?desktop_window=... as a game deep-link for packaged tactical windows (#138 follow-up)', () => {
        // The desktop Electron app opens tactical map windows with
        // `?desktop_window=operational` / `?desktop_window=sandbox`
        // (electron-main.cjs getTacticalMapWindowUrl). With the boot-to-menu
        // default these must deep-link into the game, not the Main Menu — they
        // attach to an already-running session (no SidePicker).
        expect(app).toContain("} else if (params.has('desktop_window')) {");
    });

    it('routes a ?shellHandoff=... deep-link to the game shell after applying it (#138 follow-up)', () => {
        // warroom.ts `showTacticalMapScene` opens the tactical map with only
        // `?shellHandoff=...` (no `view=game`). With the boot-to-menu default the
        // handoff command would be applied but the screen would stay on the Main
        // Menu, hiding the requested Army HQ/Codex panel behind it. The consumer
        // effect must switch to the game shell once the command is handled.
        expect(app).toContain('applyShellHandoffCommand(useGameStore.getState(), command);');
        // The setAppScreen('game') must live inside the shellHandoff effect,
        // before the `shellHandoff` param is stripped from the URL.
        const handoffIdx = app.indexOf('applyShellHandoffCommand(useGameStore.getState(), command);');
        const deleteIdx = app.indexOf("params.delete('shellHandoff');");
        const routeIdx = app.indexOf("setAppScreen('game');", handoffIdx);
        expect(handoffIdx).toBeGreaterThan(-1);
        expect(deleteIdx).toBeGreaterThan(handoffIdx);
        expect(routeIdx).toBeGreaterThan(handoffIdx);
        expect(routeIdx).toBeLessThan(deleteIdx);
    });

    it('defers auto-pop gameplay modals while booted to the Main Menu (#138 follow-up, Codex P2)', () => {
        // An auto-loaded save with a pending event decision / peace plan / event
        // flash must NOT cover the Main Menu — boot is menu-only ("no auto-pop
        // modal"). The EventDecisionModal auto-launch effect and the EventModal
        // queue-population effect both early-return on the menu (and list
        // `appScreen` as a dep so they re-run after Continue / warroom desk).
        const menuGuards = app.split("if (appScreen === 'mainMenu') return;").length - 1;
        expect(menuGuards).toBeGreaterThanOrEqual(2);
        // The PeacePlanModal render is gated so a pending plan does not pop over
        // the boot menu either.
        expect(app).toContain("{appScreen !== 'mainMenu' && showPeacePlanModal && pendingPeacePlan && (");
    });
});

describe('gameStore — no eager loaded-state clear (#138 follow-up)', () => {
    const store = read('src/ui/map/store/gameStore.ts');

    it('does not retain the now-unused clearLoadedGameState action', () => {
        // State is preserved until commit (a faction pick replaces it via
        // loadSave; cancel keeps it). The eager-clear action is no longer used
        // and was removed to keep the store surface minimal.
        expect(store).not.toContain('clearLoadedGameState');
    });
});
