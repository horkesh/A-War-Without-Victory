// @vitest-environment jsdom
/**
 * LANE-V094-LOADING-AND-ERROR — LoadErrorToast render + dismiss contract.
 *
 * Direct-mount proof of the save-load error toast. We mount the real
 * component via `renderToStaticMarkup` (static HTML inspection) AND
 * via `@testing-library/react` for live dismiss-callback semantics.
 *
 * Contracts:
 *   T1 — renders nothing when message is null/undefined/empty
 *   T2 — renders an alert region with aria-live=assertive when message present
 *   T3 — renders the message text verbatim
 *   T4 — dismiss button click invokes onDismiss callback
 *   T5 — Escape key invokes onDismiss callback
 *   T6 — pure / deterministic: same message yields byte-identical HTML
 *   T7 — uses faction-symmetric palette (no faction colors)
 *
 * No engine path; no store reads; no IPC.
 */
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fireEvent, render } from '@testing-library/react';
import { LoadErrorToast } from '../src/ui/map/components/LoadErrorToast';

describe('LoadErrorToast — save-load error toast', () => {
  it('T1 — renders nothing when message is null / undefined / empty', () => {
    const onDismiss = vi.fn();
    const nullHtml = renderToStaticMarkup(
      createElement(LoadErrorToast, { message: null, onDismiss }),
    );
    expect(nullHtml).toBe('');

    const undefHtml = renderToStaticMarkup(
      createElement(LoadErrorToast, { message: undefined, onDismiss }),
    );
    expect(undefHtml).toBe('');

    const emptyHtml = renderToStaticMarkup(
      createElement(LoadErrorToast, { message: '', onDismiss }),
    );
    expect(emptyHtml).toBe('');
  });

  it('T2 — renders an alert region with aria-live=assertive when message present', () => {
    const onDismiss = vi.fn();
    const html = renderToStaticMarkup(
      createElement(LoadErrorToast, {
        message: 'Save file corrupted: schema version mismatch',
        onDismiss,
        positioning: 'static',
      }),
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
    expect(html).toContain('data-testid="load-error-toast"');
  });

  it('T3 — renders the message text verbatim', () => {
    const onDismiss = vi.fn();
    const message = 'Failed to load: missing scenario file at path /tmp/foo.json';
    const html = renderToStaticMarkup(
      createElement(LoadErrorToast, { message, onDismiss, positioning: 'static' }),
    );
    expect(html).toContain(message);
    expect(html).toContain('data-testid="load-error-toast-message"');
    expect(html).toContain('data-testid="load-error-toast-tag"');
    // Tag = "ERROR".
    expect(html).toContain('ERROR');
  });

  it('T4 — dismiss button click invokes onDismiss callback', () => {
    const onDismiss = vi.fn();
    const { getByTestId, unmount } = render(
      createElement(LoadErrorToast, {
        message: 'Test failure',
        onDismiss,
        positioning: 'static',
      }),
    );
    const button = getByTestId('load-error-toast-dismiss');
    fireEvent.click(button);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('T5 — Escape key invokes onDismiss callback', () => {
    const onDismiss = vi.fn();
    const { getByTestId, unmount } = render(
      createElement(LoadErrorToast, {
        message: 'Test failure',
        onDismiss,
        positioning: 'static',
      }),
    );
    const root = getByTestId('load-error-toast');
    fireEvent.keyDown(root, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('T6 — pure / deterministic: same message yields byte-identical HTML', () => {
    const onDismiss = vi.fn();
    const a = renderToStaticMarkup(
      createElement(LoadErrorToast, {
        message: 'IO error',
        onDismiss,
        positioning: 'static',
      }),
    );
    const b = renderToStaticMarkup(
      createElement(LoadErrorToast, {
        message: 'IO error',
        onDismiss,
        positioning: 'static',
      }),
    );
    expect(b).toBe(a);
  });

  it('T7 — faction-symmetric palette (no faction-specific colors)', () => {
    const onDismiss = vi.fn();
    const html = renderToStaticMarkup(
      createElement(LoadErrorToast, {
        message: 'Whatever',
        onDismiss,
        positioning: 'static',
      }),
    );
    // Status palette only: red border / amber dismiss.
    expect(html).toContain('bg-panel-bg');
    expect(html).toContain('border-red-500');
    expect(html).toContain('text-red-400');
    expect(html).toContain('text-amber-400');
    // No faction tokens or per-faction RGBs.
    expect(html).not.toMatch(/RBiH|HRHB|VRS|ARBiH|HVO/i);
    expect(html).not.toMatch(/#c04040|#4a9a55|#4080b8/);
  });

  it('T8 — fixed positioning applies z-index 8500 (Z.MODAL_HARD) above the modal stack but below GameOver/Verdict', () => {
    const onDismiss = vi.fn();
    const html = renderToStaticMarkup(
      createElement(LoadErrorToast, {
        message: 'Whatever',
        onDismiss,
        // default positioning='fixed'
      }),
    );
    // Post LANE-V094-Z-INDEX-TOKENS: Tailwind `z-[8500]` arbitrary class
    // replaced with inline `style="z-index:8500"` from canonical Z.MODAL_HARD.
    expect(html).toMatch(/z-index\s*:\s*8500/);
    expect(html).toContain('fixed');
  });
});
