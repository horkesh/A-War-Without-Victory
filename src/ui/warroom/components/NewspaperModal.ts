/**
 * NewspaperModal — Displays faction-specific newspaper with T-1 events
 * Shown when clicking on the desk newspaper
 */

import { GameState } from '../../../state/game_state.js';

interface NewspaperContent {
    masthead: string;
    date: string;
    headline: string;
    subhead: string;
    photoCaption: string;
    bodyText: string;
}

export class NewspaperModal {
    private gameState: GameState;

    constructor(gameState: GameState) {
        this.gameState = gameState;
    }

    /**
     * Get faction-specific masthead name
     */
    private getMastheadName(factionId: string): string {
        const mastheads: Record<string, string> = {
            'RBiH': 'OSLOBOĐENJE',
            'RS': 'GLAS SRPSKE',
            'HRHB': 'CROATIAN HERALD'
        };
        return mastheads[factionId] || 'NEWS DAILY';
    }

    /**
     * Format turn to date string
     */
    private turnToDateString(turn: number): string {
        // Starting date: September 1991 (Turn 0)
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
     * Generate newspaper content
     */
    private generateContent(): NewspaperContent {
        const faction = this.gameState.factions[0];
        const factionId = faction?.id || 'Unknown';
        const turn = this.gameState.meta.turn;
        const previousTurn = Math.max(0, turn - 1);

        // For MVP, generate placeholder content
        // TODO: In future, extract events from turnLog
        const headline = turn === 0
            ? 'TENSIONS RISE IN YUGOSLAVIA'
            : `WEEK ${turn} SITUATION REPORT`;

        const subhead = turn === 0
            ? 'Republic declares sovereignty amid growing concerns'
            : 'Political situation remains fluid as events unfold';

        const bodyText = this.generatePlaceholderBody(turn, factionId);

        return {
            masthead: this.getMastheadName(factionId),
            date: this.turnToDateString(previousTurn),
            headline: headline,
            subhead: subhead,
            photoCaption: 'Recent developments in the region',
            bodyText: bodyText
        };
    }

    /**
     * Generate placeholder body text for MVP
     */
    private generatePlaceholderBody(turn: number, factionId: string): string {
        if (turn === 0) {
            return `The political situation across the region continues to develop rapidly. ` +
                   `Leaders from all sides are meeting to discuss the future of the republic. ` +
                   `International observers are monitoring the situation closely.\n\n` +
                   `Residents in major cities report increased military presence as authorities ` +
                   `work to maintain order. Economic concerns remain at the forefront of many ` +
                   `citizens' minds as uncertainty about the future persists.\n\n` +
                   `Representatives have called for calm and dialogue as negotiations continue. ` +
                   `The coming weeks will be critical in determining the path forward for all ` +
                   `communities in the region.`;
        }

        // Placeholder for subsequent turns
        return `Week ${turn} has seen continued political developments across the region. ` +
               `Military commanders report the situation remains stable in most areas.\n\n` +
               `Supply lines continue to function normally, with no major disruptions reported. ` +
               `Local authorities are working to ensure essential services remain available to ` +
               `all residents.\n\n` +
               `[Future: This content will be dynamically generated from turn events once the ` +
               `event logging system is implemented. For now, this serves as a placeholder to ` +
               `demonstrate the newspaper layout and styling.]`;
    }

    /**
     * Render the newspaper modal as HTML element
     */
    render(): HTMLElement {
        const content = this.generateContent();

        const newspaper = document.createElement('div');
        newspaper.className = 'newspaper-modal';

        // Masthead
        const masthead = document.createElement('div');
        masthead.className = 'newspaper-masthead';
        masthead.textContent = content.masthead;
        newspaper.appendChild(masthead);

        // Date
        const date = document.createElement('div');
        date.className = 'newspaper-date';
        date.textContent = content.date;
        newspaper.appendChild(date);

        // Headline
        const headline = document.createElement('div');
        headline.className = 'newspaper-headline';
        headline.textContent = content.headline;
        newspaper.appendChild(headline);

        // Subhead
        const subhead = document.createElement('div');
        subhead.className = 'newspaper-subhead';
        subhead.textContent = content.subhead;
        newspaper.appendChild(subhead);

        // Photo placeholder
        const photo = document.createElement('div');
        photo.className = 'newspaper-photo';
        photo.textContent = '[Photo Area]';
        newspaper.appendChild(photo);

        // Photo caption
        const caption = document.createElement('div');
        caption.className = 'newspaper-caption';
        caption.textContent = content.photoCaption;
        newspaper.appendChild(caption);

        // Body columns
        const columns = document.createElement('div');
        columns.className = 'newspaper-columns';
        columns.textContent = content.bodyText;
        newspaper.appendChild(columns);

        return newspaper;
    }
}
