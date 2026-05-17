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
      createElement('button', { type: 'button', 'data-coachmark-id': 'decision-room' }, 'Decision Room'),
      createElement(CoachmarkLayer),
    ));

    fireEvent.mouseOver(screen.getByRole('button', { name: 'Decision Room' }));

    expect(screen.getByTestId('coachmark-layer').textContent).toContain('Decision Room');
    expect(window.localStorage.getItem(getCoachmarkStorageKey('decision-room'))).toBe('true');

    fireEvent.mouseOut(screen.getByRole('button', { name: 'Decision Room' }));
    expect(screen.queryByTestId('coachmark-layer')).toBeNull();

    fireEvent.mouseOver(screen.getByRole('button', { name: 'Decision Room' }));
    expect(screen.queryByTestId('coachmark-layer')).toBeNull();
  });
});
