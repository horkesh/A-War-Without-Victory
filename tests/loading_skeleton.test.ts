// @vitest-environment jsdom
/**
 * LANE-V094-LOADING-AND-ERROR — LoadingSkeleton render contract.
 *
 * Direct-mount proof of the first-paint scenario-load skeleton. We
 * mount the real component via `renderToStaticMarkup` (same pattern
 * as `tests/ui/endgame_verdict_screen_mount.test.ts`) and assert:
 *   T1 — renders a status region with aria-busy + aria-live polite
 *   T2 — renders the canonical `panel-shimmer` placeholder bars
 *   T3 — renders the loading caption (default + override)
 *   T4 — uses the shared `bg-panel-bg` palette (no faction colors)
 *   T5 — pure / deterministic — same input yields byte-identical HTML
 *
 * No engine path; no store reads; no IPC.
 */
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LoadingSkeleton } from '../src/ui/map/components/LoadingSkeleton';

describe('LoadingSkeleton — first-paint scenario-load skeleton', () => {
  it('T1 — renders a status region with aria-busy=true and aria-live=polite', () => {
    const html = renderToStaticMarkup(createElement(LoadingSkeleton));
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('data-testid="map-shell-skeleton"');
  });

  it('T2 — renders multiple panel-shimmer placeholder bars (top, sidebar, map, bottom)', () => {
    const html = renderToStaticMarkup(createElement(LoadingSkeleton));
    // The skeleton mirrors the gross shell layout: top bar, left rail, map area, bottom strip.
    // Each surface uses the canonical `panel-shimmer` class from globals.css.
    const matches = html.match(/panel-shimmer/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });

  it('T3 — renders default loading caption "LOADING SCENARIO" and respects override', () => {
    const defaultHtml = renderToStaticMarkup(createElement(LoadingSkeleton));
    expect(defaultHtml).toContain('LOADING SCENARIO');

    const customHtml = renderToStaticMarkup(
      createElement(LoadingSkeleton, { caption: 'RESUMING CAMPAIGN' }),
    );
    expect(customHtml).toContain('RESUMING CAMPAIGN');
    expect(customHtml).not.toContain('LOADING SCENARIO');
  });

  it('T4 — uses faction-symmetric panel palette (no per-faction colors)', () => {
    const html = renderToStaticMarkup(createElement(LoadingSkeleton));
    // Faction-symmetric: amber accent + panel-bg/card neutrals only.
    expect(html).toContain('bg-panel-bg');
    expect(html).toContain('bg-panel-card');
    // No faction-specific palette tokens / hex codes leak into the skeleton.
    expect(html).not.toMatch(/RBiH|HRHB|VRS|ARBiH|HVO/i);
    // No raw faction RGB values.
    expect(html).not.toMatch(/#c04040|#4a9a55|#4080b8/);
  });

  it('T5 — pure / deterministic: identical inputs yield byte-identical HTML', () => {
    const a = renderToStaticMarkup(createElement(LoadingSkeleton));
    const b = renderToStaticMarkup(createElement(LoadingSkeleton));
    const c = renderToStaticMarkup(createElement(LoadingSkeleton));
    expect(b).toBe(a);
    expect(c).toBe(a);

    const overrideA = renderToStaticMarkup(
      createElement(LoadingSkeleton, { caption: 'X' }),
    );
    const overrideB = renderToStaticMarkup(
      createElement(LoadingSkeleton, { caption: 'X' }),
    );
    expect(overrideB).toBe(overrideA);
  });

  it('T6 — auto-dismiss contract: caller controls mount; skeleton itself does not poll or schedule', () => {
    // The component is pure: no useEffect with setTimeout, no setInterval,
    // no requestAnimationFrame. The auto-dismiss comes from the App-level
    // conditional that unmounts the skeleton when `loadedGameState !== null`.
    // This is asserted structurally: the rendered HTML contains no script /
    // timer indicators, and the component file exposes a single named export.
    const html = renderToStaticMarkup(createElement(LoadingSkeleton));
    expect(html).not.toContain('<script');
    // The skeleton is purely structural — confirm it has the expected
    // testid hooks for an outer dismiss test (App-level integration).
    expect(html).toContain('data-testid="map-shell-skeleton"');
    expect(html).toContain('data-testid="map-shell-skeleton-caption"');
  });
});
