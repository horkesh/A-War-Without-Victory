# v0.9.0 Victory Conditions + Sensitive History Design Gates — IMPLEMENTED

**Date:** 2026-04-16
**Status:** COMPLETE — both plans closed, canon docs landed, QA regression pinned
**Plans closed:**
- `docs/plans/2026-03-31-v090-victory-conditions-and-pyrrhic-scoring-plan.md`
- `docs/plans/2026-03-31-v090-sensitive-history-design-gate-plan.md`
**Gate resolved:** MASTER_ROADMAP.md Open Design Questions #5 (victory/scoring) and #7 (Srebrenica)

---

## 1. Context and Motivation

Two v0.9.0 gates were outstanding as pre-gold blockers:
1. **Victory conditions + Pyrrhic scoring** — the roadmap stated v0.9.0 could not close until the project had "explicit victory conditions / Pyrrhic scoring." The substrate was live (dimension-weighted scoring, outcome classes, grade anchors, VerdictScreen), but no canonical reference existed. Scenario `victory_conditions` remained unused by every live scenario, and the meaning of "winning" in a negative-sum wargame was documented only in file-header comments.
2. **Sensitive-history design gate** — the roadmap described Srebrenica handling as "the most fundamental design question" with genocide representation open. The code encoded a boundary (paramilitary policy, locked Srebrenica rupture, condemnation flags), but the design position was spread across one system-design doc (`ENDGAME_AND_NEGOTIATION_DESIGN.md`) and comments in `rupture_consequences.ts`.

Both plans asked for **design documents as deliverables**, not new features. The substrate was there; the authority was not.

## 2. Approach

Rather than rebuild anything, the closure work was:
1. Read the live substrate (scoring, rupture, cost-ledger, verdict, comparison, event/essay data) and verify it matched what the plans assumed.
2. Lift thesis statements that already lived as code-comment headers into authoritative canon with the same words.
3. Document the scenario contract's three-state semantic (undefined vs empty vs populated `by_faction`) that tests revealed but no doc had described.
4. Pin the design decisions as a regression test so future drift is a failing CI step.
5. Close the Open Design Questions, update status rows, add durable life lessons.

## 3. Design Decisions (made during execution, not deferred)

### Victory Conditions
- **Thesis:** AWWV is a negative-sum political wargame; there is no winning, only graded failures. Pyrrhic score is supporting context, not sovereign truth. OutcomeClass + grade are primary verdict drivers. Condemnation flags cap any result. (Taken from the file header of `scoring.ts` and canonicalized.)
- **Termination-vs-judgment split:** `war_termination.ts` decides *when* the war ends; `scoring.ts` decides *how* it is judged. Victory conditions terminate; they do not grade.
- **Canonical `apr_1992` campaign is condition-free.** The primary scenario has no `victory_conditions` by design — the war runs to its natural Dayton/exhaustion endpoint and is judged on what the player made of it.
- **Three-state scenario semantic:** `victory_conditions` undefined = no termination evaluated; `by_faction: {}` = explicit-but-empty (nobody can win); populated `by_faction` = evaluate normally. Discovered during test execution; pinned in both the canon doc and the regression test.

### Sensitive History
- **Three-ring boundary.** Ring 1 modeled mechanically, Ring 2 represented narratively, Ring 3 explicitly refused. Every sensitive-history feature must place in exactly one.
- **Ten explicit Ring 3 prohibitions** including no "commit genocide" decision tree, no concentration-camp subsystem, no negotiable condemnation, no body-count optimization, no "atrocity efficiency" metric, no alternate-history minimization, no ranking factions by atrocity, no granular victim attribution, no "justified atrocity" framing, no gamified prevention badge.
- **Rupture expansion rule — four criteria required (ALL):** mass scale (>1,000 civilian deaths or systematic), international legal finding (ICTY/ICJ or equivalent), specific deterministic trigger condition, non-reversible once recorded. Srebrenica remains the only rupture by design — Ahmići, Markale, Bijeljina, Stupni Do, Grabovica/Uždol, Kravica, and Tuzla Gate all fail criterion 1 (mass scale) despite having ICTY case law. Their depiction lives fully in Ring 2.
- **Cost Ledger wording constraints.** Historical voice, third-person, ICTY case citations required, euphemisms forbidden (genocide is genocide), trivializing comparisons forbidden ("85% as bad as history" is not acceptable), no player-second-person framing, no achievement-style language.
- **Sign-off structure.** Changes to rupture triggers or content require `/historian` + `/war-or-game` + `/game-designer` + user approval. Cost Ledger wording requires `/narrative-designer` + `/historian`. When in doubt, the answer is no.

## 4. Deliverables

| Artifact | Path |
|---|---|
| Canonical victory + scoring doc | `docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md` |
| Canonical sensitive-history gate | `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` |
| Regression contract test | `tests/victory_and_pyrrhic_contract.test.ts` (20 assertions) |
| Architecture life lessons | `docs/life_lessons/architecture.md` (+2 entries) |
| Master index refresh | `docs/life_lessons.md` (New Lessons 2026-04-16) |
| Project ledger entry | `docs/PROJECT_LEDGER.md` |
| Knowledge ledger durable rules | `docs/PROJECT_LEDGER_KNOWLEDGE.md` (+2 rules) |
| Roadmap closure | `docs/plans/MASTER_ROADMAP.md` (Open Design Questions #5, #7 resolved; v0.9.0 gate paragraph updated; Current Status rows rewritten) |

## 5. Plan Completion Checklists

### Victory Conditions + Pyrrhic Scoring Plan
- [x] victory model exists (`VICTORY_AND_PYRRHIC_SCORING.md` §2)
- [x] Pyrrhic scoring/evaluation model exists (§3)
- [x] scenario data contract exists (§4, three-state fallback)
- [x] UX/narrative integration rules exist (§5)
- [x] QA matrix exists (§7 + `victory_and_pyrrhic_contract.test.ts`)
- [x] `docs/PROJECT_LEDGER.md` appended
- [x] `.claude/napkin.md` — N/A for this closure (design-doc deliverable, no runtime pattern change)
- [x] implementation report created (this document)

### Sensitive History Design Gate Plan
- [x] current representation inventory exists (§1 three rings + Ring 3 enumeration)
- [x] boundary decisions exist (§1 + §2 rupture rule)
- [x] implementation constraints exist (§3 paramilitary surface, §4 Cost Ledger wording)
- [x] sign-off structure exists (§6)
- [x] roadmap and related plans aligned (MASTER_ROADMAP.md updated)
- [x] `docs/PROJECT_LEDGER.md` appended
- [x] `docs/PROJECT_LEDGER_KNOWLEDGE.md` durable rules added
- [x] implementation report created (this document)

## 6. Verification

- `npx vitest run tests/victory_and_pyrrhic_contract.test.ts` — 20 passed, 0 failed
- Dimension weights table verified against `src/sim/events/strategic_dimensions.ts:57-61` (each faction column sums to 1.00)
- Grade anchor tables verified against `src/sim/negotiation/scoring.ts:71-199` for all three factions
- Rupture trigger semantics verified against `src/sim/negotiation/rupture_consequences.ts`
- Canon doc cross-references verified: `Rulebook_v0_7_0.md:195`, `Engine_Invariants_v0_7_0.md:353`
- `classifyOutcome` behavior verified: genocide condemnation forces `failure`, any flag + territory >30% forces `hollow_victory`, grade F or territory ≤0 forces `collapse`

## 7. Non-Goals (what this closure did not do)

- Did not add new ruptures beyond Srebrenica. By the four-criteria rule, Srebrenica remains the only rupture.
- Did not add new condemnation flags. The framework supports extension; no new flag is justified by current design.
- Did not add `victory_conditions` to `apr_1992` or any other live scenario. The default fallback is canonical by design.
- Did not write new scoring code. All substrate was already live; this was a canonicalization pass.
- Did not weaken the negative-sum thesis. Every surface, every rule, every outcome continues to reinforce that the war had no winners.

## 8. Follow-Up Items

None from the two plans themselves. The v0.9.0 milestone now continues with:
- Broader divergence-event matrix authoring (consequence chains for ahistorical choices)
- Full `CostLedger` prosecutorial authoring (structured ledger packet exists; ICTY-cited prose needs expansion across all condemnation paths)
- Per `SENSITIVE_HISTORY_DESIGN_GATE.md` §5, dynamic essay sections for ghost outcomes (e.g., "Srebrenica enclave held" counterfactual prose in historical voice)

These are ordinary milestone work, not gate-blocker philosophy.

## 9. References

### Canon (new)
- `docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md`
- `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`

### Substrate (confirmed, not changed)
- `src/sim/negotiation/scoring.ts` — verdict computation
- `src/sim/negotiation/rupture_consequences.ts` — condemnation flag source
- `src/sim/war_termination.ts` — termination triggers
- `src/scenario/victory_conditions.ts` — victory condition evaluator
- `src/sim/endgame/cost_ledger.ts` — cost ledger builder
- `src/sim/endgame/endgame_comparison.ts` — historical comparison
- `src/ui/map/components/VerdictScreen.tsx` — canonical endgame UI

### Regression
- `tests/victory_and_pyrrhic_contract.test.ts`
- `tests/victory_conditions_a2.test.ts` (existing, still canonical for scenario-runner integration)

### Plans (closed)
- `docs/plans/2026-03-31-v090-victory-conditions-and-pyrrhic-scoring-plan.md`
- `docs/plans/2026-03-31-v090-sensitive-history-design-gate-plan.md`
