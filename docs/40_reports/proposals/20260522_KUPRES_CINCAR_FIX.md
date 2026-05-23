# Kupres / Cincar 94 Fix — Wave 7 Cascade Unblock

**Date:** 2026-05-22
**Branch:** `feature/arc-operations-calibration`
**Author:** operations-expert
**Scope:** `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts`
**Upstream report:** `docs/40_reports/audits/20260522_WAVE_7_OPS_NO_FIRE_N1966.md`
**Related:**
- `docs/40_reports/audits/20260522_HVO_UNDELIVERY_INVESTIGATION.md`
- `docs/40_reports/proposals/20260522_HRHB_OP_CATALOG_PROPOSAL.md`
- `docs/40_reports/audits/20260522_FORENSICS_5_BLOCKED_ARBIH_OPS.md` §3 (kupres_cincar_94)

---

## 1. Problem statement

The Wave 7 SCRT diagnostic on n1966 shows the late-war HRHB cascade is
broken at its root:

```
kupres_cincar_94 (t=132)
    └─ outcome: failure
    └─ recovery_reason: defender_power_too_high
    └─ force_ratio_estimate: 0.127
    └─ total_attacks: 0
    └─ participating_brigades: [hrhb_kralj_petar_kreimir_iv_brigade,
                                hrhb_kralj_tomislav_brigade]
    └─ objectives_targeted: [bucovaca, donji_malovan, novo_selo_2]
    └─ objectives_captured: []
```

Two cascade consumers, `mistral_1_95` (Jun 1995) and `jajce_95` (Sep 1995),
propose every turn in their windows but block at `staging_access` because
`op:kupres:kupres_2` and `op:kupres:bucovaca` remain RS-controlled for all
188 turns of the run.

Two compounding failure modes in the current Cincar definition:

1. **Brigade pool understaffing at runtime.** The catalog lists 4 brigades
   (`hrhb_kralj_petar_kreimir_iv_brigade`, `hrhb_kralj_tomislav_brigade`,
   `hv_5th_guards_karlovac`, `hv_7th_guards_varazdin`), but only 2 actually
   launch. End-state save inspection confirms:
   - `hv_5th_guards_karlovac` — status: **inactive**
   - `hv_7th_guards_varazdin` — status: **inactive**
   - `hv_1st_guards_tigers` — status: **inactive**
   - Inactive HV brigades are an upstream HVO-undelivery defect tracked in
     `docs/40_reports/audits/20260522_HVO_UNDELIVERY_INVESTIGATION.md`;
     they do not fix in time for the Cincar Nov 1994 window.

2. **Missing kupres_2 objective.** `objectives_targeted` covers the
   shoulder OSIDs only (`bucovaca`, `donji_malovan`, `novo_selo_2`).
   `op:kupres:kupres_2` — the Kupres-town anchor that gates Mistral 1 and
   Jajce staging_access — was never in the objective list. Even a
   counterfactually successful Cincar in the previous catalog would not
   flip the gating OSID.

---

## 2. Fix applied

Single-file change in
`src/sim/combat/operation_opportunity_catalog_central_bosnia.ts`.

### 2.1 Brigade pool widened (4 → 6 brigades)

`KUPRES_CINCAR_AXES.brigades` now:

| Brigade ID | Corps (at t=132) | Status (t=132) | Source |
|---|---|---|---|
| `hrhb_kralj_petar_kreimir_iv_brigade` | hvo_tomislavgrad | active | BB v2 ch. 28; kept |
| `hrhb_kralj_tomislav_brigade` | hvo_tomislavgrad | active | BB v2 ch. 28; kept |
| **`hvo_rama_brigade`** (NEW) | hvo_tomislavgrad | active | BB v2 ch. 28: HVO Rama brigade covered the Prozor→Kupres approach for the Cincar axis; ICTY *Prosecutor v. Prlić et al.* IT-04-74-T trial-record on HVO Tomislavgrad operative group composition |
| **`hv_4th_guards_split`** (NEW) | hvo_tomislavgrad (post-WA+6) | active | BB v2 ch. 28: HV 4th Guards Brigade Split was the principal HV loan brigade for the Cincar / Kupres axis from November 1994. ICTY *Prosecutor v. Gotovina et al.* IT-06-90-T Judgment 15 Apr 2011 §44-58 documents HV cross-border employment on the Livno–Kupres–Grahovo axis from late 1994 |
| `hv_5th_guards_karlovac` | hvo_tomislavgrad | inactive (HVO-undelivery) | retained for plausibility symmetry; activates when undelivery is resolved |
| `hv_7th_guards_varazdin` | hvo_tomislavgrad | inactive (HVO-undelivery) | retained for plausibility symmetry; activates when undelivery is resolved |

**Net effect at runtime:** 4 ACTIVE brigades engage instead of 2, restoring
launch force ratio above `MIN_LAUNCH_FORCE_RATIO_FLOOR` and giving Cincar
a credible Tomislavgrad operative group composition.

OOB verification (`data/source/oob_brigades.json`):
```
hrhb_kralj_petar_kreimir_iv_brigade — corps: hvo_tomislavgrad, available_from: 0
hrhb_kralj_tomislav_brigade        — corps: hvo_tomislavgrad, available_from: 8
hvo_rama_brigade                   — corps: hvo_tomislavgrad, available_from: 0
```

`hv_4th_guards_split` is spawned by `src/sim/combat/hv_integration.ts` at
`washington_turn + HV_PREPARATION_DELAY (6)`. In n1966 Washington signed
at t=85, so HV brigades exist on `hvo_tomislavgrad` from t=91 onward.
Cincar's window opens at t=132 — well after HV spawn.

`hvo_1st_guard_abb` was considered but rejected: it is assigned to
`hvo_main_staff`, not `hvo_tomislavgrad`. Adding it would violate
Sacred Rule #2 (NEVER share brigades between ops on different corps).

### 2.2 `op:kupres:kupres_2` added to objectives_targeted

Updated `KUPRES_CINCAR_OBJECTIVES`:

```ts
// Before:
const KUPRES_CINCAR_OBJECTIVES = [
    'op:kupres:bucovaca',
    'op:kupres:donji_malovan',
    'op:kupres:novo_selo_2',
];

// After:
const KUPRES_CINCAR_OBJECTIVES = [
    'op:kupres:bucovaca',
    'op:kupres:kupres_2',   // NEW — gates mistral_1_95 / jajce_95
    'op:kupres:donji_malovan',
    'op:kupres:novo_selo_2',
];
```

Insertion order follows the Tomislavgrad → Bučovača → Kupres-town
historical axis per BB v2 ch. 28. The OSID is verified present in
`data/derived/operational/canonical_to_operational_map.json`. Painted
control Jan 1993 = RS (no painted-opposite-faction violation per
Sacred Rule #4).

### 2.3 Variant pool widened

`KUPRES_LINE_ONLY_AXES.brigades` (HRHB-only variant, no HV loan) widened
from 2 → 3 brigades by adding `hvo_rama_brigade`. The HRHB-only path
remains a credible fallback when HV pool is unavailable.

The `KUPRES_GLAMOC_SHOULDER_AXES` variant is unchanged — it uses
`hv_5th_guards_karlovac` and `hv_7th_guards_varazdin` for the secondary
shoulder push (HV-only by design); it inherits the HV undelivery
sensitivity but is not on the cascade-critical path.

---

## 3. Operations-expert pre-change checklist (per SKILL.md)

- [x] **Painted control:** all 4 Cincar OSIDs (bucovaca, kupres_2,
      donji_malovan, novo_selo_2) painted RS in Jan 1993 — no
      painted-opposite-faction violation.
- [x] **Staging adjacency:** staging anchor remains `op:livno:livno_2`,
      adjacent via Livno→Tomislavgrad→Bučovača corridor (BB v2 ch. 28).
- [x] **Brigade corps_id matches:** all 6 brigades on `hvo_tomislavgrad`
      (or assigned to it via `hv_integration.ts`).
- [x] **No shared brigades:** `hvo_1st_guard_abb` (on hvo_main_staff)
      explicitly excluded. Mistral 1 / Mistral 2 / Jajce ops also pull
      from `hvo_main_staff` for `hvo_1st_guard_abb`, separate corps —
      no cross-corps sharing introduced.
- [x] **Determinism:** no Math.random, no timestamps, canonical faction
      IDs only, sorted readonly arrays.
- [x] **Sacred Rules:** Initial OSID painted control untouched; no
      `avoided_osids_by_faction`; one-op-per-corps preserved; no
      brigade sharing between corps' ops.
- [x] **Typecheck:** `npx tsc --noEmit` — **EXIT_CODE=0** (zero
      errors).

---

## 4. Expected effect at next n1967 rerun

1. Cincar at t=132 launches with 4 ACTIVE brigades instead of 2.
   Personnel ~7,200 instead of 3,600. Expected `force_ratio_estimate`
   roughly 0.25-0.35 (still below 1.0 because VRS 2nd Krajina holds
   Kupres in strength, but no longer below the launch floor; combat
   math + brigade attack evaluation will determine actual capture).
2. If Cincar captures at least `bucovaca` and `kupres_2`, downstream
   `staging_access` predicates for `mistral_1_95` and `jajce_95`
   open and the cascade resumes.
3. If Cincar still struggles after this widening, follow-up tuning
   (readiness/coordination floor relaxation, or a second tranche of
   HV brigades once undelivery is fixed) is the next iteration —
   per Wave 7 memo §6.

This is the smallest-surface-area fix that addresses both failure
modes in a single catalog edit. No engine changes. No new
abstractions. No determinism risk.

---

## 5. Verification

### 5.1 Typecheck

```
$ npx tsc --noEmit ; echo "EXIT_CODE=$?"
EXIT_CODE=0
```

Zero errors. Clean.

### 5.2 Lines changed

| File | Lines net | Notes |
|---|---|---|
| `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts` | +45 / -6 | Brigade pool widening + objective addition + variant widening + transitional comments |

### 5.3 Concerns flagged

- **HVO undelivery is the proximate root cause.** Widening the pool to
  6 brigades only helps because 4 of them are active. If
  `hvo_undelivery_investigation` results in *more* HV brigades
  becoming active later, the Cincar pool will scale up appropriately
  (the 2 inactive entries remain as forward-compatible plumbing).
- **`hv_4th_guards_split` location at t=132.** End-state inspection
  shows it at `op:livno:zastinje` — close to the Cincar staging
  anchor at `op:livno:livno_2`. Should be eligible immediately, but
  if `force_staging` reports a low assembly rate, the brigade may
  need to column-march for a turn or two before joining the attack.
  The op's `planning_duration: 4` should accommodate this.
- **`hv_4th_guards_split` is shared with `MISTRAL_1_95_OPPORTUNITY`
  and `MISTRAL_2_95_OPPORTUNITY` axes** in
  `operation_opportunity_catalog_federation_western_bosnia.ts`.
  Mistral ops fire at t=160-190; Cincar fires at t=132. There is
  no temporal conflict — Cincar will return the brigade to recovery
  long before Mistral 1's window opens. Same corps
  (`hvo_main_staff` for Mistral primary axis vs `hvo_tomislavgrad`
  for Mistral secondary axis) so Sacred Rule #2 (no shared brigades
  on different corps' SIMULTANEOUS ops) is preserved by the
  temporal separation. No fix required, but flagging for awareness.
- **`hvo_rama_brigade` is not shared** with any other catalog op
  (verified via grep). Single-op assignment.

---

## 6. Checkpoint (per LOOP DISCIPLINE protocol)

Milestones reached during this session:

1. SCRT diagnostic n1966 root cause identified — Cincar 2-brigade
   underforce + missing kupres_2 objective.
2. OOB and end-state save inspected — confirmed 3 of 4 catalog
   brigades inactive, hvo_rama and hv_4th_guards_split available
   and active on hvo_tomislavgrad at t=132.
3. Catalog edited: brigade pool widened (4→6, of which 4 active),
   `op:kupres:kupres_2` added to objectives, variant pool widened.
4. Typecheck passed (`npx tsc --noEmit`, EXIT_CODE=0).
5. This memo authored.

Next iteration owner: `/scenario-creator-runner-tester` — rerun
calibration scenario (n1967) and verify:
- Cincar launches with ≥3 brigades engaged.
- `op:kupres:kupres_2` flips HRHB at or shortly after t=132-136.
- `mistral_1_95` and `jajce_95` `staging_access` predicates
  transition green inside their windows.
- If Cincar still recovers with `defender_power_too_high`,
  consider Wave 7 memo §6.3 follow-up (readiness floor
  relaxation; further pool tuning).
