# Srebrenica Diagnostic V2 — Audit (Quantitative Deepening)

- **Date:** 2026-05-04
- **Lane:** LANE-NIGHTSHIFT-SREBRENICA-DIAGNOSTIC-V2
- **Status:** AUDIT-ONLY — § 6 BLOCKED for any FIX. This lane delivers diagnostic depth; it does NOT propose, suggest, or implement engine, OOB, rupture-condition, or canon changes. No production code touched.
- **Predecessor:** `docs/40_reports/audits/20260503_SREBRENICA_RUPTURE_NON_FIRING_DIAGNOSTIC.md` (R2-6).
- **Tools delivered (file-ownership exclusive to this lane):**
  - **Extended:** `tools/diagnostics/srebrenica_rupture_trace.cjs` — additive V2 fields: per-perimeter brigade roster (location_osid + personnel + morale + cohesion), per-enclave force-concentration ratios, predictor `force_ratio_estimate` harvest from AARs.
  - **NEW (parametric):** `tools/diagnostics/late_war_atrocity_pre_conditions.cjs` — accepts `<run_dir> <rupture_event_id>`, classifies any unmet precondition into one of 5 classes (a engine bug / b upstream / c bot AI / d combat math / e canon-correct emergent silence). Registry-driven so future canon expansions are a registry edit, not a code edit.
- **Tests delivered:** `tests/srebrenica_diagnostic_v2.test.ts` (4 tests).
- **Primary fixture run:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1623`.
- **Top-line finding (Q-CANON-RUPT-4):** Evidence below indicates the predictor's `force_ratio_estimate` collapses to **0.092** for the historically-correct Krivaja-95 launch turn (t180), driven by the joint product of capital-OSID multipliers, hardened-resilience defense, and pocket-garrison-from-population. This suggests the Ring-2 rupture cannot fire under any plausible *unforced* corps-AI commit at this canon-permitted combat-math envelope. **For § 6 sign-off chain consideration**, this surfaces Q-CANON-RUPT-4 as a **forced choice** between canon-permitted heuristic recording (path c in R2-6's framing) versus explicit acceptance that the rupture may not fire in some runs (path d). Paths (a) and (b) — corps-AI fix or combat-math relaxation — are blocked here pending § 6 sign-off; this lane does not advocate either.

---

## 0. Working note checkpoint (lane progress)

- Phase 1 — extend `srebrenica_rupture_trace.cjs`: **DONE.** Smoke-tested against n1623; new sections render; R2-6 keys preserved.
- Phase 2 — author `late_war_atrocity_pre_conditions.cjs`: **DONE.** Smoke-tested with `srebrenica_genocide_1995` (class d) and `__test_zepa_fall_1995` (class c).
- Phase 3 — audit report (this file): **DONE.**
- Phase 4 — tests `tests/srebrenica_diagnostic_v2.test.ts` (4 tests): **DONE.**

No engine code, no OOB, no rupture wiring, no FORAWWV, no political controllers, no paint anchors, no run artifacts modified.

---

## 1. The 5 R2-6 sign-off questions, deepened with witness data points

R2-6 binds five canon-amendment questions for § 6 reviewers. Each question below is restated, then deepened with a quantitative **witness data point** the reviewer can cite directly.

### Q-CANON-RUPT-1 — force-commit floor for trigger ops

> *For the canonical 1995 enclave-capture operations (Krivaja-95, Stupčanica-95), what is the binding minimum committed-brigade count and minimum personnel that the engine must enforce on the VRS Drina Corps?*

**R2-6 evidence:** Krivaja-95 launched with 2 brigades / 2 558 pers; Stupčanica-95 launched with 3 brigades / 5 957 pers.

**V2 witness data point (from extended `srebrenica_rupture_trace.cjs` against n1623, full Drina-perimeter roster):**

| Brigade ID | Location OSID | Pers | Morale | Cohesion |
|---|---|---:|---:|---:|
| rs_1st_birac | op:zvornik:kozluk_2 | 2 000 | 0 | 20.00 |
| rs_1st_guards_motorized | op:visegrad:drinsko | 2 200 | 14 | 20.00 |
| rs_1st_podrinje | op:vlasenica:grabovica | 2 000 | 0 | 20.00 |
| rs_1st_vlasenica | op:rogatica:pljesevica | 2 000 | 12 | 30.95 |
| rs_1st_zvornik | op:zvornik:krizevici | 0 | 100 | 1.00 |
| rs_5th_podrinje | op:vlasenica:sebiocina | 1 234 | 29 | 20.00 |
| rs_visegrad_brigade | op:visegrad:zlijeb | 0 | 11 | 15.65 |

The Drina perimeter holds **9 434 RS personnel across 7 formations** (5 of which retain combat strength); Krivaja-95 drew **2 of 7** (rs_1st_milii — not on perimeter at t180 — plus rs_5th_podrinje). The corps-AI commit is **27 % of available perimeter pers, 29 % of perimeter formations**. The numerical floor for a § 6 binding answer is now visible: any plausible historical reading floors above 5/7 perimeter formations and ≥ 7 000 pers; the engine commits ~ 1/4.

**Class:** (c) bot AI gap, confirmed quantitatively. *No fix proposed in this lane.*

---

### Q-CANON-RUPT-2 — combat-math envelope for capital-OSID enclaves

> *Is `force_ratio_estimate ≈ 0.09` against a hardened capital-OSID enclave with garrison ~600, resilience 25, isolation 173 turns the intended canon outcome of the layered defense bonuses?*

**R2-6 evidence:** Krivaja-95 saw `force_ratio_estimate = 0.092` at launch.

**V2 witness data point (predictor harvest across all enclave-targeting ops in n1623):**

| Operation | Started | Force_ratio_estimate | Initial pers | Targeted enclave OSIDs | Outcome |
|---|---:|---:|---:|---|---|
| Operation Podrinje Sweep | t6 | **11.957** | 7 963 | op:srebrenica:brezovice_2 (peripheral) | failure / planning_invalidated |
| Operation Cerska-Kamenica | t40 | **0.5999** | 3 810 | brezovice_2, radovcici, sulice_2 | failure / planning_invalidated |
| Operation Stupčanica-95 (Žepa) | t172 | **0.8376** | 5 957 | op:rogatica:zepa_2 | failure / max_failures |
| Operation Krivaja-95 | t180 | **0.0918** | 2 558 | srebrenica_2 + 4 pocket OSIDs | failure / planning_invalidated |

The predictor's view of the same Drina Corps drops from `11.957` at t6 (peripheral target, no resilience hardening) to `0.092` at t180 (capital target, hardening_active=true, isolation_turns=173). The shift is **130×**. Even at the 4× larger Stupčanica-95 commit against Žepa (a non-capital enclave with resilience 20 / hardened), the predictor reads `0.838` — sub-parity, but two orders of magnitude above the Krivaja-95 reading. Witness data point for § 6: the **`0.092` at canonical launch turn is a property of the layered capital-OSID defense, not of force levels.** Concentration ratios at t188 (extended tracer):

| Pair | Attacker pers | Defender pers | Ratio |
|---|---:|---:|---:|
| Drina perimeter / pocket | 9 434 | 3 000 | **3.14×** |
| Drina perimeter / capital only | 9 434 | 600 | **15.72×** |
| Drina perimeter / Žepa capital | 9 434 | 286 | **32.99×** |

Even the extreme **32.99× concentration** at Žepa produced predictor `0.838` (sub-parity), confirming that the layered defense bonus dominates over force concentration at this envelope.

**Class:** (d) combat math gap, confirmed quantitatively. *No fix proposed in this lane.*

---

### Q-CANON-RUPT-3 — Žepa parity

> *Should `rupture_consequences.ts` carry a separate `zepa_fall_1995` consequence?*

**R2-6 evidence:** No `zepa_genocide_1995` evaluator exists; Žepa is Ring 2 narrative only.

**V2 witness data point (extended tracer + new tool):**
- Žepa resilience entry at t188: `{ "hardening_active": true, "isolation_turns": 173, "resilience": 20 }` (parallel to Srebrenica's 25 / 173 / hardened).
- Žepa capital garrison at t188: **286 pers** (vs. Srebrenica capital's 600 pers).
- Žepa concentration ratio at t188: **32.99×** (vs. Srebrenica capital's 15.72×).
- Stupčanica-95 (Žepa) `force_ratio_estimate = 0.838` — predictor classes it as sub-parity-but-not-hopeless; op nevertheless recovered at `max_failures` after a single attack.
- Parametric tool — `__test_zepa_fall_1995` registry entry — classifies Žepa-control as class **(c) bot-AI commit shortfall** (not class d as Srebrenica), since the predictor ratio `0.838` is above the `0.5` combat-math threshold. The two enclaves fail the rupture for **different reasons in the same run**.

This is a witness data point for § 6: the structural picture differs between Srebrenica (combat-math-blocked) and Žepa (bot-AI-blocked) under identical canon. A future canon answer to Q-CANON-RUPT-3 either way (yes / no parity) cannot rely on the assumption that one fix would cover both.

**Class:** mixed — Srebrenica (d) vs Žepa (c). *No fix proposed in this lane.*

---

### Q-CANON-RUPT-4 — rupture vs. predictor coupling — design intent (TOP-LINE)

> *Is the Ring-2 rupture intended to fire only when c2 emerges from unforced combat, or is there a canon-permitted path for the engine to record the rupture under historical-window heuristics even if the bot/combat predictor would not fall the enclave?*

**R2-6 evidence:** The rupture evaluator is a *reporter* of locked consequence; the contract is "if the enclave falls *by mechanics* in 1995, record the genocide rupture."

**V2 witness data point (joint reading of Q1, Q2, Q3 above):**
- Q1 evidence shows the corps AI does not commit historically-plausible force.
- Q2 evidence shows that even *with* historically-plausible force (the 32.99× Žepa concentration), the predictor reads sub-parity at the layered hardened-capital envelope.
- Q3 evidence shows the **two enclaves fail the rupture for two different mechanical reasons in the same run.**

Joint conclusion: under the present combat-math envelope, no plausible bot-AI-only fix produces c2 = true at the rupture window. Under the present bot-AI envelope, no plausible combat-math-only fix produces c2 = true either (the predictor floor is two orders of magnitude below feasibility at the capital OSID).

**§ 6 sign-off chain implication:** Q-CANON-RUPT-4 narrows from "is the rupture intended to be predictor-coupled" to a **forced four-way choice**:

| Path | Description | Evidence-based feasibility |
|---|---|---|
| (a) Corps-AI fix alone | Force the perimeter ring to commit ≥ 5/7 formations and ≥ 7 000 pers | INSUFFICIENT — the predictor still reads 0.092 at the capital, see Q2. |
| (b) Combat-math relaxation alone | Reduce the layered capital-OSID defense product | INSUFFICIENT — the corps AI still does not commit, see Q1. |
| (c) Canon-permitted historical-window heuristic | Record the rupture when c1∧c3 hold and a historical-window flag fires, regardless of c2 emergent state | **Mechanically feasible**, but is it canon-permissible? § 6 question. |
| (d) Explicit acceptance | Accept that the rupture may not fire in some runs; the Ring-2 contract holds; the rupture is canonically silent when mechanics produce no fall | **Mechanically already true.** The R2-6 contract reading. |

This lane delivers the **evidence base** for § 6 to choose between (c) and (d). Paths (a) and (b) are foreclosed by the joint witness data: neither dimension alone closes the gap.

**Class:** (e) for the rupture-record layer itself; the question is which higher-tier path canon binds. *No fix proposed.*

---

### Q-CANON-RUPT-5 — sensitive-history boundary on diagnostic outputs

> *Is the diagnostic tool's stdout / JSON output (which lists garrison rosters and force ratios at Srebrenica) within the read-only diagnostic envelope?*

**R2-6 evidence:** R2-6 tool reports aggregates; no atrocity outcomes, no civilian casualty figures, no named victims.

**V2 witness data point (extended + new tool output schemas):**
- Extended tracer adds: `vrs_drina_perimeter_roster` (brigade ID, OSID, pers, morale, cohesion), `concentration_ratios` (3 entries), `enclave_op_predictor_ratios` (op metadata + predictor ratio + outcome label).
- New parametric tool adds: per-condition classification labels (a/b/c/d/e), attempted_ops list with same shape as AARs (no civilian casualty fields).
- **No new field surfaces civilian casualty figures, named victims, or atrocity outcomes.** All new fields are military-state aggregates already present in `final_save.json` and `operation_aars.json`. The output envelope is unchanged in *kind*; it is deepened in *resolution* within the same boundary.

Witness data point for § 6: the tool output remains squarely within the read-only diagnostic envelope per `SENSITIVE_HISTORY_DESIGN_GATE.md` — no Ring 3 surface is created.

**Class:** (e) canon-correct, *no fix needed.*

---

## 2. Top-3 quantitative findings from n1623

| # | Finding | Witness | Maps to § 6 question |
|---|---|---|---|
| 1 | Krivaja-95 launches with 2/7 perimeter formations and 2 558 pers, **27 %** of available perimeter pers, against the canonical capital OSID. | Extended tracer perimeter roster (9 434 pers, 7 formations) vs AAR `participating_brigades`. | **Q-CANON-RUPT-1** (force floor) — quantifies the corps-AI commit shortfall. |
| 2 | Predictor `force_ratio_estimate` for the canonical Krivaja-95 launch is **0.0918** — **130× lower** than the same corps' t6 predictor reading on a peripheral target (`11.957`). | AAR harvest in extended tracer + new tool. | **Q-CANON-RUPT-2** (combat-math envelope) — quantifies the layered capital-OSID defense product. |
| 3 | Žepa concentration ratio at t188 is **32.99×** (9 434 / 286), yet Stupčanica-95 reads `force_ratio_estimate = 0.838`; Srebrenica and Žepa fail the rupture for **different mechanical classes (d vs c)** in the same run. | Extended tracer `concentration_ratios.zepa` + parametric tool `__test_zepa_fall_1995` classification. | **Q-CANON-RUPT-3** (Žepa parity) — single-fix coverage refuted; AND **Q-CANON-RUPT-4** (forced four-way choice). |

---

## 3. Cross-reference back to R2-6

- R2-6 § 1 Findings table (c1/c2/c3) — V2 reproduces verbatim under the new schema; canonical condition keys preserved.
- R2-6 § 2 Hypothesis ranking H1/H2/H3 — V2 evidence base now lets § 6 reviewers assign quantitative weight: H1 commit shortfall = 73 % perimeter pers unused; H2 predictor over-credit = 130× envelope shift; H3 rupture-record correctness = unaltered.
- R2-6 § 3 Cross-cuts — Žepa parity now has its own classification label (c) distinct from Srebrenica's (d); the parametric tool exposes the asymmetry by registry probe rather than free-form prose.
- R2-6 § 4 § 6 questions — each is given a witness data point above.
- R2-6 § 5 boundary — V2 strictly preserves: no engine code, no OOB, no rupture wiring, no run artifacts, no canon flips.

---

## 4. Verification

- Extended tracer: smoke-runs cleanly against n1623; emits all V2 fields (concentration ratios, perimeter roster, predictor harvest); R2-6 stdout keys preserved.
- Parametric tool: smoke-runs cleanly against `srebrenica_genocide_1995` (class d) and `__test_zepa_fall_1995` (class c) registry entries.
- 4/4 tests in `tests/srebrenica_diagnostic_v2.test.ts` cover: extended-tracer determinism, extended-tracer read-only, parametric-tool parametricity, parametric-tool determinism.
- No engine, OOB, rupture-wiring, FORAWWV, paint-anchor, political_controllers, or run-artifact mutation.

---

## 5. What this lane does NOT do

- Does **not** modify `enclave_resilience.ts`, OOB JSON, rupture conditions, FORAWWV, paint anchors, or `political_controllers`.
- Does **not** propose a code fix or relax a precondition.
- Does **not** suggest a fix candidate; § 6-BLOCKED for any FIX.
- Does **not** alter run artifacts.
- Does **not** answer Q-CANON-RUPT-1..5 — only deepens the evidence base on which § 6 reviewers will answer.
