// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import {
  formatSettlementTimelineTurnDate,
  SettlementTimeline,
} from '../../src/ui/map/components/SettlementTimeline.js';

describe('SettlementTimeline localization', () => {
  afterEach(() => {
    cleanup();
    setLocale('en');
  });

  it('keeps English date and empty-state labels by default', () => {
    setLocale('en');

    expect(formatSettlementTimelineTurnDate(0)).toBe('6 Apr 1992');

    render(createElement(SettlementTimeline, { events: [] }));

    expect(screen.getByText('No recorded events at this settlement.')).toBeTruthy();
  });

  it('localizes date and empty-state labels in BCS mode', () => {
    setLocale('bcs');

    expect(formatSettlementTimelineTurnDate(0)).toBe('6 apr 1992');

    render(createElement(SettlementTimeline, { events: [] }));

    expect(screen.getByText('Nema zabiljezenih dogadjaja za ovo naselje.')).toBeTruthy();
    expect(screen.queryByText('No recorded events at this settlement.')).toBeNull();
  });

  it('localizes the component-owned casualty row label in BCS mode', () => {
    setLocale('bcs');

    render(createElement(SettlementTimeline, {
      events: [{
        turn: 1,
        type: 'battle',
        title: 'Kontakt',
        casualties: { attacker: 3, defender: 5 },
      }],
    }));

    expect(screen.getByText('Gubici: 3 nap / 5 odb')).toBeTruthy();
    expect(screen.queryByText('Casualties: 3 att / 5 def')).toBeNull();
  });
});
