// @vitest-environment jsdom
/**
 * PAUSE BEFORE COMBAT (owner decision 2026-11-05): while the turn is paused after its events,
 * the decision modal says so and offers "Continue turn"; without a pause it is unchanged.
 * jsdom renders the DOM only — this does not prove layout or visibility on screen.
 */
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventDecisionModal } from '../../src/ui/map/components/EventDecisionModal.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';

afterEach(() => {
  cleanup();
  setLocale('en');
});

const decision = {
  event_id: 'pause_ui_decision',
  event_title: 'A decision arrives',
  turn_fired: 12,
  faction: 'RS' as const,
  response_options: [
    { id: 'hold', label: 'Hold the line', effects: [] },
    { id: 'yield', label: 'Yield', effects: [] },
  ],
};

describe('EventDecisionModal — turn paused before combat', () => {
  it('shows the pause note and a Continue turn button that continues the turn', () => {
    const onContinue = vi.fn();
    const onRespond = vi.fn();
    render(React.createElement(EventDecisionModal, { decision, onRespond, turnPause: { onContinue } }));

    const note = screen.getByTestId('event-decision-turn-paused');
    expect(note.textContent).toContain('The turn is paused before combat');
    expect(note.textContent).toContain('takes effect this week, before movement and combat');
    fireEvent.click(screen.getByTestId('event-decision-continue-turn'));
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onRespond).not.toHaveBeenCalled();
    // The responses are still offered while paused.
    expect(screen.getByTestId('event-decision-response-rail').textContent).toContain('Hold the line');
  });

  it('renders the BCS copy', () => {
    setLocale('bcs');
    render(React.createElement(EventDecisionModal, { decision, onRespond: () => undefined, turnPause: { onContinue: () => undefined } }));
    expect(screen.getByTestId('event-decision-turn-paused').textContent).toContain('Potez je zaustavljen prije borbi');
    expect(screen.getByTestId('event-decision-continue-turn').textContent).toBe('Nastavi potez');
  });

  it('shows no pause note between turns', () => {
    render(React.createElement(EventDecisionModal, { decision, onRespond: () => undefined }));
    expect(screen.queryByTestId('event-decision-turn-paused')).toBeNull();
  });
});
