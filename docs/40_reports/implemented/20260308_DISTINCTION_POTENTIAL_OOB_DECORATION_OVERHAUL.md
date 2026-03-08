# Distinction Potential: OOB Decoration Overhaul + Army HQ Seeding

**Date:** 2026-03-08
**Baseline:** OOB rework (2026-03-02) — 46 brigades pre-awarded `historical_decorations` at war start
**Result:** Decorations stripped at war start; replaced by `distinction_potential` threshold modifier + `initial_officer_quality` seeds. Army HQs seeded with command quality.

---

## Summary

- **Problem:** 46 brigades (36 ARBiH, 7 RS, 3 HRHB Guards) had `historical_decorations` pre-awarded at April 1992 war start. These were titles earned *during* the war (1992–1995) — awarding them at week 0 violated the doctrinal arc (ARBiH starts as rabble) and eliminated the organic tension of a unit having to *prove* itself.
- **Solution:** Strip all pre-awarded decorations. Replace with `distinction_potential` field — a threshold modifier that makes historically distinguished units ~30–35% more likely to earn their historical title during gameplay. Pair with modest `initial_officer_quality` seeds to give them a slight early-war edge.
- **Army HQs:** Three army-level HQ formations (`vrs_main_staff`, `hvo_main_staff`, `arbih_general_staff`) were bare at spawn — no officer quality, cohesion, or morale. Seeded to reflect historical general staff competence.

---

## Changes Made

### 1. OOB Data: `data/source/oob_brigades.json`

- Stripped `historical_decorations` and `honor` from **46 brigades** (these fields pre-awarded end-of-war titles at week 0)
- Added `distinction_potential: 'tier_1' | 'tier_2' | 'tier_3'` to each stripped brigade — historical evidence they have the character to earn this tier
- Added `initial_officer_quality` seeds:

| Faction | Tier | Seed | Baseline | Count |
|---------|------|------|----------|-------|
| RBiH | tier_1 (Slavna) | 0.10 | 0.05 | 14 |
| RBiH | tier_2 (Viteška) | 0.15 | 0.05 | 19 |
| RS | tier_1 | 0.60 | 0.55 | 4 |
| RS | tier_2 | 0.62 | 0.55 | 4 |
| RS | tier_3 (65th) | 0.85 (kept) | 0.55 | 1 |
| HRHB | tier_1 (Guards) | no seed | 0.225 | 4 (mid-war spawns) |

Note: HRHB Guards (`available_from: 80–88`) spawn mid-war into a more developed context — no early seed needed.

### 2. OOB Data: `data/source/oob_corps.json`

Army HQs seeded with command quality, organizational cohesion, and where appropriate initial morale:

| Unit | `initial_officer_quality` | `initial_cohesion` | `initial_morale` | Rationale |
|------|--------------------------|-------------------|-----------------|-----------|
| `vrs_main_staff` | 0.75 | 72 | — | JNA professional staff; Mladić commanding from day 0 |
| `hvo_main_staff` | 0.50 | 65 | — | Croatian Army cadre; competent but politically constrained |
| `arbih_general_staff` | 0.12 | 38 | 45 | Barely organized at spawn (available_from: 24); growing from near-nothing |

### 3. Engine: `src/sim/combat/decoration_evaluator.ts`

Added `getDistinctionMult(formation)` — reads `distinction_potential` from FormationState:

```
tier_2 / tier_3 potential → 0.65× threshold (35% easier)
tier_1 potential          → 0.70× threshold (30% easier)
no potential              → 1.0× (unchanged)
```

Thresholds after multiplier (rounded up):

| Criterion | Standard | With tier_1 | With tier_2 |
|-----------|----------|-------------|-------------|
| Victory streak (tier_1) | 5 | 4 | 4 |
| Win-rate battles (tier_1) | 8 @ 60% | 6 @ 60% | 6 @ 60% |
| Defense streak (tier_2) | 3 | 3 | 2 |

### 4. Schema: `src/state/game_state.ts`

Added `distinction_potential?: 'tier_1' | 'tier_2' | 'tier_3'` to `FormationState`.

### 5. Loader: `src/scenario/oob_loader.ts`

- Added `distinction_potential` to `OobBrigade` interface + parsing + spread
- Added `initial_officer_quality`, `initial_cohesion`, `initial_morale` to `OobCorps` interface + parsing + spread

### 6. Spawn: `src/scenario/oob_early_war_entry.ts`

- Brigade spawn: applies `distinction_potential` to FormationState when set
- Corps/army HQ spawn: applies `officer_quality`, `cohesion`, `morale` from OobCorps when set

---

## Design Rationale

**Why not keep pre-awarded decorations?**
ARBiH's doctrinal arc is *starts as rabble, ends professional*. Pre-awarding 36 ARBiH brigades with Viteška/Slavna titles at April 1992 collapses that arc from the first turn. These are titles earned through 3+ years of combat — they should be earned again in-simulation.

**Why `distinction_potential` and not just lower thresholds globally?**
We want historically distinguished units to be *likely* to earn their title, but not *guaranteed*. A unit that gets wiped in week 4 hasn't earned Viteška regardless of its potential. The threshold reduction (30–35%) keeps the criteria meaningful while giving historically proven units a statistical advantage — the same way good initial officer quality makes early victories more probable.

**Why do the seeds not accelerate growth?**
ARBiH's learning rate is already 1.5× (the highest of all factions). The seed shifts the starting position, but the diminishing-returns factor `(1.0 - quality × 0.5)` means a seeded unit at 0.15 grows *slightly slower* per turn than one at 0.05. Both converge to the same ceiling through sustained combat. The seed only matters in weeks 1–15.

**Why no HRHB Guards seed?**
HVO Guards brigades (1st–4th) have `available_from: 80–88`. They spawn into a war that is already 18+ months old, with larger HVO formations and more organized command. Their spawn-time quality is already calibrated for that mid-war context. An early-war officer seed is irrelevant.

---

## Backward Compatibility

- The `honor` field fallback in `getDecorationAtkMult()` / `getDecorationDefBonus()` is **preserved** for existing save files that may have the field on FormationState.
- The `historical_decorations` loader code in `oob_loader.ts` and `oob_early_war_entry.ts` is **preserved** — no existing brigades will trigger it, but old saves with the field will not break.
- The `decoration_evaluator.ts` pipeline step is **unchanged** in its position and invocation.

---

## Files Changed

| File | Change |
|------|--------|
| `data/source/oob_brigades.json` | Stripped `historical_decorations` + `honor` from 46 brigades; added `distinction_potential` + `initial_officer_quality` seeds |
| `data/source/oob_corps.json` | Added `initial_officer_quality`, `initial_cohesion`, `initial_morale` to 3 army HQs |
| `src/state/game_state.ts` | Added `distinction_potential?: 'tier_1' | 'tier_2' | 'tier_3'` to FormationState |
| `src/scenario/oob_loader.ts` | Added `distinction_potential` to OobBrigade; added quality/cohesion/morale to OobCorps |
| `src/scenario/oob_early_war_entry.ts` | Brigade spawn applies `distinction_potential`; HQ spawn applies quality/cohesion/morale |
| `src/sim/combat/decoration_evaluator.ts` | Added `getDistinctionMult()`; wired into `qualifiesTier1`/`qualifiesTier2` |

---

## Verification

- `npx tsc --noEmit` — clean
- `npm run test:vitest` — 378 passed, 1 skipped (37 suites)

---

## Next Steps

1. Run 40w calibration to verify ARBiH distinguished brigades earn decorations at plausible rates (target: top-20 most active ARBiH brigades earn tier_1 by w30–40, a handful reach tier_2)
2. Consider `distinction_potential` display in GUI — Settlement/Formation detail panel: show potential tier as a "unit character" badge before it's earned
3. Consider seeding RS corps-level formations (not just army HQ) with modest initial officer quality variance to reflect historical corps commander competence differences
