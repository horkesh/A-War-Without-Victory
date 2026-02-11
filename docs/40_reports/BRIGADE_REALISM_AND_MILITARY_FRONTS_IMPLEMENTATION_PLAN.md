# Brigade Realism and Military-Only Fronts — Implementation Plan (Deferred Items)

**Status:** Handoff for Orchestrator and Product Manager; scope and phasing to be agreed.  
**Date:** 2026-02-10  
**Related:** Phase II Spec §2.3 (control changes only from military actions); [Phase_II_Specification_v0_5_0.md](../10_canon/Phase_II_Specification_v0_5_0.md)

---

## 1. What Was Implemented (2026-02-10)

- **Canon change (approved):** In Phase II, control changes **only** from military actions (breach-driven settlement flips). Phase I municipality flip logic does **not** run when `meta.phase === 'phase_ii'`.
- **Code:** [src/sim/turn_pipeline.ts](../../src/sim/turn_pipeline.ts) — step `phase-i-control-flip` now returns immediately when `context.state.meta.phase !== 'phase_i'`.
- **Canon doc:** [Phase_II_Specification_v0_5_0.md](../10_canon/Phase_II_Specification_v0_5_0.md) §2.3 documents the amendment.

---

## 2. Scope and Phasing (Orchestrator + Product Manager)

Orchestrator and Product Manager to decide:

- Order of implementation (suggested: demographic gating → garrison/combat formula → one-attack-per-brigade + attack orders → casualties → AI).
- MVP vs full bundle (e.g. phase gate + demographic gating + design docs first; then garrison + one-attack; then casualties; then AI).
- Whether to define "contested municipalities" exception for Phase II (short list of mun_ids that retain Phase I–style flip eligibility).

---

## 3. Deferred Implementation Items

### 3.1 Demographic gating for brigade creation (Formation-expert, Game-designer, Gameplay-programmer)

**Goal:** Avoid ahistorical brigades (e.g. brigades in municipalities where that faction’s 1991 population cannot plausibly support one).

**Tasks:**

- Define **demographic gating**: e.g. do not create (or do not assign historical name to) a faction brigade in a mun where that faction’s 1991 population is below a threshold (e.g. `MIN_POPULATION_FOR_BRIGADE_NAME` or `MIN_ELIGIBLE_FOR_BRIGADE_SPAWN`). Use `municipalityPopulation1991` / 1991 census when available.
- Differentiate: (a) **OOB historical brigades** (e.g. 1st Celinac Light Infantry = VRS) — keep as RS-only; (b) **emergent spawn** — gate by pool + demographics; (c) **naming** — if a mun has insufficient faction population, use generic name or skip creation.
- **Files:** [src/scenario/oob_phase_i_entry.ts](../../src/scenario/oob_phase_i_entry.ts), spawn logic, scenario_runner when loading 1991 population.
- **Handoff:** Formation-expert delivers design note; Gameplay-programmer implements; Scenario-creator-runner-tester sanity-checks (e.g. Čelinac, small-Bosniak muns).

---

### 3.2 Casualties and reinforcement (Gameplay-programmer, Game-designer)

**Goal:** Brigades suffer personnel loss from combat; reinforcement from militia pool restores personnel.

**Tasks:**

- Introduce **personnel loss** from combat: when a brigade participates in an attack or defense (or when its AoR settlements are under pressure/breach), apply a deterministic **casualty step** that reduces `formation.personnel` (and optionally composition).
- Define **reinforcement** from militia pool to restore personnel (extend existing pool/brigade flow).
- **Determinism:** Same state + same orders → same personnel deltas; no randomness. Determinism-auditor to review.
- **Files:** [src/state/game_state.ts](../../src/state/game_state.ts) (FormationState.personnel), new or extended pipeline step(s), serialization.
- **Canon:** Canon-compliance-reviewer to confirm alignment with Phase II / Systems Manual.

---

### 3.3 Garrison split and combat formula (Game-designer, Gameplay-programmer)

**Goal:** If a brigade holds N settlements in AoR, manpower is split across them (e.g. equal). Defender strength at a settlement = garrison at that settlement; attacker strength = formula (frontline + HQ reinforcement).

**Tasks:**

- **Garrison model:** For each brigade with AoR = set S of settlements, define **per-settlement garrison** = f(personnel, |S|) (e.g. equal split: personnel / |S|). Store or derive settlement-level garrison strength for combat resolution.
- **Attacker force:** When a brigade attacks one settlement, attacker strength = formula (e.g. garrison of attacking brigade’s frontline settlements adjacent to target + reinforcement from HQ). Define constants and formula; keep deterministic.
- **Combat resolution:** Defender strength = garrison at **that settlement**. Attacker strength = as above. Resolve breach/flip or casualty exchange from these values.
- **Deliverables:** Formula doc; state or derived structure for per-settlement garrison; integration with breach/casualty steps. Determinism-auditor and Canon-compliance-reviewer sign-off.

---

### 3.4 One-attack-per-brigade (optional), attack orders, OG/corps for larger ops (Game-designer, Technical-architect, Gameplay-programmer)

**Goal:** User or AI may designate **one target settlement per attacking brigade per turn** (brigade does **not** need to attack every turn — only when AI or player judges it should). Larger operations require OGs or corps.

**Design rules:**

- **Brigade does not attack every turn.** A brigade attacks only when the AI (or player) judges it should, based on factors such as strategic direction, brigade readiness, supply, and opportunity.
- **When attacking:** A brigade may have at most **one** designated attack target per turn. Engine accepts **attack orders** (e.g. brigade_id + target_settlement_id); only that attack is resolved.
- **OG/corps:** Multi-brigade or multi-settlement offensives are conducted via **operational groups** or **corps actions**, not by each brigade independently choosing a target. OG/corps can "own" a set of attack orders (e.g. N brigades, M target settlements, one order bundle per turn).

**Tasks:**

- Define **attack order** schema (e.g. `brigade_attack_orders: Record<FormationId, SettlementId | null>`; null = no attack this turn).
- Pipeline step to resolve attacks from orders; integrate with garrison/combat formula and breach/casualties.
- Extend OG/corps so they can issue or bundle attack orders.
- **Files:** GameState (new or extended order state), [src/sim/phase_ii/](../../src/sim/phase_ii/), bot_brigade_ai.

---

### 3.5 Capable AI — top priority; separate AIs per faction (Gameplay-programmer, Product Manager)

**Goal:** Capable AI is **top priority** for all factions. Implement **separate AIs per faction** with **different priorities**. Brigade attacks only when AI judges it should (strategic direction, readiness, etc.), not every turn.

**Tasks:**

- **Per-faction AI:** Separate AI profiles or strategy for RBiH, RS, HRHB with different priorities (e.g. RS territorial expansion vs RBiH survival/corridors vs HRHB consolidation).
- **Brigade/AoR AI:** (1) **Select attack target per brigade per turn only when judged appropriate** (readiness, supply, strategic direction, opportunity). (2) **Reshape AoR** to balance load (e.g. transfer settlements from overloaded to underloaded brigades). (3) **Request or simulate OG/corps actions** when multiple brigades should cooperate.
- **Factors for “should attack”:** Strategic direction, brigade readiness, fatigue, supply, front geometry, garrison balance, objectives. No obligation to attack every turn.
- **Files:** [src/sim/phase_ii/bot_brigade_ai.ts](../../src/sim/phase_ii/bot_brigade_ai.ts), [src/sim/bot/bot_strategy.ts](../../src/sim/bot/bot_strategy.ts), faction-specific strategy tables or modules.
- **Handoff:** Product Manager to prioritize AI scope (e.g. Phase 1: per-faction priorities + one target per brigade when judged; Phase 2: AoR rebalance; Phase 3: OG/corps coordination). QA-engineer for test plan (determinism, no invalid orders).

---

## 4. Paradox Role Summary (Deferred Work)

| Role | Primary items |
|------|----------------|
| Formation-expert | 3.1 Demographic gating design |
| Game-designer | 3.1, 3.2, 3.3, 3.4 Design notes and formulas |
| Gameplay-programmer | 3.1–3.5 Implementation |
| Technical-architect | 3.4 Attack order schema, OG/corps |
| Canon-compliance-reviewer | 3.2, 3.3 Canon alignment |
| Determinism-auditor | 3.2, 3.3 Ordering and no randomness |
| Scenario-creator-runner-tester | 3.1, regression checks |
| QA-engineer | 3.5 AI test plan |
| Product Manager | Scope and phasing; AI priority |
| Orchestrator | Scope and phasing with PM |
| Documentation-specialist | Systems Manual, Phase II Spec, ledger |

---

## 5. Verification: scenario runs (after implementation)

**When:** After the items in this plan (or the scope agreed by Orchestrator and Product Manager) are implemented.

**Steps:**

1. Run representative scenarios (e.g. `apr1992_50w_bots`, `apr1992_50w_bots_allied`) for the agreed number of weeks.
2. Inspect outputs: `end_report.md`, `run_summary.json`, `final_save.json` (control deltas, formation counts, exhaustion, breach-driven flips in Phase II).
3. If illogical or ahistorical outcomes appear (e.g. control changes without breach, impossible brigade counts, nonsensical AoR), correct implementation and re-run until behavior is acceptable.
4. Scenario-creator-runner-tester to flag any remaining improbabilities; document results and any follow-up fixes in the plan or ledger.

**Do not run scenarios for verification until the planned implementation work (or agreed subset) is complete.**

### 5.1 First verification run (2026-02-11)

After implementing §3.1 (demographic gating), §3.3 (garrison/getSettlementGarrison), §3.4 (attack orders + resolve step), §3.2 (casualties + Phase II reinforcement), and bot attack orders (posture attack/probe → one target per brigade):

- **Scenario:** `apr1992_50w_bots.json`, 50 weeks, run id `apr1992_50w_bots__6e81bac9f1991f42__w50`.
- **Final control (settlements):** HRHB 355, RBiH 2133, RS 3334 (total 5822). Shares: HRHB 6.1%, RBiH 36.6%, RS 57.3%.
- **Benchmarks (turn 26):** RS pass (57.1% vs 45% ±15%); RBiH fail (36.7% vs 20% ±10%, above expected); HRHB fail (6.2% vs 15% ±8%, below expected).
- **Historical comparison:** RS and RBiH bands are plausible (VRS ~70% by early 1993; ARBiH held corridors and enclaves). HRHB at 6% is low; historically HVO held Mostar and significant Herzegovina. Follow-up: consider parameter tuning for HRHB (alliance/defensive bonuses, or RS pressure on HRHB in mixed areas) and/or benchmark band adjustments.

---

## 6. References

- Phase II Spec §2.3 (control in Phase II only from military actions): Control changes in Phase II (canon amendment 2026-02).
- [Phase_I_Specification_v0_5_0.md](../10_canon/Phase_I_Specification_v0_5_0.md) §4.3 (Phase I control flip remains in Phase I only).
- [MILITIA_BRIGADE_FORMATION_DESIGN.md](../20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md).
- [BRIGADE_OPERATIONS_SYSTEM_COMPLETION_REPORT.md](BRIGADE_OPERATIONS_SYSTEM_COMPLETION_REPORT.md).
