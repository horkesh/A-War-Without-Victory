/**
 * Tutorial objective definitions — learn-by-doing objectives for new players.
 *
 * Each objective has a check function that evaluates against game state or
 * player actions. Objectives unlock sequentially (next appears when current
 * completed).
 *
 * Deterministic: pure function checks, no randomness.
 */

import type { GameState } from '../../state/game_state.js';

export interface TutorialObjective {
    id: string;
    title: string;
    description: string;
    turnHint: number;
    /** Action name that auto-completes this objective when fired from UI. */
    actionTrigger?: string;
    /** State check that completes this objective. */
    stateCheck?: (state: GameState) => boolean;
    /** CSS selector for the UI element to highlight. */
    highlightSelector?: string;
}

export interface TutorialState {
    completedObjectives: string[];
    currentObjectiveIndex: number;
    dismissed: boolean;
}

export const TUTORIAL_OBJECTIVES: readonly TutorialObjective[] = [
    {
        id: 'review_forces',
        title: 'Review Your Forces',
        description: 'Open the ORBAT sidebar to see your brigades and corps structure.',
        turnHint: 1,
        actionTrigger: 'orbat_opened',
        highlightSelector: '[data-tutorial="orbat-button"]',
    },
    {
        id: 'check_frontline',
        title: 'Check the Front Line',
        description: 'Switch to Political map mode to see which faction controls each territory.',
        turnHint: 1,
        actionTrigger: 'map_mode_changed',
        highlightSelector: '[data-tutorial="map-mode-political"]',
    },
    {
        id: 'read_briefing',
        title: 'Read Your Briefing',
        description: 'After advancing a turn, read the command briefing to understand the situation.',
        turnHint: 2,
        actionTrigger: 'briefing_dismissed',
    },
    {
        id: 'set_corps_stance',
        title: 'Set Corps Stance',
        description: 'Open a corps and set its stance to Defensive to protect your positions.',
        turnHint: 2,
        actionTrigger: 'corps_stance_changed',
    },
    {
        id: 'fortify_sarajevo',
        title: 'Fortify Sarajevo',
        description: 'Find the Sarajevo sector and set its stance to Fortify for maximum entrenchment.',
        turnHint: 3,
        actionTrigger: 'sector_stance_changed',
    },
    {
        id: 'check_supply',
        title: 'Check Supply Lines',
        description: 'Switch to Supply map mode to see which areas are well-supplied and which are cut off.',
        turnHint: 4,
        actionTrigger: 'map_mode_supply',
        highlightSelector: '[data-tutorial="map-mode-supply"]',
    },
    {
        id: 'launch_operation',
        title: 'Plan an Operation',
        description: 'Open a corps, go to the Operations tab, and prepare an operation against an enemy target.',
        turnHint: 5,
        actionTrigger: 'operation_planned',
    },
    {
        id: 'respond_to_event',
        title: 'Respond to Events',
        description: 'When a decision event appears, read the options carefully and make your choice.',
        turnHint: 7,
        actionTrigger: 'event_decision_made',
    },
    {
        id: 'check_diplomacy',
        title: 'Review Diplomatic Pressure',
        description: 'Open the War Summary and check the Capital tab to see your negotiation position.',
        turnHint: 8,
        actionTrigger: 'summary_capital_opened',
    },
    {
        id: 'consult_advisor',
        title: 'Ask Your Advisor',
        description: 'Open the AI Advisor panel for strategic recommendations. Works without API key too.',
        turnHint: 9,
        actionTrigger: 'advisor_opened',
    },
    {
        id: 'survive',
        title: 'Survive',
        description: 'Hold Sarajevo and reach the end of the tutorial. The war is far from over...',
        turnHint: 10,
        stateCheck: (state) => (state.meta?.turn ?? 0) >= 10,
    },
];

/**
 * Get the current active objective for a tutorial state.
 */
export function getCurrentObjective(tutState: TutorialState): TutorialObjective | null {
    if (tutState.dismissed) return null;
    if (tutState.currentObjectiveIndex >= TUTORIAL_OBJECTIVES.length) return null;
    return TUTORIAL_OBJECTIVES[tutState.currentObjectiveIndex] ?? null;
}

/**
 * Check if an action completes the current objective.
 * Returns the updated tutorial state if completed, null otherwise.
 */
export function checkObjectiveCompletion(
    tutState: TutorialState,
    action: string,
    state: GameState,
): TutorialState | null {
    const current = getCurrentObjective(tutState);
    if (!current) return null;

    const completed =
        (current.actionTrigger && action === current.actionTrigger) ||
        (current.stateCheck && current.stateCheck(state));

    if (!completed) return null;

    return {
        ...tutState,
        completedObjectives: [...tutState.completedObjectives, current.id],
        currentObjectiveIndex: tutState.currentObjectiveIndex + 1,
    };
}

/**
 * Create initial tutorial state.
 */
export function createTutorialState(): TutorialState {
    return {
        completedObjectives: [],
        currentObjectiveIndex: 0,
        dismissed: false,
    };
}
