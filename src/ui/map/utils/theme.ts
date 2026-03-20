/**
 * Shared faction color class names for text and background.
 * Keep in sync with tailwind.config.ts theme colors.
 * All faction variants (RS/VRS/vrs, RBiH/ARBiH/rbih, HRHB/HVO/hrhb) are
 * expanded from canonical entries via normalizeFactionId().
 */
import { normalizeFactionId } from '../../../state/identity.js';

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

export const FACTION_BG_SUBTLE: Record<string, string> = expandFactionMap({
  RS: 'bg-faction-rs-subtle',
  RBiH: 'bg-faction-rbih-subtle',
  HRHB: 'bg-faction-hrhb-subtle',
});

/** Cohesion thresholds → hex color. Green ≥70, amber ≥40, red <40. */
export function getCohesionColor(cohesion: number): string {
  return cohesion >= 70 ? '#4a9a55' : cohesion >= 40 ? '#c4a35a' : '#c24040';
}

/** Battle outcome → hex color for badges and labels. */
export const OUTCOME_COLORS: Record<string, string> = {
  decisive_victory: '#2d7a3a', victory: '#4a9a55', costly_victory: '#8a9a40',
  stalemate: '#8a7a60', repulsed: '#c28040', catastrophic_defeat: '#c24040',
};
