/**
 * v0.9.2 tutorial onboarding skeleton — step seed list.
 *
 * LANE-NIGHTSHIFT-ROUND2-TUTORIAL-ONBOARDING-SKELETON.
 *
 * Determinism: ordering is by array index (no Math.random, no Date sorting).
 * This is the SKELETON — content beyond placeholders is owned by /narrative-designer.
 * Faction-agnostic: tutorial does not depend on `meta.player_faction`.
 *
 * Single-owner contract: this file is the canonical step list. UI components
 * import it; IPC handlers identify steps by `id`.
 */

export interface OnboardingStepDef {
    /** Stable, deterministic identifier (lower_snake_case). Persisted in `meta.tutorial_state.completed_steps`. */
    id: string;
    /** Short title shown at top of overlay panel. */
    title: string;
    /** Body prose. Placeholder copy — final wording to be authored by /narrative-designer. */
    body: string;
    /**
     * Optional UI element selector or token a future highlight pass can target.
     * Skeleton does NOT yet wire highlights — present so /narrative-designer can plan.
     */
    target_ui_element?: string;
}

/**
 * Seed step list. Three placeholders. Order is deterministic by array index.
 * Do NOT mutate at runtime; treat as read-only.
 */
export const ONBOARDING_STEPS: ReadonlyArray<OnboardingStepDef> = [
    {
        id: 'welcome',
        title: 'Welcome to AWWV',
        body: 'You are the unnamed political leader of one of three factions in the 1992-1995 Bosnian War. This is a negative-sum war — you cannot win by conquest. You can only choose how to lose less. (Placeholder copy — narrative pass pending.)',
    },
    {
        id: 'the_map',
        title: 'The Map',
        body: 'The map shows operational settlements (OSIDs), front lines, and political control. Click a settlement to inspect it; click a front edge to inspect the sector. (Placeholder copy — narrative pass pending.)',
        target_ui_element: 'map-container',
    },
    {
        id: 'first_turn',
        title: 'Your First Turn',
        body: 'Each turn is one week. Issue orders, then advance. Your corps commanders will interpret your intent — they will not always obey. (Placeholder copy — narrative pass pending.)',
        target_ui_element: 'advance-turn-button',
    },
];

/**
 * Resolve the next step id given the currently completed list.
 * Returns the first step in `ONBOARDING_STEPS` whose id is not yet in `completed`.
 * Returns `null` once all steps are completed.
 *
 * Deterministic: linear scan in array order; no randomness, no clock.
 */
export function resolveNextStep(completed: ReadonlyArray<string>): OnboardingStepDef | null {
    const completedSet = new Set(completed);
    for (const step of ONBOARDING_STEPS) {
        if (!completedSet.has(step.id)) return step;
    }
    return null;
}
