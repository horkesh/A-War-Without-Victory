/**
 * MagazineModal — Monthly operational review with real game statistics.
 * Triggers every 4 turns (monthly). Between issues: shows most recent.
 *
 * War phase: Force strength, casualties, territory, displacement,
 * exhaustion/supply, enemy assessment via WarDataSnapshot.
 *
 * No Math.random(), no Date.now().
 */

/**
 * MagazineModal is a flavor wrapper over the player-safe war snapshot.
 * Data source (war phase): extractWarData(gameState, playerFaction) only.
 * This file must NOT read gameState directly, compute operational assessments,
 * or duplicate logic from operational_sitrep_views.ts / command_briefing_views.ts.
 */

import type { FactionId, GameState } from '../../../state/game_state.js';
import { extractWarData } from '../data/war_data_extractor.js';
import {
    exhaustionLabel,
    FACTION_COLORS,
    factionCssClass,
    getPlayerFaction,
    trendArrow,
    turnToMonthYear,
    turnToWeekString,
} from './warroom_utils.js';
import { getWarroomFactionIdentity } from './warroom_identity.js';

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
     * Phase 0 stub — field reports are not available before the war.
     * No raw gameState.political.* access; all deprecated Phase 0 logic removed.
     */
    private renderPhase0(): HTMLElement {
        const shell = this.createShell(getPlayerFaction(this.gameState));
        const note = document.createElement('div');
        note.style.cssText = 'padding: 32px; text-align: center; opacity: 0.6;';
        note.textContent = 'Field reports are not available before the war.';
        shell.appendChild(note);
        return shell;
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
                enemy.label,
                `${enemy.strengthCategory} \u2014 ${contactLocation}`
            ));
        }

        return section;
    }

}
