/**
 * Combat Effectiveness — lightweight UI-side calculation for display.
 *
 * Mirrors the sim's combat_math.ts basePower + key modifiers, but computed
 * entirely from FormationView data (no GameState dependency).
 *
 * Formula:
 *   base = personnel × equipmentRatio × experience × (cohesion/100) × honorMult
 *   effectiveness = base × fatigueMult × officerMult × homeDistMult × moraleMult × disruptionMult
 *
 * The result is a single number representing how much combat power this formation
 * can project. Higher = stronger. Typical brigade: 300-1500.
 */
import type { FormationView } from '../data/types';
import { isFieldedTacticalFormation } from '../../shared/playerVisibility';

// --- Constants matching sim/combat/combat_math.ts ---
const EXPERIENCE_BASE = 0.6;
const EXPERIENCE_SCALE = 0.4;
const FATIGUE_MAX = 30;
const CRITICAL_MORALE_THRESHOLD = 15;
const CRITICAL_MORALE_FLOOR = 0.3;

export interface EffectivenessBreakdown {
    /** Final composite combat effectiveness number. */
    value: number;
    /** Base power: personnel × equipment × experience × cohesion × honor. */
    base: number;
    /** Individual modifier values (all multiplicative, 1.0 = neutral). */
    modifiers: {
        fatigue: number;
        officer: number;
        homeDistance: number;
        morale: number;
        disruption: number;
        supply: number;
    };
    /** Personnel count (always visible alongside effectiveness). */
    personnel: number;
    /** Grade-critical source fields missing from this formation. */
    missingFields: string[];
}

const GRADE_CRITICAL_FIELDS = ['personnel', 'fatigue', 'cohesion', 'morale', 'officer_quality'] as const;

function reportedNumber(value: number | undefined | null): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function missingGradeCriticalFields(f: FormationView): string[] {
    const missing: string[] = [];
    for (const field of GRADE_CRITICAL_FIELDS) {
        if (!reportedNumber(f[field])) missing.push(field);
    }
    return missing;
}

function getEquipmentRatio(f: FormationView): number {
    if (!f.composition) return 0.5;
    const { infantry, tanks, artillery, aa_systems } = f.composition;
    const total = infantry + tanks + artillery + aa_systems;
    if (total === 0) return 0.5;
    // Simplified: infantry always "equipped", heavy equipment adds bonus
    const tankOp = f.composition.tank_condition?.operational ?? tanks;
    const artyOp = f.composition.artillery_condition?.operational ?? artillery;
    const heavyRatio = total > 0 ? (tankOp + artyOp + aa_systems) / total : 0;
    // Equipment ratio: 0.5 baseline (infantry) + up to 0.5 from heavy weapons
    return Math.min(1.0, 0.5 + heavyRatio * 0.5);
}

function getHonorMult(f: FormationView): number {
    switch (f.honor) {
        case 'legendary': return 1.25;
        case 'elite': return 1.15;
        case 'veteran': return 1.10;
        case 'experienced': return 1.05;
        default: return 1.0;
    }
}

function getFatigueMult(f: FormationView): number {
    const fatigue = Math.min(FATIGUE_MAX, reportedNumber(f.fatigue) ? f.fatigue : 0);
    // Defend floor 0.75, attack floor 0.6 — use average for display
    const floor = 0.675;
    return Math.max(floor, 1.0 - (fatigue / FATIGUE_MAX) * (1.0 - floor));
}

function getOfficerMult(f: FormationView): number {
    const q = reportedNumber(f.officer_quality) ? f.officer_quality : 0.5;
    // officer_quality [0.05, 0.90] → mult [0.9, 1.15]
    return 0.85 + q * 0.333;
}

function getMoraleMult(f: FormationView): number {
    const morale = reportedNumber(f.morale) ? f.morale : 50;
    if (morale >= CRITICAL_MORALE_THRESHOLD) return 1.0;
    // Below threshold: linear ramp from FLOOR to 1.0
    const t = morale / CRITICAL_MORALE_THRESHOLD;
    return CRITICAL_MORALE_FLOOR + (1.0 - CRITICAL_MORALE_FLOOR) * t;
}

function getDisruptionMult(f: FormationView): number {
    return (f.disrupted_turns ?? 0) > 0 ? 0.5 : 1.0;
}

function getSupplyMult(f: FormationView): number {
    // No direct supply field on FormationView — use equipment_decay as proxy
    const decay = f.equipment_decay ?? 0;
    return Math.max(0.6, 1.0 - decay * 0.3);
}

export function computeBrigadeEffectiveness(f: FormationView): EffectivenessBreakdown {
    const missingFields = missingGradeCriticalFields(f);
    const personnel = reportedNumber(f.personnel) ? f.personnel : 0;
    const eq = getEquipmentRatio(f);
    const experience = Math.max(0, Math.min(1, 0.5)); // experience not on FormationView — use default
    const expMult = EXPERIENCE_BASE + EXPERIENCE_SCALE * experience;
    const cohesion = Math.max(0, Math.min(100, reportedNumber(f.cohesion) ? f.cohesion : 60)) / 100;
    const honorMult = getHonorMult(f);

    const base = personnel * eq * expMult * cohesion * honorMult;

    const modifiers = {
        fatigue: getFatigueMult(f),
        officer: getOfficerMult(f),
        homeDistance: f.homeDistanceMult ?? 1.0,
        morale: getMoraleMult(f),
        disruption: getDisruptionMult(f),
        supply: getSupplyMult(f),
    };

    const value = base * modifiers.fatigue * modifiers.officer * modifiers.homeDistance
        * modifiers.morale * modifiers.disruption * modifiers.supply;

    return { value, base, modifiers, personnel, missingFields };
}

export interface AggregateEffectiveness {
    /** Sum of all brigade effectiveness values. */
    totalEffectiveness: number;
    /** Sum of all brigade personnel. */
    totalPersonnel: number;
    /** Number of brigades included. */
    brigadeCount: number;
    /** Average effectiveness per brigade. */
    avgEffectiveness: number;
    /** Number of combat-ineffective brigades (personnel < 400). */
    ineffectiveCount: number;
    /** Number of disrupted brigades. */
    disruptedCount: number;
    /** Overall readiness grade: A/B/C/D/F based on average modifier product, or UNREPORTED when grade-critical fields are sparse. */
    grade: string;
    /** Number of included brigades missing grade-critical effectiveness inputs. */
    incompleteCount: number;
    /** Sorted grade-critical source fields missing from at least one included brigade. */
    missingFields: string[];
}

export function aggregateEffectiveness(formations: FormationView[]): AggregateEffectiveness {
    const brigades = formations.filter((f) => isFieldedTacticalFormation(f));
    let totalEff = 0;
    let totalPers = 0;
    let ineffective = 0;
    let disrupted = 0;
    let modifierSum = 0;
    let incompleteCount = 0;
    const missingFields = new Set<string>();

    for (const b of brigades) {
        const eff = computeBrigadeEffectiveness(b);
        totalEff += eff.value;
        totalPers += eff.personnel;
        if (reportedNumber(b.personnel) && eff.personnel < 400) ineffective++;
        if ((b.disrupted_turns ?? 0) > 0) disrupted++;
        if (eff.missingFields.length > 0) {
            incompleteCount++;
            for (const field of eff.missingFields) missingFields.add(field);
        }
        const modProduct = eff.modifiers.fatigue * eff.modifiers.officer * eff.modifiers.homeDistance
            * eff.modifiers.morale * eff.modifiers.disruption * eff.modifiers.supply;
        modifierSum += modProduct;
    }

    const count = brigades.length;
    const avgMod = count > 0 ? modifierSum / count : 0;
    const grade = incompleteCount > 0
        ? 'UNREPORTED'
        : avgMod >= 0.85 ? 'A' : avgMod >= 0.70 ? 'B' : avgMod >= 0.55 ? 'C' : avgMod >= 0.40 ? 'D' : 'F';

    return {
        totalEffectiveness: Math.round(totalEff),
        totalPersonnel: totalPers,
        brigadeCount: count,
        avgEffectiveness: count > 0 ? Math.round(totalEff / count) : 0,
        ineffectiveCount: ineffective,
        disruptedCount: disrupted,
        grade,
        incompleteCount,
        missingFields: [...missingFields].sort(),
    };
}
