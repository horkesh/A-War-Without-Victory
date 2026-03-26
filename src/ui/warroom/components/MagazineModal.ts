/**
 * MagazineModal — Monthly operational review with real game statistics.
 * Triggers every 4 turns (monthly). Between issues: shows most recent.
 *
 * Phase 0: Pre-war organizational coverage, capital, stability, declaration pressure.
 * Peace/War phase (war phases): Force strength, casualties, territory, displacement,
 * exhaustion/supply, enemy assessment via WarDataSnapshot.
 *
 * No Math.random(), no Date.now().
 */

/** @deprecated Phase 0 removed. Stubs for prewar capital display. */
function getPrewarCapital(_s: unknown, _f: unknown): number { return 0; }
const PREWAR_CAPITAL_INITIAL: Record<string, number> = {};
import type { FactionId, GameState } from '../../../state/game_state.js';
import { strictCompare } from '../../../state/validateGameState.js';
import { extractWarData } from '../data/war_data_extractor.js';
import {
    exhaustionLabel,
    FACTION_COLORS,
    factionCssClass,
    getPlayerFaction,
    hasFactionPresence,
    STABILITY_CONTESTED_MIN,
    STABILITY_SECURE_MIN,
    trendArrow,
    turnToMonthYear,
    turnToWeekString,
} from './warroom_utils.js';
import { getWarroomFactionIdentity } from './warroom_identity.js';

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
        if (!this.gameState.political.municipalities) return 0;
        const munIds = Object.keys(this.gameState.political.municipalities).sort(strictCompare);
        let count = 0;

        for (const munId of munIds) {
            const op = this.gameState.political.municipalities[munId]?.organizational_penetration;
            if (!op) continue;
            const isControlled = this.gameState.political.political_controllers?.[munId] === factionId;
            if (hasFactionPresence(op, factionId, isControlled)) count++;
        }
        return count;
    }

    /**
     * Count municipalities where this faction is political controller.
     */
    private countControlledMunicipalities(factionId: FactionId): number {
        if (!this.gameState.political.political_controllers) return 1;
        let count = 0;
        for (const controller of Object.values(this.gameState.political.political_controllers)) {
            if (controller === factionId) count++;
        }
        return Math.max(count, 1); // Avoid division by zero
    }

    /**
     * Compute average stability in controlled municipalities.
     */
    private computeAvgStability(factionId: FactionId): number {
        if (!this.gameState.political.municipalities) return 50;
        const munIds = Object.keys(this.gameState.political.municipalities).sort(strictCompare);
        let total = 0;
        let count = 0;

        for (const munId of munIds) {
            const controller = this.gameState.political.political_controllers?.[munId];
            if (controller !== factionId) continue;
            const stability = this.gameState.political.municipalities[munId]?.stability_score ?? 50;
            total += stability;
            count++;
        }
        return count > 0 ? Math.round(total / count) : 50;
    }

    /**
     * Count municipalities by control status for this faction.
     */
    private countByControlStatus(factionId: FactionId): { secure: number; contested: number; highlyContested: number } {
        if (!this.gameState.political.municipalities) return { secure: 0, contested: 0, highlyContested: 0 };
        const munIds = Object.keys(this.gameState.political.municipalities).sort(strictCompare);
        let secure = 0;
        let contested = 0;
        let highlyContested = 0;

        for (const munId of munIds) {
            const controller = this.gameState.political.political_controllers?.[munId];
            if (controller !== factionId) continue;
            const stability = this.gameState.political.municipalities[munId]?.stability_score ?? 50;
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
     * Phase gate: render Phase 0 or war-phase content.
     */
    render(): HTMLElement {
        const phase = this.gameState.meta.phase ?? 'peace';
        if (phase === 'peace') return this.renderPhase0();
        return this.renderWarPhase();
    }

    /**
     * Create the root modal shell with consistent styling and faction accents.
     */
    private createShell(factionId: FactionId): HTMLElement {
        const magazine = document.createElement('div');
        const fCss = factionCssClass(factionId);
        const identity = getWarroomFactionIdentity(factionId);
        magazine.className = `magazine-modal weathered-panel faction-${fCss}`;

        const fc = FACTION_COLORS[factionId] ?? FACTION_COLORS['RBiH'];
        magazine.style.borderTop = `3px solid ${fc.primary}`;

        // Title
        const title = document.createElement('div');
        title.className = 'magazine-title text-accent-gold';
        title.style.color = fc.primary;
        title.textContent = MAGAZINE_TITLES[factionId] ?? 'OPERATIONAL REVIEW';
        magazine.appendChild(title);

        const subtitle = document.createElement('div');
        subtitle.className = 'magazine-month-year';
        subtitle.textContent = identity.ceremonialLine;
        magazine.appendChild(subtitle);

        return magazine;
    }

    /**
     * Render the Phase 0 magazine modal (pre-war organizational review).
     */
    private renderPhase0(): HTMLElement {
        const content = this.generateContent();
        const magazine = this.createShell(content.factionId as FactionId);

        // Subtitle (Month/Year)
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
     * Render the war-phase magazine modal (Peace phase / War phase).
     * Uses WarDataSnapshot for all data. Shows 6 operational sections.
     */
    private renderWarPhase(): HTMLElement {
        const turn = this.gameState.meta.turn;
        const factionId = getPlayerFaction(this.gameState);
        const snap = extractWarData(this.gameState, factionId);
        const isNewIssue = turn % 4 === 0;

        const magazine = this.createShell(factionId);

        // Month/Year + week string
        const monthYear = document.createElement('div');
        monthYear.className = 'magazine-month-year';
        monthYear.textContent = turnToMonthYear(turn);
        if (!isNewIssue) {
            const badge = document.createElement('span');
            badge.className = 'magazine-no-issue-badge';
            badge.textContent = '(no new issue this week)';
            monthYear.appendChild(badge);
        }
        magazine.appendChild(monthYear);

        // Week reference line
        const weekLine = document.createElement('div');
        weekLine.className = 'magazine-month-year';
        weekLine.style.fontSize = '0.85em';
        weekLine.style.opacity = '0.7';
        weekLine.textContent = turnToWeekString(turn);
        magazine.appendChild(weekLine);

        // --- Section 1: FORCE STRENGTH ---
        magazine.appendChild(this.renderForceStrengthSection(snap));

        // --- Section 2: CASUALTIES THIS MONTH ---
        magazine.appendChild(this.renderCasualtiesSection(snap));

        // --- Section 3: TERRITORIAL STATUS ---
        magazine.appendChild(this.renderTerritorySection(snap));

        // --- Section 4: POPULATION & DISPLACEMENT ---
        magazine.appendChild(this.renderDisplacementSection(snap));

        // --- Section 5: EXHAUSTION & SUPPLY ---
        magazine.appendChild(this.renderExhaustionSupplySection(snap));

        // --- Section 6: ENEMY ASSESSMENT ---
        magazine.appendChild(this.renderEnemyAssessmentSection(snap));

        return magazine;
    }

    /**
     * Create a stat row element: label on left, value on right.
     */
    private createStatRow(label: string, value: string): HTMLElement {
        const row = document.createElement('div');
        row.className = 'fo-stat-row';

        const labelEl = document.createElement('span');
        labelEl.className = 'fo-stat-label';
        labelEl.textContent = label;
        row.appendChild(labelEl);

        const valueEl = document.createElement('span');
        valueEl.className = 'fo-stat-value';
        valueEl.textContent = value;
        row.appendChild(valueEl);

        return row;
    }

    /**
     * Create a section container with header.
     */
    private createSection(headerText: string): HTMLElement {
        const section = document.createElement('div');
        section.className = 'magazine-toc';

        const header = document.createElement('h3');
        header.className = 'magazine-section-header text-accent-gold';
        header.textContent = headerText;
        section.appendChild(header);

        return section;
    }

    // ----- War-phase section renderers -----

    private renderForceStrengthSection(snap: import('../data/war_data_extractor.js').WarDataSnapshot): HTMLElement {
        const section = this.createSection('FORCE STRENGTH');
        const f = snap.ownForces;

        section.appendChild(this.createStatRow('Total Personnel', f.totalPersonnel.toLocaleString()));
        section.appendChild(this.createStatRow('Active Brigades', `${f.activeBrigades} / ${f.totalBrigades}`));
        section.appendChild(this.createStatRow('Corps', `${f.corpsCount}`));
        section.appendChild(this.createStatRow('Avg Cohesion', `${Math.round(f.avgCohesion)}`));

        return section;
    }

    private renderCasualtiesSection(snap: import('../data/war_data_extractor.js').WarDataSnapshot): HTMLElement {
        const section = this.createSection('CASUALTIES THIS MONTH');
        const c = snap.ownCasualties;

        section.appendChild(this.createStatRow('Killed', c.killed.toLocaleString()));
        section.appendChild(this.createStatRow('Wounded', c.wounded.toLocaleString()));
        section.appendChild(this.createStatRow('Missing / Captured', c.missingCaptured.toLocaleString()));
        section.appendChild(this.createStatRow('Tanks Lost', `${c.equipmentLost.tanks}`));
        section.appendChild(this.createStatRow('Artillery Lost', `${c.equipmentLost.artillery}`));
        section.appendChild(this.createStatRow('AA Systems Lost', `${c.equipmentLost.aa}`));
        section.appendChild(this.createStatRow('Wounded Pending Return', c.woundedPendingReturn.toLocaleString()));

        return section;
    }

    private renderTerritorySection(snap: import('../data/war_data_extractor.js').WarDataSnapshot): HTMLElement {
        const section = this.createSection('TERRITORIAL STATUS');
        const t = snap.ownTerritory;

        section.appendChild(this.createStatRow('Settlements Controlled', `${t.settlementsControlled} / ${t.settlementsTotal}`));
        section.appendChild(this.createStatRow('Territory', `${Math.round(t.territoryPercent)}%`));

        return section;
    }

    private renderDisplacementSection(snap: import('../data/war_data_extractor.js').WarDataSnapshot): HTMLElement {
        const section = this.createSection('POPULATION & DISPLACEMENT');
        const d = snap.ownDisplacement;

        section.appendChild(this.createStatRow('Displaced Out', d.totalDisplacedOut.toLocaleString()));
        section.appendChild(this.createStatRow('Displaced In', d.totalDisplacedIn.toLocaleString()));
        section.appendChild(this.createStatRow('Civilians Killed', d.civilianKilled.toLocaleString()));
        section.appendChild(this.createStatRow('Fled Abroad', d.civilianFledAbroad.toLocaleString()));
        section.appendChild(this.createStatRow('Active Camps', `${d.activeCamps}`));
        section.appendChild(this.createStatRow('Hostile Takeover Timers', `${d.activeHostileTakeoverTimers}`));

        return section;
    }

    private renderExhaustionSupplySection(snap: import('../data/war_data_extractor.js').WarDataSnapshot): HTMLElement {
        const section = this.createSection('EXHAUSTION & SUPPLY');
        const ex = snap.ownExhaustion;
        const su = snap.ownSupply;

        section.appendChild(this.createStatRow('Exhaustion Level', `${Math.round(ex.level * 100)}% \u2014 ${exhaustionLabel(ex.level)}`));
        section.appendChild(this.createStatRow('Exhaustion Trend', trendArrow(ex.trend)));
        section.appendChild(this.createStatRow('Supply Adequate', `${su.adequateCount}`));
        section.appendChild(this.createStatRow('Supply Strained', `${su.strainedCount}`));
        section.appendChild(this.createStatRow('Supply Critical', `${su.criticalCount}`));
        section.appendChild(this.createStatRow('Collapsed Municipalities', `${su.collapsedMunicipalities.length}`));

        return section;
    }

    private renderEnemyAssessmentSection(snap: import('../data/war_data_extractor.js').WarDataSnapshot): HTMLElement {
        const section = this.createSection('ENEMY ASSESSMENT');
        const contacts = snap.contactedEnemyFormations;

        if (contacts.length === 0) {
            const noContact = document.createElement('div');
            noContact.className = 'fo-stat-row';
            noContact.style.fontStyle = 'italic';
            noContact.style.opacity = '0.7';
            noContact.textContent = 'No enemy forces engaged this period.';
            section.appendChild(noContact);
            return section;
        }

        for (const enemy of contacts) {
            const contactLocation = enemy.contactSettlement ?? 'unknown';
            section.appendChild(this.createStatRow(
                enemy.name,
                `${enemy.strengthCategory} \u2014 ${contactLocation}`
            ));
        }

        return section;
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
