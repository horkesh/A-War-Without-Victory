/**
 * DeclarationEventModal — Full-screen dramatic modal for critical Phase 0 events.
 *
 * Events: RS declaration, HRHB declaration, Referendum held, War begins.
 * Dark overlay, large centered text, faction crest, dramatic typography.
 * "ACKNOWLEDGE" button blocks until dismissed.
 *
 * Uses CSS classes from modals.css (decl-*) for ops-center consistent styling.
 */

import type { FactionId, GameState, Phase0Event } from '../../../state/game_state.js';
import type { PreviousTurnSnapshot } from '../data/warroom_state.js';

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
    rbih_hrhb_war_begins: (_event, _pf) => ({
        title: 'WAR BETWEEN ALLIES',
        subtitle: 'Alliance collapses — Croat-Bosniak conflict begins',
        body: 'The fragile alliance between Army of RBiH and HVO has shattered. Former allies now face each other across new battle lines.',
        color: '#ff3d00',
        bgOverlay: 'rgba(255, 0, 0, 0.08)',
    }),
    ceasefire_declared: (_event, _pf) => ({
        title: 'CEASEFIRE DECLARED',
        subtitle: 'Bosniak-Croat ceasefire takes effect',
        body: 'After months of fighting, both sides have agreed to cease hostilities. The ceasefire marks a turning point in the conflict.',
        color: '#00e878',
        bgOverlay: 'rgba(0, 232, 120, 0.08)',
    }),
    washington_agreement: (_event, _pf) => ({
        title: 'WASHINGTON AGREEMENT SIGNED',
        subtitle: 'Federation of Bosnia and Herzegovina established',
        body: 'The Washington Agreement creates a Bosniak-Croat federation, ending the war between former allies and uniting them against the VRS.',
        color: '#00e878',
        bgOverlay: 'rgba(0, 232, 120, 0.08)',
    }),
    exhaustion_critical: (_event, _pf) => ({
        title: 'FORCES REACHING BREAKING POINT',
        subtitle: 'Exhaustion exceeds critical threshold',
        body: 'The sustained tempo of operations has pushed forces beyond sustainable limits. Continued fighting risks complete organizational collapse.',
        color: '#ff3d00',
        bgOverlay: 'rgba(255, 61, 0, 0.08)',
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
 * Check if the game just transitioned to Peace phase (war begins).
 */
export function checkWarTransition(prevPhase: string | undefined, nextPhase: string | undefined): boolean {
    return prevPhase === 'peace' && nextPhase === 'war';
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

/**
 * Check for war-phase milestone events by comparing current state against previous snapshot.
 * Returns the event key string if a milestone was reached, null otherwise.
 * Priority: ceasefire/washington > alliance war > exhaustion critical > encirclement
 */
export function findWarMilestoneEvent(
    state: GameState,
    previousSnapshot: PreviousTurnSnapshot | null,
    playerFaction: FactionId,
): string | null {
    if (!previousSnapshot) return null;

    const rhs = state.political.rbih_hrhb_state;

    // Washington agreement just signed
    if (rhs?.washington_signed && !previousSnapshot.washingtonSigned) {
        return 'washington_agreement';
    }

    // Ceasefire just started
    if (rhs?.ceasefire_active && !previousSnapshot.ceasefireActive) {
        return 'ceasefire_declared';
    }

    // Alliance war started (alliance crossed below 0)
    const oldAlliance = previousSnapshot.allianceValue;
    const newAlliance = state.political.war_alliance_rbih_hrhb ?? null;
    if (oldAlliance != null && newAlliance != null && oldAlliance >= 0 && newAlliance < 0) {
        return 'rbih_hrhb_war_begins';
    }

    // Exhaustion crossed 75% for player faction
    const oldExhaustion = (previousSnapshot.exhaustion[playerFaction] ?? 0) * 100;
    const newExhaustion = ((state.political.war_exhaustion?.[playerFaction]) ?? 0) * 100;
    if (oldExhaustion < 75 && newExhaustion >= 75) {
        return 'exhaustion_critical';
    }

    return null;
}
