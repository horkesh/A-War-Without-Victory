# A War Without Victory -- Phase I Specification v0.4.0

## Scope and inheritance
This document **supersedes** the prior Phase I Specification and incorporates all earlier Phase I rules by reference unless explicitly overridden or extended below.

## v0.4 Additions

### Contested control effects (System 11)
- control_status modifies early-war flip resistance and authority initialization.
- HIGHLY_CONTESTED areas may be eligible for rapid flips after declaration rules.
- SECURE areas require sustained pressure to flip; CONTESTED areas are primary early-war pressure targets.

### Legitimacy initialization (System 4)
- Legitimacy is initialized from demographic alignment, institutional authority, and control_status.

### Tactical doctrines and progression (Systems 9-10)
- Posture eligibility is constrained by early-war capability progression and supply.
- Doctrines must not bypass Phase I prohibitions (no AoR, no fronts).
- Doctrine availability must be re-evaluated each turn as capability and supply shift.

### AoR prohibition (System 8)
- AoR assignment remains prohibited throughout Phase I.

### Early-war municipality flips and displacement (Phase I §4.3–§4.4)

**Control flips (§4.3):** Municipality-level control changes in Phase I use the early-war flip formula only (stability + defensive militia vs attacking militia). No fronts or AoR; flip eligibility requires adjacent hostile control and sufficient attacker strength. Post-flip: consolidation period, stability lockdown, militia strength reset per controller/lost. Large-settlement muns may be ineligible when defender has no formation (MILITIA_BRIGADE_FORMATION_DESIGN §5).

**Implementation-note (2026-02-13 canonical runtime path):** Scenario harness canonical runs now disable Phase I control flips and start historical scenarios in `phase_ii` with deterministic initialization. For Apr-1992 historical starts, canonical scenarios keep `init_control_mode: "ethnic_1991"` and apply deterministic early-war pressure calibration in Phase II to represent asymmetric external support. In this path, political control changes are resolved only by Phase II attack-order resolution. The §4.3 formula remains documented for legacy/reference paths and historical test fixtures.

**Implementation-note (non-canon extension tracking):** Current code includes an optional `coercion_pressure_by_municipality` input that can reduce the effective flip threshold in implementation. This is tracked as implementation detail and ledgered; it is not normative v0.4 canon behavior unless promoted by formal canon addendum.

**Implementation-note (capability-weighted flip):** Implementation may scale attacker and defender effectiveness in the flip formula by faction capability (Systems Manual Appendix D). Capability modifiers are applied deterministically by faction doctrine (e.g. ATTACK for attacker, DEFEND for defender). This extension is tracked as implementation detail and ledgered; it is not normative v0.4 canon unless promoted by formal canon addendum.

**Implementation-note (formation-aware flip):** Implementation may include formation strength (personnel in formations whose home municipality is in an adjacent mun or in the defended mun) in the Phase I flip formula—attacker strength = militia + formation strength in adjacent muns; defender effectiveDefense = militia (+ allied) + formation strength in the defended mun. This reflects JNA/early RS historical fidelity (RS had heavy brigades from the start; RBiH holds where it has forces). Tracked as implementation detail; not normative v0.4 canon unless promoted by formal canon addendum.

**When persons become displaced (Phase I §4.4):** Displacement is **initiated** when a municipality flips and Hostile_Population_Share (share of population aligned with the **losing** faction) exceeds 0.30. Once initiated for that mun in that turn:
- A one-time displacement is applied: a portion of the population aligned with the losing faction is displaced out of the municipality.
- Displaced are routed to municipalities still controlled by the losing faction (friendly to the displaced); killed and fled-abroad fractions apply when 1991 census is available (same constants as Phase II).
- State updated: `displacement_state` (displaced_out at source, displaced_in at destinations, lost_population, displaced_in_by_faction when census exists). No further Phase I displacement from that mun for the same flip event.

**Phase II displacement:** Persons also become displaced in Phase II when front-active settlements accumulate displacement from conflict intensity and pressure (front-active + pressure deltas, unsupplied pressure, encirclement, breach persistence). Phase II uses the same `displacement_state` and routing/killed/fled-abroad rules. Tracking is authoritative: displaced_out, displaced_in, lost_population, displaced_in_by_faction (ethnicity-traced when census provided).

### RBiH-HRHB relationship (Phase I §4.8)

**State:** `phase_i_alliance_rbih_hrhb` (optional number in [-1, 1]). High = cooperative; low = hostile. When absent, implementation must treat the relationship as allied (see threshold below). Additional bilateral state tracked in `rbih_hrhb_state` (RbihHrhbState).

**Semantics:**
- Value > **allied threshold** (0.2): RBiH and HRHB are **allied**. They do not count as hostile neighbors for flip eligibility; neither can be the attacker in the control-flip formula against the other. No RBiH-HRHB control flips.
- Value <= threshold: RBiH and HRHB are **hostile**. Normal flip rules apply; either can flip the other's control.

**Initialization:** Scenario or Phase I init may set an initial value (e.g. April 1992 = 0.35 for a fragile but allied start). If unset, behaviour is allied (as when above threshold).

**Alliance strain (deterministic update):** Each turn, the alliance value is updated by a deterministic formula driven by: (a) RBiH appeasement (+APPEASEMENT_BASE_RATE per turn when no bilateral incidents), (b) HRHB patron pressure (-PATRON_PRESSURE_COEFF * HRHB patron_commitment per turn), (c) bilateral incident penalty (-INCIDENT_PENALTY_PER_FLIP per RBiH-HRHB control flip from previous turn), and (d) ceasefire recovery (+CEASEFIRE_RECOVERY_RATE per turn when ceasefire active). All constants are tunable and version-controlled; no randomness.

**Relationship phases (threshold-based):**
- Value > 0.50: **Strong alliance** (full coordination, joint defense bonus vs RS).
- Value (0.20, 0.50]: **Fragile alliance** (no flips, weakened coordination).
- Value (0.00, 0.20]: **Strained** (flips enabled, no coordination bonus, tensions).
- Value [-0.50, 0.00]: **Open war** (minority militia erosion begins in mixed muns).
- Value < -0.50: **Full war** (max pressure, formation displacement in mixed muns).

**Municipalities with allied presence:** Some municipalities historically had both RBiH and HRHB formations (e.g. Travnik, Novi Travnik, Vitez, Bugojno, Mostar, Kiseljak, Busovaca). Control remains a single controller per settlement. When the relationship is allied, both factions may have formations and pool/spawn in the same mun; `rbih_hrhb_state.allied_mixed_municipalities` tracks these muns dynamically. When RS attacks a mixed mun and the alliance is above ALLIED_THRESHOLD, the allied faction's militia contributes to defense (scaled by ALLIED_COORDINATION_FACTOR = 0.6).

**Open war and minority erosion:** When the value crosses below HOSTILE_THRESHOLD (0.0), minority faction militia in mixed municipalities erodes at MINORITY_EROSION_RATE_PER_TURN (0.10). Formations in enemy-controlled muns lose supply, cannot reinforce, and are displaced when minority militia drops below MINORITY_VIABLE_THRESHOLD (50).

**Implementation-note (earliest RBiH–HRHB open war):** For historical fidelity (ARBiH/HVO did not fight open war before October 1992; BB + OOB research), implementation may gate the earliest turn when RBiH–HRHB open war can begin (bilateral flips, war_started_turn, alliance below ALLIED_THRESHOLD). Scenario field `rbih_hrhb_war_earliest_week` and state `meta.rbih_hrhb_war_earliest_turn` (default 26 for April 1992 start = first week of October 1992). Before that turn, RBiH and HRHB are treated as allied for flip and alliance-update purposes. Tracked as implementation detail; not normative unless promoted by canon addendum.

**Bilateral ceasefire (precondition-driven):** The RBiH-HRHB ceasefire fires when ALL preconditions are met: (C1) war duration >= CEASEFIRE_MIN_WAR_DURATION turns since `war_started_turn`, (C2) HRHB exhaustion > CEASEFIRE_HRHB_EXHAUSTION, (C3) RBiH exhaustion > CEASEFIRE_RBIH_EXHAUSTION, (C4) stalemate >= CEASEFIRE_STALEMATE_MIN consecutive turns with zero bilateral flips, (C5) IVP negotiation_momentum > CEASEFIRE_IVP_THRESHOLD, (C6) HRHB patron_state.constraint_severity > CEASEFIRE_PATRON_CONSTRAINT. Ceasefire freezes bilateral flips, begins alliance recovery, halts minority erosion, and redirects bot targeting to RS.

**Washington Agreement (precondition-driven):** The Washington Agreement fires when ALL preconditions are met: (W1) ceasefire active, (W2) ceasefire duration >= WASH_CEASEFIRE_DURATION turns, (W3) IVP negotiation_momentum > WASH_IVP_THRESHOLD, (W4) HRHB patron_state.constraint_severity > WASH_PATRON_CONSTRAINT, (W5) RS territorial control share > WASH_RS_THREAT_SHARE, (W6) combined RBiH + HRHB exhaustion > WASH_COMBINED_EXHAUSTION. When fired: alliance set to WASH_ALLIANCE_LOCK_VALUE (0.80) and locked; HRHB capability profiles shift to post-Washington values (equipment_access 0.65, croatian_support 0.90); HRHB embargo enhanced (external_pipeline_status 0.85); COORDINATED_STRIKE "HV coordination enabled" flag set; joint operations against RS receive POST_WASH_JOINT_PRESSURE_BONUS (1.15); mixed municipalities restored to joint status.
