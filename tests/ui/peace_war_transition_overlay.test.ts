// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { readFileSync } from 'node:fs';

import { WarHasBegunSplash } from '../../src/ui/map/components/WarHasBegunSplash.js';
import { setLocale } from '../../src/ui/map/i18n';

describe('campaign Warroom date handoff', () => {
  beforeEach(() => {
    setLocale('en');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    cleanup();
    setLocale('en');
  });

  it('keeps the already-rendered selected Warroom visible beneath the date sting', () => {
    render(createElement(WarHasBegunSplash, { onDismiss: vi.fn() }));

    const dialog = screen.getByRole('dialog', { name: 'WAR HAS STARTED' });
    const alpha = Number(dialog.style.backgroundColor.match(/[\d.]+(?=\))/)?.[0]);

    expect(alpha).toBeLessThanOrEqual(0.72);
    expect(dialog.style.backdropFilter).toBe('none');
    expect(dialog.style.backgroundImage).not.toContain('url(');
  });

  it('uses the locked command and data typography roles', () => {
    render(createElement(WarHasBegunSplash, { onDismiss: vi.fn() }));

    expect(screen.getByText('WAR HAS STARTED').style.fontFamily).toBe('var(--font-command)');
    expect(screen.getByText('APRIL 1992').style.fontFamily).toBe('var(--font-data)');
    expect(screen.getByRole('button', { name: 'Acknowledge' }).style.fontFamily).toBe('var(--font-command)');
  });

  it('retains one date-only handoff without mounting a second faction dossier', () => {
    const source = readFileSync('src/ui/map/components/PeaceWarTransitionOverlay.tsx', 'utf8');

    expect(source.match(/<WarHasBegunSplash/g)).toHaveLength(1);
    expect(source).not.toContain('<PeaceWarTransition');
    expect(source).not.toContain('startCampaignFromSidePicker');
  });
});
