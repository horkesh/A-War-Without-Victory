/**
 * DeclarationEventModal — Full-screen dramatic modal for critical Phase 0 events.
 *
 * Events: RS declaration, HRHB declaration, Referendum held, War begins.
 * Dark overlay, large centered text, faction crest, dramatic typography.
 * "ACKNOWLEDGE" button blocks until dismissed.
 *
 * Uses CSS classes from modals.css (decl-*) for ops-center consistent styling.
 */

import type { FactionId, Phase0Event } from '../../../state/game_state.js';

interface DeclarationDisplay {
    title: string;
    subtitle: string;
    body: string;
    color: string;
    bgOverlay: string;
}

const EVENT_DISPLAYS: Record<string, (event: Phase0Event, playerFaction: FactionId) => DeclarationDisplay> = {
    declaration_RS: (_event, _pf) => ({
        title: 'REPUBLIKA SRPSKA',
        subtitle: 'HAS BEEN PROCLAIMED',
        body: 'The Assembly of the Serbian People in Bosnia and Herzegovina has declared the establishment of a sovereign Serbian entity. The political landscape has fundamentally changed.',
        color: '#ff3d00',
        bgOverlay: 'rgba(100, 20, 20, 0.4)',
    }),
    declaration_HRHB: (_event, _pf) => ({
        title: 'HERCEG-BOSNA',
        subtitle: 'HAS BEEN ESTABLISHED',
        body: 'The Croatian Defence Council has proclaimed the Croatian Community of Herceg-Bosna as an autonomous political entity. Relations between the communities will never be the same.',
        color: '#00bcd4',
        bgOverlay: 'rgba(20, 50, 100, 0.4)',
    }),
    referendum_held: (_event, pf) => ({
        title: 'REFERENDUM HELD',
        subtitle: 'THE PEOPLE HAVE VOTED',
        body: pf === 'RS'
            ? 'Despite the Serbian boycott, a referendum on independence has been held. The results are foregone. War draws closer.'
            : 'Citizens have voted overwhelmingly for independence. International recognition will follow, but so will the consequences.',
        color: '#ffab00',
        bgOverlay: 'rgba(80, 60, 10, 0.4)',
    }),
    war_begins: (_event, _pf) => ({
        title: 'THE WAR HAS BEGUN',
        subtitle: 'APRIL 1992',
        body: 'Armed conflict has erupted across Bosnia and Herzegovina. The pre-war period is over. What follows will test every decision you have made.',
        color: '#ff3d00',
        bgOverlay: 'rgba(100, 0, 0, 0.5)',
    }),
};

/**
 * Check Phase 0 events for critical events that warrant a full-screen modal.
 * Returns the most critical event to display, or null if none.
 */
export function findCriticalEvent(events: Phase0Event[]): Phase0Event | null {
    // Priority: war_begins > declaration > referendum_held
    for (const ev of events) {
        if (ev.type === 'declaration') return ev;
    }
    for (const ev of events) {
        if (ev.type === 'referendum_held') return ev;
    }
    return null;
}

/**
 * Check if the game just transitioned to Phase I (war begins).
 */
export function checkWarTransition(prevPhase: string | undefined, nextPhase: string | undefined): boolean {
    return prevPhase === 'phase_0' && nextPhase === 'phase_i';
}

/**
 * Show a full-screen declaration event modal.
 * Returns a Promise that resolves when the user acknowledges.
 */
export function showDeclarationModal(event: Phase0Event, playerFaction: FactionId): Promise<void> {
    return new Promise((resolve) => {
        const key = event.type === 'declaration'
            ? `declaration_${event.faction}`
            : event.type;

        const displayFn = EVENT_DISPLAYS[key];
        if (!displayFn) {
            resolve();
            return;
        }

        const display = displayFn(event, playerFaction);

        // Create overlay using CSS class
        const overlay = document.createElement('div');
        overlay.className = 'decl-overlay';
        overlay.style.background = display.bgOverlay;

        // Content
        const content = document.createElement('div');
        content.className = 'decl-content';

        // Title
        const title = document.createElement('div');
        title.className = 'decl-title';
        title.style.color = display.color;
        title.textContent = display.title;

        // Subtitle
        const subtitle = document.createElement('div');
        subtitle.className = 'decl-subtitle';
        subtitle.textContent = display.subtitle;

        // Divider
        const divider = document.createElement('hr');
        divider.className = 'decl-divider';
        divider.style.color = display.color;

        // Body
        const body = document.createElement('div');
        body.className = 'decl-body';
        body.textContent = display.body;

        // Acknowledge button
        const ackBtn = document.createElement('button');
        ackBtn.className = 'decl-btn';
        ackBtn.style.color = display.color;
        ackBtn.textContent = 'ACKNOWLEDGE';
        ackBtn.onmouseenter = () => {
            ackBtn.style.background = display.color;
            ackBtn.style.color = 'white';
        };
        ackBtn.onmouseleave = () => {
            ackBtn.style.background = 'transparent';
            ackBtn.style.color = display.color;
        };
        ackBtn.onclick = () => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
                resolve();
            }, 500);
        };

        content.appendChild(title);
        content.appendChild(subtitle);
        content.appendChild(divider);
        content.appendChild(body);
        content.appendChild(ackBtn);
        overlay.appendChild(content);
        document.body.appendChild(overlay);

        // Fade in
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });
    });
}

/**
 * Show the "War Begins" transition modal.
 */
export function showWarBeginsModal(playerFaction: FactionId): Promise<void> {
    const warEvent: Phase0Event = {
        type: 'war_begins',
        turn: 0,
        details: {},
    };

    // Use the war_begins display
    return new Promise((resolve) => {
        const display = EVENT_DISPLAYS['war_begins']!(warEvent, playerFaction);

        const overlay = document.createElement('div');
        overlay.className = 'decl-overlay';
        overlay.style.background = display.bgOverlay;
        overlay.style.transition = 'opacity 1.2s ease-in';

        const content = document.createElement('div');
        content.className = 'decl-content';

        const title = document.createElement('div');
        title.className = 'decl-title';
        title.style.color = display.color;
        title.style.fontSize = '38px';
        title.style.letterSpacing = '12px';
        title.textContent = display.title;

        const subtitle = document.createElement('div');
        subtitle.className = 'decl-subtitle';
        subtitle.style.fontSize = '16px';
        subtitle.style.letterSpacing = '6px';
        subtitle.textContent = display.subtitle;

        const body = document.createElement('div');
        body.className = 'decl-body';
        body.textContent = display.body;

        const ackBtn = document.createElement('button');
        ackBtn.className = 'decl-btn';
        ackBtn.style.color = display.color;
        ackBtn.textContent = 'CONTINUE';
        ackBtn.onmouseenter = () => {
            ackBtn.style.background = display.color;
            ackBtn.style.color = 'white';
        };
        ackBtn.onmouseleave = () => {
            ackBtn.style.background = 'transparent';
            ackBtn.style.color = display.color;
        };
        ackBtn.onclick = () => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
                resolve();
            }, 800);
        };

        content.appendChild(title);
        content.appendChild(subtitle);
        content.appendChild(body);
        content.appendChild(ackBtn);
        overlay.appendChild(content);
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });
    });
}
