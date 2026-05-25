// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EventDecisionModal } from '../../src/ui/map/components/EventDecisionModal.js';

afterEach(() => cleanup());

describe('EventDecisionModal presidential dossier', () => {
  it('renders historical marker, descriptions, effect preview, no-effect fallback, and record trail', () => {
    render(React.createElement(EventDecisionModal, {
      decision: {
        event_id: 'strategic_posture_review_hrhb',
        event_title: 'Strategic Posture Review',
        narrative: 'Cabinet ministers ask whether the wartime posture should remain separate or be moderated.',
        staff_assessment: 'Staff assesses that this choice will define the posture for the next campaign phase.',
        trigger_evidence: ['Cabinet split recorded', 'Patron signal received'],
        category: 'political',
        historical_source: 'BB1 source packet',
        turn_fired: 42,
        faction: 'HRHB',
        historical_default_response_id: 'separate_project',
        response_options: [
          {
            id: 'separate_project',
            label: 'Maintain the separate project',
            description: 'Keep the institutions aligned with the existing wartime project.',
            historical_marker: 'historical_default',
            effects: [
              { kind: 'morale_change', faction: 'HRHB', delta: 4 },
              { kind: 'patron_pressure', faction: 'HRHB', delta: -2 },
            ],
            sets_flags: { hrhb_strategy: 'separate' },
            dimension_shifts: [
              { faction: 'HRHB', dimension: 'patron_confidence', delta: 6 },
            ],
          },
          {
            id: 'joint_front',
            label: 'Seek a joint front',
            description: 'Signal a willingness to reduce friction with Bosniak authorities.',
            historical_marker: 'counterfactual',
            effects: [],
          },
        ],
      },
      onRespond: () => undefined,
    }));

    expect(screen.getByRole('dialog', { name: 'Strategic Posture Review' })).toBeTruthy();
    expect(screen.getByText('Cabinet ministers ask whether the wartime posture should remain separate or be moderated.')).toBeTruthy();
    expect(screen.getByText('Staff assesses that this choice will define the posture for the next campaign phase.')).toBeTruthy();
    expect(screen.getByText('Cabinet split recorded')).toBeTruthy();
    expect(screen.getByText('Patron signal received')).toBeTruthy();
    expect(screen.getByText('Political')).toBeTruthy();
    expect(screen.getByText('BB1 source packet')).toBeTruthy();
    expect(screen.getByText('Historical default')).toBeTruthy();
    expect(screen.getByText(/AI historical path for calibration/)).toBeTruthy();
    expect(screen.getByText('Keep the institutions aligned with the existing wartime project.')).toBeTruthy();
    expect(screen.getByText('Croatian Republic of Herzeg-Bosnia morale +4')).toBeTruthy();
    expect(screen.getByText('Croatian Republic of Herzeg-Bosnia patron pressure -2')).toBeTruthy();
    expect(screen.getByText('Croatian Republic of Herzeg-Bosnia patron confidence +6')).toBeTruthy();
    expect(screen.getByText('No immediate mechanical effects.')).toBeTruthy();
    expect(screen.getByText(/Chronicle decision ledger and Army HQ Records/i)).toBeTruthy();
    expect(screen.queryByText(/source review required/i)).toBeNull();
    expect(screen.queryByText('Rationale')).toBeNull();
  });

  it('does not imply a recommended choice when no historical default is available', () => {
    render(React.createElement(EventDecisionModal, {
      decision: {
        event_id: 'source_blocked_review',
        event_title: 'Source Review Pending',
        turn_fired: 7,
        faction: 'RBiH',
        response_options: [
          { id: 'a', label: 'Option A', effects: [] },
          { id: 'b', label: 'Option B', effects: [] },
        ],
      },
      onRespond: () => undefined,
    }));

    expect(screen.getByText(/Historical default source review required/i)).toBeTruthy();
    expect(screen.queryByText('Recommended')).toBeNull();
    expect(screen.queryByText('Correct choice')).toBeNull();
  });
});
