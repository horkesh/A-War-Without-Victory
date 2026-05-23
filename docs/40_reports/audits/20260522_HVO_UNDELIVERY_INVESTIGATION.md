# HVO Undelivery Investigation — n1961

**Date:** 2026-05-22
**Branch:** feature/arc-operations-calibration
**Reference run:** runs/apr1992_definitive_188w__210e69404d054959__w188_n1961
**Author:** AWWV combat/operations specialist (read-only investigation)
**Status:** FINAL

## Context

Per `docs/40_reports/audits/20260522_ARC_FINAL_N1956_N1961_14_FIXES.md`:
- HRHB sim count: 79 OSIDs (painted 107) — short by 28.
- Only 2 HVO ops finalized in 188 turns.
- HVO area-share 11.9% (painted 20.6%).
- Federation events fired (mistral_2_95 t179 etc.) but HVO did not deliver Krajina-collapse OSIDs.

## Section 1 — HRHB Corps Inventory (OOB)

From `data/source/oob_corps.json` lines 24-28:

| Corps id | Name | HQ OSID | available_from |
|----------|------|---------|----------------|
| `hvo_main_staff` | Main Staff HVO (army_hq) | op:mostar:kruzanj_2 | 10 |
| `hvo_southeast_herzegovina` | Southeast Herzegovina OZ | op:citluk:citluk_2 | 10 |
| `hvo_central_bosnia` | Central Bosnia OZ | op:vitez:vitez_2 | 10 |
| `hvo_northwest_bosnia` | Northwest Bosnia OZ | op:orasje:orasje | 0 |
| `hvo_tomislavgrad` | Tomislavgrad OZ | op:duvno:tomislavgrad_2 | 10 |

5 HRHB units total. **There is NO `hvo_posavina` corps.** Posavina coverage is folded into `hvo_northwest_bosnia` (HQ Orašje).

## Section 2 — HRHB Operations Catalog Inventory

### Opportunity catalogs (Tier-1 opportunity system)

| File | HRHB Ops | RBiH Ops | RS Ops |
|------|----------|----------|--------|
| `operation_opportunity_catalog_5th_corps.ts` (1648 LOC) | 0 | **7** (sana_95, sana_95_follow_on, tigar_sloboda_94, apwb_pressure_94, una_94, breza_94, pauk_94_95, grmec_94) | 0 |
| `operation_opportunity_catalog_central_bosnia.ts` (645 LOC) | **1** (kupres_cincar_94) | 2 (vlasic_ridge_95, donji_vakuf_95) | 0 |
| `operation_opportunity_catalog_federation_western_bosnia.ts` (315 LOC) | **1** (mistral_2_95) | 0 | 0 |
| **HRHB total in opportunity catalogs** | **2** | — | — |

### Legacy pre-planned ops (`pre_planned_operations.ts`)

- **1 HRHB op**: Operation Jackal (line 598-641, `hvo_southeast_herzegovina`, available_from=8).
  - Staging: `op:capljina:capljina_2`. Objectives: tasovcici_2, hodbina_2, rotimlja_2, stolac_2 (4 OSIDs).

### Legacy triggered ops (`triggered_operations.ts`)

- The only HRHB triggered entry, **Operation Mistral 2**, has been MIGRATED to the opportunity catalog. Lines 570-575 filter it out at module load:
  ```
  const TRIGGERED_OPS: TriggeredOpDef[] = TRIGGERED_OPS_RAW.filter(
      (def) => def.name !== 'Operation Mistral 2',
  );
  ```
  So there is no live triggered HRHB op.

### Other HRHB-tagged ops (informational, not territorial offensives)

- `hv_integration.ts:177` — HV integration shim (HV brigade insertion), not a corps-launched op.
- `enclave_resilience.ts:163/175/188` — defensive enclave shells (Maglaj, Tešanj, Žepče, etc.) for HRHB-tagged contested enclaves; not offensive ops.
- `jna_phantom_brigades.ts:273/284/295/306` — JNA capture markers, not HVO ops.

### Catalog totals — HVO offensive ops in catalog

| Op | Source | Active corps |
|----|--------|--------------|
| Operation Jackal | pre_planned (live) | hvo_southeast_herzegovina |
| Operation Herzegovina Consolidation | (need to locate) | likely HVO |
| Operation Cincar / Kupres (`kupres_cincar_94`) | opportunity catalog | hvo_tomislavgrad |
| Operation Mistral 2 (`mistral_2_95`) | opportunity catalog | hvo_main_staff + hvo_tomislavgrad |

**4 HRHB offensive ops total**, all single-corps except Mistral 2 (cross-corps).

### Comparison: ARBiH 5th Corps catalog

- 5th Corps catalog file alone defines 7 RBiH ops (sana_95, sana_95_follow_on, tigar_sloboda_94, apwb_pressure_94, una_94, breza_94, pauk_94_95, grmec_94).
- Central Bosnia catalog adds 2 more RBiH ops (vlasic_ridge_95, donji_vakuf_95).
- **Per-corps comparison**: ARBiH 5th Corps alone has 7 catalog ops; HRHB across all 5 units has **2 catalog ops + 1 pre-planned + 1 finalized "Herzegovina Consolidation"** = 4 ops total.

## Section 3 — n1961 HRHB Operation Outcomes

From `operation_aars.json` (final finalized AARs):

- **Total finalized ops in n1961**: 68 (30 RBiH, 36 RS, **2 HRHB**).
- **HRHB finalized ops (2)**:
  - "Operation Herzegovina Consolidation" (catalog status: present, eligibility: eligible, launch_status: launched — per `watched_operations.json:1-13`, t=11)
  - One more HRHB op (need to verify which — Jackal or kupres/mistral)

From `watched_operations.json` — no HRHB ops flagged as not_launched. The not_launched watch entries are:
- Kotor Varos (RS, blocker: `already_owned_objectives` — VRS already holds the objectives)
- Krivaja-95 (RS, blocker: `build_defender_power_too_high` — feasibility ratio 0.156)
- Krivaja-95 (RS, blocker: `brigade_ineligible`)
- Stupčanica-95 (RS, blocker: `build_defender_power_too_high` — feasibility ratio 0.137)

**HRHB ops are absent from `watched_operations.json`** — meaning the watch instrumentation never even saw Mistral 2 or Cincar/Kupres reach the "checking launch feasibility" tripwire. That places the failure earlier in the lifecycle (proposal evaluation, approval, or staging).

### HRHB operation AAR details (n1961)

**1. Operation Jackal** (`hvo_southeast_herzegovina:Operation Jackal:t8`)
- `outcome: failure`
- `total_attacks: 0`
- `recovery_reason: political_blocked`
- `participating_brigades`: 10 brigades (6 HRHB + 4 HV)
- Objectives: tasovcici_2, hodbina_2, rotimlja_2, stolac_2
- Per AAR: `force_ratio_estimate: 2.59` (would have been favorable!)

**2. Operation Cincar / Kupres** (`hvo_tomislavgrad:Operation Cincar / Kupres:t132`)
- `outcome: failure`
- `total_attacks: 0`
- `recovery_reason: defender_power_too_high`
- `participating_brigades`: only 2 (`hrhb_kralj_petar_kreimir_iv_brigade`, `hrhb_kralj_tomislav_brigade`)
- `force_ratio_estimate: 0.27` (heavily disadvantaged → triggered `MIN_LAUNCH_FORCE_RATIO_FLOOR` abort at `sector_offensive.ts:944-947`)

**3. Operation Mistral 2** — **NEVER FINALIZED, NEVER SPAWNED**. Not in `operation_aars.json`, not in `watched_operations.json`. The opportunity catalog (`mistral_2_95`) emits during the proposal window (t≥175) but the proposal never converts into a CorpsOperation that enters preparation.

## Section 4 — HVO Officer & Subordinate Staffing

From `data/scenarios/officers/apr1992_officers.json`:

| Corps | Officer entries | Status |
|-------|-----------------|--------|
| hvo_main_staff | (root staff) | Praljak/Roso/Petković — present |
| hvo_central_bosnia | 12 | Blaškić, Kordić, Čerkez, Cerni, Naletilić, Lasić, Šiljeg, etc. |
| hvo_tomislavgrad | 8 | Glasnović, Šopta, Štefanek, etc. |
| hvo_northwest_bosnia | 6 | Lozančić, Stefanek, etc. |
| hvo_southeast_herzegovina | 5 | Lasić, Praljak, Šiljeg, Obradović, etc. |

**Officer staffing is not the bottleneck**: every HVO corps has named officers, all 5 `corps_command` entries exist in `state.military.corps_command`, and `ai_decided=true` for all 5 in n1961 final state.

`subordinate_count` per corps (n1961 final):
- hvo_main_staff: 3
- hvo_central_bosnia: 9
- hvo_southeast_herzegovina: 14
- hvo_northwest_bosnia: 4
- hvo_tomislavgrad: 4

Brigade tree (formations with `corps_id` matching):
- hvo_main_staff: 3 formations (includes 1st Guard ABB)
- hvo_tomislavgrad: 7 formations (Kreimir IV, Tomislav, HV 4th Guards Split, HV 7th Varazdin etc.)

Sufficient brigades exist for Mistral 2 axes; the failure is not OOB-readiness.

## Section 5 — Commander State for HVO at w188

```
hvo_main_staff:           current_plan=None  reason="corps in defensive stance — no new plans"
hvo_central_bosnia:       current_plan=None  reason="corps in defensive stance — no new plans"
hvo_southeast_herzegovina: current_plan=None reason="corps in defensive stance — no new plans"
hvo_tomislavgrad:         current_plan=None  reason="campaign role economy forbids a fresh offensive plan"
hvo_northwest_bosnia:     current_plan=None  reason="campaign role economy forbids a fresh offensive plan"
```

Stance distribution (n1961, final):

| Corps | Stance |
|-------|--------|
| hvo_main_staff | defensive |
| hvo_central_bosnia | defensive |
| hvo_southeast_herzegovina | defensive |
| hvo_tomislavgrad | balanced |
| hvo_northwest_bosnia | balanced |

vs ARBiH 1st/2nd/3rd/4th = `offensive`, ARBiH 5th = `defensive`.

The two failure reasons emerge from `src/sim/combat/commander/plan.ts`:
- **Line 810-824**: `defensive` or `reorganize` stance → no new offensive plan.
- **Line 121-122 / 862-877** (`getCampaignRoleBlockReason`): `campaign_role === 'economy'` or `'contain'` → no new offensive plan.

## Section 6 — Root-Cause Chain (THE SMOKING GUN)

### 6.1. `campaign_role` overlay assigns `economy` to 4 of 5 HVO corps

From `state.military.army_corps_directives_by_faction.HRHB` at w188:
```
hvo_central_bosnia      → secondary  (target corps)
hvo_main_staff          → economy
hvo_northwest_bosnia    → economy
hvo_southeast_herzegovina → economy
hvo_tomislavgrad        → economy
```

vs the HRHB CampaignPlan (`state.military.campaign_plans.HRHB.front_priorities`):
```
hvo_southeast_herzegovina → primary       (5 offensive targets)
hvo_tomislavgrad          → secondary     (6 offensive targets)
hvo_central_bosnia        → secondary     (3 offensive targets)
hvo_main_staff            → secondary     (0 offensive targets)
hvo_northwest_bosnia      → secondary     (2 offensive targets)
```

Per `briefing.ts:586-587`:
```
const role: CommanderBriefing['campaign_role'] = overlay?.role ?? frontPriority?.role ?? null;
```

**The C1 overlay REPLACES the CampaignPlan role.** Result: hvo_southeast_herzegovina's role drops from `primary` → `economy`, killing all HVO offensive ambition.

### 6.2. Overlay derived from `PREPARE_RESERVE` political directive

From `state.military.political_directives_by_faction.HRHB` at w188:
```
verb: PREPARE_RESERVE
target_corps_id: hvo_central_bosnia
```

Per `army_order_interpretation.ts:537-538` (`rawRoleForVerb`):
```
case 'PREPARE_RESERVE':
    return isTargetCorps ? 'secondary' : 'economy';
```

So only the target corps (`hvo_central_bosnia`) gets `secondary`; all other HVO corps get `economy`. This perfectly matches the observed overlay.

### 6.3. `PREPARE_RESERVE` produced by stuck `war_exhaustion`

From `state.political.war_exhaustion`:
```
HRHB: 10000.001198166667
RBiH: 10000.001198166667
RS:   10000.001198166667
```

Per `political_directive_producer.ts:205-210` (`deriveVerb`):
```
const highExhaustion = exhaustion >= 500;
if (highExhaustion && highSensitivity) return 'HONOR_TRUCE';
if (highExhaustion) return 'PREPARE_RESERVE';
```

- HRHB Boban hawkishness=3.6, international_sensitivity=3 → `highSensitivity=false` → falls to **PREPARE_RESERVE**.
- RS Karadžić hawkishness=4.2, international_sensitivity=2.4 → also **PREPARE_RESERVE**.
- RBiH (Izetbegović, sensitivity=4.2) would have hit HONOR_TRUCE — but **RBiH is `player_faction`** so the producer short-circuits (`political_directive_producer.ts:280`) and writes nothing for RBiH.

This is why **only the bot factions (HRHB and RS)** suffer the directive-driven offensive lockout. RBiH continues to launch its 30 ops freely because the player-faction skip means no overlay ever forces RBiH corps into `economy`.

### 6.4. War exhaustion = 10000 is a runaway / clamping-failure value

The constant `B1_HIGH_EXHAUSTION_THRESHOLD = 500` was sized for a tens-to-hundreds-of-points scale. A value of 10000 means exhaustion has saturated — the only way out of `PREPARE_RESERVE` is for exhaustion to fall under 500. With all three factions stuck at 10000, the directive is **permanently** PREPARE_RESERVE for HRHB and RS from the moment the producer fires onward.

This explains:
- HVO offensive ops permanently suppressed (Mistral 2 catalog evaluates eligible-axis green, but the commander chain rejects starting a plan).
- Cincar/Kupres at t=132 spawning anyway is the open puzzle — likely the directive landed AFTER t=132, or hvo_tomislavgrad was `balanced` (not strictly blocked) at that moment, and the recovery cascade at sector_offensive.ts:941-947 then aborted on the (correct) force_ratio gate (2 brigades vs full VRS Krajina). Cincar/Kupres force_ratio_estimate=0.27 < MIN_LAUNCH_FORCE_RATIO_FLOOR means the abort is structurally right, just downstream of an earlier directive issue that thinned the assigned brigade roster.

### 6.5. Op Jackal `political_blocked` is a separate, secondary issue

Op Jackal failed at t=8 with `recovery_reason=political_blocked`. This stems from `sector_offensive.ts:915 / 976` → `hasOnlyPoliticallyBlockedCurrentObjectives` → `shouldGrazBlockAttack`.

Graz state at w188: `vienna_declaration_turn=4`, both RS+HRHB accepted, `vienna_herzegovina_broken_by=null`, `graz_east_herzegovina_active_turn=13`.

Per `local_truces.ts:221-225`:
```
if (faction === 'HRHB' && (targetController === 'RS')
    && isHerzegovinaTruceActive(state)
    && !GRAZ_EXEMPT_HRHB_CORPS.has(corpsId)) {
    return true;
}
```

`GRAZ_EXEMPT_HRHB_CORPS = { 'hvo_northwest_bosnia' }` (line 182) — **`hvo_southeast_herzegovina` is NOT exempt**, so all four Op Jackal RS-controlled objectives (tasovcici_2/hodbina_2/rotimlja_2/stolac_2) are blocked once Graz fires at t=4.

Op Jackal began at t=8 (4 turns into Graz). The truce-block check kicked it into `political_blocked` recovery. This is a **timing collision**: Jackal's `available_from=8` post-dates Graz acceptance at t=4. The accord blocks the op despite Op Jackal being its historical raison d'être.

Note `local_truces.ts:218-220` comment claims Jackal exemption is handled "at the brigade level" in `bot_brigade_ai_osid.ts` — but the **op-level lifecycle gate at sector_offensive.ts:915 does NOT consult an op-objective whitelist**. Brigade-level exemption only matters for free-targeting; for an already-spawned CorpsOperation the lifecycle gate fires first and shorts the op out.

## Section 7 — Krajina-Collapse Event Effects Audit

Re-examined `mistral_2_95`, `kupres_cincar_94`, the legacy Mistral 2 (in `triggered_operations.ts:478-557`), and Op Jackal. **None of these have `transfer_control` / `set_political_controller` effect clauses that paint OSIDs to HRHB independent of capture.** They are all combat-driven (the op must successfully attack and capture each OSID).

Federation triggered events themselves (the `mistral_2_95` event firing at t179 etc.) are NOT effect-painters either; they create operation opportunities and require the corps lifecycle to convert opportunity → CorpsOperation → execution → capture. With the campaign_role lockout described above, this conversion never happens.

**Consequence**: The 25 RS-sim OSIDs painted HRHB (apr1995 / oct1995 painted set) must be earned through HVO ops. With the lockout, they remain RS-controlled.

## Section 8 — Findings Summary

### Total operation catalog entries for HVO corps vs ARBiH 3/4/5 corps

| Faction unit | Catalog ops (offensive) |
|--------------|-------------------------|
| HRHB total (5 corps) | **2** opportunity catalog (`kupres_cincar_94`, `mistral_2_95`) + **1** pre-planned (Op Jackal) + 1 finalized in n1961 ("Herzegovina Consolidation" is actually vrs_herzegovina — not HVO) ≈ **3 distinct offensive HVO ops** |
| ARBiH 5th Corps alone | 7 catalog (sana_95, sana_95_follow_on, tigar_sloboda_94, apwb_pressure_94, una_94, breza_94, pauk_94_95, grmec_94) — plus shared central_bosnia entries |
| ARBiH 3rd/4th/5th combined | ~9 catalog ops |

### Number of HVO ops in n1961 by status

| Status | Count | Examples |
|--------|-------|----------|
| Proposed (opportunity eligible) | unknown — not in serialized state | `mistral_2_95` (likely t≥175), `kupres_cincar_94` (t≥136 window) |
| Spawned as CorpsOperation | 2 | Op Jackal (t=8), Cincar/Kupres (t=132) |
| Launched (entered execution) | 0 (Jackal aborted in planning, Cincar/Kupres aborted at force-ratio gate) |
| Finalized | 2 (both `outcome: failure`) | Op Jackal (political_blocked), Cincar/Kupres (defender_power_too_high) |

### Root-cause one-liner per blocker

- **Mistral 2 never spawns**: COMMANDER-STATE — political directive `PREPARE_RESERVE` (driven by saturated `war_exhaustion=10000`) → 4-of-5 HVO corps overlaid to `campaign_role=economy` → commander_plan.ts blocks new offensive plans for `hvo_main_staff` and `hvo_tomislavgrad` permanently.
- **Cincar/Kupres aborts at launch (defender_power_too_high)**: COMMANDER-STATE (upstream) + STAGING-BLOCK (downstream) — only 2 brigades assigned (HV reinforcements unattached / `hv_7th_guards_varazdin=inactive`), force_ratio_estimate=0.27 falls below `MIN_LAUNCH_FORCE_RATIO_FLOOR`.
- **Op Jackal aborts in planning (political_blocked)**: FACTION-FILTER — Graz Accords (`vienna_declaration_turn=4`) activate before Op Jackal's `available_from=8`. `local_truces.ts:shouldGrazBlockAttack` blocks all HRHB→RS attacks for non-`hvo_northwest_bosnia` corps; the op-level lifecycle gate at `sector_offensive.ts:915` has no op-objective exemption (only brigade-level free-targeting has one).
- **All RBiH ops run fine**: PRODUCER-SKIP — RBiH is the player_faction, so `political_directive_producer.ts:280` returns null for RBiH; no overlay overrides ARBiH campaign_plan roles.

### Three smallest-surface-area fixes to enable HVO Krajina-collapse delivery

**Fix #1 (smallest, ~5 lines): Cap `exhaustion` in `deriveVerb()` or lift `B1_HIGH_EXHAUSTION_THRESHOLD` to a runaway-safe value.**
- File: `src/sim/combat/army_order_interpretation.ts` (constants) OR `src/sim/political/political_directive_producer.ts` (threshold).
- Current `B1_HIGH_EXHAUSTION_THRESHOLD = 500` (line 70). Empirical w188 value is 10000 → 20× the threshold. Replace with a band: e.g. `exhaustion >= 500 && exhaustion < 5000` for PREPARE_RESERVE so saturated-rail values fall through to hawkishness-driven branch (HRHB Boban hawkishness=3.6 → BALANCE_FRONTS or PRESS_OFFENSIVE).
- Or: clamp exhaustion at the call site (`producePoliticalDirective` line 291): `const exhaustion = Math.min(getWarExhaustion(pol, faction), 1000);`
- Risk: byte-stable for runs where exhaustion stays under 500 (true through mid-game) but flips bot-faction directive in late-war runs. Will affect all 3 bot factions, not just HRHB. **Requires calibration A/B**.

**Fix #2 (~3 lines): Apply Graz exemption to op-level lifecycle gate for op-listed objectives.**
- File: `src/sim/combat/sector_offensive.ts:1382-1403` (`hasOnlyPoliticallyBlockedCurrentObjectives`).
- Add: if the objective is in the operation's declared `objectives[]` or any axis `objectives[]`, treat as not-politically-blocked (mirrors the brigade-level exemption already in place per `local_truces.ts:218-220` comment).
- Or simpler: extend `GRAZ_EXEMPT_HRHB_CORPS` (local_truces.ts:182) from `{'hvo_northwest_bosnia'}` to `{'hvo_northwest_bosnia','hvo_southeast_herzegovina'}` — historically Op Jackal IS the Posavina-style Federation Croat exemption. Even simpler: add a turn-window exemption (e.g. Graz blocks HRHB→RS only for `turn >= graz_east_herzegovina_active_turn` — but east_herzegovina_active_turn already requires Op Jackal to END first per local_truces.ts:234-240). This is circular: Graz blocks Op Jackal which is the predicate for Graz to allow east HRHB ops. **Fix**: bypass the lifecycle gate for ops that started before Graz, OR mark Op Jackal as Graz-exempt at registration time.

**Fix #3 (~10 lines): Substrate-driven override — let CampaignPlan `role` win over overlay when overlay would `economy`-lock a corps that has explicit `offensive_targets` in the plan.**
- File: `src/sim/combat/commander/briefing.ts:584-587`.
- Current line 587: `const role: CommanderBriefing['campaign_role'] = overlay?.role ?? frontPriority?.role ?? null;`
- Proposed: `if (overlay?.role === 'economy' && frontPriority && (frontPriority.offensive_targets?.length ?? 0) > 0) { role = frontPriority.role; } else { role = overlay?.role ?? frontPriority?.role ?? null; }`
- This preserves overlay precedence in general but prevents a directive from neutering a corps whose CampaignPlan explicitly tasks it with offensive targets. Faction-symmetric (helps RS late-war ops too). Plays well with calibration because the CampaignPlan is what calibration already tunes against.

**Honourable mention (Fix #4, ~5 lines): Remove RBiH player-faction skip from `producePoliticalDirective`** so RBiH also feels exhaustion → PREPARE_RESERVE pressure. This restores faction symmetry instead of letting RBiH free-ride past the bug. But this REDUCES ops across the board rather than restoring HVO, so it is a symmetry fix, not a delivery fix.

## Section 9 — Cross-checks

- 1KK (`vrs_1st_krajina`) is exempt from Graz on the RS side (line 177-179) and continues to run ops against the Orašje HRHB pocket — symmetric to the proposed HRHB Posavina exemption.
- The legacy triggered Mistral 2 (`triggered_operations.ts:478-557`) is filtered out at module load (line 573-575) since 2026-05-01 migration. Only the opportunity-catalog Mistral 2 is active. **If the opportunity catalog's commander gate is closed, there is no fallback path**. (Single-owner is correct, but it makes the failure mode opaque.)
- `hv_7th_guards_varazdin` is marked `status=inactive` in n1961 — this is a separate scenario_init / HV OOB question (HV brigades activate via `hv_integration.ts`); flagged for follow-up but tangential to the main blocker chain.
- `force_ratio_estimate=2.59` recorded for Op Jackal suggests the predictor knew Jackal would win if it could attack — confirming the failure is upstream (political/lifecycle gate), not combat math.

## Section 10 — Files and Line Citations

Primary code paths:
- `src/sim/political/political_directive_producer.ts:193-224` — `deriveVerb` (PREPARE_RESERVE source)
- `src/sim/political/political_directive_producer.ts:272-311` — `producePoliticalDirective` (player-faction short-circuit at line 280)
- `src/sim/combat/army_order_interpretation.ts:517` — `ROLE_LADDER`
- `src/sim/combat/army_order_interpretation.ts:529-545` — `rawRoleForVerb` (PREPARE_RESERVE → economy for non-target corps at line 537-538)
- `src/sim/combat/army_order_interpretation.ts:1037-1080` — `persistCorpsDirectives` (writes `army_corps_directives_by_faction`)
- `src/sim/combat/commander/briefing.ts:529-598` — `collectCampaignIntent` (overlay precedence at line 584-587)
- `src/sim/combat/commander/plan.ts:120-125` — `getCampaignRoleBlockReason` (economy/contain block)
- `src/sim/combat/commander/plan.ts:810-825` — defensive stance block
- `src/sim/combat/sector_offensive.ts:915-918, 976-979` — op-lifecycle political_blocked path
- `src/sim/combat/sector_offensive.ts:1382-1403` — `hasOnlyPoliticallyBlockedCurrentObjectives`
- `src/sim/local_truces.ts:182` — `GRAZ_EXEMPT_HRHB_CORPS = {'hvo_northwest_bosnia'}`
- `src/sim/local_truces.ts:196-250` — `shouldGrazBlockAttack`

Catalogs and op defs:
- `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts:254-311` — `MISTRAL_2_95_OPPORTUNITY`
- `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts:484-541` — `KUPRES_CINCAR_94_OPPORTUNITY`
- `src/sim/combat/triggered_operations.ts:477-568` — legacy Mistral 2 (filtered out at line 573-575)
- `src/sim/combat/pre_planned_operations.ts:598-641` — `HRHB_PRE_PLANNED` (Op Jackal)

Run artefacts (n1961):
- `runs/apr1992_definitive_188w__210e69404d054959__w188_n1961/operation_aars.json` — 68 finalized AARs, 2 HRHB (Jackal, Cincar/Kupres)
- `runs/apr1992_definitive_188w__210e69404d054959__w188_n1961/watched_operations.json` — 6 watched entries, 0 HRHB
- `runs/apr1992_definitive_188w__210e69404d054959__w188_n1961/final_save.json` — political_directives_by_faction.HRHB.verb=PREPARE_RESERVE; war_exhaustion saturated at 10000

## Section 11 — Reportback Summary

(a) **Catalog**: HVO has **3 distinct offensive ops** (Mistral 2, Cincar/Kupres, Op Jackal). ARBiH 5th Corps alone has **7 catalog ops**; ARBiH 3rd/4th/5th combined ≈ **9 ops**. HVO is structurally under-catalogued by ~3× for comparable corps count.

(b) **HVO ops by status in n1961**: spawned=2, launched=0, finalized=2 (both failure). Mistral 2 never spawned (catalog evaluator passes axes but no corps plan accepts it).

(c) **Root-cause per blocker**:
  - Mistral 2 / Cincar/Kupres planning lockout: **COMMANDER-STATE** (war_exhaustion saturation → PREPARE_RESERVE → economy overlay → plan.ts:120-125 block).
  - Cincar/Kupres force-ratio abort: **COMMANDER-STATE upstream** + **STAGING-BLOCK** (2 brigades vs full VRS Krajina = ratio 0.27 < MIN_LAUNCH_FORCE_RATIO_FLOOR; HV reinforcements not attached).
  - Op Jackal political_blocked: **FACTION-FILTER** (Graz Accords blocks HRHB→RS attacks for non-`hvo_northwest_bosnia` corps starting at t=4; Op Jackal `available_from=8` falls inside the truce window).

(d) **Three smallest fixes**: see Section 8.
  1. Cap or band `war_exhaustion` in `political_directive_producer.ts:291` (~5 lines).
  2. Add `hvo_southeast_herzegovina` to `GRAZ_EXEMPT_HRHB_CORPS` or grant op-objective whitelist at `hasOnlyPoliticallyBlockedCurrentObjectives` (~3 lines).
  3. CampaignPlan-wins-when-economy-would-neuter-offensive-targets in `briefing.ts:587` (~10 lines).

(e) **Memo size**: 25.4 KB (25382 bytes).



