/**
 * MagazineModal — Monthly operational review with real Phase 0 statistics.
 * Triggers every 4 turns (monthly). Between issues: shows most recent.
 *
 * Now uses real game state data for organizational coverage, capital, stability,
 * and declaration pressure.
 */

import type { GameState, FactionId } from '../../../state/game_state.js';
import { getPrewarCapital, PREWAR_CAPITAL_INITIAL } from '../../../phase0/capital.js';
import { strictCompare } from '../../../state/validateGameState.js';
import { turnToMonthYear, getPlayerFaction, hasFactionPresence, FACTION_COLORS, factionCssClass, STABILITY_SECURE_MIN, STABILITY_CONTESTED_MIN } from './warroom_utils.js';

interface MagazineContent {
    factionId: string;
    title: string;
    monthYear: string;
    orgCoverage: number;
    capitalRemaining: number;
    capitalInitial: number;
    capitalPercent: number;
    investmentCount: number;
    avgStability: number;
    secureCount: number;
    contestedCount: number;
    highlyContestedCount: number;
    rsPressure: number;
    hrhbPressure: number;
    isNewIssue: boolean;
}

const MAGAZINE_TITLES: Record<string, string> = {
    RBiH: 'BOSNIAN DEFENCE REVIEW',
    RS: 'SERBIAN STRATEGIC DIGEST',
    HRHB: 'CROATIAN DEFENCE MONTHLY',
};

export class MagazineModal {
    private gameState: GameState;

    constructor(gameState: GameState) {
        this.gameState = gameState;
    }


    /**
     * Count municipalities where this faction has any organizational investment.
     */
    private countInvestedMunicipalities(factionId: FactionId): number {
        if (!this.gameState.municipalities) return 0;
        const munIds = Object.keys(this.gameState.municipalities).sort(strictCompare);
        let count = 0;

        for (const munId of munIds) {
            const op = this.gameState.municipalities[munId]?.organizational_penetration;
            if (!op) continue;
            const isControlled = this.gameState.political_controllers?.[munId] === factionId;
            if (hasFactionPresence(op, factionId, isControlled)) count++;
        }
        return count;
    }

    /**
     * Count municipalities where this faction is political controller.
     */
    private countControlledMunicipalities(factionId: FactionId): number {
        if (!this.gameState.political_controllers) return 1;
        let count = 0;
        for (const controller of Object.values(this.gameState.political_controllers)) {
            if (controller === factionId) count++;
        }
        return Math.max(count, 1); // Avoid division by zero
    }

    /**
     * Compute average stability in controlled municipalities.
     */
    private computeAvgStability(factionId: FactionId): number {
        if (!this.gameState.municipalities) return 50;
        const munIds = Object.keys(this.gameState.municipalities).sort(strictCompare);
        let total = 0;
        let count = 0;

        for (const munId of munIds) {
            const controller = this.gameState.political_controllers?.[munId];
            if (controller !== factionId) continue;
            const stability = this.gameState.municipalities[munId]?.stability_score ?? 50;
            total += stability;
            count++;
        }
        return count > 0 ? Math.round(total / count) : 50;
    }

    /**
     * Count municipalities by control status for this faction.
     */
    private countByControlStatus(factionId: FactionId): { secure: number; contested: number; highlyContested: number } {
        if (!this.gameState.municipalities) return { secure: 0, contested: 0, highlyContested: 0 };
        const munIds = Object.keys(this.gameState.municipalities).sort(strictCompare);
        let secure = 0;
        let contested = 0;
        let highlyContested = 0;

        for (const munId of munIds) {
            const controller = this.gameState.political_controllers?.[munId];
            if (controller !== factionId) continue;
            const stability = this.gameState.municipalities[munId]?.stability_score ?? 50;
            if (stability >= STABILITY_SECURE_MIN) secure++;
            else if (stability >= STABILITY_CONTESTED_MIN) contested++;
            else highlyContested++;
        }
        return { secure, contested, highlyContested };
    }

    /**
     * Generate magazine content from real game data.
     */
    private generateContent(): MagazineContent {
        const turn = this.gameState.meta.turn;
        const factionId = getPlayerFaction(this.gameState);
        const isNewIssue = turn % 4 === 0 || turn === 0;

        const invested = this.countInvestedMunicipalities(factionId);
        const controlled = this.countControlledMunicipalities(factionId);
        const orgCoverage = Math.round((invested / controlled) * 100);

        const capitalRemaining = getPrewarCapital(this.gameState, factionId);
        const capitalInitial = PREWAR_CAPITAL_INITIAL[factionId] ?? 70;
        const capitalPercent = Math.round((capitalRemaining / capitalInitial) * 100);

        const avgStability = this.computeAvgStability(factionId);
        const controlStatus = this.countByControlStatus(factionId);

        // Declaration pressure
        let rsPressure = 0;
        let hrhbPressure = 0;
        for (const f of this.gameState.factions) {
            if (f.id === 'RS') rsPressure = f.declaration_pressure ?? 0;
            if (f.id === 'HRHB') hrhbPressure = f.declaration_pressure ?? 0;
        }

        return {
            factionId,
            title: MAGAZINE_TITLES[factionId] ?? 'OPERATIONAL REVIEW',
            monthYear: turnToMonthYear(turn),
            orgCoverage,
            capitalRemaining,
            capitalInitial,
            capitalPercent,
            investmentCount: invested,
            avgStability,
            secureCount: controlStatus.secure,
            contestedCount: controlStatus.contested,
            highlyContestedCount: controlStatus.highlyContested,
            rsPressure,
            hrhbPressure,
            isNewIssue,
        };
    }

    /**
     * Create a progress bar element.
     */
    private createProgressBar(value: number, max: number, color: string): HTMLElement {
        const bar = document.createElement('div');
        bar.className = 'wr-bar-track';
        const fill = document.createElement('div');
        fill.className = 'wr-bar-fill';
        const pct = Math.min(100, Math.round((value / max) * 100));
        fill.style.width = `${pct}%`;
        fill.style.background = color;
        bar.appendChild(fill);
        return bar;
    }

    /**
     * Render the magazine modal as HTML element
     */
    render(): HTMLElement {
        const content = this.generateContent();

        const magazine = document.createElement('div');
        const fCss = factionCssClass(content.factionId as any);
        magazine.className = `magazine-modal faction-${fCss}`;
        const fc = FACTION_COLORS[content.factionId] ?? FACTION_COLORS['RBiH'];
        magazine.style.borderTop = `3px solid ${fc.primary}`;

        // Title
        const title = document.createElement('div');
        title.className = 'magazine-title';
        title.style.color = fc.primary;
        title.textContent = content.title;
        magazine.appendChild(title);

        // Month/Year
        const monthYear = document.createElement('div');
        monthYear.className = 'magazine-month-year';
        monthYear.textContent = content.monthYear;
        if (!content.isNewIssue) {
            const badge = document.createElement('span');
            badge.className = 'magazine-no-issue-badge';
            badge.textContent = '(no new issue this week)';
            monthYear.appendChild(badge);
        }
        magazine.appendChild(monthYear);

        // Capital Section
        const capitalSection = document.createElement('div');
        capitalSection.className = 'magazine-toc';
        const capitalHeader = document.createElement('h3');
        capitalHeader.className = 'magazine-section-header';
        capitalHeader.textContent = 'PRE-WAR CAPITAL';
        capitalSection.appendChild(capitalHeader);
        const capitalColor = content.capitalPercent > 50 ? '#00e878' : content.capitalPercent > 25 ? '#ffab00' : '#ff3d00';
        capitalSection.appendChild(this.createProgressBar(content.capitalRemaining, content.capitalInitial, capitalColor));
        const capitalLabel = document.createElement('div');
        capitalLabel.className = 'magazine-bar-value';
        capitalLabel.textContent = `${content.capitalRemaining} / ${content.capitalInitial} (${content.capitalPercent}%)`;
        capitalSection.appendChild(capitalLabel);
        magazine.appendChild(capitalSection);

        // Statistics boxes
        const stats = document.createElement('div');
        stats.className = 'magazine-stats';
        stats.appendChild(this.createStatBox('ORG COVERAGE', `${content.orgCoverage}%`));
        stats.appendChild(this.createStatBox('AVG STABILITY', `${content.avgStability}`));
        stats.appendChild(this.createStatBox('INVESTMENTS', `${content.investmentCount}`));
        magazine.appendChild(stats);

        // Control Status
        const authoritySection = document.createElement('div');
        authoritySection.className = 'magazine-toc';
        authoritySection.innerHTML = `
            <h3>CONTROL STATUS</h3>
            <ul>
                <li>Secure: ${content.secureCount} municipalities</li>
                <li>Contested: ${content.contestedCount} municipalities</li>
                <li>Highly Contested: ${content.highlyContestedCount} municipalities</li>
            </ul>
        `;
        magazine.appendChild(authoritySection);

        // Declaration Watch
        const declSection = document.createElement('div');
        declSection.className = 'magazine-toc';
        const declHeader = document.createElement('h3');
        declHeader.textContent = 'DECLARATION WATCH';
        declSection.appendChild(declHeader);

        const rsContainer = document.createElement('div');
        rsContainer.style.marginBottom = '8px';
        const rsLabel = document.createElement('div');
        rsLabel.className = 'magazine-bar-label';
        rsLabel.textContent = `RS Pressure: ${content.rsPressure}%`;
        rsContainer.appendChild(rsLabel);
        rsContainer.appendChild(this.createProgressBar(content.rsPressure, 100, '#ff3d00'));
        declSection.appendChild(rsContainer);

        const hrhbContainer = document.createElement('div');
        const hrhbLabel = document.createElement('div');
        hrhbLabel.className = 'magazine-bar-label';
        hrhbLabel.textContent = `HRHB Pressure: ${content.hrhbPressure}%`;
        hrhbContainer.appendChild(hrhbLabel);
        hrhbContainer.appendChild(this.createProgressBar(content.hrhbPressure, 100, '#00bcd4'));
        declSection.appendChild(hrhbContainer);

        magazine.appendChild(declSection);

        return magazine;
    }

    /**
     * Create a stat box element
     */
    private createStatBox(label: string, value: string): HTMLElement {
        const box = document.createElement('div');
        box.className = 'magazine-stat-box';
        box.innerHTML = `
            <div class="magazine-stat-label">${label}</div>
            <div class="magazine-stat-value">${value}</div>
        `;
        return box;
    }
}
