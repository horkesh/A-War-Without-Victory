/**
 * Sarajevo-Siege FEEL surface — make the SRK strangle-not-capture posture LEGIBLE
 * (D2 task #41). The VRS Sarajevo-Romanija Corps now STRANGLES the four Sarajevo
 * urban-core municipalities — encirclement + bombardment, NOT a ground assault to
 * seize the core (Galić Appeal §389; D. Milošević) — but the squeeze was INVISIBLE
 * in the UI. This surface makes the besieged-not-stormed core visible: the city is
 * ringed and shelled, and it HOLDS.
 *
 * PURE READ-MODEL. This module derives a siege descriptor + somber prose from a
 * field already on the live GameState (`political.last_contained_osids_by_faction.RS`
 * — the four urban-core OSIDs the SRK is strangling, written every turn the posture
 * is active). It touches NO sim state, writes NO persisted field, bumps NO save
 * schema, and moves NO territory or combat. It is imported ONLY by src/ui/** — it is
 * NOT on the headless artifact path, so the calibration baselines stay byte-identical.
 *
 * §6 FRAMING (the bright line): the Sarajevo siege was a war crime — a terror
 * campaign against a civilian population (ICTY Galić IT-98-29, D. Milošević
 * IT-98-29/1). This surface frames it as the HISTORICAL siege: the city besieged and
 * bombarded but NOT captured. The core HOLDING is the §6-correct outcome. The prose
 * must NOT minimise the siege (it is encirclement + bombardment of civilians, not a
 * clean military containment) and must NOT valorise it (no "victory", no scoreboard).
 * It names the siege, never an atrocity-as-achievement.
 *
 * FACTION-AWARE: the strangle field is keyed by the BESIEGING faction (RS). The
 * descriptor adapts to the player's chair:
 *   - RS player (besieging):  the corps holds the ring; the core is not stormed.
 *   - RBiH player (besieged): the city is encircled and shelled, and it holds.
 *   - HRHB / observer:        a neutral siege observation.
 * In every case the through-line is the same: the core is besieged, NOT captured.
 *
 * Determinism: pure function of its inputs; OSIDs sorted via strictCompare; no RNG,
 * no clock.
 *
 * Canonical owner: src/ui/map/data/sarajevoSiege.ts
 */

import { strictCompare } from '../../../state/validateGameState.js';

/**
 * The four Sarajevo urban-core municipality slugs the SRK historically strangled
 * but never assaulted. Kept as a LOCAL UI-layer copy of the engine-geometry canon
 * (state/enclave_integrity.ts SARAJEVO_CITY_CORE_MUN_IDS) so this read-model module
 * imports NOTHING from src/sim — it stays trivially off the headless artifact path.
 * Pinned by a unit test against the canonical constant so the two never drift.
 */
export const SARAJEVO_CORE_MUN_IDS: readonly string[] = [
  'centar_sarajevo',
  'novi_grad_sarajevo',
  'novo_sarajevo',
  'stari_grad_sarajevo',
];

const SARAJEVO_CORE_MUN_SET: ReadonlySet<string> = new Set(SARAJEVO_CORE_MUN_IDS);

/** Canonical player factions. */
export type SiegeFaction = 'RBiH' | 'RS' | 'HRHB';

/** Extract the municipality slug from an OSID. Format: `op:municipality:slug`. */
function munFromOsid(osid: string): string | undefined {
  return osid.split(':')[1];
}

/**
 * A derived, player-safe descriptor of the active Sarajevo siege. Present only when
 * the SRK is strangling at least one RBiH-held urban-core OSID this turn.
 */
export interface SarajevoSiegeState {
  /** Sorted urban-core OSIDs currently inside the SRK strangle set. */
  strangledCoreOsids: string[];
  /** How many of the four urban-core municipalities are under the ring. */
  besiegedMunicipalityCount: number;
  /** The besieging faction — always RS (the SRK is a VRS corps). */
  besiegingFaction: 'RS';
}

/**
 * Derive the active Sarajevo-core siege state from the besieging-faction strangle
 * set (`political.last_contained_osids_by_faction.RS`).
 *
 * Returns `null` when the posture is off / the field is absent / no urban-core OSID
 * is in the set — i.e. the SRK is not strangling the core, so the surface shows
 * nothing (no false siege indicator). Never throws.
 *
 * @param rsContainedOsids the RS entry of last_contained_osids_by_faction, or undefined.
 */
export function deriveSarajevoSiegeState(
  rsContainedOsids: readonly string[] | undefined | null,
): SarajevoSiegeState | null {
  if (!Array.isArray(rsContainedOsids) || rsContainedOsids.length === 0) return null;

  const strangledCoreOsids: string[] = [];
  const besiegedMuns = new Set<string>();
  for (const osid of rsContainedOsids) {
    if (typeof osid !== 'string') continue;
    const mun = munFromOsid(osid);
    if (!mun || !SARAJEVO_CORE_MUN_SET.has(mun)) continue;
    strangledCoreOsids.push(osid);
    besiegedMuns.add(mun);
  }
  if (strangledCoreOsids.length === 0) return null;

  strangledCoreOsids.sort(strictCompare);
  return {
    strangledCoreOsids,
    besiegedMunicipalityCount: besiegedMuns.size,
    besiegingFaction: 'RS',
  };
}

/** Short, presentation-ready siege label for a chronicle/situation heading. */
export function sarajevoSiegeTitle(): string {
  return 'Sarajevo: the city is encircled, not stormed';
}

/**
 * Player-safe, §6-correct siege prose, adapted to the player's chair. The
 * through-line in every case: the core is besieged and bombarded, and it HOLDS — a
 * ring and a shelling, never a stormed city. Names the siege; never an atrocity as
 * an achievement, never a perpetrator slur, never "victory".
 *
 * @param playerFaction the viewing player's faction, or null (observer).
 */
export function sarajevoSiegeGloss(playerFaction: SiegeFaction | null): string {
  switch (playerFaction) {
    case 'RS':
      return 'Your corps holds Sarajevo in a ring — encirclement and bombardment, '
        + 'not a ground assault to take the core. The urban heart is besieged, but it '
        + 'does not fall. The siege grinds on without a verdict.';
    case 'RBiH':
      return 'Sarajevo is encircled and shelled, week after week — the ring tightens, '
        + 'the bombardment never lifts. But the urban core is not stormed: the city '
        + 'holds. It is besieged, not taken.';
    case 'HRHB':
    default:
      return 'Sarajevo lies under siege — encircled and bombarded, week after week, '
        + 'but never stormed. The ring holds; so does the city. It is besieged, not '
        + 'captured.';
  }
}
