import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../..');
const fontsDirectory = resolve(repoRoot, 'assets/ui/fonts');
const globalsPath = resolve(repoRoot, 'src/ui/map/styles/globals.css');
const tailwindPath = resolve(repoRoot, 'src/ui/map/tailwind.config.ts');
// Explicitly bounded to player-facing surfaces reachable from App.tsx and their
// direct runtime children. Debug painters, stories, standalone tools, and map
// glyph-PBF configuration are intentionally outside this authored UI audit.
const activeSurfaceTypographyInventory = [
  'src/ui/map/components/MainMenu.tsx',
  'src/ui/map/components/CodexPanel.tsx',
  'src/ui/map/components/EventModal.tsx',
  'src/ui/map/components/chronicle/ChronicleOverlay.tsx',
  'src/ui/map/components/chronicle/ChronicleCard.tsx',
  'src/ui/map/components/army_hq/ChiefOfStaffBriefing.tsx',
  'src/ui/map/components/army_hq/CombatRecordSection.tsx',
  'src/ui/map/components/WarHasBegunSplash.tsx',
  'src/ui/map/components/SettingsScreen.tsx',
  'src/ui/map/components/CreditsScreen.tsx',
  'src/ui/map/components/PeacePlanModal.tsx',
  'src/ui/map/components/DaytonNegotiationModal.tsx',
  'src/ui/map/components/DaytonInstitutionalDimensions.tsx',
  'src/ui/map/components/DiplomacyOverview.tsx',
  'src/ui/map/components/TerritoryOverTimeChart.tsx',
  'src/ui/map/components/ops_modal/BrigadeCard.tsx',
  'src/ui/map/components/ops_modal/MapLegendTab.tsx',
  'src/ui/map/components/ops_modal/NarrativeTab.tsx',
  'src/ui/map/components/ops_modal/OpordDocument.tsx',
  'src/ui/map/components/ops_modal/OpsMap.tsx',
  'src/ui/map/components/ops_modal/PlanParameters.tsx',
  'src/ui/map/components/warroom/WarroomShellLayer.tsx',
  'src/ui/map/layers/buildTacticalDeckLayers.ts',
  'src/ui/map/map/formationIcons.ts',
] as const;
const upstreamMonoRanges = {
  Latin1: 'U+0020-007E, U+00A0-00FF, U+0131, U+0152-0153, U+02C6, U+02DA, U+02DC, U+2013-2014, U+2018-201A, U+201C-201E, U+2020-2022, U+2026, U+2030, U+2039-203A, U+2044, U+20AC, U+2122, U+2212, U+FB01-FB02',
  Latin2: 'U+0100-0101, U+0104-0130, U+0132-0151, U+0154-017F, U+018F, U+0192, U+01A0-01A1, U+01AF-01B0, U+01FA-01FF, U+0218-021B, U+0237, U+0259, U+1E80-1E85, U+1E9E, U+20A1, U+20A4, U+20A6, U+20A8-20AA, U+20AD-20AE, U+20B1-20B2, U+20B4-20B5, U+20B8-20BA, U+20BD, U+20BF',
} as const;

const bundledFonts = [
  'IBMPlexSans_Condensed-Regular.ttf',
  'IBMPlexSans_Condensed-SemiBold.ttf',
  'IBMPlexSans_Condensed-Bold.ttf',
  'IBMPlexMono-Regular-Latin1.woff2',
  'IBMPlexMono-Regular-Latin2.woff2',
  'IBMPlexMono-SemiBold-Latin1.woff2',
  'IBMPlexMono-SemiBold-Latin2.woff2',
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

function fontFaceFor(css: string, file: string): string {
  return css.match(new RegExp(`@font-face\\s*{[^}]*${escaped(file)}[^}]*}`, 's'))?.[0] ?? '';
}

function unicodeRangeCovers(range: string, codePoint: number): boolean {
  return range.split(',').some((token) => {
    const match = token.trim().match(/^U\+([0-9a-f?]+)(?:-([0-9a-f]+))?$/i);
    if (!match) return false;
    if (match[1].includes('?')) {
      const low = Number.parseInt(match[1].replaceAll('?', '0'), 16);
      const high = Number.parseInt(match[1].replaceAll('?', 'f'), 16);
      return codePoint >= low && codePoint <= high;
    }
    const low = Number.parseInt(match[1], 16);
    const high = match[2] ? Number.parseInt(match[2], 16) : low;
    return codePoint >= low && codePoint <= high;
  });
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
      ['IBM Plex Mono', 'IBMPlexMono-Regular-Latin2.woff2', '400'],
      ['IBM Plex Mono', 'IBMPlexMono-SemiBold-Latin1.woff2', '600'],
      ['IBM Plex Mono', 'IBMPlexMono-SemiBold-Latin2.woff2', '600'],
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

  it('routes Bosnian Latin Extended-A glyphs through both Latin-2 weights', () => {
    const css = readFileSync(globalsPath, 'utf8');
    const bosnianCodePoints = [0x0106, 0x010c, 0x0110, 0x0160, 0x017d];

    for (const weight of ['Regular', 'SemiBold']) {
      for (const subset of ['Latin1', 'Latin2']) {
        const face = fontFaceFor(css, `IBMPlexMono-${weight}-${subset}.woff2`);
        const range = face.match(/unicode-range:\s*([^;]+);/i)?.[1].trim() ?? '';
        expect(range, `${weight} ${subset}`).toBe(upstreamMonoRanges[subset as keyof typeof upstreamMonoRanges]);
      }

      const latin2Face = fontFaceFor(css, `IBMPlexMono-${weight}-Latin2.woff2`);
      const range = latin2Face.match(/unicode-range:\s*([^;]+);/i)?.[1] ?? '';
      for (const codePoint of bosnianCodePoints) {
        expect(unicodeRangeCovers(range, codePoint), `${weight} U+${codePoint.toString(16)}`).toBe(true);
      }
    }
  });

  it('maps Tailwind sans and serif to command, and mono to data', () => {
    const config = readFileSync(tailwindPath, 'utf8');
    expect(config).toMatch(/sans:\s*\[\s*['"]var\(--font-command\)['"]/);
    expect(config).toMatch(/serif:\s*\[\s*['"]var\(--font-command\)['"]/);
    expect(config).toMatch(/mono:\s*\[\s*['"]var\(--font-data\)['"]/);
    expectNoExternalRuntimeFont(config);
  });

  it('keeps active authored surfaces on the canonical command and data families', () => {
    const authoredForbiddenFamily =
      /fontFamily\s*(?::|=)[^\r\n]*(?:Georgia|Times New Roman|Courier New|Arial|Helvetica|Segoe UI)[^\r\n]*|\bfont-serif\b/g;
    const offenders: string[] = [];

    for (const relativePath of activeSurfaceTypographyInventory) {
      const source = readFileSync(resolve(repoRoot, relativePath), 'utf8');
      for (const match of source.matchAll(authoredForbiddenFamily)) {
        const line = source.slice(0, match.index).split('\n').length;
        offenders.push(`${relativePath}:${line}: ${match[0]}`);
      }
    }

    expect(offenders, offenders.join('\n')).toEqual([]);
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
    expect(readme).toContain(
      'IBM-Plex-Mono/fonts/split/woff2/IBMPlexMono-Regular-Latin2.woff2',
    );
    expect(readme).toContain(
      'IBM-Plex-Mono/fonts/split/woff2/IBMPlexMono-SemiBold-Latin2.woff2',
    );

    for (const file of bundledFonts) {
      expect(existsSync(resolve(fontsDirectory, file)), file).toBe(true);
      expect(readme, `${file} SHA-256`).toContain(`${file}: ${sha256(resolve(fontsDirectory, file))}`);
    }
  });
});
