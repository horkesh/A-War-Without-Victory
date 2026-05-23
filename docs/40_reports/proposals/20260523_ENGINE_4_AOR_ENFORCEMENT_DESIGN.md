# ENGINE-4: East-Bosnia Walk-In Residual — Corps AoR Enforcement Design Memo

**Date:** 2026-05-23
**Author:** bot-AI engine researcher (read-only investigation)
**Audience:** Orchestrator, operations-expert, sector-expert, corps-army-commander
**Status:** DESIGN MEMO — no code touched

---

## 1. Executive Summary

The n1992 spatial-metric audit flagged **24 misplaced OSIDs** in the east-Bosnia
direction (RBiH-in-sim, RS-in-painted-oct1995): Goražde 8, Doboj 4, Foča 4,
Rogatica 4, Trnovo 4. The original framing assumed these were "autonomous
ARBiH walk-in captures of RS-painted territory" past the Wave 18 proximity
guard, and proposed five tightening options (a–e).

**This investigation reverses the framing.** A line-by-line per-OSID forensic
walk against `data/derived/latest_run_final_save.json` (n1992 final save,
t188) finds:

| Category | Count | Cause |
|---|---:|---|
| INITIAL_ALREADY_RBiH | 18 | OSID is RBiH-controlled in `initial_political_controllers` — scenario painted them RBiH on day 1. Painted-oct1995 disagrees. Sim never captured anything. |
| CONSOLIDATION (t1) | 3 | Lost-cause / pocket-consolidation at scenario startup (turn 1). Not a sim-time capture. |
| COMBAT (sim-time capture) | 2 | True sim-time RBiH capture of an RS OSID. |
| OTHER | 0 | — |
| **Total** | **23** | (the 24th, Goražde set-aside, is in the 8 INITIAL bucket) |

Of the 2 sim-time captures, **both were taken by formal CorpsOperation
launches** — Operacija Osvit (3rd Corps, t115, captured boljanic_2 t117)
and Operacija Sjena (2nd Corps, t151, captured zelinja_gornja_2 t156).
**Neither was a walk-in.** Wave 18 was not even reachable for these
captures — the bot routed through the operation system end-to-end.

This collapses the AoR-enforcement design space:

- The walk-in guard (Wave 18 + earlier gates) is **not the leaky channel**.
  Of 23 misplaced OSIDs, zero went through walk-in.
- 18 of 23 are **painted-data disagreements**, not engine behavior. They
  cannot be fixed by tightening the engine; they must be fixed by either
  (a) re-painting the scenario init to match oct1995 reference, or
  (b) accepting the painted-oct1995 reference as the authoritative ground
  truth and treating the t0 paint as wrong.
- 3 are **t1 consolidation** in isolated pockets — also data-flavour, but
  via the scenario consolidation rule rather than the initial paint.
- 2 are **out-of-AoR formal corps operations** — a real engine problem,
  but one that lives in **operation-objective selection / sector-targeting
  scope** (corps decided to target OSIDs in another corps's AoR), not in
  the walk-in guard.

**Recommendation:** **Do not ship any of the originally-listed (a)–(e)
options as a single fix.** Split the work into three independent threads:

1. **Painted-init audit (data thread)** — reconcile the 18 INITIAL_ALREADY_RBiH
   OSIDs against ICTY-grade historical sources. Either the scenario init or
   the painted-oct1995 reference is wrong.
2. **Out-of-AoR operation-objective guard (engine thread)** — block a corps
   from listing axis objectives in another corps's sector territory unless
   an explicit cross-corps directive (Army HQ campaign plan) names that
   target. ~30 LOC, surgical, faction-symmetric.
3. **t1 consolidation rule audit (scenario thread)** — review why
   `op:foca:donje_zesce`, `op:gorazde:podkozara_donja_2`, `op:gorazde:sopotnica`
   consolidate to RBiH at t1 when initial paint is RS. Likely enclave-rule
   over-pull; fix in scenario consolidation logic, not in combat code.

The walk-in guard itself (Wave 18 / 1-hop proximity) is doing its job here
and should not be tightened blindly. The "salient aversion" exit at line 782
and the "Enclave guard" exit at line 771 already preempt the residual
behavior. Tightening Wave 18 to 2-hop (option a) would, per the historical
"n778 corps operational area guard was tested but too restrictive"
comment at line 795, cascade to legitimate-advance regressions in other
corridors (Posavina, Lašva, Kupres) that are NOT in the residual set.

---

## 2. Wave 18 Walk-In Guard — Gate Summary

Reference: `src/sim/combat/bot_brigade_eval_attack.ts` lines 713–873,
`evaluateUncontestedOccupation()`.

Order of gates (a `return false`/`continue` at any gate kills the walk-in):

| # | Gate | Lines | Purpose |
|---|---|---|---|
| 0 | Turn ≤ 2 throttle | 736–737 | No walk-ins in deployment phase |
| 1 | `isActiveSectorOperationParticipant` | 738 | If brigade is in a formal op, skip |
| 2 | `disrupted_turns > 0` | 739–740 | Disrupted brigades cannot walk in |
| 3 | OSID is operational (`op:` prefix) | 752 | Skip non-op tokens |
| 4 | Controller check (must be enemy) | 754–758 | Skip own/uncontrolled |
| 5 | Alliance guard | 761–765 | RBiH↔HRHB cannot walk into each other while allied/mobilizing |
| 6 | **Enclave guard** | 771–774 | Enclave brigades cannot expand beyond enclave perimeter (Srebrenica/Žepa containment) |
| 7 | **Salient aversion** | 782–793 | Skip if >75% of post-capture neighbors would be enemy |
| 8 | `avoided_osids_by_faction` | 804–805 | Scenario avoid-list (historical no-capture OSIDs) |
| 9 | Active enemy formation at target | 808–820 | Direct defender present → not undefended |
| 10 | Sector with active brigades covering target | 827–837 | Sector defense (assigned + reserve) |
| 11 | **Wave 18 1-hop proximity scan** | 850–861 | Active enemy formation at any neighbor of target → blocked |

The deleted **"corps operational area guard"** (line 795 NOTE, tested at n778,
rolled back) would have been gate 7.5 — restricting walk-ins to the brigade's
own corps territory. It cost −0.9pp calibration when shipped.

**Per-OSID forensic** confirms gates 6, 7, 9, 10, 11 are all firing as
designed for the east-Bosnia clusters. The brigades involved in the 2
sim-time captures (`arbih_373rd_slavna_mountain`, `arbih_221st_mountain`)
were `isActiveSectorOperationParticipant === true` at the capture turn
(part of Operacija Osvit / Operacija Sjena respectively), so they
short-circuited at **gate 1** before reaching Wave 18.

---

## 3. Per-OSID Capture Forensic (23 residual OSIDs)

Method: for each OSID where `pc[osid] === 'RBiH'` and
`painted_oct1995[osid] === 'RS'`, walked `political.control_events[]`,
classified by `mechanism`, joined to `operation_history[]` by brigade-id
and turn.

### 3.1 Doboj cluster (4)

| OSID | Initial | Painted | Class | Mechanism |
|---|---|---|---|---|
| `op:doboj:boljanic_2` | RS | RS | **COMBAT** | Operacija Osvit (3rd Corps), t117, attacker `arbih_373rd_slavna_mountain` |
| `op:doboj:grapska_gornja_2` | **RBiH** | RS | INITIAL | No control events — painted RBiH at t0 |
| `op:doboj:makljenovac` | **RBiH** | RS | INITIAL | No control events — painted RBiH at t0 |
| `op:doboj:zelinja_gornja_2` | RS | RS | **COMBAT** | Operacija Sjena (2nd Corps), t156, attacker `arbih_221st_mountain` |

### 3.2 Foča cluster (4)

| OSID | Initial | Painted | Class | Mechanism |
|---|---|---|---|---|
| `op:foca:donje_zesce` | RS | RS | **CONSOLIDATION** | t1 RBiH consolidation (enclave-rule pull at startup) |
| `op:foca:mazlina` | **RBiH** | RS | INITIAL | No control events |
| `op:foca:patkovina` | **RBiH** | RS | INITIAL | No control events |
| `op:foca:ustikolina` | **RBiH** | RS | INITIAL | No control events |

### 3.3 Rogatica cluster (4)

| OSID | Initial | Painted | Class | Mechanism |
|---|---|---|---|---|
| `op:rogatica:brcigovo` | **RBiH** | RS | INITIAL | No control events |
| `op:rogatica:rogatica_2` | **RBiH** | RS | INITIAL | No control events |
| `op:rogatica:varosiste_2` | **RBiH** | RS | INITIAL | No control events |
| `op:rogatica:zepa_2` | **RBiH** | RS | INITIAL | No control events (Žepa enclave painted RBiH at init) |

### 3.4 Trnovo cluster (3)

| OSID | Initial | Painted | Class | Mechanism |
|---|---|---|---|---|
| `op:trnovo:delijas` | **RBiH** | RS | INITIAL | No control events |
| `op:trnovo:kijevo_2` | **RBiH** | RS | INITIAL | No control events |
| `op:trnovo:trnovo` | **RBiH** | RS | INITIAL | No control events |

(Audit found 3 not 4 — `op:trnovo:tusila` is RBiH-painted at oct1995 too.)

### 3.5 Goražde cluster (8)

| OSID | Initial | Painted | Class | Mechanism |
|---|---|---|---|---|
| `op:gorazde:faocici_2` | **RBiH** | RS | INITIAL | No control events |
| `op:gorazde:hrancici` | **RBiH** | RS | INITIAL | No control events |
| `op:gorazde:kolovarice` | **RBiH** | RS | INITIAL | No control events |
| `op:gorazde:podkozara_donja_2` | RS | RS | **CONSOLIDATION** | t1 RBiH consolidation |
| `op:gorazde:slatina_2` | **RBiH** | RS | INITIAL | No control events |
| `op:gorazde:sopotnica` | RS | RS | **CONSOLIDATION** | t1 RBiH consolidation; later t18 event |
| `op:gorazde:ustipraca_2` | **RBiH** | RS | INITIAL | No control events |
| `op:gorazde:zorovici` | **RBiH** | RS | INITIAL | No control events |

### 3.6 Five worked examples (per the prompt)

**Example 1 — `op:doboj:boljanic_2` (COMBAT, sim-time capture).**
Initial RS. Captured t117 by `arbih_373rd_slavna_mountain` under
**Operacija Osvit**, a 3rd-Corps formal operation that launched t115 with
axis `cmd_arbih_3rd_corps_main` and brigades
`{arbih_327th_vitezka_mountain, arbih_372nd_vitezka_mountain,
arbih_373rd_slavna_mountain, arbih_374th_slavna_light,
arbih_375th_liberation, arbih_377th_vitezka_mountain,
hrhb_110th_usora_brigade}` targeting
`{op:doboj:boljanic_2, op:teslic:vitkovci}`. Outcome: `success`.
**Out-of-AoR diagnosis:** the 373rd is sector-assigned to
`sector:arbih_3rd_corps:0` (territory: Maglaj + Tešanj OSIDs, 22 OSIDs,
no Doboj OSIDs). The target `op:doboj:boljanic_2` is in
`sector:arbih_2nd_corps:2` (2nd Corps territory). **3rd Corps launched an
operation whose objective lives in 2nd Corps's sector territory.**

**Example 2 — `op:doboj:zelinja_gornja_2` (COMBAT, sim-time capture).**
Initial RS. Captured t156 by `arbih_221st_mountain` under **Operacija
Sjena**, a 2nd-Corps formal operation that launched t151 with brigades
`{arbih_221st_mountain, arbih_222nd_liberation, arbih_224th_mountain}`
targeting `{op:doboj:zelinja_gornja_2, op:gradacac:pelagicevo}`. Outcome:
`partial`. **In-AoR**: the 221st is in `sector:arbih_2nd_corps:2`, and
the target is in the same sector's territory. This capture is mechanically
legitimate; the disagreement is whether the painted-oct1995 reference
should show RBiH or RS at this OSID. ICTY/BB review needed.

**Example 3 — `op:foca:donje_zesce` (CONSOLIDATION).**
Initial RS, but `control_events[]` records a t1 `mechanism=consolidation`
flip to RBiH. No combat. No operation. This is the scenario startup
consolidation rule pulling an isolated RS OSID into RBiH because it sits
inside the Goražde-area pocket geometry. The same mechanism is the cause
of `op:gorazde:podkozara_donja_2` and `op:gorazde:sopotnica`.

**Example 4 — `op:rogatica:zepa_2` (INITIAL).**
`initial_political_controllers['op:rogatica:zepa_2'] === 'RBiH'`. The Žepa
enclave is painted RBiH at scenario start. Painted-oct1995 marks it RS
(reflecting the post-Žepa-falls July 1995 reality, BB1/ICTY). The engine
never captured this OSID — RBiH held it from t0. **This is a calibration-
reference-vs-scenario-paint mismatch, not engine behavior.** Fix would be:
emit a `mechanism=enclave_falls` event in the engine if/when a Žepa-falls
trigger fires (analogous to the existing Srebrenica rupture event), OR
accept that the scenario does not model the July 1995 Žepa fall and
adjust the calibration target accordingly.

**Example 5 — `op:gorazde:faocici_2` (INITIAL).**
`initial_political_controllers === 'RBiH'`. Painted-oct1995 marks it RS.
No events. This is straight painted-data disagreement; either the t0 paint
includes too much Goražde-pocket territory, or the oct1995 paint is too
aggressive on the Goražde rim, or both. ICTY/BB review needed.

---

## 4. Corps AoR — What Already Exists

Reference: `src/sim/combat/corps_front_sectors.ts` and the extracted
`sector_territory.ts`, `subsegment_assignment.ts`, `brigade_assignment.ts`.

The engine **already** computes per-corps AoR each turn:

1. **Multi-source BFS from corps HQ locations** → maps every friendly OSID
   to its nearest corps via `mapOsidsToCorps()` (sector_territory.ts).
2. **Voronoi territory assignment** → `assignTerritoryVoronoi()` populates
   `sector.territory_osids[]` per sector.
3. **Repair pass** → `repairDisconnectedTerritory()`,
   `consolidateCrossCorpsFronts()`, `consolidateIsolatedCorpsPockets()`.
4. **Brigade-to-sector classification** → `classifyBrigadesByTerritory()`
   writes `formation.assigned_sub_segment_id` and `formation.corps_id`.
5. **Sub-segment** → finer partition inside a sector (`findSubSegments()`,
   `splitOversizedSubSegments()`).

The data IS there. What's missing is **a guard on the operation-objective
selection path** that consults this AoR before letting a corps name an
objective in another corps's `sector.territory_osids[]`.

The walk-in guard exists at the **brigade-action layer**
(`bot_brigade_eval_attack.ts`). The leak in this calibration is at the
**operation-objective-selection layer** (the path that builds
`CorpsOperation.axes[].objectives[]`). Different layer, different fix.

---

## 5. Design Options — Re-scored Against the Real Diagnosis

### 5.1 Original options (a)–(e) — re-evaluation

All five original options targeted **the walk-in path**. Only 0 of 23
residuals went through walk-in. Therefore, **all five options miss the
actual leak.**

| Option | Cost | Walk-in coverage | Residual coverage | Net |
|---|---|---|---|---|
| (a) Wave 18 1→2-hop proximity | ~5 LOC | tightens walk-in | 0/23 (no walk-ins to block) | Negative — over-blocks legit walk-ins in Posavina/Lašva, regression risk per n778 precedent |
| (b) Corps AoR enforcement (brigade walk-in only) | ~30 LOC | hard-block walk-in across AoR | 0/23 | Negative — n778 already showed −0.9pp; no upside on the residual |
| (c) Faction historical-bounds lookup | ~50 LOC + data | block walk-in into never-held OSIDs | 0/23 | Neutral — option (b)'s drawbacks plus data maintenance |
| (d) Brigade-OSID-hop limit | ~15 LOC | block far walk-ins | 0/23 | Neutral |
| (e) OSID-pair-painted reverse-check | ~25 LOC + data | block walk-in to consistently-enemy OSIDs | 0/23 | Bad — uses calibration-reference data inside engine logic, leaks oracle into player-facing sim |

### 5.2 New option (f) — Out-of-AoR operation-objective guard

**Rationale:** The 2 sim-time COMBAT residuals (boljanic_2 via 3rd Corps,
zelinja_gornja_2 via 2nd Corps) were both captured by formal
CorpsOperations. zelinja_gornja_2 was IN 2nd Corps's own territory, so it
is arguably legitimate. boljanic_2 was OUT of 3rd Corps's territory —
3rd Corps reached across into 2nd Corps's AoR.

**Mechanism:** at operation-emit time
(`src/sim/combat/commander/emit.ts` and/or `sector_offensive.ts`'s
objective selection), filter axis objectives by

    isObjectiveInCorpsTerritory(objective_osid, corps_id, state)
        = sectors_of_corps.some(s => s.territory_osids.includes(objective_osid))

with the explicit allow-list:
- objectives **adjacent** to corps territory are allowed (front-bulge ops);
- objectives explicitly named in an **Army-HQ campaign plan** are allowed
  (cross-corps coordinated ops);
- objectives in **enclave-rescue** ops (already classified by op.kind) are
  allowed.

**Faction symmetry:** the rule fires identically for RBiH/RS/HRHB. Same
data (`sector.territory_osids`), same predicate.

**Determinism:** sector.territory_osids is derived per turn from sorted
BFS; the predicate is a pure set membership check. No new RNG, no
ordering risk.

**Risk:** could over-block legitimate operations where the corps reaches
into an adjacent corps's territory (corridor 92 prelim, central Posavina).
Mitigation: the **adjacent-territory** allow-list above. boljanic_2 IS
adjacent to 3rd Corps territory via Tešanj/Maglaj, so even this guard
would not block Operacija Osvit unless we tighten adjacency to "hop-0
only" — which the prompt's option (b) already considered and is too
restrictive.

**Realistic coverage:** option (f) might block 1 of 23 residuals
(boljanic_2 IF the adjacency carve-out is tight). zelinja_gornja_2 is
in-AoR. **Cost-benefit is poor.**

### 5.3 New option (g) — Painted-init audit (data thread)

**Rationale:** 18 of 23 residuals are pre-existing scenario paint. No
amount of engine work fixes them.

**Mechanism (out of scope for this memo — flagged for /historian + scenario-creator):**
- For each of the 18 INITIAL OSIDs, consult ICTY/BB/museum-B/C/S for
  whether the OSID was Bosniak-held or Serb-held on day 1 of the scenario
  (April 6, 1992).
- Reconcile against painted-oct1995. If both paints disagree with history,
  fix BOTH. If only one disagrees, fix it.
- Žepa OSIDs (op:rogatica:zepa_2 etc.) explicitly: the engine has no
  Žepa-falls event modeled; either model one (parallel to Srebrenica
  rupture) or accept that the scenario doesn't run that far in calibration
  and re-target the calibration anchor.

**Realistic coverage:** 18 of 23 residuals fixed by data work alone.
**Highest leverage.**

### 5.4 New option (h) — t1 consolidation rule audit (scenario thread)

**Rationale:** 3 of 23 residuals (donje_zesce, podkozara_donja_2,
sopotnica) flipped to RBiH at t1 via `mechanism=consolidation`. This is
likely the enclave-rule pulling isolated RS OSIDs into surrounding RBiH
control at scenario start.

**Mechanism:** audit `src/sim/early_war/` consolidation step. If the rule
is "isolated enemy OSID surrounded by friendly OSIDs → flips to friendly
at t1", check the geometry of these three OSIDs. They may be classic
Goražde-pocket leakage: an RS-aligned OSID with all-or-most RBiH neighbors
flips RBiH due to the pocket rule.

**Realistic coverage:** 3 of 23.

### 5.5 Score table

| Option | LOC | Coverage / 23 | Side effects | Recommend? |
|---|---:|---:|---|---|
| (a) Wave 18 2-hop | 5 | 0 | High regression risk (n778 precedent) | **No** |
| (b) Corps AoR walk-in block | 30 | 0 | High regression risk (n778 precedent) | **No** |
| (c) Historical-bounds lookup (walk-in) | 50+data | 0 | Data maintenance, oracle leak | **No** |
| (d) Walk-in hop limit | 15 | 0 | Likely over-blocks Posavina | **No** |
| (e) OSID-pair painted reverse-check | 25+data | 0 | Oracle leak into sim code | **No** |
| (f) Out-of-AoR objective guard | 30 | 1 (at best) | Could block legit cross-corps ops | **Maybe — low priority** |
| **(g) Painted-init audit** | data work | **18** | None — calibration reference improvement | **Yes — primary** |
| **(h) t1 consolidation audit** | ~15 | 3 | None — scenario startup tightening | **Yes — secondary** |

---

## 6. Recommended Path

**Sequence:**

1. **First (this week): Option (g) — Painted-init audit.**
   Dispatch /historian + /scenario-creator-runner-tester to walk the 18
   INITIAL_ALREADY_RBiH OSIDs against ICTY/BB. Produce a delta against
   either `initial_political_controllers` (data/scenarios/...) or
   `painted_control_oct1995.json`, whichever is wrong per source. This
   alone removes 18/23 (78%) of the residual.

2. **Second: Option (h) — t1 consolidation audit.**
   Find the consolidation rule that flips donje_zesce / podkozara_donja_2
   / sopotnica RS→RBiH at t1. Either tighten the rule (raise the
   neighbor-friendliness threshold), or exclude these specific OSIDs from
   consolidation eligibility via a historical scenario flag. Removes
   3/23 (13%).

3. **Third: Option (f) — only if needed.**
   After (g)+(h) close 21/23, the remaining 2 are zelinja_gornja_2 and
   boljanic_2 — both captured by formal CorpsOperations. zelinja_gornja_2
   is in 2nd Corps's own territory and the capture is mechanically
   legitimate; the painted-oct1995 reference may simply be wrong there.
   boljanic_2 is a true cross-AoR operation by 3rd Corps; consider
   whether the Osvit-style cross-corps push is historically defensible
   (3rd Corps did push toward Tešanj/Doboj corridor) before adding a
   guard that blocks it.

**Sequence rationale:** start with the highest-leverage cheapest fix
(data audit), then move to engine fixes only if the residual is still
non-trivial. Avoids the n778 precedent of shipping a too-restrictive
engine guard.

**STOP-AND-ASK conditions for the historian/scenario audit:**
- If ICTY/BB cannot confirm the day-1 controller of an OSID (rural,
  unrecorded), document the uncertainty and defer.
- If fixing the initial paint would break other calibration anchors,
  flag for orchestrator decision.

---

## 7. Determinism / Faction-Symmetry Verification

All recommended options are deterministic and faction-symmetric:

- **Option (g)** is pure data change; faction-asymmetric **data**
  (ARBiH-held OSIDs are different from VRS-held) but faction-symmetric
  **mechanism** (the painting process treats all factions identically).
- **Option (h)** is a consolidation-rule tightening; the rule fires on
  geometry (neighbor controllers), not faction identity.
- **Option (f)** uses `sector.territory_osids` which is computed per turn
  by sorted-BFS for every corps. The predicate is faction-agnostic.

None of these introduce `Math.random()`, timestamps, `Date.now()`, or
non-strict iteration. All are Ring-1 safe (no Engine Invariants §6
touch).

---

## 8. What This Memo Does NOT Recommend

- **Do not** ship option (a). Tightening the Wave 18 1-hop proximity to
  2-hop addresses no observed residual and risks regression at Posavina,
  Lašva, and Kupres advances where the bot legitimately walks into
  abandoned RS territory at 2-hop distance from defenders.
- **Do not** ship option (b) standalone. The n778 corps operational area
  guard was tested and rolled back at −0.9pp. The lesson is documented
  in-file (`bot_brigade_eval_attack.ts` line 795). Re-shipping it without
  new evidence is a regression by design.
- **Do not** ship option (e). Embedding painted-reference data into the
  combat predicate path leaks calibration oracle into player-facing sim
  behavior; calibration data is the "answer key", not "game rules".

---

## 9. Open Questions for Orchestrator

1. **Is the painted-oct1995 reference itself ICTY-grade?** If the paint
   was created from a coarse-grained map and over-attributes Goražde
   rim to RS, the residual is a measurement artifact, not a sim error.
   Need /historian dispatch to validate the painted set against the
   actual Goražde safe-area boundaries at oct1995.

2. **Should Žepa fall in-engine?** Currently `initial` paints Žepa RBiH,
   and there's no Žepa-falls event. Painted-oct1995 (post-July-1995)
   correctly marks it RS. If we don't model the Žepa fall, the residual
   is structural and should be excluded from the calibration target.
   See parallel discussion in 20260523_ENGINE_3_SREBRENICA_EVENT_DESIGN.md.

3. **Cross-corps operations: feature or bug?** Operacija Osvit (3rd Corps
   reaching into 2nd Corps's Doboj front) is mechanically a cross-AoR
   operation. Historically 3rd Corps DID push toward Tešanj-Doboj.
   Is the operation correct and the residual a paint error, or is the
   operation a 3rd-Corps over-reach and the residual a real sim error?

---

## 10. References

- `src/sim/combat/bot_brigade_eval_attack.ts` lines 713–873 (Wave 18 walk-in guard)
- `src/sim/combat/corps_front_sectors.ts`, `sector_territory.ts`, `brigade_assignment.ts` (AoR derivation)
- `src/sim/combat/sector_offensive.ts` lines 424–434 (planning_invalidated cooldown lane LANE-2026-05-02-B1, names boljanic_2 + zelinja_gornja_2 explicitly)
- `data/derived/latest_run_final_save.json` (n1992 final save, t188)
- `data/source/calibration/painted_control_oct1995.json` (calibration reference)
- `data/source/calibration/painted_control_jan1993.json` / `apr1994.json` / `apr1995.json` (cross-reference paints)
- BB1/ICTY for Doboj corridor, Goražde safe area, Žepa fall (historian dispatch needed)

---

## Appendix A: Per-OSID raw forensic output

```
INITIAL_ALREADY_RBiH (painted disagrees with scenario start, not a capture): 18
CONSOLIDATION (t1 startup, isolated pocket): 3
COMBAT (true sim-time capture): 2

op:doboj:boljanic_2          COMBAT t117 arbih_373rd_slavna_mountain (3rd Corps → 2nd Corps AoR)
op:doboj:grapska_gornja_2    INITIAL_ALREADY_RBiH
op:doboj:makljenovac         INITIAL_ALREADY_RBiH
op:doboj:zelinja_gornja_2    COMBAT t156 arbih_221st_mountain (2nd Corps, in-AoR)
op:foca:donje_zesce          CONSOLIDATION t1
op:foca:mazlina              INITIAL_ALREADY_RBiH
op:foca:patkovina            INITIAL_ALREADY_RBiH
op:foca:ustikolina           INITIAL_ALREADY_RBiH
op:rogatica:brcigovo         INITIAL_ALREADY_RBiH
op:rogatica:rogatica_2       INITIAL_ALREADY_RBiH
op:rogatica:varosiste_2      INITIAL_ALREADY_RBiH
op:rogatica:zepa_2           INITIAL_ALREADY_RBiH (Žepa enclave, painted RBiH at t0)
op:trnovo:delijas            INITIAL_ALREADY_RBiH
op:trnovo:kijevo_2           INITIAL_ALREADY_RBiH
op:trnovo:trnovo             INITIAL_ALREADY_RBiH
op:gorazde:faocici_2         INITIAL_ALREADY_RBiH
op:gorazde:hrancici          INITIAL_ALREADY_RBiH
op:gorazde:kolovarice        INITIAL_ALREADY_RBiH
op:gorazde:podkozara_donja_2 CONSOLIDATION t1
op:gorazde:slatina_2         INITIAL_ALREADY_RBiH
op:gorazde:sopotnica         CONSOLIDATION t1; t18 event
op:gorazde:ustipraca_2       INITIAL_ALREADY_RBiH
op:gorazde:zorovici          INITIAL_ALREADY_RBiH
```

## Appendix B: Cross-corps operation evidence

```
OP: arbih_3rd_corps:Operacija Osvit:t115
  axis: cmd_arbih_3rd_corps_main
  brigades: arbih_327th_vitezka_mountain, arbih_372nd_vitezka_mountain,
            arbih_373rd_slavna_mountain, arbih_374th_slavna_light,
            arbih_375th_liberation, arbih_377th_vitezka_mountain,
            hrhb_110th_usora_brigade
  objectives_targeted: op:doboj:boljanic_2, op:teslic:vitkovci
  objectives_captured: op:doboj:boljanic_2, op:teslic:vitkovci
  outcome: success
  AoR check: 3rd Corps territory does NOT include op:doboj:*; op:doboj:boljanic_2
             lives in sector:arbih_2nd_corps:2 territory.

OP: arbih_2nd_corps:Operacija Sjena:t151
  brigades: arbih_221st_mountain, arbih_222nd_liberation, arbih_224th_mountain
  objectives_targeted: op:doboj:zelinja_gornja_2, op:gradacac:pelagicevo
  objectives_captured: op:doboj:zelinja_gornja_2
  outcome: partial
  AoR check: 2nd Corps territory DOES include op:doboj:zelinja_gornja_2 (in-AoR).
```

---

*End of memo.*
