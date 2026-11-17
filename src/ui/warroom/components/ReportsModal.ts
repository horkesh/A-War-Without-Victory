/**
 * ReportsModal — Displays the operational intelligence brief.
 * Shown when clicking on the report stack. Renders from the extractWarData
 * snapshot and the operational sitrep view (the pre-war municipality
 * intelligence report was retired with the peace phase).
 */

import type { FactionId, GameState } from '../../../state/game_state.js';
import { extractWarData, type WarDataSnapshot } from '../data/war_data_extractor.js';
import { getOperationalSitrepView, type OperationalSitrepView } from '../../shared/operational_sitrep_views.js';
import { FACTION_COLORS, factionCssClass, getPlayerFaction, turnToDateString } from './warroom_utils.js';
import { getWarroomFactionIdentity } from './warroom_identity.js';

const WAR_REPORT_HEADERS: Record<string, { from: string; to: string; signature: string }> = {
    RBiH: {
        from: 'Field Intelligence Summary Desk',
        to: 'ARBiH General Staff',
        signature: 'Duty Intelligence Officer',
    },
    RS: {
        from: 'Main Staff Field Intelligence Desk',
        to: 'VRS Main Staff',
        signature: 'Duty Intelligence Officer',
    },
    HRHB: {
        from: 'Operational Intelligence Desk',
        to: 'HVO General Staff',
        signature: 'Duty Intelligence Officer',
    },
};

export class ReportsModal {
    private gameState: GameState;

    constructor(gameState: GameState) {
        this.gameState = gameState;
    }

    private formatSettlementLabel(value: string | null | undefined): string {
        const raw = (value ?? '').trim();
        if (!raw) return 'Unknown location';
        const normalized = raw.startsWith('op:')
            ? raw.split(':').slice(1).join(' ')
            : raw.replace(/[_:-]/g, ' ');
        return normalized
            .split(/\s+/)
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }

    /**
     * Generate the war-phase report body from a WarDataSnapshot.
     */
    private generateWarReportBody(
        sitrep: OperationalSitrepView,
        contactedEnemyFormations: WarDataSnapshot['contactedEnemyFormations'],
        reportTurn: number,
    ): string {
        const lines: string[] = [];
        const divider = '\u2500'.repeat(45);

        // 1. FRONT STATUS
        lines.push('FRONT STATUS');
        lines.push(divider);
        lines.push(`  ${sitrep.headline}`);

        if (sitrep.front.edges.length === 0) {
            lines.push('  No active front edges this period.');
        } else {
            if (sitrep.front.exposedCount > 0) {
                lines.push(`  [!! URGENT: EXPOSED FRONT !!]`);
            }
            for (const edge of sitrep.front.edges.slice(0, 5)) {
                lines.push(`  ${edge.label}`);
                lines.push(`  Pressure: ${edge.pressure} | Friction: ${edge.friction} | ${edge.tier.toUpperCase()}`);
            }
        }

        lines.push('');

        // 2. FORMATION READINESS (5 weakest brigades)
        lines.push('FORMATION READINESS (5 WEAKEST)');
        lines.push(divider);

        if (sitrep.readiness.weakestBrigades.length === 0) {
            lines.push('  No brigade formations available.');
        } else {
            for (const brigade of sitrep.readiness.weakestBrigades) {
                lines.push(`  ${brigade.label} | ${brigade.personnel} pers | Cohesion: ${brigade.cohesion} | ${brigade.posture} | ${brigade.movementStatus}`);
            }
        }

        lines.push('');

        // 3. ENEMY CONTACT
        lines.push('ENEMY CONTACT (TIER 2 - CONTACT REVEALED)');
        lines.push(divider);

        if (contactedEnemyFormations.length === 0) {
            lines.push('  No enemy formations engaged this period.');
        } else {
            for (const cf of contactedEnemyFormations) {
                const contactLoc = this.formatSettlementLabel(cf.contactSettlement);
                lines.push(`  ${cf.label} | Strength: ${cf.strengthCategory} | Last contact: ${contactLoc}`);
            }
        }

        lines.push('');

        // 4. DISPLACEMENT ALERTS
        lines.push('DISPLACEMENT ALERTS');
        lines.push(divider);
        if (sitrep.readiness.encircledCount > 0) {
            lines.push(`  [!! URGENT: ${sitrep.readiness.encircledCount} BRIGADE(S) ENCIRCLED !!]`);
        }
        lines.push(`  Active hostile takeover timers: ${sitrep.sustainment.activeHostileTakeoverTimers}`);
        lines.push(`  Active displacement camps: ${sitrep.sustainment.activeCamps}`);

        lines.push('');

        // 5. SUSTAINABILITY WARNINGS
        lines.push('SUSTAINABILITY WARNINGS');
        lines.push(divider);

        const collapsedList = sitrep.sustainment.collapsedMunicipalities.length > 0
            ? sitrep.sustainment.collapsedMunicipalities.join(', ')
            : 'None';
        lines.push(`  Collapsed: ${collapsedList}`);
        lines.push(`  Critical: ${sitrep.sustainment.criticalCount}`);
        lines.push(`  Strained: ${sitrep.sustainment.strainedCount}`);

        lines.push('');

        // 6. CORPS OPERATIONS
        lines.push('CORPS OPERATIONS');
        lines.push(divider);

        if (sitrep.operations.corps.length === 0) {
            lines.push('  No corps commands active.');
        } else {
            for (const operation of sitrep.operations.corps) {
                lines.push(`  ${operation.corpsName} | Stance: ${operation.stance} | ${operation.summary}`);
            }
        }

        return lines.join('\n');
    }

    /**
     * Create the root report shell with consistent styling, classification stamps, and faction accents.
     */
    private createShell(factionId: FactionId, classification: string): HTMLElement {
        const report = document.createElement('div');
        const fCss = factionCssClass(factionId);
        const identity = getWarroomFactionIdentity(factionId);
        report.className = `reports-modal weathered-panel faction-${fCss}`;

        const fc = FACTION_COLORS[factionId] ?? FACTION_COLORS['RBiH'];
        report.style.borderTop = `3px solid ${fc.primary}`;

        // Classification stamps
        const classTop = document.createElement('div');
        classTop.className = 'report-classification-top';
        classTop.textContent = classification;
        report.appendChild(classTop);

        const classBottom = document.createElement('div');
        classBottom.className = 'report-classification-bottom';
        classBottom.textContent = classification;
        report.appendChild(classBottom);

        const ceremonialStrip = document.createElement('div');
        ceremonialStrip.className = 'report-field';
        ceremonialStrip.innerHTML = `<span class="report-field-label">DIRECTIVE:</span> ${identity.ceremonialLine}`;
        report.appendChild(ceremonialStrip);

        return report;
    }

    /**
     * Render the war-phase operational intelligence brief.
     */
    private renderWarPhase(): HTMLElement {
        const turn = this.gameState.meta.turn;
        const reportTurn = Math.max(0, turn - 1);
        const factionId = getPlayerFaction(this.gameState);
        const snap = extractWarData(this.gameState, factionId);
        const sitrep = getOperationalSitrepView(this.gameState, factionId);

        const headers = WAR_REPORT_HEADERS[factionId] ?? WAR_REPORT_HEADERS['RBiH'];
        const identity = getWarroomFactionIdentity(factionId);
        const reportBody = this.generateWarReportBody(sitrep, snap.contactedEnemyFormations, reportTurn);

        const report = this.createShell(factionId, 'CONFIDENTIAL');

        // Header
        const header = document.createElement('div');
        header.className = 'report-header';
        header.innerHTML = `
            <div class="report-field">
                <span class="report-field-label">FROM:</span> ${headers.from}
            </div>
            <div class="report-field">
                <span class="report-field-label">TO:</span> ${headers.to}
            </div>
            <div class="report-field">
                <span class="report-field-label">DATE:</span> ${turnToDateString(reportTurn)}
            </div>
            <div class="report-field">
                <span class="report-field-label text-accent-gold">SUBJECT:</span> ${identity.commandBriefLabel} - Operational Intelligence Brief - ${turnToDateString(reportTurn)}
            </div>
        `;
        report.appendChild(header);

        // Body (white-space and font already handled by CSS .report-body)
        const body = document.createElement('div');
        body.className = 'report-body';
        body.textContent = reportBody;
        report.appendChild(body);

        // Signature
        const signature = document.createElement('div');
        signature.className = 'report-signature';
        signature.textContent = headers.signature;
        report.appendChild(signature);

        return report;
    }

    /**
     * Render the reports modal (operational intelligence brief) as an HTML element.
     */
    render(): HTMLElement {
        return this.renderWarPhase();
    }
}
