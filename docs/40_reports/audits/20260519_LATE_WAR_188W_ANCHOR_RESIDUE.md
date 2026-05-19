# Late-War 188w Anchor Residue — Diagnostic + Root Cause (Batch A)

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

## 2. Brcko root cause (`op:brcko:brcko` expected RS, actual RBiH at 188w)

**Class:** Chronic late-war drift. **Mechanism:** RS captures Brčko early-war via Operation Koridor (passes at 40w), then loses it back to ARBiH counter-pressure over the 40w→188w long horizon. There is no operational re-take or persistent garrison contract for Brčko proper across the full 188w span.

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
