# Forensics: ARBiH Zero Operations across 188w (n1954)

Run: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1954/`
Hash: `210e69404d054959`
Date: 2026-05-22

## Headline Classification

**COMBINATION: CATALOG-GAP + DECISION-BLOCKED (predicate "commander_confidence")
+ SPAWN-BLOCKED (`t3_authorized_no_offensive`).**

It is **NOT** a bookkeeping bug — the four artifact stores (`operation_history`,
`watched_operations.json`, `operation_aars.json`, `operation_opportunity_*`) are
internally consistent. ARBiH genuinely ran a single operation across 188 weeks
(`Operation Donji Vakuf 95`, arbih_3rd_corps, turn 177), and that single op
appears in `operation_diagnostics` but never reached recovery so never landed in
the persistent `operation_history` (which is RS-18 + HRHB-1 = 19 entries).

The cause decomposes into three layered failures, in order of severity:

1. **CATALOG-GAP** — Only `arbih_3rd_corps` and `arbih_5th_corps` have any
   catalog opportunities authored. ARBiH 1st (Sarajevo), 2nd (Tuzla), 4th
   (Mostar), 6th (Konjic), and 7th (Travnik) Corps have **zero** opportunity
   defs across the entire `src/sim/combat/operation_opportunity_catalog_*.ts`
   surface. Five of seven ARBiH corps are structurally silent.
2. **DECISION-BLOCKED** — `commander_confidence` predicate trips 34 times with
   reason "no 5th Corps commander state available". This is a **state-init
   defect**: `state.military.corps_command['arbih_5th_corps'].commander_state`
   is `undefined` for the entire 188w run, so every Bihać-pocket opportunity
   (apwb_pressure_94, sana_95, sana_95_follow_on, tigar_sloboda_94, grmec_94)
   fails the required `commander_confidence` axis. The 5th Corps catalog is
   authored, but the engine cannot consume it.
3. **SPAWN-BLOCKED** (`t3_authorized_no_offensive`) — Three of the four
   approved opportunities (una_94, breza_94, pauk_94_95) reach the political
   approval step but produce zero corps offensive — they get an "authorized
   but no offensive launched" terminal classification.

---

## Bookkeeping Cross-Check (Numbers Are Consistent)

| Source                                                                                  | RBiH count | RS count | HRHB count |
|-----------------------------------------------------------------------------------------|------------|----------|------------|
| `final_save.json` → `operation_history[]`                                                | **0**      | 18       | 1          |
| `operation_aars.json` (array of AARs)                                                    | **0**      | 18       | 1          |
| `watched_operations.json` (canonical/named only — by design)                             | 0          | 6        | 1          |
| `weekly_report.jsonl` → `operation_diagnostics[].faction_id`                             | **12**     | 187      | 99         |
| `weekly_report.jsonl` → `ops[]`                                                          | 0          | 0        | 0          |
| `final_save.json` → `military.operation_opportunity_traces[]`                            | 110 (all RBiH/Federation pool — see below) |          |            |
| `final_save.json` → `military.operation_opportunity_diagnostics[]`                       | 102        |          |            |
| `final_save.json` → `military.operation_opportunity_resolutions[]`                       | 4          |          |            |
| `final_save.json` → `military.operation_opportunities[]` (still-active at w188)         | 4          |          |            |

Numbers are mutually consistent:
- `operation_history` only persists ops that reach `recovery` phase
  (see `src/sim/combat/sector_offensive.ts` — recovery_reason is set when an
  op moves into the `recovery` phase, and only then does `operation_aar.ts`
  push to history). ARBiH's one op (Donji Vakuf 95) reached `execution` (9
  diagnostic entries in execution phase) but never `recovery`, so 0 history
  rows — correct.
- `weekly_report.operation_diagnostics` captures *active* op state per turn.
  ARBiH gets 12 entries because Donji Vakuf 95 stayed alive (3 turns planning
  + 9 turns execution) across turns ~175–187 of a 188w run.
- `watched_operations.json` is the analyst-curated trace for the 7 sensitive
  canonical operations only (Operation Herzegovina Consolidation, Operation
  Cerska-Kamenica, Operation Kotor Varos, Operation Krivaja-95, Operation
  Posavina Corridor, Operation Stupčanica-95, Operation Mistral 2 — VRS/HRHB
  catalog plus pre-planned). No ARBiH ops are on the watched list because
  no ARBiH op has been canonically named in the watched set.

**No bookkeeping disagreement. The numbers are real.**

---

## Per-Corps ARBiH Op-Attempt Count (188 weeks)

| ARBiH corps                | catalog defs | proposals (traces) | reached `eligible` | approved | spawned CorpsOp | reached `recovery` |
|----------------------------|--------------|--------------------|--------------------|----------|------------------|---------------------|
| arbih_1st_corps (Sarajevo) | **0**        | 0                  | 0                  | 0        | 0                | 0                   |
| arbih_2nd_corps (Tuzla)    | **0**        | 0                  | 0                  | 0        | 0                | 0                   |
| arbih_3rd_corps (Zenica)   | 2 (Vlasic, DV95) | 17 (15+2)      | 1                  | 1        | **1**            | **0**               |
| arbih_4th_corps (Mostar)   | **0**        | 0                  | 0                  | 0        | 0                | 0                   |
| arbih_5th_corps (Bihać)    | 8 (Sana family)| 70                | 0 (all blocked)    | 0        | 0                | 0                   |
| arbih_6th_corps (Konjic)   | **0**        | 0                  | 0                  | 0        | 0                | 0                   |
| arbih_7th_corps (Travnik)  | **0**        | 0                  | 0                  | 0        | 0                | 0                   |
| Federation-cross (hvo_main_staff, hvo_tomislavgrad) | 4 | 23   | 3                  | 3        | 0 (t3 no-off)    | 0                   |

Source for proposals counts:
```
final_save.json → military.operation_opportunity_traces[]
  group by opportunity_id:
    apwb_pressure_94: 18 (all blocked)       — 5th Corps
    vlasic_ridge_95: 15 (all blocked)        — 3rd Corps
    mistral_2_95: 14 (all blocked)           — hvo_main_staff
    sana_95: 14 (all blocked)                — 5th Corps
    sana_95_follow_on: 14 (all blocked)      — 5th Corps
    kupres_cincar_94: 11 (all blocked)       — hvo_tomislavgrad
    tigar_sloboda_94: 10 (all blocked)       — 5th Corps
    grmec_94: 6 (all blocked)                — 5th Corps
    una_94: 2 (1 eligible → t3_authorized_no_offensive)  — 5th Corps
    breza_94: 2 (1 eligible → t3_authorized_no_offensive) — 5th Corps
    pauk_94_95: 2 (1 eligible → t3_authorized_no_offensive) — 5th Corps
    donji_vakuf_95: 2 (1 eligible → 1 approved → spawned) — 3rd Corps
```

---

## Catalog Audit (file-level)

### `src/sim/combat/operation_opportunity_catalog_5th_corps.ts` (1,635 lines)
Constant `PRIMARY_CORPS = 'arbih_5th_corps'` declared at **line 50**. All
opportunities scope to this corps. Faction `RBiH` is set at lines:
317, 361, 574, 850, 1122, 1228, 1324, 1567 — **8 RBiH opportunity defs**
matching the 8 distinct `opportunity_id`s observed in traces above
(operation names: Operation Sana, Operation Sana Follow-On, Operation
Tigar-Sloboda, Operation APWB Pressure, Operation Una 94 Defense,
Operation Breza 94 Defense, Operation Spider Defense, Operation Grmeč 94).

### `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts` (620 lines)
- `PRIMARY_CORPS = 'arbih_3rd_corps'` (line 23)
- `DONJI_VAKUF_PRIMARY_CORPS = 'arbih_3rd_corps'` (line 29)
- `KUPRES_CINCAR_PRIMARY_CORPS = 'hvo_tomislavgrad'` (line 30)
Three ops authored (line 461 Cincar/Kupres → HVO; line 520 Vlasic Ridge →
ARBiH 3rd; line 573 Donji Vakuf 95 → ARBiH 3rd). **2 RBiH defs**.

### `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts` (305 lines)
- `PRIMARY_CORPS = 'hvo_main_staff'` (line 24). One op (Mistral 2, line 246).
  **0 RBiH defs.** HVO-only.

### `src/sim/combat/operation_opportunity_defender_weakness.ts` (68 lines)
Helper, not a catalog. No defs.

### `src/sim/combat/pre_planned_operations.ts`
13 `faction:` declarations — predominantly RS pre-planned (Op Koridor,
Drina, Podrinje Sweep, Visegrad, Prsten, Herzegovina, Foca, Prijedor,
Corridor, Jajce, Donji Vakuf, Bosanski Novi) + HRHB (Op Jackal).
**Zero RBiH pre-planned ops** (lines 75–600).

### `src/sim/combat/triggered_operations.ts`
7 `faction:` declarations — all RS or HRHB (Posavina Corridor, Herzegovina
Consolidation, Kotor Varos, Cerska-Kamenica, Krivaja-95, Stupčanica-95,
Mistral 2). **Zero RBiH triggered ops** (lines 135–506).

**Catalog/pre-planned/triggered grand total per faction:**
| faction | catalog | pre_planned | triggered | total opportunity defs |
|---------|---------|-------------|-----------|------------------------|
| RS      | 0       | 12          | 6         | **18**                 |
| HRHB    | 2 (Cincar/Kupres, Mistral 2 via cat) | 1 (Jackal) | 1 (Mistral 2 dup) | **4** |
| RBiH    | 10 (8 5th-Corps + 2 3rd-Corps)        | 0          | 0          | **10**                 |

The RBiH catalog count (10) is in the same ballpark as VRS (18) but is
narrower in **corps scope**: 5 of 7 ARBiH corps have zero defs while every
VRS corps has at least one pre-planned op assigned. This is the
CATALOG-GAP.

---

## Lifecycle Trace (event-by-event)

`military.operation_opportunity_traces[]` (110 entries) groups by `event`:

| event                              | count |
|------------------------------------|-------|
| `blocked`                          | 102   |
| `eligible`                         | 4     |
| `approved`                         | 1     |
| `t3_authorized_no_offensive`       | 3     |

By `opportunity_id`:

| opportunity_id           | proposals | terminal state                                    | corps                |
|--------------------------|-----------|---------------------------------------------------|----------------------|
| apwb_pressure_94         | 18        | blocked × 18                                      | arbih_5th_corps      |
| vlasic_ridge_95          | 15        | blocked × 15                                      | arbih_3rd_corps      |
| mistral_2_95             | 14        | blocked × 14                                      | hvo_main_staff       |
| sana_95                  | 14        | blocked × 14                                      | arbih_5th_corps      |
| sana_95_follow_on        | 14        | blocked × 14                                      | arbih_5th_corps      |
| kupres_cincar_94         | 11        | blocked × 11                                      | hvo_tomislavgrad     |
| tigar_sloboda_94         | 10        | blocked × 10                                      | arbih_5th_corps      |
| grmec_94                 | 6         | blocked × 6                                       | arbih_5th_corps      |
| una_94                   | 2         | eligible × 1, t3_authorized_no_offensive × 1      | arbih_5th_corps      |
| breza_94                 | 2         | eligible × 1, t3_authorized_no_offensive × 1      | arbih_5th_corps      |
| pauk_94_95               | 2         | eligible × 1, t3_authorized_no_offensive × 1      | arbih_5th_corps      |
| donji_vakuf_95           | 2         | eligible × 1, **approved × 1 → spawned**          | arbih_3rd_corps      |

The four `military.operation_opportunity_resolutions[]` (final dispositions):
```
{exit_class: "t3_authorized_no_offensive", opportunity_id: "una_94",       response_turn: 113}
{exit_class: "t3_authorized_no_offensive", opportunity_id: "breza_94",     response_turn: 125}
{exit_class: "t3_authorized_no_offensive", opportunity_id: "pauk_94_95",   response_turn: 135}
{executed_op_name: "Operation Donji Vakuf 95", opportunity_id: "donji_vakuf_95", response_turn: 177}
```

### Blocker-axis breakdown (failed_required_axes across 102 blocked traces)

| failed axis              | count | top reason                                                                  |
|--------------------------|-------|-----------------------------------------------------------------------------|
| staging_access           | 54    | "Travnik staging anchor no longer held by 3rd Corps" (15); "Sanski/Kljuc interior axis has no live approach corridor" (14); "Kupres/Cincar dependency anchors are not open for Mistral 2" (14); "Livno-Tomislavgrad-Kupres staging anchors are not held" (11) |
| enemy_weakness           | 42    | "VRS Krajina defender corps not yet degraded enough for exploitation" (42)  |
| commander_confidence     | 34    | "no 5th Corps commander state available" (34) — STATE INIT DEFECT           |
| alliance_context         | 26    | "post-Washington Federation coordination below threshold" (15); "post-Washington Federation coordination below Kupres/Cincar threshold" (11) |
| political_authorization  | 14    | "Federation authorization below Mistral 2 threshold" (14)                   |

The `commander_confidence` 34-count is the most actionable single defect:
the 5th Corps catalog is fully authored, but `commander_state` for
`arbih_5th_corps` is absent from `state.military.corps_command`, so the
predicate `state.military.corps_command?.[PRIMARY_CORPS]?.commander_state`
(see e.g. `operation_opportunity_catalog_5th_corps.ts:259, 278, 286, 337,
356`-class checks via `central_bosnia.ts`) returns `undefined` and the
axis fails as a hard required-red.

The `staging_access` 54-count is the second-highest. "Travnik staging
anchor no longer held by 3rd Corps" (15 instances of vlasic_ridge_95)
indicates that the Travnik OSID is being lost by ARBiH during the war
— an upstream territory-loss problem, not an ops design problem.

### The single launched op: donji_vakuf_95

Approved at turn 177. `executed_op_name = "Operation Donji Vakuf 95"`
appears in `operation_diagnostics` for `arbih_3rd_corps` for 12 turns:
- planning: 3 turns
- execution: 9 turns
- recovery: 0 turns (run ends at turn 188 before op cycles to recovery)

Therefore this op never lands in `operation_history`. Combined with the
2026-05-22 lifecycle hardening commits (f38a4824 prevent-idle-objective-
skips, 5e659e5f Donji-Vakuf-launch-feasibility, c4e77931 headless-
decisions, 773ea9d8 require-battle-feedback, d455a21b bound-attack-
through, 051d1ae8 expire-COHA-combat-suppression), it's plausible the op
is now firing late enough to not complete before run-end. But that
doesn't explain the other 5 corps having **zero** activity.

---

## Why Each Lifecycle Stage Yields the Observed Numbers

1. **PROPOSAL (catalog enumeration)**: 12 distinct ARBiH/Federation opportunity
   defs across 3 catalog files. 5 of 7 ARBiH corps have zero defs → **CATALOG-GAP**.
2. **PROPOSAL → ELIGIBLE**: 102/110 blocked. Root causes are
   (a) `commander_confidence` state-init defect for arbih_5th_corps (34 entries),
   (b) `staging_access` for Travnik/Sanski/Kljuc/Kupres (54 entries, mostly
       legitimate territorial loss), (c) `enemy_weakness` floor not met
       (42 entries) — VRS 2nd Krajina never degraded enough for Sana family to
       unlock through this axis. **PREDICATE-BLOCKED.**
3. **ELIGIBLE → APPROVED**: 4/4 eligible opportunities (una_94, breza_94,
   pauk_94_95, donji_vakuf_95) are approved. Headless decisions appear to be
   working post-c4e77931 — no opportunity is stuck eligible-but-not-decided.
4. **APPROVED → SPAWNED**: 1 of 4 approved spawned a CorpsOperation
   (donji_vakuf_95). The other 3 (una_94, breza_94, pauk_94_95) hit
   `t3_authorized_no_offensive` — approved by political layer but did not
   produce a corps-level offensive. **SPAWN-BLOCKED.** Grep for
   `t3_authorized_no_offensive` in `src/sim/combat/operation_opportunities.ts`
   to find the spawn handler and verify whether it requires additional
   readiness gating (likely `corps_operation_readiness.ts`).
5. **SPAWNED → LAUNCHED**: donji_vakuf_95 launched (12 diagnostic turns).
6. **LAUNCHED → RECOVERED → HISTORY**: 0 reached recovery. Run ended before
   recovery cycle.

---

## Single Most-Actionable Next Step

**Investigate why `state.military.corps_command['arbih_5th_corps'].commander_state`
is undefined across the entire 188w run.** This is the highest-leverage single
defect: it unlocks 8 catalog opportunities (apwb_pressure_94, sana_95,
sana_95_follow_on, tigar_sloboda_94, grmec_94, una_94, breza_94, grmec_94, plus
implicitly the pauk_94_95 5th-Corps variant). All five blocked
`commander_confidence` opportunities targeted arbih_5th_corps; no other ARBiH
corps shows this blocker. The probable surface: `src/sim/combat/corps_command.ts`
init (look for arbih_5th_corps formation initialization path; commander_state
is typically populated by the corps commander v0.8 stack via
`src/sim/combat/commander/`).

**Second priority (medium-effort, high-impact)**: author opportunity defs for
arbih_1st (Sarajevo), arbih_2nd (Tuzla), arbih_4th (Mostar), and arbih_7th
(Travnik) corps. These five corps had **zero** proposals across 188 weeks —
which is why personnel growth from 48k → 209k produced no offensive activity.
ARBiH has the formations and the manpower; the engine has no opportunity defs
to evaluate for them.

**Third priority (small surgical fix)**: investigate the
`t3_authorized_no_offensive` spawn-blocked path. With 3 of 4 approved
opportunities terminating here, the spawn handler is the bottleneck between
political approval and corps-level CorpsOperation creation. Likely site:
`src/sim/combat/operation_opportunities.ts` (search for `t3_authorized`).

---

## Verification Checklist

- [x] `operation_history` ARBiH count = 0 (final_save.json)
- [x] `operation_aars.json` ARBiH count = 0
- [x] `watched_operations.json` ARBiH count = 0 (by design — sensitive-history only)
- [x] `weekly_report.jsonl` ARBiH `operation_diagnostics` = 12 (one op, arbih_3rd_corps)
- [x] `operation_opportunity_traces[]` total = 110; 12 distinct opportunity_ids
- [x] `operation_opportunity_resolutions[]` = 4 (3 t3_authorized_no_offensive + 1 executed)
- [x] 5 of 7 ARBiH corps have zero catalog/pre-planned/triggered defs
- [x] 5th Corps commander_state init defect documented as top blocker
- [x] All numbers internally consistent — no bookkeeping bug

---

## File:Line References

- `operation_history` schema: `src/state/game_state.ts` (search `operation_history`)
- Lifecycle persistence (only `recovery` reaches history): `src/sim/combat/sector_offensive.ts`, `src/sim/combat/operation_aar.ts`
- 5th Corps catalog PRIMARY_CORPS: `src/sim/combat/operation_opportunity_catalog_5th_corps.ts:50`
- 5th Corps catalog faction lines: `:317, :361, :574, :850, :1122, :1228, :1324, :1567`
- Central Bosnia catalog PRIMARY_CORPS: `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts:23, :29, :30`
- Federation Western Bosnia catalog PRIMARY_CORPS: `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts:24`
- `commander_state` lookup site (representative): `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts:278, :356, :434` and the analogous lines in 5th_corps.ts (search `commander_state`)
- pre_planned_operations.ts faction declarations: lines 77, 123, 161, 207, 235, 294, 352, 397, 456, 501, 548, 576, 601
- triggered_operations.ts faction declarations: lines 135, 171, 227, 257, 406, 454, 506
