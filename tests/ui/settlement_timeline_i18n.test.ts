// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { parseGameState } from '../../src/ui/map/data/GameStateAdapter.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import {
  formatSettlementTimelineTurnDate,
  SettlementTimeline,
} from '../../src/ui/map/components/SettlementTimeline.js';
import { buildSettlementTimeline } from '../../src/ui/map/utils/buildSettlementTimeline.js';

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

    expect(screen.getByText('Nema zabilježenih događaja za ovo naselje.')).toBeTruthy();
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

  it('localizes supply transition titles without raw supply state ids in BCS mode', () => {
    setLocale('bcs');

    const events = buildSettlementTimeline(
      'op:test:test_1',
      null,
      [],
      [],
      [],
      [],
      [],
      [{ turn: 5, from: 'adequate', to: 'strained' }],
      [],
      null,
      null,
    );

    const { container } = render(createElement(SettlementTimeline, { events }));

    expect(container.textContent).toContain('Snabdijevanje');
    expect(container.textContent).not.toMatch(/\bSupply\b|adequate|strained|critical/);
  });

  it('uses localized neutral copy for adapter historical events with missing text', () => {
    setLocale('bcs');

    const parsed = parseGameState({
      meta: { turn: 10, phase: 'war' },
      military: { formations: {} },
      political: { political_controllers: {} },
      turn_summaries: [{
        turn: 10,
        events_fired: [{ id: 'srebrenica_falls_1995' }],
      }],
    } as any);

    expect(parsed.historicalEventsByTurn).toHaveLength(1);
    expect(parsed.historicalEventsByTurn[0]?.id).toBe('srebrenica_falls_1995');
    expect(parsed.historicalEventsByTurn[0]?.text).toBe('Historijski događaj zabilježen');
    expect(parsed.historicalEventsByTurn[0]?.text).not.toContain('srebrenica');
    expect(parsed.historicalEventsByTurn[0]?.text).not.toContain('_');
  });
});
