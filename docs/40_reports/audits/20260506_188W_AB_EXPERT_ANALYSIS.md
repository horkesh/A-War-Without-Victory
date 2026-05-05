# 188w A/B Expert Analysis — MORALE_OVERRIDE Phase 1 Retune + Stupčanica SHAPE B + Krivaja Phase 1

**Date**: 2026-05-06
**Lane**: LANE-NIGHTSHIFT-188W-AB-EXPERT-ANALYSIS
**Type**: Audit-only — Ring 1 — read-only investigation
**Status**: IN-PROGRESS (working note; will be finalized below)

## Ring Classification

This audit is **RING 1** (read-only). No engine code, scenario JSON, test, canon, or other source artifact is touched. The only file authored is this report.

Per-lane Ring classification of the **commit-status decisions this audit informs**:

- **MORALE_OVERRIDE Phase 1 retune (staged in working tree)** — commit/revert decision is RING 1 if the staged scope matches the previously-approved triple sign-off envelope (faction-keyed timeline + dissolution consumer + apr1992 timeline data). No new §6 surface; flag-gated and shadow-only. Verdict drives commit/revert; no code change is made by this audit.
- **Stupčanica SHAPE B (`b3dadcb0`, already committed)** — commit was RING 1 / §6 triple sign-off (`b03333af`); this audit only verifies AC-14/AC-15 outcomes against the committed prediction table. RING 1 audit-only.
- **Krivaja Phase 1 (`bc44ddec`, already committed)** — regression check only; no new commit. RING 1 audit-only.

## Run Inventory

| Run | Hash | Description |
|---|---|---|
| n1690 | `df7a8cd836eacbc8` | `MORALE_OVERRIDE_ENABLED=true` (default-ON variant); SHAPE B + Krivaja P1 + retune |
| n1691 | `b4be38bed12816fb` | `MORALE_OVERRIDE_ENABLED=false` (override-disable variant); SHAPE B + Krivaja P1, retune dormant |
| n1619 | `4ba56cfd4fae9824` | predecessor reference; NO Krivaja P1, NO Stupčanica SHAPE B, MORALE_OVERRIDE off-by-default-then |

All three are 188w `apr1992_definitive_188w` scenario, scenario hash `210e69404d054959`.

## Methodology

Three lenses applied, each producing raw-numbers pass before synthesis:
1. **`/scenario-creator-runner-tester` lens** — MORALE_OVERRIDE retune criterion 3 verdict (per-faction dissolution count, incremental absorption %, per-faction officer_quality Δ/turn at four segments).
2. **`/war-or-game` lens** — Stupčanica SHAPE B AC-14 prediction-vs-actual table for 5 OSIDs; AC-15 time-series regression; SHAPE B vs Krivaja P1 vs retune disentanglement.
3. **`/historian` lens** — sensitive-history capital-controller regression check (Srebrenica, Žepa, all canonical sensitive-history OSIDs).

Plus: overall regression — operation_delivery_audit, opportunity_campaign_proof byte-stability vs predecessor.

## Working Note — Data Gathering Checkpoints

**Checkpoint 1 (initial)**: run_meta confirmed for all three runs; scenario_id and scenario_path identical. Run dirs contain `operation_aars.json`, `weekly_report.jsonl`, `activity_summary.json`, `final_save.json`, `control_delta.json`, `formation_delta.json`, `destroyed_brigades.json` for n1690 and n1691; n1619 lacks `brigade_temporal_log.jsonl` and `replay_save_sequence.json` (older predecessor pre-dating these artifacts).

**Checkpoint 2 (anchors raw)**:
- n1690 anchors 26/27 PASS (only `op:brcko:brcko` fails: expected RS, actual RBiH).
- n1691 anchors 26/27 PASS (same single failure: brcko).
- n1619 anchors 25/27 PASS (brcko fail + `op:bugojno:kopcic_2` fail: expected RBiH, actual RS).
- All 5 sensitive-history Stupčanica/Krivaja AC-3 OSIDs (zepa_2, srebrenica_2, gorazde_2, bihac_2, centar_sarajevo) show `actual_controller=RBiH` in n1690 and n1691 anchor checks → AC-3 PASS (no flips).
- Anomaly counts: n1690 critical=1 info=7 total=21; n1691 critical=0 info=10 total=20; n1619 critical=2 info=14 total=28. Both 188w follow-on runs reduce critical-class anomalies vs predecessor (1 and 0 vs 2). n1619 had `kopcic_2` flipped RS — recovered in n1690/n1691 (anchor improvement).

**Checkpoint 3 (op_aars sizes)**: n1690 ops file 15078 lines, n1691 11399 lines, n1619 12798 lines. Differential size between n1690 vs n1691 (3679 lines) is the structural marker of MORALE_OVERRIDE flag-on vs flag-off behavior in the operation pipeline (extra promotions / dissolution-related events traced in operation lifecycle). Both follow-on runs have 188 weekly_report lines — full 188w execution, no premature exit.

**Checkpoint 4 (per-faction dissolution counts — RAW)**:

| Run | Total | RBiH | RS | HRHB | Notes |
|---|---|---|---|---|---|
| n1690 (override=ON) | 61 | 2 | 48 | 11 | Default-ON variant |
| n1691 (override=OFF) | 33 | 1 | 26 | 6 | Override-disable variant |
| n1619 (predecessor) | 50 | 4 | 38 | 8 | NO Krivaja P1, NO SHAPE B, override off-by-default-then |

All entries `lifecycle_status=destroyed`. No anomalous status classes.

**Incremental absorption (n1690 - n1691, attributable to MORALE_OVERRIDE flag flip)**:
- RBiH: 2 - 1 = +1 incremental
- RS: 48 - 26 = +22 incremental
- HRHB: 11 - 6 = +5 incremental
- TOTAL incremental: 28

- RS share of incremental: 22 / 28 = **78.6%**
- HRHB share: 5 / 28 = 17.9%
- RBiH share: 1 / 28 = 3.6%

**Binding criteria (criterion 3 reconciled to RS≤35/188w, ≤55% absorption, ≤7.5/40w)**:
- RS per-faction count ≤35/188w: RS=48 in n1690 → **48 > 35 → FAIL**
- RS absorption ≤55%: 78.6% → **FAIL**
- Per-40w proportional ≤7.5/40w (RS=48 over 188w → 48 × 40 / 188 = 10.21/40w) → **10.21 > 7.5 → FAIL**

ALL THREE binding criteria for criterion 3 → **FAIL** in n1690 vs n1691.

This is a **STOP-TRIGGER-FIRED** signal for the MORALE_OVERRIDE Phase 1 retune.

**Checkpoint 5 (segmented late-war arc — by `turn_destroyed`)**:

Per-faction destroyed counts by turn segment (188w split into 4 quarters: t1-52, t53-104, t105-156, t157-188):

| Segment | n1690 RS | n1691 RS | n1619 RS | n1690 HRHB | n1691 HRHB | n1619 HRHB | n1690 RBiH | n1691 RBiH | n1619 RBiH |
|---|---|---|---|---|---|---|---|---|---|
| t1-52 | 8 | 5 | 4 | 4 | 3 | 4 | 2 | 1 | 3 |
| t53-104 | 11 | 7 | 19 | 2 | 3 | 3 | 0 | 0 | 1 |
| t105-156 | 3 | 7 | 8 | 5 | 0 | 1 | 0 | 0 | 0 |
| t157-188 | **26** | **7** | **7** | 0 | 0 | 0 | 0 | 0 | 0 |

**Key finding**: The MORALE_OVERRIDE flag-on retune produces a **massive RS late-war (t157-188) dissolution wave**: 26 vs n1691's 7 vs n1619's 7. The +19 RS dissolutions in the final quarter are entirely concentrated late-war and are NOT mirrored in HRHB or RBiH.

The retune IS bending the late-war arc steeper for RS (intended), but the magnitude (+19 in t157-188 alone, +22 total RS incremental) breaks all three criterion-3 binding bands.

The 78.6% RS absorption shows load is NOT being transferred to HRHB/RBiH — but the **scale** of the RS load remains too large.

The segments t1-52 and t53-104 show modest deltas (+3 and +4 RS); the failure is squarely in the late-war (t105-188) regime where RS dissolutions accumulate to 29 vs n1691's 14 (+15 incremental).

**Checkpoint 6 (AC-14 prediction-vs-actual — Stupčanica + Krivaja-95)**:

Source: `operation_aars.json`, filtered by op_name regex `(stupcanica|krivaja|zepa|srebrenica)`.

| Run | Op Name | OSID Targets | Started→Ended | force_ratio_estimate | total_attacks | outcome | recovery_reason | objectives_captured |
|---|---|---|---|---|---|---|---|---|
| n1619 | Stupčanica-95 | zepa_2 | 172→179 (7t) | 0.8315 | 1 | failure | max_failures | [] |
| n1619 | Krivaja-95 | srebrenica_2 (5) | 179→186 (7t) | 0.0944 | 0 | failure | planning_invalidated | [] |
| n1690 | Krivaja (early-war) | grapska_gornja_2, gornje_krcevine | 90→96 (6t) | 0.2275 | 0 | failure | planning_invalidated | [] |
| n1690 | Krivaja-95 | srebrenica_2 (5) | 168→172 (4t) | 0.1646 | 0 | failure | planning_invalidated | [] |
| n1690 | Stupčanica-95 | zepa_2 | 172→184 (12t) | **1.000** | 1 | failure | max_failures | [] |
| n1691 | Krivaja-95 | srebrenica_2 (5) | 168→174 (6t) | 0.0918 | 0 | failure | planning_invalidated | [] |
| n1691 | Stupčanica-95 | zepa_2 | 174→184 (10t) | 0.6694 | 0 | failure | no_logged_attempt | [] |

**AC-14 prediction band evaluation**:

- **zepa_2 (Stupčanica-95)**: predicted post-SHAPE-B band 0.95-1.05 (border / emergent_fall).
  - n1690 actual: **1.000** → IN BAND (0.95-1.05) → **AC-14 PASS** for n1690.
  - n1691 actual: **0.6694** → BELOW BAND but still NO objective captured, op terminated `no_logged_attempt` → operation never managed to launch any attack. AC-3 binding (no flip) PASSES.
  - SHAPE B effect is strongest with MORALE_OVERRIDE on (n1690): force_ratio bumped from predecessor 0.831 to 1.000 (+0.169), op extended duration 7t → 12t and still produced only 1 attack with no captures. With MORALE_OVERRIDE off (n1691), force_ratio actually DROPPED to 0.6694 (-0.162 vs predecessor) and total_attacks went to 0 — op never attempted.
  - Disentangle: SHAPE B was committed in BOTH n1690 and n1691, but n1691 shows force_ratio 0.6694 vs predecessor 0.8315. This indicates **SHAPE B alone is NOT producing the predicted 0.95-1.05 band** — the 1.000 in n1690 is achieved by the MORALE_OVERRIDE retune layering on top.

- **srebrenica_2 (Krivaja-95)**: predicted post-SHAPE-B band 0.094 ± 0.005 (held).
  - n1619 actual: 0.0944 (baseline)
  - n1690 actual: **0.1646** → DRIFT +0.0702 → **OUTSIDE band 0.089-0.099** → **AC-14 FAIL** for n1690.
  - n1691 actual: **0.0918** → IN BAND → **AC-14 PASS** for n1691.
  - ST-2 binding (no Srebrenica genocide rupture / no flip): both runs hold srebrenica_2=RBiH, no objectives captured (`objectives_captured=[]`), `recovery_reason=planning_invalidated` (op never launched). ST-2 PASS.
  - The +0.0702 drift in n1690 force_ratio is a **§6 finding requiring re-review** per AC-14 binding contract — though the OPERATIONAL outcome (no flip, no attacks, no captures) is unchanged. The predictor is overestimating VRS Drina Corps post-MORALE_OVERRIDE Phase 1 retune, which paradoxically COULD have launched attacks but did not (planning_invalidated still).

- **centar_sarajevo, bihac_2, gorazde_2**: predicted ≤5%, ≤10%, ≤10% absolute drift respectively (AC-10/11 + ST-6 Goražde extension). All three OSIDs are not appearing as direct operation targets in either run's op_aars (no operation named Stupčanica/Krivaja targeted them; no other op operating on these specific OSIDs surfaced in the regex). Capital-controller posture: all RBiH in n1690 and n1691 → ST-6 PASS for capital integrity; force_ratio drift cannot be measured directly from op_aars at OSID granularity for these unless we sample weekly_report. Current evidence: anchor_checks PASS for all three in both runs.

**AC-14 summary**: PASS for zepa_2 in n1690 only (1.000 in band); FAIL for srebrenica_2 in n1690 (drift > ±0.005); PASS for n1691 srebrenica_2 (0.0918 in band). The MORALE_OVERRIDE retune is shifting the predictor's force_ratio for srebrenica_2 outside its no-change envelope — even though operationally NO change occurs (capital still RBiH, no attacks).

**AC-15 (time-series)**: weekly_report sampling needed to confirm intermediate-turn force_ratio at zepa_2 + srebrenica_2 + centar_sarajevo + bihac_2 + gorazde_2. weekly_report.jsonl `brigade_dissolution` block confirms turn-by-turn temporal profile of dissolutions but does NOT include per-OSID force_ratio fields directly. Op-level force_ratio is the AC-14/AC-15 measurable field; intermediate-turn force_ratio for non-op OSIDs (centar_sarajevo, bihac_2, gorazde_2) is not directly tracked in this artifact set. Capital-controller anchor data (anchor_checks) is the binding signal — all 5 OSIDs PASS in both runs. **AC-15 PASS** at the binding-controller level for n1690 and n1691.

**Checkpoint 7 (weekly_report dissolutions, ground truth for retune binding)**:

| Run | Total | RBiH | RS | HRHB |
|---|---|---|---|---|
| n1690 (override=ON) | 79 | 4 | 67 | 8 |
| n1691 (override=OFF) | 35 | 3 | 30 | 2 |
| n1619 (predecessor) | 55 | 7 | 44 | 4 |

Per-segment (from weekly_report.brigade_dissolution):

| Segment | n1690 RS | n1691 RS | n1619 RS | n1690 HRHB | n1691 HRHB | n1690 RBiH | n1691 RBiH |
|---|---|---|---|---|---|---|---|
| t1-52 | 10 | 5 | 4 | 2 | 2 | 3 | 3 |
| t53-104 | 16 | 11 | 23 | 4 | 0 | 1 | 0 |
| t105-156 | 9 | 7 | 10 | 2 | 0 | 0 | 0 |
| t157-188 | **32** | **7** | **7** | 0 | 0 | 0 | 0 |

**Refined criterion 3 verdict using weekly_report (ground truth)**:

Incremental absorption (n1690 - n1691):
- RS: 67 - 30 = +37 incremental
- HRHB: 8 - 2 = +6 incremental
- RBiH: 4 - 3 = +1 incremental
- TOTAL incremental: 44

- RS share: 37 / 44 = **84.1%** (binding ≤55% → **FAIL** by 29.1 percentage points)
- RS count ≤35/188w binding: 67 → **FAIL** by 32 brigades
- Per-40w proportional ≤7.5/40w: 67 × 40 / 188 = 14.26/40w → **FAIL** by 6.76

All three binding criteria FAIL. The retune is overshooting RS dissolution by ~2× across all measures.

**Note on schema discrepancy**: weekly_report counts (79 events) > destroyed_brigades counts (61 terminal destructions) because weekly_report tracks dissolution events (which can include reserve-pool returns), while destroyed_brigades tracks terminal destruction. Either metric independently produces a clear FAIL verdict. The lane charter binding criterion 3 reconciliation references "per-faction dissolution count" — the canonical authoritative source for dissolution events is weekly_report.brigade_dissolution.

(Subsequent sections to be filled as raw data is extracted.)

## Lens 1 — MORALE_OVERRIDE Retune Verdict (`/scenario-creator-runner-tester`)

**Binding criterion 3 (RS≤35/188w, ≤55% absorption, ≤7.5/40w) verdict: STOP-TRIGGER-FIRED**

Per Checkpoint 7 (weekly_report.brigade_dissolution, ground truth):

| Binding | Threshold | Actual (n1690) | Margin | Verdict |
|---|---|---|---|---|
| RS dissolutions per 188w | ≤35 | 67 | +32 over | **FAIL** |
| RS share of incremental absorption | ≤55% | 84.1% | +29.1pp | **FAIL** |
| Per-40w proportional (RS) | ≤7.5/40w | 14.26/40w | +6.76 over | **FAIL** |

The retune is bending the late-war RS dissolution arc steeper as designed, but the magnitude (+37 RS dissolutions vs override-disable) overshoots all three binding bands by approximately 2×. Late-war (t157-188) is the dominant overshoot region: 32 RS dissolutions in n1690 vs 7 in n1691.

**Per-faction officer_quality Δ/turn at four segments**: officer_quality is not surfaced in run artifacts at faction granularity (weekly_report `factions` block only contains `exhaustion`/`supply_pressure`; no officer_quality field). The brigade_dissolution events DO carry per-brigade `morale` and `cohesion` snapshots which could serve as proxy for the late-war collapse arc, but officer_quality slope is not directly extractable from current artifact set.

**Gap flagged**: future verdict iterations would benefit from explicit `officer_quality` per-faction-per-turn instrumentation in weekly_report or a dedicated `command_quality.jsonl` artifact. Without this, criterion-3 sub-clause "verify retune is BENDING the late-war arc steeper for RS without transferring load to HRHB/RBiH" must be derived from dissolution counts (which it can be, and IS bending; the failure is amplitude, not direction).

The dissolution-count direction does match design intent (RS late-war pressure increases without major HRHB/RBiH side effects: HRHB +6 incremental over 188w, RBiH +1 incremental — both small relative to RS +37). The retune did NOT transfer load. The retune simply over-shoots on RS itself.

**Verdict for MORALE_OVERRIDE Phase 1 retune: STOP-TRIGGER-FIRED → REVERT staged work.**

## Lens 2 — Stupčanica SHAPE B AC-14 / AC-15 Verdict (`/war-or-game`)

**AC-3 (no Žepa flip RBiH→RS)**: PASS (both runs hold zepa_2=RBiH).
**ST-2 (no Srebrenica genocide rupture)**: PASS (both runs hold srebrenica_2=RBiH; `srebrenica_genocide_1995` event NOT fired in any run; only consequence event `csq_srebrenica_stalemate_1995@t170` fires, identical across all three runs — that is the consolidated/stalemate-tier behavior consistent with "consolidated state pending future work").

**AC-14 (force_ratio prediction band)**:

| OSID | Predicted Band | n1690 Actual | n1691 Actual | n1690 Verdict | n1691 Verdict |
|---|---|---|---|---|---|
| zepa_2 (Stupčanica-95) | 0.95-1.05 | **1.000** | 0.6694 | **PASS** | FAIL (below band) |
| srebrenica_2 (Krivaja-95) | 0.094 ± 0.005 | 0.1646 | 0.0918 | **FAIL (drift +0.07)** | **PASS** |
| centar_sarajevo | ≤5% drift | controller=RBiH, no op direct | controller=RBiH, no op direct | PASS (capital-controller) | PASS |
| bihac_2 | ≤10% drift | controller=RBiH, no op direct | controller=RBiH, no op direct | PASS (capital-controller) | PASS |
| gorazde_2 | ≤10% drift | controller=RBiH, no op direct | controller=RBiH, no op direct | PASS (capital-controller) | PASS |

**Disentanglement (SHAPE B vs Krivaja P1 vs MORALE_OVERRIDE retune)**:

- n1691 isolates SHAPE B + Krivaja P1 (without MORALE_OVERRIDE retune-on).
- zepa_2 force_ratio drops from predecessor 0.8315 → n1691 0.6694 (-0.162) — SHAPE B + Krivaja P1 ALONE is moving force_ratio AWAY from the AC-14 prediction band.
- The MORALE_OVERRIDE retune (n1690) is what brings zepa_2 to 1.000 (in band). This means the AC-14 prediction band was implicitly dependent on MORALE_OVERRIDE retune effects, even though the retune was not formally part of SHAPE B.
- srebrenica_2: SHAPE B + Krivaja P1 alone (n1691) PRESERVES the 0.094 ± 0.005 band (0.0918 actual). The retune (n1690) is what KNOCKS srebrenica_2 OUT of band (+0.07 drift to 0.1646).

**§8.3 (a) honest correction vs (b) lane-tuning distinction**:
- SHAPE B per-se on zepa_2 in n1691 is showing a MOVEMENT in the wrong direction (away from prediction band). This is a §6 finding requiring re-review.
- The fact that n1690 zepa_2 force_ratio HITS the band only because MORALE_OVERRIDE retune is layering effects, not because SHAPE B alone delivers the predicted band, is **lane-tuning vs honest-correction conflation**. SHAPE B's prediction table appears to have been calibrated against a state that includes MORALE_OVERRIDE retune, even though the lanes are nominally separate.

**AC-15 (time-series regression)**: capital-controller anchors PASS for all 5 OSIDs in both runs. Op-level force_ratio time-series reveals AC-14 deltas as above. centar_sarajevo / bihac_2 / gorazde_2 are not directly targeted by ops in these runs (Stupčanica-95 only targets zepa_2; Krivaja-95 only targets srebrenica_2 cluster) — drift quantification at OSID level for these three would require a separate per-OSID force_ratio sampler not present in the current artifact set.

**Verdict for Stupčanica SHAPE B**:
- AC-3 PASS, ST-2 PASS, ST-6 PASS (capital-controller integrity)
- AC-14 **PARTIAL FAIL**: zepa_2 PASS in n1690 (driven by retune) but FAIL in n1691 (SHAPE B alone misses band); srebrenica_2 FAIL in n1690 (drift outside ±0.005), PASS in n1691.
- AC-15 PASS at capital-controller level; full force_ratio time-series unavailable for non-op OSIDs.
- Net: **AC-14 FINDING REQUIRES §6 RE-REVIEW**. The committed SHAPE B prediction table was calibrated under an implicit assumption (MORALE_OVERRIDE retune layered on) that is now invalidated by criterion-3 STOP-TRIGGER on the retune. With retune reverted, SHAPE B alone does NOT deliver predicted band.
- Action: file follow-up §6 finding for SHAPE B AC-14 prediction table re-calibration; do NOT revert SHAPE B itself (capital-controller bindings PASS).

## Lens 3 — Sensitive-History Regression (`/historian`)

**No unintended controller flips at canonical sensitive-history OSIDs.**

| OSID | n1619 | n1690 | n1691 | Status |
|---|---|---|---|---|
| zepa_2 | RBiH | RBiH | RBiH | held |
| srebrenica_2 | RBiH | RBiH | RBiH | held (no genocide rupture) |
| gorazde_2 | RBiH | RBiH | RBiH | held |
| bihac_2 | RBiH | RBiH | RBiH | held |
| centar_sarajevo (sarajevo_dio_centar_sajarevo) | RBiH | RBiH | RBiH | held |
| brcko | RBiH | RBiH | RBiH | **anchor failure persists** (expected RS, pre-existing) |
| kopcic_2 | RS | RBiH | RBiH | RECOVERED in n1690+n1691 vs n1619 |

**Scripted sensitive events** (from weekly_report.events_fired): all 18 sensitive events fire at IDENTICAL turns across all three runs:

`battle_of_the_barracks_sarajevo@t4`, `sarajevo_siege_begins_1992@t5`, `srebrenica_enclave_forms_1992@t9`, `gorazde_pocket_consolidation_1992@t18`, `morillon_enters_srebrenica_1993@t48`, `srebrenica_shelling_1993@t49`, `srebrenica_demilitarization_1993@t54`, `un_resolution_819_srebrenica_1993@t54`, `sarajevo_tunnel_completed_1993@t64`, `markale_area_shelling_1993@t68`, `markale_massacre_1994@t96`, `gorazde_crisis_1994@t105`, `bihac_5th_corps_offensive_1994@t129`, `bihac_crisis_1994@t135`, `srebrenica_falls_1995@t162`, `zepa_falls_1995@t164`, `csq_srebrenica_stalemate_1995@t170`, `second_markale_massacre_1995@t170`.

The `srebrenica_genocide_1995` rupture event is NOT fired in any run — confirming the "consolidated state pending future work" posture is honored. The consequence event `csq_srebrenica_stalemate_1995@t170` is firing (the stalemate-tier consequence consistent with current canon).

**Verdict (historical fidelity)**: PASS — no sensitive-history regressions. Canonical scripted-event chain is byte-stable across runs.

**kopcic_2 recovery in n1690 and n1691 vs n1619**: this is a positive side-effect of either Krivaja Phase 1 or SHAPE B (committed in both n1690 and n1691, absent in n1619). Bugojno's mountain region holds RBiH instead of flipping RS. Net anchor improvement: 25/27 → 26/27 (+1).

**brcko anchor failure**: pre-existing in predecessor and unchanged by either lane. This is a known open P0 (canonical baseline `n1289`); not introduced by these lanes.

## Lens 4 — Overall Regression (`/scenario-creator-runner-tester`)

**Anchor regression vs predecessor**: NONE. n1690 26/27, n1691 26/27, n1619 25/27. Net improvement of +1 anchor (kopcic_2) in both follow-on runs vs predecessor.

**Anomaly count comparison**:
- n1690: critical=1, info=7, total=21
- n1691: critical=0, info=10, total=20
- n1619: critical=2, info=14, total=28

Both 188w follow-on runs reduce critical-class anomalies vs predecessor (1 and 0 vs 2). Total anomaly count reduced 28 → 21/20.

**Net control distribution (start → end)**:
- All three runs start identically (HRHB:107, RBiH:330, RS:275) and end with similar distributions.
- n1690: HRHB:65 RBiH:290 RS:357
- n1691: HRHB:76 RBiH:280 RS:356
- n1619: HRHB:73 RBiH:283 RS:356

The MORALE_OVERRIDE retune (n1690) shifts ~10-11 settlements from HRHB to RBiH net (n1690 vs n1691 within-comparison: HRHB:65 vs 76 = -11; RBiH:290 vs 280 = +10). This is consistent with the retune accelerating HVO command-quality erosion in central Bosnia → ARBiH gains in HVO-bordering OSIDs.

**operation_delivery_audit, opportunity_campaign_proof byte-stability**: not in standard artifact set; weekly_report `events_fired` is byte-stable across all three runs. operation_aars line counts differ (15078 / 11399 / 12798) — expected drift class given divergent flag/feature combinations.

**40w smoke gate**: parent already ran n1689 post-Stupčanica with hash `a8ef060cc34e0e2d`, anchors 26/27, benchmarks 6/6. 188w runs do NOT introduce fresh regressions in non-sensitive-history OSIDs.

## Verdict Matrix

| Lane | Verdict | Action |
|---|---|---|
| **MORALE_OVERRIDE Phase 1 retune** (staged) | **STOP-TRIGGER-FIRED** | **REVERT staged work** (revert `src/sim/combat/brigade_dissolution.ts`, `src/state/war_timeline.ts`, `data/scenarios/timelines/apr1992.json` to HEAD; commit verdict report only) |
| **Stupčanica SHAPE B** (committed `b3dadcb0`) | AC-3/ST-2/ST-6 PASS; AC-14 **PARTIAL FAIL** (prediction-band drift outside envelope) | Update lane report with AC-14 results; **file follow-up §6 finding** for SHAPE B prediction table re-calibration once retune is reverted |
| **Krivaja Phase 1** (committed `bc44ddec`) | regression check: no new anchor failures, capital-controller integrity preserved | confirm CONTINUE-WITH-CAVEAT verdict still holds; Phase 1.5 successor still expected |

## Per-AC / Per-ST Verdicts (13 carry-forward)

**MORALE_OVERRIDE STs (7 carry-forward)**:
- ST-1 (no Srebrenica/Žepa controller flip): PASS (both runs)
- ST-2 (no genocide rupture): PASS
- ST-3 (anchor count ≥ predecessor): PASS (26 ≥ 25)
- ST-4 (faction territorial balance preserved): PASS (final controls similar)
- ST-5 (no scripted-event chain perturbation): PASS (byte-stable)
- ST-6 (capital-controller integrity for centar_sarajevo, bihac_2, gorazde_2): PASS
- ST-7 (criterion-3 binding bands): **FAIL** — STOP-TRIGGER-FIRED

**Stupčanica SHAPE B STs (6)**:
- ST-1 zepa_2 capital-controller: PASS
- ST-2 srebrenica_2 capital-controller: PASS
- ST-3 anchor count regression: PASS
- ST-4 scripted-event preservation: PASS
- ST-5 (associated AC-3 binding): PASS (zepa_2 RBiH-held)
- ST-6 (centar_sarajevo, bihac_2, gorazde_2 ≤5/10/10% drift): PASS at capital-controller level; quantitative force_ratio sampling unavailable for non-op OSIDs

**Stupčanica ACs**:
- AC-3 (no Žepa flip): PASS
- AC-10 (centar_sarajevo ≤5% drift): PASS at controller level
- AC-11 (bihac_2 ≤10% drift): PASS at controller level
- AC-14 (prediction-band table): zepa_2 PASS in n1690 (driven by retune) / FAIL in n1691; srebrenica_2 FAIL in n1690 / PASS in n1691 — **PARTIAL FAIL aggregate**
- AC-15 (time-series regression): PASS at capital-controller granularity

## Recommended Next Action

1. **REVERT staged MORALE_OVERRIDE Phase 1 retune work** (`src/sim/combat/brigade_dissolution.ts`, `src/state/war_timeline.ts`, `data/scenarios/timelines/apr1992.json`, plus the related `tests/morale_collapse_override.test.ts` working-tree changes and the new `tests/morale_override_phase_1_retune.test.ts` / `tests/morale_override_flag_promotion_phase_1.test.ts` files). The triple sign-off envelope governing this work was bound by criterion 3 reconciled to RS≤35/188w / ≤55% absorption / ≤7.5/40w. ALL THREE bands FAIL by ~2×. This is a STOP-TRIGGER per the panel `568a0fe3` charter and triggers automatic revert.

2. **Commit only this verdict report** (the audit file at `docs/40_reports/audits/20260506_188W_AB_EXPERT_ANALYSIS.md`) per the lane charter — no engine changes flow from this audit other than the revert.

3. **File follow-up §6 finding** against `Stupčanica SHAPE B` for AC-14 prediction-band drift discovered in n1691 (override-disable variant): SHAPE B alone moves zepa_2 force_ratio AWAY from prediction band (0.8315 → 0.6694). Once MORALE_OVERRIDE retune is reverted, the predicted 0.95-1.05 band will not be achieved by SHAPE B alone. Lane report at `docs/40_reports/implemented/20260505_STUPCANICA_DEFENDER_STACK_SHAPE_B.md` (or equivalent) will need an addendum noting this dependency. **This audit does NOT modify that lane report** (out of exclusive-ownership scope).

4. **Krivaja Phase 1 (committed `bc44ddec`)**: regression check verdict CONTINUE-WITH-CAVEAT holds. Phase 1 delivered 3/5 ACTIVE; no new failures introduced. Phase 1.5 successor still expected per existing roadmap.

5. **brcko**: pre-existing P0 anchor failure unchanged. Out-of-scope for this lane.

## Raw Data Source Citations

All raw numbers in this audit are extracted from:
- `runs/apr1992_definitive_188w__210e69404d054959__w188_n1690/run_summary.json` (anchors)
- `runs/apr1992_definitive_188w__210e69404d054959__w188_n1690/destroyed_brigades.json` (terminal destruction events)
- `runs/apr1992_definitive_188w__210e69404d054959__w188_n1690/weekly_report.jsonl` (per-turn dissolution events, events_fired)
- `runs/apr1992_definitive_188w__210e69404d054959__w188_n1690/operation_aars.json` (op-level force_ratio_estimate)
- `runs/apr1992_definitive_188w__210e69404d054959__w188_n1690/end_report.md` (net control distribution)
- (parallel files for n1691 and n1619)

## Stop-Trigger Compliance Summary

13 carry-forward stop-triggers evaluated:
- 7 MORALE_OVERRIDE STs: 6 PASS, 1 FAIL (ST-7 criterion-3 binding bands)
- 6 Stupčanica SHAPE B STs: all PASS at capital-controller level

The single FAIL fires the stop-trigger on MORALE_OVERRIDE Phase 1 retune. SHAPE B itself remains within all stop-trigger bounds (the AC-14 partial fail is a §6 finding, not a stop-trigger).

## Final Status

Audit complete. RING 1 read-only investigation. No engine, scenario, test, or canon code touched. Single new file created (this report).

Verdict matrix delivered for parent batch action.

