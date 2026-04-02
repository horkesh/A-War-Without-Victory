import type { IPC } from './useIPC';
import type { StagedOrder } from '../store/gameStore';

interface AdvanceTurnDeps {
    ipc: IPC;
    loadSave: (jsonOrText: unknown | string) => Promise<void>;
    clearStagedOrders: () => void;
    setLoadError: (msg: string | null) => void;
}

/**
 * Calls advance-turn IPC, loads resulting state into store, and clears staged orders.
 * TopToolbar wraps this with setAdvancing(true/false).
 */
export async function advanceTurnAndSync({
    ipc,
    loadSave,
    clearStagedOrders,
    setLoadError,
}: AdvanceTurnDeps): Promise<void> {
    const result = await ipc.advanceTurn();
    if (!result.ok || !result.stateJson) {
        setLoadError(result.error ?? 'Advance turn failed.');
        return;
    }
    clearStagedOrders();
    try {
        await loadSave(result.stateJson);
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
 * Stages a move order via IPC when the player clicks a destination OSID in move mode.
 * Uses the OSID directly as the brigade movement destination.
 */
export async function stageMoveOrderFromOsid(
    { ipc, addStagedOrder, setLoadError }: PostureOrderDeps,
    brigadeId: string,
    targetOsid: string,
): Promise<void> {
    const result = await ipc.stageMoveOrder(brigadeId, targetOsid);
    if (!result.ok) {
        setLoadError(result.error ?? 'Move order failed.');
        return;
    }
    addStagedOrder({ type: 'move', formationId: brigadeId, targetOsid });
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
    addStagedOrder({ type: 'sector', formationId: brigadeId, targetOsid: sectorId });
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
        addStagedOrder({ type: 'sector', formationId: brigadeId, targetOsid: sectorId });
    }
}
