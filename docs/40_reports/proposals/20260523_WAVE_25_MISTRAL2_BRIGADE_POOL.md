# Wave 25: Mistral 2 Brigade Pool Rebuild + Re-Host

**Date**: 2026-05-23
**Branch**: `feature/arc-operations-calibration`
**Author**: Operations Expert (Pyrrhic team)
**Predecessor memo**: `docs/40_reports/audits/20260523_WAVE_24_REORDER_INEFFECTIVE_N1987.md`
**Sibling precedent**: `docs/40_reports/audits/20260522_MISTRAL_1_BRIGADE_DRAIN.md` (Wave 19A)
**File changed**: `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts`

---

## 1. Problem statement

The n1987 SCRT memo (Wave 24 reorder, ineffective) established that Operation
Mistral 2 reaches `approved` at t175 every run but immediately falls into
recovery with `recovery_reason='brigade_attrition'`, `participating_brigades:
[]`, `total_attacks: 0`, `objectives_captured: 0`. The reorder of the
Šipovo/Mrkonjić sub-sequence shipped in Wave 24 was correct adjacency work
(per the Wave 24A audit) but the op cannot exercise that ordering when zero
brigades reach execution.

Two root causes were identified by direct inspection of
`runs/apr1992_definitive_188w__210e69404d054959__w188_n1987/final_save.json`:

### 1.1 Three of the five catalog brigades are status='inactive' at t175

The prior brigade pool (`MISTRAL_AXES` in
`operation_opportunity_catalog_federation_western_bosnia.ts:95-119`) was:

| Axis                       | Brigades                                          |
|----------------------------|---------------------------------------------------|
| `mistral_drvar_grahovo`    | `hvo_1st_guard_abb`, `hv_4th_guards_split`        |
| `mistral_sipovo_mrkonjic`  | `hrhb_kralj_petar_kreimir_iv_brigade`,            |
|                            | `hrhb_kralj_tomislav_brigade`,                    |
|                            | `hv_7th_guards_varazdin`                          |

Cross-checking against the n1987 final_save (t188 snapshot, with the t160-t175
Mistral 1 lifecycle and the t132-t141 Cincar lifecycle both fully resolved):

```
hrhb_kralj_petar_kreimir_iv_brigade     status: inactive   (Cincar veteran)
hrhb_kralj_tomislav_brigade             status: inactive   (Cincar veteran)
hv_7th_guards_varazdin                  status: inactive   (Cincar veteran)
hv_4th_guards_split                     status: active     (just freed by Mistral 1)
hvo_1st_guard_abb                       status: active     (Mistral 1 alumnus)
```

The three "Kralj Petar / Kralj Tomislav / HV 7th Guards" brigades all
participated in Operation Cincar / Kupres (t132-t141, recorded in
`operation_aars.json`: `participating_brigades:
["hrhb_kralj_petar_kreimir_iv_brigade","hrhb_kralj_tomislav_brigade",
"hv_4th_guards_split","hvo_1st_guard_abb","hvo_rama_brigade"]`, outcome
`success`). The Kralj brigades and HV 7th Guards never returned to `active`
status between Cincar's end at t141 and the Mistral 2 window at t175 —
that's 34 turns of recovery failure, indicating either (a) attrition exceeded
the formation_lifecycle replacement floor, (b) the recovery cohort never
crossed the reconstitution threshold, or (c) the army_reserve_system loan
that brought HV 7th Guards into play was withdrawn after Cincar. Whichever
applies, the catalog can't rely on them.

`hv_4th_guards_split` is active but was monopolized by Mistral 1 from t160
through t175 (`operation_aars.json`: `started_turn: 160, ended_turn: 175,
participating_brigades: ["hv_4th_guards_split"], outcome: partial,
recovery_reason: brigade_attrition`). It freed at the precise tick Mistral 2
approves. The brigade is mechanically eligible but realistically exhausted
and one-brigade-axis is too thin for the Drvar/Grahovo axis (which has 9
deep-RS objectives including Drvar town itself).

`hvo_1st_guard_abb` was active and not committed to any t175-window op. It is
the foundation of any Mistral 2 force.

### 1.2 Op was hosted on hvo_main_staff (zero front sectors)

The op's `primary_corps` was `hvo_main_staff`. Per Wave 19A audit
(`20260522_MISTRAL_1_BRIGADE_DRAIN.md`) and the live save inspection,
`hvo_main_staff` is a **corps shell with zero front sectors**.
`reconcileOperationRoster` at
`src/sim/combat/final_operation_truth_reconciliation.ts:44-47` drops any
brigade whose sector claim does not match the host corps. Every brigade that
served in Cincar carries a `sector:hvo_tomislavgrad:*` claim (because the
sector roster was assigned during Cincar's t132-t141 lifecycle). If those
brigades had been status='active' they would still have been dropped from a
`hvo_main_staff`-hosted Mistral 2 by the reconciler.

This is the same bug class fixed for Mistral 1 in Wave 19A — Mistral 1 was
re-hosted from `hvo_main_staff` to `hvo_tomislavgrad` (commit details in
`docs/40_reports/audits/20260522_MISTRAL_1_BRIGADE_DRAIN.md`). Mistral 2 was
never given the same fix.

### 1.3 Combined effect

At t175 the op approves, runs reconciliation, finds zero eligible brigades
(3 inactive + 1 just-freed-and-currently-exhausted + 1 active-but-foreign-
sector-claim → reconciler drops the lot), and immediately recovers with
`brigade_attrition`. The Wave 24 reorder of the Šipovo sub-sequence never
gets exercised. Zero attacks, zero captures, zero territorial impact on
painted Oct 1995.

---

## 2. Fix (Wave 25)

### 2.1 Re-host on hvo_tomislavgrad

`MISTRAL_2_95_OPPORTUNITY.primary_corps` changes from `PRIMARY_CORPS`
(`hvo_main_staff`) to `SECONDARY_CORPS` (`hvo_tomislavgrad`). Both
`mistral_drvar_grahovo` and `mistral_sipovo_mrkonjic` axes also use
`SECONDARY_CORPS` as their `corps` field. This mirrors the Wave 19A
re-host of Mistral 1, where it was empirically demonstrated that hosting on
`hvo_tomislavgrad` retains the Livno/Tomislavgrad/Glamoč brigade roster
through the reconciler.

Note: the readiness predicates (`corpsReadinessMistral`,
`commanderConfidenceMistral`) still reference both `PRIMARY_CORPS` and
`SECONDARY_CORPS` and require both command structures present — that is
canonically appropriate (HVO Main Staff is the political/command authority
for an HV/HVO joint operation; HVO Tomislavgrad is the executing
operational HQ). The op-level `primary_corps` field is what the engine uses
for sector reconciliation and for queue ownership; it is now correct.

### 2.2 New brigade pool

Cross-referenced n1987 live save (38 active HRHB formations at t188), the
ops AARs (which brigades are committed in concurrent op windows), and the
OOB metadata (`data/source/oob_brigades.json` for elite/mechanized/
available_from). Substituted three brigades:

| Slot in old pool                         | New brigade                  | Rationale |
|------------------------------------------|------------------------------|-----------|
| `hrhb_kralj_petar_kreimir_iv_brigade`    | `hvo_3rd_guard_jastrebovi`   | Inactive → elite tier-1 mechanized HVO Guards (Nakić), defensive_skill 4, available_from t=84. |
| `hrhb_kralj_tomislav_brigade`            | `hvo_rama_brigade`           | Inactive → active light infantry, at t188 already forward-positioned at op:glamoc:pribelja (post-Cincar). |
| `hv_7th_guards_varazdin`                 | `hvo_2nd_guard_mechanized`   | Inactive → elite tier-1 mechanized HVO Guards (Sopta), available_from t=84. |

Final pool:

| Axis                     | Brigades                                                                          |
|--------------------------|-----------------------------------------------------------------------------------|
| Drvar / Grahovo          | `hvo_1st_guard_abb` (kept), `hv_4th_guards_split` (kept), `hvo_2nd_guard_mechanized` (new) |
| Šipovo / Mrkonjić        | `hvo_3rd_guard_jastrebovi` (new), `hvo_rama_brigade` (new)                        |

This concentrates the three HVO Guards brigades (1st/2nd/3rd) plus the HV
4th Guards Split on the heavier Drvar axis (3 brigades, all mechanized, three
of four elite tier-1) and assigns the 3rd Guards plus the forward-positioned
Rama Brigade to the lighter Šipovo cluster axis. Total brigade count drops
from 5 to 5 (no change), but the active-at-t175 count rises from 1 (just
`hv_4th_guards_split`) to 5 (all five are status='active' in n1987 at t188,
and none of them are in any concurrent op pool at the t175-t182 window).

### 2.3 Verification of commitment-free status

Cross-checked all opportunity catalog files for brigade overlap at the
t175-t182 window:

| Brigade                       | Other catalog refs                                  | t175 conflict? |
|-------------------------------|-----------------------------------------------------|----------------|
| `hvo_1st_guard_abb`           | Cincar t132-141, Mistral 1 t160-175 (alumnus)      | No (Mistral 1 ended t175) |
| `hv_4th_guards_split`         | Cincar, Cincar Phase 2, Mistral 1                  | No (all ended ≤t175) |
| `hvo_2nd_guard_mechanized`    | None found in catalog                              | No |
| `hvo_3rd_guard_jastrebovi`    | None found in catalog                              | No |
| `hvo_rama_brigade`            | Cincar (alumnus), Cincar Phase 2 pool              | No (Cincar Phase 2 fires t≤140 if at all) |

The two newly-added Guards brigades (2nd and 3rd) are **not referenced in
any other opportunity catalog**. They are completely unencumbered for the
t175-t182 Mistral 2 window. The 1st Guards / 4th Guards / Rama are Cincar
veterans but Cincar ended 34 turns earlier and they are all status='active'
at t188 — no concurrent op conflict.

---

## 3. Historical justification

### 3.1 HVO Guards Brigade family (1st / 2nd / 3rd)

The HVO had three professional Guards brigades by mid-1995, each tier-1
elite in OOB:

- **1st Guards "Ante Bruno Bušić"** (Glasnović, foreign-origin commander) —
  home Livno/Misi. Per Balkan Battlegrounds vol. 2 ch. 28, the ABB was the
  principal HVO instrument across the western-Bosnia Sep 1995 operations
  (Mistral 1, Mistral 2, the post-Storm exploitation push toward Bosanski
  Petrovac). Already in the Mistral 2 pool. **Kept.**

- **2nd Guards Mechanized** (Sopta, military-origin commander) — home
  Mostar/Mostar Zapad. Per BB v2 ch. 30, the 2nd Guards rotated from the
  southern Herzegovina front (where Federation-era Mostar had quieted) to
  the western shoulder in Sep 1995 to support the Mistral 2 push. The
  Mostar→Livno→Drvar redeployment is the standard HVO interior supply route
  and the brigade has the mechanized lift to use it. **Added.**

- **3rd Guards "Jastrebovi"** (Nakić, military-origin commander, defensive
  skill 4) — home Čapljina. Per BB v2 ch. 30 the 3rd Guards similarly
  rotated into the western theater after Sep 1995's quieting of the
  southeastern Herzegovina front. Lighter than the 1st/2nd Guards but with
  the best defensive skill of the three; suits the cluster-and-ridge
  Šipovo/Mrkonjić axis. **Added.**

All three Guards units have OOB `available_from` set to t=80, 84, 84
respectively — all well before t=175.

### 3.2 HV 4th Guards Split

Already in the pool. ICTY *Prosecutor v. Gotovina et al.*, IT-06-90-T,
Judgment 15 Apr 2011, §44-58 documents joint HV/HVO operational control of
the western Bosnia push; §54 specifically discusses the HV professional
brigades acting at sub-1.0 local force ratios. The 4th Guards is the
historical HV anchor of the Tomislavgrad axis. **Kept.**

### 3.3 HVO Rama Brigade

Already a Cincar veteran. In n1987's final save the brigade is at
`op:glamoc:pribelja` at t188 — i.e., already forward of the original Prozor
home, in the Glamoč-Šipovo corridor. Per BB v2 ch. 30 the Rama Brigade
participated in the post-Cincar western-shoulder pursuit. Light infantry,
not elite, but the forward position is the operational virtue: a Šipovo-axis
launch from Glamoč/Pribelja is geographically much closer than the Livno
staging anchor and the brigade does not need a multi-turn column march to
reach the objective. **Added.**

---

## 4. Replaced brigades — disposition

The three substituted-out brigades remain in the OOB and in their home
corps formations. They are simply not part of the Mistral 2 pool any more.

- `hrhb_kralj_petar_kreimir_iv_brigade` — still authored on
  `hvo_tomislavgrad`. Will be reconstituted by formation_lifecycle if the
  recovery cohort threshold is met, and remains available for Cincar
  Phase 2 (`operation_opportunity_catalog_central_bosnia.ts:800`),
  Vlasic Ridge, and Donji Vakuf 95 catalogs which still reference it.
- `hrhb_kralj_tomislav_brigade` — same disposition.
- `hv_7th_guards_varazdin` — HV runtime-loaned per `army_reserve_system.ts`.
  The loan terms (which brigade-level recovery system applies) are outside
  the operations layer; the catalog change here doesn't affect them.

No OOB edits are made. No initial OSID overrides. No
`avoided_osids_by_faction` filters added. This is a pure catalog re-pool +
re-host change.

---

## 5. Constraints satisfied

| Constraint                                | Status |
|-------------------------------------------|--------|
| `/operations-expert` SKILL.md reading     | Done (re-read for this wave) |
| NEVER override initial OSIDs              | No OSID changes |
| All brigade IDs exist in OOB              | Verified against `data/source/oob_brigades.json` |
| Cite ICTY/BB                              | BB v2 ch.28-30 and ICTY Gotovina §44-58 cited in code and memo |
| `npx tsc --noEmit` passes                 | Verified — zero errors, zero output |
| Determinism preserved                     | No new state, no random, no timestamps — pure declarative catalog edit |
| Staging OSID adjacent to first objective  | Unchanged — STAGING_LIVNO_MISI/STAGING_LIVNO untouched |
| No painted-opposite-faction objective add | No objective changes |
| No shared brigades across corps' ops      | Verified — 2nd/3rd Guards unreferenced elsewhere; 1st Guards / 4th Guards / Rama only collide with Cincar which ends 34 turns earlier |

---

## 6. Expected outcome (n1988+ verification)

The next 188w scenario run should show:

- Mistral 2 reaches `approved` at t175 (unchanged from n1987).
- `reconcileOperationRoster` retains all 5 brigades at the host corps
  (`hvo_tomislavgrad`) — the brigade-drain reconciler can no longer drop
  them because the sector claims match the host corps.
- `participating_brigades` count moves from 0 → 5.
- `recovery_reason` should change from `brigade_attrition` (which fired
  because the reconciliation produced zero participants) to either
  `completed` (if the op runs its full course), `objectives_captured`
  (early successful end), or a different mode (zero_eligible_axis,
  defender_power_too_high, no_approach_osid, etc.) that would expose the
  next-layer issue.
- Wave 24A's Šipovo/Mrkonjić reorder is finally exercised at execution,
  validating (or invalidating) that work.
- Painted Oct 1995 transfers along the Drvar/Grahovo and Šipovo corridors
  may begin to show non-zero capture rates. Painted target is up to
  ~13 OSIDs across the Mistral 2 footprint; even a 30-40% capture rate
  would be a material improvement on the n1987 0/13.

If Mistral 2 still recovers with zero attacks after this change, the next
investigation should focus on the engine-side path (sub-segment claims,
approach-OSID derivation from the Tomislavgrad sector, axis-eligibility
gate against `arbih_3rd_corps:N` style sub-segments for an `hvo_tomislavgrad`
host) rather than the catalog.

---

## 7. Reportback summary

(a) **New brigade pool** —
- Drvar/Grahovo Axis: `hvo_1st_guard_abb`, `hv_4th_guards_split`, `hvo_2nd_guard_mechanized`
- Šipovo/Mrkonjić Axis: `hvo_3rd_guard_jastrebovi`, `hvo_rama_brigade`

(b) **Re-host status** — `primary_corps` changed from `hvo_main_staff` to
`hvo_tomislavgrad`. Both axis `corps` fields aligned to the host. Same
treatment as Wave 19A on Mistral 1.

(c) **Typecheck status** — `npx tsc --noEmit` passed with zero errors.

(d) **Memo size** — see file system; this memo is the source of truth for
Wave 25.
