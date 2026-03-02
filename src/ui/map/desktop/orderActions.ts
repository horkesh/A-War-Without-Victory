import type { DesktopBridgeClient } from './types';
import type { StagedOrder } from '../store/gameStore';

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

interface StageOrderDeps {
  ipc: DesktopBridgeClient;
  addStagedOrder: (order: Omit<StagedOrder, 'id'>) => void;
  setLoadError: (message: string | null) => void;
}

export async function stageMoveOrderFromOsid(
  deps: StageOrderDeps,
  formationId: string,
  targetOsid: string
): Promise<boolean> {
  const { ipc, addStagedOrder, setLoadError } = deps;
  if (!ipc.isAvailable) {
    addStagedOrder({ type: 'move', formationId, targetOsid });
    return true;
  }
  try {
    const result = await ipc.stageBrigadeMovementOrder(formationId, [targetOsid]);
    if (!result.ok) {
      setLoadError(result.error ?? 'Failed to stage movement order.');
      return false;
    }
    addStagedOrder({ type: 'move', formationId, targetOsid });
    return true;
  } catch (error) {
    setLoadError(toErrorMessage(error));
    return false;
  }
}

export async function stagePostureOrderAction(
  deps: StageOrderDeps,
  formationId: string,
  postureName: string
): Promise<boolean> {
  const { ipc, addStagedOrder, setLoadError } = deps;
  if (!ipc.isAvailable) {
    addStagedOrder({ type: 'posture', formationId, postureName });
    return true;
  }
  try {
    const result = await ipc.stagePostureOrder(formationId, postureName);
    if (!result.ok) {
      setLoadError(result.error ?? 'Failed to stage posture order.');
      return false;
    }
    addStagedOrder({ type: 'posture', formationId, postureName });
    return true;
  } catch (error) {
    setLoadError(toErrorMessage(error));
    return false;
  }
}

interface AdvanceTurnDeps {
  ipc: DesktopBridgeClient;
  loadSave: (jsonOrText: unknown | string) => Promise<void>;
  clearStagedOrders: () => void;
  setLoadError: (message: string | null) => void;
}

export async function advanceTurnAndSync(deps: AdvanceTurnDeps): Promise<boolean> {
  const { ipc, loadSave, clearStagedOrders, setLoadError } = deps;
  if (!ipc.isAvailable) {
    setLoadError('Advance turn is available in desktop mode only.');
    return false;
  }
  try {
    const result = await ipc.advanceTurn({});
    if (!result.ok) {
      setLoadError(result.error ?? 'Advance turn failed.');
      return false;
    }
    if (result.stateJson != null) {
      await loadSave(result.stateJson);
    }
    clearStagedOrders();
    return true;
  } catch (error) {
    setLoadError(toErrorMessage(error));
    return false;
  }
}
