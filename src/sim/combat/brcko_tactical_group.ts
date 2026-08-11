/**
 * Brčko Tactical Group relocation (2026-08-11, Brčko defense lever, part 2).
 *
 * Models VRS 1st Krajina Corps's real, BB-cited reinforcement of the Brčko
 * corridor. Operation "Sadejstvo 93" (Joint Action 93, 20-26 July 1993, BB1
 * p.219): East Bosnian Corps was reinforced by named 1st Krajina Corps
 * elements under joint command (Lt. Gen. Talić/1st Krajina overall, Simić/East
 * Bosnian chief of staff; BB2 p.401 fn.7). 16th Krajina Motorized Brigade is
 * the most extensively BB-documented participant ("Battle for 'Strujni'
 * Corridor", Krajiski Vojnik June 1996 p.23, per BB2 p.401 fn.8-14).
 *
 * This is the companion to the pure combat-power `external_support` defend-role
 * window (combat_math.ts `getExternalDefenseSupportMultiplier`): that mechanism
 * boosts whichever single defender is already present, but cannot supply a
 * SECOND wave of defenders once the first is attritted — exactly the gap a
 * sustained multi-brigade offensive (confirmed empirically: two consecutive
 * ARBiH brigades attacking op:brcko:brcko in successive weeks) exposes. This
 * mechanism instead adds a genuinely ADDITIONAL physical defender, matching the
 * real historical reinforcement (troops arriving), not a power multiplier on
 * the same troops.
 *
 * Mechanism: relocates ONLY `location_osid` for the named formation — NEVER
 * `home_osid`. This is deliberate: `buildCorpsFrontSectors` derives each corps'
 * sector/AoR topology from live brigade LOCATION (33 references vs 1 for
 * home_osid in corps_front_sectors.ts), so a `home_osid` change perturbs a
 * corps' entire sector topology for the rest of the game (confirmed: an
 * earlier attempt relocating a different brigade's `home_osid` reshaped 1st
 * Krajina Corps's whole western front). A bounded, REVERSIBLE `location_osid`
 * change is a temporary attachment — matching the real "Tactical Group" concept
 * (a dated, bounded joint-command operation, not a permanent relocation) — and
 * returns the formation to its home_osid when the window closes, mirroring the
 * real redeployment after the operation concluded.
 *
 * Candidate selection (2026-08-11, first empirical iteration): the first attempt
 * used `rs_16th_krajina_motorized` — BUT it turns out to already be committed to
 * an ACTIVE front (Modriča, `sector:vrs_1st_krajina:7`) with cohesion already
 * ground down from 59 to ~26-27 by turn 56 (near the 20-point dissolution floor).
 * Relocating an already-attritted, unentrenched-at-destination unit produced a
 * MUCH WORSE single-battle result (power_ratio 4.95, a decisive loss) than doing
 * nothing — the unit simply lacked combat power wherever it fought. Checked the
 * other two named Sadejstvo-93 participants at the same turn: `rs_43rd_prijedor_
 * motorized` is already DEAD (inactive, 0 personnel) by turn 56 — unusable.
 * `rs_5th_kozara_light_infantry` is healthy (cohesion 59, its starting value —
 * not worn down at all) and, per BB2 p.401 fn.8-14, is the unit BB explicitly
 * describes as RELOCATED under "Tactical Group 4" to Ulice on 9 July 1993 with
 * attached armor/AD — the closest historical match to "a unit that moved for
 * this operation," not just "a unit that fought nearby." Switched to it.
 *
 * Flag-gated (`AWWV_BRCKO_TACTICAL_GROUP`, default OFF ⇒ byte-identical no-op).
 * Deterministic: pure turn-number + formation-ID gate, no randomness, no
 * wall-clock. Byte-stable for every faction/formation/turn not explicitly
 * configured here.
 */

import type { GameState } from '../../state/game_state.js';

/** Turn the Tactical Group relocates to Brčko (a few turns ahead of the
 *  observed wk58-59 crisis, giving it time to be "in position"). */
const RELOCATE_TURN = 56;
/** Turn the Tactical Group returns home (mirrors Sadejstvo 93's 20-26 July
 *  1993 conclusion plus a short stand-down buffer). */
const RETURN_TURN = 70;
/** Named, BB-cited 1st Krajina Corps participant. 5th Kozara Light Infantry —
 *  healthy (not attritted on another front) and the unit BB explicitly
 *  describes as relocating for the operation. See module doc for why the
 *  first candidate (16th Krajina Motorized) was replaced. */
const TACTICAL_GROUP_FORMATION_IDS: readonly string[] = ['rs_5th_kozara_light_infantry'];
const BRCKO_OSID = 'op:brcko:brcko';

export function isBrckoTacticalGroupEnabled(): boolean {
    const raw = typeof process === 'undefined' ? undefined : process.env.AWWV_BRCKO_TACTICAL_GROUP;
    return raw === '1' || raw === 'true' || raw === 'on';
}

/** Called once per turn, early in the war-phase pipeline (before attack
 *  resolution), so a relocated formation is "in position" for that turn's
 *  battles. No-op except at the two exact configured turns. */
export function applyBrckoTacticalGroupRelocation(state: GameState): void {
    if (!isBrckoTacticalGroupEnabled()) return;
    const turn = state.meta.turn ?? 0;
    if (turn !== RELOCATE_TURN && turn !== RETURN_TURN) return;
    for (const fid of TACTICAL_GROUP_FORMATION_IDS) {
        const formation = state.military.formations?.[fid];
        if (!formation || formation.status !== 'active') continue;
        if (turn === RELOCATE_TURN) {
            formation.location_osid = BRCKO_OSID;
        } else if (turn === RETURN_TURN && formation.home_osid) {
            formation.location_osid = formation.home_osid;
        }
    }
}
