# Wave 6 — CampaignPlan offensive_targets briefing override (n1965)

**Role:** scenario-creator-runner-tester
**Run:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1965/`
**Baseline:** n1964 (`runs/apr1992_definitive_188w__210e69404d054959__w188_n1964/`)
**Final state hash:**
- n1965: `39d270f19a04e84f`
- n1964: `cf0ef794b32f9b06`
- Hashes differ → some persisted state changed.
**Date:** 2026-05-22
**Scenario:** apr1992_definitive_188w (188 weeks, hash-suffix `210e69404d054959`)

---

## 1. TL;DR

Wave 6's principled fix (briefing.ts:586-602, CampaignPlan `front_priority.offensive_targets` overrides `overlay.role === 'economy'`) **did not change any observable simulation output** vs n1964.

- OSID match: identical to n1964 (`run_summary.vs_historical` byte-identical).
- Anchors: **23/27** — same 4 failures as n1964 (vozuca_2, boljanic_2, petrovo_2, brijesnica_donja_2).
- Faction count Σ|Δ|: **94** vs jan1993 painted (HRHB -47, RBiH +20, RS +27). Identical to n1964 (also 94). [User's brief said n1964=92 — actual JSON value at `run_summary.vs_historical.counts_by_controller` is 94 for both runs.]
- HRHB ops: still 2 finalized (Op Jackal succeeds, Cincar/Kupres fails) — byte-identical AAR.
- RS overshoot: identical (+27 RS vs jan1993, same as n1964 +27).
- `war_alliance_rbih_hrhb` = 1.0 at w188 (Wave 5 still holding).
- Operation outcome distribution: identical (5 success / 8 partial / 34 failure across 47 ops).

**The state-hash difference is entirely from `military.army_corps_directives_by_faction`, `military.army_co_decision_traces`, `military.corps_command`, and `military.pending_officer_events`** — i.e. bookkeeping inside the directive/briefing trace, NOT ground truth (control, brigades, casualties, ops).

Wave 6 changed **what the briefing layer records about itself** (corps now logged as `deviated: true / compliance_score_low` with `directive_magnitude: "limited"` and `permission_flags: ["preserve_reserve"]` instead of `"standard"` + `"authorize_offensive"`), but the downstream behavior (whether ops launch, whether brigades attack, whether OSIDs flip) is unchanged because the gate Wave 6 was supposed to lift was already non-binding given the rest of the n1964 state.

**Verdict:** Wave 6 is **inert on outputs at this checkpoint**. It restored the principled mechanic (per-corps offensive_targets escape from economy overlay) without regressing anything, but it did not retract RS overshoot (because RS overshoot in n1964 was not caused by economy-overlay suppression) and did not unlock additional HRHB ops (Cincar/Kupres still 0 attacks, `no_objectives_held`).

---

## 2. Citations (JSON paths)

- `runs/.../n1965/run_summary.json` — `vs_historical.counts_by_controller`, `vs_historical.final_total`, `historical_fit.anchor_checks`, `bot_benchmark_evaluation`.
- `runs/.../n1965/operation_aars.json` — per-op outcome, captured OSIDs, axis summaries.
- `runs/.../n1965/control_delta.json` — flips/total_flips (byte-identical to n1964).
- `runs/.../n1965/final_save.json` — `political.war_alliance_rbih_hrhb`, `military.alliance_locks`, `military.army_corps_directives_by_faction`, `military.pending_officer_events`.
- `runs/.../n1965/run_meta.json` — `scenario_id`, `weeks`, `out_dir`.

---

## 3. Numbers vs n1964

### 3a. OSID match + area-weighted

`run_summary.osid_match_pct` and `area_weighted` are not surfaced as top-level fields in this scenario's `run_summary.json` (those metrics belong to the 40w calibration harness). The 188w harness reports `vs_historical.counts_by_controller` against jan1993 reference (712 OSIDs, same as n1964):

| Controller | Reference | Final | Δ (n1965) | Δ (n1964) |
|---|---:|---:|---:|---:|
| HRHB | 125 | 78 | −47 | −47 |
| RBiH | 273 | 293 | +20 | +20 |
| RS    | 314 | 341 | +27 | +27 |
| **Σ\|Δ\|** | | | **94** | **94** |

Both runs are **byte-identical at the `vs_historical` block**.

Note: the canonical-painted reference cited in the user's brief (86.66% OSID match) is a separate metric not present in this run's `run_summary.json`. Within this run's available metric (jan1993 reference at 712 OSIDs), the match rate is the same.

### 3b. Anchors

n1965: **23 / 27** passed. Same 4 failures as n1964:

| Anchor | Expected | Actual | Status |
|---|---|---|---|
| op:zavidovici:vozuca_2 | RS | RBiH | FAIL |
| op:doboj:boljanic_2 | RS | RBiH | FAIL |
| op:gracanica:petrovo_2 | RS | RBiH | FAIL |
| op:lukavac:brijesnica_donja_2 | RS | RBiH | FAIL |

(All four are RBiH-over-VRS overshoots in the central-Bosnia / Tuzla corridor — the well-known cluster from prior runs. Wave 6 did not touch them.)

Bot benchmarks: **6 / 6** evaluated, 0 failed, 0 not_reached. Identical to n1964.

### 3c. Faction count Σ|Δ|

n1965: **94** (HRHB −47, RBiH +20, RS +27). n1964: **94**. Wave 6 produced **zero change** in faction count delta. Painted-target distance is unchanged.

### 3d. HRHB ops finalized

n1965: **2** finalized (same as n1964):

| Operation | Outcome | Objectives captured | Notes |
|---|---|---|---|
| Op Jackal | success | 2 (`op:mostar:hodbina_2`, `op:stolac:rotimlja_2`) | Stolac-Čapljina sweep, 9 brigades, 829k/1520w inflicted, 418k/766w suffered, ended w(see AAR). HV Croatian-army brigades (113th/116th/1st guards/4th guards) participated. |
| Op Cincar / Kupres | failure | 0 | 2 brigades, 0 attacks, 2-turn duration ending w134, `capture_provenance: no_objectives_held`. **Did NOT escape the briefing economy gate** even though Wave 6 was designed to do so. |

The expectation in the brief — "HRHB Cincar/Kupres might also escape now that briefing override is active" — **did not materialize**. The op still aborted with 0 attacks. This means either (i) Cincar/Kupres has no offensive_targets in its CampaignPlan, (ii) hvo_tomislavgrad CampaignPlan wasn't populated for Wave 6 to read, or (iii) the failure mode is downstream of the economy overlay (e.g. brigade availability, op_injection eligibility, OG activation). Hypothesis (iii) is supported by the AAR: `total_attacks: 0` despite the op reaching `ended_turn: 134` — the corps had brigades, the op was created and resolved, but no attack was attempted on any of the 3 Kupres objectives.

### 3e. RS overshoot

n1965 RS Δ vs jan1993 painted: **+27** (341 vs 314).
n1964 RS Δ vs jan1993 painted: **+27** (341 vs 314).

The user brief stated that n1963 had "+15 RS net territory" and that Wave 6 should retract toward "+2 RS baseline" (n1961). The current measurement against jan1993 painted shows **+27** for both n1964 and n1965, so within this metric the Wave 6 vs n1964 comparison is **zero delta**. If "n1963 +15" refers to a different comparison (e.g. flip-count delta vs an earlier run, not absolute count vs jan1993 reference), that comparison isn't reproducible from the artifacts in n1965/n1964 alone — they are equal.

### 3f. HRHB territory delivery

`run_summary.vs_historical` shows HRHB final_count = **78** vs reference 125 = gap **−47**. This is the same gap as n1964 (the brief cited "−28 gap" which doesn't reconcile with the current vs_historical block — possibly an area-weighted figure from a different reference). Op Jackal captured 2 OSIDs (`op:mostar:hodbina_2`, `op:stolac:rotimlja_2`) — identical to n1964. **No additional HRHB ops fired**.

### 3g. war_alliance trajectory

`final_save.political.war_alliance_rbih_hrhb = 1.0` at w188.
`final_save.military.alliance_locks = [{expires_turn: 10084, mode: "floor", value: 0.8}]`
`military.political_leaders.RBiH.alliance_posture = "committed"`
`military.political_leaders.HRHB.alliance_posture = "committed"`

Wave 5's alliance floor is intact in n1965. **Wave 6 did not perturb the alliance lock**, as designed.

### 3h. Operation outcome distribution

n1965 (47 ops total):
- by faction: RS 23, HRHB 2, RBiH 22.
- by outcome: **success 5, partial 8, failure 34**.

n1964 (47 ops total): identical — RS 23, HRHB 2, RBiH 22; success 5, partial 8, failure 34.

`operation_aars.json` is **byte-identical** between n1965 and n1964 (379,890 bytes both, SHA-equal). Wave 3A.1 paper-flip behavior is unchanged.

---

## 4. Where does the state-hash difference come from?

The two final_save.json files differ by ~257KB. Decomposing by top-level key:

| Key | n1965 size | n1964 size | Equal? |
|---|---:|---:|---|
| `displacement` | — | — | identical |
| `factions` | — | — | identical |
| `meta` | — | — | identical |
| `military` | 3,583,478 | 3,398,853 | **DIFFERS** |
| `operation_history` | — | — | identical |
| `political` | — | — | identical |
| `schema_version` | — | — | identical |
| `turn_summaries` | — | — | identical |
| all others | — | — | identical |

Drilling into `military.*`:

| Sub-key | n1965 size | n1964 size | Equal? |
|---|---:|---:|---|
| `army_co_decision_traces` | 56,353 | 42,311 | **DIFFERS (+14KB)** |
| `army_corps_directives_by_faction` | 2,428 | 2,137 | **DIFFERS (+0.3KB)** |
| `corps_command` | 524,411 | 523,347 | **DIFFERS (+1KB)** |
| `pending_officer_events` | 286,874 | 117,643 | **DIFFERS (+169KB, ~2.4× growth)** |
| `political_directives_by_faction` | 354 | 357 | DIFFERS (−3 bytes) |
| All other military sub-keys | — | — | identical (formations, brigade_front_assignment, casualty_ledger, formations, sector_combat_ratings, front_edges, etc.) |

**Interpretation.** Wave 6's behavioral effect at this snapshot is:

1. **Directive metadata flip.** `army_corps_directives_by_faction` rewrote every RS corps from `directive_magnitude: "standard"` + `permission_flags: ["authorize_offensive"]` to `"limited"` + `["preserve_reserve"]`, and tagged all 8 RS corps with `deviated: true / deviation_reason: "compliance_score_low"`. HRHB corps similarly demoted from `"standard"` to `"limited"`. RBiH directives are absent from this block in both runs (so no diff).

2. **Pending officer event queue growth.** n1965 has 677 pending events vs 464 in n1964 (+213). The new event types include `army:RS:directive:4` carrying `interpreted_order.directive_verb: "PREPARE_RESERVE"` with all 8 RS corps listed as "secondary" objectives. n1964's queue is dominated by `arrival_<officer>_t<turn>` officer_available events. Wave 6's briefing override appears to be generating additional directive-acknowledgement events that pile up unconsumed.

3. **Decision-trace growth.** `army_co_decision_traces.HRHB[]` and `.RS[]` arrays grew because additional briefing rounds were recorded — but the rationales remain `"... executes BALANCE_FRONTS as issued"` (per-turn HRHB) which suggests the trace expanded without changing the underlying decision.

**Critical observation.** None of these changes propagated to the layer that actually moves brigades, fires ops, or flips OSIDs. The downstream evidence:
- `brigade_temporal_log.jsonl` byte-identical (23.3 MB).
- `displacement_event_log.jsonl` byte-identical (14.1 MB).
- `weekly_report.jsonl` byte-identical (1.4 MB).
- `control_delta.json` byte-identical.
- `operation_aars.json` byte-identical.
- `formation_delta.json`, `destroyed_brigades.json`, `activity_summary.json` byte-identical.
- `watched_operations.json` byte-identical.

This is the diagnostic signature of a change that **alters how the briefing layer narrates itself** but does not change what brigades or ops actually do — i.e. the override path is being recorded but is downstream of (or in parallel with) the decisions that were already going to happen.

---

## 5. Hypotheses for the inertness

H1 — **The economy overlay was never the binding constraint in n1964.** Wave 4A's revert of B1_HIGH_EXHAUSTION_THRESHOLD from 12000 → 500 reintroduces a gate, but RS overshoot in n1964 may have come from a different code path (e.g. RS bot directives selecting offensives via posture / probe / triggered-op channels that bypass the briefing role check entirely). Wave 6's CampaignPlan override only helps if a corps both has offensive_targets AND would otherwise be blocked by the economy overlay. Tests suggest RS corps never actually were blocked at the operation-creation gate in n1964; they were already producing the 23 RS ops we see.

H2 — **Cincar/Kupres failure is downstream of the briefing layer.** Op Jackal succeeded in both runs; Cincar/Kupres failed with `total_attacks: 0` in both runs. The Wave 6 override would only matter if the *briefing* was telling hvo_tomislavgrad "stay defensive" and that was the reason Cincar/Kupres registered 0 attacks. Since Op Jackal — also HRHB, also explicitly offensive — fired its 2 attacks and captured 2 OSIDs, the briefing layer was not the gate. The gate is more likely in launch_feasibility / brigade availability / staging logic for hvo_tomislavgrad's Kupres axis (2 brigades, all the way west, defending against 1st Krajina).

H3 — **The directive-magnitude shift to "limited" is a deviation accounting artifact.** Wave 4A's revert + Wave 6's override interact such that the briefing layer now logs every RS corps as deviated (`compliance_score_low`), but the corps CO ignores the deviation and follows its CampaignPlan. The decision trace records the divergence as metadata but the executing layer (op creation, brigade assignment) runs off the CampaignPlan directly. This would explain the +169KB growth in pending_officer_events: each compliance-deviation event is queued for acknowledgement but never consumed because nothing materially changed.

---

## 6. Flags (ahistorical / unintended)

1. **Inert principled fix.** Wave 6 is correctly authored (per the user's brief, briefing.ts:586-602 promotes offensive_targets over economy overlay) but at this scenario checkpoint it produces no observable effect. This is a flag because it means either (i) the gate was never binding in n1964, or (ii) the override is short-circuited by a deeper code path. Either way, the **principled mechanic is now in place but unproven**.

2. **pending_officer_events queue inflation.** n1965 carries 677 unacknowledged events into the final save (vs 464 in n1964, +46%). If these never get consumed, the queue may grow unboundedly across long campaigns. The `army:RS:directive:4` event with `acknowledged: false` from very early turns suggests acknowledgement logic for `PREPARE_RESERVE` directives is absent or fires only conditionally. This is a hygiene flag, not a calibration flag, but worth a brief follow-up.

3. **HRHB still at −47 vs painted.** The HRHB deficit (78 vs 125) is unchanged. Cincar/Kupres is the canonical historical op for the early-1992 Bugojno/Tomislavgrad axis (Croat capture of Kupres was a real event), and its 0-attack failure remains structural. Wave 6 did not address this.

4. **4 anchor failures unchanged.** vozuca_2 / boljanic_2 / petrovo_2 / brijesnica_donja_2 still fall to RBiH — a known cluster. Wave 6 was not designed to touch them, and it didn't.

---

## 7. Conceptual proposals (non-code)

P1. **Confirm whether the briefing-override path is reachable for HRHB Cincar/Kupres.** Add a diagnostic that logs, per op-creation attempt, whether `front_priority.offensive_targets` was non-empty AND `overlay.role === 'economy'` — i.e. whether the Wave 6 override actually fired. If the count is zero across the 188-week run, Wave 6 is effectively dead code at this scenario.

P2. **If the override fired and Cincar/Kupres still showed 0 attacks, the gate is elsewhere.** Likely candidates: launch_feasibility (P14 from the audit — defender artillery/terrain), brigade availability at the Kupres staging OSID (op:livno:livno_2), or operation_preparation timing. Hand to operations-expert + commander triad.

P3. **Acknowledge or expire `army:*:directive:*` events.** The 677 → 464 growth across one wave suggests these aren't being consumed. Either (a) the directive layer should auto-acknowledge after N turns, or (b) the acknowledgement step is missing in the war_phases pipeline. Hand to gameplay-programmer.

P4. **Re-baseline the comparison.** The brief's n1964 numbers (Σ|Δ| = 92, RS +15, HRHB gap −28) don't reconcile with the JSON in `run_summary.vs_historical` (94 / +27 / −47). Recommend re-reading the n1964 numbers from the same JSON path before declaring Wave 6 success/failure on those targets; this memo treats the JSON as authoritative.

P5. **Keep Wave 6 in tree.** Even though it's inert at this checkpoint, the principled fix is correct in spec and may activate under different scenario conditions (e.g. with deeper exhaustion making the economy overlay actually bind on more corps). Reverting it would lose a correct mechanic to chase a behavior change that has another source.

---

## 8. Verdict

Did Wave 6 work? **Spec-wise: yes** (the briefing.ts edit landed and the directive bookkeeping reflects it). **Behavior-wise: no observable effect at w188.** All controllables (control, brigades, ops, casualties, displacement, alliance, anchors, benchmarks) are byte-identical to n1964. The state-hash difference is entirely in briefing/decision/directive-event metadata that does not propagate to ground truth at this snapshot. Net improvement vs n1964 on the user's metric set is **zero**.

The expected retraction of RS overshoot and HRHB Cincar/Kupres unlock did **not** occur. RS overshoot vs jan1993 painted reference is +27 in both runs (not +15 → +2 as the brief hypothesized). HRHB ops finalized count is still 2 (Op Jackal succeeds, Cincar/Kupres fails with 0 attacks).

**Recommended next step.** Before any further calibration waves, run the P1 diagnostic to determine whether Wave 6's override path is ever reached. If not, the mechanic is correct but dormant, and any further "fix" attempts should target the actual binding gate (launch feasibility / op_injection / OG activation), not the briefing layer.

---

*Generated by scenario-creator-runner-tester. Read-only audit. No code or canon changes proposed.*
