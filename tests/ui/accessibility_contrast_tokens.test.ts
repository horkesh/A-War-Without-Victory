import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../..');

function srgbToLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrast(fg: string, bg: string): number {
  const high = Math.max(luminance(fg), luminance(bg));
  const low = Math.min(luminance(fg), luminance(bg));
  return (high + 0.05) / (low + 0.05);
}

const TOKENS = {
  'panel-bg': '#1c1a17',
  'panel-card': '#252220',
  'text-primary': '#ddd5c8',
  'text-secondary': '#9a9080',
  'accent-gold': '#c4a35a',
  interactive: '#6a9ec2',
  'status-good': '#56d364',
  'status-warn': '#e8a838',
  'status-danger': '#f47068',
  'faction-rs-subtle': '#b77272',
  'faction-rbih-subtle': '#79b07f',
  'faction-hrhb-subtle': '#6d99c3',
} as const;

describe('accessibility P0 contrast tokens', () => {
  it('pins WCAG AA text contrast for canonical map palette pairs', () => {
    const pairs: Array<[keyof typeof TOKENS, keyof typeof TOKENS]> = [
      ['text-primary', 'panel-bg'],
      ['text-primary', 'panel-card'],
      ['text-secondary', 'panel-bg'],
      ['text-secondary', 'panel-card'],
      ['accent-gold', 'panel-bg'],
      ['interactive', 'panel-bg'],
      ['status-good', 'panel-bg'],
      ['status-warn', 'panel-bg'],
      ['status-danger', 'panel-bg'],
      ['faction-rs-subtle', 'panel-bg'],
      ['faction-rbih-subtle', 'panel-bg'],
      ['faction-hrhb-subtle', 'panel-bg'],
    ];

    for (const [fg, bg] of pairs) {
      expect(contrast(TOKENS[fg], TOKENS[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('tailwind config still declares the audited token values', () => {
    const config = readFileSync(resolve(repoRoot, 'src/ui/map/tailwind.config.ts'), 'utf8');
    for (const [name, value] of Object.entries(TOKENS)) {
      expect(config).toContain(`'${name}': '${value}'`);
    }
  });
});
