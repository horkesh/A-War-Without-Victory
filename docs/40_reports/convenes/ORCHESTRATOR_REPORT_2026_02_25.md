# Orchestrator Report

**Date:** 2026-02-25  
**Purpose:** Big-picture state of the game, single priority, and team coordination.

---

## 1. Big-picture summary

### Where we are

- **MVP:** Phase 6 complete; scope frozen. A1 tactical base map stable; HoI 3D is canonical player-facing map.
- **Recent completions (2026-02-24–25):**
  - **Supply (Phases 1–5):** OSID supply trace, supply_mult in combat, cascade semantics, querySupplyPaths/3D supply mode, enclave resilience stub, supplyConnectivityByFaction in bot context. Refactor-pass between each phase; Architect decisions flagged for user review.
  - **War termination:** Minimal spec (WAR_TERMINATION_MINIMAL_SPEC.md) drafted and Architect-signed; directive 1.1 complete.
  - **Player's Turn Guide:** Confirmed Rulebook §15 satisfies backlog 1.2; no change.
  - **Phase 0 JNA_status:** Hand-off implemented (Option A1); canon §7.7/§8 updated.
  - **Bot AI calibration (ongoing):** Session 1 (n115–n125): corridor scoring, concentration attacks, corps rebalancing, HVO OOB fixes; report propagated to canon and CONSOLIDATED_BACKLOG §7. Session 2 (n138–n140): ethnic scoring, init control fix (hybrid_1992 + operational_political_control.json), Bihać penalty narrowing, heartland time-decay, Pelagićevo corridor, ARBiH undefended bonus, HVO Posavina retreat. RS territory 52.7% (target 60–65%); combat sustained 45/52 weeks; HVO orders 2→18.
- **Open critical blockers (CONSOLIDATED_BACKLOG §7):** Front-assignment bug (all RS brigades on HRHB-RS front, none on RBiH-RS — blocks corridor attacks), corps personnel imbalance, enclave protection (Srebrenica/Goražde/Cazin), ARBiH 4th/2nd Corps balance.
- **Pipeline-next (no bot dependency):** 20260223_PIPELINE_NEXT_WHILE_BOT_REWRITE.md — critical path items 1.1 (war termination) and 1.2 (Player's Turn Guide) done; 1.3 (supply spec) → SUPPLY_DESIGN.md and full supply implementation done. Important: 2.1 (JNA_status) done; 2.2 (Phase II ceasefire/Washington in pipeline) and 2.3–2.5 remain. AoR follow-ups 3.1–3.3 (recon OSID, aor_init cleanup, test/baseline strategy) and other backlog §4 still to sequence.

### Where we're going

- **Single strategic direction:** Stabilise bot behaviour and historical plausibility (front-assignment fix is the top unblocker), then continue pipeline-next and supply follow-ups (cascade visibility, enclave formula) per PM sequencing.
- **Parallel track:** External expert bot rewrite per BOT_AI_DESIGN_SPEC.md; pipeline-next work does not block on it.
- **Canon/process:** No canon or FORAWWV edits in this report; determinism and ledger discipline apply.

---

## 2. Single agreed priority and owner

**Single priority:** **Fix the front-assignment bug** so RS brigades can be assigned to the RBiH–RS front (and thus attack Brčko/Posavina corridor). This is the critical blocker called out in CALIBRATION_REPORT_BOT_AI_FEB_2026.md §7 and CONSOLIDATED_BACKLOG §7.

- **Owner:** Gameplay Programmer (implementation); Technical Architect (front/assignable_front_segments and pipeline contract); Formation-expert if OOB/front derivation is involved.
- **Acceptance:** At least one RS brigade assignable to RBiH–RS front; bot can issue attack orders toward corridor OSIDs from that front; 52w run shows RS corridor pressure (no requirement to hit 60–65% in this step, but unblock progress toward it).
- **Handoff:** Orchestrator sets this as the single priority; PM may sequence any small pipeline item (e.g. 2.2 Phase II ceasefire/Washington step) in parallel if non-blocking.

---

## 3. Team coordination and handoffs

| From | To | Decision / handoff |
|------|-----|----------------------|
| Orchestrator | PM | Sequence pipeline-next items 2.2–2.5, 3.1–3.3, and §4 after or in parallel with front-assignment fix; keep bot rewrite (external expert) and pipeline-next doc as reference. |
| Orchestrator | Gameplay Programmer | Own front-assignment bug fix (derive/assignment so RS sees RBiH–RS front; bot uses it for corridor orders). |
| Orchestrator | Technical Architect | Confirm assignable_front_segments / front_edges derivation and pipeline contract for Phase II; flag any contract change for review. |
| Supply implementation | User | Architect decisions in ledger (Option A, next-turn cascade, recompute-on-query) remain for user review; no further supply phases mandated until sign-off. |
| Bot calibration | Backlog | Remaining issues (personnel distribution, enclave protection, 4th/2nd Corps, Cazin/Livno/Orasje/Zvornik anchors) stay in CONSOLIDATED_BACKLOG §7 for next prioritisation. |

---

## 4. References

- [CONSOLIDATED_BACKLOG.md](CONSOLIDATED_BACKLOG.md) §7 (Bot AI), §9 (Pipeline next)
- [20260223_PIPELINE_NEXT_WHILE_BOT_REWRITE.md](backlog/20260223_PIPELINE_NEXT_WHILE_BOT_REWRITE.md)
- [CALIBRATION_REPORT_BOT_AI_FEB_2026.md](../CALIBRATION_REPORT_BOT_AI_FEB_2026.md)
- [ORCHESTRATOR_SUPPLY_IMPLEMENTATION_EXECUTION_2026_02_24.md](convenes/ORCHESTRATOR_SUPPLY_IMPLEMENTATION_EXECUTION_2026_02_24.md)
- docs/PROJECT_LEDGER.md (latest entries 2026-02-24–25)
- .agent/napkin.md (Session Notes 2026-02-24, 2026-02-23)
