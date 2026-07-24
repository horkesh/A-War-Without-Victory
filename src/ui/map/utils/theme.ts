/**
 * Shared faction color class names for text and background.
 * Keep Tailwind class strings in sync with tailwind.config.ts theme colors.
 * All faction variants (RS/VRS/vrs, RBiH/ARBiH/rbih, HRHB/HVO/hrhb) are
 * expanded from canonical entries via normalizeFactionId().
 *
 * `FACTION_HEX_COLORS` derives from the project-wide canonical palette source
 * `src/ui/shared/factionPalette.ts` (re-exports `FACTION_GLOW_RGB` from
 * `src/ui/map/layers/buildForceQualityOverlay.ts`, Wave 8 Lane D). DO NOT
 * declare a separate hex literal map here — derived projections only.
 */
import { normalizeFactionId } from '../../../state/identity.js';
import { factionHex } from '../../shared/factionPalette';

/** Expand a canonical 3-key map to cover all known faction variants. */
function expandFactionMap(canonical: Record<string, string>): Record<string, string> {
  const variants = ['RS', 'VRS', 'vrs', 'RBiH', 'ARBiH', 'rbih', 'HRHB', 'HVO', 'hrhb'];
  const result: Record<string, string> = { ...canonical };
  for (const v of variants) {
    const norm = normalizeFactionId(v);
    if (canonical[norm]) result[v] = canonical[norm];
  }
  return result;
}

export const FACTION_COLORS_SUBTLE: Record<string, string> = expandFactionMap({
  RS: 'text-faction-rs-subtle',
  RBiH: 'text-faction-rbih-subtle',
  HRHB: 'text-faction-hrhb-subtle',
});

export const FACTION_COLORS: Record<string, string> = expandFactionMap({
  RS: 'text-faction-rs',
  RBiH: 'text-faction-rbih',
  HRHB: 'text-faction-hrhb',
});

/** Faction identity colors with WCAG AA contrast on light paper surfaces. */
export const FACTION_COLORS_ON_LIGHT: Record<string, string> = expandFactionMap({
  RS: 'text-[#a62d2d]',
  RBiH: 'text-[#286a32]',
  HRHB: 'text-[#285f94]',
});

export const FACTION_BG_SUBTLE: Record<string, string> = expandFactionMap({
  RS: 'bg-faction-rs-subtle',
  RBiH: 'bg-faction-rbih-subtle',
  HRHB: 'bg-faction-hrhb-subtle',
});

/**
 * Faction hex colors for inline styles (not Tailwind classes).
 *
 * Derived projection of the canonical `FACTION_GLOW_RGB` table — never a
 * separately-maintained literal palette. Adding a new faction requires
 * extending `FACTION_GLOW_RGB` in `buildForceQualityOverlay.ts`; this map
 * is then automatically derived.
 */
export const FACTION_HEX_COLORS: Record<string, string> = {
    RS: factionHex('RS'),
    RBiH: factionHex('RBiH'),
    HRHB: factionHex('HRHB'),
};

/** Short faction labels for compact display. */
export const FACTION_SHORT_LABELS: Record<string, string> = {
    RS: 'RS', RBiH: 'RBiH', HRHB: 'HRHB',
};

/** Military faction labels. */
export const FACTION_MILITARY_LABELS: Record<string, string> = {
    RS: 'VRS', RBiH: 'ARBiH', HRHB: 'HVO',
};

/** Cohesion thresholds → hex color. Green ≥70, amber ≥40, red <40. */
export function getCohesionColor(cohesion: number): string {
  return cohesion >= 70 ? '#4a9a55' : cohesion >= 40 ? '#c4a35a' : '#c24040';
}

/** Battle outcome → hex color for badges and labels. */
export const OUTCOME_COLORS: Record<string, string> = {
  decisive_victory: '#2d7a3a', victory: '#4a9a55', costly_victory: '#8a9a40',
  stalemate: '#c7b88e', repulsed: '#c28040', catastrophic_defeat: '#c24040',
};
