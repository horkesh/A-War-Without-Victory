import { describe, expect, it } from 'vitest';
import events from '../data/scenarios/events/war_1992_hrhb_summer.json';

const EVENT_IDS = [
  'hrhb_posavina_orasje_posture_1992',
  'hrhb_jajce_joint_defense_1992',
] as const;

describe('HRHB late-1992 presidential cadence', () => {
  it('adds source-backed Bosanski Brod/Orašje and Jajce decisions in the 19-turn drought', () => {
    const selected = EVENT_IDS.map((id) => events.find((event) => event.id === id));

    expect(selected.every(Boolean)).toBe(true);
    expect(selected.map((event) => event?.trigger.turn_min)).toEqual([26, 29]);
    expect(selected.map((event) => event?.responding_faction)).toEqual(['HRHB', 'HRHB']);
    expect(selected[0]?.source_note).toContain('Balkan Battlegrounds I pp.181-183');
    expect(selected[1]?.source_note).toContain('Balkan Battlegrounds I pp.183-184');

    for (const event of selected) {
      expect(event?.requires_player_response).toBe(true);
      expect(event?.bot_response_logic).toBe('historical');
      const historical = event?.response_options.find(
        (option) => option.id === event.historical_default_response_id,
      );
      expect(historical?.historical_marker).toBe('historical_default');
      expect(historical?.effects.map((effect) => effect.kind)).toEqual([
        'cost_ledger_annotation',
      ]);
    }
  });
});
