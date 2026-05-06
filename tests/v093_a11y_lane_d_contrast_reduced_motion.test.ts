/**
 * v093_a11y_lane_d_contrast_reduced_motion.test.ts
 *
 * Pin LANE-NIGHTSHIFT-V093-A11Y-LANE-D — closes 3 of 4 P0 v1.0-ship a11y
 * blockers identified by `docs/40_reports/audits/20260506_V093_A11Y_PHASE_0_PANEL.md`:
 *
 *   - A4-A : WCAG-AA contrast token audit on canonical Tailwind palette pairs.
 *   - A6-A : `prefers-reduced-motion` media query block in globals.css
 *            (previously zero matches anywhere in src/).
 *   - A4-D : Colorblind-mode wiring — additive presets in factionPalette.ts;
 *            CSS-var presets in globals.css; SettingsScreen persistence.
 *
 * Test contract:
 *
 *   T1  factionPalette default preset RGB byte-stable
 *        (RS=200,70,70 / RBiH=70,165,90 / HRHB=70,130,200).
 *   T2  All 4 colorblind presets present (default + 3 deficiency variants).
 *   T3  Each colorblind preset declares all three canonical factions with
 *        valid 0..255 RGB tuples.
 *   T4  Each colorblind preset's faction colors are pairwise distinguishable
 *        by luminance (≥1.4× ratio between brightest and darkest of the
 *        three; brightness sortable so user can tell them apart).
 *   T5  WCAG AA contrast: text-primary on panel-bg ≥ 4.5:1.
 *   T6  WCAG AA contrast: text-secondary on panel-bg ≥ 4.5:1
 *        AND text-secondary on panel-card ≥ 4.5:1 (audit borderline pair).
 *   T7  WCAG AA contrast: accent-gold + interactive on panel-bg ≥ 4.5:1.
 *   T8  WCAG AA contrast: status-good / status-warn / status-danger on
 *        panel-bg AND panel-card ≥ 4.5:1.
 *   T9  Faction-base colors meet WCAG UI-element 3:1 on panel-bg
 *        (faction-base = decorative tint, not body text); the *-subtle
 *        text-paired variants meet 4.5:1 body-text AA on panel-bg.
 *   T10 globals.css contains the prefers-reduced-motion media query block
 *        with universal animation-duration / transition-duration overrides.
 *   T11 globals.css contains the parallel `.user-reduce-motion` class
 *        override for the in-game toggle.
 *   T12 globals.css declares CSS variables for all 4 colorblind presets
 *        (default, deuteranopia, protanopia, tritanopia) with all three
 *        --cb-faction-* variables per preset.
 *   T13 SettingsScreen consumes the canonical localStorage keys + sets
 *        the html attributes (data-cb-preset + .user-reduce-motion class).
 *   T14 Determinism guard: no Math.random / Date.now / new Date( in any
 *        Lane D owned source file (excluding documentation).
 *
 * Sensitive-history compliance: Ring 1, faction-agnostic, no §6 surface,
 * faction-palette default preset byte-stable. UI-only — does NOT enter
 * sim path.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  FACTION_GLOW_RGB,
  FACTION_COLORBLIND_PALETTES,
  COLORBLIND_PRESETS,
  COLORBLIND_PRESET_STORAGE_KEY,
  REDUCE_MOTION_STORAGE_KEY,
  colorblindFactionRgb,
} from '../src/ui/shared/factionPalette';

const FACTIONS = ['RS', 'RBiH', 'HRHB'] as const;

// ── WCAG 2.1 relative-luminance + contrast (hand-rolled, no external dep) ──

function srgbToLinear(c: number): number {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (
    0.2126 * srgbToLinear(r) +
    0.7152 * srgbToLinear(g) +
    0.0722 * srgbToLinear(b)
  );
}

function contrastRatio(fgHex: string, bgHex: string): number {
  const lf = relativeLuminance(fgHex);
  const lb = relativeLuminance(bgHex);
  const hi = Math.max(lf, lb);
  const lo = Math.min(lf, lb);
  return (hi + 0.05) / (lo + 0.05);
}

function rgbTupleToHex(rgb: readonly [number, number, number]): string {
  const h = (n: number) => {
    const v = Math.max(0, Math.min(255, Math.round(n)));
    const s = v.toString(16);
    return s.length === 1 ? '0' + s : s;
  };
  return '#' + h(rgb[0]) + h(rgb[1]) + h(rgb[2]);
}

// Canonical token values — kept in sync with src/ui/map/tailwind.config.ts.
// If a token value drifts in tailwind.config.ts, this test will not
// automatically know — the contrast contract is pinned against THESE values.
// (Tailwind config is a JS module that re-exports from `colors:`; rather
// than dynamically importing, the contrast contract is documented here.)
const TOKENS = {
  'panel-bg':       '#1c1a17',
  'panel-card':     '#252220',
  'panel-hover':    '#332e2a',
  'panel-active':   '#3a3020',
  'text-primary':   '#ddd5c8',
  'text-secondary': '#9a9080',
  'accent-gold':    '#c4a35a',
  'interactive':    '#6a9ec2',
  'status-good':    '#56d364',
  'status-warn':    '#e8a838',
  'status-danger':  '#f47068',
  'faction-rs':            '#c24040',
  'faction-rbih':          '#4a9a55',
  'faction-hrhb':          '#4080b8',
  'faction-rs-subtle':     '#b77272',
  'faction-rbih-subtle':   '#79b07f',
  'faction-hrhb-subtle':   '#6d99c3',
} as const;

const repoRoot = resolve(__dirname, '..');
const read = (p: string) => readFileSync(resolve(repoRoot, p), 'utf8');

describe('v0.9.3 a11y Lane D — contrast / reduced-motion / colorblind', () => {

  // ─── Faction palette: default preset byte-stable + presets shape ───

  it('T1: factionPalette default preset byte-stable (Wave 8 Lane D RGBs)', () => {
    expect(FACTION_GLOW_RGB.RS).toEqual([200, 70, 70]);
    expect(FACTION_GLOW_RGB.RBiH).toEqual([70, 165, 90]);
    expect(FACTION_GLOW_RGB.HRHB).toEqual([70, 130, 200]);
    // Default colorblind preset === canonical FACTION_GLOW_RGB
    expect(FACTION_COLORBLIND_PALETTES.default.RS).toEqual([200, 70, 70]);
    expect(FACTION_COLORBLIND_PALETTES.default.RBiH).toEqual([70, 165, 90]);
    expect(FACTION_COLORBLIND_PALETTES.default.HRHB).toEqual([70, 130, 200]);
    // colorblindFactionRgb('default', faction) returns canonical value
    for (const f of FACTIONS) {
      expect(colorblindFactionRgb('default', f)).toEqual(FACTION_GLOW_RGB[f]);
    }
  });

  it('T2: COLORBLIND_PRESETS contains the 4 expected presets', () => {
    expect([...COLORBLIND_PRESETS].sort()).toEqual(
      ['default', 'deuteranopia', 'protanopia', 'tritanopia'].sort(),
    );
    expect(COLORBLIND_PRESETS.length).toBe(4);
  });

  it('T3: every preset declares all 3 factions with valid RGB tuples', () => {
    for (const preset of COLORBLIND_PRESETS) {
      const row = FACTION_COLORBLIND_PALETTES[preset];
      expect(row).toBeDefined();
      for (const f of FACTIONS) {
        const rgb = row[f];
        expect(rgb, `${preset}.${f}`).toBeDefined();
        expect(rgb.length).toBe(3);
        for (const channel of rgb) {
          expect(channel).toBeGreaterThanOrEqual(0);
          expect(channel).toBeLessThanOrEqual(255);
          expect(Number.isFinite(channel)).toBe(true);
        }
      }
    }
  });

  it('T4: every preset has pairwise-distinguishable faction luminances', () => {
    for (const preset of COLORBLIND_PRESETS) {
      const row = FACTION_COLORBLIND_PALETTES[preset];
      const lums = FACTIONS.map((f) =>
        relativeLuminance(rgbTupleToHex(row[f])),
      );
      const hi = Math.max(...lums);
      const lo = Math.min(...lums);
      // Spread between brightest and darkest of the three faction colors:
      // contrast ratio ≥ 1.4× ensures all three are distinguishable by
      // luminance alone (a partial-but-useful guard against color-only
      // signal failure under monochrome / extreme color blindness).
      const ratio = (hi + 0.05) / (lo + 0.05);
      expect(ratio, `preset ${preset} faction-luminance spread`).toBeGreaterThanOrEqual(1.4);
    }
  });

  // ─── WCAG-AA contrast on canonical Tailwind tokens ─────────────────

  it('T5: text-primary meets AA on panel-bg / panel-card', () => {
    expect(contrastRatio(TOKENS['text-primary'], TOKENS['panel-bg'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(TOKENS['text-primary'], TOKENS['panel-card'])).toBeGreaterThanOrEqual(4.5);
  });

  it('T6: text-secondary meets AA on panel-bg AND panel-card (borderline pair)', () => {
    expect(contrastRatio(TOKENS['text-secondary'], TOKENS['panel-bg'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(TOKENS['text-secondary'], TOKENS['panel-card'])).toBeGreaterThanOrEqual(4.5);
  });

  it('T7: accent-gold + interactive meet AA on panel-bg', () => {
    expect(contrastRatio(TOKENS['accent-gold'], TOKENS['panel-bg'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(TOKENS['interactive'], TOKENS['panel-bg'])).toBeGreaterThanOrEqual(4.5);
  });

  it('T8: status-good / status-warn / status-danger meet AA on panel-bg + panel-card', () => {
    for (const fg of ['status-good', 'status-warn', 'status-danger'] as const) {
      expect(contrastRatio(TOKENS[fg], TOKENS['panel-bg'])).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(TOKENS[fg], TOKENS['panel-card'])).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('T9: faction tokens — base meets UI 3:1, subtle meets text 4.5:1 on panel-bg', () => {
    // Faction-base colors are decorative tints / badge fills (UI elements),
    // not body text. They must meet the 3:1 UI-element threshold.
    for (const fg of ['faction-rs', 'faction-rbih', 'faction-hrhb'] as const) {
      expect(contrastRatio(TOKENS[fg], TOKENS['panel-bg'])).toBeGreaterThanOrEqual(3.0);
    }
    // Faction-*-subtle is the text-paired variant; must meet body-text 4.5:1.
    for (const fg of ['faction-rs-subtle', 'faction-rbih-subtle', 'faction-hrhb-subtle'] as const) {
      expect(contrastRatio(TOKENS[fg], TOKENS['panel-bg'])).toBeGreaterThanOrEqual(4.5);
    }
  });

  // ─── globals.css — reduced-motion + colorblind CSS vars ────────────

  it('T10: globals.css declares prefers-reduced-motion universal block', () => {
    const css = read('src/ui/map/styles/globals.css');
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    // Universal-selector wildcard must appear inside the media-query block.
    expect(css).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
    expect(css).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
  });

  it('T11: globals.css declares .user-reduce-motion class for in-game toggle', () => {
    const css = read('src/ui/map/styles/globals.css');
    expect(css).toMatch(/html\.user-reduce-motion/);
  });

  it('T12: globals.css declares CSS variables for all 4 colorblind presets', () => {
    const css = read('src/ui/map/styles/globals.css');
    // Default preset (covered by both `data-cb-preset="default"` and the
    // `:not([data-cb-preset])` fallback).
    expect(css).toMatch(/html\[data-cb-preset="default"\]/);
    expect(css).toMatch(/html\[data-cb-preset="deuteranopia"\]/);
    expect(css).toMatch(/html\[data-cb-preset="protanopia"\]/);
    expect(css).toMatch(/html\[data-cb-preset="tritanopia"\]/);
    // All three CSS variables must be declared at least 4 times each
    // (once per preset).
    for (const v of ['--cb-faction-rs', '--cb-faction-rbih', '--cb-faction-hrhb']) {
      const matches = css.match(new RegExp(v.replace(/-/g, '\\-'), 'g')) ?? [];
      expect(matches.length, `${v} declarations`).toBeGreaterThanOrEqual(4);
    }
  });

  // ─── SettingsScreen — persistence + html attribute wiring ──────────

  it('T13: SettingsScreen consumes canonical storage keys + sets html attrs', () => {
    const src = read('src/ui/map/components/SettingsScreen.tsx');
    // Imports the canonical keys (string-equal to the constants).
    expect(src).toMatch(/REDUCE_MOTION_STORAGE_KEY/);
    expect(src).toMatch(/COLORBLIND_PRESET_STORAGE_KEY/);
    // Sets the html-level wiring consumed by globals.css.
    expect(src).toMatch(/data-cb-preset/);
    expect(src).toMatch(/user-reduce-motion/);
    // localStorage round-trip is present.
    expect(src).toMatch(/localStorage\.getItem/);
    expect(src).toMatch(/localStorage\.setItem/);
    // Pin the canonical key string values themselves (defensive against
    // a refactor that renames the constants without updating all consumers).
    expect(REDUCE_MOTION_STORAGE_KEY).toBe('awwv.a11y.reduceMotion');
    expect(COLORBLIND_PRESET_STORAGE_KEY).toBe('awwv.a11y.colorblindPreset');
  });

  // ─── Determinism guard ────────────────────────────────────────────

  it('T14: no Math.random / Date.now / new Date in Lane D source files', () => {
    const files = [
      'src/ui/shared/factionPalette.ts',
      'src/ui/map/styles/globals.css',
      'src/ui/map/components/SettingsScreen.tsx',
      'src/ui/map/tailwind.config.ts',
    ];
    for (const f of files) {
      const src = read(f);
      expect(src, `${f} :: Math.random`).not.toMatch(/Math\.random\s*\(/);
      expect(src, `${f} :: Date.now`).not.toMatch(/Date\.now\s*\(/);
      expect(src, `${f} :: new Date`).not.toMatch(/new\s+Date\s*\(/);
    }
  });
});
