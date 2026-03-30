# Repo Code Health Audit

> Superseded by `20260330_REPO_HEALTH_CONSOLIDATED.md` for owner-facing use. This file remains as source material.

**Date:** 2026-03-30  
**Scope:** Repo-state advisory audit only. No code changes.  
**Audience:** Project owner / vibe coder who wants senior-engineer guidance on what is healthy, what is risky, and what would make maintainers nervous.

## Executive Summary

This repo is **not a disaster**. In several ways it is stronger than many hobby or prototype game projects:

- There is extensive engineering documentation.
- There is a serious testing culture.
- The team has been recording architectural lessons instead of letting them vanish.
- A lot of complex work has already been split into modules rather than left in one mega-file.

But the codebase is also showing classic signs of a project that has grown fast while still carrying multiple generations of architecture at once.

My short verdict:

- **Strength of project:** high
- **Code health:** mixed
- **Maintainability risk:** real and rising
- **Biggest danger:** too many overlapping systems, compatibility paths, and “temporary” coexistence layers staying alive at the same time

If a strong engineer looked at this repo, they would probably say:

> “This team clearly knows what it is building. But they are carrying too much historical baggage in the code at once, and that will keep creating surprise bugs until they consolidate.”

---

## What Is Healthy

### 1. Documentation discipline is unusually strong

The repo has a real engineering spine:

- `docs/20_engineering/CODE_CANON.md`
- `docs/20_engineering/REPO_MAP.md`
- `docs/20_engineering/PIPELINE_ENTRYPOINTS.md`
- `docs/40_reports/CALIBRATION_MASTER.md`

This is a major strength. Most game prototypes do not have anything close to this. It means the project is not relying only on memory and vibes.

### 2. Test surface is substantial

Repo metrics from this audit:

- Source files under `src/`: about **747**
- Test files under `tests/`: about **327**

Some major tests are large and serious:

- `tests/commander/commander.test.ts` — **1254** lines
- `tests/sector_offensive.test.ts` — **624** lines
- `tests/scenario_operation_diagnostics.test.ts` — **500** lines
- `tests/brigade_front_distribution.test.ts` — **460** lines
- `tests/local_truces.test.ts` — **381** lines

That is a real investment in regression safety.

### 3. Many core files do have maintenance-minded headers

Some important files begin with useful “what this file does” headers and determinism notes, for example:

- `src/sim/combat/bot_corps_ai.ts`
- `src/sim/combat/sector_offensive.ts`
- `src/sim/combat/brigade_movement.ts`

This is good engineering behavior. It lowers onboarding cost.

### 4. The repo records technical debt openly instead of pretending it does not exist

This is healthier than hiding it. Examples:

- `docs/40_reports/20260330_RAILROAD_HUNTER_REPORT.md`
- `docs/40_reports/audits/cleanup_audit.md`
- repeated “legacy”, “deprecated”, and “backward-compatible” notes in code and docs

That tells me the project is self-aware.

---

## What Would Make A Real Coder Nervous

## 1. Too many systems can move brigades

This is the biggest structural warning sign.

Even before searching deeply, the codebase clearly contains multiple brigade-motion systems or motion-like authority paths:

- `src/sim/combat/osid_column_movement.ts` — **340** lines
- `src/sim/combat/brigade_movement.ts` — **263** lines
- `src/sim/combat/bot_brigade_movement_ai.ts` — **343** lines
- `src/sim/combat/bot_brigade_eval_front.ts` — **432** lines
- `src/sim/combat/strategic_reserve.ts` — **186** lines
- `src/sim/combat/army_reserve_system.ts` — **587** lines

This roughly matches your instinct that “we have something like 5 different systems that can move a brigade independently.”

Why this matters:

- Bugs become hard to reason about because the answer to “why did this brigade move?” may live in several places.
- One system can silently fight another.
- Engineers lose confidence in making changes because they cannot be sure they found the true owner.

This is exactly the kind of thing that causes professional maintainers to mutter “we need one movement authority.”

## 2. The codebase is still carrying parallel generations of architecture

The repo contains multiple active or quasi-active paths for similar responsibilities:

### Turn and run entrypoints

- `src/sim/turn_pipeline.ts` — **165** lines
- `src/state/turn_pipeline.ts` — **84** lines
- `src/turn/pipeline.ts` — **52** lines
- `src/sim/run_combat_browser.ts` — **36** lines
- `src/scenario/scenario_runner.ts` — **2367** lines
- `src/desktop/desktop_sim.ts` — **798** lines

This does not automatically mean “bad.” Some separation is legitimate. But it does mean the project has a high “where is the real source of truth?” tax.

Professional concern:

- too many near-entrypoints
- browser-safe subset logic coexisting with canonical logic
- multiple “legacy/minimal/canonical” pathways remaining in tree

This is manageable only if aggressively documented and pruned. Right now it looks documented, but not yet fully pruned.

## 3. Large orchestrator files are still doing too much

Several files are large enough that any engineer would treat them as risk hotspots:

- `src/ui/map/map/MapContainer.tsx` — **2581** lines
- `src/sim/turn_phases/war_phases.ts` — **2539** lines
- `src/scenario/scenario_runner.ts` — **2367** lines
- `src/ui/map/data/GameStateAdapter.ts` — **2319** lines
- `src/sim/combat/sector_offensive.ts` — **1868** lines
- `src/sim/combat/bot_corps_directives.ts` — **1857** lines
- `src/desktop/electron-main.cjs` — **1826** lines
- `src/state/game_state.ts` — **1803** lines
- `src/sim/combat/attack_resolution_osid.ts` — **1769** lines

Large files are not automatically bad. Some domains are inherently large. The problem is when they become:

- routing hubs
- compatibility hubs
- policy hubs
- side-effect hubs

This repo has several files that look like all four at once.

That usually leads to “change one thing, break three others.”

## 4. Compatibility baggage is everywhere

The repo still contains many bridges between old and new models.

Examples from this audit:

- `src/sim/combat/bot_corps_ai.ts`
  - calls itself a “slim orchestrator + backward-compatible re-export hub”
- `src/sim/combat/sector_offensive.ts`
  - explicitly supports both multi-axis and legacy flat-field operations
  - contains deprecated alias behavior
- `src/sim/turn_phases/war_phases.ts`
  - still merges “legacy battles” with newer reports
- `src/scenario/scenario_runner.ts`
  - still has multiple legacy compatibility notes
- `src/ui/map/data/GameStateAdapter.ts`
  - contains multiple legacy and fallback compatibility behaviors

Compatibility layers are fine during transition. They become unhealthy when they stop being temporary.

My read: this repo is in the danger zone where compatibility code is no longer just a safety net; it is becoming part of the architecture.

## 5. Archived code is still inside `src/`

There are about **93** files under `src/_archived/`.

That is better than leaving them mixed into live folders, but it still has costs:

- search results get noisy
- file metrics get distorted
- new contributors can become unsure what is live
- some tooling and mental models still treat `src/` as all potentially relevant

If real coders laughed at something, this would be a candidate:

> “You archived it, but you archived it inside the active source tree.”

That is not catastrophic, but it is a maintenance smell.

## 6. There is evidence of active architecture migration without final consolidation

`src/sim/combat/bot_corps_ai.ts` is a good example. It currently acts as:

- orchestrator
- import hub
- re-export hub
- compatibility layer
- feature-flag switchboard

It also contains:

- `USE_COMMANDER_LOOP = true`
- both old and new corps AI references

This is a normal transition shape, but a risky one. The scary outcome is a repo that says “the new system is on” while the old one still quietly defines assumptions, helpers, or fallback behavior.

---

## Comments And Annotations

## Are comments/annotations important?

Yes. They matter a lot for maintenance.

Not because more comments are always better, but because future maintainers need help with:

- ownership
- intent
- invariants
- “why this exists”
- what is transitional vs permanent

## What I found here

### Good news

Several core sim files have strong header comments and intent-level explanations.

Approximate comment-like line density in selected hotspots:

- `src/sim/combat/bot_corps_ai.ts` — about **32%**
- `src/sim/combat/sector_offensive.ts` — about **23.4%**
- `src/sim/combat/bot_corps_directives.ts` — about **21.1%**

That is actually pretty decent for complex engine code.

### Weaker areas

The biggest integration files are much lighter on explanation:

- `src/sim/turn_phases/war_phases.ts` — about **4.6%**
- `src/scenario/scenario_runner.ts` — about **6%**
- `src/ui/map/map/MapContainer.tsx` — about **5.8%**
- `src/ui/map/data/GameStateAdapter.ts` — about **3%**

This is not automatically bad, but for files of that size it increases maintenance cost. These are exactly the places where future engineers need strong “why” comments, not just code.

### What the existing comments say

The annotation style is strongest where the repo explains:

- lifecycle
- determinism
- compatibility rules
- pipeline placement

That is excellent.

The annotation style is weaker where the repo is doing:

- data adaptation
- UI translation
- giant orchestration
- compatibility fallbacks

That is where more explanation would help most.

### A subtle problem

Some comments are doing archaeological work:

- “legacy”
- “deprecated”
- “backward-compatible”
- “fallback”

Those comments are useful, but they also signal that maintainers must keep multiple historical layers in their head at once.

That is not a comment problem. That is an architecture-consolidation problem.

---

## Specific Structural Risks

## 1. `GameStateAdapter` looks like a translation sink

`src/ui/map/data/GameStateAdapter.ts` is **2319** lines and has relatively low explanatory density.

This type of file often becomes a junk drawer because every new system eventually needs a “UI view model.” That makes it one of the most likely places for:

- stale compatibility code
- duplicate derived logic
- accidental schema drift
- “fix it in the adapter” habits

This file deserves close attention in future cleanups.

## 2. `war_phases.ts` is an engine-heart risk file

`src/sim/turn_phases/war_phases.ts` is **2539** lines and highly edited recently.

Anything that long and that central becomes dangerous because:

- step order bugs are easy to create
- nobody can safely hold the whole thing in their head
- fixes accumulate by insertion rather than simplification

This file may be correct. But it is a classic “works until one more change tips it over” hotspot.

## 3. `scenario_runner.ts` is too important to be this big

At **2367** lines, this is likely carrying too many responsibilities:

- running
- reporting
- compatibility
- artifact handling
- diagnostics

That makes it a stability risk even if it is well-tested.

## 4. `MapContainer.tsx` is a front-end concentration risk

At **2581** lines, `src/ui/map/map/MapContainer.tsx` is very large for a React map container.

This usually means:

- too much UI state knowledge in one place
- too many layer concerns combined
- hard-to-predict render side effects
- hard onboarding for new UI contributors

Not a reason to panic, but definitely a “professional cleanup later” candidate.

---

## Things That Are Better Than They Look

To be fair, some scary-looking things are not pure negatives.

### 1. The repo does not seem sloppy so much as overgrown

This is an important distinction.

I do **not** see a repo that feels careless.
I see a repo that has:

- added systems quickly
- preserved old paths for safety
- documented heavily
- accumulated overlap faster than it has retired overlap

That is a common “successful but fast-moving” problem.

### 2. The project is self-aware about debt

The existence of documents like:

- `docs/40_reports/20260330_RAILROAD_HUNTER_REPORT.md`
- `docs/40_reports/audits/cleanup_audit.md`

means the team is not blind. That makes cleanup much more realistic.

### 3. Test investment gives room to refactor later

The test suite does not solve architecture issues, but it is exactly what makes future consolidation possible.

Without tests, cleanup is fear.
With tests, cleanup is a project.

---

## My Professional Read

If I were advising this project as an external senior engineer, I would say:

### The repo is currently viable

It is not in “rewrite” territory.

### The repo is entering consolidation territory

You are at the point where adding more features without retiring old paths will increase fragility faster than value.

### The main quality issue is not lack of intelligence

It is **overlap**:

- overlapping movement systems
- overlapping entrypoints
- overlapping old/new AI logic
- overlapping legacy/current data handling

### The maintainability issue is not lack of comments

The repo actually has decent commentary in core sim code.

The maintainability issue is that comments are currently helping humans survive architectural overlap instead of documenting a clean single model.

---

## Plain-English Risks List

If you want the simple version, here is what would make a real coder raise an eyebrow:

1. “Why do brigades have this many ways to move?”
2. “Why are there still multiple turn/run pathways alive at once?”
3. “Why is the new commander system feature-flagged on while the old system still clearly shapes the code?”
4. “Why are several core files 1800 to 2500 lines long?”
5. “Why is archived code still living under `src/`?”
6. “Why does the UI adapter know so much?”
7. “How long are these compatibility layers supposed to live?”

None of those mean the repo is bad.
They mean the repo is ready for a serious simplification phase once the current commander milestone stabilizes.

---

## Recommended Next Audit Topics

I am not recommending code changes in this memo. I am recommending the next questions worth answering.

### Highest value

1. **Movement authority audit**
   - Which file is allowed to initiate brigade relocation?
   - Which systems are true movement vs reinforcement vs teleport-like manpower transfer?
   - Which are transitional and should be retired?

2. **Entrypoint ownership audit**
   - Which turn runner is canonical for which context?
   - Which are compatibility wrappers only?
   - Which can be retired or moved out of the main path?

3. **Compatibility-layer retirement map**
   - every `legacy`, `deprecated`, `fallback`, `backward-compatible` path
   - who still uses it
   - when it can die

### Medium value

4. **Mega-file breakup candidates**
   - `war_phases.ts`
   - `scenario_runner.ts`
   - `MapContainer.tsx`
   - `GameStateAdapter.ts`

5. **Comment quality pass**
   - not “more comments everywhere”
   - only add comments in giant integration files where the next engineer truly needs context

---

## Final Verdict

This repo has **real engineering muscle** and **real maintenance risk** at the same time.

That combination is common in ambitious projects that are succeeding technically but evolving faster than they are simplifying.

If you asked me the blunt version:

- **Would real coders laugh at this repo?** No.
- **Would real coders spot some “what have we done to ourselves” areas immediately?** Yes.
- **Is the biggest issue code quality in the small?** No.
- **Is the biggest issue architecture drift and overlap?** Yes.

The single most important phrase for this repo right now is:

**consolidate ownership**

Especially around movement, orchestration, compatibility paths, and giant adapter/orchestrator files.

---

## Notes

- This audit was based on repo inspection, engineering docs, hotspot file review, and structural metrics.
- No code was changed.
- `FORAWWV.md` was not edited.
- Ledger handling was considered. No `PROJECT_LEDGER` update was made because this audit records observations only and does not change behavior, workflow, or canon.
