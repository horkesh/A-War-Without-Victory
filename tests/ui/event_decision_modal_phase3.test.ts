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
    expect(screen.getByText(/historically attested choice/)).toBeTruthy();
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

  it('renders staff recommendation separately from historical calibration defaults', () => {
    render(React.createElement(EventDecisionModal, {
      decision: {
        event_id: 'visit_to_front_rbih',
        event_title: 'Visit to the Front',
        narrative: 'Staff asks whether the president should remain in the capital or visit a front.',
        turn_fired: 84,
        faction: 'RBiH',
        staff_recommended_response_id: 'stay_capital_rbih',
        response_options: [
          { id: 'stay_capital_rbih', label: 'Stay in Sarajevo', effects: [] },
          { id: 'visit_front', label: 'Visit the front', effects: [] },
        ],
      },
      onRespond: () => undefined,
    }));

    expect(screen.getByText('Staff recommendation')).toBeTruthy();
    expect(screen.getByText(/not a historical default and does not control bot calibration/i)).toBeTruthy();
    expect(screen.queryByText('Historical default')).toBeNull();
    expect(screen.queryByText(/historically attested choice/)).toBeNull();
  });

    it('renders future-consequence cards only for response options that include branch metadata', () => {
        render(React.createElement(EventDecisionModal, {
      decision: {
        event_id: 'branch_visibility_review',
        event_title: 'Branch Visibility Review',
        turn_fired: 12,
        faction: 'RS',
        historical_default_response_id: 'hold_line',
        response_options: [
          {
            id: 'hold_line',
            label: 'Hold the line',
            description: 'Keep the current posture.',
            historical_marker: 'historical_default',
            effects: [],
            future_consequences: [
              {
                id: 'negotiation_window',
                label: 'Negotiation window preserved',
                timing: 'future',
                certainty: 'conditional',
                explanation: 'Recording rbih_state_identity as civic closes csq_bosniak_unity_1993 if battlefield pressure remains manageable. §3.6 STRICT internal review note.',
                opens_events: ['winter_negotiation_review'],
                closes_events: ['emergency_retrenchment_review'],
                opens_flags: ['diplomatic_channel_open'],
                closes_flags: ['hardline_mandate_locked'],
              },
            ],
          },
          {
            id: 'press_forward',
            label: 'Press forward',
            description: 'Authorize a sharper posture.',
            historical_marker: 'counterfactual',
            effects: [],
          },
        ],
      },
      onRespond: () => undefined,
    }));

    expect(screen.getByText('Future consequences')).toBeTruthy();
    expect(screen.getByText('Negotiation window preserved')).toBeTruthy();
    expect(screen.getByText('Future')).toBeTruthy();
    expect(screen.getByText('Conditional')).toBeTruthy();
    expect(screen.getByText('Recording state identity posture as civic closes later Bosniak-national unity consolidation if battlefield pressure remains manageable.')).toBeTruthy();
    expect(screen.queryByText(/rbih_state_identity/)).toBeNull();
    expect(screen.queryByText(/csq_bosniak_unity_1993/)).toBeNull();
    expect(screen.queryByText(/§3.6 STRICT/)).toBeNull();
    expect(screen.queryByText('Later eligible events: winter negotiation review')).toBeNull();
    expect(screen.queryByText('Later suppressed events: emergency retrenchment review')).toBeNull();
    expect(screen.queryByText('Recorded flag context: diplomatic channel open')).toBeNull();
    expect(screen.queryByText('Suppressed flag context: hardline mandate locked')).toBeNull();

    const pressForward = screen.getByText('Press forward').closest('div');
    expect(pressForward?.textContent).not.toContain('Future consequences');
  });

  it('keeps all response choices before detailed future-consequence copy', () => {
    const { container } = render(React.createElement(EventDecisionModal, {
      decision: {
        event_id: 'choice_hierarchy_review',
        event_title: 'Choice Hierarchy Review',
        turn_fired: 12,
        faction: 'RS',
        historical_default_response_id: 'option_a',
        response_options: [
          {
            id: 'option_a',
            label: 'Adopt the programme',
            effects: [],
            future_consequences: [
              {
                id: 'future_a',
                label: 'Detailed future branch A',
                timing: 'future',
                certainty: 'conditional',
                explanation: 'Long branch consequence for option A.',
              },
            ],
          },
          {
            id: 'option_b',
            label: 'Limit the programme',
            effects: [],
            future_consequences: [
              {
                id: 'future_b',
                label: 'Detailed future branch B',
                timing: 'future',
                certainty: 'risk',
                explanation: 'Long branch consequence for option B.',
              },
            ],
          },
          {
            id: 'option_c',
            label: 'Reject the programme',
            effects: [],
          },
        ],
      },
      onRespond: () => undefined,
    }));

    const text = container.textContent ?? '';
    expect(text.indexOf('Adopt the programme')).toBeLessThan(text.indexOf('Detailed future branch A'));
    expect(text.indexOf('Limit the programme')).toBeLessThan(text.indexOf('Detailed future branch A'));
    expect(text.indexOf('Reject the programme')).toBeLessThan(text.indexOf('Detailed future branch A'));
    expect(text.indexOf('Detailed future branch A')).toBeLessThan(text.indexOf('Detailed future branch B'));
  });
});
