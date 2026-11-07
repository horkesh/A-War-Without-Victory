// @vitest-environment jsdom

import React, { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { parse } from 'postcss';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StackExpansionOverlay } from '../../src/ui/map/components/StackExpansionOverlay.js';
import type { FormationView } from '../../src/ui/map/data/types.js';
import { InterfaceScaleLayer } from '../../src/ui/map/preferences/InterfaceScale';
import { setInterfaceScale } from '../../src/ui/map/preferences/interfaceScalePreference';
import { withoutBlockComments } from '../helpers/sourceComments';

function formations(): FormationView[] {
  return [
    {
      id: 'a_brigade',
      name: 'A Brigade',
      faction: 'RBiH',
      kind: 'brigade',
      readiness: 'active',
      status: 'active',
      cohesion: 80,
      fatigue: 0,
      createdTurn: 1,
      tags: [],
      location_osid: 'op:stacked',
    },
    {
      id: 'b_brigade',
      name: 'B Brigade',
      faction: 'RBiH',
      kind: 'brigade',
      readiness: 'active',
      status: 'active',
      cohesion: 80,
      fatigue: 0,
      createdTurn: 1,
      tags: [],
      location_osid: 'op:stacked',
    },
  ] as FormationView[];
}

function largeStack(): FormationView[] {
  return Array.from({ length: 9 }, (_, index) => ({
    ...formations()[0]!,
    id: `brigade_${index + 1}`,
    name: `Brigade ${index + 1}`,
  }));
}

describe('StackExpansionOverlay viewport behavior', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    cleanup();
    setInterfaceScale(100);
  });

  it('is visible immediately without depending on a delayed mount timer', () => {
    vi.useFakeTimers();

    render(createElement(StackExpansionOverlay, {
      osid: 'op:stacked',
      anchorX: 300,
      anchorY: 300,
      formations: formations(),
      onClose: vi.fn(),
      onSelect: vi.fn(),
    }));

    const panel = document.querySelector('[data-stack-picker-panel="true"]');
    const dialog = screen.getByRole('dialog', { name: /formation stack/i });
    const backdrop = screen.getByRole('button', { name: /close formation stack/i });
    expect(panel?.className).toContain('opacity-100');
    expect(panel?.className).toContain('scale-100');
    expect(panel?.className).not.toContain('opacity-0');
    expect(backdrop.className).toContain('opacity-100');
    expect(dialog).toBeTruthy();
  });

  it('clamps the orbital origin away from viewport edges so fanned units remain selectable', () => {
    vi.useFakeTimers();

    render(createElement(StackExpansionOverlay, {
      osid: 'op:stacked',
      anchorX: 4,
      anchorY: window.innerHeight + 500,
      formations: formations(),
      onClose: vi.fn(),
      onSelect: vi.fn(),
    }));

    act(() => {
      vi.advanceTimersByTime(25);
    });

    expect(screen.getByRole('button', { name: /Select A Brigade/i })).toBeTruthy();

    const orbitalRoot = Array.from(document.body.querySelectorAll('div')).find((node) => {
      const element = node as HTMLElement;
      return element.className.includes('absolute pointer-events-none') && element.style.left !== '';
    }) as HTMLElement | undefined;

    expect(orbitalRoot).toBeTruthy();
    expect(Number.parseFloat(orbitalRoot?.style.left ?? '0')).toBeGreaterThanOrEqual(180);
    expect(Number.parseFloat(orbitalRoot?.style.top ?? '99999')).toBeLessThanOrEqual(window.innerHeight - 180);
  });

  it('behaves as a modal dialog with focus trap, escape handling, and focus restoration', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const onOuterEscape = vi.fn();
    const returnFocus = document.createElement('button');
    returnFocus.textContent = 'Return target';
    document.body.appendChild(returnFocus);
    returnFocus.focus();

    render(createElement('div', { onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') onOuterEscape();
    } }, createElement(StackExpansionOverlay, {
      osid: 'op:stacked',
      anchorX: 300,
      anchorY: 300,
      formations: formations(),
      onClose,
      onSelect: vi.fn(),
    })));

    act(() => {
      vi.advanceTimersByTime(25);
    });

    const dialog = screen.getByRole('dialog', { name: /formation stack/i });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByRole('button', { name: /Select A Brigade/i })).toBe(document.activeElement);

    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(screen.getByRole('button', { name: /Select B Brigade/i })).toBe(document.activeElement);

    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(screen.getByRole('button', { name: /Dismiss/i })).toBe(document.activeElement);

    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(screen.getByRole('button', { name: /Select A Brigade/i })).toBe(document.activeElement);

    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: /Dismiss/i })).toBe(document.activeElement);

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onOuterEscape).not.toHaveBeenCalled();

    cleanup();
    expect(document.activeElement).toBe(returnFocus);
    returnFocus.remove();
  });

  it('redacts enemy contact labels in the stack chooser', () => {
    vi.useFakeTimers();
    const onSelect = vi.fn();

    render(createElement(StackExpansionOverlay, {
      osid: 'op:stacked',
      anchorX: 300,
      anchorY: 300,
      formations: [
        formations()[0]!,
        {
          ...formations()[1]!,
          id: 'vrs_secret_brigade',
          name: 'Secret Enemy Brigade',
          faction: 'RS',
        },
      ],
      playerFaction: 'RBiH',
      onClose: vi.fn(),
      onSelect,
    }));

    act(() => {
      vi.advanceTimersByTime(25);
    });

    expect(screen.getByRole('button', { name: /Select A Brigade/i })).toBeTruthy();
    const contact = screen.getByRole('button', { name: /Inspect enemy contact at settlement/i });
    expect(contact.textContent).toContain('Enemy contact');
    expect(document.body.textContent).not.toContain('Secret Enemy Brigade');

    fireEvent.click(contact);
    expect(onSelect).toHaveBeenCalledWith('enemy_contact:op:stacked:1');
    expect(onSelect).not.toHaveBeenCalledWith('vrs_secret_brigade');
  });

  it('renders enemy contact stack icons with faction color while redacting raw identity', () => {
    vi.useFakeTimers();

    render(createElement(StackExpansionOverlay, {
      osid: 'op:stacked',
      anchorX: 300,
      anchorY: 300,
      formations: [
        formations()[0]!,
        {
          ...formations()[1]!,
          id: 'vrs_secret_brigade',
          name: 'Secret Enemy Brigade',
          faction: 'RS',
          posture: 'attack',
        },
      ],
      playerFaction: 'RBiH',
      onClose: vi.fn(),
      onSelect: vi.fn(),
    }));

    act(() => {
      vi.advanceTimersByTime(25);
    });

    const contact = screen.getByRole('button', { name: /Inspect enemy contact at settlement/i });
    expect(contact.querySelector('[data-contact-redacted="true"]')).toBeTruthy();
    expect(contact.querySelector('[data-contact-faction-color="RS"]')).toBeTruthy();
    expect(contact.querySelector('[data-raw-faction="RS"]')).toBeNull();
    expect(contact.querySelector('[data-raw-posture="attack"]')).toBeNull();
    expect(contact.querySelector('canvas')).toBeNull();
  });

  it.each([100, 125, 150])('keeps nine exact members scrollable in the logical viewport at %d%%', scale => {
    vi.useFakeTimers();
    const onSelect = vi.fn();
    const view = render(createElement(InterfaceScaleLayer, {}));
    act(() => setInterfaceScale(scale));

    view.rerender(createElement(InterfaceScaleLayer, {}, createElement(StackExpansionOverlay, {
      osid: 'op:stacked',
      anchorX: 300,
      anchorY: 300,
      formations: largeStack(),
      playerFaction: 'RBiH',
      onClose: vi.fn(),
      onSelect,
    })));

    act(() => {
      vi.advanceTimersByTime(25);
    });

    const memberList = document.querySelector('[data-stack-member-list="true"]');
    const pickerPanel = document.querySelector('[data-stack-picker-panel="true"]');
    expect(memberList?.className).toContain('max-h-[min(calc(var(--interface-viewport-height,100vh)*0.7),36rem)]');
    expect(memberList?.className).toContain('overflow-y-auto');
    expect(memberList?.className).toContain('min-h-0');
    expect(memberList?.className).toContain('flex-1');
    expect(pickerPanel?.className).toContain('max-h-[calc(var(--interface-viewport-height,100vh)-2rem)]');
    expect(pickerPanel?.className).toContain('overflow-hidden');
    expect(document.querySelector('[data-interface-portal-root]')?.contains(pickerPanel)).toBe(true);
    const origin = pickerPanel?.parentElement as HTMLElement;
    expect(Number.parseFloat(origin.style.left)).toBeCloseTo(window.innerWidth / (scale / 100) / 2);
    expect(Number.parseFloat(origin.style.top)).toBeCloseTo(window.innerHeight / (scale / 100) / 2);

    const limits: Record<string, string> = {};
    parse(withoutBlockComments(readFileSync('src/ui/map/styles/globals.css', 'utf8')))
      .walkRules('.interface-scale-layer [data-stack-picker-panel]', rule => {
        rule.walkDecls(declaration => { limits[declaration.prop] = declaration.value.replace(/\s+/g, ''); });
      });
    expect(limits['max-height']).toBe('calc(var(--interface-viewport-height)-2rem)');
    expect(limits.width).toBe('min(32rem,calc(var(--interface-viewport-width)-2rem))');
    expect(screen.getAllByRole('button', { name: /Select Brigade/i })).toHaveLength(9);
    expect(document.querySelector('[data-stack-selection-id="brigade_9"]')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Select Brigade 9' }));
    expect(onSelect).toHaveBeenCalledWith('brigade_9');
  });
});
