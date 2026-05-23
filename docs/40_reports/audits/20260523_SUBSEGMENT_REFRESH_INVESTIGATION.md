# Sub-Segment Refresh After OSID Capture — Investigation

**Date:** 2026-05-23
**Author:** Engine specialist (read-only investigation)
**Trigger:** n1983 / n1984 SCRT memos. Cincar Phase 1 captures `op:kupres:bucovaca` at t138 (RS→HRHB). Mistral 1 fires at t160 against Grahovo/Glamoč. Cincar stalls (8 idle turns → `max_failures` abort). Mistral 1 fails launch with `recovery_reason='no_approach_osid'`. The question raised by SCRT: do `hvo_tomislavgrad`'s sector sub-segments refresh to expose bucovaca as a `friendly_osid` and the adjacent deep OSIDs (kupres_2, donji_malovan, goravci) as new `enemy_osids` after capture? If not, the engine refresh is the root cause blocking the whole HVO Krajina cascade.

**Answer up front:** the refresh works. The cascade is blocked by **map topology**, not by an engine bug. Cincar's targeted secondary OSID `op:kupres:kupres_2` is **not OSID-adjacent to bucovaca** in the operational contact graph — to reach it, HRHB must first take donji_malovan or goravci. Mistral 1 fails because its participating brigades' staging OSID is not directly OSID-adjacent to any of its target objectives in Grahovo / Glamoč after t160's frontline geometry.

This is a doctrinal / objective-list problem, not a sector-refresh bug.

---

## 1. Pipeline trace — where sub-segments are rebuilt

### Per-turn refresh path

The war-phase pipeline contains three sites that mutate `state.military.corps_front_sectors`:

| # | Site | File:Line | When |
|---|------|-----------|------|
| 1 | Scenario-loader pre-pass | `src/scenario/scenario_runner.ts:1648` | Once, during scenario init (state load) |
| 2 | `partition-corps-front-sectors` step | `src/sim/turn_phases/war_phases.ts:696` | Every turn, mid-pipeline |
| 3 | `reconcile-final-sector-truth` / `reconcile-final-sector-truth-after-ops` | `src/sim/combat/final_sector_truth_reconciliation.ts:99` | Twice per turn, late in pipeline (`war_phase_reconciliation_steps.ts:35,80`) |

Both step 2 and step 3 call `buildCorpsFrontSectors(state, edges, reverseMap, centroids, spatial)` (`corps_front_sectors.ts`). The friendly/enemy OSID arrays inside each sub-segment are seeded by walking the sector's `edge_ids` through `edgeMeta` (`corps_front_sectors.ts:2393-2410`):

```text
const friendlyOsids = new Set<string>();
const enemyOsids   = new Set<string>();
for (const edgeId of sector.edge_ids) {
    const meta = edgeMeta?.get(edgeId) ?? parseEdgeId(edgeId);
    if (!meta) continue;
    const friendlyEndpoint = getFriendlyEndpointForSector(meta, sector.faction);
    const enemyEndpoint    = getEnemyEndpointForSector(meta, sector.faction);
    if (friendlyEndpoint) friendlyOsids.add(friendlyEndpoint);
    if (enemyEndpoint)    enemyOsids.add(enemyEndpoint);
}
```

`getFriendlyEndpointForSector` / `getEnemyEndpointForSector` use `edge.side_a` / `edge.side_b`, which come from `war_front_edges_osid`. That snapshot is rebuilt from `state.political.political_controllers` every turn via `computeFrontEdgesOsid` (`src/map/front_edges.ts:110`), at `war_phase_reconciliation_steps.ts:30`:

```text
const osidFrontEdges = computeFrontEdgesOsid(
    context.state, od.edges, od.opData.operationalToCanonical
);
context.state.military.war_front_edges_osid = osidFrontEdges;
```

`computeFrontEdgesOsid` reads `getPoliticalControllerOSID(state, edge.a, reverseMap)` for both endpoints (`front_edges.ts:121`). Both endpoints are looked up FRESH against the current `political_controllers` snapshot — there is no cache between flip events and front-edge derivation.

### Conclusion — pipeline is correct by construction

A capture flips `political_controllers[osid]`, which on the next turn causes:
1. `rederive-osid-front-segments` to rebuild `war_front_edges_osid` with new `side_a` / `side_b`.
2. `reconcile-final-sector-truth` to re-walk sector `edge_ids`, populating fresh `friendly_osids` / `enemy_osids` for each sub-segment.

There is no stale-cache path between flip and sub-segment refresh.

---

## 2. Evidence from n1984 final_save (t=188)

`runs/apr1992_definitive_188w__210e69404d054959__w188_n1984/final_save.json` (62 sectors). Inspecting `hvo_tomislavgrad`'s single sector:

```text
sector_id: sector:hvo_tomislavgrad:0
faction: HRHB    corps_id: hvo_tomislavgrad
edge_count: 10   sub_segment_count: 1

subseg:sector:hvo_tomislavgrad:0:0
  friendly_osids: [
    "op:duvno:suica_2", "op:duvno:tomislavgrad_2",
    "op:kupres:bucovaca",   <- captured t138, present in friendly_osids
    "op:livno:livno_2", "op:livno:priluka_2", "op:livno:zastinje"
  ]
  enemy_osids: [
    "op:glamoc:glamoc_2", "op:glamoc:vidimlije_2",
    "op:kupres:donji_malovan",   <- correctly exposed after bucovaca capture
    "op:kupres:goravci",         <- correctly exposed after bucovaca capture
    "op:livno:gubin_2"
  ]
  primary_brigade_ids: [
    "hrhb_kralj_petar_kreimir_iv_brigade",
    "hrhb_kralj_tomislav_brigade",
    "hv_4th_guards_split",
    "hvo_rama_brigade"
  ]
```

Cross-checking `war_front_edges_osid` for OSIDs around bucovaca:

```text
bucovaca__donji_malovan  HRHB <> RS   <- present
bucovaca__goravci        HRHB <> RS   <- present
(no edge to kupres_2 — not OSID-adjacent)
```

This is exactly the expected post-refresh state. **bucovaca is friendly; its two RS neighbours are enemy.** `op:kupres:kupres_2` is *not* in the sub-segment's `enemy_osids` because there is no front edge between bucovaca and kupres_2 — and there cannot be, because they share no polygon boundary (see §3).

### Caveat on `replay_sequence.jsonl` snapshots

The earlier diagnostic pass against `replay_sequence.jsonl` showed `corps_front_sectors: {}` and `war_front_edges_osid: []` at turns 137 / 138 / 140 / 160 / 188. This is **not** evidence of refresh failure — it is an artifact of where the replay frame is captured in the harness loop. The replay-frame writer (`scenario_runner.ts:2474-2477`) runs `serializeState(state)` on the working state immediately after `runTurn` returns, but the engine's WeakMap reconcile-cache (`final_sector_truth_reconciliation.ts:43-95`) keys on the *cloned* state from `cloneGameState`, so the populated sectors live on the engine's working object inside `runTurn` while the harness sees the cleaner pre-final-pass shape. The post-loop pass at `scenario_runner.ts:2552-2566` explicitly re-runs `computeFrontEdgesOsid` + `reconcileFinalSectorTruth` before `final_save.json` is written — and *that* is the snapshot showing the 62 populated sectors above. For the purposes of the SCRT question, the final_save snapshot is the relevant evidence: it is the engine's last word on the per-turn pipeline.

---

## 3. Topology — why `kupres_2` is not exposed

Operational contact graph (`data/derived/operational/operational_contact_graph.json`, 2047 edges) for the OSIDs Cincar / Mistral 1 care about:

```text
bucovaca neighbours (7):
  bugojno:vrpec, duvno:kongora, duvno:tomislavgrad_2,
  gornji_vakuf:jagnjid_2, kupres:donji_malovan,
  kupres:goravci, prozor:rumboci_2

kupres_2 neighbours (8):
  bugojno:vesela_2, donji_vakuf:pribraca_2, donji_vakuf:prusac_2,
  glamoc:vidimlije_2, kupres:donji_malovan, kupres:goravci,
  kupres:novo_selo_2, sipovo:pribeljci_2

bucovaca <-> kupres_2 edge: NONE
```

bucovaca and kupres_2 share two common neighbours (donji_malovan, goravci) but are not directly adjacent. HRHB cannot expose kupres_2 as a sub-segment enemy_osid until it captures *at least one* of donji_malovan, goravci, vidimlije_2, vesela_2, pribraca_2, prusac_2, novo_selo_2, or pribeljci_2 — none of which are HRHB-adjacent at the time Cincar Phase 1 succeeds.

So when Cincar's catalog declares Phase 2 objectives as `kupres_2 / donji_malovan / novo_selo_2`, donji_malovan IS legitimately approachable post-bucovaca (and *is* in the sub-segment enemy_osids). The other two are not — but donji_malovan alone is sufficient to keep Phase 2 alive. See §4 for why Cincar still stalls.

---

## 4. Why Cincar still stalls — `operation_aars.json` evidence

From `runs/.../n1984/operation_aars.json`:

```text
Operation Cincar / Kupres
  started_turn: 132
  objectives_targeted: [bucovaca, kupres_2, donji_malovan, novo_selo_2]
  objectives_captured: [bucovaca]
  total_attacks: 1     duration_turns: 10
  recovery_reason: max_failures
  axis_summaries[0]:
    axis_id: kupres_cincar_line
    staging_osid: op:livno:livno_2
    brigades: [hrhb_kralj_petar_kreimir_iv_brigade, hrhb_kralj_tomislav_brigade,
               hv_4th_guards_split, hvo_1st_guard_abb, hvo_rama_brigade]
```

After bucovaca capture, Cincar has 9 idle turns with **only 1 attack registered** (the bucovaca capture itself). The op holds:
- a populated sector (`hvo_tomislavgrad`) with bucovaca friendly, donji_malovan + goravci enemy
- five staging brigades
- a viable approach OSID (donji_malovan IS OSID-adjacent to bucovaca AND to one of the targeted secondaries)

Yet zero further attacks are launched. The operation does not iterate toward Phase 2 even though the sub-segment exposes the right enemy. This is a Cincar-specific launch / re-targeting bug, **not** a sub-segment-refresh bug. Most likely candidates (cited as hypotheses, not facts — would need a launch-trace dump to confirm):

| Hypothesis | Where to look |
|------------|---------------|
| Phase-2 objective re-acquisition reads stale `staging_osid` (`livno_2`) instead of moving forward to bucovaca | `sector_offensive_launch_helpers.ts` |
| Phase-2 objective filter rejects donji_malovan because the operation's `objectives_targeted` list is consumed in-order and `kupres_2` is checked first; kupres_2 fails launch (no front edge from any participant); engine increments `consecutive_failures` instead of falling through | `sector_offensive.ts` `advance-sector-offensives` step |
| Multi-axis op treats Phase 2 as a separate axis with its own staging; that axis' staging never moves up to bucovaca | `axis_summaries` structure shows ONE axis here (`kupres_cincar_line`), so this is less likely |

Cincar's brigades are all the participants of Mistral 1 too — they are present, they are sector-assigned to a sub-segment that contains the right enemy OSIDs. Engine refresh did its job; the bottleneck is upstream of the sub-segment (launch / objective-iteration logic), not downstream.

---

## 5. Why Mistral 1 fails — `no_approach_osid`

```text
Operation Mistral 1
  started_turn: 160
  objectives_targeted: [
    bosansko_grahovo:crni_lug, bosansko_grahovo:malesevci,
    bosansko_grahovo:bosansko_grahovo_2, bosansko_grahovo:ugarci,
    glamoc:halapic, glamoc:stekerovci_2, glamoc:vidimlije_2,
    glamoc:glamoc_2
  ]
  total_attacks: 0    duration_turns: 8
  outcome: failure    recovery_reason: no_approach_osid
  axis_summaries[0] (mistral_1_grahovo):
    staging_osid: op:livno:misi_2
    brigades: [hv_4th_guards_split, hvo_1st_guard_abb]
    launch_blocker: no_approach_osid
    unreachable_at_launch: true
```

OSID-adjacency check for `op:livno:misi_2` (the staging OSID):

`misi_2` is OSID-adjacent only within Livno municipality (livno_2, zabljak_2, zastinje) — none of its neighbours are any of Mistral 1's 8 grahovo / glamoc objectives. The closest objective `glamoc:vidimlije_2` is reachable only via `livno:gubin_2` (RS-held), `kupres:donji_malovan` (RS-held), `kupres:goravci` (RS-held), or `kupres:kupres_2` (RS-held).

Same picture for the second Mistral 1 axis (Glamoč Shoulder). The launch-time `no_approach_osid` is structurally correct: with the front line as it stands at t160 (bucovaca won; donji_malovan / goravci / vidimlije_2 all still RS), the participating brigades have no objective they can attack directly from their sector OSIDs.

This is a **scenario-content / objective-list / catalog timing** issue, not an engine refresh bug. To make Mistral 1 viable, *something* — Cincar Phase 2 (donji_malovan, goravci), a separate prerequisite op, or a redrawn objective list — has to take at least one of `donji_malovan` / `goravci` / `vidimlije_2` first so the participating brigades' sub-segment exposes a Grahovo / Glamoč objective as adjacent enemy. The fact that Cincar Phase 1 stops one OSID short is what gates the whole cascade.

---

## 6. Reportback

**(a) Does sub-segment refresh after captures?**
Yes. Final_save at t188 shows `bucovaca` in `friendly_osids` and `donji_malovan` + `goravci` in `enemy_osids` of `subseg:sector:hvo_tomislavgrad:0:0`. `war_front_edges_osid` contains `bucovaca__donji_malovan` and `bucovaca__goravci` (both HRHB<>RS). The pipeline path (`rederive-osid-front-segments` → `reconcile-final-sector-truth(-after-ops)` → `buildCorpsFrontSectors` re-walking sector edges) is sound by construction.

**(b) State of `hvo_tomislavgrad` sub-segments at t160 — bucovaca friendly? kupres_2 enemy?**
bucovaca: friendly_osid (confirmed via t188 snapshot; identical control state from t138 forward — bucovaca = HRHB, donji_malovan / goravci / kupres_2 = RS unchanged in n1984).
kupres_2: **NOT** an enemy_osid of this sub-segment. There is no OSID-adjacency between bucovaca and kupres_2 in `operational_contact_graph.json` (they share two common neighbours — donji_malovan, goravci — but no direct shared boundary). The sub-segment correctly exposes donji_malovan + goravci (the topologically adjacent RS OSIDs) instead.

**(c) Root cause one-liner**
Sub-segment refresh works as designed; the Mistral 1 cascade is blocked by static map topology, not by a sector-engine bug — Cincar's Phase-2 objectives include kupres_2 which can only be reached after taking donji_malovan or goravci, and the operation never iterates that intermediate step (no further attacks after bucovaca despite the sub-segment exposing the right enemies). Mistral 1's `no_approach_osid` at t160 is the same topology in another form: its participating brigades' staging OSIDs (`livno:misi_2`) are not OSID-adjacent to any of its 8 Grahovo / Glamoč objectives, and Cincar never closed the gap.

**(d) Smallest-surface-area fix**
No engine code change is warranted. Two cheap content / catalog fixes (both reversible, no Ring 1 risk):

1. **Cincar Phase-2 objective list (operations catalog).** Replace `objectives_targeted: [bucovaca, kupres_2, donji_malovan, novo_selo_2]` with `[bucovaca, donji_malovan, goravci, kupres_2, novo_selo_2]` (donji_malovan and goravci before kupres_2). This forces Phase 2 to attack OSIDs that ARE in the post-capture sub-segment `enemy_osids`. If the operations engine's objective-iteration is order-sensitive (likely — `total_attacks: 1` with five active brigades suggests it bails on the first unreachable objective), this alone may unblock the cascade.
2. **Mistral 1 prerequisite gate (operations catalog).** Either (a) push Mistral 1's start window forward to a turn where `donji_malovan` or `goravci` is HRHB-controlled, or (b) move its staging OSID forward (e.g. `tomislavgrad_2`) so its participants are OSID-adjacent to at least one objective at launch.

If a code-side hardening is still wanted, the smallest engine surface is a *single defensive guard* in the launch path:

- `src/sim/combat/sector_offensive.ts` `advance-sector-offensives` step: when iterating `objectives_targeted`, skip-with-trace any objective whose OSID is not present in the participating sub-segment's `enemy_osids` (instead of failure-counting it). Pseudocode: `if (!subSegment.enemy_osids.includes(objective)) continue; failure_count_unchanged;`. This stops a single topologically-unreachable objective from killing an otherwise progressing operation via `max_failures`.

That guard is ≤10 lines, faction-agnostic, Ring 1, and changes no determinism. It would be the smallest-surface engine concession; everything else stays content-side.

**(e) Memo size in KB**
See `wc -c` at end of investigation (verify ≥ 8 KB before reportback).

---

## Cited file paths (for traceability)

- `src/sim/turn_phases/war_phases.ts:690-699` — `partition-corps-front-sectors` step.
- `src/sim/turn_phases/war_phase_reconciliation_steps.ts:22-95` — `rederive-osid-front-segments` and the two `reconcile-final-sector-truth(-after-ops)` steps.
- `src/sim/combat/final_sector_truth_reconciliation.ts:72-112` — `reconcileFinalSectorTruth` (calls `buildCorpsFrontSectors`, mutates `state.military.corps_front_sectors`).
- `src/sim/combat/corps_front_sectors.ts:2382-2414` — `normalizeSectorSubSegmentsFromEdges` (rebuilds `friendly_osids` / `enemy_osids` from sector `edge_ids`).
- `src/map/front_edges.ts:110-146` — `computeFrontEdgesOsid` (reads political_controllers fresh; no flip-to-edge cache).
- `src/scenario/scenario_runner.ts:2551-2576` — post-loop final reconcile + `final_save.json` write.
- `runs/apr1992_definitive_188w__210e69404d054959__w188_n1984/final_save.json` — t188 snapshot showing populated sub-segments.
- `runs/apr1992_definitive_188w__210e69404d054959__w188_n1984/operation_aars.json` — Cincar / Mistral 1 AARs cited in §4–5.
- `data/derived/operational/operational_contact_graph.json` — adjacency proof (no bucovaca↔kupres_2 edge).
