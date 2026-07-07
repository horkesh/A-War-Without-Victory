import type { MessageKey } from '../../i18n';

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
 *   05 decide    ->  Decide       - President's Desk pre-advance review
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
    titleKey: MessageKey;
    bodyKey: MessageKey;
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
        title: 'A War You Cannot Win',
        titleKey: 'onboarding.01.title',
        bodyKey: 'onboarding.01.body',
        body: "You are the president of a country at war, not a conqueror chasing a map. There is no victory screen here. This war is negative-sum: it can only be survived, ended, or made worse. Your task is to author how the tragedy unfolds — and how heavy a price it leaves behind.",
        target_ui_element: null,
    },
    {
        id: '02_map',
        title: 'The Map Is Not the Score',
        titleKey: 'onboarding.02.title',
        bodyKey: 'onboarding.02.body',
        body: 'Faction colors show political control; front edges mark where your forces meet the enemy. But do not play for the map. Over years of fighting the front can barely move while the country empties out — hundreds of thousands displaced to shift the line a few settlements. Land is not the scoreboard.',
        target_ui_element: 'map-container',
    },
    {
        id: '03_brief',
        title: 'The Brief',
        titleKey: 'onboarding.03.title',
        bodyKey: 'onboarding.03.body',
        body: "The field toolbar keeps map inspection close: WAR MAP gives the field situation, RECORDS opens the Army HQ records view, and CODEX keeps historical context close. Read the desk packet first; the President's Desk is where inspection becomes action.",
        target_ui_element: 'presidential-toolbar',
    },
    {
        id: '04_inspect',
        title: 'Inspect Before You Decide',
        titleKey: 'onboarding.04.title',
        bodyKey: 'onboarding.04.body',
        body: 'The Warroom status bar shows the current phase, priorities, and pending reviews. The priority docket lists what your staff flags as urgent. Open Army HQ to drill into corps readiness, supply, and command friction before you commit.',
        target_ui_element: 'warroom-status-bar',
    },
    {
        id: '05_decide',
        title: "President's Desk",
        titleKey: 'onboarding.05.title',
        bodyKey: 'onboarding.05.body',
        body: "Before you advance the turn, the President's Desk surfaces every pending choice. Each row opens its resolver or the staff panel it came from -- open it, decide, return. Resolve what you can; defer what you must.",
        target_ui_element: 'decision-room',
    },
    {
        id: '06_execute',
        title: 'Operations',
        titleKey: 'onboarding.06.title',
        bodyKey: 'onboarding.06.body',
        body: "You command through your generals, not over individual units. You never push brigades yourself — every assault flows through a corps operation. Your commanders propose operations; you approve, decline, or force-launch over their judgment at the cost of command authority. You set direction and bear the consequences; they fight the battle.",
        target_ui_element: 'army-hq-tab-briefing',
    },
    {
        id: '07_report',
        title: 'Advance and Read the Aftermath',
        titleKey: 'onboarding.07.title',
        bodyKey: 'onboarding.07.body',
        body: 'When you advance the turn, the war moves forward by one week. The aftermath panel reports what changed: battles fought, ground won or lost, casualties, the displaced, command outcomes. Read it — the human cost is part of the record, not a footnote. The next turn begins with the consequences of this one.',
        target_ui_element: 'advance-turn-button',
    },
    {
        id: '08_judge',
        title: 'The Cost Ledger Is the Scoreboard',
        titleKey: 'onboarding.08.title',
        bodyKey: 'onboarding.08.body',
        body: 'The war-cost ledger is your real scoreboard, not the map. Seizing territory can lower your final grade; the displaced and the exhausted weigh against you, and atrocity taints the verdict permanently — it is never rewarded. When diplomacy finally forces a settlement, hard-won leverage and human cost decide how history judges your presidency.',
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
