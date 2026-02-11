import type { FactionId, MunicipalityId } from './game_state.js';

/** Municipality 1991 census: total + ethnic breakdown. */
export type MunicipalityPopulation1991Map = Record<
  string,
  { total: number; bosniak: number; serb: number; croat: number; other: number }
>;

/**
 * Return the aligned population share for a faction in a municipality.
 * - RBiH aligns with Bosniak + Other
 * - RS aligns with Serb
 * - HRHB aligns with Croat
 * Falls back deterministically when census/faction is missing.
 */
export function getFactionAlignedPopulationShare(
  munId: MunicipalityId,
  faction: FactionId | null,
  population1991ByMun: MunicipalityPopulation1991Map | undefined,
  fallbackShare: number
): number {
  if (!faction || !population1991ByMun) return fallbackShare;
  const entry = population1991ByMun[munId];
  if (!entry || entry.total <= 0) return fallbackShare;
  const total = entry.total;
  if (faction === 'RBiH') return (entry.bosniak + entry.other) / total;
  if (faction === 'RS') return entry.serb / total;
  if (faction === 'HRHB') return entry.croat / total;
  return fallbackShare;
}
