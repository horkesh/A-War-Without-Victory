/** Types shared across the desktop IPC integration layer. */

export interface DesktopOkError {
    ok: boolean;
    error?: string;
}

export interface CombatEstimateResult extends DesktopOkError {
    estimate?: unknown;
}

export interface AdvanceTurnResult extends DesktopOkError {
    state?: unknown;
}

export interface RecruitmentCatalogBrigade {
    id: string;
    name: string;
    faction: string;
    home_mun: string;
    capital_cost: number;
    manpower_cost: number;
    default_equipment_class: string;
    available_from: number;
    mandatory: boolean;
}

export interface RecruitmentCatalogResult extends DesktopOkError {
    brigades?: RecruitmentCatalogBrigade[];
}

export interface ApplyRecruitmentResult extends DesktopOkError {
    state?: unknown;
}

export interface StartNewCampaignPayload {
    playerFaction: 'RBiH' | 'RS' | 'HRHB';
    scenarioKey?: string;
}

export interface StartNewCampaignResult extends DesktopOkError {
    state?: unknown;
}

export interface AwwvBridge {
    stageAttackOrder?(brigadeId: string, targetSettlementId: string): Promise<DesktopOkError>;
    queryCombatEstimate?(brigadeId: string, targetSettlementId: string): Promise<CombatEstimateResult>;
    getCurrentGameState?(): Promise<unknown | null>;
    subscribeGameStateUpdated?(callback: (stateJson: unknown) => void): () => void;
    subscribeTurnReportUpdated?(callback: (report: unknown) => void): () => void;
    advanceTurn?(payload?: unknown): Promise<AdvanceTurnResult>;
    startNewCampaign?(payload: StartNewCampaignPayload): Promise<StartNewCampaignResult>;
    stagePostureOrder?(brigadeId: string, posture: string): Promise<DesktopOkError>;
    stageMoveOrder?(brigadeId: string, targetMunicipalityId: string): Promise<DesktopOkError>;
    getRecruitmentCatalog?(): Promise<RecruitmentCatalogResult | null>;
    applyRecruitment?(brigadeId: string, equipmentClass: string): Promise<ApplyRecruitmentResult>;
}

export interface DesktopBridgeClient {
    isAvailable: boolean;
    stageAttackOrder(brigadeId: string, targetSettlementId: string): Promise<DesktopOkError>;
    queryCombatEstimate(brigadeId: string, targetSettlementId: string): Promise<CombatEstimateResult>;
    getCurrentGameState(): Promise<unknown | null>;
    subscribeGameStateUpdated(callback: (stateJson: unknown) => void): () => void;
    subscribeTurnReportUpdated(callback: (report: unknown) => void): () => void;
    advanceTurn(payload?: unknown): Promise<AdvanceTurnResult>;
    startNewCampaign(payload: StartNewCampaignPayload): Promise<StartNewCampaignResult>;
    stagePostureOrder(brigadeId: string, posture: string): Promise<DesktopOkError>;
    stageMoveOrder(brigadeId: string, targetMunicipalityId: string): Promise<DesktopOkError>;
    getRecruitmentCatalog(): Promise<RecruitmentCatalogResult | null>;
    applyRecruitment(brigadeId: string, equipmentClass: string): Promise<ApplyRecruitmentResult>;
}
