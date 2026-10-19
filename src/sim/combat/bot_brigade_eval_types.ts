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
import type { ActiveFormationLocationsByFaction, CorpsBrigadeCountsByOsid, CorpsTerritoryOsidsByCorps } from './bot_brigade_context.js';
import type { SectorDefenseByFactionAndOsid } from './sector_utils.js';
import type { OfficerCombatLookup } from './combat_math.js';

/**
 * Terminal exits of `evaluateSectorMarch` (opt-in `dispatcher_decision` observation only). A label is
 * assigned only where the evaluator actually returns; a local lambda that returns false and lets a later
 * branch succeed never leaves its own label. `unlabeled_true` is a coverage defect, never a real exit.
 */
export type SectorMarchExit =
    | 'explicit_reassignment_march'
    | 'pending_home_return_false'
    | 'reserve_near_front_stay_false'
    | 'enclave_no_front_target_defend'
    | 'allowed_front_empty_defend'
    | 'scoped_front_march'
    | 'trap_corps_front_reroute'
    | 'retroactive_tooth_evict_march'
    | 'overstack_redistribution_march'
    | 'enclave_final_defend'
    | 'fallthrough_false'
    | 'unlabeled_true';

/** Detached scalar/string copy of the inputs and terminal exit of one `evaluateSectorMarch` call. */
export interface SectorMarchObservation {
    exit: SectorMarchExit | null;
    evaluator_result: boolean | null;
    operation_commitment: boolean | null;
    routine_scope_source: string | null;
    routine_scope_restricted: boolean | null;
    routine_scope_sub_segment_id: string | null;
    routine_scope_size: number | null;
    assigned_sector_id: string | null;
    is_reserve: boolean | null;
    reassignment_order_present: boolean;
    reassignment_to_sector_id: string | null;
    reassignment_target_found: boolean | null;
    loc_in_scoped_front: boolean | null;
    scoped_front_size: number | null;
    allowed_front_size: number | null;
    tooth_blocked: boolean;
    selected_destination: string | null;
    selected_destination_in_scoped_front: boolean | null;
}

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
    /** Cached defender-sector lookup by faction and defended OSID for this faction-order pass. */
    sectorDefenseByFactionAndOsid?: SectorDefenseByFactionAndOsid;
    /** Cached corps territory OSIDs for this faction-order pass. */
    corpsTerritoryOsidsByCorps?: CorpsTerritoryOsidsByCorps;
    /** Cached officer combat lookup for predictor power calculations in this faction-order pass. */
    officerCombatLookup?: OfficerCombatLookup;
    /** Lazily builds the officer combat lookup on first predictor use in this faction-order pass. */
    getOfficerCombatLookup?: () => OfficerCombatLookup | undefined;
    /**
     * Opt-in `dispatcher_decision` observation callback, supplied only when the topic is on. Called once per
     * `evaluateSectorMarch` call with a fresh detached record; absent => no observation work at all.
     */
    sectorMarchObserver?: (observation: SectorMarchObservation) => void;
    
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
