// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { MagazineModal } from '../src/ui/warroom/components/MagazineModal.js';
import type { GameState } from '../src/state/game_state.js';

describe('MagazineModal boundary', () => {
  it('render returns a DOM element without reading raw political state', () => {
    // gameState has NO political.municipalities. The war render reads only the
    // extractWarData snapshot (the Phase 0 stub was retired with the peace phase).
    const state = {
      meta: { turn: 0, phase: 'war', player_faction: 'RBiH' },
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
    // Must not expose any political controller or municipality data
    expect(el.textContent).not.toContain('political_controllers');
    expect(el.textContent).not.toContain('municipalities');
    expect(el.textContent).not.toContain('stability_score');
  });
});
