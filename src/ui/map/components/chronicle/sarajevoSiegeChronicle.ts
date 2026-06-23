/**
 * Sarajevo-Siege Chronicle beat — make the SRK strangle-not-capture posture
 * LEGIBLE in the Chronicle (D2 task #41).
 *
 * The VRS Sarajevo-Romanija Corps strangles the four Sarajevo urban-core
 * municipalities — encirclement + bombardment, NOT a ground assault to seize the
 * core (Galić Appeal §389; D. Milošević) — by merging their RBiH-held OSIDs into
 * `political.last_contained_osids_by_faction.RS`. That squeeze fires in the sim but
 * was INVISIBLE in the UI. This beat surfaces it: while the SRK holds the ring, the
 * Chronicle carries one somber, faction-aware "the city is besieged, not stormed"
 * card — the core HOLDING is the §6-correct outcome.
 *
 * WHAT IT EMITS:
 *   At most ONE beat (`sarajevo-siege-active`), present whenever the current
 *   strangle set intersects the Sarajevo urban core. It is a CURRENT-STATE
 *   indicator (the field is a per-turn snapshot, not a turn-keyed history), so it
 *   is dated at the latest recorded turn with a STABLE id — exactly the
 *   war-weariness-beat fallback idiom, so the Chronicle's group-by-turn render
 *   shows it once at the current week rather than re-emitting it.
 *
 * §6 GUARDRAIL: this is the HISTORICAL siege made legible — encirclement +
 * bombardment of a civilian population (ICTY Galić / D. Milošević), the city NOT
 * captured. The prose names the siege; it does NOT minimise it (it is a terror
 * campaign, not a clean military containment) and does NOT valorise it (no
 * "victory", no scoreboard). It is the squeeze and the city's holding — never an
 * atrocity-as-achievement. Separate from the Srebrenica/Žepa §6 rupture record
 * (Drina Corps, task #39) — this beat names neither.
 *
 * CALIBRATION-INERT: pure read of state.political.last_contained_osids_by_faction.RS.
 * Touches no sim state, writes nothing, moves no territory. Byte-identical sim.
 *
 * Determinism: pure function of its inputs; OSIDs sorted via strictCompare in the
 * derivation; no RNG, no clock.
 */

import type { FactionId, GameState } from '../../../../state/game_state.js';
import {
  deriveSarajevoSiegeStateFromGameState,
  sarajevoSiegeGloss,
  sarajevoSiegeTitle,
  type SarajevoSiegeRuntimeOptions,
  type SiegeFaction,
} from '../../data/sarajevoSiege.js';
import type { ChronicleEntry } from './generateChronicleEntries.js';

function asSiegeFaction(fid: FactionId | string | null | undefined): SiegeFaction | null {
  return fid === 'RBiH' || fid === 'RS' || fid === 'HRHB' ? fid : null;
}

/**
 * Build the Sarajevo-siege Chronicle beat from the live raw GameState (carried on
 * the parsed chronicle view as `rawGameState`, the same handle the war-weariness +
 * refugee-flow beats read). Returns [] when the raw state is absent, the SRK
 * posture is off (field absent), or no urban-core OSID is currently strangled —
 * never throws.
 *
 * @param rawState      live GameState handle, or undefined.
 * @param latestTurn    turn to date the beat at (latest recorded turn).
 * @param playerFaction the viewing player's faction (for the chair-aware prose), or null.
 */
export function buildSarajevoSiegeChronicleEntries(
  rawState: GameState | undefined,
  latestTurn: number,
  playerFaction: FactionId | string | null | undefined,
  runtimeOptions?: SarajevoSiegeRuntimeOptions,
): ChronicleEntry[] {
  const siege = deriveSarajevoSiegeStateFromGameState(rawState, runtimeOptions);
  if (!siege) return [];

  const turn = Number.isFinite(latestTurn) ? latestTurn : 0;
  return [
    {
      id: 'sarajevo-siege-active',
      turn,
      type: 'humanitarian',
      // Headline: the siege of Sarajevo is the defining humanitarian fact of the
      // war — it earns a headline card while it is active.
      headline: true,
      title: sarajevoSiegeTitle(),
      detail: sarajevoSiegeGloss(asSiegeFaction(playerFaction)),
    },
  ];
}
