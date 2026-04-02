# 2026-04-02 Engine Health Wave 1 Correctness Fixes

## Scope

This report records the first implemented slice of the 2026-04-02 engine-health triage:

- objective-relevant operation intel confidence
- authoritative war exhaustion in victory termination
- more honest corps offensive launch feasibility

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

## Tests added or extended

- `tests/probe_preparation.test.ts`
  - added coverage proving objective-specific intel selection
- `tests/war_termination.test.ts`
  - added coverage proving political war exhaustion is authoritative
- `tests/corps_level_operations.test.ts`
  - added coverage proving launch feasibility rejects offensives that only look viable because defender bonuses were ignored

## Verification

Executed in clean implementation lane:
- `F:\AWWV_exec_clean`
- branch: `codex/engine-health-wave1`

Passing verification:

```powershell
node_modules\.bin\vitest.cmd run tests\probe_preparation.test.ts tests\war_termination.test.ts tests\corps_level_operations.test.ts
```

Result:
- `3` test files passed
- `61` tests passed

## Architectural takeaways

- `Best available` is not always the right truth source; the engine often needs `best relevant`.
- Shadow state fields are dangerous even when they look harmless.
- Feasibility logic is part of strategy honesty, not just combat tuning.

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

Demoted path:
- “best record no matter which objective is being attacked”
- “formation profile exhaustion as de facto war-end authority”
- “base-power-only launch viability”

Player-visible truth:
- indirect for now; these are engine-honesty fixes that shape later player-facing realism

Canonical UI surface:
- none yet; this is substrate work

Done means:
- the new targeted regression tests pass together
- the three fixes are documented as canonical engine behavior
