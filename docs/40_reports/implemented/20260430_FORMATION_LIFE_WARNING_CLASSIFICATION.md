# Formation-Life Warning Classification — n1581 (= n1580)

**Date:** 2026-04-30
**Run:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1581`
**Hash:** `4f872fcd535b6e98` (deterministic match with n1580)
**Source plan:** `docs/plans/2026-04-30-v09-formation-life-believability-plan.md` Task 1
**Status:** Classification complete. No fixes applied in this report — see "Next candidates" for sequencing.

## Headline (compare_painted_vs_sim.cjs)

- **Area-weighted match:** 47828 / 51337 km² = **93.2%**
- **OSID count match:** 649 / 712 = **91.2%** (63 mismatches)
- **Bot benchmarks (turn 20 + turn 40):** 6/6 PASS
- **Faction area share vs painted:** RS 64.6% vs 65.1%, RBiH 22.9% vs 23.5%, HRHB 12.5% vs 11.3% — all within ~0.6pp of painted
- **Mismatches by region:** KRAJINA 99.2% / POSAVINA_NE 93.3% / DRINA 85.7% / CENTRAL_CORRIDOR 93.5% / CENTRAL_BOSNIA 85.2% / SARAJEVO 90.0% / HERZEGOVINA 92.4%

## Diagnostic outputs

- `diagnose_run.cjs`: 0 errors, **32 warnings** (31 brigade drift, 1 stranded pool — `op:vlasenica:RBiH` 600 available / 0 committed, the Srebrenica-enclave isolation fingerprint).
- `validate_run_consistency.cjs`: **PASS** overall. 2 below-floor sector notes (`vrs_drina:0`, `vrs_herzegovina:4`) — accepted variance, no legal same-corps donor available.
- `integration_anomaly` test (internal 40w): 0 critical, **2 warnings** (Operacija Kopljem ZEA, density imbalance `sector:arbih_1st_corps:1`).

## Warning families — classification table

| Family | Count | Owner | Classification | Notes |
|---|---|---|---|---|
| **Brigade drift** (>4 hops from home) | 31 | `final_sector_truth_reconciliation.ts` + `commander_march_correction.ts` + `apply_brigade_reposition.ts` | **Mostly accepted variance** — small **owner bug** subset | Most drift is operational-success fingerprint (Op Donji Vakuf success → 22 vrs_1st_krajina brigades projected eastward to Travnik/Doboj/Donji Vakuf, historical 1992 Krajina advance). Real bug subset: Srebrenica-enclave brigades (`arbih_280th`, `arbih_281st`, `arbih_284th`) labeled `sector front` but `home_osid` in another disconnected enclave with `dist=unreachable`. Black Swans on elite loan = expected. |
| **Far-from-home live ownership** (>6 hops, live sector/loan) | 23 / 220 (10.5%) | Same as drift + `return_displaced_brigades.ts` | **Detector wording issue** for loans + **owner bug** for unreachable enclaves | Detector groups three distinct cases: (a) elite loans (Black Swans, expected), (b) operational projection (RS Krajina, expected post-op), (c) Srebrenica enclave brigades stuck with `dist=unreachable` and home in another enclave. Cases (a) and (b) should be reclassified by detector; case (c) needs lifecycle owner — should these dissolve, return, or stay as historical-redeployment-with-reduced-power? Decision required from game-designer. |
| **Active-never-fights** | 78 (sector/loan owners outside cold-front sectors) | `tools/diagnose_run.cjs` (detector) + `bot_corps_directives.ts` (target scoring) | **Detector wording issue** primarily | The detector lumps live-front-but-inert with rear-reserve and quiet sectors. Per formation-life plan Task 5, the right fix is detector-side: separate cold-front / rear-reserve / garrison / live-front cases. No engine fix is warranted until owner behavior is understood for the live-front subset only. |
| **Corps out of area** | 4 corps | Operational emergence, no single owner | **Accepted variance** | hvo_southeast_herzegovina 79% (HVO operational projection — historically accurate during Op Jackal w8–w14), hvo_tomislavgrad 67% (small denominator: 3 brigades, 2 deployed), vrs_1st_krajina 67% (Op Donji Vakuf success), vrs_sarajevo_romanija 60% (siege deployment around Sarajevo). Pattern matches historical operational reality. Detector should classify these as informational, not warning, when correlated with successful operations. |
| **Density imbalance** | 1 sector | `corps_front_sectors.ts` + `brigade_assignment.ts` | **Accepted variance** (cosmetic) | `sector:arbih_1st_corps:1` density 0.133 vs RBiH median 0.429 (ratio 0.3×). Same defect was `:7` in n1579, renumbered after OOB topology shift. Not blocking calibration — anchor pass count and area-weighted both held. Worth fixing eventually as a brigade-assignment hint, but no current behavioral cost. |
| **HRHB/HVO offensive emergence** | 0 HVO faction-led ops in 40w | `bot_corps_stance.ts:144-150` (N1297 gate) + `bot_corps_stance.ts:213-219` (E3 Herzegovina blanket) → `plan.ts:705` (defensive forbids offensive) | **Commander doctrine issue** + scenario content issue | Cannot meaningfully verify in 40w (HRHB-RBiH war doesn't open until ~w40 per `BOSNIAK_CROAT_CONFLICT_MASTER.md`). Per `OPTION_K_DIAGNOSTIC_FINDINGS.md`: at w188, all 5 HRHB corps stuck defensive. Two gates fire — N1297 (zero `main_effort` brigades caps stance at defensive) and E3 (Herzegovina blanket forces defensive even with main_effort). Vitezovi (post Option-J motorized promotion) computes `fitness_offense = 0.296` < 0.4 threshold due to cohesion plateau at 28. Real candidate for bounded fix, **but evidence requires 188w long-run, not 40w**. |

## Owner-identification per family (per Task 2)

For each family, the canonical mutation owner and whether it currently has enough state:

| Family | Owner module | Has enough state? | Min extension if not |
|---|---|---|---|
| Brigade drift (operational projection) | `apply_brigade_reposition.ts` (movement orders) + commander_march_correction.ts | Yes | None — emergent, accepted |
| Brigade drift (Srebrenica-enclave unreachable) | `return_displaced_brigades.ts` (lifecycle) + `final_sector_truth_reconciliation.ts` | **No** — needs decision: dissolve / return / stay as garrison | Game-designer decision required: what happens to brigades with home_osid in disconnected enclave? Currently they stay as far-from-home live owners. Either lifecycle owner (formation lifecycle) or detector wording (accept as enclave-isolated) |
| Active-never-fights | `tools/diagnose_run.cjs` (detector) | **No** — detector lacks live-front discriminator | Add `is_live_front_sector` discriminator to detector (sector hostile-edge count > 0 in last N turns). Not engine code |
| Corps out of area | Emergent | Yes — accepted | Detector could add op-success correlation flag |
| Density imbalance | `brigade_assignment.ts` (Phase 2a/2b assignment) | Yes | Optional: corridor-width or threat-ratio weighting hint, not blocking |
| HRHB/HVO offensive emergence | `bot_corps_stance.ts` E3 + N1297 + `plan.ts:705` | **Yes** — gates known, seam clear | Bounded narrowing of E3 Herzegovina blanket (per OPTION_K Fix B/C) is the candidate; **requires 188w verification** |

## Accepted-variance vs fix-needed split

**Accepted variance (no engine action):**
- 22 RS brigade-drift cases tied to Op Donji Vakuf success
- 4 corps_out_of_area warnings (operational projection)
- Density imbalance (1 sector, cosmetic)
- 2 below-floor sector notes from validate_run_consistency

**Fix needed (in priority order, with bar):**
1. **HRHB/HVO offensive emergence** — owner seam clear, but 188w required for verification. Cannot ship as a 40w-bounded fix. Will reassess after 188w evidence in this packet.
2. **Srebrenica-enclave brigade lifecycle** — needs game-designer decision before implementation. Not a 40w-bounded fix either. STOP-AND-ASK trigger if attempted.
3. **Detector wording — far-from-home live ownership** — separate elite loans / operational projection / unreachable enclaves into 3 sub-classifications. This IS a 40w-verifiable fix (compare detector output before/after). Not engine, but detector-only is allowed in this packet.
4. **Detector wording — active-never-fights** — same pattern, separate live-front / rear-reserve / cold-front / garrison. 40w-verifiable.

## Top 3 next candidates (per "Optional Fix" criteria in the prompt)

The prompt allows ONE additional fix beyond the probe packet, with strict criteria. Evaluation:

| Candidate | Owner clear? | Small + deterministic? | Canon-decision-free? | Focused tests? | 40w-verifiable? | **Verdict** |
|---|---|---|---|---|---|---|
| HRHB/HVO emergence (E3 narrowing) | Yes | Borderline | Borderline (touches faction doctrine) | Yes | **No (188w required)** | DO NOT ATTEMPT in this packet |
| Srebrenica-enclave brigade lifecycle | No (game-designer call) | Likely small | **No (canon decision)** | Yes | Yes | STOP-AND-ASK |
| Detector — far-from-home subclass | Yes (`tools/diagnose_run.cjs`) | Yes | Yes | Trivial — diff detector output before/after | Yes | **CANDIDATE if 188w doesn't surface a better seam** |

## Note on detector weakening

Per the formation-life plan: "no diagnostic is weakened before its owner behavior is understood." For the active-never-fights and far-from-home families, separating cases by live-front-ness is **not weakening** — it surfaces the live-front subset as the actual signal while reclassifying noise. Pre-condition before any detector edit: confirm with run evidence that the live-front subset is small and stable.

## Open questions for game-designer

1. **Srebrenica-enclave brigade home_osid policy.** When home is in a disconnected enclave and the brigade is sectorless-on-tuzla-front, what does formation lifecycle owe them? Current state: they stay forever as `dist=unreachable` warnings.
2. **HRHB/HVO emergence — what's the design intent?** Per Option K, the cohesion floor at 28-30 plus E3 Herzegovina blanket means HVO is structurally silent in 188w. Is this calibrated reality (HVO historically did fight reactively) or an unintended railroad?

These questions are NOT for this packet to resolve. They're surfaced for the next planning cycle.

## Followups not addressed by this classification

- **Operacija Kopljem ZEA (arbih_3rd_corps)** — pre-existing staging logic bug, captured in n1580 commit message and napkin's open follow-ups list. Not a formation-life family.
- **Goražde over-recovery** by ~4 OSIDs in n1580 — DRINA region anchor variance, captured in napkin. Not a formation-life family.

## Verification this report did NOT produce false confidence

- All numbers cited are direct grep/tool output from `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1581/`.
- Hash `4f872fcd535b6e98` matches n1580 → conclusions transfer.
- No detector or engine was modified to make the report cleaner.
- Owner-clear claims reference specific file:line in `bot_corps_stance.ts:144-219`, `plan.ts:705-720`, `tools/diagnose_run.cjs`.
