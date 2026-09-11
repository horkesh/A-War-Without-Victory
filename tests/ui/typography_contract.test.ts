import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { withoutBlockComments } from '../helpers/sourceComments';

const repoRoot = resolve(__dirname, '../..');
const fontsDirectory = resolve(repoRoot, 'assets/ui/fonts');
const globalsPath = resolve(repoRoot, 'src/ui/map/styles/globals.css');
const tailwindPath = resolve(repoRoot, 'src/ui/map/tailwind.config.ts');
const rendererTypographyPath = resolve(repoRoot, 'src/ui/map/styles/typography.ts');
const activeTypographySourceRoots = [
  'src/ui/map/components',
  'src/ui/map/layers',
  'src/ui/map/map',
] as const;
const explicitlyExcludedTypographySources = [
  /(?:^|\/)(?:debug|painters?|stories|standalone)\//,
  /\.stories\.[cm]?[jt]sx?$/,
  /^src\/ui\/map\/map\/glyphPbfConfig\.ts$/,
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
  // The marker hand for the whiteboard date. Listing it here puts it under the same existence,
  // nonempty and SHA-256 checks as everything else — a bundled font whose bytes nobody pins is a
  // font that can be swapped without anyone noticing.
  'Caveat-Bold-Latin.woff2',
  'Caveat-Bold-LatinExt.woff2',
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

// Block comments only: in CSS `//` is not a comment, and stripping it would eat `https://` and
// make expectNoExternalRuntimeFont vacuous. See tests/helpers/sourceComments.ts for why every
// negative token check in this file runs on stripped CSS.
const withoutComments = withoutBlockComments;

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

function discoverActiveTypographySources(): string[] {
  const discovered: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        visit(path);
      } else if (/\.[cm]?[jt]sx?$/.test(entry.name)) {
        const relativePath = relative(repoRoot, path).replaceAll('\\', '/');
        if (!explicitlyExcludedTypographySources.some((pattern) => pattern.test(relativePath))) {
          discovered.push(relativePath);
        }
      }
    }
  };

  for (const root of activeTypographySourceRoots) visit(resolve(repoRoot, root));
  return discovered.sort();
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

  it('exports exact family literals for canvas and Deck render APIs', () => {
    const source = readFileSync(rendererTypographyPath, 'utf8');
    expect(source).toMatch(/export const UI_COMMAND_FONT_FAMILY\s*=\s*['"]IBM Plex Sans Condensed['"]/);
    expect(source).toMatch(/export const UI_DATA_FONT_FAMILY\s*=\s*['"]IBM Plex Mono['"]/);
  });

  it('allows only the canonical two families across discovered active UI sources', () => {
    const offenders: string[] = [];
    const markerUses: string[] = [];
    const allowedFamilyAssignment =
      /^fontFamily\s*(?::|=)\s*(?:['"]var\(--font-(?:command|data)\)['"]|\{?UI_(?:COMMAND|DATA)_FONT_FAMILY\}?)\s*(?=[,}\r\n]|\/?>)/;
    // THE MARKER IS A DIEGETIC EXCEPTION, AND A DELIBERATELY NARROW ONE.
    //
    // This test is the typography-unification sweep in permanent form, and a sweep exactly like it
    // is what ate the handwriting the first time: commit 44b42f28b folded the whiteboard date into
    // `var(--font-data)` under a general "unify active interface typography" pass, and the date has
    // read as machine text ever since.
    //
    // So `--font-marker` is allowed — but only in the warroom shell, and only once. It is not a
    // third UI family; it is ink on a physical object in a painted room. A second use anywhere is
    // the beginning of it becoming a UI font, and fails here.
    const markerAssignment = /^fontFamily\s*(?::|=)\s*['"]var\(--font-marker\)['"]\s*(?=[,}\r\n]|\/?>)/;
    const markerOwner = 'src/ui/map/components/warroom/WarroomShellLayer.tsx';

    for (const relativePath of discoverActiveTypographySources()) {
      const source = readFileSync(resolve(repoRoot, relativePath), 'utf8');
      for (const match of source.matchAll(/fontFamily\s*(?::|=)/g)) {
        const assignment = source.slice(match.index, match.index + 180);
        if (allowedFamilyAssignment.test(assignment)) continue;
        const line = source.slice(0, match.index).split('\n').length;
        if (markerAssignment.test(assignment) && relativePath === markerOwner) {
          markerUses.push(`${relativePath}:${line}`);
          continue;
        }
        offenders.push(`${relativePath}:${line}: ${assignment.split(/\r?\n/, 1)[0]}`);
      }
      for (const match of source.matchAll(/\b[A-Za-z_$][\w$]*\.font\s*=/g)) {
        const assignment = source.slice(match.index, match.index + 180);
        if (/^[A-Za-z_$][\w$]*\.font\s*=\s*[^;\r\n]*UI_(?:COMMAND|DATA)_FONT_FAMILY/.test(assignment)) continue;
        const line = source.slice(0, match.index).split('\n').length;
        offenders.push(`${relativePath}:${line}: ${assignment.split(/\r?\n/, 1)[0]}`);
      }
      for (const match of source.matchAll(/\bfont\s*:/g)) {
        const assignment = source.slice(match.index, match.index + 180);
        if (/^font\s*:[^;\r\n]*(?:var\(--font-(?:command|data)\)|UI_(?:COMMAND|DATA)_FONT_FAMILY)/.test(assignment)) continue;
        const line = source.slice(0, match.index).split('\n').length;
        offenders.push(`${relativePath}:${line}: ${assignment.split(/\r?\n/, 1)[0]}`);
      }
      for (const match of source.matchAll(/font-family\s*:/gi)) {
        const assignment = source.slice(match.index, match.index + 180);
        if (/^font-family\s*:\s*var\(--font-(?:command|data)\)\s*(?=;|['"\r\n])/i.test(assignment)) continue;
        const line = source.slice(0, match.index).split('\n').length;
        offenders.push(`${relativePath}:${line}: ${assignment.split(/\r?\n/, 1)[0]}`);
      }
      for (const match of source.matchAll(/\bfont-serif\b|\bfont-\[[^\]]+\]/g)) {
        const line = source.slice(0, match.index).split('\n').length;
        offenders.push(`${relativePath}:${line}: ${match[0]}`);
      }
    }

    expect(offenders, offenders.join('\n')).toEqual([]);
    // Exactly one marker surface. Zero means the handwriting was absorbed again; more than one
    // means it is spreading into the interface.
    expect(markerUses, markerUses.join('\n')).toHaveLength(1);
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

  // ── The marker hand ────────────────────────────────────────────────────────────
  //
  // The whiteboard date was meant to look scrawled with a flomaster and does not, and the root
  // cause was that NO handwriting face was bundled: an inventory of every font declaration in the
  // warroom returned 22 results, all IBM Plex. Seven commits of legibility fixes had each retreated
  // further toward a UI font because there was nothing else to retreat to.
  //
  // These tests exist to stop that happening again, and the separation is the load-bearing part.

  it('bundles Caveat with its own OFL license, since the copyright holder differs', () => {
    const license = readFileSync(resolve(fontsDirectory, 'OFL-1.1-Caveat.txt'), 'utf8');
    expect(license).toContain('SIL OPEN FONT LICENSE Version 1.1');
    expect(license).toContain('Caveat Project Authors');
  });

  it('declares Caveat at weight 700 across both Latin subsets, locally', () => {
    const css = readFileSync(globalsPath, 'utf8');
    for (const file of ['Caveat-Bold-Latin.woff2', 'Caveat-Bold-LatinExt.woff2']) {
      expect(css, file).toMatch(
        new RegExp(`@font-face\\s*{[^}]*Caveat[^}]*${escaped(file)}[^}]*font-weight:\\s*700`, 'is'),
      );
    }
  });

  it('routes the Bosnian c-caron through the Caveat Latin-Ext subset', () => {
    // `getWarroomBoardDateLabel` can return 'Datum čeka'. A digits-and-months subset would drop
    // the č, which is why the plan requires Latin-1 + Latin Extended-A rather than a glyph list.
    const css = readFileSync(globalsPath, 'utf8');
    const face = /@font-face\s*{[^}]*Caveat-Bold-LatinExt\.woff2[^}]*unicode-range:\s*([^;]+);/is.exec(css);
    expect(face, 'Caveat Latin-Ext @font-face').not.toBeNull();
    expect(unicodeRangeCovers(face![1], 0x010d), 'U+010D c-caron').toBe(true);
  });

  it('keeps --font-marker OUT of the command and data tokens', () => {
    // The plan is explicit: do not route the marker through --font-data or --font-command. Those
    // are UI tokens, and the next typography-unification pass would absorb the marker face exactly
    // as commit 44b42f28b did. This assertion is the thing that makes that instruction binding.
    const css = withoutComments(readFileSync(globalsPath, 'utf8'));
    expect(css).toMatch(/--font-marker:\s*["']Caveat["']/);
    expect(css).not.toMatch(/--font-command:[^;]*Caveat/);
    expect(css).not.toMatch(/--font-data:[^;]*Caveat/);
  });

  it('never falls back to a system handwriting face', () => {
    // Falling back to a system hand IS the defect that started this item: the accessibility test
    // forbids Segoe Print and Comic Sans MS precisely because they were reached for. If Caveat
    // fails to load the date should look wrong, not quietly wrong.
    const css = withoutComments(readFileSync(globalsPath, 'utf8'));
    const marker = /--font-marker:\s*([^;]+);/.exec(css);
    expect(marker, '--font-marker token').not.toBeNull();
    expect(marker![1]).not.toMatch(/cursive|Segoe Print|Comic Sans|Bradley|Chalkboard/i);
  });
});
