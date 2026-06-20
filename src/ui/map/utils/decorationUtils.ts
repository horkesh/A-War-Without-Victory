import type { FormationView } from '../data/types';

type FormationDecoration = NonNullable<FormationView['decorations']>[number];

/**
 * Derive prestige display rank (0–3) from a formation's decorations.
 *
 * In the engine, tier_3 is the highest honour (Zlatni Ljiljan, Obilić, Trolist).
 * We map: tier_3 → 1 (gold), tier_2 → 2 (silver), tier_1 → 3 (bronze), none → 0.
 */
export function getPrestigeTier(decorations: FormationDecoration[] | undefined): 0 | 1 | 2 | 3 {
  if (!decorations || decorations.length === 0) return 0;
  if (decorations.some(d => d.tier === 'tier_3')) return 1;
  if (decorations.some(d => d.tier === 'tier_2')) return 2;
  return 3;
}

/** Tailwind text-color class for a prestige tier. Returns '' for tier 0. */
export function getPrestigeTierColor(tier: 0 | 1 | 2 | 3): string {
  if (tier === 1) return 'text-yellow-400';
  if (tier === 2) return 'text-slate-300';
  if (tier === 3) return 'text-amber-700';
  return '';
}

/** Decoration display names by faction and tier. */
const DECORATION_NAMES: Record<string, Record<string, string>> = {
  RBiH: { tier_1: 'Slavna', tier_2: 'Viteška', tier_3: 'Orden Zlatni Ljiljan' },
  RS:   { tier_1: 'Medalja Petra Mrkonjića', tier_2: 'Orden Nemanjića', tier_3: 'Orden Miloša Obilića' },
  HRHB: { tier_1: 'Red Nikole Šubića Zrinskog', tier_2: 'Red Kneza Domagoja', tier_3: 'Red Hrvatskog Trolista' },
};

/** Get the display name for a decoration given faction and tier. */
export function getDecorationName(faction: string, tier: string): string {
  return DECORATION_NAMES[faction]?.[tier] ?? 'Campaign distinction';
}

/** Get the highest decoration tier string from a decorations array. Returns null if none. */
export function getHighestTier(decorations: FormationDecoration[] | undefined): string | null {
  if (!decorations || decorations.length === 0) return null;
  if (decorations.some(d => d.tier === 'tier_3')) return 'tier_3';
  if (decorations.some(d => d.tier === 'tier_2')) return 'tier_2';
  if (decorations.some(d => d.tier === 'tier_1')) return 'tier_1';
  return null;
}
