# v0.9 Product Spine Mega-Lane Plan

**Date:** 2026-05-01
**Status:** Active architecture and execution plan
**Owner split:** Codex owns product architecture, roadmap truth, review, and non-overlapping integration plans. Claude owns large implementation mega-lanes with internal parallel agents and phase commits.
**Purpose:** Stop decomposing v0.9 into tiny repair packets. Move toward an AAA+ presidential grand-strategy loop while keeping the simulation deterministic and non-railroaded.

---

## 1. Executive Frame

AWWV now has many strong systems: deterministic simulation, command hierarchy, Army HQ, Warroom, opportunity proposals, AARs, cost ledger, dated painted targets, and long-run diagnostics. The current risk is not "missing one more helper." The current risk is that the product feels like excellent machinery rather than one coherent presidential campaign.

The v0.9 work should therefore be organized around three large product questions:

1. **Why did the war develop this way?**  
   Force quality, logistics, officers, equipment, exhaustion, geography, command friction, and political choices must create the war trajectory. Calendar scripts are evidence tools, not the model.

2. **What can the player do about it?**  
   The player must see threats and opportunities through Warroom / Army HQ / map surfaces, make presidential choices, and understand how commanders interpret those choices.

3. **What did it cost?**  
   Turn aftermath, AARs, displacement, casualties, Cost Ledger, Codex, and final judgment must close the loop.

**TL;DR:** v0.9 should be run as a few ambitious mega-lanes, not a long chain of seam packets.

---

## 2. Mega-Lane Size Rule

A Claude prompt is too small if it can be completed with one file patch, one test, one run, or one report.

A correct mega-lane should normally include:

- 4-8 internal phases.
- 3+ independent expert investigations dispatched in parallel at the start.
- 2+ behavior or product surfaces.
- Tests plus documentation plus ledger/knowledge propagation.
- Scenario or UI proof when the lane touches long-run behavior or player experience.
- A final handoff that names remaining blockers and prepares the next lane.

Expected hash movement, expected test updates, and expected docs propagation are not stop gates. They are lane work.

---

## 3. Current Mega-Lane Board

### Mega-Lane A: Full-War Trajectory Foundation

**Owner:** Claude implementation, Codex review.

**Question:** Does the engine make VRS degrade and ARBiH professionalize for systemic reasons?

**Scope:**

1. Force-quality cap discipline and long-run saturation.
2. Frontline-tenure vs combat-tested learning.
3. VRS endogenous strain: officer losses, replacement dilution, sanctions, morale, equipment condition, local defensive competence.
4. ARBiH professionalization: corps maturity, staging reliability, multi-axis coordination, support delivery, captured-equipment normalization.
5. HRHB/HVO trajectory: Washington Agreement transition, HVO authored-op pipeline, Croatia-support dependency.
6. 40w / 104w / 156w / 183w / 188w evidence.

**Not scope:** naked calendar collapse, painted-target hidden rails, global multipliers without consumer evidence.

**Done means:** late-war opportunities expose real capability differences. If ARBiH is weak in a counterfactual, it does not magically become a 1995 army; if VRS preserves officers/logistics/morale, it does not collapse by date.

### Mega-Lane B: Operation Opportunity Families

**Owner:** Claude implementation after generic substrate and current 5th Corps topology work settle.

**Question:** Can historical operations appear as live opportunities rather than scripts?

**Families:**

1. 5th Corps / Bihac pocket: Tigar-Sloboda, APWB pressure, Una, Breza, Pauk, Grmec, Sana.
2. Central Bosnia / Vlasic: winter offensives, defensive pressure, post-Washington coordination, HVO/ARBiH relationship.
3. Western Bosnia / Federation pressure: Cincar, Kupres/Glamoc, Mistral/Maestral, Sana interaction with Storm/Oluja.
4. Posavina / Orasje: VRS failed pressure, HVO holdouts, corridor pressure.
5. Drina / enclaves: sensitive-history candidates behind the explicit design gate.

**Done means:** opportunities are available, declined, redirected, under-resourced, or executed because of live state. Each family has failure states and cost surfaces, not just success scripts.

### Mega-Lane C: Presidential Product Spine

**Owner:** Codex architecture now, later implementation by Claude or Codex in non-conflicting slices.

**Question:** Does a campaign turn feel like one presidential decision loop?

**Loop:**

Warroom strategic frame -> Army HQ briefing -> map inspection -> review/decision -> commander execution -> turn aftermath -> AAR/cost/consequence -> Codex/history judgment -> next briefing.

**Phases:**

1. Inventory current surfaces and classify each as `brief`, `inspect`, `decide`, `execute`, `report`, or `judge`.
2. Unify review queues: events, reserve requests, autonomy proposals, opportunity proposals, peace/negotiation reviews.
3. Define the turn aftermath packet: what changed, why, what it cost, what is urgent next.
4. Trace Cost Ledger and consequence flags into player-facing surfaces.
5. Define the final campaign judgment path from run artifact to VerdictScreen / Codex / Wrapped.
6. Produce implementation packets and screenshots/proofs.

**Done means:** a player can complete a campaign arc and answer: what happened, why, what did I influence, what did it cost, and how history judges it.

### Mega-Lane D: Full-War Proof Platform

**Owner:** QA / scenario harness, can be Claude after B or C phase proof.

**Question:** Can we evaluate long-run health without panic-calibrating every mismatch?

**Scope:**

1. Single long-run checkpoint capture.
2. Date-aware painted target comparisons.
3. Force-quality metrics.
4. Operation / opportunity / AAR health.
5. Anomaly family classification.
6. Report templates that separate engine bug, content gap, plausible divergence, and product-readiness gap.

**Done means:** a 188w run produces an actionable health dossier, not a pile of ad hoc scripts and ambiguous warnings.

---

## 4. Codex Immediate Work: Product Spine Audit

Codex should now work Mega-Lane C while Claude works the 5th Corps predicate topology lane.

### Codex Phase C0: Architecture Audit

**Status 2026-05-01:** Complete as docs-only C0 audit. Report: `docs/40_reports/audits/20260501_PRESIDENTIAL_PRODUCT_SPINE_C0_AUDIT.md`. The audit identifies Turn Aftermath as the missing product-spine owner between deterministic turn execution and the next presidential review.

Read:

- `docs/plans/2026-04-30-v09-presidential-campaign-loop-closure-plan.md`
- `docs/20_engineering/PRODUCT_SHELL_HIERARCHY.md`
- `docs/20_engineering/UI_OWNERSHIP_MATRIX.md`
- `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md`
- `docs/40_reports/GUI_MASTER.md`
- `src/ui/map/App.tsx`
- `src/ui/map/components/PresidentialToolbar.tsx`
- `src/ui/map/components/PresidentialAttentionPanel.tsx`
- `src/ui/map/components/army_hq/ArmyHQModal.tsx`
- `src/ui/map/components/VerdictScreen.tsx`

Produce:

- A loop inventory table.
- A contradiction list: duplicated ownership, missing handoff, player knowledge leak, dead surface, or missing aftermath.
- A phase plan for implementation.

### Codex Phase C1: Implementation Packet

Create a follow-up plan that is implementable without user input:

- file ownership
- affected DTOs / IPC handlers
- UI surfaces
- tests
- browser verification
- docs/ledger propagation

Stop only if canon or player-facing meaning is unresolved.

---

## 5. Required Claude Prompt Shape

Every future Claude implementation prompt for a mega-lane should include this language unless the user explicitly asks for a small patch:

```text
This is a mega-lane, not a small packet. Work autonomously through internal phases and commit phase-by-phase. Do not stop after one seam. Use parallel agents aggressively at the start and again before final verification.

Minimum parallel dispatch:
- /architect or /technical-architect: ownership and integration risks
- /qa-engineer or /scenario-harness-engineer: tests, run evidence, diagnostics
- /game-designer: player meaning and non-railroad test
- /historian when historical content or OOB/opportunity content is touched
- /determinism-auditor when state, ordering, serialization, scenario output, or run hashes can change

Continue autonomously through expected test updates, expected hash drift, documentation, ledger, knowledge, reports, and phase commits.

STOP AND ASK only for:
- canon conflict or canon silence on required decision
- sensitive-history representation change
- determinism cannot be guaranteed
- active file-ownership conflict with Codex or another agent
- scope would change combat math / OOB / scenario data outside this lane
- a severe invariant break outside the lane's authority
```

---

## 6. Next Claude Mega-Prompt After Current Lane

Use this after Claude completes the current 5th Corps predicate topology work and Codex review accepts it:

```text
MEGA-LANE: Operation Opportunity Families, Phase 2 - Central Bosnia / Vlasic + Federation-Western Bosnia Expansion

Role and objective:
You are implementing the next large operation-opportunity family lane. Extend the opportunity system beyond 5th Corps by designing and implementing prerequisite-driven opportunity families for Central Bosnia / Vlasic and Federation-Western Bosnia, without railroading historical outcomes.

Canon references:
- docs/10_canon/Engine_Invariants_v0_9_0.md
- docs/10_canon/Rulebook_v0_9_0.md
- docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md
- docs/plans/late-war-operation-opportunity-system-design.md
- docs/plans/2026-05-01-v09-product-spine-megalane-plan.md
- docs/plans/2026-05-01-autonomous-parallel-workstreams-operating-plan.md
- docs/40_reports/CALIBRATION_MASTER.md
- current 5th Corps opportunity catalog/tests as implementation pattern

Required parallel agents:
1. /historian: research post-Washington Central Bosnia, Vlasic, Kupres/Glamoc, Cincar/Mistral/Maestral, failed VRS pressure, and cite sources.
2. /operations-expert: convert history into opportunity families, prerequisites, axes, failure states, and OSID mapping tasks.
3. /game-designer: enforce non-railroad opportunity design, player/bot choices, under-resource/redirect consequences.
4. /qa-engineer: define regression tests and long-run acceptance evidence before implementation.
5. /determinism-auditor: inspect ordering, catalog evaluation, state serialization, and hash-risk.
6. /architect or /technical-architect: check owner boundaries with existing opportunity substrate, Army HQ dossier, AAR, Cost Ledger, and sensitive-history gates.

Scope:
- Add family design docs first, then implementation.
- Implement only non-sensitive opportunity families. Do not add Krivaja-95 / Stupcanica-95 / atrocity-adjacent T4 entries without explicit gate sign-off.
- Prefer family catalog entries with live prerequisites: corps readiness, force quality, staging access, enemy weakness, alliance context, pocket survival, supply pressure, commander confidence.
- Do not force captures, do not use painted targets as hidden truth, and do not add calendar-only scripts.
- Include failure states and cost/record surfaces through existing AAR/opportunity resolution paths.

Internal phases:
1. Research and family design, with OSID mapping checklist.
2. Catalog topology audit before coding: every T1 needs at least two meaningful optional axes; no saturated single-signal gate.
3. Implement Central Bosnia / Vlasic family entries and tests. **Status 2026-05-15:** `kupres_cincar_94` and `vlasic_ridge_95` ship in `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts`, with family design coverage at `docs/plans/late-war-central-bosnia-vlasic-kupres-design.md` and regression coverage in `tests/operation_opportunities_central_bosnia_catalog.test.ts`.
4. Implement Federation-Western Bosnia family entries and tests. **Status 2026-05-15:** first slice ships as `mistral_2_95` in `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts`, with design doc `docs/plans/late-war-federation-western-bosnia-design.md` and regression coverage in `tests/operation_opportunities_federation_western_bosnia_catalog.test.ts`. Additional Winter/Leap/Summer/Southern Move entries remain evidence-gated follow-up work.
5. Run opportunity/catalog tests, tsc, and targeted UI/read-model tests if DTOs change.
6. Run or consume 188w stress evidence and classify surfacing/execution/cost outcomes.
7. Report, ledger, knowledge, napkin, and next-lane handoff.

Determinism and ledger constraints:
- No timestamps, randomness, locale ordering, or nondeterministic iteration.
- Stable sort every catalog/diagnostic aggregate.
- Ledger entry required for behavior/output/scenario changes.
- Knowledge entry required for reusable design rules or failed approaches.

STOP AND ASK triggers:
- Canon conflicts or canon silence on required decision.
- Sensitive-history boundary would be crossed.
- Determinism or stable ordering cannot be guaranteed.
- Active file conflict with Codex.
- Scope expands into combat math, OOB, scenario data, or painted targets.

Output format and validation:
- Phase verdict table.
- Files changed by phase.
- Tests and commands with exact pass/fail counts.
- Run dirs/hashes if scenario runs occur.
- Which opportunities surfaced, which did not, and why.
- Non-railroad checklist.
- Next recommended mega-lane.
```

---

## 7. Product Principle

The winning shape is not "make October 1995 happen." The winning shape is "make a player believe October 1995 could have happened for reasons inside the simulation, and also believe a different outcome could have happened if the institutions, choices, and pressures had been different."

That is the difference between a calibration toy and the kind of Paradox game people envy.
