# Late-1995 Scripted Operations Packet (Krivaja-95 / Stupčanica-95 / Mistral 2 / Sana)

**2026-06-18+ supersession:** The original Krivaja/Stupcanica fall-delivery framing in this report is historical. Current canon and implementation require `srebrenica_falls_1995` / `zepa_falls_1995` event receipts before the corresponding operation-context rows can trigger; Srebrenica/Zepa control remains event-owned. Krivaja-95 and Stupcanica-95 are operation-health / chronology / AAR context only. Do not schedule vrs_drina rescue, defender-power bypasses, recovery-window changes, or operation-execution fixes to make these operations flip Srebrenica/Zepa. Western late-1995 operation-health work for Sana/Mistral remains separate from Srebrenica/Zepa event receipt ownership.

**Date:** 2026-05-01
**Predecessors:**
- `docs/40_reports/implemented/20260501_TARGET_AWARE_SCENARIO_HEALTH_BASELINE.md` (recommended this packet)
- `docs/40_reports/implemented/20260430_DRINA_HERZEGOVINA_OVERGAIN_ROOT_CAUSE_PLAN.md` (Family-2 residual, separately documented)
- Ledger entry `[2026-05-01] data(calibration): complete date-specific painted-control target set`

**Scope:** Add four scripted late-1995 operations to close the Family-1 (missing scenario content) gap identified in the target-aware health baseline. **No engine code, combat tuning, OOB, painted target, or scenario init changes.**

---

## 1. What operations were added

Four new entries appended to `TRIGGERED_OPS` in `src/sim/combat/triggered_operations.ts`, each turn-gated ≥ 168 (Krivaja-95 earliest, July 1995):

| Operation | Faction | Primary corps | Trigger | Axes | Objectives |
|---|---|---|---|---|---|
| Operation Krivaja-95 | RS | vrs_drina | turn ≥ 168 | 1 (srebrenica_enclave) | 5 srebrenica:* OSIDs (donji_potocari_2, srebrenica_2, bostahovine_2, milacevici, suceska) |
| Operation Stupčanica-95 | RS | vrs_drina | turn ≥ 172 | 1 (zepa_pocket) | 1 OSID (op:rogatica:zepa_2) |
| Operation Mistral 2 | HRHB | hvo_main_staff | turn ≥ 175 | 2 (mistral_drvar via hvo_main_staff; mistral_sipovo via hvo_tomislavgrad) | 20 OSIDs in Glamoč halapic/stekerovci, Drvar town + sipovljani/prekaja, Bosansko Grahovo, Šipovo, Mrkonjić Grad |
| Operation Sana | RBiH | arbih_5th_corps | turn ≥ 175 | 3 (Krupa Una Valley, Bihać–Petrovac, Sanski Most + Ključ) | 31 OSIDs in Krupa rear, Bihać–Petrovac corridor, Sanski Most, Ključ |

All four are turn-gated ≥ 168 to protect early/mid-war runs. The 104w (apr1994) and 156w (apr1995) baselines never reach the gate, so their hashes are unchanged.

---

## 2. Historical timing/objective rationale

**Date math (April 1, 1992 = w0):**
- w168 ≈ June 24, 1995 → Krivaja-95 (Srebrenica fall, July 6–11 1995, BB2 p.587–611, ICTY Krstić et al.)
- w172 ≈ July 22, 1995 → Stupčanica-95 (Žepa fall, July 14–25 1995, BB2 p.611, ICTY Krstić)
- w175 ≈ Aug 12, 1995 → Mistral 2 (HV-HVO Drvar/Šipovo/Mrkonjić push, Sep 8–15 1995, BB2 p.629–642)
- w175 ≈ Aug 12, 1995 → Operation Sana (ARBiH 5th Corps Una-Sana liberation, Sep–Oct 1995, BB2 p.642–663)

**Objective derivation:**
Every objective OSID was cross-checked against `data/source/calibration/painted_control_apr1995.json` and `data/source/calibration/painted_control_oct1995.json` (both 712-OSID universe). Each objective is exactly an OSID that flipped between apr1995 and oct1995 in the painted truth — i.e., the OSIDs the simulation cannot capture without these scripted ops. Tests assert this property formally (see `tests/triggered_operations_late_1995.test.ts` "objectives are all painted-flipped").

**Glamoč scope note:** The Glamoč proper OSIDs (`glamoc_2`, `kovacevci_2`, `pribelja`, `vidimlije_2`) are painted=HRHB at apr1995 — this is the territorial residue of Operation Cincar 1994, which is **explicitly out of scope** for this packet per user prompt. Mistral 2 includes only the Glamoč OSIDs that flipped between apr1995 and oct1995 (`halapic`, `stekerovci_2`). A future Cincar 1994 packet (separate sign-off) would close the apr1995 Glamoč gap.

**Sensitive-history boundary:**
Krivaja-95 and Stupčanica-95 are now historical operation-context rows gated behind the event-owned `srebrenica_falls_1995` / `zepa_falls_1995` receipts. They do not model or deliver the territorial control flip. **Atrocity, narrative, and consequence mechanics are explicitly out of scope** for this packet. Adding them requires `/historian` + `/game-designer` sign-off per `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`.

---

## 3. Files changed

| File | Change |
|---|---|
| `src/sim/combat/triggered_operations.ts` | Added 4 entries to `TRIGGERED_OPS`. ~230 lines of definitions + comments. |
| `tests/triggered_operations.test.ts` | Updated catalog assertion from 4 → 8 ops with new chronological ordering. |
| `tests/triggered_operations_late_1995.test.ts` | New file. 12 tests across 3 describe blocks: catalog shape, turn-gate protection, objective validity. |
| `docs/40_reports/implemented/20260501_LATE_1995_SCRIPTED_OPS_PACKET.md` | This report. |
| `docs/PROJECT_LEDGER.md` | Behavioral-change entry. |
| `working-on.md` | Continuation notes (untracked). |

No engine code, combat code, OOB, painted target file, or scenario init changed.

---

## 4. Tests and run hashes

### Tests (27/27 pass)

```
✓ tests/triggered_operations.test.ts (15 tests, 11ms)
  ✓ defines the current triggered operation catalog (now 8 ops)
  ✓ keeps Posavina/Herzegovina shape contracts
  ✓ injects Posavina/Cerska/Kotor/Herzegovina at correct triggers
  ✓ does not inject before triggers
  ✓ respects decline cooldown / permanent dismissal
  ✓ filters already-controlled objectives
✓ tests/triggered_operations_late_1995.test.ts (12 tests, 5ms)
  ✓ catalog: contains four late-1995 reversal ops after legacy four
  ✓ Krivaja-95 / Stupčanica-95 / Mistral 2 / Sana shape contracts
  ✓ no late-1995 op trigger returns true at any turn < 168
  ✓ all late-1995 op gates are >= 168
  ✓ Krivaja-95 objectives = apr1995=RBiH → oct1995=RS Srebrenica enclave
  ✓ Stupčanica-95 objective = apr1995=RBiH → oct1995=RS (zepa_2)
  ✓ Mistral 2 objectives painted=HRHB at oct1995
  ✓ Sana objectives painted=RBiH at oct1995
  ✓ deterministic objective ordering, no duplicates
```

### Scenario validation

| Run | Weeks | Hash | vs baseline | Verdict |
|---|---|---|---|---|
| n1591 | 104 | `6b6daa39dcaf66f7` | **= baseline `6b6daa39dcaf66f7` ✓** | Determinism preserved (turn gate ≥168 protects early-war) |
| n1592 | 156 | `57f742a558d8e619` | **= baseline `57f742a558d8e619` ✓** | Determinism preserved (run ends at w156, Krivaja gate ≥168 never fires) |
| n1593 | 183 | `6a6570c525ae24a9` | ≠ baseline `15f9740e253b42c2` | State evolved (ops accepted/run); territorial outcome unchanged (see §5) |

**Type checking (`npx tsc --noEmit`):** clean.

---

## 5. Oct1995 improvement or failure explanation

**Headline:** 183w n1593 painted-vs-sim numbers are **identical** to baseline n1590: 70.9% count / **63.2% area-weighted**, KRAJINA 60.0%, DRINA 60.6%, HERZEGOVINA 42.9%. The four new ops fire correctly but produce 0 captures.

### Per-op behavior (from `runs/.../n1593/operation_aars.json`, final-save active operations, and `op_injection_warnings`)

| Op | Trigger | Accepted? | Started | Ended | Attacks / attempts | Captures | Diagnosis |
|---|---|---|---|---|---|---|---|
| Krivaja-95 | YES (t168) | **NO** | n/a | n/a | n/a | n/a | 3 of 4 brigades (`rs_1st_zvornik`, `rs_5th_podrinje`, `rs_skelani_battalion`) already `status='inactive'` pre-fire. Only `rs_1st_bratunac` eligible. < MIN_OPERATION_PARTICIPANTS=2 → injection blocked. |
| Stupčanica-95 | YES (t172) | YES | t172 | t176 | **0** | 0 | Op fired and ran for 4 turns; brigades selected; planning_duration=3 + 1 turn execution; no attacks delivered. |
| Mistral 2 | YES (t175) | YES | t175 | t182 | **0** | 0 | Op fired and ran for 7 turns; 20 objectives across 2 axes; completed AAR records no attacks. |
| Sana | YES (t175) | YES | t175 | active recovery at t183 | **7 final-save attempts, no completed AAR yet** | 0 | Op fired and entered recovery by t183; final active operation has `attack_attempt_count=7` across 3 axes but no captures. |

### Root cause classification

Two separable owners explain the 0-captures result:

#### Owner A — Krivaja-95: Family-2 vrs_drina structural brigade collapse (already documented, prior packet)

`op_injection_warnings` for t168 + t171 confirm three of four assigned brigades are already destroyed before Krivaja-95 fires. This is the same vrs_drina collapse documented in `docs/40_reports/implemented/20260430_DRINA_HERZEGOVINA_OVERGAIN_ROOT_CAUSE_PLAN.md` (four-owner stop-at-plan). The Krivaja-95 op definition is correct; the obstacle is upstream brigade survival.

`MIN_OPERATION_PARTICIPANTS=2` is correct as designed — lowering it would set bad precedent and break invariants for all other ops. The fix belongs upstream (vrs_drina rescue), in a separate packet with its own sign-off.

#### Owner B — Stupčanica-95 / Mistral 2 / Sana: late-war scripted-op execution-stage residual (pre-existing, not introduced by this packet)

The new ops match the **identical execution-stage outcome shape** of the pre-existing **Operation Cerska-Kamenica** entry in the same file, which has been in the codebase as a triggered op (turn ≥40) and produces:

```
Operation Cerska-Kamenica: started=40, ended=44, attempts=0, captured=0, provenance=no_objectives_held
```

Cerska-Kamenica is a known late-1992/early-1993 op that fires correctly but executes 0 attacks. Stupčanica-95 and Mistral 2 match that no-attack AAR shape. Sana differs slightly: by t183 it has no completed AAR yet, but the final active operation is already in recovery with 7 execution attempts and 0 captures. The common residual is therefore "scripted ops do not deliver objective captures," with two likely subfamilies to separate in the next packet: no attack orders at all (Cerska/Stupčanica/Mistral) versus attacks/approach attempts that fail to capture (Sana).

This is **not a packet defect** — it is the engine state at fire time interacting with the existing operation execution AI. The new ops exposed the residual more clearly because the definitions now exist and fire on schedule.

### Determinism and causality both hold

- `triggered_operations_accepted` shows the new ops were accepted on schedule (Stupčanica at t172, Mistral 2 + Sana at t175).
- `political.control_events` log no late-1995-op-mediated flips (mechanism field is `combat`/`consolidation`/`event` only); no spurious flips.
- AAR rows for Stupčanica + Mistral 2 exist with valid axis_summaries, capture_provenance, casualty rows (all zero), participating_brigade lists, and started/ended_turn timestamps. Sana remains in final-save active operation state at t183 with 7 attempts and 0 captures.
- Hash differs from baseline because op injection mutates `corps_command[*].active_operations`, `triggered_operations_accepted`, and `operation_history` even when 0 attacks occur. State evolved differently; territorial outcome unchanged.

---

## 6. Remaining mismatch families, separated from engine bugs

**Family 1A — Krajina (Storm/Maestral) — UNCHANGED:** Operation Sana is now defined and fires; territorial flip pending Owner B fix (late-war execution AI). When Owner B is repaired, Sana captures should bring KRAJINA from 60.0% area toward painted target ~95%+.

**Family 1B — Herzegovina southwest (Mistral) — UNCHANGED:** Operation Mistral 2 is now defined and fires; territorial flip pending Owner B fix.

**Family 1C — Drina enclaves (Krivaja/Stupčanica) — SUPERSEDED FOR FALL DELIVERY 2026-06-18+:**
- Stupcanica-95 and Krivaja-95 may remain useful operation-health, chronology, and AAR context.
- They are not Srebrenica/Zepa fall-delivery blockers. The fall receipts are event-owned through `srebrenica_falls_1995` and `zepa_falls_1995`.

**Family 2 — Herzegovina south persistent RS overgain + Goražde 1/2 — UNCHANGED:** Documented stop-at-plan in prior packet. Not in this packet's scope.

**Family 1 side-effect — 156w intel-system fail "0 offensive_signs after turn 20" — UNCHANGED:** Detector window noise that should clear once Owner A + B unblock late-war ops with actual attacks.

**No new engine bugs surfaced.** The new ops match the existing Cerska-Kamenica execution shape exactly. The engine substrate (determinism, causality, date-awareness) holds across all three target dates.

### Owner A summary (separate packet, superseded for Srebrenica/Zepa fall delivery)
- File: out-of-scope (engine code change to op execution AI, OR upstream vrs_drina rescue per prior packet)
- Current routing: do not pursue this owner to make Krivaja-95 deliver the Srebrenica fall. Any vrs_drina or operation-execution work must be scoped as operation-health/AAR/context only, with Srebrenica/Zepa fall receipts left event-owned.

### Owner B summary (separate packet)
- File: probably `src/sim/combat/operation_preparation.ts` + `attack_resolution_osid.ts` (late-war scripted-op execution-stage AI)
- Required sign-off: `/operations-expert` (lead) + `/qa-engineer` (cross-faction calibration sweep)
- Current routing: valid for western late-war operation-health work such as Sana/Mistral. Do not use it as a Srebrenica/Zepa fall-delivery lane.
- Indicator that this is the right owner for non-sensitive western operation health: existing Cerska-Kamenica from t40 also produces 0 captures with `attempts=0` despite fitting all the same op-infrastructure rules my four new ops follow.

---

## 7. Known scope-restricted limitation

`checkTriggeredOperations` in `triggered_operations.ts:447` has a hardcoded `assignOperationCommander(state, def.primary_corps, 'RS')`. RS ops (Krivaja-95, Stupčanica-95) get correct commander selection. Federation ops (Sana, Mistral 2) call `selectOperationCommander(state, corps, 'RS')` which returns no candidate (no RS officer matches an arbih_/hvo_ corps), so those ops fire **without** an assigned commander_officer_id. Territorial behavior is unaffected; officer-effects default to neutral. Repairing the hardcode is engine code, explicitly out of this packet's scope per user prompt.

This is documented in the catalog comment block above the new ops.

---

## 8. Validation summary

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ clean |
| `vitest tests/triggered_operations_late_1995.test.ts` | ✅ 12/12 pass |
| `vitest tests/triggered_operations.test.ts` (existing, with catalog count update) | ✅ 15/15 pass |
| `node tools/compare_painted_vs_sim.cjs --list-targets` | ✅ all 4 targets present, 712-OSID universe-aligned |
| 104w n1591 hash | `6b6daa39dcaf66f7` = baseline ✓ |
| 156w n1592 hash | `57f742a558d8e619` = baseline ✓ |
| 183w n1593 hash | `6a6570c525ae24a9` (changed; ops fire and state evolves) |
| 183w `compare_painted_vs_sim --target oct1995` | 70.9% count / 63.2% area (unchanged vs baseline; flip pending Owner A + B) |
| 183w `diagnose_run` | 1 ERR (Goražde, Family-2) / 32 WARN (matches baseline pattern) |
| 183w `validate_run_consistency` | 23 fails (matches baseline) |

---

## 9. Determinism statement

- No `Math.random()`, no `Date.now()`, no timestamps, no nondeterministic iteration.
- All four operation definitions use stable axis ordering (axis_id sorted alphabetically within each op).
- Objective lists preserve declared order for stable AAR output.
- Brigade lists preserve declared order; the engine's existing `strictCompare` sort runs at injection time.
- Painted target files unchanged; OOB unchanged; scenario init unchanged.
- The 104w determinism check (n1591 = n1588 hash exactly) confirms zero early-war regression.

---

## 10. Items explicitly NOT fixed (this packet)

1. **Owner A (Krivaja-95 brigade attrition):** superseded as a Srebrenica fall-delivery lane; any future work is operation-health/AAR/context only unless a new Section 6-reviewed design explicitly changes receipt ownership.
2. **Owner B (late-war scripted-op execution / capture delivery):** valid for western late-war operation health such as Mistral/Sana; not a Srebrenica/Zepa fall-delivery lane.
3. **Cincar 1994:** apr1995 Glamoč proper, Kupres muni — out of scope per user prompt.
4. **Sensitive-history consequences for Krivaja-95 + Stupčanica-95:** atrocity / narrative / scoring mechanics — out of scope; territorial control only.
5. **Hardcoded `'RS'` faction in `assignOperationCommander` call:** engine code, out of scope. Documented in op comment block.
6. **Family-2 Herzegovina south structural residual + Goražde 1/2:** prior packet's stop-at-plan.

---

## 11. Recommended next packet

**2026-06-18+ replacement:** Owner B remains a valid operation-health follow-up for western late-war work such as Sana and Mistral. Krivaja-95 and Stupcanica-95 are not Srebrenica/Zepa fall-delivery blockers. Do not schedule vrs_drina rescue, defender-power bypasses, recovery-window changes, or operation-execution fixes to make these operations flip Srebrenica/Zepa. The correct Srebrenica/Zepa lane is event-receipt hygiene plus rupture observation of the resulting control state.

---

## 12. Commit hash

**Committed:** `d72a51ed` on main (5 files: 4 source/test + this report + ledger entry).
