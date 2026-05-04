# Equipment Quality Modifier — Substrate Audit

**Date:** 2026-05-04
**Author:** /game-designer + /technical-architect (read-only research)
**Status:** Recommendation; no code changes
**Trigger:** Mission D of trip session 3 deferred event `csq_weapons_embargo_partial_lift` (event #11) under the spec STOP rule "do not invent new effect kinds without substrate audit."

## 1. Where equipment currently lives

Equipment is **per-formation, per-equipment-type, integer-counted, with a parallel condition tensor** — not a quality score.

- Owner: `FormationState.composition: BrigadeComposition` (`src/state/game_state.ts`).
  Fields: `infantry`, `tanks`, `artillery`, `aa_systems`, plus `tank_condition` and `artillery_condition` each as `{ operational, degraded, non_operational }` fractions summing to 1.
- Two cross-cutting per-formation scalars also exist: `equipment_decay?: number` ([0,1] floor 0.6, applied multiplicatively in `getEquipmentRatio`) and `equipment_class?: 'mechanized'|'motorized'|...`.
- **No faction-level equipment quality field exists.** The closest faction-level lever is `state.military.heavy_munitions_reserve[faction]` driving `getHeavyMunitionsMult` (a discrete adequate/strained/critical cliff).
- Stored, not computed on demand. Mutated each turn by `degradeEquipment` (`src/sim/combat/equipment_effects.ts`) and on capture by `captureEquipment`.

## 2. Current consumers of equipment data

All consumers read `formation.composition.{tanks, artillery, *_condition}` directly:

- **Combat predictor / resolver:** `getHeavyWeaponsOffensiveMult`, `getDefensiveFireMult`, `getBombardmentCasualtyMult`, `getArtillerySuppression`, `getEquipmentRatio` → `basePower` → `computeAttackerPower` / `computeDefenderPower` (`combat_math.ts`).
- **Bot AI / readiness:** `corps_operation_readiness.ts`, `operation_preparation.ts`, `sector_offensive_launch_helpers.ts` use composition for force-ratio estimates.
- **Verdict / cost ledger:** templates in `src/sim/endgame/cost_ledger_templates/` reference equipment narratively; `cost_ledger_annotation` already wires in.
- **UI:** `ArmyHQCorpsCard.tsx` and `GameStateAdapter.ts` surface composition.

## 3. Effect-kind shape options

- **(A) Per-faction multiplicative on power:** `{ faction; multiplier; turns }` applied as a faction-wide mult inside `computeAttackerPower` / `computeDefenderPower`. Smallest substrate touch; only one site to thread.
- **(B) Additive to a quality score:** No 0–100 quality score exists. Inventing one would create a parallel dead substrate next to `composition` + `equipment_decay`. **Reject.**
- **(C) Per-equipment-type multiplier:** Plausible (mirrors `equipment_grant`'s tanks/artillery split), but no current consumer takes a per-type quality input — every combat reader collapses to firepower scalars. Higher cost, no gameplay payoff for one event.
- **(D) Modifier-stack pattern:** `recruitment_modifier` precedent (`active_modifiers.ts` + `apply_effects.ts` writer + `cleanupExpiredEventModifiers` GC). Stack multiplicatively, query via `getActiveEquipmentQualityMultiplier(state, faction, currentTurn)`.

**(A) and (D) compose — they are the same recommendation.**

## 4. Substrate audit — risks

- **Combat predictor change → calibration hash drift.** Even at multiplier 1.0 with no events firing, threading a new mult through `computeAttackerPower` / `computeDefenderPower` is byte-fragile. **Mitigation:** consumer reads `getActiveEquipmentQualityMultiplier`; helper returns `1.0` when array empty/undefined; multiplier line gated `if (mult !== 1.0)` to preserve byte-stable arithmetic on the historical path. Same pattern that kept `recruitment_modifier` hash-neutral in 40w.
- **Cross-system bot AI drift.** Bot readiness consumes the same combat math. Durable +5% applied to RBiH attacker power for 30 turns will shift commander op-launch decisions. Acceptable when intended, must be smoke-tested.
- **Hash drift in event evaluator switch.** Adding a `kind` discriminant changes `EFFECT_KIND_ORDER` insertion. **Mitigation:** insert alphabetically in the order table; existing kinds keep their indices except for those alphabetically after `equipment_quality_modifier`. This DOES shift application order vs prior hashes; in practice 40w is hash-neutral when no instances fire (sort is stable).
- **Determinism of expiry.** Mirror `cleanupExpiredEventModifiers` — GC at turn start; readers filter `expires_turn > currentTurn`.

## 5. Recommended shape

```ts
interface EventEffectEquipmentQualityModifier {
  kind: 'equipment_quality_modifier';
  faction: FactionId;
  multiplier: number;       // 1.05 for "+5%"; ≥ 0
  duration_turns: number;
}
```

Faction-scoped, multiplicative, time-bounded. Mirrors `recruitment_modifier` exactly. Faction-agnostic (any of RBiH/RS/HRHB), deterministic (sort + GC inherited), minimal substrate touch (one combat-math thread, one writer, one reader, one GC line).

The "+5 equipment quality" in the event spec is interpreted as **+5% multiplicative power**, not "+5 to a score." This is the only honest mapping given that no quality score exists; the embargo lift historically improved supply throughput and weapon access, not magic vehicle quality, so a small power mult on the receiving faction is the right abstraction.

## 6. Implementation sketch

1. `event_types.ts` — add union member; add to `EventEffect`.
2. `apply_effects.ts` — add to `EFFECT_KIND_ORDER` (alphabetic slot); add writer pushing onto `state.military.equipment_quality_modifiers` with `expires_turn = currentTurn + duration_turns`.
3. `state/game_state.ts` `MilitaryState` — add `equipment_quality_modifiers?: { faction; multiplier; expires_turn }[]`.
4. `events/active_modifiers.ts` — add `getActiveEquipmentQualityMultiplier(state, faction, currentTurn)` (product of active entries, default 1.0); extend `cleanupExpiredEventModifiers` GC.
5. `combat_math.ts` — single thread point in `computeAttackerPower` and `computeDefenderPower`: `const eqMult = getActiveEquipmentQualityMultiplier(state, formation.faction, turn); ... * eqMult`. Gate `if (eqMult !== 1.0)` to preserve historical byte stability.
6. Tests: writer contract; reader product/expiry; cleanup; combat-math no-op when empty.
7. Smoke gate: `npm run test:vitest`, `npx tsc --noEmit`, **40w + 188w scenario hash compare** (must be byte-stable when no `csq_*` events authored).

## 7. Verdict for Mission D event #11

**Recommend Option A** — substrate-first lane, then re-enable event #11.

Rationale: substrate work touches the combat predictor, which is the highest-risk hash-drift surface in the engine. Bundling event-content authoring (which can quietly shift fire turns or condition evaluation) into the same lane gives one smoke window covering two unrelated risks. Splitting yields a clean substrate hash-stability proof, then a content-only follow-up whose only behavior change is "this event now fires and applies a mult." If the substrate lane shows even 0.01% hash drift, the cause is unambiguous.

- **Lane 1 (this work):** `LANE-NIGHTSHIFT-EQUIPMENT-QUALITY-MODIFIER-SUBSTRATE` — types, writer, reader, GC, combat thread, tests, hash-stability smoke.
- **Lane 2 (follow-up):** re-enable `csq_weapons_embargo_partial_lift` in `consequences.json`, point its consequence at the new effect kind, smoke-test 188w only (40w window pre-dates the trigger turn≥60).

Reject **Option B** (bundled) on smoke-isolation grounds; reject **Option C** (drop) because the substrate is reusable for future arms-flow events (Croatia weapons pipeline, Iran flights, post-Dayton transition) and the Pyrrhic precedent is to invest in faction-agnostic primitives.
