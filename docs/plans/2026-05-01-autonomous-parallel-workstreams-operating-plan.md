# Autonomous Parallel Workstreams Operating Plan

**Date:** 2026-05-01
**Status:** Active operating plan
**Purpose:** Replace the small-packet loop with durable, autonomous, parallel milestone lanes for Claude and Codex.
**Authority:** Below canon and below `docs/plans/MASTER_ROADMAP.md`; governs work execution style, not game rules.

---

## 0. Executive Decision

AWWV is no longer in a mode where every useful change should stop after one narrow seam. The project now needs sustained, phase-coherent workstreams that can run for hours or days, commit internally, and hand back only when a milestone lane is genuinely reviewable.

The target is not to force the map to match history. The target is to make the engine deterministically explain why the war develops the way it does. Historical outcomes should emerge from institutions, logistics, officers, politics, exhaustion, equipment, geography, command friction, international pressure, and player/bot decisions. Calendar scripts and painted-target rails are evidence tools at best, never the product model.

**TL;DR:** Claude should own large implementation lanes. Codex should own architecture, roadmap, product integration, review, and non-overlapping design lanes while Claude runs. Both keep working; neither waits every 10 minutes.

---

## 1. Why This Exists

Recent work exposed a bad rhythm:

- Claude receives a tight packet.
- Claude completes it.
- Codex reviews it.
- The user must ask for the next prompt.
- Repeat.

That loop is safe but too granular. It produces good local repairs while starving the project of larger product movement.

The new rule is: **a work request should usually be a milestone lane, not a seam.** A lane contains several internal phases, each with its own tests and commits. The agent stops only at explicit stop gates.

---

## 2. Role Split

| Owner | Primary work | Should not own |
|---|---|---|
| Claude | Implementation lanes, evidence runs, test repair, report creation, ledger updates, phase commits. | Product architecture direction, cross-lane priority, accepting its own high-risk changes without Codex review. |
| Codex | Architecture, roadmap, workstream sequencing, review, integration contracts, player-loop design, non-overlapping docs/design lanes, final acceptance. | Same files Claude is actively changing, duplicate implementation on the same seam, passive commentary while work is available. |
| User | Strategic taste, canon-sensitive approval, major game-design calls, final priority overrides. | Micromanaging phase-by-phase implementation unless a stop gate triggers. |

---

## 3. Work Unit Size

### Too Small

Avoid work items shaped like:

- "Add one test."
- "Trace one brigade."
- "Make one design doc."
- "Run one scenario and stop."
- "Patch one helper and wait."

These are valid internal phases, but they should not usually be the whole assignment.

### Correct Size

Prefer work items shaped like:

- "Implement the Force Quality Foundation lane through scenario harmonization, learning-rate semantics, railroad removal, readiness helper, diagnostics, and long-run verification."
- "Build the Operation Opportunity MVP through data model, proposal generation, bot decision, Army HQ review surface, AAR, and one family implementation."
- "Close the Presidential Campaign Loop through Warroom briefing, map inspection, turn result, consequence/cost ledger, and historical judgment."

Each lane should be able to contain 3-7 phase commits.

---

## 4. Stop Gates

Agents should **continue autonomously** through expected test updates, expected hash changes, docs/ledger propagation, diagnostic additions, and phase commits.

Agents should stop and ask only when:

1. A canon change is required.
2. Sensitive-history content would change.
3. Determinism cannot be preserved.
4. The requested lane would require editing files owned by another currently running agent.
5. A design decision has multiple plausible player-facing meanings and no existing plan/canon resolves it.
6. A run result shows a severe new engine invariant break outside the lane's authority.

Expected hash movement is not a stop gate. It is evidence to report.

---

## 5. No-Railroad Test

Every simulation-facing lane must pass this test before acceptance:

| Question | Acceptable answer |
|---|---|
| Does this force a historical outcome by date? | No. Date may open a window; live prerequisites decide availability and success. |
| Does this use painted targets as hidden controller truth? | No. Painted targets are evaluation references only. |
| Does this bypass player/bot agency? | No. Player/bot choices can approve, delay, redirect, under-resource, or decline where appropriate. |
| Does this make faction arcs automatic? | No. ARBiH/VRS/HRHB trajectories must emerge from live systems. |
| Does this expose why something happened? | Yes. Diagnostics/AAR/reporting must name the causal traits. |

If a lane fails this table, it is not ready even if map-fit improves.

---

## 6. Active Large Lanes

### Lane A - Force Quality Foundation

**Owner:** Claude, active as of 2026-05-01.

**Purpose:** Make the ARBiH/VRS full-war force-quality premise real through mechanics rather than scripts.

**Internal phases:**

1. Scenario-config harmonization.
2. Officer learning-rate unit semantics.
3. VRS calendar railroad replacement/removal.
4. Corps operation readiness helper.
5. Readiness consumers in operation generation/staging/AAR.
6. 40w/104w/156w/183w/188w verification.

**Codex parallel posture:** Do not touch officer-quality, scenario config, or operation-readiness implementation files while Claude owns the lane. Codex may review plans, update roadmap, and design downstream opportunity/product lanes.

### Lane B - Operation Opportunity MVP

**Owner:** Next implementation lane after Force Quality Foundation reaches a reviewable state.

**Purpose:** Convert late-war operations from calendar scripts into prerequisite-driven Army HQ proposals.

**Internal phases:**

1. Opportunity data model and deterministic queue.
2. Proposal generation from live prerequisites.
3. Bot/player decision handling: approve, delay, redirect, under-resource, decline.
4. Existing operation lifecycle integration.
5. Army HQ dossier read model.
6. AAR/opportunity-resolution persistence.
7. One proof family, preferably 5th Corps after Force Quality Foundation stabilizes.

**Design sources:** `docs/plans/late-war-operation-opportunity-system-design.md`, `docs/plans/2026-05-01-operation-opportunity-review-surface-design.md`, `docs/plans/late-war-5th-corps-opportunities-design.md`.

### Lane C - Presidential Campaign Loop Closure

**Owner:** Codex architecture now; implementation later.

**Purpose:** Make one complete campaign arc playable and legible: Warroom / Army HQ briefing -> map inspection -> order or review choice -> turn result -> consequence/cost/historical judgment.

**Internal phases:**

1. Current-loop audit: what a player can currently see/do after a turn.
2. Missing read models and IPC bridge list.
3. Consequence/cost ledger surfacing.
4. Historical comparison and dynamic essay wiring.
5. End-to-end player proof on one faction.

**Design sources:** `docs/plans/2026-04-30-v09-presidential-campaign-loop-closure-plan.md`, `docs/plans/2026-04-14-v090-consequence-system-refresh-plan.md`, `docs/plans/2026-04-06-v091-dynamic-essay-endgame-comparison-plan.md`.

### Lane D - Late-War Operation Families

**Owner:** Codex/historian/design while implementation lanes run; Claude later implements families after the generic opportunity MVP exists.

**Purpose:** Prepare all major post-Washington operation families as prerequisite-driven designs.

**Internal families:**

1. 5th Corps / Bihac pocket / Sana - authored.
2. Central Bosnia / Vlasic / Kupres.
3. HV/HVO western Bosnia / Storm-linked theater.
4. VRS failed offensives: Zvezda, Breza/Pauk, Orasje, Una-style failures.
5. Safe-area / sensitive-history operations behind explicit gates.

These are larger family docs only if they include prerequisites, failure states, player/bot decisions, engine traits, OSID mapping tasks, and acceptance evidence. A one-operation note is too small.

### Lane E - Full-War Proof Harness

**Owner:** Scenario harness / QA lane.

**Purpose:** Make 40w/104w/156w/183w/188w comparison routine and causal, not ad hoc.

**Internal phases:**

1. Single long-run checkpoint capture.
2. Date-target compare pipeline.
3. Force-quality metrics pipeline.
4. Operation/opportunity AAR summarizer.
5. Report template that separates engine invariants, historical plausibility, and product readiness.

This lane should remove the need for one-off "what happened?" scripts after every long run.

---

## 7. Codex Parallel Work While Claude Implements

When Claude owns an implementation lane, Codex should pick one of these non-conflicting tasks:

1. Review incoming Claude phase commits only after they land; do not shadow-edit the same files.
2. Advance Lane C by auditing the player campaign loop and writing implementation-ready gaps.
3. Advance Lane D by authoring large family docs, not one-operation fragments.
4. Maintain roadmap truth after major evidence or commits.
5. Prepare the next milestone prompt before Claude finishes, so handoff latency is near zero.
6. Run architecture QA against railroads, player-role violations, direct-brigade-control drift, and hidden painted-target feedback.

This keeps Codex productive without causing merge conflicts or duplicating Claude's work.

---

## 8. Commit Discipline

Large lanes can and should contain multiple commits.

Each phase commit should:

- Have one coherent owner and behavior surface.
- Update tests and diagnostics for that phase.
- Update `docs/PROJECT_LEDGER.md`.
- Update `docs/PROJECT_LEDGER_KNOWLEDGE.md` only for reusable lessons.
- Avoid committing unrelated generated output.

Final lane handoff should include:

- Phase verdict table.
- Files changed by phase.
- Tests and run hashes.
- Before/after causal metrics.
- Known regressions or accepted hash movement.
- Next lane recommendation.

---

## 9. Current Recommended Cadence

1. Claude continues Lane A to completion.
2. Codex works Lane C audit/design in parallel, then reviews Claude Lane A.
3. If Lane A is accepted, Claude receives Lane B Operation Opportunity MVP.
4. Codex prepares Lane D family backlog and checks Lane B for railroads/player-role violations.
5. After Lane B, implement 5th Corps family as the first opportunity proof.
6. Once Force Quality + Opportunity MVP + 5th Corps are live, run full-war proof and reassess roadmap.

This is the new default until explicitly changed.

---

## 10. Immediate Codex Work Queue

While Claude is currently in Lane A, Codex should work in this order:

1. Commit this operating plan and roadmap propagation.
2. Audit the Presidential Campaign Loop against the live repo and current plans.
3. Produce a large implementation-ready Lane C gap list.
4. Prepare Lane B Operation Opportunity MVP prompt in advance.
5. Review Claude Lane A when it returns.

The user should not need to ask "so, prompt?" after every Claude return. The next prompt should already be ready or one command away.
