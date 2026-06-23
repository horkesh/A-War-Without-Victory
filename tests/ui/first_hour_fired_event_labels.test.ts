import { describe, expect, it } from 'vitest';

import { parseGameState } from '../../src/ui/map/data/GameStateAdapter.js';

describe('first-hour fired event labels', () => {
  it('does not project an unanswered foundational decision as fired history', () => {
    const loaded = parseGameState({
      meta: {
        turn: 0,
        phase: 'war',
        player_faction: 'RBiH',
      },
      political: {
        political_controllers: {},
        initial_political_controllers: {},
      },
      military: {
        formations: {},
        fired_event_ids: ['rbih_state_identity'],
        event_last_fired_turn: { rbih_state_identity: 0 },
        pending_event_decisions: [
          {
            event_id: 'rbih_state_identity',
            event_title: 'What Is Bosnia?',
            turn_fired: 0,
            faction: 'RBiH',
            requires_player_response: true,
            response_options: [
              { id: 'civic', label: 'Civic multi-ethnic republic', effects: [] },
              { id: 'bosniak', label: 'Bosniak national state', effects: [] },
            ],
          },
        ],
        event_decision_log: [],
        event_causality_log: [],
      },
    });

    expect(loaded.firedEvents ?? []).toEqual([]);
  });

  it('projects the RBiH foundational browser decision with catalog-backed player copy', () => {
    const loaded = parseGameState({
      meta: {
        turn: 0,
        phase: 'war',
        player_faction: 'RBiH',
      },
      political: {
        political_controllers: {},
        initial_political_controllers: {},
      },
      military: {
        formations: {},
        fired_event_ids: ['rbih_state_identity'],
        event_last_fired_turn: { rbih_state_identity: 0 },
        event_decision_log: [
          {
            event_id: 'rbih_state_identity',
            response_id: 'civic',
            faction: 'RBiH',
            decision_source: 'player',
            turn: 0,
          },
        ],
        event_causality_log: [],
      },
    });

    expect(loaded.firedEvents?.[0]).toEqual(expect.objectContaining({
      id: 'rbih_state_identity',
      title: 'What Is Bosnia?',
      effects: [{ kind: 'decision', description: 'Response recorded: Civic multi-ethnic republic.' }],
      isDecision: true,
    }));
    expect(JSON.stringify(loaded.firedEvents)).not.toMatch(/Rbih State Identity|Response recorded: Civic\.|response_id/);
  });

  it('does not project bot or foreign event decisions as player fired-decision history', () => {
    const loaded = parseGameState({
      meta: {
        turn: 12,
        phase: 'war',
        player_faction: 'RBiH',
      },
      political: {
        political_controllers: {},
        initial_political_controllers: {},
      },
      military: {
        formations: {},
        fired_event_ids: ['rbih_state_identity', 'rs_strategic_goals', 'hrhb_political_goal'],
        event_last_fired_turn: {
          rbih_state_identity: 0,
          rs_strategic_goals: 0,
          hrhb_political_goal: 0,
        },
        event_decision_log: [
          {
            event_id: 'rbih_state_identity',
            response_id: 'civic',
            faction: 'RBiH',
            decision_source: 'player',
            turn: 0,
          },
          {
            event_id: 'rs_strategic_goals',
            response_id: 'adopt_goals',
            faction: 'RS',
            decision_source: 'player',
            turn: 0,
          },
          {
            event_id: 'hrhb_political_goal',
            response_id: 'historical_default',
            faction: 'HRHB',
            decision_source: 'bot_ai_default',
            turn: 0,
          },
        ],
        event_causality_log: [],
      },
    });

    expect(loaded.firedEvents?.map((event) => event.id)).toEqual(['rbih_state_identity']);
    expect([...(loaded.decisionResponses ?? [])]).toEqual(['rbih_state_identity:civic']);
  });

  it('localizes generated fired-decision wrapper copy', async () => {
    const { setLocale } = await import('../../src/ui/map/i18n/index.js');
    try {
      setLocale('bcs', undefined);
      const loaded = parseGameState({
        meta: {
          turn: 0,
          phase: 'war',
          player_faction: 'RBiH',
        },
        political: {
          political_controllers: {},
          initial_political_controllers: {},
        },
        military: {
          formations: {},
          fired_event_ids: ['rbih_state_identity'],
          event_last_fired_turn: { rbih_state_identity: 0 },
          event_decision_log: [
            {
              event_id: 'rbih_state_identity',
              response_id: 'civic',
              faction: 'RBiH',
              decision_source: 'player',
              turn: 0,
            },
          ],
          event_causality_log: [],
        },
      });

      expect(loaded.firedEvents?.[0]?.narrative).toBe('Predsjednički odgovor arhiviran je u zapisu kampanje.');
      expect(loaded.firedEvents?.[0]?.effects?.[0]?.description).toMatch(/^Odgovor zabilježen:/);
      expect(JSON.stringify(loaded.firedEvents)).not.toMatch(/Presidential response filed|Response recorded:/);
    } finally {
      setLocale('en', undefined);
    }
  });
});
