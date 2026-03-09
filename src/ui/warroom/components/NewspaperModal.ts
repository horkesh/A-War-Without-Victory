/**
 * NewspaperModal — Displays faction-specific newspaper with T-1 events.
 * Shown when clicking on the desk newspaper.
 *
 * Now uses dynamic headline templates driven by Phase 0 events.
 * Falls back to generic content when no events are available.
 */

import type { FactionId, GameState, Phase0Event } from '../../../state/game_state.js';
import { fallbackHeadline, getUrgencyLevel, pickBestHeadline } from '../content/headline_templates.js';
import { PHASE0_TICKER_EVENTS } from '../content/ticker_events.js';
import { fallbackWarHeadline, pickBestWarHeadline } from '../content/war_headline_templates.js';
import { generateTurnEvents } from '../data/turn_event_generator.js';
import { getPreviousSnapshot, getLastTurnReport } from '../data/warroom_state.js';
import { FACTION_COLORS, factionCssClass, getPlayerFaction, toTickerTurn, turnToDateString } from './warroom_utils.js';
import { getWarroomFactionIdentity } from './warroom_identity.js';

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
        const log = this.gameState.political.phase0_events_log;
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

        const nameById = new Map<string, string>();
        const data = this.gameState.military.named_officer_data ?? [];
        for (const o of data) {
            nameById.set(o.id, o.name ?? o.id);
        }
        const corpsName = (corpsId: string): string =>
            this.gameState.military.formations?.[corpsId]?.name ?? corpsId;

        const lines: string[] = [];
        const replacements = succession.replacements ?? [];
        const sortedReplacements = [...replacements].sort((a, b) => {
            const c = a.corps_id < b.corps_id ? -1 : a.corps_id > b.corps_id ? 1 : 0;
            if (c !== 0) return c;
            return a.new_officer < b.new_officer ? -1 : a.new_officer > b.new_officer ? 1 : 0;
        });
        for (const r of sortedReplacements) {
            const name = nameById.get(r.new_officer) ?? r.new_officer;
            const corps = corpsName(r.corps_id);
            lines.push(`[Turn ${report?.turn ?? '?'}] ${name} assigned to ${corps}.`);
        }
        const casualties = succession.casualties ?? [];
        for (const id of [...casualties].sort((a, b) => a < b ? -1 : a > b ? 1 : 0)) {
            const name = nameById.get(id) ?? id;
            lines.push(`[Turn ${report?.turn ?? '?'}] ${name} killed in action.`);
        }
        const departures = succession.departures ?? [];
        for (const id of [...departures].sort((a, b) => a < b ? -1 : a > b ? 1 : 0)) {
            const name = nameById.get(id) ?? id;
            lines.push(`[Turn ${report?.turn ?? '?'}] ${name} retired.`);
        }
        return lines;
    }

    /**
     * Generate newspaper content from Phase 0 events.
     */
    private generateContent(): NewspaperContent {
        const playerFaction = getPlayerFaction(this.gameState);
        const turn = this.gameState.meta.turn;
        const previousTurn = Math.max(0, turn - 1);

        // Phase gate: war phases use delta-based TurnEvents instead of Phase 0 events
        const phase = this.gameState.meta.phase ?? 'peace';
        if (phase !== 'peace' && !this.options.startBrief) {
            return this.generateWarContent();
        }

        if (this.options.startBrief) {
            return {
                factionId: playerFaction,
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
            factionId: playerFaction,
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
        const content = this.generateContent();
        const identity = getWarroomFactionIdentity(content.factionId as FactionId);

        const newspaper = document.createElement('div');
        const fCss = factionCssClass(content.factionId as any);
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

        // World briefs sidebar — war phases only
        const phase = this.gameState.meta.phase ?? 'peace';
        if (phase !== 'peace') {
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
        }

        return newspaper;
    }
}
