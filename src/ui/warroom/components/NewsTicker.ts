/**
 * NewsTicker — Bottom scrolling news ticker for international events
 * Toggled by clicking the transistor radio
 */

import { GameState } from '../../../state/game_state.js';

export class NewsTicker {
    private container: HTMLElement | null = null;
    private isVisible: boolean = false;

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
        label.innerHTML = '🔴 LIVE';
        this.container.appendChild(label);

        // Content
        const content = document.createElement('div');
        content.className = 'news-ticker-content';
        content.id = 'news-ticker-content';
        this.container.appendChild(content);

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'news-ticker-close';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = () => this.hide();
        this.container.appendChild(closeBtn);

        document.body.appendChild(this.container);
    }

    /**
     * Generate news headlines
     */
    private generateHeadlines(gameState: GameState): string {
        const turn = gameState.meta.turn;

        // For MVP, use placeholder headlines
        // TODO: In future, pull from international events system
        const placeholderHeadlines = [
            'UN Security Council debates intervention in Balkans',
            'European Community recognizes Bosnia-Herzegovina independence',
            'NATO considers air strikes to protect humanitarian corridors',
            'International aid convoy arrives in Sarajevo',
            'Diplomatic efforts continue in Geneva',
            'UNPROFOR peacekeepers deploy to region',
            'International observers monitor ceasefire violations'
        ];

        if (turn === 0) {
            return 'Breaking: Yugoslavia faces growing tensions ... ' +
                   'International community monitors situation closely ... ' +
                   'Diplomatic efforts underway to prevent escalation ... ' +
                   placeholderHeadlines.join(' ... ') + ' ... ';
        }

        return `Week ${turn} International News ... ` +
               placeholderHeadlines.join(' ... ') + ' ... ';
    }

    /**
     * Show ticker with updated content
     */
    show(gameState: GameState) {
        if (!this.container) return;

        const content = document.getElementById('news-ticker-content');
        if (content) {
            content.textContent = this.generateHeadlines(gameState);
        }

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
