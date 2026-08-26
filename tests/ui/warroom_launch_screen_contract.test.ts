/**
 * SCOPE NOTE (2026-08-27): this pins the warroom's own launch card, which since
 * 2026-08-27 is NO LONGER the desktop launch screen. Desktop now opens the case-file
 * sequence (src/ui/map/components/MainMenu.tsx) inside the shell iframe; this card
 * remains the browser/dev-mode opening, which has no shell iframe to host that flow.
 *
 * The assertions below are still valid for that path. Do not read a pass here as
 * evidence about what a desktop player sees — this test never clicks anything, which
 * is why it stayed green through the period when the desktop app could not start a
 * campaign at all. End-to-end desktop launch is covered by tools/playtest/run_electron.ts.
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('Warroom launch screen fullscreen contract', () => {
  it('keeps the launch card legible and scaled on ultrawide fullscreen displays', () => {
    const html = readFileSync('src/ui/warroom/index.html', 'utf8');
    const css = readFileSync('src/ui/warroom/styles/modals.css', 'utf8');
    const runtime = readFileSync('src/ui/warroom/warroom.ts', 'utf8');

    expect(html).toContain('class="mm-stage"');
    expect(html).toContain('class="mm-brand"');
    expect(html).toContain('class="mm-card"');
    expect(css).toContain('--mm-scale');
    expect(css).toContain('display: grid');
    expect(css).toContain('grid-template-rows: auto auto');
    expect(css).toContain('width: min(760px, calc(100vw - 64px))');
    expect(css).toContain('width: min(560px, 100%)');
    expect(css).toContain('min-height: 100dvh');
    expect(css).toContain('isolation: isolate');
    expect(css).toContain('#main-menu::before');
    expect(css).toContain('background-position: center 58%');
    expect(css).toContain('@media (min-width: 1600px)');
    expect(css).toContain('@media (max-height: 760px)');
    expect(css).not.toContain('letter-spacing: calc(');
    expect(runtime).toContain('linear-gradient(90deg, rgba(4, 6, 10, 0.34)');
    expect(runtime).toContain('url(${gameStartBgUrl})');
    expect(runtime).not.toContain('url(${gameStartBgUrl}), radial-gradient');
  });
});
