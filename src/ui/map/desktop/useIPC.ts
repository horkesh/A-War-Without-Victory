import { useMemo } from 'react';
import type { StartNewCampaignPayload } from './types';

export interface CorpsOperationOrderPayload {
    corpsId: string;
    name: string;
    type: 'general_offensive' | 'sector_attack' | 'strategic_defense' | 'reorganization' | 'feint' | 'probe';
    targetSettlements: string[];
    participatingBrigades: string[];
    sectorId?: string;
    objectives?: string[];
    planningDuration?: number;
    stagingOsid?: string;
    minAttackOutcome?: 'decisive_victory' | 'victory' | 'costly_victory' | 'stalemate' | 'repulsed';
    tempo?: 'methodical' | 'standard' | 'all_out';
    schwerpunktOsid?: string;
    artilleryPreparation?: boolean;
    axes?: Array<{
        axis_id: string;
        name: string;
        assigned_brigades: string[];
        objectives: string[];
        current_objective_index: number;
        status: 'executing';
        failure_count: number;
        consecutive_failures_on_current: number;
        momentum: number;
        attack_attempt_count: number;
        objective_capture_count: number;
        movement_only_execution_turns: number;
        idle_execution_turn_streak: number;
        staging_osid?: string;
    }>;
}

export interface OperationOpportunityDecisionPayload {
    reviewId: string;
    proposalId: string;
    decision: 'approve' | 'delay' | 'redirect' | 'under_resource' | 'decline';
    delayTurns?: number;
    redirectVariantId?: string;
    commitmentProfile?: 'minimum' | 'standard' | 'reinforced';
}

interface IpcAdvisorRecommendation {
    commander_name: string;
    faction: string;
    assessment: string;
    recommendations: Array<{
        priority: number;
        action: string;
        reasoning: string;
    }>;
    context_type: 'situation_analysis' | 'operation_planning' | 'peace_plan';
}

type IpcAdvisorRecommendationResult =
    | (IpcAdvisorRecommendation & { ok?: true; error?: undefined })
    | { ok: false; error: string };

interface IpcMovementRangeResult {
    ok: boolean;
    error?: string;
    start_sid?: string | null;
    reachable_deployed?: string[];
    reachable_column?: string[];
}

interface IpcMovementPathResult {
    ok: boolean;
    error?: string;
    path?: string[];
    eta_turns?: number;
    terrain_costs?: number[];
}

interface IpcSupplyReachabilityFaction {
    faction_id: string;
    sources: string[];
    controlled: string[];
    reachable_controlled: string[];
    isolated_controlled: string[];
    rights_edges_used_count?: number;
    rights_nodes_used_count?: number;
    corridors_active_count?: number;
    edges_used: string[];
}

interface IpcSupplyPathsReport {
    schema: 1;
    turn: number;
    factions: IpcSupplyReachabilityFaction[];
    supply_state?: {
        schema: 1;
        turn: number;
        factions: Array<{
            faction_id: string;
            by_settlement: Array<{ sid: string; state: 'adequate' | 'strained' | 'critical' }>;
            adequate_count: number;
            strained_count: number;
            critical_count: number;
        }>;
    };
    corridors?: {
        schema: 1;
        turn: number;
        corridors: Array<{
            edge_id: string;
            faction_id: string;
            state: 'open' | 'brittle' | 'cut';
        }>;
    };
}

interface IpcSupplyPathsResult {
    ok: boolean;
    error?: string;
    report?: IpcSupplyPathsReport;
}

interface IpcCorpsSectorEntry {
    corps_id: string;
    faction: string;
    brigade_ids: string[];
    settlement_ids: string[];
    front_width_score: number;
    overextended: boolean;
}

interface IpcCorpsSectorsResult {
    ok: boolean;
    error?: string;
    sectors?: IpcCorpsSectorEntry[];
}

interface IpcBattleEventEntry {
    turn: number;
    settlement_id: string;
    from: string | null;
    to: string | null;
    mechanism: string;
    mun_id: string | null;
}

interface IpcBattleEventsResult {
    ok: boolean;
    error?: string;
    turn?: number;
    events?: IpcBattleEventEntry[];
}

/** Shape of window.awwv as exposed by preload.cjs. */
interface WindowAwwv {
    startNewCampaign: (payload: StartNewCampaignPayload) => Promise<{ ok: boolean; stateJson?: string; error?: string }>;
    advanceTurn: (payload?: { phase0Directives?: unknown[] }) => Promise<{ ok: boolean; stateJson?: string; report?: unknown; error?: string }>;
    getCurrentGameState: () => Promise<string | null>;
    subscribeGameStateUpdated: (cb: (stateJson: string) => void) => () => void;
    subscribeTurnReportUpdated: (cb: (report: unknown) => void) => () => void;
    /**
     * LANE-NIGHTSHIFT-REPLAY-SAVE-SEQUENCE-PRODUCER: subscribe to optional
     * sidecar broadcasts from `readReplaySaveSequenceSidecar` (raw JSON
     * string of `GameState[]`). Renderer is expected to JSON.parse and stage
     * via `setPendingReplaySaveSequence` BEFORE the next `loadSave` call.
     */
    subscribeReplaySequenceUpdated: (cb: (sequenceJson: string) => void) => () => void;
    subscribeReplayManifestUpdated: (cb: (manifestJson: string) => void) => () => void;
    getRecruitmentCatalog: () => Promise<{ brigades?: unknown[]; error?: string }>;
    applyRecruitment: (brigadeId: string, equipmentClass: string) => Promise<{ ok: boolean; stateJson?: string; error?: string }>;
    getSettings: () => Promise<{ ok: boolean; settings?: unknown; error?: string }>;
    saveSettings: (settings: unknown) => Promise<{ ok: boolean; error?: string }>;
    getAiCommanderConfig: () => Promise<{ mode: string; session_cost_estimate: number }>;
    setAiCommanderConfig: (payload: { mode: string; anthropic_api_key?: string }) => Promise<{ ok: boolean; error?: string }>;
    getAdvisorRecommendation: (payload: { faction?: string; context_type?: string }) => Promise<IpcAdvisorRecommendationResult>;
    stageAttackOrder: (brigadeId: string, targetSettlementId: string) => Promise<{ ok: boolean; error?: string }>;
    stagePostureOrder: (brigadeId: string, posture: string) => Promise<{ ok: boolean; error?: string }>;
    stageMoveOrder: (brigadeId: string, targetMunicipalityId: string) => Promise<{ ok: boolean; error?: string }>;
    stageDeployOrder: (brigadeId: string) => Promise<{ ok: boolean; error?: string }>;
    stageUndeployOrder: (brigadeId: string) => Promise<{ ok: boolean; error?: string }>;
    stageBrigadeMovementOrder: (brigadeId: string, targetSettlementIds: string[]) => Promise<{ ok: boolean; error?: string }>;
    stageCorpsStanceOrder: (corpsId: string, stance: string) => Promise<{ ok: boolean; error?: string }>;
    stageSectorStanceOrder: (sectorId: string, stance: string) => Promise<{ ok: boolean; error?: string }>;
    resetSectorStanceToBot: (sectorId: string) => Promise<{ ok: boolean; error?: string }>;
    stageLogisticsPriority: (faction: string, sectorId: string, priority: number) => Promise<{ ok: boolean; error?: string }>;
    stageCorpsOperationOrder: (payload: CorpsOperationOrderPayload) => Promise<{ ok: boolean; error?: string }>;
    queryOperationPrediction: (payload: Record<string, unknown>) => Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string }>;
    /** Force-op pushback OBJECTION query: read-only candidate plan + commander go/no-go
     *  for a REQUEST-OP target. data carries { forceRatio, estimatedCasualties,
     *  recommendedAction: 'launch'|'delay'|'abort', rejectionReason? }. */
    queryDirectiveObjection: (payload: { corpsId: string; targetOsid: string }) => Promise<{
        ok: boolean;
        data?: { forceRatio: number; estimatedCasualties: number; recommendedAction: 'launch' | 'delay' | 'abort'; rejectionReason?: string };
        error?: string;
    }>;
    stageOpHaltOrder: (payload: { corpsId: string; opName: string }) => Promise<{ ok: boolean; error?: string }>;
    /** REQUEST-OP presidential lever: name a strategic objective (target OSID) for a corps;
     *  the engine auto-selects the force + axis and builds the op (requested_by_president).
     *  `forced_over_objection` is set ONLY when the player confirmed past a shown commander
     *  objection — the engine then tags was_force_launched + records a presidential override. */
    stageOpDirectiveOrder: (payload: { corpsId: string; targetOsid: string; forced_over_objection?: boolean }) => Promise<{ ok: boolean; error?: string }>;
    stageAssignOperationCommander: (payload: { corpsId: string; operationName: string; officerId: string }) => Promise<{ ok: boolean; error?: string }>;
    /** REPLACE-CO presidential lever: sack a corps's current CO and install a replacement
     *  (explicit reserve officer or auto-pick) at REPLACE_CO_COST command authority +
     *  a cohesion/morale cost. Supersedes the removed broken assignCommander/dismissOfficer. */
    stageCoReplacementOrder: (payload: { corpsId: string; replacementOfficerId?: string }) => Promise<{ ok: boolean; error?: string; replacementOfficerId?: string }>;
    dismissEventNotification: (notificationId: string) => Promise<{ ok: boolean; error?: string }>;
    stageOperationForceLaunch: (payload: { corpsId: string; operationName: string }) => Promise<{ ok: boolean; error?: string }>;
    stageOperationDecision: (payload: { corpsId: string; operationName: string; decision: 'launch' | 'postpone' | 'abort' | 'probe' }) => Promise<{ ok: boolean; error?: string }>;
    stageAirdropAllocation: (allocations: Record<string, number>) => Promise<{ ok: boolean; error?: string }>;
    respondToEventDecision: (eventId: string, responseId: string) => Promise<{ ok: boolean; error?: string }>;
    stageConvoyDecision: (convoyId: string, decision: 'allow' | 'block' | 'divert') => Promise<{ ok: boolean; error?: string }>;
    stageOpsecToggle: (sectorId: string, active: boolean) => Promise<{ ok: boolean; error?: string }>;
    stageMunicipalitySupportOrder: (payload: { faction: 'RS' | 'RBiH' | 'HRHB'; munId: string; type: 'weapons_shipment' | 'staff_priority' | 'croatian_support_package' }) => Promise<{ ok: boolean; error?: string }>;
    clearOrders: (brigadeId: string) => Promise<{ ok: boolean; error?: string }>;
    assignBrigadeToSector: (brigadeId: string, sectorId: string | null) => Promise<{ ok: boolean; error?: string }>;
    queryMovementRange: (brigadeId: string) => Promise<IpcMovementRangeResult>;
    queryMovementPath: (brigadeId: string, destinationSid: string) => Promise<IpcMovementPathResult>;
    queryCombatEstimate: (brigadeId: string, targetSettlementId: string) => Promise<{ ok: boolean; win_probability?: number; error?: string }>;
    querySupplyPaths: () => Promise<IpcSupplyPathsResult>;
    queryCorpsSectors: () => Promise<IpcCorpsSectorsResult>;
    queryBattleEvents: () => Promise<IpcBattleEventsResult>;
    getMapServerUrl: () => Promise<string | null>;
    focusWarroom: () => Promise<void>;
    loadScenarioDialog: () => Promise<{ ok: boolean; stateJson?: string; error?: string }>;
    loadStateDialog: () => Promise<{ ok: boolean; stateJson?: string; error?: string }>;
    saveGame: (payload?: { filename?: string }) => Promise<{ ok: boolean; filePath?: string; error?: string }>;
    quickSave: () => Promise<{ ok: boolean; filePath?: string; error?: string }>;
    openTacticalMapWindow: (payload?: { mode?: string }) => Promise<void>;
    approveReserveRequest: (requestId: string, brigadeId: string, reason?: string) => Promise<{ ok: boolean; error?: string }>;
    declineReserveRequest: (requestId: string, reason?: string) => Promise<{ ok: boolean; error?: string }>;
    recallEliteBrigade: (brigadeId: string, reason?: string) => Promise<{ ok: boolean; error?: string }>;
    redirectReserveLoan: (brigadeId: string, newCorpsId: string) => Promise<{ ok: boolean; error?: string }>;
    acknowledgeOfficerEvent: (eventId: string) => Promise<{ ok: boolean; error?: string }>;
    acceptOfficerReplacement: (payload: { eventId: string; corpsId: string; newOfficerId: string; currentOfficerId?: string }) => Promise<{ ok: boolean; error?: string }>;
    resolvePeacePlan: (planId: string, response: 'accepted' | 'rejected') => Promise<{ ok: boolean; all_accepted?: boolean; rejection_factions?: string[]; error?: string }>;
    submitCounterOffer: (payload: {
        parentOfferId: string;
        planId: string;
        response: 'conditional_accept' | 'counter';
        proposedSplit: { RBiH: number; RS: number; HRHB: number };
        rider?: string;
    }) => Promise<{ ok: boolean; counter_offer_id?: string; error?: string }>;
    resolveParamilitaryRequests: (decisions: Array<{ target_osid: string; decision: 'allow' | 'deny' }>) => Promise<{ ok: boolean; stateJson?: string; report?: unknown; error?: string }>;
    resolveDayton: (proposal: { territorial_demands: string[]; territorial_concessions: string[]; institutional_choices: Record<string, 'centralized' | 'decentralized'> }) => Promise<{ ok: boolean; result?: Record<string, unknown>; error?: string }>;
    /** Level 2: Presidential acknowledgement of a warlord friction event. Sets resolved: true, reducing command strain. */
    acknowledgeFrictionEvent: (payload: { corpsId: string; officerId: string; eventTurn: number; eventType: string }) => Promise<{ ok: boolean; error?: string }>;
    /** Level 2: Resolve ALL unresolved friction events for a corps at once. Costs CA (10 if strained, 15 if compromised). 3-turn cooldown. */
    stabilizeCommandRelationship: (payload: { corpsId: string }) => Promise<{ ok: boolean; resolvedCount?: number; caCost?: number; error?: string }>;
    /**
     * Presidential FRONT VISIT (Command Surface §10) — read-only availability.
     * Returns whether the player can initiate a front visit this turn, the
     * reachability-filtered branch lists (enclave gate), cooldown/cap, and CA cost.
     */
    getFrontVisitAvailability: () => Promise<{
        ok: boolean;
        costCA?: number;
        available?: boolean;
        reason?: string | null;
        eventId?: string | null;
        currentTurn?: number;
        firesLeft?: number;
        maxFires?: number;
        cooldownUntil?: number | null;
        onCooldown?: boolean;
        reachableBranchIds?: string[];
        unreachableBranchIds?: string[];
        error?: string;
    }>;
    /**
     * Presidential FRONT VISIT (Command Surface §10) — initiate. Force-queues the
     * authored visit_to_front_<faction> event (reachability-filtered branches) into
     * pending_event_decisions so EventDecisionModal surfaces it. Costs CA (10).
     * Refuses on cooldown/exhausted/all-cut-off/insufficient-CA via `reason`.
     */
    initiateFrontVisit: () => Promise<{
        ok: boolean;
        reason?: string;
        eventId?: string;
        caCost?: number;
        offeredBranchIds?: string[];
        unreachableBranchIds?: string[];
        error?: string;
    }>;
    // v0.8.4 Phase B+C: Autonomy bridge
    getAutonomyState: () => Promise<{ autonomy_level: number; autonomy_level_pending?: number; autonomy_overrides?: Record<string, unknown>; pending_proposal_reviews?: unknown[] }>;
    setAutonomyLevel: (level: number) => Promise<{ ok: boolean; error?: string }>;
    overrideAiDecision: (level: number, targetId: string, faction: string) => Promise<{ ok: boolean; error?: string }>;
    acceptProposal: (proposalId: string) => Promise<{ ok: boolean; error?: string }>;
    rejectProposal: (proposalId: string) => Promise<{ ok: boolean; error?: string }>;
    // Phase 2 slice 1 "Back the Officer": Level 3 Direct Intervention on an op proposal.
    forceLaunchProposal: (proposalId: string) => Promise<{ ok: boolean; error?: string }>;
    resolveOperationOpportunityDecision: (payload: OperationOpportunityDecisionPayload) => Promise<{ ok: boolean; error?: string }>;
    // v0.9.2 tutorial onboarding (LANE-NIGHTSHIFT-ROUND2-TUTORIAL-ONBOARDING-SKELETON
    // + LANE-NIGHTSHIFT-TUTORIAL-CONTENT-V1)
    dismissTutorial: () => Promise<{ ok: boolean; error?: string }>;
    advanceTutorialStep: (stepId: string) => Promise<{ ok: boolean; error?: string }>;
    restartTutorial: () => Promise<{ ok: boolean; error?: string }>;
}

const NOOP_RESULT = Promise.resolve({ ok: false, error: 'Desktop IPC not available' });

function makeNoop<T>(): () => Promise<T> {
    return () => NOOP_RESULT as Promise<T>;
}

export type IPC = ReturnType<typeof useIPC>;

/**
 * Stable hook that wraps window.awwv (Electron preload bridge).
 * Returns a no-op implementation when running in browser mode.
 * Memoized on [] — never changes reference, never triggers re-renders.
 */
export function useIPC() {
    return useMemo(() => {
        const awwv = typeof window !== 'undefined'
            ? (window as Window & { awwv?: WindowAwwv }).awwv
            : undefined;
        const isAvailable = !!awwv;

        return {
            isAvailable,

            startNewCampaign: awwv
                ? (payload: StartNewCampaignPayload) => awwv.startNewCampaign(payload)
                : makeNoop<{ ok: boolean; stateJson?: string; error?: string }>(),

            advanceTurn: awwv
                ? (payload?: { phase0Directives?: unknown[] }) => awwv.advanceTurn(payload)
                : makeNoop<{ ok: boolean; stateJson?: string; report?: unknown; error?: string }>(),

            getCurrentGameState: awwv
                ? () => awwv.getCurrentGameState()
                : (): Promise<string | null> => Promise.resolve(null),

            subscribeGameStateUpdated: awwv
                ? (cb: (stateJson: string) => void) => awwv.subscribeGameStateUpdated(cb)
                : (_cb: (stateJson: string) => void) => () => { /* noop */ },

            subscribeTurnReportUpdated: awwv
                ? (cb: (report: unknown) => void) => awwv.subscribeTurnReportUpdated(cb)
                : (_cb: (report: unknown) => void) => () => { /* noop */ },

            // LANE-NIGHTSHIFT-REPLAY-SAVE-SEQUENCE-PRODUCER
            subscribeReplaySequenceUpdated: awwv
                ? (cb: (sequenceJson: string) => void) => awwv.subscribeReplaySequenceUpdated(cb)
                : (_cb: (sequenceJson: string) => void) => () => { /* noop */ },
            subscribeReplayManifestUpdated: awwv
                ? (cb: (manifestJson: string) => void) => awwv.subscribeReplayManifestUpdated(cb)
                : (_cb: (manifestJson: string) => void) => () => { /* noop */ },

            getRecruitmentCatalog: awwv
                ? () => awwv.getRecruitmentCatalog()
                : makeNoop<{ brigades?: unknown[]; error?: string }>(),

            applyRecruitment: awwv
                ? (brigadeId: string, equipmentClass: string) => awwv.applyRecruitment(brigadeId, equipmentClass)
                : makeNoop<{ ok: boolean; stateJson?: string; error?: string }>(),

            getSettings: awwv
                ? () => awwv.getSettings()
                : makeNoop<{ ok: boolean; settings?: unknown; error?: string }>(),

            saveSettings: awwv
                ? (settings: unknown) => awwv.saveSettings(settings)
                : makeNoop<{ ok: boolean; error?: string }>(),

            getAiCommanderConfig: awwv
                ? () => awwv.getAiCommanderConfig()
                : () => Promise.resolve({ mode: 'cadet', session_cost_estimate: 0 }),

            setAiCommanderConfig: awwv
                ? (payload: { mode: string; anthropic_api_key?: string }) => awwv.setAiCommanderConfig(payload)
                : makeNoop<{ ok: boolean; error?: string }>(),

            getAdvisorRecommendation: awwv
                ? (payload: { faction?: string; context_type?: string }) => awwv.getAdvisorRecommendation(payload)
                : (_payload: { faction?: string; context_type?: string }) => Promise.resolve({ ok: false, error: 'Desktop IPC not available' }),

            stageAttackOrder: awwv
                ? (brigadeId: string, targetSettlementId: string) => awwv.stageAttackOrder(brigadeId, targetSettlementId)
                : makeNoop<{ ok: boolean; error?: string }>(),

            stagePostureOrder: awwv
                ? (brigadeId: string, posture: string) => awwv.stagePostureOrder(brigadeId, posture)
                : makeNoop<{ ok: boolean; error?: string }>(),

            stageMoveOrder: awwv
                ? (brigadeId: string, targetMunicipalityId: string) => awwv.stageMoveOrder(brigadeId, targetMunicipalityId)
                : makeNoop<{ ok: boolean; error?: string }>(),

            stageDeployOrder: awwv
                ? (brigadeId: string) => awwv.stageDeployOrder(brigadeId)
                : makeNoop<{ ok: boolean; error?: string }>(),

            stageUndeployOrder: awwv
                ? (brigadeId: string) => awwv.stageUndeployOrder(brigadeId)
                : makeNoop<{ ok: boolean; error?: string }>(),

            stageBrigadeMovementOrder: awwv
                ? (brigadeId: string, targetSettlementIds: string[]) => awwv.stageBrigadeMovementOrder(brigadeId, targetSettlementIds)
                : makeNoop<{ ok: boolean; error?: string }>(),

            stageCorpsStanceOrder: awwv
                ? (corpsId: string, stance: string) => awwv.stageCorpsStanceOrder(corpsId, stance)
                : makeNoop<{ ok: boolean; error?: string }>(),

            stageSectorStanceOrder: awwv
                ? (sectorId: string, stance: string) => awwv.stageSectorStanceOrder(sectorId, stance)
                : makeNoop<{ ok: boolean; error?: string }>(),

            resetSectorStanceToBot: awwv
                ? (sectorId: string) => awwv.resetSectorStanceToBot(sectorId)
                : makeNoop<{ ok: boolean; error?: string }>(),

            stageLogisticsPriority: awwv
                ? (faction: string, sectorId: string, priority: number) => awwv.stageLogisticsPriority(faction, sectorId, priority)
                : makeNoop<{ ok: boolean; error?: string }>(),

            // STOP-OP presidential lever — CA-costed staged halt (supersedes the removed
            // legacy stageOperationHalt). Routes the Stand Down button to stage-op-halt-order.
            stageOpHaltOrder: awwv
                ? (payload: { corpsId: string; opName: string }) => awwv.stageOpHaltOrder(payload)
                : (_payload: { corpsId: string; opName: string }) => NOOP_RESULT as Promise<{ ok: boolean; error?: string }>,

            // REQUEST-OP presidential lever — CA-costed objective directive. Routes the
            // "Request operation" affordance to stage-op-directive-order; the engine
            // auto-selects brigades + axis toward the named target OSID.
            stageOpDirectiveOrder: awwv
                ? (payload: { corpsId: string; targetOsid: string; forced_over_objection?: boolean }) => awwv.stageOpDirectiveOrder(payload)
                : (_payload: { corpsId: string; targetOsid: string; forced_over_objection?: boolean }) => NOOP_RESULT as Promise<{ ok: boolean; error?: string }>,

            stageAssignOperationCommander: awwv
                ? (payload: { corpsId: string; operationName: string; officerId: string }) => awwv.stageAssignOperationCommander(payload)
                : (_payload: { corpsId: string; operationName: string; officerId: string }) => NOOP_RESULT as Promise<{ ok: boolean; error?: string }>,

            // REPLACE-CO presidential lever (Presidential Command Model slice 3/N) — routes
            // the CO sack/install UX to the single costed stage-co-replacement-order path.
            stageCoReplacementOrder: awwv
                ? (payload: { corpsId: string; replacementOfficerId?: string }) => awwv.stageCoReplacementOrder(payload)
                : (_payload: { corpsId: string; replacementOfficerId?: string }) => NOOP_RESULT as Promise<{ ok: boolean; error?: string; replacementOfficerId?: string }>,

            dismissEventNotification: awwv
                ? (notificationId: string) => awwv.dismissEventNotification(notificationId)
                : (_notificationId: string) => NOOP_RESULT as Promise<{ ok: boolean; error?: string }>,

            stageOperationForceLaunch: awwv
                ? (payload: { corpsId: string; operationName: string }) => awwv.stageOperationForceLaunch(payload)
                : (_payload: { corpsId: string; operationName: string }) => NOOP_RESULT as Promise<{ ok: boolean; error?: string }>,

            stageOperationDecision: awwv
                ? (payload: { corpsId: string; operationName: string; decision: 'launch' | 'postpone' | 'abort' | 'probe' }) => awwv.stageOperationDecision(payload)
                : (_payload: { corpsId: string; operationName: string; decision: 'launch' | 'postpone' | 'abort' | 'probe' }) => NOOP_RESULT as Promise<{ ok: boolean; error?: string }>,

            stageAirdropAllocation: awwv
                ? (allocations: Record<string, number>) => awwv.stageAirdropAllocation(allocations)
                : (_allocations: Record<string, number>) => NOOP_RESULT as Promise<{ ok: boolean; error?: string }>,

            respondToEventDecision: awwv
                ? (eventId: string, responseId: string) => awwv.respondToEventDecision(eventId, responseId)
                : (_eventId: string, _responseId: string) => NOOP_RESULT as Promise<{ ok: boolean; error?: string }>,

            stageConvoyDecision: awwv
                ? (convoyId: string, decision: 'allow' | 'block' | 'divert') => awwv.stageConvoyDecision(convoyId, decision)
                : (_convoyId: string, _decision: 'allow' | 'block' | 'divert') => NOOP_RESULT as Promise<{ ok: boolean; error?: string }>,

            stageOpsecToggle: awwv
                ? (sectorId: string, active: boolean) => awwv.stageOpsecToggle(sectorId, active)
                : (_sectorId: string, _active: boolean) => NOOP_RESULT as Promise<{ ok: boolean; error?: string }>,

            stageMunicipalitySupportOrder: awwv
                ? (payload: { faction: 'RS' | 'RBiH' | 'HRHB'; munId: string; type: 'weapons_shipment' | 'staff_priority' | 'croatian_support_package' }) => awwv.stageMunicipalitySupportOrder(payload)
                : (_payload: { faction: 'RS' | 'RBiH' | 'HRHB'; munId: string; type: 'weapons_shipment' | 'staff_priority' | 'croatian_support_package' }) => NOOP_RESULT as Promise<{ ok: boolean; error?: string }>,

            clearOrders: awwv
                ? (brigadeId: string) => awwv.clearOrders(brigadeId)
                : makeNoop<{ ok: boolean; error?: string }>(),

            assignBrigadeToSector: awwv
                ? (brigadeId: string, sectorId: string | null) => awwv.assignBrigadeToSector(brigadeId, sectorId)
                : makeNoop<{ ok: boolean; error?: string }>(),


            queryCombatEstimate: awwv
                ? (brigadeId: string, targetSettlementId: string) => awwv.queryCombatEstimate(brigadeId, targetSettlementId)
                : makeNoop<{ ok: boolean; win_probability?: number; error?: string }>(),

            queryMovementRange: awwv
                ? (brigadeId: string) => awwv.queryMovementRange(brigadeId)
                : makeNoop<IpcMovementRangeResult>(),

            queryMovementPath: awwv
                ? (brigadeId: string, destinationSid: string) => awwv.queryMovementPath(brigadeId, destinationSid)
                : makeNoop<IpcMovementPathResult>(),

            querySupplyPaths: awwv
                ? () => awwv.querySupplyPaths()
                : makeNoop<IpcSupplyPathsResult>(),

            queryCorpsSectors: awwv
                ? () => awwv.queryCorpsSectors()
                : makeNoop<IpcCorpsSectorsResult>(),

            queryBattleEvents: awwv
                ? () => awwv.queryBattleEvents()
                : makeNoop<IpcBattleEventsResult>(),

            getMapServerUrl: awwv
                ? () => awwv.getMapServerUrl()
                : (): Promise<string | null> => Promise.resolve(null),

            focusWarroom: awwv
                ? () => awwv.focusWarroom()
                : (): Promise<void> => Promise.resolve(),

            loadScenarioDialog: awwv
                ? () => awwv.loadScenarioDialog()
                : makeNoop<{ ok: boolean; stateJson?: string; error?: string }>(),

            loadStateDialog: awwv
                ? () => awwv.loadStateDialog()
                : makeNoop<{ ok: boolean; stateJson?: string; error?: string }>(),

            saveGame: awwv
                ? (payload?: { filename?: string }) => awwv.saveGame(payload)
                : makeNoop<{ ok: boolean; filePath?: string; error?: string }>(),

            quickSave: awwv
                ? () => awwv.quickSave()
                : makeNoop<{ ok: boolean; filePath?: string; error?: string }>(),

            openTacticalMapWindow: awwv
                ? (payload?: { mode?: string }) => awwv.openTacticalMapWindow(payload)
                : (_payload?: { mode?: string }): Promise<void> => Promise.resolve(),

            stageCorpsOperationOrder: awwv
                ? (payload: CorpsOperationOrderPayload) => awwv.stageCorpsOperationOrder(payload)
                : (_payload: CorpsOperationOrderPayload) => NOOP_RESULT as Promise<{ ok: boolean; error?: string }>,

            queryOperationPrediction: awwv
                ? (payload: Record<string, unknown>) => awwv.queryOperationPrediction(payload)
                : makeNoop<{ ok: boolean; data?: Record<string, unknown>; error?: string }>(),

            // Force-op pushback OBJECTION query — read-only candidate plan + commander go/no-go.
            queryDirectiveObjection: awwv
                ? (payload: { corpsId: string; targetOsid: string }) => awwv.queryDirectiveObjection(payload)
                : makeNoop<{ ok: boolean; data?: { forceRatio: number; estimatedCasualties: number; recommendedAction: 'launch' | 'delay' | 'abort'; rejectionReason?: string }; error?: string }>(),

            approveReserveRequest: awwv
                ? (requestId: string, brigadeId: string, reason?: string) => awwv.approveReserveRequest(requestId, brigadeId, reason)
                : makeNoop<{ ok: boolean; error?: string }>(),

            declineReserveRequest: awwv
                ? (requestId: string, reason?: string) => awwv.declineReserveRequest(requestId, reason)
                : makeNoop<{ ok: boolean; error?: string }>(),

            recallEliteBrigade: awwv
                ? (brigadeId: string, reason?: string) => awwv.recallEliteBrigade(brigadeId, reason)
                : makeNoop<{ ok: boolean; error?: string }>(),

            redirectReserveLoan: awwv
                ? (brigadeId: string, newCorpsId: string) => awwv.redirectReserveLoan(brigadeId, newCorpsId)
                : makeNoop<{ ok: boolean; error?: string }>(),

            acknowledgeOfficerEvent: awwv
                ? (eventId: string) => awwv.acknowledgeOfficerEvent(eventId)
                : makeNoop<{ ok: boolean; error?: string }>(),

            acceptOfficerReplacement: awwv
                ? (payload: { eventId: string; corpsId: string; newOfficerId: string; currentOfficerId?: string }) => awwv.acceptOfficerReplacement(payload)
                : makeNoop<{ ok: boolean; error?: string }>(),

            resolvePeacePlan: awwv
                ? (planId: string, response: 'accepted' | 'rejected') => awwv.resolvePeacePlan(planId, response)
                : makeNoop<{ ok: boolean; all_accepted?: boolean; rejection_factions?: string[]; error?: string }>(),

            submitCounterOffer: awwv
                ? (payload: {
                    parentOfferId: string;
                    planId: string;
                    response: 'conditional_accept' | 'counter';
                    proposedSplit: { RBiH: number; RS: number; HRHB: number };
                    rider?: string;
                }) => awwv.submitCounterOffer(payload)
                : makeNoop<{ ok: boolean; counter_offer_id?: string; error?: string }>(),

            resolveParamilitaryRequests: awwv
                ? (decisions: Array<{ target_osid: string; decision: 'allow' | 'deny' }>) => awwv.resolveParamilitaryRequests(decisions)
                : makeNoop<{ ok: boolean; stateJson?: string; report?: unknown; error?: string }>(),

            resolveDayton: awwv
                ? (proposal: { territorial_demands: string[]; territorial_concessions: string[]; institutional_choices: Record<string, 'centralized' | 'decentralized'> }) => awwv.resolveDayton(proposal)
                : makeNoop<{ ok: boolean; result?: Record<string, unknown>; error?: string }>(),

            acknowledgeFrictionEvent: awwv
                ? (payload: { corpsId: string; officerId: string; eventTurn: number; eventType: string }) => awwv.acknowledgeFrictionEvent(payload)
                : makeNoop<{ ok: boolean; error?: string }>(),

            stabilizeCommandRelationship: awwv
                ? (payload: { corpsId: string }) => awwv.stabilizeCommandRelationship(payload)
                : makeNoop<{ ok: boolean; resolvedCount?: number; caCost?: number; error?: string }>(),

            getFrontVisitAvailability: awwv
                ? () => awwv.getFrontVisitAvailability()
                : makeNoop<{
                    ok: boolean;
                    costCA?: number;
                    available?: boolean;
                    reason?: string | null;
                    eventId?: string | null;
                    currentTurn?: number;
                    firesLeft?: number;
                    maxFires?: number;
                    cooldownUntil?: number | null;
                    onCooldown?: boolean;
                    reachableBranchIds?: string[];
                    unreachableBranchIds?: string[];
                    error?: string;
                }>(),

            initiateFrontVisit: awwv
                ? () => awwv.initiateFrontVisit()
                : makeNoop<{ ok: boolean; reason?: string; eventId?: string; caCost?: number; offeredBranchIds?: string[]; unreachableBranchIds?: string[]; error?: string }>(),

            // v0.8.4 Phase B+C: Autonomy bridge
            getAutonomyState: awwv
                ? () => awwv.getAutonomyState()
                : () => Promise.resolve({ autonomy_level: 0 }),

            setAutonomyLevel: awwv
                ? (level: number) => awwv.setAutonomyLevel(level)
                : makeNoop<{ ok: boolean; error?: string }>(),

            overrideAiDecision: awwv
                ? (level: number, targetId: string, faction: string) => awwv.overrideAiDecision(level, targetId, faction)
                : makeNoop<{ ok: boolean; error?: string }>(),

            acceptProposal: awwv
                ? (proposalId: string) => awwv.acceptProposal(proposalId)
                : makeNoop<{ ok: boolean; error?: string }>(),

            rejectProposal: awwv
                ? (proposalId: string) => awwv.rejectProposal(proposalId)
                : makeNoop<{ ok: boolean; error?: string }>(),

            forceLaunchProposal: awwv
                ? (proposalId: string) => awwv.forceLaunchProposal(proposalId)
                : makeNoop<{ ok: boolean; error?: string }>(),

            resolveOperationOpportunityDecision: awwv
                ? (payload: OperationOpportunityDecisionPayload) => awwv.resolveOperationOpportunityDecision(payload)
                : (_payload: OperationOpportunityDecisionPayload) => NOOP_RESULT as Promise<{ ok: boolean; error?: string }>,

            // v0.9.2 tutorial onboarding (LANE-NIGHTSHIFT-ROUND2 + LANE-NIGHTSHIFT-TUTORIAL-CONTENT-V1)
            dismissTutorial: awwv
                ? () => awwv.dismissTutorial()
                : makeNoop<{ ok: boolean; error?: string }>(),
            advanceTutorialStep: awwv
                ? (stepId: string) => awwv.advanceTutorialStep(stepId)
                : (_stepId: string) => NOOP_RESULT as Promise<{ ok: boolean; error?: string }>,
            restartTutorial: awwv
                ? () => awwv.restartTutorial()
                : makeNoop<{ ok: boolean; error?: string }>(),
        };
    }, []); // stable — never changes reference
}
