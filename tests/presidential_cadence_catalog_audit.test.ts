import { describe, expect, it } from 'vitest';

import { canEventFire, evaluateEvents } from '../src/sim/events/evaluate_events.js';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import type { GameState } from '../src/state/game_state.js';

const FACTIONS = ['rbih', 'rs', 'hrhb'] as const;
const GENERIC_ROW_IDS = FACTIONS.flatMap((faction) => [
  `strategic_posture_review_${faction}`,
  `visit_to_front_${faction}`,
  `address_to_nation_${faction}`,
  `decorate_a_unit_${faction}`,
]);

describe('presidential cadence catalog audit', () => {
  it('keeps voluntary-action cooldown/cap metadata outside engine recurrence', () => {
    const byId = new Map(loadEventDefinitions(0).map((event) => [event.id, event]));

    for (const id of GENERIC_ROW_IDS) {
      const event = byId.get(id);
      expect(event, id).toBeDefined();
      expect(event?.once, id).toBe(true);
      expect(event?.tags ?? [], id).not.toContain('recurring');
      expect(event?.recurrence, id).toBeUndefined();
      expect(event?.action_cadence, id).toEqual(id.startsWith('strategic_posture_review_')
        ? { max_fires: 8, cooldown_turns: 8, escalation: 'escalating' }
        : { max_fires: 5, cooldown_turns: 10, escalation: 'static' });
    }
  });

  it('never re-fires a generic row through natural event evaluation after its once-only occurrence', () => {
    const byId = new Map(loadEventDefinitions(0).map((event) => [event.id, event]));

    for (const id of GENERIC_ROW_IDS) {
      const event = byId.get(id)!;
      const state = {
        meta: { turn: 104, phase: 'war' },
        military: {
          formations: {},
          fired_event_ids: [id],
          event_fire_counts: { [id]: 1 },
          event_last_fired_turn: { [id]: 84 },
        },
        political: {},
        factions: [],
        displacement: {},
      } as unknown as GameState;

      expect(canEventFire(event, state, 104), id).toBe(false);
      expect(evaluateEvents(state, () => 0, 104, [event]).fired, id).toEqual([]);
      expect(state.military.pending_event_decisions ?? [], id).toEqual([]);
    }
  });

  it('does not naturally queue a once-only row after a desktop action recorded its fire count', () => {
    const event = loadEventDefinitions(0).find((entry) => entry.id === 'visit_to_front_rs')!;
    const state = {
      meta: { turn: 94, phase: 'war', player_faction: 'RS' },
      military: {
        formations: {},
        fired_event_ids: [],
        event_fire_counts: { visit_to_front_rs: 1 },
        event_last_fired_turn: { visit_to_front_rs: 90 },
        event_readiness: { visit_to_front_rs: event.pressure?.threshold ?? 0 },
      },
      political: {},
      factions: [],
      displacement: {},
    } as unknown as GameState;

    expect(canEventFire(event, state, 94)).toBe(false);
    expect(evaluateEvents(state, () => 0, 94, [event]).fired).toEqual([]);
    expect(state.military.pending_event_decisions ?? []).toEqual([]);
  });

  it('does not mistake generic command-presence abstractions for sourced cadence', () => {
    const byId = new Map(loadEventDefinitions(0).map((event) => [event.id, event]));

    for (const id of GENERIC_ROW_IDS) {
      const event = byId.get(id);
      const provenance = `${event?.historical_source ?? ''} ${event?.source_note ?? ''}`.trim().toLowerCase();
      const isAbstract = provenance.length === 0
        || provenance.includes('fictionalized')
        || provenance.includes('abstract')
        || provenance.includes('no specific');
      expect(isAbstract, id).toBe(true);
    }
  });

  it('requires provenance on every authored player-response row outside explicit abstractions', () => {
    const unsourced = loadEventDefinitions(0)
      .filter((event) => event.requires_player_response === true)
      .filter((event) => !GENERIC_ROW_IDS.includes(event.id as (typeof GENERIC_ROW_IDS)[number]))
      .filter((event) => `${event.historical_source ?? ''} ${event.source_note ?? ''}`.trim().length === 0)
      .map((event) => event.id)
      .sort();

    expect(unsourced).toEqual([]);
  });
});
