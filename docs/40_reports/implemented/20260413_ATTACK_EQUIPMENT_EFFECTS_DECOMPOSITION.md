# Attack Resolution OSID Decomposition — Tranche 2: Equipment Battle Effects

**Date:** 2026-04-13
**Program:** v0.8-to-v0.9 god-file decomposition tranche 2
**Type:** Maintainability / no-behavior-drift decomposition
**Baseline hash:** `16badcf4f470d2ce` (n1564, pre-extraction)
**Post-extraction hash:** `16badcf4f470d2ce` (n1565, post-extraction) — **IDENTICAL**

---

## Tranche Context

This is tranche 2 of the v0.8-to-v0.9 god-file decomposition of `attack_resolution_osid.ts`. The target is the equipment battle-effects family: all inline code dealing with equipment loss calculation, battlefield scavenging, equipment capture from retreating/routed forces, abandoned equipment on uncontested occupation, battle report equipment field construction, and brigade history equipment data builders.

This is a pure decomposition — no behavior changes. The extraction replaces 6 inline code blocks in the main resolver loop with function calls to a new module, preserving identical semantics proven by scenario hash match.

**Tranche 1** (accepted, same session):
- Extracted retreat/displacement helpers -> `attack_retreat_displacement.ts` (502 lines)
- Extracted battle report types -> `attack_resolution_types.ts` (102 lines)
- Main file: 1925 -> ~1416 lines (-26%)

**Tranche 2** (this report):
- Extracted equipment battle effects -> `attack_equipment_effects.ts` (406 lines)
- Main file: 1416 -> 1218 lines (-14%)
- Cumulative from HEAD (1925 lines): -707 lines (-37%)

---

## Classification Table — All Inline Families

| Family | Status | Lines | Notes |
|--------|--------|-------|-------|
| Retreat & displacement helpers | Extracted (tranche 1) | ~530 | -> `attack_retreat_displacement.ts` |
| Battle report types | Extracted (tranche 1) | ~100 | -> `attack_resolution_types.ts` |
| Equipment loss constants | **Extracted (tranche 2)** | 2 | `TANK_LOSS_RATE`, `ARTILLERY_LOSS_RATE` |
| Per-formation equipment loss | **Extracted (tranche 2)** | ~40 | `computeFormationEquipmentLoss()` |
| Scavenge accumulator | **Extracted (tranche 2)** | ~15 | `accumulateScavenge()` |
| Scavenging logic | **Extracted (tranche 2)** | ~60 | Inside `processEquipmentTransfers()` |
| Equipment capture | **Extracted (tranche 2)** | ~64 | Inside `processEquipmentTransfers()` |
| Abandoned equipment | **Extracted (tranche 2)** | ~35 | Inside `processEquipmentTransfers()` |
| Battle report equipment field | **Extracted (tranche 2)** | ~12 | `buildBattleEquipmentReport()` |
| Brigade history equipment data | **Extracted (tranche 2)** | ~30 | `buildAttackerEquipmentRecord()` / `buildDefenderEquipmentRecord()` |
| Sector defense model | Still inline | ~100 | Distance-weighted reactive defense |
| Casualty calculation & distribution | Still inline | ~120 | KIA/WIA/MIA, weighted distribution |
| Morale/retreat resistance | Still inline | ~80 | Morale absorption, homeland determination |
| Post-battle effects | Still inline | ~60 | Snap events, ammo crisis, pyrrhic |
| Supply/facility/experience/officer | Still inline | ~60 | Supply expenditure, facility damage, XP |
| Flip logic & displacement | Still inline | ~100 | OSID flip, defender retreat, advance |
| Brigade history recording | Still inline | ~55 | `recordAttackerEngagements` / `DefenderEngagement` |
| Final displacement pass | Still inline | ~30 | Post-loop enemy territory cleanup |

---

## Exact Seam Chosen

**Equipment battle-effects family** — all inline code dealing with:
1. Equipment loss calculation (role-differentiated attacker/defender rates with scarce-tank protection)
2. Battlefield scavenging (fractional accumulator across multiple engagements)
3. Equipment capture from retreating/routed forces
4. Abandoned equipment on uncontested occupation
5. Battle report equipment field construction
6. Brigade history equipment data builders

This family was chosen because it has a clear domain boundary (equipment lifecycle during combat), well-defined inputs (formation state, combat outcome, casualty counts), and no coupling to the control-flow decisions of the main resolver (flip logic, retreat routing, morale thresholds).

---

## Extracted API Surface

### Constants (2)
- `TANK_LOSS_RATE = 0.08`
- `ARTILLERY_LOSS_RATE = 0.04`

### Functions (6)
- `computeFormationEquipmentLoss(formation, role, casualtyLedger)` — per-formation equipment loss with role-differentiated rates and scarce-tank protection
- `accumulateScavenge(accum, delta)` — fractional scavenge accumulator (carries fractional remainder across battles)
- `processEquipmentTransfers(params)` — consolidated entry point for scavenging, capture, and abandoned equipment; returns `EquipmentTransferResult`
- `buildBattleEquipmentReport(...)` — constructs the equipment section of the battle report
- `buildAttackerEquipmentRecord(...)` — constructs equipment data for attacker brigade history
- `buildDefenderEquipmentRecord(...)` — constructs equipment data for defender brigade history

### Interfaces (3)
- `EquipmentTransferResult` — return type from `processEquipmentTransfers`
- `BattleEquipmentData` — equipment section of battle report
- `BrigadeEquipmentRecord` — equipment data in brigade history entries

---

## Canonical Owners

### Before extraction
**Single file:** `src/sim/combat/attack_resolution_osid.ts` — owned everything related to equipment loss, scavenging, capture, and abandonment inline within the main resolver loop.

### After extraction

| Domain | Owner | Lines |
|--------|-------|-------|
| Retreat, displacement, emergency repositioning | `src/sim/combat/attack_retreat_displacement.ts` | 502 |
| Battle report types, snap event types, defender contribution | `src/sim/combat/attack_resolution_types.ts` | 102 |
| Equipment loss, scavenging, capture, abandonment, equipment reporting | `src/sim/combat/attack_equipment_effects.ts` | 406 |
| Main resolver orchestration, sector defense, casualty distribution, morale, flip logic, displacement, recording | `src/sim/combat/attack_resolution_osid.ts` | 1218 |

**Calling relationship:** `attack_resolution_osid.ts` is the sole caller of `attack_equipment_effects.ts`. The extracted module is a pure helper library with no back-references to the main resolver.

---

## Demoted Paths

None — this is a new file extraction. The inline equipment code in `attack_resolution_osid.ts` has been replaced by function calls to the new module.

---

## Exact Files Changed

| File | Change |
|------|--------|
| `src/sim/combat/attack_equipment_effects.ts` | **NEW** — 406 lines, equipment battle-effects ownership |
| `src/sim/combat/attack_resolution_osid.ts` | **MODIFIED** — 1416 -> 1218 lines (-198, -14%). 6 inline code blocks replaced with function calls to new module. |

---

## Exact Verification Results

| Check | Result |
|-------|--------|
| `npx.cmd tsc --noEmit -p tsconfig.json` | PASS — 0 errors |
| `npx.cmd vitest run` | PASS — 290/290 files, 3311/3311 tests |
| `npm.cmd run build` | PASS |
| `npm.cmd run desktop:map:build` | PASS |
| 40w scenario hash (n1564 pre-extraction) | `16badcf4f470d2ce` |
| 40w scenario hash (n1565 post-extraction) | `16badcf4f470d2ce` |
| **Hash match** | **IDENTICAL — zero behavior drift** |

---

## Scenario Hash Proof

The scenario hash proof follows the same methodology as tranche 1:

1. Pre-extraction run n1564 on HEAD (with tranche 1 already applied): hash `16badcf4f470d2ce`
2. Applied tranche 2 equipment extraction
3. Post-extraction run n1565: hash `16badcf4f470d2ce`
4. **Match confirmed — zero drift from equipment extraction**

Cumulative proof: the hash `16badcf4f470d2ce` is identical across HEAD baseline, tranche 1, and tranche 2. All three tranches of extraction are collectively behavior-preserving.

---

## Residual Maintainability Risks

1. **`attack_resolution_osid.ts` is still 1218 lines** — large but now more orchestration-like. The remaining inline families (sector defense, casualty distribution, morale resistance, flip logic, displacement) are tightly coupled through loop-scoped variables.

2. **The main `resolveAttackOrdersOsid` function is still a single large function with a for loop.** The remaining inline families share loop-scoped variables (`attackerLost`, `attackerWon`, `defenderPower`, `sectorBrigadeWeights`, etc.) that make further extraction require careful parameter surface design.

3. **Minor redundancy in outcome variables.** The `attackerLost`/`attackerWon` local variables are now computed both in the extracted module (inside `processEquipmentTransfers`) and at the call site in the main resolver. This is semantically harmless — both derive from the same `outcome` variable — but could be simplified in a future pass.

4. **Equipment tracking variables remain loop-scoped.** `battleEquip*` variables are still declared as loop-scoped locals and populated from the return values of extracted functions. A future pass could simplify this to a single result struct.

---

## Recommended Next Tranche Seam

**Tranche 3: Casualty calculation and distribution** — the KIA/WIA/MIA calculation, weighted attacker casualty distribution, distance-weighted defender casualty distribution, and defender contribution records. This is the next largest coherent family (~120 lines). It depends only on `computeDefenderPower` results and the `sectorBrigadeWeights` map. Would extract to `attack_casualty_distribution.ts`.

**Alternative:** Post-battle effects (morale effects, snap events, experience gain, officer quality loss) as a more self-contained extraction.

---

## Architecture Lesson

1. **Equipment effects were a clean extraction target because they have no control-flow coupling.** Equipment loss, scavenging, and capture never influence whether the attacker wins or the defender retreats — they are downstream consumers of those decisions. This made the parameter surface narrow and the extraction low-risk.

2. **Consolidating related inline blocks into a single function (`processEquipmentTransfers`) is preferable to extracting each block individually.** The scavenging, capture, and abandonment blocks share context (outcome, formation references, casualty counts) and are always called together. A single consolidated entry point with a structured result is cleaner than three separate calls.
