import type {
    BrigadePosture,
    CorpsCommandState,
    CorpsDirective,
    CorpsOperation,
    CorpsStance,
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import type { OperationalToCanonicalReverseMap, OsidPopulationMap } from '../../data/operational_data.js';
import type { FactionGraphAnalysis } from './osid_graph_analysis.js';
import type { Osid } from './osid_adjacency.js';
import type { SupplyStateByOsidReport } from '../../state/supply_state_derivation.js';
import type { OsidEthnicComposition } from './ethnic_defense.js';
import type { OsidBotOrdersResult } from './bot_brigade_ai_osid.js'; // I'll need to export this or move it here

export interface BrigadeEvaluationContext {
    state: GameState;
    faction: FactionId;
    brigade: FormationState;
    loc: Osid;
    corpsId: string | null | undefined;
    cmd: CorpsCommandState | null;
    directive: CorpsDirective | null;
    corpsStance: CorpsStance;
    activeOp: CorpsOperation | null;
    isActiveSectorOperationParticipant: boolean;
    adjEnemy: string[];
    isAlliedWithRBiH: boolean;
    targetAdjacentCount: Map<Osid, number>;
    corpsReserve: Map<string, { total: number; reserved: number }>;
    chosenTargets: Map<Osid, number>;
    columnAssignments: Map<Osid, number>;
    counterAttackTarget: Osid | null;
    brigadeSupplyState: 'adequate' | 'strained' | 'critical';
    isHoldBrigade: boolean;

    
    // Global context dependencies:
    adjacency: Map<Osid, Osid[]>;
    reverseMap: OperationalToCanonicalReverseMap;
    terrainCache: Record<string, number>;
    graphAnalysis: FactionGraphAnalysis;
    supplyStateByOsid?: SupplyStateByOsidReport | null;
    ethnicMap?: OsidEthnicComposition;
    osidPopulationMap?: OsidPopulationMap;
    
    // Mutable accumulator
    result: OsidBotOrdersResult;
}

export type BrigadeEvaluator = (ctx: BrigadeEvaluationContext) => boolean; // returns true if the brigade order has been finalized and we should continue to next brigade
