import { useMemo } from 'react';
import type { StartNewCampaignPayload } from './types';

export interface CorpsOperationOrderPayload {
    corpsId: string;
    name: string;
    type: 'general_offensive' | 'sector_attack' | 'strategic_defense' | 'reorganization';
    targetSettlements: string[];
    participatingBrigades: string[];
    sectorId?: string;
    objectives?: string[];
    planningDuration?: number;
    stagingOsid?: string;
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
    stageCorpsOperationOrder: (payload: CorpsOperationOrderPayload) => Promise<{ ok: boolean; error?: string }>;
    clearOrders: (brigadeId: string) => Promise<{ ok: boolean; error?: string }>;
    assignBrigadeToFront: (brigadeId: string, frontId: string) => Promise<{ ok: boolean; error?: string }>;
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

            clearOrders: awwv
                ? (brigadeId: string) => awwv.clearOrders(brigadeId)
                : makeNoop<{ ok: boolean; error?: string }>(),

            assignBrigadeToFront: awwv
                ? (brigadeId: string, frontId: string) => awwv.assignBrigadeToFront(brigadeId, frontId)
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
        };
    }, []); // stable — never changes reference
}
