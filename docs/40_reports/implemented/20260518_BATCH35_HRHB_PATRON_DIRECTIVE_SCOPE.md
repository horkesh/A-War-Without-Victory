# Batch 35 — HRHB Patron Directive Scope (Helper Extraction + Per-Corps Test) + Verify-Stale Cleanup

**Date:** 2026-05-18
**Plan:** `docs/plans/2026-05-17-hrhb-patron-directive-scope-plan.md`
**Decision memo:** `docs/40_reports/audits/20260517_HRHB_PATRON_DIRECTIVE_SCOPE_DECISION.md` (Selected scope: **hybrid**)
**Result:** Helper landed, per-corps divergence test passes, 40w byte-identity preserved at `b14179d65639860c`.

## What This Batch Did

The hybrid scope was effectively already implemented in data + engine before this batch: `data/scenarios/timelines/apr1992.json:402-411` ships five HRHB directives encoding Posavina-exempt default + Mostar/Central-Bosnia/Tomislavgrad-divergent post-w40 ceilings, and `bot_corps_stance.ts:280-292` honored the optional `corps_ids?` filter. What was missing was (a) a single typed helper both consumers could share, (b) an integration test asserting per-corps divergence (the distinguishing hybrid-scope behavior), and (c) doc closure marking the lane shipped.

### Changes

| File | Change |
|---|---|
| `src/sim/combat/patron_directive_scope.ts` | **New module.** Exports `PatronDirective` interface and `getActivePatronDirective(faction, turn, state, corpsId?)`. When `corpsId` is supplied, the lookup respects the hybrid scope (filters by `corps_ids?` array on each directive, falls through when absent). When `corpsId` is omitted, returns the first directive whose turn window matches — preserves the faction-wide behavior that officer-level callers (no corps context) rely on. |
| `src/sim/combat/bot_corps_stance.ts` | Replaced the inline 12-line lookup at the HRHB stance-ceiling site with a one-line `getActivePatronDirective(faction, turn, state, corps.id)` call. Per-corps hybrid scope. |
| `src/sim/combat/order_interpretation.ts` | Replaced the inline 11-line lookup at the officer stance-ceiling site with a one-line `getActivePatronDirective(data.faction, turn, state)` call. Faction-wide scope — preserves the legacy behavior literally (the officer surface has no corps context to filter on). |
| `tests/hrhb_patron_directive_scope.test.ts` | **New test file, 13 tests / 5 describe blocks.** Asserts: per-corps divergence at week 45 (Herzegovina Offensive vs Central Bosnia Restraint), full HRHB convergence at week 55, Posavina (`hvo_northwest_bosnia`) exemption at weeks 5 and 100, non-HRHB no-op (RBiH + RS), faction-wide variant preserves first-active-directive semantics, edge cases (empty timeline, missing war_timeline, start_week inclusive/end_week exclusive boundary). |

### Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS (clean) |
| `vitest run tests/hrhb_patron_directive_scope.test.ts tests/patron_directives.test.ts` | 16/16 PASS (13 new + 3 existing) |
| 40w byte-identity (n1912) | PASS — hash `b14179d65639860c` matches Batch 17 baseline literally |
| Anchors / Benchmarks | 27/27 / 6/6 |

## Verify-Stale Cleanup (User Follow-Up)

User asked in this batch's turn that "stale items are cleaned so they don't resurface". The post-execution audit pass (Batches 28-34 prior to this) already annotated four stale items. This batch's research dispatches surfaced more verify-stale lanes already shipped per the MASTER_ROADMAP addenda; cleanup propagated to:

| Lane | Status confirmed | Pointer |
|---|---|---|
| **RS Six Strategic Goals event** | IMPLEMENTED at `data/scenarios/events/war_1992.json:1-159` (`rs_strategic_goals` "The Assembly Speaks"). 3 player branches; *open audit-question*: retroactive §6 sign-off for "aggressive" branch | MEMORY.md `rs_strategic_goals.md` updated to mark VERIFIED + flag the §6 question |
| **Cinematic verdict** | SHIPPED Batch 6 closeout 2026-05-18 | `20260518_CINEMATIC_VERDICT.md` |
| **Presidential campaign-loop validation** | SHIPPED Batch 6 closeout 2026-05-18 | `20260518_PRESIDENTIAL_CAMPAIGN_LOOP_VALIDATION.md` |
| **Formation-life FL-A/FL-B packetization** | SHIPPED 2026-05-18 | `20260518_FORMATION_LIFE_PACKETIZATION_FL_A_FL_B.md` |
| **Soundscape kickoff / audio stub** | SHIPPED 2026-05-17 | `20260517_SOUNDSCAPE_KICKOFF_AUDIO_STUB.md` |
| **Officer mini-bios first-pass** | SHIPPED 2026-05-17 | `20260517_OFFICER_CHARACTER_MINI_BIOS.md` |
| **Diplomacy panel** | SHIPPED 2026-05-17 | `20260517_DIPLOMACY_PANEL.md` |
| **Accessibility P0 closeout** | SHIPPED 2026-05-17 + verify-stale audit 2026-05-18 | `20260517_ACCESSIBILITY_P0_CLOSEOUT.md` + `20260518_ACCESSIBILITY_P0_CLOSEOUT_VERIFY_STALE.md` |

Plus a durable feedback memory authored at `feedback_triage_must_cross_check_closure.md` capturing the lesson: future broad-grep audits MUST cross-check candidate lanes against the canonical milestone-closure log lines in `MASTER_ROADMAP.md` before classifying as "open", because the 2026-05-17 / Batch 6 / Batch 18 implementation waves shipped far more than a section-header grep would suggest.

## What Remains Genuinely Open After This Pass

From the v0.9 path-to-v1.0 plan-coverage matrix (`MASTER_ROADMAP.md:1014-1031`), the **awaiting-implementation** items after this batch:

1. **Chronicle chapter boundary** — decision accepted 2026-05-17 (hybrid player-faction campaign-phase chapters with month sublabels). Engine implementation `chronicleChapters.ts` exists; only a **synthetic war-termination chapter** gap remains (per Agent 7's research in this batch's dispatch). Small follow-on batch.
2. **Q-H1-KRIVAJA-OUTCOME** — H1 watched-operation outcome question (engine §6 canon). Plan exists at `docs/plans/2026-05-17-h1-watched-operation-outcome-plan.md`; Tasks 1-3 (visibility) are agent-tractable; Task 4 (outcome decision) is reviewer-gated.
3. **RS Six Strategic Goals "aggressive" branch §6 audit** — retroactive Ring-3 audit per `SENSITIVE_HISTORY_DESIGN_GATE.md` §1.5 #1; need user sign-off on whether the +8 morale / +0.25 aggression for adopting a genocidal platform is canon-compliant or requires re-tuning.
4. **`splitNonContiguousSectors` BFS reuse** — next sector-perf optimization target (1198 ms / 55% of `enforceFinalSectorGeometryInvariants` per Batch 32 evidence). Plan-first, two-run regression discipline.
5. **Officer mini-bios sensitive-personnel batch** — first-pass shipped, but sensitive personnel (Karadžić, Mladić, Krstić, Beara, Popović, Blaškić) need historian sign-off.
6. **13 missing 1992 essays** — Phase 1 (lock roster) requires historian dispatch.
7. **FORAWWV.md manual review** — 6 specific canon-amendment items since 2026-03-01 ready for the user's next manual review.
8. **Open Design Questions Q1/Q3/Q4/Q6/Q8 ratification** — Agent 9 verdicts in this batch's dispatch produced recommended SHIP/DEFER/NO answers; user ratification is the next step.
9. **Operator-only**: marketing/store, gold gate, playtest outreach, clean-VM evidence capture.

## Determinism

Pure helper extraction. 40w n1912 hash `b14179d65639860c` matches Batch 17 baseline literally. The helper preserves both consumers' lookup semantics byte-for-byte (per-corps for `bot_corps_stance`, faction-wide for `order_interpretation`). No data file changes; no behavior changes.
