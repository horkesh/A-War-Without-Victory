/** Types shared across the desktop IPC integration layer. */

export interface DesktopOkError {
    ok: boolean;
    error?: string;
}

export interface CombatEstimateResult extends DesktopOkError {
    estimate?: unknown;
}

export interface AdvanceTurnResult extends DesktopOkError {
    report?: unknown;
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
    eligible?: boolean;
    reason_codes?: RecruitmentEligibilityReason[];
}

export type RecruitmentEligibilityReason =
    | 'wrong_faction'
    | 'not_yet_available'
    | 'already_recruited'
    | 'no_control'
    | 'no_manpower'
    | 'no_capital'
    | 'no_equipment';

export interface RecruitmentCatalogResult extends DesktopOkError {
    brigades?: RecruitmentCatalogBrigade[];
    /** Turn of the state the catalog was evaluated on. */
    turn?: number;
    /** Autonomy level of that state (0 Full Control … 3 Observer). */
    autonomy_level?: number;
}

export interface ApplyRecruitmentResult extends DesktopOkError {
    newFormationId?: string;
}

export interface StartNewCampaignPayload {
    playerFaction: 'RBiH' | 'RS' | 'HRHB';
    decisionMode: 'emergent' | 'historical';
    scenarioKey?: string;
}

export interface StartNewCampaignResult extends DesktopOkError {
    stateJson?: string;
}

export interface SaveRecord {
    filename: string;
    turn: number;
    faction: StartNewCampaignPayload['playerFaction'] | null;
    modifiedAtMs: number;
}

export interface ListSaveRecordsResult extends DesktopOkError {
    records?: SaveRecord[];
}

export interface LoadSaveRecordResult extends DesktopOkError {
    stateJson?: string;
}

export interface RuntimeFeatureFlags {
    srkStranglePostureActive: boolean;
}

/**
 * PAUSE BEFORE COMBAT (owner decision 2026-11-05): sent by the main process while an
 * advance-turn is in flight. 'paused' — the turn stopped after evaluate-events for the listed
 * decisions fired this turn; 'resumed' — the rest of the turn (movement, combat, ...) is
 * running; `null` — the turn is over.
 */
export type TurnPauseStatus =
    | { status: 'paused'; turn: number; eventIds: string[] }
    | { status: 'resumed'; turn?: number };

export type { GameStateUpdateMetadata } from '../../shared/gameStateUpdateMetadata';
import type { GameStateUpdateMetadata } from '../../shared/gameStateUpdateMetadata';

export interface AwwvBridge {
    stageAttackOrder?(brigadeId: string, targetSettlementId: string): Promise<DesktopOkError>;
    queryCombatEstimate?(brigadeId: string, targetSettlementId: string): Promise<CombatEstimateResult>;
    getCurrentGameState?(): Promise<unknown | null>;
    getRuntimeFeatureFlags?(): Promise<RuntimeFeatureFlags | null>;
    subscribeGameStateUpdated?(callback: (stateJson: unknown, metadata?: GameStateUpdateMetadata) => void): () => void;
    subscribeTurnReportUpdated?(callback: (report: unknown) => void): () => void;
    advanceTurn?(payload?: unknown): Promise<AdvanceTurnResult>;
    startNewCampaign?(payload: StartNewCampaignPayload): Promise<StartNewCampaignResult>;
    stageMoveOrder?(brigadeId: string, targetMunicipalityId: string): Promise<DesktopOkError>;
    getRecruitmentCatalog?(): Promise<RecruitmentCatalogResult | null>;
    applyRecruitment?(brigadeId: string, equipmentClass: string): Promise<ApplyRecruitmentResult>;
}

export interface DesktopBridgeClient {
    isAvailable: boolean;
    stageAttackOrder(brigadeId: string, targetSettlementId: string): Promise<DesktopOkError>;
    queryCombatEstimate(brigadeId: string, targetSettlementId: string): Promise<CombatEstimateResult>;
    getCurrentGameState(): Promise<unknown | null>;
    getRuntimeFeatureFlags(): Promise<RuntimeFeatureFlags | null>;
    subscribeGameStateUpdated(callback: (stateJson: unknown, metadata?: GameStateUpdateMetadata) => void): () => void;
    subscribeTurnReportUpdated(callback: (report: unknown) => void): () => void;
    advanceTurn(payload?: unknown): Promise<AdvanceTurnResult>;
    startNewCampaign(payload: StartNewCampaignPayload): Promise<StartNewCampaignResult>;
    stageMoveOrder(brigadeId: string, targetMunicipalityId: string): Promise<DesktopOkError>;
    getRecruitmentCatalog(): Promise<RecruitmentCatalogResult | null>;
    applyRecruitment(brigadeId: string, equipmentClass: string): Promise<ApplyRecruitmentResult>;
}
