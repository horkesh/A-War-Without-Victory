/**
 * Settlement Info Panel — right-side sliding panel for War Planning Map.
 * Shows SETTLEMENT, MUNICIPALITY, CONTROL, DEMOGRAPHICS; placeholders for MILITARY, STABILITY, ORDERS.
 * Per WAR_PLANNING_MAP_EXPERT_PROPOSAL §1.
 */

import type { GameState } from '../../../state/game_state.js';

type GeoFeature = {
    properties?: { sid?: string; municipality_id?: number; nato_class?: string };
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

    private render(): void {
        const { selectedSettlement, controlData, polygons, settlementNames, mun1990Names, ethnicityData, settlementToMidMap, municipalitiesMap, onClose } = this.props;
        this.container.innerHTML = '';

        if (!selectedSettlement) {
            return;
        }

        const sid = selectedSettlement.properties?.sid ?? '';
        let munId = selectedSettlement.properties?.municipality_id;

        // Resolve munId if missing
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

        // Resolve Municipality Name
        let munName = '—';
        let mun1990Id = '—';

        if (munId != null) {
            const midStr = String(munId);
            mun1990Id = midStr;
            // Try explicit map first, then 1990 names
            if (municipalitiesMap?.has(midStr)) {
                munName = municipalitiesMap.get(midStr)!;
            } else if (mun1990Names?.by_municipality_id?.[midStr]) {
                munName = mun1990Names.by_municipality_id[midStr].display_name;
            } else {
                munName = `Municipality ${munId}`;
            }
        }

        const ethnicity = sid ? (ethnicityData?.by_settlement_id?.[sid] ?? null) : null;

        this.container.style.borderLeftColor = factionColor;

        // Header with Close Button
        const headerRow = document.createElement('div');
        headerRow.className = 'settlement-info-header-row';

        const title = document.createElement('div');
        title.className = 'settlement-info-title';
        title.textContent = settlementName;
        headerRow.appendChild(title);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'settlement-info-panel-close';
        closeBtn.type = 'button';
        closeBtn.textContent = '×';
        closeBtn.setAttribute('aria-label', 'Close panel');
        closeBtn.addEventListener('click', onClose);
        headerRow.appendChild(closeBtn);

        this.container.appendChild(headerRow);

        // Tabs
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

        // Content Area
        const contentArea = document.createElement('div');
        contentArea.className = 'settlement-info-content';

        if (this.activeTab === 'overview') {
            contentArea.innerHTML = `
                <div class="settlement-info-section">
                    <div class="settlement-info-section-header">Summary</div>
                    <div class="settlement-info-section-body">
                        <div class="settlement-info-field">SID: ${escapeHtml(sid)}</div>
                         <div class="settlement-info-field">Municipality: ${escapeHtml(munName)}</div>
                         <div class="settlement-info-field">Controller: ${escapeHtml(factionLabel)}</div>
                    </div>
                </div>
                <div class="settlement-info-section">
                    <div class="settlement-info-section-header">Demographics</div>
                    <div class="settlement-info-section-body">
                        ${ethnicity ? this.renderEthnicity(ethnicity) : '<div class="settlement-info-field">No data</div>'}
                    </div>
                </div>
            `;
        } else if (this.activeTab === 'admin') {
            let munSettlementCount = 0;
            if (munId != null) {
                for (const f of polygons.values()) {
                    // Check logic for count - complicated if we don't have munId in properties
                    // We can accept 0 or approximate if data is missing, or use metadata map if we had full list
                    if (f.properties?.municipality_id === munId) munSettlementCount++;
                    else if (settlementToMidMap && f.properties?.sid && settlementToMidMap.get(f.properties.sid) === String(munId)) munSettlementCount++;
                }
            }

            contentArea.innerHTML = `
                <div class="settlement-info-section">
                    <div class="settlement-info-section-header">Municipality Details</div>
                    <div class="settlement-info-section-body">
                        <div class="settlement-info-field">Name: ${escapeHtml(munName)}</div>
                        <div class="settlement-info-field">ID: ${escapeHtml(mun1990Id)}</div>
                        <div class="settlement-info-field">Total Settlements: ${munSettlementCount} (visible)</div>
                    </div>
                </div>
                <div class="settlement-info-section">
                    <div class="settlement-info-section-header">Designation</div>
                    <div class="settlement-info-section-body">
                         <div class="settlement-info-field">Urban Center: ${selectedSettlement.properties?.nato_class === 'TOWN' ? 'Yes' : 'No'}</div>
                    </div>
                </div>
            `;
        } else if (this.activeTab === 'control') {
            contentArea.innerHTML = `
                <div class="settlement-info-section">
                    <div class="settlement-info-section-header">Political Status</div>
                    <div class="settlement-info-section-body">
                        <div class="settlement-info-field">
                            <span class="settlement-info-swatch" style="background:${factionColor}" title="${escapeHtml(factionLabel)}" aria-hidden="true"></span>
                            ${escapeHtml(factionLabel)}
                        </div>
                        <div class="settlement-info-field">State: ${escapeHtml(controlStatus)}</div>
                    </div>
                </div>
            `;
        } else if (this.activeTab === 'intel') {
            contentArea.innerHTML = `
                <div class="settlement-info-section">
                    <div class="settlement-info-section-header">Military Intel [PHASE II]</div>
                    <div class="settlement-info-section-body">
                        <div class="settlement-info-placeholder">No active units reported.</div>
                    </div>
                </div>
                <div class="settlement-info-section">
                    <div class="settlement-info-section-header">Orders</div>
                    <div class="settlement-info-section-body">
                        <button class="settlement-info-order-btn" type="button" disabled title="Available in Phase II">Issue Order</button>
                    </div>
                </div>
            `;
        }

        this.container.appendChild(contentArea);
        this.container.setAttribute('aria-live', 'polite');
    }

    private renderEthnicity(ethnicity: EthnicityEntry): string {
        return `
            <div class="settlement-info-ethnicity">
                ${['bosniak', 'serb', 'croat', 'other']
                .filter((k) => ((ethnicity.composition ?? {})[k] ?? 0) > 0)
                .map((k) => {
                    const pct = (((ethnicity.composition ?? {})[k] ?? 0) * 100).toFixed(1);
                    const label = k.charAt(0).toUpperCase() + k.slice(1);
                    return `<div class="settlement-info-field">${label}: ${pct}%</div>`;
                })
                .join('')}
            </div>
            <div class="settlement-info-field settlement-info-provenance">Src: ${escapeHtml(ethnicity.provenance ?? '—')}</div>
        `;
    }
}

function escapeHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}
