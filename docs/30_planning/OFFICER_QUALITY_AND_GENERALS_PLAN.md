# Brigade Officer Quality System

**Created:** 2026-03-02
**Status:** Planning
**Dependencies:** Calibration overhaul (Phase C item)
**Related:** CALIBRATION_MASTER.md § Faction Doctrinal Arcs

---

## Motivation

The Bosnian War's military arc is defined by an inversion:
- **VRS** starts as a professional, well-equipped army (JNA inheritance) and degrades over 3.5 years — attrition destroys the irreplaceable officer corps.
- **ARBiH** starts as rabble (no officers, no weapons, many unarmed) and ends as a professional army capable of corps-level operations.
- **HVO** starts as capable militia with Croatian state backing and becomes overstretched by two-front war.

Current AWWV mechanics (morale, experience, cohesion) don't model this arc — experience only grows, never degrades, and there's no distinction between "well-led" and "poorly-led" units. This plan introduces a brigade-level officer quality stat to produce the arc organically.

---

## Design

### Field

```typescript
// On FormationState
officer_quality: number;  // [0.0 – 1.0]
```

### Initial Values

| Faction | Default | Rationale |
|---------|---------|-----------|
| VRS (RS) | 0.70–0.80 | JNA-trained officers inherited at all levels |
| ARBiH (RBiH) | 0.15–0.25 | Almost no trained officers; TO remnants at best |
| HVO (HRHB) | 0.40–0.50 | Croatian military cadres, some HV officers embedded |

Per-brigade OOB overrides allowed (e.g., Guards Brigade higher, enclave militia lower).

### Growth

| Source | Rate | Notes |
|--------|------|-------|
| Combat (battle resolved) | +0.01/battle | Learning by doing; capped at 0.9 |
| Frontline time (no battle) | +0.005/turn | Passive professionalization from holding a line |
| Faction learning rate | RBiH ×1.5, RS ×0.7, HRHB ×1.0 | ARBiH learns faster (necessity); VRS already near ceiling |

### Loss

Officers die disproportionately — they lead from the front, especially in poorly-organized armies.

```
On battle casualty:
  officer_loss = (casualties / personnel) × OFFICER_CASUALTY_MULT
  officer_quality -= officer_loss
```

- `OFFICER_CASUALTY_MULT = 1.5` — officers 50% more likely to become casualties than enlisted
- **VRS problem**: High officer quality but no replacement pipeline (no military academies in wartime RS). Growth rate ×0.7 means losses accumulate.
- **ARBiH advantage**: Low starting quality but high growth rate ×1.5. Battlefield promotion fills gaps.

### Combat Effect

```
officer_modifier = 1.0 + (officer_quality - 0.3) × 0.5
```

| officer_quality | Modifier | Interpretation |
|----------------|----------|----------------|
| 0.15 (ARBiH start) | 0.925× | -7.5% combat power |
| 0.30 (baseline) | 1.00× | Neutral |
| 0.50 (ARBiH mid-war) | 1.10× | +10% |
| 0.70 (VRS start) | 1.20× | +20% |
| 0.80 (VRS peak) | 1.25× | +25% |

Applied as multiplier to both attack and defense power in `computeAttackerPower()` / `computeDefenderPower()`.

### War Weariness Connection

```
if (officer_quality < 0.3) → eligible for insubordination check
  insubordination_chance = (0.3 - officer_quality) × WAR_WEARINESS_MULT
```

Low officer quality + high war weariness → orders partially fail. Player notified.

---

## Integration Points

### Combat Math (`combat_math.ts`)
```
// In computeAttackerPower / computeDefenderPower:
const officerMod = 1.0 + (formation.officer_quality - 0.3) * 0.5;
power *= officerMod;
```

### War Weariness / Insubordination
```
// Low officer quality + high war weariness → order partially fails
if (formation.officer_quality < 0.3 && faction_war_weariness > 50) {
    const insubordination_chance = (0.3 - formation.officer_quality) * (faction_war_weariness / 100);
    if (deterministic_check(insubordination_chance)) {
        // Order executes at reduced effectiveness or not at all
        // Player notification: "[Brigade] failed to execute attack order (low officer quality, war weariness)"
    }
}
```

### Notification System
- **Order failure**: "[Brigade name] failed to fully execute orders — low command quality and war weariness"
- **Officer quality milestone**: "[Brigade name] officer corps has reached professional standard" (quality crosses 0.5)

---

## Implementation

1. Add `officer_quality` to FormationState
2. Set faction defaults in OOB loader (per-brigade overrides via OOB data)
3. Wire into combat math (attack/defense modifier)
4. Growth from combat + frontline time
5. Loss from casualties (OFFICER_CASUALTY_MULT = 1.5)
6. Wire into war weariness / insubordination checks (P7)
7. **No UI changes needed initially** — just affects combat numbers

---

## Design Principles

1. **Organic emergence**: The VRS→degraded / ARBiH→professional arc must emerge from mechanics, not scripts.
2. **Modest modifiers**: Max officer quality swing is ~30% (0.15 → 0.80). Meaningful but doesn't dominate — terrain, supply, numbers still matter more.
3. **Determinism**: Growth/loss rates are deterministic. No randomness.
4. **Information for the player**: Officer quality shown on brigade info panel. Order failures explained in notifications.
