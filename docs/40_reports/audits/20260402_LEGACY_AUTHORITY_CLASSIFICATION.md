# 2026-04-02 Legacy Authority Classification

## Scope

This audit classifies several supposedly legacy combat/ops files by their **actual authority status** in the live engine:

- `src/sim/combat/bot_corps_operations.ts`
- `src/sim/combat/apply_brigade_reposition.ts`
- `src/sim/combat/brigade_aor_legacy.ts`
- related usage in `src/sim/turn_phases/war_phases.ts`
- related pressure read path in `src/sim/combat/brigade_pressure.ts`

The goal is not to reward files for sounding modern or punish files for sounding old. The goal is to answer a studio-level question:

**Which of these files still write or shape truth, which are intentionally inert compatibility sinks, and which are dangerous half-alive layers?**

## Classification

### 1. `bot_corps_operations.ts`

**Classification:** still authoritative for a narrow but real slice

What is true:
- this file is not the canonical operation lifecycle owner
- it is still a live authority path for:
  - emergency defensive operation creation
  - OG activation order generation

Evidence:
- `bot_corps_ai.ts` still imports:
  - `generateOGActivationOrders`
  - `generateEmergencyDefensiveOperations`
- the file itself correctly documents that it owns creation/activation entry points only, while `sector_offensive.ts` owns the canonical lifecycle

Judgment:
- this file is **not removable**
- it should be treated as a **transitional but still authoritative entrypoint**
- any ops-singularity cleanup must either absorb these entry points elsewhere or explicitly preserve them

### 2. `apply_brigade_reposition.ts`

**Classification:** intentionally inert compatibility sink

What is true:
- the war pipeline still invokes `applyBrigadeRepositionOrders()`
- the function currently clears `brigade_reposition_orders` and performs no AoR mutation

Evidence:
- imported and called in `war_phases.ts`
- file comment explicitly says:
  - `brigade_aor` is never populated in the current pipeline
  - orders are consumed and cleared with no other effect

Judgment:
- this file is **not shaping live combat truth**
- but it is still a live compatibility surface because commands/orders can hit it
- that means it is not dead code in the archival sense
- it should either:
  - be formally retired and removed from the pipeline, or
  - remain explicitly documented as a compatibility drain that intentionally does nothing

### 3. `brigade_aor_legacy.ts`

**Classification:** dangerous half-alive read path

What is true:
- this file still exports helpers used by active callers
- most importantly, `brigade_pressure.ts` still imports `computeBrigadeDensity()` from it
- but the actual brigade-pressure edge computation currently returns zero pressure for every edge

Evidence:
- `brigade_pressure.ts` imports `computeBrigadeDensity`
- `computeBrigadePressureByEdge()` then sets:
  - `sideAPressure = 0`
  - `sideBPressure = 0`
  - `delta = 0`
- `war_phases.ts` still carries comments claiming:
  - `brigade_front_assignment and local_fronts are NOT overwritten by sector system`
  - `The density modifier continues to use the existing local_fronts`

Judgment:
- this is the most dangerous case in the set
- the repo still has a live-named pressure path, live comments, and live imports
- but the actual core computation is inert
- this is **not clean legacy**
- this is **split-truth architecture**

In studio terms:
- the code still teaches future maintainers that brigade-AoR pressure is part of the active engine
- the runtime behavior says otherwise

## Main blindspot

The worst legacy files are not the oldest ones. They are the ones that still:

- get invoked every turn
- still have comments explaining why they matter
- still have import edges from live systems
- but no longer produce meaningful truth

That is exactly what `brigade_pressure.ts` + `brigade_aor_legacy.ts` currently look like.

## Recommended action

### P0: truth classification

Document these files as one of:
- `authoritative transitional entrypoint`
- `intentional compatibility sink`
- `dangerous half-alive layer`

### P1: remove false certainty

Fix comments in live files that currently imply stronger reality than the code delivers, especially around:
- local fronts
- density modifiers
- legacy AoR read paths

### P2: decide one of two futures for brigade-pressure legacy

Either:
- rewire brigade pressure/local-front logic so it becomes real again

or:
- sever the imports/comments and fully retire that path

The current middle state is worse than either.

## Roadmap fit

Primary fit:
- `v0.8.x-final` command-authority cleanup + old code removal

Immediate relevance:
- `v0.8.0.x` engine-health blindspot triage, because this is a truth-ownership issue that can mislead ongoing implementation right now

## Canonical owner / demoted path / done means

Canonical owner:
- operation lifecycle: `sector_offensive.ts`
- emergency defensive creation + OG activation entrypoints: `bot_corps_operations.ts`

Demoted path:
- `apply_brigade_reposition.ts` as a no-op compatibility sink unless explicitly revived
- `brigade_aor_legacy.ts` / brigade-pressure comments as active authority claims without real runtime effect

Done means:
- each of the three files is explicitly classified in docs/comments
- no live comment overclaims a truth the engine no longer enforces
- future cleanup work can remove or preserve them intentionally instead of guessing

## Follow-on execution note (2026-04-02)

This audit is no longer only descriptive.

The clean-lane Wave 1 execution now codifies several of the truth-classification decisions directly in code:

- `corps_front_sectors_constants.ts`
  - adds a canonical `isSectorAssignmentExemptCorpsId(...)` helper
- `corps_front_sectors.ts` / `brigade_assignment.ts`
  - sector comments now state the true rule:
    - active non-exempt field brigades are sector-mandatory
    - idle army-HQ / main-staff reserve brigades are exempt until loaned
- `sector_assertions.ts`
  - comments now describe the file honestly as a diagnostic assertion sink, not a throw-on-violation enforcement layer
- `brigade_pressure.ts`
  - comments now state plainly that the file is a dormant compatibility layer whose live edge deltas currently resolve to zero
- `apply_brigade_reposition.ts`
  - comments now state plainly that the file is a compatibility sink clearing a legacy queue rather than mutating live sector/OSID truth

Verification:
- `node_modules\\.bin\\vitest.cmd run tests\\engine_honesty_legacy_contracts.test.ts tests\\army_reserve_system.test.ts`
  - PASS (`14` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\\repo\\check_claude_governance.ps1`
  - PASS

This matters because the first line of defense against future Claude regressions is not only code behavior.
It is making sure the code, the comments, and the helper contracts all teach the same truth.
