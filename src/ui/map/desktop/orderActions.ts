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
