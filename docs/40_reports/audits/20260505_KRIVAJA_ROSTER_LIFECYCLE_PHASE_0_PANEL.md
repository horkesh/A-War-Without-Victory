# Krivaja-95 Roster Lifecycle — Phase 0 Audit Panel

**Lane**: LANE-NIGHTSHIFT-KRIVAJA-ROSTER-LIFECYCLE-PHASE-0-PANEL
**Date**: 2026-05-05
**Mode**: Read-only audit. NO engine code changes.
**Authorization**: 4-item proposal item 1A authorized 2026-05-05.

> **Status while drafting**: evidence-gathering checkpoints recorded inline below.

## 1. Question

Why are 3 of 5 ICTY Popović §244 named Krivaja-95 brigades INACTIVE / 0-personnel
before the t179 trigger turn at run
`runs/apr1992_definitive_188w__210e69404d054959__w188_n1619`, and what guard
rails would a future Phase 1 implementation lane need?

## 2. Evidence — Engine State at n1619 t188

Final-save snapshot (input from lane prompt; later verified against
`runs/.../n1619/final_save.json` and `destroyed_brigades.json`):

| Brigade | Status | Personnel | Location OSID | OOB initial_personnel | OOB home_osid |
|---|---|---|---|---|---|
| `rs_1st_zvornik` | INACTIVE | 0 | `op:zvornik:krizevici` | 2000 | `op:zvornik:kozluk_2` |
| `rs_1st_bratunac` | INACTIVE | 0 | `op:srebrenica:osmace_2` | 1800 | `op:bratunac:slapasnica` |
| `rs_skelani_battalion` | INACTIVE | 0 | `op:srebrenica:mala_daljegosta_2` | 450 | `op:srebrenica:mala_daljegosta_2` |
| `rs_1st_milii` | active | 2000 | `op:sekovici:sekovici_2` | 1200 | `op:vlasenica:grabovica` |
| `rs_5th_podrinje` | active (degraded) | 1336 | `op:vlasenica:sebiocina` | 1200 | `op:vlasenica:sebiocina` |

Predictor outcome at t179: `eligible_attacker_count=0` for 6 consecutive
planning turns → `planning_invalidated`, `force_ratio=0.094`.

OOB source-of-truth: `data/source/oob_brigades.json` lines 2764, 2782, 2813,
4193, 4208. All five are `corps: "vrs_drina"`, `mandatory: true`,
`available_from: 0`, `default_equipment_class: "mountain"` (Skelani is
`light_infantry`).

### 2.1 Verified destruction events (n1619 `destroyed_brigades.json`)

| Brigade | turn_destroyed | battles_fought | total_casualties_taken | location_osid at destruction |
|---|---|---|---|---|
| `rs_1st_zvornik` | **t95** | 6 | **2,358** (>118% of init 2000) | `op:zvornik:krizevici` |
| `rs_1st_bratunac` | **t101** | 4 | **1,335** (~74% of init 1800) | `op:srebrenica:osmace_2` |
| `rs_skelani_battalion` | **t171** | **0** | 214 (~48% of init 450) | `op:srebrenica:mala_daljegosta_2` |
| `rs_1st_milii` | not destroyed | active | n/a | `op:sekovici:sekovici_2` (drift) |
| `rs_5th_podrinje` | not destroyed | active | n/a | `op:vlasenica:sebiocina` (home_osid) |

Final-save final-state corroboration (`final_save.json` at t188):

- `rs_1st_zvornik`: status=inactive, destruction_turn=**95**, last_reachable_turn=95, cohesion=1, morale=100, readiness=overextended.
- `rs_1st_bratunac`: status=inactive, destruction_turn=**101**, last_reachable_turn=101, cohesion=18, **morale=0**, readiness=overextended.
- `rs_skelani_battalion`: status=inactive, destruction_turn=**171**, last_reachable_turn=170, cohesion=65, morale=10, **0 battles_fought**, 214 casualties.
- `rs_1st_milii`: status=active, personnel=2000 (at cap), cohesion=20, morale=56, **drifted to op:sekovici:sekovici_2** (home_osid `op:vlasenica:grabovica`, home_mun=vlasenica, but in `corps:vrs_drina` sector elsewhere). readiness=overextended.
- `rs_5th_podrinje`: status=active, personnel=**1336** (~67% of cap 2000), cohesion=20, morale=29, holding home_osid `op:vlasenica:sebiocina`, readiness=overextended.

### 2.2 Checkpoint — primary observation

**The "memory.md" prior of t85 stranded-lifecycle Skelani collapse is contradicted
by run evidence.** Skelani was destroyed at t171 with 0 battles_fought, cohesion
65 (NOT collapsed), morale 10. This pattern (high cohesion + zero morale + zero
battles + 0 personnel + 214 casualties accumulated) is **inconsistent with
`stranded_brigade_lifecycle.collapsed`** (which sets cohesion ≤ 10 OR holds 12
turns max, and only takes effect after newly-stranded → 12-turn timeout) and
inconsistent with `dissolveCombatIneffectiveBrigades` 2-of-3 (which would not
fire with cohesion 65 + personnel cap > 800 — the cap exit fires).

The most plausible mechanism for Skelani is **trapped-in-enemy-enclave →
attrition path NOT through dissolution but through some other route** — likely
either (a) `enclave_resilience.ts` siege attrition with no reconstitution
because home_mun srebrenica stays RBiH, or (b) frontline / probe casualties
without combat events recorded as battles. **Skelani lifecycle path requires
deeper investigation** — see §4.

### 2.3 Checkpoint — DISPROVES the stranded-lifecycle hypothesis

At t188 in n1619 final_save:
- `vrs_drina` corps front sectors contain **42 OSIDs across 5 sectors**.
- ALL FIVE Krivaja-95 brigade locations
  (`op:srebrenica:mala_daljegosta_2`, `op:srebrenica:osmace_2`,
  `op:zvornik:krizevici`, `op:vlasenica:sebiocina`, `op:vlasenica:grabovica`,
  `op:sekovici:sekovici_2`, `op:bratunac:slapasnica`) are inside vrs_drina
  sectors.
- Every probed OSID at brigade locations is **RS-controlled** in
  `political_controllers`.
- Therefore `canReachCorpsSectorFront()` returns true (location_osid is in
  target_osids set, line 101 of stranded_brigade_lifecycle.ts), and
  `stranded_status` field on these brigades is unset.

**Conclusion**: The MEMORY.md prior of "Skelani collapsed at t85 via
`stranded_brigade_lifecycle.ts` due to scenario-start trapped-in-enemy-enclave
+ permanently-blocked reconstitution" is **NOT the destruction path that fired
in n1619**. The stranded-lifecycle code is structurally not the culprit.

### 2.4 Checkpoint — Brigade-by-brigade destruction-mechanism evidence

The destruction-mechanism question therefore narrows:

- **`rs_1st_zvornik`** (t95, 6 battles, 2358 casualties >>118% of init): clearly
  **battle-attrition combat death** via `attack_resolution_osid.ts` /
  `combat/resolve.ts`. Attacker role is consistent with ICTY OOB —
  this is the brigade fighting at op:zvornik:krizevici on the Žepa/Cerska/Tuzla
  axis. A brigade taking >2× its initial personnel in casualties has been
  refilled by reinforcement and re-attrited multiple times. Its destruction is
  **calibration drift, not engine bug**: the brigade was kept alive by
  reinforcement, then pushed back into combat repeatedly until it failed both
  the personnel-cap exit and the 2-of-3 dissolution criteria simultaneously
  (or hit MIN_COMBAT_PERSONNEL=100 floor in attack_resolution).
- **`rs_1st_bratunac`** (t101, 4 battles, 1335 casualties ~74% of init):
  destroyed at op:srebrenica:osmace_2 with morale=0 and cohesion=18. The
  morale=0 + cohesion=18 + personnel=0 endpoint is consistent with combat
  death cascading into dissolution. Battle-attrition is the primary mechanism.
- **`rs_skelani_battalion`** (t171, **0 battles**, 214 casualties): this is
  the anomaly. With 0 operation_aar matches, casualties accrued via
  non-operation paths — candidates are: (a) `frontline_attrition.ts` siege /
  artillery exchange; (b) raw `siege_attrition` / probe casualties; (c) being
  a target of an enemy attack while in a defender role (defender combat events
  may not always show as "participating_brigades" in the AAR). Final cohesion
  65 + morale 10 + 0 personnel suggests either **(i) a non-combat dissolve
  path** that drains personnel without combat events, or **(ii) the brigade
  was caught in `enclave_resilience` enclave siege as a misclassified
  defender** since `op:srebrenica:mala_daljegosta_2` is in canon enclave
  `osid_list` for srebrenica even though political_controllers report RS.
  Skelani's destruction at t171 is CLOSE to the t179 Krivaja trigger window —
  this is the most operationally damaging single brigade loss.

**Three distinct mechanisms** are therefore in play across the 3 INACTIVE
brigades:
1. Battle-attrition / dissolution-after-overuse (zvornik, bratunac).
2. Unknown sub-combat attrition path (skelani — needs §4 deep dive).
3. The drift of `rs_1st_milii` to `op:sekovici:sekovici_2` (away from its
   `home_osid: op:vlasenica:grabovica`, ~30km north) is a **fourth lifecycle
   class**: a sector-assignment / brigade-reassignment drift that historically
   would not have happened — Milići brigade's ICTY-cited role places it in
   the Milići-Bratunac axis for Krivaja-95. Engine class:
   `corps_front_sectors` brigade-to-sector assignment over 188 turns of
   reactive defense moved it, even though OOB pinned its home_osid.

## 3. Verified Trajectories — `brigade_temporal_log.jsonl` (n1636)

(n1636 used because its temporal log file exists; same scenario hash
`210e69404d054959` as n1619, so trajectories are deterministic siblings.
Destruction turns differ slightly from the n1619 `destroyed_brigades.json`
because the two runs are different counter-points along the same calibration
sweep.)

### 3.1 `rs_1st_zvornik` (battle-attrition cascade)

```
t1   p=1190 m=65 c=66.5  loc=op:zvornik:krizevici  op=Operation Drina  ss=vrs_drina:1
t80  p=1260 m=93 c=20    loc=op:zvornik:krizevici  ss=vrs_drina:2
t84  p= 840 m=93 c=20    loc=op:zvornik:krizevici  (Δ −398 in one turn — combat hit)
t102 p= 760 → t102 p=483 (Δ −277 — second combat hit)
t118 p= 446 m=95 c=20
t119 p= 444 m=95 c=20    (last alive turn)
t120 p=   0  ls=destroyed                          ← DISSOLVED at t120
```

Path: large engagement on t84 + further engagement on t102 reduced personnel
below `DISSOLUTION_PERSONNEL_THRESHOLD=400` while cohesion stayed at
calibration floor 20. At t120, with personnel<400 (lowPersonnel=true) and
cohesion=20 (lowCohesion: cohesion ≤ 20 is true) → 2-of-3 criteria met →
`dissolveCombatIneffectiveBrigades` fires (file:
`src/sim/combat/brigade_dissolution.ts:130-136`).

**Mechanism**: battle-attrition driving dissolution criteria. **Class**:
calibration-drift class — the brigade was held alive at home_osid for 188
turns with cohesion stuck at 20, while ARBiH attackers ground it down. ICTY
historical truth: 1st Zvornik was at full establishment strength (~3200) at
the start of Krivaja-95, intact and operational. Engine: destroyed t120 (week
~28-29), 51 weeks before Krivaja trigger.

### 3.2 `rs_1st_bratunac` (battle-attrition + collapsed morale)

```
t100 p= 663 m=0 c=25     loc=op:srebrenica:osmace_2  ← morale already collapsed
t101 p= 625 m=0 c=23.3
t102 p= 590 m=0 c=21.6
t103 p=   0 m=0 c=19.9   ls=destroyed              ← DISSOLVED at t103
```

Path: Arrived at osmace_2 with morale=0 streak (likely
`MORALE_OVERRIDE_ENABLED=false` since flag default is off; without the
override, morale=0 alone doesn't dissolve a >800-personnel brigade — but here
personnel<400). 2-of-3 criteria at t103: lowPersonnel (590→0 over the turn,
crossing 400 boundary), lowCohesion (19.9 ≤ 20), lowMorale (0 ≤ 15) — all
three met. **Mechanism**: battle-attrition driving dissolution. **Class**:
calibration-drift — engine correctly dissolved a brigade that had been
ground down and was at osmace_2 (an OSID inside the canon Srebrenica
enclave's `osid_list`, but RS-controlled, treated as a vrs_drina sector
front edge against the Srebrenica defenders). ICTY historical truth: 1st
Bratunac was a key Krivaja-95 unit operational in July 1995. Engine:
destroyed t103 (week ~24), 76 weeks before trigger.

### 3.3 `rs_skelani_battalion` (latent dissolve at the dissolution-cap-edge)

```
t165–t170  p=236 m=20 c=68   loc=op:srebrenica:mala_daljegosta_2  (5 turns flat)
t171       p=  0 m=10 c=65   ls=destroyed                         ← DISSOLVED at t171
```

Path: Held flat at p=236 / m=20 / c=68 for at least 6 turns. Then morale
dropped from 20 to 10 between t170 and t171 — that crosses
`DISSOLUTION_MORALE_THRESHOLD=15`. With personnel=236 (<400=lowPersonnel) and
morale=10 (≤15=lowMorale), 2-of-3 criteria met (cohesion 68 is NOT low).
Personnel<DISSOLUTION_PERSONNEL_CAP=800 → cap exit doesn't fire.
**Dissolution fires** at t171 via `brigade_dissolution.ts:130-137`.

**Mechanism**: dissolution via the (lowPersonnel + lowMorale) two-of-three
path, NOT stranded-lifecycle and NOT enclave_resilience.
**Class**: ENGINE BUG / hybrid drift:
- `op:srebrenica:mala_daljegosta_2` is in canon enclave `osid_list` for
  `srebrenica` (file: `src/sim/combat/enclave_resilience.ts:84-93`) —
  meaning ICTY-cited geography is "this is RBiH-claimed Srebrenica enclave
  territory". But political_controllers say RS holds it at t188 in this run.
- Skelani's tags do NOT include `'enclave'`, so `isEnclaveBrigade()` returns
  false, so the enclave-tier dissolution rules (3-of-3 criteria, lower floor
  50) do not apply.
- `home_mun: srebrenica` is held mostly by RBiH (10 RBiH, 3 RS at t188), so
  reinforcement from home_mun pool is cross-faction-hostile — which would
  block reinforcement, but the brigade had already been refilled from
  strategic reserve (initial_personnel 450 → trajectory shows it sustained
  236-650+ personnel through 170 turns).
- The 0-battles-fought + 214-casualties signature in
  `destroyed_brigades.json` is consistent with: defender role in non-AAR
  combat events (frontline_attrition or defended-against-attacker engagements
  where Skelani's name appears in `defender_brigade` not in
  `participating_brigades`), or the personnel reduction came purely from
  morale-driven dissolution path stripping personnel via
  `personnel = 0` set in `brigade_dissolution.ts:196`.
- The actual destruction was the morale-stepping (m=20→10) driven dissolution
  — Skelani sat below the personnel cap for 6+ turns at p=236 holding above
  the low-morale threshold, until morale tipped below 15 and the brigade
  dissolved.

This is the **most fragile** of the three INACTIVE brigades because it sat
in a metastable state for 6+ turns at the dissolution-criteria edge before
morale tipped it. Any small calibration nudge to morale_drift could move
this destruction turn earlier or later — high sensitivity.

### 3.4 `rs_1st_milii` (active but drifted)

```
t1   p=1190 loc=op:vlasenica:grabovica  (home_osid)
t50  p=1884 loc=op:vlasenica:bacici     (drifted ~5km)
t100 p=2000 loc=op:vlasenica:bacici
t179 p=2000 loc=op:bratunac:jezestica_2 op=Operation Stupčanica-95:t174
t188 p=2000 loc=op:bratunac:jezestica_2
```

Path: Personnel grew to cap (2000), drifted from `op:vlasenica:grabovica`
(home_osid) → `op:vlasenica:bacici` (within home_mun) → `op:bratunac:jezestica_2`
(across mun boundary, in Bratunac). At t179 (Krivaja trigger turn) it is
**actively participating in** `Operation Stupčanica-95` — note this is NOT
Krivaja but a different triggered op aimed at Žepa. Class: legitimate
operational drift — the brigade is alive, full strength, but committed
elsewhere at the trigger window. (n1619 had it at sekovici_2; n1636 has it
at jezestica_2 — both away from the home_osid in vlasenica.)

**Class**: not an engine bug; this is **emergent operational behavior**
that diverges from the historical-truth Krivaja-95 OOB.

### 3.5 `rs_5th_podrinje` (recovered but degraded)

```
t1   p=1190 loc=op:bratunac:jezestica_2
t50  p= 764 loc=op:vlasenica:grabovica  (drifted ~10km south, +Krivaja territory)
t100 p= 579 loc=op:vlasenica:grabovica  (degraded)
t179 p=2000 m=21 c=20  loc=op:vlasenica:bacici
t188 p=2000 m=16 c=20  loc=op:vlasenica:bacici
```

Path: Initial personnel halved from t1→t100 by combat. By t179 it had
recovered to cap (2000) via reinforcement from strategic reserve / pool. At
trigger turn it is at p=2000 but morale=21 and cohesion=20 — combat-fragile.
**Class**: legitimate but degraded — the brigade exists and is at full
personnel cap but poor cohesion/morale state going into the trigger.

### 3.6 Krivaja-95 Predictor Outcome

At t179 with this OOB state:
- `rs_1st_zvornik`: INACTIVE (since t120, ~59 weeks before trigger) → 0 contribution.
- `rs_1st_bratunac`: INACTIVE (since t103, ~76 weeks before trigger) → 0 contribution.
- `rs_skelani_battalion`: INACTIVE (since t171, ~8 weeks before trigger) → 0 contribution.
- `rs_1st_milii`: active 2000-personnel but committed to Operation
  Stupčanica-95 (Žepa) → not eligible attacker for Krivaja.
- `rs_5th_podrinje`: active 2000-personnel, m=21 c=20, location
  op:vlasenica:bacici → potentially eligible but combat-fragile.

`eligible_attacker_count=0` for 6 consecutive planning turns is consistent
with this state: 3 brigades INACTIVE, 1 committed elsewhere, 1 too far / too
fragile / suppressed by predictor's force-ratio test (force_ratio=0.094
implies the predictor is comparing against a much larger ARBiH 28th
Division defender footprint).

## 4. Cross-Cut Lens Synthesis

### 4.1 Formation-expert lens

Lifecycle classification table (file:line citations):

| Brigade | Mechanism | File:Line | Class |
|---|---|---|---|
| rs_1st_zvornik | dissolveCombatIneffectiveBrigades 2-of-3 (lowPersonnel + lowCohesion) | `src/sim/combat/brigade_dissolution.ts:130-137` (criteriaCount<2 exit gates), `:194-198` (dissolution mutation) | calibration-drift |
| rs_1st_bratunac | dissolveCombatIneffectiveBrigades 3-of-3 (low all) | same | calibration-drift |
| rs_skelani_battalion | dissolveCombatIneffectiveBrigades 2-of-3 (lowPersonnel + lowMorale) — metastable for 6+ turns | same | calibration-drift / hybrid (see §3.3) |
| rs_1st_milii | sector-driven brigade-to-sector assignment drift | `src/sim/combat/brigade_assignment.ts`, `brigade_front_distribution.ts` (per CLAUDE.md memory) | emergent operational drift |
| rs_5th_podrinje | combat attrition + recovery from strategic reserve | `src/sim/combat/strategic_reserve.ts`, `brigade_dissolution.ts:139-147` reinforcement add | calibration-drift but recovered |

`stranded_brigade_lifecycle.ts` is **NOT** the firing path for any of the
three INACTIVE brigades in n1619/n1636. The MEMORY.md prior asserting that
Skelani collapsed at t85 via stranded_brigade_lifecycle is **disproven** by
n1619/n1636 evidence (Skelani survives until t171, dissolves via standard
2-of-3 dissolution, NOT via stranded-collapse).

Reconstitution blocking: home_mun srebrenica is mostly RBiH at t188 (10 RBiH
vs 3 RS) — the brigade's home_mun reinforcement path is structurally
constrained because pool population in srebrenica is dominantly RBiH.
Strategic-reserve reinforcement still happens (Skelani sustained p=236 at
mala_daljegosta_2 for 6+ turns). Reconstitution after dissolution: per
MEMORY.md project knowledge, dissolved brigades in OOB roster can
reconstitute when the home_mun comes under faction control + cooldown
elapses — for srebrenica that is structurally blocked.

### 4.2 Historian lens

ICTY Popović IT-05-88-T §§240-250 cites the following formations as direct
participants in Operation Krivaja-95 (preparatory order 2 July 1995):

- **Zvornik Infantry Brigade** (rs_1st_zvornik): per Popović §244, attacker
  on Žepa axis (Stupčanica-95 sub-op also assigned). At full establishment
  ~3200 personnel July 1995.
- **Bratunac Light Infantry Brigade** (rs_1st_bratunac): per Popović §244,
  primary blocking and pursuit force during enclave reduction. At establishment.
- **Milići Light Infantry Brigade** (rs_1st_milii): per Popović §244, axis
  Milići-Konjević Polje. At establishment.
- **Skelani Independent Light Infantry Battalion** (rs_skelani_battalion):
  per Popović §244, Drina-axis blocking force. ~450-600 personnel.
- **5th Podrinje Light Infantry Brigade** (rs_5th_podrinje): per Popović §244,
  enclave reduction forces. At establishment ~1500-2000 personnel.

Historical truth on 2 July 1995: ALL FIVE were ACTIVE, near or at full
establishment, deployed in their canon roles. The gap between historical-truth
(5/5 active at full strength) and engine-state (2/5 active, 3/5 INACTIVE/0
personnel; 1 of the 2 active is committed elsewhere) is **the largest
ICTY-cited OOB divergence** in the Krivaja-95 trigger window for the
v0.9 calibration band.

### 4.3 Scenario-creator-runner-tester lens

`tools/diagnostics/triggered_op_temporal_trace.cjs` exists and is the
canonical diagnostic for triggered-op temporal traces (per lane prompt
reference and `Glob` confirms file presence at
`F:/A-War-Without-Victory/tools/diagnostics/triggered_op_temporal_trace.cjs`).

`runs/.../n1619/operation_aars.json` has 37 AAR entries. Brigade matches:
- rs_1st_zvornik: 3 AAR matches (Operation Cerska-Kamenica, Zvornik Sweep, Kamenica axis)
- rs_1st_bratunac: 5 AAR matches
- rs_skelani_battalion: **0 AAR matches**
- rs_1st_milii: 5 AAR matches (Operation Cerska-Kamenica, Bratunac-Vlasenica, Srebrenica Ring, Srebrenica Enclave, Podrinje Sweep)
- rs_5th_podrinje: 3 AAR matches

Skelani's 0 AAR matches + 214 casualties is consistent with: (a) Skelani is
a `light_infantry` battalion, kind=`brigade` but smaller than other
brigades, and either was never assigned to an op (`active_op_id=null`
throughout the trace at turns 1-9, all op-phase fields null) or was a
pure defender taking casualties from incoming attacks (defender events
recorded in `frontline_attrition` not in `operation_aars`).

`weekly_report.jsonl` shows 188 weekly reports (one per turn). Skelani appears
in 1 weekly report match (out of 19 total brigade matches), confirming sparse
combat presence consistent with §3.3 attrition-via-non-AAR-channels.

## 5. Verdict

**CONDITIONS** — go-ahead with binding scope and calibration guards.

Rationale:
- The original PROBLEM as stated is **PARTIALLY MISDIAGNOSED**: stranded-
  brigade-lifecycle is NOT the firing path. The actual firing path is
  `dissolveCombatIneffectiveBrigades` (battle-attrition driving 2-of-3
  criteria), which is the canonical lifecycle (no engine bug in
  stranded_brigade_lifecycle.ts).
- The ROOT CAUSE is **calibration drift**: ICTY-cited Krivaja-95 brigades
  are ground down by combat over 188 weeks of reactive defense. This is a
  faction-symmetric fix domain (the same dissolution path acts on every
  faction's brigades) — **so a Phase 1 implementation lane that touches
  `brigade_dissolution.ts` thresholds is Ring 1 / no §6**, provided it
  remains faction-symmetric.
- A Phase 1 lane that touches `enclave_resilience.ts` `osid_list` for
  Srebrenica, OR hardcodes a Krivaja outcome, OR adds Krivaja-specific OOB
  references, OR creates a "rs_skelani_battalion" specific carve-out,
  triggers §6 sensitive-history canon sign-off chain.
- The Skelani case (§3.3) is a strong candidate for a **roster
  protected-list mechanism** that delays dissolution for ICTY-cited
  rosters in the historical-truth window — but only if implemented as a
  faction-symmetric protected_roster_window concept (not a Krivaja-specific
  hardcode).

GO if Phase 1 lane:
- Adjusts `DISSOLUTION_*` thresholds faction-symmetric.
- Adds a faction-symmetric `protected_roster_window` mechanism that
  preserves any roster-tagged formation through a calibrated window
  (covering ICTY-cited rosters across all factions: Krivaja-95, Lašva
  Valley, Sarajevo, Mostar, etc.).
- Tunes brigade-to-sector assignment to keep `home_osid`-pinned brigades
  closer to their home_mun unless committed to a triggered op (touches
  `brigade_assignment.ts` faction-symmetrically).

NO-GO if Phase 1 lane:
- Hardcodes Krivaja participants OR injects Skelani-specific exception
  in `brigade_dissolution.ts`.
- Adds `osid_list` carve-outs for individual brigades.
- Bypasses §6 sign-off when touching `enclave_resilience.ts`,
  `rupture_consequences.ts` (file is referenced by the prompt but not
  found in the source tree — see §6 note), or hardcoded outcomes.

## 6. Acceptance Criteria (binding for Phase 1 lane)

| # | Criterion | Metric | Threshold | Verification |
|---|---|---|---|---|
| AC1 | Code-shape diff ≤ 200 LOC across owner files | LOC delta in PR | ≤ 200 LOC additions in `src/sim/combat/brigade_dissolution.ts`, `formation_constants.ts`, `brigade_assignment.ts`; no new files in `src/sim/combat/` | `git diff main..HEAD --stat -- 'src/sim/combat/*'` |
| AC2 | Owner-file enumeration explicit | List in PR description | Exactly enumerates owner files; no surprises; no edits to `enclave_resilience.ts` or `rupture_consequences.ts` (sensitive-history Ring 2/3) | PR description review |
| AC3 | Faction-symmetric implementation | Source review | No `if (faction === 'RS')` carve-outs; no string match on Krivaja brigade IDs; no hardcoded OSIDs | grep search for `rs_1st_zvornik\|rs_1st_bratunac\|rs_skelani_battalion\|krivaja` (case-insensitive) in PR diff returns 0 in source code (test fixtures and docs allowed) |
| AC4 | 40w smoke gate — anchors hold | `npm run sim:scenario:run:40w` | anchors ≥ 25/27, hash drift acceptable (regression class identical or better), benchmarks 6/6 | Compare to last good 40w hash `a2a51d4a9994a7f5` (n1627) |
| AC5 | 188w sensitive-history regression — Krivaja participants ACTIVE at t179 | ICTY OOB participant count ACTIVE | ≥ 4 of 5 named formations ACTIVE at t179 (status='active', personnel ≥ 50% of OOB initial_personnel) | New diagnostic: ICTY roster-state probe at trigger turn |
| AC6 | 188w sensitive-history regression — Krivaja force_ratio | predictor `force_ratio` at t179 | ≥ 0.45 (was 0.094 — needs >5× improvement to reach the historical 0.7-0.9 band) | `runs/.../weekly_report.jsonl` at week 179 |
| AC7 | 188w sensitive-history regression — eligible_attacker_count | predictor counter | ≥ 3 for ≥ 4 of the 6 planning turns leading to t179 | Predictor diagnostic |
| AC8 | Lane tests + focused regression GREEN | `npm run test:vitest` | all 3513 tests + new lane tests pass | CI |
| AC9 | Sensitive-history Ring classification declared | PR description Ring badge | Ring 1 (faction-symmetric numerics) OR Ring 2 with §6 sign-off chain attached | PR description |
| AC10 | Out-of-scope guards explicit | PR description guards | No edits to: `enclave_resilience.ts`, `rupture_consequences.ts` (when found), OOB JSON for ICTY-cited rosters, `srebrenica_*`, hardcoded enclave `osid_list`, scenario-start `init_formations` for Krivaja participants | PR description review + diff scan |
| AC11 | Determinism preserved | `tsc --noEmit` + 3-seed determinism check | byte-identical 40w final_save across 3 deterministic re-runs | Three-run hash compare |
| AC12 | Calibration master and PROJECT_LEDGER updated | docs delta | Both `docs/40_reports/CALIBRATION_MASTER.md` and `docs/PROJECT_LEDGER.md` get a commit-linked entry; `docs/10_canon/FORAWWV.md` NOT touched | git diff |

## 7. Stop Triggers (binding for Phase 1 lane)

| # | Condition | Verdict |
|---|---|---|
| ST1 | Any of AC1–AC4 fail at smoke-test gate | **revert** (whole branch); record findings; re-plan |
| ST2 | AC5 (Krivaja participant ACTIVE count ≥ 4/5) fails | **continue with caveat** — record verdict-only but not gold-blocking; route to next iteration if delta ≤ 1 brigade; revert if delta ≥ 2 brigades |
| ST3 | AC6 (force_ratio ≥ 0.45) fails | **verdict-only** — log and continue; force_ratio is calibration-sensitive and may need second pass |
| ST4 | Determinism (AC11) breaks | **revert** immediately — non-negotiable; root-cause before resuming |
| ST5 | Any edit lands in `enclave_resilience.ts` or `rupture_consequences.ts` without §6 sign-off chain | **revert** + governance review |
| ST6 | OOB JSON edit for ICTY-cited roster without /historian + /game-designer + /canon-compliance-reviewer chain | **revert** + governance review |

## 8. Sensitive-History Classification

This audit (Phase 0): **Ring 1** — read-only investigation; no engine code
changed; only `docs/40_reports/audits/...` touched.

Anticipated Phase 1 implementation lane: **Ring 1 with §6 boundary**.
- If the lane is bounded to faction-symmetric numerics in
  `brigade_dissolution.ts` + `formation_constants.ts` +
  `brigade_assignment.ts`, AND adds a faction-symmetric
  `protected_roster_window` concept that protects all roster-tagged
  formations during their canon-cited operational window: **Ring 1**
  (no §6 sign-off needed, but propagation to Engine Invariants and
  Systems Manual required if a new mechanic is introduced).
- If the lane edits `enclave_resilience.ts` `osid_list` for srebrenica,
  hardcodes Krivaja outcomes, edits OOB JSON for ICTY-cited rosters, or
  touches `rupture_consequences.ts` (when added): **Ring 2 / §6 required**
  (sign-off chain: /historian + /game-designer + /canon-compliance-reviewer).

## 9. Notes & Findings

- File `src/sim/combat/rupture_consequences.ts` is referenced in the lane
  prompt but does NOT currently exist in the source tree (Glob returned
  no match). If a Phase 1 lane intends to create or edit it, that creation
  alone is a §6 surface (rupture is a sensitive-history mechanic). Treat
  any new file under that name as Ring 2.
- The `morale_low_streak` field (referenced in `brigade_dissolution.ts:116`)
  exists per LANE-NIGHTSHIFT-N4 canon amendment (Engine Invariants v0.7.0
  §6.2.4) but its `MORALE_OVERRIDE_ENABLED` env flag defaults `false`. None
  of the three INACTIVE brigades fired via the morale-collapse override.
  The override path is canonically gated and not the destruction path here.
- Skelani's 0-battles-fought + 214-casualties signature implies
  defender-side combat events that are NOT recorded in
  `participating_brigades` of operation AARs. A Phase 1 lane should consider
  adding defender-role visibility to `operation_aars.json` (orthogonal Ring
  1 docs / observability fix; not blocking).
- Project memory MEMORY.md "Skelani collapsed at t85 via
  stranded_brigade_lifecycle.ts" is **stale and incorrect** for the n1619
  / n1636 188w runs at scenario hash `210e69404d054959`. The
  destruction turn is t171, mechanism is `dissolveCombatIneffectiveBrigades`
  not stranded-lifecycle. Recommend memory correction in a follow-up
  Ring 1 lane.

## 10. Audit Verification

Engine code untouched: `git status --short` after authoring this report
shows the new file path
`docs/40_reports/audits/20260505_KRIVAJA_ROSTER_LIFECYCLE_PHASE_0_PANEL.md`
plus pre-existing concurrent-lane modifications (latest_run_final_save.json,
.claude/scheduled_tasks.lock — not touched by this lane).

— END AUDIT REPORT —


</content>
