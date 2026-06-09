/**
 * @vitest-environment jsdom
 *
 * Event-illustration pipeline (EventModal `image` wiring).
 *
 * UI/data-only, calibration-INERT: no shipped event JSON carries an `image`
 * key today, so every shipped event renders text-only exactly as before. This
 * suite proves:
 *   - resolver returns null for absent / empty / non-matching `image` keys
 *     (graceful fallback — the real, empty `event_illustrations/` dir);
 *   - EventModal renders the documentary-realism still ONLY when the resolver
 *     yields a URL (mocked to simulate a future committed asset);
 *   - EventModal WITHOUT an image is byte-identical to the same modal before
 *     the `image` field existed (no illustration node, narrative unchanged).
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveEventIllustration } from '../../src/ui/map/data/eventIllustrationArt.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import type { EventDisplayData } from '../../src/ui/map/components/EventModal.js';

const BASE_EVENT: EventDisplayData = {
  id: 'test_event',
  title: 'JNA Withdrawal Announced',
  narrative: 'The JNA announces a phased withdrawal from Bosnian territory.',
  category: 'military',
  effects: [{ kind: 'morale_change', description: 'RBiH morale +2' }],
  isDecision: false,
};

describe('resolveEventIllustration (graceful fallback)', () => {
  it('returns null for an undefined / empty / whitespace image key', () => {
    expect(resolveEventIllustration(undefined)).toBeNull();
    expect(resolveEventIllustration(null)).toBeNull();
    expect(resolveEventIllustration('')).toBeNull();
    expect(resolveEventIllustration('   ')).toBeNull();
  });

  it('returns null when no asset matches the key (empty event_illustrations dir today)', () => {
    // No imagery ships yet — the wiring exists but the dir is intentionally empty.
    expect(resolveEventIllustration('jna_withdrawal_1992.webp')).toBeNull();
    expect(resolveEventIllustration('event_illustrations/markale_1994.webp')).toBeNull();
  });
});

describe('EventModal illustration rendering', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('../../src/ui/map/data/eventIllustrationArt.js');
  });

  it('renders text-only (no illustration node) when the event has no image', async () => {
    setLocale('en');
    const { EventModal } = await import('../../src/ui/map/components/EventModal.js');
    const html = renderToStaticMarkup(
      React.createElement(EventModal, { event: BASE_EVENT, onAcknowledge: () => {} }),
    );
    // Graceful fallback: no illustration element, narrative + title still present.
    expect(html).not.toContain('event-modal-illustration');
    expect(html).not.toContain('<img');
    expect(html).toContain('JNA Withdrawal Announced');
    expect(html).toContain('The JNA announces a phased withdrawal');
  });

  it('is byte-identical with an image key when no asset resolves (still text-only)', async () => {
    setLocale('en');
    const { EventModal } = await import('../../src/ui/map/components/EventModal.js');
    const withoutImage = renderToStaticMarkup(
      React.createElement(EventModal, { event: BASE_EVENT, onAcknowledge: () => {} }),
    );
    const withUnresolvableImage = renderToStaticMarkup(
      React.createElement(EventModal, {
        event: { ...BASE_EVENT, image: 'not_on_disk_yet.webp' },
        onAcknowledge: () => {},
      }),
    );
    // An authored image whose asset is not committed yet must look IDENTICAL to
    // an event with no image at all — proving the absence path is unchanged.
    expect(withUnresolvableImage).toEqual(withoutImage);
  });

  it('renders the documentary-realism still when the resolver yields a URL', async () => {
    setLocale('en');
    // Simulate a future committed asset by mocking the resolver.
    vi.doMock('../../src/ui/map/data/eventIllustrationArt.js', () => ({
      resolveEventIllustration: (key: string | null | undefined) =>
        key ? '/assets/event_illustrations/jna_withdrawal_1992-abc123.webp' : null,
    }));
    const { EventModal } = await import('../../src/ui/map/components/EventModal.js');
    const html = renderToStaticMarkup(
      React.createElement(EventModal, {
        event: { ...BASE_EVENT, image: 'jna_withdrawal_1992.webp' },
        onAcknowledge: () => {},
      }),
    );
    expect(html).toContain('event-modal-illustration');
    expect(html).toContain('<img');
    expect(html).toContain('jna_withdrawal_1992-abc123.webp');
    // Narrative still renders alongside the illustration.
    expect(html).toContain('The JNA announces a phased withdrawal');
  });
});
