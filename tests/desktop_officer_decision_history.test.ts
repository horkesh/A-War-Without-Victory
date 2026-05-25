import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { fileOfficerDecisionRecord } = require('../src/desktop/officer_decision_history.cjs') as {
  fileOfficerDecisionRecord: (
    state: any,
    event: any,
    decision: 'acknowledged' | 'override_confirmed' | 'replacement_accepted',
    details?: Record<string, unknown>,
  ) => void;
};

describe('desktop officer decision history', () => {
  it('files officer acknowledgements into deterministic persisted history', () => {
    const state: any = { military: {} };
    const event = {
      event_id: 'evt-b',
      type: 'order_pushback',
      faction: 'RS',
      turn: 8,
      officer_id: 'commander_b',
      corps_id: 'vrs_drina_corps',
    };

    fileOfficerDecisionRecord(state, event, 'acknowledged');

    expect(state.military.officer_decision_history).toEqual([
      {
        id: 'officer:8:evt-b:acknowledged',
        turn: 8,
        faction: 'RS',
        event_id: 'evt-b',
        event_type: 'order_pushback',
        officer_id: 'commander_b',
        corps_id: 'vrs_drina_corps',
        decision: 'acknowledged',
      },
    ]);
  });

  it('dedupes and sorts replacement decisions by turn then id', () => {
    const state: any = {
      military: {
        officer_decision_history: [
          {
            id: 'officer:10:evt-z:acknowledged',
            turn: 10,
            faction: 'RS',
            event_id: 'evt-z',
            event_type: 'order_modified',
            officer_id: 'commander_z',
            decision: 'acknowledged',
          },
        ],
      },
    };
    const event = {
      event_id: 'evt-a',
      type: 'replacement_suggested',
      faction: 'RS',
      turn: 9,
      officer_id: 'new_commander',
      current_commander_id: 'old_commander',
      corps_id: 'vrs_drina_corps',
    };

    fileOfficerDecisionRecord(state, event, 'replacement_accepted', {
      new_officer_id: 'new_commander',
      outgoing_officer_id: 'old_commander',
    });
    fileOfficerDecisionRecord(state, event, 'replacement_accepted', {
      new_officer_id: 'new_commander',
      outgoing_officer_id: 'old_commander',
    });

    expect(state.military.officer_decision_history).toEqual([
      expect.objectContaining({ id: 'officer:9:evt-a:replacement_accepted' }),
      expect.objectContaining({ id: 'officer:10:evt-z:acknowledged' }),
    ]);
    expect(state.military.officer_decision_history[0]).toMatchObject({
      current_commander_id: 'old_commander',
      new_officer_id: 'new_commander',
      outgoing_officer_id: 'old_commander',
    });
  });
});
