# Wave 9 — Phase 2 No-Fire Audit (n1969)

**Date**: 2026-05-22
**Scenario**: apr1992_definitive_188w
**Run**: n1969 (hash `642d0c67857548d0`)
**Predecessor**: n1968 (hash `b56a1fa3d2b4f94c`)
**Audit target**: `KUPRES_PHASE_2_94_OPPORTUNITY` (Wave 9 new catalog entry)
**Operation ID**: `hvo_tomislavgrad:Operation Cincar Phase 2 / Kupres Town:t148`

---

## TL;DR

Wave 9's Phase 2 catalog entry **registered, proposed, spawned, and bound brigades** (force_ratio 2.24, 5 brigades, 2 axes) but issued **zero attacks across all 8 lifecycle turns (t148–t156)**. The operation exited at `recovery_reason=no_logged_attempt` with `capture_provenance=no_objectives_held`. Phase 1 was byte-identical to n1968 (4-star Solid Victory capturing `op:kupres:bucovaca` at t138). kupres_2 remains RS-controlled. The hash differs from n1968 because the new opportunity was enumerated and an AAR/history record were written; no territorial movement resulted.

Root cause (high confidence): **all Phase 2 attack axes stage from `op:kupres:bucovaca` and target objectives in the same Kupres municipality, but the brigades that captured bucovaca during Phase 1 never physically relocated to it.** Phase 2's logged `staging_osid` is the destination shoulder, while the participating brigades are still attached to the Phase 1 sector chain that runs back through Tomislavgrad/Livno. Combined with the new opportunity's planning_duration of only 2 turns (vs Phase 1's longer build-up that crossed the sector and reached its targets via the pre-existing front), Phase 2 enters EXECUTION at t150 with no front-adjacency between brigade location and target objectives → zero `attacks_this_turn` for 7 consecutive execution turns → `no_logged_attempt` recovery.

---

## (a) Phase 1 in n1969 — UNCHANGED from n1968

| Field | n1968 | n1969 |
|---|---|---|
| `outcome` | partial | partial |
| `grade.stars` | 4 | 4 |
| `grade.verdict` | Solid Victory | Solid Victory |
| `objectives_captured` | `[op:kupres:bucovaca]` | `[op:kupres:bucovaca]` |
| `started_turn` | 132 | 132 |
| `ended_turn` | 149 | 149 |
| `total_attacks` | 2 | 2 |
| `casualties_inflicted.killed` | 704 | 704 |
| `casualties_suffered.killed` | 414 | 414 |
| `recovery_reason` | max_failures | max_failures |
| `force_ratio_estimate` | 1.4765… | 1.4765… (identical to last decimal) |

Capture event: `op:kupres:bucovaca` captured at **t138** ("breakthrough", weekly_log turn=138). bucovaca was HRHB-held continuously from t138 onward in both runs.

**Phase 1 is not the regression source.** Wave 9 left Phase 1 byte-identical.

---

## (b) Phase 2 lifecycle — spawned + bound + zero attacks

Order of events (Phase 2 AAR + operation_history):

1. **Proposed**: Yes. The opportunity appears in `operation_history` at index 41, immediately after Cincar Phase 1.
2. **Spawned**: Yes. `started_turn=148`, `corps_id=hvo_tomislavgrad`, faction `HRHB`, `type=sector_attack`. Both axes resolved (`kupres_phase_2_southern` + `kupres_phase_2_northern`).
3. **Brigades bound**: Yes. 5 brigades attached:
   - `hrhb_kralj_petar_kreimir_iv_brigade`
   - `hrhb_kralj_tomislav_brigade`
   - `hv_4th_guards_split`
   - `hvo_2nd_guard_mechanized` (NEW — not used in Phase 1)
   - `hvo_rama_brigade`
4. **Predicate gates**: All 10 evaluators must have evaluated green, since the operation reached EXECUTION. `staging_access` (the hard Bucovača=HRHB gate) is satisfied by Phase 1's t138 capture.
5. **Launched (entered execution)**: Yes. `weekly_log` shows `phase: "planning"` at t148–t149, then `phase: "execution"` at t150–t154, then `phase: "recovery"` at t155.
6. **Attacks issued**: **NONE.** Both axes show `total_attacks: 0`. Every execution-phase weekly_log entry has `attacks_this_turn: 0` and `notable_events: ["stalled"]`.
7. **Finalized**: t156. `outcome: failure`. `recovery_reason: no_logged_attempt`. `capture_provenance: no_objectives_held`. `objectives_captured: []`. `objectives_logged_captured: []`. `objectives_held_without_logged_capture: []`.

**force_ratio_estimate=2.2448** at op start — Phase 2's combat math thought the force was sufficient (2.24× over defender power). The decision logic to ATTACK simply never fired the verb.

Per-turn weekly log (Phase 2):

| Turn | Phase | attacks_this_turn | notable_events | brigade_count |
|---|---|---|---|---|
| 148 | planning | 0 | — | 5 |
| 149 | planning | 0 | — | 5 |
| 150 | execution | 0 | stalled | 5 |
| 151 | execution | 0 | stalled | 5 |
| 152 | execution | 0 | stalled | 5 |
| 153 | execution | 0 | stalled | 5 |
| 154 | execution | 0 | stalled | 5 |
| 155 | recovery | 0 | — | 5 |

7 consecutive `stalled` events across the 5 execution turns is the diagnostic fingerprint. Phase 1 — which DID attack — shows `stalled` events only in the LATE post-capture turns (t141–t146), confirming the engine writes `stalled` when an axis cannot resolve its attack. Phase 2 stalls *immediately* on entering execution and never recovers.

---

## (c) kupres_2 final controller — RS (UNCHANGED)

Final controllers at w188 (both runs):

| OSID | n1968 | n1969 |
|---|---|---|
| `op:kupres:bucovaca` | HRHB | HRHB (Phase 1 capture held) |
| `op:kupres:kupres_2` | RS | RS |
| `op:kupres:donji_malovan` | RS | RS |
| `op:kupres:goravci` | RS | RS |
| `op:kupres:novo_selo_2` | RS | RS |
| `op:donji_vakuf:donji_vakuf_2` | RBiH | RBiH |
| `op:jajce:jajce_2` | (unpainted) | (unpainted) |

Phase 2 captured nothing. The Kupres-town garrison remains intact at w188.

---

## Root-cause investigation

### Hypothesis matrix

| # | Hypothesis | Status | Evidence |
|---|---|---|---|
| H1 | Predicate gate (staging_access / bucovaca-not-HRHB) blocked Phase 2 | **REJECTED** | Phase 2 spawned. bucovaca confirmed HRHB at t138 and held through w188. |
| H2 | Brigades not bound / under-strength | **REJECTED** | 5 brigades attached. force_ratio_estimate=2.24. final_strength=10,900. |
| H3 | Window slipped (t148–158 closed too early) | **REJECTED** | started_turn=148, ended_turn=156. Inside window. |
| H4 | Per-axis defender_power suppressed attack order | **PARTIAL** | force_ratio at op-level is 2.24 (healthy), but engine evaluates per-axis at attack-init. Defender power of kupres_2 garrison (RS) is high but Phase 1 broke through bucovaca at lower ratios. |
| H5 | Brigades sit at Tomislavgrad/Livno; staging at bucovaca is nominal-only | **LIKELY ROOT CAUSE** | Phase 1's `staging_osid: op:livno:livno_2`. Phase 1 attacked bucovaca twice across t137–t138 then went silent. Brigades never had a "relocate-to-bucovaca" step before Phase 2 started. |
| H6 | Sector/front-adjacency mismatch | **LIKELY CONTRIBUTING** | Phase 2 axes target kupres_2 + donji_malovan + goravci + novo_selo_2. These OSIDs are inside the Kupres operational municipality. For brigades sitting back in Livno/Tomislavgrad sectors, the front-edge that hvo_tomislavgrad corps owns may not touch these targets; attack-init requires brigade-in-attacking-sector. |
| H7 | hvo_2nd_guard_mechanized never present in scenario | **NEEDS VERIFICATION** | Brigade appears in catalog axes but Phase 1 did not use it. If it doesn't exist in OOB at t148, axis brigade-resolution may shrink the attacker pool to under the per-axis floor. |
| H8 | planning_duration=2 too short for relocation | **CONTRIBUTING** | Phase 2 spends t148–t149 in planning (only 2 turns), entering execution at t150 with brigades still in Phase 1 home positions. |

### Cincar Phase 1's working geometry (for contrast)

- `staging_osid: op:livno:livno_2`
- Axis name: `kupres_cincar_line` ("Kupres Line")
- objectives_targeted: `[bucovaca, kupres_2, donji_malovan, novo_selo_2]`
- 2 total_attacks across t137–t138, both successful enough to take bucovaca
- After capture, brigades stalled for the next 6 turns (t141–t146) — engine wrote `stalled` because the next target (kupres_2) was beyond the working front

**Phase 1 broke through to bucovaca via the Livno→Kupres axis that the harness already knew about.** Phase 2 declared `bucovaca` as its staging, but the brigades didn't physically relocate; they're still positioned to ATTACK bucovaca, not depart from it.

### Operational contact graph note

`data/derived/operational/operational_contact_graph.json` is the canonical edge list. Bucovača must have edges to `donji_malovan` and `goravci` for the southern/northern axes to be geometrically valid. Both OSIDs are in the same `op:kupres:` municipality — adjacency is expected but the brigades aren't physically at bucovaca to use those edges.

### Why does the hash differ from n1968 if no territory changed?

The hash differs because:
1. `operation_history` array length grew from 49→50 (new Phase 2 entry written).
2. `operation_aars` array length grew from 49→50.
3. Brigade `cohesion` / `morale` deltas for the 5 attached brigades from sitting in op-bound state for 8 turns (no actual combat, but op-binding state changes consume readiness).
4. `corps_command.hvo_tomislavgrad.commander_state` plan/decision-trace entries (op proposed, op aborted).

No territorial controller flipped; no battle resolved. The hash delta is metadata-only, which is exactly what the faction-count parity to n1968 confirmed (-45 HRHB, +23 RBiH, +22 RS — byte-identical).

---

## (d) Root-cause one-liner

**Phase 2 declares `op:kupres:bucovaca` as its staging_osid, but Phase 1's brigades never relocated to bucovaca after capturing it — they're still in the Livno→bucovaca attack axis stance — so when Phase 2 enters execution at t150, no brigade satisfies the per-axis front-adjacency contract from bucovaca outward to kupres_2/donji_malovan/goravci/novo_selo_2, and the attack verb is never issued (8 consecutive `stalled` weekly_log entries → `recovery_reason=no_logged_attempt`).**

---

## (e) Smallest-surface-area follow-up fix

### Option 1 (preferred): Re-stage Phase 2 from Livno

Change Phase 2's `staging_osid` from `op:kupres:bucovaca` to `op:livno:livno_2` (Phase 1's staging) and inherit Phase 1's working axis geometry. The brigades are already there; the Kupres-line front already exists; bucovaca becomes a *transit* anchor in the rear-staging spine rather than the forward staging point.

Concrete edits in `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts`:

- L786, L798, L817 (3× `staging_osid: KUPRES_PHASE_2_STAGING_BUCOVACA`) → change to `KUPRES_CINCAR_STAGING_LIVNO`
- L923 (op-level `staging_osid`) → change to `KUPRES_CINCAR_STAGING_LIVNO`
- Keep the `staging_access` predicate's bucovaca-must-be-HRHB gate intact (it's still semantically required as a corridor anchor).
- Increase `planning_duration` from 2 to 4 to give the brigades a march-out window.

**Surface area**: 4 line edits + 1 constant. No engine changes. No new constants. No new predicates.

### Option 2: Bridge the staging gap with a forward-deploy directive

Add a pre-execution forward-deploy step that physically moves the 5 brigades to bucovaca during the 2-turn planning window. This requires gameplay-programmer involvement to wire `brigade_movement_orders` from the opportunity-spawn step. **Higher surface area** — touches the lifecycle machinery, not catalog data. Defer.

### Option 3: Replace Phase 2 with sector_offensive against same targets

Hand the kupres_2 push to `arbih_3rd_corps` via Vlasic Ridge expansion. **Wrong faction** — HVO Tomislavgrad's the historical actor; would create a railroad. Defer.

### Recommendation

**Ship Option 1.** Minimal-diff data-only catalog tweak. Re-run scenario; verify Phase 2 issues attacks; check kupres_2 captures; observe Mistral 1 (t160) and Jajce 95 (t178) unblock.

---

## (f) Memo size

Verified inline at end of audit.

---

## Appendix A — Lifecycle phase trace (Phase 2)

```
t148 planning   brigade_count=5 attacks=0
t149 planning   brigade_count=5 attacks=0
t150 execution  brigade_count=5 attacks=0  stalled
t151 execution  brigade_count=5 attacks=0  stalled
t152 execution  brigade_count=5 attacks=0  stalled
t153 execution  brigade_count=5 attacks=0  stalled
t154 execution  brigade_count=5 attacks=0  stalled
t155 recovery   brigade_count=5 attacks=0
```

`ended_turn=156`. `duration_turns=8`. `total_attacks=0`. `force_ratio_estimate=2.2448937`.

## Appendix A.1 — Brigade physical positions at run-end (CRITICAL EVIDENCE)

`final_save.json.military.brigade_movement_state` confirms **none of the 5 Phase 2 brigades ever moved during Phase 2** (`NO MOVEMENT STATE` for all five). Their `home_osid` values reveal the staging-vs-home mismatch:

| Brigade | home_osid | Distance to bucovaca |
|---|---|---|
| `hrhb_kralj_petar_kreimir_iv_brigade` | `op:livno:livno_2` | Phase 1 staging — far |
| `hrhb_kralj_tomislav_brigade` | `op:duvno:dobrici` | far (Tomislavgrad municipality) |
| `hv_4th_guards_split` | `op:livno:livno_2` | Phase 1 staging — far |
| `hvo_2nd_guard_mechanized` | `op:mostar:mostar_zapad_2` | **very far** (Mostar — south HVO sector) |
| `hvo_rama_brigade` | `op:prozor:ustirama_3` | far (Prozor — east HVO sector) |

Two findings:

1. **None of the brigades co-located at bucovaca.** Even Phase 1's victors (Kreimir IV, Tomislav, HV 4th Guards) sit at their home_osids in Livno/Duvno, not at the captured shoulder. The capture event flipped the OSID controller but did not relocate the brigades.
2. **`hvo_2nd_guard_mechanized` is sourced from Mostar (south HVO).** It was added to Phase 2 axes but its home is on the opposite end of the HVO theatre. With `planning_duration=2` it had no chance to march to bucovaca before execution. This is the per-axis movement-precondition shortfall that drove `attacks_this_turn=0`.

`brigade_front_assignment` is empty for all 5 — they are not assigned to a front segment that adjoins the Phase 2 target ring. The corps lifecycle shows `active_operations: []` (Phase 2 already concluded). `last_completed_operation` is Phase 2.

This is decisive evidence for hypothesis H5 (staging gap) and H8 (planning_duration too short). Phase 2's catalog declared bucovaca as the staging point in *data* but the brigade-movement system never enacted that relocation, so attack-init found no brigade in the attacking-sector at t150 and silently stalled.

---

## Appendix B — Phase 1 vs Phase 2 structural diff

|  | Phase 1 (Cincar) | Phase 2 (Kupres Town) |
|---|---|---|
| `staging_osid` | `op:livno:livno_2` | `op:kupres:bucovaca` |
| `planning_duration` | (longer, ~5 turns) | 2 turns |
| Brigades in OOB at t132/t148 | All 5 present in Phase 1 (verified) | hvo_2nd_guard_mechanized — needs OOB-presence check |
| Axis count | 1 (`kupres_cincar_line`) | 2 (southern + northern) |
| Attack count | 2 | 0 |
| Outcome | partial (1/4 objectives) | failure (0/4 objectives) |
| recovery_reason | max_failures | no_logged_attempt |

`recovery_reason` is the diagnostic split: `max_failures` means the engine tried and failed; `no_logged_attempt` means the engine never tried.

## Appendix C — Downstream cascade impact

`docs/40_reports/proposals/20260522_WAVE_9_CINCAR_PHASE_2.md` cited Phase 2's role as a dependency node for:

- **Mistral 1** (t160 window): Requires `op:kupres:kupres_2 = HRHB`. **STILL BLOCKED at staging_access in n1969.**
- **Jajce 95** (t178 window): Requires Kupres-municipality HRHB control as a corridor anchor. **STILL BLOCKED.**

The Wave 9 hash delta IS a real change (new opportunity enumerated + AAR/history written), but the *territorial* outcome the cascade depends on did not materialize. -45 HRHB, +23 RBiH, +22 RS deltas vs jan1993 baseline are unchanged from n1968.

## Appendix D — Verification commands

```bash
# Confirm Phase 1 byte-identical
node -e "
const a=require('F:/A-War-Without-Victory/runs/apr1992_definitive_188w__210e69404d054959__w188_n1968/operation_aars.json').find(o=>o.operation_id.includes('Cincar / Kupres'));
const b=require('F:/A-War-Without-Victory/runs/apr1992_definitive_188w__210e69404d054959__w188_n1969/operation_aars.json').find(o=>o.operation_id.includes('Cincar / Kupres'));
console.log('p1 identical:', JSON.stringify(a)===JSON.stringify(b));
"

# Confirm Phase 2 zero-attack signature
node -e "
const p=require('F:/A-War-Without-Victory/runs/apr1992_definitive_188w__210e69404d054959__w188_n1969/operation_aars.json').find(o=>o.operation_id.includes('Cincar Phase 2'));
console.log('total_attacks:', p.total_attacks, 'recovery:', p.recovery_reason, 'fr:', p.force_ratio_estimate);
"

# Confirm kupres area controllers unchanged
node -e "
const f=require('F:/A-War-Without-Victory/runs/apr1992_definitive_188w__210e69404d054959__w188_n1969/final_save.json').political.political_controllers;
['bucovaca','kupres_2','donji_malovan','goravci','novo_selo_2'].forEach(s=>console.log('op:kupres:'+s,'=',f['op:kupres:'+s]));
"
```

---

## Conclusion

Wave 9's Phase 2 catalog entry is **structurally correct** (predicates pass, brigades bind, force_ratio healthy) but **operationally inert** because it stages from `op:kupres:bucovaca` while the brigades remain in Phase 1's Livno-departure stance. Eight execution turns elapsed without a single attack verb being issued. The hash delta vs n1968 is metadata-only (new history records); the cascade-critical kupres_2 capture did not occur.

**Recommend Option 1** (re-stage Phase 2 from `op:livno:livno_2`, lengthen planning_duration to 4) as the smallest-surface-area fix. Hand off to operations-expert + gameplay-programmer for the catalog edit; no engine changes required.
