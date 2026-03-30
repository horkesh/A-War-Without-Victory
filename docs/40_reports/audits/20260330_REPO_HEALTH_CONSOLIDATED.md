# Repo Health Consolidated Audit

**Date:** 2026-03-30  
**Purpose:** Single canonical audit consolidating the earlier 2026-03-30 repo-health, movement-authority, and follow-up deep-dive notes into one owner-facing document.  
**Audience:** Project owner, future maintainers, and engineers evaluating code health, movement ownership, roadmap quality, and the direction of the intelligent commander system.

---

## Executive Summary

This repo is **stronger than average** for an ambitious simulation game project.

It has:

- real engineering documentation
- a real testing culture
- explicit architecture and calibration thinking
- visible self-awareness about technical debt

But it also has a real maintainability problem:

**overlapping ownership**

That is the sharpest diagnosis across all audits.

In practical terms, that means:

- too many systems can influence brigade relocation or availability
- too many execution paths still look live
- a handful of orchestration files have become too central
- the UI adapter and map container are becoming integration sinks
- the commander system has a better architecture than the old bot, but still risks becoming a sophisticated threshold machine instead of real intelligence

## How To Use This Document

This document is no longer just an audit.
It should be read as a **roadmap input and implementation brief**.

The safest way to use it is:

1. treat the findings as a prioritization filter, not as a giant simultaneous refactor
2. slot the actions into the roadmap band where they belong
3. require each implementer task to name:
   - the canonical owner after the change
   - the transitional path being removed or demoted
   - the acceptance test that proves the cleanup is real

If the team uses this document only as "interesting observations," it will not help enough.
If the team uses it as a **scope-control document**, it will be valuable.

## Actionable Topline

If I had to translate the whole audit into the shortest possible implementation brief, it would be this:

### Priority 1. Make authority singular

Do this first for:

- commander intent
- operations lifecycle
- brigade movement intent

If two systems still believe they own the same choice after a cleanup task, that cleanup task is not done.

### Priority 2. Make the surviving system legible

For every surviving command system, the implementer should be able to answer:

- what owns this decision
- what data it reads
- what output it is allowed to write
- what downstream layer is execution-only
- what UI surface explains it to the player

### Priority 3. Make intelligence structural before making it theatrical

Before adding more AI-feeling features, make sure the commander has:

- real authority
- real memory
- competing options
- explainable choices
- downstream obedience

### Priority 4. Tie engine truth and UI truth together

If the player sees a command object in the UI, the engine should have one canonical meaning for that object.
This matters most for operations.

### Priority 5. Treat cleanup as feature-enabling work

The cleanup items in this document are not cosmetic.
They are prerequisites for believable commander behavior, future political bots, and any later LLM layer.

## Owner Checklist

If I were giving the owner the shortest possible practical checklist, it would be this:

1. Do not ask for "smarter AI" until ownership is singular.
2. Require every cleanup task to name the one canonical owner after the change.
3. Require every cleanup task to name what old path is being removed, demoted, or declared non-authoritative.
4. Treat operations as the first command object that must become fully real.
5. Do not accept UI richness as proof that the underlying system is coherent.
6. Ask for "done means" on every major task, not just "we cleaned it up."
7. Prefer fewer stricter systems over many flexible-looking overlapping systems.
8. Push for memory, tradeoffs, and explanation traces before personality theater or LLM theater.

## What To Ask Implementers

For each roadmap task that comes out of this document, ask the implementer to answer these five questions in writing:

1. What is the canonical owner after this change?
2. What competing path is being removed or demoted?
3. What test or observable behavior proves the change is real?
4. What UI or report surface now reflects the new truth?
5. What future milestone does this unblock?

## Owner Checklist Roadmap Fit

Here is where the short owner checklist belongs in the roadmap.

### `v0.8.0.x` Commander Stabilization

Use this band for:

- do not chase smarter AI yet
- demand "done means" for commander fixes
- prove current commander outputs match intent
- make sure visible commander behavior is trustworthy enough to debug

Owner question:
"Is the current commander doing what we think it is doing, and can we prove it?"

### `v0.8.x-final` Command Authority Cleanup

Use this band for:

- make ownership singular
- require one canonical owner per command decision
- remove or demote competing paths
- add ownership comments and canonical/transitional annotations

Owner question:
"After this cleanup, who is actually in charge?"

### `v0.8.1` Commander Maturity

Use this band for:

- build memory before flavor
- build competing tradeoffs before personality theater
- build explanation traces before LLM theater
- deepen deterministic reasoning rather than adding surface-level AI feel

Owner question:
"Does the commander now think in a more human-looking way, or just talk that way?"

### `v0.8.2` Political Leader Bot And Later AI Layers

Use this band for:

- only the AI work that sits on top of cleaned command ownership
- political behavior that depends on a believable military substrate
- richer character expression after deterministic intelligence is respectable

Owner question:
"Are we adding a new mind on top of a stable system, or decorating an unstable one?"

### `v0.8-to-v0.9` Repo Simplification

Use this band for:

- prefer fewer stricter systems over many flexible-looking overlaps
- clean entrypoints, adapters, and integration sinks
- align docs, runtime truth, and UI truth
- retire ballast that confuses future maintainers

Owner question:
"What overlapping flexibility are we finally willing to kill?"

### `v0.9.x` UX And Surface Refinement

Use this band for:

- make the cleaned backend legible in UI
- make operations feel authoritative to the player
- improve reporting, SITREP presentation, and commander explanation surfaces

Owner question:
"Does the player now see the same command truth that the engine is using?"

---

## Claude CLI Operating Rules For Owner

If you are working mostly through Claude CLI, use it less like a generator and more like a disciplined lieutenant.

For every non-trivial task, require Claude to state:

1. canonical owner after the change
2. old path removed, demoted, or declared non-authoritative
3. decision boundary for the surviving system
4. "done means" proof
5. UI or report surface that reflects the new truth

If Claude cannot answer those five things, the task is not ready.

## Claude CLI Taskforce Pattern

The best working pattern for this repo is:

1. one implementer
2. one authority skeptic
3. one UI-truth skeptic
4. one roadmap-slotting reviewer for larger work

That prevents the most likely failure mode in this project:

**Claude makes the code look more impressive before the architecture becomes more honest**

## What Claude should directly correct itself on

Claude should not merely describe these problems.
It should actively correct them when they are discovered during work:

- overlapping ownership
- stale legacy paths
- fake flexibility
- missing canonical/transitional comments
- UI surfaces implying a cleaner truth than the engine actually has
- roadmap items drifting into the wrong milestone

## Crash-Resistant Operating Habit

Because long sessions and crashes are a real risk, Claude should work in short loops and checkpoint after meaningful progress.

A good loop is:

1. inspect
2. make one bounded change
3. verify
4. checkpoint current state into the active report / plan / working note
5. tell the user what is done and what remains

That is slower than one giant burst, but much safer for this repo and this workstation reality.

---

## Direct Roadmap Patch Guidance

This section is the explicit handoff for whoever updates `MASTER_ROADMAP.md`.

If the implementer is using this audit to adjust roadmap structure, the intended patch is:

### Version number changes

1. Insert a new `v0.8.1` milestone named `Commander Maturity`.
2. Shift the current `v0.8.1` Political Leader Bot milestone to `v0.8.2`.
3. Shift the current `v0.8.2` Order Interpretation milestone to `v0.8.3`.
4. Shift the current `v0.8.3` Political / LLM autonomy milestone to `v0.8.4` or later.

### What belongs in each milestone

#### `v0.8.0.x` Commander Stabilization

Slot these items here:

- combat drought repair
- commander output vs intent verification
- plan lifecycle fixes
- traceability needed to debug live commander behavior
- immediate ops truth fixes needed to judge whether operations are actually working

Do **not** slot here:

- broad movement cleanup
- major architecture simplification
- deep commander cognition expansion
- political-bot or LLM work

#### `v0.8.x-final` Command Authority Cleanup

Slot these items here:

- remove or permanently demote old corps-directive paths
- make commander-loop authority final
- operations ownership cleanup where the goal is singular authority
- movement ownership cleanup where the goal is singular authority
- ownership comments and canonical/transitional annotations

Do **not** slot here:

- repo-wide beautification
- speculative AI personality expansion
- UI polish not tied to command authority truth

#### `v0.8.1` Commander Maturity

Slot these items here:

- belief state
- motive stack
- candidate-option competition
- relationship model
- lesson-based memory
- decision traces
- replacing threshold jungles with scored pressures

Do **not** slot here:

- unresolved authority cleanup
- ops lifecycle duplication
- movement overlap that still makes commander intent non-sovereign

#### `v0.8.2` Political Leader Bot

Slot these items here only after `v0.8.1` is credible:

- political behavior built on stable military command truth
- refusal, pressure, patron, and political-strategic behavior
- character expression built on already respectable deterministic command reasoning

#### `v0.8.3` Order Interpretation

Slot these items here:

- parsing / interpreting player or higher-level intent
- translation of strategic goals into military requests
- any command-language layer that assumes corps and army systems are already coherent

#### `v0.8.4+` Political / LLM Autonomy

Slot these items here:

- LLM-assisted political behavior
- LLM explanation or flavor layers
- experimental higher-level autonomy that sits on top of deterministic command authority

Do **not** slot here:

- basic command cleanup that should already have been finished
- architecture fixes required just to keep the system coherent

#### `v0.8-to-v0.9` Repo Simplification

Slot these items here:

- entrypoint cleanup
- giant-file decomposition
- adapter and integration-sink cleanup
- stringly-typed cleanup
- dead branch removal
- docs/runtime synchronization

#### `v0.9.x` UX And Surface Refinement

Slot these items here:

- operations SITREP polish
- commander explanation UX
- cleaned-up map/warroom presentation
- player-legibility improvements after the underlying systems are already authoritative

### Slotting rule for the implementer

When deciding where a finding belongs, use this test:

- if it makes today's commander trustworthy, put it in `v0.8.0.x`
- if it makes ownership singular, put it in `v0.8.x-final`
- if it makes the commander think better, put it in `v0.8.1`
- if it adds higher-level political or interpretive cognition, put it in `v0.8.2` or later
- if it is repo-wide simplification, put it in `v0.8-to-v0.9`
- if it is presentation after architectural truth exists, put it in `v0.9.x`

### Anti-mis-slotting rule

The implementer should not place a task into a later "smart AI" milestone if the task is actually fixing:

- overlapping ownership
- duplicate lifecycle paths
- UI/engine truth mismatch
- dead compatibility ballast
- unclear canonical authority

Those are cleanup-band tasks, not AI-expansion tasks.

### What the roadmap editor should change in prose

The roadmap text should explicitly say all of the following:

- operations are the first command object that must become singular and authoritative
- commander maturity happens before political-bot and LLM expansion
- cleanup work is feature-enabling, not optional polish
- UI refinement follows backend authority, not the other way around

If those statements are not visible in the roadmap, the sequencing risk remains.

---

## Recommended Workstreams

To make this easier to hand to an implementer, I would treat the audit as five concrete workstreams.

### Workstream A. Commander authority cleanup

Goal:
Make the commander the real source of command intent instead of one participant among overlapping writers.

Primary targets:

- `src/sim/combat/commander/*`
- `src/sim/combat/bot_corps_ai.ts`
- `src/sim/combat/bot_corps_directives.ts`
- `src/sim/turn_phases/war_phases.ts`

Done means:

- one canonical corps-level intent path
- old directive paths are removed, disabled, or explicitly transitional
- downstream layers execute commander intent rather than reinterpret it

### Workstream B. Operations consolidation

Goal:
Make operations the one real offensive tool for both AI and player.

Primary targets:

- `src/sim/combat/sector_offensive.ts`
- `src/sim/combat/operation_preparation.ts`
- `src/sim/combat/operation_prediction.ts`
- `src/sim/combat/bot_corps_operations.ts`
- `src/scenario/combat_causality.ts`
- `src/ui/map/components/OperationsPanel.tsx`
- `src/ui/map/components/ops_modal/*`
- `src/desktop/electron-main.cjs`

Done means:

- one canonical operation object
- one canonical lifecycle
- one canonical creation / launch / update path
- UI surfaces read as scoped views of the same object
- old catalog or bypass behavior is either retired or explicitly non-authoritative

### Workstream C. Movement ownership cleanup

Goal:
Reduce brigade movement from many competing philosophers to one intent owner plus a small execution stack.

Primary targets:

- `src/sim/combat/brigade_movement_orders.ts`
- `src/sim/combat/osid_column_movement.ts`
- `src/sim/combat/brigade_front_distribution.ts`
- `src/sim/combat/brigade_home_return.ts`
- `src/sim/combat/bot_brigade_eval_front.ts`
- `src/sim/combat/bot_brigade_ai_osid.ts`

Done means:

- one authority for movement intent
- execution engines are clearly separated from decision writers
- compatibility ballast is removed or marked dead

### Workstream D. Commander maturity

Goal:
Upgrade the commander from a modular threshold system to a deterministic reasoning system.

Primary targets:

- `src/sim/combat/commander/briefing.ts`
- `src/sim/combat/commander/assess.ts`
- `src/sim/combat/commander/allocate.ts`
- `src/sim/combat/commander/plan.ts`
- `src/sim/combat/commander/decide.ts`
- `src/sim/combat/commander/emit.ts`

Done means:

- belief state exists separately from raw world state
- candidate intents compete
- memory affects future scoring
- constraints and preferences are structurally distinct
- reasoning traces exist for debugging and later UI use

### Workstream E. Integration and legibility cleanup

Goal:
Make the surviving architecture understandable to both coders and players.

Primary targets:

- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/map/MapContainer.tsx`
- `src/scenario/scenario_runner.ts`
- `src/desktop/electron-main.cjs`
- `docs/20_engineering/*`

Done means:

- fewer integration sinks
- cleaner command/UI boundary
- docs match runtime truth
- ownership comments explain what is canonical and what is transitional

## Recommended Implementation Order

If this is going to be executed seriously, this is the order I would hand to the implementer:

1. stabilize current commander behavior enough to trust the baseline
2. consolidate operations into one authoritative model
3. reduce movement ownership overlap so commander and ops choices actually matter
4. clean entrypoints and integration sinks that still blur ownership
5. deepen commander cognition only after the authority model is cleaner
6. delay political-bot and LLM ambition until the above is true

This order matters.
If the team tries to do step 5 before steps 2-4, it will mostly create better-organized illusion rather than better command.

## Health Verdict

## What is healthy

### 1. Documentation discipline is unusually good

The engineering spine is real:

- `docs/20_engineering/CODE_CANON.md`
- `docs/20_engineering/REPO_MAP.md`
- `docs/20_engineering/PIPELINE_ENTRYPOINTS.md`
- `docs/40_reports/CALIBRATION_MASTER.md`

That is a real asset. Most game repos never develop this.

### 2. Test investment is serious

Repo metrics from this audit pass:

- source files in `src/`: about **747**
- test files in `tests/`: about **327**
- archived files in `src/_archived`: about **93**

Large tests exist in the riskiest systems, which is exactly what you want:

- `tests/commander/commander.test.ts`
- `tests/sector_offensive.test.ts`
- `tests/scenario_operation_diagnostics.test.ts`
- `tests/brigade_front_distribution.test.ts`

### 3. Some core files are actually maintainable in style

The core sim files are not uniformly bad.

Several have:

- clear headers
- deterministic-execution notes
- real intent comments

That matters a lot.

### 4. The repo is self-aware about debt

The existence of docs like:

- `docs/40_reports/20260330_RAILROAD_HUNTER_REPORT.md`
- `docs/40_reports/audits/cleanup_audit.md`

means the team is not sleepwalking into complexity.

---

## What is unhealthy

## 1. Overlapping ownership is the main problem

This is the one-sentence diagnosis.

Not "the code is dumb."  
Not "nobody wrote comments."  
Not "there are no tests."

The main issue is:

**too many systems think they are allowed to own the same kind of decision**

That is most obvious in movement and execution pathways.

## 2. Brigade movement authority is split too many ways

The movement area currently contains:

### Real movement execution

- `src/sim/combat/brigade_movement_orders.ts`
- `src/sim/combat/osid_column_movement.ts`

### Movement / relocation writers

- `src/sim/combat/bot_brigade_movement_ai.ts`
- `src/sim/combat/bot_brigade_eval_front.ts`
- `src/sim/combat/brigade_front_distribution.ts`
- `src/sim/combat/brigade_home_return.ts`
- `src/sim/combat/sector_offensive.ts`
- `src/sim/combat/bot_brigade_ai_osid.ts`
- `src/desktop/electron-main.cjs`

### Availability shifters that are not literal marching, but still matter

- `src/sim/combat/strategic_reserve.ts`
- `src/sim/combat/army_reserve_system.ts`

### Dead / misleading carryover

- `src/sim/combat/apply_brigade_reposition.ts`

That last file is especially telling: it explicitly says brigade AoR is no longer populated and the orders are cleared with no effect. That is dead compatibility ballast.

### My blunt read

The repo has decent movement executors.

What it does **not** have is a single clean movement authority.

The problem is not "too many files."  
The problem is:

**too many movement philosophers**

---

## 3. Execution ownership is documented, but still cognitively expensive

The docs do better here than the code-health issue might suggest.

The rough structure is:

### Primary war execution

- `src/sim/turn_pipeline.ts`

### Primary scenario harness

- `src/scenario/scenario_runner.ts`

### Non-war lifecycle pipeline

- `src/state/turn_pipeline.ts`

### Wrappers / subsets / variants

- `src/cli/sim_scenario.ts`
- `src/cli/sim_run.ts`
- `src/desktop/desktop_sim.ts`
- `src/sim/run_combat_browser.ts`
- `src/turn/pipeline.ts`

This is not undocumented chaos.

But it is still expensive to hold in your head.

The biggest specific smell here is naming and transition drift around browser-safe subset execution, where code and docs are close but not perfectly aligned.

---

## 4. A few files are becoming structural hazard zones

The biggest hotspot files observed:

- `src/ui/map/map/MapContainer.tsx`
- `src/sim/turn_phases/war_phases.ts`
- `src/scenario/scenario_runner.ts`
- `src/ui/map/data/GameStateAdapter.ts`
- `src/sim/combat/sector_offensive.ts`
- `src/sim/combat/bot_corps_directives.ts`
- `src/desktop/electron-main.cjs`
- `src/state/game_state.ts`

These are not bad simply because they are large.

They are risky because they mix:

- orchestration
- policy
- compatibility
- data translation
- side effects

That is where maintainers lose confidence.

---

## Comments And Annotations

## Are they important?

Yes.

Not because every file needs lots of comments, but because in a system this layered, future maintainers need help understanding:

- what owns what
- what is transitional
- what is canonical
- why the code exists in this shape

## What I found

### Better-commented core sim files

These are relatively healthy in annotation style:

- `src/sim/combat/bot_corps_ai.ts`
- `src/sim/combat/sector_offensive.ts`
- `src/sim/combat/bot_corps_directives.ts`

They include lifecycle explanation, determinism notes, and intent comments.

### Under-explained integration hubs

These are the files where comment quality is weaker relative to size and complexity:

- `src/sim/turn_phases/war_phases.ts`
- `src/scenario/scenario_runner.ts`
- `src/ui/map/map/MapContainer.tsx`
- `src/ui/map/data/GameStateAdapter.ts`

These files do not need more line-by-line commentary.  
They need better **ownership** and **boundary** commentary.

### Important nuance

The repo's maintainability issue is not mostly "too few comments."

The deeper issue is that comments are currently helping humans survive architectural overlap.

That means the real fix is consolidation, not comment spam.

---

## Roadmap Review

## Overall take

The roadmap is ambitious, but the current sequencing is mostly sensible.

The best thing about [MASTER_ROADMAP.md](F:/A-War-Without-Victory/docs/plans/MASTER_ROADMAP.md) is that it does **not** pretend `v0.8.0` is done just because calibration is high.

It explicitly says the next priorities are:

1. fix the combat drought
2. get War-or-Game approval
3. remove old code
4. do railroad cleanup

That is the correct order.

## What I like

### 1. It understands that architecture cleanup is part of delivery

The roadmap's `v0.8.x-final` and `v0.8-to-v0.9` simplification sections are not fluff.
They are exactly the sort of thing this codebase needs before more layers get added.

### 2. It correctly names the real risk

The simplification hit list is good:

- multiple movement systems
- multiple pathfinding engines
- dead branches
- magic numbers
- pre-v0.8 canon drift

That is honest and mature roadmap thinking.

### 3. It does not confuse "fancier AI" with "better architecture"

At least on paper, it understands that deeper autonomy should come after military-command cleanup.

## What worries me

### 1. There is a temptation risk

The roadmap is exciting enough that the project could easily get seduced into pushing into:

- political leader bot
- order interpretation
- autonomy depth

before `v0.8.0` has truly stabilized.

That would be dangerous.

### 2. The roadmap could unintentionally stack intelligence theater on top of unresolved rails

If old military rails remain in place, then adding:

- political personality
- refusal logic
- LLM augmentation

can produce something that feels more "AI-ish" while still being structurally railroaded.

That would be the worst of both worlds.

## Roadmap verdict

The roadmap is good **if the team obeys its own ordering**.

If it cheats the ordering, it becomes dangerous.

---

## Where This Audit Fits In The Roadmap And Versioning

If you want to turn this entire audit into an actionable plan, it does **not** belong in one neat feature milestone.

It spans four layers of the roadmap:

- `v0.8.0` stabilization
- `v0.8.x-final` command-chain cleanup
- `v0.8-to-v0.9` repo simplification
- a new commander-maturity milestone before serious LLM work

## My strong recommendation

Do **not** treat this audit as a `v0.9 polish` concern.

It belongs **inside the command-chain delivery sequence**, before the project declares the command hierarchy mature.

If you postpone it until after political bots, order interpretation, or LLM integration, you will be stacking higher-order intelligence on top of unresolved command ownership.

That would be the wrong order.

## Recommended roadmap insertion

This is the versioning structure I would actually recommend:

### `v0.8.0.x` — Commander Stabilization Patch Train

Keep this inside the current `v0.8.0` line.

Use it for:

- combat drought fix
- War-or-Game approval
- commander output verification against intent
- obvious plan lifecycle fixes
- traceability improvements needed to debug commander behavior

This is still "make the existing commander actually work."

### `v0.8.x-final` — Command Authority Cleanup

Keep this as a real milestone, not a vague cleanup footer.

Use it for:

- removing `generateCorpsDirectives`
- making `USE_COMMANDER_LOOP` permanent
- eliminating dead compatibility paths
- clarifying movement ownership
- shrinking competing decision writers
- boundary comments and ownership annotations in hotspot files

This is where the repo stops lying to itself about who is in charge.

### `v0.8-to-v0.9` — Repo-Wide Simplification

Keep this as the broader engineering lane.

Use it for:

- unifying movement systems
- reducing pathfinding overlap
- cleaning stringly-typed command logic
- removing dead branches
- grouping magic numbers into domain-owned constants
- updating engineering docs and canon-facing docs to the post-cleanup reality

This is where the wider architecture catches up to the new commander.

### New milestone: `v0.8.1` — Commander Maturity

This is the most important roadmap change I would make.

I would insert a new `v0.8.1` **before** the current political-leader-bot milestone and dedicate it to making the commander genuinely more mind-like.

Use it for:

- belief state
- motive stack
- candidate-option competition
- relationship model
- lesson-based memory
- decision trace output
- replacing narrow threshold jungles with scored pressures

This is where the commander stops being merely modular and starts feeling like a commander.

### Shift current political milestones down by one slot

If you adopt the above, I would renumber like this:

- current `v0.8.1` Political Leader Bot -> `v0.8.2`
- current `v0.8.2` Order Interpretation -> `v0.8.3`
- current `v0.8.3` Autonomy Depth + Claude API at Political Level -> `v0.8.4` or later

That is not bureaucratic fussiness.

It is architectural honesty.

## Why I would insert a new commander-maturity milestone instead of squeezing it into cleanup

Because this audit is describing two different kinds of work:

- cleanup work
- cognition work

Cleanup work removes confusion.

Cognition work changes the kind of intelligence the game expresses.

Those should not be blurred into one catch-all engineering bucket.

If you bury both inside `v0.8.x-final`, the team will underestimate the scope and the design importance.

## Minimal-disruption versioning alternative

If you do **not** want to renumber the roadmap, the minimum acceptable fit would be:

- keep P0 and approval inside `v0.8.0`
- expand `v0.8.x-final` to include command authority cleanup
- expand `v0.8-to-v0.9` to include movement/system simplification
- fold commander-maturity work into current `v0.8.3` and delay any LLM scope inside that milestone until the deterministic improvements are done

This is workable.

I still think it is worse than inserting a dedicated commander-maturity milestone, because it hides the importance of the deterministic-intelligence upgrade.

## LLM versioning recommendation

My advice is straightforward:

Do not make LLM integration the headline of the same milestone that is still teaching the commander how to think.

The deterministic near-LLM upgrade should come first.

Then:

- political-level LLM assistance can be experimental in a later `v0.8.x` or `v0.9.x`
- corps-level LLM command should remain post-`v1.0` or `v2.0`, as the roadmap already suggests

That keeps the project from mistaking "talks like a commander" for "thinks like a commander."

## Short version

If I had to place the audit in one sentence:

**Most of it belongs between `v0.8.0` and `v0.9`, with a new dedicated commander-maturity milestone inserted before political-bot and LLM expansion.**

That is the cleanest and most honest roadmap fit.

---

## Where The Rest Of The Audit Recommendations Belong

The commander work is the headline, but it is not the whole audit.

The rest of the recommended actions also need a home in the roadmap, otherwise the repo will keep carrying architectural drag even if the commander gets smarter.

## 1. Movement authority cleanup

This belongs in:

- `v0.8.x-final`
- `v0.8-to-v0.9`

Why:

- it directly affects whether commander decisions are real
- it is partly command-chain cleanup and partly repo simplification

What should live there:

- deciding the long-term survivor movement stack
- reducing movement writers
- removing or demoting compatibility movement paths
- making one system own movement intent and two systems at most own execution

Versioning judgment:

This is too behaviorally important to hide inside a quiet refactor, but too architectural to count as a flashy new feature milestone.

So it belongs in the cleanup band between `v0.8.0` and `v0.9`.

## 2. Execution and entrypoint simplification

This belongs mostly in:

- `v0.8-to-v0.9`

Why:

- it is wider than the command chain
- it is about reducing cognitive load across harnesses, wrappers, browser subsets, and pipelines

What should live there:

- clarifying which pipeline is canonical for war execution
- documenting which wrappers are convenience shells vs true entrypoints
- renaming or pruning transitional execution paths where possible

Versioning judgment:

This is an engineering milestone, not a user-facing milestone.

I would not burn a new minor version on it by itself.

## 3. Structural hazard files

This belongs across:

- `v0.8-to-v0.9`
- selective spillover into `v0.9.x` only when user-facing behavior is affected

Files in this category include:

- `war_phases.ts`
- `scenario_runner.ts`
- `GameStateAdapter.ts`
- `MapContainer.tsx`
- `sector_offensive.ts`
- `electron-main.cjs`

What should happen:

- split orchestration from policy
- separate translation from mutation
- isolate compatibility code
- make ownership boundaries visible in code structure

Versioning judgment:

If a split changes behavior or UI semantics, it can land under the nearest active milestone.

If it is behavior-neutral architecture work, it belongs in the simplification lane.

## 4. Comments and annotations

This belongs in:

- `v0.8.x-final`
- `v0.8-to-v0.9`

Why:

- the current comment problem is really an ownership and transition problem
- the right moment to improve boundary comments is while cleanup is happening

What should live there:

- ownership headers on hotspot files
- "canonical vs transitional" notes
- entrypoint comments on wrapper scripts
- fewer survival comments, more boundary comments

Versioning judgment:

Do not make this a dedicated version.

This should be required quality work attached to cleanup and refactor milestones.

## 5. UI adapter and map integration risk

This belongs across:

- `v0.8-to-v0.9`
- `v0.9.3` and `v0.9.4` when tied to UI polish or performance work

Why:

- `GameStateAdapter.ts` and `MapContainer.tsx` are not just large, they are integration sinks
- some cleanup is architectural, some will naturally align with later UX and performance passes

Versioning judgment:

Architectural untangling first.

Visual or interaction refinements later.

Do not reverse that order.

## 6. Documentation synchronization

This belongs in:

- `v0.8-to-v0.9`
- pre-`v1.0` release hardening

Why:

- the audit repeatedly found docs that are better than average, but still lagging behind the post-`v0.8` command reality in places

What should happen:

- update engineering docs to reflect final surviving movement and command ownership
- update canon-facing references where the game bible or systems docs still imply older architecture
- retire transitional docs once the command-chain shape stabilizes

Versioning judgment:

This is release-hardening work, not feature work.

It should be considered mandatory before calling the command hierarchy mature.

## Practical roadmap summary for the non-commander actions

If I compress the rest of the audit into roadmap buckets:

- `v0.8.0.x`: only items needed to make the current commander trustworthy right now
- `v0.8.x-final`: command-adjacent cleanup, movement authority cleanup, ownership comments
- `v0.8-to-v0.9`: entrypoints, simplification, giant-file untangling, docs synchronization
- `v0.9.x`: only the spillover pieces that are naturally tied to performance, UX, or visible behavior changes

## The important strategic point

The rest of the audit is not side work.

It is the engineering terrain that determines whether later milestones feel solid or fake.

If the team implements political bots, order interpretation, and LLM-assisted personalities while these repo-health actions stay unresolved, the project will gain expressive surface area faster than structural integrity.

That is how impressive projects become brittle ones.

---

## Intelligent Commander Review

## Short answer

The commander code is **better-architected than the old bot**, but it is **not yet genuinely intelligent**.

It is currently:

**an intelligence-shaped deterministic expert system**

That is not an insult.  
It is also not the same thing as real emergent intelligence.

## What is genuinely better

The architecture is a real step forward:

- `briefing.ts`
- `assess.ts`
- `allocate.ts`
- `plan.ts`
- `decide.ts`
- `emit.ts`
- `commander_loop.ts`

That is a much healthier shape than dumping everything into one faction-wide directive generator.

Important upgrades already present:

- persistent commander state
- structured briefing
- multi-turn plan lifecycle
- zone-based assessment
- officer personality mapping
- reactive state update

That is real progress.

## What it still mostly is

When you inspect the files, the commander still relies heavily on:

- thresholds
- gates
- clamped scores
- discrete postures
- output translation into old directive formats

Examples:

- `assess.ts` uses threshold logic like deficit and commitment cutoffs
- `allocate.ts` uses posture budgets and personality thresholds
- `plan.ts` is driven by viability thresholds, concentration thresholds, and predefined action states
- `decide.ts` uses confidence thresholds, casualty thresholds, and reserve-shift limits
- `emit.ts` squeezes everything back into legacy `CorpsDirective` / `CorpsOperation` shapes

So the current commander is not free-form intelligence.  
It is a better-framed rule engine.

## The real danger you are worried about

Yes, your fear is valid:

> the commander could turn into another railroaded decision stack, just better organized

That is exactly the danger if the project stops at "modular threshold logic with personality modifiers."

The `Railroad Hunter` report already points at this risk.

---

## Operations Deep Dive: Engine, Rails, And UX

If the commander is going to feel real, operations have to become the one thing that clearly works.

Right now, operations are not just a subsystem. They are the commander's main instrument of will.

That means the player, the AI, and the diagnostics all need to agree on one answer to:

**what is an operation?**

At the moment, that answer is still blurrier than it should be.

## What operations are supposed to be

The canon is actually very clear.

The rulebook says:

- brigades do not attack independently
- all offensive attacks flow through corps operations
- operations are the primary offensive mechanism
- operations have a preparation phase
- the player reviews readiness, probes, supply, and commander assessment
- the player makes go/no-go or force-launch decisions

That is a strong design.

In plain English, the intended player mental model is:

**the corps commander does not "sort of attack sometimes." He organizes operations, prepares them, reports on them, launches them, and lives with the consequences.**

That is the right foundation for real command friction.

## What the code appears to be doing now

The strongest live implementation appears to be the `sector_offensive.ts` path.

That file explicitly states:

- a sector offensive **is** a `CorpsOperation`
- lifecycle is `planning -> execution -> recovery -> removed`
- it is integrated through dedicated pipeline steps

That looks like the canonical surviving operations path.

But the codebase still appears to carry an older operation worldview alongside it.

Examples:

- `bot_corps_operations.ts` still manages named operations, launch, progress, and recovery for non-`sector_attack` operation types
- `sector_offensive.ts` owns the richer active lifecycle for `sector_attack`, `probe`, and `feint`
- `bot_brigade_ai_osid.ts` and the brigade eval files contain operation-aware execution logic plus special cases and exceptions
- `battle_resolution.ts` and `attack_resolution_osid.ts` both consume operation state for modifiers and feedback
- `army_hq_gathering.ts` and `army_reserve_system.ts` also speak the language of operations

So the repo does not just have "operations."

It has:

- an intended operations doctrine
- a newer sector-offensive implementation
- older named-operation machinery
- multiple downstream consumers of operation state

That is enough overlap to confuse both coders and owners.

## My blunt read on the engine

I think the repo already contains the bones of a good operations system.

But it does **not** yet present a single unambiguous operations model.

The most likely truth is:

- `sector_offensive.ts` is the real future
- older named-operation management is partly legacy and partly still live
- brigade execution logic still contains enough exceptions that the "ops-only" doctrine does not feel perfectly sovereign

That is exactly the kind of ambiguity that makes a core tool feel fake even when a lot of good engineering exists underneath.

## UI and UX problem

The UI appears to teach one model before launch and another model after launch.

### Before launch

`OpsPlanningModal.tsx` presents operations as something substantial:

- commander phase
- planning phase
- G2 assessment
- authorization phase
- prediction support
- target and staging selection

This is close to the fantasy the game wants.

### After launch

`OperationsPanel.tsx` appears to show:

- phase
- supply
- momentum
- objectives
- participating brigades
- halt / force-launch controls

That is useful, but it is much more database-like than presidential.

And there is already a design note admitting this problem:

- `docs/plans/2026-03-22-operation-detail-redesign.md`

That plan says the current operation detail view reads like raw data instead of a commander's situation report.

I agree.

## Why this matters

The pre-launch UI says:

**operations are deliberate, intelligible military instruments**

The post-launch UI currently risks saying:

**operations are a row in a state table that is now happening somewhere off-screen**

That break in the player's mental model is a major problem.

If operations are the main tool of command, they need the strongest explanatory UX in the game.

## Diagnostics are better than the player-facing model

The scenario and reporting layer is actually fairly sophisticated here.

`combat_causality.ts` tracks:

- execution without attack orders
- attack orders without battles
- execution without eligible attackers
- recovery without logged attempt
- movement-only execution turns
- objective attempts and captures

`scenario_reporting.ts` then carries this into weekly reporting as:

- combat causality
- behavioral health
- operation diagnostics
- invalid operation counts
- zero-eligible-attacker counts

This is strong engineering instrumentation.

It tells the team whether operations are mechanically real enough to count for combat calibration.

## But diagnostics still have a limit

They are much better at answering:

- did the operation actually produce attacks?
- did it stall for a valid reason?
- was it movement-only?
- was it invalid for combat calibration?

than they are at answering:

- did the operation make strategic sense?
- did the commander launch it for understandable reasons?
- did the player understand why it stalled?
- did the commander seem competent, desperate, stubborn, or cautious?

So the diagnostics are good for **truth**, but not yet good for **meaning**.

The player still needs a coherent interpretation layer.

## Top risks making operations feel fake

### 1. Dual operation worldviews

If `sector_offensive.ts` is the real future, the repo needs to say that much more aggressively.

Otherwise older named-operation machinery will keep muddying the mental model.

### 2. Ops-only doctrine with visible exceptions

The rulebook says all offensive attacks go through operations.

But the brigade execution layer still includes comments and guards suggesting exceptions, special-case movement, and opportunistic behavior in edge cases.

Even when justified, that weakens confidence in the doctrine.

### 3. Planning fantasy, execution opacity

The planning modal offers narrative and deliberation.

Once the operation launches, the player seems to lose that narrative richness and falls back to monitoring state.

That is backwards.

Execution is exactly when the player most needs command reporting.

### 4. Diagnostics are for engineers, not presidents

The calibration harness knows a lot about whether an operation is valid.

The player-facing UI does not yet seem to tell a similarly coherent story about what the operation is doing and why.

## What I think "ops should be" in this project

Operations should be the command-chain object that ties together:

- commander intent
- player authorization
- brigade commitment
- readiness and supply
- operational narrative
- commander personality
- AAR and historical memory

In other words:

**an operation should be the visible life cycle of military intent**

That is the thing that makes the commander real.

Not a hidden multiplier.  
Not a loose collection of target OSIDs.  
Not a transient state row.

## What I would recommend next for operations specifically

### 1. Declare the canonical operations model

Choose one answer and document it:

- if `sector_offensive.ts` is the canonical operations engine, say so
- define how older named-operation machinery relates to it
- define which operation types are first-class and which are legacy or template-only

Without this, every other improvement will remain fuzzy.

### 2. Make the player mental model explicit

The player should be able to understand an operation as:

- why it exists
- who owns it
- what phase it is in
- what it is waiting on
- what success looks like
- why it is failing or stalling
- what the commander recommends next

If the player cannot answer those seven questions quickly, the operations UX is not done.

### 3. Give launched operations a real SITREP layer

The existing redesign note is correct.

Once an operation is live, the player should receive commander-facing reports, not just fields.

The game needs:

- commander recommendation
- progress narrative
- failure explanation
- current blocking reason
- next likely development
- whether halt, reinforce, or force-launch is advised

This is where the command chain becomes experiential.

### 4. Tie diagnostics and UI together

The same facts used for combat causality should feed the player report.

For example:

- zero eligible attackers
- movement-only execution turns
- failure budget pressure
- supply readiness collapse
- current objective attack count

Those should not live only in harness diagnostics.

They should be translated into player-readable operational meaning.

### 5. Make operations the first true proof of commander intelligence

Before deeper autonomy, political bots, or LLM command layers, the team should require that operations feel:

- understandable
- reliable
- characterful
- debuggable
- clearly owned by the commander

If operations do not pass that bar, the rest of the command hierarchy will remain conceptually unstable.

## Final operations verdict

The project is right to treat operations as central.

The codebase already has serious machinery here.

But the system is currently caught between:

- a strong intended doctrine
- a promising newer engine
- older overlapping machinery
- better internal diagnostics than player-facing explanation

That is why operations currently feel harder to trust than they should.

If you want one "real tool" that proves the commander is real, operations are absolutely the correct choice.

But they need to become:

**one canonical engine, one canonical player mental model, and one canonical reporting language**

before they can carry that weight.

---

## Commander Authenticity Check

## Is the commander actually making decisions?

Yes, but only partially.

The current commander is not just a decorative wrapper. It really does:

- assemble a structured briefing
- evaluate zones
- allocate posture and intent
- carry plans across turns
- react to losses, pressure, and opportunity

That is real decision-making.

But the more important answer is:

**it is making decisions inside a still-constrained box**

So the honest verdict is:

- it is not fake
- it is not yet sovereign
- it is still partially packaging old rails in smarter-looking form

## Where the real decision-making is happening

These files are doing genuine "mind" work:

- `src/sim/combat/commander/briefing.ts`
- `src/sim/combat/commander/assess.ts`
- `src/sim/combat/commander/allocate.ts`
- `src/sim/combat/commander/plan.ts`
- `src/sim/combat/commander/decide.ts`

These are not just hardcoded faction scripts. They are trying to maintain a model of the situation and act on it over time.

## Where the old rails still narrow the result

These are the main places where the commander's "intelligence" still gets squeezed:

- `src/sim/combat/commander/emit.ts`, because new internal thinking still has to be translated into older directive vocabulary
- downstream movement and staging systems, because they still contain their own operational assumptions
- threshold-heavy decision logic, because many choices still collapse into gated branches instead of competing judgments
- compatibility layers, because coexistence with older systems reduces how much freedom the commander can really express

## My blunt verdict

If a skeptical engineer asked, "Is this a real commander or just a better wrapper around rails?" my answer would be:

**It is a real transitional commander.**

That means:

- more real than the old bot
- less real than the architecture story wants it to become
- worth continuing, but only if authority cleanup actually follows

Without that cleanup, the project risks freezing at:

**smart-looking operational theater**

instead of reaching:

**a system that actually judges among competing military dilemmas**

---

## Operations Reality Check

If the commander is ever going to feel real, operations need to become the one offensive tool that actually works, is legible, and is trusted.

Right now, operations are conceptually central but architecturally split.

That is a serious problem.

## What operations are supposed to be

The canon-facing intent is clear:

- brigades do not independently conduct the war
- offensive action is meant to flow through corps operations
- preparation, intelligence, supply, and command judgment are supposed to matter
- the player is supposed to shape and authorize operations, not micromanage every attack

In plain English:

**operations are supposed to be the commander's real weapon**

That is the right design.

## What the code currently suggests

The implemented system is not one clean operations stack yet.

It currently looks like at least two overlapping operation worlds:

### 1. The newer "real" operations path

This appears to be the intended surviving path:

- `src/sim/combat/sector_offensive.ts`
- `src/sim/combat/operation_preparation.ts`
- `src/sim/combat/operation_prediction.ts`
- `src/sim/combat/bot_brigade_ai_osid.ts`
- `src/scenario/combat_causality.ts`

What this path does:

- operation lifecycle management
- preparation sub-phases
- force staging
- commander assessment
- execution focusing brigades on the current objective
- diagnostics for stalled or invalid execution

This is the closest thing to a coherent modern ops system in the repo.

### 2. The older / parallel operation world

This still exists too:

- `src/sim/combat/bot_corps_operations.ts`

What it still owns:

- named operation catalog
- launch/evaluate/progress behavior for non-`sector_attack` operation types
- separate planning/execution/recovery handling
- its own commander assignment and replacement assumptions

This is the first major clarity problem.

To a maintainer or player-facing engineer, it is not obvious which operation world is authoritative.

## The UI compounds the problem

The UX tries to present operations as one coherent tool:

- `src/ui/map/components/ops_modal/OpsPlanningModal.tsx`
- `src/ui/map/components/ops_modal/AuthorizePhase.tsx`
- `src/ui/map/components/OperationsPanel.tsx`
- `src/ui/map/components/CorpsFrontPanel.tsx`
- `src/ui/map/data/GameStateAdapter.ts`

That is the right instinct from a design point of view.

But underneath, the staging path is more permissive than the engine reality:

- `electron-main.cjs` directly stages operation payloads into `active_operations`
- the UI can submit multiple operation types
- those types are not all backed by the same lifecycle code

So the UI is trying to sell a unified operations fantasy on top of a mixed backend.

That is how players end up thinking:

- "I launched an operation"

when the engine really means:

- "you inserted one of several partially compatible operation objects into state"

That is not acceptable long-term if operations are supposed to be the commander's real instrument.

## The clearest code-level mismatches

### 1. Supply is visibly important, but not fully authoritative

The intended model says supply check is one of the preparation gates.

But the currently implemented path often records supply readiness without letting it truly veto launch.

That creates a misleading player mental model:

- supply looks central
- supply sounds central
- supply is assessed
- but supply is not always actually decisive

That weakens trust.

### 2. Preparation looks richer in docs and UI than in settled engine behavior

There is real preparation machinery:

- intel gathering
- force staging
- supply check
- assessment
- ready

But the tests and engine behavior still read more like a narrower implementation core than the full commander-mediated experience the rulebook implies.

That means the system feels more complete in concept than in consolidated runtime behavior.

### 3. Multi-axis sophistication exists, but the authoritative mental model is still blurry

The code has axis structures, current objective focus, staging, probes, and movement diagnostics.

But it is still not obvious whether the true model is:

- one corps operation with rich axis logic
- or a flatter participating-brigades plus objectives list with axis extras layered on top

That ambiguity matters because it affects everything:

- UI presentation
- AI decision quality
- player understanding
- debugging

### 4. Direct staging via IPC bypasses some conceptual discipline

The current IPC path can push operation objects straight into `active_operations`.

That is practical.

It is also dangerous.

Because it means the UI is not merely expressing a canonical operation-creation command.
It is constructing stateful operation records directly.

That makes it easier for the UI and engine to drift apart.

## What the code-first ops review now says more bluntly

After the focused operations pass, I think the right summary is:

**operations are serious, but not singular**

That means the repo does not suffer from "no ops system."
It suffers from "too many partially authoritative ops layers."

## The closest thing to the canonical runtime path

If I had to name the most credible modern path right now, it would be:

- `src/sim/combat/sector_offensive.ts`
- `src/sim/combat/operation_preparation.ts`
- `src/sim/combat/operation_prediction.ts`
- `src/sim/combat/bot_brigade_ai_osid.ts`
- `src/scenario/combat_causality.ts`

That stack is the strongest candidate for the long-term real ops system because it contains:

- lifecycle ownership
- preparation sub-phases
- launch criteria
- brigade execution focus
- post-hoc causality and validity reporting

If the project wants one authoritative ops truth, this is the most plausible spine.

## The strongest suspicious rails around operations

These are the parts most likely to make a real coder wince.

### 1. There are still two live operation lifecycles

The repo still has:

- the newer `sector_offensive.ts` lifecycle for `sector_attack`, `probe`, and `feint`
- the older `bot_corps_operations.ts` lifecycle for older named and non-sector operation handling

That means "operations" still names more than one runtime truth.

### 2. The old named-op catalog is still a railroad wearing a strategy hat

`bot_corps_operations.ts` still carries:

- faction-specific operation names
- municipality target lists
- coercion from broader op labels into narrower operation types

That is not harmless flavor.
That is historical scripting living inside a supposedly more general framework.

### 3. The prediction layer currently oversells its intelligence

`operation_prediction.ts` looks rich from the outside, but the present implementation still reads more like:

- opening-clash estimation
- simplified force-ratio presentation
- weak supply grounding
- weak intel grounding

That is useful.
It is not yet true G-2.

### 4. Validation warns, but does not really gate

`operation_validation.ts` currently acts more like a polite diagnostic assistant than a true authority.

That is acceptable during development.
It is not acceptable if operations are supposed to be the one real tool of command.

### 5. UI and IPC can still bypass conceptual discipline

The current desktop path can append raw operation objects and mutate operation state directly.

That is one of the clearest signs that the game still has:

- a designed operations fantasy
- but not yet one canonical command transaction model

## Which hard rails are probably justified

Not every rail is bad.
Some of them are exactly the kind of bounded historical constraint this project should keep.

The most justified ones I saw are:

- excluding critically supplied brigades from offensive participation
- keeping enclave brigades enclave-local
- requiring contiguous reachable objectives
- enforcing failure cooldowns and recovery windows
- limiting how many concurrent operations a corps can reasonably sustain

Those are not the enemy.

The enemy is:

**constraints that are hidden, duplicated, stale, or presented as flexibility when they are really fixed rails**

## What the UI and UX review adds

The UI review sharpened something important:

**operations already have a real interaction loop, but not one authoritative face**

The player can currently do a lot:

- plan an operation in `OpsPlanningModal.tsx`
- review and create from `CorpsFrontPanel.tsx`
- monitor in `OperationsPanel.tsx`
- inspect at corps level in `CorpsDetail.tsx`
- review at army level in `ArmyHQModal.tsx` and `OperationsSection.tsx`
- make go/no-go choices in `OperationBriefingModal.tsx`

That is real capability.

The problem is that these surfaces do not yet behave like scoped windows into one canonical operation object.
They behave more like several related surfaces orbiting a transitional backend.

## The biggest UI/UX failures right now

### 1. No single operation home

There is no one obvious screen that answers:

- who owns this operation
- what phase it is in
- what is blocking it
- what decision is pending
- what changed last turn

That is a command-legibility problem.

### 2. Lots of metrics, not enough causal explanation

The UI shows:

- readiness-like metrics
- prep progress
- supply
- confidence
- force ratio
- objectives

But it still does not consistently answer:

- why the operation is not launching
- why it postponed
- why it stalled
- what the commander recommends doing next

### 3. The planning flow is richer than the live execution story

This is backwards.

The planning side feels thoughtful and deliberate.
The live operation side too often feels like a state table.

That means the player gets the strongest command fantasy before launch and the weakest command story after launch, which is the opposite of what operations need.

### 4. There is already at least one trust-breaking inconsistency

The current review found that `OperationsPanel.tsx` appears to label a looked-up corps commander as the "Operation Commander," while `OperationsSection.tsx` uses the operation commander field correctly.

That kind of mismatch is small in code terms and huge in player-trust terms.

## What operations need in order to make the commander feel real

If operations are the proof-of-reality tool for the commander, then the game needs all of the following to be true at the same time:

### 1. One canonical operation object

Not one UI concept and three backend interpretations.

### 2. One visible lifecycle

Every surface should agree on:

- owner
- assigned commander
- intent
- phase
- blockers
- next decision
- launch conditions
- current risk
- last significant event

### 3. One explanation model

The same facts that power engineering diagnostics should also power player explanation.

If the sim knows:

- zero eligible attackers
- movement-only execution
- low staging cohesion
- bad axis supply
- weak intel confidence

then the player should see those translated into a commander-facing SITREP.

### 4. One command transaction path

The player should not be effectively hand-constructing mutable operation records through UI plumbing.
The UI should issue commands into the same canonical creation, review, launch, and update path that the rest of the simulation respects.

### 5. One historical log

Every operation needs a formal short history:

- who proposed it
- who authorized it
- when it entered planning
- when it postponed
- why it launched
- why it halted
- what it achieved

That is how operations stop feeling like database rows and start feeling like acts of command.

## What the tests say

The tests are useful, but they also reveal the current level of maturity.

They confirm a narrower but real implemented core:

- deterministic launch criteria
- deterministic planning duration
- execution-to-recovery lifecycle
- objective-focused attack behavior
- maneuver-vs-stall diagnostics

What they do **not** prove yet is that operations are already a fully unified, player-legible, commander-owned offensive instrument.

So the repo is not missing operations.

It is missing **one authoritative operations truth**.

## My blunt verdict on operations today

Operations are currently:

**the most important offensive concept in the game, but not yet the cleanest offensive system in the code**

That gap is large enough that even an owner can reasonably not know how ops "really" work.

The repo itself is sending mixed signals.

## What should survive

If this system is going to become real, I would strongly bias toward this survivor model:

### Survive as canonical

- `sector_offensive.ts`
- `operation_preparation.ts`
- `operation_prediction.ts`
- brigade execution through `bot_brigade_ai_osid.ts`
- operation diagnostics through `combat_causality.ts`
- one player-facing planning surface in the ops modal / operations panel

### Narrow or retire

- legacy lifecycle logic in `bot_corps_operations.ts`
- operation types that do not have a clearly different execution meaning
- any UI path that directly stages ambiguous operation objects without canonical validation

## The operation types problem

Right now the UI and IPC still speak in multiple operation-type names:

- `sector_attack`
- `general_offensive`
- `strategic_defense`
- `reorganization`
- `feint`
- `probe`

That may look flexible.

But unless each of those types has a clearly distinct, coherent lifecycle and player meaning, it is fake flexibility.

My current suspicion is that the game would be stronger if it treated:

- one core offensive operation type as canonical
- probe and feint as constrained operation modes or sub-actions
- strategic defense and reorganization as posture/program states, not peer operation objects

That would make the system easier to explain, easier to test, and more honest.

## What UI/UX needs if operations are to become the one real tool

The engine and UX need to tell the same story.

That means the player should be able to answer all of these questions from one place:

- What operation is active?
- What phase is it in?
- What is the current objective?
- Why is it not launching yet?
- What exactly is blocking it?
- Is supply actually gating it or merely warning?
- Is the commander recommending launch, delay, probe, or abort?
- Which brigades are staged, moving, committed, disrupted, or missing?
- If the operation is failing, why?

Right now pieces of that story exist, but they are split across:

- the ops modal
- corps front panel
- operations panel
- prediction output
- diagnostics the player does not directly see

That fragmentation mirrors the engine fragmentation.

## The minimum coherent v1 of operations

If I had to define the minimum believable operations system, it would be:

1. One canonical operation schema.
2. One canonical lifecycle.
3. One authoritative creation path from UI to state.
4. One place where the commander assesses launch/delay/probe/abort.
5. One clear definition of what supply does.
6. One clear definition of what brigades do while the op is planning vs executing.
7. One visible explanation of why an operation stalled, failed, or recovered.

Until those seven things are true, operations will remain partially impressive and partially mysterious.

## Why this matters for commander intelligence

Because if operations are not clean, then the commander has no clean instrument.

And if the commander has no clean instrument, then a smarter commander only becomes a smarter source of confusing state transitions.

That is exactly what should be avoided.

The commander can only be as real as the tool it uses to wage deliberate action.

Right now, that tool is promising but not yet singular.

---

## Movement Order Conflict Matrix

This is the most important "who is allowed to decide movement?" table in the repo.

| Concern | Current writer / influencer set | Current executor | Why coders will worry |
| --- | --- | --- | --- |
| Brigade local march orders | `bot_brigade_movement_ai.ts`, `bot_brigade_ai_osid.ts`, `sector_offensive.ts`, legacy or side logic in `bot_brigade_eval_front.ts` | `brigade_movement_orders.ts` | Too many producers can believe they own relocation priority |
| Column / OSiD march orders | `bot_brigade_ai_osid.ts`, `sector_offensive.ts` | `osid_column_movement.ts` | Cleaner than brigade marching, but still not obviously single-owner to a newcomer |
| Front redistribution | `brigade_front_distribution.ts`, plus upstream movement logic | usually later consumed through brigade movement systems | This feels like a second movement philosophy rather than a pure helper |
| Homeward return / demobilization drift | `brigade_home_return.ts` | movement or order pipeline downstream | Risks silently countermanding more strategic intent if not clearly subordinate |
| Reserve availability and release | `strategic_reserve.ts`, `army_reserve_system.ts` | reserve systems, then movement systems later | Not literal movement, but absolutely changes who can move and when |
| Operational staging for offensives | `sector_offensive.ts` | brigade or column movement execution | Valid domain authority, but must remain clearly scoped to offensive prep |
| Legacy reposition compatibility | `apply_brigade_reposition.ts` | effectively none | Dead path increases confusion about whether another movement lane still matters |
| Debug or desktop direct mutation risk | `electron-main.cjs` tooling paths | direct state mutation or wrapper behavior | Any app-layer write path around sim ownership makes engineers nervous fast |

## Survivor model I would recommend

If this were being cleaned for a serious engineering team, I would want the future to look like this:

| Layer | Should survive? | Intended role |
| --- | --- | --- |
| `bot_brigade_ai_osid.ts` | Yes, probably | central movement-intent aggregator under commander ownership |
| `sector_offensive.ts` | Yes, scoped | offensive staging authority only |
| `brigade_movement_orders.ts` | Yes | local brigade execution engine |
| `osid_column_movement.ts` | Yes | operational column execution engine |
| `strategic_reserve.ts` / `army_reserve_system.ts` | Yes, but separated conceptually | availability control, not movement philosophy |
| `brigade_front_distribution.ts` | Maybe, but narrowed | helper or advisory redistribution, not co-equal movement owner |
| `brigade_home_return.ts` | Maybe, but explicitly subordinate | demobilization or return policy under commander constraints |
| `apply_brigade_reposition.ts` | No | remove after compatibility confirmation |

## The rule that should eventually be true

This repo needs a simple sentence that engineers can trust:

**Only one system decides why a brigade should move.**

After that:

- one or two systems may decide how it moves
- helper systems may advise or constrain
- nobody else gets silent co-ownership

That one sentence is the difference between "complicated" and "architecturally believable."

---

## My Suggestions For Making Commanders Actually Intelligent

These are the most important recommendations in this document.

## 1. Move from hard gates to scored tradeoffs

Right now, a lot of decisions still look like:

- if deficit > threshold
- if commitment > threshold
- if confidence < threshold
- if posture == X, then output Y

That is okay for a bootstrap.  
But it will always feel railroaded if left as the core logic.

### Better target

Use competing scored pressures instead of many binary gates.

For example, for each zone or operation:

- defense urgency
- offensive opportunity
- logistics burden
- political acceptability
- commander confidence
- reserve strain
- recent losses

Then make the commander choose between ranked competing commitments, not branch through a pile of thresholds.

That is where intelligence starts to feel like judgment.

## 2. Make plans compete with each other

Right now the commander has planning, but it still risks feeling linear:

- create plan
- concentrate
- suspend / abandon / launch

### Better target

Have the commander maintain a small portfolio of candidate intents:

- hold this threatened zone
- exploit this weak enemy shoulder
- relieve this corridor
- preserve reserve

Then choose which one wins under current constraints.

That would feel much more like a real commander balancing dilemmas instead of merely executing one preselected lane.

## 3. Pull more logic upward into commander ownership

This is critical.

If the commander is meant to be the "mind," then too much downstream movement and staging policy cannot live outside it.

Right now, too many later systems still contain their own operational worldview.

That makes the commander look intelligent while later code quietly re-rails the outcome.

### Better target

The commander should increasingly own:

- movement priority
- reserve commitments
- front-thinning tolerance
- recall / redeploy logic
- staging urgency

Downstream systems should execute, not philosophize.

## 4. Separate "historical constraints" from "AI decision rules"

This is one of the biggest philosophical improvements you can make.

Some rails are valid because history or diplomacy demands them:

- truces
- patron restrictions
- enclave realities
- logistics impossibilities

Those are not AI stupidity.

But many other rails are just code convenience.

### Better target

The code should make this distinction explicit:

- **constraint layer**: things the commander truly may not violate
- **decision layer**: what the commander chooses within those constraints

That way historical realism does not get confused with dumb AI.

## 5. Turn personality into preferences, not simple modifiers

Current personality use is still pretty thin:

- aggression changes attacker count or garrison appetite
- caution changes reserve or stance preference

That helps, but it is not deep enough.

### Better target

Let personality influence:

- tolerance for uncertainty
- appetite for concentration vs broad-front defense
- willingness to abandon salients
- patience before launch
- preference for preserving elites
- response to recent losses
- preference for local security vs operational reach

That makes commanders feel differently intelligent, not just numerically modified.

## 6. Give commanders memory of embarrassment and success

This is one of the easiest ways to make them feel more real without using LLMs.

Right now there is some memory and previous state, which is good.  
Push it further.

### Better target

A commander should remember:

- this axis failed twice
- this zone keeps eating reserves
- this corps stripped itself bare and got punished
- this enemy sector only looked weak because intel was bad

Then that memory should influence future weighting.

This creates character and adaptation without randomness.

## 7. Do not add LLMs until the authority model is clean

This is important enough to say directly.

Do **not** try to solve the commander problem by bolting on Claude or another model while movement and execution authority are still fragmented.

If you do that, the LLM will become:

- a storyteller sitting on top of railroad code
- or a suggestion generator ignored by downstream rails

That will feel fake.

LLM help only becomes valuable after:

- movement ownership is cleaner
- commander authority is real
- downstream execution honors commander intent consistently

## 8. Keep the emit bridge temporary

Right now `emit.ts` is a practical bridge from new commander thought into old execution structures.

That is fine.

But if it becomes permanent, the commander will always be constrained by legacy output vocabulary.

### Better target

Eventually the internal commander model should be the real model,  
and old directives should disappear.

Otherwise the project will keep pretending to evolve intelligence while still speaking old language underneath.

---

## Intelligent Commander Implementation Direction

This section is the practical engineering target state. It is not code, but it is the shape I would want coders building toward.

## 1. Make the commander the explicit decision authority

The codebase should move toward this contract:

- commander decides intent
- movement systems execute intent
- reserve systems expose availability constraints
- offensive systems prepare and stage what the commander selected

Anything outside that contract should be treated as technical debt unless it is a hard historical constraint.

## 2. Introduce a decision model based on pressures, not branches

Engineers should gradually replace scattered threshold gates with a reusable pressure model.

Each meaningful option should be scored across dimensions such as:

- threat
- opportunity
- logistics
- reserve strain
- political risk
- uncertainty
- fatigue
- recent failure history

Then the commander compares ranked options instead of falling through a long branch tree.

That is the right technical bridge from scripted behavior toward genuine judgment.

## 3. Maintain multiple live candidate intents

The commander should not behave like it has one true plan plus a few cancellation states.

A stronger implementation direction is:

- maintain several candidate intents at once
- continuously rescore them
- promote, defer, merge, or abandon them
- record why one beat the others

That will let coders build behavior that feels adaptive without needing non-deterministic magic.

## 4. Upgrade memory from state-tracking to lesson-tracking

Current persistent state is useful, but the next leap is "lessons."

Examples of lessons the code should preserve:

- "this corridor looked weak but was a trap"
- "this corps overextended after reserve stripping"
- "this zone repeatedly consumed reinforcements with no payoff"
- "this commander launched too early twice"

Those should feed back into future scoring. That is how the system starts to feel like it learns.

## 5. Split constraints from preferences in code structure

This is a major architectural recommendation.

Coders should be able to point at a decision and say:

- these inputs are hard constraints
- these inputs are commander preferences
- these inputs are current battlefield assessments

If those categories stay mixed together, every future AI improvement will be muddy and hard to trust.

## 6. Treat explanation output as a first-class debugging tool

If the commander is going to become more sophisticated, engineers will need visible reasoning summaries for every major choice.

Not prose theater. Real structured trace data such as:

- top candidate intents
- winning score breakdown
- rejected alternatives
- hard constraints that clipped options
- memory terms that changed the result

Without that, the team will not be able to tell the difference between intelligence and accidental behavior.

## 7. Preserve determinism while increasing sophistication

This project is a simulation, not a chatbot.

So the correct target is:

- more adaptive reasoning
- richer state
- clearer traceability
- same deterministic reproducibility

That means the implementation direction should favor scored deterministic decision systems long before any stochastic or LLM-assisted layer is considered.

## 8. Only consider LLM augmentation after the system is already respectable without it

If coders eventually want LLM help, it should sit on top of a commander that is already architecturally coherent.

Good late uses might include:

- explanation generation for logs or UI
- political interpretation where ambiguity is genuinely textual
- advisory proposal generation that a deterministic layer then validates

Bad early uses would be:

- deciding movements while authority is fragmented
- improvising around missing architecture
- masking weak ownership with plausible-sounding text

## Implementation North Star

The north star I would hand to coders is this:

**Build a commander that owns intent, compares competing plans under explicit constraints, remembers what happened, and emits traceable deterministic decisions that downstream systems merely execute.**

That is the shortest path from "organized rails" to "credible military judgment."

---

## How To Get Damn Close To LLM-Level Commanders Without Needing LLMs

This is the deeper answer to your actual ambition.

If the long-term future includes LLMs acting as corps commanders, army commanders, and political leaders, the non-LLM system should still become strong enough that an LLM is optional augmentation, not the first time the game feels intelligent.

The way to get there is **not** to make the deterministic commander more verbose or more complicated.

It is to make it more psychologically structured.

Right now the commander mostly has:

- geometry
- force fitness
- thresholds
- plan lifecycle
- personality modifiers

To get damn close to LLM-quality behavior, it needs five more things:

- a belief model
- a motives model
- a competing-options model
- a relationship model
- a self-explanation model

That combination creates the feeling of thought.

## 1. Separate reality from belief

LLMs feel intelligent partly because they operate on a representation of the world, not just raw triggers.

Your commander should do the same.

At the moment, the code often reasons from a fairly direct reading of the board:

- zone deficit
- contact turns
- offensive signs
- brigade fitness

That is useful, but it is still too close to "truth."

What makes commanders feel human is that they act on what they **believe**:

- "I think the enemy is massing here"
- "I think this corridor is weaker than it looks"
- "I think my reserve can plug this hole"
- "I think this ally will hold their sector"

### Design recommendation

Extend the command model so every commander has a **belief state** distinct from world state.

That belief state should track:

- estimated enemy strength by zone
- confidence in those estimates
- expected enemy intent
- confidence in subordinate reliability
- confidence in allied support
- confidence in supply continuity

This can remain deterministic.

The important part is that decisions should increasingly flow from:

**belief + confidence + memory**

not directly from omniscient board facts.

That is one of the biggest jumps from "smart script" to "apparent mind."

## 2. Give each commander a motive stack, not just personality sliders

Current personality is useful, but it is still mostly scalar temperament:

- aggression
- caution
- initiative
- competence

That is not enough.

A near-LLM-feeling commander needs to have **reasons** that compete.

Examples:

- preserve the corps
- hold politically sensitive ground
- protect co-ethnic civilians
- obey army headquarters
- seek prestige through offensive success
- avoid humiliation after a failed offensive
- preserve elite brigades for a future decisive action
- prove this corps is not weak

These are not all universal. They should differ by faction, commander, and phase.

### Design recommendation

Add a persistent motive profile for commanders and higher HQs.

Each corps commander should have weighted motives such as:

- territorial fixation
- casualty aversion
- prestige seeking
- obedience
- localism
- reserve conservatism
- opportunism
- civilian-protection concern

This gives the same battlefield two different meanings to two different commanders.

That is where behavior starts to feel authored by a person instead of a formula.

## 3. Replace the single-plan model with candidate-option competition

LLMs feel smart because they appear to consider alternatives.

Your deterministic system can do the same if it explicitly generates and scores multiple candidate intents.

Right now the commander mainly evolves toward one active plan.

That is good bootstrap design, but it limits intelligence feel.

### Better target

For every turn, the commander should be able to generate a small option set such as:

- hold current line
- reinforce threatened zone
- thin a quiet sector
- counterattack locally
- stage a deliberate offensive
- abandon a salient
- recall exposed brigades
- request army reserve support
- launch a deception probe

Then score those options against:

- battlefield pressure
- logistics
- political constraints
- personal motives
- belief confidence
- recent outcomes
- expected enemy reaction

The winner becomes current intent.

That is very close to the "internal deliberation" people attribute to LLMs, except it stays deterministic and inspectable.

## 4. Model institutions and relationships, not just the battlefield

The canon points strongly in this direction.

The game bible says the player acts as political-military leadership rather than field command, and the rulebook repeatedly stresses command friction, fragile institutional control, and the fact that corps and army commanders are not perfect extensions of the player's will.

That means a believable commander cannot be purely spatial.

It must care about:

- trust in superiors
- trust in neighboring formations
- rivalry with other commanders
- patron pressure
- political directives
- war crimes policy constraints
- reserve loan politics
- career survival

### Design recommendation

Introduce a relationship layer for command actors:

- corps commander <-> army HQ trust
- corps commander <-> political leadership trust
- corps commander <-> neighboring corps cooperation
- faction-specific patron dependence
- officer prestige and blame exposure

This lets two commanders facing identical front conditions behave differently because their institutional world is different.

That is exactly the kind of thing that makes LLM play feel rich. You can get much of that richness with deterministic state.

## 5. Make mistakes feel human, not random

An LLM seems intelligent partly because it does not always choose the mathematically clean option.

But your game should not replace rigid scripts with noise.

The right target is **bounded irrationality**.

Examples:

- a prestige-hungry commander overcommits after one success
- a cautious commander keeps too much in reserve after a traumatic failure
- a politically insecure commander obeys a bad order
- a localist commander overweights defending home municipalities
- a commander with poor confidence in intel misses a real opportunity

These should emerge from motive and belief structure, not from dice.

### Design recommendation

Create reusable deterministic bias terms such as:

- success intoxication
- failure aversion
- home-ground fixation
- prestige hunger
- subordinate distrust
- political deference
- scapegoat avoidance

Then let those terms shape option scoring.

That gives you mistakes that look authored by character and circumstance.

## 6. Add cheap internal wargaming

This is one of the strongest ways to approach LLM-like behavior without using an LLM.

Before committing to an intent, the commander can run a light deterministic forecast on the top few options:

- if I strip this zone, what happens to its commitment ratio?
- if I stage here, how many turns until concentration?
- if this offensive stalls, what flank becomes exposed?
- if I recall reserves, what quiet sectors become vulnerable?

This does not need full simulation inside simulation.

It can be a cheap heuristic forecast.

### Design recommendation

For the top 2-4 candidate intents, compute a forecast card:

- expected preparation time
- expected local force ratio
- exposure created elsewhere
- supply strain
- political cost
- confidence level

Then let the commander choose among forecasted options.

That is extremely close to the feeling of deliberation people want from AI commanders.

## 7. Create different cognitive jobs at each command level

If LLMs eventually act as corps, army, and political leaders, the deterministic architecture should already separate those roles.

Do **not** make all levels use the same brain with different constants.

### Corps commander should care most about:

- sector danger
- local opportunity
- brigade readiness
- frontage and concentration
- immediate neighboring reactions

### Army commander should care most about:

- reserve arbitration
- cross-corps prioritization
- theater-level opportunity cost
- deciding who gets elite brigades
- deciding which corps may thin or reinforce

### Political leader should care most about:

- strategic priorities
- diplomacy
- patron alignment
- public legitimacy
- war crimes tolerance ceiling
- alliance posture

If these are separated cleanly, then future LLMs can sit on top of roles that already make sense.

If they are not separated, the whole system will feel muddled no matter how advanced the model is.

## 8. Treat explanation as part of the intelligence system

This matters more than people think.

LLMs feel intelligent partly because they explain themselves.

Your deterministic commanders should produce structured reasoning that can later be surfaced in:

- logs
- debug reports
- UI briefings
- refusal dialogs
- army HQ messages

### Design recommendation

Every major decision should preserve a trace like:

- options considered
- winning option
- top score contributors
- top fears or constraints
- what memory affected the result
- what confidence level the commander had

That trace should exist even if the player never sees the full raw form.

Without it, the system may be good but will still feel opaque and robotic.

With it, even a deterministic commander can feel legible and human.

## 9. Keep LLMs in the right role later

When LLMs do arrive, they should not become the first place real reasoning happens.

The better pattern is:

- deterministic system owns legal actions, constraints, and scored choices
- LLM interprets, narrates, roleplays, or proposes within that envelope
- final execution still passes through deterministic validation

Good future LLM jobs:

- generating believable commander language
- prioritizing among already-generated strategic narratives
- producing richer political reactions
- surfacing rationale in character voice
- proposing unusual but valid options for deterministic scoring

Bad future LLM jobs:

- direct state mutation
- freeform movement decisions in a fragmented authority model
- bypassing canon constraints
- inventing explanations disconnected from actual mechanics

The better the deterministic architecture gets, the more powerful and safer the LLM layer becomes.

---

## Concrete Expansion Of The Current Commander Loop

The good news is that the current loop is already shaped in a way that can support this evolution.

Current shape:

- `briefing.ts`
- `assess.ts`
- `allocate.ts`
- `plan.ts`
- `decide.ts`
- `emit.ts`

That is exactly the kind of seamful pipeline that can be upgraded.

## What I would add to each phase

### `briefing.ts`

Add more than facts. Add interpreted context:

- political directives relevant to the corps
- army priorities for this corps
- reserve loan trust and expectation data
- neighboring corps support expectations
- subordinate reliability estimates
- recent embarrassment/success summary

This becomes the commander's "staff packet," not just raw map data.

### `assess.ts`

Move from simple threat categories toward pressure vectors:

- defense pressure
- offensive promise
- collapse risk
- civilian/political sensitivity
- logistics fragility
- uncertainty

This becomes the world model that candidate intents consume.

### `allocate.ts`

Keep garrison logic, but make it part of a broader scarcity philosophy:

- minimum safety commitments
- flexible reserve bands
- elite preservation preference
- home-sector loyalty bias

This is where personality and motive can start shaping force structure, not just budget tweaks.

### `plan.ts`

This is where the biggest upgrade should happen.

Replace one active plan with:

- candidate plan generation
- candidate plan scoring
- candidate plan portfolio memory
- commit / defer / merge / abandon choices

This becomes the commander's deliberate reasoning center.

### `decide.ts`

Make this the "belief revision and reaction" phase:

- update what the commander thinks is true
- compare expected vs observed outcomes
- detect surprise, panic, overconfidence, or vindication
- adjust confidence in subordinates and enemy patterns

This is where memory starts to feel like learning.

### `emit.ts`

Keep it as a bridge for now, but enrich its output with reasoning traces and intent metadata so downstream systems know more than just "attack here."

Long term, this file should become thinner as the rest of the sim understands native commander intent directly.

---

## The Closest Thing To An LLM Feel That I Would Actually Trust

If I had to reduce the whole recommendation to one sentence, it would be this:

**Give every commander a belief state, a motive stack, a relationship map, a candidate-option debate, and a memory of humiliation and success.**

That gets you extremely close to the *feel* people want from LLM commanders:

- they act on interpretations, not just facts
- they have reasons
- they have biases
- they can surprise the player without seeming random
- they can be legible after the fact

That is the right target.

Not "fake freeform intelligence."  
Not "more thresholds."  
Not "Claude writes brigade orders."

This is how you build something that already feels alive before the first LLM is plugged in.

---

## Concrete Commander Maturity Path

If I were sequencing this with discipline, I would do it like this:

### Phase 1. Stabilize current commander

- fix combat drought
- remove obvious plan lifecycle bugs
- verify outputs match intent
- get War-or-Game sign-off

### Phase 2. Cleanup authority

- remove old corps-directive path
- reduce downstream competing movement logic
- make commander-owned priorities actually decide movement order precedence

### Phase 3. Replace threshold jungles with scored competitions

- zone scoring
- competing plan portfolio
- adaptive reserve allocation
- repeated-failure memory

### Phase 4. Deepen personality

- not just aggression/caution knobs
- actual decision preference profiles

### Phase 5. Only then consider LLM augmentation

- for political interpretation
- richer explanatory reasoning
- maybe edge-case deliberation

Not before.

---

## My Blunt Advice

If the goal is:

> "I want something approaching intelligence"

then the most important thing is **not** to add more AI-looking features.

It is to make sure the commander has:

- real authority
- competing goals
- memory
- constraints that are explicit
- execution layers that obey it

Otherwise you just get a prettier railroad.

---

## Highest-Signal Recommendations

If I had to reduce everything to five recommendations:

1. **Treat overlapping ownership as the main enemy.**
2. **Preserve exactly two movement executors and reduce writers.**
3. **Do not advance deeper AI milestones until `v0.8.0` cleanup actually happens.**
4. **Replace many threshold gates with weighted competing pressures.**
5. **Make the commander's internal model become the real model, not just a bridge into old directives.**

---

## Final Verdict

This repo is not laughable.  
It is impressive, but entering a dangerous phase.

The roadmap is promising if it obeys its own cleanup order.

The commander code is promising if it evolves into a real owner of decisions.

The main failure mode to avoid is:

**beautifully organized railroad logic**

That is the risk.

The path away from it is:

**clear authority, scored tradeoffs, real memory, and less downstream philosophical interference**

---

## Supersession Note

This document consolidates the signal from the following earlier 2026-03-30 audit docs:

- `20260330_REPO_CODE_HEALTH_AUDIT.md`
- `20260330_REPO_HEALTH_PARALLEL_DEEP_DIVE.md`
- `20260330_PARALLEL_REPO_RISK_DEEP_DIVE.md`
- `20260330_REPO_CODE_HEALTH_AUDIT_ADDENDUM_PARALLEL_TRACKS.md`
- `20260330_MOVEMENT_AUTHORITY_MAP.md`

Those remain as working notes, but this file should be treated as the single owner-facing summary.

---

## Notes

- This was a documentation-only consolidation and refinement.
- No code behavior changed.
- `FORAWWV.md` was not edited.
- Ledger handling was considered; no ledger update was made because this records analysis only.
