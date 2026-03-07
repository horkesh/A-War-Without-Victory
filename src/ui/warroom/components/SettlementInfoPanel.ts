/**
 * Settlement Info Panel — right-side sliding panel for War Planning Map.
 * Shows SETTLEMENT, MUNICIPALITY, CONTROL, DEMOGRAPHICS; placeholders for MILITARY, STABILITY, ORDERS.
 * Per WAR_PLANNING_MAP_EXPERT_PROPOSAL §1.
 */

import type { GameState } from '../../../state/game_state.js';

type GeoFeature = {
    properties?: {
        sid?: string;
        municipality_id?: number;
        nato_class?: string;
        population_total?: number;
        population_bosniaks?: number;
        population_serbs?: number;
        population_croats?: number;
        municipal_seat?: boolean;
        strategic?: boolean;
        transit_hub?: boolean;
        junction?: boolean;
        terrain?: string;
        zone_type?: string;
        [key: string]: any;
    };
    geometry: unknown;
};

type PoliticalControlData = {
    by_settlement_id?: Record<string, string | null>;
    control_status_by_settlement_id?: Record<string, string>;
};

type SettlementNamesData = {
    by_census_id?: Record<string, { name: string; mun_code: string }>;
};

type Mun1990NamesData = {
    by_municipality_id?: Record<string, { display_name: string; mun1990_id: string }>;
};

type EthnicityEntry = {
    majority?: string;
    composition?: Record<string, number>;
    provenance?: string;
};

type SettlementEthnicityData = {
    by_settlement_id?: Record<string, EthnicityEntry>;
};

const SIDE_COLORS: Record<string, string> = {
    RBiH: 'rgb(27, 94, 32)',
    RS: 'rgb(226, 74, 74)',
    HRHB: 'rgb(74, 144, 226)',
    null: 'rgb(100, 100, 100)'
};

const SIDE_LABELS: Record<string, string> = {
    RBiH: 'RBiH (Green)',
    RS: 'RS (Crimson)',
    HRHB: 'HRHB (Blue)',
    null: 'Neutral'
};

export interface SettlementInfoPanelProps {
    selectedSettlement: GeoFeature | null;
    controlData: PoliticalControlData;
    gameState: GameState | null;
    polygons: Map<string, GeoFeature>;
    settlementNames: SettlementNamesData | null;
    mun1990Names: Mun1990NamesData | null;
    ethnicityData: SettlementEthnicityData | null;
    settlementToMidMap: Map<string, string> | null;
    municipalitiesMap: Map<string, string> | null;
    onClose: () => void;
}

function getMasterSid(feature: GeoFeature, midMap: Map<string, string> | null): string | null {
    const sid = feature.properties?.sid;
    let munId = feature.properties?.municipality_id;

    // Fallback if munId is missing in feature properties
    if (sid && (munId == null || typeof munId !== 'number')) {
        const mappedMid = midMap?.get(sid);
        if (mappedMid) munId = parseInt(mappedMid, 10);
    }

    if (!sid) return null;
    if (munId != null && !isNaN(munId)) {
        const sourceId = sid.startsWith('S') ? sid.slice(1) : sid;
        return `${munId}:${sourceId}`;
    }
    return sid;
}

function getCensusId(sid: string): string {
    return sid.startsWith('S') ? sid.slice(1) : sid;
}

type TabId = 'overview' | 'admin' | 'control' | 'intel';

export class SettlementInfoPanel {
    private container: HTMLDivElement;
    private props: SettlementInfoPanelProps;
    private activeTab: TabId = 'overview';

    constructor(props: SettlementInfoPanelProps) {
        this.props = props;
        this.container = document.createElement('div');
        this.container.className = 'settlement-info-panel';
        this.container.setAttribute('role', 'region');
        this.container.setAttribute('aria-label', 'Settlement details');
        this.render();
    }

    getElement(): HTMLDivElement {
        return this.container;
    }

    updateProps(props: Partial<SettlementInfoPanelProps>): void {
        this.props = { ...this.props, ...props };
        this.render();
    }

    private setActiveTab(tab: TabId): void {
        this.activeTab = tab;
        this.render();
    }

    private resolveData(): any {
        const { selectedSettlement, controlData, settlementNames, mun1990Names, ethnicityData, settlementToMidMap, municipalitiesMap } = this.props;
        if (!selectedSettlement) return null;

        const sid = selectedSettlement.properties?.sid ?? '';
        let munId = selectedSettlement.properties?.municipality_id;

        if ((munId == null || typeof munId !== 'number') && settlementToMidMap) {
            const mapped = settlementToMidMap.get(sid);
            if (mapped) munId = parseInt(mapped, 10);
        }

        const masterSid = getMasterSid(selectedSettlement, settlementToMidMap);
        const censusId = getCensusId(sid);

        const controller = masterSid ? (controlData.by_settlement_id?.[masterSid] ?? 'null') : 'null';
        const controlStatus = masterSid ? (controlData.control_status_by_settlement_id?.[masterSid] ?? 'CONSOLIDATED') : 'CONSOLIDATED';
        const factionColor = SIDE_COLORS[controller] ?? SIDE_COLORS['null'];
        const factionLabel = SIDE_LABELS[controller] ?? 'Neutral';

        const settlementName = settlementNames?.by_census_id?.[censusId]?.name ?? sid;

        let munName = '—';
        let mun1990Id = '—';
        if (munId != null) {
            const midStr = String(munId);
            mun1990Id = midStr;
            if (municipalitiesMap?.has(midStr)) {
                munName = municipalitiesMap.get(midStr)!;
            } else if (mun1990Names?.by_municipality_id?.[midStr]) {
                munName = mun1990Names.by_municipality_id[midStr].display_name;
            } else {
                munName = `Municipality ${munId}`;
            }
        }

        const popValue = selectedSettlement.properties?.population_total ||
            (selectedSettlement.properties?.population_bosniaks || 0) +
            (selectedSettlement.properties?.population_serbs || 0) +
            (selectedSettlement.properties?.population_croats || 0);

        return {
            sid,
            munId,
            masterSid,
            censusId,
            controller,
            controlStatus,
            factionColor,
            factionLabel,
            settlementName,
            munName,
            mun1990Id,
            popValue,
            isStrategic: selectedSettlement.properties?.municipal_seat || selectedSettlement.properties?.strategic || popValue > 5000,
            isHub: selectedSettlement.properties?.transit_hub || selectedSettlement.properties?.junction,
            natoClass: selectedSettlement.properties?.nato_class,
            terrain: selectedSettlement.properties?.terrain || selectedSettlement.properties?.zone_type,
            ethnicity: sid ? (ethnicityData?.by_settlement_id?.[sid] ?? null) : null
        };
    }

    private renderHeader(data: any): void {
        const { onClose } = this.props;
        const headerRow = document.createElement('div');
        headerRow.className = 'settlement-info-header-row';

        const titleGroup = document.createElement('div');
        titleGroup.style.display = 'flex';
        titleGroup.style.flexDirection = 'column';

        const tagsRow = document.createElement('div');
        tagsRow.className = 'settlement-info-tags';
        tagsRow.style.display = 'flex';
        tagsRow.style.gap = '4px';
        tagsRow.style.marginBottom = '4px';

        if (data.isStrategic) {
            const tag = document.createElement('span');
            tag.className = 'settlement-tag strategic';
            tag.textContent = 'Strategic Center';
            tagsRow.appendChild(tag);
        }
        if (data.isHub) {
            const tag = document.createElement('span');
            tag.className = 'settlement-tag hub';
            tag.textContent = 'Transit Hub';
            tagsRow.appendChild(tag);
        }
        titleGroup.appendChild(tagsRow);

        const title = document.createElement('div');
        title.className = 'settlement-info-title';
        title.textContent = data.settlementName;
        titleGroup.appendChild(title);

        headerRow.appendChild(titleGroup);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'settlement-info-panel-close';
        closeBtn.type = 'button';
        closeBtn.textContent = '×';
        closeBtn.setAttribute('aria-label', 'Close panel');
        closeBtn.addEventListener('click', onClose);
        headerRow.appendChild(closeBtn);

        this.container.appendChild(headerRow);
    }

    private renderTabs(): void {
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'settlement-info-tabs';

        const tabs: { id: TabId; label: string }[] = [
            { id: 'overview', label: 'Over' },
            { id: 'admin', label: 'Admin' },
            { id: 'control', label: 'Ctrl' },
            { id: 'intel', label: 'Intel' }
        ];

        tabs.forEach(tab => {
            const btn = document.createElement('button');
            btn.className = `settlement-info-tab ${this.activeTab === tab.id ? 'active' : ''}`;
            btn.textContent = tab.label;
            btn.onclick = () => this.setActiveTab(tab.id);
            tabsContainer.appendChild(btn);
        });

        this.container.appendChild(tabsContainer);
    }

    private renderContent(data: any): void {
        const contentArea = document.createElement('div');
        contentArea.className = 'settlement-info-content';

        switch (this.activeTab) {
            case 'overview':
                this.renderOverviewTab(contentArea, data);
                break;
            case 'admin':
                this.renderAdminTab(contentArea, data);
                break;
            case 'control':
                this.renderControlTab(contentArea, data);
                break;
            case 'intel':
                this.renderIntelTab(contentArea, data);
                break;
        }

        this.container.appendChild(contentArea);
    }

    private renderOverviewTab(container: HTMLElement, data: any): void {
        container.innerHTML = `
            <div class="settlement-info-section">
                <div class="settlement-info-section-header">Operational Summary</div>
                <div class="settlement-info-section-body">
                     <div class="settlement-info-field-row">
                        <span class="label">Municipality</span>
                        <span class="value">${escapeHtml(data.munName)}</span>
                     </div>
                     <div class="settlement-info-field-row">
                        <span class="label">Controller</span>
                        <span class="value" style="color:${data.factionColor}; font-weight:bold;">${escapeHtml(data.factionLabel)}</span>
                     </div>
                     ${data.terrain ? `
                     <div class="settlement-info-field-row">
                        <span class="label">Terrain</span>
                        <span class="value">${escapeHtml(String(data.terrain))}</span>
                     </div>` : ''}
                </div>
            </div>
            <div class="settlement-info-section">
                <div class="settlement-info-section-header">Demographics & Population</div>
                <div class="settlement-info-section-body">
                    <div class="settlement-info-field-row" style="margin-bottom: 8px;">
                        <span class="label">Total (1991)</span>
                        <span class="value font-mono">${data.popValue.toLocaleString()}</span>
                    </div>
                    ${data.ethnicity ? this.renderEthnicity(data.ethnicity) : '<div class="settlement-info-field">No census record available</div>'}
                </div>
            </div>
        `;
    }

    private renderAdminTab(container: HTMLElement, data: any): void {
        container.innerHTML = `
            <div class="settlement-info-section">
                <div class="settlement-info-section-header">Administrative Status</div>
                <div class="settlement-info-section-body">
                    <div class="settlement-info-field-row">
                        <span class="label">Seat Classification</span>
                        <span class="value">${this.props.selectedSettlement?.properties?.municipal_seat ? 'MUNICIPAL SEAT' : 'SUBORDINATE'}</span>
                    </div>
                    <div class="settlement-info-field-row">
                        <span class="label">Settlement ID</span>
                        <span class="value font-mono">${escapeHtml(data.sid)}</span>
                    </div>
                    <div class="settlement-info-field-row">
                        <span class="label">Municipality ID</span>
                        <span class="value font-mono">${escapeHtml(data.mun1990Id)}</span>
                    </div>
                </div>
            </div>
            <div class="settlement-info-section">
                <div class="settlement-info-section-header">Infrastructure</div>
                <div class="settlement-info-section-body">
                     <div class="settlement-info-field-row">
                        <span class="label">Urban Center</span>
                        <span class="value">${data.natoClass === 'TOWN' || data.natoClass === 'CITY' ? 'YES' : 'NO'}</span>
                     </div>
                     <div class="settlement-info-field-row">
                        <span class="label">Strategic Hub</span>
                        <span class="value">${data.isHub ? 'YES' : 'NO'}</span>
                     </div>
                </div>
            </div>
        `;
    }

    private renderControlTab(container: HTMLElement, data: any): void {
        container.innerHTML = `
            <div class="settlement-info-section">
                <div class="settlement-info-section-header">Political Control</div>
                <div class="settlement-info-section-body">
                    <div class="settlement-info-field-row">
                        <span class="label">Active Authority</span>
                        <span class="value" style="color:${data.factionColor}; font-weight:bold;">${escapeHtml(data.factionLabel)}</span>
                    </div>
                    <div class="settlement-info-field-row">
                        <span class="label">Consolidation</span>
                        <span class="value">${escapeHtml(data.controlStatus)}</span>
                    </div>
                </div>
            </div>
            <div class="settlement-info-section">
                <div class="settlement-info-section-header">Recent Timeline [PHASE II]</div>
                <div class="settlement-info-section-body">
                    <div class="settlement-info-placeholder italic text-muted">No recent authority changes recorded.</div>
                </div>
            </div>
        `;
    }

    private renderIntelTab(container: HTMLElement, data: any): void {
        container.innerHTML = `
            <div class="settlement-info-section">
                <div class="settlement-info-section-header">Garrison Intel [PHASE II]</div>
                <div class="settlement-info-section-body">
                    <div class="settlement-info-placeholder">No active units reported in immediate vicinity.</div>
                </div>
            </div>
            <div class="settlement-info-section">
                <div class="settlement-info-section-header">Local Directives</div>
                <div class="settlement-info-section-body">
                    <button class="settlement-info-order-btn" type="button" disabled title="Available in Phase II">Modify Garrison</button>
                </div>
            </div>
        `;
    }

    private render(): void {
        const data = this.resolveData();
        this.container.innerHTML = '';
        if (!data) return;

        this.container.style.borderLeftColor = data.factionColor;
        if (this.activeTab === 'overview') {
            this.container.classList.add('weathered-panel');
        } else {
            this.container.classList.remove('weathered-panel');
        }

        this.renderHeader(data);
        this.renderTabs();
        this.renderContent(data);
    }

    private renderEthnicity(ethnicity: EthnicityEntry): string {
        const composition = ethnicity.composition ?? {};
        const entries = ['bosniak', 'serb', 'croat', 'other']
            .filter((k) => (composition[k] ?? 0) > 0.02) // Only show if >2%
            .map((k) => {
                const val = composition[k] ?? 0;
                const pct = (val * 100).toFixed(0);
                const label = k.charAt(0).toUpperCase() + k.slice(1);
                return `
                    <div class="settlement-info-field-row demographic">
                        <span class="label">${label}</span>
                        <div class="demographic-bar-container">
                            <div class="demographic-bar" style="width: ${pct}%"></div>
                        </div>
                        <span class="value font-mono">${pct}%</span>
                    </div>
                `;
            })
            .join('');

        return `
            <div class="settlement-info-ethnicity-list">
                ${entries}
            </div>
            <div class="settlement-info-provenance">Source: ${escapeHtml(ethnicity.provenance || '1991 Census')}</div>
        `;
    }
}

function escapeHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}
