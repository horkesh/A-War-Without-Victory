# Orchestrator 16-Week Run Report — apr1992_definitive_52w

**Date:** 2026-02-21  
**Scenario:** apr1992_definitive_52w  
**Weeks:** 16  
**Run id:** apr1992_definitive_52w__541030cba3322401__w16  
**Run folder:** `runs/apr1992_definitive_52w__541030cba3322401__w16_n41`  
**Final state hash:** 0fb45c7b25663be9

---

## 1. Executive summary

A new 16-week headless run of the canonical April 1992 scenario completed successfully. **7/8 historical anchors passed**; **centar_sarajevo** failed (expected RBiH, actual RS), consistent with prior 52w runs and Sarajevo siege behaviour. Phase II produced **37 control flips** (41 orders, 256/217 casualties); **all 41 battles were defender-absent**. Formation and recruitment behaved as intended (4 brigades added, personnel and capital growth); two report issues were flagged (AoR vs final control labelling, RBiH committed fractional value). **Single priority:** Sarajevo siege behaviour (centar_sarajevo + Ilidža ring) — design/scenario/tuning or holdout exception per Game Designer and Scenario-creator-runner-tester.

---

## 2. Tracked dimensions

| Dimension | Source | Value |
|-----------|--------|--------|
| **Settlements (control)** | run_summary, end_report | 37 with controller change; net HRHB 1018→1019, RBiH 2297→2279, RS 2507→2524 |
| **Anchors** | run_summary | 7/8 passed (zvornik, bijeljina, srebrenica, bihac, banja_luka, tuzla, S163520 ✓; centar_sarajevo ✗) |
| **Phase II** | run_summary | 41 orders, 37 flips; casualties 256 att / 217 def; 41 defender-absent, 0 defender-present |
| **Formations** | end_report, run_summary | +4 brigades (HRHB +3, RS +1, RBiH +0); 0 removed; total fatigue 0→1509 |
| **Personnel** | run_summary historical_alignment | HRHB 17646→23355; RBiH 61233→100713; RS 43835→55007 |
| **Recruitment capital** | run_summary | HRHB 300→358, RBiH 400→570, RS 600→732 |
| **Displacement** | run_summary | phase_ii_takeover: 9 camps, 14 timers started, 10 matured; minority flight active (weeks 4,8–9,12–13,16) |
| **Civilian** | run_summary | RBiH killed 30075; RS killed 16692, fled 42396; HRHB killed 4579, fled 11062 |
| **vs_historical (jan1993)** | run_summary | HRHB +63, RBiH +188, RS −251 settlements (16w vs jan1993 reference) |
| **Bot benchmarks** | run_summary | 0 evaluated (run 16w; checks at 26w/52w = not_reached) |

---

## 3. Per-role sections

### Formation-expert

**What works as intended**
- Formation delta (4 brigades added) matches historical_alignment; personnel and recruitment capital move together; militia committed aligns with personnel; OOB and fatigue applied consistently; no spurious formation churn.

**What does not**
- centar_sarajevo anchor failure is control/anchor, not formation logic. End-report “AoR (settlements per faction)” shows initial control counts (1018/2297/2507), not final (1019/2279/2524) — misleading. RBiH “committed” pool is 100748.186 (fractional); should be integer.

**What needs changing, tuning, or investigating**
- Clarify or fix AoR in end_report (final vs initial, or label explicitly). Investigate RBiH committed fractional value (rounding/source). Confirm whether RBiH is intended to gain 0 new brigades in 16w (formation_spawn_directive / pool thresholds). Defender-absent-only battles: bot/positioning and defensive commitment as design follow-up.

### Scenario-creator-runner-tester

**What works as intended**
- Seven of eight anchors pass; Zvornik (13 flips RBiH→RS) historically plausible; direction of control (27 RBiH→RS, 9 RS→RBiH) coherent; displacement and civilian systems active; vs_historical at 16w interpretable.

**What does not**
- Sarajevo siege outcome wrong: centar_sarajevo and Sarajevo boroughs (ilidza 8 flips, stari_grad_sarajevo, hadzici) overstate RS gains; historically city centre stayed ARBiH. All 41 Phase II battles defender-absent (unrealistic).

**What needs changing, tuning, or investigating**
- Siege/holdout or defensive bonus for centar_sarajevo (and possibly Sarajevo boroughs); clarify in canon/scenario whether these are special-case “hold” munis. Investigate defender_present_battles: 0 (garrison/defender model, bot targeting). Review Ilidža and Sarajevo ring in scenario/init or phase specs. Confirm jan1993 as reference for 16w or add early-war reference; confirm centar_sarajevo anchor definition (RBiH for apr1992→dec1992).

---

## 4. Consolidated findings

| # | Item | Owner |
|---|------|--------|
| 1 | **Sarajevo siege (centar_sarajevo + Ilidža ring)** — holdout/siege exception or tuning so city centre does not flip to RS at 16w | Game Designer, Scenario-creator-runner-tester |
| 2 | **End-report AoR** — report final control or label “AoR at run start” | Scenario-harness-engineer / Gameplay Programmer |
| 3 | **RBiH committed fractional (100748.186)** — integer commitment and report sanity check | Gameplay Programmer / Formation-expert |
| 4 | **Defender-present battles** — why 0/41; defensive commitment or bot targeting | Game Designer, Gameplay Programmer |
| 5 | **RBiH +0 brigades in 16w** — confirm scenario/canon intent vs spawn thresholds | Formation-expert, Game Designer |

---

## 5. Single priority and owner

**Priority:** Sarajevo siege behaviour (centar_sarajevo and Sarajevo boroughs). Decide design/scenario/tuning or holdout exception so centar_sarajevo anchor can pass or anchor definition is updated; document in canon or scenario docs.  
**Owner:** Game Designer, with Scenario-creator-runner-tester for historical framing; handoff to Gameplay Programmer if mechanic change required.

---

## 6. Front / AoR and corps reshaping (examination)

**Context:** Latest changes re brigade assignment to fronts follow the **Front Assignment (HoI-style)** proposal and the three workstreams (3D icons, AoR display, brigade 1–4). Three-tier model: **army** (derived), **corps** (edge_ids; derived from brigade AoR initially; player-drawable later), **brigade** (settlement_ids = `brigade_aor`). Corps can **reshape** brigade AoR via `applyCorpsFrontAutoDistribution` when `corps_front_edges` exists.

### 6.1 What the 16w run shows

| Aspect | In this run | Verdict |
|--------|-------------|--------|
| **Brigade AoR** | Present in final_save (`brigade_aor`); used for pressure, attack orders, init/rebalance. | **Functioning** — brigade-level fronts and 1–4 cap (personnel/desired) are in use. |
| **front_edges** | Present in final_save (persisted after `refreshFrontEdgeSnapshot`). | **Functioning** — global front line derived from control/AoR each turn. |
| **front_pressure** | Present in final_save. | **Functioning** — pressure pipeline active. |
| **corps_front_edges** | **Absent** in final_save and never set during the run. | **Not exercised** in headless. |
| **Corps reshaping AoR** | Pipeline step `apply-corps-front-orders` runs only when `context.state.corps_front_edges` exists; it never exists in headless, so the step no-ops. | **Not functioning in headless** — corps do not reshape AoRs in this run. |

### 6.2 Why corps do not reshape in headless

- **`ensureDerivedCorpsFrontEdges`** is only called from **desktop_sim.ts** when the player stages a corps front order (IPC). The scenario harness does not call it; the turn pipeline does not call it before `apply-corps-front-orders`.
- So in headless: `corps_front_edges` is never populated → `apply-corps-front-orders` returns immediately → **`applyCorpsFrontAutoDistribution` never runs** → corps do not reassign brigade_aor from corps front edges.
- Per ORCHESTRATOR_SCENARIO_RUNS_NEW_MECHANICS_2026_02_21 and follow-up #4: “Optional: call `ensureDerivedCorpsFrontEdges` before `apply-corps-front-orders` in turn pipeline so headless runs also have derived corps fronts.”

### 6.3 Tracking recommendations

To track “are corps reshaping AoRs and fronts?” in future runs:

1. **run_summary.json** — Add a small block when Phase II ran, e.g.  
   `front_corps_tracking: { corps_front_edges_present: boolean, corps_count: number }`  
   so we can see at a glance whether the run had corps fronts and how many.
2. **final_save** — Already persists `front_edges` and `front_pressure`. If headless starts populating `corps_front_edges` (e.g. via pipeline call to `ensureDerivedCorpsFrontEdges`), serialization already includes it (`serializeGameState.ts`).
3. **Optional pipeline change** — Call `ensureDerivedCorpsFrontEdges(state, edges)` at the start of Phase II (or before `apply-corps-front-orders`) in the turn pipeline so headless runs get **derived** corps fronts from brigade AoR; then `apply-corps-front-orders` would run and could reshape brigade_aor. That would make “corps reshaping” testable in harness runs and allow tracking in run_summary/end_report.

### 6.4 Summary

- **Brigade-level fronts and AoR:** Functioning; brigade_aor and front_edges/front_pressure are present and used.
- **Corps tier (reshaping AoRs):** Not functioning in this headless run; by design corps_front_edges are only set in the desktop path. To track and test corps reshaping in scenario runs, add run_summary tracking and optionally derive corps fronts in the pipeline for headless.

---

## 7. References

- **Run artifacts:** `runs/apr1992_definitive_52w__541030cba3322401__w16_n41/` — run_summary.json, end_report.md, final_save.json, control_delta.json, formation_delta.json, activity_summary.json, control_events.jsonl, weekly_report.jsonl.
- **Latest run map state:** `data/derived/latest_run_final_save.json` (from --map).
- **Canon:** Systems Manual, Phase II spec; PROJECT_LEDGER; napkin § Scenarios, § Phase I/II.
- **Front/AoR:** FRONT_ASSIGNMENT_HOI_STYLE_PROPOSAL.md; ORCHESTRATOR_THREE_WORKSTREAMS_3D_ICONS_AOR_BRIGADE_CAP_2026_02_20.md; corps_front_assign.ts (ensureDerivedCorpsFrontEdges, applyCorpsFrontAutoDistribution); turn_pipeline.ts (apply-corps-front-orders).

---

## 8. Brigade panel audit (tactical map, 2026-02-21)

Per user request: which elements are still used, which are not, which are missing. Reference: tactical map right-side panel when a brigade is selected (e.g. 102nd Motorized); `MapApp.renderBrigadePanel`, `openBrigadePanel`.

| Element | Status | Notes |
|--------|--------|--------|
| **Unit name, kind, faction, personnel** (header/subtitle) | **Used** | From `FormationView`; subtitle shows kind, faction, pers, posture. |
| **Faction emblem / crest** | **Used** | `getCrestUrl(f.faction)`; crest wrap in panel. |
| **CHAIN OF COMMAND** (Part of corps, corps name) | **Used** | Rendered when `f.corps_id`; click opens corps panel. |
| **STATISTICS** (Personnel, Movement, Posture, Fatigue, Cohesion) | **Used** | All wired from `FormationView`; movement label from movementStatus/movementStance. |
| **AOR** (“X/Y settlements covered”) | **Used** | From `gs.brigadeAorByFormationId[f.id] ?? f.aorSettlementIds`; shows 0/0 when AoR not in loaded state or formation has no AoR. Overextended and urban fortress noted. |
| **ACTIONS** (Posture dropdown, Move, Reposition, Attack, Undeploy/Deploy, Clear Orders) | **Used** | Posture select and buttons wired; eligibility from cohesion/readiness. |
| **Desired AoR / Max settlements (1–4)** | **Used** | Per ORCHESTRATOR_THREE_WORKSTREAMS §7, “desktop only” dropdown was implemented; tactical map `renderBrigadePanel` does not show desired-cap control. Add here for parity if design says so. |
| **Day / Night mode** | **Fixed** | Day is now default; N toggles to night (WarMapRenderer, map_operational_3d). |
| **Corps front staging** | **Fixed** | “Invalid corps formation” resolved by accepting `corps_asset` and `army_hq` in desktop_sim. |
| **OOB left side (corps, list by corps/fronts, click → zoom and select)** | **Done** | OOB has “By corps” / “By faction” toggle; corps headers and subordinate brigades; click formation → setSelectedFormation, openBrigadePanel, zoom to formation. |
