// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';

import {
  CoachmarkLayer,
  getCoachmarkStorageKey,
} from '../../src/ui/map/components/CoachmarkLayer.js';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('CoachmarkLayer', () => {
  it('shows a first-hover coachmark and persists it in localStorage', () => {
    render(createElement('div', null,
      createElement('button', { type: 'button', 'data-coachmark-id': 'decision-room' }, "President's Desk"),
      createElement(CoachmarkLayer),
    ));

    fireEvent.mouseOver(screen.getByRole('button', { name: "President's Desk" }));

    expect(screen.getByTestId('coachmark-layer').textContent).toContain("President's Desk");
    expect(window.localStorage.getItem(getCoachmarkStorageKey('decision-room'))).toBe('true');

    fireEvent.mouseOut(screen.getByRole('button', { name: "President's Desk" }));
    expect(screen.queryByTestId('coachmark-layer')).toBeNull();

    fireEvent.mouseOver(screen.getByRole('button', { name: "President's Desk" }));
    expect(screen.queryByTestId('coachmark-layer')).toBeNull();
  });
});
