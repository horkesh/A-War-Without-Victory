import type { FactionId, GameState, InternationalVisibilityPressure, PatronState, SarajevoState } from './game_state.js';
import { clamp01 } from '../utils/math.js';
import { getYearForTurn } from '../utils/time.js';
import { getDimensionEffective } from '../sim/events/strategic_dimensions.js';

/**
 * Emergent-only severity of the patron-defiance supply penalty by faction.
 * RS and HRHB have coercive patrons (Belgrade / Zagreb) that can throttle materiel;
 * RBiH is under arms embargo with no single coercive state patron, so refusal cannot
 * cost what was never supplied → severity 0 (RBiH path is also pinned-historical).
 */
function patronDefianceSeverity(factionId: FactionId): number {
    switch (factionId) {
        case 'HRHB':
            return 0.6;
        case 'RS':
            return 0.5;
        default:
            return 0.0;
    }
}

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

/** Composite IVP weights — single source for engine and UI breakdown (must sum to 1.0 for linear combo). */
export const IVP_WEIGHT_SARAJEVO_SIEGE = 0.4;
export const IVP_WEIGHT_ENCLAVE_HUMANITARIAN = 0.3;
export const IVP_WEIGHT_ATROCITY_VISIBILITY = 0.2;
export const IVP_WEIGHT_NEGOTIATION_MOMENTUM = 0.1;

/** Stable key order for UI lists — do not sort dynamically. */
export type IvpComponentKey =
    | 'sarajevo_siege_visibility'
    | 'enclave_humanitarian_pressure'
    | 'atrocity_visibility'
    | 'negotiation_momentum';

export interface IvpComponentContribution {
    key: IvpComponentKey;
    raw: number; // 0..1 clamped component value
    weight: number;
    /** Contribution before composite clamp — weight * raw */
    contribution: number;
}

/**
 * Read-only breakdown of IVP components for UI (Diplomatic Press Briefing, SituationTab).
 * Fixed iteration order — deterministic, no sorting by value.
 */
/** Minimal shape for UI adapters that only surface the four components (+ optional composite). */
export type IvpBreakdownInput = Pick<
    InternationalVisibilityPressure,
    'sarajevo_siege_visibility' | 'enclave_humanitarian_pressure' | 'atrocity_visibility' | 'negotiation_momentum'
> &
    Partial<Pick<InternationalVisibilityPressure, 'composite_ivp' | 'last_major_shift'>>;

export function getIvpComponentContributions(ivp: IvpBreakdownInput | undefined): IvpComponentContribution[] {
    if (!ivp) return [];
    const s = clamp01(ivp.sarajevo_siege_visibility ?? 0);
    const e = clamp01(ivp.enclave_humanitarian_pressure ?? 0);
    const a = clamp01(ivp.atrocity_visibility ?? 0);
    const n = clamp01(ivp.negotiation_momentum ?? 0);
    return [
        { key: 'sarajevo_siege_visibility', raw: s, weight: IVP_WEIGHT_SARAJEVO_SIEGE, contribution: s * IVP_WEIGHT_SARAJEVO_SIEGE },
        { key: 'enclave_humanitarian_pressure', raw: e, weight: IVP_WEIGHT_ENCLAVE_HUMANITARIAN, contribution: e * IVP_WEIGHT_ENCLAVE_HUMANITARIAN },
        { key: 'atrocity_visibility', raw: a, weight: IVP_WEIGHT_ATROCITY_VISIBILITY, contribution: a * IVP_WEIGHT_ATROCITY_VISIBILITY },
        { key: 'negotiation_momentum', raw: n, weight: IVP_WEIGHT_NEGOTIATION_MOMENTUM, contribution: n * IVP_WEIGHT_NEGOTIATION_MOMENTUM },
    ];
}

/** Human-readable labels for IVP consequence ids — stable order for display. */
export const IVP_CONSEQUENCE_ORDER = ['drina_blockade', 'international_sanctions', 'nato_intervention_threat'] as const;

export function formatIvpConsequenceLabel(id: string): string {
    switch (id) {
        case 'drina_blockade': return 'Drina blockade pressure';
        case 'international_sanctions': return 'International sanctions';
        case 'nato_intervention_threat': return 'NATO intervention threat';
        default: return id;
    }
}

/** Player-facing label for IVP component key — single source for map + warroom. */
export function ivpComponentLabel(key: IvpComponentKey): string {
    switch (key) {
        case 'sarajevo_siege_visibility': return 'Sarajevo siege visibility';
        case 'enclave_humanitarian_pressure': return 'Enclave humanitarian pressure';
        case 'atrocity_visibility': return 'Displacement visibility';
        case 'negotiation_momentum': return 'Negotiation momentum';
        default: return key;
    }
}

/** Stable sort for consequence id lists — deterministic display order. */
export function sortIvpConsequenceIds(ids: readonly string[]): string[] {
    return [...ids].sort(
        (a, b) =>
            IVP_CONSEQUENCE_ORDER.indexOf(a as (typeof IVP_CONSEQUENCE_ORDER)[number]) -
                IVP_CONSEQUENCE_ORDER.indexOf(b as (typeof IVP_CONSEQUENCE_ORDER)[number]) || a.localeCompare(b)
    );
}

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
        ivp.sarajevo_siege_visibility * IVP_WEIGHT_SARAJEVO_SIEGE +
        ivp.enclave_humanitarian_pressure * IVP_WEIGHT_ENCLAVE_HUMANITARIAN +
        ivp.atrocity_visibility * IVP_WEIGHT_ATROCITY_VISIBILITY +
        ivp.negotiation_momentum * IVP_WEIGHT_NEGOTIATION_MOMENTUM
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
        const composite =
            ivp.composite_ivp ??
            clamp01(
                ivp.sarajevo_siege_visibility * IVP_WEIGHT_SARAJEVO_SIEGE +
                    ivp.enclave_humanitarian_pressure * IVP_WEIGHT_ENCLAVE_HUMANITARIAN +
                    ivp.atrocity_visibility * IVP_WEIGHT_ATROCITY_VISIBILITY +
                    ivp.negotiation_momentum * IVP_WEIGHT_NEGOTIATION_MOMENTUM
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

        // ── Patron-defiance supply penalty (emergent-only) ──────────────────────
        // Refusing a patron demand (resist_patron) collapses patron_confidence (the
        // strategic dimension). Historically this also throttled materiel: Belgrade's
        // 1994 Drina embargo on the VRS, Zagreb's leverage over the HVO. We read the
        // *effective* patron_confidence (0..100, 50=neutral) directly from the dimension
        // store — no new persisted field, no save-migration. The penalty is HARD-GATED on
        // decision_mode === 'emergent': in historical/unset (calibration) mode it never
        // applies, so material_support_level stays byte-identical by construction (the 3
        // live RS strategic-weighted patron events reach the scorer only outside emergent).
        if (state.meta?.decision_mode === 'emergent') {
            const store = state.military?.negotiation?.strategic_dimensions;
            const conf = store ? getDimensionEffective(store, faction.id, 'patron_confidence') : 50;
            const defiance = clamp01((50 - conf) / 50); // 0 at neutral → 1 as confidence collapses
            const severity = patronDefianceSeverity(faction.id); // RBiH no coercive patron → 0
            const cutFraction = defiance * severity; // 0..1 realized cut
            if (cutFraction > 0) {
                materialSupport = clamp01(materialSupport * (1 - cutFraction));
                // ── Consequence-receipt (Slice 4a) ──────────────────────────────
                // The defiance cut just STARVED supply because the player refused /
                // distanced from the patron. Record the realized cut so the existing
                // Turn-Aftermath "Consequences Realized" section surfaces a sober,
                // factual receipt (never a reward — this is the negative-sum cost of
                // defiance). Append-only; written ONLY here, inside the emergent gate,
                // and ONLY when the cut is non-zero (RBiH severity 0 is excluded by
                // construction) → historical/calibration state stays byte-identical.
                if (state.military) {
                    (state.military.patron_defiance_supply_cuts ??= []).push({
                        faction: faction.id,
                        turn,
                        cut_fraction: cutFraction,
                        support_after: materialSupport,
                    });
                }
            }
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
