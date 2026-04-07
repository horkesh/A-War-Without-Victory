/**
 * ReportsModal — Displays situation reports from municipality intelligence.
 * Shown when clicking on the report stack.
 *
 * Now uses real game state data for municipality intelligence:
 * - Org-pen levels, stability, control status
 * - Per-municipality detail with 1-turn delay
 * - Sorted by urgency (highly contested → contested → secure)
 * - Faction-specific headers (FROM/TO per faction)
 *
 * War-phase (Peace/War phase) renders operational intelligence briefs
 * using extractWarData snapshot instead of municipality org-pen.
 */

import type { FactionId, GameState, MunicipalityId } from '../../../state/game_state.js';
import { strictCompare } from '../../../state/validateGameState.js';
import { extractWarData, type WarDataSnapshot } from '../data/war_data_extractor.js';
import { getOperationalSitrepView, type OperationalSitrepView } from '../../shared/operational_sitrep_views.js';
import { controlStatusLabel, FACTION_COLORS, factionCssClass, getFactionPartyPen, getPlayerFaction, hasFactionParamilitary, turnToDateString } from './warroom_utils.js';
import { getWarroomFactionIdentity } from './warroom_identity.js';

interface ReportContent {
    factionId: string;
    from: string;
    to: string;
    date: string;
    subject: string;
    body: string;
    signature: string;
    classification: string;
}

const REPORT_HEADERS: Record<string, { from: string; to: string; signature: string }> = {
    RBiH: {
        from: 'Municipal Affairs Department',
        to: 'Presidency of Bosnia and Herzegovina',
        signature: 'Director, Municipal Intelligence Bureau',
    },
    RS: {
        from: 'Serbian Autonomous Region Command',
        to: 'Assembly of Republika Srpska',
        signature: 'Chief, Regional Security Directorate',
    },
    HRHB: {
        from: 'Croatian Defence Council — Intelligence Section',
        to: 'HVO General Staff, Mostar',
        signature: 'Head, HVO Intelligence Department',
    },
};

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

interface MunicipalityIntel {
    munId: MunicipalityId;
    stability: number;
    controlStatus: string;
    ownPartyPen: number;
    policeLoyalty: string;
    hasParamilitary: boolean;
    jnaPresence: boolean;
    urgency: number;
}

export class ReportsModal {
    private gameState: GameState;

    constructor(gameState: GameState) {
        this.gameState = gameState;
    }


    /**
     * Gather intelligence on municipalities where this faction has investment.
     */
    private gatherMunicipalityIntel(factionId: FactionId): MunicipalityIntel[] {
        if (!this.gameState.political.municipalities) return [];

        const munIds = Object.keys(this.gameState.political.municipalities).sort(strictCompare);
        const results: MunicipalityIntel[] = [];

        for (const munId of munIds) {
            const mun = this.gameState.political.municipalities[munId];
            if (!mun) continue;
            const op = mun.organizational_penetration;
            if (!op) continue;

            const ownPartyPen = getFactionPartyPen(op, factionId);
            const hasParamilitary = hasFactionParamilitary(op, factionId);

            const controller = this.gameState.political.political_controllers?.[munId];
            const isControlled = controller === factionId;
            if (ownPartyPen <= 0 && !hasParamilitary && !isControlled) continue;

            const stability = mun.stability_score ?? 50;
            const controlStatus = controlStatusLabel(stability);

            const urgency = stability;

            results.push({
                munId,
                stability,
                controlStatus,
                ownPartyPen,
                policeLoyalty: op.police_loyalty ?? 'unknown',
                hasParamilitary,
                jnaPresence: op.jna_presence ?? false,
                urgency,
            });
        }

        results.sort((a, b) => {
            if (a.urgency !== b.urgency) return a.urgency - b.urgency;
            return strictCompare(a.munId, b.munId);
        });

        return results;
    }

    /**
     * Format municipality ID for display (kebab-case to Title Case).
     */
    private formatMunName(munId: string): string {
        return munId
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
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
     * Generate the report body from municipality intelligence.
     */
    private generateReportBody(factionId: FactionId, reportTurn: number): string {
        const intel = this.gatherMunicipalityIntel(factionId);

        if (intel.length === 0) {
            return `CURRENT SITUATION:\n\n` +
                `No organizational presence established in any municipality.\n` +
                `Intelligence coverage: NONE.\n\n` +
                `RECOMMENDATION:\n\n` +
                `Begin organizational investment in aligned municipalities immediately.\n` +
                `Priority: police loyalty, party penetration.`;
        }

        const lines: string[] = [];
        lines.push(`SITUATION REPORT - WEEK ${reportTurn}`);
        lines.push(`MUNICIPALITIES WITH PRESENCE: ${intel.length}`);
        lines.push('');
        lines.push('--------------------------------------------------');

        const shown = intel.slice(0, 8);
        for (const m of shown) {
            lines.push('');
            lines.push(`  ${this.formatMunName(m.munId).toUpperCase()}`);
            lines.push(`  Status: ${m.controlStatus}  |  Stability: ${m.stability}`);
            lines.push(`  Party Penetration: ${m.ownPartyPen}%  |  Police: ${m.policeLoyalty.toUpperCase()}`);
            if (m.hasParamilitary) lines.push(`  WARNING: Paramilitary presence active`);
            if (m.jnaPresence) lines.push(`  WARNING: JNA garrison present`);
            lines.push('  ' + '-'.repeat(48));
        }

        if (intel.length > 8) {
            lines.push('');
            lines.push(`  ... and ${intel.length - 8} additional municipalities`);
        }

        const highlyContested = intel.filter(m => m.controlStatus === 'HIGHLY CONTESTED');
        if (highlyContested.length > 0) {
            lines.push('');
            lines.push('PRIORITY WARNING:');
            for (const m of highlyContested.slice(0, 3)) {
                lines.push(`  ${this.formatMunName(m.munId)} - stability at ${m.stability}, immediate attention required`);
            }
        }

        const jnaCount = intel.filter(m => m.jnaPresence).length;
        if (jnaCount > 0) {
            lines.push('');
            lines.push(`JNA POSTURE: ${jnaCount} municipalities report garrison presence`);
        }

        return lines.join('\n');
    }

    /**
     * Generate report content for Phase 0.
     */
    private generateContent(): ReportContent {
        const turn = this.gameState.meta.turn;
        const reportTurn = Math.max(0, turn - 1);
        const factionId = getPlayerFaction(this.gameState);

        const headers = REPORT_HEADERS[factionId] ?? REPORT_HEADERS['RBiH'];
        const body = this.generateReportBody(factionId, reportTurn);

        return {
            factionId,
            from: headers.from,
            to: headers.to,
            date: turnToDateString(reportTurn),
            subject: `Situation Report - Week ${reportTurn}`,
            body,
            signature: headers.signature,
            classification: 'RESTRICTED'
        };
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
     * Render Phase 0 reports modal (pre-war municipality intelligence).
     */
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
     * Render Phase 0 reports modal (pre-war municipality intelligence).
     */
    private renderPhase0(): HTMLElement {
        const content = this.generateContent();
        const identity = getWarroomFactionIdentity(content.factionId as FactionId);
        const report = this.createShell(content.factionId as FactionId, content.classification);

        // Header
        const header = document.createElement('div');
        header.className = 'report-header';
        header.innerHTML = `
            <div class="report-field">
                <span class="report-field-label">FROM:</span> ${content.from}
            </div>
            <div class="report-field">
                <span class="report-field-label">TO:</span> ${content.to}
            </div>
            <div class="report-field">
                <span class="report-field-label">DATE:</span> ${content.date}
            </div>
            <div class="report-field">
                <span class="report-field-label text-accent-gold">SUBJECT:</span> ${identity.commandBriefLabel} - ${content.subject}
            </div>
        `;
        report.appendChild(header);

        // Body (white-space and font already handled by CSS .report-body)
        const body = document.createElement('div');
        body.className = 'report-body';
        body.textContent = content.body;
        report.appendChild(body);

        // Signature
        const signature = document.createElement('div');
        signature.className = 'report-signature';
        signature.textContent = content.signature;
        report.appendChild(signature);

        return report;
    }

    /**
     * Render war-phase (Peace/War phase) operational intelligence brief.
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
                <span class="report-field-label text-accent-gold">SUBJECT:</span> ${identity.commandBriefLabel} - Operational Intelligence Brief - Week ${reportTurn}
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
     * Render the reports modal as HTML element.
     * Phase gate: Phase 0 shows municipality intelligence,
     * war phases (Peace/War phase) show operational intelligence briefs.
     */
    render(): HTMLElement {
        const phase = this.gameState.meta.phase ?? 'peace';
        if (phase === 'peace') return this.renderPhase0();
        return this.renderWarPhase();
    }
}
