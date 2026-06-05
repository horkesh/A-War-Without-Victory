import { describe, expect, it } from 'vitest';

import { generateChronicleEntries } from '../../src/ui/map/components/chronicle/generateChronicleEntries.js';

describe('Chronicle decision ledger integration', () => {
  it('adds filed presidential decision consequences as Chronicle entries', () => {
    const entries = generateChronicleEntries({
      turn: 12,
      player_faction: 'RS',
      turnSummaries: [{ turn: 12, battles: [], events_fired: [], displacement_total: 0 }],
      reserveRequestHistory: [
        {
          request_id: 'reserve:turn_12:vrs_drina_corps',
          turn: 12,
          faction: 'RS',
          corps_id: 'vrs_drina_corps',
          brigade_id: 'elite_guard_brigade',
          outcome: 'accepted',
          reason: 'Army CO accepted: request is actionable.',
          decided_by: 'player',
          purpose: 'defensive',
          why_needed: 'Drina Corps needs a reserve to stabilize the front.',
          how_to_use: 'Anchor the weakest sector.',
        },
      ],
    });

    expect(entries).toContainEqual(expect.objectContaining({
      id: 'decision-ledger-reserve:reserve:turn_12:vrs_drina_corps',
      turn: 12,
      type: 'military',
      headline: false,
      title: 'Reserve request accepted',
      detail: expect.stringContaining('Elite Guard Brigade assigned to Drina Corps'),
      metadata: expect.objectContaining({
        decisionRecordId: 'reserve:reserve:turn_12:vrs_drina_corps',
      }),
    }));
  });

  it('does not duplicate a decision event through both turn summary and decision ledger paths', () => {
    const entries = generateChronicleEntries({
      turn: 8,
      player_faction: 'RS',
      turnSummaries: [{
        turn: 8,
        battles: [],
        events_fired: [{ id: 'cabinet_crisis', text: 'Cabinet crisis response' }],
        displacement_total: 0,
      }],
      firedEvents: [{
        id: 'cabinet_crisis',
        turn: 8,
        title: 'Cabinet crisis response',
        narrative: 'The cabinet accepted the policy line.',
        category: 'political',
        effects: [{ kind: 'authority', description: 'Authority held.' }],
        isDecision: true,
      }],
    });

    expect(entries.filter((entry) => entry.title === 'Cabinet crisis response')).toHaveLength(1);
    expect(entries).toContainEqual(expect.objectContaining({
      id: 'decision-ledger-event:cabinet_crisis',
      metadata: expect.objectContaining({ decisionRecordId: 'event:cabinet_crisis' }),
    }));
  });

  it('adds patron-defiance material receipts to the Chronicle decision ledger trail', () => {
    const entries = generateChronicleEntries({
      turn: 44,
      player_faction: 'RS',
      turnSummaries: [{ turn: 44, battles: [], events_fired: [], displacement_total: 0 }],
      rawGameState: {
        military: {
          patron_defiance_supply_cuts: [
            { faction: 'RS', turn: 44, cut_fraction: 0.35, support_after: 0.45 },
            { faction: 'HRHB', turn: 44, cut_fraction: 0.5, support_after: 0.3 },
          ],
        },
      },
    });

    expect(entries).toContainEqual(expect.objectContaining({
      id: 'decision-ledger-patron-defiance:RS:44:0.35:0.45',
      turn: 44,
      type: 'political',
      headline: false,
      title: 'Patron defiance supply cut',
      detail: 'Serbia cut 35% of material support for VRS; support after cut 45%.',
      metadata: expect.objectContaining({
        decisionRecordId: 'patron-defiance:RS:44:0.35:0.45',
      }),
    }));
    expect(entries.find((entry) => entry.id?.includes('HRHB'))).toBeUndefined();
  });
});
