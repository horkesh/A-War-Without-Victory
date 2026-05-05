/**
 * css_z_index_canonical.test.ts
 *
 * Pin LANE-V094-CSS-ZINDEX-CLEANUP — companion to
 * `tests/z_index_canonical.test.ts`.
 *
 * The predecessor lane (LANE-V094-Z-INDEX-TOKENS) migrated 41 React-shell
 * source files to inline `style={{ zIndex: Z.X }}` referencing
 * `src/ui/shared/zIndex.ts`. It explicitly DEFERRED a set of CSS / HTML /
 * debug-viewer literals that are NOT React-rendered:
 *
 *   - `src/ui/map/styles/globals.css`           (frame chrome / decorative ::after)
 *   - `src/ui/warroom/styles/war-planning-map.css` (legacy warroom map shell)
 *   - `src/ui/warroom/styles/ticker.css`        (legacy warroom news ticker)
 *   - `src/ui/warroom/styles/modals.css`        (legacy warroom modal shell)
 *   - `src/ui/warroom/index.html`               (inline <style> block only)
 *   - `src/ui/warroom/map_viewer_standalone.html` (debug map viewer HTML)
 *   - `src/ui/map/painter.html`                 (debug painter tool)
 *   - `src/ui/warroom/map_viewer_app.ts`        (debug map viewer inline-style)
 *
 * This lane (LANE-V094-CSS-ZINDEX-CLEANUP) annotates every literal whose
 * numeric value matches a canonical `Z.X` tier with an inline comment of
 * shape `canonical: Z.<TIER> = <N>` on (or immediately before) the line
 * containing the numeric literal. Non-shell-tier values
 * (0, 1, 2, 5, 20, 999, 1001, 1500, 2000) have no canonical token in `Z`
 * and are left bare — task instructions explicitly forbid inventing a new
 * canonical tier in this lane.
 *
 * Test contract:
 *
 *   T1 — every touched file exists and is readable.
 *   T2 — every literal whose value matches a canonical shell-tier value
 *        in `Z` carries an inline canonical comment on the same logical
 *        line naming a real `Z.<TIER>` token from `src/ui/shared/zIndex.ts`.
 *   T3 — every named `Z.<TIER>` token referenced in a canonical comment
 *        is a real key on the frozen `Z` table, and the asserted numeric
 *        value matches the canonical numeric value byte-for-byte.
 *   T4 — non-shell-tier bare literals are explicitly enumerated; any new
 *        bare literal whose value DOES match a canonical shell tier is
 *        a regression (e.g. someone adding `z-index: 1000` later without
 *        the canonical comment).
 *
 * Sensitive-history compliance: Ring 1, faction-agnostic, no Section 6
 * surface. UI-only — does NOT enter sim path.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Z } from '../src/ui/shared/zIndex';

const repoRoot = resolve(__dirname, '..');
const read = (p: string) => readFileSync(resolve(repoRoot, p), 'utf8');

/**
 * Files this lane touched (CSS/HTML/debug-viewer surfaces). Each is grepped
 * for bare-numeric `z-index: N` (CSS) or `zIndex: 'N'` / `zIndex: N` (TS
 * inline-style) literals and validated.
 */
const TOUCHED_FILES = [
  'src/ui/map/styles/globals.css',
  'src/ui/warroom/styles/war-planning-map.css',
  'src/ui/warroom/styles/ticker.css',
  'src/ui/warroom/styles/modals.css',
  'src/ui/warroom/index.html',
  'src/ui/warroom/map_viewer_standalone.html',
  'src/ui/map/painter.html',
  'src/ui/warroom/map_viewer_app.ts',
] as const;

/**
 * Canonical shell-tier numeric values — every literal in a touched file
 * whose value is in this set MUST be accompanied by an inline canonical
 * comment naming a real `Z.<TIER>` token.
 *
 * This set is derived from `Z` — anything in the canonical table is a
 * shell tier. The inverse — values NOT in this set — are intra-component
 * or legacy stacking contexts that lie outside the canonical taxonomy
 * and are intentionally left bare in this lane (per task: do not invent
 * new tiers).
 */
const SHELL_TIER_NUMBERS: ReadonlySet<number> = new Set(
  Object.values(Z).map((v) => Number(v)),
);

/**
 * Match a CSS-style `z-index: <n>` declaration. Captures: 1=numeric value.
 */
const RE_CSS_Z_INDEX = /z-index\s*:\s*(-?\d+)/g;

/**
 * Match a TS / JS object-literal `zIndex: '<n>'` or `zIndex: <n>` shape.
 * Captures: 1=numeric value.
 */
const RE_TS_Z_INDEX = /zIndex\s*:\s*['"]?(-?\d+)['"]?/g;

/**
 * Bare-numeric literal exemptions — values NOT in `Z` (the canonical table)
 * that legitimately appear in these files as intra-component stacking
 * contexts. Listed for transparency. New literals matching a shell-tier
 * numeric MUST be annotated; new literals outside the shell tier MAY be
 * left bare (the test only flags shell-tier regressions).
 *
 * Current intra-component values found in the touched files:
 *   0, 1, 2, 5, 20, 999, 1001, 1500, 2000
 */
const KNOWN_NON_SHELL_TIER_VALUES = new Set<number>([
  0, 1, 2, 5, 20, 999, 1001, 1500, 2000,
]);

/**
 * Extract a `canonical: Z.<TIER> = <N>` reference from a window of source
 * text (typically the line containing the literal plus its preceding line,
 * to support TS inline-style where the comment lives on the previous line).
 */
function parseCanonicalRef(
  window: string,
): { tier: string; assertedValue: number } | null {
  const m = window.match(/canonical:\s*Z\.([A-Z_][A-Z_0-9]*)\s*=\s*(-?\d+)/);
  if (!m) return null;
  return { tier: m[1], assertedValue: Number(m[2]) };
}

/**
 * Build the inspection window for a literal at `index` in `src`: returns
 * the preceding line concatenated with the literal's own line. This matches
 * the agreed annotation policy:
 *   - CSS: trailing inline `/_ canonical: ... _/` on the same line.
 *   - TS object literal: leading `// canonical: ...` on the previous line.
 */
function inspectionWindow(src: string, index: number): string {
  const lineStart = src.lastIndexOf('\n', index) + 1;
  const lineEnd = src.indexOf('\n', index);
  const line = src.slice(lineStart, lineEnd === -1 ? src.length : lineEnd);
  const prevLineEnd = lineStart - 1;
  const prevLineStart =
    prevLineEnd > 0 ? src.lastIndexOf('\n', prevLineEnd - 1) + 1 : 0;
  const prevLine = prevLineEnd > 0 ? src.slice(prevLineStart, prevLineEnd) : '';
  return `${prevLine}\n${line}`;
}

/**
 * Collect every numeric `z-index` / `zIndex` literal in `src`, returning
 * the value and the inspection window for each.
 */
function collectLiterals(
  src: string,
  isTs: boolean,
): Array<{ value: number; window: string }> {
  const out: Array<{ value: number; window: string }> = [];
  RE_CSS_Z_INDEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RE_CSS_Z_INDEX.exec(src)) !== null) {
    out.push({ value: Number(m[1]), window: inspectionWindow(src, m.index) });
  }
  if (isTs) {
    RE_TS_Z_INDEX.lastIndex = 0;
    while ((m = RE_TS_Z_INDEX.exec(src)) !== null) {
      out.push({ value: Number(m[1]), window: inspectionWindow(src, m.index) });
    }
  }
  return out;
}

describe('CSS / debug-viewer z-index canonical comments — LANE-V094-CSS-ZINDEX-CLEANUP', () => {
  it('T1 — every touched file exists and is readable', () => {
    for (const path of TOUCHED_FILES) {
      const abs = resolve(repoRoot, path);
      expect(existsSync(abs), `${path} should exist`).toBe(true);
      const src = read(path);
      expect(typeof src).toBe('string');
      expect(src.length).toBeGreaterThan(0);
    }
  });

  it('T2 — every shell-tier literal carries an inline canonical comment naming a real Z.<TIER> token', () => {
    for (const path of TOUCHED_FILES) {
      const src = read(path);
      const isTs = path.endsWith('.ts');
      for (const { value, window } of collectLiterals(src, isTs)) {
        if (!SHELL_TIER_NUMBERS.has(value)) continue;
        const ref = parseCanonicalRef(window);
        expect(
          ref,
          `${path}: shell-tier z-index literal '${value}' must carry an inline 'canonical: Z.<TIER> = ${value}' comment.`,
        ).not.toBeNull();
        if (ref) {
          expect(
            ref.assertedValue,
            `${path}: canonical comment asserts ${ref.assertedValue} but literal is ${value}`,
          ).toBe(value);
        }
      }
    }
  });

  it('T3 — every Z.<TIER> token named in a canonical comment exists in Z with the asserted numeric value', () => {
    for (const path of TOUCHED_FILES) {
      const src = read(path);
      const re = /canonical:\s*Z\.([A-Z_][A-Z_0-9]*)\s*=\s*(-?\d+)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        const tier = m[1];
        const assertedValue = Number(m[2]);
        expect(
          tier in Z,
          `${path}: canonical comment names Z.${tier} but no such tier exists in src/ui/shared/zIndex.ts`,
        ).toBe(true);
        const canonicalValue = (Z as unknown as Record<string, number>)[tier];
        expect(
          canonicalValue,
          `${path}: comment asserts Z.${tier} = ${assertedValue} but Z.${tier} = ${canonicalValue}`,
        ).toBe(assertedValue);
      }
    }
  });

  it('T4 — bare non-shell-tier literals are documented; any new bare shell-tier literal is a regression', () => {
    for (const path of TOUCHED_FILES) {
      const src = read(path);
      const isTs = path.endsWith('.ts');
      for (const { value, window } of collectLiterals(src, isTs)) {
        if (parseCanonicalRef(window) !== null) continue; // annotated — OK
        // Bare literal: must NOT be a shell-tier value.
        expect(
          SHELL_TIER_NUMBERS.has(value),
          `${path}: bare-numeric z-index literal '${value}' matches a canonical shell tier — must be annotated with an inline 'canonical: Z.<TIER> = ${value}' comment`,
        ).toBe(false);
        // Documented exemption.
        expect(
          KNOWN_NON_SHELL_TIER_VALUES.has(value),
          `${path}: non-shell-tier literal '${value}' is not in KNOWN_NON_SHELL_TIER_VALUES — add it if it is a legitimate intra-component value, or annotate it if it should be a shell tier`,
        ).toBe(true);
      }
    }
  });
});
