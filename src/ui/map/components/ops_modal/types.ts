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

export const PHASE_ORDER: OpsPhase[] = ['commander', 'plan', 'g2_assessment', 'authorize'];

export const FACTION_ARMY_HEADERS: Record<string, { republic: string; army: string; crest: string }> = {
    RBiH: { republic: 'REPUBLIKA BOSNA I HERCEGOVINA', army: 'ARMIJA REPUBLIKE BOSNE I HERCEGOVINE', crest: '⚜' },
    RS: { republic: 'REPUBLIKA SRPSKA', army: 'VOJSKA REPUBLIKE SRPSKE', crest: '🦅' },
    HRHB: { republic: 'HRVATSKA REPUBLIKA HERCEG-BOSNA', army: 'HRVATSKO VIJEĆE OBRANE', crest: '🛡' },
};
