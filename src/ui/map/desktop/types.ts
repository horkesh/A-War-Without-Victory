/** Types shared across the desktop IPC integration layer. */

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

export interface StartNewCampaignPayload {
    playerFaction: 'RBiH' | 'RS' | 'HRHB';
    scenarioKey?: string;
}
