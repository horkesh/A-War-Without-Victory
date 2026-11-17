/**
 * NewspaperModal — Displays faction-specific newspaper with T-1 events.
 * Shown when clicking on the desk newspaper.
 *
 * Uses the war headline templates driven by delta-based turn events, with a
 * generic fallback when no events are available.
 */

import type { GameState } from '../../../state/game_state.js';
import { PHASE0_TICKER_EVENTS } from '../content/ticker_events.js';
import { fallbackWarHeadline, pickBestWarHeadline } from '../content/war_headline_templates.js';
import { generateTurnEvents } from '../data/turn_event_generator.js';
import { getPreviousSnapshot, getLastTurnReport } from '../data/warroom_state.js';
import { extractWarData } from '../data/war_data_extractor.js';
import { FACTION_COLORS, factionCssClass, getPlayerFaction, toTickerTurn, turnToDateString } from './warroom_utils.js';
import { getWarroomFactionIdentity } from './warroom_identity.js';
import { getPlayerSafeOfficerName } from '../../map/utils/playerSafeText.js';

interface NewspaperContent {
    factionId: string;
    masthead: string;
    date: string;
    headline: string;
    subhead: string;
    photoCaption: string;
    bodyText: string;
    urgency: string;
}

/**
 * DATA BOUNDARY: NewspaperModal permitted/forbidden reads.
 *
 * PERMITTED:
 *   - this.gameState.meta.*                          — turn display (meta.* always permitted)
 *   - extractWarData(this.gameState, playerFaction)  — sole war-phase live data entry point
 *
 * FORBIDDEN:
 *   - Direct this.gameState.military.* reads in war-phase display paths
 *   - Direct this.gameState.political.* reads in war-phase display paths
 */
export class NewspaperModal {
    private gameState: GameState;

    constructor(gameState: GameState) {
        this.gameState = gameState;
    }

    /**
     * Get faction-specific war-phase masthead name.
     * Uses historically accurate newspaper/publication names from the war.
     */
    private getWarMastheadName(factionId: string): string {
        const warMastheads: Record<string, string> = {
            'RBiH': 'OSLOBO\u0110ENJE',
            'RS': 'GLAS SRPSKI',
            'HRHB': 'HRVATSKI VOJNIK',
        };
        return warMastheads[factionId] || 'WAR BULLETIN';
    }

    /**
     * Generate newspaper content from war-phase TurnEvents (Peace phase / War phase).
     * Uses delta-based comparison against previous turn snapshot.
     */
    private generateWarContent(): NewspaperContent {
        const playerFaction = getPlayerFaction(this.gameState);
        const turn = this.gameState.meta.turn;
        const previousTurn = Math.max(0, turn - 1);

        const previousSnapshot = getPreviousSnapshot();
        const events = generateTurnEvents(this.gameState, previousSnapshot, playerFaction);

        const warHeadline = pickBestWarHeadline(events, playerFaction, turn);

        let headline: string;
        let subhead: string;
        let bodyText: string;
        let photoCaption: string;

        if (warHeadline) {
            headline = warHeadline.headline;
            subhead = warHeadline.subhead;
            bodyText = warHeadline.body;
            photoCaption = warHeadline.photoCaption;
        } else {
            const fb = fallbackWarHeadline(turn, playerFaction);
            headline = fb.headline;
            subhead = fb.subhead;
            bodyText = fb.body;
            photoCaption = fb.photoCaption;
        }

        const successionLines = this.getOfficerSuccessionLines(playerFaction);
        if (successionLines.length > 0) {
            bodyText += '\n\nCommand changes — ' + successionLines.join(' ');
        }

        return {
            factionId: playerFaction,
            masthead: this.getWarMastheadName(playerFaction),
            date: turnToDateString(previousTurn),
            headline,
            subhead,
            photoCaption,
            bodyText,
            urgency: 'elevated',
        };
    }

    /**
     * Get officer succession lines for newspaper AAR (Phase E).
     * Order: replacements (by corps_id, new_officer), then casualties, then departures.
     */
    private getOfficerSuccessionLines(playerFaction: string): string[] {
        const report = getLastTurnReport();
        const succession = report?.details?.officer_succession;
        if (!succession) return [];
        const reportDate = turnToDateString(report?.turn ?? this.gameState.meta.turn);

        const snap = extractWarData(this.gameState, playerFaction);
        const nameById = new Map<string, string>(Object.entries(snap.officerNamesById));
        const corpsName = (corpsId: string): string =>
            snap.ownForces.formationDetails.find(fd => fd.id === corpsId)?.name ?? corpsId;

        const lines: string[] = [];
        const replacements = succession.replacements ?? [];
        const sortedReplacements = [...replacements].sort((a, b) => {
            const c = a.corps_id < b.corps_id ? -1 : a.corps_id > b.corps_id ? 1 : 0;
            if (c !== 0) return c;
            return a.new_officer < b.new_officer ? -1 : a.new_officer > b.new_officer ? 1 : 0;
        });
        for (const r of sortedReplacements) {
            const name = nameById.get(r.new_officer) ?? getPlayerSafeOfficerName(null);
            const corps = corpsName(r.corps_id);
            lines.push(`On ${reportDate}, ${name} was assigned to ${corps}.`);
        }
        const casualties = succession.casualties ?? [];
        for (const id of [...casualties].sort((a, b) => a < b ? -1 : a > b ? 1 : 0)) {
            const name = nameById.get(id) ?? getPlayerSafeOfficerName(null);
            lines.push(`On ${reportDate}, ${name} was killed in action.`);
        }
        const departures = succession.departures ?? [];
        for (const id of [...departures].sort((a, b) => a < b ? -1 : a > b ? 1 : 0)) {
            const name = nameById.get(id) ?? getPlayerSafeOfficerName(null);
            lines.push(`On ${reportDate}, ${name} retired.`);
        }
        return lines;
    }

    /**
     * Collect up to 3 recent 'world' ticker events for the sidebar.
     * Picks from events at or just before the current turn, sorted
     * most-recent first then alphabetically for determinism.
     *
     * Uses toTickerTurn() to map the scenario-relative turn to the
     * absolute epoch turn that scripted events are keyed to.
     */
    private getWorldBriefs(turn: number, maxItems: number = 3): string[] {
        const absoluteTurn = toTickerTurn(turn);
        const worldEvents = PHASE0_TICKER_EVENTS.filter(
            e => e.category === 'world' && e.turn <= absoluteTurn
        );
        worldEvents.sort((a, b) => {
            if (b.turn !== a.turn) return b.turn - a.turn;
            return a.text < b.text ? -1 : a.text > b.text ? 1 : 0;
        });
        return worldEvents.slice(0, maxItems).map(e => e.text);
    }

    /**
     * Render the newspaper modal as HTML element
     */
    render(): HTMLElement {
        const content = this.generateWarContent();
        const identity = getWarroomFactionIdentity(content.factionId);

        const newspaper = document.createElement('div');
        const fCss = factionCssClass(content.factionId);
        newspaper.className = `newspaper-modal newspaper-urgency-${content.urgency} faction-${fCss}`;
        const fc = FACTION_COLORS[content.factionId] ?? FACTION_COLORS['RBiH'];
        newspaper.style.borderTop = `3px solid ${fc.primary}`;

        // Masthead
        const masthead = document.createElement('div');
        masthead.className = 'newspaper-masthead';
        masthead.style.borderBottomColor = fc.dim;
        masthead.textContent = content.masthead;
        newspaper.appendChild(masthead);

        // Date
        const date = document.createElement('div');
        date.className = 'newspaper-date';
        date.textContent = content.date;
        newspaper.appendChild(date);

        const pressLine = document.createElement('div');
        pressLine.className = 'newspaper-date';
        pressLine.textContent = identity.pressLabel;
        newspaper.appendChild(pressLine);

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
        photo.textContent = `[${identity.photoPlaceholder}]`;
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

        // World briefs sidebar
        const briefs = this.getWorldBriefs(this.gameState.meta.turn);
        if (briefs.length > 0) {
            const sidebar = document.createElement('div');
            sidebar.className = 'newspaper-world-briefs';

            const sidebarHeader = document.createElement('div');
            sidebarHeader.className = 'newspaper-world-briefs-header';
            sidebarHeader.textContent = 'ALSO IN THE NEWS';
            sidebar.appendChild(sidebarHeader);

            for (const brief of briefs) {
                const item = document.createElement('div');
                item.className = 'newspaper-world-brief-item';
                item.textContent = brief;
                sidebar.appendChild(item);
            }

            newspaper.appendChild(sidebar);
        }

        return newspaper;
    }
}
