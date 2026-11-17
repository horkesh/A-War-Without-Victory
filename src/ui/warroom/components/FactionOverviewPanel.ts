/**
 * FactionOverviewPanel — Displays faction statistics and strategic overview
 * Shown when clicking on the national crest.
 *
 * Shows territory, military (real data), casualties, authority/supply,
 * formations with personnel/posture, and data-driven strategic warnings.
 */

import type { FactionId, GameState } from '../../../state/game_state.js';
import { extractWarData, type OfficerListEntry, type WarDataSnapshot } from '../data/war_data_extractor.js';
import { getOperationalSitrepView } from '../../shared/operational_sitrep_views.js';
import {
    FACTION_COLORS,
    FACTION_DISPLAY_NAMES,
    exhaustionLabel,
    factionCssClass,
    getPlayerFaction,
    trendArrow,
    turnToWeekString
} from './warroom_utils.js';
import { getWarroomFactionIdentity } from './warroom_identity.js';

const FACTION_MILITARY_LABELS: Record<string, string> = {
    RBiH: 'ARBiH',
    RS: 'VRS',
    HRHB: 'HVO',
};

function getFactionMilitaryLabel(factionId: string): string {
    return FACTION_MILITARY_LABELS[factionId] ?? factionId;
}

export class FactionOverviewPanel {
    private gameState: GameState;
    private modalManager: any; // Using any for simplicity or import ModalManager if possible

    constructor(gameState: GameState, modalManager: any) {
        this.gameState = gameState;
        this.modalManager = modalManager;
    }

    /**
     * Get display name for faction.
     */
    private getFactionDisplayName(factionId: string): string {
        return FACTION_DISPLAY_NAMES[factionId] || factionId;
    }

    /**
     * Render the panel (war-phase layout).
     */
    render(): HTMLElement {
        return this.renderPhaseIPlus();
    }

    /**
     * War-phase layout: territory, military, casualties, authority/supply, formations, warnings.
     * Uses extractWarData() for real GameState data instead of fake placeholders.
     */
    private renderPhaseIPlus(): HTMLElement {
        const pf = getPlayerFaction(this.gameState);
        const identity = getWarroomFactionIdentity(pf);
        const snap = extractWarData(this.gameState, pf);
        const sitrep = getOperationalSitrepView(this.gameState, pf);
        const fc = FACTION_COLORS[pf] ?? FACTION_COLORS['RBiH'];

        const panel = document.createElement('div');
        panel.className = `panel-power-on weathered-panel faction-overview-panel faction-${factionCssClass(pf)}`;
        panel.style.borderTop = `3px solid ${fc.primary}`;

        // Header
        const header = document.createElement('div');
        header.className = 'faction-overview-header';
        header.innerHTML = `
            <div class="fo-faction-badge text-accent-gold" style="color:${fc.primary}">${getFactionMilitaryLabel(pf)}</div>
            <h2 class="text-accent-gold">${this.getFactionDisplayName(pf)}</h2>
            <div class="meta">${turnToWeekString(snap.turn)}</div>
            <div class="meta">${identity.ceremonialLine}</div>
        `;
        panel.appendChild(header);

        // Quadrants
        const quadrants = document.createElement('div');
        quadrants.className = 'faction-overview-quadrants';

        // TERRITORY — area-weighted primary, settlement count secondary
        const territoryStats: Array<{ label: string; value: string }> = [
            { label: 'Territory Control', value: `${snap.ownTerritory.territoryPercent.toFixed(1)}%` },
            { label: 'Settlements Controlled', value: `${snap.ownTerritory.settlementsControlled} / ${snap.ownTerritory.settlementsTotal}` },
        ];
        if (snap.ownTerritory.areaControlledKm2 != null && snap.ownTerritory.areaTotalKm2 != null) {
            territoryStats.push({ label: 'Area Controlled', value: `${snap.ownTerritory.areaControlledKm2.toFixed(0)} / ${snap.ownTerritory.areaTotalKm2.toFixed(0)} km²` });
        }
        quadrants.appendChild(this.createQuadrant('TERRITORY', territoryStats));

        // MILITARY — real data from formations
        const inTransitCount = snap.brigadeMovement.inTransit.length;
        const militaryStats: Array<{ label: string; value: string }> = [
            { label: 'Personnel', value: snap.ownForces.totalPersonnel.toLocaleString() },
            { label: 'Active Brigades', value: `${snap.ownForces.activeBrigades} / ${snap.ownForces.totalBrigades}` },
            { label: 'Corps', value: `${snap.ownForces.corpsCount}` },
            { label: 'Avg. Cohesion', value: `${snap.ownForces.avgCohesion.toFixed(0)}` },
            { label: 'Exhaustion', value: `${exhaustionLabel(snap.ownExhaustion.level)} ${trendArrow(snap.ownExhaustion.trend)}` },
        ];
        if (inTransitCount > 0) {
            militaryStats.push({ label: 'In Transit', value: `${inTransitCount}` });
        }
        quadrants.appendChild(this.createQuadrant('MILITARY', militaryStats));

        // CASUALTIES — real data from casualty_ledger
        const cas = snap.ownCasualties;
        quadrants.appendChild(this.createQuadrant('CASUALTIES', [
            { label: 'KIA', value: cas.killed.toLocaleString() },
            { label: 'WIA', value: cas.wounded.toLocaleString() },
            { label: 'MIA/Captured', value: cas.missingCaptured.toLocaleString() },
            { label: 'Civilian Killed', value: snap.ownDisplacement.civilianKilled.toLocaleString() },
            { label: 'Equipment Lost', value: `T:${cas.equipmentLost.tanks} A:${cas.equipmentLost.artillery} AA:${cas.equipmentLost.aa}` },
            { label: 'WIA Pending Return', value: cas.woundedPendingReturn.toLocaleString() },
        ]));

        // AUTHORITY & SUPPLY — real data, authority displayed directly (no double multiplication)
        const authPct = (snap.ownAuthority.authority * 100).toFixed(0);
        quadrants.appendChild(this.createQuadrant('AUTHORITY & SUPPLY', [
            { label: 'Authority', value: `${authPct}%` },
            { label: 'Legitimacy', value: `${(snap.ownAuthority.legitimacy * 100).toFixed(0)}%` },
            { label: 'Supply: Adequate', value: `${snap.ownSupply.adequateCount}` },
            { label: 'Supply: Strained', value: `${snap.ownSupply.strainedCount}` },
            { label: 'Supply: Critical', value: `${snap.ownSupply.criticalCount}` },
            { label: 'Collapsed Municipalities', value: `${snap.ownSupply.collapsedMunicipalities.length}` },
        ]));

        panel.appendChild(quadrants);

        // Command handoff — Warroom summarizes command-shell truth but defers detailed review to Army HQ.
        panel.appendChild(this.renderCommandShellHandoff(snap));

        // Strategic Warnings — data-driven from real state
        const warnings = sitrep.alerts.length > 0
            ? sitrep.alerts.map((alert) => alert.text)
            : ['No strategic warnings at this time'];
        const warningsDiv = document.createElement('div');
        warningsDiv.className = 'faction-overview-warnings';
        warningsDiv.innerHTML = `
            <h3>${identity.archiveLabel.toUpperCase()} WARNINGS</h3>
            <ul>${warnings.map(w => `<li>${w}</li>`).join('')}</ul>
        `;
        panel.appendChild(warningsDiv);

        return panel;
    }

    /**
     * Warroom may summarize command-shell posture, but detailed command review belongs to Army HQ.
     */
    private renderCommandShellHandoff(snap: WarDataSnapshot): HTMLElement {
        const section = document.createElement('div');
        section.className = 'faction-overview-section';

        const onDutyOfficers = (snap.officersByFaction?.[snap.playerFaction] ?? [])
            .filter((officer) => officer.status === 'active').length;
        const corpsInField = snap.ownForces.formationDetails.filter((formation) => formation.kind === 'corps').length;
        const activeBrigades = snap.ownForces.activeBrigades;
        const inTransitCount = snap.brigadeMovement.inTransit.length;

        section.innerHTML = `
            <h3>COMMAND SHELL</h3>
            <div class="fo-stat-row"><span class="fo-stat-label">Corps in field</span><span class="fo-stat-value">${corpsInField}</span></div>
            <div class="fo-stat-row"><span class="fo-stat-label">Active brigades</span><span class="fo-stat-value">${activeBrigades}</span></div>
            <div class="fo-stat-row"><span class="fo-stat-label">Officers on duty</span><span class="fo-stat-value">${onDutyOfficers}</span></div>
            <div class="fo-stat-row"><span class="fo-stat-label">Units in transit</span><span class="fo-stat-value">${inTransitCount}</span></div>
            <div class="wr-dialog-info wr-info-muted" style="margin-top: 8px;">
                Detailed formation dispositions, operations review, reserve handling, and commander changes belong to Army HQ via the desk map.
            </div>
        `;

        return section;
    }

    /**
     * Create a quadrant div (Peace phase+)
     */
    private createQuadrant(title: string, stats: Array<{ label: string; value: string }>): HTMLElement {
        const quad = document.createElement('div');
        quad.className = 'quadrant';

        const heading = document.createElement('h3');
        heading.textContent = title;
        quad.appendChild(heading);

        stats.forEach(stat => {
            const statDiv = document.createElement('div');
            statDiv.className = 'stat';
            statDiv.innerHTML = `
                <div class="stat-label">${stat.label}</div>
                <div class="stat-value">${stat.value}</div>
            `;
            quad.appendChild(statDiv);
        });

        return quad;
    }
}
