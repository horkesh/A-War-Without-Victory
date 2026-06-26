import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../..');
const read = (path: string) => readFileSync(resolve(repoRoot, path), 'utf8');

describe('accessibility P0 reduced motion', () => {
  it('globals.css has OS and in-game reduced-motion gates that collapse animation and transition timing', () => {
    const css = read('src/ui/map/styles/globals.css');

    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*{[\s\S]*?\*\s*,[\s\S]*?\*::before\s*,[\s\S]*?\*::after\s*{[\s\S]*?animation-duration:\s*0\.01ms\s*!important[\s\S]*?animation-iteration-count:\s*1\s*!important[\s\S]*?transition-duration:\s*0\.01ms\s*!important[\s\S]*?scroll-behavior:\s*auto\s*!important[\s\S]*?}/);
    expect(css).toMatch(/html\.user-reduce-motion\s+\*[\s\S]*html\.user-reduce-motion\s+\*::before[\s\S]*html\.user-reduce-motion\s+\*::after\s*{[\s\S]*?animation-duration:\s*0\.01ms\s*!important[\s\S]*?animation-iteration-count:\s*1\s*!important[\s\S]*?transition-duration:\s*0\.01ms\s*!important[\s\S]*?scroll-behavior:\s*auto\s*!important[\s\S]*?}/);
  });

  it('defines the shared keyboard focus-visible utility used by tactical controls', () => {
    const css = read('src/ui/map/styles/globals.css');

    expect(css).toMatch(/\.kbd-focus:focus-visible\s*{[\s\S]*?outline:\s*2px solid[\s\S]*?outline-offset:\s*2px[\s\S]*?box-shadow:/);
  });
});
