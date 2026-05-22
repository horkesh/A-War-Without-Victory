# Wave 20 — n1984 Verification Memo

**Author:** scenario-creator-runner-tester
**Date:** 2026-05-22
**Branch:** feature/arc-operations-calibration
**Test commit:** f5947b55 fix(sector-offensive): single-axis MAX_TOTAL_FAILURES_SINGLE_AXIS=4 (Wave 20)
**Baseline:** n1980 (pre-Wave-20)
**Test run:** n1984 (post-Wave-20)
**Run length:** 188 weeks (52w main + 136w late-war extension), apr1992_definitive

---

## TL;DR

- **Net |Δ|** improved from 50 (n1980) to **48** (n1984) — a marginal +2 improvement.
- **RBiH gained 8 OSIDs** (298 → 306); **RS lost 9** (332 → 323); **HRHB gained 1** (82 → 83).
- Wave 20 lowered `MAX_TOTAL_FAILURES_SINGLE_AXIS` from 8 → 4 to free Cincar-Phase-1 brigades earlier (target abort at t138-142 instead of t143-149) so HRHB Mistral 1 could fire in the Krajina zone.
- **Verdict:** PARTIAL — analysis below establishes whether Mistral 1 actually fired, whether HRHB gained Krajina-zone OSIDs, and whether RBiH's 8-OSID gain came from 3rd Corps capitalizing on freed brigades.

---

## Source data

- Baseline run: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1980/`
- Test run: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1984/`
- AARs: `operation_aars.json` (op_name field schema gap — must filter by turn range/faction)
- Control delta: `control_delta.json`
- Watched ops: `watched_operations.json`

---

## (a) Cincar Phase 1 in n1984 — CONFIRMED EARLIER ABORT

| field | n1980 | n1984 | Δ |
|---|---|---|---|
| started_turn | 132 | 132 | 0 |
| ended_turn | 145 | **142** | **-3 turns** |
| duration_turns | 13 | 10 | -3 |
| outcome | partial | partial | (unchanged) |
| recovery_reason | max_failures | max_failures | (unchanged) |
| objectives_captured | (bucovaca only) | bucovaca only | (unchanged) |
| total_attacks | (~1) | 1 | (likely unchanged) |

**Capture count**: 1 OSID (`op:kupres:bucovaca`) — the same single capture in both runs.

**Wave 20 effect**: Cincar Phase 1 aborted at t142 in n1984 vs t145 in n1980 — **3 turns earlier**, consistent with the lowered MAX_TOTAL_FAILURES_SINGLE_AXIS (8→4) acting on the single-axis (`kupres_cincar_line`) op.

**Targeted (uncaptured)**: kupres_2, donji_malovan, novo_selo_2.

**Brigades released earlier (3 turns)**:
- hrhb_kralj_petar_kreimir_iv_brigade
- hrhb_kralj_tomislav_brigade
- hv_4th_guards_split
- hvo_1st_guard_abb
- hvo_rama_brigade

**Note**: Although Wave 20 was framed as "release brigades for Mistral 1 to fire in Krajina zone", Mistral 1 begins at t160 in BOTH runs (a pre-planned op trigger turn), so the 3-turn-earlier release at t142 vs t145 gave the brigades a window of 18 turns of recovery in either case (t142..t160 = 18 turns vs t145..t160 = 15 turns). Difference: 3 extra turns of recovery before Mistral 1 trigger. Whether that mattered is examined in (b).


---

## (b) Mistral 1 in n1984 — DID NOT FIRE (no_approach_osid, BOTH axes unreachable)

| field | n1980 | n1984 |
|---|---|---|
| operation_id | hvo_main_staff:Operation Mistral 1:t160 | **hvo_tomislavgrad:Operation Mistral 1:t160** (Wave 19A re-host) |
| faction | (empty) | HRHB |
| corps_id | hvo_main_staff | hvo_tomislavgrad |
| started_turn | 160 | 160 |
| ended_turn | 162 | 168 |
| duration_turns | 2 | 8 |
| outcome | failure | failure |
| recovery_reason | defender_power_too_high | **no_approach_osid** |
| total_attacks | 0 | **0** |
| objectives_captured | [] | **[]** |
| casualties_inflicted | 0/0 | 0/0 |
| casualties_suffered | 0/0 | 0/0 |
| initial_strength | (n/a) | 8827 |
| final_strength | (n/a) | 8958 |

**Axis-by-axis status (n1984)**:
- `mistral_1_grahovo` (Bosansko Grahovo): brigades = hv_4th_guards_split, hvo_1st_guard_abb. Staging = op:livno:misi_2. `unreachable_at_launch: true`, `launch_blocker: no_approach_osid`. Total attacks = 0.
- `mistral_1_glamoc` (Glamoč Shoulder): brigades = hrhb_kralj_petar_kreimir_iv_brigade, hrhb_kralj_tomislav_brigade, hvo_1st_guard_abb. Staging = op:duvno:tomislavgrad_2. `unreachable_at_launch: true`, `launch_blocker: no_approach_osid`. Total attacks = 0.

**Verdict (Mistral 1)**: **STILL DID NOT FIRE**. Wave 20's earlier brigade release did NOT enable Mistral 1. The op fails at launch because **both axes are unreachable** from their staging OSIDs — `no_approach_osid` means no front-edge / sub-segment / contact path exists from staging to objective. This is a topology/routing issue, NOT a brigade availability issue.

In n1980, Mistral 1 ended at t162 with `defender_power_too_high` (a launch-feasibility check failure based on defender estimate). In n1984, with brigades released 3 turns earlier (more recovered, slightly higher force), the launch gate now lasts longer (ended t168 = 8 turns of attempts) but ends with `no_approach_osid` — the actual blocker shifted, but the op still cannot launch because the approach topology never exists.

**This is the Wave-19-A-host change unmasking a topology gap.** The op now lives on hvo_tomislavgrad with Livno/Tomislavgrad staging, but the Bosansko Grahovo and Glamoč objectives are not reachable from those staging OSIDs via contact-graph approach paths. This is a separate problem from MAX_TOTAL_FAILURES.

**Did the 18 vs 15-turn recovery window matter?** No. The op never reached the attack phase. Initial strength of the participating-brigade group is 8827 in n1984 — comparable to a healthy force. The blocker is geometry, not power.


---

## (c) Delta-of-deltas: which OSIDs changed between n1980 and n1984

### OSIDs that flipped in n1980 but NOT in n1984 (held initial controller in n1984)

| OSID | n1980 final | Was held in n1984 by |
|---|---|---|
| op:bugojno:medini | RS (HRHB→RS) | HRHB (no flip in n1984) |
| op:kalinovik:tomislja | RBiH (RS→RBiH) | RS (no flip in n1984) |
| op:trnovo:tosici | RBiH (RS→RBiH) | RS (no flip in n1984) |

### OSIDs that flipped in n1984 but NOT in n1980 (NEW captures)

| OSID | n1984 final | Source faction (initial) |
|---|---|---|
| op:bugojno:prijaci | RBiH | RS (RS→RBiH) |
| op:doboj:boljanic_2 | RBiH | RS (RS→RBiH) |
| op:doboj:zelinja_gornja_2 | RBiH | RS (RS→RBiH) |
| op:gracanica:petrovo_2 | RBiH | RS (RS→RBiH) |
| op:lukavac:brijesnica_donja_2 | RBiH | RS (RS→RBiH) |
| op:maglaj:donja_bocinja_2 | RBiH | RS (RS→RBiH) |
| op:maglaj:gornja_bocinja | RBiH | RS (RS→RBiH) |
| op:maglaj:jablanica | RBiH | RS (RS→RBiH) |
| op:teslic:vitkovci | RBiH | RS (RS→RBiH) |
| op:zavidovici:vozuca_2 | RBiH | RS (RS→RBiH) |

### OSIDs that flipped in both but to different controllers

None — no controller divergence.

### Interpretation

- **HRHB net +1**: bugojno:medini stayed HRHB in n1984 (avoided RS capture) — that is the single HRHB-side improvement. **Not a Krajina-zone capture; not a Mistral 1 win.** Bugojno is RBiH-/HRHB-shared territory.
- **RBiH net +8 (gained 10, lost 2)**: ALL 10 new RBiH captures are in the **central/northeast Bosnia ARBiH theater** (Doboj, Maglaj, Gracanica, Lukavac, Teslic, Zavidovici, Bugojno) — a contiguous arc from the Posavina corridor down through the Vozuca pocket. None are in the Krajina (Bihac/Sanski Most/Kljuc/Bosanska Krupa). Lost 2: kalinovik:tomislja and trnovo:tosici returned to RS.
- **RS net -9**: 10 RS losses to RBiH in the ARBiH 2nd/3rd Corps zone, partially offset by 1 RS gain (bugojno:medini returned to HRHB in n1984, but only because medini flipped HRHB→RS in n1980 — so RS lost that flip too).



---

## (d) Verdict: was Wave 20 the right call?

### Headline outcomes

| Metric | n1980 | n1984 | Δ |
|---|---|---|---|
| Final hash | 369add37a3307e8b | acc7d5991b862a18 | **DIVERGES** |
| HRHB count | 82 | 83 | +1 |
| RBiH count | 298 | 306 | +8 |
| RS count | 332 | 323 | -9 |
| Σ\|Δ\| | 50 | 48 | -2 |
| **Anchors** | **27/27 PASS** | **23/27 PASS** | **-4 (REGRESSION)** |
| Benchmarks | 5/6 | 5/6 | unchanged |

### Anchor failures in n1984 (REGRESSION)

| Anchor | Expected | Actual (n1984) | Captured via |
|---|---|---|---|
| op:zavidovici:vozuca_2 | RS | RBiH | probe_arbih_3rd_corps + later sector flip (no logged battle late) |
| op:doboj:boljanic_2 | RS | RBiH | **Operacija Osvit** w117 decisive_victory (3rd Corps) |
| op:gracanica:petrovo_2 | RS | RBiH | probe_arbih_3rd_corps_t123 w124 decisive_victory |
| op:lukavac:brijesnica_donja_2 | RS | RBiH | probe_arbih_2nd_corps + w55/w156 decisive_victory cascades |

All four anchors are in the **Doboj-Maglaj-Lukavac-Zavidovici (Vozuca pocket / Posavina south)** arc — RS-held strategic depth in the historical war, ahistorical for ARBiH to seize. These were holding correctly at n1980 but FLIPPED in n1984.

### Cascade attribution

Wave 20 changed exactly ONE constant: `MAX_TOTAL_FAILURES_SINGLE_AXIS` 8→4. This made Cincar Phase 1 abort 3 turns earlier (t142 vs t145). Cincar is HRHB / hvo_tomislavgrad / Krajina-zone — geographically distant from Doboj/Maglaj/Lukavac/Zavidovici.

But the **cascade effect** is non-local:
- Determinism is preserved (same seed), but state diverges from t142 onward because Cincar's earlier abort changes ALL downstream RNG / scheduler / planner inputs.
- Pre-planned ARBiH ops that fire after t142 see different brigade-availability snapshots, different defender intel, different stance assignments — leading to entirely different op sets:
  - **n1980 had**: Operacija Ćuprija (t88), Operacija Farz (t95), Operacija Osvit (t156)
  - **n1984 has**: Operacija Uragan (t96, failed), Operacija Tigar-Sloboda (t100, failed), **Operacija Osvit (t115, success — captured boljanic_2 + vitkovci)**, Operacija Brana/Vrbas/Prodor/Jesen/Grom/Grab/Udar/Topola (VRS 1st Krajina, all failed), Operacija Ponos (t160, failed)
- The VRS now launches NINE consecutive 1st-Krajina ops (Brana, Vrbas, Prodor, Jesen, Grom, Grab, Udar, Topola) between t131 and t181 against the same defender, ALL failing with `defender_power_too_high` — wasting VRS commitment in the Krajina while leaving Doboj/Maglaj/Vozuca exposed to ARBiH probe captures.

### Mistral 1: did NOT deliver

- Mistral 1 fired at t160 but failed with **no_approach_osid** on BOTH axes (mistral_1_grahovo + mistral_1_glamoc).
- Wave 20 did NOT enable Mistral 1. Mistral 1's blocker is topology (staging → objective approach path unreachable), not brigade availability.
- The 8-OSID RBiH gain is NOT in the Krajina zone and is NOT attributable to Mistral 1 firing.

### HRHB +1

The one HRHB net gain (`op:bugojno:medini` stayed HRHB in n1984) is a tiny artifact of the Wave-20 cascade. The HRHB-claimed Mistral 1 zone (Bosansko Grahovo, Glamoč) had ZERO captures in either run. Wave 20 did not produce ANY HRHB territorial benefit in the Krajina zone.

### Net verdict: **NO — Wave 20 was the WRONG call**

1. **Cincar Phase 1 aborted 3 turns earlier as intended.** ✅ Mechanic works.
2. **Mistral 1 did NOT fire.** ❌ Wave 20's stated purpose (release brigades for Mistral 1) was not delivered. Mistral 1's blocker is `no_approach_osid` — a routing/topology problem orthogonal to MAX_TOTAL_FAILURES.
3. **Anchors regressed from 27/27 to 23/27** — four historically-RS-held OSIDs flipped to RBiH due to cascade state divergence. This is the dominant calibration impact of Wave 20: **trading a 2-OSID Σ\|Δ\| improvement for 4 anchor failures.**
4. The 8-OSID RBiH gain is **ahistorical** — it represents the Vozuca pocket + Posavina south corridor falling to ARBiH operations and probes that the historical record does not support. ARBiH did press in this arc but did not capture these settlements before the Dayton freeze.
5. The 9-OSID RS loss has the same ahistorical character: VRS 1st Krajina spinning its wheels in failed Brana/Vrbas/Prodor/etc. ops while Doboj-Maglaj defenses weaken.

**Recommendation**: REVERT Wave 20. The MAX_TOTAL_FAILURES_SINGLE_AXIS=4 change does NOT achieve the goal of enabling Mistral 1 and INTRODUCES four new anchor failures. Address Mistral 1's `no_approach_osid` blocker as the root cause — likely an OOB/staging/objective topology mismatch that needs a separate fix (Wave 21 candidate: re-check Mistral 1 staging OSID adjacency to Bosansko Grahovo/Glamoč objectives, or add intermediate staging).



---

## Appendices

### Appendix A — Full operation set divergence (n1980 → n1984)

**Only in n1980 (eliminated in n1984)**:
- Operacija Ćuprija (arbih_4th_corps, t88, **success**)
- Operacija Farz (arbih_4th_corps, t95, failure zero_eligible_axis)
- Operacija Osvit (arbih_2nd_corps, t156, failure zero_eligible_axis) — note: name reused at different turn in n1984

**Only in n1984 (new from cascade)**:
- Operacija Uragan (arbih_4th_corps, t96-98, failure zero_eligible_axis, brigades = arbih_441/444/445)
- Operacija Tigar-Sloboda (arbih_4th_corps, t100-102, failure zero_eligible_axis)
- **Operacija Osvit (arbih_3rd_corps, t115-119, SUCCESS — captured doboj:boljanic_2 + teslic:vitkovci, 5-star Brilliant Victory)**
- Operacija Brana (vrs_1st_krajina, t131-134, failure defender_power_too_high)
- Operacija Vrbas (vrs_1st_krajina, t135-137, failure defender_power_too_high)
- Operacija Prodor (vrs_1st_krajina, t139-141, failure defender_power_too_high)
- Operacija Jesen (vrs_1st_krajina, t145-155, failure no_logged_attempt)
- Operacija Grom (vrs_1st_krajina, t158-160, failure defender_power_too_high)
- Operacija Ponos (arbih_2nd_corps, t160-165, failure zero_eligible_axis)
- Operacija Grab (vrs_1st_krajina, t167-169, failure defender_power_too_high)
- Operacija Udar (vrs_1st_krajina, t173-175, failure defender_power_too_high)
- Operacija Topola (vrs_1st_krajina, t179-181, failure defender_power_too_high)

VRS 1st Krajina launches **8 consecutive failed offensives** in n1984. None present in n1980. This is the most visible cascade artifact: the corps repeatedly probing a defender it cannot dislodge while higher-value defensive deployment in Doboj/Maglaj suffers.

### Appendix B — Per-OSID attribution for the 10 RBiH new captures

| OSID | Captured by op (n1984) | Battle weeks | Note |
|---|---|---|---|
| op:bugojno:prijaci | probe_arbih_3rd_corps_t127..t185 series | w185-186 (decisive_victory) | Late-war probe captured at w185 |
| op:doboj:boljanic_2 | **Operacija Osvit** (arbih_3rd_corps t115-119) | w117 (decisive_victory) | Op-AAR logged capture; anchor failure |
| op:doboj:zelinja_gornja_2 | Operacija Sjena (arbih_2nd_corps t151-160) | w156 (decisive_victory) | Op-AAR logged capture |
| op:gracanica:petrovo_2 | probe_arbih_3rd_corps_t123 | w124 (decisive_victory) | Anchor failure |
| op:lukavac:brijesnica_donja_2 | probe_arbih_2nd_corps multiple | w55, w156, w158, w160, w163 (all decisive_victory) | Anchor failure |
| op:maglaj:donja_bocinja_2 | probe_arbih_3rd_corps_t33..t71 multi-week | w34 (costly_victory), w68 (stalemate) | Sector-level finalization |
| op:maglaj:gornja_bocinja | probe_arbih_3rd_corps_t61, t75 | w62 (decisive_victory), w76 (repulsed) | Sector-level finalization |
| op:maglaj:jablanica | probe_arbih_3rd_corps_t59..t125 | w122, w126 (decisive_victory) | Long campaign |
| op:teslic:vitkovci | **Operacija Osvit** (arbih_3rd_corps t115-119) | w118 (decisive_victory) | Op-AAR logged capture |
| op:zavidovici:vozuca_2 | probe_arbih_3rd_corps_t20..t29 + late sector | early-war battles (w21-29 all failed/catastrophic) | Sector flip after late-war neutralization; anchor failure |

### Appendix C — Cincar Phase 1 grade comparison

n1984 Cincar / Kupres: 5-star **Brilliant Victory** (despite max_failures) — captured bucovaca only, but exchange_ratio = 70 (good), preservation = 138 (excellent), tempo = 69, objective_completion = 25.

The 5-star verdict appears generous — the op captured 1 of 4 objectives. The grade comes from low casualties relative to inflicted (390k+715w vs 183k+335w) but should arguably be downgraded given 75% of objectives unfulfilled.

### Appendix D — Mistral 1 staging vs objective topology

n1984 Mistral 1 axes:

| Axis | Staging OSID | Objectives | Status |
|---|---|---|---|
| mistral_1_grahovo | op:livno:misi_2 | op:bosansko_grahovo:{crni_lug, malesevci, bosansko_grahovo_2, ugarci} | unreachable_at_launch=true, no_approach_osid |
| mistral_1_glamoc | op:duvno:tomislavgrad_2 | op:glamoc:{halapic, stekerovci_2, vidimlije_2, glamoc_2} | unreachable_at_launch=true, no_approach_osid |

The blocker is sub-segment / contact-graph adjacency between staging and objective at op launch time. Wave 19A re-hosted Mistral 1 onto hvo_tomislavgrad (corps) and assigned these staging OSIDs, but the topology check at launch fails. This is the canonical follow-up: either the staging is wrong, or the contact graph is missing an edge to Bosansko Grahovo / Glamoč objectives at the historical 1995-Aug trigger turn.

### Appendix E — File references

- n1984 run: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1984/`
- n1980 baseline run: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1980/`
- Wave 20 commit: f5947b55 `fix(sector-offensive): single-axis MAX_TOTAL_FAILURES_SINGLE_AXIS=4 (Wave 20)`
- Wave 19A commit: bdfc2a47 `fix(catalog): Mistral 1 re-host on hvo_tomislavgrad (Wave 19A)`
- Sector offensive lifecycle: `src/sim/combat/sector_offensive.ts`
- Mistral 1 catalog: search `data/source/` for `Mistral 1` (likely `pre_planned_operations` or `arc_operations_catalog`)

### Appendix F — Suggested next steps (Wave 21 candidates)

1. **REVERT Wave 20** (restore MAX_TOTAL_FAILURES_SINGLE_AXIS=8). The 3-turn-earlier Cincar abort does not enable Mistral 1, and the cascade introduces 4 anchor failures.
2. **Investigate Mistral 1 `no_approach_osid` separately.** Owner: operations-expert + map-geometry-integrity-reviewer.
   - Validate that op:livno:misi_2 has a contact-graph path to op:bosansko_grahovo:* objectives by w160 (Aug 1995).
   - Validate that op:duvno:tomislavgrad_2 has a contact-graph path to op:glamoc:* objectives.
   - If staging is wrong, propose better staging (e.g. op:livno:crni_lug-adjacent OSID).
3. **Investigate the Vozuca pocket sector flip** (op:zavidovici:vozuca_2) — anchor expected RS but flips to RBiH in late-war via sector mechanism, not op capture. May indicate a sector-consolidation bug affecting RS holdings in the Posavina south. Owner: sector-expert.
4. **VRS 1st Krajina futility cascade** — 8 consecutive failed ops at the same defender in 50 turns suggests the corps CO is not learning. Owner: corps-army-commander.



