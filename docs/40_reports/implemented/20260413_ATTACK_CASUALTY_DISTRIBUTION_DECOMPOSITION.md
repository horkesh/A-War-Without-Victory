# Attack Resolution OSID Decomposition — Tranche 3: Casualty Calculation & Distribution

**Date:** 2026-04-13
**Program:** v0.8-to-v0.9 god-file decomposition tranche 3
**Type:** Maintainability / no-behavior-drift decomposition
**Prior tranche hash baseline:** `16badcf4f470d2ce`
**Scenario hash proof:** `16badcf4f470d2ce` (n1566) — identical to HEAD baseline. Zero-drift confirmed.

---

## Tranche Context

This is tranche 3 of the v0.8-to-v0.9 god-file decomposition of `attack_resolution_osid.ts`. The target is the casualty calculation and distribution family: the base casualty formula, KIA/WIA/MIA splitting constants and function, weighted attacker casualty share computation (with support/main role differentiation), distance-weighted defender casualty distribution, and defender contribution record building for Layer C battle reports.

This is a pure decomposition — no behavior changes. Inline casualty computation blocks in the main resolver loop are replaced with function calls to a new module.

**Tranche 1** (accepted, same session):
- Extracted retreat/displacement helpers -> `attack_retreat_displacement.ts` (502 lines)
- Extracted battle report types -> `attack_resolution_types.ts` (102 lines)
- Main file: 1925 -> ~1416 lines (-26%)

**Tranche 2** (accepted, same session):
- Extracted equipment battle effects -> `attack_equipment_effects.ts` (406 lines)
- Main file: 1416 -> 1218 lines (-14%)
- Cumulative from HEAD (1925 lines): -707 lines (-37%)

**Tranche 3** (this report):
- Extracted casualty calculation & distribution -> `attack_casualty_distribution.ts` (190 lines)
- Main file: 1218 -> 1186 lines (-32)
- Cumulative from HEAD (1925 lines): -739 lines (-38%)

---

## Classification Table — All Inline Families

| Family | Status | Notes |
|--------|--------|-------|
| Retreat & displacement helpers | Extracted (tranche 1) | -> `attack_retreat_displacement.ts` |
| Battle report types | Extracted (tranche 1) | -> `attack_resolution_types.ts` |
| Equipment battle effects | Extracted (tranche 2) | -> `attack_equipment_effects.ts` |
| KIA/WIA/MIA constants | **Extracted (tranche 3)** | KIA_FRACTION, WIA_FRACTION, MIA_FRACTION |
| KIA/WIA/MIA splitting | **Extracted (tranche 3)** | `splitKiaWiaMia()` |
| Final casualty formula | **Extracted (tranche 3)** | `computeFinalCasualties()` (11 numeric params) |
| Attacker casualty weight distribution | **Extracted (tranche 3)** | `computeAttackerCasualtyShares()` |
| Defender casualty distribution | **Extracted (tranche 3)** | `distributeDefenderCasualties()` |
| Defender contribution records | **Extracted (tranche 3)** | `buildDefenderContributions()` |
| Dead code (aKia/dKia vars) | **Removed (tranche 3)** | 6 unused variables, never referenced |
| Sector defense model | Still inline | Distance-weighted reactive defense (~100 lines) |
| Attacker per-formation effects | Still inline | Cohesion, fatigue, morale, disruption (~20 lines) |
| Morale/retreat resistance | Still inline | Morale absorption, homeland determination (~80 lines) |
| Post-battle effects | Still inline | Snap events, ammo crisis, pyrrhic (~30 lines) |
| Supply/facility/experience/officer | Still inline | Supply expenditure, facility damage, XP, officer (~60 lines) |
| Flip logic & displacement | Still inline | OSID flip, defender retreat, advance (~100 lines) |
| Brigade history recording | Still inline | recordAttacker/DefenderEngagement (~55 lines) |
| Final displacement pass | Still inline | Post-loop enemy territory cleanup (~30 lines) |

---

## Exact Seam Chosen

**Casualty calculation and distribution family** — all inline code dealing with:
1. Base casualty formula with Lanchester concentration bonus and MIN_COMBAT_PERSONNEL cap
2. KIA/WIA/MIA splitting (constants and function)
3. Weighted attacker casualty share computation with support/main role multipliers
4. Distance-weighted defender casualty distribution (multi-brigade weighted and single-brigade paths)
5. Defender contribution record building for Layer C battle reports

This family was chosen because it has a clear computational boundary (casualty numbers in, per-formation distributions out), well-defined inputs (personnel counts, multipliers, brigade weights), and is consumed rather than controlling — it never influences whether the attacker wins or the defender retreats.

**Design note:** `computeFinalCasualties` takes 11 numeric parameters. This is the exact set of pre-computed multipliers that feed the casualty formula. All are simple numbers — no state objects, no formation references. The parameter count reflects the formula's actual complexity, not a design problem.

---

## Extracted API Surface

### Constants (3)
- `KIA_FRACTION = 0.30`
- `WIA_FRACTION = 0.55`
- `MIA_FRACTION = 0.15`

### Functions (5)
- `splitKiaWiaMia(casualties)` — splits a total casualty count into KIA, WIA, MIA using the fixed fractions
- `computeFinalCasualties(personnelAttacker, personnelDefender, attCasMult, defCasMult, urbanMult, forestMult, moraleMult, warExhaustionMult, entrenchmentMult, concentrationBonus, defensiveFireMult)` — base attacker/defender casualty formula with Lanchester concentration bonus and MIN_COMBAT_PERSONNEL cap
- `computeAttackerCasualtyShares(attackerFormations, totalAttackerCasualties)` — computes per-formation casualty shares using personnel-weighted distribution with support/main role multipliers
- `distributeDefenderCasualties(defenderFormations, totalDefenderCasualties, sectorBrigadeWeights)` — handles both multi-brigade weighted and single-brigade distribution paths
- `buildDefenderContributions(defenderFormations, sectorBrigadeWeights)` — builds Layer C battle report defender contribution records

---

## Canonical Owners

### Before extraction
**Single file:** `src/sim/combat/attack_resolution_osid.ts` — owned everything related to casualty formula computation, KIA/WIA/MIA splitting, attacker casualty weight distribution, defender casualty distribution, and defender contribution records inline within the main resolver loop.

### After extraction

| Domain | Owner | Lines |
|--------|-------|-------|
| Retreat, displacement, emergency repositioning | `src/sim/combat/attack_retreat_displacement.ts` | 502 |
| Battle report types, snap event types, defender contribution | `src/sim/combat/attack_resolution_types.ts` | 102 |
| Equipment loss, scavenging, capture, abandonment, equipment reporting | `src/sim/combat/attack_equipment_effects.ts` | 406 |
| Casualty formula, KIA/WIA/MIA split, attacker/defender casualty distribution, contribution records | `src/sim/combat/attack_casualty_distribution.ts` | 190 |
| Main resolver orchestration, sector defense, morale, flip logic, displacement, recording | `src/sim/combat/attack_resolution_osid.ts` | 1186 |

**Calling relationship:** `attack_resolution_osid.ts` is the sole caller of `attack_casualty_distribution.ts`. The extracted module is a pure helper library with no back-references to the main resolver.

---

## Demoted Paths

None — this is a new file extraction. The inline casualty computation code in `attack_resolution_osid.ts` has been replaced by function calls to the new module.

---

## Exact Files Changed

| File | Change |
|------|--------|
| `src/sim/combat/attack_casualty_distribution.ts` | **NEW** — 190 lines, casualty calculation & distribution ownership |
| `src/sim/combat/attack_resolution_osid.ts` | **MODIFIED** — 1218 -> 1186 lines (-32). Inline casualty computation blocks replaced with function calls to new module. 6 dead variables removed. |

---

## Exact Verification Results

| Check | Result |
|-------|--------|
| `npx.cmd tsc --noEmit -p tsconfig.json` | PASS — 0 errors, no output |
| `npm.cmd run build` | PASS |
| `npm.cmd run desktop:map:build` | PASS (6.64s) |
| Targeted vitest (4 suites: casualty, equipment, probe, retreat) | PASS — 94 tests |
| Full vitest | PASS — 292 suites, 3394 tests (3365 existing + 29 new) |
| 40w scenario hash | `16badcf4f470d2ce` (n1566) — identical to HEAD baseline |

---

## Scenario Hash Proof

- Post-extraction run n1566: hash `16badcf4f470d2ce`
- HEAD baseline (n1564): hash `16badcf4f470d2ce`
- **IDENTICAL — zero-drift confirmed across all three tranches.**

---

## Residual Maintainability Risks

1. **`attack_resolution_osid.ts` at 1186 lines is still large but increasingly orchestration-focused.** The remaining inline families (sector defense, morale resistance, flip logic, displacement) are tightly coupled through loop-scoped variables.

2. **The attacker per-formation loop (L623-648) still mixes casualty application with cohesion/fatigue/morale/disruption** — these are tightly coupled through per-formation iteration order. Extracting computation was correct; the application must stay inline.

3. **The morale absorption block (L937-968) still uses `KIA_FRACTION`/`WIA_FRACTION` inline via import rather than `splitKiaWiaMia`** — consistent but could be unified in a future pass. The morale block computes partial KIA/WIA for a different purpose (morale shock from losses) so using the raw fractions is semantically appropriate.

4. **`personnelAttacker`/`personnelDefender` computation stays inline (3 lines each, tightly coupled to sector defense context)** — these are inputs to `computeFinalCasualties` and derive from loop-scoped sector defense variables. Moving them would require passing the sector defense model output as a parameter, which adds complexity without improving clarity.

---

## Recommended Next Tranche Seam

**Tranche 4: Post-battle effects** — morale effects (attacker and defender), ammo crisis snap event, pyrrhic victory snap event, experience gain, officer quality loss. These are a self-contained block (~60-80 lines) with minimal coupling to the rest of the loop. Would extract to `attack_post_battle_effects.ts`.

**Rationale:** Post-battle effects are downstream consumers of the combat outcome and casualty totals. They produce snap events and modify formation state but never influence the flip decision or retreat routing. This makes them a clean extraction target with a narrow parameter surface.

---

## Architecture Lesson

When the casualty-calculation family is interleaved with combat-effect application (cohesion, fatigue, disruption) in a per-formation loop, extract the computation (weight distribution, formula) but leave the application loop inline. Separating "what to compute" from "how to apply" lets the computation be tested in isolation while the application keeps its tightly-coupled iteration order.

Additionally, when a function takes many numeric parameters (11 in `computeFinalCasualties`), this reflects the formula's actual complexity — not a design problem. All parameters are simple numbers (pre-computed multipliers), not state objects. The alternative of wrapping them in an options object adds indirection without improving clarity, since each parameter has a unique semantic role in the formula.
