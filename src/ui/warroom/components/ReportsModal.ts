/**
 * ReportsModal — Displays situation reports from municipality intelligence.
 * Shown when clicking on the report stack.
 *
 * Now uses real game state data for municipality intelligence:
 * - Org-pen levels, stability, control status
 * - Per-municipality detail with 1-turn delay
 * - Sorted by urgency (highly contested → contested → secure)
 * - Faction-specific headers (FROM/TO per faction)
 */

import type { FactionId, GameState, MunicipalityId } from '../../../state/game_state.js';
import { strictCompare } from '../../../state/validateGameState.js';
import { controlStatusLabel, FACTION_COLORS, factionCssClass, getFactionPartyPen, getPlayerFaction, hasFactionParamilitary, turnToDateString } from './warroom_utils.js';

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
        if (!this.gameState.municipalities) return [];

        const munIds = Object.keys(this.gameState.municipalities).sort(strictCompare);
        const results: MunicipalityIntel[] = [];

        for (const munId of munIds) {
            const mun = this.gameState.municipalities[munId];
            if (!mun) continue;
            const op = mun.organizational_penetration;
            if (!op) continue;

            const ownPartyPen = getFactionPartyPen(op, factionId);
            const hasParamilitary = hasFactionParamilitary(op, factionId);

            const controller = this.gameState.political_controllers?.[munId];
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
     * Generate report content
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
     * Render the reports modal as HTML element
     */
    render(): HTMLElement {
        const content = this.generateContent();

        const report = document.createElement('div');
        const fCss = factionCssClass(content.factionId as any);
        report.className = `reports-modal faction-${fCss}`;
        const fc = FACTION_COLORS[content.factionId] ?? FACTION_COLORS['RBiH'];
        report.style.borderTop = `3px solid ${fc.primary}`;

        // Classification stamps
        const classTop = document.createElement('div');
        classTop.className = 'report-classification-top';
        classTop.textContent = content.classification;
        report.appendChild(classTop);

        const classBottom = document.createElement('div');
        classBottom.className = 'report-classification-bottom';
        classBottom.textContent = 'CONFIDENTIAL';
        report.appendChild(classBottom);

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
                <span class="report-field-label">SUBJECT:</span> ${content.subject}
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
}
