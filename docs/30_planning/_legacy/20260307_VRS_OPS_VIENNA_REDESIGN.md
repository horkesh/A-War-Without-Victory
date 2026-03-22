# VRS Operations Redesign + Vienna Declaration Rework

**Date**: 2026-03-07
**Status**: Design approved, ready for implementation
**Context**: Organic baseline runs (n256/n257) with all overrides removed expose that VRS captures only 15 of 95 historically-required OSIDs. Root cause: init substrate is demographic, not military. Fix must be operational (better ops, JNA support) not substrate (no init changes).

## Problem Statement

The `hybrid_1992` init substrate gives RS 280 OSIDs. Historical Jan 1993 target is 329 (+49 needed). With 97 overrides removed, the VRS bot only captures ~59 OSIDs organically, and most are in the wrong places. 80 historically-critical OSIDs remain uncaptured because:

1. No JNA combat power in early weeks (VRS alone can't overwhelm defenders)
2. Pre-planned ops cover only 25 target OSIDs across 5 operations
3. Vienna Declaration blocks ALL RS-HRHB combat except 6 municipalities (kills Posavina corridor campaign)
4. No mechanism for later operations (Jajce, Kotor Varos) to trigger

## Design Overview

Four interlocking changes:

1. **Multi-axis operations** -- operations have multiple independent axes of advance
2. **JNA phantom brigades** -- temporary formations with heavy equipment for early-war ops
3. **Expanded VRS operations** -- 7 pre-planned + 4 time/condition-triggered, all player-initiated
4. **Vienna Declaration rework** -- corps-level Herzegovina truce + OSID-level Kiseljak exclusion

---

## 1. Multi-Axis Operations

### Current State

`CorpsOperation` has a flat `objectives: string[]` with `current_objective_index` advancing linearly. If one objective stalls, the entire operation stalls.

### New Structure

```typescript
interface OperationAxis {
    axis_id: string;                    // e.g. "southern_sweep"
    name: string;                       // "Southern Sweep"
    assigned_brigades: FormationId[];    // Exclusive -- no overlap between axes
    objectives: string[];               // Contiguous OSID chain
    current_objective_index: number;
    status: 'executing' | 'stalled' | 'complete';
    failure_count: number;
    consecutive_failures_on_current: number;
    momentum: number;
    last_result?: 'captured' | 'failed' | 'stalemate';
}

// Extended CorpsOperation
interface CorpsOperation {
    // ... existing fields ...
    axes?: OperationAxis[];             // NEW: multi-axis structure

    // Legacy flat fields kept for backward compat during migration:
    // objectives, current_objective_index, etc.
    // When axes[] is present, these are ignored.
}
```

### Rules

- Each axis's objectives must be **territorially contiguous and neighboring** (validated at creation via contact graph adjacency check)
- **No shared brigades** between axes -- each brigade is assigned to exactly one axis
- Axes run **concurrently** -- each axis advances independently
- JNA support bonus (see section 2) applies to **all axes** in the operation
- If an axis stalls (consecutive_failures >= MAX_CONSECUTIVE_FAILURES_ON_CURRENT), its brigades hold; other axes continue
- Operation completes when **all axes** are complete, or player cancels
- An axis is `complete` when `current_objective_index >= objectives.length`
- An axis is `stalled` when `failure_count >= MAX_TOTAL_FAILURES` (3)
- Operation enters recovery when all axes are either complete or stalled

### Objective Contiguity Validation

At operation creation, for each axis:
```
for i in 1..objectives.length:
    assert objectives[i] is neighbor of objectives[i-1] in contact graph
    OR objectives[i] is neighbor of any previously-captured objective in this axis
```
This allows branching chains (A -> B, A -> C) but not disconnected jumps.

### Lifecycle Changes

- `advanceSectorOffensives()` iterates each axis independently
- `updateSectorOffensiveResults()` checks per-axis objective capture
- Planning duration: `max(axis.objectives.length for each axis)` using existing formula
- Recovery duration: based on longest axis

---

## 2. JNA Phantom Brigades

### Concept

Temporary brigade formations representing JNA assets that fought alongside Serb forces in the first weeks of the war. They carry heavy equipment (tanks, artillery, APCs) that gets handed off to VRS brigades when the JNA withdraws.

### Phantom Brigade Definitions

| ID | Name | Staging OSID | Corps/Op Assignment | Withdrawal Turn | Equipment |
|----|------|-------------|---------------------|----------------|-----------|
| `jna_uzice_corps_tg` | JNA Uzice Corps Task Group | `op:visegrad:visegrad_2` | Operation Visegrad | w4 (earliest -- Uzice withdrew April 19) | 30 tanks, 20 artillery, 8 APCs |
| `jna_17th_corps_tg` | JNA 17th Corps Task Group | `op:bijeljina:dvorovi_2` | Operation Koridor | w6 | 25 tanks, 15 artillery, 10 APCs |
| `jna_4th_corps_tg` | JNA 4th Corps Task Group | `op:ilidza:kasindo` | Operation Prsten | w6 | 20 tanks, 25 artillery, 5 APCs |
| `jna_2nd_md_tg` | JNA 2nd Military District TG | `op:prijedor:prijedor_2` | Operation Prijedor | w7 | 35 tanks, 20 artillery, 12 APCs |
| `jna_mostar_garrison_tg` | JNA Mostar Garrison TG | `op:foca:foca_3` | Operation Foca | w5 | 15 tanks, 15 artillery, 5 APCs |

### Lifecycle

1. **Spawn at scenario start** (turn 0, before first `runTurn`)
   - Created as `kind: 'jna_phantom'` (new formation kind)
   - `faction: 'RS'` (operationally under VRS command)
   - `status: 'active'`
   - `personnel: 2000` each (task group strength)
   - `withdrawal_turn: <per-unit value from table>`
   - Equipment via `BrigadeComposition` with high tank/artillery counts and `operational: 0.95`
   - Tags: `['jna_phantom', 'corps:<assigned_corps>']`
   - Assigned to their operation's axis

2. **Combat participation** -- fight as normal brigades during operations. Their heavy equipment gives overwhelming firepower advantage in the initial sweeps.

3. **Withdrawal notification** -- each turn, player sees:
   - `"JNA Uzice Corps elements will withdraw in N turns"` (in situation briefing)
   - At withdrawal_turn - 1: `"JNA Uzice Corps elements withdraw NEXT TURN"`
   - At withdrawal_turn: `"JNA Uzice Corps elements have withdrawn from Bosnia"`

4. **Disband and equipment handoff** (at `withdrawal_turn`):
   - Status -> `'disbanded'`, then removed from formations
   - Equipment distribution to VRS brigades in same corps:
     a. Sort eligible receiving brigades by proximity to phantom's OSID (nearest first)
     b. Each receiving brigade has equipment ceiling from OOB: `max_tanks`, `max_artillery`, `max_apcs`
     c. Fill up to ceiling per brigade, move to next
     d. **Excess** goes to `state.corps_equipment_reserve[corpsId]` (new state field)
     e. Personnel disappear (JNA soldiers returned to Serbia)
   - If the phantom's operation is still running, operation continues with remaining VRS brigades

### Equipment Ceilings

Add to OOB brigade definitions (or derive from equipment_class):
```
light_infantry:  max_tanks=5,  max_artillery=10, max_apcs=8
motorized:       max_tanks=15, max_artillery=15, max_apcs=12
mechanized:      max_tanks=25, max_artillery=20, max_apcs=15
mountain:        max_tanks=3,  max_artillery=8,  max_apcs=5
```

Existing VRS brigades without explicit equipment get defaults based on their `equipment_class`. Handoff respects these ceilings -- a light infantry brigade can't end up with 40 tanks.

### Corps Equipment Reserve

New state field:
```typescript
corps_equipment_reserve?: Record<string, {
    tanks: number;
    artillery: number;
    apcs: number;
}>;
```

Equipment from this reserve is drawn during brigade reinforcement (existing `formation_spawn.ts` reinforcement path) when a brigade is below its ceiling.

---

## 3. Expanded VRS Operations

All operations are **player-initiated**. Pre-planned ops are ready at w1 with plans in place; the player must execute. Time-triggered ops appear as offers.

### Pre-Planned Operations (Ready at w1)

Each has explicit axes, brigade assignments, and JNA phantom support.

#### Operation Koridor (East Bosnian Corps)
**Historical**: Link Semberija to western RS via Brcko corridor. May-June 1992.
```
Axis A "Brcko Corridor":
  Brigades: rs_1st_semberija, rs_2nd_semberija, rs_1st_bijeljina_panthers
  JNA: jna_17th_corps_tg
  Objectives: [brcko:brezovo_polje_selo_2, brcko:donji_rahic, brcko:krepsic,
               brcko:potocari_2, brcko:skakava_donja]

Axis B "Posavina Flank":
  Brigades: rs_3rd_posavina, rs_1st_posavina_infantry, rs_2nd_posavina
  Objectives: [bosanski_samac:samac_2, modrica:modrica, modrica:garevac_2,
               derventa:derventa_2, bosanski_brod:brod]
```

#### Operation Drina (Drina Corps)
**Historical**: Zvornik-Bratunac-upper Drina sweep. April-May 1992.
```
Axis A "Zvornik Sweep":
  Brigades: rs_1st_zvornik, rs_1st_birac
  Objectives: [zvornik:zvornik, zvornik:drinjaca, zvornik:novo_selo,
               zvornik:paljevici, zvornik:donja_kamenica]

Axis B "Bratunac-Vlasenica":
  Brigades: rs_1st_bratunac, rs_1st_vlasenica, rs_1st_milici
  Objectives: [bratunac:bratunac_2, bratunac:glogova, bratunac:pobudje_2,
               vlasenica:vlasenica_2, vlasenica:cerska_2]
```

#### Operation Visegrad (Herzegovina Corps -- new)
**Historical**: Uzice Corps + local Serb forces swept Drina valley. April 13-14, 1992.
```
Axis A "Visegrad Seizure":
  Brigades: rs_foa_brigade, rs_ajnie_brigade
  JNA: jna_uzice_corps_tg
  Objectives: [visegrad:visegrad_2, visegrad:drinsko, visegrad:bogdasici,
               visegrad:kamenica_2, visegrad:medjedja_2, visegrad:prelovo_2,
               visegrad:velji_lug, visegrad:zlijeb]
```

#### Operation Prsten (Sarajevo-Romanija Corps)
**Historical**: SRK encirclement of Sarajevo suburbs. April-May 1992.
```
Axis A "Western Sarajevo":
  Brigades: rs_1st_sarajevo_mechanized, rs_2nd_sarajevo_light_infantry
  JNA: jna_4th_corps_tg
  Objectives: [ilidza:sarajevo_dio_ilidza_2, ilidza:rakovica_2]

Axis B "Northern Ring":
  Brigades: rs_3rd_sarajevo_infantry, rs_4th_sarajevo_light_infantry
  Objectives: [vogosca:svrake, vogosca:hotonj, ilijas:dragoradi,
               ilijas:krivajevici, ilijas:medojevici, ilijas:sirovine]
```

#### Operation Foca (Herzegovina Corps)
**Historical**: JNA/paramilitaries seized Foca area. April-June 1992.
```
Axis A "Foca Valley":
  Brigades: rs_foa_brigade, rs_bilea_brigade
  JNA: jna_mostar_garrison_tg
  Objectives: [foca:brusna_2, foca:kosman, foca:tjentiste_2,
               foca:miljevina_2, foca:izbisno, foca:patkovina, foca:ustikolina]

Axis B "Kalinovik":
  Brigades: rs_gacko_brigade, rs_kalinovik_brigade
  Objectives: [kalinovik:varos_2, kalinovik:golubici_2, kalinovik:sela_2]
```

#### Operation Prijedor (1st Krajina Corps)
**Historical**: SDS/JNA takeover of Prijedor, Sanski Most, Kljuc. April-May 1992.
```
Axis A "Prijedor Clean":
  Brigades: rs_43rd_prijedor_motorized, rs_5th_kozara_light_infantry, rs_1st_armored
  JNA: jna_2nd_md_tg
  Objectives: [prijedor:ljubija_2, prijedor:kozarac_2, prijedor:kamicani, prijedor:raljas]

Axis B "Sanski Most":
  Brigades: rs_6th_sanske_infantry, rs_16th_krajina_motorized
  Objectives: [sanski_most:stari_majdan, sanski_most:sanski_most_2, sanski_most:ilidza_2]

Axis C "Kljuc":
  Brigades: rs_11th_dubica_infantry, rs_1st_gradika_light_infantry
  Objectives: [kljuc:kljuc_2, kljuc:hadzici, kljuc:krasulje_2]
```

#### Operation Bosanski Novi (1st Krajina Corps -- new)
**Historical**: SDS takeover of Bosanski Novi. May 1992.
```
Axis A "Novi Grad":
  Brigades: rs_1st_novigrad_infantry, rs_1st_banja_luka
  Objectives: [bosanski_novi:novi_grad_3, bosanski_novi:blagaj_japra, bosanski_novi:suhaca_4]
```

### Time/Condition-Triggered Operations

These appear as player offers. Bot will also receive them if AI-controlled.

#### Operation Posavina Corridor
**Trigger**: 1KK + EBK opening ops ended (complete, stalled, or cancelled)
**Corps**: 1st Krajina + East Bosnian (joint)
**Historical**: Summer 1992 -- linking eastern and western RS through Posavina
```
Axis A "Western Corridor" (1KK):
  Suggested brigades: rs_27th_derventa_motorized, rs_1st_trebava_infantry
  Objectives: [derventa:misinci_2, derventa:zivinice, bosanski_brod:novo_selo_2,
               bosanski_brod:brod]

Axis B "Eastern Corridor" (EBK):
  Suggested brigades: rs_3rd_posavina, rs_2nd_posavina
  Objectives: [orasje:ostra_luka, doboj:makljenovac]
```

#### Operation Kotor Varos
**Trigger**: ~w10 (offer appears, can be deferred/declined/re-offered)
**Corps**: 1st Krajina
**Historical**: Summer-fall 1992 siege of Kotor Varos
```
Axis A "Kotor Varos Siege":
  Suggested brigades: rs_1st_kotor_varos, rs_12th_kotorsko, rs_22nd_krajina_infantry
  Objectives: [kotor_varos:kotor_varos_2, kotor_varos:vrbanjci_2,
               kotor_varos:prisocka_2, kotor_varos:jakotina]
```

#### Operation Jajce
**Trigger**: ~w24 (offer appears)
**Corps**: 2nd Krajina
**Historical**: October 1992 -- VRS captures Jajce, major Bosniak/Croat defeat
```
Axis A "Jajce Assault":
  Suggested brigades: rs_7th_krajina_motorized, rs_1st_drvar, rs_17th_kljuc
  Objectives: [jajce:jajce_3, jajce:jezero_2, jajce:kruscica, jajce:vinac_2]

Axis B "Donji Vakuf":
  Suggested brigades: rs_5th_glamoc, rs_3rd_petrovac
  Objectives: [donji_vakuf:donji_vakuf_2, donji_vakuf:oborci_2,
               donji_vakuf:prusac_2, donji_vakuf:torlakovac_2]
```

#### Operation Cerska-Kamenica
**Trigger**: ~w40 (early 1993)
**Corps**: Drina
**Historical**: Drina Corps sweep reducing Srebrenica pocket
```
Axis A "Cerska Pocket":
  Suggested brigades: rs_1st_birac, rs_1st_milici
  Objectives: [srebrenica:brezovice_2, srebrenica:kalimanici, srebrenica:lijesce]

Axis B "Kamenica":
  Suggested brigades: rs_1st_zvornik, rs_1st_bratunac
  Objectives: [srebrenica:osmace_2, srebrenica:radovcici, srebrenica:sulice_2]
```

### Remaining OSIDs Not Covered by Operations

These should be captured organically by VRS corps AI or through additional operations:

| OSID | Init Controller | Notes |
|------|----------------|-------|
| op:rogatica:rogatica_2 + 3 more | RBiH | Drina/Herzegovina organic targeting |
| op:hanpijesak:godjenje_2 | RBiH | Near VRS Main Staff HQ -- should fall easily |
| op:sokolac:sasevci_2 | RBiH | Already captured organically in n257 |
| op:gorazde:kolovarice | RBiH | Gorazde enclave perimeter -- design decision |
| op:gacko:bahori, gacko_2 | RBiH | Herzegovina Corps organic targets |
| op:nevesinje:sopilja | RBiH | Herzegovina Corps organic target |
| op:kladanj:kladanj_3, staric_2 | RBiH | Central front -- needs corps initiative |
| op:olovo:gurdici_2 | RBiH | Central front |
| op:konjic:ljuta | RBiH | Konjic -- southern approach |
| op:travnik:gornje_krcevine | RBiH | Central Bosnia |
| op:breza:podgora | RBiH | Already captured organically in n257 |
| op:doboj:makljenovac | RBiH | Covered by Posavina Corridor op |
| Krajina HRHB cells (6) | HRHB | banja_luka:dragocaj, potkozarje_3; gradiska:mackovac; teslic:kamenica_2; mrkonjic_grad:baljvine_2; skender_vakuf:donji_koricani -- 1KK should target organically once Vienna rework frees them |

### Intel Re-Offer System

When a time-triggered operation is declined or its conditions change:
- Track `declined_operations: Record<string, { declined_turn: number }>` in state
- Every 8 turns after decline, re-evaluate conditions
- If conditions improved (enemy losses, sector weakened via sector_intel), re-offer:
  `"Intelligence reports: Jajce garrison has suffered significant losses. Recommend reconsidering Operation Jajce."`
- Re-offer at most 3 times; after 3rd decline, operation is permanently dismissed
- If conditions degraded (enemy reinforced), offer is suppressed until improvement

### Player Notification Contract

All operations surface through the existing IPC + SituationTab pipeline:

| Event | Notification |
|-------|-------------|
| Op available (pre-planned) | "Operation [name] is planned and ready. Execute?" |
| Op available (triggered) | "Corps intelligence recommends Operation [name]: [historical context]. Plan this operation?" |
| Op accepted | "Operation [name] begins planning phase. Estimated [N] turns to readiness." |
| Axis stalled | "Operation [name], Axis [name]: advance stalled at [objective]. Other axes continue." |
| Axis complete | "Operation [name], Axis [name]: all objectives captured." |
| Op complete | "Operation [name] concluded. [summary of captures and losses]" |
| JNA withdrawal warning | "JNA [unit name] will withdraw in [N] turns." |
| JNA withdrawal | "JNA [unit name] has withdrawn. Equipment transferred to [corps] brigades." |
| Op re-offer | "Intelligence suggests reconsidering Operation [name]..." |

---

## 4. Vienna Declaration Rework

### Current State

Municipality-based exception list: truce applies everywhere RS-HRHB border EXCEPT {brod, derventa, odzak, bosanski_samac, orasje, jajce}. This is too broad -- it blocks 1KK from attacking HRHB cells in Krajina and prevents meaningful Posavina corridor operations.

### New Design: Corps-Level + OSID-Level

#### Corps-Level Truce (Herzegovina)

Mutual non-aggression between paired corps:

```typescript
const VIENNA_CORPS_PAIRS: [string, string][] = [
    ['vrs_herzegovina', 'hvo_southeast_herzegovina'],
    ['vrs_2nd_krajina', 'hvo_tomislavgrad'],
];
```

**Mechanic**: When Vienna Declaration is active and not broken:
- These corps do not generate attack orders against each other's territory
- Brigades in these corps are **pinned** -- cannot receive movement orders away from current OSID
- If attacked by their truce partner (player breaks truce), they fight back defensively

**Implementation**: In `generateCorpsDirectives()`, if corps is in a Vienna truce pair:
- Skip offensive target generation against partner's OSIDs
- Set `hold_osids` to current positions (pin in place)
- Do not contribute brigades to operations outside their corps area

#### OSID-Level Exclusion (Kiseljak)

```typescript
const VIENNA_KISELJAK_EXCLUSION = [
    // VRS cannot target these (HRHB-held Kiseljak pocket):
    'op:kiseljak:azapovici_2', 'op:kiseljak:bilalovac_2', 'op:kiseljak:borina',
    'op:kiseljak:brnjaci_2', 'op:kiseljak:bukovica', 'op:kiseljak:drazevici',
    'op:kiseljak:gromiljak_2', 'op:kiseljak:hercezi', 'op:kiseljak:kiseljak_2',
];

const VIENNA_KISELJAK_HRHB_EXCLUSION = [
    // HRHB cannot target these (VRS-held OSIDs bordering Kiseljak):
    'op:hadzici:misevici_2', 'op:hadzici:tarcin_2',
    'op:ilidza:rudnik_2',
    'op:visoko:bradve_2', 'op:visoko:buzic_mahala_2',
    'op:visoko:rajcici_2', 'op:visoko:stuparici_2',
];
```

**Mechanic**: These OSIDs are removed from offensive_targets for the respective factions. Forces remain deployed.

#### NOT Covered

- `hvo_northwest_bosnia` (Posavina) -- VRS attacks freely
- `hvo_central_bosnia` outside Kiseljak OSIDs -- no protection
- Any RBiH front -- unaffected
- Krajina HRHB minority cells (banja_luka, gradiska, teslic, etc.) -- 1KK can target freely

#### Player Agency

**At ~w4**, notification to all players:

- **RS player**: "Vienna Declaration proposed: ceasefire with HRHB in Herzegovina and Kiseljak. Accept? Your Herzegovina Corps and 2KK will hold positions. Posavina operations unaffected."
  - Accept: truce activates
  - Decline: no truce; HRHB gets +0.25 aggression for 6 turns

- **HRHB player**: Same offer, mirrored.

- **RBiH player**: "Intelligence reports: RS and HRHB have agreed to a ceasefire in Herzegovina. Their forces remain deployed but inactive on those fronts."

**Breaking later**: Player can break Herzegovina truce or Kiseljak exclusion independently:
- "Break Herzegovina ceasefire" -- releases vrs_herzegovina + hvo_southeast_herzegovina AND vrs_2nd_krajina + hvo_tomislavgrad
- "Break Kiseljak truce" -- removes OSID exclusions only
- Consequence: opponent gets +0.25 aggression for 6 turns (existing mechanic)

#### State Changes

```typescript
// Replace current fields:
vienna_declaration_turn?: number;                        // KEEP
truce_broken_turn?: Record<FactionId, number>;          // KEEP

// Add:
vienna_accepted?: Record<FactionId, boolean>;            // NEW: player acceptance
vienna_kiseljak_broken?: boolean;                        // NEW: separate Kiseljak break
vienna_herzegovina_broken_by?: FactionId;                // NEW: who broke Herzegovina
```

---

## 5. Implementation Sequence

### Phase 1: Multi-Axis Operation Infrastructure
1. Extend `CorpsOperation` type with `axes: OperationAxis[]`
2. Update `advanceSectorOffensives()` to iterate per-axis
3. Update `updateSectorOffensiveResults()` for per-axis tracking
4. Add contiguity validation using contact graph
5. Update operation diagnostics/reporting for axes
6. Tests: axis lifecycle, contiguity validation, concurrent execution

### Phase 2: JNA Phantom Brigades
1. Add `jna_phantom` formation kind to game state types
2. Add `withdrawal_turn` field to FormationState
3. Create phantom brigade definitions (data, not code)
4. Implement spawn logic at scenario start
5. Implement withdrawal + equipment handoff logic
6. Add `corps_equipment_reserve` state field
7. Add equipment ceiling to OOB data or derive from equipment_class
8. Wire player notifications for withdrawal countdown
9. Tests: spawn, combat participation, withdrawal, equipment distribution, ceiling respect

### Phase 3: Expanded VRS Operations
1. Replace `VRS_PRE_PLANNED` with new multi-axis definitions
2. Add time/condition trigger system for later operations
3. Add operation offer state tracking (`pending_operation_offers`, `declined_operations`)
4. Add intel re-offer logic (8-turn cooldown, 3-strike dismiss, condition check)
5. Wire offer/accept/decline IPC for desktop
6. Wire SituationTab notifications
7. Tests: trigger conditions, offer lifecycle, accept/decline/re-offer

### Phase 4: Vienna Declaration Rework
1. Replace municipality exception list with corps pairs + OSID exclusions
2. Add corps pinning logic (no movement orders away from current OSID)
3. Add player accept/decline at w4
4. Split truce-break into Herzegovina vs Kiseljak
5. Update bot AI filtering for new truce model
6. Wire player notifications
7. Tests: corps non-aggression, OSID exclusion, pin enforcement, break mechanics

### Phase 5: Calibration
1. Run 40w with new ops + Vienna rework
2. Verify JNA phantom withdrawal timing
3. Check operation completion rates per axis
4. Compare control counts against jan1993 reference
5. Tune JNA equipment quantities if VRS over/under-captures
6. Adjust time triggers if operations fire too early/late
7. Run 52w for full-year validation

---

## 6. Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| JNA phantoms too strong -- VRS steamrolls beyond historical extent | Equipment ceilings + staggered withdrawal limit duration. Tune equipment quantities per phantom. |
| Multi-axis complexity causes determinism issues | Each axis sorted by axis_id, brigades within axis sorted by strictCompare |
| Too many operations overwhelm player | Pre-planned ops auto-ready; triggered ops are offers with clear context. Max 2 pending offers at once. |
| Corps pinning breaks sector assignment | Pinned brigades keep their sector assignment; they just can't move away |
| Equipment handoff creates overpowered brigades | Per-brigade equipment ceiling enforced. Excess to corps reserve. |
| Posavina unfreezing causes HRHB collapse | HRHB Posavina (hvo_northwest_bosnia) was historically overrun. That's correct. HVO held Orasje pocket only. |

---

## 7. Files to Modify

### New Files
- `src/sim/combat/jna_phantom_brigades.ts` -- phantom spawn, withdrawal, equipment handoff
- `src/sim/combat/operation_offers.ts` -- time/condition triggers, offer lifecycle, intel re-offers
- `tests/jna_phantom_brigades.test.ts`
- `tests/multi_axis_operations.test.ts`
- `tests/operation_offers.test.ts`
- `tests/vienna_declaration_rework.test.ts`

### Modified Files
- `src/state/game_state.ts` -- OperationAxis type, corps_equipment_reserve, vienna state fields, jna_phantom kind
- `src/sim/combat/pre_planned_operations.ts` -- rewrite with multi-axis definitions
- `src/sim/combat/sector_offensive.ts` -- per-axis lifecycle
- `src/sim/combat/bot_corps_ai.ts` -- multi-axis operation creation, corps pinning
- `src/sim/local_truces.ts` -- corps-pair + OSID exclusion model, player acceptance
- `src/sim/turn_phases/war_phases.ts` -- new pipeline steps for JNA withdrawal, operation offers
- `src/sim/formation_spawn.ts` -- equipment reserve draws during reinforcement
- `src/desktop/electron-main.cjs` -- IPC for operation accept/decline, truce accept/decline
- `src/desktop/preload.cjs` -- expose new IPC
- `src/ui/map/desktop/useIPC.ts` -- hook new IPC
- `src/ui/map/components/SituationTab.tsx` -- operation offers, JNA warnings, truce notifications
- `src/ui/map/data/GameStateAdapter.ts` -- derive operation offer state
- `src/ui/map/data/types.ts` -- LoadedGameState extensions
- `data/source/oob_brigades.json` -- equipment_ceiling fields (or derive from equipment_class)
- `data/scenarios/apr1992_definitive_40w.json` -- already stripped to 1 override
- `data/scenarios/apr1992_definitive_52w.json` -- already stripped to 1 override
- `vitest.config.ts` -- new test files
