# Canon-Compliance Frame — Per-Faction Force-Trajectory Model

**Date:** 2026-05-22
**Author:** canon-compliance-reviewer (read-only)
**Scope:** Map the proposed per-faction force-trajectory model (VRS "competent army → competent rubble", ARBiH "rabble → professional", driving emergent late-war Krajina collapse) against `docs/10_canon/Engine_Invariants_v0_9_0.md`. Identify what is already canon-safe, what requires only schema/wiring additions inside existing invariants, and what would VIOLATE canon and must be refused.
**Mandate:** No canon edits. No source/scenario/anchor edits. `src/sim/combat/*` is being edited by Codex in parallel — strictly read-only.
**Sibling memos (do not duplicate):**
- `docs/40_reports/audits/20260522_FORCE_TRAJECTORY_ENGINE_INVENTORY.md` — engine-side state inventory (gameplay-programmer)
- `docs/40_reports/audits/20260522_OPS_FORCE_TRAJECTORY_GATING.md` — ops-side predicate inventory (operations-expert)
- `docs/40_reports/audits/20260522_PAINTED_COMPARE_FRESH_DELTA_ANALYSIS.md` — territorial gap to allocate

This memo addresses the canon-compliance contract those memos must satisfy.

---

## Headline verdict

**A per-faction force-trajectory model that DRIVES emergent late-war Krajina collapse is canon-compliant under current Engine Invariants v0.9.0 — provided every behavioral coupling routes through §9.6 authorized control-change mechanisms and obeys the §6.2 brigade no-destruction invariant.**

No canon amendment is required for the substrate. Two existing canon-safe substrates already implement the exact shape needed:

1. **Per-formation `equipment_decay` (substrate)** — `FormationState.equipment_decay` is a per-brigade `[0,1]` multiplier mutated deterministically each war turn by the `apply-vrs-equipment-decay` pipeline step (`src/sim/turn_phases/war_phases.ts:2213`) from `war_timeline.equipment_decay` data. Consumed by `combat_math.ts:887`. This is the canonical template for monotonic-or-floored per-faction quality degradation.
2. **Per-faction `equipment_quality_modifiers[]` (substrate)** — `MilitaryState.equipment_quality_modifiers` is a multiplicative time-bounded modifier list, queried via `getActiveEquipmentQualityMultiplier()` (`src/sim/events/active_modifiers.ts:43`) and consumed by `computeAttackerPower` / `computeDefenderPower`. This is the canonical template for per-faction event-driven trajectory deltas.

What is GATED behind canon decisions: any proposal that introduces (a) per-faction force-quality scalar used to BUFF the OPPOSING attacker directly (passive-pressure flip risk under §9.6), or (b) faction-scoped automatic dissolution that bypasses §6.2's 2-of-3 / §6.2.4 morale-streak gates, or (c) reduction of an existing monotonic field (§8 violation).

**Canon-safe vs canon-violating count:**
- 3 canon-safe patterns identified.
- 4 canon-violating patterns identified (refusal recommended).
- 2 patterns gated — canon-silent, require explicit design sign-off before implementation.

**Top 3 schema additions that fit existing canon** (detail in §7 below):
1. `MilitaryState.faction_force_quality?: Record<FactionId, FactionForceQualityState>` — *derived* per-faction rollup that **caches** a per-turn aggregate of existing per-formation fields (`cohesion`, `morale`, `officer_quality`, `equipment_decay`). Pure derived state per §13.1 (not serialized) OR serialized as audit log (per §11.4 reproducibility), but never as authoritative source.
2. `MilitaryState.faction_personnel_quality?: Record<FactionId, number>` — separate monotonic-decreasing (VRS) or monotonic-bounded (ARBiH/HRHB) trajectory state derived from `casualty_ledger` totals + reinforcement income; same shape as `war_exhaustion`.
3. `MilitaryState.equipment_mechanical_decay?: Record<FactionId, EquipmentMechanicalDecayState>` — per-faction equipment-quality degradation tracker (separate from §14.6 combat-loss conservation), modeled on `equipment_quality_modifiers[]` but with deterministic time-driven schedule instead of event-driven entry.

---

## §1 — §6.2 Brigade No-Destruction: how does "competent rubble" express?

### Canon read

Engine Invariants v0.9.0 §6.2 forbids brigade destruction in combat. The ONLY removal mechanisms are:
- **2-of-3 dissolution** (`personnel < 400 ∧ cohesion ≤ 20 ∧ morale ≤ 15`, any two), enclave brigades 3-of-3.
- **§6.2.4 morale-collapse override** (`morale_low_streak ≥ 8` turns at morale ≤ 15, hysteresis reset at morale > 20). Currently gated behind env flag `MORALE_OVERRIDE_ENABLED` (default false; counter increments diagnostically with flag off).

Absolute personnel floors (150, enclave 50) are "count as low personnel" only; they do NOT bypass the criteria check.

### "Competent rubble" expresses canon-correctly via degradation, NOT dissolution

The phrase "VRS degrading to competent rubble" is a STRENGTH-AXIS statement, not a HEADCOUNT statement. Under §6.2, late-war VRS brigades continue to EXIST — they just fight worse. The canon-safe expression channels are:

| Axis | Existing field | Update mechanism | Canon clause |
|---|---|---|---|
| Equipment quality | `FormationState.equipment_decay ∈ [0.6, 1.0]` | `apply-vrs-equipment-decay` step (timeline-data-driven, monotonic-down, floored) | §14.6 equipment conservation (degradation is a "defined degradation write-off") |
| Cohesion | `FormationState.cohesion ∈ [0, 100]` | Combat outcome + morale drift | §14.3 cohesion bounds (non-monotonic) |
| Morale | `FormationState.morale ∈ [0, 100]` | Affinity drift + battle outcome + siege drain | §14.3a (non-monotonic) |
| Officer quality | `FormationState.officer_quality ∈ [0.05, 0.90]` | Combat experience grows it; casualties decay it | §15.1 (officer succession), Systems Manual §7.5 |
| Fatigue | `FormationOpsState.fatigue` | Frontline drain + recovery (`src/state/formation_fatigue.ts`) | §8 exhaustion compounding |

Per the n1741 188w evidence (`docs/40_reports/audits/20260510_FORCE_QUALITY_TRAJECTORY_REASSESSMENT.md`), VRS cohesion already degrades canon-correctly (55.49 → 27.27, late mean). Morale degrades (60.99 → 12.62). Officer quality degrades (0.5366 → 0.4619). What is MISSING is not the per-formation degradation arc — it is the **operational coupling**: degraded VRS formations are not losing OSIDs at the historical Krajina-collapse rate because §9.6 authorized control-change mechanisms (attack resolution, corps ops) are not FIRING enough late-war ATTACKS against them.

### Verdict

**Competent rubble must express through existing per-formation degradation channels** (cohesion, morale, officer quality, equipment_decay, fatigue). Dissolution must remain gated by §6.2 2-of-3 + §6.2.4 — no faction-bulk dissolution rule.

A per-faction trajectory model READS these per-formation fields (as derived aggregate); it must NEVER WRITE faction-level state that bypasses the per-formation §6.2 contract.

---

## §2 — §8 Exhaustion monotonic: is `war_exhaustion` the right trajectory signal?

### Canon read

Engine Invariants v0.9.0 §8:
- Exhaustion values are **monotonic and irreversible**.
- Exhaustion must increase under brittle/cut corridors, static fronts, coercive control, sustained supply strain.
- Exhaustion compounds across military / political / societal dimensions.
- "Control Strain is reversible; Exhaustion is irreversible and must never be reduced by any system."

### Field state

`PoliticalState.war_exhaustion?: Record<FactionId, number>` exists (`game_state.ts:2322`). It is described as faction-level monotonic per §8.

### Issue #47 reality

Per `docs/40_reports/REAL_WAR_MASTER.md:154`: "Exhaustion = 0 (Issue #47 carried from n1240): Still not resolved. Core negative-sum mechanic still dead."

Per `docs/plans/2026-04-14-four-design-decisions.md:13`: there are TWO dead wires — (a) `war_exhaustion` reads zero; (b) `situation_score` in `political_personality.ts` clamps the value to 0-100 but actual values are 270-400 at w40 (so it always reads as 100 after ~w5, contributing zero differential).

So the field exists and is canon-correct in SHAPE, but the value pipeline is broken upstream and the consumer clamp masks downstream variation.

### Verdict

`war_exhaustion` is the **right canonical signal in shape** — faction-keyed, monotonic, irreversible, per §8. It must NOT be replaced by a parallel field. Repair work is upstream-mechanic and downstream-consumer wiring, not a canon decision.

A force-trajectory model MAY introduce additional faction-level state IF AND ONLY IF that state is semantically distinct from exhaustion. Examples that are canon-distinct:

- **Personnel-quality trajectory** (cumulative casualty fraction → veterancy mix): can rise AND fall depending on reconstitution rate. Not exhaustion.
- **Equipment-quality trajectory** (mechanical decay, ammo scarcity): can be improved by patron resupply. Not exhaustion.
- **Officer-quality trajectory** (decision-pool degradation): currently per-formation; aggregating it per-faction is derived, not new.

A force-trajectory model MUST NOT introduce:

- A second monotonic faction-level field that DUPLICATES `war_exhaustion` semantics under a different name.
- A "force_quality" field that READS or WRITES `war_exhaustion` in either direction — exhaustion is irreversible (§8) and must not be a source for a non-monotonic derived metric without explicit gating against the monotonic invariant.

---

## §3 — §14.3 / §14.3a / §14.6: per-faction rollup vs per-formation truth

### Canon read

| Field | Canon location | Per-formation? | Bounds | Monotonic? |
|---|---|---|---|---|
| `cohesion` | §14.3 | YES (`FormationState.cohesion`) | [0, 100] | No |
| `morale` | §14.3a | YES (`FormationState.morale`) | [0, 100] | No |
| `officer_quality` | Systems Manual §7.5 + `FormationState.officer_quality` | YES (per-brigade [0.05, 0.90]) | Bounded | No (grows + decays) |
| `equipment_decay` | (substrate; canon: §14.6 conservation) | YES (`FormationState.equipment_decay`) | [floor, 1.0] | Yes (monotonic-down to floor) per current implementation |
| `equipment_quality_modifiers[]` | §14.6 (event-driven creation rules) | NO (per-faction time-bounded multiplicative list) | Real-valued multiplier | No (entries expire) |

### Verdict

**Per-FORMATION truth is canonical for cohesion, morale, officer_quality, equipment_decay.** §14.3 explicitly binds the cohesion bound to `FormationState`. §14.3a explicitly binds morale to `FormationState`. The brigade-level granularity is the unit of doctrine.

**A per-FACTION rollup is canon-safe ONLY as DERIVED state.** Per Engine Invariants §13.1 / §13.2:
- Derived states (corridors, fronts, municipality status) must NOT be serialized.
- Derived states must be RECOMPUTED each turn.
- §13.3 explicitly names brigade pressure/density/resilience as recomputed-each-turn derived.

So a `FactionForceQualityState` rollup is canon-safe if:
1. It is recomputed each turn from authoritative per-formation fields.
2. It is NOT the source-of-truth for any per-formation mutation.
3. It is either non-serialized (§13.1) or serialized as audit/replay log only (§11.4) — never as the authoritative input on save/load.

**Per-FACTION FRESH state (not a rollup) is canon-safe IF** it has semantically distinct origin (e.g., faction-level patron arms-flow aggregate, embargo-state-summary, command-capacity scalar) and obeys its own determinism contract. `embargo_profile`, `patron_state`, `maintenance_capacity`, `capability_profile`, `casualty_ledger[fid]`, `war_exhaustion[fid]` are the existing per-faction shape templates.

---

## §4 — §14.6 Equipment conservation: does canon support degradation over time?

### Canon read

§14.6: "Capture transfers equipment from loser to winner. Equipment may be created by defined external sources (arms smuggling, local production, HV transfers) and **destroyed by degradation write-off and battle losses**. Total equipment tracks all sources and sinks — no unaccounted creation or destruction."

### Verdict

**Yes — canon explicitly authorizes `degradation write-off` as a sink path distinct from battle losses.** The existing `apply-vrs-equipment-decay` step (`src/sim/turn_phases/war_phases.ts:2213`) implements this canon-correctly:

- Time-driven schedule (timeline-data with `start_week`, `rate_per_week`, `floor` per faction).
- Per-formation `equipment_decay` mutation, deterministic, monotonic-down, floored.
- Combat consumer at `combat_math.ts:887` multiplies effective equipment ratio by `equipment_decay`.

This is the canonical template for ALL future quality-degradation work. Any new degradation axis (mechanical-breakdown-without-combat-loss, ammunition-scarcity, comms-quality) should mirror this pattern:

```
(canon-safe pattern shape)
  - Per-faction timeline-data schedule (start_week, rate_per_week, floor).
  - Pipeline step gated on phase==war + turn>=start_week.
  - Per-formation field mutated each turn (monotonic toward floor).
  - Field consumed multiplicatively in combat_math or operation_readiness.
  - Default-off byte-stability invariant: if the data row is absent, no mutation occurs (existing implementation uses `find()` and skips on undefined).
```

A faction-LEVEL equipment-decay scalar that summarizes the per-formation tracker is **derived state** (§13.1) and must be recomputed.

A faction-LEVEL equipment-decay that **replaces** the per-formation tracker would VIOLATE §14.6 conservation because it loses the per-brigade granularity that conservation accounting requires (each brigade's equipment is the unit of accounting in `casualty_ledger.equipment_lost`).

---

## §5 — Determinism contract: existing patterns as templates

### Canon read

§11.1: No `Math.random()`, no seeded PRNGs, no non-deterministic iteration. §11.2: No `Date.now()`. §11.3: Stable ordering via `strictCompare`. §11.4: All state serializable; save/load must reconstruct world; identical inputs → identical outputs.

### Existing canon-safe templates

| Pattern | Implementation | Determinism property |
|---|---|---|
| `apply-vrs-equipment-decay` | Per-formation monotonic decay from data-driven rate | Pure arithmetic; ordering via `Object.values(formations)` sort by formation id is needed (verify in consumer) |
| `equipment_quality_modifiers[]` reader | Multiplicative product over filtered list | Deterministic if list iteration is sorted; product order is commutative for multiplication |
| `casualty_ledger` | Cumulative integer counters | Pure accumulation; deterministic |
| `morale_low_streak` counter | `++` when morale ≤ 15, `=0` when morale > 20 (hysteresis) | Pure state-machine; deterministic |
| `equipment_decay` mutation | `Math.max(floor, current - rate)` | Pure arithmetic; deterministic |
| `cohesion_regen` (per-formation pipeline step) | Per-formation increment, gated on engagement | Deterministic if formation iteration sorted |

### Verdict

**All existing trajectory-substrate patterns are canon-safe determinism templates.** Sampled rates are banned (§11.1); time-driven monotonic schedules and accumulator counters are the canonical alternatives.

For a faction-trajectory model:
- **Per-faction monotonic-bounded scalar derived from `casualty_ledger` totals**: canon-safe (pure arithmetic over a deterministic accumulator).
- **Per-faction non-monotonic scalar derived from per-formation averages**: canon-safe IF formation iteration is sorted (§11.3).
- **Time-bounded modifier with `expires_turn`**: canon-safe (mirrors `equipment_quality_modifiers[]`).
- **Random-sampled trajectory rate**: BANNED (§11.1).
- **Patron-arms-flow rate that reads wall-clock or `Math.random`**: BANNED.

---

## §6 — §9.6 No passive-pressure flip: does trajectory collapse support all four authorized mechanisms?

### Canon read

§9.6: Political control may change **only** via:
1. **Attack resolution** (war phase): an attack order is resolved → push-back and control flip at the target OSID.
2. **Corps or frontline operations** as defined in War Specification / Systems Manual.
3. **Internal authority collapse** or fragmentation.
4. **Negotiated transfer** through end-state or interim agreements.

"**No passive pressure flip:** Control does not change from 'sustained opposing military pressure' alone; it changes only when an attack (or corps/frontline op) is resolved."

### Verdict — all four mechanisms support trajectory-driven emergence canon-safely

| §9.6 mechanism | Trajectory coupling | Canon-safe pattern |
|---|---|---|
| **(1) Attack resolution** | Defender's force-trajectory → defender power computation (cohesion/morale/equipment_decay/officer_quality already wired through `computeDefenderPower`). Attacker's force-trajectory → attacker power. Outcome emerges from existing predictor. | SAFE — existing wiring. Trajectory state modulates inputs to power calc; outcome emerges. |
| **(2) Corps/frontline operations** | Operation EXISTENCE is gated by the 9-axis predicate vocabulary (see ops gating memo). Force-quality is already a predicate axis (`force_quality`). Trajectory state modulates which ops become eligible to LAUNCH. Outcome of launched ops then routes through (1). | SAFE — operation eligibility is canon-safe gate. Trajectory state determines WHICH ops fire, not whether control flips. |
| **(3) Authority collapse / fragmentation** | §7: Fragmentation requires concurrent authority collapse and connectivity disruption + persistence over multiple turns. A degraded VRS trajectory may contribute to authority collapse THROUGH §3 (authority cannot be Consolidated if supply is Critical) — but the trajectory does not DIRECTLY trigger fragmentation. | SAFE — trajectory is an upstream signal; §7 persistence gate must still apply. |
| **(4) Negotiated transfer** | End-state or interim agreements (Dayton, ceasefire). Trajectory state may drive faction's negotiation pressure / acceptance threshold, but transfer itself is event-driven. | SAFE — trajectory modulates negotiation propensity; transfer fires through existing event/treaty path. |

**Critical canon discriminator:** A trajectory-driven model is canon-safe if it modulates **the INPUTS** to the four mechanisms (defender power, op eligibility, authority/supply degradation, negotiation propensity). It is canon-VIOLATING if it modulates **the OUTCOME** directly (i.e., reads trajectory and writes `political_controllers` without an attack/op/collapse/treaty event).

The "passive pressure flip" prohibition specifically forbids:
- "If VRS force_quality < 0.3 for 8 turns, flip op:banja_luka:* to RBiH" — VIOLATION.
- "When attacker force_quality > defender force_quality by 0.4, auto-flip OSID" — VIOLATION.

The "passive pressure flip" prohibition specifically PERMITS:
- "When VRS force_quality < 0.3, defender power multiplier × 0.7 in `computeDefenderPower`" — SAFE (modulates §9.6 mechanism 1 input).
- "When ARBiH force_quality > 0.6, `force_quality` predicate axis evaluates `pass`, op eligible" — SAFE (modulates §9.6 mechanism 2 input).

---

## §7 — Schema additions: canon-safe new `state.military.*` fields

Existing per-faction state shape templates in `MilitaryState` and `PoliticalState`:

| Existing field | Shape | Canon clause | Use as template for |
|---|---|---|---|
| `casualty_ledger?: CasualtyLedger` | `Record<FactionId, FactionCasualtyLedger>` with cumulative integer counters | §11 determinism, §14.6 conservation | Cumulative-counter trajectories |
| `war_exhaustion?: Record<FactionId, number>` | Faction-keyed monotonic scalar | §8 | Monotonic faction-trajectory scalars |
| `equipment_quality_modifiers?: Array<{faction, multiplier, expires_turn}>` | Time-bounded multiplicative modifier list | §14.6 (event-driven creation rules), §11 (deterministic) | Event-driven non-monotonic trajectory deltas |
| `recruitment_modifiers?: Array<{faction, pool_multiplier, expires_turn}>` | Same shape as equipment_quality_modifiers | §11 | Event-driven recruitment trajectory |
| `event_aggression_modifiers?: Array<{faction, delta, expires_turn}>` | Same shape with additive delta | §11 | Event-driven additive trajectory |
| `faction_officer_maturity?: Record<string, number>` | Faction-keyed scalar (averaged per-formation) | §13 (derived) | Per-faction derived aggregate |
| `army_stance?: Record<FactionId, ArmyStance>` | Faction-keyed enum | §11 | Faction-keyed enum state |

### Top-3 canon-safe schema additions for trajectory

#### Addition 1: `MilitaryState.faction_force_quality?: Record<FactionId, FactionForceQualityState>`

**Status: DERIVED (recomputed each turn, §13.2).**

```ts
interface FactionForceQualityState {
    // Recomputed each turn; not authoritative on save/load.
    // All fields are aggregates of authoritative per-formation fields.
    avg_cohesion: number;       // mean over active formations of faction
    avg_morale: number;         // mean over active formations of faction
    avg_officer_quality: number; // mean over active formations of faction
    avg_equipment_decay: number; // mean over active formations of faction
    avg_fatigue: number;        // mean over FormationOpsState.fatigue
    composite_force_quality: number; // [0, 1] weighted scalar; consumer-facing
    last_updated_turn: number;
}
```

**Canon basis:**
- §13.1: Derived state (not serialized as authoritative). May be persisted to save for replay/audit per §11.4 reproducibility, but the per-formation fields remain authoritative.
- §13.2: Must be recomputed each turn.
- §11.3: Iteration over formations to compute averages must use `strictCompare` sorted keys.
- Template: `faction_officer_maturity` (already an averaged per-faction scalar; same shape).

**Consumer model:**
- READ by operation `force_quality` predicate axis (already in the 9-axis vocabulary).
- READ by combat predictor as defender-power-side adjustment when defender's average is degraded.
- READ by AI commander briefing for theater assessment.
- **NEVER WRITTEN to as the source of truth for cohesion/morale/officer_quality** — those remain per-formation per §14.3 / §14.3a.

#### Addition 2: `MilitaryState.faction_personnel_trajectory?: Record<FactionId, FactionPersonnelTrajectoryState>`

**Status: NEW (semantically distinct from `war_exhaustion`; monotonic-bounded).**

```ts
interface FactionPersonnelTrajectoryState {
    // Derived from casualty_ledger + reinforcement pool income.
    cumulative_kia: number;          // mirrors casualty_ledger[fid].killed (audit-redundant; fast path)
    cumulative_wia: number;          // mirrors casualty_ledger[fid].wounded
    veterancy_index: number;         // [0, 1] derived from per-formation avg experience
    replacement_rate_4w: number;     // recent reinforcement rate (rolling 4-turn average)
    quality_index: number;           // [0, 1] composite: veterancy weighted by replacement_rate
    last_updated_turn: number;
}
```

**Canon basis:**
- §11: Pure arithmetic over deterministic accumulators (`casualty_ledger`, reinforcement income).
- §13: Recomputed each turn.
- §8 distinction: `quality_index` is NOT exhaustion — it is rate-bounded (replacement floods can DECREASE veterancy as fresh recruits arrive; experience can INCREASE veterancy as battles are survived). §8 monotonic invariant is preserved by `cumulative_kia` and `cumulative_wia`, which are themselves monotonic by construction.
- Template: `casualty_ledger` shape (per-faction cumulative integers).

**Consumer model:**
- READ by force_quality predicate axis for `enemy_weakness` and `corps_readiness` evaluation.
- READ by operation predictor for "ARBiH improvement curve" credentials.
- **Models the canon-direct ARBiH trajectory:** as 5th Corps survives battles, veterancy rises; as VRS loses irreplaceable veterans (officer-quality and cohesion already model this per-formation; this faction rollup makes it visible to the AI commander and operation predicates).

#### Addition 3: `MilitaryState.equipment_mechanical_decay_schedule?: Record<FactionId, EquipmentMechanicalDecayState>` (extension of existing `equipment_decay` substrate)

**Status: EXTENSION (broadens existing VRS-only `apply-vrs-equipment-decay` to all factions, data-driven).**

```ts
interface EquipmentMechanicalDecayState {
    // Mirrors existing war_timeline.equipment_decay row but persisted at the
    // MilitaryState level so all three factions can have schedules.
    start_week: number;
    rate_per_week: number;
    floor: number;
    last_applied_turn: number;
}
```

**Canon basis:**
- §14.6: "Equipment may be created by defined external sources [...] and **destroyed by degradation write-off** and battle losses." Mechanical decay IS the canon-authorized degradation-write-off path.
- §11.1: Time-driven schedule (no sampling).
- Template: existing `war_timeline.equipment_decay` consumer in `apply-vrs-equipment-decay`.

**Consumer model:**
- WRITTEN to per-formation `equipment_decay` via pipeline step (existing pattern).
- READ by combat_math (existing).
- **Models VRS late-war mechanical breakdown WITHOUT combat loss** — tanks/artillery that simply stop working. ICTY Galić, BB2 manning crisis documentation supports this for VRS 1994-1995. Mirror schedule may apply with reversed sign for ARBiH if patron arms-flow events fire (handled instead via existing `equipment_quality_modifiers[]`).

### Schema additions to AVOID (canon-violating or canon-silent)

- `MilitaryState.faction_force_quality_authoritative` (parallel-truth to per-formation cohesion/morale) — VIOLATES §13.1 (cannot be authoritative AND derived).
- `MilitaryState.force_quality_floor[fid]` interpreted as a minimum that prevents formations from degrading below it — VIOLATES §14.3 cohesion bounds (would clamp per-formation degradation).
- `MilitaryState.force_collapse_threshold[fid]` interpreted as a faction-level dissolution trigger — VIOLATES §6.2 (dissolution is per-formation only, gated by 2-of-3 + §6.2.4 streak).

---

## §8 — Anti-patterns: refusal recommendations

Each evaluated against the full invariant set above.

### Pattern A: "VRS personnel drops to 50% triggers automatic Krajina-corps dissolution"

**Verdict: REFUSE — §6.2 VIOLATION.**

Per §6.2, dissolution requires the 2-of-3 per-formation criteria (`personnel < 400 ∧ cohesion ≤ 20 ∧ morale ≤ 15`) OR the §6.2.4 morale-collapse override (per-formation streak counter). A faction-level personnel-fraction trigger that auto-dissolves an entire corps:
- Bypasses the per-formation 2-of-3 gate.
- Aggregates personnel across formations and overrides the per-formation absolute personnel floor (150).
- Bypasses the §6.2.4 hysteresis (no per-formation `morale_low_streak`).

The only canon-safe approximation is: under heavy attrition, **per-formation** cohesion/morale/personnel each degrade, and the existing 2-of-3 gate fires on **the formations that actually meet the criteria**. Faction-level personnel collapse expresses through MANY brigades hitting their individual gates, not through one faction-bulk rule.

### Pattern B: "VRS equipment-quality decays 2% per turn after w130" (passive non-event-driven mutation)

**Verdict: ALLOW with conditions — CANON-SAFE if implemented as the existing `equipment_decay` substrate.**

Per §14.6: "destroyed by degradation write-off" is an explicit canon-authorized sink path. The `apply-vrs-equipment-decay` step already does exactly this for VRS (timeline-driven, monotonic, floored). §8 does NOT forbid this because `equipment_decay` is NOT `war_exhaustion` — it is a per-formation equipment-quality field, separate concept.

CONDITIONS for canon-safety:
1. Mutation must be data-driven (`war_timeline.equipment_decay` row), not hard-coded magic constants in source.
2. Mutation must be monotonic-down with a floor (existing implementation uses `Math.max(floor, current - rate)`).
3. Mutation must be deterministic (no random per-formation jitter).
4. Default-off byte-stability: if the data row is absent, no mutation occurs.
5. Consumer must multiply effective combat power, not directly mutate per-formation cohesion/morale (those are §14.3 / §14.3a separate concepts).

The "2% per turn after w130" is shape-correct. The CHOICE of 2% per week is a calibration decision (data-driven via `rate_per_week`), not a canon decision.

### Pattern C: "Per-faction force_quality scalar in [0,1] reads from cumulative casualty ledger"

**Verdict: ALLOW — CANON-SAFE as derived state.**

`casualty_ledger` is per-faction cumulative integer counters (canon-safe per §11). A `[0, 1]` scalar derived from `casualty_ledger.killed / OOB.starting_personnel` (or similar arithmetic) is pure derived state per §13.

CONDITIONS:
1. The scalar is RECOMPUTED each turn (§13.2).
2. The scalar is NEVER serialized as the source-of-truth (§13.1) — or is serialized as an audit-only redundant cache that the next turn's computation overwrites.
3. The scalar is NEVER read by a §6.2 dissolution path (it must not bypass the per-formation gate).
4. The scalar is NEVER read by a §9.6 control-flip path directly (it must route through attack resolution or op eligibility).

Per §11.4 reproducibility: identical inputs → identical outputs. A cumulative-ledger-derived scalar trivially satisfies this.

### Pattern D: "Combat predictor reads VRS force_quality and applies attacker-buff multiplier when defending faction's trajectory is degraded"

**Verdict: ALLOW with strong conditions — borderline, prefer DEFENDER-DEBUFF over ATTACKER-BUFF framing.**

§9.6 forbids "passive pressure flip." The discriminator is: does the rule modulate **input to attack resolution** (canon-safe) or **outcome of attack resolution** (canon-violating)?

A multiplier in `computeAttackerPower(...)` or `computeDefenderPower(...)` is an INPUT modulator — canon-safe by construction, because §9.6 mechanism (1) "attack resolution" is still required to fire for a flip to occur.

PREFERRED FRAMING: "When VRS defender's average force_quality < 0.3, apply defender_power × 0.7 in `computeDefenderPower`." This is symmetric with existing entrenchment / morale / supply / cohesion multipliers already applied at this site (see `WatchedOperationDefenderPowerBreakdown` in `game_state.ts:956`).

REFUSED FRAMING: "When defender's trajectory is degraded, attacker auto-wins" (skips dice/predictor, no §9.6 mechanism fires).

CONDITIONS:
1. Multiplier is applied at the combat-math input stage, not at the outcome-flip stage.
2. The multiplier is bounded (no infinity, no zero — preserve §6.2 brigade-non-destruction).
3. The multiplier source is auditable from state alone (§9.9): trace from `faction_force_quality` derived state → per-formation fields → casualty_ledger.
4. **Crucially:** the multiplier does NOT bypass the requirement that an attack ORDER must be ISSUED and RESOLVED. It only modulates the resolution input.

### Anti-pattern E: "Faction force_quality scalar is the AUTHORITATIVE source for per-formation cohesion/morale"

**Verdict: REFUSE — §13.1 + §14.3 + §14.3a VIOLATION.**

This inverts canon: per-formation fields are authoritative; per-faction is derived. A model that overwrites `FormationState.cohesion` from a faction-level scalar:
- Violates §13.1 (derived overwriting authoritative).
- Likely violates §14.3 bounds (no per-formation context).
- Erases per-formation distinctions (Drina Corps elite vs 1st Krajina rabble end up identical).

### Anti-pattern F: "Force-trajectory reduces existing `war_exhaustion` when faction recovers"

**Verdict: REFUSE — §8 VIOLATION.**

§8 explicitly states: "Control Strain is reversible; Exhaustion is irreversible and **must never be reduced by any system.**" A trajectory model that allows `war_exhaustion` to decrease violates this clause regardless of justification.

The canon-correct path for "ARBiH improvement" is NOT exhaustion reduction — it is increase in `veterancy_index` (Addition 2), increase in per-formation `cohesion` / `officer_quality` (already happening per n1741 evidence), and `equipment_quality_modifiers[]` event-driven boosts (already canon-safe substrate).

### Anti-pattern G: "Random-sampled mechanical-breakdown rate per turn"

**Verdict: REFUSE — §11.1 VIOLATION.**

Per §11.1: no `Math.random`, no seeded PRNGs. Mechanical breakdown must be schedule-driven (existing `apply-vrs-equipment-decay` pattern) or accumulator-driven (e.g., from cumulative supply-strain integration), never random.

---

## §9 — Canon-safe trajectory pattern reference table

| # | Pattern | Canon basis | Existing template | Implementation owner (read-only memo) |
|---|---|---|---|---|
| S1 | Per-formation `equipment_decay` time-driven monotonic-down with floor | §14.6 degradation write-off; §11 determinism | `apply-vrs-equipment-decay` step | engine-side; gameplay-programmer per inventory memo |
| S2 | Per-faction `equipment_quality_modifiers[]` event-driven multiplicative modifier list | §14.6 external creation; §11 | `getActiveEquipmentQualityMultiplier` | events/active_modifiers.ts |
| S3 | Per-faction `casualty_ledger` cumulative integer accumulator | §11; §14.6 conservation | `casualty_ledger.ts` | engine-side |
| S4 | `morale_low_streak` per-formation counter with hysteresis reset | §6.2.4 | LANE-NIGHTSHIFT-N4 | engine-side |
| S5 | Per-faction monotonic scalar (`war_exhaustion` shape) | §8 monotonic invariant | `war_exhaustion[fid]` | political/war_exhaustion |
| S6 | Per-faction derived rollup (recomputed each turn from sorted per-formation iteration) | §13.1, §13.2, §11.3 | `faction_officer_maturity` | derived |
| S7 | Combat-math INPUT multiplier (defender_power × trajectory_modifier) | §9.6 mechanism (1) modulation, NOT outcome | existing entrenchment / supply / cohesion multipliers | combat_math.ts |
| S8 | Operation eligibility predicate axis read | §9.6 mechanism (2) modulation | `force_quality` axis in 9-axis vocabulary | operation_opportunity_catalog_*.ts |
| S9 | Time-bounded modifier with `expires_turn` cleanup | §11 determinism; existing GC pattern | `equipment_quality_modifiers`, `recruitment_modifiers` | events/apply_effects.ts |

## §10 — Canon-VIOLATING trajectory pattern reference table

| # | Pattern | Violated clause | Why it fails | Refusal recommendation |
|---|---|---|---|---|
| V1 | Faction-level auto-dissolution when personnel-fraction crosses threshold | §6.2 | Bypasses per-formation 2-of-3 + §6.2.4 streak gates | REFUSE |
| V2 | Force-trajectory writes per-formation `cohesion` or `morale` directly | §13.1 + §14.3 + §14.3a | Derived state overwriting authoritative; bypasses bounds and drift | REFUSE |
| V3 | Force-trajectory READS or REDUCES `war_exhaustion` | §8 | Exhaustion must never be reduced by any system | REFUSE |
| V4 | Passive-pressure control flip when trajectory crosses threshold | §9.6 | No attack/op/collapse/treaty event; bypasses "no passive flip" rule | REFUSE |
| V5 | Random-sampled per-turn trajectory rate | §11.1 | Banned PRNG / Math.random | REFUSE |
| V6 | Faction force-quality scalar serialized as authoritative (replaces per-formation truth on save/load) | §13.1, §14.3, §14.3a | Erases per-brigade granularity required for conservation and bounds | REFUSE |
| V7 | Hardcoded per-faction floor that prevents per-formation degradation (e.g., "VRS cohesion can't drop below 30 because faction-level rule") | §14.3 | Clamps per-formation field via faction logic | REFUSE |
| V8 | Trajectory-driven dissolution that doesn't increment per-formation `morale_low_streak` | §6.2.4 | Bypasses the canonical morale-collapse path | REFUSE |

## §11 — Canon-silent / GATED patterns (require explicit design decision before implementation)

| # | Pattern | Canon-silent because | Recommended gating |
|---|---|---|---|
| G1 | Per-faction `quality_index` (Addition 2 above) — a composite [0,1] scalar derived from veterancy + replacement-rate | Canon mentions `experience` and `casualty_ledger` separately but does not define a composite shape | Game-designer + canon-compliance review of the formula; documented in Systems Manual §X before consumers wire to it |
| G2 | Reverse-direction `equipment_quality_modifier` for ARBiH late-war improvement (patron-flow event-driven uptick) | The substrate exists (§14.6 explicitly authorizes external creation); the question is which historical events fire which modifiers | Historian + game-designer sign-off on event triggers and magnitudes; no canon edit required |

---

## §12 — Headline answer to the caller's question

> **Can the late-war Krajina collapse emerge organically from force-trajectory differentials under existing Engine Invariants v0.9.0?**

**Yes — the canon substrate is in place. No canon edit is required. What is required is:**

1. **Engine-side wiring (not canon work):** repair the `war_exhaustion` Issue #47 pipeline; broaden `apply-vrs-equipment-decay` to be data-driven for all factions where the timeline supplies a row; add the three derived/extension fields proposed in §7.
2. **Operation-side wiring (not canon work):** ensure the `force_quality` predicate axis reads a meaningful per-faction differential signal so late-war ops (`sana_95`, `mistral_2_95`, `juzni_potez_95`, `maestral_2_95` if/when authored) gate cleanly on the VRS-degraded / ARBiH-improved trajectory.
3. **Combat-math wiring (Codex parallel work):** ensure trajectory state is read at the INPUT to `computeAttackerPower` / `computeDefenderPower`, not as a §9.6 outcome override.

**The §6.2 brigade-no-destruction invariant means "competent rubble" expresses as fight-worse-but-still-exist, NOT as faction-bulk dissolution.** All proposals that imply collapse via mass dissolution are REFUSED on canon grounds.

**The §8 monotonic exhaustion invariant means `war_exhaustion` cannot model a recovery arc.** ARBiH improvement is modeled instead via per-formation cohesion/morale/officer_quality gains, veterancy_index increase, and event-driven `equipment_quality_modifiers[]` upticks.

**The §9.6 no-passive-flip invariant means trajectory drives EMERGENCE through attack resolution + op eligibility + authority/supply degradation + negotiated transfer — never by reading trajectory and flipping `political_controllers` directly.**

---

## §13 — Blockers / canon-silent items returned to caller

NONE that prevent the proposed substrate work. The proposed three schema additions all map onto existing per-faction shape templates (§7) and require no canon amendment.

The TWO canon-silent / gated items (G1, G2 in §11) are design decisions, not canon decisions:
- G1: shape of a `quality_index` composite formula.
- G2: which historical events trigger reverse-direction equipment-quality upticks for ARBiH late-war improvement.

Both are routine design-spec work, not Engine Invariants amendments.

---

## §14 — Files touched

- `docs/40_reports/audits/20260522_CANON_TRAJECTORY_FRAME.md` (this memo) — created.

No source files, scenario files, anchor files, OOB files, calibration files, or canon files touched. `FORAWWV.md` not touched.

## §15 — Determinism

Documentation-only memo. No runtime artifacts produced. No timestamps generated at runtime. No random calls.

---

*End of memo.*
