import type { FactionId, GameState, InternationalVisibilityPressure, PatronState, SarajevoState } from './game_state.js';
import { clamp01 } from '../utils/math.js';
import { getYearForTurn } from '../utils/time.js';

export const EXHAUSTION_DIPLOMATIC_MULTIPLIER = 0.1;
export const NEGOTIATION_MOMENTUM_MULTIPLIER = 0.05;
export const PATRON_COMMITMENT_RESISTANCE = 0.05;
export const SARAJEVO_VISIBILITY_RATE = 0.5;
export const ENCLAVE_PRESSURE_WEIGHT = 1.0;
export const SARAJEVO_ISOLATION_RATE = 0.05;
export const RS_IVP_COMMITMENT_MULTIPLIER = 0.3;
export const RBIH_IVP_COMMITMENT_MULTIPLIER = 0.2;
export const DRINA_BLOCKADE_THRESHOLD = 0.3;
export const INTERNATIONAL_SANCTIONS_THRESHOLD = 0.6;
export const NATO_INTERVENTION_THRESHOLD = 0.8;
export const IVP_HYSTERESIS = 0.1;

function getCurrentTurnAtrocityVisibility(state: GameState): number {
    const displacedThisTurn = (state.displacement.displacement_event_log ?? [])
        .filter((event) => event.turn === state.meta.turn)
        .reduce((sum, event) => sum + Math.max(0, event.displaced ?? 0), 0);
    return clamp01(displacedThisTurn / 100000);
}

function hasConsequence(active: string[] | undefined, id: string): boolean {
    return Array.isArray(active) && active.includes(id);
}

/**
 * Base patron commitment by faction and year.
 * Historical basis:
 *   RS: Serbia/JNA full backing 1992, declining as war drags and sanctions bite
 *   HRHB: Croatia provides steady support, increasing after Washington Agreement
 *   RBiH: Under arms embargo; Islamic world trickle, no state patron until late war
 */
function patronCommitmentBase(factionId: FactionId, year: number): number {
    switch (factionId) {
        case 'RBiH':
            // Arms embargo: minimal external support early, growing through Islamic world + smuggling
            if (year <= 1992) return 0.3;
            if (year === 1993) return 0.4;
            if (year === 1994) return 0.5;
            return 0.6;
        case 'RS':
            if (year <= 1992) return 0.8;
            if (year === 1993) return 0.7;
            if (year === 1994) return 0.6;
            return 0.55;
        case 'HRHB':
            if (year <= 1992) return 0.6;
            if (year === 1993) return 0.65;
            if (year === 1994) return 0.7;
            return 0.7;
        default:
            return 0.5;
    }
}

export function ensureInternationalVisibilityPressure(state: GameState): InternationalVisibilityPressure {
    if (!state.political.international_visibility_pressure) {
        state.political.international_visibility_pressure = {
            sarajevo_siege_visibility: 0,
            enclave_humanitarian_pressure: 0,
            atrocity_visibility: 0,
            negotiation_momentum: 0,
            composite_ivp: 0,
            last_major_shift: null
        };
    }
    return state.political.international_visibility_pressure;
}

export function ensurePatronState(state: GameState, factionId: FactionId): PatronState {
    const faction = state.factions.find((f) => f.id === factionId);
    if (!faction) {
        throw new Error(`Faction not found: ${factionId}`);
    }
    if (!faction.patron_state) {
        // Historical initial material support: RS (JNA stocks + Serbia) > HRHB (Croatia) > RBiH (embargo)
        const initialMaterial = factionId === 'RS' ? 0.75 : factionId === 'HRHB' ? 0.65 : 0.3;
        faction.patron_state = {
            material_support_level: initialMaterial,
            diplomatic_isolation: 0,
            constraint_severity: 0.3,
            patron_commitment: patronCommitmentBase(factionId, getYearForTurn(state.meta.turn)),
            last_updated: state.meta.turn
        };
    }
    return faction.patron_state;
}

export function updateInternationalVisibilityPressure(
    state: GameState,
    sarajevo: SarajevoState | undefined,
    enclaveHumanitarianPressure: number
): InternationalVisibilityPressure {
    const ivp = ensureInternationalVisibilityPressure(state);
    const turn = state.meta.turn;
    const prev = { ...ivp };

    const sarajevoModifier = state.military.sarajevo_tunnel_operational ? 0.7 : 1.0;
    const sarajevoVisibility = sarajevo ? sarajevo.siege_intensity * SARAJEVO_VISIBILITY_RATE * sarajevoModifier : 0;
    ivp.sarajevo_siege_visibility = clamp01(sarajevoVisibility);
    ivp.enclave_humanitarian_pressure = clamp01(enclaveHumanitarianPressure * ENCLAVE_PRESSURE_WEIGHT);
    const atrocityRaw = getCurrentTurnAtrocityVisibility(state);
    ivp.atrocity_visibility = atrocityRaw > 0
        ? atrocityRaw
        : Math.max(0, (ivp.atrocity_visibility ?? 0) - 0.01);

    const negotiationPressure = state.factions.reduce((sum, f) => sum + (f.negotiation?.pressure ?? 0), 0);
    ivp.negotiation_momentum = clamp01(negotiationPressure / 100);
    ivp.composite_ivp = clamp01(
        ivp.sarajevo_siege_visibility * 0.4 +
        ivp.enclave_humanitarian_pressure * 0.3 +
        ivp.atrocity_visibility * 0.2 +
        ivp.negotiation_momentum * 0.1
    );

    const totalDelta =
        Math.abs(ivp.sarajevo_siege_visibility - prev.sarajevo_siege_visibility) +
        Math.abs(ivp.enclave_humanitarian_pressure - prev.enclave_humanitarian_pressure) +
        Math.abs(ivp.atrocity_visibility - prev.atrocity_visibility) +
        Math.abs(ivp.negotiation_momentum - prev.negotiation_momentum) +
        Math.abs((ivp.composite_ivp ?? 0) - (prev.composite_ivp ?? 0));
    if (totalDelta > 0.1) {
        ivp.last_major_shift = turn;
    }

    return ivp;
}

export function applyIvpConsequences(state: GameState, ivp: InternationalVisibilityPressure): string[] {
    const composite = ivp.composite_ivp ?? 0;
    const prior = Array.isArray(state.political.ivp_consequences_active) ? [...state.political.ivp_consequences_active] : [];
    const next: string[] = [];

    const drinaActive = composite >= DRINA_BLOCKADE_THRESHOLD ||
        (hasConsequence(prior, 'drina_blockade') && composite >= DRINA_BLOCKADE_THRESHOLD - IVP_HYSTERESIS);
    if (drinaActive) next.push('drina_blockade');

    const sanctionsActive = composite >= INTERNATIONAL_SANCTIONS_THRESHOLD ||
        (hasConsequence(prior, 'international_sanctions') && composite >= INTERNATIONAL_SANCTIONS_THRESHOLD - IVP_HYSTERESIS);
    if (sanctionsActive) next.push('international_sanctions');

    const natoActive = composite >= NATO_INTERVENTION_THRESHOLD ||
        (hasConsequence(prior, 'nato_intervention_threat') && composite >= NATO_INTERVENTION_THRESHOLD - IVP_HYSTERESIS);
    if (natoActive) next.push('nato_intervention_threat');

    state.political.ivp_consequences_active = next;
    return next;
}

export function updatePatronState(
    state: GameState,
    sarajevo: SarajevoState | undefined,
    ivp: InternationalVisibilityPressure
): void {
    const turn = state.meta.turn;
    const year = getYearForTurn(turn);
    for (const faction of state.factions) {
        const patron = ensurePatronState(state, faction.id);
        const base = patronCommitmentBase(faction.id, year);
        const atrocity = ivp.atrocity_visibility;
        const momentum = ivp.negotiation_momentum;
        const composite = ivp.composite_ivp ?? clamp01(
            ivp.sarajevo_siege_visibility * 0.4 +
            ivp.enclave_humanitarian_pressure * 0.3 +
            ivp.atrocity_visibility * 0.2 +
            ivp.negotiation_momentum * 0.1
        );

        let nextCommitment = clamp01(base * (1.0 - atrocity * 0.1) * (1.0 + momentum * 0.05));
        if (faction.id === 'RS') {
            nextCommitment = clamp01(nextCommitment * (1 - composite * RS_IVP_COMMITMENT_MULTIPLIER));
            if (hasConsequence(state.political.ivp_consequences_active, 'drina_blockade')) {
                nextCommitment = clamp01(nextCommitment * 0.85);
            }
            if (hasConsequence(state.political.ivp_consequences_active, 'international_sanctions')) {
                nextCommitment = clamp01(nextCommitment * 0.7);
            }
            if (hasConsequence(state.political.ivp_consequences_active, 'nato_intervention_threat')) {
                nextCommitment = clamp01(nextCommitment * 0.9);
            }
        } else if (faction.id === 'RBiH') {
            nextCommitment = clamp01(nextCommitment * (1 + composite * RBIH_IVP_COMMITMENT_MULTIPLIER));
        }
        const sarajevoIsolation = sarajevo?.siege_status === 'BESIEGED' ? SARAJEVO_ISOLATION_RATE : 0;
        const nextDiplomaticIsolation = clamp01(patron.diplomatic_isolation + sarajevoIsolation);

        let materialSupport = clamp01(base + nextCommitment * 0.1 - nextDiplomaticIsolation * 0.1);
        if (faction.id === 'RS' && hasConsequence(state.political.ivp_consequences_active, 'international_sanctions')) {
            materialSupport = clamp01(materialSupport * 0.8);
        }
        const constraintSeverity = clamp01(
            0.3 +
            momentum * 0.2 +
            ivp.enclave_humanitarian_pressure * 0.1 +
            (faction.id === 'RS' && hasConsequence(state.political.ivp_consequences_active, 'nato_intervention_threat') ? 0.05 : 0)
        );

        patron.patron_commitment = nextCommitment;
        patron.diplomatic_isolation = nextDiplomaticIsolation;
        patron.material_support_level = materialSupport;
        patron.constraint_severity = constraintSeverity;
        patron.last_updated = turn;
    }
}

export function getExhaustionExternalModifier(patron: PatronState | undefined, ivp: InternationalVisibilityPressure | undefined): number {
    if (!patron || !ivp) return 0;
    const diplomatic = patron.diplomatic_isolation * EXHAUSTION_DIPLOMATIC_MULTIPLIER;
    const momentum = ivp.negotiation_momentum * NEGOTIATION_MOMENTUM_MULTIPLIER;
    const resistance = patron.patron_commitment * PATRON_COMMITMENT_RESISTANCE;
    return diplomatic + momentum - resistance;
}
