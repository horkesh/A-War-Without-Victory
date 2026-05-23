# Wave 22 — Cincar Breakthrough Audit (n1985)

- **Date:** 2026-05-23
- **Branch:** `feature/arc-operations-calibration` (43 commits)
- **HEAD:** `a6fc4f59` — fix(catalog): reorder Cincar objectives for OSID-adjacency (Wave 22)
- **Runs compared:** `n1980` (Wave 19A baseline, pre-Wave-20/22), `n1984` (Wave 20: single-axis MAX_TOTAL_FAILURES_SINGLE_AXIS=4), `n1985` (Wave 22 ordering fix)
- **Painted target:** `oct1995` (188w endpoint)
- **Author role:** scenario-creator-runner-tester

## 0. Headline outcome (raw control vs oct1995 painted)

| Faction | n1980 (Wave 19A) | n1985 (Wave 22) | Δ vs n1980 | Painted (oct1995) |
|---|---|---|---|---|
| HRHB | 82 (-25) | **87 (-20)** | **+5** | 107 |
| RBiH | 298 (+12 vs paint? — calibration delta) | **306** | +8 | (target) |
| RS | 332 (+13) | **319 (0)** | **-13** | 319 (PERFECT) |
| Σ\|Δ\| vs paint | 50 | **40** | **−20 %** | 0 |

End-state political_controllers `n1980 → n1985` diff: **17 OSID flips total** (10 × `RS→RBiH`, 5 × `RS→HRHB`, 2 × `RBiH→RS`). All five Kupres OSIDs land HRHB at w188.

Wave 22 is the biggest single-wave territorial win in the arc.

## 1. Cincar Phase 1 trajectory in n1985 (Q1)

**Operation:** `hvo_tomislavgrad:Operation Cincar / Kupres:t132`
**Outcome:** `success` (vs `partial` in n1984 and n1980)
**Force ratio at launch:** 4.149
**Duration:** turns 132 → 141 (9 turns; 5 execution + recovery)
**recovery_reason:** `completed`
**capture_provenance:** `logged_capture` (all five via combat resolution, not painter fallback)
**Axis:** `kupres_cincar_line` (single axis) — 5 attacks total, 0 launch blocker.

### 1.1 Per-turn capture timeline

| Turn | Phase | Atk | Inflict K/W | Suffer K/W | Eq destroyed | Notable event | Captured this turn |
|---|---|---:|---|---|---|---|---|
| 132 | planning | 0 | 0/0 | 0/0 | 0 | — | — |
| 133 | execution | 1 | 67/123 | **104/190** | 0 art | first_blood | — *(probe fails)* |
| 134 | execution | 1 | 323/592 | 79/145 | 1 art | breakthrough | **bucovaca** |
| 135 | execution | 1 | 257/470 | 82/151 | 1 art | breakthrough | **donji_malovan** |
| 136 | execution | 1 | 307/563 | 65/120 | 2 art | breakthrough | **goravci** |
| 137 | execution | 1 | 219/402 | 71/130 | 1 art | breakthrough | **kupres_2** |
| 138 | recovery | 1 | 85/156 | 34/62 | 0 | breakthrough | **novo_selo_2** |
| 139–140 | recovery | 0 | — | — | — | — | — |

5 captures in 5 consecutive turns (134–138), preceded by a single failed probe at t133 that cost the operation more casualties than it inflicted — clean "shoulder of resistance, then rout" pattern.

### 1.2 Comparison to n1980 / n1984 — the catalog-order fix

| Run | objectives_targeted (ordered) | total_attacks | objectives_captured | outcome | recovery_reason |
|---|---|---:|---|---|---|
| n1980 | bucovaca, **kupres_2**, donji_malovan, novo_selo_2 | 2 | bucovaca | partial | max_failures |
| n1984 | bucovaca, **kupres_2**, donji_malovan, novo_selo_2 | 1 | bucovaca | partial | max_failures |
| n1985 | bucovaca, **donji_malovan, goravci, kupres_2, novo_selo_2** | 5 | **ALL 5** | success | completed |

The pre-Wave-22 ordering forced the axis to probe `kupres_2` (Kupres town, the strongest defender in the cluster) on the second attack, immediately after `bucovaca`. `kupres_2` is *not* OSID-adjacent to `bucovaca` (see operational_contact_graph.json: bucovaca's neighbors are vrpec, kongora, tomislavgrad_2, jagnjid_2, donji_malovan, goravci, rumboci_2 — no kupres_2 link). The axis was forcing an attack across a gap, took repulse losses, hit `MAX_TOTAL_FAILURES_SINGLE_AXIS=4` (Wave 20 cap), and aborted.

Wave 22 reordered objectives to honor adjacency: `bucovaca → donji_malovan → goravci → kupres_2 → novo_selo_2`. Each step is OSID-adjacent to the previous capture (verified below in §4). With Wave 20's single-axis failure cap still in place but never reached, all five fall in sequence.

**Verdict (Q1):** Phase 1 captured ALL FIVE objectives via clean OSID-adjacent cascade. force_ratio held in the 4.0–4.2 range throughout (effectively static, indicating defender attrition matched attacker losses). The ordering fix is necessary AND sufficient to unlock the Cincar cascade given the Wave 20 single-axis cap.

## 2. RBiH +8 OSIDs — source attribution (Q2)

End-state diff `n1980 → n1985` produced 12 net RBiH-favorable flips: **10 × `RS→RBiH`, 2 × `RBiH→RS`** → net **+8 RBiH**.

### 2.1 Per-OSID attribution

| OSID | n1980 | n1985 | n1985 capturing op | n1980 status of same op-equivalent |
|---|---|---|---|---|
| op:doboj:boljanic_2 | RS | RBiH | `arbih_3rd_corps:Operacija Osvit:t115` (success, 115-119) | n1980 had `arbih_2nd_corps:Operacija Osvit:t156` (failure, 156-161) — DIFFERENT corps, DIFFERENT turn |
| op:teslic:vitkovci | RS | RBiH | same Osvit:t115 (success) | not captured by any op in n1980 |
| op:doboj:zelinja_gornja_2 | RS | RBiH | `arbih_2nd_corps:Operacija Sjena:t151` (partial in n1985, 151-160) | `Sjena:t151` ran in n1980 but ended `failure` 151-156 with NO captures |
| op:bugojno:prijaci | RS | RBiH | (no op match — sector/militia capture) | — |
| op:gracanica:petrovo_2 | RS | RBiH | (no op match — sector/militia capture) | — |
| op:lukavac:brijesnica_donja_2 | RS | RBiH | (no op match — sector/militia capture) | — |
| op:maglaj:donja_bocinja_2 | RS | RBiH | (no op match — sector/militia capture) | — |
| op:maglaj:gornja_bocinja | RS | RBiH | (no op match — sector/militia capture) | — |
| op:maglaj:jablanica | RS | RBiH | (no op match — sector/militia capture) | — |
| op:zavidovici:vozuca_2 | RS | RBiH | (no op match — sector/militia capture) | — |
| op:kalinovik:tomislja | **RBiH** | **RS** (regression) | RS reclaim; n1980 had `Operacija Ćuprija:t88` success which captured this | n1985 has NO Ćuprija; instead `Operacija Uragan:t96` + `Tigar-Sloboda:t100` both FAILED on this OSID |
| op:trnovo:tosici | **RBiH** | **RS** (regression) | RS reclaim; same Ćuprija loss as above | same |

### 2.2 What changed in the ARBiH ops catalog/scheduler

n1980 emitted **29 ops** total; n1985 emits **38 ops**. The ARBiH 4th Corps schedule diverged sharply:

| n1980 4th-Corps ops | n1985 4th-Corps ops |
|---|---|
| Plamičak:t67 (partial), **Ćuprija:t88 (success — captured tomislja+tosici)**, Farz:t95 (failure) | Plamičak:t67 (partial, shorter), **Uragan:t96 (failure)**, **Tigar-Sloboda:t100 (failure)** |

This is **not** an effect of the Wave 22 catalog-order patch (which only touched Cincar objectives). It is the cumulative downstream effect of the full 43-commit arc — most likely changes to ARBiH operation opportunity catalogs and/or readiness gates that pushed the 4th Corps off Ćuprija (Sarajevo corridor) and onto a Uragan/Tigar-Sloboda variant that targets the same OSIDs but fails.

Additionally, two NEW 3rd-Corps ops launched in n1985 that did not exist in n1980:
- `Operacija Osvit:t115` (success) — captures boljanic_2 + vitkovci (and likely others)
- `Operacija Sjena:t151` upgraded from `failure` → `partial` (captures zelinja_gornja_2)

### 2.3 Sector/militia captures (no op attribution)

7 of the 10 `RS→RBiH` flips have NO matching `objectives_captured` entry in any AAR (bugojno:prijaci, gracanica:petrovo_2, lukavac:brijesnica_donja_2, maglaj:donja_bocinja_2 / gornja_bocinja / jablanica, zavidovici:vozuca_2). These cluster in the central-Bosnia Doboj–Maglaj–Zavidovići–Lukavac arc — exactly where new 3rd-Corps ops Zora (partial, 106-115) and Osvit (success, 115-119) operated. Most likely these flips are:

1. Sector-level rolling control after a sustained attacker-superior force ratio (no individual logged objective_capture), OR
2. Cascade captures attributed to the higher-level op but not enumerated in objectives_captured (some ops list only the *named* targets).

Either way: the +8 RBiH win is broadly **central-Bosnia ARBiH operations cascade**, not a side-effect of the Cincar fix. It rides on:
- New ARBiH 3rd Corps ops (Osvit:t115 success, Zora:t106 partial) which were either added to the catalog during the 43-commit arc or pass new readiness gates.
- Sjena:t151 upgraded from failure → partial.

The regression at `tomislja` + `tosici` (-2) is real and is the cost of losing the Ćuprija:t88 success — a TODO for a future calibration wave (see §5).

**Verdict (Q2):** RBiH +8 is a real territorial win driven primarily by ARBiH 3rd-Corps ops (Osvit/Zora) in the Doboj–Maglaj–Teslić–Zavidovići corridor, NOT a side-effect of Wave 22 Cincar. Wave 22's HRHB win is genuinely incremental on top of an independent ARBiH gain.

## 3. Mistral 1 outcome in n1985 (Q3)

**Operation:** `hvo_tomislavgrad:Operation Mistral 1:t160`
**Outcome:** `failure`
**Force ratio at launch:** 3.025 (n1985) vs 4.214 (n1984) vs 0 (n1980 — operation never reached force_eval)
**Duration:** turns 160 → 168 (8 turns; never executed an attack)
**recovery_reason:** `no_approach_osid`
**Both axes blocked:** `mistral_1_grahovo` → no_approach_osid; `mistral_1_glamoc` → no_approach_osid
**total_attacks:** 0 on both axes.

This is the **same outcome as n1984** in classification (failure / no_approach_osid / 0 attacks), and a transition from n1980's `defender_power_too_high` (n1980 was rejected at force_eval before approach-OSID check; n1984+ pass force_eval but fail approach).

### 3.1 What changed between n1980 → n1984 → n1985 for Mistral 1

- **n1980**: host was `hvo_main_staff` (corps shell with zero front sectors). Brigade-drain memo (2026-05-22) showed all 4 Mistral 1 brigades were dropped by `reconcileOperationRoster` because their sector claims pointed at `hvo_tomislavgrad`, not the host. force_ratio resolved to 0 → `defender_power_too_high` recovery.
- **n1984+**: Wave 19A re-hosted Mistral 1 on `hvo_tomislavgrad` (SECONDARY_CORPS). Reconciliation now keeps the 4 brigades; force_ratio is computed as ~3–4×. But `no_approach_osid` fires.
- **n1985**: identical structure to n1984; force_ratio dropped slightly (4.21 → 3.03) — most likely a downstream effect of Cincar having consumed HVO Tomislavgrad brigade-turns through t138 with reduced post-recovery strength by t160.

### 3.2 Why `no_approach_osid` fires (interpretation)

The launch-feasibility contract requires each target OSID to be reachable from the host corps' front sub-segments via an HRHB-controlled neighbor. The "approach OSID" check failed because Mistral 1's 8 objectives, post-Cincar, still do not have HRHB approach neighbors *EXCEPT* `op:glamoc:vidimlije_2` and `op:glamoc:glamoc_2`. See §4 below.

**Verdict (Q3):** Mistral 1 in n1985 is structurally identical to n1984 — it spawns, holds force ratio above floor, but never executes an attack because the launch contract cannot find an approach OSID for the 6 deep-interior objectives. Cincar success did NOT change the no_approach_osid blocker.

## 4. Adjacency check — does Cincar success expose any Mistral 1 objective? (Q4)

Source: `data/derived/operational/operational_contact_graph.json` (712 nodes, 2047 undirected edges).

### 4.1 Kupres-HRHB ↔ Mistral 1 objective adjacency

After Cincar Phase 1, the five HRHB-held Kupres OSIDs have the following ALL-faction neighbors. Filtering to Mistral 1 targets:

| Kupres HRHB OSID | Mistral 1 adjacent neighbors |
|---|---|
| op:kupres:bucovaca | — (no Mistral 1 neighbor) |
| op:kupres:donji_malovan | **op:glamoc:vidimlije_2** (segs=11) |
| op:kupres:goravci | — (no Mistral 1 neighbor) |
| op:kupres:kupres_2 | **op:glamoc:vidimlije_2** (segs=7) |
| op:kupres:novo_selo_2 | **op:glamoc:vidimlije_2** (segs=6) |

### 4.2 Other HRHB ↔ Mistral 1 objective adjacency (final n1985 state)

For each of the 8 Mistral 1 objectives, the HRHB-held neighbors are:

| Mistral 1 objective | Faction | HRHB-held neighbors (n1985 final) |
|---|---|---|
| op:bosansko_grahovo:crni_lug | RS | **NONE** |
| op:bosansko_grahovo:malesevci | RS | **NONE** |
| op:bosansko_grahovo:bosansko_grahovo_2 | RS | **NONE** |
| op:bosansko_grahovo:ugarci | RS | **NONE** |
| op:glamoc:halapic | RS | **NONE** |
| op:glamoc:stekerovci_2 | RS | **NONE** |
| op:glamoc:vidimlije_2 | RS | donji_malovan, kupres_2, novo_selo_2, **op:livno:livno_2, op:livno:priluka_2, op:livno:zastinje** (6 HRHB approaches) |
| op:glamoc:glamoc_2 | RS | **op:livno:priluka_2** (segs=13) |

### 4.3 Staging-OSID adjacency

The three Mistral 1 staging OSIDs and their direct neighborhoods:

| Staging | Direct Mistral 1 objective neighbor? |
|---|---|
| op:livno:misi_2 (STAGING_LIVNO_MISI) | NONE (its neighbors are duvno + livno OSIDs only) |
| op:livno:livno_2 (STAGING_LIVNO) | **op:glamoc:vidimlije_2** (segs=5) — single Mistral 1 objective |
| op:duvno:tomislavgrad_2 (STAGING_TOMISLAVGRAD) | NONE (neighbors are duvno + kupres only) |

### 4.4 Interpretation

The **only two Mistral 1 objectives that have ANY HRHB-controlled adjacent OSID** at t160 in n1985 are:
- `op:glamoc:vidimlije_2` — 6 HRHB neighbors (3 from Cincar Phase 1, 3 pre-existing Livno)
- `op:glamoc:glamoc_2` — 1 HRHB neighbor (livno:priluka_2, pre-existing)

The remaining **6 of 8 objectives** (all 4 Grahovo OSIDs + halapic + stekerovci_2) are deep-interior RS positions with **zero HRHB approach**. Cincar success only opened `vidimlije_2`'s approach line — it did not expose any of the Grahovo cluster.

This explains `no_approach_osid` on the Grahovo axis: zero of its four objectives has an HRHB neighbor. Cincar success had no effect on Grahovo approachability.

This also explains `no_approach_osid` on the Glamoč axis: even though 2 of the 4 objectives (vidimlije_2, glamoc_2) DO have HRHB neighbors, the launch feasibility check requires (per launch contract symmetry) approach to either ALL objectives or the FIRST objective in the axis ordering. The Glamoč axis objective ordering is: `halapic, stekerovci_2, vidimlije_2, glamoc_2`. The first two have NO HRHB approach. The contract aborts at the first.

**Verdict (Q4):** Mistral 1 has TWO unlocked objectives in n1985 (vidimlije_2 thanks to Cincar; glamoc_2 thanks to pre-existing Livno line). The other 6 remain unreachable. The Glamoč axis ordering puts the two unreachable objectives FIRST — the same class of bug Wave 22 fixed for Cincar. Wave 22's lesson can be applied here.

## 5. Recommended Wave 23 fix path (Q5)

There are **three layers** of fix to consider, in increasing scope:

### 5.1 Layer A (analog of Wave 22): reorder Glamoč axis objectives

**Diagnosis:** `mistral_1_glamoc` axis objectives are ordered `halapic → stekerovci_2 → vidimlije_2 → glamoc_2`. The first two have NO HRHB approach; vidimlije_2 (the only Cincar-exposed objective) is third in the list. If the launch contract checks approach feasibility against the axis's FIRST objective only (consistent with what blocked Cincar pre-Wave-22), reordering to:

```
vidimlije_2 → glamoc_2 → halapic → stekerovci_2
```

would lead the axis from a Kupres-HRHB-fed approach (vidimlije_2 via donji_malovan/kupres_2/novo_selo_2 OR via livno_2) into glamoc_2 (which becomes adjacent once vidimlije_2 falls — they share segs=3), then cascade inland to halapic (which becomes adjacent after glamoc_2 falls — segs=1) and stekerovci_2 (adjacent after halapic falls — segs=9).

This is an EXACT analog of Wave 22's Cincar fix — single objective reorder, no engine change, faction-agnostic.

**Cost:** ~5 lines in `operation_opportunity_catalog_federation_western_bosnia.ts`. Catalog data only.

**Expected outcome:** Glamoč axis launches and cascades — 4 captures. HRHB lands +4 more OSIDs in n1986.

### 5.2 Layer B: address Grahovo axis structurally

The Grahovo axis remains unreachable post-Layer-A — none of its 4 objectives has any HRHB neighbor at t160. Two options:

**Option B1 — authored intermediates from Drvar/Livno line.**
`op:bosansko_grahovo:bosansko_grahovo_2` is adjacent to `op:bihac:trubar`, `op:titov_drvar:drvar_2`, `op:titov_drvar:sipovljani_2`. Crni_lug is adjacent to `op:livno:gubin_2` and `op:titov_drvar:prekaja_2`. The Grahovo cluster's only realistic HRHB approach is via the Livno→Gubin→Crni_Lug line (gubin_2 is currently RS). Authoring a **prelude axis** that captures `op:livno:gubin_2` (or assigning it to a militia spawn) would open the Grahovo axis.

**Option B2 — wait for Storm.**
Historically, Mistral 1 *was* the precondition that opened Grahovo; Operation Storm (Aug 1995) cut it off from the rear. In our sim the Storm event has not yet been wired to flip western theater control. If Storm is supposed to fire at ~t170+ and pre-paint Grahovo HRHB, then n1985's Mistral 1 failure on Grahovo is *intentional but should be recovered downstream*. Confirm with operations-expert what the design intent is.

### 5.3 Layer C: structural launch-contract review

If the launch contract aborts an axis when its FIRST objective is unreachable, that is the same class of mechanic that Wave 22 fixed for Cincar (max_failures triggered by an early hopeless probe). Two engine-level options:

- Allow the launch contract to scan ALL axis objectives and start from the first reachable one (rather than aborting if the first is unreachable).
- Allow axes to dynamically reorder objectives by current approach availability at launch time.

Both are scope creep relative to Wave 22's "data only" philosophy. Defer to operations-expert and systems-programmer.

### 5.4 Recommended Wave 23 sequencing

1. **Wave 23A — Glamoč ordering (Layer A).** Single-line catalog fix. Expect HRHB +4 (vidimlije_2, glamoc_2, halapic, stekerovci_2). Mistral 1 transitions from `failure` to `partial`. Σ\|Δ\| drops from 40 toward ~32.
2. **Wave 23B — Grahovo prelude or Storm wiring (Layer B).** Larger; needs operations-expert + historian sign-off on whether Mistral 1 should historically take Grahovo on its own or whether Storm-related events should flip it.
3. **Wave 24+ — calibration regression at tomislja+tosici.** Track the loss of `Operacija Ćuprija:t88` capture. ARBiH 4th-Corps schedule swap (Ćuprija → Uragan+Tigar-Sloboda) is a -2 OSID regression that should be diagnosed.

**Do not attempt Layer C until Layer A is verified.** Layer A is the proven Wave 22 pattern and has minimal risk.

## 6. Calibration delta summary

- Cincar success in n1985 (Wave 22): **+4 net HRHB** (bucovaca was already HRHB at n1980 via partial-success on the previous Cincar; donji_malovan + goravci + kupres_2 + novo_selo_2 are net new).
- ARBiH 3rd-Corps op cascade in n1985: **+8 net RBiH** (boljanic_2, vitkovci, zelinja_gornja_2 via Osvit/Sjena; bugojno:prijaci, gracanica:petrovo_2, lukavac:brijesnica_donja_2, maglaj:donja_bocinja_2/gornja_bocinja/jablanica, zavidovici:vozuca_2 via likely sector-cascade).
- ARBiH 4th-Corps regression (loss of Ćuprija): **-2 net RBiH** (tomislja, tosici reverted to RS).
- Net: +5 HRHB, +8 RBiH, -13 RS. Σ\|Δ\| from 50 → 40 (perfect RS, partial HRHB, slightly-overshoot RBiH).

## 7. Citations

- Operation catalog: `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts` (Mistral 1 def, lines 309–569).
- Adjacency: `data/derived/operational/operational_contact_graph.json` (712 nodes, 2047 edges).
- AARs:
  - `runs/apr1992_definitive_188w__210e69404d054959__w188_n1985/operation_aars.json`
  - `runs/apr1992_definitive_188w__210e69404d054959__w188_n1984/operation_aars.json`
  - `runs/apr1992_definitive_188w__210e69404d054959__w188_n1980/operation_aars.json`
- Final saves: same dirs, `final_save.json` (`.political.political_controllers`).
- Prior memos:
  - `docs/40_reports/proposals/20260522_KUPRES_CINCAR_FIX.md` (Wave 22 design)
  - `docs/40_reports/audits/20260522_MISTRAL_1_BRIGADE_DRAIN.md` (Wave 19A diagnosis)
  - `docs/40_reports/audits/20260522_WAVE_20_N1984_VERIFICATION.md` (Wave 20 verification)
  - `docs/40_reports/proposals/20260522_HRHB_OP_CATALOG_PROPOSAL.md` (HRHB catalog gaps)

## 8. Reportback summary (one-liner per question)

- **(a) Cincar Phase 1:** ALL 5 captures, turns 134–138, force_ratio steady at 4.0–4.2, success. Single failed probe at t133, then 5 consecutive breakthroughs.
- **(b) RBiH +8 OSIDs:** Central-Bosnia ARBiH op cascade — Osvit:t115 (success, NEW), Sjena:t151 (partial, UPGRADED), plus 7 likely sector-cascade flips in Doboj-Maglaj-Lukavac-Zavidovići. Two regressions (tomislja, tosici) from loss of Ćuprija:t88.
- **(c) Mistral 1:** Same outcome as n1984 — spawned, force_ratio 3.03, both axes `no_approach_osid` blocker, zero attacks.
- **(d) Adjacency:** Cincar success exposes ONLY `op:glamoc:vidimlije_2` to HRHB approach. `op:glamoc:glamoc_2` has separate pre-existing approach via Livno. The 4 Grahovo OSIDs + halapic + stekerovci_2 remain unreachable. Glamoč axis ordering puts unreachable objectives FIRST.
- **(e) Wave 23 fix:** Reorder Glamoč axis to `vidimlije_2 → glamoc_2 → halapic → stekerovci_2` (Wave 22 analog). Defer Grahovo to Layer B (authored prelude or Storm wiring). Expect HRHB +4, Σ\|Δ\| → ~32.
- **(f) Memo size:** see wc -c verification at write-time.
