/**
 * MagazineModal — Displays monthly operational review with statistics
 * Shown when clicking on the magazine
 */

import { GameState } from '../../../state/game_state.js';

interface MagazineContent {
    monthYear: string;
    settlementsGained: number;
    exhaustionPercent: number;
    displacedTotal: number;
    tableOfContents: string[];
}

export class MagazineModal {
    private gameState: GameState;

    constructor(gameState: GameState) {
        this.gameState = gameState;
    }

    /**
     * Convert turn to month/year string
     */
    private turnToMonthYear(turn: number): string {
        // Starting: September 1991, 4 turns per month
        const startDate = new Date(1991, 8, 1);
        const monthsElapsed = Math.floor(turn / 4);
        const currentDate = new Date(startDate);
        currentDate.setMonth(currentDate.getMonth() + monthsElapsed);

        const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
                        'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
        return `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }

    /**
     * Generate magazine content
     */
    private generateContent(): MagazineContent {
        const turn = this.gameState.meta.turn;
        const faction = this.gameState.factions[0];
        const profile = faction?.profile || { exhaustion: 0 };

        // For MVP, use placeholder calculations
        // TODO: In future, aggregate actual monthly data from turn logs
        const settlementsGained = 0; // Placeholder for Turn 0
        const exhaustionPercent = Math.floor(profile.exhaustion * 100);
        const displacedTotal = 0; // Placeholder for Phase 0

        const tableOfContents = [
            'Corps Performance Review',
            'Supply Chain Analysis',
            'Territorial Control Changes',
            'Population Displacement Trends',
            'Strategic Outlook'
        ];

        return {
            monthYear: this.turnToMonthYear(turn),
            settlementsGained,
            exhaustionPercent,
            displacedTotal,
            tableOfContents
        };
    }

    /**
     * Render the magazine modal as HTML element
     */
    render(): HTMLElement {
        const content = this.generateContent();

        const magazine = document.createElement('div');
        magazine.className = 'magazine-modal';

        // Title
        const title = document.createElement('div');
        title.className = 'magazine-title';
        title.textContent = 'MONTHLY OPERATIONAL REVIEW';
        magazine.appendChild(title);

        // Month/Year
        const monthYear = document.createElement('div');
        monthYear.className = 'magazine-month-year';
        monthYear.textContent = content.monthYear;
        magazine.appendChild(monthYear);

        // Map Preview Placeholder
        const mapPreview = document.createElement('div');
        mapPreview.className = 'magazine-map-preview';
        mapPreview.textContent = '[Control Map Preview]';
        magazine.appendChild(mapPreview);

        // Statistics
        const stats = document.createElement('div');
        stats.className = 'magazine-stats';

        const settlementsBox = this.createStatBox(
            'SETTLEMENTS',
            content.settlementsGained >= 0 ? `+${content.settlementsGained}` : `${content.settlementsGained}`
        );
        const exhaustionBox = this.createStatBox('EXHAUSTION', `${content.exhaustionPercent}%`);
        const displacedBox = this.createStatBox('DISPLACED', `${(content.displacedTotal / 1000).toFixed(0)}K`);

        stats.appendChild(settlementsBox);
        stats.appendChild(exhaustionBox);
        stats.appendChild(displacedBox);
        magazine.appendChild(stats);

        // Table of Contents
        const toc = document.createElement('div');
        toc.className = 'magazine-toc';
        toc.innerHTML = `
            <h3>INSIDE THIS ISSUE</h3>
            <ul>
                ${content.tableOfContents.map(item => `<li>${item}</li>`).join('')}
            </ul>
        `;
        magazine.appendChild(toc);

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
