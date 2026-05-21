# Force-Trajectory Engine Inventory (2026-05-22)

**Status:** COMPLETE - read-only audit.
**Author:** Codex gameplay review.
**Context:** Fresh painted-vs-sim diagnostics show the sim area profile flat at RS 61.0%, RBiH 26.4%, HRHB 12.6% from w104 through w188. Historical Oct 1995 requires the late-war RS area collapse and Federation/ARBiH advance that the current run set does not yet express.

---

## 1. Existing force-quality inputs

The engine already stores or derives useful trajectory inputs:

- Brigade officer quality, faction officer maturity, capability profile, cohesion, morale, exhaustion, pool pressure, and equipment support are consumed by `computeCorpsOperationReadiness(...)`.
- The helper returns seven normalized readiness traits: `operation_readiness`, `staging_reliability`, `axis_coordination`, `support_delivery`, `failure_recovery`, `reserve_response`, and `collapse_susceptibility`.
- The helper is pure and writes nothing, which makes it suitable for diagnostics and deterministic gates.

Evidence: `src/sim/combat/corps_operation_readiness.ts:4`, `src/sim/combat/corps_operation_readiness.ts:25`, `src/sim/combat/corps_operation_readiness.ts:380`, and `src/sim/combat/corps_operation_readiness.ts:401`.

## 2. Existing consumers

The opportunity catalog uses attacker-side readiness traits and faction supply pressure as eligibility gates:

- `sana_95` uses 5th Corps `operation_readiness` and RBiH supply pressure.
- `mistral_2_95` uses HVO/HV readiness, HRHB supply pressure, and HVO/HV `axis_coordination`.
- `kupres_cincar_94` and `vlasic_ridge_95` use the same attacker-side pattern.

Evidence: `src/sim/combat/operation_opportunity_catalog_5th_corps.ts:217`, `src/sim/combat/operation_opportunity_catalog_5th_corps.ts:266`, `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts:145`, `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts:220`, `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts:229`, and `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts:308`.

## 3. Missing comparative surface

The current force-trajectory surface is partial for late-war collapse:

| Surface | State |
|---|---|
| Attacker readiness threshold | Exists |
| Attacker supply pressure gate | Exists |
| Live objective ownership check | Exists |
| Staging/control dependency check | Exists |
| Defender readiness degradation by target theater | Missing as a catalog gate |
| Attacker-vs-defender readiness margin | Missing as a catalog gate |
| Per-OSID/theater defender supply degradation | Missing as a catalog gate |
| Per-operation trace for eligible/block/launch/under-deliver | Partial; H1 watched triggered-operation trace is separate from opportunity catalog lifecycle |

## 4. Minimum next surface

The smallest useful next surface is not a new global combat multiplier. It is a deterministic trace/read model for opportunity lifecycle outcomes plus one comparative predicate that can be tested without changing scenario anchors:

- `opportunity_id`
- turn and canonical window
- required/optional predicate results
- attacker readiness traits
- defender theater readiness traits or defender degradation snapshot
- launch decision
- validation/build failure reason if any
- resulting operation/AAR link if launched

This should be compact and sorted deterministically, and it should live at the scenario-runner/save diagnostic boundary before any outcome tuning.

## 5. Recommendation

Proceed with evidence-first lifecycle trace persistence for opportunity operations, then decide between:

- Catalog-fill lane: implement `donji_vakuf_95` first because it is the lowest-risk BB gap and uses the existing single-corps pattern.
- Trajectory-gate lane: add a Krajina-facing defender degradation predicate if the trace proves existing opportunities are eligible but under-delivering or never launching because the current gates cannot express VRS collapse.

Do not wire Oct 1995 RS as a Tier 1 pass/fail anchor until this trace and at least one late-war delivery lane are proven on a fresh 188w run.

---

# Gameplay-Programmer Addendum (2026-05-22)

**Author:** gameplay-programmer (read-only audit pass; merged in after Codex's opportunity-catalog framing above).
**Scope:** complements §1-§5 above with the broader per-faction trajectory-state schema inventory requested by the parent task. Codex's framing focused on the opportunity-catalog gate surface; this addendum covers the *underlying state schema* that feeds (or should feed) any such gate, plus the combat-math layer.

## A1. Per-faction force-quality state over time

### A1.1 Cumulative personnel pool depletion
- **EXISTS at the wrong granularity.** `src/sim/combat/ongoing_mobilization.ts:285,379` tracks per-municipality `cumulative = available + committed + exhausted` and gates new mobilization by `exhaustionRatio >= EXHAUSTION_HARD_CAP` of `milAgeMales`.
- **MISSING — faction-aggregate "exhausted-replacements" trajectory.** No `state.military.recruitable_pool_depleted_fraction[faction]`.

### A1.2 Equipment quality degradation
- **EXISTS, per-brigade, faction-asymmetric (calendar railroad).** `FormationState.equipment_decay` at `src/state/game_state.ts:758`.
- **Writer:** `src/sim/turn_phases/war_phases.ts:2212-2230` step `apply-vrs-equipment-decay` decrements only RS brigades after `start_week` (timeline-driven). Calendar-clock, not casualty-driven.
- **Consumer:** `src/sim/combat/combat_math.ts:887` — `decayMult` multiplies inside `getEquipmentRatio` → basePower.
- **Parallel event-scoped:** `equipment_quality_modifiers?: Array<{faction, multiplier, expires_turn}>` at `src/state/game_state.ts:2185-2194`. Reader `getActiveEquipmentQualityMultiplier` at `src/sim/events/active_modifiers.ts:43-57`. Combat consumer at `src/sim/combat/combat_math.ts:1301, 1463` (gated `!== 1.0`). Event-driven only.

### A1.3 Officer-corps competence trajectory
- **EXISTS — fully wired bidirectional loop.** `FormationState.officer_quality?: number` at `src/state/game_state.ts:760`.
- **Writers:** combat-driven growth at `src/sim/combat/officer_quality_update.ts:184-189`; casualty-driven decay at `src/sim/combat/attack_post_battle_effects.ts:62-66`; reconstitution penalty at `src/sim/combat/brigade_reconstitution.ts:366`.
- **Consumers:** `src/sim/combat/combat_math.ts:535-545, 726` via `getThreeTierOfficerMod`; `src/sim/combat/corps_operation_readiness.ts:155-180` for op planning.
- Faction-aggregate: `state.military.faction_officer_maturity?: Record<FactionId, number>` at `src/state/game_state.ts:2156`. Decorative — consumed only by `src/sim/combat/corps_operation_readiness.ts:184`, NOT by combat math.

### A1.4 Comms quality (HIST-GAP-3)
- **MISSING.** Only `state.military.comms_override_by_corps?: Record<corps_id, { before_turn, mode: 'radio'|'full' }>` at `src/state/game_state.ts:1969-1970` — scenario-loaded per-corps override consumed only by `src/sim/combat/army_hq_gathering.ts:115`. No faction trajectory.

### A1.5 Per-brigade ammunition (HIST-GAP-4)
- **MISSING — collapsed to faction reserve.** `state.military.heavy_munitions_reserve?: Record<FactionId, number>` `[0..100]` at `src/state/game_state.ts:1971`. Consumed at `src/sim/combat/combat_math.ts:744-745` (offensive heavy-weapons mult) and `src/sim/combat/sector_offensive.ts:605-608` (bombardment cost). No per-brigade loadout.

### A1.6 Mobilization fatigue (distinct from war_exhaustion)
- **PARTIAL — at municipality, not faction.** `MilitiaPoolState.fatigue?: number` at `src/state/game_state.ts:1060`; per-mun `exhaustionRatio` gate caps mobilization above `EXHAUSTION_HARD_CAP`. No faction-aggregate `mobilization_fatigue[faction]`.

## A2. Trajectory inputs the engine already computes

### A2.1 casualty_ledger
- **EXISTS — writers only.** Type at `src/state/casualty_ledger.ts:14-34`.
- **Writers (9 sites):** `attack_resolution_osid.ts:714, 745`; `battle_resolution.ts:1096, 1106, 1144`; `frontline_attrition.ts:348`; `paramilitary_sweep.ts:575, 583, 611, 671`; `siege_attrition.ts:149`.
- **Readers (combat / recruitment trajectory): ZERO.** Only consumer is `src/sim/endgame/cost_ledger.ts:430`. Single biggest "exists but unused" signal.

### A2.2 recruitment_modifiers (faction event-scoped)
- **EXISTS, consumed.** `src/state/game_state.ts:2180-2184`. Reader at `src/sim/events/active_modifiers.ts:17-31`. Combat-adjacent consumer at `src/sim/combat/ongoing_mobilization.ts:306, 387`.

### A2.3 war_exhaustion → combat tempo
- **DEAD CONNECTION.** Writer at `src/sim/combat/exhaustion.ts:106` clamps `Math.min(100, current + finalDelta)`. Combat consumer at `src/sim/combat/combat_math.ts:1575-1593` thresholds 500 → 800. **The penalty NEVER fires** — value is capped below the threshold floor by 5×. This is the audit's Issue #47 ("exhaustion reads 0").
- Other readers (raw 0-100): `src/sim/combat/command_friction.ts:36`, `src/sim/combat/commander/briefing.ts:685`, `src/sim/combat/operation_storm.ts:70-71`.

### A2.4 Brigade dissolution events
- **EXISTS** per `docs/10_canon/Engine_Invariants_v0_9_0.md:61-72` §6.2 + §6.2.4. NOT aggregated as a trajectory signal — no `dissolved_brigades_by_faction` counter.

### A2.5 force_quality_traits
- **EXISTS in commander layer only.** Stored on `CorpsOperation.force_quality_traits_at_launch` at `src/state/game_state.ts:445`. Consumed by `src/sim/combat/commander/plan.ts:759, 786, 940, 948` (planning gate) and `src/sim/combat/commander/emit.ts:936-1390`. **NOT a combat-math consumer.**

## A3. Combat-math trajectory hooks (current)

`computeAttackerPower` / `computeDefenderPowerBreakdown` (`combat_math.ts:1280-1466`) reads:

| Trajectory input | file:line | scope | live? |
|---|---|---|---|
| `formation.experience` | combat_math.ts:899 | per-brigade | yes |
| `formation.cohesion` | combat_math.ts:901 | per-brigade | yes |
| `formation.morale` | combat_math.ts:1295 | per-brigade | yes |
| `formation.officer_quality` | combat_math.ts:545 | per-brigade | yes |
| `formation.equipment_decay` | combat_math.ts:887 | per-brigade | yes |
| `equipment_quality_modifiers[faction]` | combat_math.ts:1301, 1463 | per-faction event | yes (`!= 1.0` gate) |
| `heavy_munitions_reserve[faction]` | combat_math.ts:744-745 | per-faction | yes (`supply_reserves_enabled` gate) |
| `general_supply_reserve[faction]` | combat_math.ts:939-940 | per-faction | yes (same gate) |
| `war_exhaustion[faction]` | combat_math.ts:1588 | per-faction | **DEAD** |
| `casualty_ledger[faction]` | — | per-faction | **NO READER** |
| `faction_officer_maturity[faction]` | — | per-faction | NO COMBAT READER |
| `capability_profile` | — | per-faction | NO COMBAT READER |

## A4. Gap matrix counts

| Category | Count |
|---|---|
| EXISTS (live combat consumer) | 6 |
| EXISTS (no live combat consumer) / DEAD | 4 |
| PARTIAL | 3 |
| MISSING | 3 |

## A5. Minimum schema to enable emergent late-war collapse

Canon constraints respected:
- §6.2 brigades never destroyed (use dissolution / `forceRetreatWithPenalties`).
- §6.2.4 morale override gated; new mechanics follow same shadow-flag pattern.
- §8 exhaustion monotonic — any new trajectory uses `Math.min(cap, current + delta)`, never decrement.
- FORAWWV §XIV.1 default-off byte-stability invariant — combat-math hooks gated `!= 1.0` or env-flagged.

### S1 — Faction-aggregate casualty trajectory + combat consumer
```
state.military.casualty_trajectory?: Record<FactionId, {
    cumulative_killed: number;
    cumulative_wounded: number;
    cumulative_equipment_lost: number;     // tanks+artillery+aa
    fraction_of_mobilized_lost: number;    // [0..1] monotonic
    last_updated_turn: number;
}>;
```
Derived from existing `casualty_ledger` writes + `recruitment_state.recruited_brigade_ids` + per-mun pool history. New combat consumer `getCasualtyAttritionMultiplier(state, faction)` in `combat_math.ts` next to `getActiveEquipmentQualityMultiplier`, gated `!== 1.0`.

### S2 — Re-anchor war_exhaustion tempo thresholds
Two-line constant change in `src/sim/combat/combat_math.ts:1575-1576`:
```
WAR_EXHAUSTION_TEMPO_THRESHOLD_LOW  = 30    // was 500
WAR_EXHAUSTION_TEMPO_THRESHOLD_HIGH = 80    // was 800
```
No schema add. Resurrects the existing dead loop. Conflicts with Codex's parallel combat-math edits — coordinate.

### S3 — Wire faction_officer_maturity into combat math
No schema add (field already at `src/state/game_state.ts:2156`). Add `getFactionOfficerMaturityMult(state, faction)` consumer in `combat_math.ts`, env-gated default-off. Activates a substrate that `docs/40_reports/implemented/20260501_FORCE_QUALITY_TRAJECTORY_EVIDENCE_AUDIT.md` CC2/CC3 confirmed has been decorative since Phase 4.

## A6. Verdict (gameplay-programmer)

**The engine has the per-brigade substrate to model an attrition arc — but the faction-aggregate trajectory loops are either written-and-unread (`casualty_ledger`) or wired-and-dead (`war_exhaustion` → tempo threshold). Calibration alone cannot produce a Krajina collapse: brigade-level attrition runs inside operations, but there is no faction-scale "VRS is cumulatively bleeding out 1992-1995" multiplier biasing all of VRS's combat down.**

After S1+S2+S3 (one schema add, one const repair, one consumer wire — all canon-compliant), calibrating per-faction attrition curves CAN drive emergent late-war collapse via existing dissolution and force-quality channels without scripted ops.

This addendum's relationship to Codex's framing above: Codex argues for an *evidence-first lifecycle trace* on the opportunity-catalog surface before adding combat-math hooks. That is the correct sequencing for a delivery lane. This addendum confirms that the deeper state-schema surface (casualty trajectory feedback, exhaustion threshold) is what an opportunity-catalog defender-degradation predicate would have to read — so S1/S2 are also blockers for Codex's "trajectory-gate lane" in §5.

## A7. Memo verification
Path: `F:\A-War-Without-Victory\docs\40_reports\audits\20260522_FORCE_TRAJECTORY_ENGINE_INVENTORY.md`. Exists.
