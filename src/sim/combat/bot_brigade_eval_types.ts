import type {
    BrigadePosture,
    CorpsCommandState,
    CorpsDirective,
    CorpsFrontSector,
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
import type { ActiveFormationLocationsByFaction, CorpsBrigadeCountsByOsid } from './bot_brigade_context.js';

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

    /** Recent retreats grouped by sector ID — for broadened counter-attacks. */
    sectorRecentRetreats: Map<string, Array<{ osid: string; turn: number }>>;
    /** Mutable counter: how many sector-level counter-attacks have been issued per sector this turn. */
    sectorCounterAttackCount: Map<string, number>;

    /** Cached sector membership for this brigade, built once per faction-order pass. */
    sectorAssignment?: {
        sector: CorpsFrontSector;
        isReserve: boolean;
        frontOsids: Set<string>;
    } | null;
    /** Cached line-sector front OSIDs; reserve brigades intentionally receive null. */
    assignedSectorFrontOsids?: Set<string> | null;
    /** Cached active brigade/OG counts by corps and OSID for this faction-order pass. */
    corpsBrigadeCountsByOsid?: CorpsBrigadeCountsByOsid;
    /** Cached active formation locations by faction for this faction-order pass. */
    activeFormationLocationsByFaction?: ActiveFormationLocationsByFaction;

    
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
