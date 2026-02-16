/**
 * Investment Panel — Phase 0 side panel replacing SettlementInfoPanel
 * when the INVEST layer is active in the War Planning Map.
 *
 * Shows municipality details, organizational penetration factors,
 * available investment types with costs, and INVEST/CANCEL buttons.
 * Wires to Phase0DirectiveState for staging/unstaging investments.
 */

import type { GameState, FactionId, MunicipalityId, OrganizationalPenetration } from '../../../state/game_state.js';
import type { InvestmentType } from '../../../phase0/investment.js';
import {
    getInvestmentTypesForFaction,
    isCoordinationEligibleFaction,
    getInvestmentCostWithCoordination
} from '../../../phase0/investment.js';
import { getPrewarCapital, PREWAR_CAPITAL_INITIAL } from '../../../phase0/capital.js';
import type { Phase0DirectiveState, StagedInvestment } from './Phase0DirectiveState.js';

/** Municipality metadata for the panel. */
export interface InvestmentPanelMunInfo {
    munId: MunicipalityId;
    munName: string;
    controller: string | null;
    stabilityScore: number;
    controlStatus: string;
    orgPen: OrganizationalPenetration;
    majorityEthnicity: string | null;
}

export interface InvestmentPanelProps {
    gameState: GameState | null;
    playerFaction: FactionId;
    selectedMunicipality: InvestmentPanelMunInfo | null;
    directiveState: Phase0DirectiveState;
    onInvest: (munId: MunicipalityId, investmentType: InvestmentType, coordinated?: boolean) => void;
    onUndoInvestment: (id: string) => void;
    onClose: () => void;
}

const FACTION_COLORS: Record<string, string> = {
    RBiH: 'rgb(27, 94, 32)',
    RS: 'rgb(226, 74, 74)',
    HRHB: 'rgb(74, 144, 226)',
};

const INVESTMENT_LABELS: Record<InvestmentType, { icon: string; name: string; desc: string }> = {
    police: { icon: '🛡', name: 'Police Loyalty', desc: 'Secure police cooperation' },
    to: { icon: '⚔', name: 'TO Control', desc: 'Territorial Defense (RBiH only)' },
    party: { icon: '⚑', name: 'Party Penetration', desc: 'SDA / SDS / HDZ org network' },
    paramilitary: { icon: '☠', name: 'Paramilitary', desc: 'Armed formations' },
};

const PARTY_LABELS: Record<FactionId, string> = {
    RBiH: 'SDA',
    RS: 'SDS',
    HRHB: 'HDZ',
};

function escapeHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

function clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
}

export class InvestmentPanel {
    private container: HTMLDivElement;
    private props: InvestmentPanelProps;
    private coordinatedByMun: Map<string, boolean> = new Map();

    constructor(props: InvestmentPanelProps) {
        this.props = props;
        this.container = document.createElement('div');
        this.container.className = 'investment-panel';
        this.container.setAttribute('role', 'region');
        this.container.setAttribute('aria-label', 'Investment panel');
        this.render();
    }

    getElement(): HTMLDivElement {
        return this.container;
    }

    updateProps(props: Partial<InvestmentPanelProps>): void {
        this.props = { ...this.props, ...props };
        this.render();
    }

    private render(): void {
        const { gameState, playerFaction, selectedMunicipality, directiveState, onClose } = this.props;
        this.container.innerHTML = '';

        // Capital header (always shown)
        this.container.appendChild(this.renderCapitalHeader(gameState, playerFaction, directiveState));

        // Staged investments summary
        const staged = directiveState.getStagedInvestments();
        if (staged.length > 0) {
            this.container.appendChild(this.renderStagedSummary(staged));
        }

        if (!selectedMunicipality) {
            // No municipality selected — show instructions
            const instructions = document.createElement('div');
            instructions.className = 'investment-panel-instructions';
            instructions.innerHTML = `
                <div class="investment-panel-instructions-title">INVEST MODE</div>
                <div class="investment-panel-instructions-body">
                    Click a municipality on the map to view its status and invest organizational capital.
                </div>
            `;
            this.container.appendChild(instructions);
            return;
        }

        const mun = selectedMunicipality;

        // Municipality header
        const header = document.createElement('div');
        header.className = 'investment-panel-mun-header';

        const headerRow = document.createElement('div');
        headerRow.className = 'investment-panel-header-row';

        const title = document.createElement('div');
        title.className = 'investment-panel-mun-title';
        title.textContent = mun.munName;
        headerRow.appendChild(title);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'investment-panel-close';
        closeBtn.type = 'button';
        closeBtn.textContent = '\u00d7';
        closeBtn.setAttribute('aria-label', 'Close panel');
        closeBtn.addEventListener('click', onClose);
        headerRow.appendChild(closeBtn);

        header.appendChild(headerRow);

        // Controller + stability
        const controllerColor = FACTION_COLORS[mun.controller ?? ''] ?? 'rgb(100,100,100)';
        const metaRow = document.createElement('div');
        metaRow.className = 'investment-panel-meta';
        metaRow.innerHTML = `
            <span class="investment-panel-controller-swatch" style="background:${controllerColor}"></span>
            <span>${escapeHtml(mun.controller ?? 'Neutral')}</span>
            <span class="investment-panel-meta-sep">\u2022</span>
            <span>Stability: ${mun.stabilityScore}</span>
            <span class="investment-panel-meta-sep">\u2022</span>
            <span>${escapeHtml(mun.controlStatus)}</span>
        `;
        header.appendChild(metaRow);

        if (mun.majorityEthnicity) {
            const ethRow = document.createElement('div');
            ethRow.className = 'investment-panel-ethnicity-note';
            ethRow.textContent = `Majority: ${mun.majorityEthnicity}`;
            header.appendChild(ethRow);
        }

        this.container.appendChild(header);

        // Organizational factors
        this.container.appendChild(this.renderOrgFactors(mun.orgPen, playerFaction));

        if (isCoordinationEligibleFaction(playerFaction)) {
            this.container.appendChild(this.renderCoordinationToggle(mun.munId));
        }

        // Investment options
        this.container.appendChild(this.renderInvestmentOptions(mun, gameState, playerFaction, directiveState));
    }

    private renderCapitalHeader(state: GameState | null, faction: FactionId, directive: Phase0DirectiveState): HTMLElement {
        const el = document.createElement('div');
        el.className = 'investment-panel-capital';

        const current = state ? getPrewarCapital(state, faction) : 0;
        const initial = PREWAR_CAPITAL_INITIAL[faction] ?? 0;
        const stagedCost = directive.getTotalStagedCost();
        const available = current - stagedCost;
        const pct = initial > 0 ? (available / initial) * 100 : 0;

        const barColor = pct > 50 ? '#2d6a4f' : pct > 25 ? '#d4a017' : '#c0392b';

        el.innerHTML = `
            <div class="investment-panel-capital-label">CAPITAL</div>
            <div class="investment-panel-capital-bar-container">
                <div class="investment-panel-capital-bar" style="width:${clamp(pct, 0, 100)}%;background:${barColor}"></div>
            </div>
            <div class="investment-panel-capital-text">${available} / ${initial}${stagedCost > 0 ? ` <span class="investment-panel-staged-cost">(${stagedCost} staged)</span>` : ''}</div>
        `;
        return el;
    }

    private renderStagedSummary(staged: readonly StagedInvestment[]): HTMLElement {
        const el = document.createElement('div');
        el.className = 'investment-panel-staged';

        const titleRow = document.createElement('div');
        titleRow.className = 'investment-panel-section-header';
        titleRow.textContent = `STAGED (${staged.length})`;
        el.appendChild(titleRow);

        const list = document.createElement('div');
        list.className = 'investment-panel-staged-list';

        for (const inv of staged) {
            const row = document.createElement('div');
            row.className = 'investment-panel-staged-row';

            const label = INVESTMENT_LABELS[inv.investmentType];
            const munNames = inv.targetMunIds.join(', ');
            const coordination = inv.coordinated ? ' [COORD]' : '';

            const text = document.createElement('span');
            text.className = 'investment-panel-staged-text';
            text.textContent = `${label.icon} ${label.name}${coordination} \u2192 ${munNames} (${inv.cost})`;
            row.appendChild(text);

            const undoBtn = document.createElement('button');
            undoBtn.className = 'investment-panel-undo-btn';
            undoBtn.type = 'button';
            undoBtn.textContent = '\u2716';
            undoBtn.title = 'Undo this investment';
            undoBtn.addEventListener('click', () => this.props.onUndoInvestment(inv.id));
            row.appendChild(undoBtn);

            list.appendChild(row);
        }

        el.appendChild(list);
        return el;
    }

    private getCoordinationSelection(munId: MunicipalityId): boolean {
        const key = String(munId);
        if (!this.coordinatedByMun.has(key)) {
            this.coordinatedByMun.set(key, true);
        }
        return this.coordinatedByMun.get(key) === true;
    }

    private setCoordinationSelection(munId: MunicipalityId, coordinated: boolean): void {
        this.coordinatedByMun.set(String(munId), coordinated);
    }

    private renderCoordinationToggle(munId: MunicipalityId): HTMLElement {
        const el = document.createElement('div');
        el.className = 'investment-panel-coordination';
        const checked = this.getCoordinationSelection(munId);
        el.innerHTML = `
            <label class="investment-panel-coordination-label">
                <input type="checkbox" class="investment-panel-coordination-checkbox" ${checked ? 'checked' : ''}>
                Coordinate with ally <span class="investment-panel-coordination-note">(-20% cost, alliance-safe)</span>
            </label>
        `;
        const checkbox = el.querySelector('.investment-panel-coordination-checkbox') as HTMLInputElement | null;
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                this.setCoordinationSelection(munId, checkbox.checked);
                this.render();
            });
        }
        return el;
    }

    private renderOrgFactors(op: OrganizationalPenetration, faction: FactionId): HTMLElement {
        const el = document.createElement('div');
        el.className = 'investment-panel-org';

        const title = document.createElement('div');
        title.className = 'investment-panel-section-header';
        title.textContent = 'ORGANIZATIONAL FACTORS';
        el.appendChild(title);

        const factors: Array<{ label: string; value: string; pct?: number }> = [];

        // Police loyalty
        const policeValue = op.police_loyalty ?? 'mixed';
        factors.push({
            label: 'Police Loyalty',
            value: policeValue === 'loyal' ? 'LOYAL' : policeValue === 'hostile' ? 'HOSTILE' : 'MIXED',
            pct: policeValue === 'loyal' ? 100 : policeValue === 'hostile' ? 0 : 50
        });

        // TO control (RBiH perspective)
        const toValue = op.to_control ?? 'contested';
        factors.push({
            label: 'TO Control',
            value: toValue === 'controlled' ? 'CONTROLLED' : toValue === 'lost' ? 'LOST' : 'CONTESTED',
            pct: toValue === 'controlled' ? 100 : toValue === 'lost' ? 0 : 50
        });

        // Party penetration (faction-specific)
        const partyLabel = PARTY_LABELS[faction] ?? 'Party';
        let partyValue = 0;
        if (faction === 'RS') partyValue = op.sds_penetration ?? 0;
        else if (faction === 'RBiH') partyValue = op.sda_penetration ?? 0;
        else if (faction === 'HRHB') partyValue = op.hdz_penetration ?? 0;
        factors.push({ label: `${partyLabel} Penetration`, value: `${partyValue}%`, pct: partyValue });

        // Paramilitary
        let paramValue = 0;
        let paramLabel = 'Paramilitary';
        if (faction === 'RBiH') { paramValue = op.patriotska_liga ?? 0; paramLabel = 'Patriotska Liga'; }
        else if (faction === 'RS') { paramValue = op.paramilitary_rs ?? 0; paramLabel = 'RS Paramilitary'; }
        else if (faction === 'HRHB') { paramValue = op.paramilitary_hrhb ?? 0; paramLabel = 'HRHB Paramilitary'; }
        factors.push({ label: paramLabel, value: `${paramValue}%`, pct: paramValue });

        // Render factors
        const grid = document.createElement('div');
        grid.className = 'investment-panel-org-grid';

        for (const f of factors) {
            const row = document.createElement('div');
            row.className = 'investment-panel-org-row';
            row.innerHTML = `
                <div class="investment-panel-org-label">${escapeHtml(f.label)}</div>
                <div class="investment-panel-org-bar-container">
                    <div class="investment-panel-org-bar" style="width:${clamp(f.pct ?? 0, 0, 100)}%"></div>
                </div>
                <div class="investment-panel-org-value">${escapeHtml(f.value)}</div>
            `;
            grid.appendChild(row);
        }

        el.appendChild(grid);
        return el;
    }

    private renderInvestmentOptions(
        mun: InvestmentPanelMunInfo,
        state: GameState | null,
        faction: FactionId,
        directive: Phase0DirectiveState
    ): HTMLElement {
        const el = document.createElement('div');
        el.className = 'investment-panel-options';

        const title = document.createElement('div');
        title.className = 'investment-panel-section-header';
        title.textContent = 'AVAILABLE INVESTMENTS';
        el.appendChild(title);

        const investTypes = getInvestmentTypesForFaction(faction);

        const coordinated = isCoordinationEligibleFaction(faction) ? this.getCoordinationSelection(mun.munId) : false;

        for (const investType of investTypes) {
            const label = INVESTMENT_LABELS[investType];
            const cost = getInvestmentCostWithCoordination(
                investType,
                { kind: 'municipality', mun_ids: [mun.munId] },
                coordinated
            );
            // Check if investment is valid
            let canInvest = true;
            let reason = '';

            if (state) {
                const validation = directive.validate(state, faction, investType, [mun.munId], { coordinated });
                if (!validation.valid) {
                    canInvest = false;
                    reason = validation.reason ?? 'Cannot invest';
                }
            } else {
                canInvest = false;
                reason = 'No state';
            }

            const row = document.createElement('div');
            row.className = `investment-panel-option ${canInvest ? '' : 'disabled'}`;

            const info = document.createElement('div');
            info.className = 'investment-panel-option-info';
            info.innerHTML = `
                <span class="investment-panel-option-icon">${label.icon}</span>
                <div class="investment-panel-option-text">
                    <div class="investment-panel-option-name">${escapeHtml(label.name)}</div>
                    <div class="investment-panel-option-desc">${escapeHtml(label.desc)}</div>
                </div>
                <div class="investment-panel-option-cost">${cost}</div>
            `;
            row.appendChild(info);

            if (canInvest) {
                const investBtn = document.createElement('button');
                investBtn.className = 'investment-panel-invest-btn';
                investBtn.type = 'button';
                investBtn.textContent = 'INVEST';
                investBtn.addEventListener('click', () => {
                    this.props.onInvest(mun.munId, investType, coordinated);
                });
                row.appendChild(investBtn);
            } else if (reason) {
                const reasonEl = document.createElement('div');
                reasonEl.className = 'investment-panel-option-reason';
                reasonEl.textContent = reason;
                row.appendChild(reasonEl);
            }

            el.appendChild(row);
        }

        return el;
    }
}
