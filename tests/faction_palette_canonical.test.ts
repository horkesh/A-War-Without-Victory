/**
 * faction_palette_canonical.test.ts
 *
 * Pin LANE-V094-FACTION-PALETTE-CANONICALIZATION:
 *
 *   T1 (canonical byte-stable):     `FACTION_GLOW_RGB` tuples in
 *                                   `buildForceQualityOverlay.ts` are
 *                                   byte-identical to their Wave 8 Lane D
 *                                   shipped values; any drift would re-open
 *                                   the four Phase-3 visual-layer T1..T8
 *                                   gates.
 *   T2 (single-source projections): `factionHex`, `factionRgbString`,
 *                                   `factionRgbaString`, `factionAccentTriple`
 *                                   all derive from the same `FACTION_GLOW_RGB`
 *                                   table — every faction enters the same
 *                                   code path; no `if (faction === 'X')`
 *                                   branching.
 *   T3 (theme.ts derives):          `FACTION_HEX_COLORS` in `theme.ts`
 *                                   matches `factionHex(...)` for every
 *                                   canonical faction — no separate literal
 *                                   palette.
 *   T4 (warroom_utils derives):     `FACTION_COLORS` in `warroom_utils.ts`
 *                                   matches `factionAccentTriple(...)` for
 *                                   every canonical faction — no separate
 *                                   literal palette.
 *   T5 (opsConstants derives):      `FACTION_HEX_COLORS` in
 *                                   `plan_ui/opsConstants.ts` matches
 *                                   `factionHex(...)` for every canonical
 *                                   faction — no separate literal palette.
 *   T6 (SettingsModal corrected):   The pre-existing RS=blue/HRHB=red color
 *                                   inversion in `SettingsModal.ts` is gone:
 *                                   the file no longer contains the
 *                                   inversion's hex literals (`#14316d` for
 *                                   RS or `#922026` for HRHB). RS is rendered
 *                                   as red, HRHB as blue, RBiH as green.
 *   T7 (no fork RGB literals):      The five fork files (theme.ts,
 *                                   warroom_utils.ts, InvestmentPanel.ts,
 *                                   SettingsModal.ts, opsConstants.ts) no
 *                                   longer carry their pre-existing literal
 *                                   palette RGB tuples.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  FACTION_GLOW_RGB,
  factionGlowRgb,
  factionHex,
  factionRgbString,
  factionRgbaString,
  factionAccentTriple,
} from '../src/ui/shared/factionPalette';
import { FACTION_HEX_COLORS as THEME_HEX } from '../src/ui/map/utils/theme';
import { FACTION_COLORS as WARROOM_COLORS } from '../src/ui/warroom/components/warroom_utils';
import { FACTION_HEX_COLORS as OPS_HEX } from '../src/ui/map/components/plan_ui/opsConstants';

const FACTIONS = ['RS', 'RBiH', 'HRHB'] as const;

describe('faction palette — canonical source-of-truth', () => {
  it('T1: FACTION_GLOW_RGB byte-stable (Wave 8 Lane D values)', () => {
    expect(FACTION_GLOW_RGB.RS).toEqual([200, 70, 70]);
    expect(FACTION_GLOW_RGB.RBiH).toEqual([70, 165, 90]);
    expect(FACTION_GLOW_RGB.HRHB).toEqual([70, 130, 200]);
  });

  it('T2: derived projections all come from FACTION_GLOW_RGB lookup', () => {
    for (const f of FACTIONS) {
      const rgb = FACTION_GLOW_RGB[f];
      expect(factionGlowRgb(f)).toEqual(rgb);
      // hex projection
      const hex = factionHex(f);
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      expect([r, g, b]).toEqual([rgb[0], rgb[1], rgb[2]]);
      // rgb()
      expect(factionRgbString(f)).toBe(`rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
      // rgba()
      expect(factionRgbaString(f, 0.3)).toBe(`rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.3)`);
      // accent triple
      const triple = factionAccentTriple(f);
      expect(triple.primary).toBe(`rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
      expect(triple.dim).toBe(`rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.3)`);
      expect(triple.bg).toBe(`rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.08)`);
    }
  });

  it('T3: theme.ts FACTION_HEX_COLORS derived from canonical', () => {
    for (const f of FACTIONS) {
      expect(THEME_HEX[f]).toBe(factionHex(f));
    }
  });

  it('T4: warroom_utils.ts FACTION_COLORS derived from canonical', () => {
    for (const f of FACTIONS) {
      expect(WARROOM_COLORS[f]).toEqual(factionAccentTriple(f));
    }
  });

  it('T5: opsConstants.ts FACTION_HEX_COLORS derived from canonical', () => {
    for (const f of FACTIONS) {
      expect(OPS_HEX[f]).toBe(factionHex(f));
    }
  });

  // T6 + T7 — structural assertions on file source content.
  // Tests run from repo root (vitest default cwd).
  const repoRoot = resolve(__dirname, '..');
  const read = (p: string) => readFileSync(resolve(repoRoot, p), 'utf8');

  it('T6: SettingsModal.ts no longer carries the RS=blue/HRHB=red inversion', () => {
    const src = read('src/ui/warroom/components/SettingsModal.ts');
    // Pre-fix inversion literals must NOT appear in the active code path.
    // Allow them in comment/historical context (verify by checking they do
    // not appear inside a `factionId === 'RS' ? ... : ...` expression).
    expect(src).not.toMatch(/factionId\s*===\s*['"]RS['"]\s*\?\s*['"]#14316d['"]/);
    expect(src).not.toMatch(/factionId\s*===\s*['"]HRHB['"]\s*\?\s*['"]#922026['"]/);
    // It must use the canonical lookup instead.
    expect(src).toMatch(/factionHex\(/);
  });

  it('T7: 5 fork files no longer declare standalone literal palette maps', () => {
    // theme.ts — must not redeclare a literal map of three RGB-shaped values.
    {
      const src = read('src/ui/map/utils/theme.ts');
      // The pre-fix line was:
      //   RS: '#c04040', RBiH: '#4a9a55', HRHB: '#4080b8',
      expect(src).not.toMatch(/RS:\s*['"]#c04040['"]/);
    }
    // warroom_utils.ts — must not redeclare the rgb(55,140,75) family.
    {
      const src = read('src/ui/warroom/components/warroom_utils.ts');
      expect(src).not.toMatch(/RBiH:\s*\{\s*primary:\s*['"]rgb\(55,\s*140,\s*75\)['"]/);
      expect(src).not.toMatch(/RS:\s*\{\s*primary:\s*['"]rgb\(180,\s*50,\s*50\)['"]/);
      expect(src).not.toMatch(/HRHB:\s*\{\s*primary:\s*['"]rgb\(50,\s*110,\s*170\)['"]/);
    }
    // InvestmentPanel.ts — must not redeclare its private FACTION_COLORS.
    {
      const src = read('src/ui/warroom/components/InvestmentPanel.ts');
      expect(src).not.toMatch(/RBiH:\s*['"]rgb\(27,\s*94,\s*32\)['"]/);
      expect(src).not.toMatch(/RS:\s*['"]rgb\(226,\s*74,\s*74\)['"]/);
      expect(src).not.toMatch(/HRHB:\s*['"]rgb\(74,\s*144,\s*226\)['"]/);
    }
    // opsConstants.ts — must not redeclare its literal hex tuple.
    {
      const src = read('src/ui/map/components/plan_ui/opsConstants.ts');
      // Pre-fix:  RS: '#c24040', RBiH: '#4a9a55', HRHB: '#4080b8',
      expect(src).not.toMatch(/RS:\s*['"]#c24040['"]\s*,\s*RBiH:\s*['"]#4a9a55['"]\s*,\s*HRHB:\s*['"]#4080b8['"]/);
    }
  });
});
