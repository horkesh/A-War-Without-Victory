// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ActiveBranchPathRow,
  activeBranchLayoutForWidth,
  activeBranchVisibleLimit,
  summarizeActiveBranchPaths,
} from '../../src/ui/map/components/ActiveBranchPathRow.js';

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 2048 });
});

afterEach(() => cleanup());

describe('bottom status active-path summary', () => {
  it('uses two full labels only at wide packaged geometry', () => {
    expect(activeBranchVisibleLimit(1366)).toBe(1);
    expect(activeBranchVisibleLimit(1599)).toBe(1);
    expect(activeBranchVisibleLimit(1600)).toBe(2);
    expect(activeBranchVisibleLimit(2048)).toBe(2);
  });

  it('falls back to an accessible compact trigger when the actual owner cannot fit a full chip', () => {
    const widths = {
      chipWidths: [152, 140],
      remainderWidths: { 1: 92 },
      gapPx: 6,
    };
    expect(activeBranchLayoutForWidth(1280, 55, widths)).toEqual({ visibleLimit: 0, compact: true });
    expect(activeBranchLayoutForWidth(1280, 250, widths)).toEqual({ visibleLimit: 1, compact: false });
    expect(activeBranchLayoutForWidth(2048, 298, widths)).toEqual({ visibleLimit: 2, compact: false });
  });

  it.each([
    [[], [], 0],
    [['Alpha'], ['Alpha'], 0],
    [['Bravo', 'Alpha'], ['Alpha', 'Bravo'], 0],
    [['Hotel', 'Golf', 'Foxtrot', 'Echo', 'Delta', 'Charlie', 'Bravo', 'Alpha'], ['Alpha', 'Bravo'], 6],
  ])('bounds %s to two full chips plus a deterministic remainder', (input, visible, remainder) => {
    expect(summarizeActiveBranchPaths(input)).toEqual({ visible, remainder });
  });

  it('keeps all paths keyboard-accessible and restores focus to the trigger', () => {
    render(React.createElement(ActiveBranchPathRow, {
      paths: ['Hotel', 'Golf', 'Foxtrot', 'Echo', 'Delta', 'Charlie', 'Bravo', 'Alpha'],
    }));
    const trigger = screen.getByRole('button', { name: /6 active paths/i });
    trigger.focus();
    fireEvent.click(trigger);
    const popover = screen.getByRole('dialog', { name: /active strategic paths/i });
    expect(document.activeElement).toBe(popover);
    expect(popover.textContent).toContain('Alpha');
    expect(popover.textContent).toContain('Hotel');
    fireEvent.keyDown(popover, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: /active strategic paths/i })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('lets the row accept its actual flex owner while full chips remain non-collapsing', () => {
    render(React.createElement(ActiveBranchPathRow, {
      paths: ['Herzeg-Bosna posture', 'Alliance sustained', 'Dayton acceptance'],
    }));

    const row = screen.getByTestId('branch-tag-badge-row');
    expect(row.className).toContain('flex-1');
    expect(row.className).toContain('min-w-0');
    for (const chip of screen.getAllByTestId('branch-tag-chip')) {
      expect(chip.className).toContain('shrink-0');
      expect(chip.className).toContain('whitespace-nowrap');
      expect(chip.getAttribute('title')).toBe(chip.textContent);
    }
    expect(screen.getByRole('button', { name: /1 active path/i }).className).toContain('shrink-0');
  });

  it('collapses the second label into the deterministic remainder at narrow geometry', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1366 });
    render(React.createElement(ActiveBranchPathRow, {
      paths: ['Herzeg-Bosna posture', 'Alliance sustained', 'Dayton acceptance'],
    }));

    expect(screen.getAllByTestId('branch-tag-chip')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /2 active paths/i })).toBeTruthy();
  });
});
