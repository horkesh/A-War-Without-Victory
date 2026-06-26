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
import { filterHistoricalEventsForSettlement } from '../../src/ui/map/components/SettlementDetailContent.js';
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

  it('localizes the component-owned casualty row label in BCS mode without role shorthand', () => {
    setLocale('bcs');

    render(createElement(SettlementTimeline, {
      events: [{
        turn: 1,
        type: 'battle',
        title: 'Kontakt',
        casualties: { attacker: 3, defender: 5 },
      }],
    }));

    expect(screen.getByText('Gubici: 3 napadač / 5 branilac')).toBeTruthy();
    expect(screen.queryByText('Gubici: 3 nap / 5 odb')).toBeNull();
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

  it('preserves static control-change scope on adapter historical events before timeline filtering', () => {
    const parsed = parseGameState({
      meta: { turn: 170, phase: 'war' },
      military: { formations: {} },
      political: { political_controllers: {} },
      turn_summaries: [{
        turn: 170,
        events_fired: [{ id: 'srebrenica_falls_1995' }],
      }],
    } as any);

    expect(parsed.historicalEventsByTurn[0]?.osids).toContain('op:srebrenica:srebrenica_2');

    expect(filterHistoricalEventsForSettlement(
      parsed.historicalEventsByTurn,
      'op:srebrenica:srebrenica_2',
      'srebrenica',
    ).map((event) => event.id)).toEqual(['srebrenica_falls_1995']);

    expect(filterHistoricalEventsForSettlement(
      parsed.historicalEventsByTurn,
      'op:srebrenica:remote_village_9',
      'srebrenica',
    ).map((event) => event.id)).toEqual([]);
  });

  it('requires explicit settlement or municipality scope before attaching historical events to a settlement timeline', () => {
    const events = [
      {
        turn: 170,
        id: 'srebrenica_column_breakout_1995',
        text: 'Column breakout recorded',
      },
      {
        turn: 171,
        id: 'srebrenica_falls_1995',
        text: 'Settlement-scoped fall receipt',
        osids: ['op:srebrenica:srebrenica_2'],
      },
      {
        turn: 172,
        id: 'srebrenica_municipality_signal',
        text: 'Municipality-scoped signal',
        municipalityIds: ['srebrenica'],
      },
    ];

    expect(filterHistoricalEventsForSettlement(
      events,
      'op:srebrenica:remote_village_9',
      'srebrenica',
    ).map((event) => event.id)).toEqual(['srebrenica_municipality_signal']);

    expect(filterHistoricalEventsForSettlement(
      events,
      'op:srebrenica:srebrenica_2',
      'srebrenica',
    ).map((event) => event.id)).toEqual(['srebrenica_falls_1995', 'srebrenica_municipality_signal']);
  });

  it('localizes control battle and movement rows in BCS mode without English timeline fragments', () => {
    setLocale('bcs');

    const events = buildSettlementTimeline(
      'op:test:test_1',
      null,
      [],
      [{ turn: 2, settlementId: 'op:test:test_1', from: 'RBiH', to: 'RS', mechanism: 'combat' }],
      [],
      [{
        turn: 3,
        attacker_faction: 'RS',
        defender_faction: 'RBiH',
        outcome: 'costly_victory',
        attacker_casualties: 12,
        defender_casualties: 8,
        territory_flipped: true,
      }],
      [
        { turn: 4, formation_id: 'bde_1', formation_name: '1. brigada', type: 'arrived' },
        { turn: 5, formation_id: 'bde_1', formation_name: '1. brigada', type: 'departed' },
      ],
      [],
      [],
      null,
      'RBiH',
    );

    const { container } = render(createElement(SettlementTimeline, { events }));

    expect(container.textContent).toContain('Pod kontrolom ARBiH na pocetku scenarija');
    expect(container.textContent).toContain('VRS preuzima kontrolu');
    expect(container.textContent).toContain('Borba - skupa pobjeda');
    expect(container.textContent).toContain('VRS napada ARBiH - teritorija zauzeta');
    expect(container.textContent).toContain('1. brigada rasporedjena u naselju');
    expect(container.textContent).toContain('1. brigada napustila naselje');
    expect(container.textContent).not.toMatch(/Controlled by|scenario start|took control|Battle|attacked|territory captured|stationed|departed/);
  });

  it('uses player-safe English fallback copy for unknown control and battle ids', () => {
    setLocale('en');

    const events = buildSettlementTimeline(
      'op:test:test_1',
      null,
      [],
      [{ turn: 2, settlementId: 'op:test:test_1', from: 'RBiH', to: 'raw_unknown_force', mechanism: 'raw_mechanism_id' }],
      [],
      [{
        turn: 3,
        attacker_faction: 'raw_attacker_force',
        defender_faction: 'RBiH',
        outcome: 'raw_battle_outcome',
        attacker_casualties: 0,
        defender_casualties: 0,
        territory_flipped: false,
      }],
      [],
      [],
      [],
      null,
      null,
    );

    const { container } = render(createElement(SettlementTimeline, { events }));

    expect(container.textContent).toContain('Unknown force took control');
    expect(container.textContent).toContain('Battle - outcome recorded');
    expect(container.textContent).toContain('Unknown force attacked ARBiH');
    expect(container.textContent).not.toMatch(/raw_unknown_force|raw_mechanism_id|raw_attacker_force|raw_battle_outcome/);
  });

  it('renders missing battle casualties as unreported instead of zero', () => {
    setLocale('en');

    const events = buildSettlementTimeline(
      'op:test:test_1',
      null,
      [],
      [],
      [],
      [{
        turn: 3,
        attacker_faction: 'RS',
        defender_faction: 'RBiH',
        outcome: 'stalemate',
        attacker_casualties: null,
        defender_casualties: null,
        casualties_reported: false,
        territory_flipped: false,
      }],
      [],
      [],
      [],
      null,
      null,
    );

    const { container } = render(createElement(SettlementTimeline, { events }));

    expect(container.textContent).toContain('Casualties: Unreported attacker / Unreported defender');
    expect(container.textContent).not.toContain('Casualties: 0 attacker / 0 defender');
  });

  it('localizes displacement operation and ethnic-shift rows in BCS mode without English fragments', () => {
    setLocale('bcs');

    const events = buildSettlementTimeline(
      'op:test:test_1',
      null,
      [
        { turn: 6, origin_osid: 'op:test:test_1', ethnicity: 'Bosniak', displaced: 40, killed: 3, fled_abroad: 2, settled: 0 },
        { turn: 7, origin_osid: 'op:test:test_1', ethnicity: 'Bosniak', displaced: 60, killed: 0, fled_abroad: 0, settled: 0 },
      ],
      [],
      [{
        operation_name: 'operation_raw_id',
        operation_display_name: 'Operacija Proboj',
        corps_id: 'arbih_1st_corps',
        faction: 'RBiH',
        started_turn: 5,
        ended_turn: 8,
        outcome: 'victory',
        objectives_targeted: ['op:test:test_1'],
        objectives_captured: ['op:test:test_1'],
      }],
      [],
      [],
      [],
      [],
      { bosniaks: 140, serbs: 120, croats: 0, others: 0 },
      null,
    );

    const { container } = render(createElement(SettlementTimeline, { events }));
    const copy = container.textContent ?? '';

    expect(copy).toContain('Operacija Proboj pokrenuta');
    expect(copy).toContain('ARBiH cilja ovo podrucje');
    expect(copy).toContain('Operacija Proboj - cilj drzan na kraju operacije');
    expect(copy).toContain('100 raseljenih: Bosnjaci tokom 2 sedmice');
    expect(copy).toContain('5 civila izgubljeno: Bosnjaci');
    expect(copy).toContain('3 ubijeno, 2 izbjeglo u inostranstvo');
    expect(copy).toContain('Etnicka vecina promijenjena');
    expect(copy).toContain('Bosnjaci -> Srbi');
    expect(copy).not.toMatch(/launched|targeting this area|objective held|displaced|over \d+ weeks|killed|fled abroad|civilians lost|Ethnic majority shifted/);
    expect(copy).not.toContain('operation_raw_id');
  });
});
