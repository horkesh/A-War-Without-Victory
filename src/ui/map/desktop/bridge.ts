import type {
  AdvanceTurnResult,
  ApplyRecruitmentResult,
  AwwvBridge,
  CombatEstimateResult,
  DesktopBridgeClient,
  DesktopOkError,
  RecruitmentCatalogResult,
  StartNewCampaignPayload,
  StartNewCampaignResult,
} from './types';

const BRIDGE_UNAVAILABLE = 'Desktop bridge unavailable';

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

export function getAwwvBridge(windowLike: unknown = typeof window !== 'undefined' ? window : undefined): AwwvBridge | null {
  if (!windowLike || typeof windowLike !== 'object') return null;
  const maybe = (windowLike as { awwv?: unknown }).awwv;
  if (!maybe || typeof maybe !== 'object') return null;
  return maybe as AwwvBridge;
}

export function createDesktopBridgeClient(bridge: AwwvBridge | null): DesktopBridgeClient {
  const isAvailable =
    typeof bridge?.stageAttackOrder === 'function' &&
    typeof bridge?.queryCombatEstimate === 'function';

  async function invokeOrUnavailable<T>(
    fn: (() => Promise<T>) | undefined,
    unavailableValue: T
  ): Promise<T> {
    if (!fn) return unavailableValue;
    try {
      return await fn();
    } catch (error) {
      const e = errorMessage(error);
      if (typeof unavailableValue === 'object' && unavailableValue !== null && 'ok' in unavailableValue) {
        return { ...(unavailableValue as object), ok: false, error: e } as T;
      }
      return unavailableValue;
    }
  }

  return {
    isAvailable,
    async stageAttackOrder(brigadeId: string, targetSettlementId: string): Promise<DesktopOkError> {
      return invokeOrUnavailable(
        bridge?.stageAttackOrder ? () => bridge.stageAttackOrder!(brigadeId, targetSettlementId) : undefined,
        { ok: false, error: BRIDGE_UNAVAILABLE }
      );
    },
    async queryCombatEstimate(brigadeId: string, targetSettlementId: string): Promise<CombatEstimateResult> {
      return invokeOrUnavailable(
        bridge?.queryCombatEstimate ? () => bridge.queryCombatEstimate!(brigadeId, targetSettlementId) : undefined,
        { ok: false, error: BRIDGE_UNAVAILABLE }
      );
    },
    getCurrentGameState() {
      if (!bridge?.getCurrentGameState) return Promise.resolve(null);
      return bridge.getCurrentGameState();
    },
    setGameStateUpdatedCallback(callback: ((stateJson: unknown) => void) | null) {
      bridge?.setGameStateUpdatedCallback?.(callback);
    },
    advanceTurn(payload?: unknown): Promise<AdvanceTurnResult> {
      return invokeOrUnavailable(
        bridge?.advanceTurn ? () => bridge.advanceTurn!(payload) : undefined,
        { ok: false, error: BRIDGE_UNAVAILABLE }
      );
    },
    startNewCampaign(payload: StartNewCampaignPayload): Promise<StartNewCampaignResult> {
      return invokeOrUnavailable(
        bridge?.startNewCampaign ? () => bridge.startNewCampaign!(payload) : undefined,
        { ok: false, error: BRIDGE_UNAVAILABLE }
      );
    },
    stagePostureOrder(brigadeId: string, posture: string): Promise<DesktopOkError> {
      return invokeOrUnavailable(
        bridge?.stagePostureOrder ? () => bridge.stagePostureOrder!(brigadeId, posture) : undefined,
        { ok: false, error: BRIDGE_UNAVAILABLE }
      );
    },
    stageMoveOrder(brigadeId: string, targetMunicipalityId: string): Promise<DesktopOkError> {
      return invokeOrUnavailable(
        bridge?.stageMoveOrder ? () => bridge.stageMoveOrder!(brigadeId, targetMunicipalityId) : undefined,
        { ok: false, error: BRIDGE_UNAVAILABLE }
      );
    },
    stageBrigadeMovementOrder(brigadeId: string, targetSettlementIds: string[]): Promise<DesktopOkError> {
      return invokeOrUnavailable(
        bridge?.stageBrigadeMovementOrder ? () => bridge.stageBrigadeMovementOrder!(brigadeId, targetSettlementIds) : undefined,
        { ok: false, error: BRIDGE_UNAVAILABLE }
      );
    },
    getRecruitmentCatalog(): Promise<RecruitmentCatalogResult | null> {
      if (!bridge?.getRecruitmentCatalog) return Promise.resolve(null);
      return bridge.getRecruitmentCatalog();
    },
    applyRecruitment(brigadeId: string, equipmentClass: string): Promise<ApplyRecruitmentResult> {
      return invokeOrUnavailable(
        bridge?.applyRecruitment ? () => bridge.applyRecruitment!(brigadeId, equipmentClass) : undefined,
        { ok: false, error: BRIDGE_UNAVAILABLE }
      );
    },
  };
}
