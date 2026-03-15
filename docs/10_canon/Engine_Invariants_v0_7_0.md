# A War Without Victory -- Engine Invariants v0.7.0

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

**Supply Reserves (Phase A):** Faction-level reserves (`general_supply_reserve`, `heavy_munitions_reserve` [0..100]) implement the "recovery slower than degradation" invariant: maintenance drain (0.035 per formation per turn) and combat expenditure (per-battle deduction) continuously consume reserves; production income replenishes at a bounded rate. Reserve depletion degrades the effective supply state even when OSID reachability is adequate (reserve < 50 -> strained; reserve < 20 -> critical). Gated by scenario flag `supply_reserves_enabled`.

**Siege, Replenishment, Enclave Hardening (Phase B+C):** Phase B extends reserves with escalating siege drain, patron aid income, and embargo reduction. Phase C adds enclave hardening: after 8+ consecutive isolation turns, enclaves gain a +5% defense bonus; enclave resilience reduces exhaustion accumulation. Production facility combat damage degrades output over time. All gated by `supply_reserves_enabled`.

## 5. Settlement Stabilization Invariants

- Newly captured settlements must enter a stabilization state
- Stabilization increases reversal probability and authority penalties
- Additional exhaustion applies if supply is below Adequate

## 6. Front and Combat Invariants

- Fronts may only exist where sustained opposing control meets (hostile OSID adjacency).
- Static fronts must increase exhaustion and defensive hardness together.
- **No single resolution flips more than one OSID.** One attack -> one target OSID; control flip at most for that OSID.

### 6.1 Defense of Unoccupied OSIDs

Unoccupied OSIDs adjacent to friendly brigades have militia-only defense. Frontage constraint is enforced by `BRIGADE_OPERATIONAL_FRONTAGE_CAP=48`. Local front density modifier (`local_front_defense.ts`) applies `THIN_FRONT_THRESHOLD=0.5` / `MIN_COVERAGE_PENALTY=0.6` to defender power when brigades are sparse.

### 6.2 Brigade No-Destruction Invariant

**Brigades are NEVER destroyed in combat.** All five historical destruction paths have been replaced by `forceRetreatWithPenalties()`:

- `EMERGENCY_RETREAT_PERSONNEL_RETAIN = 0.60` (40% personnel loss)
- `COHESION_LOSS = 20`
- `DISRUPTED_TURNS = 3`
- Retreat destination: `home_osid` -> `fallback_osid` -> corps HQ -> any friendly OSID

**Dissolution** is the only removal mechanism: requires 2-of-3 criteria (personnel < 400, cohesion <= 20, morale <= 15). Enclave brigades require 3-of-3. Absolute floors (150 personnel, enclave 50) count as "low personnel" but do NOT bypass the criteria check. On dissolution: equipment transferred to nearest same-corps brigade (70% salvaged); personnel to strategic reserve (50%).

### 6.3 Ops-Only Attack Invariant

**No brigade attacks independently.** All offensive combat flows through `CorpsOperation`. Brigades do not evaluate independent attack targets.

**Sole exception:** Counter-attacks to retake a just-lost position are permitted at brigade level.

Pioneer attacks seed with threshold `repulsed`; subsequent brigades join via `estimateConcentratedOutcome()`.

### 6.4 Cold Front Invariant

RS-HRHB fronts under the Graz Accords are exempt from:
- Frontline attrition (passive personnel drain)
- Bombardment firepower

`isColdFront()` in `frontline_attrition.ts` determines cold front status. HRHB siege drain is also skipped on cold fronts. Player break of the accords applies +0.25 aggression to the opponent for 6 turns.

### 6.5 Unified Sector Defense

Defense at any OSID = `totalPower * (1/sector_edges) * densityMod`. No brigade-at-OSID vs sector-coverage distinction -- the front is a continuous locked line. Casualty distribution: distance-weighted proportional (decay `0.60^hops`, max 5 hops) with home-municipality motivation bonus (1.3x).

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

### 9.7 Null Political Control

A settlement may have political_controller = null only if:
- No faction exercises credible authority
- The condition is initialized deterministically
- No automatic reassignment occurs without authorized mechanisms

### 9.8 War Phase OSID-Only

In War phase, brigade location is **location_osid** only; no settlement-level territorial assignment. Control change only via attack resolution or corps/frontline operations. All OSID-keyed state must use stable ordering (`strictCompare`, sorted keys) in iteration and output.

**Formation location-in-control:** Every active formation with `location_osid` set must be in an OSID controlled by that formation's faction. Enforced by: pipeline step `displace-enemy-territory` (after attack resolution); scenario runner initial-state displacement after backfill; validation `validateBrigadeLocationControl`. OOB `home_osid` must be faction-controlled at scenario start.

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

## 11. Determinism Invariants

### 11.1 No Randomness

No `Math.random()`, no seeded PRNGs, no non-deterministic iteration. All simulation logic, validators, derived artifacts, and UI export paths must be fully deterministic.

### 11.2 No Timestamps

No `Date.now()`, no time-based IDs in derived artifacts or serialization.

### 11.3 Stable Ordering

All iteration over collections that affect outputs must use stable ordering via `strictCompare`. This applies to: OSID iteration, brigade evaluation order, sector construction, retreat destination selection, and all serialization.

### 11.4 Reproducibility

All state variables must be serializable. Save/load must fully reconstruct world, faction, municipality, formation, and front states. Identical inputs must produce identical outputs across runs.

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
- Faction-specific morale retreat resistance floors: RBiH=50, RS=70, HRHB=60.

### 14.4 Brigade location (OSID)

**Every brigade has a valid location_osid.** Control changes only via attack resolution or corps/frontline operations (no passive pressure flip).

### 14.5 Retreat determinism

When a defender retreats, valid destinations are chosen deterministically. **Tie-break:** enemy adjacency count ascending (prefer rear), then OSID string sort (stable ordering).

**Retreat destination classes (priority order):**
1. **Friendly OSID** (safe rear retreat) -- by enemy adjacency count ascending, then OSID sort
2. **Breakthrough to friendly** (cut-off brigade escapes through hostile territory; see 14.5a)
3. **Last stand** (no retreat possible -- defenderPower x 1.5, casualty multiplier x 2)

Note: per 6.2, "last stand" results in forced retreat with penalties, not destruction.

### 14.5a Breakthrough Retreat

When a brigade has NO valid retreat destination AND a friendly OSID exists within M hops (M = 3-4):
- Brigade attempts breakthrough toward nearest friendly OSID via deterministic BFS
- Breakthrough: 60% normal power, 20-30% casualties per hop, entrenchment resets
- If blocked: falls back to last stand (class 3)
- If no friendly OSID within M hops: last stand immediately

### 14.6 Equipment conservation

Capture transfers equipment from loser to winner; total equipment is conserved minus degradation (no creation or destruction except by defined degradation/capture rules).

### 14.7 OG personnel conservation

At Operational Group activation, personnel are deducted from donors; at dissolution, personnel are returned.

### 14.8 Phase gating

Brigade operations pipeline steps run only when `meta.phase === "war"`.

### 14.8a Paramilitary formation lifecycle

Paramilitary formations (`kind: 'paramilitary'`) are autonomous short-lived units for rear pocket cleanup. Invariants:
1. Excluded from reinforcement, bot AI targeting, and formation spawn
2. Do not contribute to defended OSID checks
3. Spawning gated by PARAMILITARY_FADE_WEEK (week 20)
4. All iteration deterministic (sorted by formation ID via `strictCompare`; spawn probability via deterministic hash)
5. Casualties use standard KIA/WIA/MIA fractions (0.30/0.55/0.15)
6. Control changes emit `control_events` with `mechanism: 'combat'`
7. `paramilitary_deployment_count` per faction tracks cumulative deployments

### 14.9 War movement pipeline order

**osid-column-movement** must run **before** **apply-brigade-movement**. Column movement consumes orders with stance 'column' and must process them first. Violation causes column march orders to be dropped.

### 14.10 Bottom-up recruitment in War context

When `state.meta.recruitment_mode === 'bottom_up'`, the turn pipeline **must** run militia emergence, pool population, formation spawn, activate corps, and promote formations steps after the main War steps, regardless of `state.meta.phase`.

## 15. Officer System Invariants

### 15.1 Officer Succession

Officers depart via `available_until_turn`. When an officer's turn arrives:
- **Player faction:** Creates a `replacement_suggested` pending event. The officer is NOT auto-retired. The player must acknowledge the event and choose to accept the suggested successor or keep the current officer.
- **Bot factions:** Auto-succession via `findHistoricalSuccessor()`.

Historical successor recommendations are deterministic (lookup by corps + faction + turn).

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
- Loans are op-tied (no fixed expiry). Brigade stays until operation concludes, player recalls, or forced recall triggers.
- Forced recall triggers: >= 30% casualties from loan start, morale < 35, or >= 50% personnel loss.
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
| **Phase I / Phase II terminology** | 2026-03-07 | **Peace** phase and **War** phase |
| **Independent brigade attacks** | n500 | Ops-only attack via `CorpsOperation` (see 6.3) |
| **Brigade destruction in combat** | n500 | `forceRetreatWithPenalties()` (see 6.2) |
| **Sector coverage penalty** | n500 | Unified sector defense (see 6.5) |
| **OSID adjacency walk (sector building)** | n532 | Triple-junction connectivity (`buildEdgeAdjacency`) |
| **Density equalization** | n403 | Corps-driven brigade assignment with home-municipality affinity |

## Appendix B: Version History

- **v0.7.0** (2026-03-15): Brigade no-destruction, ops-only attack, officer succession, cold front, elite loan invariants. Removed Systems appendix. Enclave/Sarajevo detail. Morale retreat resistance floors.
- **v0.6.0**: Two-phase (Peace/War) model. Purged Phase I/II terminology.
- **v0.5.0**: OSID model, supply reserves, paramilitary lifecycle.

---

*Engine Invariants v0.7.0 -- Two-phase (Peace/War) model, corps-driven operations.*
