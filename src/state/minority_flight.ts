/**
 * Phase II: Non-takeover minority flight (settlement-level).
 * Canon: displacement redesign 2026-02-17 (MILITIA_BRIGADE_FORMATION_DESIGN §6, Phase II §15).
 *
 * Matrix:
 * - RBiH + Serbs (majority/minority): 50% gradual over 26 turns
 * - HRHB + Serbs: 100% immediate
 * - RS + Bosniaks/Croats: 100% immediate
 *
 * War-start countdown and phasing (Run Problems Phase 3): initial war start (and control-flip
 * triggers) use a 4-week countdown before minority flight runs; then displacement is spread over
 * 4 weeks (~50% first week, ~50% over next 3) to avoid a single massive week-1 spike.
 */

import type { SettlementRecord } from '../map/settlements.js';
import { getEffectiveSettlementSide } from './control_effective.js';
import { DISPLACEMENT_KILLED_FRACTION, getFactionFleeAbroadFraction } from './displacement_loss_constants.js';
import { getMunicipalityIdFromRecord, getOrInitDisplacementState, recordCivilianDisplacementCasualties } from './displacement_state_utils.js';
import type {
    DisplacementCampState,
    FactionId,
    GameState,
    MinorityFlightStateEntry,
    MunicipalityId
} from './game_state.js';
import type { MunicipalityPopulation1991Map } from './population_share.js';
import { strictCompare } from './validateGameState.js';

const RBIH_GRADUAL_TURNS = 26;
const RBIH_GRADUAL_SHARE = 0.5;

/** Weeks after war start before minority flight runs (same idea as takeover displacement delay). */
export const MINORITY_FLIGHT_WAR_START_DELAY_WEEKS = 4;
/** First week of displacement window: 50% of computed amount. */
const MINORITY_FLIGHT_PHASE1_FRACTION = 0.5;
/** Weeks 2–4 of window: remainder split equally (1/6 each). */
const MINORITY_FLIGHT_PHASE2_TO_4_FRACTION = 1 / 6;

export interface MinorityFlightReport {
    settlements_evaluated: number;
    settlements_displaced: number;
    displaced_total: number;
    killed_total: number;
    fled_abroad_total: number;
    routed_total: number;
}

/** Minority pop at settlement; for RS also returns ethnic split (bosniak+croat, croat) for routing. */
function getSettlementMinorityPop(
    sid: string,
    munId: MunicipalityId,
    controller: FactionId,
    settlements: Map<string, SettlementRecord>,
    pop1991: MunicipalityPopulation1991Map | undefined,
    settlementPopulationBySid: Record<string, number> | undefined
): { total: number; toRBiH: number; toHRHB: number } {
    const empty = { total: 0, toRBiH: 0, toHRHB: 0 };
    if (!pop1991) return empty;
    const entry = pop1991[munId];
    if (!entry || entry.total <= 0) return empty;

    let minorityTotal = 0;
    let toRBiH = 0;
    let toHRHB = 0;
    if (controller === 'RBiH' || controller === 'HRHB') {
        minorityTotal = entry.serb;
    } else if (controller === 'RS') {
        const nonSerb = entry.bosniak + entry.croat + entry.other;
        minorityTotal = nonSerb;
        const denom = nonSerb > 0 ? nonSerb : 1;
        toRBiH = Math.floor(minorityTotal * (entry.bosniak + entry.other) / denom);
        toHRHB = Math.floor(minorityTotal * entry.croat / denom);
    } else {
        return empty;
    }
    if (minorityTotal <= 0) return empty;

    const munSettlements = Array.from(settlements.values()).filter(
        (r) => (r.mun1990_id ?? r.mun_code) === munId
    );
    let settlementShare = munSettlements.length > 0 ? 1 / munSettlements.length : 1;
    const settlementPop = settlementPopulationBySid?.[sid];
    if (typeof settlementPop === 'number' && settlementPop > 0) {
        const munPopFromSettlements = munSettlements.reduce(
            (sum, r) => sum + (settlementPopulationBySid?.[r.sid] ?? 0),
            0
        );
        settlementShare = munPopFromSettlements > 0 ? settlementPop / munPopFromSettlements : settlementShare;
    }
    const total = Math.max(0, Math.floor(minorityTotal * settlementShare));
    return {
        total,
        toRBiH: Math.floor(toRBiH * (total / (minorityTotal || 1))),
        toHRHB: Math.floor(toHRHB * (total / (minorityTotal || 1)))
    };
}

function addToCamp(
    state: GameState,
    sourceMunId: MunicipalityId,
    targetFaction: FactionId,
    amount: number,
    report: MinorityFlightReport
): void {
    if (!state.displacement_camp_state) state.displacement_camp_state = {};
    const campMap = state.displacement_camp_state as Record<MunicipalityId, DisplacementCampState>;
    const existing = campMap[sourceMunId];
    const camp: DisplacementCampState = existing ?? {
        mun_id: sourceMunId,
        population: 0,
        started_turn: state.meta.turn,
        by_faction: {}
    };
    camp.population += amount;
    camp.by_faction[targetFaction] = (camp.by_faction[targetFaction] ?? 0) + amount;
    campMap[sourceMunId] = camp;
    report.routed_total += amount;
}

export function processMinorityFlight(
    state: GameState,
    settlements: Map<string, SettlementRecord>,
    population1991ByMun?: MunicipalityPopulation1991Map,
    settlementPopulationBySid?: Record<string, number>
): MinorityFlightReport {
    const report: MinorityFlightReport = {
        settlements_evaluated: 0,
        settlements_displaced: 0,
        displaced_total: 0,
        killed_total: 0,
        fled_abroad_total: 0,
        routed_total: 0
    };

    if (state.meta.phase !== 'phase_ii') return report;
    if (!population1991ByMun) return report;

    const warStartTurn = typeof state.meta.war_start_turn === 'number' ? state.meta.war_start_turn : 0;
    const currentTurn = state.meta.turn;
    if (currentTurn < warStartTurn + MINORITY_FLIGHT_WAR_START_DELAY_WEEKS) return report;

    const phaseWeek = currentTurn - warStartTurn - MINORITY_FLIGHT_WAR_START_DELAY_WEEKS;
    const phaseFactor =
        phaseWeek === 0
            ? MINORITY_FLIGHT_PHASE1_FRACTION
            : phaseWeek >= 1 && phaseWeek <= 3
                ? MINORITY_FLIGHT_PHASE2_TO_4_FRACTION
                : 1;

    const timerMap = state.hostile_takeover_timers ?? {};
    const campMap = state.displacement_camp_state ?? {};
    const munsInTakeoverOrCamp = new Set<MunicipalityId>([
        ...Object.keys(timerMap),
        ...Object.keys(campMap)
    ]) as Set<MunicipalityId>;

    if (!state.minority_flight_state) state.minority_flight_state = {};
    const flightMap = state.minority_flight_state;

    const sids = Array.from(settlements.keys()).sort(strictCompare);
    for (const sid of sids) {
        const rec = settlements.get(sid);
        if (!rec) continue;
        const munId = getMunicipalityIdFromRecord(rec);
        if (!munId) continue;

        report.settlements_evaluated += 1;

        if (munsInTakeoverOrCamp.has(munId)) continue;

        const controller = getEffectiveSettlementSide(state, sid) as FactionId | null;
        if (!controller || (controller !== 'RBiH' && controller !== 'HRHB' && controller !== 'RS')) continue;

        const minority = getSettlementMinorityPop(
            sid,
            munId,
            controller,
            settlements,
            population1991ByMun,
            settlementPopulationBySid
        );
        const minorityPop = minority.total;
        if (minorityPop <= 0) continue;

        let targetFaction: FactionId;
        let delta: number;
        let isGradual: boolean;
        let deltaRBiH = 0;
        let deltaHRHB = 0;
        let deltaRS = 0;

        if (controller === 'RBiH') {
            targetFaction = 'RS';
            const existing = flightMap[sid] as MinorityFlightStateEntry | undefined;
            const targetTotal = Math.floor(minorityPop * RBIH_GRADUAL_SHARE);
            if (!existing) {
                flightMap[sid] = {
                    started_turn: currentTurn,
                    cumulative_fled: 0,
                    target_faction: 'RS',
                    initial_minority_pop: minorityPop
                };
                delta = Math.min(
                    minorityPop,
                    Math.max(1, Math.floor(targetTotal / RBIH_GRADUAL_TURNS))
                );
                isGradual = true;
                deltaRS = delta;
            } else {
                const remaining = Math.max(0, targetTotal - existing.cumulative_fled);
                delta = Math.min(remaining, Math.max(1, Math.floor(targetTotal / RBIH_GRADUAL_TURNS)));
                isGradual = delta > 0;
                deltaRS = delta;
            }
        } else if (controller === 'HRHB') {
            targetFaction = 'RS';
            const existing = flightMap[sid];
            if (existing) continue;
            delta = minorityPop;
            isGradual = false;
            deltaRS = delta;
        } else {
            targetFaction = 'RBiH';
            const existing = flightMap[sid];
            if (existing) continue;
            delta = minorityPop;
            deltaRBiH = minority.toRBiH;
            deltaHRHB = minority.toHRHB;
            if (deltaRBiH + deltaHRHB < delta) deltaRBiH += delta - deltaRBiH - deltaHRHB;
            isGradual = false;
        }

        if (delta <= 0) continue;

        const phasedDelta = Math.max(0, Math.floor(delta * phaseFactor));
        if (phasedDelta <= 0) continue;

        report.settlements_displaced += 1;
        report.displaced_total += phasedDelta;

        const killed = Math.floor(phasedDelta * DISPLACEMENT_KILLED_FRACTION);
        const survivors = Math.max(0, phasedDelta - killed);
        const denomDelta = phasedDelta > 0 ? phasedDelta : 1;
        const toRBiH = deltaRBiH > 0 ? Math.floor(deltaRBiH * (phasedDelta / delta)) : (targetFaction === 'RBiH' ? phasedDelta : 0);
        const toHRHB = deltaHRHB > 0 ? Math.floor(deltaHRHB * (phasedDelta / delta)) : (targetFaction === 'HRHB' ? phasedDelta : 0);
        const toRS = deltaRS > 0 ? phasedDelta - toRBiH - toHRHB : (targetFaction === 'RS' ? phasedDelta : 0);
        const survRBiH = toRBiH > 0 ? Math.floor(survivors * (toRBiH / denomDelta)) : 0;
        const survHRHB = toHRHB > 0 ? Math.floor(survivors * (toHRHB / denomDelta)) : 0;
        const survRS = toRS > 0 ? survivors - survRBiH - survHRHB : 0;

        const fleeRBiH = Math.floor(survRBiH * getFactionFleeAbroadFraction('RBiH'));
        const fleeHRHB = Math.floor(survHRHB * getFactionFleeAbroadFraction('HRHB'));
        const fleeRS = Math.floor(survRS * getFactionFleeAbroadFraction('RS'));
        const fledAbroad = fleeRBiH + fleeHRHB + fleeRS;
        const routedRBiH = Math.max(0, survRBiH - fleeRBiH);
        const routedHRHB = Math.max(0, survHRHB - fleeHRHB);
        const routedRS = Math.max(0, survRS - fleeRS);

        report.killed_total += killed;
        report.fled_abroad_total += fledAbroad;

        const denom = denomDelta;
        const killedRBiH = Math.floor(killed * (toRBiH / denom));
        const killedHRHB = Math.floor(killed * (toHRHB / denom));
        const killedRS = Math.max(0, killed - killedRBiH - killedHRHB);
        recordCivilianDisplacementCasualties(state, 'RBiH', killedRBiH, fleeRBiH);
        recordCivilianDisplacementCasualties(state, 'HRHB', killedHRHB, fleeHRHB);
        recordCivilianDisplacementCasualties(state, 'RS', killedRS, fleeRS);

        const dispState = getOrInitDisplacementState(
            state,
            munId,
            state.displacement_state?.[munId]?.original_population ?? 10000
        );
        dispState.displaced_out += phasedDelta;
        dispState.lost_population += killed + fledAbroad;
        dispState.last_updated_turn = currentTurn;

        const entry = flightMap[sid];
        if (entry) {
            entry.cumulative_fled += phasedDelta;
            const targetTotal = Math.floor((entry.initial_minority_pop ?? minorityPop) * RBIH_GRADUAL_SHARE);
            if (entry.cumulative_fled >= targetTotal) {
                delete flightMap[sid];
            }
        } else if (!isGradual) {
            flightMap[sid] = {
                started_turn: currentTurn,
                cumulative_fled: phasedDelta,
                target_faction: targetFaction,
                initial_minority_pop: minorityPop
            };
        }

        if (routedRBiH > 0) addToCamp(state, munId, 'RBiH', routedRBiH, report);
        if (routedHRHB > 0) addToCamp(state, munId, 'HRHB', routedHRHB, report);
        if (routedRS > 0) addToCamp(state, munId, 'RS', routedRS, report);
    }

    return report;
}
