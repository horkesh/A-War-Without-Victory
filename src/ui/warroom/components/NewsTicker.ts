/**
 * NewsTicker — Bottom scrolling news ticker for international events
 * Toggled by clicking the transistor radio.
 *
 * Phase 0: scripted historical events only.
 * War phases (phase_i, phase_ii): dynamic TurnEvent-based war headlines
 * interleaved with any scripted events still in range.
 */

import type { FactionId } from '../../../state/game_state.js';
import { GameState } from '../../../state/game_state.js';
import { PHASE0_TICKER_EVENTS, TickerEvent } from '../content/ticker_events.js';
import { generateTickerWarEvents } from '../content/ticker_war_events.js';
import { generateTurnEvents } from '../data/turn_event_generator.js';
import { getPreviousSnapshot } from '../data/warroom_state.js';
import { toTickerTurn } from './warroom_utils.js';
import { getWarroomFactionIdentity } from './warroom_identity.js';

/** Separator used between headlines in the scrolling ticker. */
const HEADLINE_SEP = '  \u2022  ';

/** Maximum number of historical events shown in the ticker at once. */
const MAX_VISIBLE_EVENTS = 8;

export class NewsTicker {
    private container: HTMLElement | null = null;
    private isVisible: boolean = false;
    private currentTurn: number = -1;

    constructor() {
        this.createTicker();
    }

    /**
     * Create ticker DOM element
     */
    private createTicker() {
        this.container = document.createElement('div');
        this.container.className = 'news-ticker';
        this.container.id = 'news-ticker';

        // Label
        const label = document.createElement('div');
        label.className = 'news-ticker-label';
        label.innerHTML = '\uD83D\uDD34 LIVE';
        this.container.appendChild(label);

        // Content
        const content = document.createElement('div');
        content.className = 'news-ticker-content';
        content.id = 'news-ticker-content';
        this.container.appendChild(content);

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'news-ticker-close';
        closeBtn.innerHTML = '\u00D7';
        closeBtn.onclick = () => this.hide();
        this.container.appendChild(closeBtn);

        document.body.appendChild(this.container);
    }

    /**
     * Collect historical events visible at the given turn.
     * Returns up to MAX_VISIBLE_EVENTS, sorted by turn descending then
     * alphabetically by text for deterministic ordering.
     *
     * The scripted events are keyed to the Sep-1991 epoch (turn 0 = 1 Sep 1991).
     * toTickerTurn() maps the scenario-relative turn to the absolute epoch turn.
     */
    private getEventsForTurn(turn: number): TickerEvent[] {
        const absoluteTurn = toTickerTurn(turn);
        const eligible = PHASE0_TICKER_EVENTS.filter(e => e.turn <= absoluteTurn);

        // Sort: most recent turn first, then alphabetical text for determinism
        eligible.sort((a, b) => {
            if (b.turn !== a.turn) return b.turn - a.turn;
            return a.text < b.text ? -1 : a.text > b.text ? 1 : 0;
        });

        return eligible.slice(0, MAX_VISIBLE_EVENTS);
    }

    /**
     * Build the ticker string from a list of events and optional dynamic
     * game events (future use).
     */
    private buildTickerText(
        historicalEvents: TickerEvent[],
        gameEvents?: string[]
    ): string {
        const parts: string[] = [];

        // Interleave: historical first, then game events spliced in
        for (let i = 0; i < historicalEvents.length; i++) {
            parts.push(historicalEvents[i].text);
            // Insert a game event after every 2nd historical event
            if (gameEvents && gameEvents.length > 0 && (i + 1) % 2 === 0) {
                const ge = gameEvents.shift();
                if (ge) parts.push(ge);
            }
        }

        // Append any remaining game events
        if (gameEvents) {
            for (const ge of gameEvents) {
                parts.push(ge);
            }
        }

        // Trailing separator so the loop appears seamless
        return parts.join(HEADLINE_SEP) + HEADLINE_SEP;
    }

    /**
     * Generate dynamic war-event ticker strings for war phases.
     * Returns an empty array during Phase 0.
     */
    private generateWarEvents(gameState: GameState): string[] {
        const phase = gameState.meta.phase;
        if (!phase || phase === 'peace') return [];

        const playerFaction: FactionId =
            gameState.meta.player_faction ?? (gameState.factions[0]?.id as FactionId) ?? 'RBiH';
        const previousSnapshot = getPreviousSnapshot();
        const turnEvents = generateTurnEvents(gameState, previousSnapshot, playerFaction);
        return generateTickerWarEvents(turnEvents, playerFaction);
    }

    /**
     * Generate news headlines for the current game state.
     *
     * Phase 0: scripted historical events only.
     * War phases: dynamic events first, then scripted events fill remaining slots.
     */
    private generateHeadlines(gameState: GameState): string {
        const turn = gameState.meta.turn;
        const scriptedEvents = this.getEventsForTurn(turn);
        const warEvents = this.generateWarEvents(gameState);

        // If we have dynamic war events, they go first via buildTickerText interleaving
        if (warEvents.length > 0) {
            return this.buildTickerText(scriptedEvents, [...warEvents]);
        }

        if (scriptedEvents.length === 0) {
            return 'International situation developing...' + HEADLINE_SEP;
        }

        return this.buildTickerText(scriptedEvents);
    }

    /**
     * Update ticker content for a specific turn, with optional dynamic
     * game-generated event strings.  Can be called externally to refresh
     * the ticker without toggling visibility.
     */
    updateForTurn(currentTurn: number, gameEvents?: string[]): void {
        this.currentTurn = currentTurn;
        const events = this.getEventsForTurn(currentTurn);
        const text = this.buildTickerText(events, gameEvents ? [...gameEvents] : undefined);

        const content = document.getElementById('news-ticker-content');
        if (content) {
            content.textContent = text;
        }
    }

    /**
     * Show ticker with updated content
     */
    show(gameState: GameState) {
        if (!this.container) return;
        const playerFaction: FactionId =
            gameState.meta.player_faction ?? (gameState.factions[0]?.id as FactionId) ?? 'RBiH';
        const label = this.container.querySelector('.news-ticker-label');
        if (label) {
            label.textContent = getWarroomFactionIdentity(playerFaction).tickerLabel;
        }

        const content = document.getElementById('news-ticker-content');
        if (content) {
            content.textContent = this.generateHeadlines(gameState);
        }

        this.currentTurn = gameState.meta.turn;
        this.container.classList.add('active');
        this.isVisible = true;
    }

    /**
     * Hide ticker
     */
    hide() {
        if (!this.container) return;

        this.container.classList.remove('active');
        this.isVisible = false;
    }

    /**
     * Toggle ticker visibility
     */
    toggle(gameState: GameState) {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show(gameState);
        }
    }

    /**
     * Check if ticker is visible
     */
    isActive(): boolean {
        return this.isVisible;
    }
}
