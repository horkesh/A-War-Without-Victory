# Wave 9B (Livno Staging) — n1970 Audit

Date: 2026-05-22
Run: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1970/`
Prior: `…_n1969/` (memo `20260522_WAVE_9_PHASE_2_NO_FIRE_N1969.md`)
Hash: `3769e35024b95d4c` (n1969: `642d0c67857548d0` — DIFFERS, so Wave 9B IS a real change)
Faction count vs jan1993 ref (HRHB -45 / RBiH +23 / RS +22): byte-identical to n1969

## Headline

**Phase 2 still did not fire.** Swapping the staging OSID from `op:kupres:bucovaca` to `op:livno:livno_2` and bumping `planning_duration` 2 → 4 did NOT unblock the attack. The Phase 2 AAR in n1970 is functionally identical to n1969: `total_attacks=0`, `outcome=failure`, `recovery_reason=no_logged_attempt`, `objectives_captured=[]`. Hash differs because brigade routing during turns 149–156 is materially different (brigades are moving), but those movements are NOT toward the Phase 2 objectives.

The new blocker is not eligibility, planning duration, or staging-feasibility. It is **routing geometry**: with Livno as the per-axis stage, brigades are pulled south/west toward Livno/Tomislavgrad and then routed back through `bucovaca`/`suica_2` (Phase-1 territory) — not forward to `donji_malovan` / `kupres_2` / `goravci` / `novo_selo_2`.

## Wave 9B Diff Recap

| Field | Pre (n1969) | Post (n1970) |
|---|---|---|
| `kupres_phase_2_94.staging_osid` (4 sites) | `KUPRES_PHASE_2_STAGING_BUCOVACA` = `op:kupres:bucovaca` | `KUPRES_CINCAR_STAGING_LIVNO` = `op:livno:livno_2` |
| `planning_duration` | 2 | 4 |
| Dependency anchors | — | `KUPRES_PHASE_2_CINCAR_DEPENDENCY_ANCHORS` retains bucovaca |
| Sites patched | n/a | KUPRES_PHASE_2_AXES northern + southern, southern-only variant, op-def |

## (a) Phase 1 — Operation Cincar / Kupres (UNCHANGED)

Same as n1969.

| Field | n1970 |
|---|---|
| `operation_id` | `hvo_tomislavgrad:Operation Cincar / Kupres:t132` |
| `started_turn` → `ended_turn` | 132 → 149 (duration 17) |
| `total_attacks` | 2 |
| `outcome` | `partial` |
| `recovery_reason` | `max_failures` |
| `objectives_targeted` | bucovaca, kupres_2, donji_malovan, novo_selo_2 |
| `objectives_captured` | `["op:kupres:bucovaca"]` |
| `force_ratio_estimate` | 1.4765 |
| Brigades | `hrhb_kralj_petar_kreimir_iv_brigade`, `hrhb_kralj_tomislav_brigade`, `hv_4th_guards_split`, `hvo_1st_guard_abb`, `hvo_rama_brigade` |

Phase 1 still ends `partial` via `max_failures` after capturing bucovaca; remaining Phase-1 objectives never fall. This is unchanged from n1968/n1969.

## (b) Phase 2 — Operation Cincar Phase 2 / Kupres Town (UNCHANGED OUTCOME)

| Field | n1969 | n1970 |
|---|---|---|
| `operation_id` | `…Phase 2 / Kupres Town:t148` | `…Phase 2 / Kupres Town:t148` |
| `started_turn` → `ended_turn` | 148 → 156 | 148 → 156 (duration 8) |
| `total_attacks` | **0** | **0** |
| `outcome` | `failure` | `failure` |
| `recovery_reason` | `no_logged_attempt` | `no_logged_attempt` |
| `objectives_targeted` | donji_malovan, kupres_2, goravci, novo_selo_2 | same |
| `objectives_logged_captured` | [] | [] |
| `objectives_held_without_logged_capture` | [] | [] |
| `capture_provenance` | `no_objectives_held` | `no_objectives_held` |
| `force_ratio_estimate` | 2.2449 | 2.2449 |
| `initial_strength` | 10900 | 10900 |
| `final_strength` | 10900 | 10900 (zero attrition — never fought) |
| `grade.verdict` | Indecisive (3★) | Indecisive (3★) |
| `participating_brigades` (5) | same | `hrhb_kralj_petar_kreimir_iv_brigade`, `hrhb_kralj_tomislav_brigade`, `hv_4th_guards_split`, `hvo_2nd_guard_mechanized`, `hvo_rama_brigade` |

`hvo_1st_guard_abb` is **substituted out** between Phase 1 (where it participated) and Phase 2 (replaced by `hvo_2nd_guard_mechanized`). Brigade count holds at 5.

### Phase-2 weekly_log (n1970)

| Turn | Phase | Attacks | Notable events | Brigades |
|---|---|---|---|---|
| 148 | planning | 0 | — | 5 |
| 149 | planning | 0 | — | 5 |
| 150 | execution | 0 | `stalled` | 5 |
| 151 | execution | 0 | `stalled` | 5 |
| 152 | execution | 0 | `stalled` | 5 |
| 153 | execution | 0 | `stalled` | 5 |
| 154 | execution | 0 | `stalled` | 5 |
| 155 | recovery | 0 | — | 5 |

**Only 2 planning turns observable in the AAR, not 4.** The `planning_duration: 4` change does NOT manifest as 4 weekly-log entries in `phase: "planning"` — it stays at 2 (turns 148, 149). Execution begins t=150 and every execution turn is `stalled`. This needs follow-up: either the new constant is not wired to the AAR phase classifier, or it changes another field (e.g., readiness gate timing internal to planning) that the AAR doesn't surface.

### Axis summaries (n1970)

| Axis | Brigades | Staging | Targets | Attacks |
|---|---|---|---|---|
| `kupres_phase_2_southern` (Donji Malovan Thrust) | hrhb_kralj_petar_kreimir_iv, hvo_2nd_guard_mech, hvo_rama | `op:livno:livno_2` | donji_malovan, kupres_2 | 0 |
| `kupres_phase_2_northern` (Goravci Thrust) | hrhb_kralj_tomislav, hv_4th_guards_split, hvo_2nd_guard_mech | `op:livno:livno_2` | goravci, kupres_2, novo_selo_2 | 0 |

Note `hvo_2nd_guard_mechanized` is listed on both axes — single brigade double-counted across axes.

## (c) kupres_2 Controller at w188

**RS.** Identical to n1968 and n1969. `control_delta` shows exactly one kupres flip across the entire 188-week run:

```
{"from":"RS","municipality_id":"kupres","settlement_id":"op:kupres:bucovaca","to":"HRHB"}
```

No flip of `op:kupres:kupres_2`, `donji_malovan`, `goravci`, or `novo_selo_2`. Phase 2 did not move the front.

## (d) Brigade Positions — Phase 2 Window

`brigade_temporal_log.jsonl` snapshots at t=144, 146, 148, 149, 150, 152, 154, 156 for the five Phase-2 participants + `hvo_1st_guard_abb` (Phase-1 carryover).

### t=148 (Phase 2 spawn, planning)

| Brigade | location_osid | active_op | mv_state |
|---|---|---|---|
| hrhb_kralj_petar_kreimir_iv | `op:kupres:bucovaca` | Phase 1 (recovery) | — |
| hrhb_kralj_tomislav | `op:livno:livno_2` | Phase 1 (recovery) | — |
| hv_4th_guards_split | `op:duvno:tomislavgrad_2` | Phase 1 (recovery) | — |
| hvo_rama_brigade | `op:duvno:tomislavgrad_2` | Phase 1 (recovery) | — |
| hvo_2nd_guard_mechanized | `op:mostar:mostar_zapad_2` | none | — |
| hvo_1st_guard_abb (PHASE-1) | `op:duvno:suica_2` | Phase 1 (recovery) | — |

Only one brigade (hrhb_kralj_petar_kreimir_iv) is actually at a forward kupres OSID; the rest sit at the rear (Livno, Tomislavgrad, Mostar).

### t=149 (planning, destinations set)

| Brigade | location_osid | active_op | mv_destinations |
|---|---|---|---|
| hrhb_kralj_petar_kreimir_iv | `op:kupres:bucovaca` | Phase 2 planning | — (stays) |
| hrhb_kralj_tomislav | `op:livno:livno_2` | Phase 2 planning | **`op:duvno:suica_2`** |
| hv_4th_guards_split | `op:duvno:tomislavgrad_2` | Phase 2 planning | **`op:kupres:bucovaca`** |
| hvo_rama_brigade | `op:duvno:tomislavgrad_2` | Phase 2 planning | — (stays) |
| hvo_2nd_guard_mechanized | `op:mostar:mostar_zapad_2` | NOT YET on Phase 2 | — |
| hvo_1st_guard_abb | `op:livno:misi_2` | none | `op:duvno:tomislavgrad_2` (RTB) |

**This is the smoking gun.** The destinations targeted by the planning step are:
- `op:duvno:suica_2` (rear, Phase-1 anchor, behind bucovaca)
- `op:kupres:bucovaca` (already-captured Phase-1 anchor)

Neither destination is a Phase-2 objective (donji_malovan / kupres_2 / goravci / novo_selo_2). The routing layer interpreted "stage at Livno → push to Phase-2 targets" as "stage at Livno → consolidate at bucovaca/suica_2", which are the **Phase-1 corridor anchors retained via `KUPRES_PHASE_2_CINCAR_DEPENDENCY_ANCHORS`**.

### t=150 (execution begins; transit kicks in)

| Brigade | loc | active_op | mv_state | dest |
|---|---|---|---|---|
| hrhb_kralj_petar_kreimir_iv | `op:kupres:bucovaca` | P2 exec | — | — |
| hrhb_kralj_tomislav | `op:livno:livno_2` | P2 exec | **in_transit** | `op:duvno:suica_2` |
| hv_4th_guards_split | `op:duvno:tomislavgrad_2` | P2 exec | **in_transit** | `op:kupres:bucovaca` |
| hvo_rama_brigade | `op:duvno:tomislavgrad_2` | P2 exec | — | — |
| hvo_2nd_guard_mechanized | `op:mostar:mostar_zapad_2` | P2 exec | — | `op:listica:lise` |
| hvo_1st_guard_abb | `op:livno:misi_2` | none | in_transit | `op:duvno:tomislavgrad_2` |

`hvo_2nd_guard_mechanized` joins the op at t=150 — but is routed to **`op:listica:lise`**, a Posušje-area OSID with no relevance to Phase 2.

### t=152

| Brigade | loc | mv_state | dest |
|---|---|---|---|
| hrhb_kralj_petar_kreimir_iv | `op:kupres:bucovaca` | — | — |
| hrhb_kralj_tomislav | `op:duvno:suica_2` (arrived from Livno) | **in_transit** | `op:kupres:bucovaca` |
| hv_4th_guards_split | `op:kupres:bucovaca` (arrived from Tomislavgrad) | — | — |
| hvo_rama_brigade | `op:duvno:tomislavgrad_2` | — | — |
| hvo_2nd_guard_mechanized | `op:posusje:sutina_2` | — | `op:duvno:kongora` |
| hvo_1st_guard_abb | `op:duvno:tomislavgrad_2` | — | — |

By t=152, three of five Phase-2 brigades are converging on **bucovaca**, not on Phase-2 targets. `hvo_2nd_guard_mechanized` is on a separate (and again irrelevant to Phase 2) trajectory through Posušje/Duvno.

### t=154

| Brigade | loc | mv_state | dest |
|---|---|---|---|
| hrhb_kralj_petar_kreimir_iv | `op:kupres:bucovaca` | — | — |
| hrhb_kralj_tomislav | `op:kupres:bucovaca` (arrived) | — | — |
| hv_4th_guards_split | `op:kupres:bucovaca` | — | — |
| hvo_rama_brigade | `op:duvno:tomislavgrad_2` | — | — |
| hvo_2nd_guard_mechanized | `op:duvno:kongora` | — | `op:duvno:tomislavgrad_2` (RTB) |
| hvo_1st_guard_abb | `op:duvno:tomislavgrad_2` | — | — |

Three brigades stacked at **bucovaca**; one at Kongora heading back to Tomislavgrad; one at Tomislavgrad. Nobody is at, or moving toward, donji_malovan / kupres_2 / goravci / novo_selo_2.

### t=156 (post-recovery)

| Brigade | loc | active_op |
|---|---|---|
| hrhb_kralj_petar_kreimir_iv | `op:kupres:bucovaca` | none, dest `op:duvno:suica_2` (RTB) |
| hrhb_kralj_tomislav | `op:kupres:bucovaca` | `probe_hvo_tomislavgrad_t156` planning |
| hv_4th_guards_split | `op:kupres:bucovaca` | none |
| hvo_rama_brigade | `op:duvno:tomislavgrad_2` | none |
| hvo_2nd_guard_mechanized | `op:duvno:kongora` | none, dest `op:duvno:suica_2` |
| hvo_1st_guard_abb | `op:duvno:tomislavgrad_2` | none |

Phase 2 closes with three brigades sitting at bucovaca and one immediately spawning a follow-on **probe**. Nobody pushed across the front.

## RS Defenders at Phase-2 Targets During the Window

Cross-check: how strongly were `kupres_2`, `donji_malovan`, `goravci`, `novo_selo_2`, `suica_2`, `bucovaca` actually defended in t=148–156?

**Zero RS brigades** were logged at any of those six OSIDs across the eight Phase-2 turns. The Phase-2 objectives were effectively undefended for the duration of the operation — yet no attack was launched. This confirms `total_attacks=0` is not a build-feasibility / defender-power blocker (cf. `force_ratio_estimate=2.24`). It is a **target-acquisition / staging-arc routing blocker**.

## (d) New Blocker — Root Cause

**Per-axis staging at Livno cannot reach Phase-2 objectives in 6 execution turns because the operation's corridor logic still routes brigades through the Phase-1 anchor set (bucovaca, suica_2), which is retained in `KUPRES_PHASE_2_CINCAR_DEPENDENCY_ANCHORS`.** Brigades treat the anchor set as the next-leg waypoint, accumulate at bucovaca, and then the recovery turn fires before any of them reach donji_malovan/kupres_2/goravci/novo_selo_2.

Symptoms supporting this:
1. `mv_destinations` at t=149 (planning) = `op:duvno:suica_2` and `op:kupres:bucovaca` — Phase-1 corridor anchors, NOT Phase-2 targets.
2. All non-stationary brigades arrive at bucovaca by t=154 and stop.
3. No attacks logged at any target OSID across t=150–154 ("stalled" every execution turn).
4. RS does not defend the target OSIDs in the window — there is no power gate; there is no movement to engage.

The **anchor-vs-target collision**: Wave 9B kept bucovaca as a "corridor anchor" while shifting `staging_osid` to Livno. The brigade routing layer apparently still prefers the anchor over the staging-OSID-to-target axis when both are populated, producing a 1-hop accumulation at the wrong node.

A secondary observation: the `planning_duration: 4` value does not produce 4 planning turns in the weekly_log (still 2). Either the field is not consumed by Phase 2 AAR phase tagging, or it gates a different sub-step (readiness build) that doesn't surface in the AAR. Worth a quick wiring audit by operations-expert.

## (e) Smallest-Surface-Area Follow-Up Fix

**Drop bucovaca from `KUPRES_PHASE_2_CINCAR_DEPENDENCY_ANCHORS`, or convert the anchor list from "next-leg waypoint" semantics to "captured prerequisite" semantics in the op-def.** Right now anchors and staging compete for routing; the smallest change is to break the tie in favor of staging.

Concrete, smallest-surface options ranked by surgical-ness:

1. **Remove bucovaca from `KUPRES_PHASE_2_CINCAR_DEPENDENCY_ANCHORS`** (single constant edit). The Phase-1 capture already preserves bucovaca; Phase 2 doesn't need it as an anchor — the staging at Livno + ARES contiguity should be enough.
2. **Add `target_osid_first: true` (or analogous flag) to the Phase-2 axes** so the router prefers direct staging→target arcs over staging→anchor→target.
3. **Move Phase-2 staging back to bucovaca AND eliminate the southern axis's Livno leg**, accepting Wave 9A's geometry but stripping the dependency-anchor list. This reverts the spirit of Wave 9B but leverages the right geometry: brigades that finished Phase 1 are already at/near bucovaca, so re-staging there is short. Cost: tooling for the planning duration may still mismatch.

**Recommended:** option 1 first, as a single-line data edit in `KUPRES_PHASE_2_CINCAR_DEPENDENCY_ANCHORS`. If the brigades then route directly from Livno to targets, the operation should fire. If they instead idle (because routing needs a stepping-stone), escalate to option 2 with operations-expert.

Also: **investigate why `planning_duration: 4` does not produce 4 planning turns in the AAR weekly_log** — non-blocking, but Wave 9B's planning bump may be a no-op until that wiring is confirmed.

## Flags / Plausibility

- Phase 2 forming up at the rear with five brigades, force_ratio 2.24, against an undefended objective, then never attacking — **wildly ahistorical** for HVO operations. The historical Cincar/Kupres campaign captured Kupres town within ~10 days of the Wave-1 Cincar push (Nov 1994). Two consecutive runs failing to take kupres_2 is a structural defect, not a calibration delta.
- `hvo_2nd_guard_mechanized` routing to `op:listica:lise` and then `op:duvno:kongora` while ostensibly attached to Phase 2 is suspect — those OSIDs are not on any plausible Posušje→Kupres axis. Possible secondary issue: brigade-axis assignment is not enforcing staging-osid before granting "execution" status.
- The brigade count holds at 5 across all 8 turns despite `hvo_2nd_guard_mechanized` joining late and never reaching staging — confirming the count is by-attachment, not by-readiness.

## Files Referenced

- `runs/apr1992_definitive_188w__210e69404d054959__w188_n1970/operation_aars.json`
- `runs/apr1992_definitive_188w__210e69404d054959__w188_n1970/brigade_temporal_log.jsonl`
- `runs/apr1992_definitive_188w__210e69404d054959__w188_n1970/control_delta.json`
- `runs/apr1992_definitive_188w__210e69404d054959__w188_n1970/watched_operations.json` (no Cincar Phase-2 entry — not on watchlist)
- Prior memo: `docs/40_reports/audits/20260522_WAVE_9_PHASE_2_NO_FIRE_N1969.md`

## Hand-Off

- **operations-expert**: tie-break ruling on staging_osid vs. dependency_anchors precedence inside `KUPRES_PHASE_2_AXES`. Owner of `pre_planned_operations.ts` and per-axis routing semantics. MUST sign off on whether option 1 (drop anchor) or option 2 (priority flag) is the canonical fix.
- **scenario-harness-engineer**: confirm whether `planning_duration: 4` is wired into Phase-2 AAR weekly_log phase tagging, or whether it controls a different sub-step.
- **game-designer**: optional — if Phase 2 keeps failing across iterations, reconsider whether Cincar Phase 2 needs a different op-class entirely (e.g., not multi-axis with shared staging, but two independent thrusts each from their own corps anchor).
