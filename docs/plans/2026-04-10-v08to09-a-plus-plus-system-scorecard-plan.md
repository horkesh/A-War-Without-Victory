# 2026-04-10 v0.8-to-v0.9 A+++ System Scorecard Plan

## Purpose

This plan turns the current "how good is the game, really?" question into a durable prioritization artifact.

It has one job:

- grade the major systems honestly
- name the exact work that would move each system up to its next meaningful quality rung
- distinguish bounded hardening from realism work, content/runtime audit, and redesign-gated seams

This is a planning lens for the `v0.8-to-v0.9` band, not a new feature milestone.

## Scope and interpretation rules

The grades below are board-level judgments, not release marketing.

- They reflect the current repo truth across the mainline `2026-04-09` and `2026-04-10` hardening chain plus the surrounding verified product state.
- They are meant to help choose the next lane, not to declare the game "done."
- "Move up one rung" means the next meaningful promotion step on the current grading ladder. For example:
  - `B+ -> A-`
  - `A- -> A`
  - `B- -> B`
- If the exact next promotion is blocked by a missing canonical owner or packet contract, that is called out explicitly instead of disguised as ordinary hardening.

## Pyrrhic review normalization (2026-04-10)

The external full-system review in `C:/Users/User/.agent/diagrams/pyrrhic_full_review_20260410.html` is useful, but it must be normalized against current merged-main truth before it drives roadmap sequencing.

Use it as:

- a structural pressure test on this scorecard
- a source of cross-cutting concerns the first scorecard draft under-emphasized
- not as an unfiltered live board snapshot

Current normalization:

- `Probes flip territory` was a real category error, but it is no longer an open queue item on `main`; the no-flip guard landed on `2026-04-10`.
- `47% zero-eligible-attacker ops` is an important historical warning, but it must be re-measured from current merged-main scenario output before it is reused as a live KPI.
- `Hostile-majority Phase B pocket marches` remains a serious doctrine/planner concern, but it is still classified as realism/doctrine unless a narrower truth-owner seam is isolated.
- `Exhaustion = 0` remains a valid identity-level audit target and should be explicitly tested rather than assumed solved.
- `God files` remain active structural debt and should be treated as their own bounded maintainability program rather than as a side effect of unrelated gameplay lanes.

This plan therefore absorbs the review in two ways:

1. by adding the still-live cross-cutting programs it surfaced
2. by explicitly marking which review claims are already closed or need re-benchmarking first

## Grade rubric

| Grade | Meaning |
|------|---------|
| `A++ / A+++` | Canonical owner is clear, residuals are minor, scenario/runtime proof exists, and docs/shells tell the same story |
| `A / A-` | Strong and trustworthy, but still has one or two bounded seams or incomplete proof surfaces |
| `B+ / B / B-` | Valuable and playable, but still mixes truth with drift, partial ownership, or under-proven product behavior |
| `C` | Structurally present but still too partial or fragile to trust broadly |
| `D` | Missing canonical owner/contract; work is blocked until that is chosen |

## System scorecard

| System | Current grade | Why it has that grade now | Next promotion target | Exact work to promote it | Proof required |
|------|------|------|------|------|------|
| Core simulation determinism + turn pipeline | `A-` | The war engine no longer feels brittle. Recent operation, sector, drift, and battle-ownership hardening made the substrate materially more truthful. | `A` | Finish remaining non-authoritative execution-entrypoint cleanup, then prove save/load/replay equivalence against canonical turn output rather than only live-run correctness. | Reproducible scenario reruns, replay/load equivalence checks, full verification bar |
| Sector / frontline / brigade-assignment truth | `A` | Shared-front routing, foreign-sector ownership, ghost-sector prune, drift-recall honesty, and cold-front anomaly consumption are now strong. | `A+` | Resolve the remaining ambiguous territorial residuals through a narrow content/runtime audit and either prove them stale or classify them as accepted live variance. | Before/after anomaly counts with unchanged scenario hash, plus explicit residual classification |
| Operation lifecycle / execution / combat causality | `A-` | Readiness, rosters, battle ownership, and false invalidation seams improved substantially. | `A` | Finish the operation launch-model hardening still deferred in roadmap language: sector-anchored, corps-authorized, reinforcement-bounded launch truth, then rerun long scenarios to prove invalid ops remain at zero under the stricter contract. | 40w/52w proof, causality metrics, zero invalid-operation residuals |
| Reserve system ownership + evidence | `A-` | Reserve ownership, severity, cause, provenance, and several driver-evidence seams are now unusually well-defined. | `A` | Run one bounded completion audit over remaining reserve drivers, preserving only packet-owned evidence and explicitly declaring the reserve explanation stack complete where no sharper truth exists. | Driver-by-driver audit report, UI contract matrix, targeted reserve tests, full suite |
| Command / review shell coherence | `A-` | Military review ownership is much cleaner, and Army HQ now feels like a real owner rather than a duplicate shell. | `A` | Unify the remaining interrupt-modal vs sustained-review-desk ownership seams across Army HQ, reserve handoff, and political review surfaces so every live review action has one canonical queue owner. | UI ownership matrix update, targeted shell tests, walkthrough proof of one queue per action family |
| Political leader / peace-plan / patron review systems | `B+` | Rich and meaningful, but not yet hardened with the same owner-truth rigor as sectors, operations, and reserves. | `A-` | Run a political review ownership and consequence-truth program: peace/dayton/patron review surfaces, decision provenance, and scenario proof that the same owner drives both the decision and the reporting surface. | Decision-flow audit, targeted tests, scenario proof for representative peace-plan / patron branches |
| Autonomy / proposal / review framework | `B+` | Structurally strong, but still feels one pass short of fully battle-proven product truth. | `A-` | Complete the replay/fallback/review contract with queue ownership proof, deterministic decision audit surfaces, and scenario/harness evidence that accepted, rejected, and blocked proposals replay honestly. | Replay/fallback audit, queue-truth tests, scenario/harness runs |
| Scenario harness / anomaly diagnostics / calibration surfaces | `B+` | Stronger than before, but still not completely through the residual board. Some anomaly families are now honest; others still need classification. | `A-` | Merge the verified cold-front density / brigade-never-fights truth lanes, then run a bounded residual audit to separate true detector drift from accepted content/runtime variance. | Anomaly deltas with unchanged hashes, consistency audit, recovery bar |
| Code maintainability / god-file decomposition | `C+` | The substrate is materially stronger than its file structure. `war_phases.ts`, `sector_offensive.ts`, `attack_resolution_osid.ts`, and `electron-main.cjs` are still oversized merge magnets that make safe hardening slower and riskier than it needs to be. | `B-` | Run a no-behavior-drift decomposition program that extracts pure helpers and ownership-bounded submodules from the god files, starting with battle resolution, sector-offensive execution/recovery slices, war-phase repair/cleanup families, and desktop IPC contract boundaries. | Same-hash scenario proof where behavior is not meant to change, targeted extracted-module tests, full verification bar |
| Game identity / exhaustion / negative-sum pressure | `C+` | The product still risks reading like a conquest sim if exhaustion and negotiation pressure remain mechanically weak or effectively silent in live runs. The external review surfaced this as the highest identity risk, and it has not yet been retired with fresh proof. | `B-` | Run an exhaustion activation and visibility audit: verify accumulation, downstream effects, negotiation pressure coupling, and player-facing visibility; fix whichever layer is dead, muted, or disconnected. | Before/after 40w proof showing non-zero exhaustion dynamics plus visible gameplay consequence |
| Save/load / replay / adapter/read-model integrity | `B+` | Better than most projects at this stage, but still one of the biggest remaining quality multipliers. | `A-` | Execute the save/load/replay hardening plan end-to-end: migration fidelity, replay equivalence, adapter contract matrix, startup snapshot contract, and packaged-desktop continuity proof. | Migration matrix, replay equivalence runs, desktop/startup checks, full verification bar |
| Desktop runtime / packaging / shipped-platform contract | `B` | Packaged-runtime proof exists and is much stronger than before, but this is still below the simulation core in confidence. | `B+` | Promote packaged proof from "headless smoke with strong route coverage" to "shippable packaging contract": CI-owned packaged probe, installer/artifact path truth, and explicit disposition for the remaining unsigned/store gaps. | Packaged probe in CI, artifact validation, release-check proof |
| Planner realism / salient-risk doctrine | `B-` | Not broken in an ownership sense, but still capable of overextension and low-wisdom operational choices. | `B+` | Run a doctrine program focused on salient-risk, one-brigade probe overreach, and target-selection wisdom, using scenario evidence rather than truth-surface patches. | Multi-run scenario evidence, doctrine metrics, accepted-variance notes |
| Stranded brigade lifecycle ownership | `D+` | This is the clearest remaining contract hole. The engine can now report strandedness honestly, but it still lacks a canonical lifecycle owner. | `C` | Choose one explicit lifecycle contract for same-faction ownerless unreachable brigades, then implement that owner end-to-end before attempting any richer behavior. | Contract decision first, then Podrinje-pair before/after proof with unchanged unrelated outcomes |
| Historical content / dynamic Codex / comparison layer | `B+` | Rich content base exists, but the reactive/dynamic comparison layer is still not at "signature feature" strength. | `A-` | Build the dynamic essay and endgame-comparison layer already planned for `v0.9.1`, focusing on divergence notes, ghost entries, and comparison glue rather than raw essay volume. | Feature-complete content proof, endgame comparison walkthrough, regression checks |
| Production readiness / thin player-experience layer | `D+` | The project is much stronger as a simulation engine than as a first-session playable game. Onboarding, campaign framing, and the thinnest viable player loop still lag well behind the substrate. | `C-` | After the identity and core-truth P0s, build the thinnest viable player layer: onboarding, first-session guidance, campaign framing, and expectation-setting around delegation and command friction. | First-session walkthrough, UX acceptance checklist, no-regression verification |

## Ordered promotion queue

This is the recommended queue for the remaining `v0.8-to-v0.9` band.

### 1. Exhaustion activation / negative-sum identity audit

Why first:

- if exhaustion and negotiation pressure are still effectively silent, the game's central promise is mechanically underpowered
- this is a cross-cutting quality and identity issue, not just a balance tweak
- the external review was directionally right to elevate it, even though the exact runtime claim must be re-proven on current `main`

### 2. Save/load + replay + adapter integrity

Why second:

- it raises the confidence ceiling for everything else
- it multiplies the value of later platform and scenario work
- it is still a bounded hardening lane rather than realism or content

### 3. Political review ownership + consequence truth

Why third:

- the military review and reserve review stacks have improved faster than the political stack
- this is now one of the biggest product-coherence gaps

### 4. Autonomy replay / fallback / queue truth

Why fourth:

- autonomy is structurally impressive but still under-proven relative to the simulation core
- it needs the same "one owner, one queue, one replay truth" discipline already applied elsewhere

### 5. Code maintainability / god-file decomposition (tranche 1)

Why fifth:

- the codebase has crossed the point where structural maintainability is no longer optional background hygiene
- god files are now slowing safe hardening by concentrating unrelated responsibilities into a few merge-magnet entrypoints
- this can be pursued as a bounded no-behavior-drift program, separate from doctrine or redesign

### 6. Residual harness/content-runtime audits

Why sixth:

- remaining anomaly families need honest classification
- some will still be bounded hardening
- some will turn out to be content/runtime variance and should be demoted cleanly

### 7. Planner/doctrine realism program

Why seventh:

- once the remaining owner-truth lanes are exhausted, doctrine becomes the biggest contributor to the game feeling less mature than its substrate
- this is important, but it should not displace stronger hardening work while those lanes still exist

### 8. Thin player-experience layer

Why eighth:

- the project's engine quality is now strong enough that the lack of onboarding/campaign framing is becoming its own blocker
- this should follow the highest-value truth and identity work, not precede it

## Redesign-gated systems

These should not be treated as ordinary hardening unless their missing contract is chosen first.

### Stranded brigade lifecycle

Missing contract:

- canonical lifecycle owner for same-faction ownerless unreachable brigades

Do not start implementation here until the game explicitly chooses whether these brigades become:

- stranded/inert
- automatically recovering
- evacuated/reconstituted
- or something else

### Deeper packet-detail surfaces

If a UI/reporting lane needs sharper detail than the current canonical packet owns, do not fake it.

That applies especially to:

- exploitation detail beyond aggregate captured-objective count
- commander-escalation evidence beyond the packet-owned fields
- any political or review UI surface that wants deeper provenance than the engine currently serializes

## Structural maintainability program: god files

This is now an explicit scorecard lane family, not background cleanup.

Target files:

- `src/sim/turn_phases/war_phases.ts`
- `src/sim/combat/sector_offensive.ts`
- `src/sim/combat/attack_resolution_osid.ts`
- `src/desktop/electron-main.cjs`

Program rules:

- do not hide behavior changes inside decomposition commits
- prefer pure-helper extraction and ownership-bounded module splits over class churn or aesthetic rearrangement
- if a god-file extraction reveals a real logic bug, land that bug as its own lane or commit instead of burying it in refactor noise
- every tranche must prove no unintended drift through the strongest available scenario/runtime checks

Recommended decomposition order:

1. `attack_resolution_osid.ts`
   - extract outcome calculation, control-flip/displacement rules, and battle-record stamping into separately testable helpers
2. `sector_offensive.ts`
   - extract execution-entry gating, attack emission, and recovery-classification slices
3. `war_phases.ts`
   - extract post-phase repair/cleanup/validation families by owner domain rather than by arbitrary chunk size
4. `electron-main.cjs`
   - extract IPC contract families and read-only/mutating boundaries into named helper modules

Proof standard for every tranche:

- targeted tests around the extracted seam
- full verification bar
- same-hash scenario proof when the tranche claims no behavior change
- explicit documentation of the canonical owner before and after extraction

## How to use this scorecard in the campaign

For every future hardening batch:

1. pick the highest-priority system whose promotion work is still bounded
2. choose one exact seam inside that system
3. harden it end-to-end
4. prove it with scenario/runtime evidence where relevant
5. update this scorecard only when the system has actually earned the new grade

If the top candidate is redesign-gated, demote it and rotate to the next system rather than stopping the whole campaign.

## Immediate recommended next program

If the team wants the highest-value quality program now, run this sequence:

1. `exhaustion activation / negative-sum identity audit`
2. `v0.8-to-v0.9 save/load + replay + adapter integrity`
3. `political review ownership + consequence truth`
4. `autonomy replay / fallback + queue truth`
5. `god-file decomposition tranche 1`
6. `residual harness/content-runtime audits`
7. `planner/doctrine realism`
8. `thin player-experience layer`

If the team wants the hardest remaining contract hole instead, do that deliberately:

1. choose the stranded-brigade lifecycle owner
2. implement it as its own explicit program
3. prove it on the Podrinje pair without hiding unrelated residuals
