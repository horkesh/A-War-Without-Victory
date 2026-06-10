# War Termination Minimal Spec Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. **This is a design-first plan; the deliverable is a canonized spec document, not engine code.** Engine wiring is explicitly out of scope and tracked in a separate plan.

**Goal:** Produce a canon-grade minimal specification for *when and how the Bosnian War ends in AWWV* — faction goal hierarchy, terminal conditions, recurring peace initiatives, precondition levers, and the scoring overlay — and shepherd it through Game Designer / Technical Architect / Historian sign-off so the v0.9.x engine work has a stable contract to build against.

**Architecture:** Reconcile the 2026-02-24 Orchestrator directive (Dayton-style negotiated end, faction goals, recurring initiatives, conceptual preconditions) with already-shipped canon (`VICTORY_AND_PYRRHIC_SCORING.md` v0.9.0; `SENSITIVE_HISTORY_DESIGN_GATE.md` v0.9.0; `src/sim/war_termination.ts`; `src/sim/negotiation/*`). The legacy draft at `docs/30_planning/_legacy/WAR_TERMINATION_MINIMAL_SPEC.md` (2026-02-24) is the seed; this plan upgrades it to a canon-tier spec and re-homes it. **No engine semantics may be invented here** — the spec describes the contract; existing code is the reference implementation. Any gap between spec and code is logged as a follow-on backlog item, not silently patched.

**Tech Stack:** Markdown canonical spec, citation tables, expert review (Game Designer, Technical Architect, Historian, Architect for product loop), no TypeScript changes in this lane.

---

## Scope

This is the **war termination minimal spec** work directive surfaced as critical-path item §9 / §11 of `docs/40_reports/CONSOLIDATED_BACKLOG.md` and originally opened by `docs/40_reports/convenes/_archived_feb2026/ORCHESTRATOR_WAR_TERMINATION_MINIMAL_SPEC_DIRECTIVE_2026_02_24.md`.

In scope:
- A canonical minimal spec document covering: Dayton-style end state, faction goal hierarchy (RBiH / RS / HRHB), terminal condition priority, recurring peace-initiative roster + precondition levers, and the scoring overlay binding to `VICTORY_AND_PYRRHIC_SCORING.md`.
- Historian citations (ICTY / ICJ / Balkan Battlegrounds / standard histories) for faction objectives and initiative timing.
- Reconciliation of the legacy 2026-02-24 draft with v0.9.0 canon (`VICTORY_AND_PYRRHIC_SCORING.md`, `SENSITIVE_HISTORY_DESIGN_GATE.md`).
- Sensitive-history gate (Ring 1/2/3) compliance review for any termination/scoring condition the spec names.
- Sign-off: Game Designer (lead) → Technical Architect (oversee) → Historian (advise) → Architect (product loop) → user.

Out of scope:
- Engine implementation of negotiation windows, acceptance computation, peace-plan event firing, or new rupture predicates. **All engine wiring is deferred to a follow-on plan** that consumes this spec.
- Cinematic Verdict / VerdictScreen UI surface work (already owned by its own plan).
- Numeric tuning of precondition thresholds, initiative timing windows, capital weights, grade anchors, or dimension weights. Spec names the levers conceptually; numeric calibration follows in a separate design pass.
- Edits to `docs/10_canon/FORAWWV.md` (per project rule: require Pyrrhic-panel sign-off).
- Edits to `VICTORY_AND_PYRRHIC_SCORING.md` or `SENSITIVE_HISTORY_DESIGN_GATE.md` (this spec aligns to them, never amends them; any required amendment is flagged as a separate sign-off task).
- Engine `Math.random()` / determinism audits (this is a design doc — code-level determinism is enforced by existing canon).

---

## Files

Read-first (no edits):
- `docs/40_reports/convenes/_archived_feb2026/ORCHESTRATOR_WAR_TERMINATION_MINIMAL_SPEC_DIRECTIVE_2026_02_24.md`
- `docs/30_planning/_legacy/WAR_TERMINATION_MINIMAL_SPEC.md` (legacy seed draft)
- `docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md`
- `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`
- `docs/30_planning/design/ENDGAME_AND_NEGOTIATION_DESIGN.md`
- `docs/40_reports/CONSOLIDATED_BACKLOG.md` §9, §11
- `src/sim/war_termination.ts`
- `src/sim/negotiation/dayton_negotiation.ts`
- `src/sim/negotiation/peace_plans.ts`
- `src/sim/negotiation/peace_plan_data.ts`
- `src/sim/negotiation/scoring.ts`
- `src/sim/negotiation/rupture_consequences.ts`
- `src/scenario/scenario_end_report.ts`
- `src/scenario/victory_conditions.ts`
- `data/scenarios/apr1992_definitive_188w.json` (for live `max_turns` / scenario-cap shape)

Create:
- `docs/10_canon/WAR_TERMINATION_SPEC.md` — **the canonical deliverable**. (Recommended location: under `docs/10_canon/` so the spec sits alongside `VICTORY_AND_PYRRHIC_SCORING.md` and `SENSITIVE_HISTORY_DESIGN_GATE.md`. See Task 1 for the location decision; fallback is `docs/30_planning/WAR_TERMINATION_SPEC.md` with a forward-reference from `docs/10_canon/`.)
- `docs/40_reports/convenes/WAR_TERMINATION_SPEC_HISTORIAN_NOTES_2026-05-17.md` — Historian advisory pack (citations and BB/ICTY anchors); referenced by the spec, not embedded inside it.

Touch only if review requires (each is a stop-gate, see §Stop Gates):
- `docs/plans/MASTER_ROADMAP.md` — add a single line under the v0.9.x design-debt section pointing at the new spec.
- `docs/PROJECT_LEDGER.md` — docs-only entry at the end (no behavioral change).

**Pyrrhic-panel sign-off required to edit:**
- `docs/10_canon/FORAWWV.md` (flag any conflict for manual review).
- `docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md`, `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`, Engine Invariants, Phase Specs, Systems Manual, Rulebook — this spec **binds to** them; amendments are out of scope.

---

## Task 1: Decide Spec Home and Scaffold

**Goal:** Pick the canonical path for the spec and stand up the document skeleton, with explicit cross-references to existing canon.

**Files:**
- Create: `docs/10_canon/WAR_TERMINATION_SPEC.md` (default) OR `docs/30_planning/WAR_TERMINATION_SPEC.md` (fallback if Technical Architect rejects canon-tier placement at this stage).

**Steps:**
1. Open a one-paragraph decision note in the plan-execution thread: canon-tier vs planning-tier home. Default to canon-tier (`docs/10_canon/`) because the spec defines termination semantics that all other canon already implicitly references; the legacy draft lived in `docs/30_planning/` only because canon-tier sign-off had not yet occurred.
2. If canon-tier: place at `docs/10_canon/WAR_TERMINATION_SPEC.md` with header `Status: CANON (v0.9.x gate)`, `Authority: Canon hierarchy, Tier 2 (above Rulebook, below Engine Invariants)`, owners `Game Designer, Technical Architect, Gameplay Programmer`, supersedes `docs/30_planning/_legacy/WAR_TERMINATION_MINIMAL_SPEC.md`.
3. If planning-tier (fallback): place at `docs/30_planning/WAR_TERMINATION_SPEC.md`, header `Status: DRAFT — pending canon promotion`, and add a forward-reference stub at `docs/10_canon/WAR_TERMINATION_SPEC.md` deferring to the planning-tier file.
4. Scaffold sections (matching Tasks 2-6 below): §1 Purpose, §2 Termination conditions, §3 Faction goal hierarchy, §4 Recurring peace initiatives, §5 Precondition levers, §6 Scoring overlay, §7 Sensitive-history gate, §8 Sign-off block, §9 References.
5. Cross-reference `docs/30_planning/_legacy/WAR_TERMINATION_MINIMAL_SPEC.md` in §9 with note "supersedes legacy draft of 2026-02-24; this spec extends it with v0.9.0 canon alignment."

**Acceptance:** A scaffolded spec file exists at the agreed path; the legacy draft is referenced as superseded; `Status` / `Authority` / `Owners` block is present; section headers match Tasks 2-6.

**Stop gate:** Do **not** advance to Task 2 until the location decision is recorded in the plan-execution thread. The location choice changes what other docs need cross-reference updates.

---

## Task 2: Faction Goals — Authoritative Hierarchy with Citations

**Goal:** Write §3 of the spec — per-faction preference hierarchy that drives offer valuation, accept/counter behavior, and grade-anchor interpretation. Every preference must be backed by a BB/ICTY/ICJ or peer-reviewed citation.

**Files:**
- Modify: `docs/10_canon/WAR_TERMINATION_SPEC.md` §3.
- Create: `docs/40_reports/convenes/WAR_TERMINATION_SPEC_HISTORIAN_NOTES_2026-05-17.md` (Historian advisory; citation pack).

**Dispatch:** `/historian` skill in advisory mode. Source hierarchy per `MEMORY.md > Historical research source hierarchy`: ICTY judgments FIRST, BB second, then standard academic histories. **Wikipedia is not acceptable** per `SENSITIVE_HISTORY_DESIGN_GATE.md` §6.

**Steps:**
1. Draft the faction hierarchy table in §3 — first preference (typically unreachable) and second preference (negotiation target):
   - **RS:** (1) Independence — almost impossible (ICTY Karadžić/Mladić: Strategic Objectives 1992); (2) Maximal autonomy within BiH (Dayton Annex 4).
   - **HRHB:** (1) Third entity — almost impossible (Graz Agreement 1992; Boban-Karadžić); (2) Strengthened cantons within the Federation (Washington Agreement 1994).
   - **RBiH:** Strengthen state-level institutions (consistent platform, Izetbegović delegation papers; Dayton Annex 4 central competences).
2. For each row, Historian supplies one paragraph in the advisory pack citing: (a) primary ICTY indictment or judgment where the political position was on the record (Strategic Objectives, Karadžić IT-95-5/18 etc.); (b) the historical peace plan that codified the second-preference position; (c) BB volume/page reference where applicable.
3. State the binding rule: **goal hierarchy is canon; it drives `pyrrhic_score` dimension weights (§3.1 of VICTORY_AND_PYRRHIC_SCORING.md) and grade anchors (§3.2). Any future spec change to faction goals requires `/historian` + `/game-designer` re-sign-off (see Task 6).**
4. Add an explicit non-goal note: this hierarchy does not become a player-facing slider, leaderboard, or "choose your war aim" selector. Faction goals are political identity, not a player optimization surface.

**Acceptance:**
- §3 has a citation per faction per preference tier.
- Advisory pack has the full BB/ICTY citations and is referenced from §9.
- Hierarchy is explicitly tied to existing `VICTORY_AND_PYRRHIC_SCORING.md` dimension weights and grade anchors (no new tables invented).

**Stop gate:** Do **not** modify the existing dimension-weight table in `VICTORY_AND_PYRRHIC_SCORING.md` §3.1 or grade anchors in §3.2. If Historian's citations reveal a mismatch with those tables, log it in the advisory pack and surface as a follow-on backlog item — do not amend canon.

---

## Task 3: Termination Conditions — Priority Order and Preconditions

**Goal:** Write §2 of the spec — the canonical answer to "when can the war end" with per-condition precondition checklists. This must mirror current code (`src/sim/war_termination.ts:checkWarTermination`) and `VICTORY_AND_PYRRHIC_SCORING.md` §1 termination priority.

**Files:**
- Modify: `docs/10_canon/WAR_TERMINATION_SPEC.md` §2.

**Dispatch:** `/game-designer` lead, `/technical-architect` review for code/contract alignment.

**Steps:**
1. Restate the four terminal conditions in priority order, cross-referenced to existing code lines:
   1. **Scenario victory conditions** (`evaluateVictoryConditions`, `src/scenario/victory_conditions.ts`). Fires `victory:{faction}` / `co_victory:{factions}`. Precondition: scenario file declares `victory_conditions.by_faction`. Default scenarios (`apr1992_definitive_*`) do **not** declare these; see VICTORY_AND_PYRRHIC_SCORING.md §4.2.
   2. **Negotiated peace** (`war_termination.ts:62-71`). Fires `negotiated_peace:{plan_id}` when `event_flags.war_ended_early === true`. Precondition: a peace-plan event or Dayton acceptance has set the flag via `peace_plans.ts` / `dayton_negotiation.ts`. **This is the canonical Dayton-style end** per the 2026-02-24 directive.
   3. **Faction collapse** (`checkFactionCollapse`). Fires when 2+ factions have zero active brigades. Precondition: brigade registry reaches zero for the named factions. Single-collapse with 2 survivors does not terminate (game continues).
   4. **Turn-limit stalemate** (`turn >= meta.max_turns ?? 208`). Fires `timeout_stalemate`. Hard backstop; the design intent is that Dayton always fires first under historical scenarios.
2. For each condition write a four-line precondition checklist suitable as input to a future contract test. **Do not invent new conditions** beyond what code already evaluates. If the legacy draft mentions exhaustion-limit termination separately, note that exhaustion is a *precondition lever* (Task 5), not a standalone terminal trigger — the negotiated-peace path consumes exhaustion via System 1 / negotiation capital.
3. Resolve one open conflict between the legacy draft and `ENDGAME_AND_NEGOTIATION_DESIGN.md`: the design discussion proposed *removing* `timeout_stalemate` in favor of "always reach Dayton or player quit." Current code retains the 208-week backstop. **Spec records the current behavior (backstop retained)** and flags the design-discussion proposal as an open question for Game Designer sign-off in §8. Do not change code in this plan.
4. Note that `applyWarTermination()` freezes the endgame snapshot (`freezeEndgameSnapshot`, war_termination.ts:178) — the spec must require this so save/load determinism of the verdict packet survives post-termination engine drift.

**Acceptance:**
- §2 has four numbered conditions, each with: trigger string format, code reference (file:line), and 3-5 line precondition checklist.
- Conflict with `ENDGAME_AND_NEGOTIATION_DESIGN.md` is acknowledged in §8 open questions, not silently resolved.
- Endgame-snapshot freeze is explicitly required.

**Stop gate:** If review finds that `war_termination.ts` or `dayton_negotiation.ts` does something the spec did not anticipate (e.g., a fifth terminal path), **stop and report**. Do not paper over by retroactively documenting code; raise it as an "engine-spec drift" item for the follow-on engine plan.

---

## Task 4: Recurring Peace Initiatives — Roster and Initiative Cadence

**Goal:** Write §4 of the spec — which historical peace plans appear during the war, in what order, and what each one's precondition envelope looks like. Bind to the already-shipped data in `src/sim/negotiation/peace_plan_data.ts`.

**Files:**
- Modify: `docs/10_canon/WAR_TERMINATION_SPEC.md` §4.

**Dispatch:** `/historian` (initiative-by-initiative historicity), `/game-designer` (cadence and accept/reject semantics).

**Steps:**
1. Inventory the existing peace-plan roster from `peace_plan_data.ts` and confirm the canonical set is:
   - Cutileiro / Lisbon (March 1992, w0).
   - Vance-Owen / VOPP (Jan 1993, w40).
   - Owen-Stoltenberg (Aug 1993, ~w70).
   - Contact Group Plan (July 1994, ~w118).
   - **Dayton Agreement (Nov 1995, w188)** — terminal Dayton-style end per `dayton_negotiation.ts:DAYTON_TRIGGER_WEEK = 188`.
2. Per plan, document in a table: id, historical date, trigger_week, proposed split, institutional_model, **what acceptance does to termination state** (Cutileiro–Contact Group: sets `war_ended_early` if accepted; Dayton: forced acceptance per `dayton_negotiation.ts`), and the canon citation (Owen's *Balkan Odyssey* for VOPP; ICTY judgments where the plan is on the record).
3. State the **recurring-initiatives rule** explicitly: plans fire on `trigger_week` checks, success remains *low* until precondition levers are sufficiently satisfied (§5). Early acceptance is mechanically possible but historically rare; the design intent is that early plans usually reject, late plans accept. **Spec names this as design intent; numeric thresholds are TBD in a separate calibration pass.**
4. State the **Dayton forced-acceptance escape valve**: per `dayton_negotiation.ts:35` (`FORCED_DAYTON_OVERRIDE_THRESHOLD = 95`), patron-override pressure can force Dayton before w188. Document this as canonical and the only mechanism that overrides the chronological cadence.
5. Cross-reference §5 (precondition levers) for what "sufficient" means.

**Acceptance:**
- §4 has a 5-row plan table with code-backed trigger weeks and citations.
- Historical/Dayton trigger semantics (week 188 + forced-override-95) is documented verbatim against `dayton_negotiation.ts`.
- "Recurring initiatives + low success until preconditions met" rule is stated as design intent without inventing thresholds.

**Stop gate:** Do **not** propose a *new* peace plan (no fictional initiatives, no "AWWV-only" plans). The roster is historical; any addition needs `/historian` sign-off and is out of scope here.

---

## Task 5: Precondition Levers — Conceptual Catalog

**Goal:** Write §5 of the spec — the named levers that determine when negotiation success becomes mechanically possible. Conceptual only; numeric thresholds are TBD per the 2026-02-24 directive.

**Files:**
- Modify: `docs/10_canon/WAR_TERMINATION_SPEC.md` §5.

**Dispatch:** `/game-designer` lead, `/historian` advise (each lever needs at least one historical anchor).

**Steps:**
1. List the four levers from the legacy draft, refreshed against current code:
   - **IVP (International Visibility Pressure)** — `state.international_visibility_pressure` (Systems Manual System 1). Driven by Sarajevo siege visibility, atrocity exposure, humanitarian footage. Lever for `adjusted_negotiation_threshold`.
   - **Patron pressure** — `state.military.negotiation.patron_relationships` (`peace_plans.ts:43`). Driven by `patron_state` and constraint severity. Late-war (post-Aug 1995 in history) this lever dominates.
   - **Exhaustion** — `state.phase_ii_exhaustion` per faction. Cumulative, irreversible per Phase II §9. Engine Invariants §8.
   - **Army strength (relative balance)** — territorial control share, formation count, supply pressure. The Federation+ARBiH push of Aug–Sept 1995 is the historical anchor.
2. For each lever record: state field reference, system-manual section, historical anchor (BB / ICTY / Owen / Holbrooke *To End a War*), and which terminal conditions it gates (always at least the negotiated-peace condition).
3. State explicitly: **thresholds are TBD**. The spec does not commit numeric values for "sufficient" IVP / patron / exhaustion / strength. A follow-on design pass and the calibration system own the numbers.
4. Add a forward-pointer: the engine consumes these levers via `compute_capital.ts`, `patron_pressure.ts`, and the `bot_negotiation.ts` accept/counter machinery; this spec does not duplicate their logic, only enumerates them.

**Acceptance:**
- §5 has a 4-row lever table with: name, state field, system reference, historical anchor, terminal condition gated.
- "Thresholds are TBD" is stated in bold; no numeric values are introduced.
- Each lever has at least one citation (ICTY / BB / authoritative history).

**Stop gate:** If review wants a fifth lever (e.g., "civilian morale," "diaspora pressure"), do not add it here. New levers require Game Designer + Historian sign-off and are out of scope for the minimal spec.

---

## Task 6: Scoring Overlay — Binding to VICTORY_AND_PYRRHIC_SCORING.md

**Goal:** Write §6 of the spec — the formal binding between this spec and the already-canonized scoring system. **Do not re-state the scoring system.** Spec describes how termination handoff produces a verdict.

**Files:**
- Modify: `docs/10_canon/WAR_TERMINATION_SPEC.md` §6.

**Dispatch:** `/game-designer` (scoring contract), `/technical-architect` (handoff to `computeFullVerdict`).

**Steps:**
1. State the handoff: on termination (any of the four conditions), `applyWarTermination()` freezes the endgame snapshot. Verdict is then computed by `computeFullVerdict()` in `src/sim/negotiation/scoring.ts`. **The verdict is per-faction. There is no single "winner."**
2. Cross-reference the canonical rules from `VICTORY_AND_PYRRHIC_SCORING.md`:
   - Termination produces a boolean game-over + outcome label (§1).
   - Judgment produces a `GameVerdict` with per-faction `FactionVerdict` packets (§1).
   - Pyrrhic score is **supporting context, not sovereign** (§3.1).
   - Outcome class (`strategic_success` / `survival` / `negotiated_escape` / `pyrrhic_success` / `hollow_victory` / `failure` / `collapse`) is computed deterministically by `classifyOutcome()` (§2).
   - Condemnation flags (currently only `srebrenica_genocide_1995`) can override territorial grades (§3.4, §2).
3. Bind the **faction goal hierarchy from Task 2** to the dimension weights in `VICTORY_AND_PYRRHIC_SCORING.md` §3.1 and grade anchors in §3.2. The spec states that the hierarchy is the **narrative meaning** of those weights; changing the hierarchy would require changing the weights, which is out of scope here.
4. Bind the **terminal conditions from Task 3** to `evaluateVictoryConditions` / `checkFactionCollapse` / turn-limit / `war_ended_early`. State: "Each terminal condition produces an outcome label; judgment runs regardless of which condition fired." Cite `VICTORY_AND_PYRRHIC_SCORING.md` §1 "Judgment is orthogonal."
5. State binding rules:
   - **No leaderboards.** Per `VICTORY_AND_PYRRHIC_SCORING.md` §6 Non-Goals #6.
   - **No "winner" labels.** Per §6 Non-Goal #5 and §5.1 VerdictScreen rules.
   - **Pyrrhic score is supporting context.** Outcome class + grade are primary verdict drivers. Condemnation flags can cap or taint any result.

**Acceptance:**
- §6 makes zero new scoring claims and contains only cross-references with section/file:line citations.
- The three binding rules (no leaderboards, no "winner" labels, score is supporting context) are restated verbatim with citations to `VICTORY_AND_PYRRHIC_SCORING.md` §6 / §5.1.

**Stop gate:** If a reviewer proposes a *new* outcome class, *new* dimension weight, or *new* condemnation flag here, **stop and reroute**. Those changes require their own sign-off path (`VICTORY_AND_PYRRHIC_SCORING.md` §8 and `SENSITIVE_HISTORY_DESIGN_GATE.md` §6).

---

## Task 7: Sensitive-History Gate Compliance Check

**Goal:** Write §7 of the spec — a one-page audit confirming that nothing in the spec creates a Ring-3 refused surface or contradicts `SENSITIVE_HISTORY_DESIGN_GATE.md`.

**Files:**
- Modify: `docs/10_canon/WAR_TERMINATION_SPEC.md` §7.

**Dispatch:** `/historian` + `/game-designer`. **Sensitive-history gate review is mandatory before sign-off** per `SENSITIVE_HISTORY_DESIGN_GATE.md` §6.

**Steps:**
1. Walk the three rings against this spec:
   - **Ring 1 (modeled mechanically):** termination, peace-plan acceptance, Dayton, condemnation flags, war-crimes counter. Spec only references existing Ring 1 surfaces; introduces no new mechanical sensitive-history state.
   - **Ring 2 (represented narratively):** historical peace-plan narratives in `peace_plan_data.ts`, ICTY citations in Historian advisory pack. Spec adds citations; the strings themselves obey `SENSITIVE_HISTORY_DESIGN_GATE.md` §4 wording constraints.
   - **Ring 3 (refused):** review the 11-item Ring-3 list. Confirm none of the spec's clauses creates a refused surface (no "commit genocide" decision tree; no negotiable condemnation; no body-count optimization; no ranking factions by atrocity; no calendar-driven atrocity).
2. Specifically audit the precondition-levers section (Task 5) for "atrocity efficiency" surfaces. **War crimes are not a precondition lever in this spec** — they enter the verdict through condemnation flags and grade anchors, which is Ring 1, not a negotiation lever. Document this explicitly.
3. Audit the recurring-initiatives section (Task 4) for any clause that frames an alt-history peace as "less bad than real history." Spec must not contain that framing. Cross-reference `SENSITIVE_HISTORY_DESIGN_GATE.md` §1 Ring 3 #6 "No alternate-history minimization."
4. Audit faction-goals (Task 2) for "justified atrocity" framing. Goal hierarchy describes *political identity*, not strategic value of atrocity. Confirm explicitly.
5. Record the audit conclusion: "Spec complies with `SENSITIVE_HISTORY_DESIGN_GATE.md` Rings 1/2/3 as of [date]. Sign-off: Historian + Game Designer."

**Acceptance:**
- §7 audit table walks all 11 Ring-3 refused surfaces and notes "not introduced by this spec" with one-line justification per row.
- "War crimes are not a precondition lever" is stated explicitly.
- Historian and Game Designer both initial §7.

**Stop gate:** If the audit surfaces *any* Ring-3 risk, **stop**. Do not weaken the audit to make the spec pass. Either revise the spec to eliminate the risk, or escalate to the user per `SENSITIVE_HISTORY_DESIGN_GATE.md` §6 escalation rule.

---

## Task 8: Sign-Off Cycle and Open Questions

**Goal:** Write §8 of the spec — the sign-off block and the open-questions register that survives into the follow-on engine plan.

**Files:**
- Modify: `docs/10_canon/WAR_TERMINATION_SPEC.md` §8.

**Dispatch:** Sequential. Game Designer lead → Technical Architect oversee → Architect (product loop) → Historian advise → user.

**Steps:**
1. Define the sign-off matrix in §8:

   | Role | Skill | Reviews | Required |
   |---|---|---|---|
   | Game Designer | `/game-designer` | All sections; lead author | Yes |
   | Technical Architect | `/technical-architect` | §2 termination conditions, §6 scoring overlay, code citations | Yes |
   | Architect (product loop) | (orchestrator-dispatched architect) | Full player-experience loop coherence | Yes (re-affirms 2026-02-24 sign-off) |
   | Historian | `/historian` | §3 faction goals, §4 peace plans, §5 lever anchors, §7 sensitive-history audit | Yes |
   | User | direct | Final sign-off; cannot be delegated for sensitive-history-touching docs | Yes |

2. Each role records: date, signature line, two-sentence sign-off note. Do not stage the spec for canon-tier promotion until all five signatures land.

3. **Open questions register** (carried forward into the follow-on engine plan, not blocking this spec):
   - Q1: Does the `timeout_stalemate` at week 208 remain as a hard backstop, or is `ENDGAME_AND_NEGOTIATION_DESIGN.md`'s "always reach Dayton or player quit" the canonical future direction? (Current code retains backstop; design discussion wants it removed.)
   - Q2: Numeric precondition thresholds for each lever (IVP, patron, exhaustion, strength) — TBD by a calibration pass, not by this spec.
   - Q3: Recurring-initiative cadence — should an initiative window stay open for N turns, or does it fire-once-and-resolve? Current code is fire-once via `trigger_week`. Confirm or revise.
   - Q4: Does player termination ("quit screen" path from `ENDGAME_AND_NEGOTIATION_DESIGN.md` §1b) belong as a fifth terminal condition? Not in current `war_termination.ts`. Flagged for design decision.
   - Q5: Faction-goal hierarchy interaction with **scenario-defined** `victory_conditions` (training/what-if scenarios per `VICTORY_AND_PYRRHIC_SCORING.md` §4.3). Does the hierarchy override or compose with scenario conditions? Default per §4.4: victory conditions terminate but do not assign grades; judgment runs against anchors. Confirm in §6.

4. State the **non-blocker rule**: open questions do not prevent canon-tier promotion. They are explicitly TBD work flagged into the follow-on engine plan.

**Acceptance:**
- §8 has a 5-row sign-off matrix.
- §8 has a 5-question open-questions register with status `TBD — follow-on engine plan`.
- No sign-off lands without the §7 sensitive-history audit having concluded "no Ring-3 risk introduced."

**Stop gate:** Do not request user sign-off until all four expert sign-offs (Game Designer, Technical Architect, Architect, Historian) are recorded. The user is the last reviewer per `SENSITIVE_HISTORY_DESIGN_GATE.md` §6.

---

## Verification

**Design-first plan — verification is review-driven, not test-driven.** No code changes; no Vitest runs required. Confirm the following:

- `npm.cmd run canon:check` — passes (script must be re-run after the spec is placed; if `canon:check` does not yet recognize `WAR_TERMINATION_SPEC.md`, log an "add to canon registry" follow-on item).
- Spec file exists at the agreed path (Task 1) and has all eight sections (§1–§8).
- Historian advisory pack exists at `docs/40_reports/convenes/WAR_TERMINATION_SPEC_HISTORIAN_NOTES_2026-05-17.md` and is referenced from §9.
- All five sign-offs are recorded in §8 with date and two-sentence note each.
- §7 sensitive-history audit walks all 11 Ring-3 items.
- Cross-references to `VICTORY_AND_PYRRHIC_SCORING.md` §1, §2, §3.1, §3.2, §3.4, §4.2, §6, §5.1 are present and resolve to correct sections.
- Cross-references to `SENSITIVE_HISTORY_DESIGN_GATE.md` §1 Ring 3, §4, §6 are present and resolve.
- No edits to `docs/10_canon/FORAWWV.md`, `VICTORY_AND_PYRRHIC_SCORING.md`, `SENSITIVE_HISTORY_DESIGN_GATE.md`, Engine Invariants, Phase Specs, Systems Manual, or Rulebook.
- Smoke check: `git status` lists only the new spec, the Historian advisory pack, optional one-line roadmap entry, and optional one-line ledger entry. Nothing else.

---

## Documentation And Ledger

- **Create:** `docs/10_canon/WAR_TERMINATION_SPEC.md` (or planning-tier fallback per Task 1).
- **Create:** `docs/40_reports/convenes/WAR_TERMINATION_SPEC_HISTORIAN_NOTES_2026-05-17.md`.
- **Update (one line each, only after sign-offs):**
  - `docs/plans/MASTER_ROADMAP.md` — under v0.9.x design-debt: "War termination minimal spec canonized — see `docs/10_canon/WAR_TERMINATION_SPEC.md`. Engine wiring deferred to follow-on plan."
  - `docs/PROJECT_LEDGER.md` — docs-only entry: spec canonized, no behavioral change, follow-on engine plan tracked separately.
- **Cross-reference (read-only):** `docs/40_reports/CONSOLIDATED_BACKLOG.md` §9 / §11 items remain open until the follow-on engine plan ships; this plan closes only the spec deliverable.
- **Do not touch:** `docs/10_canon/FORAWWV.md` (flag any conflict for manual review).

Determinism statement: this is a docs-only lane. Scenario hashes must remain byte-identical (no code or data changes). If any hash drifts, the lane has overreached — stop and investigate.

---

## Stop Gates

- **Stop after Task 1** if the canon-tier vs planning-tier home decision is not recorded. The location choice changes downstream cross-references.
- **Stop after Task 3** if the spec drift versus `war_termination.ts` reveals a fifth terminal path or unanticipated branch. Surface as engine-spec drift backlog; do not retroactively rationalize.
- **Stop after Task 6** if a reviewer proposes new scoring mechanics, new dimensions, new outcome classes, or new condemnation flags. Those changes have their own sign-off paths and are out of scope.
- **Stop after Task 7** if the sensitive-history audit surfaces any Ring-3 risk. Either revise the spec to eliminate the risk, or escalate to the user per `SENSITIVE_HISTORY_DESIGN_GATE.md` §6.
- **Stop before user sign-off** if any of the four expert sign-offs is missing or conditional.
- **Stop if `canon:check` fails** after the spec is placed. Do not bypass canon checks.
- **Stop if any edit lands outside the four target files** (the spec, the advisory pack, the one-line roadmap entry, the one-line ledger entry). This is a docs-only plan; broader edits indicate scope creep.
- **`FORAWWV.md` edits require Pyrrhic-panel sign-off.** Per project rule, route any diff through the appropriate panel.

---

## Out of Scope (explicit)

The following are tracked as follow-on work, not part of this plan:

1. **Engine implementation** of negotiation windows, accept/counter computation timing, peace-plan event injection, or rupture predicates — separate engine plan consuming this spec.
2. **Numeric calibration** of precondition lever thresholds, initiative timing windows, capital weights, or grade-anchor cutoffs — calibration system, separate plan.
3. **VerdictScreen / Cinematic Verdict UI** — already owned by `docs/plans/2026-04-06-v091-dynamic-essay-endgame-comparison-plan.md` and informed by `docs/plans/2026-05-17-endgame-188w-verification-plan.md`.
4. **New rupture predicates** beyond `srebrenica_genocide_1995` — requires the full `SENSITIVE_HISTORY_DESIGN_GATE.md` §2 sign-off path.
5. **Amendments to `VICTORY_AND_PYRRHIC_SCORING.md` or `SENSITIVE_HISTORY_DESIGN_GATE.md`** — own sign-off paths; this spec binds to them, it does not edit them.
6. **`FORAWWV.md` updates** — manual review only.
