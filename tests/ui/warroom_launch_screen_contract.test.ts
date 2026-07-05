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
