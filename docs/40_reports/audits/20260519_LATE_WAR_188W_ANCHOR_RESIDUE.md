# Late-War 188w Anchor Residue — Diagnostic + Root Cause (Batch A-D)

**Date:** 2026-05-19
**Branch:** `codex/late-war-188w-anchor-repair-2026-05-19` (from `main` at `a04cba9a`)
**Scope:** Mechanically-justified investigation of the residual 188w anchor failures observed in n1844 (accepted endgame) and the integrated-context n1852–n1868 wave. **No code, scenario, or canon changed in this batch.** Repair work is gated to Batch B.
**Sensitive-history boundary:** This audit deliberately does NOT touch Srebrenica/Žepa rupture authoring, FORAWWV, or scoring. Investigation is mechanical-only.

## 1. Concrete residue

Two distinct anchor failures, distinct root causes, distinct repair classes.

| Anchor | Expected | Actual @ 188w | Class | Status |
|---|---|---|---|---|
| `op:brcko:brcko` | RS | RBiH | Chronic late-war loss (40w→188w) | Pre-existing (n1741, n1844, n1847, n1854, n1863, n1868) |
| `op:ugljevik:teocak_krstac_2` | RBiH | RS | Regression introduced 2026-05-17 (n1847+) | Inherited drift in integrated-context wave |

Run trajectory:

| Scenario | Hash | brcko | Teocak |
|---|---|---|---|
| 40w current main (n1894/n1912–n1915) | `b14179d65639860c` | **RS** ✓ | **RBiH** ✓ |
| 188w accepted n1844 | `ccd3f9f770052614` | **RBiH** ✗ | RBiH ✓ |
| 188w n1852 (post-04c750e3) | `c757c82da8cd8b67` | **RBiH** ✗ | **RS** ✗ |
| 188w n1854 (post-fatigue/embargo) | `1f81ab4263ace3e9` | **RBiH** ✗ | **RS** ✗ |
| 188w n1855 (embargo neutralized probe) | `1f81ab4263ace3e9` | **RBiH** ✗ | **RS** ✗ |
| 188w n1856 (B3 disabled probe) | `1f81ab4263ace3e9` | **RBiH** ✗ | **RS** ✗ |
| 188w n1868 latest integrated | `3700a34cd255c99c` | **RBiH** ✗ | **RS** ✗ |

The matching n1855/n1856 hashes confirm embargo caps and B3 counter-offers are NOT the cause of the Teocak regression (per `docs/40_reports/CALIBRATION_MASTER.md` lines 21 and 30).

## 2. Brcko initial hypothesis (`op:brcko:brcko` expected RS, actual RBiH at 188w)

**Status after Batch D:** Superseded by the artifact-backed diagnosis in §D and §10. This Batch A hypothesis said RS captured Brčko early via Operation Koridor, then lost it over the long horizon. Direct n1917 inspection falsifies that: `op:brcko:brcko` is RBiH at turn 0 and turn 188, has zero control events, is not listed in the `brcko_corridor` axis objectives, and is never captured in 188w. The current root cause is scenario-authoring asymmetry between 40w painted control and 188w canon-derived initial control, compounded by an under-strength early-war Brčko corridor axis.

**Mechanical evidence:**

1. `src/sim/combat/pre_planned_operations.ts:84–98` — Operation Koridor's `brcko_corridor` axis lists 5 peripheral objectives (`brezovo_polje_selo_2`, `donji_rahic`, `krepsic`, `potocari_2`, `skakava_donja`). `op:brcko:brcko` itself is **not** in the objective list. Operation Koridor runs once early-war (planning_duration: 3, available_from: 0 default) and ends.
2. No 1992–1995 event in `data/scenarios/events/war_199*.json` flips `op:brcko:brcko` controller (verified by grep).
3. n1287 historical root-cause analysis (`docs/40_reports/CALIBRATION_MASTER.md` line 242): "`op:brcko:brcko` falls via uncontested occupation … No ARBiH operation — simply no RS defender present. Corridor zone: 3 brigades, garrison_budget=3, zero surplus. Brigades distributed to tisina, potocari_2, krepsic; none covers brcko itself."
4. At 40w post-n1289, brcko ANCHOR PASSES because P1 defensive fire + sector merge guard combined to make the brcko corridor zone hold. That early-war fix does NOT carry through to 188w because the underlying garrison-distribution mechanism doesn't include brcko as a persistent must-cover OSID for the long horizon.
5. n1868 final_save inspection: VRS East Bosnian's `must_hold` zone correctly includes `op:brcko:brcko`, but the sector reaches `commitment_ratio: 4.14` and `surplus_brigades: []`, indicating the corps cannot rebalance to defend brcko once ARBiH 2nd Corps reaches it late-war.

**Historical anchor:** ICTY *Jelisić* TJ §§24–27, *Todorović* SJ, Burg & Shoup pp.130–134. Brčko held RS continuously from ~1–3 May 1992 through Dayton. ARBiH never retook it. Posavina Corridor never cut.

**Smallest mechanically-justified repair candidates (all uncertain — see §5 STOP-AND-ASK):**

| Candidate | Surface | Risk |
|---|---|---|
| (a) Add `op:brcko:brcko` to `Operation Koridor` `brcko_corridor` axis objectives | `pre_planned_operations.ts:93` | Operation runs once early-war; unlikely to address late-war loss |
| (b) Add a late-war VRS pre-planned op targeting brcko (e.g. recapture trigger) | `pre_planned_operations.ts` | New operation = broad change; may require triggered_operations.ts work |
| (c) Add `op:brcko:brcko` to a persistent must-hold sector contract for `vrs_east_bosnian` | `bot_corps_directives.ts` or sector authoring | Indirect; existing must-hold detection is already triggering |
| (d) Investigate ARBiH 2nd Corps late-war directive scope — possibly add Brčko as an avoid_osid for ARBiH late-war (historically VRS held the corridor at all times) | `bot_corps_directives.ts` | Faction-asymmetric mechanism; may invert other anchors |

**Recommendation:** Defer Brcko to a follow-up investigation lane. The scenario expert (subagent dispatched 2026-05-19) flagged "insufficient evidence to confirm this alone closes the late-war loss; need a 188w run after each candidate edit to verify." Applying any candidate above without additional probe data risks broad retuning, which triggers the STOP-AND-ASK gate.

## 3. Teocak root cause (`op:ugljevik:teocak_krstac_2` expected RBiH, actual RS at 188w from n1852+)

**Class:** Regression introduced by commit `04c750e3` (2026-05-17 13:26) "fix(sim): default player_faction in headless harness (Phase B)".

The commit explicitly authorizes the drift in its own body: *"Expected calibration drift: 40w/188w hashes will shift because unblocked gates now actually fire (paramilitary policy enforcement, autonomy-1 proposals, command briefing). Re-anchor pending under LANE-V09X-PLAYER-FACTION-CONTRACT if drift exceeds noise."*

**Mechanical evidence:**

1. Pre-04c750e3 (n1844, hash `ccd3f9f770052614`): Teocak PASSES at 188w as RBiH.
2. Post-04c750e3 (n1847, hash `4d4bd75c1c6739de`): Teocak FAILS at 188w as RS. Same anchor expectation, same scenario, same OOB.
3. Probes with embargo caps neutralized (n1855) and B3 counter-offers disabled (n1856) produced the SAME hash as n1854 → fatigue/embargo/B3 are NOT the proximate cause.
4. Historically the Teočak holdout was the lone Bosniak salient near Ugljevik/Bijeljina that held against VRS East Bosnian Corps pressure throughout the war (BB1 p.509; 255th Slavna Mountain Brigade "Hajrudin Mesić", under-strength initial OOB 800 men cohesion 56).
5. Engine-sprint n51 fix (`docs/40_reports/REAL_WAR_MASTER.md` §31): OOB boost for 255th + terrain bonus + EBK Operation Koridor scoping (`target_osids: ['op:brcko:krepsic', 'op:brcko:skakava_donja']` instead of entire brcko municipality). After n51: held RBiH at 40w.
6. Teocak is NOT in `ENCLAVE_DEFINITIONS` (`src/sim/combat/enclave_resilience.ts:81–183`). Without an enclave entry, Teocak has no resilience accumulation, no enclave defense bonus, no enclave garrison power multiplier, and no `capital_osid` retreat focus — it depends entirely on 255th Slavna's standalone garrison resisting EBK pressure across 188 turns. Once player_faction defaulting unblocked autonomy/briefing gates (04c750e3), the 2nd Corps response shape changed enough to let EBK's Plamen-class pressure carry through.

**Historical analogue in code:** Žepa is encoded as a singleton enclave at `src/sim/combat/enclave_resilience.ts:107–113` (`osid_list: ['op:rogatica:zepa_2']`, `resilience_start_turn: 16`, `capital_osid: 'op:rogatica:zepa_2'`). Teočak is mechanically analogous: small, isolated, ARBiH-held, surrounded by VRS, historically held throughout. ENCLAVE_DEFINITIONS already includes 3 HRHB pockets (Kiseljak, Lasva Valley, Žepče) that were added without canon edits because ID-set membership is engine geometry for non-Sarajevo cases.

**Smallest mechanically-justified repair candidate:** Add Teocak as a singleton `ENCLAVE_DEFINITIONS` entry mirroring the existing Žepa pattern, with corresponding `ENCLAVE_CONFIG` row tuned for a small isolated holdout (max_personnel ~400, max_resilience ~20, growth_mult ~0.30).

Cost surface:
- Mechanically narrow (one new `EnclaveDefinition` const entry + one new `ENCLAVE_CONFIG` row).
- WILL change 40w and 188w hashes by altering `getEnclaveDefenseBonus`, `getEnclaveGarrisonPower`, and faction enclave exhaustion reduction outputs from `resilience_start_turn` onward. Re-anchor is required and is auto-authorized by the 04c750e3 commit's lane handoff.
- Does NOT touch combat math, sector geometry, OOB, scenario JSON, or operation definitions.
- Does NOT touch any sensitive-history mechanism (Teocak is not a rupture-eligible event; it is a defensive holdout, not an atrocity site).

## 4. Signals NOT addressed in this lane

Per the n1844 verification report, three signals exist alongside the brcko anchor failure. They are NOT anchor failures and are out of scope for this targeted repair:

- **Sarajevo casualty railroad** (3.785 attacker:defender ratio at Sarajevo vs Mostar's 1.140). Owned by a separate Sarajevo Branch B canon lane; do not touch in this batch.
- **Force-quality late-war shape** (HRHB/RS personnel growth, fatigue collapse, HRHB morale/quality drift). Owned by `docs/plans/2026-05-17-fatigue-recovery-rebalance-plan.md` follow-up; do not touch in this batch.
- **`patron_pressure` not serialized**. Owned by a separate political-state serialization audit; do not touch in this batch.

## 5. STOP-AND-ASK assessment

| User-prompt trigger | Brcko candidates | Teocak candidate |
|---|---|---|
| Requires canon/design decision | ⚠ Possibly — late-war recapture mechanism is a design call | ✗ No — mirrors existing Žepa singleton; HRHB pockets added the same way without canon edits |
| Touches Srebrenica sensitive-history framing | ✗ No | ✗ No — Teocak is a defensive holdout, not a rupture-eligible event |
| Cannot prove determinism | ✗ No — both surfaces use sorted iteration | ✗ No — ENCLAVE_DEFINITIONS already sorted |
| Requires broad retuning | ⚠ YES — every Brcko candidate has unknown cascade risk per scenario expert | ✗ No — single new enclave entry; hash drift is bounded |
| Tempted to use avoided OSIDs or fallback prose | ✗ No | ✗ No |

**Decision:** Brcko = STOP-AND-ASK (documented as remaining residue, no fix in Batch B). Teocak = proceed to Batch B with the enclave singleton repair.

## 6. Plan for Batch B (mechanical repair)

1. Add Teocak singleton enclave definition to `src/sim/combat/enclave_resilience.ts` `ENCLAVE_DEFINITIONS` mirroring the existing Žepa pattern.
2. Add corresponding `ENCLAVE_CONFIG` row (small isolated holdout tuning: max_personnel ≤500, max_resilience ≤25, growth_mult ≤0.35).
3. Add focused unit test asserting the new enclave is recognized by `getEnclaveIdForOsid(...)` and that resilience growth proceeds under isolation, matching the Žepa case.
4. Add static regression asserting Teocak is part of `ENCLAVE_DEFINITIONS` and faction is RBiH.

## 6.1 Batch B applied (commit `efec3323`)

- `src/sim/combat/enclave_resilience.ts`: added Teocak singleton to `ENCLAVE_DEFINITIONS` (after Žepa entry); added Teocak row to `ENCLAVE_CONFIG`.
- `tests/teocak_enclave_singleton.test.ts`: 15 focused tests covering definition contract, OSID lookup, max-personnel cap, resilience growth under isolation, defense bonus wiring, and boundary discipline.
- Typecheck: clean.
- Focused tests (5 files, 49 tests): all PASS.
- Sensitive-history regression suite (7 files, 41 tests): all PASS.

## 6.2 Batch C results

**40w n1916**
- Hash: `5c6e7b62fa6670c0` (drifted from `b14179d65639860c`, authorized by 04c750e3 lane handoff).
- **Anchors: 27/27 PASS, zero failures.**
- Benchmarks: 6 (out of 6).
- Run dir: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1916`.

**188w n1917**
- Hash: `6dcf925afdb30e3b` (drifted from accepted n1844 `ccd3f9f770052614` and integrated n1868 `3700a34cd255c99c`).
- **Anchors: 26/27 PASS. Single failure: `op:brcko:brcko` (chronic, documented residue).**
- Teocak repair verified: `op:ugljevik:teocak_krstac_2` now RBiH PASS (was RS FAIL in n1868).
- Benchmarks: 6 (out of 6).
- `validate_run_consistency.cjs` exit 0 (structural sector-coverage long-run signals only; no determinism errors).
- `diagnose_run.cjs`: 0 errors, 28 warnings.
- Sensitive-history check: Srebrenica/Žepa/Goražde controllers at 188w unchanged vs n1844/n1868 baselines; `srebrenica_genocide_1995` rupture event NOT fired (status unchanged; gap predates this fix).
- Side-effect drift vs n1868: 8 controller flips total — Teocak primary + 7 collateral (`op:mostar:hodbina_2` HRHB→RS, `op:srebrenica:brezovice_2` RS→RBiH, `op:stolac:pjesivac_kula_2 + rotimlja_2` HRHB→RS, `op:teslic:kamenica_2` HRHB→RS, `op:ugljevik:jasikovac + srednja_trnova_2` RS→RBiH). The Ugljevik cluster is expected micro-spillover from Teocak hardening; non-anchor, non-benchmark.
- Run dir: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1917`.

**Baseline regression**
- `npm.cmd run test:baselines`: **GREEN** after surgical manifest refresh.
- Manifest refresh scope: `apr1992_52w.run_summary.json` hash updated; `baseline_ops_4w` and `noop_4w` all 4 artifact hashes updated (state-shape extension confirmed by scenario expert as H2: `updateEnclaveResilience` seeds a new `teocak: { resilience: 0, ... }` entry every turn regardless of `resilience_start_turn` gating, shifting serialized state byte order in alpha-sorted iteration).
- 4-artifact trim preserved per Batch 20 (`bf8f6246`) precedent.

**Acceptance verdict from dispatched `/scenario-creator-runner-tester` expert (twice — pre-Batch-B and post-runs):** GO. Teocak fix delivers the contracted repair (n1868 FAIL → n1917 PASS) without anchor or benchmark regression. Collateral drift is within the authorized 04c750e3 envelope. Hashes `5c6e7b62fa6670c0` (40w) / `6dcf925afdb30e3b` (188w) are acceptable new baselines.

## 6.3 Docs propagated

- `docs/PROJECT_LEDGER.md`: top entry with full mechanism, verification, sensitive-history boundary, and remaining residue.
- `docs/40_reports/CALIBRATION_MASTER.md`: n1916/n1917 entry prepended at top.
- `data/derived/scenario/baselines/manifest.json`: hashes refreshed, 4-artifact trim preserved.
- This audit: final results section + Brcko residue handoff (§9).

## 9. Remaining residue and follow-up handoff

- **`op:brcko:brcko`**: chronic 188w failure (40w PASS → 188w FAIL). Persists across n1741, n1844, n1847..n1868, n1917. Batch D (§D.1-D.6, §10) supersedes the earlier captured-then-lost hypothesis: RS never captures Brčko in n1917, `control_events` has zero entries for the OSID, Operation Koridor's `brcko_corridor` axis omits `op:brcko:brcko` itself and collapses with zero captures against the two RBiH peripheral OSIDs it does target. Closure requires a separate STOP-AND-ASK decision on scenario-paint convergence, axis/JNA-strengthening, explicit JNA handoff modeling, or accepting the 26/27 residue for v0.9.x.
- **Sarajevo casualty railroad signal** (3.785 attacker:defender ratio): owned by Sarajevo Branch B canon lane — out of scope here.
- **Force-quality late-war shape** (HRHB/RS personnel growth, fatigue collapse, HRHB morale/quality drift): owned by `docs/plans/2026-05-17-fatigue-recovery-rebalance-plan.md` follow-up — out of scope here.
- **`patron_pressure` not serialized**: owned by a separate political-state serialization audit — out of scope here.

## 7. Plan for Batch C (validation + docs)

## 7. Plan for Batch C (validation + docs)

1. `npm.cmd run typecheck`.
2. Focused tests: new Teocak enclave test + existing enclave_resilience tests + sensitive-history regression suite (must remain green).
3. `npm.cmd run test:baselines` — expect manifest refresh due to authorized hash drift.
4. 40w proof run (`npm run sim:scenario:run:40w`) — record new hash; verify all 27 anchors PASS.
5. 188w validation run — record new hash; verify Teocak now passes; document Brcko as remaining single anchor failure.
6. Update `docs/PROJECT_LEDGER.md`, `docs/PROJECT_LEDGER_KNOWLEDGE.md` if a lesson surfaces, `docs/40_reports/CALIBRATION_MASTER.md`, `docs/40_reports/audits/20260517_ENDGAME_188W_VERIFICATION.md` (cross-link follow-up), and this audit (close with results).
7. Update `docs/plans/MASTER_ROADMAP.md` for the LANE-V09X-PLAYER-FACTION-CONTRACT re-anchor closure.

## 8. References

- `src/sim/combat/enclave_resilience.ts:81–183` — ENCLAVE_DEFINITIONS, existing Žepa singleton at 107–113.
- `src/sim/combat/pre_planned_operations.ts:74–119` — Operation Koridor brcko_corridor axis.
- `src/sim/combat/bot_corps_directives.ts` — corps directive layer (hold_osids dynamically generated, not static).
- `src/sim/combat/bot_corps_ai.ts:183–193` — hold_osids derivation via `createBilateralDirective`.
- `src/sim/combat/commander/emit.ts:331–365` — hold_osids derivation in commander emit.
- `data/scenarios/apr1992_definitive_188w.json` — scenario anchor expectations.
- `runs/apr1992_definitive_188w__210e69404d054959__w188_n1844/run_summary.json` — accepted endgame anchor data.
- `runs/apr1992_definitive_188w__210e69404d054959__w188_n1868/run_summary.json` — current integrated-context residue data.
- `docs/40_reports/audits/20260517_ENDGAME_188W_VERIFICATION.md` — predecessor verification report.
- `docs/40_reports/ENGINE_HEALTH_AUDIT_n1842_2026-05-16.md` — H1/H4/H5 closures.
- `docs/40_reports/CALIBRATION_MASTER.md` lines 10, 21, 30 — late-war drift attribution.
- `docs/40_reports/REAL_WAR_MASTER.md` §31 — engine-sprint n51 brka_2/teocak fix history.
- `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` — Ring 1/2/3 framework (Teocak repair is Ring 1 mechanical, not sensitive-history).
- Commit `04c750e3` — explicit "Re-anchor pending under LANE-V09X-PLAYER-FACTION-CONTRACT if drift exceeds noise" authorization.

---

## Batch D — Brčko mechanical root-cause inspection (2026-05-19, n1917 artifacts)

**Status:** Diagnostic only. No code changed in this section. Decision pending §10.

**Method:** Inspected `runs/apr1992_definitive_188w__210e69404d054959__w188_n1917/` (initial_save.json, final_save.json, operation_aars.json, control_delta.json) and `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1916/` for the live state of `op:brcko:brcko`.

### D.1 Direct controller observations

| Source | Initial (turn 0) controller | Final controller | control_events for op:brcko:brcko |
|---|---|---|---|
| 40w n1916 `initial_save.json` / `final_save.json` | **RS** | **RS** | 0 events |
| 188w n1917 `initial_save.json` / `final_save.json` | **RBiH** | **RBiH** | **0 events** |
| painted_control_oct1995 anchor expectation | — | **RS** | — |

The 188w `final_save.political.political_controllers["op:brcko:brcko"] = "RBiH"` and `final_save.political.initial_political_controllers["op:brcko:brcko"] = "RBiH"` — i.e. brcko is RBiH for the entire 188-turn run and the immutable historical baseline also records it as starting RBiH. There are **zero** entries in `final_save.political.control_events` that name `op:brcko:brcko` as either `osid` or `settlement_id`.

### D.2 Why the 40w and 188w starting states differ

Both scenarios declare `init_control: "apr1992"` and `init_control_mode: "hybrid_1992"`. They are byte-different in three keys relevant to brcko:

```
40w-only keys (compared to 188w): [
  'comms_override_by_corps',
  'enable_rbih_hrhb_dynamics',
  'initial_osid_controllers',   ← 712 entries, paints brcko = RS
  'must_hold_osids_by_corps',   ← lists vrs_east_bosnian → op:brcko:brcko
  'osid_control_overrides',     ← second-layer override, paints brcko = RS
  'supply_reserves_enabled'
]
```

The 40w scenario sidesteps Operation Koridor entirely for brcko by painting `op:brcko:brcko = RS` at turn 0 via both `initial_osid_controllers` and `osid_control_overrides`. The 188w scenario opts into the canonical census/referendum start, and Operation Koridor is the only mechanism that could flip brcko in the simulated war.

### D.3 Operation Koridor brcko_corridor axis — execution detail in n1917

Per `runs/.../n1917/operation_aars.json`, `Operation Koridor` (corps `vrs_east_bosnian`, started turn 0, ended turn 13):

```
axis_summaries.brcko_corridor:
  launch_blocker:        "zero_eligible_axis"
  objectives_targeted:   ["op:brcko:krepsic", "op:brcko:skakava_donja"]
  objectives_captured:   []                       ← zero captures
  total_attacks:         4
  casualties_inflicted:  KIA 351, WIA 643
  casualties_suffered:   KIA 641, WIA 1175        ← ~3x what was inflicted
  brigades reported:     [rs_1st_semberija_light_infantry,
                          rs_2nd_semberija_light_infantry,
                          rs_1st_bijeljina_light_infantry_panthers]
                          (jna_17th_corps_tg in source not in AAR)
```

Confirmed structural omissions:
1. `src/sim/combat/pre_planned_operations.ts:92–98` lists `brezovo_polje_selo_2`, `donji_rahic`, `krepsic`, `potocari_2`, `skakava_donja` — `op:brcko:brcko` is NOT in the axis objective list.
2. Of those 5 axis objectives in 188w: `brezovo_polje_selo_2`/`donji_rahic`/`potocari_2` were already RS at turn 0 (init_control "apr1992" yields these as RS via ethnic majority), so the axis only effectively targets `krepsic` and `skakava_donja`. Both stayed RBiH at turn 188. `donji_rahic` (initial RS) was even captured BACK by RBiH during the run.
3. The Posavina-flank axis of the same operation captured `op:bosanski_samac:samac_2`, `modrica`, `garevac_2`, `derventa_2`, and `brod` — i.e. the operation itself works, but the brcko-axis brigades exhausted themselves on the two peripheral OSIDs they were assigned and the axis collapsed (`zero_eligible_axis`) before brcko proper could ever be touched.

### D.4 Falsifying the Batch A hypothesis

The Batch A audit (§2) hypothesized: "RS captures Brčko early-war via Operation Koridor (passes at 40w), then loses it back to ARBiH counter-pressure over the 40w→188w long horizon." This is **falsified** by D.1:

- RS never captures `op:brcko:brcko` in 188w (0 control events).
- The 40w anchor passes via painted overrides, not via Operation Koridor capture (40w initial = RS already; the 40w run has no brcko control events either).
- There is no 40w→188w loss event — there was never a 40w gain to begin with.

The actual mechanism is: brcko is RBiH at scenario start, Operation Koridor's brcko_corridor axis lists only peripheral OSIDs (not brcko itself), the axis collapses with zero captures, and no other mechanism touches brcko's controller for 188 turns.

### D.5 Re-evaluation of the four candidate repairs

| Candidate | Status under Batch D evidence |
|---|---|
| (a) Add `op:brcko:brcko` to `brcko_corridor` axis objectives | Necessary but likely insufficient on its own — axis already collapses against the 2 RBiH objectives it targets. Adding a 3rd RBiH target (brcko) without strengthening the axis would still produce 0 captures. |
| (b) Add a late-war VRS recapture pre-planned/triggered op | Out of scope — broad new operation authoring, would require triggered_operations.ts surface. |
| (c) Persistent must-hold sector contract | Already in place dynamically (`vrs_east_bosnian` must_hold zone derives brcko at runtime per audit §2.5). Cannot defend an OSID the faction has never controlled. |
| (d) Late-war ARBiH avoid_osid rule | Out of bounds — faction-asymmetric, may invert other anchors; also doesn't fix the never-captured-in-the-first-place root cause. |

### D.6 Honest stop-gate determination

Per the lane prompt: *"If diagnosis points to a broader balancing or canon-sensitive issue: stop and produce decision packet instead of code."*

The mechanical reality is a **scenario-authoring asymmetry between 40w (painted) and 188w (canon-derived) compounded by an under-strength early-war combat axis**. To make `op:brcko:brcko` flip RS by ~turn 5–7 (historical May 1–3 1992) in 188w without painting it, you would need at minimum: (i) add brcko to the axis objectives, AND (ii) strengthen the brcko_corridor axis (more brigades, longer planning duration, or recover the missing `jna_17th_corps_tg` phantom support that is currently filtered out of the AAR brigade list). Step (ii) is a balance change touching the JNA phantom filter and/or VRS East Bosnian early-war OOB — broad, with cascade risk to all early-war VRS combat. **This crosses the STOP-AND-ASK threshold.**

## 10. Decision (Batch D close)

**Decision:** **STOP-AND-ASK. No code, no scenario, no canon edit.** The `op:brcko:brcko` 188w anchor failure has been root-caused mechanically (this section §D.1–D.5), the original audit hypothesis (40w-pass-then-lose) is falsified, and the four bounded candidates have been re-evaluated against the live n1917 evidence. The smallest historically-defensible repair (adding brcko to the brcko_corridor axis) cannot succeed without also strengthening the axis — which is a broader early-war balance change that crosses the lane's explicit STOP gate.

**Why this is the right call:**
- The 40w anchor already passes via painted overrides. The 188w anchor is the canonical "let-the-engine-simulate" path. Forcing 188w to pass without painting would require either (a) duplicating the 40w paint into 188w (which collapses the distinction between the two scenarios and effectively voids the historical-start scenario's purpose), or (b) tuning early-war combat strength so VRS can win Brčko in 5 turns against RBiH defenders — a broader retune.
- The Teocak repair already delivered the contracted Batch B/C closure (n1868 FAIL → n1917 PASS). 26/27 188w anchors PASS with one chronic residue documented as a separate lane.
- Both options for fully closing brcko are above the bar set by *"Do not bundle broad faction-wide ARBiH nerfs or RS buffs"* and *"If diagnosis points to a broader balancing or canon-sensitive issue: stop and produce decision packet instead of code."*

**Decision packet to engineering / canon leads** (recommended follow-up lane scope, not executed here):

1. **Scenario authoring symmetry review:** Should `apr1992_definitive_188w.json` adopt the 40w `must_hold_osids_by_corps` table (corps-level doctrine, not initial control) — or should both scenarios converge on canon-derived dynamic must_hold? This is a scenario-design decision, not a code fix.
2. **Operation Koridor brcko_corridor axis strengthening:** Audit the JNA phantom filter that drops `jna_17th_corps_tg` from the AAR — was that intentional? If phantom JNA brigades were originally meant to contribute and now don't, restoring them might let the axis succeed at its currently-listed objectives AND a newly-added `op:brcko:brcko` target.
3. **Explicit "captured-by-handoff" event:** Historically, JNA withdrew Brčko to VRS on 19 May 1992. The current engine has no "JNA hands over X to VRS at withdrawal" mechanism. Modeling that would unblock brcko + several other RS-by-handoff OSIDs as a class.
4. **Accept the residue:** Decide explicitly that 26/27 at 188w with the documented chronic Brčko residue is acceptable for the v0.9.x release band, and that closure is deferred until item 2 or 3 is funded.

**Branch:** `codex/late-war-188w-anchor-repair-2026-05-19` ends at `0bb48a22` (the rebased Batch C close). No additional commits planned for this lane beyond this audit update.

**Output handoff:**
- Branch HEAD: `0bb48a22` (rebased onto `d1458385`)
- Files changed in this session: `docs/40_reports/audits/20260519_LATE_WAR_188W_ANCHOR_RESIDUE.md` (Batch D root-cause append; this section).
- Root-cause evidence: see §D.1–D.5 above. First turn brcko becomes non-RS: never (stays RBiH for all 188 turns; zero control events). Previous and new controllers: RBiH → RBiH. Mechanism: never captured — Operation Koridor's brcko_corridor axis omits brcko itself from its objectives and collapses (`zero_eligible_axis`) against the 2 RBiH peripheral OSIDs it does target. Units/sectors involved: `vrs_east_bosnian` corps, brigades `rs_1st_semberija_light_infantry` + `rs_2nd_semberija_light_infantry` + `rs_1st_bijeljina_light_infantry_panthers`, axis staging `op:bijeljina:crnjelovo_donje`.
- Fix chosen: **NONE.** Stop-and-ask packet produced (this §10).
- 40w hash unchanged: `5c6e7b62fa6670c0`, 27/27 anchors, 6/6 benchmarks (n1916 baseline; no re-run needed since no code change).
- 188w hash unchanged: `6dcf925afdb30e3b`, 26/27 anchors, 6/6 benchmarks (n1917 baseline; no re-run needed since no code change).
- Commands run: `git status --short --branch`, `git fetch origin`, `git rebase origin/main` (1 conflict resolved in PROJECT_LEDGER.md by interleaving both 2026-05-19 entries, no semantic loss), `git stash pop`, several `node -e` JSON inspections of n1917/n1916 saves and AARs.
- Remaining risk: brcko anchor remains as chronic 188w residue. All other risk surfaces unchanged from Batch C close.
- Committed: documentation-only commit pending after this edit (audit doc only; no code, no scenario, no canon).
