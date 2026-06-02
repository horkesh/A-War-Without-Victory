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

    it('opens the SidePicker only from explicit New Game / Load actions', () => {
        // MainMenu New Game and Load both go to the game screen and open the
        // picker on purpose.
        expect(app).toContain("setAppScreen('game'); setSidePickerOpen(true);");
        // The picker render is still gated on no loaded state.
        expect(app).toContain('isOpen={sidePickerOpen && !loadedGameState}');
    });

    it('clears the auto-loaded campaign so New Game / Load reach the picker even with a save loaded (#138)', () => {
        // PR #138 follow-up — the picker renders only while `!loadedGameState`.
        // On the desktop live-session / auto-load path a save is already in the
        // store while the menu shows, so New Game / Load must discard it first
        // or the user is silently dropped back into the existing campaign.
        expect(app).toContain(
            "onNewGame={() => { useGameStore.getState().clearLoadedGameState(); setAppScreen('game'); setSidePickerOpen(true); }}",
        );
        expect(app).toContain(
            "onLoadGame={() => { useGameStore.getState().clearLoadedGameState(); setAppScreen('game'); setSidePickerOpen(true); }}",
        );
    });

    it('keeps Continue gated on a loaded save (does not clear it)', () => {
        // Continue must NOT clear the loaded state — it resumes the campaign.
        expect(app).toContain('onContinue={() => setAppScreen(\'game\')}');
    });

    it('honors ?view=game and ?view=warroom deep-link overrides for dev/automation', () => {
        expect(app).toContain("if (view === 'warroom') {");
        expect(app).toContain("} else if (view === 'game') {");
    });
});

describe('gameStore — clearLoadedGameState action (#138)', () => {
    const store = read('src/ui/map/store/gameStore.ts');

    it('exposes a clearLoadedGameState action that nulls the loaded state', () => {
        expect(store).toContain('clearLoadedGameState: () => void;');
        expect(store).toContain('clearLoadedGameState: () => set({ loadedGameState: null }),');
    });
});
