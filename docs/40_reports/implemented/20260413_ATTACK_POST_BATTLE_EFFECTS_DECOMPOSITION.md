# Attack Resolution OSID Decomposition — Tranche 4: Post-Battle Effects

**Date:** 2026-04-13
**Program:** v0.8-to-v0.9 god-file decomposition tranche 4
**Type:** Maintainability / no-behavior-drift decomposition
**Prior tranche hash baseline:** `16badcf4f470d2ce`
**Scenario hash proof:** `16badcf4f470d2ce` (n1567) — identical to HEAD baseline. Zero-drift confirmed.

---

## Tranche Context

This is tranche 4 of the v0.8-to-v0.9 god-file decomposition of `attack_resolution_osid.ts`. The target is the post-battle effects family: experience gain with faction-differentiated learning rates, officer quality degradation from casualties, defender outcome perspective mapping, disruption application from combat outcome, ammo crisis / pyrrhic victory snap event generation, and post-battle morale effects for both attacker and defender formations.

This is a pure decomposition — no behavior changes. Inline post-battle effect blocks in the main resolver are replaced with function calls to a new module.

**Tranche 1** (accepted, same session):
- Extracted retreat/displacement helpers -> `attack_retreat_displacement.ts` (502 lines)
- Extracted battle report types -> `attack_resolution_types.ts` (102 lines)
- Main file: 1925 -> ~1416 lines (-26%)

**Tranche 2** (accepted, same session):
- Extracted equipment battle effects -> `attack_equipment_effects.ts` (406 lines)
- Main file: 1416 -> 1218 lines (-14%)
- Cumulative from HEAD (1925 lines): -707 lines (-37%)

**Tranche 3** (accepted, same session):
- Extracted casualty calculation & distribution -> `attack_casualty_distribution.ts` (190 lines)
- Main file: 1218 -> 1186 lines (-32)
- Cumulative from HEAD (1925 lines): -739 lines (-38%)

**Tranche 4** (this report):
- Extracted post-battle effects -> `attack_post_battle_effects.ts` (174 lines)
- Main file: 1186 -> 1119 lines (-67)
- Cumulative from HEAD (1925 lines): -806 lines (-42%)

---

## Classification Table — All Inline Families After 4 Tranches

| Family | Status | Owner |
|--------|--------|-------|
| Retreat & displacement | Extracted (T1) | attack_retreat_displacement.ts |
| Battle report types | Extracted (T1) | attack_resolution_types.ts |
| Equipment loss/scavenge/capture | Extracted (T2) | attack_equipment_effects.ts |
| Casualty formula & distribution | Extracted (T3) | attack_casualty_distribution.ts |
| Experience gain | **Extracted (T4)** | attack_post_battle_effects.ts |
| Officer quality loss | **Extracted (T4)** | attack_post_battle_effects.ts |
| Ammo crisis / pyrrhic snap | **Extracted (T4)** | attack_post_battle_effects.ts |
| Post-battle morale effects | **Extracted (T4)** | attack_post_battle_effects.ts |
| Defender outcome perspective | **Extracted (T4)** | attack_post_battle_effects.ts |
| Disruption from outcome | **Extracted (T4)** | attack_post_battle_effects.ts |
| Sector defense model | Still inline | attack_resolution_osid.ts |
| Attacker per-formation loop | Still inline | attack_resolution_osid.ts |
| Defender cohesion/fatigue/streak/entrench | Still inline | attack_resolution_osid.ts |
| Commander casualty snap | Still inline | attack_resolution_osid.ts |
| Morale absorption + extra casualties | Still inline | attack_resolution_osid.ts |
| Supply expenditure | Still inline | attack_resolution_osid.ts |
| Facility combat damage | Still inline | attack_resolution_osid.ts |
| Flip logic & displacement | Still inline | attack_resolution_osid.ts |
| Brigade history recording | Still inline | attack_resolution_osid.ts |
| AAR narrative queue | Still inline | attack_resolution_osid.ts |
| Operation feedback counters | Still inline | attack_resolution_osid.ts |
| Final displacement pass | Still inline | attack_resolution_osid.ts |
| Combat fatigue accumulation | Still inline | attack_resolution_osid.ts |

---

## Exact Seam Chosen

**Post-battle effects family** — all inline code dealing with:
1. Experience gain with faction-differentiated learning rates (RBiH 1.5x, RS 0.7x, HRHB 1.0x) and diminishing returns
2. Officer quality degradation driven by casualty ratio, modulated by current quality
3. Defender outcome perspective inversion (attacker decisive_victory = defender catastrophic, etc.)
4. Disruption effects from combat outcome (disrupted_turns, last_repulsed_from)
5. Ammo crisis / pyrrhic victory snap event generation with cohesion -10 and forced defend posture
6. Post-battle morale for attackers (outcome-based: +3 decisive_victory to -10 catastrophic) and defenders (flip: -5, held without morale absorption: +1)

This family was chosen because post-battle effects are sequentially ordered after casualty/equipment processing and before flip logic. Each function takes narrow parameters computed upstream and mutates formations in place, with no back-coupling to the main resolver's control flow.

---

## Extracted API Surface

### Constants (6)
- `BASE_EXPERIENCE_GAIN = 0.03`
- `VICTORY_EXPERIENCE_BONUS = 0.02`
- `DEFEAT_EXPERIENCE_GAIN = 0.01`
- `FACTION_LEARNING_RATE` — `{ RBiH: 1.5, RS: 0.7, HRHB: 1.0 }`
- `DEFAULT_LEARNING_RATE = 1.0`
- `COMMANDER_EXP_LOSS = 0.15`

### Functions (6)
- `applyExperienceGain(f, won)` — applies experience gain with faction learning rate and diminishing returns (experienced formations gain less)
- `applyOfficerCasualtyLoss(f, cas, totalPersonnel)` — degrades officer quality proportional to casualty ratio, modulated by current quality; floors at OFFICER_QUALITY_FLOOR
- `getDefenderOutcomePerspective(outcome)` — maps attacker CombatOutcome to defender perspective string (inverted)
- `applyDisruptionFromOutcome(formation, outcome, targetOsid, turn)` — sets disrupted_turns and last_repulsed_from based on outcome severity
- `applyAmmoCrisisPyrrhicEffects(params)` — generates snap event (ammo_crisis or pyrrhic_victory), applies cohesion -10 and forced defend posture to all attackers; returns null if neither condition met
- `applyPostBattleMorale(params)` — applies outcome-based morale to attackers (+3 to -10) and flip/hold morale to defender (-5 on flip, +1 on hold without morale absorption)

---

## Canonical Owners

### Before extraction
**Single file:** `src/sim/combat/attack_resolution_osid.ts` — owned everything related to post-battle experience, officer quality, outcome perspective, disruption, snap events, and morale effects inline within the main resolver.

### After extraction

| Domain | Owner | Lines |
|--------|-------|-------|
| Retreat, displacement, emergency repositioning | `src/sim/combat/attack_retreat_displacement.ts` | 502 |
| Battle report types, snap event types, defender contribution | `src/sim/combat/attack_resolution_types.ts` | 102 |
| Equipment loss, scavenging, capture, abandonment, equipment reporting | `src/sim/combat/attack_equipment_effects.ts` | 406 |
| Casualty formula, KIA/WIA/MIA split, attacker/defender casualty distribution, contribution records | `src/sim/combat/attack_casualty_distribution.ts` | 190 |
| Experience, officer quality, disruption, morale, snap events | `src/sim/combat/attack_post_battle_effects.ts` | 174 |
| Main resolver orchestration, sector defense, morale absorption, flip logic, displacement, recording | `src/sim/combat/attack_resolution_osid.ts` | 1119 |

**Calling relationship:** `attack_resolution_osid.ts` is the sole caller of `attack_post_battle_effects.ts`. The extracted module is a pure helper library with no back-references to the main resolver.

---

## Demoted Paths

None — this is a new file extraction. The inline post-battle effect code in `attack_resolution_osid.ts` has been replaced by function calls to the new module.

---

## Exact Files Changed

| File | Change |
|------|--------|
| `src/sim/combat/attack_post_battle_effects.ts` | **NEW** — 174 lines, post-battle effects ownership |
| `src/sim/combat/attack_resolution_osid.ts` | **MODIFIED** — 1186 -> 1119 lines (-67). Inline post-battle effect blocks replaced with function calls to new module. |

---

## Exact Verification Results

| Check | Result |
|-------|--------|
| `npx.cmd tsc --noEmit` | PASS — 0 errors |
| `npm.cmd run build` | PASS |
| `npm.cmd run desktop:map:build` | PASS (6.51s) |
| Full vitest | PASS — 292 suites, 3394 tests |
| 40w scenario hash | `16badcf4f470d2ce` (n1567) — identical to HEAD baseline |

---

## Scenario Hash Proof

- Post-extraction run n1567: hash `16badcf4f470d2ce`
- HEAD baseline (n1564): hash `16badcf4f470d2ce`
- **IDENTICAL — zero-drift confirmed across all four tranches.**

---

## Residual Maintainability Risks

1. **Main file at 1119 lines — still large but increasingly orchestration-focused.** The remaining inline families (sector defense, morale absorption, flip logic, displacement, recording) are tightly coupled through loop-scoped variables and control-flow dependencies.

2. **Attacker per-formation loop still mixes casualty application with cohesion/fatigue** — tightly coupled iteration order prevents clean extraction of the application logic. The computation was extracted in tranche 3; the application must stay inline.

3. **Commander casualty snap (L684-703) is a snap event that could move to post-battle-effects but was not in scope** — it depends on per-formation loop variables (individual formation casualty count vs threshold) rather than the aggregated outcome, making it a different extraction family than the outcome-based effects extracted here.

4. **Morale absorption + extra casualties block (~80 lines) is the largest remaining standalone block** — it has control-flow coupling to the flip decision (morale absorption prevents flip), making it harder to extract than the post-battle effects.

---

## Recommended Next Tranche Seam

Three candidates, in order of extraction cleanliness:

1. **Morale absorption + homeland determination** (~80 lines, L854-937) — the largest coherent remaining block. Has control-flow coupling to flip decision but could extract as a function returning a boolean (absorbed or not) plus extra casualties.

2. **Supply/facility** (~25 lines, L792-813) — small but self-contained. Supply expenditure and facility combat damage are independent of each other and of the flip decision.

3. **Flip logic + displacement** (~80 lines, L939-1068) — larger and more complex. Depends on morale absorption result and drives the retreat/advance path. Would need careful parameter threading.

**Recommendation:** Tranche 5 should target morale absorption + homeland determination. It is the largest block with a clear boolean result contract, and extracting it first simplifies subsequent flip logic extraction.

---

## Architecture Lesson

Post-battle effects form a clean extraction family because they are sequentially ordered after casualty/equipment processing and before flip logic. Each function takes narrow parameters computed upstream and mutates formations in place. The key insight is that "post-battle" effects are a distinct phase in the combat resolution pipeline — they observe the outcome and modify state, but never influence whether the attacker wins or the OSID flips. This makes them safe to extract without risking control-flow coupling.

The six-function decomposition (rather than a single `applyAllPostBattleEffects`) preserves the main resolver's ability to interleave these effects with other inline logic (e.g., experience gain happens in the per-formation loop, while morale happens after the loop). Forcing a monolithic post-battle function would require restructuring the caller, which violates the "no behavior change" contract of a decomposition tranche.
