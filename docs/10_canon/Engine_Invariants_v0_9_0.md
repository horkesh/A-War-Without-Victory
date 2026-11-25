# A War Without Victory -- Engine Invariants v0.9.0

**Last Updated:** 2026-09-05

One game turn equals one week.

## 1. Global Assertion Rules

All assertions are evaluated once per turn after state update. Invariant violations must be handled deterministically and audibly.
Only corrections explicitly defined as enforcement rules are permitted.
If no such correction exists, the system must return a structured invariant failure result.

Development-time validation tools may abort execution on invariant violation.

## 2. Settlement and Municipality Invariants

- Municipality control must always be derived from political control
- Municipality consolidation is valid only if all settlements are controlled by one faction and authority is consolidated for the required duration
- Any contested or flipped settlement immediately invalidates consolidation

## 3. Authority Invariants

- Authority cannot be Consolidated if supply is Critical or any dependent corridor is Cut
- Authority must degrade automatically when invalid states are detected
- Control does not imply authority under any circumstances

## 4. Supply and Corridor Invariants

**Corridor States:**
- Corridors are derived per faction based on dependency, capacity, and redundancy
- Corridors must always exist in exactly one state: Open, Brittle, or Cut
- Brittle corridors must apply continuous penalties every turn
- Junction loss alone must not collapse a corridor unless dependency thresholds are crossed
- **Cascade:** When connectivity is lost (e.g. control flip), dependent regions transition Adequate->Strained->Critical only when dependency threshold is crossed (no path or only brittle path). Propagation order is deterministic (by faction_id, then by node id). Supply cascade is visible at the start of the **next** turn (supply is not re-run after control flips within the same turn). See SUPPLY_DESIGN.md and SUPPLY_IMPLEMENTATION_PLAN.md.

**Supply Requirements:**
- All supply must trace through corridors or local production
- Supply recovery must be slower than degradation
- Supply cannot improve without improved connectivity or authority

**Supply is connection, not stock (supply-reserve economy retired 2026-11-17, Fable consult 6):** A formation is supplied if it can be reached from a source over the OSID graph (Systems Manual §14.2); there are no depots, ammunition stocks or patron shipments. The faction-level reserve layer (`general_supply_reserve`, `heavy_munitions_reserve`: maintenance drain, per-battle expenditure, production and patron-aid income, the embargo income multiplier, production-facility damage, airdrops, the smuggling allocation, the JNA warehouse bonus and the reserve-based supply states) is not modelled in 1.0. It ran only under the scenario flag `supply_reserves_enabled`, which no apr1992 scenario sets (only `sep1991_to_dayton` and the retired `jan1993_to_dayton` did; no player can start either), so the retirement is byte-identical on apr1992. The "recovery slower than degradation" invariant is carried by the supply invariants above (recovery slower than degradation; no improvement without connectivity or authority), not by a stock. The reserve fields stay optional, compatibility-only save fields so old saves load; no new game creates them. The `supply_below`/`supply_above` event conditions and the `supply_delta` effect are retired (2026-11-17). Do not revive this mechanism as it stood; the record is `docs/40_reports/governance/20261115_FINAL_BEHAVIOUR_AT_1_0.md` (SB2).

**Enclave Hardening (Phase C):** After 8+ consecutive isolation turns, enclaves gain a +5% defense bonus; enclave resilience reduces exhaustion accumulation. Enclave resilience runs in 1.0 (the `enclave-resilience` pipeline step, not behind any flag; constants in `src/state/enclave_resilience_constants.ts`). The Phase B siege drain (retired 2026-11-17, §6.10), patron aid income, embargo income reduction and production-facility damage retired with the reserve economy.

## 5. Settlement Stabilization Invariants

- Newly captured settlements must enter a stabilization state
- Stabilization increases reversal probability and authority penalties
- Additional exhaustion applies if supply is below Adequate

## 6. Front and Combat Invariants

- Fronts may only exist where sustained opposing control meets (hostile OSID adjacency).
- Static fronts must increase exhaustion and defensive hardness together.
- **No single resolution flips more than one OSID.** One attack -> one target OSID; control flip at most for that OSID.

### 6.1 Defense of Unoccupied OSIDs

*(Amended LANE-MILITIA-CASUALTY-PERSISTENCE, 2026-09-01 — canon-compliance review; owner decision on record in `docs/PROJECT_LEDGER.md`.)*

Unoccupied OSIDs adjacent to friendly brigades have militia-only defense. Frontage constraint is enforced by `BRIGADE_OPERATIONAL_FRONTAGE_CAP=48`. Local front density modifier (`local_front_defense.ts`) applies `THIN_FRONT_THRESHOLD=0.5` / `MIN_COVERAGE_PENALTY=0.6` to defender power when brigades are sparse.

**Militia defense magnitude is population-derived and MUST NOT be bounded by `MilitiaPoolState.available` while that field retains its present semantics** — `committed` never decremented, refills gated on controlling the municipality, and `POST_FLIP_LOST_STRENGTH = 0` on control flip while pool population only ever raises. Under those semantics `available` is the post-mobilization recruitment *residual*, structurally 0 for exactly the faction defending ground it is losing, and binding defense to it deletes historically attested local defense (Kozarac, Foča, Višegrad, Zvornik, Vlasenica). `computeMilitiaDefensePower()` reads OSID population only. A future change that first repairs `available` semantics may revisit this; the prohibition is on binding defense to the residual, not on the idea of a manpower bound. Measurements and run ids: `docs/40_reports/REAL_WAR_MASTER.md` and `docs/20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md` §1.

**Militia casualties are durable and are recorded exactly once.** Losses from a militia-only battle are applied by a single writer (`src/sim/combat/militia_casualties.ts`). When a matching pool exists and is consistent with its own key, the same call debits `pool.available` by at most what it holds, feeds permanent losses (killed + missing) into `pool.exhausted` at the standard 0.75 demographic share, and credits recoverable wounded to `pool.wounded_pending` **only in proportion to manpower actually drawn from the pool**. **The ledger row is written unconditionally** — a missing pool, or one whose stored faction contradicts its key, suppresses only the pool mutation, never the casualty record. Militia rows are keyed by the composite militia-pool key and MUST NOT appear in `per_formation`.

**Casualty accounting invariant.** For every faction, after every write:

```
killed           == sum(per_formation.killed)           + sum(per_militia_pool.killed)
wounded          == sum(per_formation.wounded)          + sum(per_militia_pool.wounded)
missing_captured == sum(per_formation.missing_captured) + sum(per_militia_pool.missing_captured)
```

Raw casualties drive manpower depletion; realism-scaled casualties drive the historical ledger. The two quantities are not interchangeable.

### 6.2 Brigade No-Destruction Invariant

**Brigades are NEVER destroyed in combat.** All five historical destruction paths have been replaced by `forceRetreatWithPenalties()`:

- `EMERGENCY_RETREAT_PERSONNEL_RETAIN = 0.60` (40% personnel loss)
- `COHESION_LOSS = 20`
- `DISRUPTED_TURNS = 3`
- Retreat destination: `home_osid` -> `fallback_osid` -> corps HQ -> any friendly OSID

**Dissolution** is the only removal mechanism: requires 2-of-3 criteria (personnel < 400, cohesion <= 20, morale <= 15). Enclave brigades require 3-of-3. Absolute floors (150 personnel, enclave 50) count as "low personnel" but do NOT bypass the criteria check. On dissolution: equipment transferred to nearest same-corps brigade (70% salvaged); personnel to strategic reserve (50%).

**§6.2.4 Morale-collapse override (LANE-NIGHTSHIFT-N4-CANON-AMENDMENT, 2026-05-03):** A brigade with `morale_low_streak >= MORALE_OVERRIDE_TURNS` (canonical: 8 turns at `morale <= 15`) dissolves regardless of personnel count. The `morale_low_streak` counter increments each turn `morale <= 15` and resets to 0 when `morale > 20` (5-point hysteresis prevents flutter at the threshold). This override exists because a unit cannot be simultaneously combat-incapable in spirit and indestructible in substance — the 2-of-3 criteria above continue to apply for combat-attrition cases; this override adds a fourth, independent dissolution path keyed on sustained morale collapse alone. Faction-agnostic; the predicate has zero faction/corps/OSID condition. **Implementation gate:** the override is gated behind environment flag `MORALE_OVERRIDE_ENABLED` (default `false`). When the flag is off, the streak counter still increments (diagnostic-only); only the dissolution path is suppressed. Hash drift with the flag off is null. Constants:

```
MORALE_OVERRIDE_TURNS     = 8
MORALE_OVERRIDE_THRESHOLD = 15   // brigade is "in collapse" at or below this morale
MORALE_OVERRIDE_RESET     = 20   // streak resets when morale exceeds this (hysteresis)
```

### 6.3 Ops-Only Attack Invariant

**No brigade attacks independently.** All offensive combat flows through `CorpsOperation`. Brigades do not evaluate independent attack targets.

**Sole exception:** Counter-attacks to retake a just-lost position are permitted at brigade level.

Pioneer attacks seed with threshold `repulsed`; subsequent brigades join via `estimateConcentratedOutcome()`.

**COHA ceasefire ownership:** An active cessation-of-hostilities agreement suppresses operation attack/posture orders without erasing legal movement intent. While suppression is active, the affected operation's execution/recovery clock is paused and the operation records `operation_lifecycle_paused_reason: 'coha_ceasefire'`; it cannot age into failure or completion for attacks that the political layer prohibited. Attack resolution emits explicit suppression receipts rather than inferring a missing attempt.

**October 1995 ceasefire ownership (2026-11-14, council fix 3):** The `accept_ceasefire` answer to `holbrooke_ceasefire_demand_oct95` records `event_flags.ceasefire_oct1995_in_force`. From the turn after that card fired, until a declined Dayton clears the flag, the general ceasefire binds every party (the COHA scope). Its single owner is `src/sim/combat/oct1995_ceasefire.ts`. No offensive `CorpsOperation` (sector attack, feint, probe, general offensive) is admitted by any path, and no force launch bypasses the launch gate. Offensives in planning enter recovery with reason `ceasefire`. An offensive executing on the first ceasefire turn records `ceasefire_stand_down` caps. Each axis that had already engaged (attacked or captured) may take only its current objective, even one it had not yet attacked; an axis that never engaged gets cap −1. Once every axis has passed its cap or stopped, the operation enters recovery with reason `ceasefire`, booking no objective failure, experience grade or completion exhaustion. If the ordinary lifecycle ends the operation first (all objectives taken, or failure/stall caps), its ordinary recovery reason and bookings apply. Corps stances and the combat-effective stance are held at Defensive; the army standing order cannot be General Offensive (it falls back to Balanced). Attack orders of bound factions, counter-attacks included, are cleared at generation and suppressed with `oct1995_ceasefire` receipts at resolution, except a stand-down order on its capped objective. Movement and strategic defence continue; frontline attrition is not suspended.

**Operation capture causality:** A battle receipt records the exact attacker brigade ids and contributing operation ids. Scenario diagnostics and AAR attribution may credit an operation only from those exact contributor receipts or an explicit operation pause/suppression receipt. Sharing a target OSID is not evidence that an operation caused a battle or capture.

### 6.4 Cold Front Invariant

RS-HRHB fronts under the Graz Accords are exempt from:
- Frontline attrition (passive personnel drain)
- Bombardment firepower

`isColdFront()` in `frontline_attrition.ts` determines cold front status. Designed: a player break of the accords gives the opponent +0.25 aggression for 6 turns. Current build: not applied. The break turn is recorded in `truce_broken_turn`, but `getTruceBreakAggressionBonus` has no caller that feeds bot aggression; wiring is deferred post-1.0 (realism audit F6).

### 6.5 Unified Sector Defense

Defense at any OSID = `totalPower * (1/sector_edges) * densityMod`. No brigade-at-OSID vs sector-coverage distinction -- the front is a continuous locked line. Casualty distribution: distance-weighted proportional (decay `0.60^hops`, max 5 hops) with home-municipality motivation bonus (1.3x).

**Roster eligibility:** A formation with `lifecycle_status: 'forming'` is not a line holder, reserve, security formation, loan rescue, operation participant, or historical-opportunity commitment. Every sector-roster and operation-admission path must apply the shared live-formation eligibility contract before assigning it.

**Authored operation identity:** Pre-planned, triggered, and opportunity catalogs reference historical OOB identities, while recruitment may assign a synthetic live dictionary key and preserve that identity as `oob:<authored id>`. Operation admission must prefer an exact live key, otherwise resolve exactly one matching OOB tag, and reject an ambiguous match deterministically. Validation and execution must use the same resolved live formation ID.

### 6.10 Siege Defender Morale Drain (retired)

**Retired 2026-11-17 (Fable consult 6; §6 panel unanimous: historian, scenario-creator-runner-tester, engine/systems, red-team; canon + engine seats on this text).** The siege defender morale drain is not modelled in 1.0. It read `state.military.siege_turn_counters`, which ran only under the scenario flag `supply_reserves_enabled` (set only by `sep1991_to_dayton` and `jan1993_to_dayton`, which no player can start, since the desktop New Game accepts only `apr_1992`, and which are retired for 1.0 by the owner's one-start ruling; off in the scored apr1992 scenario), and its morale path sat behind a default-off switch (`SIEGE_MORALE_DRAIN_ENABLED`) since May 2026, so the drain itself never ran. Retired with it: the siege counters, the passive siege bombardment attrition, the reserve siege drain (`SIEGE_BASE_RATE` and its caps) and the `siege_active` event condition. `siege_turn_counters` stays an optional, compatibility-only save field so old saves load; nothing writes or reads it. Do not revive this mechanism as it stood: the record of why is in `docs/40_reports/governance/20261115_FINAL_BEHAVIOUR_AT_1_0.md` (SB1).

## 7. Fragmentation Invariants

- Fragmentation requires concurrent authority collapse and connectivity disruption
- Fragmentation and reunification both require persistence over multiple turns
- One-turn fragmentation or reunification is invalid

## 8. Exhaustion Invariants

- Exhaustion values are monotonic and irreversible
- Exhaustion must increase under brittle or cut corridors, static fronts, coercive control, or sustained supply strain
- Exhaustion compounds across military, political, and societal dimensions
- Control Strain is reversible; Exhaustion is irreversible and must never be reduced by any system
- JNA transition and withdrawal effects may increase escalation pressure but must not, by themselves, satisfy the war-start escalation threshold

**8.6 Asymptotic bounding, not truncation** (exhaustion/scoring redesign panel, 2026-08-06, unanimous GO). Any exhaustion quantity that this section mandates must increase under persisting conditions (brittle/cut corridors, static fronts, coercive control, sustained supply strain) must be bounded — where bounded at all — by a strictly-increasing, asymptotically-saturating function of its accumulated drivers, and never by a hard clamp that truncates growth to a constant while those driving conditions persist. Formally: while any mandated driver is active and the per-turn increment is positive, the exhaustion read must strictly increase turn-over-turn — it may approach a ceiling arbitrarily closely but must not flatline at it. A saturating consumer read of the form `CEILING·raw/(raw+K)`, or an asymptotic increment of the form `current + Δ·(1 − current/CEILING)`, satisfies this; a truncating `min(CEILING, current + Δ)` does not. A defensive numeric backstop (e.g. a residual `min(CEILING, …)`) is permitted ONLY where the asymptotic/bounding term provably keeps the value strictly below `CEILING` for every admissible driver value, so the backstop can never bind and can never truncate a real increase. All arithmetic on any bounded exhaustion read must use only IEEE-754 field operations (`+`, `−`, `×`, `÷`); transcendental functions (`exp`, `pow`, `log`, `tanh`) are prohibited — they are not correctly-rounded across V8 versions/platforms and would fork the save-state calibration hash. Monotonicity attaches to the persisted accumulator: it must never be decreased by any writer, and every consumer read of it must be a non-decreasing function of it.

## 9. Political Control Invariants

### 9.1 Existence of Political Control

Every settlement must have a political control state at all times, defined as either controlled by a faction or explicitly ungoverned (null).

Political control must not be inferred from military formations, brigade location (OSID), or fronts.

### 9.2 Initialization Precedence

Political control must be initialized deterministically **before**:
- Any front detection
- Any brigade location logic
- Any pressure, exhaustion, or supply logic

Any system operating on settlements must treat political control as pre-existing state.

### 9.3 Independence from Military Presence

Political control exists independently of brigade presence.

A settlement may be politically controlled without:
- Any brigade assigned to it (or to its OSID)
- Adjacency to hostile control

### 9.4 Rear Political Control Zones

Settlements (or OSIDs) not targeted by attack resolution and not adjacent to hostile control constitute Rear Political Control Zones.

Rear Political Control Zones:
- Retain political control
- Do not generate or absorb pressure
- Do not require military responsibility
- Do not experience control drift due to absence of formations

### 9.5 Control Stability

Political control must not change due to:
- Time progression
- Demographics
- Lack of supply
- Absence of brigades

Political control is stable by default.

### 9.6 Authorized Control Change Mechanisms

Political control may change **only** via:
- **Attack resolution** (War phase): an attack order is resolved -> push-back and control flip at the target OSID
- **Corps or frontline operations** as defined in War Specification / Systems Manual
- Internal authority collapse or fragmentation
- Negotiated transfer through end-state or interim agreements

**No passive pressure flip:** Control does not change from "sustained opposing military pressure" alone; it changes only when an attack (or corps/frontline op) is resolved.

**No calibration receipt:** An event must not be authored or expanded to transfer political
control solely to make a historical checkpoint match its painted reference. Ordinary
calibration territory must be earned by an authorized general mechanism above. Explicit
sensitive-history fall receipts are a separately reviewed exception and remain subject to
`SENSITIVE_HISTORY_DESIGN_GATE.md`; they do not authorize checkpoint-fitting events.

### 9.7 Null Political Control

A settlement may have political_controller = null only if:
- No faction exercises credible authority
- The condition is initialized deterministically
- No automatic reassignment occurs without authorized mechanisms

### 9.8 War Phase OSID-Only

In War phase, brigade location is **location_osid** only; no settlement-level territorial assignment. Control change only via attack resolution or corps/frontline operations. All OSID-keyed state must use stable ordering (`strictCompare`, sorted keys) in iteration and output.

**Formation location-in-control:** Every active formation with `location_osid` set must be in an OSID controlled by that formation's faction. Enforced by: pipeline step `displace-enemy-territory` (after attack resolution); scenario runner initial-state displacement after backfill; validation `validateBrigadeLocationControl`. OOB `home_osid` must be faction-controlled at scenario start.

**Command HQ anchors:** Corps and army-level command formations may carry `hq_osid` as a map/read-model anchor. `hq_osid` is not tactical presence, does not satisfy brigade location, does not create control or stationed-unit truth, and must not be used by movement, combat, displacement, or formation-location validation. Use `location_osid` only for actual physical formation placement.

### 9.9 Determinism and Auditability

Political control initialization and transitions must be:
- Deterministic
- Replayable
- Serializable
- Auditable from state alone

## 10. Peace and Negotiation Invariants

### 10.1 Peace is Terminal

Any accepted treaty containing transfer_settlements or recognize_control_settlements ends the war immediately and writes end_state.

Post-peace processing of fronts, pressure, supply reachability, breaches, and control-flip proposals must be skipped.

### 10.2 Treaty Constraints

Treaty constraints are deterministic and ordered; first violation wins and yields a single rejection_reason.

### 10.3 Brčko Completeness

Any peace-triggering treaty must include brcko_special_status or be rejected with rejection_reason = brcko_unresolved.

### 10.4 Competence Bundle Assertions

The following competences must be allocated together:
- Customs and indirect_taxation must be allocated together
- Defence_policy and armed_forces_command must be allocated together
- Bundle members must allocate to the same holder

These are gating-only assertions (prevent invalid treaties).

### 10.5 Vance-Owen decision ownership

Resolving the Vance-Owen peace-plan decision has one player-decision owner. The resolution must produce one durable event-decision receipt and one peace-plan-history chronology row; a duplicate pending event for the same choice must be consumed, not resolved as a second player decision.

### 10.6 Cutileiro documented disposition

If the player gives the documented Cutileiro response, all three final responses must be normalized to the documented pre-war record: RBiH rejected; RS and HRHB accepted. The player response remains durable, but HRHB acceptance alone must not manufacture a unanimous turn-one settlement. A counterfactual player response remains emergent. This exception applies only to Cutileiro; an actually unanimous peace-triggering treaty remains terminal under §10.1.

## 11. Determinism Invariants

### 11.1 No Randomness

No `Math.random()`, no seeded PRNGs, no non-deterministic iteration. All simulation logic, validators, derived artifacts, and UI export paths must be fully deterministic.

### 11.2 No Timestamps

No `Date.now()`, no time-based IDs in derived artifacts or serialization.

### 11.3 Stable Ordering

All iteration over collections that affect outputs must use stable ordering via `strictCompare`. This applies to: OSID iteration, brigade evaluation order, sector construction, retreat destination selection, and all serialization.

### 11.4 Reproducibility

All state variables must be serializable. Save/load must fully reconstruct world, faction, municipality, formation, and front states. Identical inputs must produce identical outputs across runs.

### 11.5 Desktop mutation durability

A successful canonical desktop mutation is complete only after the new state has been serialized, autosaved, and broadcast to every live renderer. Autosave failure must fail the mutation and restore the prior in-memory serialized state; a renderer-local success without durable persistence is invalid.

## 12. Exceptional Space Invariants

### 12.1 Sarajevo and Siege Conditions

- Siege state requires sustained connectivity loss plus continuous contact
- Siege multipliers must not apply while any viable connectivity exists
- High-contact non-siege states still generate exhaustion
- Sarajevo is an ALWAYS_BESIEGED_ENCLAVE: forced to "strained" minimum supply; resilience builds, never decays
- Urban defense multiplier: 2.0x for Sarajevo OSIDs; urban tank penalty at mountain-equivalent level (70% reduction)

### 12.2 Enclave Pressure

- Enclave pressure must escalate non-linearly as integrity declines
- Territorial stasis must not prevent escalation
- Enclave garrison power (TDF, police, civilian volunteers) adds to ALL defense paths
- Enclave resilience scaling: 0.005-0.02 per resilience point (at 20: 1.40x, at 45: 1.90x)

## 13. Derived State Enforcement

### 13.1 No Serialization of Derived States

Derived states (corridors, fronts, municipality status) must not be serialized.

### 13.2 Recomputation Requirement

All derived states must be recomputed each turn.

### 13.3 Brigade Operations Derived State

Brigade pressure, density, and resilience modifier are computed each turn and must not be serialized (consistent with 13.1).

## 14. Brigade Operations and Control Invariants

### 14.1 Settlement-level control

Municipality control is derived from settlement-level political control. Control changes at settlement/OSID level occur only via authorized mechanisms (9.6): **attack resolution** or **corps/frontline operations** in War phase; authority collapse, fragmentation, or negotiated transfer otherwise. No passive pressure flip.

### 14.2 Brigade operations determinism

All brigade-operations iteration must use `strictCompare` sorted keys. No randomness; no timestamps in state.

### 14.3 Cohesion bounds

Formation cohesion must remain in [0, 100] after all updates.

### 14.3a Morale

**Morale** is a FormationState field (`morale: number`, range [0, 100]) representing willingness to fight. Distinct from cohesion (tactical effectiveness):

| Field | Represents | Modifies |
|---|---|---|
| Cohesion | How organized/trained the unit is | Combat power (multiplicative) |
| Morale | How much the unit wants to hold | Retreat resistance, casualty absorption |

**Invariants:**
- Morale must remain in [0, 100] after all updates.
- Morale is **non-monotonic**: it may increase and decrease. Distinct from exhaustion (monotonic/irreversible).
- Morale drift and retreat resistance gates are deterministic.
- Population affinity (1991 census co-ethnic fraction) drives morale drift direction.
- Encirclement of own-population defenders (affinity > 0.50) causes morale to drift UP ("cornered rat"); low-affinity encirclement drifts DOWN.
- Morale gates retreat: high morale + costly_victory -> defender absorbs and holds. Decisive victory always causes retreat.
- Default morale for new formations: 60.
- Faction-specific morale retreat resistance floors: RBiH=50, RS=55, HRHB=60.

### 14.4 Brigade location (OSID)

**Every brigade has a valid location_osid.** Control changes only via attack resolution or corps/frontline operations (no passive pressure flip).

`location_osid` is the physical placement truth used by combat, movement, validation, and map rendering. `hq_osid`, `corps_id`, parent assignment, and other command metadata are command/navigation context and must never substitute for physical placement. Non-spatial army-HQ or corps-asset records may omit `location_osid`; every active combat brigade may not. Newly recruited or spawned brigades must be placed on a valid faction-controlled OSID in their home municipality, using deterministic fallback ordering, or not be created.

Temporary JNA/HV phantom brigades are subordinate additions to an authored military world, not a substitute order of battle. Phantom spawning requires at least one non-phantom formation in state, and each phantom requires its authored `corps_id` formation to exist before it may spawn. The sole exception is `jna_herzegovina_command`: that command is intentionally synthesized by corps-command initialization after its JNA phantom subordinates spawn. A scenario that starts without formations therefore receives no phantoms at startup; later turn-gated spawning remains possible only after the required military command substrate exists.

### 14.5 Retreat determinism

When a defender retreats, valid destinations are chosen deterministically **and must remain
geographically and organizationally meaningful**. Route reachability and distance are selection
criteria; OSID string ordering is only the final tie-break between otherwise equivalent valid
destinations. Deterministic lexical order by itself is never a geographic or command-routing
rule.

**Retreat destination classes (priority order):**
1. **Friendly OSID** (safe rear retreat) -- by enemy adjacency count ascending, then OSID sort
2. **Breakthrough to friendly** (cut-off brigade escapes through hostile territory; see 14.5a)
3. **Last stand** (no retreat possible -- defenderPower x 1.5, casualty multiplier x 2)

Note: per 6.2, "last stand" results in forced retreat with penalties, not destruction.

**Nonconformance status (706th debt, 2026-08-26; updated 2026-11-14):** the former terminal
fallback of `findEmergencyRetreatOsid`, which chose the lexicographically first OSID of the
largest friendly component when the source component had vanished, has been removed. It had
sent the 706th Muslim Mountain Brigade from Gornje Krčevine to `op:breza:koritnik`, followed
by same-turn dissolution. When topology is supplied, the function now selects only a
friendly-held OSID reachable from the lost position through friendly territory, in this order:
`home_osid`; `fallback_osid`; an adjacent friendly OSID (the first friendly neighbour in
`strictCompare`-sorted adjacency order; the search is declared as a friendly-only breadth-first
search of `EMERGENCY_RETREAT_BFS_MAX_HOPS = 8`, but its frontier is not advanced past the first
ring); the corps HQ; then the first OSID, in sorted order, of the same friendly component. It
never selects another component. If none exists it returns null and the caller applies the
cut-off outcome. The first, second and fourth steps and the sorted-component step apply only when the lost position is still in the friendly set the caller supplies (a per-pass cache, so this can depend on battle order). Only callers without topology keep a sorted first-friendly-OSID
compatibility fallback, which is lexical-only. Open debt: the cut-off outcome in
`forceRetreatWithPenalties` currently sets the brigade inactive with a `destruction_turn`,
which does not conform to 6.2 or the note above; the BFS depth defect and the same-turn
lifecycle question remain open in `CALIBRATION_MASTER.md`. Ordering the last two steps by
distance or enemy adjacency would be a calibration-moving change. The panel also found no
implementation of 14.5a (breakthrough) in `src/sim`; that is unverified here and recorded for
the owner.

### 14.5a Breakthrough Retreat

When a brigade has NO valid retreat destination AND a friendly OSID exists within M hops (M = 3-4):
- Brigade attempts breakthrough toward nearest friendly OSID via deterministic BFS
- Breakthrough: 60% normal power, 20-30% casualties per hop, entrenchment resets
- If blocked: falls back to last stand (class 3)
- If no friendly OSID within M hops: last stand immediately

### 14.6 Equipment conservation

Capture transfers equipment from loser to winner. Equipment may be created by defined external sources (arms smuggling, local production, HV transfers) and destroyed by degradation write-off and battle losses. Total equipment tracks all sources and sinks — no unaccounted creation or destruction. (Updated n905: external acquisition pipelines added as defined creation rules.)

### 14.7 OG personnel conservation

At Operational Group activation, personnel are deducted from donors; at dissolution, personnel are returned.

### 14.8 Phase gating

Brigade operations pipeline steps run only when `meta.phase === "war"`.

### 14.8a Paramilitary formation lifecycle

Paramilitary formations (`kind: 'paramilitary'`) are autonomous short-lived units for rear pocket cleanup. Invariants:
1. Excluded from reinforcement, bot AI targeting, and formation spawn
2. Do not contribute to defended OSID checks
3. Spawning and activity are gated by `PARAMILITARY_FADE_WEEK` (final active week 20); an active paramilitary formation encountered after week 20 dissolves before ETA, casualties, or control effects resolve
4. All iteration deterministic: the attacking faction must meet the local organizational-penetration floor and exceed the controller's local paramilitary penetration; eligible targets rank by attacker paramilitary penetration, party penetration, adjacent friendly support, dominance margin, municipality, and OSID; explicit per-faction and per-municipality turn caps truncate the result without a pseudo-random gate
5. Casualties use standard KIA/WIA/MIA fractions (0.30/0.55/0.15)
6. Control changes emit `control_events` with `mechanism: 'paramilitary'` and are reported separately from battle combat
7. `paramilitary_deployment_count` per faction tracks cumulative deployments
8. A paramilitary request or automatic deployment may target only an undefended OSID. Exact organized defense and organized defense adjacent to the target for its current controller are hard eligibility exclusions; there is no light-defense exception.
9. Rear-pocket graph analysis rejects a connected pocket when organized defense makes it an active military position rather than abandoned rear territory.
10. If organized defense occupies the target after dispatch but before arrival, the paramilitary formation takes retreat casualties, dissolves, and does not change control or inflict defender casualties. Every dissolution sets `status: 'inactive'`, `lifecycle_status: 'disbanded'`, `readiness: 'degraded'`, and personnel to zero.
11. Civilian killings from a paramilitary capture are recorded once in `civilian_casualties`, `displacement_event_log`, and the target municipality's `displacement_state.lost_population`; `last_updated_turn` advances with the population write.
12. **Killed-figure parity (displacement attribution lane, 2026-11-13).** For every writer (takeover, paramilitary sweep, and the live siege path, which books killed 0), the killed recorded into `civilian_casualties[people].killed` equals the killed summed into `displacement_humanitarian_aggregates[*][people].civilian_casualties_caused`. Saves that predate the aggregates are excepted. Pinned by `tests/state/displacement_attribution.test.ts`. Displacement harm is never booked to the side holding a besieged pocket; a causer that cannot be determined is booked to the `_unknown` bucket explicitly, never by falling back to the origin OSID's controller.

### 14.8b Post-paramilitary isolated positions

After the paramilitary lifecycle ends, topology alone must not transfer political control. The production War pipeline does not run `rear-pocket-consolidation`. Isolated enemy positions may inform an ordinary corps operation, but control changes require the existing attack or operation resolver. Operational-purpose classification cannot itself flip control or bypass organized-defense, enclave-protection, centralized RBiH-HRHB combat-permission, timing, or ceasefire guards. Candidate discovery and ordering remain deterministic. The legacy rear-pocket consolidation helper was deleted (2026-11-22, dead code; hash unchanged).

A bounded local occupation may use one available regular brigade after week 20 when the hostile component contains at most six connected OSIDs, the attacking corps holds at least two-thirds of the component's external shared-boundary ring with every remaining ring cell held by a current co-belligerent (the live RBiH↔HRHB alliance above threshold, not a combat, mobilization or ceasefire gate), and the target has no physically present or reachable organized defender. The ring test adds no calendar cutoff and grants no movement, supply or joint-defence capability. Absence from the target's formation roster is insufficient: the combat prediction must account for actual reactive contributors and population-based militia defense, and predict at least a costly victory for the selected brigade. Missing prediction inputs cannot authorize this exception. The brigade must meet normal readiness, same-corps access, commitment and front-staffing rules; local occupation grants no exception to player authority or political and enclave guards. Selection must pair a legal nearby brigade with its target in stable order. The resulting task is an ordinary owned corps operation, with normal movement, attack resolution and capture receipts. This limited purpose does not lower the ordinary offensive force minimum or the existing two-brigade requirement for defended isolated positions.

### 14.9 War movement pipeline order

**osid-column-movement** must run **before** **apply-brigade-movement**. Column movement consumes orders with stance 'column' and must process them first. Violation causes column march orders to be dropped.

An empty, reachable, same-corps front sector is resolved through movement authority rather than a direct location rewrite. T1 may emit one deterministic `sector_reassignment_order` for a legal donor; T2 translates that intent into a column order; T3 moves the brigade along the friendly path on later turns. Donors in an operation, dig-in cycle, elite loan, or active transit are ineligible, line sectors retain a minimum staffing floor, and enclave movement restrictions remain binding. When no legal donor can reach the sector, the derived sector must carry `unstaffed_front: true`; legal isolation is advisory truth, not a teleport exception.

Derived cross-corps consolidation must not strip a small front component from its local corps merely because the corps formation stands behind, rather than exactly on, the boundary edge. An active brigade or operational group physically on the component, or currently operating inside its authored home municipality, protects that corps' local front component from administrative reassignment. Political control remains independent of this derived command ownership.

### 14.10 Bottom-up recruitment in War context

When `state.meta.recruitment_mode === 'bottom_up'`, the turn pipeline **must** run militia emergence, pool population, formation spawn, activate corps, and promote formations steps after the main War steps, regardless of `state.meta.phase`.

### 14.10a Shared recruitment eligibility and autonomy

Recruitment catalog visibility and recruitment application must evaluate the same faction, turn, scenario catalog, control, manpower, capital, equipment, availability, and already-recruited context. A brigade shown as eligible must be accepted under that unchanged context; an ineligible brigade must carry an explicit reason. In player campaigns, automatic recruitment includes the selected player faction at every autonomy level, 0 included (amended 2026-11-25, player-override model, §14.10b; it had excluded them at level 0 since 2026-11-24: HISTORY IF LEFT ALONE, so a hands-off president gets the brigades the headless staff raise; the president keeps the Recruit modal, whose raise applies before the next Advance). The president may hold any of their own not-yet-raised brigades (`recruitment_state.player_held_brigade_ids`, strictCompare-sorted, player faction only); the staff skip a held brigade at every level, the hold costs nothing but the brigade, and a Recruit-modal raise clears it. With no hold the staff pass equals the headless pass, so hands-off live = headless parity holds at every autonomy level. Headless auto-control has no selected-player exclusion.

### 14.10b Player operation-authorization boundary

**Player-override model (owner 2026-11-25: "There should be no drift between live and headless games").** The staff pipeline runs for the selected player faction at every autonomy level, 0 included, exactly as for a bot faction: corps orders, the commander loop and local occupation, brigade orders, Army HQ gathering, posture, prestage, reserve auto-assign, recruitment (§14.10a), officer schedules and operation-opportunity decisions. A live game the president leaves alone is the bot playing their faction. The autonomy level decides only what is surfaced to them, never whether a decision is made. Their explicit act overrides the staff's choice for that one decision: a staged refusal of a staff plan (`player_op_response`, approved false) abandons it before launch; a backing (accept or force-launch) launches it as their act and ends their own presidential hold on that corps (§14.10c); at level 0 an attack order they staged for one of their brigades replaces the staff's order for that brigade only; a recruitment hold, an op halt, an op directive, an authored operation and an appointment act as before. Silence applies the staff's choice on the turn headless applies it, costs nothing, and never ends a hold. At autonomy level 1 a staff plan that names a target is surfaced as an `APPROVE_OP:` review on its `ready` turn; unanswered, it launches on the next turn exactly as headless launches it, and the lapsed review is stamped with the record-only `resolved_by: 'silence'` receipt (the staff proceeded), never as their refusal. A plan with no target, an approved plan whose emission comes out empty, and the standalone local occupation follow the headless lifecycle for their corps; a hold that forbids new plans also forbids a local occupation. The staff decide their operation opportunities (`defaultBotDecisionForOpportunity`) on the turn each becomes eligible, at every level; only an opportunity the staff could not apply stays pending and surfaces as a review at levels 0 and 1, where their explicit decision is consumed first at the start of the next turn. Defensive (T3) opportunities are never put to them. The same rule governs their political decisions: an event decision fired this turn and still unanswered when the turn resumes after `evaluate-events` (the pause before combat) is resolved in that step boundary as the bot's choice (`selectBotEventResponse`), the §6 paramilitary-policy and minority-policy cards included (§14.10e); at a peace plan's close week an unanswered seat gets the plan owner's answer as headless gives it; the Dayton historical-default close-out is computed for the default seat (`DAYTON_DEFAULT_PROPOSER`, RBiH) whoever the player is. Every decision applied by silence leaves one record-only receipt in `meta.proposal_decision_history` (`resolved_by: 'silence'`, `resolveBySilence` in `src/sim/player_override.ts`), written only for a live president and never read by a simulation decision. Under headless auto-control none of this changes behaviour. At every level every other faction's corps plan, launch and run local occupation without waiting on the president. A launched opportunity remains visible with factual decision evidence and the existing Stop-op action when its uniquely bound own operation is in planning or execution (a phase the save reported); otherwise the dossier states the action is unavailable (CODE3, 2026-11-16). No player post-turn catch-all sweep is used. The headless scenario runner sweeps every faction after each turn and has no such gap. Headless auto-control has no selected-player exclusion in corps staff execution and never holds a plan for authorization. The historical-operation authorization path keys on `player_faction` alone and does not consult the headless flag.

*(BC01 implementation status, 2026-09-07 - the existing ruled opportunity boundary is implemented in candidate 3ad5ed25a. Independent Systems and Canon/Process QA reviewed this opportunity-only clarification. BC01 remains ACTIVE: the player endpoint-convergence expectation is unmet and requires explicit owner disposition. This annotation documents behavior, not an acceptance waiver or engine closure. Evidence: [BC01 implementation verification](../40_reports/audits/20260907_BC01_PLAYER_OPPORTUNITY_IMPLEMENTATION_VERIFICATION.md). The September 5 annotation remains historical; its waiver is not the authority for this change.)*

*(BC01 owner disposition, 2026-09-07 — the owner approved closure and merge based on verified operation/decision fixes and explicitly retired similar final territory as a BC01 requirement. The preceding ACTIVE annotation records the earlier assessment. Measured divergence is preserved; convergence is not claimed. No mechanic changes; final calibration remains open.)*

Authored historical operations are outside this boundary at every autonomy level. A pre-planned or triggered operation belonging to the selected player faction must carry an accepted `HISTORICAL_OP:*` authorization before it may hold a slot in `active_operations`; while that authorization is pending the operation is deferred; a declined authorization additionally drops that entry from the corps' operation queue. No autonomy level waives this requirement. Scripted (authored and triggered) operations are not exhaustion-gated; discretionary plans are; exhaustion is a cost; Stop-op is the player's counter, from planning onward (CODE3, 2026-11-16).

*(Amended LANE-PLAYER-OPERATION-AUTHORIZATION, 2026-09-05 — Game Designer ruling; owner waived panel review. Records shipped behaviour; no behaviour change. Reasoning: `docs/plans/2026-09-01-player-opportunity-sweep-gap.md`.)*

*(Amended 2026-11-14, PK1 — the level-1 hold is player-only; behaviour change in the same change. The superseded text read: "At autonomy level 1 a commander-loop plan that would advance to `executing` must be held at `ready`, and must not admit its operations, until an approving player operation response for that exact plan is recorded. The hold is keyed on the campaign's autonomy level, not on the plan's faction: at level 1 it applies to every faction's corps, which is the recorded reason the shipped campaign default is level 2 rather than level 1 (`desktop_sim.ts:331-346`)." The first sentence now names the selected player faction's corps; the second is replaced. That text recorded shipped behaviour, not design intent: the 2026-09-05 amendment wrote down the code as it stood (PROJECT_LEDGER, 2026-09-05: "The Level-1 hold is NOT player-faction-scoped"). Because no approval can come for a bot faction, the code held every non-player faction's commander-generated plans at `ready` and switched off their local occupation while level 1 was in force; authored historical operations still launched. In R8 dry-run run m, an RBiH campaign, 5 RS corps and 1 HRHB corps were held at `ready` and RS launched no bot-generated operation after week 20 (`docs/40_reports/20261114_UNHELD_POCKETS_DIAGNOSIS.md` §8). Code: `isLevel1PlayerApprovalFaction` in `src/sim/bot/staff_control.ts`, used by `applyCommanderOutput` and the local-occupation gate. Headless runs are unaffected (`npm run test:baselines`: all scenarios match). Unanimous Pyrrhic panel: `docs/40_reports/governance/20261114_PK1_LEVEL1_PLAYER_ONLY_PANEL.md`.)*

*(Amended 2026-11-14, L3 + L3b — behaviour change in the same change, owner decision 2 of the command-loop proposal (`docs/40_reports/proposals/20261114_COMMAND_LOOP_PROPOSAL.md` §5B, §5C, §7), approved by the owner on 2026-11-14. Added: defensive-crisis (T3) opportunities are never put to the president and are staff-decided on the bot path at every level (the president had been asked to sign defences, such as "Operation Breza 94 Defense", that a president never signed); and a Level-1 plan whose approval proposal expires unanswered is released instead of held at `ready` (it was held for the rest of the war, could not be re-proposed, blocked new plans and left the force-launch card as its only release; Council finding L8). Delegated (2) is unchanged. Code: `isDefensiveOpportunity` and the two review functions in `src/sim/combat/operation_opportunities.ts`; `planProposalExpiredUnanswered` in the Level-1 guard of `applyCommanderOutput`. Both are live-president only; headless 40-week artifacts are byte-identical to main.)*

*(Amended 2026-11-16, CODE3 canon line — records shipped behaviour; no behaviour change. Added to the paragraph on authored historical operations: scripted (authored and triggered) operations are not exhaustion-gated, discretionary plans are (`MAX_EXHAUSTION_FOR_OPERATION`), exhaustion is booked as a cost, and Stop-op is the player's counter from planning onward. Authority: the Part 5 sitting of 2026-11-15, game-designer and historian each RATIFY WITH CONDITIONS on accepting CODE3 as final (record `docs/40_reports/governance/20261115_FINAL_BEHAVIOUR_AT_1_0.md`, section 1); the condition that a halt be accepted while an operation is in planning was met by #705 (Stop-op offered in planning or execution, and a halt resolves an authored operation); written on the orchestrator's explicit instruction of 2026-11-16. No FORAWWV change.)*

*(Amended 2026-11-25, player-override model (PR-B) — behaviour change in the same change. Owner ruling: "There should be no drift between live and headless games"; integrated ruling of the 2-seat Pyrrhic sitting, game-designer and operations-expert, unanimous (lane C s8, Q1-Q7). Superseded: the level-1 hold of the player's plans at `ready` "until an approving player operation response for that exact plan is recorded"; "Silence releases the plan; it never launches it"; the release of a plan with no target and of an expired proposal; the hold of an approved plan whose emission is empty; the level-1 withholding of the player's local occupation; "At autonomy level 0 the corps staff generates no plan for the selected player faction"; and "At levels 0 and 1 the bot path excludes the selected player faction" for opportunities. Refused by both seats: any Authority charge on silence, launch-blocking or cooling rules, per-site player flags. The §6 group (paramilitary request path, player-only bright-line penalty, HRHB expulsion halt card, paramilitary policy default) is routed to its own panel and unchanged here (ruled and built 2026-11-25: §14.10e). Code: `selectStaffControlledFactions` and `selectManualPlayerFaction` (`src/sim/bot/staff_control.ts`), `applyCommanderOutput` (`commander_loop.ts`), the local-occupation gate (`emit.ts`), `apply-autonomy-transition` and `generate-bot-brigade-orders` (`war_phases.ts`), `applyBotOpportunityDecisions`, `resolvePlayerEventDecisionsBySilence` (`src/sim/events/silence_resolution.ts`), `evaluatePeacePlans`, `resolvePendingDaytonCloseOut`. Tests: `tests/sim/player_override_model.test.ts`.)*

### 14.10c Player stance-matter boundary

Stance matters exist only for a live president: `player_faction` set and `headless_scenario_auto_control` not true. New matters are raised only at autonomy level 2 in the war phase, after `generate-bot-corps-orders` in turn T, for the selected player faction's corps (stance changed against the previous turn's final stance) and Operational Groups (moved into or out of Active Defense). A matter describes a change the commander has already made; nothing defers or replays it. `resolve-stance-matters` runs after `apply-autonomy-transition` and before `generate-bot-corps-orders` in T+1, with no autonomy gate: an unanswered matter changes no simulation state except its own record (`stood`); a confirmed one likewise; a countermand or constraint writes a presidential stance hold. At autonomy 1 the president's answer to a corps stance proposal (accept or decline) writes the same corps `fixed` hold at the stance they chose (the proposed stance or the current one), from that turn, with no Main Staff delay and no cost; its matter id carries the `level1_stance:` prefix. Off level 2, open matters lapse and holds end, except a Level-1 answer's hold while the game stays at autonomy 1. A hold only narrows: it never overrides `reorganize`, the HRHB patron directive ceiling caps it, it lasts four turns from its effective-from turn, it is the last writer of the corps stance in the bot pass and over the AI corps commander, and it caps the combat-effective corps stance; an OG hold yields to a live operation in that OG. The president's own operation order for a held corps ends the hold, and so does their explicit backing of a staff plan for that corps (an accepted `APPROVE_OP:` review or a force-launch, once its operation is admitted; amended 2026-11-25, player-override model, §14.10b). A staff plan launched by silence never ends it. An operation under standing authorization (a pre-planned, queued or triggered operation) never ends it: while a hold keeps the corps at Defensive or below, such an operation waits, not consumed, and may inject once the hold ends (player-override ruling Q5, 2026-11-25). Matters are capped at three per turn, cooled down four turns per corps, and ordered by `strictCompare`; OGs are matched across sector rebuilds by a deterministic front-edge fingerprint. The only state written is `meta.stance_matters`, `meta.stance_matter_history` and `military.stance_matter_state`. Headless and historical runs never reach any writer and stay byte-identical.

*(Added 2026-11-12, posture model option 2. Unanimous Pyrrhic panel: `docs/40_reports/governance/20261112_POSTURE_MODEL_OPTION2_PANEL.md`. Plan: `docs/plans/2026-11-12-posture-model-option2-stance-matters.md`. Code: `src/sim/combat/stance_matters.ts`, `src/sim/combat/stance_matter_holds.ts`. Amended 2026-11-25 (lane C stance round 2, 2-seat panel game-designer + corps-army-commander, unanimous; Q5 by the 2-seat player-override sitting, game-designer + operations-expert, unanimous): the Level-1 answer hold and the standing-authorization wait. Tests: `tests/sim/level1_stance_hold.test.ts`.)*

### 14.10d Player army-clash boundary

Army clashes exist only for a live president (`isLivePresident`) and only for his own faction in the war phase. A clash is raised only from desktop IPC, at the moment the president stages one of four acts (stop an operation, request one, withhold a Level-1 plan, decline an operation opportunity), and only when all three hold: the act crosses the faction's current campaign plan (read only while `valid_until_turn >= turn`: the operation is the plan's main effort or its objectives are the corps' offensive targets; the requested corps is on economy or containment; the withheld plan belongs to a primary corps; the declined opportunity was recommended for approval with every required check green); the army commander's compliance with the act, scored by the A3 formula against the verb it implies (request: press offensive; the others: hold), is short of full (modified, partial or refused; the category is kept as the clash's severity); and the act concerns a corps operation or larger. A crossing the commander fully complies with, or one with no army commander or an acting one, is a `noted` Record line. At most one clash is open per faction; at most four are raised per faction per calendar year; clashes are at least eight weeks apart; anything over the caps is a `not_put` Record line. Caps derive from turns only; no randomness. An open clash is answerable only in the turn it was raised and is advisory: unanswered at Advance it lapses and the order stands as given. Accept stages the army's version instead: for a stop or request it refunds Authority staged for the order; for a withheld plan or declined opportunity it backs the plan at its backing price (10 or 20, Systems Manual §6.4), refused when the balance cannot cover it; Insist leaves the order standing, costs 15 Authority and appends one `override` to the army commander's `recent_overrides` (corps cowing counters are untouched, and the player's own faction is never auto-relieved by it); Replace stages the existing Replace-CO lever for the corps commander who would carry out the order, at its price. Replace never reaches the army commander in 1.0 (owner decision 4). Stance matters are excluded. The war pipeline gains no step. The only state written is `meta.army_clashes`, `meta.army_clash_history` (bounded at 200, sorted by resolved turn then id), `military.army_clash_state`, the staged order the clash concerns and, for Insist, the army commander's override record. No verdict, grade, condemnation or attribution owner reads these fields. Headless and historical runs never reach any writer and stay byte-identical.

*(Added 2026-11-15, command loop L7. Proposal `docs/40_reports/proposals/20261114_COMMAND_LOOP_PROPOSAL.md` §2A step A1; owner decision 4 (2026-11-14): Replace removes only a corps commander in 1.0. The compliance gate is "short of full" per Fable consult 1, appendix A (2026-11-15; `C:/Pyrrhic/AWWV-coordination/fable_consults/1_authority_economy.md`), replacing the proposal's "partial or refused". Code: `src/sim/combat/army_clashes.ts`, `src/desktop/army_clash_ipc.cjs`. Tests: `tests/sim/army_clashes.test.ts`, `tests/ui/army_clash_card.test.ts`.)*

### 14.10e Player §6 boundary (paramilitary policy, minority-expulsion halt)

**Player-override model, the §6 group (amended 2026-11-25; §6 HOW panel, lane C s8, four seats unanimous with guards G1-G5; RB5 nine-seat panel of record and the orchestrator's settlement for H-20).** The sensitive standing decisions follow §14.10b: silence is the bot's choice, on the headless turn, at every autonomy level, and the player's explicit act overrides it.

1. **Paramilitary policy (H-21, H-14).** A human side with no explicit order follows `botParamilitaryPolicy` (the card's decided flag, else its historical default; HRHB, with no card, the earlier allow) at every level, Full Control included, through the same candidate loop, caps and spawn index as a bot (`resolveNonManualParamilitaryPolicy`, `resolveManualParamilitaryOrder`). Explicit acts are the player's own card answer (`decision_source: 'player'`, filed or applied), a review-modal standing order and requests decided one by one; automatic answers never count.
2. **Refusals are durable (G1).** An explicit refusal (Always deny, a refused request, a malformed own record, a refusal filed ahead) is read from persisted records and binds across turns, levels, save/load and faction switches; the standing-order cap and a newer decision for another side may only downgrade an Always allow, to silence. No reader turns a refusal into `ask` and so into an allow.
3. **Full Control requests (G2).** Requests are made only under a Review each the player chose and never while the §6 T3 request gate holds; an undecided request blocks Advance, and one still undecided at the next detection resolves as `botParamilitaryPolicy` with a record-only `resolved_by: 'silence'` receipt and no `paramilitary_decision_history` row.
4. **Cards.** The paramilitary policy cards and the HRHB halt card are resolved by silence like every other event decision (`resolvePlayerEventDecisionsBySilence`); a paramilitary card takes the player's in-person order first (F1-B), and the halt card takes its authored default, so silence never writes the halt flag.
5. **Minority-expulsion halt (H-20).** `hasMinorityExpulsionPolicy` for a human side is `minorityPolicyCardDecision !== 'refused'` (inline; the state layer imports no sim code). A halt on record outranks and persists, and retires every policy wave not yet matured. A filed, unapplied halt is not a decision; a malformed own row is a refusal; an automatic row never is.
6. **Bright line (H-17).** `isBrightLineFaction` is unchanged: the penalty is keyed on the seat, so a staff act under the standing default costs what an explicit act costs. No negotiation-score value feeds simulation state. Attribution of such acts is display only (`authored_by: 'staff_default'` in the UI read model).
7. **Headless.** With no live human seat (`player_faction` unset, or `headless_scenario_auto_control` true) none of this changes behaviour; no new GameState field.

### 14.11 Operation lifecycle and AAR causality

An operation must spend at least one full turn in planning before ordinary execution. After that turn, a prepared or staged operation may execute before `planning_duration` expires, but readiness and attack-executability gates remain binding. `planning_duration` is the deterministic march/preparation and anti-paralysis budget: it bounds how long the operation may wait for assembly, and expiry opens the existing forced-attempt or named-recovery path. `force_launch` remains the sole player-directed readiness bypass. None of these transitions grant brigades independent attack authority; attacks still require an executing `CorpsOperation`.

An authored `minimum_viable_participants` is operation lifecycle state, not catalog-only metadata. Construction must persist it and every later viability reevaluation must honor it, clamped to at least one. When absent, the operation-type default applies. This permits an explicitly authored local one-formation action without weakening the generic multi-formation floor.

Operation truth is projected from active operations and raw operation history into labeled `proposed`, `planning`, `executing`, `recovery`, `completed`, and `archived` counts. Active and history rows require stable IDs; every raw history row must be visible or have an explicit exclusion reason. Player-generated operations follow the same projection.

An operation AAR may credit an objective as captured only when an attack-backed weekly receipt causally records that capture. Holding an objective at operation close is not capture evidence. A zero-attempt AAR is always graded one star as `No Assault Attempted`; elapsed duration grants neither a star bonus nor a duration-efficiency score without action. An advance verdict requires at least one causally captured objective. The ending-force-versus-start factor is bounded to `[0, 100]`, so reinforcement growth cannot produce an impossible preservation score above 100. The operational ledger owns complete lifecycle and archive truth; narrative chronology may derive exactly one entry for each visible completed operation but may not become a second ledger or invent a second completion receipt.

## 15. Officer System Invariants

### 15.1 Officer Succession

Officers depart via `available_until_turn`. When an officer's turn arrives:
- **Player faction:** Creates a `replacement_suggested` pending event. The officer is NOT auto-retired. The player must acknowledge the event and choose to accept the suggested successor or keep the current officer.
- **Bot factions:** Auto-succession via `findHistoricalSuccessor()`.

Historical successor recommendations are deterministic (lookup by corps + faction + turn).

**Corps schedule (2026-11-14, command-loop §5E):** when `data/scenarios/corps_co_roster.json` has a tenure in force for a corps, that holder fills the corps before any pool ranking and replaces a fallback holder at his tenure start. The schedule never rotates out a commander the President appointed (`co_replacement_record`), accepted or kept (`officer_decision_history`), and never swaps or transfers a manually controlled player's commander (it raises a replacement matter). An officer recorded as surviving the war accrues no casualty-exposure clock. The mechanism is faction-symmetric and is a no-op with an empty schedule.

### 15.2 War Crimes Records

`war_crimes_record` on NamedOfficer is **informational only**. It NEVER affects gameplay mechanics: no morale penalty, no combat modifier, no AI decision weight. It exists solely for historical annotation.

### 15.3 Enclave Lock

`NamedOfficer.enclave_lock` constrains officers to specific enclaves. Enclave-locked officers cannot be assigned to operations outside their enclave.

### 15.4 Operation Commander

Named officers from the reserve pool command operations. During execution, participating brigades use the operation commander's modifier instead of the corps commander's. Selection priority: regional match -> competence -> aggressiveness.

## 16. Elite Loan Invariants

### 16.1 Elite Status

Elite brigades maintain `is_elite: true` on the formation definition. Elite status confers:
- Home distance floor of 0.85 (vs 0.70 for standard brigades)
- Eligibility for Army HQ reserve pool loan

### 16.2 Loan Lifecycle

Loan state is tracked via `EliteLoanState` on the formation:
- Loans are operation-tied and have no fixed expiry: a healthy brigade remains until its supported operation concludes, the player recalls it, or a recall trigger applies.
- For ordinary loans, recall triggers are personnel falling below 70% of loan-start strength, morale below 35, or cohesion below 25.
- While an elite is authored for a historical operation in planning, execution, or recovery in its receiving corps, those casualty, morale, and cohesion recalls are deferred until that operation releases it.
- Personnel falling below 50% of loan-start strength is never deferred: it immediately sets `permanently_degraded` and recalls the brigade. A permanently degraded brigade cannot be loaned again.
- Cooldown of `ELITE_LOAN_COOLDOWN = 4` turns between loans.
- Minimum loan duration: `ELITE_LOAN_MIN_DURATION = 6` turns before voluntary recall.

### 16.3 Permanent Degradation

If personnel drops below 50% of loan-start personnel, `permanently_degraded` is set to `true`. A permanently degraded brigade:
- Cannot be loaned again
- Retains its formation but loses elite loan eligibility

## 17. Legitimacy and Control Extensions

- Legitimacy is distinct from political control and authority; control does not imply legitimacy.
- Legitimacy must never increase as a direct consequence of military success.
- Authority consolidation requires control and sufficient legitimacy; low legitimacy caps authority at Contested.
- Legitimacy erosion is easier than recovery and must be gradual and deterministic.

## 18. Final Meta-Assertion

No invariant may be bypassed or relaxed for balance, usability, or player convenience. If enforcement produces an unfavorable outcome, the outcome is correct.

## Appendix A: Removed Systems

The following systems have been fully removed from the codebase and must not be re-introduced:

| System | Removed | Replacement |
|---|---|---|
| **Zone of Control (ZoC)** | 2026-03-02 | Local front density (`local_front_defense.ts`), `BRIGADE_OPERATIONAL_FRONTAGE_CAP=48` |
| **Area of Responsibility (AoR)** | 2026-03-04 | `location_osid` only; corps sectors for territory assignment |
| **Phase I / Phase II terminology** | 2026-03-07 | **Peace** phase and **War** phase | <!-- legacy-phase-term-ok -->
| **Independent brigade attacks** | n500 | Ops-only attack via `CorpsOperation` (see 6.3) |
| **Brigade destruction in combat** | n500 | `forceRetreatWithPenalties()` (see 6.2) |
| **Sector coverage penalty** | n500 | Unified sector defense (see 6.5) |
| **OSID adjacency walk (sector building)** | n532 | Triple-junction connectivity (`buildEdgeAdjacency`) |
| **Density equalization** | n403 | Corps-driven brigade assignment with home-municipality affinity |

## Appendix B: Version History

- **v0.9.0** (2026-05-05): Filename + body version-bump pass. §6.2.4 morale-collapse override (LANE-NIGHTSHIFT-N4-CANON-AMENDMENT, commit `58624617`, 2026-05-03; gated behind `MORALE_OVERRIDE_ENABLED`, default false; counter increments diagnostically with flag off). v0.8 Command Chain integration: §15 Officer System covers named-officer succession, AI commander intelligence, Phase 0 panel pattern, replay-buffer streaming, Tier 2 perf integration. References to `equipment_quality_modifier` substrate (Wave 3, commit `658241df`) and the `must_hold` variable multiplier substrate (R2-1, commit `e4c661d5`) become normative wherever they were already implementation-noted in supporting docs. No invariant relaxed; no new invariant added beyond the morale-collapse override clause.
- **v0.7.0** (2026-03-15): Brigade no-destruction, ops-only attack, officer succession, cold front, elite loan invariants. Removed Systems appendix. Enclave/Sarajevo detail. Morale retreat resistance floors.
- **v0.7.3**: Single-phase (War only) model. Peace phase and Phase 0 removed.
- **v0.6.0**: Two-phase (Peace/War) model. Purged Phase I/II terminology. <!-- legacy-phase-term-ok -->
- **v0.5.0**: OSID model, supply reserves (retired 2026-11-17), paramilitary lifecycle.

---

*Engine Invariants v0.9.0 -- Single-phase (War only) model, corps-driven operations, v0.8 Command Chain + v0.9 product-spine substrate amendments folded in.*
