/**
 * Phase C Step 5: Authority degradation (Phase_I_Specification_v0_4_0.md §4.7).
 * Authority evolves independently of control; distinct fields remain distinct.
 * State uses profile.authority in 0–100 scale; spec formulas applied in 0–1 then scaled.
 *
 * Legitimacy integration (Engine Invariants §16.A): low average legitimacy
 * reduces the effective authority cap. When faction avg legitimacy < 50,
 * authority cannot exceed the Contested ceiling (60). Feature-gated via
 * enable_legitimacy_authority_cap on scenario meta (default: ON).
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import { getFactionLegitimacyAverages } from '../../state/legitimacy_utils.js';

/** When average legitimacy falls below this threshold, authority is capped at CONTESTED_AUTHORITY_CEILING. */
const LEGITIMACY_LOW_THRESHOLD = 50;
/** Authority ceiling when legitimacy is low (Contested level). */
const CONTESTED_AUTHORITY_CEILING = 60;

/** Phase I §4.7.3: RBiH floor 0.20 → 20 in 0–100 scale. */
const RBIH_AUTHORITY_FLOOR = 20;
/** Phase I §4.7.3: RBiH cap 1.0 → 100. */
const RBIH_AUTHORITY_CAP = 100;
/** Phase I §4.7.3: RS cap 0.85 → 85. */
const RS_AUTHORITY_CAP = 85;
/** Phase I §4.7.3: HRHB cap 0.70 → 70. */
const HRHB_AUTHORITY_CAP = 70;

/** Phase I §4.7.1: RS declared ongoing penalty per turn (0.01 → 1 in 0–100). */
const RS_DECLARED_ongoing_PER_TURN = 1;
/** Phase I §4.7.1: HRHB declared ongoing penalty per turn (0.008 → 0.8). */
const HRHB_DECLARED_ongoing_PER_TURN = 0.8;
/** Phase I §4.7.1: JNA active opponent per turn (0.01 → 1). */
const JNA_OPPOSITION_PER_TURN = 1;
/** Phase I §4.7.1: International recognition per turn (0.02 → 2). */
const INTERNATIONAL_RECOGNITION_PER_TURN = 2;
/** Phase I §4.7.1: Successful defense of Sarajevo per turn (0.005 → 0.5). Stub: 0 when not implemented. */
const SARAJEVO_DEFENSE_PER_TURN = 0;

/** Phase I §4.7.2: Declaration enacted ongoing per turn (0.008 → 0.8). */
const DECLARED_ongoing_PER_TURN = 0.8;
/** Phase I §4.7.2: External support per turn (0.01 → 1). */
const EXTERNAL_SUPPORT_PER_TURN = 1;

export interface AuthorityDegradationReport {
  changes: Array<{ faction_id: FactionId; authority_before: number; authority_after: number; delta: number }>;
}

/**
 * Run Phase I authority degradation (Phase I §4.7).
 * Updates faction.profile.authority only; does not touch political control.
 * Municipality lost/gain penalties require prior-turn snapshot; Step 5 applies only declaration, JNA, and recognition ongoing.
 */
export function runAuthorityDegradation(state: GameState): AuthorityDegradationReport {
  const report: AuthorityDegradationReport = { changes: [] };
  const factions = state.factions ?? [];
  const rbih = factions.find((f) => f.id === 'RBiH');
  const rs = factions.find((f) => f.id === 'RS');
  const hrhb = factions.find((f) => f.id === 'HRHB');

  const rsDeclared = rs?.declared === true;
  const hrhbDeclared = hrhb?.declared === true;
  const jnaActive = state.phase_i_jna?.transition_begun === true;

  // Legitimacy-based authority capping (Engine Invariants §16.A):
  // When a faction's average legitimacy is below threshold, authority
  // cannot consolidate above the Contested ceiling.
  const legitimacyAverages = getFactionLegitimacyAverages(state);

  if (rbih) {
    const before = Math.max(0, Math.min(100, rbih.profile.authority ?? 50));
    let delta = 0;
    if (rsDeclared) delta -= RS_DECLARED_ongoing_PER_TURN;
    if (hrhbDeclared) delta -= HRHB_DECLARED_ongoing_PER_TURN;
    if (jnaActive) delta -= JNA_OPPOSITION_PER_TURN;
    delta += INTERNATIONAL_RECOGNITION_PER_TURN;
    delta += SARAJEVO_DEFENSE_PER_TURN;
    let after = before + delta;
    // Apply legitimacy cap: low legitimacy limits authority to Contested
    const rbihLegitimacy = (legitimacyAverages['RBiH'] ?? 0.5) * 100;
    const effectiveCap = rbihLegitimacy < LEGITIMACY_LOW_THRESHOLD
      ? Math.min(RBIH_AUTHORITY_CAP, CONTESTED_AUTHORITY_CEILING)
      : RBIH_AUTHORITY_CAP;
    after = Math.max(RBIH_AUTHORITY_FLOOR, Math.min(effectiveCap, after));
    rbih.profile.authority = Math.round(after * 10) / 10;
    report.changes.push({ faction_id: 'RBiH', authority_before: before, authority_after: rbih.profile.authority, delta: after - before });
  }

  for (const faction of factions) {
    if (faction.id === 'RBiH') continue;
    const before = Math.max(0, Math.min(100, faction.profile.authority ?? 50));
    let delta = 0;
    if (faction.declared) delta += DECLARED_ongoing_PER_TURN;
    delta += EXTERNAL_SUPPORT_PER_TURN;
    const baseCap = faction.id === 'RS' ? RS_AUTHORITY_CAP : faction.id === 'HRHB' ? HRHB_AUTHORITY_CAP : 100;
    // Apply legitimacy cap: low legitimacy limits authority to Contested
    const factionLegitimacy = (legitimacyAverages[faction.id] ?? 0.5) * 100;
    const cap = factionLegitimacy < LEGITIMACY_LOW_THRESHOLD
      ? Math.min(baseCap, CONTESTED_AUTHORITY_CEILING)
      : baseCap;
    let after = before + delta;
    after = Math.max(0, Math.min(cap, after));
    faction.profile.authority = Math.round(after * 10) / 10;
    report.changes.push({
      faction_id: faction.id as FactionId,
      authority_before: before,
      authority_after: faction.profile.authority,
      delta: after - before
    });
  }

  return report;
}
