/**
 * Faction-asymmetric COMMAND-LEVER CONSEQUENCES (Presidential Command Model §4).
 *
 * Wires the DEFERRED political consequence of two presidential command levers that the
 * engine apply-steps left "MECHANICAL ONLY" (war_phases.ts ~410/483/717):
 *
 *   - REPLACE-CO  (apply-co-replacements): sacking a serving corps CO can trigger an
 *     officer-corps revolt — a corps-paralysis + patron_confidence fallout — when the
 *     faction's patron-dependence and the relieved officer's standing cross a
 *     deterministic threshold (RS: Mladić-class Aug-95 7-day paralysis).
 *   - FORCE-OP    (inject-op-directive): forcing a requested op past a shown commander
 *     objection costs patron_confidence, scaled by the faction's patron-dependence
 *     (RS: Directive-7-era culpability weighting).
 *
 * FACTION ASYMMETRY EMERGES FROM DATA, NEVER `if faction === 'RS'`:
 *   - the per-faction patron-dependence weight is a DATA table
 *     (`COMMAND_FRICTION_FACTION_WEIGHT`), the same shape as the existing
 *     strategic_dimensions DIMENSION_WEIGHTS table;
 *   - the revolt decision is a deterministic threshold over (weight ×
 *     relieved-officer political_reliability), so asymmetry is a numeric consequence
 *     of the faction weight + the officer's own disposition, not a branch.
 * The mechanism is symmetric across all three factions; only the data differs:
 *   RS (1.0) — constitutionally supreme but practically weak: every lever risks a
 *              Belgrade blockade / officer-corps revolt.
 *   RBiH (0.5) — firmest civilian control; replacing a CO is usable (Halilović→Delić).
 *   HRHB (0.25) — barely autonomous, patron-gated (Zagreb sacks them anyway).
 *
 * PLAYER-ONLY → BYTE-IDENTICAL: every caller is gated on a player-only staged field
 * (`pending_co_replacement` / `pending_op_directive.forced_over_objection`), both
 * ABSENT in headless/historical runs. No consequence here is ever reached on the
 * bot/historical path, so 40w/52w/188w baselines are untouched by construction.
 *
 * CANON: maps strictly onto EXISTING dimensions — `patron_confidence` (a registered
 * StrategicDimension), `internal_cohesion`, the brigade `morale` field, and the
 * existing officer `cowed_until_turn` paralysis surface. NO new §6 / morale-override
 * surface is introduced.
 *
 * Deterministic: no Math.random, no Date.now, no timestamps. Pure numeric tuning.
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import { applyDimensionShift } from '../events/strategic_dimensions.js';
import { getCorpsSubordinates } from './bot_corps_helpers.js';
import { clamp } from '../../utils/math.js';

// ═══════════════════════════════════════════════════════════════════════════
// Faction-asymmetric DATA (owner-adjustable tuning constants)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Per-faction patron-dependence / officer-corps-revolt weight (0..1), the SINGLE
 * source of the command-friction asymmetry (design §4). Higher = the faction's
 * command levers carry a steeper political price.
 *
 * Faction-asymmetric DATA only; the consuming mechanism is identical for all three
 * (mirrors the DIMENSION_WEIGHTS data table in strategic_dimensions.ts). Owner-adjustable.
 */
export const COMMAND_FRICTION_FACTION_WEIGHT: Record<FactionId, number> = {
    RS: 1.0,
    RBiH: 0.5,
    HRHB: 0.25,
};

/**
 * REPLACE-CO revolt threshold over (factionWeight × relieved-officer political_reliability).
 * With pol_rel typically 3-5: RS (1.0 × 4 = 4.0) crosses; RBiH (0.5 × 4 = 2.0) and
 * HRHB (0.25 × 4 = 1.0) do not — so an officer-corps revolt is an RS-shaped outcome that
 * emerges from the data, never a faction branch. Owner-adjustable.
 */
export const REVOLT_THRESHOLD = 3.5;

/** Base patron_confidence penalty (pre-weight) when a CO sacking triggers a revolt. */
export const REVOLT_PATRON_BASE = -12;
/** Base internal_cohesion penalty (pre-weight) added on a revolt (corps-paralysis fallout). */
export const REVOLT_COHESION_BASE = -8;
/** Extra per-brigade morale paralysis (pre-weight) applied to the corps on a revolt. */
export const REVOLT_MORALE_BASE = -10;
/** Turns the successor is "cowed"/paralysed on a revolt — the Aug-95 7-day-style stall. */
export const REVOLT_PARALYSIS_TURNS = 4;

/** Base patron_confidence penalty (pre-weight) for forcing an op past a shown objection. */
export const FORCE_OP_PATRON_BASE = -10;

// ═══════════════════════════════════════════════════════════════════════════
// Consequence record (append-only, surfaced by the consequence-receipt read-model)
// ═══════════════════════════════════════════════════════════════════════════

export interface CommandFrictionRecord {
    /** Which lever produced this consequence. */
    lever: 'replace_co' | 'force_op';
    /** Faction that paid the political price. */
    faction: FactionId;
    /** Corps the consequence landed on. */
    corps_id: string;
    /** Turn the consequence was applied. */
    turn: number;
    /** patron_confidence delta applied (negative). */
    patron_confidence_delta: number;
    /** internal_cohesion delta applied (negative; 0 when none). */
    cohesion_delta: number;
    /** True only on a replace-CO that crossed the revolt threshold. */
    revolt: boolean;
}

function pushRecord(
    target: { command_friction_record?: CommandFrictionRecord[] },
    record: CommandFrictionRecord,
): void {
    if (Array.isArray(target.command_friction_record)) target.command_friction_record.push(record);
    else target.command_friction_record = [record];
}

// ═══════════════════════════════════════════════════════════════════════════
// PRE-COMMIT stakes preview (lever-card "what this will cost you" slot)
// ═══════════════════════════════════════════════════════════════════════════

/** The asymmetric stakes a lever card shows BEFORE the president commits. All numbers are
 *  derived from COMMAND_FRICTION_FACTION_WEIGHT — the UI passes only faction + lever +
 *  (replace-CO) the target officer's political_reliability; no faction branches in the UI. */
export interface CommandFrictionStakes {
    /** Faction-dependence weight (0..1) the stakes scale from (drives the severity label). */
    weight: number;
    /** Severity bucket for card styling — purely a function of the weight, not the faction. */
    severity: 'minimal' | 'moderate' | 'severe';
    /** Worst-case patron_confidence delta this lever would apply (negative; 0 when none). */
    patronConfidenceAtRisk: number;
    /** True when a REPLACE-CO on this officer would cross the revolt threshold. Always false
     *  for force-op (force-op has no revolt path). */
    revoltLikely: boolean;
}

/**
 * Compute the pre-commit asymmetric stakes for a lever card. PURE; no state, no mutation —
 * a projection of the same DATA the apply step uses, so the card preview and the realised
 * consequence cannot drift. The asymmetry is the weight; the UI shows it without ever
 * branching on the faction id.
 *
 * For 'replace_co', pass the target officer's political_reliability (1-5) to predict whether
 * the sacking would trigger a revolt and the patron_confidence it would then cost. For
 * 'force_op', the political price always applies; revoltLikely is always false.
 */
export function buildCommandFrictionStakes(
    faction: FactionId,
    lever: 'replace_co' | 'force_op',
    targetPoliticalReliability?: number,
): CommandFrictionStakes {
    const weight = COMMAND_FRICTION_FACTION_WEIGHT[faction] ?? 0;
    const severity: CommandFrictionStakes['severity'] =
        weight >= 0.75 ? 'severe' : weight >= 0.4 ? 'moderate' : 'minimal';

    if (lever === 'force_op') {
        return {
            weight,
            severity,
            patronConfidenceAtRisk: Math.round(FORCE_OP_PATRON_BASE * weight),
            revoltLikely: false,
        };
    }

    // replace_co: revolt (and its patron cost) only when weight × pol_rel crosses threshold.
    const polRel = targetPoliticalReliability ?? 3;
    const revoltLikely = weight * polRel >= REVOLT_THRESHOLD;
    return {
        weight,
        severity,
        patronConfidenceAtRisk: revoltLikely ? Math.round(REVOLT_PATRON_BASE * weight) : 0,
        revoltLikely,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// REPLACE-CO consequence
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evaluate + apply the faction-asymmetric REPLACE-CO consequence AFTER `relieveOfficer`
 * has installed the successor. Deterministic; returns the record it appended (or null
 * when below the revolt threshold — a sub-threshold sacking carries only the existing
 * baseline cohesion/morale cost the apply step already applied, no extra fallout).
 *
 * @param relievedPoliticalReliability the SACKED officer's political_reliability (1-5);
 *   a more politically-entrenched officer is costlier to sack under a high-dependence patron.
 * @param successorId the installed successor's officer id (cowed/paralysed on a revolt),
 *   or null when none was installed.
 */
export function applyReplaceCoConsequence(
    state: GameState,
    corpsId: string,
    faction: FactionId,
    relievedPoliticalReliability: number,
    successorId: string | null,
    turn: number,
    cmd: { command_friction_record?: CommandFrictionRecord[] },
): CommandFrictionRecord | null {
    const weight = COMMAND_FRICTION_FACTION_WEIGHT[faction];
    if (weight === undefined) return null;

    // Deterministic revolt threshold: faction patron-dependence × the relieved officer's
    // political standing. Crosses only for high-dependence factions sacking an entrenched
    // officer — the asymmetry is the data, not a branch.
    const revoltScore = weight * relievedPoliticalReliability;
    if (revoltScore < REVOLT_THRESHOLD) return null;

    const dims = state.military.negotiation?.strategic_dimensions;
    const patronDelta = Math.round(REVOLT_PATRON_BASE * weight);
    const cohesionDelta = Math.round(REVOLT_COHESION_BASE * weight);
    if (dims) {
        applyDimensionShift(dims, faction, 'patron_confidence', patronDelta);
        applyDimensionShift(dims, faction, 'internal_cohesion', cohesionDelta);
    }

    // Corps-paralysis: extra per-brigade morale hit (on top of the baseline relief hit the
    // apply step already applied) + cow the successor for the stall window. Reuses the
    // EXISTING cowed_until_turn surface — no new §6 morale-override is introduced.
    const moraleDelta = Math.round(REVOLT_MORALE_BASE * weight);
    if (moraleDelta !== 0) {
        for (const brigade of getCorpsSubordinates(state, corpsId)) {
            if (typeof brigade.morale === 'number') {
                brigade.morale = clamp(brigade.morale + moraleDelta, 0, 100);
            }
        }
    }
    if (successorId) {
        const succState = state.military.named_officers?.[successorId];
        if (succState) {
            const until = turn + REVOLT_PARALYSIS_TURNS;
            // Take the later window if the successor was already cowed.
            succState.cowed_until_turn = Math.max(succState.cowed_until_turn ?? 0, until);
        }
    }

    const record: CommandFrictionRecord = {
        lever: 'replace_co',
        faction,
        corps_id: corpsId,
        turn,
        patron_confidence_delta: patronDelta,
        cohesion_delta: cohesionDelta,
        revolt: true,
    };
    pushRecord(cmd, record);
    return record;
}

// ═══════════════════════════════════════════════════════════════════════════
// FORCE-OP consequence
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evaluate + apply the faction-asymmetric FORCE-OP consequence AFTER an op has been
 * force-injected past a shown commander objection. Deterministic; returns the record it
 * appended. Always fires (forcing an op always costs patron standing); the MAGNITUDE is
 * the data — RS pays the Directive-7-era full price, HRHB barely registers.
 */
export function applyForceOpConsequence(
    state: GameState,
    corpsId: string,
    faction: FactionId,
    turn: number,
    cmd: { command_friction_record?: CommandFrictionRecord[] },
): CommandFrictionRecord | null {
    const weight = COMMAND_FRICTION_FACTION_WEIGHT[faction];
    if (weight === undefined) return null;

    const patronDelta = Math.round(FORCE_OP_PATRON_BASE * weight);
    const dims = state.military.negotiation?.strategic_dimensions;
    if (dims && patronDelta !== 0) {
        applyDimensionShift(dims, faction, 'patron_confidence', patronDelta);
    }

    const record: CommandFrictionRecord = {
        lever: 'force_op',
        faction,
        corps_id: corpsId,
        turn,
        patron_confidence_delta: patronDelta,
        cohesion_delta: 0,
        revolt: false,
    };
    pushRecord(cmd, record);
    return record;
}
