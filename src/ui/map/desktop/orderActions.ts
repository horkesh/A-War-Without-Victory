import type { IPC } from './useIPC';
import type { LoadedGameState } from '../data/types';
import { buildTurnAftermathDigest, buildTurnAftermathView, classifyTurnAftermathWeight, type TurnAftermathDigest, type TurnAftermathReportInput, type TurnAftermathView } from '../data/turnAftermath';
import type { LastTurnReport, StagedOrder } from '../store/gameStore';
import { playerFacingErrorCopy } from '../utils/errorCopy';

interface AdvanceTurnDeps {
    ipc: Pick<IPC, 'advanceTurn'>;
    loadSave: (jsonOrText: unknown | string) => Promise<void>;
    clearStagedOrders: () => void;
    setLoadError: (msg: string | null) => void;
    getCurrentState?: () => LoadedGameState | null;
    getOsidNameMap?: () => Record<string, string> | null;
    setLastTurnReport?: (report: LastTurnReport | null) => void;
    setTurnAftermath?: (view: TurnAftermathView | null) => void;
    setTurnAftermathOpen?: (open: boolean) => void;
    setTurnAftermathDigest?: (digest: TurnAftermathDigest | null) => void;
}

function normalizeTurnReport(report: unknown): (LastTurnReport & TurnAftermathReportInput) | null {
    if (report == null || typeof report !== 'object') return null;
    const candidate = report as Record<string, unknown>;
    return {
        phase: typeof candidate.phase === 'string' ? candidate.phase : undefined,
        turn: typeof candidate.turn === 'number' ? candidate.turn : undefined,
        player_faction: typeof candidate.player_faction === 'string' || candidate.player_faction === null
            ? candidate.player_faction
            : undefined,
        probe: typeof candidate.probe === 'string' || candidate.probe === null
            ? candidate.probe
            : undefined,
        details: candidate.details && typeof candidate.details === 'object'
            ? candidate.details as LastTurnReport['details']
            : undefined,
    };
}

/**
 * Calls advance-turn IPC, loads resulting state into store, and clears staged orders.
 * The mounted tactical shell (`PresidentialToolbar`) wraps this with setAdvancing(true/false).
 */
export async function advanceTurnAndSync({
    ipc,
    loadSave,
    clearStagedOrders,
    setLoadError,
    getCurrentState,
    getOsidNameMap,
    setLastTurnReport,
    setTurnAftermath,
    setTurnAftermathOpen,
    setTurnAftermathDigest,
}: AdvanceTurnDeps): Promise<void> {
    const previousState = getCurrentState?.() ?? null;
    setTurnAftermathDigest?.(null);
    const result = await ipc.advanceTurn();
    if (!result.ok || !result.stateJson) {
        setLoadError(playerFacingErrorCopy(result.error ?? 'Advance turn failed.'));
        return;
    }
    clearStagedOrders();
    const report = normalizeTurnReport(result.report);
    if (report) setLastTurnReport?.(report);
    try {
        await loadSave(result.stateJson);
        const nextState = getCurrentState?.() ?? null;
        const aftermath = buildTurnAftermathView({
            previousState,
            nextState,
            lastTurnReport: report,
            osidNameMap: getOsidNameMap?.() ?? null,
        });
        if (aftermath) {
            setTurnAftermath?.(aftermath);
            if (classifyTurnAftermathWeight(aftermath) === 'heavy') {
                setTurnAftermathDigest?.(null);
                setTurnAftermathOpen?.(true);
            } else {
                setTurnAftermathDigest?.(buildTurnAftermathDigest(aftermath));
            }
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setLoadError(message);
    }
}

interface PostureOrderDeps {
    ipc: IPC;
    addStagedOrder: (order: Omit<StagedOrder, 'id'>) => void;
    setLoadError: (msg: string | null) => void;
}

/**
 * Stages a posture order via IPC and adds it to the local order queue.
 */
export async function stagePostureOrderAction(
    { ipc, addStagedOrder, setLoadError }: PostureOrderDeps,
    formationId: string,
    posture: string,
): Promise<void> {
    const result = await ipc.stagePostureOrder(formationId, posture);
    if (!result.ok) {
        setLoadError(result.error ?? 'Posture order failed.');
        return;
    }
    addStagedOrder({ type: 'posture', formationId, postureName: posture });
}
/**
 * Stages an AoR order via IPC when the player clicks a settlement in AoR mode.
 * Shifts the settlement from its current owner to the selected brigade.
 */
/**
 * Stages a Brigade-to-Sector assignment via IPC from the map-click path.
 * This must flow through the canonical sector override contract, not the
 * older front-assignment lane.
 */
export async function stageAssignBrigadeToSectorAction(
    { ipc, addStagedOrder, setLoadError }: PostureOrderDeps,
    brigadeId: string,
    sectorId: string,
): Promise<void> {
    const result = await ipc.assignBrigadeToSector(brigadeId, sectorId);
    if (!result.ok) {
        setLoadError(result.error ?? 'Sector assignment failed.');
        return;
    }
    addStagedOrder({ type: 'sector', formationId: brigadeId, targetSectorId: sectorId });
}

/**
 * Permanently assigns a brigade to a sector (player sector override).
 * Persists in brigade_sector_override until manually cleared.
 * Pass sectorId=null to clear an existing override.
 */
export async function assignBrigadeToSectorOverrideAction(
    { ipc, addStagedOrder, setLoadError }: PostureOrderDeps,
    brigadeId: string,
    sectorId: string | null,
): Promise<void> {
    const result = await ipc.assignBrigadeToSector(brigadeId, sectorId);
    if (!result.ok) {
        setLoadError(result.error ?? 'Sector assignment failed.');
        return;
    }
    if (sectorId) {
        addStagedOrder({ type: 'sector', formationId: brigadeId, targetSectorId: sectorId });
    }
}
