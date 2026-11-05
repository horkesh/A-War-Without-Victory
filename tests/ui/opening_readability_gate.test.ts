import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { getPlayerSafeThreatPresentation } from '../../src/ui/map/utils/playerSafeThreat.js';

const repoRoot = resolve(__dirname, '../..');

function srgbToLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
  return 0.2126 * srgbToLinear(channels[0]!)
    + 0.7152 * srgbToLinear(channels[1]!)
    + 0.0722 * srgbToLinear(channels[2]!);
}

function contrast(foreground: string, background: string): number {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function declaredRemSize(css: string, selector: string): number {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rules = [...css.matchAll(new RegExp(`[^{}]*${escapedSelector}[^{}]*\\{([^{}]*)\\}`, 'g'))];
  expect(rules.length, `${selector} rules`).toBeGreaterThan(0);

  const size = rules
    .map((rule) => rule[1]!.match(/font-size:\s*([0-9.]+)rem/)
      ?? rule[1]!.match(/font:\s*[^;]*?([0-9.]+)rem\//))
    .find((match) => match != null);
  expect(size, `${selector} font size`).not.toBeNull();
  return Number(size![1]);
}

describe('retained Electron shakedown readability gates', () => {
  it('keeps the nine captured opening and menu declarations at 12 CSS px or larger', () => {
    const css = readFileSync(resolve(repoRoot, 'src/ui/map/styles/globals.css'), 'utf8');
    const capturedSelectors = [
      '.opening-splash__eyebrow',
      '.main-menu-opening__identity p',
      '.main-menu-opening__locale',
      '.command-back-button',
      '.command-primary-button',
      '.faction-rail__label small',
      '.command-dossier__header p',
      '.command-dossier__rows h3',
      '.command-mode__body',
    ];

    for (const selector of capturedSelectors) {
      expect(declaredRemSize(css, selector), selector).toBeGreaterThanOrEqual(0.75);
    }
  });

  it('uses an AA critical-pressure color on the darkest Army HQ card surface', () => {
    const presentation = getPlayerSafeThreatPresentation(2.1);

    expect(presentation.toneClass).toContain('text-red-400');
    expect(contrast('#f87171', '#252220')).toBeGreaterThanOrEqual(4.5);
  });

  it('uses an AA active-state color on the Corps Front paper surface', () => {
    const source = readFileSync(resolve(repoRoot, 'src/ui/map/components/CorpsFrontPanel.tsx'), 'utf8');

    expect(source).toContain("opsecActive ? 'text-amber-800 font-bold' : 'text-neutral-700'");
    expect(contrast('#92400e', '#f0e8d8')).toBeGreaterThanOrEqual(4.5);
  });
});
