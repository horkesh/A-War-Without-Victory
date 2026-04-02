# 2026-04-02 Engine Health Wave 1 Correctness Fixes

## Scope

This report records the first implemented slice of the 2026-04-02 engine-health triage:

- objective-relevant operation intel confidence
- authoritative war exhaustion in victory termination
- more honest corps offensive launch feasibility
- commander force evaluation consuming `supply_by_osid`
- Army HQ gathering using real recent-front territory change

These are `v0.8.0.x` correctness fixes, not feature additions.

## Why this wave mattered

The engine-health audit surfaced a common pattern: the engine was often *almost* honest, but still making decisions from the wrong truth source.

- Operations preparation could use the highest sector-intel confidence even when the chosen objective lived in a different enemy sector.
- Victory/war termination could still read stale formation-profile exhaustion instead of the political war-exhaustion ledger.
- Corps launch feasibility could approve offensives based on attacker/defender base power while ignoring key defender advantages that real commanders would care about immediately.

That combination risks exactly the sort of Claude-made damage the triage was meant to catch: superficially plausible logic operating on the wrong authority.

## Implemented fixes

### 1. Objective-relevant intel confidence

File:
- `src/sim/combat/operation_preparation.ts`

Change:
- `getOperationIntelConfidence()` now tries to resolve the operation's actual target OSIDs to enemy sectors and prefers the intel record facing the sector that contains the objective.
- If the available state slice is too thin to support that mapping honestly, it falls back to the best facing-sector record instead of falsely treating the operation as blind.

Why this is the right contract:
- objective-specific intel should be used when the engine can truly resolve it
- older / thinner state slices must not collapse to zero confidence just because they lack enough geometry or controller context

### 2. Political war exhaustion is authoritative

File:
- `src/scenario/victory_conditions.ts`

Change:
- victory evaluation now reads `state.political.war_exhaustion[factionId]` first
- legacy `f.profile.exhaustion` remains only as a fallback

Why this is the right contract:
- political war exhaustion is the canonical strategic ledger
- victory and termination logic must not decide the end of the war from stale or shadow exhaustion fields

### 3. Launch feasibility now respects defender reality

File:
- `src/sim/combat/sector_offensive.ts`

Change:
- launch-feasibility checks now include defender artillery, entrenchment, and terrain defensive multipliers when estimating whether an offensive is actually viable

Why this is the right contract:
- a launch screen that ignores obvious defender bonuses will green-light offensives that any competent headquarters would reject
- this was a real “engine lies to itself” issue, not just tuning

### 4. Commander force evaluation now consumes local supply truth

Files:
- `src/sim/combat/commander/force_eval.ts`
- `src/sim/combat/commander/assess.ts`

Change:
- brigade fitness scoring now reads `supply_by_osid` from the commander briefing when that report is available
- brigades use the supply state at their actual `location_osid` instead of always inheriting the conservative unknown/default multiplier

Why this is the right contract:
- the commander briefing already carries local supply truth
- if force scoring ignores it, the engine is pretending to be more wired than it really is
- this closes the gap between “we derived supply by OSID” and “the commander actually uses it”

### 5. Army HQ gathering now sees recent front gains and losses

Files:
- `src/sim/combat/army_hq_gathering.ts`

Change:
- `recent_territory_change` is no longer hardcoded `0`
- gathering now derives a net gain/loss signal from `political.control_events`, scoped to each corps's current front neighborhood:
  - sector `territory_osids`
  - front-line `friendly_osids`
  - front-line `enemy_osids`

Why this is the right contract:
- Army HQ should not deliberate as if every front were territorially static
- this gives campaign planning a simple but real “this corps is gaining ground / losing ground / stable” input without inventing a huge new system

## Tests added or extended

- `tests/probe_preparation.test.ts`
  - added coverage proving objective-specific intel selection
- `tests/war_termination.test.ts`
  - added coverage proving political war exhaustion is authoritative
- `tests/corps_level_operations.test.ts`
  - added coverage proving launch feasibility rejects offensives that only look viable because defender bonuses were ignored
- `tests/commander/commander.test.ts`
  - added coverage proving brigade and corps force evaluation consume explicit supply-state truth
- `tests/army_hq_gathering.test.ts`
  - added coverage proving recent front gains/losses are derived from nearby control events instead of a placeholder constant

## Verification

Executed in clean implementation lane:
- `F:\AWWV_exec_clean`
- branch: `codex/engine-health-wave1`

Passing verification:

```powershell
node_modules\.bin\vitest.cmd run tests\probe_preparation.test.ts tests\war_termination.test.ts tests\corps_level_operations.test.ts
```

Result:
- `3` targeted engine-health test files passed
- `61` tests passed in that targeted slice

Additional verification:

```powershell
node_modules\.bin\vitest.cmd run tests\commander\commander.test.ts
```

Result:
- `1` additional commander suite passed
- `50` tests passed

Additional verification:

```powershell
node_modules\.bin\vitest.cmd run tests\army_hq_gathering.test.ts
```

Result:
- `1` Army HQ gathering suite passed
- `63` tests passed

Combined targeted sweep:

```powershell
node_modules\.bin\vitest.cmd run tests\probe_preparation.test.ts tests\war_termination.test.ts tests\corps_level_operations.test.ts tests\commander\commander.test.ts tests\army_hq_gathering.test.ts
```

Result:
- `5` test files passed
- `174` tests passed

## Architectural takeaways

- `Best available` is not always the right truth source; the engine often needs `best relevant`.
- Shadow state fields are dangerous even when they look harmless.
- Feasibility logic is part of strategy honesty, not just combat tuning.
- A derived report that never gets consumed is not a feature yet; it is deferred wiring.
- Typed strategic fields that stay pinned to a placeholder constant are just decorative architecture until they ingest real events.

## Roadmap fit

This report belongs to:
- `v0.8.0.x` correctness / stabilization

It directly supports:
- `v0.8.x-final` structural honesty
- `v0.8.1` commander maturity only after truthful substrate

## Canonical owner / demoted path / done means

Canonical owner:
- operation-preparation owns objective-relevant preparation intel reads
- political war-exhaustion ledger owns exhaustion truth for victory checks
- sector-offensive launch feasibility owns honest go/no-go screening
- commander force evaluation owns brigade-fitness use of `supply_by_osid`
- Army HQ gathering owns recent front-change signal for corps assessments

Demoted path:
- “best record no matter which objective is being attacked”
- “formation profile exhaustion as de facto war-end authority”
- “base-power-only launch viability”
- “local supply report exists but force scoring still uses a fake default”
- “recent_territory_change exists in the type but is always 0 in practice”

Player-visible truth:
- indirect for now; these are engine-honesty fixes that shape later player-facing realism

Canonical UI surface:
- none yet; this is substrate work

Done means:
- the new targeted regression tests pass together
- the three fixes are documented as canonical engine behavior
