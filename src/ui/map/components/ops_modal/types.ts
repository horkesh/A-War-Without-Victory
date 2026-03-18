// Ops Planning Modal — shared types
// Phase flow: commander → plan → g2_assessment → authorize

export type OpsPhase = 'commander' | 'plan' | 'g2_assessment' | 'authorize';

export type OpType =
    | 'sector_attack' | 'general_offensive'
    | 'strategic_defense' | 'reorganization'
    | 'feint' | 'probe';

export type Tempo = 'methodical' | 'standard' | 'all_out';

export type Tolerance =
    | 'decisive_victory' | 'victory' | 'costly_victory'
    | 'stalemate' | 'repulsed';

export interface AxisState {
    id: string;
    name: string;
    brigadeIds: string[];
    objectives: string[];
    stagingOsid?: string;
}

export interface BrigadePlanView {
    id: string;
    name: string;
    personnel: number;
    tanks: number;
    artillery: number;
    cohesion: number;
    fatigue: number;
    morale: number;
    locationOsid: string;
    marchTurnsToStaging: number | null;  // null = unknown
    isAutoProposed: boolean;
    isCombatIneffective: boolean;   // personnel < 400
    isDisrupted: boolean;
    status: string;
}

export interface OpsPlanState {
    opName: string;
    opType: OpType;
    tempo: Tempo;
    tolerance: Tolerance;
    artilleryPreparation: boolean;
    schwerpunktOsid: string;
    axes: AxisState[];
    activeAxisId: string;
    defaultStagingOsid: string;
}

export const OP_TYPE_LABELS: Record<OpType, string> = {
    sector_attack: 'Sector Attack',
    general_offensive: 'General Offensive',
    strategic_defense: 'Strategic Defense',
    reorganization: 'Reorganization',
    feint: 'Feint',
    probe: 'Probe',
};

export const TEMPO_LABELS: Record<Tempo, string> = {
    methodical: 'Methodical',
    standard: 'Standard',
    all_out: 'All-Out',
};

export const TOLERANCE_LABELS: Record<Tolerance, string> = {
    decisive_victory: 'Decisive Only',
    victory: 'Victory Required',
    costly_victory: 'Accept Costly',
    stalemate: 'Accept Stalemate',
    repulsed: 'Regardless',
};

export const PHASE_LABELS: Record<OpsPhase, string> = {
    commander: 'Commander',
    plan: 'Plan',
    g2_assessment: 'G-2 Assessment',
    authorize: 'Authorize',
};

export const PHASE_ORDER: OpsPhase[] = ['commander', 'plan', 'g2_assessment', 'authorize'];
