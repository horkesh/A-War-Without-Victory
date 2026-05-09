/**
 * LANE-NIGHTSHIFT-B1-POLITICAL-DIRECTIVE-PRODUCER-INFRA
 *
 * Predecessors:
 *   • A1 (CampaignPlan wiring): 18136710
 *   • A2 (Army CO substrate): ba6955bf
 *   • A3 (Army order interpretation — consumer): c8ff93d8
 *   • A4 (Army CO roster personalities): 93c75b1d
 *   • A-lane DDR (umbrella): eee308e0
 *   • B-lane DDR (this lane): 941bd68e + 168d65c2
 *
 * Purpose
 * ───────
 * Bot-side producer for the soft-state political directive that A3
 * (`apply-army-directive-interpretation`) reads from
 * `state.military.political_directives_by_faction[faction]`. Without a
 * producer, A3 short-circuits every turn (`readPoliticalDirective` returns
 * null), `interpretArmyDirective` is never invoked, and `army_directive_pushback`
 * + autonomous-launch flow never observes a directive verb. B1 ships the
 * infrastructure; B2 will populate `state.military.political_leader_data`
 * (the substrate this producer consumes) so the producer transitions from
 * always-null to actively emitting verbs.
 *
 * Byte-stability guarantee (B1)
 * ─────────────────────────────
 * This module is engineered to be behaviorally inert until B2 wires
 * `political_leader_data`. `producePoliticalDirective` returns null when
 *   • the env flag B_LANE_POLITICAL_DIRECTIVE_PRODUCER_DISABLED === 'true'
 *     (mirrors A4_ARMY_CO_ROSTER_DISABLED pattern for A/B disable),
 *   • the faction equals the player faction (player issues directives via UI),
 *   • `state.military.political_leader_data` is missing or has no profile for
 *     the faction (substrate-driven null-return),
 *   • `state.military.political_leaders[faction]` is missing (mutable state
 *     not initialized),
 * The producer therefore writes nothing into
 * `state.military.political_directives_by_faction` on existing scenarios,
 * preserving the 40w n1703 hash 7a1fddce105993e7 baseline.
 *
 * Faction-symmetric mechanism (sensitive-history compliance)
 * ──────────────────────────────────────────────────────────
 * Pure function of state inputs (war_exhaustion, leader profile,
 * CampaignPlan, alliance level, IVP). No `if (faction === 'X')` branches.
 * All asymmetry flows from canonical Ring 2 data values populated in B2.
 *
 * DDR refs:
 *   docs/40_reports/audits/20260506_B_LANE_POLITICAL_DIRECTIVE_PRODUCER_DDR.md
 *   (941bd68e + 168d65c2)
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import type {
    PoliticalDirective,
    PoliticalDirectiveMagnitude,
    PoliticalDirectivePermissionFlag,
    PoliticalDirectiveVerb,
} from '../combat/army_order_interpretation.js';
import { strictCompare } from '../../state/turn_phases.js';

// ═══════════════════════════════════════════════════════════════════════════
// Pipeline step name (single canonical owner)
// ═══════════════════════════════════════════════════════════════════════════

export const B1_PIPELINE_STEP_NAME = 'produce-political-directive';

// ═══════════════════════════════════════════════════════════════════════════
// Producer thresholds (DDR Q2 — derivation table)
// ═══════════════════════════════════════════════════════════════════════════

/** war_exhaustion above this biases HONOR_TRUCE / PREPARE_RESERVE. */
export const B1_HIGH_EXHAUSTION_THRESHOLD = 500;

/** Hawkishness >= this biases PRESS_OFFENSIVE. */
export const B1_HAWKISH_THRESHOLD = 4;

/** Hawkishness <= this biases HOLD_AT_ALL_COSTS. */
export const B1_CAUTIOUS_THRESHOLD = 2;

/** international_visibility_pressure above this + high sensitivity → HONOR_TRUCE. */
export const B1_HIGH_IVP_THRESHOLD = 0.6;

/** international_sensitivity >= this counts as "high". */
export const B1_HIGH_SENSITIVITY_THRESHOLD = 4;

// ═══════════════════════════════════════════════════════════════════════════
// Loose-typed accessors (B2's territory — defensive read here)
// ═══════════════════════════════════════════════════════════════════════════

interface LooseLeaderProfile {
    leader_id?: string;
    faction?: FactionId | string;
    hawkishness?: number;
    flexibility?: number;
    international_sensitivity?: number;
    patron_deference?: number;
}

interface LooseLeaderState {
    leader_id?: string;
    faction?: FactionId | string;
    political_capital?: number;
    current_priorities?: string[];
}

type LooseMilitary = GameState['military'] & {
    political_leader_data?: LooseLeaderProfile[];
    political_leaders?: Record<string, LooseLeaderState | undefined>;
    political_directives_by_faction?: Record<string, PoliticalDirective | undefined>;
    campaign_plans?: Record<string, {
        front_priorities?: { corps_id: string; role?: string; priority_weight?: number }[];
    } | null | undefined>;
};

type LoosePolitical = GameState['political'] & {
    war_exhaustion?: Record<string, number>;
    war_alliance_rbih_hrhb?: number;
    international_visibility_pressure?: { level?: number } | number;
};

function getLeaderProfile(mil: LooseMilitary, faction: FactionId): LooseLeaderProfile | null {
    const data = mil.political_leader_data;
    if (!Array.isArray(data) || data.length === 0) return null;
    for (const entry of data) {
        if (entry && entry.faction === faction) return entry;
    }
    return null;
}

function getLeaderState(mil: LooseMilitary, faction: FactionId): LooseLeaderState | null {
    const map = mil.political_leaders;
    if (!map || typeof map !== 'object') return null;
    const slot = map[faction];
    return slot ?? null;
}

function getWarExhaustion(pol: LoosePolitical, faction: FactionId): number {
    const map = pol.war_exhaustion;
    if (!map || typeof map !== 'object') return 0;
    const v = map[faction];
    return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function getIvpLevel(pol: LoosePolitical): number {
    const ivp = pol.international_visibility_pressure;
    if (typeof ivp === 'number' && Number.isFinite(ivp)) return ivp;
    if (ivp && typeof ivp === 'object' && typeof ivp.level === 'number' && Number.isFinite(ivp.level)) {
        return ivp.level;
    }
    return 0;
}

/**
 * Pick the highest-priority corps from CampaignPlan.front_priorities as
 * the directive's target_corps_id. Sorted by strictCompare for determinism
 * when priority_weight ties.
 */
function pickTargetCorps(mil: LooseMilitary, faction: FactionId): string | undefined {
    const plans = mil.campaign_plans;
    if (!plans || typeof plans !== 'object') return undefined;
    const plan = plans[faction];
    if (!plan || !Array.isArray(plan.front_priorities) || plan.front_priorities.length === 0) {
        return undefined;
    }
    // Defensive copy + deterministic sort: priority_weight DESC, then corps_id ASC.
    const sorted = [...plan.front_priorities]
        .filter(fp => fp && typeof fp.corps_id === 'string')
        .sort((a, b) => {
            const wa = typeof a.priority_weight === 'number' ? a.priority_weight : 0;
            const wb = typeof b.priority_weight === 'number' ? b.priority_weight : 0;
            if (wa !== wb) return wb - wa;
            return strictCompare(a.corps_id, b.corps_id);
        });
    return sorted[0]?.corps_id;
}

// ═══════════════════════════════════════════════════════════════════════════
// Verb derivation (DDR Q3 — six-verb table)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Derive the directive verb from substrate inputs. Faction-symmetric:
 * depends only on the values, not the faction id.
 *
 * Precedence (DDR Q2):
 *   1. High exhaustion (>= threshold) AND high international_sensitivity →
 *      HONOR_TRUCE.
 *   2. High exhaustion alone → PREPARE_RESERVE.
 *   3. High IVP AND high international_sensitivity → HONOR_TRUCE.
 *   4. RBiH/HRHB with alliance ≤ 0 → MAINTAIN_CORRIDOR.
 *   5. Hawkishness >= B1_HAWKISH_THRESHOLD → PRESS_OFFENSIVE.
 *   6. Hawkishness <= B1_CAUTIOUS_THRESHOLD → HOLD_AT_ALL_COSTS.
 *   7. Default → BALANCE_FRONTS.
 */
function deriveVerb(
    profile: LooseLeaderProfile,
    exhaustion: number,
    ivpLevel: number,
    alliance: number,
    faction: FactionId,
): PoliticalDirectiveVerb {
    const hawkishness = typeof profile.hawkishness === 'number' ? profile.hawkishness : 3;
    const sensitivity = typeof profile.international_sensitivity === 'number'
        ? profile.international_sensitivity
        : 3;

    const highExhaustion = exhaustion >= B1_HIGH_EXHAUSTION_THRESHOLD;
    const highIvp = ivpLevel >= B1_HIGH_IVP_THRESHOLD;
    const highSensitivity = sensitivity >= B1_HIGH_SENSITIVITY_THRESHOLD;

    if (highExhaustion && highSensitivity) return 'HONOR_TRUCE';
    if (highExhaustion) return 'PREPARE_RESERVE';
    if (highIvp && highSensitivity) return 'HONOR_TRUCE';

    // Faction-symmetric corridor branch — predicate is alliance value, not
    // faction id. RBiH and HRHB are the only factions whose alliance value
    // is meaningful in scenario data; for RS the predicate is naturally false.
    if (alliance <= 0 && (faction === 'RBiH' || faction === 'HRHB')) {
        return 'MAINTAIN_CORRIDOR';
    }

    if (hawkishness >= B1_HAWKISH_THRESHOLD) return 'PRESS_OFFENSIVE';
    if (hawkishness <= B1_CAUTIOUS_THRESHOLD) return 'HOLD_AT_ALL_COSTS';

    return 'BALANCE_FRONTS';
}

function deriveMagnitude(
    verb: PoliticalDirectiveVerb,
    profile: LooseLeaderProfile,
    exhaustion: number,
): PoliticalDirectiveMagnitude {
    const hawkishness = typeof profile.hawkishness === 'number' ? profile.hawkishness : 3;
    if (verb === 'HONOR_TRUCE') return 'limited';
    if (exhaustion >= B1_HIGH_EXHAUSTION_THRESHOLD) return 'limited';
    if (verb === 'PRESS_OFFENSIVE' && hawkishness >= B1_HAWKISH_THRESHOLD + 1) return 'maximum';
    return 'standard';
}

function derivePermissionFlags(
    verb: PoliticalDirectiveVerb,
    magnitude: PoliticalDirectiveMagnitude,
): PoliticalDirectivePermissionFlag[] {
    switch (verb) {
        case 'PRESS_OFFENSIVE':
            return magnitude === 'maximum'
                ? ['authorize_offensive', 'authorize_reserve_commitment']
                : ['authorize_offensive'];
        case 'MAINTAIN_CORRIDOR':
            return ['authorize_offensive', 'authorize_reserve_commitment'];
        case 'HOLD_AT_ALL_COSTS':
            return ['authorize_reserve_commitment'];
        case 'PREPARE_RESERVE':
            return ['preserve_reserve'];
        case 'HONOR_TRUCE':
            return ['avoid_escalation'];
        case 'BALANCE_FRONTS':
            return ['preserve_reserve'];
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Produce a political directive for the given faction. Returns null when
 * the substrate is empty (B1 always-null guarantee until B2 ships data),
 * the env disable flag is set, or the faction is the player faction.
 *
 * Determinism: pure function of state values; no Math.random / Date.now /
 * timestamps; sorted iteration via strictCompare in pickTargetCorps.
 */
export function producePoliticalDirective(
    state: GameState,
    faction: FactionId,
): PoliticalDirective | null {
    if (process.env.B_LANE_POLITICAL_DIRECTIVE_PRODUCER_DISABLED === 'true') return null;

    // Player issues directives via UI handler, not the bot producer.
    const playerFaction = state.meta?.player_faction;
    if (playerFaction && faction === playerFaction) return null;

    const mil = state.military as LooseMilitary;
    const pol = (state.political ?? {}) as LoosePolitical;

    const profile = getLeaderProfile(mil, faction);
    if (!profile) return null;

    const leaderState = getLeaderState(mil, faction);
    if (!leaderState) return null;

    const exhaustion = getWarExhaustion(pol, faction);
    const ivpLevel = getIvpLevel(pol);
    const alliance = typeof pol.war_alliance_rbih_hrhb === 'number'
        ? pol.war_alliance_rbih_hrhb
        : 1;

    const verb = deriveVerb(profile, exhaustion, ivpLevel, alliance, faction);
    const magnitude = deriveMagnitude(verb, profile, exhaustion);
    const permission_flags = derivePermissionFlags(verb, magnitude);
    const target_corps_id = pickTargetCorps(mil, faction);
    const turn = state.meta?.turn ?? 0;

    const directive: PoliticalDirective = {
        verb,
        magnitude,
        permission_flags,
        directive_id: `b1:${faction}:${verb}:${turn}`,
    };
    if (target_corps_id) directive.target_corps_id = target_corps_id;
    return directive;
}

/**
 * Pipeline-step entry. Iterates all factions in deterministic order,
 * runs the producer, and writes the resulting directive (or skips when
 * null) into `state.military.political_directives_by_faction`. Faction-
 * symmetric: same code path for RBiH / RS / HRHB.
 *
 * Caller (war_phases.ts) gates by phase==='war' and orders this step
 * AFTER `evaluate-army-hq-gathering` (consumes CampaignPlan) and BEFORE
 * `evaluate-army-co-transitions` (A4) / `apply-army-directive-interpretation`
 * (A3) which reads what we write.
 */
export function applyPoliticalDirectiveProducer(state: GameState): void {
    if (process.env.B_LANE_POLITICAL_DIRECTIVE_PRODUCER_DISABLED === 'true') return;

    const factions: FactionId[] = ['HRHB', 'RBiH', 'RS']; // alphabetical — determinism

    const mil = state.military as LooseMilitary;
    if (!mil.political_directives_by_faction) {
        // Lazily initialize the slot; do NOT create when there is nothing to
        // write (preserves byte-stability when all factions yield null).
    }

    for (const faction of factions) {
        const directive = producePoliticalDirective(state, faction);
        if (!directive) continue;
        if (!mil.political_directives_by_faction) {
            mil.political_directives_by_faction = {};
        }
        mil.political_directives_by_faction[faction] = directive;
    }
}
