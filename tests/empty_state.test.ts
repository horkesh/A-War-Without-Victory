// @vitest-environment jsdom
/**
 * LANE-V094-EMPTY-STATE-PASS — EmptyState render contract.
 *
 * Direct-mount proof of the reusable empty-state component used across
 * Army HQ subpanels and other shells (Operations, Sectors, Combat
 * Record, ORBAT, Event Log, Chronicle, Reserve Pool, AAR Panel).
 *
 * Contracts:
 *   T1 — renders a status region with aria-live=polite
 *   T2 — renders the primary message verbatim
 *   T3 — renders optional helpText when provided; omits when absent
 *   T4 — renders optional glyph when provided; omits when absent
 *   T5 — faction-symmetric palette (no per-faction colors / RGBs)
 *   T6 — pure / deterministic — same input yields byte-identical HTML
 *   T7 — density='compact' tightens vertical padding vs default
 *   T8 — accepts optional className for layout-specific overrides
 *
 * No engine path; no store reads; no IPC.
 */
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EmptyState } from '../src/ui/map/components/EmptyState';

describe('EmptyState — reusable empty-state component', () => {
  it('T1 — renders a status region with aria-live=polite', () => {
    const html = renderToStaticMarkup(
      createElement(EmptyState, { message: 'No data' }),
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('data-testid="empty-state"');
  });

  it('T2 — renders the primary message verbatim', () => {
    const html = renderToStaticMarkup(
      createElement(EmptyState, { message: 'No active operations' }),
    );
    expect(html).toContain('No active operations');
    expect(html).toContain('data-testid="empty-state-message"');
  });

  it('T3 — renders optional helpText when provided; omits when absent', () => {
    const withHelp = renderToStaticMarkup(
      createElement(EmptyState, {
        message: 'No active operations',
        helpText: 'Awaiting orders from corps command.',
      }),
    );
    expect(withHelp).toContain('Awaiting orders from corps command.');
    expect(withHelp).toContain('data-testid="empty-state-help"');

    const withoutHelp = renderToStaticMarkup(
      createElement(EmptyState, { message: 'No active operations' }),
    );
    expect(withoutHelp).not.toContain('data-testid="empty-state-help"');
  });

  it('T4 — renders optional glyph when provided; omits when absent', () => {
    const withGlyph = renderToStaticMarkup(
      createElement(EmptyState, {
        message: 'No active operations',
        glyph: '·',
      }),
    );
    expect(withGlyph).toContain('data-testid="empty-state-glyph"');
    expect(withGlyph).toContain('·');

    const withoutGlyph = renderToStaticMarkup(
      createElement(EmptyState, { message: 'No active operations' }),
    );
    expect(withoutGlyph).not.toContain('data-testid="empty-state-glyph"');
  });

  it('T5 — faction-symmetric palette (no per-faction colors / RGBs)', () => {
    const html = renderToStaticMarkup(
      createElement(EmptyState, {
        message: 'No active operations',
        helpText: 'Awaiting first event.',
      }),
    );
    // Neutral palette only.
    expect(html).toContain('text-text-secondary');
    // No faction tokens or per-faction RGBs.
    expect(html).not.toMatch(/RBiH|HRHB|VRS|ARBiH|HVO/i);
    expect(html).not.toMatch(/#c04040|#4a9a55|#4080b8/);
    // No status colors (red/green/amber) — empty state is neutral, not an alert.
    expect(html).not.toMatch(/text-red-|text-green-|text-emerald-|text-amber-|bg-red-|bg-green-|bg-amber-/);
  });

  it('T6 — pure / deterministic: identical inputs yield byte-identical HTML', () => {
    const a = renderToStaticMarkup(
      createElement(EmptyState, {
        message: 'No active operations',
        helpText: 'Awaiting orders from corps command.',
      }),
    );
    const b = renderToStaticMarkup(
      createElement(EmptyState, {
        message: 'No active operations',
        helpText: 'Awaiting orders from corps command.',
      }),
    );
    expect(b).toBe(a);
  });

  it('T7 — density="compact" tightens vertical padding vs default', () => {
    const compact = renderToStaticMarkup(
      createElement(EmptyState, { message: 'X', density: 'compact' }),
    );
    const normal = renderToStaticMarkup(
      createElement(EmptyState, { message: 'X' }),
    );
    expect(compact).toContain('py-2');
    expect(normal).toContain('py-4');
  });

  it('T8 — accepts optional className for layout-specific overrides', () => {
    const html = renderToStaticMarkup(
      createElement(EmptyState, {
        message: 'X',
        className: 'mb-4 ring-test-marker',
      }),
    );
    expect(html).toContain('ring-test-marker');
    expect(html).toContain('mb-4');
  });

  it('T9 — renders no scripts, no timers; structural data-testid hooks present', () => {
    const html = renderToStaticMarkup(
      createElement(EmptyState, {
        message: 'No active operations',
        helpText: 'Awaiting orders from corps command.',
      }),
    );
    expect(html).not.toContain('<script');
    expect(html).toContain('data-testid="empty-state"');
    expect(html).toContain('data-testid="empty-state-message"');
    expect(html).toContain('data-testid="empty-state-help"');
  });
});
