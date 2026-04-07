// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MagazineModal } from '../src/ui/warroom/components/MagazineModal.js';
import type { GameState } from '../src/state/game_state.js';

const SOURCE_PATH = resolve(process.cwd(), 'src/ui/warroom/components/MagazineModal.ts');

describe('MagazineModal boundary', () => {
  it('Phase 0 render returns a DOM element without reading raw political state', () => {
    // gameState has NO political.municipalities — if old code ran it would crash or return garbage.
    // The stub must succeed cleanly with only meta.phase and faction identity needed.
    const state = {
      meta: { turn: 0, phase: 'peace', player_faction: 'RBiH' },
      factions: [
        { id: 'RBiH', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } },
      ],
      military: { formations: {}, casualty_ledger: {}, front_edges: [], front_pressure: {},
        front_segments: {}, militia_garrison: {}, brigade_movement_state: {}, brigade_encircled: {}, corps_command: {} },
      political: { political_controllers: {}, war_exhaustion: {}, loss_of_control_trends: { by_faction: {} } },
      displacement: { displacement_state: {}, displacement_camp_state: {}, hostile_takeover_timers: {},
        civilian_casualties: {}, sustainability_state: {} },
    } as unknown as GameState;

    const el = new MagazineModal(state).render();
    expect(el).toBeDefined();
    expect(el.tagName).toBeDefined(); // is a DOM element
    expect(el.textContent).toContain('Field reports are not available before the war.');
    // Must not expose any political controller or municipality data
    expect(el.textContent).not.toContain('political_controllers');
    expect(el.textContent).not.toContain('municipalities');
    expect(el.textContent).not.toContain('stability_score');
  });

  it('MagazineModal source does not import from operational_sitrep_views or command_briefing_views', () => {
    const source = readFileSync(SOURCE_PATH, 'utf8');
    // Comment may reference these files by name — only actual import statements are forbidden.
    expect(source).not.toMatch(/^import[^'"]*['"].*operational_sitrep_views/m);
    expect(source).not.toMatch(/^import[^'"]*['"].*command_briefing_views/m);
  });

  it('MagazineModal source does not read gameState.political.municipalities directly', () => {
    const source = readFileSync(SOURCE_PATH, 'utf8');
    expect(source).not.toContain('political.municipalities');
    expect(source).not.toContain('political.political_controllers');
    expect(source).not.toContain('stability_score');
  });

  it('MagazineModal canonical boundary comment is present', () => {
    const source = readFileSync(SOURCE_PATH, 'utf8');
    expect(source).toContain('MagazineModal is a flavor wrapper over the player-safe war snapshot');
    expect(source).toContain('extractWarData(gameState, playerFaction) only');
  });
});
