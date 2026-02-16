/**
 * NewspaperModal — Displays faction-specific newspaper with T-1 events.
 * Shown when clicking on the desk newspaper.
 *
 * Now uses dynamic headline templates driven by Phase 0 events.
 * Falls back to generic content when no events are available.
 */

import type { GameState, FactionId, Phase0Event } from '../../../state/game_state.js';
import { pickBestHeadline, fallbackHeadline, getUrgencyLevel } from '../content/headline_templates.js';
import { turnToDateString, getPlayerFaction } from './warroom_utils.js';

interface NewspaperContent {
    masthead: string;
    date: string;
    headline: string;
    subhead: string;
    photoCaption: string;
    bodyText: string;
    urgency: string;
}

interface NewspaperModalOptions {
    startBrief?: boolean;
}

export class NewspaperModal {
    private gameState: GameState;
    private options: NewspaperModalOptions;

    constructor(gameState: GameState, options?: NewspaperModalOptions) {
        this.gameState = gameState;
        this.options = options ?? {};
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
     * Get the last turn's events from the event log.
     */
    private getLastTurnEvents(): Phase0Event[] {
        const log = this.gameState.phase0_events_log;
        if (!log || log.length === 0) return [];
        return log[log.length - 1] ?? [];
    }

    /**
     * Get max declaration pressure across all factions.
     */
    private getMaxPressure(): number {
        let maxP = 0;
        for (const faction of this.gameState.factions) {
            const p = faction.declaration_pressure ?? 0;
            if (p > maxP) maxP = p;
        }
        return maxP;
    }

    /**
     * Generate newspaper content from Phase 0 events.
     */
    private generateContent(): NewspaperContent {
        const playerFaction = getPlayerFaction(this.gameState.factions);
        const turn = this.gameState.meta.turn;
        const previousTurn = Math.max(0, turn - 1);
        if (this.options.startBrief) {
            return {
                masthead: `${this.getMastheadName(playerFaction)} — EXTRA EDITION`,
                date: turnToDateString(turn),
                headline: 'SEPTEMBER 1991: PREPARE FOR THE BREAK',
                subhead: 'Allocate capital now. Build police, party, TO, and paramilitary networks before war begins.',
                photoCaption: 'Political structures harden while open war still appears avoidable.',
                bodyText: 'You are in the pre-war phase. Your immediate action is organizational investment at municipality level. Open the preparation map, target vulnerable municipalities, and spend pre-war capital deliberately. These choices feed organizational penetration, which in turn shapes militia strength, pool population, and brigade availability when the war starts. Advancing turns without investment weakens your opening position.',
                urgency: 'high',
            };
        }
        const events = this.getLastTurnEvents();
        const maxPressure = this.getMaxPressure();
        const urgency = getUrgencyLevel(maxPressure);

        // Try to pick the best headline from events
        const match = pickBestHeadline(events);

        let headline: string;
        let subhead: string;
        let bodyText: string;

        if (match) {
            headline = match.template.headline(match.event, playerFaction);
            subhead = match.template.subhead(match.event, playerFaction);
            bodyText = match.template.body(match.event, playerFaction);
        } else {
            const fb = fallbackHeadline(turn, playerFaction);
            headline = fb.headline;
            subhead = fb.subhead;
            bodyText = fb.body;
        }

        return {
            masthead: this.getMastheadName(playerFaction),
            date: turnToDateString(previousTurn),
            headline,
            subhead,
            photoCaption: this.generatePhotoCaption(events),
            bodyText,
            urgency,
        };
    }

    /**
     * Generate a contextual photo caption from events.
     */
    private generatePhotoCaption(events: Phase0Event[]): string {
        for (const ev of events) {
            if (ev.type === 'declaration') return 'Assembly session during the historic vote';
            if (ev.type === 'referendum_held') return 'Citizens queue at polling stations';
            if (ev.type === 'stability_change') return 'Recent developments in the region';
            if (ev.type === 'war_countdown') return 'Military positions observed near the city';
        }
        return 'Political leaders meet to discuss the situation';
    }

    /**
     * Render the newspaper modal as HTML element
     */
    render(): HTMLElement {
        const content = this.generateContent();

        const newspaper = document.createElement('div');
        newspaper.className = `newspaper-modal newspaper-urgency-${content.urgency}`;

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
