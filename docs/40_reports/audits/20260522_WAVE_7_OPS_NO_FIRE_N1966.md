# Wave 7 HRHB Ops — Why mistral_1_95 and jajce_95 Did Not Fire in n1966

**Date:** 2026-05-22
**Run:** `apr1992_definitive_188w__210e69404d054959__w188_n1966`
**Hash:** `ccc07196fb899651` (vs n1965 `39d270f19a04e84f`)
**Authored by:** scenario-creator-runner-tester (autonomous dispatch)
**Predecessor memo:** `docs/40_reports/proposals/20260522_HRHB_OPS_AUTHORED.md`
**Scope:** Forensic SCRT audit. Read-only. No code edits.

---

## 0. Executive verdict (one sentence)

Both `mistral_1_95` and `jajce_95` were proposed, evaluated, and blocked on every turn of their respective windows by the **same root cause**: the prerequisite `staging_access` axis fails because `op:kupres:kupres_2` remained RS-controlled for the entire 188-turn run, because the upstream `kupres_cincar_94` operation (Cincar / Kupres) launched at t=132 but did_not_launch with `recovery_reason: defender_power_too_high`, leaving Kupres in RS hands.

---

## 1. Lifecycle evidence

### 1.1 mistral_1_95 — proposed YES, blocked all 11 turns

**Source JSON:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1966/final_save.json`
**Path:** `military.operation_opportunity_traces[*]` where `opportunity_id === 'mistral_1_95'`

11 trace entries, t=160 through t=170 inclusive, every one with `event: "blocked"`:

```
{
  "event":"blocked",
  "failed_optional_axes":[],
  "failed_required_axes":[
    {"axis":"staging_access","reason":"Kupres dependency anchors are not open for Mistral 1"}
  ],
  "min_optional_axes":2,
  "opportunity_id":"mistral_1_95",
  "optional_green_count":4,
  "turn":160  // … through 170
}
```

`optional_green_count: 4` is significant — `logistics`, `weather_season`, `commander_confidence`, and `force_quality` are all green. The single required axis that fails is `staging_access`. None of the other required axes (`date_window`, `political_authorization`, `corps_readiness`, `enemy_weakness`, `alliance_context`) is in `failed_required_axes`, which means **all of them passed every turn**.

**Diagnostic mirror:** `military.operation_opportunity_diagnostics[*]` — same 11 entries, same payload. The diagnostic stream is a fork of the trace stream that strips the `event` field.

**Lifecycle state:** never reaches `eligible` → never gets a `proposal_id` → never enters `operation_opportunities[]` → no resolution row → no entry in `operation_history[]`. Death point: predicate evaluation in the catalog, before any approval/spawn pathway.

### 1.2 jajce_95 — proposed YES, blocked all 7 turns

Same `military.operation_opportunity_traces[*]` path, `opportunity_id === 'jajce_95'`.

7 trace entries, t=178 through t=184 inclusive, every one with `event: "blocked"`:

```
{
  "event":"blocked",
  "failed_optional_axes":[],
  "failed_required_axes":[
    {"axis":"staging_access","reason":"Jajce staging anchors (Livno/Tomislavgrad/Kupres) are not all HRHB-held"}
  ],
  "min_optional_axes":2,
  "opportunity_id":"jajce_95",
  "optional_green_count":4,
  "turn":178  // … through 184
}
```

`optional_green_count: 4` — same shape as Mistral 1. Single failing required axis: `staging_access`. All other required axes (`date_window`, `political_authorization`, `corps_readiness`, `enemy_weakness`, `alliance_context`) pass every turn.

**Lifecycle state:** identical pattern — proposed and evaluated, blocked at predicate, never elevated to `eligible`, no resolution, no history entry.

---

## 2. Predicate-level diagnosis

### 2.1 The failing axis: staging_access

**Source (catalog):** `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts`

#### Mistral 1 staging anchors (L341-352)

```typescript
const MISTRAL_1_STAGING_ANCHORS = [
    STAGING_LIVNO_MISI,            // 'op:livno:misi_2'
    STAGING_LIVNO,                 // 'op:livno:livno_2'
    STAGING_TOMISLAVGRAD,          // 'op:duvno:tomislavgrad_2'
];
const MISTRAL_1_KUPRES_DEPENDENCY_ANCHORS = [
    'op:kupres:kupres_2',
    'op:kupres:bucovaca',
];
```

`stagingAccessMistral1` (L439-453) checks both lists. The first loop tolerates `null` controllers but rejects non-HRHB; the second (Kupres) requires `=== 'HRHB'` strictly.

**Actual controllers at t=160-170 (final state is t=188 but Kupres never flips after t=132):**

| OSID | n1966 final | Required | Pass? |
|---|---|---|---|
| `op:livno:misi_2` | HRHB | HRHB | OK |
| `op:livno:livno_2` | HRHB | HRHB | OK |
| `op:duvno:tomislavgrad_2` | HRHB | HRHB | OK |
| `op:kupres:kupres_2` | **RS** | HRHB | **FAIL** |
| `op:kupres:bucovaca` | **RS** | HRHB | **FAIL** |

The Kupres loop hits the first non-HRHB controller and returns `"Kupres dependency anchors are not open for Mistral 1"` — matches diagnostic verbatim.

#### Jajce staging anchors (L587-591)

```typescript
const JAJCE_STAGING_ANCHORS = [
    STAGING_LIVNO,                 // 'op:livno:livno_2'
    STAGING_TOMISLAVGRAD,          // 'op:duvno:tomislavgrad_2'
    'op:kupres:kupres_2',
];
```

`stagingAccessJajce` (L653-661) requires all three strictly `=== 'HRHB'`. Same Kupres failure flips the gate.

| OSID | n1966 final | Required | Pass? |
|---|---|---|---|
| `op:livno:livno_2` | HRHB | HRHB | OK |
| `op:duvno:tomislavgrad_2` | HRHB | HRHB | OK |
| `op:kupres:kupres_2` | **RS** | HRHB | **FAIL** |

### 2.2 All other required predicates pass

Per the trace `failed_required_axes` arrays containing only `staging_access`, and per direct GameState reads:

| Predicate | Mistral 1 (t=160-170) | Jajce (t=178-184) | Notes |
|---|---|---|---|
| `date_window` | PASS | PASS | engine evaluated those turns; 11 + 7 trace rows confirm |
| `political_authorization` | PASS | PASS | `political.war_alliance_rbih_hrhb = 1.0` (≥0.50 floor); `vienna_accepted.HRHB = true`; Washington check satisfied via federation state |
| `corps_readiness` | PASS | PASS | both `hvo_main_staff` and `hvo_tomislavgrad` corps_command entries present; readiness ≥0.36 (Mistral) / ≥0.32 (Jajce) |
| `enemy_weakness` | PASS | PASS | all 8 objectives RS-held for each op (see §3); VRS Krajina trajectory weakness ≥0.20 / ≥0.25 green |
| `alliance_context` | PASS (pre-Storm) | PASS (post-Storm) | `meta.operation_storm_turn = 174`. Mistral 1 window 160-170 is BEFORE 174 → `isPreStormWesternTheater(state) = true`. Jajce window 178-184 is AFTER 174 → `isWesternTheaterRuptured(state) = true`. Both inverted/non-inverted gates satisfied. |

The 4 optional axes (`logistics`, `weather_season`, `commander_confidence`, `force_quality`) each scored green every turn for both ops (`optional_green_count: 4`, comfortably above `min_optional_axes: 2`).

**Conclusion:** the catalog authoring is correct on 9 of 10 axes for Mistral 1 and 9 of 10 axes for Jajce. The single failing axis (`staging_access`) is a real, well-modeled prerequisite — Mistral 1 historically launched FROM the Kupres-Livno line, and Jajce was reached via the Kupres shoulder. The gate is properly authored. The bug is upstream.

---

## 3. State of the 16 new objective OSIDs

**Path:** `political.political_controllers[*]`

### Mistral 1 objectives — Grahovo (4)

| OSID | n1966 final | Painted Oct 1995 ref |
|---|---|---|
| `op:bosansko_grahovo:crni_lug` | RS | HRHB (painted flip expected) |
| `op:bosansko_grahovo:malesevci` | RS | HRHB |
| `op:bosansko_grahovo:bosansko_grahovo_2` | RS | HRHB |
| `op:bosansko_grahovo:ugarci` | RS | HRHB |

### Mistral 1 objectives — Glamoč (4)

| OSID | n1966 final | Painted Oct 1995 ref |
|---|---|---|
| `op:glamoc:halapic` | RS | HRHB |
| `op:glamoc:stekerovci_2` | RS | HRHB |
| `op:glamoc:vidimlije_2` | RS | HRHB |
| `op:glamoc:glamoc_2` | RS | HRHB |

### Jajce objectives (8)

| OSID | n1966 final | Painted Oct 1995 ref |
|---|---|---|
| `op:jajce:barevo_2` | RS | HRHB |
| `op:jajce:bravnice` | RS | HRHB |
| `op:jajce:jajce_3` | RS | HRHB |
| `op:jajce:jezero_2` | RS | HRHB |
| `op:jajce:lupnica` | RS | HRHB |
| `op:jajce:prisoje` | RS | HRHB |
| `op:jajce:vinac_2` | RS | HRHB |
| `op:mrkonjic_grad:podrasnica_2` | RS | HRHB |

**Total:** 16/16 objectives remain RS — exactly matching the -16 missing HRHB OSIDs the proposal memo projected would close once these ops fire. None of the 16 was flipped by any other mechanism (sector attack, op-of-opportunity, peace transfer, militia bleed); they were never touched.

---

## 4. The upstream root cause: Cincar/Kupres failed

**Path:** `operation_history[]` where `operation_id` contains `Cincar` or `kupres`

```json
{
  "operation_id": "hvo_tomislavgrad:Operation Cincar / Kupres:t132",
  "operation_name": "Operation Cincar / Kupres",
  "faction": "HRHB",
  "corps_id": "hvo_tomislavgrad",
  "started_turn": 132,
  "ended_turn": 134,
  "duration_turns": 2,
  "outcome": "failure",
  "recovery_reason": "defender_power_too_high",
  "objectives_targeted": ["op:kupres:bucovaca","op:kupres:donji_malovan","op:kupres:novo_selo_2"],
  "objectives_captured": [],
  "objectives_held_without_logged_capture": [],
  "total_attacks": 0,
  "force_ratio_estimate": 0.12662319264357655,
  "participating_brigades": ["hrhb_kralj_petar_kreimir_iv_brigade","hrhb_kralj_tomislav_brigade"],
  "initial_strength": 3600,
  "final_strength": 3600,
  "capture_provenance": "no_objectives_held",
  "grade": {"stars":3,"verdict":"Indecisive"}
}
```

**Diagnosis of Cincar failure:**
- Only **2 brigades** assigned (`hrhb_kralj_petar_kreimir_iv_brigade`, `hrhb_kralj_tomislav_brigade`); total strength 3600.
- `force_ratio_estimate: 0.127` — attacker about 1/8 of defender power.
- `total_attacks: 0` — never engaged. The op was aborted in the planning phase by `defender_power_too_high`.
- `objectives_targeted` notably **does not include `op:kupres:kupres_2`** — Cincar in the current catalog targets only `bucovaca`, `donji_malovan`, `novo_selo_2`. Even a "successful" Cincar in this catalog would not flip `op:kupres:kupres_2` (the village/town anchor) — only the surrounding three.

**This is a second, latent gap:** Mistral 1 / Jajce gate on `op:kupres:kupres_2` HRHB, but the Cincar catalog op never targets that OSID. Even hypothetically had Cincar succeeded, the kupres_2 anchor would still be RS unless some other op or pathway flipped it.

**Per Kupres OSID list:**
```
op:kupres:bucovaca       RS
op:kupres:donji_malovan  RS
op:kupres:goravci        RS
op:kupres:kupres_2       RS
op:kupres:novo_selo_2    RS
```
All 5 Kupres OSIDs remain RS at w188. No HRHB activity in the cluster the entire run.

---

## 5. HRHB operation_history (all 2 entries)

**Path:** `operation_history[?(@.faction === 'HRHB')]` — 2 entries.

| op_id | corps | start | end | outcome | exit_reason / verdict | objectives captured |
|---|---|---|---|---|---|---|
| `hvo_southeast_herzegovina:Operation Jackal:t8` | hvo_southeast_herzegovina | 8 | 14 | success | Brilliant Victory (5★) | `op:mostar:hodbina_2`, `op:stolac:rotimlja_2` |
| `hvo_tomislavgrad:Operation Cincar / Kupres:t132` | hvo_tomislavgrad | 132 | 134 | failure | defender_power_too_high (3★ Indecisive) | none |

**Total HVO ops launched: 2. Total HVO objectives captured: 2 (both early-war Op Jackal). Zero HVO operations after t=134 across the remaining 54 turns of the 188-turn run.** This is the central HRHB structural deficit — 2 HVO operations across 188 turns covering only Op Jackal + a failed Cincar.

---

## 6. Why the hash changed (n1965 → n1966) despite identical control counts

User's question: counts_by_controller is byte-identical between n1965 and n1966 (HRHB 78, RBiH 293, RS 341), yet hash shifted from `39d270f19a04e84f` to `ccc07196fb899651`. Where's the delta?

**Direct comparison (n1965 vs n1966 final_save.json):**

| Field | n1965 | n1966 | Delta |
|---|---|---|---|
| `political.political_controllers` (RS/RBiH/HRHB) | 341/293/78 | 341/293/78 | identical |
| `operation_history.length` | 47 | 47 | identical |
| `operation_history.operation_id` set (canonical sort) | same | same | identical |
| `military.operation_opportunities[].opportunity_id` (10 entries) | same | same | identical |
| `military.operation_opportunity_resolutions[].opportunity_id` (10) | same | same | identical |
| `military.operation_opportunity_diagnostics.length` | 28 | 46 | **+18** |
| `military.operation_opportunity_traces.length` | 48 | 66 | **+18** |
| diagnostic IDs | `mistral_2_95, sana_95_follow_on` | `jajce_95, mistral_1_95, mistral_2_95, sana_95_follow_on` | **+2 new IDs** |
| trace IDs | 12 ops | 14 ops (adds `jajce_95`, `mistral_1_95`) | **+2 new IDs** |

**Verdict:** The hash difference is entirely in the **audit streams** — `operation_opportunity_traces` and `operation_opportunity_diagnostics`. n1966 logs 11 mistral_1_95-blocked entries (t=160-170) + 7 jajce_95-blocked entries (t=178-184), totalling 18 new trace rows and 18 new diagnostic rows. These get hashed.

No territorial behavior changed. No new ops fired. No brigades moved differently. The Wave 7 catalog additions are observable **only** in the proposal/diagnostic audit logs as `blocked` events. The "real behavior change" between n1965 and n1966 is the engine *evaluating* two new opportunities and recording them as failed — that's it.

This is consistent with both ops blocking on a gate that depended on a state (`op:kupres:kupres_2 = HRHB`) that was never achieved in either run. The presence/absence of the new catalog entries only adds proposal-evaluation log lines; with no successful gate-flip, there's no downstream divergence.

---

## 7. Predicate compliance summary

| Op | date_window | political_auth | corps_readiness | logistics | staging_access | weather | commander | enemy_weakness | alliance_context | force_quality | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `mistral_1_95` | OK | OK (alliance=1.0) | OK | OK | **FAIL Kupres** | OK | OK | OK (8 RS-held) | OK (pre-Storm t<174) | OK | Blocked on staging |
| `jajce_95` | OK | OK (alliance=1.0) | OK | OK | **FAIL Kupres** | OK | OK | OK (8 RS-held) | OK (post-Storm t>174) | OK | Blocked on staging |

`optional_green_count: 4` for both means all 4 optional predicates passed every turn — comfortably above `min_optional_axes: 2`.

---

## 8. Smallest-surface-area fixes to enable the ops

In order of surface area (smallest first):

### Option A: Lower Mistral 1 / Jajce staging requirements — DO NOT DO

Remove the Kupres dependency from `MISTRAL_1_KUPRES_DEPENDENCY_ANCHORS` and `JAJCE_STAGING_ANCHORS`. This is the smallest code change (~3 lines) but **violates the historical model**: Mistral 1 was the operational follow-on to Cincar, staged FROM the Kupres-Livno line. Removing the gate would let HRHB launch Mistral 1 from Tomislavgrad even with Kupres still in RS hands — ahistorical and breaks the chain of operations.

Reject this.

### Option B: Fix Cincar (kupres_cincar_94) to actually succeed — RECOMMENDED FIRST FIX

Cincar failed because:
1. Only 2 HVO brigades were assigned (`hrhb_kralj_petar_kreimir_iv_brigade`, `hrhb_kralj_tomislav_brigade`) — force ratio 0.127.
2. The catalog entry's brigade pool is too thin to plausibly take Kupres.
3. `total_attacks: 0`, abandoned in planning by `defender_power_too_high`.

Action: investigate `kupres_cincar_94` in `operation_opportunity_catalog_federation_western_bosnia.ts` (or wherever the Cincar def lives). Augment brigades pool — historically Cincar/Kupres 1994 involved HV reserve loans, hvo_1st_guard_abb, and HVO Tomislavgrad maneuver brigades. Adding 2-4 more brigades + ensuring `op:kupres:kupres_2` is in the `objectives_targeted` list (currently absent) would address both failure modes.

Surface area: ~10-30 lines in one catalog file. No engine changes. Restores the historical Cincar → Mistral 1 → Jajce cascade.

### Option C: Add `op:kupres:kupres_2` to Cincar objectives_targeted — MINIMAL ADDITION

Even if Cincar still fails to take all targets, ensuring `kupres_2` is in the target list at least gives it a chance. Currently the Cincar catalog targets only `bucovaca`, `donji_malovan`, `novo_selo_2` — the village/town anchor `kupres_2` is omitted entirely. This is a 1-line addition to the objectives array.

Surface area: 1-3 lines. **This is required regardless** — there's no pathway in the current catalog to flip `op:kupres:kupres_2` at all.

### Option D: Refer to fallback staging shoulder for Mistral 1 — secondary

If Cincar continues to fail, Mistral 1's Glamoč axis could in principle stage from `op:duvno:tomislavgrad_2` alone without requiring Kupres-line possession (the Tomislavgrad-Šujica road head). The catalog currently requires both Kupres anchors regardless of axis. A relaxation that requires Kupres only for the Grahovo axis (which historically did stage from Livno-Kupres) but allows the Glamoč axis to run from Tomislavgrad shoulder alone would partially enable Mistral 1 even on Cincar failure. This is a more invasive predicate split and should be deferred until B+C is tried.

### Combined minimal fix

Recommended ordering for next iteration:

1. **Patch `kupres_cincar_94` catalog entry** (Option B+C): add `op:kupres:kupres_2` to objectives_targeted; widen the brigade pool to a historically plausible Cincar force (4-6 brigades including hvo_1st_guard_abb / HV loan brigades).
2. **Rerun n1967**. Verify Cincar launches and flips Kupres OSIDs.
3. If Cincar still struggles, also touch the readiness/coordination floor on Cincar (currently presumably ≥0.30) to allow more permissive launch — but only after force pool widening is verified insufficient.

Out of scope for this SCRT memo. Hand off to operations-expert.

---

## 9. Hand-off signals

| To | Why |
|---|---|
| `/operations-expert` | Re-balance `kupres_cincar_94` (force pool, objectives_targeted including `op:kupres:kupres_2`, optionally readiness floor). MUST be consulted before any change per the mandatory-consultation rule. |
| `/scenario-creator-runner-tester` (self, after operations-expert patch) | Rerun and verify Cincar→Mistral 1→Jajce cascade in n1967 onwards. |
| `/canon-compliance-reviewer` | Confirm the proposed Cincar widening is consistent with BB v2 / ICTY records of the actual Cincar 1994 force composition. |
| `/historian` | Cross-check OOB plausibility for Cincar 1994 brigade list (HV loan brigades, hvo_1st_guard_abb assignment to Tomislavgrad axis in late 1994). |

---

## 10. Sacred-rules and process compliance

- **Read-only**: no code changes, no data writes. Only this memo authored.
- **Determinism**: investigation used direct JSON.parse of `final_save.json` and source-file reads via the Read tool. No timestamp-derived data, no `Math.random`, no nondeterministic ordering.
- **Initial OSID controllers untouched**: the proposed fix (widening Cincar) affects catalog op definitions, not initial controllers.
- **No `avoided_osids_by_faction` recommended.**
- **Canonical faction IDs only**: HRHB, RBiH, RS.
- **OSID format compliance**: all cited OSIDs are `op:<municipality>:<slug>` format.

---

## 11. Reportback (final structured summary)

**(a) Did mistral_1_95 propose? YES.** 11 trace rows (`military.operation_opportunity_traces[*]`) at t=160-170, each `event: blocked`, `optional_green_count: 4`, `failed_required_axes: [{axis: staging_access, reason: "Kupres dependency anchors are not open for Mistral 1"}]`.

**(b) Did jajce_95 propose? YES.** 7 trace rows at t=178-184, each `event: blocked`, `optional_green_count: 4`, `failed_required_axes: [{axis: staging_access, reason: "Jajce staging anchors (Livno/Tomislavgrad/Kupres) are not all HRHB-held"}]`.

**(c) Failing predicate per op:**
- `mistral_1_95`: `staging_access` — specifically `op:kupres:kupres_2` and `op:kupres:bucovaca` both RS-controlled. All other 9 predicates pass every turn (4 optional all green, 5 required all green except staging_access).
- `jajce_95`: `staging_access` — specifically `op:kupres:kupres_2` RS-controlled (Livno and Tomislavgrad are HRHB). All other 9 predicates pass every turn.

Common root cause: `kupres_cincar_94` ran at t=132-134 with only 2 brigades, force_ratio 0.127, `recovery_reason: defender_power_too_high`, `total_attacks: 0`, `objectives_captured: []` — Kupres cluster remained 100% RS the entire 188-turn run.

**(d) Smallest-surface-area fix to enable either op:**

Two-line catalog patch on `kupres_cincar_94`:
1. Add `op:kupres:kupres_2` to its `objectives_targeted` list (currently absent — see §4).
2. Widen the brigades pool from 2 to 4-6 to make `force_ratio_estimate` plausibly >0.5.

Surface area: ~10-30 lines in one file. No engine changes. Hand off to `/operations-expert` (mandatory consultation before any operation change).

Reject: removing the Kupres dependency from Mistral 1 / Jajce gates — historically incorrect and breaks the operational cascade.

**(e) Memo size:** verified separately via `wc -c`.

**(f) One-sentence verdict:** Wave 7 ops are catalog-correct on 9/10 predicates each but blocked on `staging_access` because the prerequisite `kupres_cincar_94` failed at t=132 (force_ratio 0.127, 2 brigades, zero attacks) and Kupres stayed RS; **fix Cincar, then Mistral 1 / Jajce will gate-open automatically**.
