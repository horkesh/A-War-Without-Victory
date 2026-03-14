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

/** Shape of window.awwv as exposed by preload.cjs. */
interface WindowAwwv {
    startNewCampaign: (payload: StartNewCampaignPayload) => Promise<{ ok: boolean; stateJson?: string; error?: string }>;
    advanceTurn: (payload?: { phase0Directives?: unknown[] }) => Promise<{ ok: boolean; stateJson?: string; report?: unknown; error?: string }>;
    getCurrentGameState: () => Promise<string | null>;
    setGameStateUpdatedCallback: (cb: ((stateJson: string) => void) | null) => void;
    setTurnReportUpdatedCallback: (cb: ((report: unknown) => void) | null) => void;
    getRecruitmentCatalog: () => Promise<{ brigades?: unknown[]; error?: string }>;
    applyRecruitment: (brigadeId: string, equipmentClass: string) => Promise<{ ok: boolean; stateJson?: string; error?: string }>;
    stageAttackOrder: (brigadeId: string, targetSettlementId: string) => Promise<{ ok: boolean; error?: string }>;
    stagePostureOrder: (brigadeId: string, posture: string) => Promise<{ ok: boolean; error?: string }>;
    stageMoveOrder: (brigadeId: string, targetMunicipalityId: string) => Promise<{ ok: boolean; error?: string }>;
    stageDeployOrder: (brigadeId: string) => Promise<{ ok: boolean; error?: string }>;
    stageUndeployOrder: (brigadeId: string) => Promise<{ ok: boolean; error?: string }>;
    stageBrigadeMovementOrder: (brigadeId: string, targetSettlementIds: string[]) => Promise<{ ok: boolean; error?: string }>;
    stageBrigadeRepositionOrder: (brigadeId: string, settlementIds: string[]) => Promise<{ ok: boolean; error?: string }>;
    stageBrigadeAoROrder: (settlementId: string, fromBrigadeId: string, toBrigadeId: string) => Promise<{ ok: boolean; error?: string }>;
    stageCorpsFrontOrder: (corpsId: string, edgeIds: string[]) => Promise<{ ok: boolean; error?: string }>;
    stageCorpsAttackAxisOrder: (corpsId: string, edgeIds: string[]) => Promise<{ ok: boolean; error?: string }>;
    stageOgSubfrontOrder: (ogId: string, corpsId: string, edgeIds: string[]) => Promise<{ ok: boolean; error?: string }>;
    stageCorpsStanceOrder: (corpsId: string, stance: string) => Promise<{ ok: boolean; error?: string }>;
    stageSectorStanceOrder: (sectorId: string, stance: string) => Promise<{ ok: boolean; error?: string }>;
    resetSectorStanceToBot: (sectorId: string) => Promise<{ ok: boolean; error?: string }>;
    stageLogisticsPriority: (faction: string, sectorId: string, priority: number) => Promise<{ ok: boolean; error?: string }>;
    stageCorpsOperationOrder: (payload: CorpsOperationOrderPayload) => Promise<{ ok: boolean; error?: string }>;
    stageOperationHalt: (payload: { corpsId: string; operationName: string; digInOnHalt: boolean }) => Promise<{ ok: boolean; error?: string }>;
    stageAssignOperationCommander: (payload: { corpsId: string; operationName: string; officerId: string }) => Promise<{ ok: boolean; error?: string }>;
    stageOperationForceLaunch: (payload: { corpsId: string; operationName: string }) => Promise<{ ok: boolean; error?: string }>;
    stageOperationDecision: (payload: { corpsId: string; operationName: string; decision: 'launch' | 'postpone' | 'abort' | 'probe' }) => Promise<{ ok: boolean; error?: string }>;
    stageAirdropAllocation: (allocations: Record<string, number>) => Promise<{ ok: boolean; error?: string }>;
    stageConvoyDecision: (convoyId: string, decision: 'allow' | 'block' | 'divert') => Promise<{ ok: boolean; error?: string }>;
    stageOpsecToggle: (sectorId: string, active: boolean) => Promise<{ ok: boolean; error?: string }>;
    stageMunicipalitySupportOrder: (payload: { faction: 'RS' | 'RBiH' | 'HRHB'; munId: string; type: 'weapons_shipment' | 'staff_priority' | 'croatian_support_package' }) => Promise<{ ok: boolean; error?: string }>;
    clearOrders: (brigadeId: string) => Promise<{ ok: boolean; error?: string }>;
    assignBrigadeToFront: (brigadeId: string, frontId: string) => Promise<{ ok: boolean; error?: string }>;
    assignBrigadeToSector: (brigadeId: string, sectorId: string | null) => Promise<{ ok: boolean; error?: string }>;
    renameFrontSegment: (frontId: string, name: string) => Promise<{ ok: boolean; error?: string }>;
    renameTheatre: (theatreId: string, name: string) => Promise<{ ok: boolean; error?: string }>;
    setBrigadeDesiredAoRCap: (brigadeId: string, cap: number) => Promise<{ ok: boolean; error?: string }>;
    queryMovementRange: (brigadeId: string) => Promise<unknown>;
    queryMovementPath: (brigadeId: string, destinationSid: string) => Promise<unknown>;
    queryCombatEstimate: (brigadeId: string, targetSettlementId: string) => Promise<{ ok: boolean; win_probability?: number; error?: string }>;
    querySupplyPaths: () => Promise<unknown>;
    queryCorpsSectors: () => Promise<unknown>;
    queryBattleEvents: () => Promise<unknown>;
    getMapServerUrl: () => Promise<string | null>;
    focusWarroom: () => Promise<void>;
    loadScenarioDialog: () => Promise<{ ok: boolean; stateJson?: string; error?: string }>;
    loadStateDialog: () => Promise<{ ok: boolean; stateJson?: string; error?: string }>;
    openTacticalMapWindow: (payload?: { mode?: string }) => Promise<void>;
    approveReserveRequest: (corpsId: string, brigadeId: string) => Promise<{ ok: boolean; error?: string }>;
    recallEliteBrigade: (brigadeId: string) => Promise<{ ok: boolean; error?: string }>;
    redirectReserveLoan: (brigadeId: string, newCorpsId: string) => Promise<{ ok: boolean; error?: string }>;
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
            ? (window as unknown as { awwv?: WindowAwwv }).awwv
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

            setGameStateUpdatedCallback: awwv
                ? (cb: ((stateJson: string) => void) | null) => awwv.setGameStateUpdatedCallback(cb)
                : (_cb: ((stateJson: string) => void) | null) => { /* noop */ },

            setTurnReportUpdatedCallback: awwv
                ? (cb: ((report: unknown) => void) | null) => awwv.setTurnReportUpdatedCallback(cb)
                : (_cb: ((report: unknown) => void) | null) => { /* noop */ },

            getRecruitmentCatalog: awwv
                ? () => awwv.getRecruitmentCatalog()
                : makeNoop<{ brigades?: unknown[]; error?: string }>(),

            applyRecruitment: awwv
                ? (brigadeId: string, equipmentClass: string) => awwv.applyRecruitment(brigadeId, equipmentClass)
                : makeNoop<{ ok: boolean; stateJson?: string; error?: string }>(),

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

            stageBrigadeRepositionOrder: awwv
                ? (brigadeId: string, settlementIds: string[]) => awwv.stageBrigadeRepositionOrder(brigadeId, settlementIds)
                : makeNoop<{ ok: boolean; error?: string }>(),

            stageBrigadeAoROrder: awwv
                ? (settlementId: string, fromBrigadeId: string, toBrigadeId: string) => awwv.stageBrigadeAoROrder(settlementId, fromBrigadeId, toBrigadeId)
                : makeNoop<{ ok: boolean; error?: string }>(),

            stageCorpsFrontOrder: awwv
                ? (corpsId: string, edgeIds: string[]) => awwv.stageCorpsFrontOrder(corpsId, edgeIds)
                : makeNoop<{ ok: boolean; error?: string }>(),

            stageCorpsAttackAxisOrder: awwv
                ? (corpsId: string, edgeIds: string[]) => awwv.stageCorpsAttackAxisOrder(corpsId, edgeIds)
                : makeNoop<{ ok: boolean; error?: string }>(),

            stageOgSubfrontOrder: awwv
                ? (ogId: string, corpsId: string, edgeIds: string[]) => awwv.stageOgSubfrontOrder(ogId, corpsId, edgeIds)
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

            stageOperationHalt: awwv
                ? (payload: { corpsId: string; operationName: string; digInOnHalt: boolean }) => awwv.stageOperationHalt(payload)
                : (_payload: { corpsId: string; operationName: string; digInOnHalt: boolean }) => NOOP_RESULT as Promise<{ ok: boolean; error?: string }>,

            stageAssignOperationCommander: awwv
                ? (payload: { corpsId: string; operationName: string; officerId: string }) => awwv.stageAssignOperationCommander(payload)
                : (_payload: { corpsId: string; operationName: string; officerId: string }) => NOOP_RESULT as Promise<{ ok: boolean; error?: string }>,

            stageOperationForceLaunch: awwv
                ? (payload: { corpsId: string; operationName: string }) => awwv.stageOperationForceLaunch(payload)
                : (_payload: { corpsId: string; operationName: string }) => NOOP_RESULT as Promise<{ ok: boolean; error?: string }>,

            stageOperationDecision: awwv
                ? (payload: { corpsId: string; operationName: string; decision: 'launch' | 'postpone' | 'abort' | 'probe' }) => awwv.stageOperationDecision(payload)
                : (_payload: { corpsId: string; operationName: string; decision: 'launch' | 'postpone' | 'abort' | 'probe' }) => NOOP_RESULT as Promise<{ ok: boolean; error?: string }>,

            stageAirdropAllocation: awwv
                ? (allocations: Record<string, number>) => awwv.stageAirdropAllocation(allocations)
                : (_allocations: Record<string, number>) => NOOP_RESULT as Promise<{ ok: boolean; error?: string }>,

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

            assignBrigadeToFront: awwv
                ? (brigadeId: string, frontId: string) => awwv.assignBrigadeToFront(brigadeId, frontId)
                : makeNoop<{ ok: boolean; error?: string }>(),

            assignBrigadeToSector: awwv
                ? (brigadeId: string, sectorId: string | null) => awwv.assignBrigadeToSector(brigadeId, sectorId)
                : makeNoop<{ ok: boolean; error?: string }>(),

            renameFrontSegment: awwv
                ? (frontId: string, name: string) => awwv.renameFrontSegment(frontId, name)
                : makeNoop<{ ok: boolean; error?: string }>(),

            renameTheatre: awwv
                ? (theatreId: string, name: string) => awwv.renameTheatre(theatreId, name)
                : makeNoop<{ ok: boolean; error?: string }>(),

            setBrigadeDesiredAoRCap: awwv
                ? (brigadeId: string, cap: number) => awwv.setBrigadeDesiredAoRCap(brigadeId, cap)
                : makeNoop<{ ok: boolean; error?: string }>(),

            queryCombatEstimate: awwv
                ? (brigadeId: string, targetSettlementId: string) => awwv.queryCombatEstimate(brigadeId, targetSettlementId)
                : makeNoop<{ ok: boolean; win_probability?: number; error?: string }>(),

            queryMovementRange: awwv
                ? (brigadeId: string) => awwv.queryMovementRange(brigadeId)
                : makeNoop<unknown>(),

            queryMovementPath: awwv
                ? (brigadeId: string, destinationSid: string) => awwv.queryMovementPath(brigadeId, destinationSid)
                : makeNoop<unknown>(),

            querySupplyPaths: awwv
                ? () => awwv.querySupplyPaths()
                : makeNoop<unknown>(),

            queryCorpsSectors: awwv
                ? () => awwv.queryCorpsSectors()
                : makeNoop<unknown>(),

            queryBattleEvents: awwv
                ? () => awwv.queryBattleEvents()
                : makeNoop<unknown>(),

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

            openTacticalMapWindow: awwv
                ? (payload?: { mode?: string }) => awwv.openTacticalMapWindow(payload)
                : (_payload?: { mode?: string }): Promise<void> => Promise.resolve(),

            stageCorpsOperationOrder: awwv
                ? (payload: CorpsOperationOrderPayload) => awwv.stageCorpsOperationOrder(payload)
                : (_payload: CorpsOperationOrderPayload) => NOOP_RESULT as Promise<{ ok: boolean; error?: string }>,

            approveReserveRequest: awwv
                ? (corpsId: string, brigadeId: string) => awwv.approveReserveRequest(corpsId, brigadeId)
                : makeNoop<{ ok: boolean; error?: string }>(),

            recallEliteBrigade: awwv
                ? (brigadeId: string) => awwv.recallEliteBrigade(brigadeId)
                : makeNoop<{ ok: boolean; error?: string }>(),

            redirectReserveLoan: awwv
                ? (brigadeId: string, newCorpsId: string) => awwv.redirectReserveLoan(brigadeId, newCorpsId)
                : makeNoop<{ ok: boolean; error?: string }>(),
        };
    }, []); // stable — never changes reference
}
