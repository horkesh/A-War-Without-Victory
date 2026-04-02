# Engine Health Triage and Blindspots

**Date:** 2026-04-02  
**Scope:** Core engine health, commander/ops integrity, sector invariants, combat realism, player-truth boundaries  
**Status:** Advisory triage memo; no code changes in this document pass

## Why this exists

The project now has strong roadmap scaffolding, but several high-risk blindspots still live in the engine itself rather than in planning prose. This memo answers a practical studio question:

**What should be treated as immediate engine-correctness work, what should be structural cleanup, and what should not be allowed to masquerade as "AI progress" until the substrate is honest?**

## Executive Assessment

The engine is **promising but not yet healthy enough to relax**.

The repo has real strengths:
- deterministic discipline is real
- commander architecture is materially better than the old bot
- calibration has reached strong historical fit (`n1302` at `93.7%`, `25/25` anchors, `6/6` benchmarks)
- operations, sectors, and combat now have much better documentation than they did a week ago

But the core risk is now clearer:

- the project still has **multiple partially-overlapping truths**
- some high-value mechanics are **present in docs or scaffolding but not wired into the real decision path**
- some systems appear singular in roadmap language while still being **split between canonical and legacy behavior**

Most game studios would now treat this as a **stabilization-and-contract phase**, not as a moment to celebrate intelligence features.

## Blindspot Heuristics To Use During This Triage

These are practical studio rules for where to look first when a repo like this starts drifting.

- **The most dangerous code is transitional code that still has side effects**
  - The real danger is not the oldest file.
  - It is the file or branch that still writes state, emits orders, mutates UI truth, or participates in a live pipeline while being described as "temporary", "legacy", or "compat".

- **Comments can become lies faster than code**
  - A stale invariant comment can send a human or Claude to "fix" the wrong system.
  - In this repo, false universals around sectors, authority, and player-visible truth are active maintenance risks.

- **Adapters are where products start lying to themselves**
  - `GameStateAdapter`, Electron bridges, map builders, and report normalizers deserve suspicion.
  - If engine truth and player truth differ, the adapter layer is often where the distortion enters.

- **Renderer migrations are never purely visual**
  - MapLibre -> Deck.gl already proved that rendering layers also encode visibility rules, interaction contracts, and player-truth assumptions.
  - Any future renderer change should be triaged as product-logic work, not presentation work.

- **If two systems can both explain the same outcome, one of them is probably fake**
  - Exhaustion, operations launch, sector ownership, brigade movement, and UI summaries must each have one canonical explanation.
  - Mature systems do not tolerate several equally plausible reasons for the same visible result.

- **The system that writes the report can become more "real" than the system that generated it**
  - If diagnostics, summaries, and UI tell a cleaner story than core state, the team starts steering by the report instead of the engine.
  - That is how split truths become institutionalized.

- **A strategy game usually fails as a product before it fails as a simulation**
  - Players notice leaked knowledge, contradictory screens, and missing return paths before they notice a 10% combat coefficient error.
  - Product integrity is not secondary work.

- **Raw internal names leaking to players is not cosmetic debt**
  - It is evidence that the product lacks a real translation layer between engine truth and player truth.

- **The scariest files are often the ones every fix has to touch**
  - Large adapters, command-routing files, map containers, and master documents become architecture debt concentrators.
  - They require more suspicion, clearer ownership comments, and stronger tests than ordinary files.

- **Legacy tools are dangerous when they still define success**
  - Old scripts, old reports, old checks, and old operation paths remain hazardous if people still trust them when evaluating the system.

## The Right Handling Strategy

Treat the next work as four separate lanes, not one giant cleanup blob.

### Lane A — Immediate correctness triage (`v0.8.0.x`)

These are not architectural niceties. They can actively distort runs or player trust.

1. **Fix the operation-preparation intel confidence bug**
   - File: `src/sim/combat/operation_preparation.ts`
   - `getOperationIntelConfidence()` does not actually match intel records to the operation's objectives.
   - It currently behaves like "highest confidence for any record on the sector" rather than "confidence relevant to the target."
   - This is a core-decision bug, not a tuning issue.

2. **Fix launch-feasibility optimism**
   - File: `src/sim/combat/sector_offensive.ts`
   - `checkLaunchFeasibility()` ignores defender artillery, terrain, and entrenchment.
   - This matches the documented `COMBAT_MASTER` blindspot and likely feeds the `47%` zero-eligible-attacker rate.

3. **Resolve the exhaustion truth split**
   - Files:
     - `src/scenario/scenario_reporting.ts`
     - `src/scenario/victory_conditions.ts`
     - `src/state/exhaustion.ts`
   - Weekly reporting reads `state.political.war_exhaustion`.
   - Victory conditions still read `f.profile.exhaustion`.
   - At least two exhaustion truths are alive at once.

4. **Patch the worst live player-knowledge leaks**
   - Electron/tactical map still behaves too much like a staff omniscience client.
   - This should be treated as a live product-integrity bug, not a future polish task.

### Lane B — Structural honesty (`v0.8.x-final`)

This is the "stop lying to ourselves" lane.

1. **Player-facing state boundary**
   - The renderer should not receive near-full sim truth and then hope fog/UI discipline hides it.
   - This is a core product boundary, not a UI preference.

2. **Operations singularity**
   - One canonical operation object
   - One canonical lifecycle
   - One canonical creation/update path
   - One UI truth

3. **Comment/invariant truthfulness**
   - Example: `corps_front_sectors.ts` still says every active brigade must have a sector, but Army HQ reserve brigades are legitimate exceptions.
   - This kind of mismatch is how implementers start "fixing" the wrong thing.

4. **Raw-ID cleanup**
   - No player-facing UI should render raw internal IDs such as `arbih_3rd_corps`, raw `sector_id`, or similar internals outside explicit debug mode.

5. **Legacy / transitional surface triage**
   - Create an explicit inventory of:
     - live but misleading
     - legacy but still referenced
     - truly dead
     - tooling/archive only
   - This repo should stop treating "old-looking" and "safe to ignore" as the same thing.
   - Transitional files with side effects deserve higher urgency than old inert utilities.

### Lane C — Commander maturity (`v0.8.1`)

This lane should continue only after A and the most important parts of B are credible.

What should count as progress here:
- belief state that is actually wired into decisions
- candidate-intent competition
- real memory that changes future choices
- explanation traces that reflect actual decision paths

What should **not** count:
- more personality flavor
- more thresholds that make the bot look expressive
- "smarter" plans on top of a dishonest ops substrate

### Lane D — Broader product cleanup (`v0.8-to-v0.9`)

This is where the engine becomes a studio-quality product rather than an increasingly impressive prototype.

- Army–corps coherence
- commander explanation surfaces
- UI ownership consistency
- save/load + replay hardening
- tutorial/onboarding

## Confirmed Blindspots Worth Taking Seriously

### 1. Strategic layer is not yet really in the corps briefing loop

- `army_hq_gathering.ts` can produce theater assessments and campaign plans
- but the corps commander briefing path still mostly assembles local sector/brigade state
- if `CampaignPlan` is not meaningfully shaping corps briefings, the strategic layer is structurally disconnected

This is the sort of thing that can make a game feel "smart in architecture diagrams, local in practice."

### 2. Operations preparation still has an objective-intel mismatch

- `getOperationIntelConfidence()` builds an objective set
- but the actual confidence selection logic never matches records to those objectives
- so a corps commander may believe it has target-specific confidence when it really has only sector-level optimism

That is a serious decision-quality blindspot.

### 3. Feasibility screening is too generous before real execution checks

- the current pre-launch feasibility pass uses base power and an attack-posture discount
- it does not incorporate the main things that make Bosnia offensives fail:
  - prepared defense
  - artillery asymmetry
  - terrain
  - entrenchment

This creates "plausible on paper, impossible in execution" operations.

### 4. Exhaustion is architecturally split

There are at least two live concepts:
- `state.political.war_exhaustion`
- `f.profile.exhaustion`

If reporting, gameplay, and victory checks do not agree on which one is authoritative, then exhaustion is not a mechanic yet. It is a family of related numbers.

### 5. Sector doctrine is more honest than sector comments

The engine correctly allows idle Army HQ reserve brigades to remain sectorless.

But some comments and invariants still imply:
- every active brigade must always be sector-owned

That is false under current design, and those false comments are now a maintenance hazard.

### 6. Master docs are no longer in sync with current engine truth

Stale or split docs are themselves a blindspot now:

- `MASTER_ROADMAP.md` is behind `n1302`
- `SECTOR_MASTER.md` still carries a stale "current state" header while newer appendices discuss much later findings
- `REAL_WAR_MASTER.md` now has sharper current issues than some roadmap sections acknowledge

This is exactly how teams start working from yesterday's truth.

### 7. Legacy-looking files may still be active authority paths

The repo contains files whose names or comments make them look secondary, but which still appear in active architecture discussions or still influence real behavior.

Examples worth explicit suspicion:
- `bot_corps_operations.ts`
- `apply_brigade_reposition.ts`
- `brigade_aor_legacy.ts`
- older movement and reposition helpers that still sit beside the current commander / sector stack

The studio mistake would be to sort these by age. The correct triage is:
- does it still mutate authoritative state?
- is it still called by a live pipeline?
- do diagnostics or UI still assume its outputs?
- does a future implementer have a plausible chance of mistaking it for canonical?

If the answer to the last two is yes, it belongs in the structural-honesty lane even if the code "still works."

## Alignment With `engine_health_audit.html`

The external dashboard at `C:\Users\User\.agent\diagrams\engine_health_audit.html` is useful, but it mixes three different categories:

- **real engine defects**
- **real future features**
- **interesting historical texture that should not currently dominate roadmap priority**

That distinction matters.

### Findings I agree are immediate or near-immediate engine work

These align strongly with this memo and should affect actual implementation order:

- **CampaignPlan not shaping corps briefings**
  - Real architectural gap.
  - If Army HQ planning exists, corps command must either consume it or the project should stop pretending the strategic layer is active.

- **Combat predictor / launch-feasibility blind to defender advantages**
  - Real engine distortion.
  - This is one of the clearest "wrong now" findings in the dashboard.

- **`supply_by_osid` not consumed in meaningful force evaluation**
  - Real wiring gap.
  - If supply is passed through the briefing but falls back to a flat default, the model is lying about differentiated readiness.

- **`recent_territory_change` hardcoded to zero**
  - Real blindness.
  - Trend awareness is not optional if theater assessment is supposed to inform planning.

- **Engine-derived `must_hold` permanently disabled**
  - Real design/implementation gap.
  - The current disable is justified, but the missing replacement discriminator is still real work.

- **Feint type has no enemy effect**
  - Real but bounded quick win.
  - If a mechanic exists in type system and strategy generation but does nothing to the enemy, that is dead-mechanic debt.

### Findings that are real, but should be treated as later-scope features

These are not bad findings. They are just not the right things to call `P0` in the current studio moment.

- **UNPROFOR absent as a mechanical entity**
  - Historically true gap.
  - But this is a major system/feature, not a stabilization blocker for `v0.8.0.x`.
  - It belongs in a later realism/campaign-depth lane, likely `v0.9+`.

- **No radio / communications quality model**
  - Also a strong historical insight.
  - But this is a feature-layer capability, not an immediate engine-health blocker.
  - It should inform future commander/intel asymmetry work, not delay current correctness fixes.

- **Per-brigade ammunition scarcity absent**
  - Again: very real historical absence.
  - But this is another depth system, not the next thing to build while ops/briefing/player-truth are still structurally uneven.

### Findings that are good observations but need calmer prioritization

- **Winter defense bonus too small**
  - Could matter, but this is tuning unless it is shown to drive a major recurring historical miss.
  - Not a first-wave structural priority.

- **Enemy equipment not visible enough in commander reasoning**
  - Good gap.
  - But it should probably be solved as part of the same briefing/assessment cleanup, not as a separate headline initiative.

- **Army HQ reprioritization / artillery transfer realism**
  - Good long-term ambition.
  - Too advanced to foreground before the strategic-plan handshake is even canonical.

## Studio Verdict on the Dashboard

The dashboard is valuable as a **blindspot miner**.

Where it is strongest:
- identifying quick wins that are genuinely missing wires
- surfacing "the system exists but is not consumed" problems
- flagging historical capabilities the current engine does not model at all

Where it is weaker:
- it sometimes labels **future-scope realism systems** as if they were current stabilization blockers
- it occasionally treats "historically important" and "right next to implement" as the same thing

That is a common strategist mistake. Good studios separate:

- **wrong now**
- **important later**
- **worth remembering**

This repo needs that discipline right now.

## What a Real Studio Would Do Next

### Studio move 1: declare three canonical authorities

Before more commander glamour work, declare:

1. **authoritative exhaustion field**
2. **authoritative operation launch/viability path**
3. **authoritative player-visible state boundary**

Until each has one owner, the game will keep producing "looks better / behaves stranger" regressions.

### Studio move 2: stop mixing bugfixes with architecture cleanup

Do not put these in one giant bucket called "engine health."

Use this split:
- **correctness**: actual wrong behavior now
- **honesty cleanup**: stale contracts, duplicate truths, legacy/modern split
- **maturity work**: make commanders better only after the first two are credible

### Studio move 3: add product-rule tests

Not just sim tests. Product-rule tests.

Examples:
- player renderer must not receive forbidden enemy/internal data
- victory conditions and weekly reporting must read the same exhaustion truth
- operation viability must use target-relevant intel, not generic sector confidence
- no player-safe UI surface may render raw sim IDs

### Studio move 4: stop trusting comments that claim universals

In this repo, comments like "always," "never," and "all brigades" should now be treated as suspect until checked against the actual architecture.

That is not cynicism. It is normal studio hygiene once a project has gone through several system transitions.

## Recommended Work Order

### Immediate 5-item triage

1. make exhaustion authoritative in one field path
2. fix `getOperationIntelConfidence()`
3. harden `checkLaunchFeasibility()`
4. implement player-knowledge boundary hotfixes
5. reconcile false sector invariants/comments

### Then

6. wire strategic campaign-plan truth into corps briefings honestly
7. continue operations singularity / sector-anchored corps ops
8. only then deepen commander maturity work

## Bottom Line

The repo is **not in bad shape**, but it is at the point where the most dangerous problems are no longer obvious bugs. They are **split truths, false contracts, and impressive-looking systems that are only half-wired into the real decision path**.

That is the exact moment where studios either get serious about ownership and product truth, or spend months polishing systems that are still structurally crooked underneath.

## TL;DR

Treat the next phase as a studio-style stabilization program: fix the real correctness bugs now (intel confidence, launch feasibility, exhaustion truth, player leaks), use `v0.8.x-final` to make ownership and player-facing truth singular, and do not let `v0.8.1` commander maturity become “AI theater” built on split engine contracts.
