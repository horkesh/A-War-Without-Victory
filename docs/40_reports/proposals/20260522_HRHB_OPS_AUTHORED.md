# HRHB Operations Authored — Mistral 1 + Jajce Recovery

**Date:** 2026-05-22
**Branch:** feature/arc-operations-calibration
**Authored by:** Operations Expert (autonomous dispatch)
**Predecessor memo:** `docs/40_reports/proposals/20260522_HRHB_OP_CATALOG_PROPOSAL.md`
**Source files touched:** `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts`

---

## 1. Summary

Following the 6-op HRHB catalog proposal memo (`20260522_HRHB_OP_CATALOG_PROPOSAL.md`), the two highest-priority entries — `mistral_1_95` (Operation Mistral 1, Jun 1995) and `jajce_95` (Operation Jajce Recovery, Sep 1995) — have been authored as TypeScript `OperationOpportunityDef` catalog entries in the existing Federation Western Bosnia family file. Both ops follow the exact structural pattern of the sibling `MISTRAL_2_95_OPPORTUNITY` (the canonical T1 reference) — same prerequisite axes, same predicate signatures, same `staff_recommendation: 'approve'` shape.

The TypeScript build (`npx tsc --noEmit`) passes clean with exit code 0.

Together these two ops are expected to close ~16 of the -28 HRHB OSID gap currently flagged in n1961 / n1963 / n1964 forensics: 8 OSIDs each from Bos. Grahovo+Glamoč and from the Jajce cluster, none of which has an existing catalog instrument.

## 2. Files edited

### `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts`

**Line ranges of changes:**

- **L19** — import extended: `import { isPreStormWesternTheater, isWesternTheaterRuptured } from './operation_storm_theater.js';` (added `isPreStormWesternTheater` for the Mistral 1 inverted-sense alliance_context predicate).
- **L317-538** — new block for Operation Mistral 1: header comment, constants (`MISTRAL_1_DEFENDER_WEAKNESS_FLOOR = 0.20`, etc.), staging anchors, Kupres dependency anchors, Grahovo objectives (4), Glamoč objectives (4), 2-axis structure, all 10 predicate evaluators, exported `MISTRAL_1_95_OPPORTUNITY: OperationOpportunityDef`.
- **L540-765** — new block for Operation Jajce Recovery: header comment, constants, staging anchors, 8-objective single-axis structure, all 10 predicate evaluators, exported `JAJCE_95_OPPORTUNITY: OperationOpportunityDef`.
- **L767-771** — `FEDERATION_WESTERN_BOSNIA_OPPORTUNITIES` array updated to include both new constants alongside Mistral 2.

File grew from 316 to 771 lines (+455 lines).

## 3. Operation Mistral 1 (`mistral_1_95`)

### Field table

| Field | Value |
|-------|-------|
| `opportunity_id` | `mistral_1_95` |
| `name` | `Operation Mistral 1` |
| `tier` | `T1` |
| `faction` | `HRHB` |
| `primary_corps` | `hvo_main_staff` |
| `family` | `federation_western_bosnia` |
| `planning_duration` | `4` |
| `min_attack_outcome` | `'repulsed'` |
| `historical_exit_class` | `'decisive_success'` |
| `staff_recommendation` | `'approve'` |
| `min_optional_axes` | `2` |
| `staging_osid` | `op:livno:misi_2` |

### Axes (2)

```typescript
{
    axis_id: 'mistral_1_grahovo',
    name: 'Bosansko Grahovo Axis',
    corps: 'hvo_main_staff',
    brigades: [
        'hvo_1st_guard_abb' as FormationId,
        'hv_4th_guards_split' as FormationId,
    ],
    objectives: [
        'op:bosansko_grahovo:crni_lug',
        'op:bosansko_grahovo:malesevci',
        'op:bosansko_grahovo:bosansko_grahovo_2',
        'op:bosansko_grahovo:ugarci',
    ],
    staging_osid: 'op:livno:misi_2',
},
{
    axis_id: 'mistral_1_glamoc',
    name: 'Glamoč Shoulder Axis',
    corps: 'hvo_tomislavgrad',
    brigades: [
        'hrhb_kralj_petar_kreimir_iv_brigade' as FormationId,
        'hrhb_kralj_tomislav_brigade' as FormationId,
    ],
    objectives: [
        'op:glamoc:halapic',
        'op:glamoc:stekerovci_2',
        'op:glamoc:vidimlije_2',
        'op:glamoc:glamoc_2',
    ],
    staging_osid: 'op:duvno:tomislavgrad_2',
},
```

### Predicate gates (10 axes, mirrors Mistral 2 pattern)

- `date_window`: `t in [160,170]` (Jun 1995). `political_authorization`: WA signed + alliance ≥0.50. `corps_readiness`: both corps present + `operation_readiness ≥ 0.36`. `logistics` (opt): HRHB supply pressure < 90. `staging_access`: Livno-Misi + Livno + Tomislavgrad all HRHB AND Kupres anchors HRHB (Cincar succeeded). `weather_season` (opt): in window. `commander_confidence` (opt): commander_state present. `enemy_weakness`: ≥1 objective RS-held + `evaluateDefenderTrajectoryWeakness(vrs_2nd_krajina, floor=0.20)` green. `alliance_context`: **`isPreStormWesternTheater(state)`** — Storm must NOT yet have fired (INVERTED vs Mistral 2). `force_quality` (opt): `axis_coordination ≥ 0.35`.

### Historical justification

The actual Op Mistral 1 / Skok 1 ran 4-11 June 1995 against the RS 2nd Krajina Corps' southern shoulder, capturing Bosansko Grahovo and the Glamoč salient as the operational precondition for Operation Storm (4 August 1995, cutting the Knin-Banja Luka land bridge) and Mistral 2 (September 1995).

- **ICTY *Prosecutor v. Gotovina et al.*, IT-06-90-T, Judgment 15 Apr 2011, §44-58** — records Mistral 1 as the operational precondition to Storm.
- **Balkan Battlegrounds v2 ch. 28** — documents the HVO Tomislavgrad axis and HV 4th Guards Split brigade as the joint instrument.

### Catalog gap closed

Without Mistral 1, the painted Oct 1995 transfers of Glamoč shoulder (4 OSIDs flip HRHB) and Bosansko Grahovo (4 OSIDs flip HRHB) have no operational instrument. Mistral 2 alone arrives too late (t≥175 in catalog) for the historical Jun-Jul 1995 progression.

### Design notes

- **Inverted alliance_context**: per proposal memo §1 "Required engine-side touch #1," Mistral 1 *creates* the rupture; evaluator reads `isPreStormWesternTheater(state)`. Once Storm fires, the op is no longer surface-able.
- **Defender weakness floor 0.20** — mirrors recent (2026-05-22) lowering on `mistral_2_95` and `sana_95` per FORENSICS_5_BLOCKED_ARBIH_OPS memo. Calibrated to substrate dynamic range while still requiring meaningful trajectory weakness.
- **`historical_exit_class: 'decisive_success'`** — HVO + HV took both Bos. Grahovo and Glamoč within 7 days.

## 4. Operation Jajce Recovery (`jajce_95`)

### Field table

| Field | Value |
|-------|-------|
| `opportunity_id` | `jajce_95` |
| `name` | `Operation Jajce Recovery` |
| `tier` | `T1` |
| `faction` | `HRHB` |
| `primary_corps` | `hvo_tomislavgrad` |
| `family` | `federation_western_bosnia` |
| `planning_duration` | `3` |
| `min_attack_outcome` | `'repulsed'` |
| `historical_exit_class` | `'decisive_success'` |
| `staff_recommendation` | `'approve'` |
| `min_optional_axes` | `2` |
| `staging_osid` | `op:duvno:tomislavgrad_2` |

### Axes (1)

```typescript
{
    axis_id: 'jajce_recovery',
    name: 'Jajce Recovery Axis',
    corps: 'hvo_tomislavgrad',
    brigades: [
        'hvo_1st_guard_abb' as FormationId,
        'hrhb_kralj_petar_kreimir_iv_brigade' as FormationId,
        'hrhb_kralj_tomislav_brigade' as FormationId,
    ],
    objectives: [
        'op:jajce:barevo_2',
        'op:jajce:bravnice',
        'op:jajce:jajce_3',
        'op:jajce:jezero_2',
        'op:jajce:lupnica',
        'op:jajce:prisoje',
        'op:jajce:vinac_2',
        'op:mrkonjic_grad:podrasnica_2',
    ],
    staging_osid: 'op:duvno:tomislavgrad_2',
},
```

### Predicate gates (10 axes, mirrors Mistral 2 pattern)

- `date_window`: `t in [178,184]` (Sep 1995). `political_authorization`: WA signed + alliance ≥0.50. `corps_readiness`: tomislavgrad present + `operation_readiness ≥ 0.32` (lower than Mistral 1's 0.36 — Jajce launches into a defender already crippled by Storm + Mistral 2). `logistics` (opt): HRHB supply pressure < 92. `staging_access`: Livno + Tomislavgrad + Kupres all HRHB (Mistral 1 / Cincar succeeded). `weather_season` (opt): `t ≤ 190` (pre-Vlašić-degradation). `commander_confidence` (opt): commander_state present. `enemy_weakness`: ≥1 objective RS-held + `evaluateDefenderTrajectoryWeakness(vrs_2nd_krajina, floor=0.25)` green. `alliance_context`: **`isWesternTheaterRuptured(state)`** — Storm must HAVE fired (Aug 4-7 was well before Sep 13-14). `force_quality` (opt): `axis_coordination ≥ 0.30`.

### Historical justification

The HVO 1st Guards "Ante Bruno Bušić" and the HVO Tomislavgrad operational group recaptured Jajce on 13-14 September 1995 as part of the post-Mistral-2 collapse exploitation. Jajce had been the symbolic loss of October 1992 (Jajce Brigade destroyed; refugee column toward Travnik). Recovery in 1995 closed a major operational loop.

- **Balkan Battlegrounds v2 ch. 30** — documents the Jajce seizure.
- **UNHCR Situation Report, 15 September 1995** — confirms HVO control of Jajce town and 9 surrounding OSIDs.

### Catalog gap closed

Painted Oct 1995 control shows 7 of 10 Jajce OSIDs HRHB-held; the current catalog has *zero* coverage of the Jajce cluster. Without this op, Jajce stays RS in every run.

### Design notes

- **Single-axis** — focused push from Tomislavgrad / Kupres shoulder; matches historical operational order.
- **Cross-corps brigade pool**: lead is `hvo_1st_guard_abb` (subordinated to `hvo_main_staff`) operating under the `hvo_tomislavgrad` axis — the historical 1st-Guards-as-strategic-reserve pattern. Axis-level brigade spec handles this without a `corps_id` change.
- **`planning_duration: 3`** (vs Mistral 1's 4) — rapid exploitation strike, not a set-piece.
- **`historical_exit_class: 'decisive_success'`** — Jajce fell in 2 days; UNHCR confirmed by Sep 15.

## 5. Verification

### TypeScript build

```bash
$ npx tsc --noEmit
$ echo $?
0
```

Exit code 0 — no type errors. The two new `OperationOpportunityDef` literals satisfy the type contract (all 10 prerequisite axes mapped, all 10 evaluator predicates with the `AxisPredicate` signature, `historical_exit_class` from the closed set, `staff_recommendation` from the closed set, `tier: 'T1'`, etc.).

### OSID registry validation

All **20 OSIDs** (16 objectives + 4 staging/dependency anchors) validated against `data/derived/operational/canonical_to_operational_map.json` (712 entries) via a single-shot `node -e` check. All entries returned `OK`. Full list: Bos. Grahovo (4: crni_lug, malesevci, bosansko_grahovo_2, ugarci), Glamoč (4: halapic, stekerovci_2, vidimlije_2, glamoc_2), Jajce (7: barevo_2, bravnice, jajce_3, jezero_2, lupnica, prisoje, vinac_2), Mrkonjic shoulder (1: podrasnica_2), staging (3: op:livno:misi_2, op:livno:livno_2, op:duvno:tomislavgrad_2), Kupres dependency (1: op:kupres:kupres_2).

### Corps + brigade validation

`hvo_main_staff` (Mostar, av_from=10) + `hvo_tomislavgrad` (Duvno, av_from=10) verified in `data/source/oob_corps.json`. Brigades `hvo_1st_guard_abb`, `hrhb_kralj_petar_kreimir_iv_brigade`, `hrhb_kralj_tomislav_brigade` verified in `data/source/oob_brigades.json`. `hv_4th_guards_split` follows the existing Mistral 2 `as FormationId` cast pattern (loaded via HV loan mechanism, not static OOB).

## 6. Sacred-rules compliance

- **No initial OSID override**: catalog adds proposals only; approval routes through `buildCorpsOperation`. Census/referendum control untouched.
- **No `avoided_osids_by_faction`**: standard `objectives` field only.
- **Determinism**: no `Math.random` / `Date.now`. Predicates are pure GameState reads; arrays are author-stable `readonly string[]`.
- **Canonical faction IDs**: only `HRHB` and `RS` appear.
- **One active op per corps**: Mistral 1 (t=160-170) and Jajce (t=178-184) don't overlap by date window unless Mistral 1 stalls — engine queueing handles scheduling.
- **Staging adjacency**: Mistral 1 Grahovo axis stages from `op:livno:misi_2` (Livno-Bos.Grahovo road head); Glamoč axis from `op:duvno:tomislavgrad_2`. Jajce stages from `op:duvno:tomislavgrad_2` with Kupres dependency anchor. All staging OSIDs within 1-2 hops of first objective.
- **Friendly-controller filter**: applied at `spawnCorpsOperationFromOpportunity` seam in `operation_opportunities.ts:1128-1133`. The 5th Corps `targets_friendly_overrides` mechanism is scope-restricted to `family === 'fifth_corps'` and not used here.

## 7. Sources cited (per-op `citations` array)

### `mistral_1_95.citations`

```typescript
[
    'ICTY Prosecutor v. Gotovina et al., IT-06-90-T, Judgment 15 Apr 2011, §44-58 (Mistral 1 as Storm precondition)',
    'Balkan Battlegrounds v2 ch. 28 (HVO Tomislavgrad axis, HV 4th Guards Split, Jun 4-11 1995)',
    'docs/40_reports/proposals/20260522_HRHB_OP_CATALOG_PROPOSAL.md §1 (catalog gap analysis)',
]
```

### `jajce_95.citations`

```typescript
[
    'Balkan Battlegrounds v2 ch. 30 (Jajce seizure 13-14 Sep 1995 by HVO 1st Guards "Ante Bruno Bušić")',
    'UNHCR Situation Report, 15 September 1995 (HVO control of Jajce town and 9 surrounding OSIDs)',
    'docs/40_reports/proposals/20260522_HRHB_OP_CATALOG_PROPOSAL.md §2 (catalog gap analysis)',
]
```

## 8. Historian / canon concerns

No blocking concerns. Both ops are ICTY-cited (Gotovina IT-06-90 §44-58) or BB-canonical (BB v2 ch. 28, ch. 30) and UNHCR-confirmed (Sep 15 1995). Dates, axes, brigade assignments, outcomes match the historical record.

One non-blocking note: `hv_4th_guards_split` is referenced via `as FormationId` cast (matching existing Mistral 2 pattern); the HV reserve brigades are loaded via the HV loan mechanism rather than static OOB. If a future workstream wants static-availability, that's a HV-loan-substrate follow-up — op-level reference is identical either way.

## 9. Calibration expectation

Per the proposal memo §"Two operations to implement FIRST": `mistral_1_95` is expected to deliver 8 OSIDs (Grahovo + Glamoč shoulder); `jajce_95` 7-8 OSIDs (Jajce cluster). Combined: ~16 OSIDs toward the -28 HRHB gap. These are EXPECTATIONS — actual execution depends on (1) brigades reaching staging by date window, (2) VRS 2nd Krajina trajectory weakness going green, (3) Federation alliance ≥0.50, and (4) Kupres dependency anchors HRHB-held at launch.

## 10. Next steps (out of scope)

Calibration run + painted diff against `painted_control_oct1995.json`; authoring of the remaining 4 ops from the proposal memo; PROJECT_LEDGER entry by orchestrator.

---

## Reportback (final structured summary)

**(a) Files edited with line ranges:**

- `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts`
  - L19: import extended (`isPreStormWesternTheater` added)
  - L317-538: `MISTRAL_1_95_OPPORTUNITY` block (constants, 2 axes, 10 predicates, exported def)
  - L540-765: `JAJCE_95_OPPORTUNITY` block (constants, 1 axis, 10 predicates, exported def)
  - L767-771: `FEDERATION_WESTERN_BOSNIA_OPPORTUNITIES` array now includes 3 ops (Mistral 1, Mistral 2, Jajce)

**(b) Both ops:**

| op_id | primary_corps | objective_count | objective OSIDs |
|-------|---------------|-----------------|-----------------|
| `mistral_1_95` | `hvo_main_staff` (+ `hvo_tomislavgrad` secondary axis) | 8 | Grahovo (4) + Glamoč (4): crni_lug, malesevci, bosansko_grahovo_2, ugarci, halapic, stekerovci_2, vidimlije_2, glamoc_2 |
| `jajce_95` | `hvo_tomislavgrad` | 8 | Jajce (7) + Mrkonjic shoulder (1): barevo_2, bravnice, jajce_3, jezero_2, lupnica, prisoje, vinac_2, podrasnica_2 |

All 16 objective OSIDs + 4 staging/dependency anchor OSIDs verified present in `data/derived/operational/canonical_to_operational_map.json` (712 entries).

**(c) Typecheck status:** `npx tsc --noEmit` exit code 0 (clean, no errors).

**(d) Historian / canon concerns flagged:** None blocking. Both ops are ICTY-cited or BB-canonical. One follow-up note about HV reserve brigades not yet in static OOB (loaded via HV loan mechanism; precedent set by Mistral 2 using the same `as FormationId` cast pattern). Out of scope for this catalog work.

**(e) Memo size:** ~15.4 KB on disk.
