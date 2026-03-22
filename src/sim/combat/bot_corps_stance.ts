/**
 * Corps stance selection and army standing orders.
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random().
 */

import type { EdgeRecord } from '../../map/settlements.js';
import type {
    FactionId,
    FormationState,
    GameState,
    SettlementId
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import {
    FACTION_STRATEGIES,
    getActiveDoctrinePhase,
    getActiveStandingOrder,
    isCorridorMunicipality,
} from './bot_strategy.js';
import {
    COHESION_HEALTHY_THRESHOLD,
    COHESION_REORGANIZE_THRESHOLD,
    PERSONNEL_HEALTHY_THRESHOLD,
    PERSONNEL_REORGANIZE_THRESHOLD,
    RS_EARLY_WAR_END_WEEK,
    THREAT_DEFENSIVE_THRESHOLD,
    THREAT_OFFENSIVE_THRESHOLD,
} from './bot_constants.js';
import { isRbihHrhbMobilizing } from '../early_war/alliance_update.js';
import type { CampaignPlan } from './army_hq_gathering_types.js';
import {
    averageCohesion,
    averagePersonnelFraction,
    computeSectorThreat,
    countHealthyBrigades,
    getCorpsHomeMun,
    getCorpsSubordinates,
    getFactionCorps,
} from './bot_corps_helpers.js';

import type { CorpsStance } from '../../state/game_state.js';

/** Stance aggressiveness rank for ceiling enforcement (higher = more aggressive). */
const STANCE_RANK: Record<CorpsStance, number> = {
    reorganize: 0, defensive: 1, balanced: 2, offensive: 3,
};

/**
 * Generate corps stance orders for a faction.
 * Writes stance directly to state.corps_command.
 * Deterministic: sorted corps iteration, no randomness.
 */
export function generateCorpsStanceOrders(
    state: GameState,
    faction: FactionId,
    edges: EdgeRecord[],
    sidToMun: Map<SettlementId, string>
): void {
    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return;

    const corpsList = getFactionCorps(state, faction);
    const turn = state.meta?.turn ?? 0;
    const strategy = FACTION_STRATEGIES[faction];

    for (const corps of corpsList) {
        const cmd = corpsCommand[corps.id];
        if (!cmd) continue;

        const subordinates = getCorpsSubordinates(state, corps.id);
        if (subordinates.length === 0) continue;

        const avgPers = averagePersonnelFraction(subordinates);
        const avgCoh = averageCohesion(subordinates);
        const sectorThreat = computeSectorThreat(state, subordinates, edges);
        const corpsHomeMun = getCorpsHomeMun(corps);

        let stance: CorpsStance = 'balanced';

        // Decision matrix
        // Reorganize only when BOTH cohesion and personnel are critically low.
        // Low personnel alone doesn't trigger reorganize — many brigades have
        // designed strengths well below MAX_BRIGADE_PERSONNEL (e.g. light infantry 1000/3000).
        if (avgCoh < COHESION_REORGANIZE_THRESHOLD && avgPers < PERSONNEL_REORGANIZE_THRESHOLD) {
            stance = 'reorganize';
        } else if (sectorThreat > THREAT_DEFENSIVE_THRESHOLD) {
            stance = 'defensive';
        } else if (
            sectorThreat < THREAT_OFFENSIVE_THRESHOLD &&
            avgCoh >= COHESION_HEALTHY_THRESHOLD &&
            avgPers >= PERSONNEL_HEALTHY_THRESHOLD
        ) {
            stance = 'offensive';
        }

        // --- Doctrine phase influence (D3) ---
        const doctrinePhase = getActiveDoctrinePhase(faction, turn, state.military.war_timeline);
        if (doctrinePhase && stance === 'balanced') {
            // Doctrine provides a default bias when the situation is ambiguous
            stance = doctrinePhase.default_corps_stance;
        }

        // --- Campaign plan integration (gathering plan overrides doctrine default) ---
        const plan: CampaignPlan | null | undefined = state.military.campaign_plans?.[faction];
        if (plan && plan.valid_until_turn >= turn && stance !== 'reorganize') {
            const fp = plan.front_priorities.find(p => p.corps_id === corps.id);
            if (fp) {
                stance = fp.suggested_stance;
                // Enforce corps_stance_ceilings from doctrine_override
                const ceiling = plan.doctrine_override?.corps_stance_ceilings?.[corps.id];
                if (ceiling && STANCE_RANK[stance] > STANCE_RANK[ceiling]) {
                    stance = ceiling;
                }
            }
        }

        // --- Faction-specific overrides (E1-E3 personality) ---

        if (faction === 'RS') {
            // E1: RS corridor corps: never below balanced (corridor is existential)
            if (isCorridorMunicipality(corpsHomeMun, 'RS') && (stance === 'reorganize' || stance === 'defensive')) {
                stance = 'balanced';
            }
            // E1: RS early-war aggression: prefer offensive in weeks 0–26 (PRIORITY_B handoff)
            if (turn < RS_EARLY_WAR_END_WEEK && stance === 'balanced' && avgPers >= 0.6 && avgCoh >= 40) {
                stance = 'offensive';
            }
            // E1: Sarajevo siege corps: maintain pressure but never assault core
            const SARAJEVO_SIEGE_MUNS = new Set(['pale', 'sokolac', 'trnovo']);
            if (corpsHomeMun && SARAJEVO_SIEGE_MUNS.has(corpsHomeMun)) {
                if (stance === 'reorganize') stance = 'balanced'; // Maintain siege pressure
            }
        } else if (faction === 'RBiH') {
            // E2: RBiH Sarajevo corps: strong defensive bias, but can go balanced
            // when army HQ issues probe override (historically ARBiH probed SRK lines).
            // Organic: stance emerges from threat ratio + army directive, not hardcoded.
            const SARAJEVO_MUNS = new Set(['centar_sarajevo', 'novi_grad_sarajevo', 'novo_sarajevo', 'stari_grad_sarajevo']);
            if (corpsHomeMun && SARAJEVO_MUNS.has(corpsHomeMun)) {
                const hasHqOverride = (state.military.army_hq_overrides ?? [])
                    .some(o => o.corps_id === corps.id);
                if (hasHqOverride) {
                    // Army HQ directive exists: allow balanced for probing
                    if (stance === 'offensive') stance = 'balanced';
                } else {
                    // No army directive: default defensive (besieged garrison)
                    if (stance !== 'reorganize') stance = 'defensive';
                }
            }
            // E2: RBiH survival mode weeks 0-12: no offensive
            if (turn < 12 && stance === 'offensive') {
                stance = 'balanced';
            }
            // E2: RBiH late-war counteroffensive eligibility (week 40+)
            if (turn >= 40 && stance === 'balanced' && avgPers >= 0.6 && avgCoh >= 50) {
                // Check if faction controls enough territory for counteroffensive
                const pc = state.political.political_controllers ?? {};
                const pcKeys = Object.keys(pc);
                const totalSids = pcKeys.length;
                let ownedSids = 0;
                for (const k of pcKeys) { if (pc[k] === 'RBiH') ownedSids++; }
                if (totalSids > 0 && ownedSids / totalSids >= 0.25) {
                    stance = 'offensive';
                }
            }
            // E2: RBiH bilateral war awareness
            const rhsRBiH = state.political.rbih_hrhb_state;
            if (rhsRBiH && !rhsRBiH.washington_signed) {
                const allianceVal = state.political.war_alliance_rbih_hrhb ?? 1.0;
                if (allianceVal < 0.0) {
                    // Open war with HRHB: central Bosnia corps balanced (defend mixed municipalities)
                    const CENTRAL_BOSNIA_MUNS = new Set(['travnik', 'bugojno', 'vitez', 'novi_travnik', 'busovaca', 'kiseljak', 'zenica']);
                    if (corpsHomeMun && CENTRAL_BOSNIA_MUNS.has(corpsHomeMun)) {
                        if (stance !== 'reorganize') stance = 'balanced';
                    }
                }
            }
        } else if (faction === 'HRHB') {
            // E3: HRHB Herzegovina corps: defensive (never give up heartland)
            const HERZEGOVINA_MUNS = new Set(strategy.corridor_municipalities);
            if (corpsHomeMun && HERZEGOVINA_MUNS.has(corpsHomeMun)) {
                if (stance === 'offensive' || stance === 'balanced') {
                    stance = 'defensive';
                }
            }
            // E3: Lasva Offensive window (weeks 12–26): non-Herzegovina corps at least balanced for more attack activity (NEXT_BOT_PRIORITY Candidate B)
            if (turn >= 12 && turn < 26 && !HERZEGOVINA_MUNS.has(corpsHomeMun ?? '')) {
                if ((stance === 'defensive' || stance === 'reorganize') && avgPers >= 0.4) {
                    stance = 'balanced';
                }
            }
            // E3: Alliance-sensitive — check RBiH-HRHB war state
            const rhs = state.political.rbih_hrhb_state;
            if (rhs && !rhs.washington_signed) {
                const allianceValue = state.political.war_alliance_rbih_hrhb ?? 1.0;
                if (allianceValue < 0.0) {
                    // Open war: central Bosnia corps go offensive, Herzegovina stays defensive
                    if (!HERZEGOVINA_MUNS.has(corpsHomeMun ?? '')) {
                        if (avgPers >= 0.5 && avgCoh >= 40) stance = 'offensive';
                    }
                } else if (allianceValue < 0.2) {
                    // Strained: central Bosnia corps at least balanced
                    if (!HERZEGOVINA_MUNS.has(corpsHomeMun ?? '')) {
                        if (stance === 'defensive' || stance === 'reorganize') {
                            if (avgPers >= 0.5) stance = 'balanced';
                        }
                    }
                }
            }
        }

        // Patron directive ceiling: Zagreb's political orders constrain HVO corps stances
        if (faction === 'HRHB') {
            type PatronDirective = { start_week: number; end_week: number; stance_ceiling: string };
            const timeline = state.military.war_timeline as (typeof state.military.war_timeline & { patron_directives?: Record<string, PatronDirective[]> }) | undefined;
            const directives = timeline?.patron_directives?.['HRHB'];
            if (directives) {
                const activeDirective = directives.find(d => turn >= d.start_week && turn < d.end_week);
                if (activeDirective && STANCE_RANK[stance] > STANCE_RANK[activeDirective.stance_ceiling as CorpsStance]) {
                    stance = activeDirective.stance_ceiling as CorpsStance;
                }
            }
        }

        // Army stance is informational only — corps determine their own stance
        // organically from combat readiness (personnel, cohesion, fatigue).
        // Factions are offensive or defensive because of their material capacity,
        // not because of artificial code constraints.

        // --- AI/Player army-level override (highest priority) ---
        // When an AI commander or player has issued army-level corps stance directives,
        // those override the formula bot's computed stance. This allows the AI commander
        // layer and player UI to actually control strategic direction.
        // Only active when ai_army_decisions[faction] exists (never in cadet/formula-only mode).
        const aiArmyDecision = state.military.ai_army_decisions?.[faction];
        if (aiArmyDecision?.corps_directives?.[corps.id]?.stance) {
            const aiStance = aiArmyDecision.corps_directives[corps.id].stance as CorpsStance;
            if (STANCE_RANK[aiStance] !== undefined) {
                // AI override — but still respect reorganize from critical condition (layer 1)
                if (stance !== 'reorganize') {
                    stance = aiStance;
                }
            }
        }

        // --- HRHB↔RBiH mobilization override (highest priority except reorganize) ---
        // During the 4-turn mobilization buildup before HRHB-RBiH combat is enabled,
        // both HRHB and RBiH corps that face the other faction adopt defensive posture.
        // This represents deploying to the new front and preparing defenses.
        // RS corps are unaffected.
        if (stance !== 'reorganize' && isRbihHrhbMobilizing(state)) {
            if (faction === 'HRHB' || faction === 'RBiH') {
                const otherFaction: FactionId = faction === 'HRHB' ? 'RBiH' : 'HRHB';
                const sectors = state.military.corps_front_sectors;
                if (sectors) {
                    const facesOther = Object.values(sectors).some(sec =>
                        sec.corps_id === corps.id &&
                        sec.opposing_factions.includes(otherFaction)
                    );
                    if (facesOther) {
                        stance = 'defensive';
                    }
                }
            }
        }

        cmd.stance = stance;
    }
}

/**
 * Set army stance based on the active standing order for this faction and turn.
 * Standing orders represent historical army-level strategic directives.
 * The army stance flows down through getEffectiveCorpsStance() in corps_command.ts
 * and getCorpsStance() in battle_resolution.ts, overriding corps-level decisions
 * when non-balanced.
 *
 * HRHB special case: the 'Lasva Offensive' standing order (weeks 12-26) only
 * activates general_offensive when actually at war with RBiH (alliance < 0.2).
 * Otherwise falls back to balanced.
 *
 * Deterministic: depends only on faction, turn, and alliance state.
 */
export function setArmyStandingOrder(
    state: GameState,
    faction: FactionId
): void {
    const turn = state.meta?.turn ?? 0;
    const order = getActiveStandingOrder(faction, turn, state.military.war_timeline);
    if (!order) return;

    let stance = order.army_stance;

    // HRHB: Lasva Offensive only applies when at war with RBiH
    if (faction === 'HRHB' && order.name === 'Lasva Offensive') {
        const allianceValue = state.political.war_alliance_rbih_hrhb ?? 1.0;
        if (allianceValue >= 0.2) {
            stance = 'balanced'; // Not at war — no army-wide offensive
        }
    }

    if (!state.military.army_stance) state.military.army_stance = {};
    state.military.army_stance[faction] = stance;
}

/**
 * During general_offensive standing orders, identify the 2 most capable corps
 * and set them to offensive stance, concentrating combat power instead of
 * spreading it evenly across all corps.
 *
 * Prevents dilution where every corps independently chooses balanced and no
 * concentrated offensive develops.
 *
 * Must run AFTER setArmyStandingOrder and BEFORE generateCorpsStanceOrders
 * so that per-corps stance logic can override with local conditions.
 */
export function coordinateMultiCorpsOffensive(
    state: GameState,
    faction: FactionId,
    edges: EdgeRecord[]
): void {
    const armyStance = state.military.army_stance?.[faction];
    if (armyStance !== 'general_offensive') return;

    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return;

    const corpsList = getFactionCorps(state, faction);
    if (corpsList.length < 3) return; // No coordination needed for 1-2 corps

    // Score each corps by offensive potential
    const scored = corpsList.map(corps => {
        const cmd = corpsCommand[corps.id];
        if (!cmd) return { corpsId: corps.id, score: -999 };
        const subs = getCorpsSubordinates(state, corps.id);
        const healthy = countHealthyBrigades(subs);
        const exhaustionPenalty = cmd.corps_exhaustion / 10;
        const avgPers = averagePersonnelFraction(subs);
        return {
            corpsId: corps.id,
            score: healthy * 10 + avgPers * 5 - exhaustionPenalty
        };
    }).sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return strictCompare(a.corpsId, b.corpsId);
    });

    // Top 2 corps get pre-set to offensive — per-corps logic can still override
    for (let i = 0; i < scored.length && i < 2; i++) {
        const cmd = corpsCommand[scored[i].corpsId];
        if (!cmd) continue;
        if (scored[i].score > 0 && cmd.stance !== 'reorganize') {
            cmd.stance = 'offensive';
        }
    }
}
