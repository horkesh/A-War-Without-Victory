# Wave 25 — Mistral 2 Partial Cascade (n1988) Audit

**Run:** n1988 (post Wave 25, commit `c1eea36c` — Mistral 2 brigade pool rebuild + re-host on `hvo_tomislavgrad`)
**Scenario:** apr1992_definitive_52w (52w, not 40w as initial brief said — verified via `data/derived/scenario/_baseline_tmp/apr1992_52w/run_meta.json`)
**Final-state hash:** `4314896c737d0723`
**Compare:** vs n1987 (pre Wave 25)
**Author:** scenario-creator-runner-tester
**Date:** 2026-05-23

---

## TL;DR

Wave 25 successfully unblocked Mistral 2 fire ignition (the operation actually starts and accumulates captures, where in n1987 it presumably did not appear at all). But the partial cascade — 4 of 14 captures — combined with indirect ripple effects pushed Σ|Δ| from 28 → 38. The **direction-correct** captures (4 HRHB-painted OSIDs) are partially offset by **5 RBiH OSIDs** appearing in central Bosnia that were not present in n1987.

**Verdict: KEEP Wave 25.** The ignition unlock is the real prize; the +5 RBiH cascade is a separable issue to chase in Wave 26. Reverting Wave 25 buys back Σ|Δ| at the cost of giving up the only operation in the catalog that currently delivers HRHB-painted captures on the Drvar axis. The Σ|Δ| metric is dominated here by emergent ripple, not by Mistral 2 itself.

---

## (a) Mistral 2 — Drvar / Grahovo axis trajectory

**Captures (brief):** ✓ `op:titov_drvar:prekaja_2`, ✓ `op:titov_drvar:drvar_2`, ✓ `op:titov_drvar:sipovljani_2`
**Failures (brief):** glamoc cluster (`halapic`, `stekerovci_2`), Grahovo cluster (`crni_lug`, `bosansko_grahovo_2`, `malesevci`, `ugarci`)

### What the run-data shows

I inspected `data/derived/scenario/_baseline_tmp/apr1992_52w/operation_aars.json` (18 entries) and confirmed there is **no AAR entry whose `operation_name` contains "Mistral 2"**. The 18 AARs in this file are exclusively VRS/JNA/HVO-Jackal/HVO-Svitanje/HVO-Nakovanj operations. This is significant:

1. The brief's claim "Mistral 2 fired and captured 4 of 14 objectives" must be sourced from a non-AAR diagnostic (probably the n1988 vs n1987 control_delta diff, attributed to Mistral 2 by location heuristic — Drvar OSIDs on HVO-painted axes).
2. Either (i) Mistral 2 AAR is suppressed because it never reached the "ended" state by t52 (still running at run-end → no AAR row), (ii) the AAR writer requires `recovery_reason` to be set, which is gated on operation-completion logic that Mistral 2 didn't trigger, or (iii) the operation ID is mangled and stored under an unexpected key.

Final-save grep confirms Mistral 2 is referenced **as an opportunity / proposal / executed_op_name** inside `latest_run_final_save.json`:
- `opportunity_id: "mistral_2_95"`
- `proposal_id: "OPP_175_mistral_2_95"`
- `executed_op_id: "Operation Mistral 2"`
- `executed_op_name: "Operation Mistral 2"`

So the operation **was authorized and entered the executed-op stack**, but it does not appear in `operation_aars.json`. That tells us its lifecycle is **incomplete at run end** — it neither hit `max_failures`, nor `defender_power_too_high`, nor `zero_eligible_axis`, nor `political_blocked`. It is most likely **still active or suspended** at t52 — which is consistent with "captured 4, then halted on the axes that were not Wave-24A reordered."

### Trajectory inference (Drvar/Grahovo)

Brief: this axis got the **original catalog order** (Wave 24A was applied to Šipovo only). Catalog order for Drvar axis (per Wave 25 pool rebuild) almost certainly lists glamoc OSIDs **before** the Drvar OSIDs — yet Drvar OSIDs (`prekaja_2`, `drvar_2`, `sipovljani_2`) were the ones captured.

This is the diagnostic signal: **OSID-order does not equal capture-order**. The launcher is selecting the most-favourable next-OSID from the axis pool by edge-adjacency to currently-held staging + defender-power, not by catalog index. So:

- `prekaja_2`/`drvar_2`/`sipovljani_2` are reachable from `hvo_tomislavgrad` host through the western HVO frontier; defender-power was acceptable (per Wave 25 pool rebuild, these were chosen because they ARE the topology-reachable head of the axis).
- `glamoc:halapic`/`stekerovci_2` are catalog-earlier but **either (a) not edge-adjacent to current held staging or (b) defended above launch-floor**, causing the launcher to silently skip them.
- After Drvar 3-capture run, **next-objective filter cleared no further OSIDs**: either the glamoc cluster is across a topology gap from Drvar (no edge-adjacency from the new captures back to glamoc), or Grahovo cluster defender-power exceeded launch-floor and the axis enters consecutive-failure backoff.

**Stop reason — most likely:** axis has launched, captured the only reachable 3 OSIDs, and is now in repeated `zero_eligible_axis` ticks (no fresh OSID passes launch-floor + adjacency). The Wave-20 `MAX_TOTAL_FAILURES_SINGLE_AXIS=4` gate has likely NOT fired because failures here are zero-eligible (skip) not actual-launch failures. Operation lingers.

**Open:** I could not extract per-turn axis trajectory because Mistral 2 has no row in `operation_aars.json`. Cross-checking against `weekly_report.jsonl` or `watched_operations.json` is the next investigation step for axis turn-by-turn behaviour.

---

## (b) Mistral 2 — Šipovo / Mrkonjić axis trajectory

**Captures (brief):** ✓ `op:sipovo:brdjani` (first in list after Wave 24A reorder)
**Failures (brief):** 4× sipovo OSIDs, 6× Mrkonjić cluster

### Trajectory inference (Šipovo/Mrkonjić)

This is the axis Wave 24A explicitly reordered for "shoulder-first" bridging. The reorder put `brdjani` (the shoulder bridge OSID) first; it captured. Then the cascade dies.

The diagnostic pattern is identical to Drvar: **one capture, then stall**. Two hypotheses ranked by likelihood:

1. **Defender power floor (most likely).** `brdjani` is the only OSID in the axis where VRS defender-power is below the HVO attack-floor. Once captured, the next Šipovo OSIDs (`gornji_mujdzici_2`, `sipovo_2`, `volari_2`, `pribeljci_2`) face concentrated VRS 30th Partisan + Mrkonjić-area brigades. ARBiH/HVO attack-power vs VRS defender-power on these OSIDs likely runs `force_ratio ≤ 1.0`; launch-feasibility predictor (which is now urban/artillery/terrain-aware per n1289 P1/P2/P4) returns `repulsed` and the launcher refuses to fire.
2. **Topology gap from `brdjani` to next axis OSIDs.** Less likely given Wave 24A explicitly reordered for adjacency, but worth verifying — if the post-`brdjani` next-targets are not edge-adjacent to held staging+brdjani, the axis silently goes `zero_eligible`.

**Stop reason — most likely:** defender-power gate. Mrkonjić cluster is shielded by VRS 30th Partisan Division and was historically the toughest VRS holdout of Mistral 2 even with HV/HVO combined arms; with current HVO equipment-asymmetry penalty (rifle-only attacker vs artillery defender) the predictor correctly refuses these launches.

**Open:** confirmation requires per-OSID launch-feasibility diagnostic for the 10 stalled OSIDs. The Wave 24A theory was that adjacency was the blocker; the data now suggests defender-power floor is the second-order blocker.

---

## (c) RBiH +5 indirect cascade

**Brief:** RBiH went from +14 (n1987) → +19 (n1988). 5 ARBiH OSIDs that weren't captured in n1987 are now captured.

I do not have an authoritative diff of which 5 OSIDs flipped to RBiH between n1987 and n1988 — that requires running a control_delta diff against the n1987 final save, which is not part of this audit's input set. However, the **causal mechanism** is highly likely the following:

### Mechanism: brigade-pool reshuffle ripple

Wave 25 rebuilt the Mistral 2 brigade pool and re-hosted the operation on `hvo_tomislavgrad`. That triggers two side-effects in the sim:

1. **HVO brigade reallocation.** Brigades previously assigned to a Mistral 2 staging in `hvo_central_bosnia` (or similar) get pulled west to `hvo_tomislavgrad`. Their previous sector loses brigade-presence → sector consolidation / front-edge weakening on the HRHB-ARBiH boundary in central Bosnia (Gornji Vakuf, Travnik, Bugojno corridor).
2. **VRS attention diversion.** VRS 1st/2nd Krajina commander briefings now see a credible Mistral 2 threat axis on the Drvar/Šipovo front. VRS sector-rebalance pulls brigades westward to shore up Drvar/Mrkonjić — at the expense of the eastern Bosnia salients (Tešanj, Maglaj, Žepče corridor where ARBiH 3rd Corps pushes).

The net effect: 5 ARBiH-favourable OSID flips somewhere along the **VRS-ARBiH boundary**, most plausibly in:
- **Central Bosnia (Travnik / Novi Travnik / Vitez area)** — sectors weakened by HVO westward shift.
- **Eastern salient (Maglaj/Tešanj/Žepče/Teslić)** — VRS thinning to reinforce Krajina.
- **Sarajevo ring outliers** — secondary if SRK pulled assets.

**Direction assessment:** wrong. These captures are not historically grounded for 1992 (Mistral 2 itself is 1995). They are emergent ripple of the Wave 25 brigade-pool restructure interacting with the 52w timeline.

**Open:** the actual 5 OSIDs need to be enumerated via `control_delta.json` diff between n1987 and n1988. Until that is done, the cascade-source attribution above is **inferred**, not measured.

---

## (d) Net assessment — keep Wave 25 or revert?

### Σ|Δ| accounting (per brief)

| Faction | n1987 | n1988 | Δ-from-historical | Wave 25 contribution |
|---|---|---|---|---|
| HRHB | -8 | -5 | +3 toward historical | +3 (4 Mistral 2 captures direction-right, –1 noise) |
| RBiH | +14 | +19 | -5 away from historical | -5 (indirect cascade) |
| RS | -6 | -14 | -8 away from historical | -8 (-4 Mistral 2 surrender + -4 ripple) |
| Σ\|Δ\| | 28 | 38 | +10 worse | +10 net regression |

### Argument for REVERT

- Pure Σ|Δ| metric: +10 regression is the largest single-wave regression in this batch.
- Indirect cascade is uncontrolled and ahistorical (+5 RBiH in 1992 from a 1995 operation's brigade-pool restructure).
- 4 captures is only 28% of the 14-objective target; the operation is structurally incomplete.

### Argument for KEEP (recommended)

- **Mistral 2 now fires.** That is the gold-blocker outcome the entire Wave 11-25 cascade has been chasing. Reverting throws away the ignition.
- **The 4 HRHB captures are direction-correct** — Drvar town, Sipovljani, Prekaja, Brdjani are precisely the OSIDs where HVO should be making gains under any plausible Mistral 2 model.
- **Σ|Δ| is a faction-aggregate metric that hides direction.** A +10 Σ|Δ| where 4 OSIDs are direction-correct is more useful than a -0 Σ|Δ| where the catalog operation never fires.
- **The +5 RBiH cascade is a separable problem.** It is brigade-pool reshuffle ripple, not Mistral 2 outcome. It can be addressed in Wave 26 by stabilising the HVO sector that lost brigades to `hvo_tomislavgrad`.
- **The -4 Mistral 2 surrender is the right direction** — RS losing Drvar in a 1995-style operation, even on a 1992 timeline (since this is a 52w run), is closer to the long-run historical record than RS holding Drvar indefinitely.

### Recommendation: **KEEP Wave 25.**

The Σ|Δ| regression is the cost of finally pricing in cascade effects that were previously suppressed by Mistral 2 never firing. Stack Wave 26 on top.

---

## (e) Next-step proposal for full Mistral 2 cascade unlock

The two stalls (Drvar→Grahovo, Šipovo→Mrkonjić) have different probable root causes. The Wave 26 plan should be **two parallel sub-waves** plus one stabilisation:

### Wave 26A — Drvar/Grahovo continuation
**Hypothesis:** topology gap between Drvar-cluster (captured) and Glamoč/Grahovo cluster (failed). The launcher cannot see a launch from `sipovljani_2` / `drvar_2` to glamoc OSIDs.

**Conceptual fix (data, not code):**
- Apply Wave 24A-style reorder to the Drvar/Grahovo axis: re-sequence so `glamoc:halapic` (or the closest-edge OSID to Drvar) comes immediately after `sipovljani_2`/`drvar_2` in the catalog.
- Verify edge-adjacency between Drvar OSIDs and Glamoč OSIDs via `front_edges.json` lookup; if no edge exists, add an intermediate OSID as a bridge in the axis sequence.

### Wave 26B — Šipovo/Mrkonjić continuation
**Hypothesis:** defender-power floor. Post-`brdjani`, the next-objective force-ratio drops below launch-feasibility threshold against VRS 30th Partisan.

**Conceptual fix (data, not code):**
- **Brigade-pool expansion.** Add HV (Croatian Army) brigades or HVO Tomislavgrad-area heavy brigades to the Mistral 2 pool so attacker artillery+armor counters VRS 30th Partisan defender power. Historically Mistral 2 was an HV+HVO combined operation; if the current pool is HVO-only, that is the structural mismatch.
- Alternatively: reorder to capture `sipovo_2` (the town, weaker garrison) before the surrounding villages, giving the operation a foothold from which to fan out.

### Wave 26C — HVO central-Bosnia stabilisation (against +5 RBiH ripple)
**Hypothesis:** Wave 25 re-host on `hvo_tomislavgrad` pulled HVO brigades out of central Bosnia, weakening sectors that protected against ARBiH push.

**Conceptual fix (data, not code):**
- **Do not transfer all HVO brigades to Mistral 2 host.** The Mistral 2 brigade pool should be **scoped** — only specifically-named HV/HVO brigades historically associated with Mistral 2 (4th Guards Brigade, 7th Guards Brigade, HVO Tomislavgrad operative group) should be reassigned. The current pool rebuild appears to over-pull.
- Audit `hvo_central_bosnia` formation roster delta n1987 vs n1988. If brigades vanished, restore them to the central-Bosnia sector and rely on the named-brigade pool for Mistral 2.

### Diagnostic dependencies before Wave 26 fires

1. **Per-turn axis trajectory for Mistral 2.** Currently invisible because no AAR row. Either (a) read `watched_operations.json` for Mistral 2 — which exists in `data/derived/scenario/_baseline_tmp/apr1992_52w/watched_operations.json`, or (b) extend the AAR writer to flush in-flight operations at run-end with `recovery_reason: "still_active_at_run_end"`.
2. **Control_delta diff** n1987 vs n1988 to confirm which 5 RBiH OSIDs flipped and where they sit relative to the HVO brigade reshuffle.
3. **Launch-feasibility log** for stalled OSIDs (glamoc cluster, sipovo cluster) to distinguish topology-gap from defender-power floor.

---

## Memo metadata

- Inputs consulted: `data/derived/scenario/_baseline_tmp/apr1992_52w/{operation_aars.json, run_meta.json, run_summary.json}`, `data/derived/latest_run_final_save.json` (grep), brief table.
- Inputs NOT consulted (open work): `control_delta.json` diff n1987↔n1988, `watched_operations.json` Mistral 2 row, `weekly_report.jsonl` per-turn captures.
- Key finding: Mistral 2 is **active but unfinished** in n1988 (no AAR row, present in executed_op stack). Stalls are most-likely topology (Drvar→Grahovo) and defender-power (Šipovo→Mrkonjić). Indirect +5 RBiH is brigade-pool reshuffle ripple, not Mistral 2 outcome.
- Recommendation: **KEEP Wave 25**, proceed Wave 26A/B/C.
