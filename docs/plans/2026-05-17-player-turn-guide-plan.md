# Player's Turn Guide Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Author a player-facing Turn Guide, sited under `docs/10_canon/`, that documents — per turn phase — what the player sees, decides, and what the engine resolves automatically. The Guide closes the loop between the recently shipped Presidential Decision Room, pre-advance review, Warroom priority pulse, Decision Room command-loop lanes, and the Product Loop heartbeat, and the canonical pipeline step lists in `peace_phases.ts` / `early_war_phases.ts` / `war_phases.ts`.

**Architecture:** Documentation-first. The Guide is a Rulebook sibling, not a Game Bible rewrite, and not a UI spec. It projects existing canon (Rulebook v0.9.0, Phase Specifications v0.9.0, Systems Manual v0.9.0) and the existing read models (`presidentialDecisionRoom.ts`, `preAdvanceCommandReview.ts`, `warroomPriorityDocket.ts`) into a player-actionable per-phase table. No code, no schema, no scenario change.

**Tech Stack:** Markdown only. No runtime, no tests against simulation behavior. Optional Vitest only for a tiny doc-presence assertion if reviewers request one.

---

## Scope

In scope:

- New canon-adjacent doc at `docs/10_canon/PLAYER_TURN_GUIDE.md`.
- Per-phase mapping of player-visible surfaces, decisions, automated resolution, and the six valid tactical levers.
- Player-faction-aware sections (RBiH / RS / HRHB).
- Cross-references to existing Decision Room / Warroom / pre-advance reports.
- Game Designer + UX writer + Historian review pass.

Out of scope:

- In-game tooltips and coachmarks (separate UI plan).
- Cinematic intro / verdict screen (separate cinematic plan).
- Any change to engine, pipeline ordering, scenario data, save schema, or canon hierarchy doc set.
- Any new tactical lever, posture, or operation type. The six valid levers are fixed by canon.
- Edits to `docs/10_canon/FORAWWV.md`. Flag for manual review only.

## Canon Hygiene Pre-Read

Before drafting, the implementer must re-read and align with:

- `docs/10_canon/Rulebook_v0_9_0.md` (turn unit = 1 week; command hierarchy Theatre -> Army -> Corps -> Brigade; posture set; reserve rule; control-change mechanisms).
- `docs/10_canon/Phase_Specifications_v0_9_0.md` (canonical phase definitions).
- `docs/10_canon/Systems_Manual_v0_9_0.md` (resolution order, dependencies).
- `docs/10_canon/Engine_Invariants_v0_9_0.md` (anything player guidance must not contradict).

Canon hierarchy: Engine Invariants > Phase Specs > Systems Manual > Rulebook > Game Bible. The Player Turn Guide sits **below Rulebook** as a derived player document. If any conflict is found between current shipped UI and canon, **the Guide records the canon line and flags the UI discrepancy in the report**; it does not invent a new rule.

## Task 1: Phase Inventory (Peace and War)

**Files:**

- Create: `docs/10_canon/PLAYER_TURN_GUIDE.md` (skeleton + Task 1 table only).
- Inspect: `src/sim/turn_phases/early_war_phases.ts`
- Inspect: `src/sim/turn_phases/war_phases.ts`
- Inspect: `src/sim/turn_phases/war_phase_briefing_steps.ts`
- Inspect: `src/sim/turn_phases/war_phase_negotiation_steps.ts`
- Inspect: `src/sim/turn_phases/war_phase_reconciliation_steps.ts`

**Steps:**

1. From the source files above, list every `name: '<step>'` literal as the canonical pipeline step name (the Guide must use these exact strings — do not paraphrase).
2. Group steps into player-meaningful phase bands. Recommended bands:
   - Peace / Early War: events -> militia / pools -> corps activation -> early posture -> early flips -> displacement -> authority / JNA transition.
   - War — Start of Turn: `initialize` -> snapshots -> event readiness -> `evaluate-events`.
   - War — Operational Setup: dimension bases -> fronts / sectors -> supply -> spatial context.
   - War — Decisions: AI army / corps / dispatches -> Decision Room read-model build -> bot stance + opportunity proposals -> player commands.
   - War — Resolution: posture costs -> `resolve-attack-orders` -> casualty / displacement / morale -> operation result attribution.
   - War — Aftermath: alliance update -> washington / ceasefire / storm checks -> recruitment / mobilization -> war stories -> exhaustion -> negotiation pressure -> `clear-displacement-event-log`.
3. Produce one table with columns: `Phase Band | Canonical Pipeline Step | Player-Visible? | Notes`. Use only `Yes / No / Indirect` for the visibility column; never invent player actions that no surface today exposes.

**Acceptance:** Every `name:` literal from the four source files appears exactly once in the table, in canonical order. Visibility is conservative — if no shipped UI surfaces the step today, the row is `No` or `Indirect`.

**Stop gate:** If a step name in the Guide cannot be matched to a literal in source, stop and reconcile before adding it.

## Task 2: Per-Phase Player Surface

**Files:**

- Modify: `docs/10_canon/PLAYER_TURN_GUIDE.md` (add Task 2 section).
- Inspect: `src/ui/map/data/presidentialDecisionRoom.ts`
- Inspect: `src/ui/map/data/preAdvanceCommandReview.ts`
- Inspect: `src/ui/map/data/warroomPriorityDocket.ts`
- Inspect: `docs/40_reports/implemented/20260502_DECISION_ROOM_COMMAND_LOOP_LANES.md`
- Inspect: `docs/40_reports/implemented/20260515_DECISION_ROOM_PRODUCT_LOOP_HEARTBEAT.md`
- Inspect: `docs/40_reports/implemented/20260502_PRE_ADVANCE_COMMAND_REVIEW.md`
- Inspect: `docs/40_reports/implemented/20260502_PRESIDENTIAL_DECISION_ROOM_STRATEGIC_PRIORITIES.md`
- Inspect: `docs/40_reports/implemented/20260502_DECISION_ROOM_PRIORITY_LENSES.md`
- Inspect: `docs/40_reports/implemented/20260502_DECISION_ROOM_SOURCE_HANDOFFS.md`
- Inspect: `docs/40_reports/implemented/20260502_DECISION_ROOM_PRIORITY_DOSSIER.md`

**Steps:**

1. For each phase band from Task 1, document a three-column entry: `What the player sees | What the player can decide | What the engine resolves automatically`.
2. "What the player sees" must reference real shipped surfaces only:
   - Decision Room **Command Loop lanes** (Urgent / Decisions / Fronts / Inspect / Advance).
   - Decision Room **Product Loop heartbeat** (`Brief -> Inspect -> Decide -> Execute -> Report -> Cost -> Judge -> Next`).
   - Decision Room **priority lenses / source handoffs / priority dossier**.
   - Warroom **priority docket / priority pulse**.
   - Pre-advance command review modal rows.
   - Army HQ BRIEFING tab and existing Chronicle / Turn Aftermath surfaces.
3. "What the player can decide" must be expressible as one of the six valid tactical levers (Task 3). If a phase has no available player decision, the cell reads `None — observation only`.
4. "What the engine resolves automatically" cites canonical pipeline step names from Task 1.
5. No invented surface, no future-tense UI. If a step has no shipped surface, mark as `Indirect (visible only through end-of-turn report)`.

**Acceptance:** Every "see" cell points to an existing read-model file or implemented report. Every "decide" cell maps to a Task 3 lever or `None`. Every "engine resolves" cell uses Task 1's canonical step strings.

## Task 3: Tactical Lever Map

**Files:**

- Modify: `docs/10_canon/PLAYER_TURN_GUIDE.md` (add Task 3 section).
- Inspect: Rulebook §5 (posture set), Systems Manual sections on stance / OPSEC / logistics priority.

**Steps:**

1. Document the **six valid tactical levers** as canon-fixed:
   1. Corps stance.
   2. Sector stance.
   3. Ops planning (corps-authorized; brigades never attack independently).
   4. Logistics priority.
   5. OPSEC.
   6. Sector override.
2. For each lever, document:
   - Where it is set in the UI (Decision Room lane / Warroom panel / source-of-truth tab).
   - Which pipeline step **consumes** it (use Task 1 names — e.g. `apply-sector-stance-orders`, `resolve-attack-orders`).
   - Which pipeline step **resolves** its effect.
   - The canon line that authorizes it (cite Rulebook section).
3. State explicitly: "Brigades never attack independently. All attacks flow through CorpsOperation." (Canon.)
4. State explicitly: initial OSID political control is sacrosanct and is **not** a player lever. Reference Rulebook §4.

**Acceptance:** Six levers, six rows, every row anchored to a canon section and a canonical pipeline step. No seventh lever introduced. No mention of `avoided_osids_by_faction` or any banned override.

## Task 4: Player-Faction-Aware Sections

**Files:**

- Modify: `docs/10_canon/PLAYER_TURN_GUIDE.md` (add three subsections).

**Steps:**

1. Add three short subsections — **Playing RBiH**, **Playing RS**, **Playing HRHB** — that explain how the same phase map reads differently per faction. Faction-specific framing only; no new mechanics.
2. RBiH: emphasize supply scarcity (94% strained baseline at calibration), enclave officer locks (Oric / Dudakovic), and `ongoing-mobilization` / `recruitment` step relevance.
3. RS: emphasize patron IVP, embargo profile, exhaustion accumulation, and op-tempo dependence on Drina / East Bosnia readiness.
4. HRHB: emphasize HV integration, patron IVP under HVO, alliance-update consequences (RBiH-HRHB alliance threshold), and the mobilization-window canon for the HRHB-RBiH conflict transition (cite `docs/40_reports/BOSNIAK_CROAT_CONFLICT_MASTER.md`).
5. Each faction subsection references the **same** Task 2 phase table; it does not redefine the table. Per-faction notes are flavor + which existing Decision Room lane is the typical first scan.
6. Faction IDs must be exactly `RBiH`, `RS`, `HRHB` (canon).

**Acceptance:** Three subsections, no new mechanics, no mismatch between faction notes and Task 2 phase rows. No claim about historical inevitability — language is consistent with the negative-sum framing in Rulebook §1–2.

## Task 5: Review Cycle

**Files:**

- Modify: `docs/10_canon/PLAYER_TURN_GUIDE.md` (add "Review" footer).

**Steps:**

1. Route the draft to three reviewers in sequence (use existing skills):
   - **Game Designer** (`/game-designer`): verifies mechanic and lever consistency with Game Bible and Rulebook.
   - **UX writer / `/ui-ux-developer`**: verifies that every "what the player sees" cell points to a shipped surface and that the prose is short, scannable, and consistent with GUI_MASTER.md.
   - **Historian** (`/historian`): verifies terminology — corps / brigade names, faction names, place names, and any historical framing is accurate and uses ICTY > BB > museum hierarchy.
2. After each review, record a short comment in the doc footer: `Reviewer | Date | Result | Follow-ups`.
3. The Guide is not "released" until all three reviewers sign off in the footer.
4. Canon-compliance pass (`/canon-compliance-reviewer`) checks the final doc against Engine Invariants > Phase Specs > Systems Manual > Rulebook ordering.

**Acceptance:** Footer has four signed rows (3 reviewers + canon-compliance). No reviewer flags an unshipped surface, an invented lever, or a canon contradiction.

## Verification

Run:

- `npx.cmd vitest run` — only if a reviewer requests an existence test for the new doc path; otherwise skipped (markdown-only change).
- Manual: open the Guide in a markdown preview; cross-check every "engine resolves" name against the literal `name:` strings in `src/sim/turn_phases/war_phases.ts` and `src/sim/turn_phases/early_war_phases.ts`.
- Manual: confirm no `Math.random`, `Date.now`, or any code-fenced TypeScript example uses non-deterministic constructs (paranoia check even though doc-only).

## Docs and Ledger

Update at the **end** of the task chain only:

- `docs/PROJECT_LEDGER.md` — append a single doc-only entry: "Player Turn Guide v1 added at `docs/10_canon/PLAYER_TURN_GUIDE.md`."
- `docs/PROJECT_LEDGER_KNOWLEDGE.md` — durable lesson if reviewers surface a recurring confusion (e.g., "players consistently misread sector stance vs corps stance").
- `docs/plans/MASTER_ROADMAP.md` — flip the CONSOLIDATED_BACKLOG §11 line to complete.
- `docs/40_reports/implemented/YYYYMMDD_PLAYER_TURN_GUIDE.md` — implementation report.

Do **not** edit:

- `docs/10_canon/FORAWWV.md` (flag for manual review only).
- Any Rulebook / Phase Specs / Systems Manual / Engine Invariants / Game Bible canon file. The Guide cites them; it does not modify them.

## Stop Gates and Closeout

- **Stop gate after Task 1** if any phase band cannot be aligned to canonical step strings. Reconcile with `/canon-compliance-reviewer` before proceeding.
- **Stop gate after Task 2** if any "what the player sees" cell cannot be matched to an existing read model or implemented report. Either remove the row or downgrade visibility to `Indirect`. Do not write speculative UI into the Guide.
- **Stop gate after Task 3** if a seventh lever is proposed. Levers are canon-fixed.
- **Stop gate at Task 5** if Historian flags terminology or framing inconsistent with ICTY-primary source hierarchy.

Determinism statement: this is a documentation-only plan. Scenario hashes must not change. Any test added must be doc-presence only (existence + heading match), not simulation output.

Final commit must stage **only** the new Guide, the implementation report, the ledger / knowledge / roadmap edits, and (optionally) one doc-presence test. No source-of-truth code, no scenario data, no canon doc edits.
