# 5 Blocked ARBiH/Federation Operation Opportunities — Forensics (n1956)

**Branch:** `feature/arc-operations-calibration`
**Run:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1956/`
**Save:** `final_save.json` (8,209,396 bytes; schema places `military` at top level, NOT under `state`)
**Trace path:** `data.military.operation_opportunity_traces` (array, 82 entries total)
**Scope:** Read-only forensics. NO source edits in this dispatch — investigation memo only.
**Author:** operations-expert (dispatched by parent on `feature/arc-operations-calibration`).

This memo follows up the Wave 2 commander_state fix at commit `11d2025b` (ARBiH ops now fire). Five specific opportunities still accumulate 11-15 blocked traces in both n1955 and n1956 with NON-commander_confidence predicates. SCRT estimates 5-10pp area-weighted territorial upside at Oct 1995 if unblocked.

---

## §1 Per-op blocker trace (read from `operation_opportunity_traces`)

For each op, **every** blocked trace in n1956 records the same `failed_required_axes` set across every turn it was proposed (i.e. the blockers are stable, not intermittent). Counts and first/last turns captured below; full trace shape `{event:"blocked", failed_required_axes:[{axis,reason},...], failed_optional_axes:[...], min_optional_axes, optional_green_count, opportunity_id, turn}`.

### 1.1 `sana_95` — 14 blocked traces
- **Turn range:** 175 → 188 (every turn in window).
- **Failed required axes (constant):**
  - `enemy_weakness` — "VRS Krajina defender corps not yet degraded enough for exploitation"
- **Failed optional axes:** none recorded.
- **min_optional_axes:** 1; **optional_green_count:** 2 (so optional gate is satisfied).
- **JSON path:** `military.operation_opportunity_traces[*]` where `opportunity_id === 'sana_95'`.

### 1.2 `sana_95_follow_on` — 14 blocked traces
- **Turn range:** 175 → 188.
- **Failed required axes (constant, BOTH each turn):**
  - `staging_access` — "Sanski/Kljuc interior axis has no live approach corridor"
  - `enemy_weakness` — "VRS Krajina defender corps not yet degraded enough for exploitation"
- **Failed optional axes:** none.
- **min_optional_axes:** 1; **optional_green_count:** 2.
- **JSON path:** `military.operation_opportunity_traces[*]` where `opportunity_id === 'sana_95_follow_on'`.

### 1.3 `mistral_2_95` — 14 blocked traces
- **Turn range:** 175 → 188.
- **Failed required axes (constant, THREE each turn):**
  - `political_authorization` — "Federation authorization below Mistral 2 threshold"
  - `staging_access` — "Kupres/Cincar dependency anchors are not open for Mistral 2"
  - `enemy_weakness` — "VRS Krajina defender corps not yet degraded enough for exploitation"
- **Failed optional axes:** turn 188 also fails `weather_season` ("late-autumn weather threatens Mistral 2 tempo"; date_window > 187 in predicate). On other turns, optionals are clean.
- **min_optional_axes:** 2; **optional_green_count:** 3-4.
- **JSON path:** `military.operation_opportunity_traces[*]` where `opportunity_id === 'mistral_2_95'`.

### 1.4 `kupres_cincar_94` — 11 blocked traces
- **Turn range:** 132 → 142.
- **Failed required axes (constant, BOTH each turn):**
  - `staging_access` — "Livno-Tomislavgrad-Kupres staging anchors are not held"
  - `alliance_context` — "post-Washington Federation coordination below Kupres/Cincar threshold"
- **Failed optional axes:** turns 132-135 also fail `weather_season` (predicate gate `turn < 136`).
- **min_optional_axes:** 2; **optional_green_count:** 3-4.
- **JSON path:** `military.operation_opportunity_traces[*]` where `opportunity_id === 'kupres_cincar_94'`.

### 1.5 `vlasic_ridge_95` — 15 blocked traces
- **Turn range:** 152 → 166.
- **Failed required axes (constant, BOTH each turn):**
  - `staging_access` — "Travnik staging anchor no longer held by 3rd Corps"
  - `alliance_context` — "post-Washington Federation coordination below threshold"
- **Failed optional axes:** turns 152-153 also fail `weather_season` (gate `turn < 154`).
- **min_optional_axes:** 2; **optional_green_count:** 3-4.
- **JSON path:** `military.operation_opportunity_traces[*]` where `opportunity_id === 'vlasic_ridge_95'`.

---

## §2 Catalog predicate inventory per op (file:line)

### 2.1 `sana_95`
- Defined: `src/sim/combat/operation_opportunity_catalog_5th_corps.ts:313-355`.
- Relevant predicates:
  - `enemy_weakness` (REQUIRED) → `enemyWeaknessSana` at `5th_corps.ts:242-267`.
    - Reads `getPoliticalControllerOSID` for `VRS_HELD_TARGETS_FOR_WEAKNESS` (5th_corps.ts:112-117): petrovac_2, vrtoce, sanski_most_2, kljuc_2.
    - Then calls `evaluateDefenderTrajectoryWeakness` with `defenderCorpsId='vrs_2nd_krajina'`, `weaknessFloor=0.40` (`SANA_DEFENDER_WEAKNESS_FLOOR`, line 52).
    - Trajectory weakness formula in `operation_opportunity_defender_weakness.ts:51-53`:
      `weakness = 0.50*collapse_susceptibility + 0.30*(1-operation_readiness) + 0.20*equipmentWeakness`.
- Other required axes (already GREEN per traces): `date_window`, `corps_readiness`, `staging_access` (pocket survival anchors), `alliance_context` (Storm rupture).

### 2.2 `sana_95_follow_on`
- Defined: `5th_corps.ts:357-400`.
- Relevant predicates:
  - `staging_access` (REQUIRED) → `stagingAccessSanaFollowOn` at `5th_corps.ts:208-218`.
    - Calls `stagingAccessSana` first (pocket integrity). Then iterates `SANA_FOLLOW_ON_APPROACH_OSIDS` (5th_corps.ts:122-126): jasenica_2, vrtoce, dobro_selo_2. Returns green ONLY if at least one is `RBiH`-controlled. Otherwise: "Sanski/Kljuc interior axis has no live approach corridor".
  - `enemy_weakness` (REQUIRED) → `enemyWeaknessSanaFollowOn` at `5th_corps.ts:269-287`. Same defender-trajectory call as sana_95.

### 2.3 `mistral_2_95`
- Defined: `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts:244-301`.
- Relevant predicates:
  - `political_authorization` (REQUIRED) → `politicalAuthorizationMistral` at `federation_western_bosnia.ts:139-146`.
    - Reads `state.political.war_alliance_rbih_hrhb` and `state.political.rbih_hrhb_state.washington_signed`.
    - Requires BOTH `washington_signed === true` AND `alliance >= FEDERATION_ALLIANCE_FLOOR` (= **0.50**, line 76).
  - `staging_access` (REQUIRED) → `stagingAccessMistral` at `federation_western_bosnia.ts:174-188`.
    - Two phases: (a) `MISTRAL_STAGING_ANCHORS` (Livno-misi_2, Livno-livno_2) must not be `non-HRHB`. (b) `MISTRAL_CINCAR_DEPENDENCY_ANCHORS` (line 37-40: `op:kupres:bucovaca`, `op:glamoc:glamoc_2`) MUST be HRHB-controlled. Both deps are read on every turn; the second phase is the trace's failure source.
  - `enemy_weakness` (REQUIRED) → `enemyWeaknessMistral` at `federation_western_bosnia.ts:204-224`. Same defender-trajectory call as sana_95 (vrs_2nd_krajina, floor 0.40).

### 2.4 `kupres_cincar_94`
- Defined: `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts:459-516`.
- Relevant predicates:
  - `staging_access` (REQUIRED) → `stagingAccessKupresCincar` at `central_bosnia.ts:392-400`.
    - Iterates `KUPRES_CINCAR_STAGING_ANCHORS` (central_bosnia.ts:96-101): livno_2, tomislavgrad_2, kupres_2, goravci.
    - Fails if any controller is non-null AND not `HRHB`.
  - `alliance_context` (REQUIRED) → `allianceContextKupresCincar` at `central_bosnia.ts:384-390`.
    - Reads `state.political.war_alliance_rbih_hrhb` ≥ `FEDERATION_ALLIANCE_FLOOR` (= **0.50**, line 63). Does NOT require `washington_signed`.

### 2.5 `vlasic_ridge_95`
- Defined: `central_bosnia.ts:518-569`.
- Relevant predicates:
  - `staging_access` (REQUIRED) → `stagingAccessVlasic` at `central_bosnia.ts:236-244`.
    - Iterates `VLASIC_STAGING_ANCHORS` (central_bosnia.ts:49-53): `op:travnik:travnik_2`, `op:travnik:turbe_2`, `op:travnik:cukle_2`.
    - Fails if any non-null controller is not `RBiH`. **NOTE:** `cukle_2` is HRHB-controlled in n1956 — this is the actual failure trigger (Travnik proper holds RBiH).
  - `alliance_context` (REQUIRED) → `allianceContextVlasic` at `central_bosnia.ts:228-234`. Reads `war_alliance_rbih_hrhb ≥ 0.50`. Same floor as Kupres.

---

## §3 Root cause classification per op

The 6 categories from the dispatch brief: PREDICATE_DATA_GAP, CORPS_ELIGIBILITY, PREREQUISITE_FAIL, FORCE_QUALITY_FAIL, DATE_WINDOW_FAIL, COMPOSITE.

Live state values at end-of-run (n1956 final_save.json):

| Field | Value |
|---|---|
| `political.war_alliance_rbih_hrhb` | **0.10** (< 0.50 floor) |
| `political.rbih_hrhb_state.washington_signed` | `true` |
| `corps_command.vrs_2nd_krajina.corps_exhaustion` | 0 |
| vrs_2nd_krajina active brigade subordinates | 5 (of 8 total) — substrate has live brigades |
| ctrl `op:kupres:bucovaca` | RS |
| ctrl `op:glamoc:glamoc_2` | RS |
| ctrl `op:kupres:kupres_2` | RS |
| ctrl `op:kupres:goravci` | RS |
| ctrl `op:tomislavgrad:tomislavgrad_2` | **undefined** (no entry in `political_controllers`) |
| ctrl `op:livno:livno_2` | HRHB |
| ctrl `op:travnik:travnik_2` | RBiH |
| ctrl `op:travnik:turbe_2` | RBiH |
| ctrl `op:travnik:cukle_2` | **HRHB** (predicate fails: "not RBiH") |
| ctrl `op:bosanska_krupa:jasenica_2` | RS |
| ctrl `op:bosanski_petrovac:vrtoce` | RS |
| ctrl `op:bosanski_petrovac:dobro_selo_2` | RS |

### 3.1 `sana_95` — **PREDICATE_DATA_GAP**

The single failing axis (`enemy_weakness`) ALWAYS returns red because `evaluateDefenderTrajectoryWeakness` reads:

1. `traits.collapse_susceptibility` (from `computeCorpsOperationReadiness`)
2. `traits.operation_readiness`
3. `getActiveEquipmentQualityMultiplier(state, 'RS', turn)`

The `vrs_2nd_krajina` corps DOES have `commander_state` and 5 active brigade subordinates, so `hasActiveSubordinateBrigade()` returns true → `available=true` path. The weakness float is computed but **does not clear 0.40** — even at end-of-run (turn 188, after 13 turns of attempted exploitation). The substrate field `corps_exhaustion` is 0 (no engine wear), so unless `collapse_susceptibility` / `operation_readiness` shift sharply downward, the weakness floor is unreachable in 188w.

This is a **predicate-against-substrate** mismatch: the catalog asks for a defender trajectory the engine never produces. The substrate inputs are valid but the formula's output for a still-organized VRS Krajina corps stays below floor.

Reason it's not COMPOSITE: every other required axis is GREEN every turn (per trace `failed_required_axes` carries only `enemy_weakness`).

### 3.2 `sana_95_follow_on` — **COMPOSITE** (PREDICATE_DATA_GAP + PREREQUISITE_FAIL)

Two failing required axes:
- `enemy_weakness` — same defender-trajectory issue as sana_95.
- `staging_access` — requires at least one of `jasenica_2 / vrtoce / dobro_selo_2` to be RBiH-controlled. All three are RS-controlled in n1956. By design these are the OBJECTIVES of sana_95 itself — so the follow-on can never fire UNTIL sana_95 fires AND captures at least one approach OSID. This is a chained prerequisite: it depends on sana_95 firing first. As long as sana_95 stays blocked by `enemy_weakness`, the follow-on stays double-blocked.

### 3.3 `mistral_2_95` — **COMPOSITE** (PREREQUISITE_FAIL ×2 + PREDICATE_DATA_GAP)

Three failing required axes:
- `political_authorization` — `washington_signed=true`, but `war_alliance_rbih_hrhb=0.10 < 0.50` floor. Alliance value never climbs above the floor in n1956. This is a **substrate/scenario gap** (no event ratchets `war_alliance_rbih_hrhb` upward across the late-war post-Washington period). PREREQUISITE_FAIL.
- `staging_access` — `MISTRAL_CINCAR_DEPENDENCY_ANCHORS` (`bucovaca`, `glamoc_2`) must be HRHB-held. Both are RS-held in n1956. Same chain pattern as Sana follow-on: depends on `kupres_cincar_94` firing AND capturing those two anchors. PREREQUISITE_FAIL on a different op.
- `enemy_weakness` — same defender-trajectory issue against `vrs_2nd_krajina`. PREDICATE_DATA_GAP.

### 3.4 `kupres_cincar_94` — **COMPOSITE** (PREREQUISITE_FAIL + STAGING_DATA + alliance)

Two failing required axes (THE ROOT BLOCKER of the western collapse cascade):
- `staging_access` — checks 4 anchors:
  - `op:livno:livno_2`: HRHB ✓
  - `op:tomislavgrad:tomislavgrad_2`: **undefined controller** in n1956 (`political_controllers` has no entry). Per predicate code (central_bosnia.ts:393-397): the conditional is `if (ctrl !== null && ctrl !== 'HRHB')` — predicate returns red on any non-HRHB AND non-null value. `undefined` from `getPoliticalControllerOSID` (when the OSID isn't in the controllers map) is NOT `null` — it's `undefined`. Need to confirm whether `getPoliticalControllerOSID` normalizes the missing case to `null` or returns `undefined`. **Flag as substrate gap** — Tomislavgrad is supposed to be the historical HRHB capital of the area; its absence from controllers is a paint/initial-state issue, not a captured-elsewhere issue.
  - `op:kupres:kupres_2`: RS — predicate fails here (controller IS one of the staging anchors).
  - `op:kupres:goravci`: RS — predicate also fails here.
  - **Diagnosis**: predicate asks the catalog to hold its own first-attack objectives (Kupres/Goravci) as "staging anchors" — a circular dependency. Catalog mistake.
- `alliance_context` — `war_alliance_rbih_hrhb=0.10 < 0.50` floor in n1956 turns 132-142 (well before any Washington event leverage). PREREQUISITE_FAIL (substrate value never rises).

The primary blocker is the staging predicate authoring error (the Kupres OSIDs themselves are listed as required-held anchors). Alliance is a secondary gap, but it's a hard alliance value gap — not a Washington-signature issue.

### 3.5 `vlasic_ridge_95` — **COMPOSITE** (PREDICATE_DATA_GAP + alliance)

Two failing required axes:
- `staging_access` — checks 3 anchors: travnik_2 (RBiH ✓), turbe_2 (RBiH ✓), `cukle_2` (**HRHB** — predicate rule `ctrl !== null && ctrl !== 'RBiH'` returns red). Cukle is held by HRHB throughout the corridor; the catalog treats this as "Travnik staging anchor no longer held by 3rd Corps", but the reality is it's held by the Federation ally, not lost to the enemy. **PREDICATE_DATA_GAP / authoring error** — the predicate should accept Federation-aligned controllers (RBiH or HRHB), not only RBiH.
- `alliance_context` — same `war_alliance_rbih_hrhb < 0.50` issue as Kupres/Mistral. PREREQUISITE_FAIL.

---

## §4 Proposed fixes per op (file:line + diff sketch)

> CONSTRAINT: edits not applied in this dispatch. Sketches only. Parent reviews.

### 4.1 `sana_95` — `enemy_weakness` defender-trajectory floor too high

**File:** `src/sim/combat/operation_opportunity_catalog_5th_corps.ts:52`
**Smallest viable fix:** lower `SANA_DEFENDER_WEAKNESS_FLOOR` so that the predicate evaluates green during the late-summer 1995 window for a still-organized but stretched VRS Krajina corps.

```diff
-const SANA_DEFENDER_WEAKNESS_FLOOR = 0.40;
+const SANA_DEFENDER_WEAKNESS_FLOOR = 0.20;
```

Rationale: with `corps_exhaustion=0` and a full active subordinate roster, the trajectory weakness formula `0.50·collapse + 0.30·(1-readiness) + 0.20·equipmentWeakness` can plausibly reach 0.20-0.30 from collapse_susceptibility + equipment quality alone (RS equipment quality typically downtrends post-Storm). A precise number requires reading the trajectory output — recommend adding diagnostic-trace logging of the float value before re-tuning. **Alternative**: gate `enemy_weakness` on the existing "targets in enemy hands" fallback (line 263-265 already returns green in the `!trajectory.available` branch) — change `if (trajectory.available)` to a multi-signal OR, e.g. accept either weakness ≥ floor OR ≥1 target held + Storm rupture green. The fallback path is currently unreachable because vrs_2nd_krajina has active brigades.

**OR** the enemy_weakness predicate could re-route: ARBiH 5th Corps actually faced VRS 1st Krajina + 2nd Krajina along this front. Confirm `defenderCorpsId` against OOB — if 2nd Krajina is the wrong corps (or its readiness is unrelated to the Sana-front decay), the fix is a CORPS_ELIGIBILITY tweak to point at the correct defender corps.

### 4.2 `sana_95_follow_on` — chained on sana_95 + same weakness floor

**Files:**
- `5th_corps.ts:52` (shared `SANA_DEFENDER_WEAKNESS_FLOOR`) — fix per §4.1 above.
- `5th_corps.ts:122-126` (`SANA_FOLLOW_ON_APPROACH_OSIDS`) — optionally widen so the follow-on becomes addressable earlier, e.g. add `op:bihac:ripac` (first-axis Sana objective adjacent to Bihać proper).

```diff
 const SANA_FOLLOW_ON_APPROACH_OSIDS: readonly string[] = [
     'op:bosanska_krupa:jasenica_2',
     'op:bosanski_petrovac:vrtoce',
     'op:bosanski_petrovac:dobro_selo_2',
+    'op:bihac:ripac',
+    'op:bihac:orasac_2',
 ];
```

Note: the chained design is correct (follow-on shouldn't fire before initial Sana captures), but in practice once §4.1 unblocks Sana, this chain will resolve naturally — Sana axis 1 (Krupa Una Valley) captures jasenica_2 within its window. **No fix needed here beyond §4.1**, unless the parent prefers an explicit secondary unlock.

### 4.3 `mistral_2_95` — three composite fixes

**File A:** `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts:76`

Lower Federation alliance floor (the live value is 0.10, not 0.50; either the floor is too high or the substrate event-driven alliance ratchet is missing). Since RBiH-HRHB alliance arc in the late-war period is supposed to be "post-Washington co-belligerent", `washington_signed=true` should be the substantive gate, and the alliance threshold could relax.

```diff
-const FEDERATION_ALLIANCE_FLOOR = 0.50;
+const FEDERATION_ALLIANCE_FLOOR = 0.10;  // post-Washington floor; ratchet upward when alliance events land
```

**OR** rewrite the predicate so `washington_signed` is sufficient and alliance is a soft-floor optional/quality gate. Cleaner long-term, but a larger edit.

**File B:** `federation_western_bosnia.ts:42-71` (`MISTRAL_DRVAR_GRAHOVO_OBJECTIVES` and `MISTRAL_SIPOVO_MRKONJIC_OBJECTIVES`) — no change needed.

**File C:** `federation_western_bosnia.ts:27, 213-219` (defender trajectory weakness floor) — same fix as §4.1.

```diff
-const MISTRAL_DEFENDER_WEAKNESS_FLOOR = 0.40;
+const MISTRAL_DEFENDER_WEAKNESS_FLOOR = 0.20;
```

`staging_access` is a chained prereq on Kupres/Cincar firing — addressed by §4.4.

### 4.4 `kupres_cincar_94` — staging-anchor authoring error + alliance floor

**File:** `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts:96-101`

Remove the Kupres OSIDs from the staging anchor set — they are the OBJECTIVES of the operation. Keep only the held-pre-existing-anchors (Livno, Tomislavgrad).

```diff
 const KUPRES_CINCAR_STAGING_ANCHORS: readonly string[] = [
     KUPRES_CINCAR_STAGING_LIVNO,
     KUPRES_CINCAR_STAGING_TOMISLAVGRAD,
-    KUPRES_CINCAR_STAGING_KUPRES,
-    KUPRES_CINCAR_STAGING_GORAVCI,
 ];
```

**Tomislavgrad controller substrate gap:** `op:tomislavgrad:tomislavgrad_2` returns `undefined` controller in n1956. Need to verify what `getPoliticalControllerOSID` returns for an unmapped OSID — if `null`, the predicate's `if (ctrl !== null && ctrl !== 'HRHB')` short-circuits OK (no failure). If it returns `undefined`, the comparison is `undefined !== null && undefined !== 'HRHB'` → `true && true` → fails. **Flag as substrate gap** for parent: either (a) add Tomislavgrad to initial paint, or (b) make the predicate tolerant: `if (ctrl !== null && ctrl !== undefined && ctrl !== 'HRHB')`. RECOMMEND (a) — Tomislavgrad is supposed to be HRHB historically, not unpainted.

**File:** `central_bosnia.ts:63`

Lower `FEDERATION_ALLIANCE_FLOOR` to a value consistent with the live arc, or rewrite the predicate (line 384-390) to read a different substrate signal (e.g. `washington_signed` boolean or the equivalent Western Bosnia co-belligerency event).

```diff
-const FEDERATION_ALLIANCE_FLOOR = 0.50;
+const FEDERATION_ALLIANCE_FLOOR = 0.10;
```

### 4.5 `vlasic_ridge_95` — Federation-aligned controller acceptance + alliance floor

**File:** `central_bosnia.ts:236-244` (`stagingAccessVlasic`)

The predicate treats HRHB-controlled cukle_2 as "lost to enemy". Should treat Federation-aligned (RBiH OR HRHB) as acceptable for staging.

```diff
 const stagingAccessVlasic: AxisPredicate = (state) => {
     for (const osid of VLASIC_STAGING_ANCHORS) {
         const ctrl = getPoliticalControllerOSID(state, osid, undefined);
-        if (ctrl !== null && ctrl !== 'RBiH') {
+        if (ctrl !== null && ctrl !== 'RBiH' && ctrl !== 'HRHB') {
             return { green: false, reason: 'Travnik staging anchor no longer held by 3rd Corps' };
         }
     }
     return { green: true, reason: 'Travnik staging anchors held by 3rd Corps' };
 };
```

**File:** `central_bosnia.ts:63` — same alliance floor reduction as §4.4.

---

## §5 Estimated territorial impact per op (Oct 1995 painted target)

OSIDs that would flip from current live (n1956 final_save) to the painted Oct 1995 control if each op fires AND succeeds. Source: `data/source/calibration/painted_control_oct1995.json` (`by_settlement_id` map).

| Op | Painted-flips / objectives | Faction | Notable OSIDs |
|---|---|---|---|
| `sana_95` (axis 1 Krupa) | 6 / 6 | RS → RBiH | ivanjska_2, arapusa_2, donji_dubovik_2, vranjska_2, jasenica_2, gornja_suvaja |
| `sana_95` (axis 2 Bihać-Petrovac) | 12 / 12 | RS → RBiH | ripac, racic, trubar, orasac_2, vrtoce, **bosanski_petrovac_2**, dobro_selo_2, kolonic_2, vodjenica, prkosi, krnjeusa, jasenovac_2 |
| `sana_95_follow_on` (Sanski Most + Ključ) | 13 / 13 | RS → RBiH | lusci_palanka_2, budimlic_japra_2, **sanski_most_2**, ilidza_2, jelasinovci, kljevci, ostra_luka, skucani_vakuf_2, stari_majdan, hadzici, **kljuc_2**, krasulje_2, sanica_2 |
| `mistral_2_95` (axis 1 Drvar/Grahovo) | 9 / 9 | RS → HRHB | halapic, stekerovci_2, prekaja_2, **drvar_2**, sipovljani_2, crni_lug, **bosansko_grahovo_2**, malesevci, ugarci |
| `mistral_2_95` (axis 2 Sipovo/Mrkonjic) | 11 / 11 | RS → HRHB | brdjani, gornji_mujdzici_2, **sipovo_2**, volari_2, pribeljci_2, gerzovo_2, **mrkonjic_grad_2**, bjelajce_2, baljvine_2, majdan_2, podrasnica_2 |
| `kupres_cincar_94` (Kupres line) | 3 / 3 | RS → HRHB | bucovaca, donji_malovan, novo_selo_2 |
| `vlasic_ridge_95` (Travnik Ridge) | 1 / 3 | RS → RBiH | varosluk only (gornje_krcevine, paklarevo already RBiH) |
| `vlasic_ridge_95` (Skender Vakuf shoulder) | 0 / 4 | — | painted Oct 1995 stays RS for donji_koricani, imljani_2, javorani_2, knezevo_2 — **this axis is historically WRONG to claim** |

**Totals (objective-OSID flips, ignoring axes that would not progress):**
- sana_95 + sana_95_follow_on combined: **31 OSIDs** flip RS→RBiH (entire Una-Sana valley + Sanski Most + Ključ).
- mistral_2_95: **20 OSIDs** flip RS→HRHB (Drvar, Grahovo, Sipovo, Mrkonjic Grad — the whole western-Krajina corridor).
- kupres_cincar_94: **3 OSIDs** flip RS→HRHB (Kupres line, but unblocks dependency for Mistral).
- vlasic_ridge_95: **1 OSID** flip — minor impact; the Skender Vakuf axis would attempt OSIDs that paint says stay VRS at Oct 1995, so allowing it to fire RISKS overshoot (railroad concern: VRS holds these per paint, so the catalog axis 2 is over-painted vs history).

**Strategic dependency chain:**
1. `kupres_cincar_94` (3 flips) unblocks `mistral_2_95` staging dependency (`bucovaca`, `glamoc_2`).
2. `mistral_2_95` (20 flips) clears VRS forces from the western shoulder.
3. `sana_95` (18 flips) launches into Una-Sana valley.
4. `sana_95_follow_on` (13 flips) follows into Sanski Most + Ključ.
5. `vlasic_ridge_95` (1 worthwhile flip; 4 historically-overshoot OSIDs) is independent and low-value.

Total western-Krajina painted-flip headroom across the 4 cascading ops: **~54 OSIDs**, consistent with the SCRT 5-10pp area-weighted estimate.

---

## §6 Recommended sequencing (which to ship first)

Read-only dispatch: ranking, not edits.

**Tier 1 (single-file, highest ROI):**

1. **`kupres_cincar_94` staging-anchor authoring fix** — `central_bosnia.ts:96-101` (4-line delete). Highest unit ROI: unblocks the entire west-shoulder cascade. Also requires the alliance floor reduction at `central_bosnia.ts:63` (one-line change). Combined: TWO line changes, unlocks 3 flips directly + a downstream dependency for 20 more (Mistral).
2. **`mistral_2_95` alliance floor + weakness floor** — `federation_western_bosnia.ts:76, :27` (two constant tweaks). Unlocks 20 flips IF Kupres-Cincar predicate is also fixed (chain dependency).
3. **`sana_95` weakness floor** — `5th_corps.ts:52` (one constant tweak). Unlocks 18 direct flips. INDEPENDENT of west-shoulder cascade.
4. **`sana_95_follow_on`** — no fix beyond §4.1 needed; resolves naturally after sana_95 fires.
5. **`vlasic_ridge_95` staging predicate** — `central_bosnia.ts:239` (one-conjunct addition) and the same alliance floor at `central_bosnia.ts:63` (already changed for Kupres). Low value (1 flip), and there is a railroad-risk concern on the Skender Vakuf axis.

**Recommended shipping order:**

```
Wave A (Krajina collapse cascade — biggest payoff):
  1. KUPRES staging anchors trim + alliance floor → unlock 3 direct, 20 downstream
  2. MISTRAL alliance floor + weakness floor → unlock 20 (after Wave A.1 takes Kupres)

Wave B (Sana valley — independent):
  3. SANA defender_weakness_floor 0.40 → 0.20 → unlock 18+13 (Sana + follow-on chain)

Wave C (low-value cleanup):
  4. VLASIC stagingAccessVlasic Federation-aware fix → unlock 1
```

Wave A unlocks Wave B's strategic context (HVO-side pressure on west pulls VRS Krajina forces); empirically the two waves are independent in code but synergistic in territorial coverage. **Operationally, recommend shipping Wave A first (single Kupres edit + Mistral edit, ~10 LOC total), running a calibration scan, then proceeding to Wave B.** Wave A is more diagnostic about whether the alliance-floor reduction unlocks downstream events without breaking other Federation-gated content; landing it solo gives a clean signal.

**Common-cause findings (cross-cutting):**
- **`FEDERATION_ALLIANCE_FLOOR = 0.50` appears in TWO files** (`federation_western_bosnia.ts:76` and `central_bosnia.ts:63`). Live `war_alliance_rbih_hrhb = 0.10` end-of-run in n1956. Either the floor is uniformly wrong, the late-war alliance-event ratchet is missing, or `war_alliance_rbih_hrhb` represents something other than what these predicates assume. RECOMMEND parent dispatch the alliance-substrate engineer to confirm before patching predicates.
- **`SANA_DEFENDER_WEAKNESS_FLOOR = 0.40` AND `MISTRAL_DEFENDER_WEAKNESS_FLOOR = 0.40`** both gate on the same defender corps trajectory formula against `vrs_2nd_krajina`. They block both ops the same way, simultaneously. Either the formula's expected range is mis-calibrated against substrate, or 0.40 is too aggressive for a corps with `corps_exhaustion=0`. RECOMMEND parent run a diagnostic that emits the float value per turn before re-tuning blindly.
- **No predicate-level CORPS_ELIGIBILITY misroutes** were detected — every primary_corps maps to a real, init'd, brigade-populated corps_command entry in n1956.
- **No `commander_state` regression detected** post-Wave-2 fix at `11d2025b`. All five blocked ops have their primary_corps `commander_state` present.

---

**Memo authorship:** operations-expert, dispatched on `feature/arc-operations-calibration` branch.
**Edits in this dispatch:** none. Investigation only.
**Next action:** parent review of §4 fix sketches; on approval, ship Wave A as a single commit, run n1957, compare anchors, then ship Waves B/C sequentially.
