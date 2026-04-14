# Design Gate Resolutions And Ungating

**Date:** 2026-04-14  
**Status:** DESIGN DECISIONS LOCKED FOR PACKETIZATION  
**Purpose:** Resolve the major design-gated roadmap seams into explicit contracts so they can be handed to Claude as bounded packets instead of lingering as vague blockers.

---

## 0. What this document does

This document does **not** claim that every formerly blocked lane is now ready for one giant implementation sprint.

It does something more useful:

- names the canonical owner for each gate
- chooses the product architecture boundary
- says what is now implementable
- says what remains intentionally forbidden or deferred

The result is that these lanes are no longer blocked by missing design decisions.
They are now blocked only by ordinary sequencing, proof, and packet discipline.

---

## 1. Resolution table

| Gate | Root problem | Resolution | What is now unblocked |
|---|---|---|---|
| Stranded brigade lifecycle | No canonical owner for same-faction unreachable brigades after they lose sector truth and movement truth | Add an explicit stranded-brigade lifecycle owner and state machine | bounded engine packet(s) for isolated holding, degradation, reconnection, collapse |
| Consequence system | Old plan too broad; sensitive and non-sensitive consequence work mixed together | Split into substrate, pressure/peace consequences, non-sensitive divergence chains, sensitive-history rupture chains | consequence substrate audit, pressure consequences, early-peace bridge, first non-sensitive divergence chain |
| Victory / Pyrrhic scoring | Termination, judgment, and comparison are blurred together | Separate war termination from endgame judgment from historical comparison | verdict packet, outcome taxonomy, scenario contract alignment, weight tuning |
| Sensitive history | No explicit boundary between simulation, consequence, narrative, and forbidden gamification | Use a three-ring model: mechanical precursors, locked rupture consequences, post-hoc reckoning | constrained implementation of Srebrenica/cost-ledger/comparison without turning atrocity into a toy system |
| Dayton trigger / adapter side effect | UI adapter read path is mutating/initiating negotiation logic | Move trigger ownership into pipeline/state; adapter becomes pure reader of persisted `pending_dayton` | new pipeline step, persisted pending packet, save/load-safe Dayton modal |

---

## 2. Stranded Brigade Lifecycle

### Decision

The project should treat same-faction unreachable brigades as an explicit **stranded lifecycle**, not as a lingering anomaly bucket and not as a movement-order special case.

### Canonical owner

A dedicated simulation owner should maintain stranded lifecycle truth after final sector reconciliation and after stale movement ownership is cleared.

Recommended owner shape:

- pipeline step: `update-stranded-brigade-lifecycle`
- authority inputs:
  - live brigade location
  - same-corps sector reachability
  - reachable friendly path home
  - active operation ownership
  - enclave membership / enclave-safe exclusions

### Behavioral contract

When a brigade is:

- active
- same-faction
- not under a live sector owner
- not in an active operation
- and has no reachable friendly path to same-corps sector space or home

it enters `stranded`.

While stranded:

- it defends in place if attacked
- it does not launch new operations
- it does not receive ordinary reinforcements
- it degrades slowly and deterministically
- it can recover only through reconnection to friendly reachability

### Chosen state machine

Use a narrow persisted state machine, for example:

- `none`
- `holding`
- `reconnected`
- `collapsed`

with persisted timing fields such as:

- `stranded_since_turn`
- `last_reachable_turn`
- `stranded_resolution`

### Explicit rejection

Do **not** auto-generate breakout marches.

That would create fake agency, strange pathfinding, and a much broader doctrine subsystem than this lane needs.

### Relationship to enclaves

Hard-coded enclave systems remain their own owner.

Stranded-brigade lifecycle is for formations that have fallen out of live ownership truth outside those canonical enclave contracts.

### What is now unblocked

- a bounded engine packet for stranded state + degradation + reconnection
- a bounded UI/reporting packet for player-visible stranded status

### What remains intentionally blocked

- dynamic new enclave creation as a generic pocket system
- broad breakout AI

---

## 3. Consequence System

### Decision

The consequence system is no longer gated as one monolithic feature.

It is split into four layers:

1. **substrate audit and owner map**
2. **pressure / exhaustion / peace-response consequences**
3. **non-sensitive divergence chains**
4. **sensitive-history rupture chains**

### Canonical owner rule

Consequence work must attach to already-real state and political systems first:

- negotiation pressure
- war exhaustion
- patron pressure
- peace plan history
- strategic dimensions
- event flags / event modifiers

Do not invent a parallel “consequence engine” when the existing political and event systems already own the inputs.

### Chosen implementation order

1. consequence substrate audit
2. complete pressure consequences for all factions, not just RS
3. early-peace / shortened-war bridge
4. one non-sensitive divergence chain at a time
5. sensitive-history rupture chains under the sensitive-history contract below

### Effect-type rule

Do not add broad new effect kinds pre-emptively.

New effect kinds are justified only when the first real packet proves that existing:

- dimension shifts
- event flags
- patron relationship changes
- peace-plan history
- pending review / snap-event surfaces

cannot express the consequence honestly.

### What is now unblocked

- consequence substrate audit
- pressure-floor / peace-response symmetry
- early-peace consequence bridge
- first non-sensitive divergence chain

### What remains intentionally blocked

- the old seven-chain mega-sprint as one implementation lane
- any sensitive-history chain that violates the boundary model below

---

## 4. Victory / Pyrrhic Scoring

### Decision

The project should explicitly separate:

1. **termination** — how the war ends
2. **judgment** — how that end state is assessed
3. **comparison** — how the player war differs from the historical war

These are related, but they are not the same system.

### Canonical owner split

#### Termination owner

`evaluateVictoryConditions()` and `checkWarTermination()` own **scenario-specific or hard-stop termination** only.

They answer:

- does the war end now?
- by what trigger?

They do **not** own the final political/moral verdict.

#### Judgment owner

`computeFullVerdict()` should evolve into the canonical **endgame verdict packet**.

It answers:

- what kind of outcome this was
- who survived
- what was gained
- what was lost
- what costs cap or taint the result

#### Comparison owner

`v0.9.1` endgame comparison remains a mirror surface layered on top of the verdict packet.

It is not the scoring authority.

### Chosen verdict model

The verdict packet should lead with explicit outcome classes, not a naked number.

Recommended minimum class set:

- `survival`
- `strategic_success`
- `negotiated_escape`
- `pyrrhic_success`
- `hollow_victory`
- `failure`
- `collapse`

### Score authority rule

The Pyrrhic score is supporting structure, not sovereign truth.

It may summarize multi-axis state, but it must never be allowed to paper over:

- condemnation flags
- collapse
- catastrophic civilian cost
- sensitive-history rupture flags

### What is now unblocked

- outcome taxonomy packet
- verdict packet packet
- scenario victory contract alignment
- weight/threshold tuning after verdict packet contract

### What remains intentionally blocked

- any scoring rule that treats atrocity or genocide as merely another compensable optimization input

---

## 5. Sensitive History

### Decision

Sensitive-history implementation is now governed by a **three-ring model**.

### Ring 1 — Mechanical precursors are allowed

The simulation may continue to model and expose:

- enclave integrity
- displacement
- atrocity visibility / war-crimes-related accumulators
- patron pressure
- international standing collapse
- peace and intervention triggers

These are systemic war truths and are appropriate engine substrate.

### Ring 2 — Rupture events are locked consequences, not toys

The project may represent Srebrenica and comparable atrocities only as:

- historically named rupture events
- triggered from war-state conditions
- one-way consequence records
- patron / standing / narrative shocks
- endgame condemnation inputs

They are **not** to be surfaced as:

- player-issued atrocity commands
- optimization mini-games
- branchy “best massacre” decision trees
- score-positive levers

### Ring 3 — Reckoning happens in narrative and verdict surfaces

The Cost Ledger, divergence notes, Codex essays, and endgame comparison may state:

- what happened
- what did not happen compared to history
- what the human and political cost was

This is where detailed historical and moral reckoning belongs.

### Srebrenica-specific rule

The **fall of the enclave** may remain part of ordinary military simulation truth.

The **genocide aftermath** must be represented only as:

- a locked rupture consequence
- a condemnation flag
- strategic/patron/international shock
- cost-ledger and comparison material

not as a player-tuned mechanical optimization surface.

### Language rule

Where the implementation names genocide, massacre, execution, or atrocity, the wording should be:

- historically grounded
- specific
- restrained
- non-promotional

### What is now unblocked

- a constrained Srebrenica rupture packet
- cost-ledger schema and historical comparison packet
- sensitive-history-aware consequence packets

### What remains intentionally blocked

- any system that turns atrocity into an efficient tactic puzzle
- freeform “what if genocide but cleaner” branch design

---

## 6. Dayton Trigger / Adapter Side Effect

### Decision

Dayton initiation must move out of the adapter read path and into canonical simulation/state ownership.

The UI adapter should only read `pending_dayton`, never decide whether to start Dayton.

### Canonical owner

Use a persisted pending packet, for example on negotiation state:

- `pending_dayton`

with fields like:

- `initiated_turn`
- `trigger_reason`
- `territorial_packages`
- `institutional_packages`
- `faction_capital_snapshot`
- `patron_override_snapshot`

### Step ownership

Add a pure trigger predicate plus one mutating pipeline step:

- `shouldInitiateDayton(state)` — pure
- `check-dayton-trigger` / `begin-dayton-negotiation` — mutates state once

Recommended ordering:

- after patron pressure / patron events / peace-plan updates
- before final war termination judgment

### Read-path rule

`GameStateAdapter.derivePendingDayton` should become a pure shape adapter:

- read `state.military.negotiation.pending_dayton`
- map it to `LoadedGameState.pendingDayton`
- never call initiation helpers

### Resolution rule

`resolveDaytonNegotiation(...)` consumes the persisted pending packet, writes `dayton_result`, and ends the war.

### What is now unblocked

- pending packet type
- pipeline step
- save/load-safe Dayton modal contract
- adapter purity cleanup

### What remains intentionally blocked

- freeform map-drawing peace negotiation redesign

---

## 7. New packet sequence

These gates are now ungated into the following recommended packet order:

1. **Packet DG1:** Dayton trigger pipeline step and `pending_dayton` state packet
2. **Packet DG2:** Stranded brigade lifecycle owner and state machine
3. **Packet DG3:** Consequence substrate audit and per-faction pressure consequence completion
4. **Packet DG4:** Endgame verdict packet contract — termination vs judgment separation
5. **Packet DG5:** Sensitive-history boundary enforcement plus Srebrenica rupture contract
6. **Packet DG6:** Cost Ledger and endgame comparison substrate, consuming DG4 + DG5

---

## 8. Still intentionally blocked

Even after these resolutions, a few things remain intentionally off-limits:

- all-at-once consequence mega-sprint
- freeform Dayton redrafting on the map
- generic dynamic enclave generation
- atrocity as player optimization gameplay

Those are not “forgotten.” They are explicitly rejected until the project has a stronger substrate and a better reason to reopen them.

---

## 9. Feature Done Means

Canonical owner:
- this document owns the architectural resolution of the formerly blocked design gates.

Demoted path:
- “blocked because we have not thought it through yet” is demoted. Each former gate now has an explicit contract.

Player-visible truth:
- the player experiences clearer ownership, more honest endgame judgment, and sensitive-history handling that preserves the game’s negative-sum identity.

Done means:
- roadmap blockers are converted into packetizable lanes with explicit boundaries, and reviewers can distinguish truly unblocked work from the few things that remain intentionally forbidden.
