import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../..');
const fontsDirectory = resolve(repoRoot, 'assets/ui/fonts');
const globalsPath = resolve(repoRoot, 'src/ui/map/styles/globals.css');
const tailwindPath = resolve(repoRoot, 'src/ui/map/tailwind.config.ts');

const bundledFonts = [
  'IBMPlexSans_Condensed-Regular.ttf',
  'IBMPlexSans_Condensed-SemiBold.ttf',
  'IBMPlexSans_Condensed-Bold.ttf',
  'IBMPlexMono-Regular-Latin1.woff2',
  'IBMPlexMono-SemiBold-Latin1.woff2',
] as const;

function escaped(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function expectNoExternalRuntimeFont(source: string): void {
  expect(source).not.toMatch(/https?:\/\/fonts\.(?:googleapis|gstatic)\.com/i);
  expect(source).not.toMatch(/@import\s+(?:url\()?\s*['"]?https?:\/\//i);
  expect(source).not.toMatch(/@font-face\s*{[^}]*url\(\s*['"]?https?:\/\//is);
}

describe('canonical UI typography contract', () => {
  it('bundles every canonical font and its OFL license as nonempty local assets', () => {
    for (const file of [...bundledFonts, 'OFL-1.1.txt', 'README.md']) {
      const path = resolve(fontsDirectory, file);
      expect(existsSync(path), file).toBe(true);
      expect(statSync(path).size, file).toBeGreaterThan(0);
    }

    expect(readFileSync(resolve(fontsDirectory, 'OFL-1.1.txt'), 'utf8')).toContain(
      'SIL OPEN FONT LICENSE Version 1.1',
    );
  });

  it('declares local command and data font faces at the required weights', () => {
    const css = readFileSync(globalsPath, 'utf8');
    const expectedFaces = [
      ['IBM Plex Sans Condensed', 'IBMPlexSans_Condensed-Regular.ttf', '400'],
      ['IBM Plex Sans Condensed', 'IBMPlexSans_Condensed-SemiBold.ttf', '600'],
      ['IBM Plex Sans Condensed', 'IBMPlexSans_Condensed-Bold.ttf', '700'],
      ['IBM Plex Mono', 'IBMPlexMono-Regular-Latin1.woff2', '400'],
      ['IBM Plex Mono', 'IBMPlexMono-SemiBold-Latin1.woff2', '600'],
    ] as const;

    for (const [family, file, weight] of expectedFaces) {
      const face = new RegExp(
        `@font-face\\s*{(?=[^}]*font-family:\\s*["']${escaped(family)}["'])(?=[^}]*font-weight:\\s*${weight})(?=[^}]*url\\(["']?[^)]*${escaped(file)}["']?\\))[^}]*}`,
        's',
      );
      expect(css, `${family} ${weight}`).toMatch(face);
    }

    expect(css).toMatch(/--font-command:\s*["']IBM Plex Sans Condensed["']/);
    expect(css).toMatch(/--font-data:\s*["']IBM Plex Mono["']/);
    expectNoExternalRuntimeFont(css);
  });

  it('maps Tailwind sans and serif to command, and mono to data', () => {
    const config = readFileSync(tailwindPath, 'utf8');
    expect(config).toMatch(/sans:\s*\[\s*['"]var\(--font-command\)['"]/);
    expect(config).toMatch(/serif:\s*\[\s*['"]var\(--font-command\)['"]/);
    expect(config).toMatch(/mono:\s*\[\s*['"]var\(--font-data\)['"]/);
    expectNoExternalRuntimeFont(config);
  });

  it('records the pinned upstream revision, raw paths, and font hashes', () => {
    const readmePath = resolve(fontsDirectory, 'README.md');
    expect(existsSync(readmePath), 'README.md').toBe(true);
    const readme = readFileSync(readmePath, 'utf8');
    expect(readme).toContain('242c4cccd37e87985a5337815c99b960ef13c65c');
    expect(readme).toContain(
      'IBM-Plex-Mono/fonts/split/woff2/IBMPlexMono-Regular-Latin1.woff2',
    );
    expect(readme).toContain(
      'IBM-Plex-Mono/fonts/split/woff2/IBMPlexMono-SemiBold-Latin1.woff2',
    );

    for (const file of bundledFonts) {
      expect(readme, `${file} SHA-256`).toContain(`${file}: ${sha256(resolve(fontsDirectory, file))}`);
    }
  });
});
