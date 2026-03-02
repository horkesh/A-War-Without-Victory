export interface DesktopOkError {
  ok: boolean;
  error?: string;
}

export interface CombatEstimateResult extends DesktopOkError {
  win_probability?: number;
}

export interface AdvanceTurnResult extends DesktopOkError {
  stateJson?: unknown;
  report?: unknown;
}

export interface StartNewCampaignPayload {
  playerFaction: 'RBiH' | 'RS' | 'HRHB';
  scenarioKey?: 'apr_1992' | 'sep_1991';
}

export interface StartNewCampaignResult extends DesktopOkError {
  stateJson?: unknown;
}

export interface ApplyRecruitmentResult extends DesktopOkError {
  stateJson?: unknown;
  newFormationId?: string;
}

export interface RecruitmentCatalogBrigade {
  id: string;
  faction: string;
  name: string;
  home_mun?: string;
  manpower_cost: number;
  capital_cost: number;
  default_equipment_class: string;
  available_from?: number;
  mandatory?: boolean;
}

export interface RecruitmentCatalogResult {
  brigades: RecruitmentCatalogBrigade[];
  error?: string;
}

export interface AwwvBridge {
  stageAttackOrder?: (brigadeId: string, targetSettlementId: string) => Promise<DesktopOkError>;
  queryCombatEstimate?: (brigadeId: string, targetSettlementId: string) => Promise<CombatEstimateResult>;
  getCurrentGameState?: () => Promise<unknown>;
  setGameStateUpdatedCallback?: (callback: ((stateJson: unknown) => void) | null) => void;
  advanceTurn?: (payload?: unknown) => Promise<AdvanceTurnResult>;
  startNewCampaign?: (payload: StartNewCampaignPayload) => Promise<StartNewCampaignResult>;
  stagePostureOrder?: (brigadeId: string, posture: string) => Promise<DesktopOkError>;
  stageMoveOrder?: (brigadeId: string, targetMunicipalityId: string) => Promise<DesktopOkError>;
  stageBrigadeMovementOrder?: (brigadeId: string, targetSettlementIds: string[]) => Promise<DesktopOkError>;
  getRecruitmentCatalog?: () => Promise<RecruitmentCatalogResult>;
  applyRecruitment?: (brigadeId: string, equipmentClass: string) => Promise<ApplyRecruitmentResult>;
}

export interface DesktopBridgeClient {
  isAvailable: boolean;
  stageAttackOrder: (brigadeId: string, targetSettlementId: string) => Promise<DesktopOkError>;
  queryCombatEstimate: (brigadeId: string, targetSettlementId: string) => Promise<CombatEstimateResult>;
  getCurrentGameState: () => Promise<unknown>;
  setGameStateUpdatedCallback: (callback: ((stateJson: unknown) => void) | null) => void;
  advanceTurn: (payload?: unknown) => Promise<AdvanceTurnResult>;
  startNewCampaign: (payload: StartNewCampaignPayload) => Promise<StartNewCampaignResult>;
  stagePostureOrder: (brigadeId: string, posture: string) => Promise<DesktopOkError>;
  stageMoveOrder: (brigadeId: string, targetMunicipalityId: string) => Promise<DesktopOkError>;
  stageBrigadeMovementOrder: (brigadeId: string, targetSettlementIds: string[]) => Promise<DesktopOkError>;
  getRecruitmentCatalog: () => Promise<RecruitmentCatalogResult | null>;
  applyRecruitment: (brigadeId: string, equipmentClass: string) => Promise<ApplyRecruitmentResult>;
}
