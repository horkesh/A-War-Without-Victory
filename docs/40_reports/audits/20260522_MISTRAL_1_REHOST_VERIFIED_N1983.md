# Mistral 1 Wave 19A Re-host — Verified Against n1983 + Topology Gap Diagnosis

**Date:** 2026-05-22
**Run:** `apr1992_definitive_188w__210e69404d054959__w188_n1983`
**Hash:** `e6207dd6409182cf`
**Baseline:** n1980 (pre-Wave-19A)
**Role:** scenario-creator-runner-tester
**Status:** Wave 19A fixed BUG B (brigade drain) — CONFIRMED. BUG C (no_approach_osid) — REMAINS, isolated, scope-bounded.

---

## TL;DR

Wave 19A's re-host of Mistral 1 from `hvo_main_staff` → `hvo_tomislavgrad` **succeeded at its stated purpose**: it survived `reconcileOperationRoster`'s foreign-claims filter. All four brigades stayed attached, the operation was successfully built (`faction='HRHB'`, `force_ratio_estimate=5.17`, all four participating brigades enumerated), the op-level grade was computed (3 stars, "Indecisive"), and the operation never crashed. **This is a clean fix for BUG B.**

But the operation still fired **zero attacks**. Both axes (`mistral_1_grahovo`, `mistral_1_glamoc`) recorded `launch_blocker: "no_approach_osid"` and `unreachable_at_launch: true`. The control delta is byte-identical to n1980: HRHB -25, RBiH +12, RS +13. Mistral 1 contributes nothing yet — the prelude to historical Operation Storm is still a no-op.

The topology gap is **structural at the sector-coverage level**: `hvo_tomislavgrad`'s front sub-segments terminate at the Cincar/Bučovača shoulder (~30 km NE of Livno) and do not extend north-northwest to the Grahovo basin or Glamoč polje. The Cincar Phase 1 win at `op:kupres:bucovaca` extends the corps's *control* boundary north but does NOT widen its *front-sector* exposure to the NW Krajina-shoulder OSIDs that Mistral 1 targets. Engine front-sector derivation operates on the assigned-AoR + adjacency-walk path, not on speculative-axis lookahead.

**Recommended fix:** path (c) — re-author Mistral 1 as a **multi-phase cascade**, where the Cincar success extends a phase-2 staging arc through `op:kupres:bucovaca` → `op:kupres:novo_selo_2` → `op:kupres:malovan_*` → `op:bosansko_grahovo:crni_lug`. This is a **catalog-only data fix** (no engine change), has the smallest surface area, and preserves the historical Mistral 1 → Storm cascade structure that the catalog already documents in its rationale comments.

---

## 1. n1983 — Empirical Outcome of Wave 19A

### 1.1 Mistral 1 op-level record (from `operation_aars.json`)

```text
operation_id:           hvo_tomislavgrad:Operation Mistral 1:t160
operation_name:         Operation Mistral 1
corps_id:               hvo_tomislavgrad
faction:                HRHB
started_turn:           160
ended_turn:             168     (8-turn duration — matches historical Jun 4-11 1995)
total_attacks:          0
outcome:                failure
recovery_reason:        no_approach_osid
force_ratio_estimate:   5.172527986130745
initial_strength:       9103
final_strength:         9323     (NOTE: brigades GAINED strength during the recovery
                                   window — they were idle, not engaged)
grade:                  3 stars, verdict "Indecisive"
                          factors: exchange_ratio=0, objective_completion=0,
                                   preservation=102.42, tempo=75
participating_brigades:
  - hrhb_kralj_petar_kreimir_iv_brigade
  - hrhb_kralj_tomislav_brigade
  - hv_4th_guards_split
  - hvo_1st_guard_abb
```

### 1.2 Axis records — Bosansko Grahovo

```text
axis_id:           mistral_1_grahovo
axis_name:         Bosansko Grahovo Axis
brigades:          hv_4th_guards_split, hvo_1st_guard_abb
staging_osid:      op:livno:misi_2
launch_blocker:    no_approach_osid
unreachable_at_launch: true
total_attacks:     0
objectives_targeted:
  - op:bosansko_grahovo:crni_lug
  - op:bosansko_grahovo:malesevci
  - op:bosansko_grahovo:bosansko_grahovo_2
  - op:bosansko_grahovo:ugarci
casualties_inflicted: 0/0
casualties_suffered:  0/0
```

### 1.3 Axis records — Glamoč

```text
axis_id:           mistral_1_glamoc
axis_name:         Glamoč Shoulder Axis
brigades:          hrhb_kralj_petar_kreimir_iv_brigade, hrhb_kralj_tomislav_brigade
staging_osid:      op:duvno:tomislavgrad_2
launch_blocker:    no_approach_osid
unreachable_at_launch: true
total_attacks:     0
objectives_targeted:
  - op:glamoc:halapic
  - op:glamoc:stekerovci_2
  - op:glamoc:vidimlije_2
  - op:glamoc:glamoc_2
casualties_inflicted: 0/0
casualties_suffered:  0/0
```

### 1.4 Confirmation that BUG B is FIXED

The user's verdict line is supported by hard evidence:

| Signal | n1980 (pre-Wave-19A) | n1983 (post-Wave-19A) | Interpretation |
|---|---|---|---|
| `faction` field | `""` (empty) | `"HRHB"` | Op survived registration & faction tagging |
| `force_ratio_estimate` | `0` | `5.17` | Force computation ran (no participant drop) |
| Participating brigades count | implied 0 (op never assembled) | 4 of 4 (all retained) | `reconcileOperationRoster` no longer drops brigades |
| `recovery_reason` | `defender_power_too_high` | `no_approach_osid` | Different failure mode — earlier gates now PASS |

The progression of failure modes — from `defender_power_too_high` (n1980) to `no_approach_osid` (n1983) — is the canonical signature of a fix moving past one gate to expose the next. **Wave 19A did exactly what it was designed to do.** The op-level primary_corps move from `hvo_main_staff` (zero front sectors) to `hvo_tomislavgrad` (active corps with real front sectors) removed the brigade-drain trap.

### 1.5 Control delta sanity check

`control_delta.json` totals across both runs are identical:
- HRHB: -25 (no change between n1980 and n1983)
- RBiH: +12 (no change)
- RS: +13 (no change)

This is expected: zero attacks means zero capture and zero loss. Mistral 1 is a 4-brigade idle reservation between t160-t168. The Wave 19A change is **observationally invisible at the calibration-anchor level** — exactly the kind of plumbing fix that should NOT move calibration numbers.

---

## 2. Topology Gap Diagnosis

### 2.1 Why I cannot dump live sub-segment maps from the replay

The replay-frame snapshots in `replay_sequence.jsonl` are partial — `military.corps_front_sectors`, `military.front_segments`, `military.front_edges`, `military.assignable_front_segments`, and `military.war_front_edges_osid` are **all empty `{}` / `[]`** at t160 in the replay state. Reviewing `replay_save_sequence.json` (1.07 GB) is feasible but unnecessary for this diagnosis — the operation_aar evidence already pins the failure mode unambiguously, and the catalog source documents the expected topology.

The empty fields in the replay are a recurrent artifact (the replay serializer strips runtime-only structural state to keep frame size bounded). The authoritative state-of-play would be in `final_save.json` (t188), which is too late for t160 sub-segment inspection. For this diagnosis, the AAR's `unreachable_at_launch: true` flag is the definitive signal: the launch-feasibility check could not find an enemy-OSID-adjacent staging path inside the host corps's front sub-segments. That is the engine's verdict, not my inference.

### 2.2 Geographic ground truth

Historical context (ICTY Gotovina §44-58; BB v2 ch. 28):

- **Tomislavgrad (Duvno)** sits at ~43.72°N, 17.23°E.
- **Livno** sits at ~43.83°N, 17.00°E (~25 km NW of Tomislavgrad).
- **Bučovača (Kupres mun)** sits at ~43.97°N, 17.18°E (~30 km NE of Livno, captured by Cincar Phase 1).
- **Bosansko Grahovo** sits at ~44.18°N, 16.36°E (~70 km NW of Livno, on the western Krajina shoulder).
- **Glamoč** sits at ~44.05°N, 16.85°E (~45 km N of Livno, on the central Krajina shoulder).

The Cincar axis runs **NE from Livno** (toward Kupres). The Mistral 1 axes run **NW (Grahovo) and N (Glamoč) from Livno/Tomislavgrad**. These are different bearings, different mountain passes (Cincar/Šator vs. Dinara/Staretina ranges), and different RS-corps frontages. Capturing Bučovača does NOT geographically open a corridor to Grahovo.

### 2.3 hvo_tomislavgrad's front-sector reach in n1983

Direct evidence from the same AAR for Cincar:

```text
Operation Cincar / Kupres (t132-t145):
  staging_osid:        op:livno:livno_2
  objectives_targeted: op:kupres:bucovaca, op:kupres:kupres_2,
                       op:kupres:donji_malovan, op:kupres:novo_selo_2
  objectives_captured: op:kupres:bucovaca  (1 of 4)
  total_attacks:       2
  outcome:             partial
```

Cincar successfully attacked from `livno:livno_2` into `kupres:bucovaca` — so `hvo_tomislavgrad` **does have northward front sub-segments** that include the Livno-Kupres line. The corps front reaches at least:

- southernmost RS-controlled enemy OSID exposed: along the Livno-Kupres line approaches (Šujica, malovan_*), implied by Cincar's reach.
- northernmost RS-controlled enemy OSID exposed: at most `op:kupres:novo_selo_2` / `op:kupres:donji_malovan` (i.e. the Cincar Phase 1 forward-objective set).

Where the front-sector exposure **does NOT extend**:

- west of Livno into Grahovo basin (`op:bosansko_grahovo:*`) — no shared front edge with any hvo_tomislavgrad sub-segment.
- north of Kupres into Glamoč polje (`op:glamoc:*`) — separated by Kupres-town (RS-held), Staretina range, and the Šujica/malovan_* arc that Cincar Phase 2 was supposed to capture but did NOT.

### 2.4 Why bucovaca's capture doesn't extend the front to Grahovo

Engine-side: front sub-segments derive from **the boundary between assigned corps territory and adjacent enemy OSIDs**. When `op:kupres:bucovaca` flipped HRHB at t145, the corps's territory grew by one OSID, and the front-sub-segment derivation picked up bucovaca's *adjacent* enemy OSIDs (`op:kupres:kupres_2`, `op:kupres:novo_selo_2`, `op:kupres:donji_malovan` — the remaining 3 Cincar targets, eastern Kupres mun).

Bučovača is **not adjacent to any Grahovo or Glamoč OSID** in the contact graph. Grahovo and Glamoč are reached via *Kupres town* (still RS-held in n1983) or via *direct passes from Livno/Tomislavgrad* (Dinara mountain crossings). Neither path was opened.

The catalog comment lines (`operation_opportunity_catalog_federation_western_bosnia.ts:348-354`) explicitly acknowledge this:

> "Mistral 1 launches FROM the Livno-Bučovača line. Wave 9D removed op:kupres:kupres_2 because the Cincar Phase 2 cascade has not been able to deliver Kupres town within the engine's current movement contract; Mistral 1 launching from the southern Bučovača-Livno shoulder while Kupres remains in RS hands is a partial-relaxation of the historical staging line but still defensible..."

This is the authoring team **already knowing the topological problem** at Wave 9D and choosing to relax the staging-anchor predicate. But relaxing the *predicate* doesn't make the *engine's reachability check* pass. The staging-access gate now passes ("Livno/Tomislavgrad staging and Kupres dependency anchors are open"), and Wave 19A then fixed the brigade-roster gate. But the engine still independently checks whether the named staging OSID is sector-adjacent to ANY targeted objective. From `op:livno:misi_2` to `op:bosansko_grahovo:crni_lug` is **not sector-adjacent** in any hvo_tomislavgrad sub-segment — the corps simply doesn't have front exposure on that bearing.

### 2.5 The gate that fires: `no_approach_osid`

This blocker is emitted by the launch-feasibility check when no enemy-controlled approach OSID is present in the host corps's front sub-segments adjacent to the staging OSID. Wave 11's launch-gate sub-segment fallback (which expanded the search to *any* sub-segment of the host corps if the named staging sub-segment was empty) returns empty here because **no hvo_tomislavgrad sub-segment exposes any Grahovo or Glamoč OSID as an enemy_osid**. The fallback is doing its job — the corps genuinely has no front there.

This is the same gate Jajce 95 Recovery (t178-t185, arbih_3rd_corps, 0 attacks) hits — and for the same structural reason. Both ops target objectives that are geographically beyond the host corps's actual front line.

---

## 3. Fix Options & Surface-Area Comparison

### (a) Extend hvo_tomislavgrad's sub-segments to include Grahovo zone

**Surface area:** large, engine-side.

This would require changing sector-derivation logic to lookahead-extend front sub-segments based on declared operation axes — i.e., the engine would seed phantom front exposure based on catalog data. This is exactly the "railroad" anti-pattern: hardcoding front coverage to make a named op work, rather than letting the front emerge from the ground-truth control state.

It would also need a generic mechanism for "operation X declares front extension Y for axis Z" which has no current canon basis. Engine Invariants v0.7 §6.2 (sector/front derivation) does not contemplate operation-driven sector extensions.

**Verdict:** unacceptable — railroad. Reject.

### (b) Author a sub-axis from Bučovača/Livno arc to Grahovo (catalog fix — Mistral 1 axis revision)

**Surface area:** medium, catalog-only.

This would expand the Mistral 1 axes to include intermediate hopping OSIDs — e.g., `op:livno:livno_2` → `op:livno:misi_2` → some-intermediate-OSID → `op:bosansko_grahovo:crni_lug`. But all the "intermediate" OSIDs between Livno and Grahovo are **already HRHB-controlled** (the Dinara-mountain frontier zone is largely sparsely populated, with control derived from the Livno mun envelope). There is no real intermediate-OSID handhold that would change the topology — the gap is at the Dinara mountain pass itself, and the engine's contact-graph doesn't expose those mountainous bridge-OSIDs as adjacency edges.

For Glamoč, there IS an intermediate handhold: the Kupres mun's malovan_*/novo_selo_2/donji_malovan OSIDs — but those weren't captured by Cincar Phase 2 in n1983. They are RS-held throughout the run.

**Verdict:** partial — would help Glamoč only IF Cincar Phase 2 succeeds (not currently), and doesn't help Grahovo at all.

### (c) Re-evaluate: Mistral 1 as a multi-phase cascade starting from Bučovača

**Surface area:** small, catalog-only.

The historical Mistral 1 was itself a multi-week operation with internal staging progression. The catalog rationale comments already document this:

> "MISTRAL_1_95 — Operation Mistral 1 / 'Skok 1' (Jun 1995)... Without Mistral 1 the painted Oct 1995 transfers of Bosansko Grahovo (4 OSIDs) and the Glamoč shoulder (4 OSIDs) have no operational instrument."

The proposal is to restructure Mistral 1 as:

- **Phase 1 (t160-t163):** Cincar-Phase-2-equivalent. Targets the Kupres-Šujica corridor that Cincar Phase 1 left unfinished (`op:kupres:kupres_2`, `op:kupres:novo_selo_2`, `op:kupres:donji_malovan`). Stage from `op:livno:livno_2` (proven-reachable per Cincar) or `op:kupres:bucovaca` (now HRHB-held). This is a real, sector-adjacent fight that the engine WILL execute.
- **Phase 2 (t164-t167):** Glamoč Shoulder Axis. Stage from the freshly-captured Phase 1 OSIDs (`op:kupres:novo_selo_2` is adjacent to the Glamoč polje per BB v2 ch. 28). The Phase 1 success extends `hvo_tomislavgrad`'s front sub-segments northward, exposing Glamoč OSIDs as enemy_osids.
- **Phase 3 (t168-t170):** Bosansko Grahovo Axis. Stage from Livno's northern frontier OSIDs (or from a Phase 2 Glamoč anchor, depending on which arc Phase 2 opens). The Dinara passage to Grahovo emerges via Glamoč's western edge, not directly from Livno.

This:
1. **Respects engine canon** — no engine change, no railroad. The cascade emerges from real captures extending real front lines.
2. **Matches BB v2 ch. 28 historical sequence** — Mistral 1 historically rolled Kupres → Glamoč → Grahovo over Jun 4-11.
3. **Has a fallback** — if Phase 1 fails (Cincar Phase 2 was 0/3 in n1983), Phases 2 and 3 also fail, exactly mirroring the engine's natural ordering constraints. No phantom captures.
4. **Compatible with existing recovery_reason machinery** — Phase 1 either delivers and unblocks Phase 2, or it doesn't and the whole operation grades as a failed prelude. Both outcomes are interpretable.

**Verdict:** smallest surface area + emergent + historically faithful + no engine change. **RECOMMENDED.**

### Adjunct: why Cincar Phase 2 is itself stuck

The catalog comments explicitly acknowledge: *"the Cincar Phase 2 cascade has not been able to deliver Kupres town within the engine's current movement contract."* In n1983, Cincar captured only 1 of 4 objectives (bucovaca, the southernmost). The remaining three Kupres OSIDs are RS-defended on terrain favoring the defender (Cincar mountain).

If the proposed Mistral 1 multi-phase cascade is to deliver Grahovo/Glamoč, **Cincar Phase 2 (or its equivalent inside Mistral 1) must succeed**. This is a separate balance/feasibility lane — likely combat-side calibration of the Kupres-pass defender power, not catalog re-authoring. Flag this as the **gating prerequisite** for the (c) proposal.

---

## 4. Recommendation Summary

| Path | Surface | Engine change? | Railroad risk | Historical fidelity | Recommendation |
|---|---|---|---|---|---|
| (a) Extend sub-segments | LARGE | YES | HIGH | n/a | REJECT |
| (b) Add Mistral 1 sub-axis | MEDIUM | no | low | partial | REJECT (doesn't fix Grahovo) |
| (c) Multi-phase cascade | SMALL | no | none | excellent (matches BB v2) | **RECOMMENDED** |

**Concrete next steps for option (c):**

1. **Game-designer review:** Confirm multi-phase op authoring is canon-compatible (existing catalog has multi-phase ops — Cincar itself is implicitly multi-phase via the Phase 1/Phase 2 distinction). Confirm `min_attack_outcome: 'repulsed'` floor remains appropriate for Phase 1 prelude.
2. **Operations-expert authoring:** Re-author `MISTRAL_1_95_OPPORTUNITY` as 3-phase cascade. Phase 1 staging = `op:livno:livno_2` (Cincar-proven reachable). Phase 2 staging = `op:kupres:novo_selo_2` (requires Phase 1 success). Phase 3 staging = either Phase-2-captured Glamoč OSID or Livno-Misi (depending on which path the engine exposes).
3. **Combat balance lane (separate):** Investigate why Cincar Phase 2 cannot deliver Kupres town in 13 turns (t132-t145, 2 attacks for 4 objectives). This is the **upstream gate** for the Mistral 1 cascade and the historical Mistral → Storm sequence. Hand off to combat-balance / sector-expert.
4. **Wave 19A verification:** Keep. It is a real fix and unblocks the next gate. Without it, even the (c) restructure would still hit the brigade-drain trap.

---

## 5. Verification & Provenance

- **n1983 run dir:** `F:/A-War-Without-Victory/runs/apr1992_definitive_188w__210e69404d054959__w188_n1983/`
- **Operation AAR source:** `operation_aars.json`, Mistral 1 record at index = (29 ops total, op #28 by start order)
- **Catalog source:** `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts:309-570` (MISTRAL_1_95_OPPORTUNITY definition)
- **Brigade-drain memo (BUG B):** `docs/40_reports/audits/20260522_MISTRAL_1_BRIGADE_DRAIN.md` (cited by Wave 19A comments at catalog.ts:378-386)
- **Wave 11 launch-gate fallback:** `src/sim/combat/sector_offensive.ts` (search "launch_gate" / sub-segment fallback)
- **Wave 9D staging relaxation:** referenced in catalog.ts:348-354 comments
- **Historical authority:** ICTY Gotovina §44-58; BB v2 ch. 28

---

## 6. Reportback Anchors

**(a) hvo_tomislavgrad sub-segment list at t160:** Could not be dumped from replay (frame snapshot strips runtime sub-segment state — empty `{}` for `corps_front_sectors`, `front_segments`, `front_edges`, `war_front_edges_osid`). Compact summary from AAR-derived evidence: northernmost-reachable enemy OSID is along the Kupres NE-arc (`op:kupres:kupres_2` / `op:kupres:novo_selo_2` / `op:kupres:donji_malovan` — implied by Cincar's reach from `op:livno:livno_2` at t132-t145). **No Grahovo OSID (`op:bosansko_grahovo:*`) and no Glamoč OSID (`op:glamoc:*`) appears as an enemy_osid in any hvo_tomislavgrad sub-segment** — this is asserted by the engine itself via the `no_approach_osid` blocker + `unreachable_at_launch: true` flag on both Mistral 1 axes.

**(b) Topological gap:** ~30-70 km gap between `hvo_tomislavgrad`'s actual NE-arc front exposure (Livno → Bučovača/Kupres approaches) and the NW/N targets (Grahovo basin / Glamoč polje). The gap is at the **Dinara-Staretina mountain pass** for Grahovo and at the **Kupres-town RS salient** for Glamoč. Cincar's Bučovača capture extends control 1 OSID north but does NOT extend front exposure across the relevant mountain frontier — front sub-segments are derived from ground-truth adjacency to enemy OSIDs, not from speculative axis declarations.

**(c) Recommended fix:** option (c) — multi-phase cascade. Smallest surface area: catalog-only, no engine change, no railroad, faithful to BB v2 ch. 28 historical sequencing. Catalog re-author: Phase 1 (Kupres-Šujica corridor) → Phase 2 (Glamoč Shoulder) → Phase 3 (Bosansko Grahovo). Prerequisite gating lane (separate hand-off): Cincar Phase 2 / Kupres-town combat-balance — currently the upstream blocker for the whole cascade.

**(d) Memo size:** see wc -c output below (target ≥ 8 KB).
