// @vitest-environment jsdom

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DecisionCard } from '../../src/ui/map/components/presidential_desk/DecisionCard';
import type { InboxItem } from '../../src/ui/map/data/inboxItems';

afterEach(() => cleanup());

describe('President desk DecisionCard fallback copy', () => {
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
});
