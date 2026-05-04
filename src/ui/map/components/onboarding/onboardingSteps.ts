/**
 * v0.9.2 tutorial onboarding — 8-step campaign-loop content (LANE-NIGHTSHIFT-TUTORIAL-CONTENT-V1).
 *
 * The eight steps map 1:1 to the v0.9 presidential campaign loop documented in
 * `docs/plans/2026-04-30-v09-presidential-campaign-loop-closure-plan.md`:
 *
 *   01 welcome   →  player identity (Brief / context)
 *   02 map       →  inspect surface (Map)
 *   03 brief     →  Brief        — Army HQ briefing toolbar entry
 *   04 inspect   →  Inspect      — Warroom status bar + priority docket
 *   05 decide    →  Decide       — Decision Room pre-advance review
 *   06 execute   →  Execute      — Operations approve / decline / force-launch
 *   07 report    →  Report       — Turn aftermath, what changed
 *   08 judge     →  Judge        — Cost Ledger, why your choices mattered
 *
 * Body voice follows the CoS-briefing precedent in
 * `docs/plans/2026-03-25-letter-home-and-essay-authoring-spec.md` —
 * concise, professional, declarative. 30–60 words per step.
 *
 * **Determinism:** ordering is sorted by `id` lexicographically. The numeric
 * `01_…08_` prefix is deliberately stable so lexicographic sort matches the
 * authored loop order across save/load and JSON round-trips.
 *
 * **Faction-agnostic:** copy never names a faction; player faction is parametric.
 *
 * **Single-owner contract:** this file is the canonical step list. UI
 * components import from here; IPC handlers identify steps by `id`.
 */

export interface OnboardingStepDef {
    /**
     * Stable, deterministic identifier (lower_snake_case with `NN_` prefix so
     * lexicographic sort matches authored loop order). Persisted in
     * `meta.tutorial_state.completed_steps`.
     */
    id: string;
    /** Short title shown at top of overlay panel. */
    title: string;
    /** Body prose, CoS-briefing voice, 30–60 words. */
    body: string;
    /**
     * UI element identifier for spotlight rendering. Components mark themselves
     * with `data-tutorial-step="<step_id>"` so the overlay can locate the
     * target without coupling to a CSS selector taxonomy.
     *
     * `null` is reserved for steps that spotlight the overlay itself (welcome).
     */
    target_ui_element: string | null;
}

/**
 * Authored step list. Authored in loop order; the exported `ONBOARDING_STEPS`
 * is sorted by `id` to make ordering trivially deterministic and resilient to
 * future reorder edits.
 */
const AUTHORED_STEPS: ReadonlyArray<OnboardingStepDef> = [
    {
        id: '01_welcome',
        title: 'You Are the President',
        body: 'You are the unnamed political leader of your faction in the 1992–1995 Bosnian War. This is a negative-sum war: you cannot win by conquest. You command through institutions, not in spite of them. Each turn is one week. Your job is to choose how to lose less.',
        target_ui_element: null,
    },
    {
        id: '02_map',
        title: 'Reading the Map',
        body: 'Faction colors show political control. Front edges mark where your forces meet the enemy. Click a settlement to inspect it; click a front edge to inspect the sector. The map is a record, not a control panel — orders flow through your staff.',
        target_ui_element: 'map-container',
    },
    {
        id: '03_brief',
        title: 'The Brief',
        body: 'Each turn opens with your staff brief. Strategic priorities, command authority, and the morning report sit on the toolbar. RECORDS opens Army HQ. SUMMARY gives you the field situation. Read first; decide second.',
        target_ui_element: 'presidential-toolbar',
    },
    {
        id: '04_inspect',
        title: 'Inspect Before You Decide',
        body: 'The Warroom status bar shows the current phase, priorities, and pending reviews. The priority docket lists what your staff flags as urgent. Open Army HQ to drill into corps readiness, supply, and command friction before you commit.',
        target_ui_element: 'warroom-status-bar',
    },
    {
        id: '05_decide',
        title: 'The Decision Room',
        body: 'Before you advance the turn, the Decision Room surfaces every pending choice: command friction, peace plans, opportunity dossiers. Source handoffs route you back to the originating panel. Resolve what you can; defer what you must.',
        target_ui_element: 'decision-room',
    },
    {
        id: '06_execute',
        title: 'Operations',
        body: 'Your corps commanders propose operations. Approve to authorize, decline to refuse, or force-launch to spend command authority and override their judgment. Brigades never attack alone — every assault flows through a corps operation.',
        target_ui_element: 'army-hq-tab-briefing',
    },
    {
        id: '07_report',
        title: 'Advance and Read the Aftermath',
        body: 'When you advance the turn, the war moves forward by one week. The aftermath panel reports what changed: battles fought, ground gained or lost, casualties, command outcomes. Read it. The next turn begins with the consequences of this one.',
        target_ui_element: 'advance-turn-button',
    },
    {
        id: '08_judge',
        title: 'The Cost Ledger',
        body: 'The Cost Ledger remembers. Every approved operation, every override, every refusal accrues. At the end of the war, the verdict compares your choices against history. There is no winner here — only how heavy the cost, and on whom it fell.',
        target_ui_element: 'cost-ledger',
    },
];

/**
 * Deterministic comparator: byte-stable lexicographic sort by `id`. Exported
 * so tests can assert ordering without re-implementing the contract.
 */
export function compareStepsById(a: OnboardingStepDef, b: OnboardingStepDef): number {
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
}

/**
 * Canonical step list — sorted by id. Read-only; do NOT mutate at runtime.
 * UI components import this; IPC handlers identify steps by `id`.
 */
export const ONBOARDING_STEPS: ReadonlyArray<OnboardingStepDef> =
    Object.freeze([...AUTHORED_STEPS].sort(compareStepsById));

/**
 * Spotlight target tokens recognized by the overlay. A step's
 * `target_ui_element` must be either `null` (overlay-self spotlight, e.g.
 * welcome) or one of these tokens.
 *
 * The matching component renders `data-tutorial-step="<token>"` on its root.
 */
export const TUTORIAL_SPOTLIGHT_TARGETS: ReadonlyArray<string> = Object.freeze([
    'map-container',
    'presidential-toolbar',
    'warroom-status-bar',
    'decision-room',
    'army-hq-tab-briefing',
    'advance-turn-button',
    'cost-ledger',
]);

/**
 * Resolve the next step id given the currently completed list.
 *
 * Returns the first step in `ONBOARDING_STEPS` whose id is not yet in
 * `completed`. Returns `null` once all steps are completed.
 *
 * Deterministic: linear scan of the sorted list; no randomness, no clock.
 */
export function resolveNextStep(completed: ReadonlyArray<string>): OnboardingStepDef | null {
    const completedSet = new Set(completed);
    for (const step of ONBOARDING_STEPS) {
        if (!completedSet.has(step.id)) return step;
    }
    return null;
}
