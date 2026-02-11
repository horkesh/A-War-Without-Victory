/**
 * ReportsModal — Displays situation reports from corps commanders
 * Shown when clicking on the report stack
 */

import { GameState } from '../../../state/game_state.js';

interface ReportContent {
    from: string;
    to: string;
    date: string;
    subject: string;
    body: string;
    signature: string;
    classification: string;
}

export class ReportsModal {
    private gameState: GameState;

    constructor(gameState: GameState) {
        this.gameState = gameState;
    }

    /**
     * Format turn to date string
     */
    private turnToDateString(turn: number): string {
        const startDate = new Date(1991, 8, 1);
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + (turn * 7));

        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
        const day = currentDate.getDate();
        const month = months[currentDate.getMonth()];
        const year = currentDate.getFullYear();

        return `${day} ${month} ${year}`;
    }

    /**
     * Generate report content
     */
    private generateContent(): ReportContent {
        const turn = this.gameState.meta.turn;
        const reportTurn = Math.max(0, turn - 1); // T-1 delay
        const faction = this.gameState.factions[0];
        const factionId = faction?.id || 'Unknown';

        // For MVP, use placeholder corps data
        // TODO: In future, pull from actual formation data
        const from = '1st Corps Commander';
        const to = 'Chief of General Staff';
        const subject = `Situation Report - Turn ${reportTurn}`;

        const body = this.generatePlaceholderBody(reportTurn, factionId);

        return {
            from,
            to,
            date: this.turnToDateString(reportTurn),
            subject,
            body,
            signature: `Commander, 1st Corps`,
            classification: 'RESTRICTED'
        };
    }

    /**
     * Generate placeholder report body
     */
    private generatePlaceholderBody(turn: number, factionId: string): string {
        if (turn === 0) {
            return `CURRENT SITUATION:\n\n` +
                   `All units report normal readiness levels. No significant\n` +
                   `hostile activity detected in area of operations. Supply\n` +
                   `lines functioning normally with no disruptions.\n\n` +
                   `PERSONNEL STATUS:\n\n` +
                   `Unit strength at expected levels. Morale satisfactory.\n` +
                   `No significant personnel issues to report at this time.\n\n` +
                   `RECOMMENDATIONS:\n\n` +
                   `Continue current posture. Maintain vigilance and monitor\n` +
                   `situation closely. Request no additional resources at this\n` +
                   `time.`;
        }

        return `CURRENT SITUATION:\n\n` +
               `Operations proceeding as planned. Units maintaining defensive\n` +
               `positions. No major incidents to report since last update.\n\n` +
               `[Future: This content will be dynamically generated from corps\n` +
               `formation data once the military system is fully implemented.\n` +
               `For now, this placeholder demonstrates the report format.]`;
    }

    /**
     * Render the reports modal as HTML element
     */
    render(): HTMLElement {
        const content = this.generateContent();

        const report = document.createElement('div');
        report.className = 'reports-modal';

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

        // Body
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
