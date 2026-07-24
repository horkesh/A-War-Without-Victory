// @vitest-environment jsdom

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DecisionCard } from '../../src/ui/map/components/presidential_desk/DecisionCard';
import type { InboxItem } from '../../src/ui/map/data/inboxItems';
import { setLocale } from '../../src/ui/map/i18n';

afterEach(() => {
  cleanup();
  setLocale('en');
});

describe('President desk DecisionCard fallback copy', () => {
  it('keeps the full consequence summary readable without inaccessible line clamping', () => {
    const subtitle = '2 deployment requests near Kotor Varos; 200 projected civilian casualties; +2 war crimes events; -4.04 international standing. Estimated standing after authorization: 45.96.';
    const item: InboxItem = {
      id: 'paramilitary:readability',
      type: 'paramilitary_request',
      severity: 'blocking',
      title: 'Paramilitary authorization',
      subtitle,
      action: 'paramilitary_review',
      priority: 100,
    };

    render(React.createElement(DecisionCard, { item, onAction: vi.fn() }));

    const summary = screen.getByText(subtitle);
    expect(summary.className).toContain('break-words');
    expect(summary.className).not.toContain('line-clamp');
  });

  it('uses neutral copy for unknown inbox families instead of enum-derived labels', () => {
    const item = {
      id: 'unknown-one',
      type: 'internal_debug_marker',
      severity: 'normal',
      title: 'Staff note',
      subtitle: 'A staff note awaits review.',
      action: 'none',
      priority: 1,
    } as unknown as InboxItem;

    const { container } = render(React.createElement(DecisionCard, {
      item,
      onAction: vi.fn(),
    }));

    expect(screen.getByText('Decision item')).toBeTruthy();
    expect(container.textContent).not.toMatch(/internal debug marker|internal_debug_marker/i);
  });

  it('localizes BCS packet chrome for foundational event and peace cards', () => {
    setLocale('bcs');
    const onAction = vi.fn();
    const eventItem: InboxItem = {
      id: 'event:evt_opening_foundation',
      type: 'event_decision',
      severity: 'blocking',
      title: 'Predsjednička odluka potrebna',
      subtitle: 'Predsjednička odluka traži vaš odgovor do 6 apr 1992.',
      action: 'event_modal',
      priority: 10,
    };
    const peaceItem: InboxItem = {
      id: 'peace:opening_peace',
      type: 'peace_plan',
      severity: 'urgent',
      title: 'Mirovni prijedlog',
      subtitle: 'Međunarodni posrednici su dostavili mirovni plan.',
      action: 'peace_plan_modal',
      priority: 20,
    };
    const opportunityItem: InboxItem = {
      id: 'opportunity:opening_window',
      type: 'operation_opportunity',
      severity: 'normal',
      title: 'Operativni prozor',
      subtitle: 'Štab armije ima dosije spreman za pregled.',
      action: 'decision_room',
      priority: 30,
    };

    const { container } = render(React.createElement(React.Fragment, null,
      React.createElement(DecisionCard, { item: eventItem, onAction }),
      React.createElement(DecisionCard, { item: peaceItem, onAction }),
      React.createElement(DecisionCard, { item: opportunityItem, onAction }),
    ));

    const text = container.textContent ?? '';
    expect(text).toContain('Odluka događaja');
    expect(text).toContain('Mirovni prijedlog');
    expect(text).toContain('Operativna prilika');
    expect(text).toContain('Odluči sada');
    expect(text).toContain('Obavezno');
    expect(text).toContain('Pregled');
    expect(screen.getByAltText(/^Paket: Odluka/)).toBeTruthy();
    expect(text).not.toMatch(/Event decision|Decide now|Peace proposal|Open Decision Room|Decision Required|urgent|normal/);
  });
});
